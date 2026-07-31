"""
Import state overview JSON files into MongoDB Atlas.
Usage: python3 import_state_overview_mongo.py

Reads MONGODB_URL from backend/.env and imports files from:
  <project-root-parent>/state pages data/*.json
"""
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
WORKSPACE_ROOT = PROJECT_ROOT.parent
ENV_PATH = PROJECT_ROOT / "backend" / ".env"
DATA_DIR = WORKSPACE_ROOT / "state pages data"
COORDINATES_PATH = DATA_DIR / "state_coordinates.json"

load_dotenv(dotenv_path=ENV_PATH)

MONGODB_URL = os.getenv("MONGODB_URL")
if not MONGODB_URL:
    print("ERROR: MONGODB_URL not found. Check backend/.env")
    sys.exit(1)


def load_coordinates() -> dict:
    if not COORDINATES_PATH.exists():
        return {}

    with open(COORDINATES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    return {item["slug"]: item for item in data.get("states", [])}


def build_document(raw: dict, coordinates_by_slug: dict) -> dict:
    slug = raw.get("slug")
    if not slug:
        raise ValueError("Missing slug")

    now = datetime.now(timezone.utc).isoformat()
    coords = coordinates_by_slug.get(slug)

    document = {
        "_id": f"state_overview:{slug}",
        "document_type": "state_overview",
        "slug": slug,
        "route_slug": f"explore-{slug}",
        "route_path": f"/explore-{slug}",
        "state_name": raw.get("state_name"),
        "state_type": raw.get("state_type"),
        "country": raw.get("country", "India"),
        "location": {
            "country": raw.get("country", "India"),
            "state": raw.get("state_name"),
            "state_type": raw.get("state_type"),
            "coordinates": (
                {
                    "latitude": coords["latitude"],
                    "longitude": coords["longitude"],
                }
                if coords
                else None
            ),
        },
        "seo": raw.get("seo", {}),
        "overview": raw.get("overview", {}),
        "connectivity": raw.get("connectivity", {}),
        "social_infrastructure": raw.get("social_infrastructure", {}),
        "lifestyle_environment": raw.get("lifestyle_environment", {}),
        "investment_angle": raw.get("investment_angle", {}),
        "faq": raw.get("faq", []),
        "sources": raw.get("sources", {}),
        "is_active": True,
        "content_version": 1,
        "updated_at": now,
    }

    return document


async def import_data():
    if not DATA_DIR.exists():
        print(f"ERROR: data directory not found at {DATA_DIR}")
        sys.exit(1)

    coordinates_by_slug = load_coordinates()
    json_files = sorted(
        path
        for path in DATA_DIR.glob("*.json")
        if path.name != "state_coordinates.json"
    )

    client = AsyncIOMotorClient(MONGODB_URL)
    col = client["makan_mantraa"]["state_overview"]

    await col.create_index("slug", unique=True)
    await col.create_index("route_slug", unique=True)
    await col.create_index("location.state")
    await col.create_index("is_active")

    upserted = 0
    modified = 0
    errors = 0

    for path in json_files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = json.load(f)

            doc = build_document(raw, coordinates_by_slug)
            existing = await col.find_one({"_id": doc["_id"]}, {"created_at": 1})
            doc["created_at"] = existing.get("created_at") if existing else doc["updated_at"]

            result = await col.update_one(
                {"_id": doc["_id"]},
                {"$set": doc},
                upsert=True,
            )

            if result.upserted_id:
                upserted += 1
            else:
                modified += result.modified_count
        except Exception as exc:
            errors += 1
            print(f"Error importing {path.name}: {exc}")

    client.close()
    print(
        f"Done — files: {len(json_files)}, upserted: {upserted}, "
        f"modified: {modified}, unchanged: {len(json_files) - upserted - modified - errors}, errors: {errors}"
    )


if __name__ == "__main__":
    asyncio.run(import_data())
