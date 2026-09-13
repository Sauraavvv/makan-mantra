"""
Replace seo.on_page_description on the location pages listed in
non-3-para-pages.csv with the two-paragraph rewrites in slug_content_results.json.

Usage:
  venv/bin/python database/scripts/update_onpage_description_mongo.py
  venv/bin/python database/scripts/update_onpage_description_mongo.py --apply

Why not update_slug_content_results_mongo.py, which reads the same JSON:
  - It writes meta_description as well, and 2475 of these 2639 records carry
    an empty metaDescription (status invalid_meta_length). Running it would
    blank the meta description on every one of those pages.
  - It only matches location_category=city and pluralises the slug first.
    This list is 2156 district pages, 476 state pages and 7 city pages whose
    slugs already match the database exactly, so it would find almost none.

Behavior:
  - Matches by exact slug, any location_category.
  - Writes only seo.on_page_description (and bumps updated_at).
  - Refuses a record whose new text is not exactly two paragraphs, split the
    way the page renders them (/\n{2,}/ in location-page.tsx), or that still
    names a brand.
  - Only slugs present in the CSV are touched, even if the JSON holds more.
  - Dry run by default. --apply first writes the current values to a backup
    file beside the JSON, then updates.
"""

import argparse
import asyncio
import csv
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent.parent
WORKSPACE_ROOT = BACKEND_ROOT.parent.parent
ENV_PATH = BACKEND_ROOT / ".env"
DEFAULT_JSON_PATH = WORKSPACE_ROOT / "slug_content_results.json"
DEFAULT_CSV_PATH = WORKSPACE_ROOT / "non-3-para-pages.csv"
DEFAULT_DB_NAME = "makan_mantraa"
COLLECTION_NAME = "location_pages"
CHUNK_SIZE = 500
EXPECTED_PARAGRAPHS = 2
BRAND_PATTERN = re.compile(r"reeltor|makan\s*mantra", re.IGNORECASE)

load_dotenv(dotenv_path=ENV_PATH)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--json-path", type=Path, default=DEFAULT_JSON_PATH)
    parser.add_argument("--csv-path", type=Path, default=DEFAULT_CSV_PATH)
    parser.add_argument("--db", default=os.getenv("MONGODB_DB", DEFAULT_DB_NAME))
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes. Without this flag, only reports what would change.",
    )
    return parser.parse_args()


def paragraphs(text: str) -> list[str]:
    # Same split the page uses, so "two paragraphs" here means two on screen.
    return [part for part in re.split(r"\n{2,}", text.strip()) if part.strip()]


def load_records(json_path: Path, csv_path: Path) -> tuple[dict[str, str], list[str]]:
    with open(csv_path, newline="", encoding="utf-8") as f:
        wanted = {row["slug"] for row in csv.DictReader(f)}

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    records: dict[str, str] = {}
    rejected: list[str] = []

    for item in data:
        slug = item.get("slug")
        text = item.get("onpageDescription")
        if slug not in wanted:
            continue
        if not isinstance(text, str) or not text.strip():
            rejected.append(f"{slug}: empty onpageDescription")
        elif len(paragraphs(text)) != EXPECTED_PARAGRAPHS:
            rejected.append(f"{slug}: {len(paragraphs(text))} paragraphs")
        elif BRAND_PATTERN.search(text):
            rejected.append(f"{slug}: brand name in text")
        elif slug in records:
            rejected.append(f"{slug}: duplicate in JSON")
        else:
            records[slug] = text.strip()

    not_in_json = sorted(wanted - records.keys() - {r.split(":")[0] for r in rejected})
    rejected += [f"{slug}: in CSV but not in JSON" for slug in not_in_json]
    return records, rejected


async def main(args: argparse.Namespace) -> None:
    mongodb_url = os.getenv("MONGODB_URL")
    if not mongodb_url:
        sys.exit("ERROR: MONGODB_URL not found. Check backend/.env")

    records, rejected = load_records(args.json_path, args.csv_path)
    print(f"Records ready: {len(records)}  |  rejected: {len(rejected)}")
    print(f"Target: {args.db}.{COLLECTION_NAME}  |  Mode: {'APPLY' if args.apply else 'DRY RUN'}")
    for line in rejected[:20]:
        print(f"  rejected - {line}")

    client = AsyncIOMotorClient(mongodb_url)
    col = client[args.db][COLLECTION_NAME]

    try:
        slugs = list(records)
        existing: dict[str, dict] = {}
        for index in range(0, len(slugs), CHUNK_SIZE):
            cursor = col.find(
                {"slug": {"$in": slugs[index : index + CHUNK_SIZE]}},
                {"slug": 1, "location_category": 1, "seo.on_page_description": 1},
            )
            async for doc in cursor:
                existing[doc["slug"]] = doc

        missing = [slug for slug in slugs if slug not in existing]
        unchanged = [
            slug
            for slug in slugs
            if slug in existing
            and ((existing[slug].get("seo") or {}).get("on_page_description") or "").strip()
            == records[slug]
        ]
        to_update = [slug for slug in slugs if slug in existing and slug not in unchanged]

        by_category: dict[str, int] = {}
        for slug in to_update:
            category = existing[slug].get("location_category") or "?"
            by_category[category] = by_category.get(category, 0) + 1

        print(f"Found in DB: {len(existing)}  |  missing: {len(missing)}  |  already identical: {len(unchanged)}")
        print(f"Would update: {len(to_update)}  {by_category}")
        for slug in missing[:20]:
            print(f"  missing - {slug}")

        if to_update:
            sample = to_update[0]
            before = paragraphs((existing[sample].get("seo") or {}).get("on_page_description") or "")
            print(f"\nSample: {sample}")
            print(f"  before: {len(before)} paragraph(s)")
            print(f"  after:  {EXPECTED_PARAGRAPHS} paragraphs")
            for number, part in enumerate(paragraphs(records[sample]), start=1):
                print(f"    [{number}] {part[:160]}...")

        if not args.apply or not to_update:
            print("\nDry run complete. Nothing written.")
            return

        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup_path = args.json_path.with_name(f"on_page_description_backup_{stamp}.json")
        backup = {
            slug: (existing[slug].get("seo") or {}).get("on_page_description") for slug in to_update
        }
        backup_path.write_text(json.dumps(backup, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nBackup of current values: {backup_path}")

        now = datetime.now(timezone.utc)
        operations = [
            UpdateOne(
                {"slug": slug},
                {"$set": {"seo.on_page_description": records[slug], "updated_at": now}},
            )
            for slug in to_update
        ]

        matched = modified = 0
        for index in range(0, len(operations), CHUNK_SIZE):
            result = await col.bulk_write(operations[index : index + CHUNK_SIZE], ordered=False)
            matched += result.matched_count
            modified += result.modified_count

        print(f"Done - matched: {matched}, modified: {modified}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main(parse_args()))
