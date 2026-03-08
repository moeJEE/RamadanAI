"""API routes for the water network graph."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.graph import GraphSnapshot
from app.services.graph_service import get_snapshot, get_subgraph

router = APIRouter()


@router.get("/snapshot", response_model=GraphSnapshot)
def graph_snapshot(db: Session = Depends(get_db)):
    """Full snapshot of the water network graph (nodes + edges)."""
    return get_snapshot(db)


@router.get("/subgraph")
def graph_subgraph(
    center: str = Query(..., description="Center node ID"),
    depth: int = Query(2, ge=1, le=5, description="Traversal depth"),
    db: Session = Depends(get_db),
):
    """Subgraph centered on a specific node with configurable depth."""
    return get_subgraph(db, center, depth)
