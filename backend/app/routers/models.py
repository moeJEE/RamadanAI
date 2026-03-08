"""API routes for ML models — GNN and demand prediction."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db
from app.models.dam import DamNode, DamLevel
from app.ml.inference import predict_demand, predict_transfers, get_demand_predictor, get_gnn_model
from app.ml.synthetic_data import CAPACITY_M3

router = APIRouter()


class DemandRequest(BaseModel):
    dam_id: str
    day_of_year: int = 180
    month: int = 6
    temp_mean: float = 25.0
    precip_mm: float = 0.0
    et0_mm: float = 4.0
    fill_ratio: float = 0.5


class GNNRequest(BaseModel):
    """Optional — if empty, uses current DB state."""
    month: int = 6


@router.post("/demand/run")
async def run_demand_model(req: DemandRequest):
    """Run the LightGBM demand prediction model."""
    predictor = get_demand_predictor()

    if not predictor.is_trained:
        return {
            "status": "not_trained",
            "message": "Demand predictor not yet trained. Run `python -m app.ml.trainer` first.",
        }

    features = {
        "day_of_year": req.day_of_year,
        "month_sin": __import__("math").sin(2 * 3.14159 * req.month / 12),
        "month_cos": __import__("math").cos(2 * 3.14159 * req.month / 12),
        "temp_mean": req.temp_mean,
        "temp_max": req.temp_mean + 5,
        "temp_min": req.temp_mean - 5,
        "precip_mm": req.precip_mm,
        "et0_mm": req.et0_mm,
        "wind_kmh": 12.0,
        "population": 500_000,
        "irrigation_area_ha": 1000,
        "catchment_area_km2": 500,
        "irrigation_season_flag": 1 if 4 <= req.month <= 9 else 0,
        "fill_ratio": req.fill_ratio,
        "inflow_m3": req.precip_mm * 500_000,
        "evap_m3": req.et0_mm * 1000,
        "demand_lag_1d": 0,
        "demand_lag_7d": 0,
        "demand_lag_14d": 0,
        "demand_lag_30d": 0,
        "fill_lag_1d": req.fill_ratio,
        "fill_lag_7d": req.fill_ratio,
        "fill_lag_14d": req.fill_ratio,
        "fill_lag_30d": req.fill_ratio,
    }

    result = predict_demand(features)

    return {
        "status": "ok",
        "dam_id": req.dam_id,
        "predictions": result,
    }


@router.post("/gnn/run")
async def run_gnn_model(req: GNNRequest, db: Session = Depends(get_db)):
    """Run the GNN inference for transfer recommendations using current DB state."""
    from sqlalchemy import func

    # Get latest fill ratios from DB
    subq = (
        db.query(DamLevel.dam_id, func.max(DamLevel.date).label("max_date"))
        .group_by(DamLevel.dam_id)
        .subquery()
    )
    latest_levels = (
        db.query(DamLevel)
        .join(subq, (DamLevel.dam_id == subq.c.dam_id) & (DamLevel.date == subq.c.max_date))
        .all()
    )

    # Build dam states from DB
    dam_states = []
    for level in latest_levels:
        dam_states.append({
            "dam_id": level.dam_id,
            "fill_ratio": level.fill_ratio or 0.5,
            "capacity_m3": level.capacity_m3 or CAPACITY_M3.get(level.dam_id, 50_000_000),
            "inflow_m3": 0,  # Would come from weather forecast
            "demand_7d": (level.capacity_m3 or 50_000_000) * 0.003 * 7,
            "evap_m3": (level.capacity_m3 or 50_000_000) * 0.001,
            "month": req.month,
        })

    # Build edges from DB
    from app.models.dam import WaterEdge
    db_edges = db.query(WaterEdge).all()
    edges = []
    dam_ids_in_state = {d["dam_id"] for d in dam_states}
    for e in db_edges:
        if e.source_id in dam_ids_in_state and e.target_id in dam_ids_in_state:
            edges.append({
                "source_id": e.source_id,
                "target_id": e.target_id,
                "distance_km": e.distance_km or 30,
                "is_natural": e.relation_type in ("feeds", "contains_dam"),
            })

    if not dam_states:
        return {"status": "error", "message": "No dam data found in database."}

    result = predict_transfers(dam_states, edges)

    return {
        "status": "ok",
        "month": req.month,
        **result,
    }


@router.get("/recommendations/latest")
async def get_latest_recommendations(db: Session = Depends(get_db)):
    """Get the latest transfer recommendations using current state."""
    from sqlalchemy import func

    subq = (
        db.query(DamLevel.dam_id, func.max(DamLevel.date).label("max_date"))
        .group_by(DamLevel.dam_id)
        .subquery()
    )
    latest = (
        db.query(DamLevel)
        .join(subq, (DamLevel.dam_id == subq.c.dam_id) & (DamLevel.date == subq.c.max_date))
        .all()
    )

    # Quick analysis without GNN
    recommendations = []
    surplus_dams = []
    deficit_dams = []

    for level in latest:
        fill = level.fill_ratio or 0
        cap = level.capacity_m3 or 0

        if fill > 0.85:
            surplus_dams.append({"name": level.dam_name, "fill": fill, "excess_m3": (fill - 0.7) * cap})
        elif fill < 0.40:
            deficit_dams.append({"name": level.dam_name, "fill": fill, "deficit_m3": (0.5 - fill) * cap})

    for deficit in sorted(deficit_dams, key=lambda x: x["fill"]):
        for surplus in sorted(surplus_dams, key=lambda x: -x["fill"]):
            if surplus["excess_m3"] <= 0:
                continue
            vol = min(deficit["deficit_m3"], surplus["excess_m3"])
            if vol < 100_000:
                continue
            recommendations.append({
                "source": surplus["name"],
                "target": deficit["name"],
                "volume_m3": round(vol, 0),
                "priority": "URGENT" if deficit["fill"] < 0.15 else "HIGH",
                "reason": f"{deficit['name']} at {deficit['fill']*100:.1f}%, {surplus['name']} has excess at {surplus['fill']*100:.1f}%",
            })
            surplus["excess_m3"] -= vol
            deficit["deficit_m3"] -= vol

    return {
        "status": "ok",
        "recommendations": recommendations,
        "surplus_dams": len(surplus_dams),
        "deficit_dams": len(deficit_dams),
    }
