"""
Update state SEO content in the MongoDB `location_pages` collection from a JSON file.

Usage:
  python3 import_state_pages_mongo.py

Behavior:
  - Reads MONGODB_URL from backend/.env (or env var).
  - Loads ../makan_mantraa.state_pages.json from the workspace root.
  - Updates matching location_pages documents by slug, preserving existing non-SEO fields.
  - Reports slugs that are missing in the database instead of inserting partial docs.
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
WORKSPACE_ROOT = PROJECT_ROOT.parent
ENV_PATH = PROJECT_ROOT / "backend" / ".env"
JSON_PATH = WORKSPACE_ROOT / "makan_mantraa.state_pages.json"

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
    col = client["makan_mantraa"]["location_pages"]

    updated = 0
    missing = 0
    errors = 0
    missing_slugs: list[str] = []

    for doc in docs:
        try:
            slug = doc.get("slug")
            location_name = doc.get("location_name")
            seo = doc.get("seo")

            if not slug or not location_name or not isinstance(seo, dict):
                print(f"  Skipping invalid record: slug={slug!r}")
                errors += 1
                continue

            result = await col.update_one(
                {"slug": slug},
                {"$set": {"location_name": location_name, "seo": seo}},
            )

            if result.matched_count == 0:
                missing += 1
                missing_slugs.append(slug)
                continue

            updated += 1
        except Exception as e:
            print(f"  Error updating slug={doc.get('slug', '?')}: {e}")
            errors += 1

    client.close()

    print(
        f"\nDone - updated: {updated}, missing in DB: {missing}, errors: {errors}"
    )
    if missing_slugs:
        print("\nSlugs not found in `location_pages`:")
        for slug in missing_slugs:
            print(f"  - {slug}")


if __name__ == "__main__":
    asyncio.run(import_data())
