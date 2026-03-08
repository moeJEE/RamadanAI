"""Pydantic schemas for API request/response — Dams."""

from pydantic import BaseModel
from typing import Optional
from datetime import date


# -- Response schemas --

class DamNodeOut(BaseModel):
    id: str
    name: str
    type: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    province_region: Optional[str] = None
    basin: Optional[str] = None
    status: Optional[str] = None
    capacity_m3: Optional[float] = None
    annual_resource_m3: Optional[float] = None
    irrigation_area_ha: Optional[float] = None

    class Config:
        from_attributes = True


class DamLevelOut(BaseModel):
    date: date
    dam_id: str
    dam_name: str
    capacity_m3: Optional[float] = None
    reserve_m3: Optional[float] = None
    fill_ratio: Optional[float] = None

    class Config:
        from_attributes = True


class DamSummary(BaseModel):
    """Aggregated KPIs for the dashboard."""
    total_reserve_m3: float
    total_capacity_m3: float
    avg_fill_ratio: float
    dam_count: int
    critical_count: int     # fill < 15%
    warning_count: int      # fill < 40%
    overflow_risk_count: int  # fill > 95%


class DamRanking(BaseModel):
    dam_id: str
    dam_name: str
    fill_ratio: float
    reserve_m3: float
    capacity_m3: float
    status: str  # critical / low / medium / good / full / overflow_risk
    lat: Optional[float] = None
    lon: Optional[float] = None
    basin: Optional[str] = None
    latest_date: Optional[str] = None
