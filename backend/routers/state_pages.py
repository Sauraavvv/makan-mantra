from fastapi import APIRouter, HTTPException
from typing import List, Optional
from mongodb import get_state_pages_collection
from state_model import StateModelResponse

router = APIRouter(prefix="/state-pages", tags=["state-pages"])


def clean_doc(doc: dict) -> dict:
    doc["id"] = doc.pop("_id", doc.get("id", ""))
    return doc


@router.get("/{slug}", response_model=StateModelResponse)
async def get_state_page(slug: str):
    col = get_state_pages_collection()
    doc = await col.find_one({"slug": slug, "is_active": {"$ne": False}})
    if not doc:
        raise HTTPException(status_code=404, detail="Page not found")
    return clean_doc(doc)


@router.get("/", response_model=List[StateModelResponse])
async def list_state_pages(
    state: Optional[str] = None,
    property_type: Optional[str] = None,
    listing_type: Optional[str] = None,
    limit: int = 50,
):
    col = get_state_pages_collection()
    query: dict = {"is_active": {"$ne": False}}

    if state:
        query["location.state"] = {"$regex": f"^{state}$", "$options": "i"}
    if property_type:
        query["property_type"] = property_type
    if listing_type:
        query["listing_type"] = listing_type

    cursor = col.find(query).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [clean_doc(doc) for doc in docs]
