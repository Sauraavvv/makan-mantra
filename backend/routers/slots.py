"""Slot filling for the property search.

The prompt used to be the only thing telling the model to ask one question at a
time, and a prompt is a request, not a constraint — it dumped all five whenever
it felt like it. So the decision moves out of the model: this module reads what
is already known, and the router tells the model exactly which single field to
ask about next.

The five fields are the input the recommendation API will take, so filling them
is the whole point of the conversation, not a formality.
"""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, Field

PropertyType = Literal["flat", "villa", "builder_floor", "plot", "office_space", "shop", "pg"]

# Only these have bedrooms. Asking a plot how many BHK it is makes the
# assistant look like it is not listening.
BHK_TYPES = {"flat", "villa", "builder_floor"}


class Slots(BaseModel):
    property_type: PropertyType | None = None
    bhk: int | None = None
    city: str | None = None
    state: str | None = None
    listing_type: Literal["buy", "rent"] | None = None
    budget: str | None = Field(default=None, description="as the user said it, e.g. '50 lakh', '25k per month'")


# Asked in this order. Each entry is the field, and the single instruction the
# model gets when that field is the one still missing.
QUESTIONS: list[tuple[str, str]] = [
    ("property_type",
     "Ask ONLY what type of property they want. Offer the options: flat, villa, "
     "builder floor, plot, office space, shop, or PG."),
    ("bhk",
     "Ask ONLY how many BHK they want."),
    ("city",
     "Ask ONLY which city and state they are looking in."),
    ("listing_type",
     "Ask ONLY whether they want to buy or to rent."),
    ("budget",
     "Ask ONLY what their budget is. For buying say lakh or crore; for renting say per month."),
]


def missing_field(slots: Slots) -> tuple[str, str] | None:
    """The next thing to ask for, or None when everything is known."""
    for field, instruction in QUESTIONS:
        if field == "bhk" and slots.property_type not in BHK_TYPES:
            continue  # a plot has no bedrooms
        if field == "city":
            # City and state are one question, so both must be present.
            if slots.city and slots.state:
                continue
            return field, instruction
        if getattr(slots, field) in (None, ""):
            return field, instruction
    return None


def summary(slots: Slots) -> str:
    bits = []
    if slots.bhk and slots.property_type in BHK_TYPES:
        bits.append(f"{slots.bhk} BHK")
    if slots.property_type:
        bits.append(slots.property_type.replace("_", " "))
    where = ", ".join(p for p in (slots.city, slots.state) if p)
    if where:
        bits.append(f"in {where}")
    if slots.listing_type:
        bits.append("to buy" if slots.listing_type == "buy" else "to rent")
    if slots.budget:
        bits.append(f"budget {slots.budget}")
    return " · ".join(bits)


EXTRACT_PROMPT = """Read the conversation and pull out what the user has said they want.

Fill only what they actually expressed, in this message or any earlier one. Leave
everything else null — null means "not mentioned yet" and must not overwrite
something already established.

- property_type: one of flat, villa, builder_floor, plot, office_space, shop, pg
- bhk: an integer. "2 BHK", "2bhk", "do bedroom" all mean 2.
- city: the city alone, e.g. "Noida" — not "Noida Sector 62"
- state: the Indian state that city is in. Fill it if you know it, even when the
  user only named the city.
- listing_type: "buy" for purchase/sale/investment, "rent" for rent/kiraya/lease
- budget: keep the user's own wording, e.g. "50 lakh", "20-25 hazaar per month"
"""


# ── deterministic pass ───────────────────────────────────────────────────────
#
# Most turns are a single fact — "2bhk", "rent", "50 lakh", "Pune". Those do not
# need a model, and paying for one on every turn is the bulk of the cost. The
# LLM extractor only runs when this finds nothing.

CITY_STATE: dict[str, str] = {
    "noida": "Uttar Pradesh", "greater noida": "Uttar Pradesh", "ghaziabad": "Uttar Pradesh",
    "lucknow": "Uttar Pradesh", "kanpur": "Uttar Pradesh", "agra": "Uttar Pradesh",
    "varanasi": "Uttar Pradesh", "meerut": "Uttar Pradesh",
    "gurugram": "Haryana", "gurgaon": "Haryana", "faridabad": "Haryana", "panipat": "Haryana",
    "delhi": "Delhi", "new delhi": "Delhi",
    "mumbai": "Maharashtra", "pune": "Maharashtra", "nagpur": "Maharashtra",
    "nashik": "Maharashtra", "thane": "Maharashtra", "navi mumbai": "Maharashtra",
    "bangalore": "Karnataka", "bengaluru": "Karnataka", "mysore": "Karnataka", "mangalore": "Karnataka",
    "hyderabad": "Telangana", "warangal": "Telangana",
    "chennai": "Tamil Nadu", "coimbatore": "Tamil Nadu", "madurai": "Tamil Nadu",
    "kolkata": "West Bengal", "howrah": "West Bengal", "siliguri": "West Bengal",
    "ahmedabad": "Gujarat", "surat": "Gujarat", "vadodara": "Gujarat", "rajkot": "Gujarat",
    "jaipur": "Rajasthan", "jodhpur": "Rajasthan", "udaipur": "Rajasthan", "kota": "Rajasthan",
    "indore": "Madhya Pradesh", "bhopal": "Madhya Pradesh", "gwalior": "Madhya Pradesh",
    "chandigarh": "Chandigarh", "mohali": "Punjab", "ludhiana": "Punjab", "amritsar": "Punjab",
    "patna": "Bihar", "ranchi": "Jharkhand", "bhubaneswar": "Odisha", "raipur": "Chhattisgarh",
    "dehradun": "Uttarakhand", "shimla": "Himachal Pradesh", "goa": "Goa", "panaji": "Goa",
    "kochi": "Kerala", "thiruvananthapuram": "Kerala", "kozhikode": "Kerala",
    "guwahati": "Assam", "visakhapatnam": "Andhra Pradesh", "vijayawada": "Andhra Pradesh",
}

TYPE_WORDS: list[tuple[str, PropertyType]] = [
    (r"builder\s*floor", "builder_floor"),
    (r"office\s*(?:space)?", "office_space"),
    (r"\bshop|showroom\b", "shop"),
    (r"\bpg\b|hostel|co-?living", "pg"),
    (r"\bvilla|bungalow|kothi\b", "villa"),
    (r"\bplot|land|zameen\b", "plot"),
    (r"\bflat|apartment\b", "flat"),
]

MULTIPLIERS = {"lakh": 1, "lac": 1, "l": 1, "crore": 1, "cr": 1, "k": 1,
               "hazaar": 1, "hazar": 1, "thousand": 1}

# Words that mean an established answer is being revised, so the model has to
# look again even when every field is already filled.
CHANGE_WORDS = re.compile(
    r"\b(actually|instead|change|rather|make it|no,|not |badal|nahi chahiye|iski jagah)\b", re.I
)


def regex_slots(text: str) -> Slots:
    """Whatever can be read off the message without a model."""
    low = text.lower()
    found = Slots()

    for pattern, label in TYPE_WORDS:
        if re.search(pattern, low):
            found.property_type = label
            break

    if bhk := re.search(r"\b(\d)\s*(?:bhk|b\.h\.k|bedroom|bed\b|kamre|kamra)", low):
        found.bhk = int(bhk.group(1))

    if re.search(r"\b(rent|kiraye|kiraya|kirae|lease|rental)\b", low):
        found.listing_type = "rent"
    elif re.search(r"\b(buy|purchase|kharid|kharidna|sale|invest|lena hai)\b", low):
        found.listing_type = "buy"

    # Longest city name first, so "greater noida" is not read as "noida".
    for city in sorted(CITY_STATE, key=len, reverse=True):
        if re.search(rf"\b{re.escape(city)}\b", low):
            found.city = city.title()
            found.state = CITY_STATE[city]
            break

    # "50 lakh", "1.2 cr", "20-25 hazaar", "25k per month"
    if money := re.search(
        r"(\d+(?:\.\d+)?)\s*(?:-|to|se)?\s*(\d+(?:\.\d+)?)?\s*"
        r"(lakh|lac|crore|cr|hazaar|hazar|thousand|k)\b", low
    ):
        found.budget = money.group(0).strip()

    return found


def merge(base: Slots, update: Slots) -> Slots:
    """Later answers win, but only for fields they actually mention.

    `None` means "not mentioned", never "cleared" — otherwise a one-word reply
    would wipe everything established before it.
    """
    merged = base.model_copy()
    for field, value in update.model_dump().items():
        if value not in (None, ""):
            setattr(merged, field, value)
    return merged


def needs_model(text: str, before: Slots, after: Slots) -> bool:
    """Whether the LLM extractor is worth its call on this turn."""
    if CHANGE_WORDS.search(text):
        return True  # a revision can contradict what is already stored
    if missing_field(after) is None:
        return False  # nothing left to learn
    # The regex found something new, so it has already moved the conversation on.
    return before.model_dump() == after.model_dump()
