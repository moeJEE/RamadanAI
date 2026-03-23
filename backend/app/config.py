"""Application settings — Pydantic BaseSettings."""

from pathlib import Path
from pydantic_settings import BaseSettings

# Resolve paths relative to this file
BASE_DIR = Path(__file__).resolve().parent.parent          # backend/
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
DB_DIR = DATA_DIR / "db"
MODELS_DIR = DATA_DIR / "models"

# CSV files in the data directory
CSV_BARRAGES = DATA_DIR / "barrages_rsk_data.csv"
CSV_NODES = DATA_DIR / "rsk_water_nodes.csv"
CSV_EDGES = DATA_DIR / "rsk_water_edges.csv"
CSV_MONOGRAPHIE = DATA_DIR / "rabat_sale_kenitra_water_nodes (1).csv"


class Settings(BaseSettings):
    """App-wide configuration."""

    APP_TITLE: str = "AquaRoute AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = f"sqlite:///{DB_DIR / 'aquaroute.db'}"

    # CORS — frontend dev server
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    ]

    # Open-Meteo
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"

    # RSK weather coordinates (Rabat, Salé, Kénitra, Témara)
    WEATHER_POINTS: list[dict] = [
        {"name": "Rabat",   "lat": 34.0209, "lon": -6.8416},
        {"name": "Salé",    "lat": 34.0331, "lon": -6.7985},
        {"name": "Kénitra", "lat": 34.2610, "lon": -6.5802},
        {"name": "Témara",  "lat": 33.9267, "lon": -6.9111},
    ]

    # Gemini LLM (for AI agent)
    GEMINI_API_KEY: str = ""

    # Runoff coefficients by basin (README §16.2)
    RUNOFF_COEFFICIENTS: dict[str, float] = {
        "Bouregreg-Chaouia": 0.25,
        "Sebou": 0.30,
    }

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
