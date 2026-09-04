"""What the assistant can pull up on its own, without being asked a question.

One desk for now: the news, straight out of the collection the blog already
renders from. Nothing here is generated — every headline, date and link is
copied out of a document, which is why the reply comes back as cards and the
model never sees the text to retype.
"""

from __future__ import annotations

import re
from urllib.parse import quote

from mongodb import get_news_collection

NEWS_LIMIT = 6

# How much of a story's summary travels to the card.
#
# Not what the visitor reads: the card clamps it to four lines (~170 chars at
# its width) and CSS adds the ellipsis. This only bounds the payload, so it has
# to sit well clear of that -- at 150 it did not, and every summary in the
# collection is longer than 150, so the card ended each one mid-word with no
# ellipsis to show it had been cut.
SUMMARY_CHARS = 300


def pretty_category(raw: str) -> str:
    """The stored slug as it is shown on a card and on a chip."""
    return (raw or "").replace("-", " ").title()


async def news_categories() -> list[str]:
    """Every category that has something published under it, prettified.

    Read rather than listed: the categories come from the news pipeline, which
    is a separate project, so a hard-coded set here would go stale the first
    time it invents one -- and would offer a topic with nothing behind it.
    """
    raw = await get_news_collection().distinct("category", {"status": "published"})
    return sorted({pretty_category(one) for one in raw if one})


def match_category(text: str, known: list[str]) -> str | None:
    """Which of `known` this message names, if any.

    Matched on the pretty form, because that is what the chips send and what a
    visitor typing it themselves would write.
    """
    lowered = (text or "").lower()
    # Longest first: "Home Loan" must not win over "Home Loan Rates".
    for one in sorted(known, key=len, reverse=True):
        if one.lower() in lowered:
            return one
    return None


async def find_news(limit: int = NEWS_LIMIT, category: str | None = None) -> dict:
    """The most recent published stories, newest first.

    `category` is the pretty form; the collection stores the slug, so the match
    is made on a case-insensitive regex over either spelling of it.
    """
    query: dict = {"status": "published"}
    if category:
        slug = re.escape(category.replace(" ", "-"))
        spaced = re.escape(category)
        query["category"] = {"$regex": f"^({slug}|{spaced})$", "$options": "i"}

    cursor = (
        get_news_collection()
        .find(query,
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
            "meta": pretty_category(row.get("category") or ""),
            "summary": (row.get("summary") or "")[:SUMMARY_CHARS],
            "href": f"/blog/{row['slug']}" if row.get("slug") else None,
            "image": image.get("url") if isinstance(image, dict) else None,
            "at": str(row.get("publishedAt") or "")[:10],
        })

    return {
        "kind": "news",
        "title": f"Latest on {category}" if category else "Latest in Indian real estate",
        "subtitle": f"{len(links)} recent stories" if links else "Nothing published yet",
        "href": f"/blog?category={quote(category)}" if category else "/blog",
        "links": links,
    }
