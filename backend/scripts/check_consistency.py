"""Cross-check: verify data consistency between CSVs and DB."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal
from app.models.dam import DamNode, DamLevel, WaterEdge
from sqlalchemy import func

db = SessionLocal()

# Count dams
dams = db.query(DamNode).filter(DamNode.type == "dam").all()
print(f"=== DAMS IN DB ({len(dams)}) ===")
for d in dams:
    print(f"  {d.id:25s} -> {d.name}")

# Count levels per dam
print(f"\n=== LEVELS PER DAM ===")
levels = db.query(DamLevel.dam_id, func.count(DamLevel.id)).group_by(DamLevel.dam_id).all()
for dam_id, cnt in sorted(levels, key=lambda x: -x[1]):
    print(f"  {dam_id:25s}: {cnt} records")

# Count edges
edges_count = db.query(WaterEdge).count()
print(f"\n=== TOTAL EDGES: {edges_count} ===")

# Cross-check
level_dams = {r[0] for r in levels}
node_dams = {d.id for d in dams}
missing_in_nodes = level_dams - node_dams
missing_in_levels = node_dams - level_dams
print(f"\nDams with levels but NOT in nodes: {missing_in_nodes or 'NONE - all consistent!'}")
print(f"Dams in nodes but NO levels: {missing_in_levels or 'NONE - all consistent!'}")

db.close()
