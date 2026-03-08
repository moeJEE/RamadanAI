"""Pydantic schemas for weather API."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import date as date_type


class DailyForecast(BaseModel):
    date: str
    precip_mm: float
    temp_max: Optional[float] = None
    temp_min: Optional[float] = None
    temp_mean: Optional[float] = None
    evap_mm: Optional[float] = None
    wind_kmh: Optional[float] = None
    precip_hours: Optional[float] = None


class WeatherPayload(BaseModel):
    """Incoming weather forecast ingestion payload."""
    dam_id: str
    timestamp: str
    forecast: List[DailyForecast]


class WeatherForecastOut(BaseModel):
    location_name: str
    date: date_type
    precip_mm: float
    temp_max: Optional[float] = None
    temp_min: Optional[float] = None
    temp_mean: Optional[float] = None
    evap_mm: Optional[float] = None
    wind_kmh: Optional[float] = None

    class Config:
        from_attributes = True


class WeatherLocationForecast(BaseModel):
    """Full 7-day forecast for one location."""
    location: str
    lat: float
    lon: float
    forecasts: List[WeatherForecastOut]
