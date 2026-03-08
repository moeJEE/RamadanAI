"""SQLAlchemy ORM models for weather data."""

from sqlalchemy import Column, String, Float, Date, Integer
from app.database import Base


class WeatherForecast(Base):
    """7-day weather forecast entry per location."""
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_name = Column(String, nullable=False, index=True)   # Rabat, Salé, etc.
    dam_id = Column(String, nullable=True, index=True)           # Optional link to dam
    date = Column(Date, nullable=False, index=True)
    precip_mm = Column(Float, default=0.0)
    temp_max = Column(Float, nullable=True)
    temp_min = Column(Float, nullable=True)
    temp_mean = Column(Float, nullable=True)
    evap_mm = Column(Float, nullable=True)                       # ET0 FAO
    wind_kmh = Column(Float, nullable=True)
    precip_hours = Column(Float, nullable=True)
    fetched_at = Column(String, nullable=True)                   # ISO timestamp
