"""Simulation service — scenario what-if analysis."""

from sqlalchemy.orm import Session
from typing import List

from app.models.dam import DamNode, DamLevel
from app.schemas.graph import (
    SimulationParams, SimulationResult, DamSimResult, TransferRecommendation,
)
from app.utils.conversions import fill_ratio_status


def run_simulation(db: Session, params: SimulationParams) -> SimulationResult:
    """Execute a what-if simulation based on provided parameters.

    This is a simplified PoC simulation that projects dam levels forward.
    """
    # Get all dams with latest levels
    dams = db.query(DamNode).filter(DamNode.type == "dam").all()
    dam_results: List[DamSimResult] = []
    surplus_dams: List[dict] = []
    deficit_dams: List[dict] = []

    for dam in dams:
        latest = (
            db.query(DamLevel)
            .filter(DamLevel.dam_id == dam.id)
            .order_by(DamLevel.date.desc())
            .first()
        )
        if not latest or latest.fill_ratio is None:
            continue

        current_fill = latest.fill_ratio
        capacity = dam.capacity_m3 or (latest.capacity_m3 or 1_000_000)

        # Simplified projection model:
        # Daily change = (inflow_from_rain × precip_mult) - (demand × demand_mult) - evaporation
        # Using basic heuristics for PoC

        # Base daily inflow estimate (mm → m³, simplified)
        base_daily_inflow_ratio = 0.002 * params.precip_multiplier  # ~0.2% per day from rain
        base_daily_demand_ratio = 0.003 * params.demand_pop_multiplier  # ~0.3% per day demand
        base_daily_agri_ratio = 0.002 * params.demand_agri_multiplier   # ~0.2% per day irrigation
        base_daily_evap_ratio = 0.001  # ~0.1% per day evaporation

        daily_change = base_daily_inflow_ratio - base_daily_demand_ratio - base_daily_agri_ratio - base_daily_evap_ratio
        total_change = daily_change * params.horizon_days

        projected_fill = max(0, min(1.0, current_fill + total_change))
        change_pct = (projected_fill - current_fill) * 100

        # Determine risk
        risk_flag = None
        if projected_fill > 0.95 and params.precip_multiplier > 1:
            risk_flag = "FLOOD_RISK"
        elif projected_fill < 0.15:
            risk_flag = "CRITICAL_LOW"
        elif projected_fill < 0.40:
            risk_flag = "WATER_STRESS"

        dam_results.append(DamSimResult(
            dam_id=dam.id,
            dam_name=dam.name,
            current_fill=round(current_fill * 100, 1),
            projected_fill=round(projected_fill * 100, 1),
            change_pct=round(change_pct, 1),
            status=fill_ratio_status(projected_fill),
            risk_flag=risk_flag,
        ))

        # Track surplus/deficit for transfer recommendations
        if projected_fill > 0.85:
            surplus_dams.append({
                "dam": dam,
                "excess_m3": (projected_fill - 0.70) * capacity,
                "fill": projected_fill,
            })
        elif projected_fill < 0.40:
            deficit_dams.append({
                "dam": dam,
                "deficit_m3": (0.50 - projected_fill) * capacity,
                "fill": projected_fill,
            })

    # Generate transfer recommendations
    transfers: List[TransferRecommendation] = []
    total_energy = 0.0

    for deficit in sorted(deficit_dams, key=lambda x: x["fill"]):
        for surplus in sorted(surplus_dams, key=lambda x: -x["fill"]):
            if surplus["excess_m3"] <= 0:
                continue

            volume = min(deficit["deficit_m3"], surplus["excess_m3"])
            if volume < 100_000:  # Minimum 0.1 Mm³
                continue

            energy = volume * 0.005  # ~5 Wh/m³ transfer cost (simplified)
            transfers.append(TransferRecommendation(
                source_dam=surplus["dam"].name,
                target_dam=deficit["dam"].name,
                volume_m3=round(volume, 0),
                energy_kwh=round(energy / 1000, 1),
            ))
            total_energy += energy / 1000
            surplus["excess_m3"] -= volume
            deficit["deficit_m3"] -= volume

            if deficit["deficit_m3"] <= 0:
                break

    # Equity score: 1 - variance of fill ratios (higher = more equitable)
    fills = [r.projected_fill for r in dam_results if r.projected_fill > 0]
    if fills:
        mean_fill = sum(fills) / len(fills)
        variance = sum((f - mean_fill) ** 2 for f in fills) / len(fills)
        equity_score = max(0, round(1.0 - (variance / 1000), 2))
    else:
        equity_score = 0.0

    scenario_name = params.scenario or "custom"

    return SimulationResult(
        scenario=scenario_name,
        horizon_days=params.horizon_days,
        dam_results=dam_results,
        transfers=transfers,
        total_energy_kwh=round(total_energy, 1),
        equity_score=equity_score,
    )
