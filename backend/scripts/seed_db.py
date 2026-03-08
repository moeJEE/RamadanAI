"""Seed the database from CSV files in the project root."""

import sys
from pathlib import Path

# Add backend/ to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import init_db, SessionLocal
from app.services.ingestion import seed_all


def main():
    print("Initializing database…")
    init_db()

    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()

    print("\nDone! Start the server with:")
    print("  uvicorn app.main:app --reload --port 8000")


if __name__ == "__main__":
    main()
