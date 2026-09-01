"""Posting a property, one question at a time.

The Post Property page asks for all of this in a three-step form. This is that
form as a conversation, and it is a step machine rather than a conversation in
the model sense: fixed text at each field, chips wherever the answers are a
closed set, and a regex to read them back. No model is called anywhere in it,
for the reason slots.py gives about the search -- the wording never needs to
vary, the options cannot, and a model asked to list them will eventually list
them wrong, reorder them, or invent an eighth.

Nothing here is a second source of truth. The keys below are the ones
frontend/src/lib/constants/propertyTypes.ts defines and /api/post-property
validates against, and the required set is the one the wizard's validateStep
enforces. A label that drifts from those is a submission the API rejects.

Photos work the same way they do on the page: the browser uploads straight to
Cloudinary and only the ids travel. This module never sees a file -- it asks
the question and counts what the client says it managed to attach.
"""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel

# frontend/src/lib/constants/propertyTypes.ts -- note showroom_shop, which the
# search's own PropertyType calls "shop". This is the posting side, so it is
# the API's spelling that counts.
PostType = Literal["flat", "plot", "office_space", "builder_floor", "showroom_shop", "villa", "pg"]


class Listing(BaseModel):
    """What /api/post-property takes, minus the media it cannot be given here."""

    property_type: PostType | None = None
    listing_type: Literal["buy", "rent"] | None = None
    details: str | None = None
    user_type: Literal["owner", "builder", "broker"] | None = None
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    account: bool | None = None
    # How many files were attached. 0 is an answer -- it means skipped -- so
    # this is None until the question has been put.
    photos: int | None = None


# Asked in this order -- the wizard's own: the property, then who is posting it,
# then how to reach them.
ORDER = [
    "property_type",
    "listing_type",
    "details",
    "user_type",
    "name",
    "phone",
    "email",
    "account",
    # Last, as it is on the page: the wizard's third step is the media one.
    "photos",
]

# Things a signed-in owner has already given the site. /api/post-property reads
# them off the session, so asking again would be asking twice.
GUEST_ONLY = {"name", "email", "account"}


PROMPTS: dict[str, str] = {
    "property_type": "What kind of property are you posting?",
    "listing_type": "Are you listing it for sale, or for rent?",
    "details": (
        "Tell me about it in one message — locality, size, floor, price, "
        "furnishing, parking. Whatever you would put in the ad."
    ),
    "user_type": "And you are posting this as?",
    "name": "What is your name?",
    "phone": "Your 10-digit mobile number? Our team calls on this to build the listing with you.",
    "email": "And your email — the confirmation and your property ID go there.",
    "account": (
        "Shall I create your MakanMantraa account with these details, so you can "
        "track this listing and its enquiries?"
    ),
    "photos": (
        "Last thing — add some photos, or a walkthrough video. Tap the clip below "
        "to pick them, or skip and the team will collect them on the call."
    ),
}

CHOICES: dict[str, list[str]] = {
    "property_type": ["Flat", "Plot", "Office Space", "Builder Floor", "Showroom / Shop", "Villa", "PG"],
    "listing_type": ["For Sale", "For Rent"],
    "user_type": ["Owner", "Builder", "Broker"],
    "account": ["Yes, create it", "No thanks"],
    "photos": ["Skip for now"],
}

# Said when the answer did not read. Each one leaves the same question standing,
# so the chips under it are still the right chips.
RETRY: dict[str, str] = {
    "property_type": "I did not catch the type — tap one of these, or type it.",
    "listing_type": "For sale, or for rent?",
    "details": "Give me a little to go on — the locality and the price at least. Or say skip.",
    "user_type": "Are you the owner, a builder, or a broker?",
    "name": "What name should the listing be under?",
    "phone": "That is not a 10-digit Indian mobile number. Something like 9876543210.",
    "email": "That does not look like an email address. Something like name@example.com.",
    "account": "Just yes or no — shall I create the account?",
    "photos": "Tap the clip to attach files, or say skip.",
}

TYPE_LABELS: dict[str, str] = {
    "flat": "Flat",
    "plot": "Plot",
    "office_space": "Office Space",
    "builder_floor": "Builder Floor",
    "showroom_shop": "Showroom / Shop",
    "villa": "Villa",
    "pg": "PG",
}


# ── reading an answer ────────────────────────────────────────────────────────
#
# Every question here is answered by the whole message, so this reads the field
# being asked rather than scanning for all of them at once. A chip sends its own
# label, which these patterns read exactly as if it had been typed.

TYPE_WORDS: list[tuple[str, str]] = [
    (r"builder\s*floor", "builder_floor"),
    (r"office", "office_space"),
    (r"showroom|\bshops?\b", "showroom_shop"),
    (r"\bpg\b|hostel|co-?living", "pg"),
    (r"villa|bungalow|kothi", "villa"),
    (r"plot|land|zameen", "plot"),
    (r"flat|apartment", "flat"),
]

USER_WORDS: list[tuple[str, str]] = [
    (r"builder|developer", "builder"),
    (r"broker|agent|dealer", "broker"),
    (r"owner|malik|self|mera", "owner"),
]

RENT = re.compile(r"\brent|kiraya|kiraye|lease\b", re.I)
SELL = re.compile(r"\bsale|sell|bech|resale|buy\b", re.I)

# The API's own pattern (PHONE_PATTERN in the route), with the +91 and the
# spacing people actually type stripped off first.
PHONE = re.compile(r"(?:\+?91)?([6-9]\d{9})$")
EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

YES = re.compile(r"\b(yes|yeah|yep|yup|sure|ok(ay)?|haan|haa|please|create|kar do)\b", re.I)
NO = re.compile(r"\b(no|nope|nah|nahi|skip|later|don'?t|mat)\b", re.I)

# Details is the one optional field on the page, so it stays optional here.
SKIP = re.compile(r"^\s*(skip|later|pass|chhodo|chodo|baad me[in]?)\s*$", re.I)


def apply(listing: Listing, field: str, message: str, attached: int = 0) -> str | None:
    """Read this message as the answer to `field`. Returns a retry line if it
    did not read, or None once the field is set.

    `attached` is how many files the client has uploaded and is holding for this
    turn. Only the photos question looks at it, and for that question it counts
    ahead of anything typed alongside it -- files in hand are the answer.
    """
    text = message.strip()

    if field == "property_type":
        for pattern, value in TYPE_WORDS:
            if re.search(pattern, text, re.I):
                listing.property_type = value  # type: ignore[assignment]
                return None
        return RETRY[field]

    if field == "listing_type":
        # Rent first: "for rent" carries no sale word, but "sale or rent" does
        # carry both, and rent is the narrower reading.
        if RENT.search(text):
            listing.listing_type = "rent"
            return None
        if SELL.search(text):
            listing.listing_type = "buy"
            return None
        return RETRY[field]

    if field == "details":
        if SKIP.match(text):
            listing.details = ""
            return None
        if len(text) < 8:
            return RETRY[field]
        listing.details = text
        return None

    if field == "user_type":
        for pattern, value in USER_WORDS:
            if re.search(pattern, text, re.I):
                listing.user_type = value  # type: ignore[assignment]
                return None
        return RETRY[field]

    if field == "name":
        # Nothing clever: a name is whatever they say it is. Only length and a
        # stray digit are worth catching, and a digit usually means the phone
        # number arrived a question early.
        if len(text) < 2 or len(text) > 60 or any(c.isdigit() for c in text):
            return RETRY[field]
        listing.name = text
        return None

    if field == "phone":
        digits = re.sub(r"[\s\-()]", "", text)
        found = PHONE.match(digits)
        if not found:
            return RETRY[field]
        listing.phone = found.group(1)
        return None

    if field == "email":
        found = EMAIL.search(text)
        if not found:
            return RETRY[field]
        listing.email = found.group(0).lower()
        return None

    if field == "photos":
        if attached > 0:
            listing.photos = attached
            return None
        if SKIP.match(text) or NO.search(text):
            listing.photos = 0
            return None
        return RETRY[field]

    if field == "account":
        if NO.search(text):
            listing.account = False
            return None
        if YES.search(text):
            listing.account = True
            return None
        return RETRY[field]

    return None


def missing_field(listing: Listing, signed_in: bool) -> str | None:
    """The next thing to ask for, or None when the form is complete.

    `is None` rather than a falsy test on purpose: an empty details field and a
    declined account are both answers, and re-asking them would loop.
    """
    for field in ORDER:
        if signed_in and field in GUEST_ONLY:
            continue
        if getattr(listing, field) is None:
            return field
    return None


def ask(field: str) -> tuple[str, list[str]]:
    """The line to put on screen, and the buttons to put under it."""
    return PROMPTS[field], CHOICES.get(field, [])


def summary(listing: Listing) -> str:
    """The submission read back, so it can be checked before the call comes."""
    bits = [TYPE_LABELS.get(listing.property_type or "", "property")]
    if listing.listing_type:
        bits.append("for rent" if listing.listing_type == "rent" else "for sale")
    if listing.user_type:
        bits.append(f"posted as {listing.user_type}")
    if listing.phone:
        bits.append(f"contact {listing.phone}")
    if listing.photos:
        bits.append(f"{listing.photos} file{'s' if listing.photos > 1 else ''}")
    return " · ".join(bits)


def payload(listing: Listing) -> dict:
    """The form /api/post-property expects, ready for the client to send.

    Sent from the browser rather than from here for the same reason the lead
    email is: the account creation, the property id and the confirmation mail
    all live on the Next side, and this service has none of them.
    """
    return {
        "property_type": listing.property_type,
        "listing_type": listing.listing_type,
        "details": listing.details or "",
        "user_type": listing.user_type,
        "owner_name": listing.name or "",
        "owner_email": listing.email or "",
        "owner_phone": listing.phone or "",
        # A signed-in owner was never asked, and the route ignores it for them.
        "create_account": "true" if listing.account else "false",
        "source": "chatbot",
    }
