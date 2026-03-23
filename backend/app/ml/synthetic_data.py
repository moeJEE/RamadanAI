"""Synthetic dataset generator for ML training.

Generates realistic demand and weather feature time-series
based on heuristics from the README §16.3.

Includes Ramadan-specific demand patterns:
- Population demand spikes +15% (iftar cooking, post-iftar cleaning)
- Industrial demand drops -15% (reduced working hours)
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta, date
from typing import Dict, List, Tuple


# ── Ramadan approximate date ranges (Hijri calendar shifts ~11 days/year) ──
RAMADAN_PERIODS = [
    (date(2024, 3, 11), date(2024, 4, 9)),    # Ramadan 2024
    (date(2025, 2, 28), date(2025, 3, 30)),    # Ramadan 2025
    (date(2026, 2, 17), date(2026, 3, 19)),    # Ramadan 2026
]


def is_ramadan_date(d: date) -> bool:
    """Check if a given date falls within a Ramadan period."""
    for start, end in RAMADAN_PERIODS:
        if start <= d <= end:
            return True
    return False


# ── Regional parameters (Rabat-Salé-Kénitra) ──
POPULATION_BY_DAM = {
    "dam_smba": 2_500_000,       # Rabat-Salé metro
    "dam_tamesna": 300_000,      # Berrechid plain
    "dam_el_mellah": 500_000,    # Mohammedia area
    "dam_el_himer": 150_000,     # Settat rural
    "dam_maazer": 120_000,       # Berrechid rural
    "dam_oued_hassar": 400_000,  # Mediouna/Casablanca periphery
    "dam_ain_kouachia": 200_000, # Skhirate-Témara
    "dam_zamrine": 80_000,       # Rural Settat
}

CAPACITY_M3 = {
    "dam_smba": 974_788_000,
    "dam_tamesna": 52_000_000,
    "dam_el_mellah": 18_000_000,
    "dam_el_himer": 12_000_000,
    "dam_maazer": 8_000_000,
    "dam_oued_hassar": 5_000_000,
    "dam_ain_kouachia": 11_000_000,
    "dam_zamrine": 4_960_000,
}

IRRIGATION_AREA_HA = {
    "dam_smba": 5000,
    "dam_tamesna": 2000,
    "dam_el_mellah": 800,
    "dam_el_himer": 1500,
    "dam_maazer": 600,
    "dam_oued_hassar": 200,
    "dam_ain_kouachia": 400,
    "dam_zamrine": 300,
}

CATCHMENT_AREA_KM2 = {
    "dam_smba": 9800,
    "dam_tamesna": 1200,
    "dam_el_mellah": 1800,
    "dam_el_himer": 600,
    "dam_maazer": 400,
    "dam_oued_hassar": 350,
    "dam_ain_kouachia": 250,
    "dam_zamrine": 200,
}


def _seasonal_factor(day_of_year: int) -> Dict[str, float]:
    """Seasonal multipliers for demand components."""
    # Morocco: hot dry summer (Jun-Sep), mild wet winter (Nov-Mar)
    angle = 2 * np.pi * day_of_year / 365

    # Population demand peaks in summer (heat)
    pop_factor = 1.0 + 0.25 * np.sin(angle - np.pi / 2)  # peak ~July

    # Agriculture: irrigation season April-September
    if 90 <= day_of_year <= 270:  # Apr-Sep
        agri_factor = 1.0 + 0.5 * np.sin(np.pi * (day_of_year - 90) / 180)
        irr_flag = 1
    else:
        agri_factor = 0.15  # minimal irrigation in winter
        irr_flag = 0

    # Industry: fairly constant, slight summer dip
    industry_factor = 1.0 - 0.1 * np.sin(angle - np.pi / 2)

    return {
        "pop_factor": pop_factor,
        "agri_factor": agri_factor,
        "industry_factor": industry_factor,
        "irrigation_season_flag": irr_flag,
    }


def _generate_weather_features(n_days: int, rng: np.random.Generator) -> pd.DataFrame:
    """Generate synthetic daily weather features for the RSK region."""
    dates = [datetime(2024, 1, 1) + timedelta(days=i) for i in range(n_days)]
    records = []

    for i, dt in enumerate(dates):
        doy = dt.timetuple().tm_yday
        angle = 2 * np.pi * doy / 365

        # Temperature: 10-35°C range, peaking in August
        temp_mean = 20 + 8 * np.sin(angle - np.pi / 3) + rng.normal(0, 2)
        temp_max = temp_mean + 3 + rng.exponential(1.5)
        temp_min = temp_mean - 3 - rng.exponential(1.5)

        # Precipitation: rainy season Oct-Apr, dry May-Sep
        if doy < 120 or doy > 280:  # wet season
            precip_prob = 0.35
            precip_intensity = rng.exponential(8)
        else:  # dry season
            precip_prob = 0.05
            precip_intensity = rng.exponential(2)

        precip_mm = precip_intensity if rng.random() < precip_prob else 0.0

        # Evapotranspiration (ET0): 1-8 mm/day, peak summer
        et0 = 2.5 + 3.5 * np.sin(angle - np.pi / 3) + rng.normal(0, 0.5)
        et0 = max(0.5, et0)

        # Wind
        wind_kmh = 10 + 5 * np.sin(angle) + rng.normal(0, 3)
        wind_kmh = max(0, wind_kmh)

        records.append({
            "date": dt,
            "day_of_year": doy,
            "month": dt.month,
            "month_sin": np.sin(2 * np.pi * dt.month / 12),
            "month_cos": np.cos(2 * np.pi * dt.month / 12),
            "temp_mean": round(temp_mean, 1),
            "temp_max": round(temp_max, 1),
            "temp_min": round(temp_min, 1),
            "precip_mm": round(max(0, precip_mm), 1),
            "et0_mm": round(et0, 2),
            "wind_kmh": round(wind_kmh, 1),
        })

    return pd.DataFrame(records)


def generate_dam_dataset(
    dam_id: str,
    weather_df: pd.DataFrame,
    rng: np.random.Generator,
) -> pd.DataFrame:
    """Generate synthetic demand + inflow features for one dam."""

    pop = POPULATION_BY_DAM.get(dam_id, 200_000)
    capacity = CAPACITY_M3.get(dam_id, 50_000_000)
    irr_ha = IRRIGATION_AREA_HA.get(dam_id, 500)
    catchment = CATCHMENT_AREA_KM2.get(dam_id, 500)

    records = []
    fill_ratio = 0.6 + rng.normal(0, 0.1)  # Initial fill

    for _, w in weather_df.iterrows():
        doy = w["day_of_year"]
        sf = _seasonal_factor(doy)

        # ── Ramadan detection ──
        current_date = w["date"].date() if hasattr(w["date"], 'date') else w["date"]
        ramadan_flag = 1 if is_ramadan_date(current_date) else 0

        # ── Demand (README §7.2 heuristics) ──
        # Population: ~150 L/person/day × seasonal factor
        pop_m3 = pop * 0.150 * sf["pop_factor"] * (1 + rng.normal(0, 0.05))

        # Ramadan: population demand spikes +15% (iftar cooking & cleaning)
        if ramadan_flag:
            pop_m3 *= 1.15

        # Agriculture: irrigation_area_ha × crop_coef × irrigation_fraction
        crop_coef = 0.8 + 0.4 * np.sin(2 * np.pi * doy / 365 - np.pi / 4)
        agri_m3 = irr_ha * 10 * crop_coef * sf["agri_factor"] * (1 + rng.normal(0, 0.1))
        agri_m3 = max(0, agri_m3)

        # Industry: ~20% of domestic (Ramadan: -15% reduced hours)
        industry_m3 = pop_m3 * 0.20 * sf["industry_factor"] * (1 + rng.normal(0, 0.08))
        if ramadan_flag:
            industry_m3 *= 0.85

        total_demand_m3 = pop_m3 + agri_m3 + industry_m3

        # ── Inflow ──
        runoff_coef = 0.25  # Bouregreg-Chaouia
        inflow_m3 = w["precip_mm"] * catchment * 1e6 * runoff_coef / 1000
        inflow_m3 *= (1 + rng.normal(0, 0.15))
        inflow_m3 = max(0, inflow_m3)

        # ── Evaporation ──
        surface_km2 = (fill_ratio * capacity / 1e6) * 0.01  # rough surface estimate
        evap_m3 = w["et0_mm"] * surface_km2 * 1e6 / 1000

        # ── Fill ratio evolution ──
        delta = (inflow_m3 - total_demand_m3 - evap_m3) / capacity
        fill_ratio = np.clip(fill_ratio + delta, 0.01, 1.0)

        records.append({
            "date": w["date"],
            "dam_id": dam_id,
            "day_of_year": doy,
            "month": w["month"],
            "month_sin": w["month_sin"],
            "month_cos": w["month_cos"],
            "temp_mean": w["temp_mean"],
            "temp_max": w["temp_max"],
            "temp_min": w["temp_min"],
            "precip_mm": w["precip_mm"],
            "et0_mm": w["et0_mm"],
            "wind_kmh": w["wind_kmh"],
            "population": pop,
            "irrigation_area_ha": irr_ha,
            "catchment_area_km2": catchment,
            "irrigation_season_flag": sf["irrigation_season_flag"],
            "is_ramadan": ramadan_flag,
            "fill_ratio": round(fill_ratio, 4),
            "inflow_m3": round(inflow_m3, 0),
            "evap_m3": round(evap_m3, 0),
            # Targets
            "pop_m3": round(pop_m3, 0),
            "industry_m3": round(industry_m3, 0),
            "agri_m3": round(agri_m3, 0),
            "total_demand_m3": round(total_demand_m3, 0),
        })

    df = pd.DataFrame(records)

    # Add lag features
    for lag in [1, 7, 14, 30]:
        df[f"demand_lag_{lag}d"] = df["total_demand_m3"].shift(lag).bfill()
        df[f"fill_lag_{lag}d"] = df["fill_ratio"].shift(lag).bfill()

    return df


def generate_full_dataset(n_days: int = 730, seed: int = 42) -> pd.DataFrame:
    """Generate the full synthetic dataset for all dams (2 years)."""
    rng = np.random.default_rng(seed)
    weather = _generate_weather_features(n_days, rng)

    all_dfs = []
    for dam_id in POPULATION_BY_DAM.keys():
        dam_df = generate_dam_dataset(dam_id, weather, rng)
        all_dfs.append(dam_df)

    full_df = pd.concat(all_dfs, ignore_index=True)
    print(f"  Generated {len(full_df)} synthetic records for {len(POPULATION_BY_DAM)} dams ({n_days} days)")
    return full_df
