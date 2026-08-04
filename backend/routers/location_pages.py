from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from math import asin, cos, radians, sin, sqrt
from typing import List, Optional
import random
import re
from mongodb import get_district_overview_collection, get_location_pages_collection
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


NEARBY_DISTRICT_LIMIT = 25


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    p1, p2 = radians(lat1), radians(lat2)
    dp, dl = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dp / 2) ** 2 + cos(p1) * cos(p2) * sin(dl / 2) ** 2
    return 2 * radius * asin(sqrt(a))


async def _district_centroids(col) -> list:
    """One coordinate pair per district, taken from its district-level pages."""
    pipeline = [
        {
            "$match": {
                "is_active": {"$ne": False},
                "location_category": "district",
                "location.coordinates.latitude": {"$type": "number", "$ne": 0},
                "location.coordinates.longitude": {"$type": "number", "$ne": 0},
            }
        },
        {
            "$group": {
                "_id": {"state": "$location.state", "district": "$location.district"},
                "lat": {"$first": "$location.coordinates.latitude"},
                "lng": {"$first": "$location.coordinates.longitude"},
            }
        },
    ]
    return await col.aggregate(pipeline).to_list(length=5000)


@router.get("/quick-links-district/{state}/{district}")
async def get_district_quick_links(state: str, district: str, limit: int = QUICK_LINK_LIMIT):
    """
    Category-wise link blocks for a district page.

    The district's own city pages come first — those are the pages that carry
    this district in their hierarchy. Most districts have only one or two, so
    the rest of each block is filled from the geographically nearest districts
    rather than an arbitrary slice of the state.
    """
    col = get_location_pages_collection()
    district_key = district.strip().lower()

    centroids = await _district_centroids(col)

    # The page itself is built from district_overview, and district names there
    # do not always match location_pages. Read the coordinates from the same
    # place the page comes from so a name mismatch cannot break the lookup.
    overview = await get_district_overview_collection().find_one(
        {
            "district_name": {"$regex": f"^{re.escape(district.strip())}$", "$options": "i"},
            "state_name": {"$regex": f"^{re.escape(state.strip())}$", "$options": "i"},
        },
        {"location.coordinates": 1},
    )

    coords = ((overview or {}).get("location") or {}).get("coordinates") or {}
    lat, lng = coords.get("latitude"), coords.get("longitude")

    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)) or not lat or not lng:
        # Fall back to location_pages for districts with no overview document.
        match = next(
            (
                c
                for c in centroids
                if (c["_id"].get("district") or "").strip().lower() == district_key
                and (c["_id"].get("state") or "").strip().lower() == state.strip().lower()
            ),
            None,
        )
        if match is None:
            raise HTTPException(status_code=404, detail="District not found")
        lat, lng = match["lat"], match["lng"]

    here = {"lat": lat, "lng": lng}

    ranked = sorted(
        (
            (
                _haversine_km(here["lat"], here["lng"], c["lat"], c["lng"]),
                (c["_id"].get("district") or "").strip(),
            )
            for c in centroids
            if (c["_id"].get("district") or "").strip().lower() != district_key
        ),
        key=lambda pair: pair[0],
    )[:NEARBY_DISTRICT_LIMIT]

    nearby_order = {name.lower(): index for index, (_, name) in enumerate(ranked)}

    query = {
        "is_active": {"$ne": False},
        "$or": [
            {"location_category": "city", **district_filter(district)},
            {
                "location_category": {"$in": ["district", "city"]},
                "location.district": {
                    "$in": [name for _, name in ranked],
                },
            },
        ],
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

        own = [l for l in links if l["district"].lower() == district_key]
        rest = [l for l in links if l["district"].lower() != district_key]
        # Closest districts first; the shuffle only reorders within one district.
        rest.sort(key=lambda l: nearby_order.get(l["district"].lower(), len(nearby_order)))

        ordered = _shuffled(own, seed) + rest
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

    return {
        "state": state,
        "district": district,
        "day": day,
        "own_cities": len({l["slug"] for l in buckets.get(("flat", "sale"), []) if l["district"].lower() == district_key}),
        "groups": groups,
    }


@router.get("/quick-links-states")
async def get_state_quick_links(limit: int = QUICK_LINK_LIMIT):
    """
    The home-page version of the block above.

    Pool is every state-level page across India — the pages built on a state
    name itself, not its districts or cities. Same day-based seed, so the set
    holds for the day and rotates the next morning.
    """
    col = get_location_pages_collection()
    query = {
        "is_active": {"$ne": False},
        "location_category": "state",
    }
    projection = {
        "slug": 1,
        "location_category": 1,
        "location_name": 1,
        "property_type": 1,
        "listing_type": 1,
        "seo.on_page_title": 1,
        "location.state": 1,
    }

    docs = await col.find(query, projection).to_list(length=20000)

    day = _ist_day()
    buckets: dict = {}

    for doc in docs:
        property_type = doc.get("property_type")
        listing_type = doc.get("listing_type")
        if not property_type or not listing_type or not doc.get("slug"):
            continue

        buckets.setdefault((property_type, listing_type), []).append(_link(doc))

    groups = []
    for (property_type, listing_type), links in buckets.items():
        seed = f"india|{property_type}|{listing_type}|{day}"
        picked = _shuffled(links, seed)[:limit]
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

    return {"scope": "india", "day": day, "groups": groups}


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
    doc = await col.find_one({"slug": slug})
    if not doc:
        raise HTTPException(status_code=404, detail="Page not found")
    # Deactivated pages are gone for good, not merely missing.
    if doc.get("is_active") is False:
        raise HTTPException(status_code=410, detail="Page permanently removed")
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
