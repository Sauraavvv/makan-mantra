"""Getting a finished search into an inbox.

The search ends with three listings on screen and nothing asked of the visitor,
which is the moment to ask for one thing. This is that ask, and it is a step
machine rather than a conversation: three states, fixed text at each, and a
regex that reads the answer. No model is called anywhere in it.

Two paths, because a signed-in visitor already told us an address once and
should not have to type it again — but must still be able to send it somewhere
else, since the account address and the address you want the listings at are
not always the same one.
"""

from __future__ import annotations

import re

# Asked whether they want it emailed at all.
OFFERED = "offered"
# Waiting on which address — either confirming the account one or typing another.
ASKING = "asking"
DONE = "done"
DECLINED = "declined"

YES = re.compile(r"^\s*(yes|yeah|yep|yup|sure|ok(ay)?|haan|haa|ha|please|email|send)\b", re.I)
NO = re.compile(r"^\s*(no|nope|nah|nahi|not now|skip|later)\b", re.I)
ANOTHER = re.compile(r"\b(another|different|other|new)\b", re.I)

# Deliberately plain. This decides whether to try sending, not whether the
# address exists — only delivery can tell you that, and a stricter pattern
# turns real addresses away for the sake of catching typos it cannot catch.
EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

OFFER_LINE = "Want these details on email?"
OFFER_CHIPS = ["Yes, email me", "No thanks"]

TYPE_LINE = "Sure — what email should I send them to?"
BAD_EMAIL = "That does not look like an email address. Something like name@example.com."
DECLINE_LINE = "No problem — the listings stay right here."

# Said at the moment of sending, because the inbox has none of the context the
# screen does: there is no "sample results" strip above an email.
SENT_LINE = (
    "Done — sent to {email}. One thing: these are sample listings while we bring "
    "the live inventory online, so treat the figures as illustrative."
)


def confirm_line(email: str) -> tuple[str, list[str]]:
    return (
        f"Sure — shall I send them to {email}?",
        [f"Send to {email}", "Use another email"],
    )


class Step:
    """What the lead flow did with a turn.

    `stage` is what to carry into the next turn, `reply`/`chips` are what to put
    on screen, and `email` is set only on the turn one is captured. A `reply` of
    None means the flow did not recognise the message and the turn belongs to
    whatever would have handled it otherwise.
    """

    __slots__ = ("stage", "reply", "chips", "email")

    def __init__(self, stage: str | None, reply: str | None = None,
                 chips: list[str] | None = None, email: str | None = None):
        self.stage = stage
        self.reply = reply
        self.chips = chips or []
        self.email = email


def advance(
    stage: str | None,
    message: str,
    account_email: str | None,
    elsewhere: bool = False,
) -> Step:
    """Move the email step on by one message.

    `elsewhere` says the message was recognised as being about something else —
    a property answer, or another desk. Without it, being asked for an address
    and fumbling it once ("myemail", no @) would read as changing the subject,
    drop the ask, and leave the address that followed unrecognised.
    """
    if stage == OFFERED:
        if NO.match(message):
            return Step(DECLINED, DECLINE_LINE)
        if YES.match(message):
            if account_email:
                line, chips = confirm_line(account_email)
                return Step(ASKING, line, chips)
            return Step(ASKING, TYPE_LINE)
        # Neither — they are talking about something else, so let them.
        return Step(None)

    if stage == ASKING:
        found = EMAIL.search(message)
        if found:
            return Step(DONE, None, email=found.group(0).lower())
        if ANOTHER.search(message):
            return Step(ASKING, TYPE_LINE)
        if elsewhere:
            return Step(None)  # they moved on; the ask goes with them
        return Step(ASKING, BAD_EMAIL)

    return Step(stage)
