"""
Build the combined MongoDB `location_pages` collection from legacy page collections.

Usage:
  python3 sync_location_pages_mongo.py
  python3 sync_location_pages_mongo.py --apply

Behavior:
  - Reads MONGODB_URL from backend/.env (or env var).
  - Reads all documents from state_pages and district_pages.
  - Aborts if any source slug or _id is duplicated.
  - Upserts the documents into location_pages, preserving original document shape.
  - Creates indexes used by /location-pages API queries.
  - Defaults to a dry run; pass --apply to write changes.
"""

import argparse
import asyncio
import os
import sys
from collections import Counter
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReplaceOne

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
ENV_PATH = PROJECT_ROOT / "backend" / ".env"
DEFAULT_DB_NAME = "makan_mantraa"
SOURCE_COLLECTIONS = ("state_pages", "district_pages")
TARGET_COLLECTION = "location_pages"
CHUNK_SIZE = 500

load_dotenv(dotenv_path=ENV_PATH)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync state_pages and district_pages into location_pages."
    )
    parser.add_argument(
        "--db",
        default=os.getenv("MONGODB_DB", DEFAULT_DB_NAME),
        help=f"MongoDB database name. Default: {DEFAULT_DB_NAME}",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes to MongoDB. Without this flag, only reports what would change.",
    )
    return parser.parse_args()


def chunked(values: list[Any], size: int) -> list[list[Any]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def duplicate_values(values: list[str]) -> list[str]:
    counts = Counter(values)
    return sorted(value for value, count in counts.items() if count > 1)


async def load_source_docs(db: Any) -> tuple[list[dict[str, Any]], dict[str, int]]:
    docs: list[dict[str, Any]] = []
    counts: dict[str, int] = {}

    for collection_name in SOURCE_COLLECTIONS:
        collection = db[collection_name]
        collection_docs = await collection.find({}).to_list(length=None)
        counts[collection_name] = len(collection_docs)
        docs.extend(collection_docs)

    return docs, counts


async def ensure_indexes(target: Any) -> None:
    await target.create_index("slug", unique=True)
    await target.create_index("location_category")
    await target.create_index("location.state")
    await target.create_index("location.district")
    await target.create_index([("property_type", 1), ("listing_type", 1)])
    await target.create_index("is_active")


async def sync_location_pages(args: argparse.Namespace) -> None:
    mongodb_url = os.getenv("MONGODB_URL")
    if not mongodb_url:
        print("ERROR: MONGODB_URL not found. Check backend/.env")
        sys.exit(1)

    client = AsyncIOMotorClient(mongodb_url)
    db = client[args.db]
    target = db[TARGET_COLLECTION]

    try:
        source_docs, source_counts = await load_source_docs(db)
        slugs = [doc.get("slug") for doc in source_docs]
        ids = [str(doc.get("_id")) for doc in source_docs]
        duplicate_slugs = duplicate_values([slug for slug in slugs if slug])
        duplicate_ids = duplicate_values(ids)
        missing_slugs = [str(doc.get("_id")) for doc in source_docs if not doc.get("slug")]
        existing_target_count = await target.estimated_document_count()

        print(f"Target: {args.db}.{TARGET_COLLECTION}")
        print(f"Mode: {'APPLY' if args.apply else 'DRY RUN'}")
        for collection_name in SOURCE_COLLECTIONS:
            print(f"Source {collection_name}: {source_counts.get(collection_name, 0)}")
        print(f"Source total: {len(source_docs)}")
        print(f"Existing target count: {existing_target_count}")

        if missing_slugs:
            print("\nERROR: Source documents missing slug:")
            for doc_id in missing_slugs[:50]:
                print(f"  - _id={doc_id}")
            sys.exit(1)

        if duplicate_slugs:
            print("\nERROR: Duplicate slugs across source collections:")
            for slug in duplicate_slugs[:50]:
                print(f"  - {slug}")
            sys.exit(1)

        if duplicate_ids:
            print("\nERROR: Duplicate _id values across source collections:")
            for doc_id in duplicate_ids[:50]:
                print(f"  - {doc_id}")
            sys.exit(1)

        target_slugs = {
            doc["slug"]
            async for doc in target.find({}, {"_id": 0, "slug": 1})
            if doc.get("slug")
        }
        source_slugs = set(slugs)
        extra_target_slugs = sorted(target_slugs - source_slugs)

        print(f"Would upsert: {len(source_docs)}")
        print(f"Extra target slugs not in sources: {len(extra_target_slugs)}")

        if extra_target_slugs:
            print("\nExtra target slug examples:")
            for slug in extra_target_slugs[:20]:
                print(f"  - {slug}")

        if not args.apply:
            print("\nDry run complete - no writes made.")
            return

        await ensure_indexes(target)

        matched = 0
        modified = 0
        upserted = 0

        operations = [
            ReplaceOne({"_id": doc["_id"]}, doc, upsert=True)
            for doc in source_docs
        ]

        for operation_chunk in chunked(operations, CHUNK_SIZE):
            result = await target.bulk_write(operation_chunk, ordered=False)
            matched += result.matched_count
            modified += result.modified_count
            upserted += result.upserted_count

        print(
            "\nDone - "
            f"matched: {matched}, modified: {modified}, "
            f"upserted: {upserted}, target total now: {await target.estimated_document_count()}"
        )
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(sync_location_pages(parse_args()))
