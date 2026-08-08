"""
Import the per-state real estate snapshot into MongoDB Atlas.
Usage: python3 import_market_snapshot_mongo.py [--json-path /path/to/realestate_results.json]

Reads MONGODB_URL from backend/.env and imports:
  <project-root-parent>/realestate_results.json

The source file carries display names in `slug` ("Andhra Pradesh"), so the slug is
derived from `location_name` to line up with the `state_overview` slugs.
"""
import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent.parent
PROJECT_ROOT = BACKEND_ROOT.parent
WORKSPACE_ROOT = PROJECT_ROOT.parent
ENV_PATH = BACKEND_ROOT / ".env"
DEFAULT_JSON_PATH = WORKSPACE_ROOT / "realestate_results.json"

load_dotenv(dotenv_path=ENV_PATH)

MONGODB_URL = os.getenv("MONGODB_URL")
if not MONGODB_URL:
    print("ERROR: MONGODB_URL not found. Check backend/.env")
    sys.exit(1)


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def build_document(raw: dict) -> dict:
    state_name = raw.get("location_name") or raw.get("slug")
    if not state_name:
        raise ValueError("Missing location_name")

    slug = slugify(state_name)
    data = raw.get("real_estate_data") or {}
    now = datetime.now(timezone.utc).isoformat()

    return {
        "_id": f"market_snapshot:{slug}",
        "document_type": "market_snapshot",
        "slug": slug,
        "route_slug": f"explore-{slug}",
        "state_name": state_name,
        # The figures describe the state's leading market, not the whole state.
        "city": data.get("city", state_name),
        "data_currency": data.get("data_currency", "INR"),
        "market_status_as_of": data.get("market_status_as_of"),
        "price_trend_growth_quarterly": data.get("price_trend_growth_quarterly", {}),
        "asking_price_per_sq_ft": data.get("asking_price_per_sq_ft", {}),
        "monthly_average_rent_by_bhk": data.get("monthly_average_rent_by_bhk", []),
        # Renamed off `top_5_developers`: the count is not part of the contract.
        "top_developers": data.get("top_5_developers", []),
        "top_projects": data.get("top_projects", []),
        "is_active": True,
        "content_version": 1,
        "updated_at": now,
    }


async def import_data(json_path: Path):
    if not json_path.exists():
        print(f"ERROR: source file not found at {json_path}")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        entries = json.load(f)

    client = AsyncIOMotorClient(MONGODB_URL)
    col = client["makan_mantraa"]["market_snapshot"]

    await col.create_index("slug", unique=True)
    await col.create_index("route_slug", unique=True)
    await col.create_index("is_active")

    upserted = 0
    modified = 0
    skipped = 0
    errors = 0

    for raw in entries:
        if raw.get("status") != "ok":
            skipped += 1
            continue

        try:
            doc = build_document(raw)
            result = await col.update_one(
                {"_id": doc["_id"]},
                {"$set": doc, "$setOnInsert": {"created_at": doc["updated_at"]}},
                upsert=True,
            )
            if result.upserted_id:
                upserted += 1
            elif result.modified_count:
                modified += 1
        except Exception as error:  # noqa: BLE001 - report and continue the batch
            errors += 1
            print(f"  FAILED {raw.get('location_name')}: {error}")

    total = await col.count_documents({})
    print(f"inserted {upserted}, updated {modified}, skipped {skipped}, errors {errors}")
    print(f"market_snapshot now holds {total} documents")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json-path", type=Path, default=DEFAULT_JSON_PATH)
    args = parser.parse_args()
    asyncio.run(import_data(args.json_path.resolve()))
