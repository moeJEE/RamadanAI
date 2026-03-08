"""Unit conversion utilities — README §16.1."""


def mm3_to_m3(mm3: float) -> float:
    """Convert Millions of m³ to m³."""
    return mm3 * 1_000_000


def m3_to_mm3(m3: float) -> float:
    """Convert m³ to Millions of m³."""
    return m3 / 1_000_000


def precip_to_inflow_m3(precip_mm: float, catchment_area_km2: float, runoff_coef: float) -> float:
    """Estimate water inflow from precipitation.

    Formula: precip_mm × catchment_area_m² × runoff_coef / 1000
    """
    catchment_area_m2 = catchment_area_km2 * 1e6
    return precip_mm * catchment_area_m2 * runoff_coef / 1000


def evap_to_m3(et0_mm: float, surface_reservoir_km2: float) -> float:
    """Convert evapotranspiration to m³ lost.

    Formula: ET0_mm × surface_reservoir_m² / 1000
    """
    surface_m2 = surface_reservoir_km2 * 1e6
    return et0_mm * surface_m2 / 1000


def fill_ratio_status(ratio: float) -> str:
    """Map fill ratio to a human-readable status label."""
    if ratio < 0.15:
        return "critical"
    elif ratio < 0.40:
        return "low"
    elif ratio < 0.65:
        return "medium"
    elif ratio < 0.85:
        return "good"
    elif ratio < 0.95:
        return "full"
    else:
        return "overflow_risk"
