import re
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from mongodb import get_news_collection
from news_model import NewsResponse

router = APIRouter(prefix="/news", tags=["news"])


def clean_doc(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id", doc.get("id", "")))
    return doc


def published_filter(search: Optional[str] = None) -> dict:
    query: dict = {"status": "published"}
    if not search or not search.strip():
        return query

    pattern = {"$regex": re.escape(search.strip()), "$options": "i"}
    query["$or"] = [
        {"title": pattern},
        {"summary": pattern},
        {"content": pattern},
        {"category": pattern},
        {"tags": pattern},
    ]
    return query


@router.get("/", response_model=List[NewsResponse])
async def list_news(
    search: Optional[str] = Query(default=None, max_length=160),
    limit: int = Query(default=50, ge=1, le=100),
):
    col = get_news_collection()
    cursor = col.find(published_filter(search)).sort("publishedAt", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [clean_doc(doc) for doc in docs]


@router.get("/{slug}", response_model=NewsResponse)
async def get_news_article(slug: str):
    col = get_news_collection()
    doc = await col.find_one({"slug": slug, "status": "published"})

    if not doc:
        raise HTTPException(status_code=404, detail="News article not found")

    return clean_doc(doc)
