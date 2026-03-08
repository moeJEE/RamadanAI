"""CSV ingestion service — parses dam levels, nodes, and edges."""

import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.dam import DamNode, DamLevel, WaterEdge
from app.config import CSV_BARRAGES, CSV_NODES, CSV_EDGES, CSV_MONOGRAPHIE


# ── Mapping from dam display name (in barrages_data.csv) to node ID (in rsk_water_nodes.csv) ──
DAM_NAME_TO_ID: dict[str, str] = {
    "Sidi Mohammed Ben Abdellah": "dam_smba",
    "Ain Kouachia": "dam_ain_kouachia",
    "El Kansera": "dam_el_kansera",
    "Garde de Sebou": "dam_garde_sebou",
    "Tiddas": "dam_tiddas",
}


def ingest_nodes(db: Session) -> int:
    """Import rsk_water_nodes.csv into dam_nodes table."""
    if not CSV_NODES.exists():
        print(f"⚠ {CSV_NODES} not found, skipping nodes import.")
        return 0

    df = pd.read_csv(CSV_NODES, encoding="utf-8")
    df = df.dropna(subset=["id"])
    count = 0

    for _, row in df.iterrows():
        node_id = str(row["id"]).strip()
        existing = db.query(DamNode).filter(DamNode.id == node_id).first()
        if existing:
            continue

        node = DamNode(
            id=node_id,
            name=str(row.get("name", "")).strip(),
            type=str(row.get("type", "")).strip(),
            lat=float(row["lat"]) if pd.notna(row.get("lat")) else None,
            lon=float(row["lon"]) if pd.notna(row.get("lon")) else None,
            province_region=str(row.get("province_region", "")).strip() if pd.notna(row.get("province_region")) else None,
            basin=str(row.get("basin", "")).strip() if pd.notna(row.get("basin")) else None,
            status=str(row.get("status", "verified")).strip(),
            source_note=str(row.get("source_note", "")).strip() if pd.notna(row.get("source_note")) else None,
        )
        try:
            db.add(node)
            db.flush()
            count += 1
        except Exception as e:
            print(f"FAILED ON NODE: {node_id}")
            print(f"Row data: {row.to_dict()}")
            raise e

    db.commit()
    print(f"  V Imported {count} water nodes")
    return count


def ingest_edges(db: Session) -> int:
    """Import rsk_water_edges.csv into water_edges table."""
    if not CSV_EDGES.exists():
        print(f"⚠ {CSV_EDGES} not found, skipping edges import.")
        return 0

    df = pd.read_csv(CSV_EDGES)
    count = 0

    for _, row in df.iterrows():
        src = str(row.get("source_id", "")).strip()
        tgt = str(row.get("target_id", "")).strip()
        if not src or not tgt:
            continue

        existing = db.query(WaterEdge).filter(
            WaterEdge.source_id == src,
            WaterEdge.target_id == tgt,
        ).first()
        if existing:
            continue

        edge = WaterEdge(
            source_id=src,
            target_id=tgt,
            relation_type=str(row.get("relation_type", "")).strip(),
            status=str(row.get("status", "")).strip() if pd.notna(row.get("status")) else None,
            distance_km=float(row["distance_km"]) if pd.notna(row.get("distance_km")) else None,
            note=str(row.get("note", "")).strip() if pd.notna(row.get("note")) else None,
        )
        db.add(edge)
        count += 1

    db.commit()
    print(f"  V Imported {count} water edges")
    return count


def _safe_float(val) -> float | None:
    """Safely parse a float, returning None for non-numeric values."""
    if pd.isna(val):
        return None
    try:
        return float(str(val).replace(",", ".").strip())
    except (ValueError, TypeError):
        return None


def ingest_monographie(db: Session) -> int:
    """Enrich dam nodes with data from the monographie CSV."""
    if not CSV_MONOGRAPHIE.exists():
        print(f"⚠ {CSV_MONOGRAPHIE} not found, skipping monographie enrichment.")
        return 0

    df = pd.read_csv(CSV_MONOGRAPHIE)
    count = 0

    for _, row in df.iterrows():
        node_name = str(row.get("Node", "")).strip()
        node_type = str(row.get("Type", "")).strip()

        if not node_name:
            continue

        # Try to find matching dam node
        node = db.query(DamNode).filter(DamNode.name.ilike(f"%{node_name}%")).first()
        if not node:
            # Create new node if it's a dam/aquifer from monographie
            safe_name = node_name.lower().replace(' ', '_').replace("'", "").replace("/", "_")
            node_id = f"mono_{node_type.lower()}_{safe_name}"
            # Check for duplicate
            existing = db.query(DamNode).filter(DamNode.id == node_id).first()
            if existing:
                node = existing
            else:
                node = DamNode(id=node_id, name=node_name, type=node_type.lower())
                db.add(node)
                db.flush()  # Assign ID immediately

        # Enrich with monographie data (safe parsing)
        cap = _safe_float(row.get("Capacity_Mm3"))
        if cap is not None:
            node.capacity_m3 = cap * 1_000_000

        annual = _safe_float(row.get("Annual_Resource_Mm3"))
        if annual is not None:
            node.annual_resource_m3 = annual * 1_000_000

        irr = _safe_float(row.get("Irrigation_Area_ha"))
        if irr is not None:
            node.irrigation_area_ha = irr

        elec = _safe_float(row.get("Electricity_Generation_kWh"))
        if elec is not None:
            node.electricity_kwh = elec

        if pd.notna(row.get("River/Basin")):
            node.river_basin = str(row["River/Basin"]).strip()

        count += 1

    db.commit()
    print(f"  V Enriched {count} nodes from monographie")
    return count


def ingest_dam_levels(db: Session) -> int:
    """Import barrages_rsk_data.csv into dam_levels table."""
    if not CSV_BARRAGES.exists():
        print(f"⚠ {CSV_BARRAGES} not found, skipping dam levels import.")
        return 0

    # Try utf-8-sig (handles BOM), fallback to latin-1
    try:
        df = pd.read_csv(CSV_BARRAGES, encoding="utf-8-sig")
    except UnicodeDecodeError:
        df = pd.read_csv(CSV_BARRAGES, encoding="latin-1")

    # Normalize column names
    col_map = {}
    for c in df.columns:
        cl = c.strip().lower()
        if "date" in cl:
            col_map[c] = "date"
        elif "barrage" in cl:
            col_map[c] = "barrage"
        elif "capacite" in cl or "capacity" in cl:
            col_map[c] = "capacite_mm3"
        elif "reserve" in cl:
            col_map[c] = "reserve_mm3"
        elif "taux" in cl or "remplissage" in cl:
            col_map[c] = "taux_pct"
    df = df.rename(columns=col_map)

    # Known valid dam names only
    valid_dams = set(DAM_NAME_TO_ID.keys())

    # Filter out summary rows (e.g. "Réserve totale")
    SKIP_KEYWORDS = ["total", "réserve totale", "reserve totale", "somme"]

    count = 0
    for _, row in df.iterrows():
        try:
            dt = pd.to_datetime(row.get("date"), errors="coerce")
            if pd.isna(dt):
                continue

            barrage_name = str(row.get("barrage", "")).strip()
            if not barrage_name:
                continue

            # Skip summary rows and non-dam entries
            name_lower = barrage_name.lower()
            if any(kw in name_lower for kw in SKIP_KEYWORDS):
                continue

            # Use known dam ID or generate one
            dam_id = DAM_NAME_TO_ID.get(barrage_name)
            if not dam_id:
                # Skip unknown dams to avoid polluting the DB
                continue

            # Parse capacity (Mm³)
            cap_raw = row.get("capacite_mm3")
            capacity_m3 = None
            if pd.notna(cap_raw):
                try:
                    capacity_m3 = float(str(cap_raw).replace(",", ".")) * 1_000_000
                except ValueError:
                    pass

            # Parse reserve (Mm³) — handle "-" → compute from taux
            res_raw = row.get("reserve_mm3")
            reserve_m3 = None
            taux_raw = row.get("taux_pct")
            fill_ratio = None

            if pd.notna(res_raw) and str(res_raw).strip() not in ("-", "—", ""):
                try:
                    reserve_m3 = float(str(res_raw).replace(",", ".")) * 1_000_000
                except ValueError:
                    pass

            if pd.notna(taux_raw) and str(taux_raw).strip() not in ("-", "—", ""):
                try:
                    fill_ratio = float(str(taux_raw).replace(",", ".")) / 100.0
                except ValueError:
                    pass

            # If reserve missing but taux available → compute
            if reserve_m3 is None and fill_ratio is not None and capacity_m3 is not None:
                reserve_m3 = capacity_m3 * fill_ratio

            # If fill_ratio missing but reserve and capacity available
            if fill_ratio is None and reserve_m3 is not None and capacity_m3 is not None and capacity_m3 > 0:
                fill_ratio = reserve_m3 / capacity_m3

            # Update node capacity if not already set (node should exist from ingest_nodes)
            existing_node = db.query(DamNode).filter(DamNode.id == dam_id).first()
            if existing_node and capacity_m3 and not existing_node.capacity_m3:
                existing_node.capacity_m3 = capacity_m3

            level = DamLevel(
                date=dt.date(),
                dam_id=dam_id,
                dam_name=barrage_name,
                capacity_m3=capacity_m3,
                reserve_m3=reserve_m3,
                fill_ratio=fill_ratio,
            )
            db.add(level)
            count += 1

        except Exception as e:
            print(f"  ⚠ Error row: {e}")
            continue

    db.commit()
    print(f"  V Imported {count} dam level records")
    return count


def seed_all(db: Session):
    """Run the full seeding pipeline."""
    print("\n--- Seeding AquaRoute Data ---")

    # Clear existing data to prevent duplicates on re-seed
    db.query(DamLevel).delete()
    db.query(WaterEdge).delete()
    db.query(DamNode).delete()
    db.commit()
    print("  ✓ Cleared existing data")

    ingest_nodes(db)
    ingest_edges(db)
    ingest_monographie(db)
    ingest_dam_levels(db)
    print("--- Seeding complete ---")
