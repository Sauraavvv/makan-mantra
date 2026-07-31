"""
Update district SEO descriptions in the MongoDB `location_pages` collection.

Usage:
  python3 import_district_pages_mongo.py
  python3 import_district_pages_mongo.py --apply

Behavior:
  - Reads MONGODB_URL from backend/.env (or env var).
  - Loads makan_mantraa.district_pages.json from the workspace root.
  - Matches existing location_pages documents by slug.
  - Updates only meta_description and on_page_description.
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
DEFAULT_JSON_PATH = WORKSPACE_ROOT / "makan_mantraa.district_pages.json"
DEFAULT_DB_NAME = "makan_mantraa"
DEFAULT_COLLECTION_NAME = "location_pages"
CHUNK_SIZE = 500

load_dotenv(dotenv_path=ENV_PATH)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update district location page meta_description and on_page_description by slug."
    )
    parser.add_argument(
        "--json-path",
        type=Path,
        default=DEFAULT_JSON_PATH,
        help=f"JSON file to import. Default: {DEFAULT_JSON_PATH}",
    )
    parser.add_argument(
        "--db",
        default=os.getenv("MONGODB_DB", DEFAULT_DB_NAME),
        help=f"MongoDB database name. Default: {DEFAULT_DB_NAME}",
    )
    parser.add_argument(
        "--collection",
        default=DEFAULT_COLLECTION_NAME,
        help=f"MongoDB collection name. Default: {DEFAULT_COLLECTION_NAME}",
    )
    parser.add_argument(
        "--field-mode",
        choices=("auto", "top-level", "seo", "both"),
        default="auto",
        help=(
            "Where to write the fields. auto updates existing shape: nested seo when "
            "present, top-level otherwise. Default: auto"
        ),
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes to MongoDB. Without this flag, only reports what would change.",
    )
    return parser.parse_args()


def load_records(json_path: Path) -> list[dict[str, Any]]:
    if not json_path.exists():
        print(f"ERROR: JSON file not found at {json_path}")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    docs = data if isinstance(data, list) else [data]
    records: list[dict[str, Any]] = []
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


def build_set_payload(record: dict[str, Any], existing_doc: dict[str, Any], field_mode: str) -> dict[str, str]:
    top_level_exists = (
        "meta_description" in existing_doc or "on_page_description" in existing_doc
    )
    seo = existing_doc.get("seo")
    seo_exists = isinstance(seo, dict) and (
        "meta_description" in seo or "on_page_description" in seo
    )

    update_top_level = field_mode in ("top-level", "both")
    update_seo = field_mode in ("seo", "both")

    if field_mode == "auto":
        update_seo = seo_exists
        update_top_level = top_level_exists or not seo_exists

    payload: dict[str, str] = {}
    if update_top_level:
        payload["meta_description"] = record["meta_description"]
        payload["on_page_description"] = record["on_page_description"]
    if update_seo:
        payload["seo.meta_description"] = record["meta_description"]
        payload["seo.on_page_description"] = record["on_page_description"]

    return payload


def chunked(values: list[Any], size: int) -> list[list[Any]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


async def fetch_existing_docs(col: Any, slugs: list[str]) -> dict[str, dict[str, Any]]:
    existing: dict[str, dict[str, Any]] = {}
    projection = {
        "slug": 1,
        "meta_description": 1,
        "on_page_description": 1,
        "seo.meta_description": 1,
        "seo.on_page_description": 1,
    }

    for slug_chunk in chunked(slugs, CHUNK_SIZE):
        cursor = col.find({"slug": {"$in": slug_chunk}}, projection)
        async for doc in cursor:
            existing[doc["slug"]] = doc

    return existing


async def update_district_pages(args: argparse.Namespace) -> None:
    mongodb_url = os.getenv("MONGODB_URL")
    if not mongodb_url:
        print("ERROR: MONGODB_URL not found. Check backend/.env")
        sys.exit(1)

    records = load_records(args.json_path)
    print(f"Loaded {len(records)} records from {args.json_path}")
    print(f"Target: {args.db}.{args.collection}")
    print(f"Mode: {'APPLY' if args.apply else 'DRY RUN'}")

    client = AsyncIOMotorClient(mongodb_url)
    col = client[args.db][args.collection]

    try:
        slugs = [record["slug"] for record in records]
        records_by_slug = {record["slug"]: record for record in records}
        existing_by_slug = await fetch_existing_docs(col, slugs)

        missing_slugs = [slug for slug in slugs if slug not in existing_by_slug]
        operations: list[UpdateOne] = []
        shape_counts = {
            "top-level": 0,
            "seo": 0,
            "both": 0,
                "new-top-level": 0,
        }

        for slug, existing_doc in existing_by_slug.items():
            payload = build_set_payload(records_by_slug[slug], existing_doc, args.field_mode)
            payload_keys = set(payload)

            if {"meta_description", "on_page_description"} <= payload_keys and {
                "seo.meta_description",
                "seo.on_page_description",
            } <= payload_keys:
                shape_counts["both"] += 1
            elif {"seo.meta_description", "seo.on_page_description"} <= payload_keys:
                shape_counts["seo"] += 1
            elif "meta_description" in existing_doc or "on_page_description" in existing_doc:
                shape_counts["top-level"] += 1
            else:
                shape_counts["new-top-level"] += 1

            operations.append(UpdateOne({"slug": slug}, {"$set": payload}))

        print(f"Matched slugs in DB: {len(existing_by_slug)}")
        print(f"Missing slugs in DB: {len(missing_slugs)}")
        print("Planned update shape:")
        for label, count in shape_counts.items():
            if count:
                print(f"  - {label}: {count}")

        modified = 0
        matched = len(existing_by_slug)

        if args.apply and operations:
            for operation_chunk in chunked(operations, CHUNK_SIZE):
                result = await col.bulk_write(operation_chunk, ordered=False)
                modified += result.modified_count
            print(f"\nDone - matched: {matched}, modified: {modified}, missing: {len(missing_slugs)}")
        else:
            print(f"\nDry run complete - would update: {matched}, missing: {len(missing_slugs)}")

        if missing_slugs:
            print(f"\nSlugs not found in `{args.collection}`:")
            for slug in missing_slugs:
                print(f"  - {slug}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(update_district_pages(parse_args()))
