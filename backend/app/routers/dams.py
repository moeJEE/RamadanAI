"""API routes for dams — CRUD, ingestion, KPIs."""

from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.dam import DamNode, DamLevel
from app.schemas.dam import DamNodeOut, DamLevelOut, DamSummary, DamRanking
from app.utils.conversions import fill_ratio_status
from app.services.ingestion import seed_all
from app.services.graph_service import invalidate_cache

router = APIRouter()


@router.get("", response_model=List[DamNodeOut])
def list_dams(
    type: Optional[str] = Query(None, description="Filter by node type (dam, basin, city, etc.)"),
    db: Session = Depends(get_db),
):
    """List all water nodes (optionally filtered by type)."""
    q = db.query(DamNode)
    if type:
        q = q.filter(DamNode.type == type)
    return q.order_by(DamNode.name).all()


@router.get("/summary", response_model=DamSummary)
def get_summary(db: Session = Depends(get_db)):
    """Aggregated KPIs — total reserve, average fill, alert counts."""
    from sqlalchemy import func, distinct

    # Get latest level per dam (subquery for max date per dam_id)
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

    total_reserve = sum(l.reserve_m3 or 0 for l in latest_levels)
    total_capacity = sum(l.capacity_m3 or 0 for l in latest_levels)
    fills = [l.fill_ratio for l in latest_levels if l.fill_ratio is not None]
    avg_fill = sum(fills) / len(fills) if fills else 0

    return DamSummary(
        total_reserve_m3=total_reserve,
        total_capacity_m3=total_capacity,
        avg_fill_ratio=round(avg_fill, 4),
        dam_count=len(latest_levels),
        critical_count=sum(1 for f in fills if f < 0.15),
        warning_count=sum(1 for f in fills if 0.15 <= f < 0.40),
        overflow_risk_count=sum(1 for f in fills if f > 0.95),
    )


@router.get("/ranking", response_model=List[DamRanking])
def get_ranking(db: Session = Depends(get_db)):
    """Rank dams by fill ratio (descending)."""
    from sqlalchemy import func

    subq = (
        db.query(DamLevel.dam_id, func.max(DamLevel.date).label("max_date"))
        .group_by(DamLevel.dam_id)
        .subquery()
    )
    latest_levels = (
        db.query(DamLevel)
        .join(subq, (DamLevel.dam_id == subq.c.dam_id) & (DamLevel.date == subq.c.max_date))
        .order_by(DamLevel.fill_ratio.desc())
        .all()
    )

    # Build ranking with coordinates from DamNode
    node_map = {n.id: n for n in db.query(DamNode).all()}

    return [
        DamRanking(
            dam_id=l.dam_id,
            dam_name=l.dam_name,
            fill_ratio=round(l.fill_ratio or 0, 4),
            reserve_m3=l.reserve_m3 or 0,
            capacity_m3=l.capacity_m3 or 0,
            status=fill_ratio_status(l.fill_ratio or 0),
            lat=node_map.get(l.dam_id, None) and node_map[l.dam_id].lat,
            lon=node_map.get(l.dam_id, None) and node_map[l.dam_id].lon,
            basin=node_map.get(l.dam_id, None) and node_map[l.dam_id].basin,
            latest_date=str(l.date) if l.date else None,
        )
        for l in latest_levels
    ]


@router.get("/{dam_id}/levels", response_model=List[DamLevelOut])
def get_dam_levels(
    dam_id: str,
    limit: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Get historical levels for a specific dam."""
    levels = (
        db.query(DamLevel)
        .filter(DamLevel.dam_id == dam_id)
        .order_by(DamLevel.date.desc())
        .limit(limit)
        .all()
    )
    return levels


@router.post("/seed")
def seed_database(db: Session = Depends(get_db)):
    """Seed the database from CSV files (development endpoint)."""
    seed_all(db)
    invalidate_cache()
    return {"status": "ok", "message": "Database seeded from CSV files"}
