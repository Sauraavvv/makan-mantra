"""Import the CMS-shaped news JSON into MongoDB.

Usage: python3 import_news_mongo.py
       python3 import_news_mongo.py --json-path /path/to/news.json
"""
import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent.parent
PROJECT_ROOT = BACKEND_ROOT.parent
FRONTEND_ROOT = PROJECT_ROOT / "frontend"
ENV_PATH = BACKEND_ROOT / ".env"
DEFAULT_JSON_PATH = FRONTEND_ROOT / "src" / "data" / "news.json"

load_dotenv(dotenv_path=ENV_PATH)
MONGODB_URL = os.getenv("MONGODB_URL")


def build_document(raw: dict) -> dict:
    slug = (raw.get("slug") or "").strip()
    if not slug:
        raise ValueError("Missing slug")

    required = ("title", "summary", "content", "category", "publishedAt", "updatedAt")
    missing = [field for field in required if not raw.get(field)]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    featured_image = raw.get("featuredImage") or {}
    if not featured_image.get("url") or not featured_image.get("altText"):
        raise ValueError("featuredImage.url and featuredImage.altText are required")

    now = datetime.now(timezone.utc).isoformat()
    return {
        "_id": f"news:{slug}",
        "document_type": "news",
        "title": raw["title"],
        "slug": slug,
        "summary": raw["summary"],
        "content": raw["content"],
        "category": raw["category"],
        "tags": raw.get("tags") or [],
        "author": raw.get("author") or {"name": "", "avatarUrl": ""},
        "featuredImage": featured_image,
        "publishedAt": raw["publishedAt"],
        "updatedAt": raw["updatedAt"],
        "status": raw.get("status") or "draft",
        "seo": raw.get("seo") or {},
        "updated_at": now,
    }


async def import_news(json_path: Path):
    if not MONGODB_URL:
        print("ERROR: MONGODB_URL not found. Check backend/.env")
        sys.exit(1)
    if not json_path.exists():
        print(f"ERROR: source file not found at {json_path}")
        sys.exit(1)

    with json_path.open(encoding="utf-8") as file:
        raw = json.load(file)

    doc = build_document(raw)
    client = AsyncIOMotorClient(MONGODB_URL)
    col = client["makan_mantraa"]["news"]

    await col.create_index("slug", unique=True)
    await col.create_index([("status", 1), ("publishedAt", -1)])

    result = await col.update_one(
        {"_id": doc["_id"]},
        {"$set": doc, "$setOnInsert": {"created_at": doc["updated_at"]}},
        upsert=True,
    )
    total = await col.count_documents({})
    client.close()

    outcome = "inserted" if result.upserted_id else "updated" if result.modified_count else "unchanged"
    print(f"{outcome}: {doc['slug']}")
    print(f"news now holds {total} documents")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json-path", type=Path, default=DEFAULT_JSON_PATH)
    args = parser.parse_args()
    asyncio.run(import_news(args.json_path.resolve()))
