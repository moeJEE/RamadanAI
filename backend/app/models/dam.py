"""SQLAlchemy ORM models for dams and water nodes."""

from sqlalchemy import Column, String, Float, Date, Integer, Text
from app.database import Base


class DamNode(Base):
    """Water network node (dam, basin, city, complex, treatment_plant)."""
    __tablename__ = "dam_nodes"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # basin, dam, water_complex, treatment_plant, city
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    province_region = Column(String, nullable=True)
    basin = Column(String, nullable=True)
    status = Column(String, default="verified")
    source_note = Column(Text, nullable=True)

    # Extended from monographie CSV
    capacity_m3 = Column(Float, nullable=True)       # Mm³ converted to m³
    annual_resource_m3 = Column(Float, nullable=True)
    irrigation_area_ha = Column(Float, nullable=True)
    electricity_kwh = Column(Float, nullable=True)
    river_basin = Column(String, nullable=True)


class DamLevel(Base):
    """Daily dam level reading."""
    __tablename__ = "dam_levels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    dam_id = Column(String, nullable=False, index=True)  # FK to dam_nodes.id
    dam_name = Column(String, nullable=False)
    capacity_m3 = Column(Float, nullable=True)
    reserve_m3 = Column(Float, nullable=True)
    fill_ratio = Column(Float, nullable=True)   # 0.0 to 1.0


class WaterEdge(Base):
    """Hydraulic relationship between two water nodes."""
    __tablename__ = "water_edges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(String, nullable=False, index=True)
    target_id = Column(String, nullable=False, index=True)
    relation_type = Column(String, nullable=False)
    status = Column(String, nullable=True)
    distance_km = Column(Float, nullable=True)
    note = Column(Text, nullable=True)
