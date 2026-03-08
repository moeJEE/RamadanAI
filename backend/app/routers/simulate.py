"""API routes for simulation — scenario what-if."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.graph import SimulationParams, SimulationResult
from app.services.simulation import run_simulation

router = APIRouter()


@router.post("/simulate", response_model=SimulationResult)
def simulate(params: SimulationParams, db: Session = Depends(get_db)):
    """Run a what-if simulation with given parameters."""
    return run_simulation(db, params)
