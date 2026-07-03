"""
Import state_pages.json into MongoDB Atlas.
Usage:  python3 import_state_pages_mongo.py
Reads MONGODB_URL from backend/.env (or env var).
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
ENV_PATH = PROJECT_ROOT / "backend" / ".env"
JSON_PATH = PROJECT_ROOT.parent / "state_pages.json"

load_dotenv(dotenv_path=ENV_PATH)

MONGODB_URL = os.getenv("MONGODB_URL")
if not MONGODB_URL:
    print("ERROR: MONGODB_URL not found. Check backend/.env")
    sys.exit(1)


async def import_data():
    if not JSON_PATH.exists():
        print(f"ERROR: JSON file not found at {JSON_PATH}")
        sys.exit(1)

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    docs = data if isinstance(data, list) else [data]
    print(f"Loaded {len(docs)} records from JSON")

    client = AsyncIOMotorClient(MONGODB_URL)
    col = client["makan_mantraa"]["state_pages"]

    inserted = 0
    skipped = 0
    errors = 0

    for doc in docs:
        try:
            slug = doc.get("slug")
            if not slug:
                errors += 1
                continue

            existing = await col.find_one({"slug": slug})
            if existing:
                skipped += 1
                continue

            if "_id" not in doc and "id" in doc:
                doc["_id"] = doc["id"]

            await col.insert_one(doc)
            inserted += 1
        except Exception as e:
            print(f"  Error inserting slug={doc.get('slug', '?')}: {e}")
            errors += 1

    client.close()
    print(f"\nDone — inserted: {inserted}, skipped (duplicate): {skipped}, errors: {errors}")


if __name__ == "__main__":
    asyncio.run(import_data())
