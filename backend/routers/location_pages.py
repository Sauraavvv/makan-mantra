from fastapi import APIRouter, HTTPException
from typing import List, Optional
import re
from mongodb import get_location_pages_collection
from state_model import StateModelResponse

router = APIRouter(prefix="/location-pages", tags=["location-pages"])

DADRA_DAMAN_STATE_ALIASES = {
    "dadra and nagar haveli and daman and diu",
    "dadra and nagar haveli",
    "daman and diu",
}


def clean_doc(doc: dict) -> dict:
    doc["id"] = doc.pop("_id", doc.get("id", ""))
    return doc


def state_filter(state: str) -> dict:
    state_name = state.strip()
    aliases = [state_name]

    if state_name.lower() in DADRA_DAMAN_STATE_ALIASES:
        aliases = [
            "Dadra and Nagar Haveli and Daman and Diu",
            "Dadra and Nagar Haveli",
            "Daman and Diu",
        ]

    return {
        "$or": [
            {"location.state": {"$regex": f"^{re.escape(alias)}$", "$options": "i"}}
            for alias in aliases
        ]
    }


@router.get("/{slug}", response_model=StateModelResponse)
async def get_location_page(slug: str):
    col = get_location_pages_collection()
    doc = await col.find_one({"slug": slug, "is_active": {"$ne": False}})
    if not doc:
        raise HTTPException(status_code=404, detail="Page not found")
    return clean_doc(doc)


@router.get("/", response_model=List[StateModelResponse])
async def list_location_pages(
    state: Optional[str] = None,
    property_type: Optional[str] = None,
    listing_type: Optional[str] = None,
    limit: int = 50,
):
    col = get_location_pages_collection()
    query: dict = {"is_active": {"$ne": False}}

    if state:
        query.update(state_filter(state))
    if property_type:
        query["property_type"] = property_type
    if listing_type:
        query["listing_type"] = listing_type

    cursor = col.find(query).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [clean_doc(doc) for doc in docs]
