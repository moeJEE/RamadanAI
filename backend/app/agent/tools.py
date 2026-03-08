"""Agent tools — functions that the AquaRoute agent can invoke.

Each tool wraps a backend service call and returns structured data
that the agent can interpret and present to the user.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Optional

from app.models.dam import DamNode, DamLevel, WaterEdge
from app.models.weather import WeatherForecast
from app.services.alert_service import evaluate_alerts
from app.services.simulation import run_simulation
from app.services.graph_service import get_snapshot
from app.schemas.graph import SimulationParams
from app.utils.conversions import fill_ratio_status
from app.ml.synthetic_data import CAPACITY_M3


def tool_get_dam_status(db: Session, dam_id: Optional[str] = None) -> Dict:
    """Get current status of one or all dams."""
    subq = (
        db.query(DamLevel.dam_id, func.max(DamLevel.date).label("max_date"))
        .group_by(DamLevel.dam_id)
        .subquery()
    )
    q = db.query(DamLevel).join(
        subq, (DamLevel.dam_id == subq.c.dam_id) & (DamLevel.date == subq.c.max_date)
    )

    if dam_id:
        q = q.filter(DamLevel.dam_id == dam_id)

    levels = q.all()

    if not levels:
        return {"error": f"Aucun barrage trouvé" + (f" avec l'ID '{dam_id}'" if dam_id else "")}

    dams_status = []
    for l in sorted(levels, key=lambda x: x.fill_ratio or 0):
        fill = l.fill_ratio or 0
        status = fill_ratio_status(fill)
        dams_status.append({
            "id": l.dam_id,
            "nom": l.dam_name,
            "date": str(l.date),
            "taux_remplissage": f"{fill * 100:.1f}%",
            "reserve_Mm3": f"{(l.reserve_m3 or 0) / 1e6:.1f}",
            "capacite_Mm3": f"{(l.capacity_m3 or 0) / 1e6:.1f}",
            "statut": status,
        })

    total_reserve = sum(l.reserve_m3 or 0 for l in levels)
    total_capacity = sum(l.capacity_m3 or 0 for l in levels)
    avg_fill = sum(l.fill_ratio or 0 for l in levels) / len(levels) if levels else 0

    return {
        "barrages": dams_status,
        "resume": {
            "nombre": len(dams_status),
            "reserve_totale_Mm3": f"{total_reserve / 1e6:.1f}",
            "capacite_totale_Mm3": f"{total_capacity / 1e6:.1f}",
            "taux_moyen": f"{avg_fill * 100:.1f}%",
        },
    }


def tool_get_alerts(db: Session) -> Dict:
    """Get current alerts."""
    alerts = evaluate_alerts(db)

    if not alerts:
        return {"alertes": [], "message": "Aucune alerte active. Situation nominale."}

    return {
        "alertes": [
            {
                "severite": a.severity,
                "type": a.type,
                "barrage": a.dam_name,
                "message": a.message,
                "recommandation": a.recommendation,
            }
            for a in alerts
        ],
        "nombre_critiques": sum(1 for a in alerts if a.severity == "CRITICAL"),
        "nombre_avertissements": sum(1 for a in alerts if a.severity == "WARNING"),
    }


def tool_get_weather(db: Session) -> Dict:
    """Get latest weather forecasts."""
    forecasts = (
        db.query(WeatherForecast)
        .order_by(WeatherForecast.date.desc())
        .limit(28)  # 4 locations × 7 days
        .all()
    )

    if not forecasts:
        return {
            "message": "Aucune prevision meteo en base. Utilisez GET /api/v1/weather/fetch pour recuperer les previsions Open-Meteo.",
            "previsions": [],
        }

    by_location = {}
    for f in forecasts:
        loc = f.location_name
        if loc not in by_location:
            by_location[loc] = []
        by_location[loc].append({
            "date": str(f.date),
            "precip_mm": f.precip_mm,
            "temp_max": f.temp_max,
            "temp_min": f.temp_min,
        })

    return {"previsions": by_location}


def tool_run_simulation(db: Session, scenario: str = "custom",
                        precip_mult: float = 1.0,
                        demand_mult: float = 1.0) -> Dict:
    """Run a what-if simulation."""
    params = SimulationParams(
        precip_multiplier=precip_mult,
        demand_pop_multiplier=demand_mult,
        scenario=scenario,
        horizon_days=7,
    )
    result = run_simulation(db, params)

    return {
        "scenario": result.scenario,
        "horizon": f"{result.horizon_days} jours",
        "barrages": [
            {
                "nom": d.dam_name,
                "actuel": f"{d.current_fill}%",
                "projete": f"{d.projected_fill}%",
                "variation": f"{d.change_pct:+.1f}%",
                "risque": d.risk_flag or "aucun",
            }
            for d in result.dam_results
        ],
        "transferts_recommandes": [
            {
                "de": t.source_dam,
                "vers": t.target_dam,
                "volume_Mm3": f"{t.volume_m3 / 1e6:.2f}",
            }
            for t in result.transfers
        ],
        "score_equite": result.equity_score,
    }


def tool_get_network(db: Session) -> Dict:
    """Get network graph summary."""
    snapshot = get_snapshot(db)
    nodes = snapshot["nodes"]
    edges = snapshot["edges"]

    types_count = {}
    for n in nodes:
        t = n["type"]
        types_count[t] = types_count.get(t, 0) + 1

    return {
        "noeuds": len(nodes),
        "connexions": len(edges),
        "types": types_count,
        "barrages": [
            {"id": n["id"], "nom": n["name"], "bassin": n.get("basin", "inconnu")}
            for n in nodes if n["type"] == "dam"
        ],
    }


# ── Tool registry ──
TOOLS = {
    "dam_status": {
        "fn": tool_get_dam_status,
        "description": "Obtenir le statut actuel des barrages (taux de remplissage, reserve, capacite)",
        "keywords": ["barrage", "niveau", "remplissage", "reserve", "capacite", "eau", "statut", "taux", "dam"],
    },
    "alerts": {
        "fn": tool_get_alerts,
        "description": "Verifier les alertes actives (risque de crue, stress hydrique, niveau critique)",
        "keywords": ["alerte", "risque", "crue", "critique", "stress", "danger", "urgence", "warning"],
    },
    "weather": {
        "fn": tool_get_weather,
        "description": "Consulter les previsions meteo pour la region RSK",
        "keywords": ["meteo", "pluie", "temperature", "temps", "prevision", "precipitation", "weather"],
    },
    "simulation": {
        "fn": tool_run_simulation,
        "description": "Executer une simulation de scenario (secheresse, pluie forte, pic d'irrigation)",
        "keywords": ["simulation", "scenario", "projeter", "prevoir", "secheresse", "pluie forte", "what-if", "que se passe"],
    },
    "network": {
        "fn": tool_get_network,
        "description": "Voir le reseau hydrique (noeuds, connexions, bassins versants)",
        "keywords": ["reseau", "graphe", "connexion", "bassin", "transfert", "topologie", "network"],
    },
}
