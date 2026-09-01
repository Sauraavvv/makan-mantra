import json
import os
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from itertools import cycle
from threading import Lock

from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING

from mongodb import (
    get_chat_leads_collection,
    get_chat_messages_collection,
    get_chat_sessions_collection,
)
from routers.slots import (
    EXTRACT_PROMPT,
    Slots,
    ask,
    filters,
    merge,
    missing_field,
    needs_model,
    regex_slots,
    summary,
)
from routers.desks import NEWS, POST, carries_forward, pick_desk
from routers.lead import (
    ASKING,
    DONE,
    OFFER_CHIPS,
    OFFER_LINE,
    OFFERED,
    SENT_LINE,
    advance,
)
from routers.listing import Listing
from routers.listing import apply as fill_listing
from routers.listing import ask as ask_listing
from routers.listing import missing_field as listing_missing
from routers.listing import payload as listing_payload
from routers.listing import summary as listing_summary
from routers.lookup import find_news
from routers.matches import find_matches
from routers.topic import is_greeting, is_hinglish, off_topic, refusal, suggestions

load_dotenv()

router = APIRouter(prefix="/chat", tags=["chat"])

MODEL = os.getenv("CHAT_MODEL", "openai/gpt-oss-120b")
EXTRACT_MODEL = os.getenv("CHAT_EXTRACT_MODEL", "openai/gpt-oss-20b")
KEYS = [k.strip() for k in os.getenv("GROQ_API_KEYS", "").split(",") if k.strip()]
INTERNAL_TOKEN = os.getenv("CHAT_INTERNAL_TOKEN", "")

# How much of the past goes back to the model. Every turn re-sends the window,
# so this is the main lever on both latency and token cost.
HISTORY_WINDOW = int(os.getenv("CHAT_HISTORY_WINDOW", "8"))
# What a request may carry, as opposed to what is sent to the model. The two
# must not be the same number: a client holding a longer transcript than the
# window should have it trimmed, not have its turn rejected.
MAX_CARRIED_HISTORY = 60

SYSTEM_PROMPT = """You are Mantraa, the property assistant for Makan Mantraa, an Indian real estate site.

Style:
- Short. One or two sentences, never a list of questions.
- Indian conventions: lakh, crore, BHK, sq ft.
- If the user writes in Hinglish, reply in Hinglish.
- You can see the earlier turns; never make the user repeat themselves.
- Answer general property questions directly when asked.
"""

GREETED = ("Hi! Happy to help.", "Namaste! Madad ke liye hazir hoon.")
# Said when the form is complete, in both languages: the wording is fixed, so
# none of it is worth a model call.
#
# It promises filing, not a filed listing -- the submission itself happens on
# the Next side a moment later (see listing.payload), and the property id comes
# back from there, so this line cannot name it.
POSTED = (
    "Got it — {summary}.\n\nFiling it now.",
    "Ho gaya — {summary}.\n\nAbhi file kar raha hoon.",
)
# Said instead when the photos question was skipped, so the promise of a call
# for them is only made when there is something still to collect.
POSTED_NO_MEDIA = (
    "Got it — {summary}.\n\nFiling it now. No photos on it yet, so the team will "
    "ask for those when they call.",
    "Ho gaya — {summary}.\n\nAbhi file kar raha hoon. Photos abhi nahi hain, to "
    "team call karke wo maang legi.",
)

def say(pair: tuple[str, str], text: str, **fields) -> str:
    """Picks the language from what the visitor wrote, then fills the blanks."""
    return (pair[1] if is_hinglish(text) else pair[0]).format(**fields)


# Round-robin across the configured keys so one key's rate limit does not stop
# the whole assistant. `cycle` is not thread-safe on its own, hence the lock.
_keys = cycle(KEYS) if KEYS else None
_lock = Lock()


def next_key() -> str:
    if not _keys:
        raise HTTPException(status_code=503, detail="No Groq API key configured")
    with _lock:
        return next(_keys)


def build_llm() -> ChatGroq:
    return ChatGroq(model=MODEL, temperature=0.3, api_key=next_key())


def build_extractor() -> ChatGroq:
    """The cheap model, shared by everything that reads rather than writes."""
    return ChatGroq(model=EXTRACT_MODEL, temperature=0, api_key=next_key())


async def read_slots(known: Slots, message: str) -> Slots:
    """Fill the gaps in what is already known, from this message alone.

    The transcript is deliberately not sent: the slots *are* the accumulated
    state, so re-reading the whole conversation every turn buys nothing and
    costs the most tokens of anything here.

    A failure degrades to "learned nothing new" rather than breaking the turn.
    """
    try:
        found = await build_extractor().with_structured_output(Slots).ainvoke([
            SystemMessage(content=EXTRACT_PROMPT),
            HumanMessage(content=(
                f"Already known: {known.model_dump_json(exclude_none=True)}\n"
                f"New message: {message}"
            )),
        ])
        return merge(known, found)
    except Exception:  # noqa: BLE001
        return known


def one_question(text: str) -> str:
    """Cut everything after the first question mark.

    The instruction says one question; this makes it true. Without it the model
    still occasionally chains a second onto the same reply, and the user gets
    the wall of questions this whole mechanism exists to prevent.
    """
    mark = text.find("?")
    return text if mark == -1 else text[: mark + 1]


def identify(user_id: str | None, token: str | None) -> str | None:
    """A user id is only believed when it arrives with the internal token.

    The Next.js route handler resolves the `mm_session` cookie and forwards the
    id; this service never sees the cookie and never needs JWT_SECRET. That
    only holds while the token stays server-side on both ends.
    """
    if not user_id:
        return None
    if not INTERNAL_TOKEN or token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="invalid internal token")
    return user_id


async def ensure_indexes() -> None:
    messages = get_chat_messages_collection()
    await messages.create_index([("session_id", ASCENDING), ("at", ASCENDING)], name="session_timeline")
    await messages.create_index([("user_id", ASCENDING), ("at", DESCENDING)], name="user_recent")
    await get_chat_sessions_collection().create_index(
        [("session_id", ASCENDING), ("user_id", ASCENDING)], unique=True, name="session_pk"
    )


# ── history ──────────────────────────────────────────────────────────────────


async def load_history(session_id: str, user_id: str) -> list[BaseMessage]:
    """The last HISTORY_WINDOW turns of a signed-in session, oldest first.

    Sorted newest-first in the query so the window is the *recent* end of a long
    conversation, then reversed back into reading order for the model.
    """
    cursor = (
        get_chat_messages_collection()
        .find({"session_id": session_id, "user_id": user_id}, {"_id": 0, "role": 1, "content": 1})
        .sort("at", -1)
        .limit(HISTORY_WINDOW)
    )
    rows = [row async for row in cursor]
    rows.reverse()
    return to_messages(rows)


def to_messages(rows: list[dict]) -> list[BaseMessage]:
    return [
        HumanMessage(content=r["content"]) if r.get("role") == "user" else AIMessage(content=r["content"])
        for r in rows
        if r.get("content")
    ]


async def save_turn(session_id: str, user_id: str, question: str, answer: str) -> None:
    now = datetime.now(timezone.utc)
    await get_chat_messages_collection().insert_many([
        {"session_id": session_id, "user_id": user_id, "role": "user", "content": question, "at": now},
        # Nudged forward so the reply can never sort ahead of its own question
        # when both land in the same millisecond.
        {"session_id": session_id, "user_id": user_id, "role": "assistant", "content": answer,
         "at": now.replace(microsecond=min(now.microsecond + 1000, 999999))},
    ])


# ── models ───────────────────────────────────────────────────────────────────


async def load_slots(session_id: str, user_id: str) -> Slots:
    doc = await get_chat_sessions_collection().find_one(
        {"session_id": session_id, "user_id": user_id}, {"_id": 0, "slots": 1}
    )
    return Slots(**((doc or {}).get("slots") or {}))


async def save_slots(session_id: str, user_id: str, slots: Slots) -> None:
    await get_chat_sessions_collection().update_one(
        {"session_id": session_id, "user_id": user_id},
        {"$set": {"slots": slots.model_dump(exclude_none=True),
                  "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )


PANEL_INTRO = (
    "\n\nA panel is already on screen showing {title} — {subtitle}. "
    "Write ONE short line telling the visitor what they are looking at. "
    "Do not restate anything from it. Ask nothing."
)


async def save_lead(session_id: str | None, user_id: str | None, email: str, slots: Slots) -> None:
    await get_chat_leads_collection().insert_one({
        "email": email,
        "user_id": user_id,
        "session_id": session_id,
        "slots": slots.model_dump(exclude_none=True),
        "at": datetime.now(timezone.utc),
    })


class Turn(BaseModel):
    role: str
    content: str = Field(max_length=8000)


class AskRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    # Signed-in only: names the stored conversation to continue.
    session_id: str | None = None
    # Guests only: their transcript lives in their browser and rides along with
    # each request. Capped because it is client-supplied and untrusted.
    history: list[Turn] = Field(default_factory=list, max_length=MAX_CARRIED_HISTORY)
    # Carried back by the client so the server need not re-derive what it
    # already worked out last turn.
    slots: dict | None = None
    # Which desk the visitor is at. Carried the same way and for the same
    # reason: naming it once should hold for the turns that follow.
    desk: str | None = None
    # How far the "send it to my inbox" step has got, if it has started.
    lead: str | None = None
    # The Post Property form so far, carried back each turn the same way the
    # search slots are -- this service keeps nothing between turns for a guest.
    listing: dict | None = None
    # How many files the browser has uploaded and is holding for this turn.
    # The files themselves go straight to Cloudinary and never come here.
    attachments: int = 0


class SessionSummary(BaseModel):
    session_id: str
    title: str
    message_count: int
    last_at: datetime


class HistoryResponse(BaseModel):
    session_id: str
    messages: list[dict]


# ── routes ───────────────────────────────────────────────────────────────────


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "model": MODEL, "keys_loaded": len(KEYS), "history_window": HISTORY_WINDOW}


@router.get("/sessions", response_model=list[SessionSummary])
async def sessions(
    limit: int = 30,
    x_mm_user_id: str | None = Header(default=None),
    x_mm_internal_token: str | None = Header(default=None),
) -> list[SessionSummary]:
    """Past conversations for a signed-in user, newest first.

    Derived from the messages rather than kept in a second collection, so a
    session cannot exist in the list without a transcript behind it — and
    deleting the transcript removes it from the list for free.
    """
    user_id = identify(x_mm_user_id, x_mm_internal_token)
    if not user_id:
        return []

    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$sort": {"at": 1}},
        {"$group": {
            "_id": "$session_id",
            # save_turn writes the question before the answer, so the earliest
            # document in a session is always the user's opening message.
            "title": {"$first": "$content"},
            "last_at": {"$last": "$at"},
            "message_count": {"$sum": 1},
        }},
        {"$sort": {"last_at": -1}},
        {"$limit": max(1, min(limit, 50))},
    ]
    return [
        SessionSummary(
            session_id=row["_id"],
            title=(row.get("title") or "New chat")[:60],
            message_count=row["message_count"],
            last_at=row["last_at"],
        )
        async for row in get_chat_messages_collection().aggregate(pipeline)
    ]


@router.get("/history/{session_id}", response_model=HistoryResponse)
async def history(
    session_id: str,
    x_mm_user_id: str | None = Header(default=None),
    x_mm_internal_token: str | None = Header(default=None),
) -> HistoryResponse:
    """Replays a session so a reload does not look like a new conversation."""
    user_id = identify(x_mm_user_id, x_mm_internal_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="sign in to load saved chats")

    # Ownership is part of the filter, so another user's session simply matches
    # nothing rather than needing a second check.
    cursor = (
        get_chat_messages_collection()
        .find({"session_id": session_id, "user_id": user_id}, {"_id": 0, "role": 1, "content": 1})
        .sort("at", 1)
    )
    return HistoryResponse(
        session_id=session_id,
        messages=[{"role": r["role"], "content": r["content"]} async for r in cursor],
    )


@router.delete("/history/{session_id}")
async def clear_history(
    session_id: str,
    x_mm_user_id: str | None = Header(default=None),
    x_mm_internal_token: str | None = Header(default=None),
) -> dict:
    user_id = identify(x_mm_user_id, x_mm_internal_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="sign in to manage saved chats")
    result = await get_chat_messages_collection().delete_many(
        {"session_id": session_id, "user_id": user_id}
    )
    return {"deleted": result.deleted_count}


class MatchRequest(BaseModel):
    slots: dict = Field(default_factory=dict)


@router.post("/matches")
async def matches_for(
    body: MatchRequest,
    x_mm_internal_token: str | None = Header(default=None),
) -> dict:
    """The listings for a search, regenerated server-side.

    The email is composed on the Next side, which cannot run the generator — so
    it asks for the listings here rather than being handed them by the browser.
    Content the client supplies is content the client can put in any inbox it
    names, and this endpoint exists precisely so it cannot.

    The generator is seeded off the slots, so this returns exactly what was on
    screen without anything having to be stored between the two requests.
    """
    if not INTERNAL_TOKEN or x_mm_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="invalid internal token")
    slots = Slots(**(body.slots or {}))
    return {"summary": summary(slots, join=", "), "matches": find_matches(slots)}


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


@router.post("/stream")
async def stream(
    body: AskRequest,
    x_mm_user_id: str | None = Header(default=None),
    x_mm_user_email: str | None = Header(default=None),
    x_mm_internal_token: str | None = Header(default=None),
) -> StreamingResponse:
    """Same conversation for everyone; only where it is remembered differs.

    Signed in, the transcript is stored against the account and continues on any
    device. Signed out, nothing is written here at all — the browser keeps the
    transcript and replays it with each turn.
    """
    user_id = identify(x_mm_user_id, x_mm_internal_token)
    account_email = (x_mm_user_email or "").strip().lower() if user_id else ""

    if user_id:
        session_id = body.session_id or str(uuid.uuid4())
        past = await load_history(session_id, user_id)
    else:
        session_id = None
        past = to_messages([t.model_dump() for t in body.history[-HISTORY_WINDOW:]])

    # What is still unknown decides what gets asked, so the model never picks
    # the question — or how many of them — for itself.
    #
    # Resolution is cheapest-first: carried state, then regex, and only then a
    # model call, which most turns never reach.
    known = Slots(**(body.slots or {}))
    if not body.slots and user_id and body.session_id:
        known = await load_slots(body.session_id, user_id)

    found = regex_slots(body.message)
    asked = missing_field(known)
    asked_field = asked[0] if asked else None
    # With nothing filled in yet, nothing has been asked yet either. A refusal
    # then offers openers rather than pretending to resume a search that never
    # started — `missing_field` names a first question the user has not seen.
    resuming = asked_field if known.model_dump(exclude_none=True) else None

    # An explicit desk this turn wins over the one carried from the last, so a
    # visitor can move between them without starting a new chat. Only a desk
    # that is mid-something is carried at all -- see desks.carries_forward --
    # so the turn after the news is read as whatever it actually says.
    named = pick_desk(body.message)
    desk = named or (body.desk if carries_forward(body.desk) else None)

    # The email step gets the turn before anything else looks at it. An address
    # is not a property question, so the topic guard would refuse it — rightly,
    # if it had any business seeing it. It does not.
    step = advance(
        body.lead,
        body.message,
        account_email or None,
        # Recognisably about something else: a property answer, or a desk.
        elsewhere=bool(named) or bool(found.model_dump(exclude_none=True)),
    )
    lead = step.stage
    mail: dict | None = None

    # Off subject, the turn stops here. The chat model is never called, nothing
    # is extracted, and the slots are left exactly as they were — so the search
    # resumes mid-question the moment the user comes back to it.
    #
    # A name, a mobile number or a line of address is not a property question,
    # and the guard would refuse it -- rightly, if it had any business seeing
    # it. Mid-form it does not, so the Post Property desk is exempt too.
    blocked = (
        False
        if (step.email or step.reply or desk == POST)
        else await off_topic(body.message, found, asked_field, build_extractor)
    )

    prompt: list[BaseMessage] = []
    matches: list[dict] = []
    panel: dict | None = None
    # Set only on the turn the form completes -- the client posts it to
    # /api/post-property, which is the same endpoint the wizard uses.
    submit: dict | None = None
    # True while the form is on its photos question, so the composer knows to
    # offer the file picker. Which question is being asked is decided here, so
    # working it out again on the client would be a second copy of that rule.
    attach = False
    posting = Listing(**(body.listing or {}))
    fixed: str | None = None
    tips: list[str] = []
    # A line that belongs with the buttons rather than with the reply. The
    # email offer is about the listings, so it has to sit under them — and the
    # reply is rendered above them.
    tips_line: str = ""
    refine: list[dict] = []
    slots, pending = known, asked

    if step.email:
        # Stored here, sent by the proxy: this service has no mailer, and the
        # one the site already uses lives on the other side.
        await save_lead(session_id, user_id, step.email, known)
        mail = {"to": step.email}
        fixed = SENT_LINE.format(email=step.email)
    elif step.reply:
        fixed = step.reply
        tips = step.chips
    elif blocked:
        pass
    elif desk == POST:
        # Signed in, the name and email are already known and the account
        # exists, so those three questions are skipped -- /api/post-property
        # reads them off the session exactly as it does for the wizard.
        known_owner = bool(user_id)
        # The turn that names the desk opens the form; it is not an answer to a
        # question nobody has been asked yet.
        retry = None
        if named != POST:
            answering = listing_missing(posting, known_owner)
            if answering:
                retry = fill_listing(posting, answering, body.message, body.attachments)

        nxt = listing_missing(posting, known_owner)
        attach = nxt == "photos"
        if nxt:
            # A retry leaves the same question standing, so the chips under it
            # are still that question's chips.
            line, tips = ask_listing(nxt)
            fixed = retry or line
        else:
            submit = listing_payload(posting)
            done_text = POSTED if posting.photos else POSTED_NO_MEDIA
            fixed = say(done_text, body.message, summary=listing_summary(posting))
    elif desk == NEWS:
        panel = await find_news()
        prompt = [
            SystemMessage(content=SYSTEM_PROMPT + PANEL_INTRO.format(
                title=panel["title"], subtitle=panel["subtitle"])),
            HumanMessage(content=body.message),
        ]
    else:
        after_regex = merge(known, found)
        slots = (
            await read_slots(after_regex, body.message)
            if needs_model(body.message, known, after_regex)
            and not named
            and not is_greeting(body.message)
            else after_regex
        )
        pending = missing_field(slots)

        # The search runs on fixed text from here down. Which of the five is
        # asked is already decided by the slots, the wording never varies, and
        # the answers are a closed set the regex pass reads straight back — so
        # there is nothing left for a model to decide, and no call to make.
        if pending:
            line, tips = ask(pending[0], slots)
            # Someone who says hello is still owed a hello; it just does not
            # cost a model call to give them one.
            fixed = f"{say(GREETED, body.message)} {line}" if is_greeting(body.message) else line
        else:
            # The five answers are the whole point of the conversation, so this
            # is where they finally buy something.
            matches = find_matches(slots)
            # The same five answers, offered back as rows to change. Every chip
            # sends its own label, which the regex pass reads exactly as if it
            # had been typed — so refining costs no new machinery at all.
            refine = filters(slots)
            # Three listings on screen and nothing asked of the visitor is the
            # one moment worth asking for something.
            lead = OFFERED
            tips = OFFER_CHIPS
            tips_line = OFFER_LINE
            fixed = f"Got it — {summary(slots, join=', ')}.\n\nHere are a few matches:"

    # Written here rather than by the model: a refusal, a desk waiting on a
    # place, a desk with nothing to show, or one that is not open. All of it is
    # fixed text, so none of it waits on a model.
    written = refusal(body.message, resuming) if blocked else fixed
    if blocked:
        tips = suggestions(slots, resuming)

    # The first question mark ends the reply only while a slot is being filled.
    # A panel intro is not that, and neither is anything written above.
    clip = pending is not None and panel is None and not written

    async def events() -> AsyncIterator[str]:
        if written:
            yield _sse("token", {"text": written})
            if user_id and session_id:
                await save_turn(session_id, user_id, body.message, written)
            yield _sse("done", {
                "session_id": session_id,
                "answer": written,
                "slots": slots.model_dump(),
                "awaiting": asked_field,
                "desk": desk,
                "listing": posting.model_dump(),
                "submit": submit,
                "attach": attach,
                # Where the visitor can go next: the options for the question
                # just asked, or — after a refusal — somewhere else entirely.
                "suggestions": tips,
                "suggestions_line": tips_line,
                "matches": matches,
                "panel": panel,
                "filters": refine,
                "lead": lead,
                "mail": mail,
            })
            return

        answer = ""
        started = False
        last_error: Exception | None = None

        # Key rotation only helps before the first token: once bytes are on the
        # wire the response has already started, so a mid-stream failure is
        # reported rather than silently retried on another key.
        for _ in range(len(KEYS) or 1):
            try:
                async for chunk in build_llm().astream(prompt):
                    text = str(chunk.content)
                    if not text:
                        continue
                    started = True

                    # While a field is still missing the turn ends at the first
                    # question mark, mid-stream. Truncating only at the end
                    # would let the extra questions flash on screen first.
                    if clip:
                        clipped = one_question(answer + text)
                        if len(clipped) < len(answer + text):
                            tail = clipped[len(answer):]
                            if tail:
                                answer = clipped
                                yield _sse("token", {"text": tail})
                            break

                    answer += text
                    yield _sse("token", {"text": text})
                break
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if started:
                    yield _sse("error", {"message": "The reply was cut short. Please try again."})
                    return
                continue

        if clip:
            answer = one_question(answer)

        if not answer:
            yield _sse("error", {"message": f"The assistant could not reply. {last_error or ''}".strip()})
            return

        # Written only after a successful reply, and only for signed-in users:
        # a failed turn should not leave a question with no answer beside it,
        # and a guest's words should not reach the database at all.
        if user_id and session_id:
            await save_turn(session_id, user_id, body.message, answer)
            await save_slots(session_id, user_id, slots)

        yield _sse("done", {
            "session_id": session_id,
            "answer": answer,
            "slots": slots.model_dump(),
            "awaiting": pending[0] if pending else None,
            "desk": desk,
            "listing": posting.model_dump(),
            "submit": submit,
            "attach": attach,
            "suggestions": [],
            "suggestions_line": "",
            "matches": matches,
            "panel": panel,
            "filters": refine,
            "lead": lead,
            "mail": mail,
        })

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )
