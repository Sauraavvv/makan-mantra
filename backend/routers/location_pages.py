from fastapi import APIRouter, HTTPException
from typing import List, Optional
import re
from mongodb import get_location_pages_collection
from state_model import StateModelResponse

router = APIRouter(prefix="/location-pages", tags=["location-pages"])


def clean_doc(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id", doc.get("id", "")))
    return doc


def state_filter(state: str) -> dict:
    state_name = state.strip()
    return {"location.state": {"$regex": f"^{re.escape(state_name)}$", "$options": "i"}}


def district_filter(district: str) -> dict:
    district_name = district.strip()
    return {"location.district": {"$regex": f"^{re.escape(district_name)}$", "$options": "i"}}


PREFERRED_LINK_PROPERTY_TYPE = "flat"
PREFERRED_LINK_LISTING_TYPE = "sale"


def _is_preferred(doc: dict) -> bool:
    return (
        doc.get("property_type") == PREFERRED_LINK_PROPERTY_TYPE
        and doc.get("listing_type") == PREFERRED_LINK_LISTING_TYPE
    )


@router.get("/links/{state}")
async def get_state_link_sections(state: str):
    """Links shown on a state page: its property-type pages, and its districts with their cities."""
    col = get_location_pages_collection()
    query = {**state_filter(state), "is_active": {"$ne": False}}
    projection = {
        "slug": 1,
        "location_category": 1,
        "location_name": 1,
        "property_type": 1,
        "listing_type": 1,
        "location.district": 1,
        "location.city": 1,
    }

    docs = await col.find(query, projection).to_list(length=20000)

    property_pages: List[dict] = []
    districts: dict = {}

    for doc in docs:
        category = doc.get("location_category")
        slug = doc.get("slug")
        if not slug:
            continue

        if category == "state":
            property_pages.append(
                {
                    "slug": slug,
                    "property_type": doc.get("property_type"),
                    "listing_type": doc.get("listing_type"),
                }
            )
            continue

        location = doc.get("location") or {}
        district_name = (location.get("district") or "").strip()
        if not district_name:
            continue

        district = districts.setdefault(
            district_name, {"name": district_name, "slug": None, "cities": {}}
        )

        if category == "district":
            if district["slug"] is None or _is_preferred(doc):
                district["slug"] = slug
        elif category == "city":
            city_name = (location.get("city") or doc.get("location_name") or "").strip()
            if not city_name:
                continue

            city = district["cities"].setdefault(city_name, {"name": city_name, "slug": None})
            if city["slug"] is None or _is_preferred(doc):
                city["slug"] = slug

    return {
        "state": state,
        "property_pages": sorted(
            property_pages, key=lambda item: (item["listing_type"] or "", item["property_type"] or "")
        ),
        "districts": [
            {
                "name": district["name"],
                "slug": district["slug"],
                "cities": sorted(district["cities"].values(), key=lambda city: city["name"]),
            }
            for district in sorted(districts.values(), key=lambda item: item["name"])
        ],
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
    district: Optional[str] = None,
    location_category: Optional[str] = None,
    property_type: Optional[str] = None,
    listing_type: Optional[str] = None,
    limit: int = 50,
):
    col = get_location_pages_collection()
    query: dict = {"is_active": {"$ne": False}}

    if state:
        query.update(state_filter(state))
    if district:
        query.update(district_filter(district))
    if location_category:
        query["location_category"] = location_category
    if property_type:
        query["property_type"] = property_type
    if listing_type:
        query["listing_type"] = listing_type

    cursor = col.find(query).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [clean_doc(doc) for doc in docs]
