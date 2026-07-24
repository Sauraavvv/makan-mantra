from typing import List, Optional

from fastapi import APIRouter, HTTPException

from district_overview_model import DistrictOverviewResponse
from mongodb import get_district_overview_collection

router = APIRouter(prefix="/district-overview", tags=["district-overview"])


def clean_doc(doc: dict) -> dict:
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/{slug}", response_model=DistrictOverviewResponse)
async def get_district_overview(slug: str):
    col = get_district_overview_collection()
    district_slug = slug.removeprefix("explore-")
    slug_candidates = {slug, district_slug}
    route_slug_candidates = {
        item if item.startswith("explore-") else f"explore-{item}"
        for item in slug_candidates
    }
    doc = await col.find_one(
        {
            "$or": [
                {"slug": {"$in": list(slug_candidates)}},
                {"route_slug": {"$in": list(route_slug_candidates)}},
            ],
            "is_active": {"$ne": False},
        }
    )

    if not doc:
        raise HTTPException(status_code=404, detail="District overview not found")

    return clean_doc(doc)


@router.get("/", response_model=List[DistrictOverviewResponse])
async def list_district_overviews(
    state: Optional[str] = None,
    limit: int = 100,
):
    col = get_district_overview_collection()
    query: dict = {"is_active": {"$ne": False}}

    if state:
        query["state_name"] = {"$regex": f"^{state}$", "$options": "i"}

    cursor = col.find(query).sort("district_name", 1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [clean_doc(doc) for doc in docs]
