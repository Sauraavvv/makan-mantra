"""Keeping the assistant on its own subject.

A property assistant that cheerfully debugs Python or explains the offside rule
is not a property assistant. The system prompt can ask the model to stay in its
lane, but a prompt is a request: the model obliges until it does not, and the
one time it does not is the screenshot that travels.

So the decision moves out of the model, the same way the questions did in
`slots`. This module answers one thing — does this message belong to us — and
when the answer is no the router never calls the chat model at all. It sends a
fixed refusal instead, with the examples that show what the assistant is for,
because "I can't help with that" on its own leaves the user nowhere.

Resolution is cheapest-first, and the order matters more than the rules do: a
reply the assistant just asked for counts as on topic before anything else gets
to look at it. "Bareilly" is not a property word and never will be, and the
city list is a shortlist, not a census.
"""

from __future__ import annotations

import re
from collections.abc import Callable

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from routers.slots import Slots

# ── the cheap passes ─────────────────────────────────────────────────────────

# Anything here means the message is ours, whatever else it also says. The list
# runs past listings into the paperwork and money around them, because "what is
# stamp duty in UP" is exactly the question this assistant should answer.
PROPERTY_WORDS = re.compile(
    r"\b("
    r"propert(?:y|ies)|real\s*estate|flat|apartment|villa|bungalow|kothi|duplex|penthouse|"
    r"plot|land|zameen|makan|ghar|house|home|room|kamra|kamre|bhk|bedroom|"
    r"office|shop|showroom|godown|warehouse|pg|hostel|co-?living|"
    r"rent|kiraya|kirae|kiraye|lease|tenant|landlord|deposit|brokerage|"
    r"buy|kharid\w*|sale|resale|sell|bech\w*|invest\w*|"
    r"budget|price|rate|bhav|lakh|lac|crore|hazaar|hazar|"
    r"sq\.?\s*ft|square\s*feet|sqft|gaj|bigha|acre|marla|"
    r"carpet\s*area|built\s*-?\s*up|super\s*area|floor|society|tower|township|"
    r"builder|developer|broker|dealer|agent|owner|possession|"
    r"ready\s*to\s*move|under\s*construction|new\s*launch|"
    r"rera|registry|sale\s*deed|stamp\s*duty|mutation|khasra|khatauni|khata|"
    r"home\s*loan|loan|emi|down\s*payment|interest\s*rate|"
    r"maintenance|parking|amenities|furnished|vastu|facing|"
    r"locality|sector|colony|neighbourhood|neighborhood|metro|"
    r"listing|shortlist|site\s*visit|token|agreement"
    r")\b",
    re.I,
)

# Things a person says to a person: an opener, a thank you, a goodbye, or a
# question about who they are talking to. These are not a change of subject,
# and refusing a "hi" would be the rudest possible way to enforce a topic —
# but neither is answering it with a form field, which is why they are kept
# apart from the filler below.
ADDRESS = (
    r"(?:\s*[,!]?\s*(?:bro|bhai|buddy|dude|there|sir|madam|ma'?am|mam|dost|"
    r"yaar|ji|mantraa?|team|guys?|friend|everyone))*"
)

GREETING = re.compile(
    r"^\s*("
    r"hi+|hello+|hey+|yo|namaste|namaskar|salaam|"
    r"good\s*(morning|afternoon|evening|night)|"
    r"thanks?|thank\s*you|thx|dhanyavaad|dhanyawad|shukriya|"
    r"bye|goodbye|see\s*you|"
    r"who\s*are\s*you|what\s*can\s*you\s*do|how\s*can\s*you\s*help|help|"
    r"(aap|tum)\s*kaun\s*ho|kya\s*kar\s*sakte\s*ho|kaise\s*ho|how\s*are\s*you"
    r")" + ADDRESS + r"[\s!.?]*$",
    re.I,
)

# Bare acknowledgements. On topic, but there is nothing to say back to "ok".
FILLER = re.compile(
    r"^\s*("
    r"ok(ay)?|k|thik|theek|(thik|theek)\s*hai|sahi|great|nice|cool|good|"
    r"ha+n?|yes|yep|yeah|no|nope|nahi|nhi|hmm+"
    r")[\s!.?]*$",
    re.I,
)


def is_hinglish(text: str) -> bool:
    """Whether a fixed reply should come back in Hinglish rather than English."""
    return bool(HINGLISH.search(text))


def is_greeting(text: str) -> bool:
    """Whether this deserves a word back before the assistant carries on."""
    return bool(GREETING.match(text))

# A fast lane for the obvious, so the classifier call is spent only on messages
# that are genuinely hard to place. Kept narrow on purpose: a word that could
# turn up in a property question does not belong here.
OFF_DOMAIN = re.compile(
    r"\b("
    r"cricket|football|ipl|match\s*score|movie|film|song|lyrics|"
    r"recipe|cook(?:ing)?|python|javascript|programming|algorithm|"
    r"homework|essay|poem|shayari|joke|horoscope|rashifal|"
    r"weather|mausam|doctor|medicine|symptom|disease|"
    r"bitcoin|crypto|stock\s*market|share\s*market|nifty|sensex|"
    r"prime\s*minister|president\s*of|election|capital\s*of|who\s*won|translate"
    r")\b",
    re.I,
)

# Enough Hinglish to answer in Hinglish. The canned reply is fixed text, so the
# style rule in the system prompt cannot reach it — this stands in for it.
HINGLISH = re.compile(
    r"[ऀ-ॿ]"
    r"|\b(hai|hain|ho|kya|kaise|kaha|kahan|chahiye|karna|karna\s*hai|mujhe|mera|meri|"
    r"aap|tum|nahi|nhi|haan|acha|batao|bata|kitna|kitne|kitni|"
    r"kiraya|kharidna|makan|ghar|zameen|paisa|rupaye|thik|theek)\b",
    re.I,
)


def is_answer(asked: str | None, text: str) -> bool:
    """Whether this could simply be the answer to the question just asked.

    Deliberately narrow. It exists for the words no vocabulary list can hold —
    an unlisted city, a bare number — and a message that fails it still gets
    every other pass below.
    """
    if not asked:
        return False
    words = text.strip().split()
    if not words or len(words) > 3 or "?" in text:
        return False
    if asked == "city":
        return all(w.strip(",.").isalpha() for w in words)
    if asked in ("bhk", "budget"):
        return any(ch.isdigit() for ch in text)
    # property_type and listing_type are already read off the message by the
    # regex pass, so reaching here means it said nothing of the sort.
    return False


# ── the model pass ───────────────────────────────────────────────────────────

CLASSIFY_PROMPT = """Decide whether a message belongs in a conversation with an Indian real estate assistant.

It belongs if it touches property in any way: buying, renting, prices, localities,
projects, builders, home loans, registry and stamp duty, taxes on property, or
anything someone would need while looking for a home. It also belongs if it is
about the assistant itself or what it can do.

It does not belong if it is about something else entirely: sport, films, cooking,
programming, health, general knowledge, politics, or schoolwork.

A greeting, a thank you, a goodbye or any other pleasantry always belongs — that
is a person being polite, not a change of subject.

When it could plausibly be either, say it belongs."""


class Verdict(BaseModel):
    about_property: bool


async def asks_elsewhere(text: str, extractor: Callable[[], BaseChatModel]) -> bool:
    """The last resort, for messages the cheap passes could not place.

    A failure here answers "on topic". Letting a borderline question through is
    a far smaller mistake than refusing a real one.
    """
    try:
        judge = extractor().with_structured_output(Verdict)
        verdict = await judge.ainvoke([
            SystemMessage(content=CLASSIFY_PROMPT),
            HumanMessage(content=text),
        ])
        return not verdict.about_property
    except Exception:  # noqa: BLE001
        return False


async def off_topic(
    text: str,
    found: Slots,
    asked: str | None,
    extractor: Callable[[], BaseChatModel],
) -> bool:
    """Whether this message falls outside property, and gets the fixed reply."""
    # Vocabulary first, in both directions, because those two passes are the
    # only ones that read the sentence rather than a fragment of it. A property
    # word beats an off-domain one on purpose: "flat near the cricket stadium"
    # is a property question that happens to mention cricket.
    if PROPERTY_WORDS.search(text):
        return False
    if OFF_DOMAIN.search(text):
        return True
    # Only now the fragments. A named city cannot clear a message on its own —
    # "what is the weather in Delhi" names one, and letting that through would
    # both answer it and overwrite the city the user actually asked about.
    if found.model_dump(exclude_none=True):
        return False
    if is_answer(asked, text):
        return False
    if GREETING.match(text) or FILLER.match(text):
        return False
    return await asks_elsewhere(text, extractor)


# ── what comes back instead ──────────────────────────────────────────────────

REFUSAL_EN = (
    "I don't have anything on that — I only cover property in India: buying, "
    "renting, prices, localities and the paperwork around them."
)
REFUSAL_HI = (
    "Is baare mein mere paas jaankari nahi hai — main sirf India ki property "
    "cover karta hoon: kharidna, kiraya, rate, localities aur unse judi paperwork."
)

LABEL_EN = {
    "property_type": "the property type",
    "bhk": "how many BHK",
    "city": "the city",
    "listing_type": "buy or rent",
    "budget": "your budget",
}
LABEL_HI = {
    "property_type": "property type",
    "bhk": "BHK",
    "city": "city",
    "listing_type": "buy ya rent",
    "budget": "budget",
}


def refusal(text: str, asked: str | None) -> str:
    """The whole reply. Short, and it never leaves the user at a dead end.

    It stops before naming the examples themselves: those ride along as
    `suggestions` and the client shows them as buttons. Spelling them out here
    as well would print every one of them twice.
    """
    if HINGLISH.search(text):
        if asked:
            return f"{REFUSAL_HI}\n\nBaat {LABEL_HI.get(asked, 'aapki search')} par ruki thi — neeche se chunein ya likh dein."
        return f"{REFUSAL_HI}\n\nShuru karne ke liye inme se koi try karein."
    if asked:
        return f"{REFUSAL_EN}\n\nWe were on {LABEL_EN.get(asked, 'your search')} — pick one below or just type it."
    return f"{REFUSAL_EN}\n\nTry one of these to get started."


# What to offer instead. Mid-search these are the answers to the question that
# was already on the table, so a refused turn costs the conversation nothing.
BY_FIELD: dict[str, list[str]] = {
    "property_type": ["Flat", "Villa", "Builder floor", "Plot", "PG"],
    "bhk": ["1 BHK", "2 BHK", "3 BHK", "4 BHK"],
    "city": ["Noida", "Gurugram", "Pune", "Bangalore"],
    "listing_type": ["Buy", "Rent"],
}
BUDGET_BUY = ["Under 50 lakh", "50 lakh to 1 crore", "1 to 2 crore"]
BUDGET_RENT = ["Under 15 thousand", "15 to 30 thousand", "30 to 50 thousand"]
OPENERS = [
    "2 BHK flat for rent in Noida",
    "Villa for sale in Pune",
    "PG in Bangalore under 15 thousand",
    "Property prices in Gurugram",
]


def suggestions(slots: Slots, asked: str | None) -> list[str]:
    if not asked:
        return OPENERS
    if asked == "budget":
        return BUDGET_RENT if slots.listing_type == "rent" else BUDGET_BUY
    return BY_FIELD.get(asked, OPENERS)
