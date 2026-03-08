"""Alert rules engine — evaluates dam conditions against thresholds."""

import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List

from app.models.dam import DamNode, DamLevel
from app.models.weather import WeatherForecast
from app.schemas.graph import Alert


# ── Thresholds (README §11) ──
FLOOD_PRECIP_THRESHOLD_MM = 15.0
FLOOD_FILL_THRESHOLD = 0.85
CRITICAL_LOW_THRESHOLD = 0.15
WATER_STRESS_THRESHOLD = 0.40  # simplified: fill_ratio < 40% with declining trend


def evaluate_alerts(db: Session) -> List[Alert]:
    """Evaluate all alert rules against the current state of dams."""
    alerts: List[Alert] = []

    # Get all dam nodes
    dams = db.query(DamNode).filter(DamNode.type == "dam").all()

    for dam in dams:
        # Get latest level
        latest = (
            db.query(DamLevel)
            .filter(DamLevel.dam_id == dam.id)
            .order_by(DamLevel.date.desc())
            .first()
        )
        if not latest or latest.fill_ratio is None:
            continue

        fill = latest.fill_ratio

        # Get upcoming precipitation (max in next 7 days)
        max_precip = 0.0
        forecasts = (
            db.query(WeatherForecast)
            .order_by(WeatherForecast.date.asc())
            .limit(28)  # 4 locations × 7 days
            .all()
        )
        if forecasts:
            max_precip = max((f.precip_mm or 0) for f in forecasts)

        # Rule 1: FLOOD_RISK — precip > 15mm AND fill > 85%
        if max_precip > FLOOD_PRECIP_THRESHOLD_MM and fill > FLOOD_FILL_THRESHOLD:
            alerts.append(Alert(
                id=str(uuid.uuid4())[:8],
                severity="CRITICAL",
                type="FLOOD_RISK",
                dam_id=dam.id,
                dam_name=dam.name,
                message=f"Risque de crue : précipitation {max_precip:.1f}mm prévue avec taux de remplissage à {fill*100:.1f}%",
                recommendation=f"Vidange préventive recommandée. Réduire le niveau de {(fill - 0.80)*100:.0f}% avant l'épisode pluvieux.",
                created_at=datetime.utcnow().isoformat(),
                fill_ratio=fill,
                precip_mm=max_precip,
            ))

        # Rule 2: CRITICAL_LOW — fill < 15%
        elif fill < CRITICAL_LOW_THRESHOLD:
            alerts.append(Alert(
                id=str(uuid.uuid4())[:8],
                severity="CRITICAL",
                type="CRITICAL_LOW",
                dam_id=dam.id,
                dam_name=dam.name,
                message=f"Niveau critique : taux de remplissage à {fill*100:.1f}% — réserve insuffisante",
                recommendation="Transfert d'urgence depuis un barrage excédentaire recommandé.",
                created_at=datetime.utcnow().isoformat(),
                fill_ratio=fill,
            ))

        # Rule 3: WATER_STRESS — fill < 40%
        elif fill < WATER_STRESS_THRESHOLD:
            alerts.append(Alert(
                id=str(uuid.uuid4())[:8],
                severity="WARNING",
                type="WATER_STRESS",
                dam_id=dam.id,
                dam_name=dam.name,
                message=f"Stress hydrique : taux de remplissage à {fill*100:.1f}% — tendance baissière",
                recommendation="Surveiller l'évolution. Transfert préventif envisageable.",
                created_at=datetime.utcnow().isoformat(),
                fill_ratio=fill,
            ))

        # Rule 4: OVERFLOW_RISK — fill > 95% (even without heavy rain)
        elif fill > 0.95:
            alerts.append(Alert(
                id=str(uuid.uuid4())[:8],
                severity="WARNING",
                type="OVERFLOW_RISK",
                dam_id=dam.id,
                dam_name=dam.name,
                message=f"Risque de débordement : taux de remplissage à {fill*100:.1f}%",
                recommendation="Vidange contrôlée ou transfert vers barrages déficitaires.",
                created_at=datetime.utcnow().isoformat(),
                fill_ratio=fill,
            ))

    # Sort by severity (CRITICAL first)
    severity_order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
    alerts.sort(key=lambda a: severity_order.get(a.severity, 99))

    return alerts
