import re
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException, Query

from mongodb import get_news_collection, get_news_comments_collection, get_news_views_collection
from news_model import (
    NewsCommentCountResponse,
    NewsCommentCreateRequest,
    NewsCommentCreateResponse,
    NewsCommentDeleteResponse,
    NewsCommentResponse,
    NewsCommentUpdateRequest,
    NewsViewCountResponse,
    NewsResponse,
)

router = APIRouter(prefix="/news", tags=["news"])
COMMENT_EDIT_WINDOW = timedelta(minutes=2)


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


def clean_comment(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id", doc.get("id", "")))
    doc.pop("owner_token_hash", None)
    return doc


def owner_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def editable_until(doc: dict) -> datetime:
    raw_value = doc.get("editable_until")
    if not isinstance(raw_value, str):
        raise HTTPException(status_code=403, detail="This comment can no longer be changed")

    try:
        expiry = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
    except ValueError as error:
        raise HTTPException(status_code=403, detail="This comment can no longer be changed") from error

    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    return expiry


async def get_editable_owned_comment(slug: str, comment_id: str, owner_token: Optional[str]) -> dict:
    if not ObjectId.is_valid(comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")

    comment = await get_news_comments_collection().find_one({"_id": ObjectId(comment_id), "article_slug": slug})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    saved_hash = comment.get("owner_token_hash")
    if not owner_token or not isinstance(saved_hash, str) or not secrets.compare_digest(saved_hash, owner_token_hash(owner_token)):
        raise HTTPException(status_code=403, detail="You can only change this comment from the browser that posted it")
    if datetime.now(timezone.utc) >= editable_until(comment):
        raise HTTPException(status_code=403, detail="The 2-minute edit window has ended")

    return comment


@router.get("/", response_model=List[NewsResponse])
async def list_news(
    search: Optional[str] = Query(default=None, max_length=160),
    limit: int = Query(default=50, ge=1, le=100),
):
    col = get_news_collection()
    cursor = col.find(published_filter(search)).sort("publishedAt", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [clean_doc(doc) for doc in docs]


@router.get("/{slug}/comments/count", response_model=NewsCommentCountResponse)
async def get_news_comment_count(slug: str):
    count = await get_news_comments_collection().count_documents({"article_slug": slug})
    return {"count": count}


@router.post("/{slug}/views", response_model=NewsViewCountResponse)
async def record_news_view(slug: str, x_news_visitor: str = Header(..., min_length=16, max_length=160)):
    news = await get_news_collection().find_one({"slug": slug, "status": "published"}, {"_id": 1})
    if not news:
        raise HTTPException(status_code=404, detail="News article not found")

    views = get_news_views_collection()
    await views.update_one(
        {"article_slug": slug, "visitor_hash": owner_token_hash(x_news_visitor)},
        {
            "$setOnInsert": {
                "article_slug": slug,
                "visitor_hash": owner_token_hash(x_news_visitor),
                "viewed_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )
    return {"count": await views.count_documents({"article_slug": slug})}


@router.get("/{slug}/comments", response_model=List[NewsCommentResponse])
async def list_news_comments(slug: str, limit: int = Query(default=100, ge=1, le=100)):
    col = get_news_comments_collection()
    cursor = col.find({"article_slug": slug}).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [clean_comment(doc) for doc in docs]


@router.post("/{slug}/comments", response_model=NewsCommentCreateResponse, status_code=201)
async def create_news_comment(slug: str, comment: NewsCommentCreateRequest):
    news = await get_news_collection().find_one({"slug": slug, "status": "published"}, {"_id": 1})
    if not news:
        raise HTTPException(status_code=404, detail="News article not found")

    now = datetime.now(timezone.utc)
    edit_deadline = now + COMMENT_EDIT_WINDOW
    owner_token = secrets.token_urlsafe(32)
    doc = {
        "article_slug": slug,
        "author_name": comment.author_name.strip() or "Reader",
        "body": comment.body.strip(),
        "created_at": now.isoformat(),
        "editable_until": edit_deadline.isoformat(),
        "owner_token_hash": owner_token_hash(owner_token),
    }
    comments = get_news_comments_collection()
    result = await comments.insert_one(doc)
    doc["_id"] = result.inserted_id
    response = clean_comment(doc)
    response["owner_token"] = owner_token
    response["comment_count"] = await comments.count_documents({"article_slug": slug})
    return response


@router.patch("/{slug}/comments/{comment_id}", response_model=NewsCommentResponse)
async def update_news_comment(
    slug: str,
    comment_id: str,
    update: NewsCommentUpdateRequest,
    x_comment_token: Optional[str] = Header(default=None),
):
    comment = await get_editable_owned_comment(slug, comment_id, x_comment_token)
    body = update.body.strip()
    if not body:
        raise HTTPException(status_code=422, detail="Comment text is required")

    updated_at = datetime.now(timezone.utc).isoformat()
    await get_news_comments_collection().update_one({"_id": comment["_id"]}, {"$set": {"body": body, "updated_at": updated_at}})
    comment["body"] = body
    comment["updated_at"] = updated_at
    return clean_comment(comment)


@router.delete("/{slug}/comments/{comment_id}", response_model=NewsCommentDeleteResponse)
async def delete_news_comment(
    slug: str,
    comment_id: str,
    x_comment_token: Optional[str] = Header(default=None),
):
    comment = await get_editable_owned_comment(slug, comment_id, x_comment_token)
    comments = get_news_comments_collection()
    await comments.delete_one({"_id": comment["_id"]})
    return {"deleted": True, "comment_count": await comments.count_documents({"article_slug": slug})}


@router.get("/{slug}", response_model=NewsResponse)
async def get_news_article(slug: str):
    col = get_news_collection()
    doc = await col.find_one({"slug": slug, "status": "published"})

    if not doc:
        raise HTTPException(status_code=404, detail="News article not found")

    return clean_doc(doc)
