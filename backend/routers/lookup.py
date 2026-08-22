"""What the assistant can pull up on its own, without being asked a question.

One desk for now: the news, straight out of the collection the blog already
renders from. Nothing here is generated — every headline, date and link is
copied out of a document, which is why the reply comes back as cards and the
model never sees the text to retype.
"""

from __future__ import annotations

from mongodb import get_news_collection

NEWS_LIMIT = 6


async def find_news(limit: int = NEWS_LIMIT) -> dict:
    """The most recent published stories, newest first."""
    cursor = (
        get_news_collection()
        .find({"status": "published"},
              {"_id": 0, "title": 1, "slug": 1, "summary": 1, "category": 1,
               "publishedAt": 1, "featuredImage": 1})
        .sort("publishedAt", -1)
        .limit(limit)
    )

    links = []
    async for row in cursor:
        image = row.get("featuredImage")
        links.append({
            "title": row.get("title", ""),
            "meta": (row.get("category") or "").replace("-", " ").title(),
            "summary": (row.get("summary") or "")[:150],
            "href": f"/blog/{row['slug']}" if row.get("slug") else None,
            "image": image.get("url") if isinstance(image, dict) else None,
            "at": str(row.get("publishedAt") or "")[:10],
        })

    return {
        "kind": "news",
        "title": "Latest in Indian real estate",
        "subtitle": f"{len(links)} recent stories" if links else "Nothing published yet",
        "href": "/blog",
        "links": links,
    }
