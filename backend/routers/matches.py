"""Placeholder results, so the end of the conversation has an end.

There is no property inventory behind this service yet: no listings collection,
and the site's own cards are generated in the browser. Until that exists the
assistant collected five answers and then said "finding matches" to nobody —
the one moment the whole slot-filling exists to reach, and it went nowhere.

So these are built from the slots themselves. That is why they always match
what was asked for: they are not search results, they are the shape search
results will take. Everything here is meant to be deleted — when listings
exist, `find_matches` keeps its signature and its caller, and its body becomes
a query.
"""

from __future__ import annotations

import re

from routers.slots import BHK_TYPES, Slots

HOW_MANY = 3

UNITS = {
    "crore": 10_000_000, "cr": 10_000_000,
    "lakh": 100_000, "lac": 100_000, "l": 100_000,
    "thousand": 1_000, "hazaar": 1_000, "hazar": 1_000, "k": 1_000,
}

# Names that read as an Indian address anywhere in the country, because the
# city comes from the user and this list cannot know which one it will be.
LOCALITIES = [
    "Civil Lines", "Model Town", "Green Park", "Shanti Nagar", "Vikas Nagar",
    "Rajendra Nagar", "Ashok Vihar", "Gandhi Nagar", "Krishna Colony", "New Colony",
]

TYPE_LABEL = {
    "flat": "Flat",
    "villa": "Villa",
    "builder_floor": "Builder Floor",
    "plot": "Plot",
    "office_space": "Office Space",
    "shop": "Shop",
    "pg": "PG",
}


def parse_budget(text: str | None) -> int | None:
    """The user's own wording, in rupees.

    The slot keeps whatever they typed — "50 lakh", "20-25 hazaar", "25k per
    month" — so the unit does the work and a range is read at its top, which is
    the number people mean when they say how much they can go to.
    """
    if not text:
        return None
    low = text.lower()
    found = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:-|to|se)?\s*(\d+(?:\.\d+)?)?\s*"
        r"(crore|cr|lakh|lac|hazaar|hazar|thousand|k|l)\b",
        low,
    )
    if found:
        top = float(found.group(2) or found.group(1))
        return int(top * UNITS[found.group(3)])
    bare = re.search(r"\d[\d,]*", low)
    return int(bare.group(0).replace(",", "")) if bare else None


def money(rupees: int, listing_type: str | None) -> str:
    if listing_type == "rent":
        return f"₹{rupees:,}/month"
    if rupees >= 10_000_000:
        return f"₹{rupees / 10_000_000:.2f} Cr"
    return f"₹{rupees / 100_000:.0f} L"


def seed(text: str) -> int:
    """Same slots, same listings. A demo that reshuffles on every render reads
    as broken long before anyone notices it was never real.

    FNV-1a rather than anything shorter, because the three results differ by a
    single character of input and a weak mix hands back three near-consecutive
    numbers — three localities in a row and areas a square foot apart.
    """
    value = 2166136261
    for char in text:
        value = ((value ^ ord(char)) * 16777619) & 0xFFFFFFFF
    return value


def find_matches(slots: Slots) -> list[dict]:
    """A few listings for a completed search. Fabricated — see the module note."""
    if not slots.city or not slots.property_type:
        return []

    label = TYPE_LABEL.get(slots.property_type, "Property")
    rooms = slots.bhk if slots.property_type in BHK_TYPES else None
    ceiling = parse_budget(slots.budget)
    if not ceiling:
        ceiling = 25_000 if slots.listing_type == "rent" else 5_000_000

    base = seed(f"{slots.city}{slots.property_type}{slots.bhk}{slots.budget}")
    results = []

    for i in range(HOW_MANY):
        spin = seed(f"{base}-{i}")
        locality = LOCALITIES[spin % len(LOCALITIES)]

        # Sits under the ceiling and works up to it: a first result priced over
        # what the user just said they could spend is the wrong first result.
        price = int(ceiling * (0.86 + 0.07 * i))
        step = 500 if slots.listing_type == "rent" else 100_000
        price = max(step, round(price / step) * step)

        # A PG is a room, not a home; the same formula would list it at
        # fifteen hundred square feet.
        area = 110 + (spin % 140) if slots.property_type == "pg" else 450 + (spin % 600) + (rooms or 2) * 250
        baths = rooms if rooms and rooms <= 2 else (rooms or 0) - 1
        parts = [f"{rooms} BHK", f"{baths} Bath"] if rooms else [label]

        results.append({
            "id": f"sample-{base}-{i}",
            "title": f"{rooms} BHK {label} in {locality}" if rooms else f"{label} in {locality}",
            "price": money(price, slots.listing_type),
            "locality": locality,
            "city": slots.city,
            "config": " · ".join(parts),
            "area": f"{area:,} sq ft",
        })

    return results
