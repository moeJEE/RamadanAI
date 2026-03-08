"""API routes for weather — ingestion, consultation, live fetch."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.weather import WeatherForecast
from app.schemas.weather import WeatherPayload, WeatherForecastOut, WeatherLocationForecast
from app.services.weather_service import fetch_open_meteo_forecast

router = APIRouter()


@router.post("/ingest")
async def ingest_weather(data: WeatherPayload, db: Session = Depends(get_db)):
    """Ingest a weather forecast payload for a specific dam."""
    count = 0
    for fc in data.forecast:
        entry = WeatherForecast(
            dam_id=data.dam_id,
            location_name=data.dam_id,
            date=fc.date,
            precip_mm=fc.precip_mm,
            temp_max=fc.temp_max,
            temp_min=fc.temp_min,
            temp_mean=fc.temp_mean,
            evap_mm=fc.evap_mm,
            wind_kmh=fc.wind_kmh,
            precip_hours=fc.precip_hours,
            fetched_at=data.timestamp,
        )
        db.add(entry)
        count += 1

    db.commit()
    return {"status": "ok", "dam_id": data.dam_id, "days_ingested": count}


@router.get("/fetch", response_model=List[WeatherLocationForecast])
async def fetch_live_weather(
    save: bool = Query(False, description="Also save to database"),
    db: Session = Depends(get_db),
):
    """Fetch live 7-day weather from Open-Meteo for all RSK locations."""
    raw_results = await fetch_open_meteo_forecast()

    results = []
    for loc in raw_results:
        forecasts_out = []
        for fc in loc["forecasts"]:
            forecasts_out.append(WeatherForecastOut(
                location_name=loc["location"],
                date=fc["date"],
                precip_mm=fc["precip_mm"],
                temp_max=fc.get("temp_max"),
                temp_min=fc.get("temp_min"),
                temp_mean=fc.get("temp_mean"),
                evap_mm=fc.get("evap_mm"),
                wind_kmh=fc.get("wind_kmh"),
            ))

            if save:
                entry = WeatherForecast(
                    location_name=loc["location"],
                    date=fc["date"],
                    precip_mm=fc["precip_mm"],
                    temp_max=fc.get("temp_max"),
                    temp_min=fc.get("temp_min"),
                    temp_mean=fc.get("temp_mean"),
                    evap_mm=fc.get("evap_mm"),
                    wind_kmh=fc.get("wind_kmh"),
                    precip_hours=fc.get("precip_hours"),
                    fetched_at=datetime.utcnow().isoformat(),
                )
                db.add(entry)

        results.append(WeatherLocationForecast(
            location=loc["location"],
            lat=loc["lat"],
            lon=loc["lon"],
            forecasts=forecasts_out,
        ))

    if save:
        db.commit()

    return results


@router.get("/{location}", response_model=List[WeatherForecastOut])
def get_weather_by_location(
    location: str,
    db: Session = Depends(get_db),
):
    """Get stored weather forecasts for a specific location or dam_id."""
    forecasts = (
        db.query(WeatherForecast)
        .filter(
            (WeatherForecast.location_name == location) |
            (WeatherForecast.dam_id == location)
        )
        .order_by(WeatherForecast.date.desc())
        .limit(14)
        .all()
    )
    return forecasts
