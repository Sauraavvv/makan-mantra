from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from typing import List, Optional
import random
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


QUICK_LINK_LIMIT = 10

PROPERTY_TYPE_LABELS = {
    "flat": "Flats",
    "villa": "Villas",
    "plot": "Plots",
    "builder_floor": "Builder Floors",
    "office_space": "Office Spaces",
    "shop": "Shops",
    "showroom": "Showrooms",
    "pg": "PGs",
}

LISTING_TYPE_LABELS = {"sale": "for Sale", "rent": "for Rent"}


def _ist_day() -> str:
    """Rotation key: the links change once a day, at midnight IST."""
    return (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d")


def _shuffled(items: list, seed: str) -> list:
    shuffled = list(items)
    random.Random(seed).shuffle(shuffled)
    return shuffled


def _link(doc: dict) -> dict:
    location = doc.get("location") or {}
    return {
        "slug": doc.get("slug"),
        "label": (doc.get("seo") or {}).get("on_page_title") or doc.get("slug", "").replace("-", " ").title(),
        "level": doc.get("location_category"),
        "name": doc.get("location_name") or location.get("city") or location.get("district") or "",
        "district": (location.get("district") or "").strip(),
    }


@router.get("/quick-links/{state}")
async def get_quick_links(state: str, district: Optional[str] = None, limit: int = QUICK_LINK_LIMIT):
    """
    Category-wise link blocks for explore pages.

    Pool is every district- and city-level page in the state. For each
    property_type + listing_type the links are shuffled with a day-based seed,
    so a page keeps the same set all day and rotates the next morning.

    On a district page the district's own cities come first, then the rest of
    the state — a single district rarely has enough pages of its own.
    """
    col = get_location_pages_collection()
    query = {
        **state_filter(state),
        "is_active": {"$ne": False},
        "location_category": {"$in": ["district", "city"]},
    }
    projection = {
        "slug": 1,
        "location_category": 1,
        "location_name": 1,
        "property_type": 1,
        "listing_type": 1,
        "seo.on_page_title": 1,
        "location.district": 1,
        "location.city": 1,
    }

    docs = await col.find(query, projection).to_list(length=20000)

    day = _ist_day()
    district_key = (district or "").strip().lower()
    buckets: dict = {}

    for doc in docs:
        property_type = doc.get("property_type")
        listing_type = doc.get("listing_type")
        if not property_type or not listing_type or not doc.get("slug"):
            continue

        buckets.setdefault((property_type, listing_type), []).append(_link(doc))

    groups = []
    for (property_type, listing_type), links in buckets.items():
        seed = f"{state}|{district_key}|{property_type}|{listing_type}|{day}"

        if district_key:
            own = [l for l in links if l["district"].lower() == district_key]
            rest = [l for l in links if l["district"].lower() != district_key]
            # Cities of this district first, then its own district pages, then the state.
            ordered = (
                _shuffled([l for l in own if l["level"] == "city"], seed)
                + _shuffled([l for l in own if l["level"] != "city"], seed)
                + _shuffled(rest, seed)
            )
        else:
            ordered = _shuffled(links, seed)

        picked = ordered[:limit]
        if not picked:
            continue

        groups.append(
            {
                "key": f"{property_type}-{listing_type}",
                "property_type": property_type,
                "listing_type": listing_type,
                "label": f"{PROPERTY_TYPE_LABELS.get(property_type, property_type.title())} "
                f"{LISTING_TYPE_LABELS.get(listing_type, listing_type)}",
                "links": [
                    {k: v for k, v in link.items() if k != "district"} for link in picked
                ],
            }
        )

    groups.sort(key=lambda g: (g["listing_type"], g["property_type"]))

    return {"state": state, "district": district, "day": day, "groups": groups}


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
