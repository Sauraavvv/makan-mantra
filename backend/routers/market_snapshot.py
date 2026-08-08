import re
from typing import List

from fastapi import APIRouter, HTTPException

from market_snapshot_model import MarketSnapshotResponse
from mongodb import get_market_snapshot_collection

router = APIRouter(prefix="/market-snapshot", tags=["market-snapshot"])

SLUG_ALIASES: dict[str, str] = {
    "jammu-kashmir": "jammu-and-kashmir",
    "jammu-&-kashmir": "jammu-and-kashmir",
}


def clean_doc(doc: dict) -> dict:
    doc["id"] = doc.pop("_id", doc.get("id", ""))
    return doc


def normalize_slug(value: str) -> str:
    """Accepts "Delhi", "delhi", "explore-delhi" and lands on "delhi"."""
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    slug = slug.removeprefix("explore-")
    return SLUG_ALIASES.get(slug, slug)


@router.get("/", response_model=List[MarketSnapshotResponse])
async def list_market_snapshots(limit: int = 50):
    col = get_market_snapshot_collection()
    cursor = col.find({"is_active": {"$ne": False}}).sort("state_name", 1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [clean_doc(doc) for doc in docs]


@router.get("/{slug}", response_model=MarketSnapshotResponse)
async def get_market_snapshot(slug: str):
    col = get_market_snapshot_collection()
    doc = await col.find_one(
        {
            "$or": [
                {"slug": normalize_slug(slug)},
                {"slug": slug},
                {"route_slug": slug},
            ]
        }
    )

    if not doc or doc.get("is_active") is False:
        raise HTTPException(status_code=404, detail="Market snapshot not found")

    return clean_doc(doc)
