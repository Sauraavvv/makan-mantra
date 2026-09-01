"""Which desk the visitor is standing at.

The assistant used to do one thing, so it never had to ask what it was being
asked for: every message was an answer towards a property search. With more
than one desk that assumption is gone, and something has to decide — before
any model is called — whether this turn is a recommendation, the news, or a
listing someone wants to post.

The menu on the welcome message means most turns arrive already decided: the
chip sends its own label and the regex below matches it exactly. The regexes
are wider than the labels so that typing the same thing in your own words
lands in the same place.
"""

from __future__ import annotations

import re

RECOMMEND = "recommend"
NEWS = "news"
POST = "post"

# What the welcome message offers. The frontend renders these; the patterns
# below have to keep matching them.
MENU = ["Recommend property", "Latest news", "Post property"]

# Order is the tie-breaker, not regex quality: "post property" and "recommend
# property" both contain "property", so whichever is checked first wins.
DESKS: list[tuple[str, re.Pattern[str]]] = [
    (NEWS, re.compile(r"\b(news|headlines?|latest in real\s*estate|what'?s happening)\b", re.I)),
    (POST, re.compile(r"\b(post|list|sell|upload|add)\b.{0,12}\bpropert", re.I)),
    (RECOMMEND, re.compile(r"\b(recommend|suggest|shortlist)\b|\bfind me\b", re.I)),
]


# Which desks outlive the turn that named them.
#
# RECOMMEND does: it is collecting five answers over several turns, so the next
# line the visitor types is an answer to the question it just asked, and
# forgetting the desk would restart the search every message.
#
# POST does too, for the same reason: it is filling in the Post Property form a
# field at a time, and every answer after the first is meaningless without it.
#
# NEWS does not. It answers in one turn and asks for nothing back, so there is
# no half-finished state to carry -- and carrying it anyway sends the next real
# question to the wrong desk: a property search answered with the same headlines
# again, no slots read from it and nothing found.
STATEFUL = {RECOMMEND, POST}


def carries_forward(desk: str | None) -> bool:
    """Whether a desk named on an earlier turn still applies to this one."""
    return desk in STATEFUL


def pick_desk(text: str) -> str | None:
    """The desk this message names, or None if it names none."""
    for desk, pattern in DESKS:
        if pattern.search(text):
            return desk
    return None
