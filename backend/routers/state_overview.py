from typing import List, Optional

from fastapi import APIRouter, HTTPException

from mongodb import get_state_overview_collection
from state_overview_model import StateOverviewResponse

router = APIRouter(prefix="/state-overview", tags=["state-overview"])


def clean_doc(doc: dict) -> dict:
    doc["id"] = doc.pop("_id", doc.get("id", ""))
    return doc


SLUG_ALIASES: dict[str, str] = {
    "jammu-kashmir": "jammu-and-kashmir",
    "jammu-&-kashmir": "jammu-and-kashmir",
}


@router.get("/{slug}", response_model=StateOverviewResponse)
async def get_state_overview(slug: str):
    col = get_state_overview_collection()
    state_slug = slug.removeprefix("explore-")
    canonical = SLUG_ALIASES.get(state_slug, state_slug)
    doc = await col.find_one(
        {
            "$or": [
                {"slug": slug},
                {"slug": state_slug},
                {"slug": canonical},
                {"route_slug": slug},
            ],
            "is_active": {"$ne": False},
        }
    )

    if not doc:
        raise HTTPException(status_code=404, detail="State overview not found")

    return clean_doc(doc)


@router.get("/", response_model=List[StateOverviewResponse])
async def list_state_overviews(
    state_type: Optional[str] = None,
    limit: int = 50,
):
    col = get_state_overview_collection()
    query: dict = {"is_active": {"$ne": False}}

    if state_type:
        query["state_type"] = {"$regex": f"^{state_type}$", "$options": "i"}

    cursor = col.find(query).sort("state_name", 1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [clean_doc(doc) for doc in docs]
