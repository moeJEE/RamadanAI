"""API routes for alerts."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.graph import Alert
from app.services.alert_service import evaluate_alerts

router = APIRouter()


@router.get("", response_model=List[Alert])
def get_alerts(
    dam: Optional[str] = Query(None, description="Filter by dam_id"),
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, WARNING, INFO)"),
    db: Session = Depends(get_db),
):
    """Get computed alerts based on current dam conditions."""
    alerts = evaluate_alerts(db)

    if dam:
        alerts = [a for a in alerts if a.dam_id == dam]
    if severity:
        alerts = [a for a in alerts if a.severity == severity.upper()]

    return alerts
