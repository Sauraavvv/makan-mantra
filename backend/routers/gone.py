from fastapi import APIRouter

from mongodb import (
    get_district_overview_collection,
    get_location_pages_collection,
    get_state_overview_collection,
)

router = APIRouter(tags=["gone"])

BATCH = 100000


async def _segments(col, fields: tuple[str, ...]) -> list[str]:
    projection = {field: 1 for field in fields}
    docs = await col.find({"is_active": False}, projection).to_list(length=BATCH)

    return [
        str(doc[field])
        for doc in docs
        for field in fields
        if doc.get(field)
    ]


@router.get("/gone-slugs")
async def get_gone_slugs():
    """
    Every URL segment that was published once and has since been deactivated.

    The frontend proxy reads this to answer those URLs with a 410 instead of a
    404, so search engines drop them permanently rather than keep re-crawling.

    Overview pages resolve under both their bare slug and their `explore-`
    route slug, so both spellings are listed — either one must be gone too.
    """
    location_pages = await _segments(get_location_pages_collection(), ("slug",))
    states = await _segments(get_state_overview_collection(), ("slug", "route_slug"))
    districts = await _segments(get_district_overview_collection(), ("slug", "route_slug"))

    return {"slugs": sorted({*location_pages, *states, *districts})}
