"""Pydantic schemas for graph & alerts & simulation."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# -- Graph --

class GraphNode(BaseModel):
    id: str
    name: str
    type: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    basin: Optional[str] = None
    fill_ratio: Optional[float] = None
    capacity_m3: Optional[float] = None
    reserve_m3: Optional[float] = None


class GraphEdge(BaseModel):
    source_id: str
    target_id: str
    relation_type: str
    distance_km: Optional[float] = None
    note: Optional[str] = None


class GraphSnapshot(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


# -- Alerts --

class Alert(BaseModel):
    id: str
    severity: str            # CRITICAL, WARNING, INFO
    type: str                # FLOOD_RISK, CRITICAL_LOW, WATER_STRESS
    dam_id: str
    dam_name: str
    message: str
    recommendation: str
    created_at: str
    fill_ratio: Optional[float] = None
    precip_mm: Optional[float] = None


# -- Simulation --

class SimulationParams(BaseModel):
    precip_multiplier: float = 1.0
    demand_pop_multiplier: float = 1.0
    demand_agri_multiplier: float = 1.0
    horizon_days: int = 7
    scenario: Optional[str] = None  # heavy_rain, drought, irrigation_peak, custom


class DamSimResult(BaseModel):
    dam_id: str
    dam_name: str
    current_fill: float
    projected_fill: float
    change_pct: float
    status: str
    risk_flag: Optional[str] = None


class TransferRecommendation(BaseModel):
    source_dam: str
    target_dam: str
    volume_m3: float
    energy_kwh: Optional[float] = None


class SimulationResult(BaseModel):
    scenario: str
    horizon_days: int
    dam_results: List[DamSimResult]
    transfers: List[TransferRecommendation]
    total_energy_kwh: float
    equity_score: float
