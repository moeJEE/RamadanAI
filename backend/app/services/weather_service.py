"""Open-Meteo weather API client."""

import httpx
from datetime import datetime
from typing import List, Dict, Any

from app.config import settings


async def fetch_open_meteo_forecast() -> List[Dict[str, Any]]:
    """Fetch 7-day weather forecast for all RSK locations from Open-Meteo.

    Returns a list of location forecasts, each with daily data.
    """
    latitudes = ",".join(str(p["lat"]) for p in settings.WEATHER_POINTS)
    longitudes = ",".join(str(p["lon"]) for p in settings.WEATHER_POINTS)

    params = {
        "latitude": latitudes,
        "longitude": longitudes,
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "precipitation_hours",
            "et0_fao_evapotranspiration",
            "wind_speed_10m_max",
        ]),
        "forecast_days": 7,
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(settings.OPEN_METEO_BASE_URL, params=params)
        resp.raise_for_status()
        raw = resp.json()

    # Open-Meteo returns a list when multiple lat/lon provided
    results = []
    locations = raw if isinstance(raw, list) else [raw]

    for idx, loc_data in enumerate(locations):
        point = settings.WEATHER_POINTS[idx] if idx < len(settings.WEATHER_POINTS) else {"name": f"Point_{idx}", "lat": 0, "lon": 0}
        daily = loc_data.get("daily", {})
        dates = daily.get("time", [])

        forecasts = []
        for i, date_str in enumerate(dates):
            forecasts.append({
                "date": date_str,
                "precip_mm": daily.get("precipitation_sum", [0])[i] or 0,
                "temp_max": daily.get("temperature_2m_max", [None])[i],
                "temp_min": daily.get("temperature_2m_min", [None])[i],
                "temp_mean": (
                    ((daily.get("temperature_2m_max", [0])[i] or 0) +
                     (daily.get("temperature_2m_min", [0])[i] or 0)) / 2
                    if daily.get("temperature_2m_max") and daily.get("temperature_2m_min")
                    else None
                ),
                "evap_mm": daily.get("et0_fao_evapotranspiration", [None])[i],
                "wind_kmh": daily.get("wind_speed_10m_max", [None])[i],
                "precip_hours": daily.get("precipitation_hours", [None])[i],
            })

        results.append({
            "location": point["name"],
            "lat": point["lat"],
            "lon": point["lon"],
            "forecasts": forecasts,
        })

    return results
