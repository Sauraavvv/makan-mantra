"""Update state location page descriptions in MongoDB.

Usage:
  python3 import_state_pages_mongo.py
  python3 import_state_pages_mongo.py --apply

Behavior:
  - Reads MONGODB_URL from backend/.env (or env var).
  - Loads makan_mantraa.state_pages.json from the workspace root.
  - Matches existing location_pages documents by slug and location_category=state.
  - Updates only seo.meta_description and seo.on_page_description.
  - Defaults to a dry run; pass --apply to write changes.
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent.parent
PROJECT_ROOT = BACKEND_ROOT.parent
WORKSPACE_ROOT = PROJECT_ROOT.parent
ENV_PATH = BACKEND_ROOT / ".env"
JSON_PATH = WORKSPACE_ROOT / "makan_mantraa.state_pages.json"
DB_NAME = "makan_mantraa"
COLLECTION_NAME = "location_pages"
CHUNK_SIZE = 500

load_dotenv(dotenv_path=ENV_PATH)

MONGODB_URL = os.getenv("MONGODB_URL")
if not MONGODB_URL:
    print("ERROR: MONGODB_URL not found. Check backend/.env")
    sys.exit(1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update state location page meta_description and on_page_description by slug."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes to MongoDB. Without this flag, only reports what would change.",
    )
    return parser.parse_args()


def chunked(values: list[Any], size: int) -> list[list[Any]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def load_records() -> list[dict[str, str]]:
    if not JSON_PATH.exists():
        print(f"ERROR: JSON file not found at {JSON_PATH}")
        sys.exit(1)

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    docs = data if isinstance(data, list) else [data]
    records: list[dict[str, str]] = []
    seen_slugs: set[str] = set()

    for index, doc in enumerate(docs, start=1):
        slug = doc.get("slug") if isinstance(doc, dict) else None
        meta_description = doc.get("meta_description") if isinstance(doc, dict) else None
        on_page_description = doc.get("on_page_description") if isinstance(doc, dict) else None

        if (
            not slug
            or not isinstance(meta_description, str)
            or not isinstance(on_page_description, str)
        ):
            print(f"ERROR: Invalid record at index {index}: slug={slug!r}")
            sys.exit(1)

        if slug in seen_slugs:
            print(f"ERROR: Duplicate slug in JSON: {slug}")
            sys.exit(1)

        seen_slugs.add(slug)
        records.append(
            {
                "slug": slug,
                "meta_description": meta_description,
                "on_page_description": on_page_description,
            }
        )

    return records


async def import_data(args: argparse.Namespace):
    records = load_records()
    print(f"Loaded {len(records)} records from {JSON_PATH}")
    print(f"Target: {DB_NAME}.{COLLECTION_NAME}")
    print(f"Mode: {'APPLY' if args.apply else 'DRY RUN'}")

    client = AsyncIOMotorClient(MONGODB_URL)
    col = client[DB_NAME][COLLECTION_NAME]

    try:
        slugs = [record["slug"] for record in records]
        records_by_slug = {record["slug"]: record for record in records}
        existing_by_slug: dict[str, dict[str, Any]] = {}

        for slug_chunk in chunked(slugs, CHUNK_SIZE):
            cursor = col.find(
                {"slug": {"$in": slug_chunk}, "location_category": "state"},
                {"slug": 1},
            )
            async for doc in cursor:
                existing_by_slug[doc["slug"]] = doc

        missing_slugs = [slug for slug in slugs if slug not in existing_by_slug]
        operations = [
            UpdateOne(
                {"slug": slug, "location_category": "state"},
                {
                    "$set": {
                        "seo.meta_description": records_by_slug[slug]["meta_description"],
                        "seo.on_page_description": records_by_slug[slug]["on_page_description"],
                    }
                },
            )
            for slug in existing_by_slug
        ]

        print(f"Matched state slugs in DB: {len(existing_by_slug)}")
        print(f"Missing state slugs in DB: {len(missing_slugs)}")

        if not args.apply:
            print(f"\nDry run complete - would update: {len(operations)}, missing: {len(missing_slugs)}")
        else:
            modified = 0
            for operation_chunk in chunked(operations, CHUNK_SIZE):
                result = await col.bulk_write(operation_chunk, ordered=False)
                modified += result.modified_count
            print(f"\nDone - matched: {len(operations)}, modified: {modified}, missing: {len(missing_slugs)}")

        if missing_slugs:
            print("\nSlugs not found in state `location_pages`:")
            for slug in missing_slugs:
                print(f"  - {slug}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(import_data(parse_args()))
