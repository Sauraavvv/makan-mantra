"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Loader2,
  Mic,
  Minus,
  Moon,
  Plus,
  Search,
  Send,
  Sparkles,
  Sun,
  Trash2,
  User,
  X,
} from "lucide-react";
import { ChatMarkdown } from "@/components/site/chat-markdown";
import { useSession } from "@/context/session-context";
import { openAuthModal } from "@/lib/auth-modal";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

// ── Types ────────────────────────────────────────────────────────────────────

type Role = "bot" | "user";

type Message = {
  id: string;
  role: Role;
  text: string;
  pending?: boolean;
};

const WELCOME_TEXT =
  "Hi! I'm **Mantraa**, your property assistant. Ask me anything about buying, renting or property prices in India.";

const INITIAL_MESSAGES: Message[] = [{ id: "welcome", role: "bot", text: WELCOME_TEXT }];

function newId() {
  return Math.random().toString(36).slice(2);
}

type Theme = "light" | "dark";

const THEME_KEY = "mm-chat-theme";
const GUEST_KEY = "mm-chat-guest";

type ChatSession = {
  session_id: string;
  title: string;
  message_count: number;
  last_at: string;
};

function readTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    // Private windows and blocked site data both throw here; light is the safe
    // answer, not a crashed widget.
    return "light";
  }
}

/**
 * A signed-out visitor's transcript, kept only in their browser.
 *
 * Nothing about it reaches the server for storage — it rides along with each
 * request so the assistant has context, and it is theirs to clear.
 */
function readGuestChat(): Message[] {
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch {
    return [];
  }
}

function writeGuestChat(messages: Message[]) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(messages.slice(-40)));
  } catch {
    // A full or blocked localStorage costs the guest their scrollback, which is
    // not worth breaking the conversation over.
  }
}

function clearGuestChat() {
  try {
    window.localStorage.removeItem(GUEST_KEY);
  } catch {
    /* nothing to clear */
  }
}

// ── Main component ───────────────────────────────────────────────────────────

/** Back-office screens the property assistant has no business appearing on. */
const HIDDEN_PREFIXES = ["/admin"];

/**
 * Mounted once in the root layout. The widget itself is kept behind this gate
 * so its timers and speech hooks never start on a route that hides it.
 */
export function Chatbot() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return <ChatbotWidget />;
}

function ChatbotWidget() {
  const { user } = useSession();
  const signedIn = Boolean(user);

  const [open, setOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [avatarVisible, setAvatarVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const sessionRef = useRef<string | null>(null);
  // Accumulates the in-flight reply. A ref rather than a local `let` so the
  // state updater closes over a stable value instead of a moving one.
  const streamedRef = useRef("");
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [guestPrompt, setGuestPrompt] = useState(false);
  // Carried back to the server each turn so it need not re-derive filters it
  // already worked out. A ref, because the send path must read the current
  // value rather than whatever a stale closure captured.
  const slotsRef = useRef<Record<string, unknown> | null>(null);
  // Full by default, so a restored conversation shows the greeting complete
  // rather than replaying it. Opening a fresh chat restarts the typing.
  const [welcomeText, setWelcomeText] = useState(WELCOME_TEXT);
  // A separate switch drives the animation. Keying the effect off `welcomeText`
  // instead would tear the interval down on its own first tick, since every
  // character it writes is a dependency change.
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isSupported: micSupported, status: micStatus, toggle: toggleMic } =
    useSpeechRecognition((text) => setInput(text));
  const bubbleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Avatar enters after 3s
  useEffect(() => {
    const t = setTimeout(() => setAvatarVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Bubble cycles every 10s when chat is closed
  useEffect(() => {
    if (open || !avatarVisible) return;

    const show = () => {
      setShowBubble(true);
      setTimeout(() => setShowBubble(false), 4000);
    };

    show();
    bubbleTimerRef.current = setInterval(show, 10000);
    return () => { if (bubbleTimerRef.current) clearInterval(bubbleTimerRef.current); };
  }, [open, avatarVisible]);

  // Freeze the page behind the chat.
  //
  // `overscroll-contain` alone only stops scroll *chaining* once an inner list
  // hits its end; a wheel over the modal's own padding still reaches the body.
  // Locking it outright is the only thing that holds for both.
  useEffect(() => {
    if (!open) return;

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    // Hiding the scrollbar reclaims its width; padding it back keeps the page
    // underneath from jumping sideways as the modal opens.
    const scrollbar = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  // Type the greeting in rather than dropping it in whole. Driven off the
  // empty string that `handleOpen` sets, so the effect never writes state
  // synchronously just to start itself.
  useEffect(() => {
    if (!open || !typing) return;

    let shown = 0;
    const timer = setInterval(() => {
      shown += 2;
      setWelcomeText(WELCOME_TEXT.slice(0, shown));
      if (shown >= WELCOME_TEXT.length) {
        clearInterval(timer);
        setTyping(false);
      }
    }, 18);

    return () => clearInterval(timer);
  }, [open, typing]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // A guest's chat lives only in their tab, so it is written back as it grows.
  useEffect(() => {
    if (signedIn || messages.length <= 1) return;
    writeGuestChat(messages);
  }, [messages, signedIn]);

  // Signing in swaps the whole surface: saved chats replace the tab-local one,
  // which is dropped rather than silently carried over.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!signedIn) {
        if (!cancelled) setSessions([]);
        return;
      }
      clearGuestChat();
      try {
        const res = await fetch("/api/chat/sessions", { cache: "no-store" });
        if (res.ok && !cancelled) setSessions((await res.json()) as ChatSession[]);
      } catch {
        /* leave the sidebar as it was rather than blanking it */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  async function refreshSessions() {
    if (!signedIn) return;
    try {
      const res = await fetch("/api/chat/sessions", { cache: "no-store" });
      if (res.ok) setSessions((await res.json()) as ChatSession[]);
    } catch {
      // Leave the last known list alone rather than blanking the sidebar.
    }
  }

  async function loadSession(sessionId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/chat/history/${sessionId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: { role: string; content: string }[] };
      sessionRef.current = sessionId;
      slotsRef.current = null;
      setActiveSession(sessionId);
      setWelcomeText(WELCOME_TEXT);
      setTyping(false);
      setMessages([
        ...INITIAL_MESSAGES,
        ...data.messages.map((m) => ({
          id: newId(),
          role: m.role === "user" ? ("user" as Role) : ("bot" as Role),
          text: m.content,
        })),
      ]);
    } catch {
      setError("Could not open that chat.");
    }
  }

  function handleOpen() {
    setOpen(true);
    setShowBubble(false);
    if (bubbleTimerRef.current) clearInterval(bubbleTimerRef.current);
    setTheme(readTheme());

    if (!signedIn) {
      // The guest transcript is read on open rather than on mount: an unopened
      // widget has no reason to touch storage.
      if (messages.length > 1) return;

      const stored = readGuestChat();
      if (stored.length) {
        setMessages(stored);
        setWelcomeText(WELCOME_TEXT);
        setTyping(false);
      } else {
        setWelcomeText("");
        setTyping(true);
      }
      return;
    }

    // Signed in, opening the widget always begins a new chat. The previous one
    // is not lost — it is one click away in Recent chats — and this way the
    // assistant never reopens mid-thought on a conversation the user has
    // already moved on from.
    sessionRef.current = null;
    slotsRef.current = null;
    setActiveSession(null);
    setMessages(INITIAL_MESSAGES);
    setWelcomeText("");
    setTyping(true);
    setError(null);
    void refreshSessions();
  }

  function toggleTheme() {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // Not worth failing the toggle over — it just will not be remembered.
      }
      return next;
    });
  }

  function startNewChat() {
    // A guest has one conversation and no way to save it, so starting another
    // means losing this one — that is their call to make, not ours.
    if (!signedIn && messages.some((m) => m.role === "user")) {
      setGuestPrompt(true);
      return;
    }

    // The old conversation is kept, not deleted — it moves into Recent chats.
    // No session is minted here: the server does that on the first message, so
    // opening a chat and walking away leaves nothing behind.
    sessionRef.current = null;
    slotsRef.current = null;
    setActiveSession(null);
    setMessages(INITIAL_MESSAGES);
    setWelcomeText("");
    setTyping(true);
    setError(null);
    setInput("");
    void refreshSessions();
  }

  function clearGuestAndRestart() {
    clearGuestChat();
    slotsRef.current = null;
    setMessages(INITIAL_MESSAGES);
    setWelcomeText("");
    setTyping(true);
    setGuestPrompt(false);
    setError(null);
    setInput("");
  }

  async function deleteSession(sessionId: string) {
    await fetch(`/api/chat/history/${sessionId}`, { method: "DELETE" }).catch(() => {});
    setSessions((current) => current.filter((s) => s.session_id !== sessionId));
    if (sessionRef.current === sessionId) startNewChat();
  }

  function isActive(sessionId: string) {
    return sessionId === activeSession;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;

    setError(null);
    setInput("");
    setBusy(true);

    const replyId = newId();
    setMessages((current) => [
      ...current,
      { id: newId(), role: "user", text },
      { id: replyId, role: "bot", text: "", pending: true },
    ]);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          signedIn
            ? { message: text, session_id: sessionRef.current, slots: slotsRef.current }
            : {
                message: text,
                slots: slotsRef.current,
                history: messages
                  .filter((m) => m.id !== "welcome" && m.text)
                  .slice(-20)
                  .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
              },
        ),
      });

      if (!res.ok || !res.body) {
        const detail = (await res.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(detail?.detail || "Something went wrong.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let failure: string | null = null;
      streamedRef.current = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Frames are separated by a blank line and can split across network
        // chunks, so the tail is kept until its terminator arrives — parsing
        // per chunk would drop tokens at the seams.
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const eventLine = frame.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }

          const event = eventLine.slice(7).trim();
          if (event === "token") {
            // Snapshot the accumulator before it goes into the closure: the
            // state updater must not read a binding that keeps changing.
            const snapshot = streamedRef.current + String(payload.text ?? "");
            streamedRef.current = snapshot;
            setMessages((current) =>
              current.map((m) => (m.id === replyId ? { ...m, text: snapshot } : m)),
            );
          } else if (event === "done") {
            const id = payload.session_id as string | undefined;
            // The first turn has no session yet; the server mints one here.
            if (id && id !== sessionRef.current) {
              sessionRef.current = id;
              setActiveSession(id);
            }
            streamedRef.current = String(payload.answer ?? streamedRef.current);
            if (payload.slots) slotsRef.current = payload.slots as Record<string, unknown>;
          } else if (event === "error") {
            failure = String(payload.message ?? "Something went wrong.");
          }
        }
      }

      setMessages((current) =>
        current
          .map((m) => (m.id === replyId ? { ...m, text: streamedRef.current, pending: false } : m))
          // A failure before any token leaves an empty bubble behind.
          .filter((m) => m.id !== replyId || m.text),
      );
      if (failure) setError(failure);
      void refreshSessions();
    } catch (err) {
      setMessages((current) => current.filter((m) => m.id !== replyId));
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-3 py-4 backdrop-blur-sm overscroll-contain sm:px-6 ${theme === "dark" ? "mm-dark" : ""}`}
          >
            <motion.div
              initial={{ y: 26, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 26, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex h-[calc(100dvh-2rem)] w-full max-w-[1020px] overflow-hidden rounded-[20px] border border-white/40 bg-white shadow-2xl mmdark:border-zinc-800 mmdark:bg-black sm:h-[min(86vh,760px)] sm:min-h-[620px]"
            >
              <aside className="hidden w-[248px] shrink-0 flex-col border-r border-slate-200 bg-[#F4F7FB] mmdark:border-zinc-800 mmdark:bg-zinc-950 md:flex">
                <div className="px-7 pb-5 pt-7">
                  <div className="font-serif text-xl font-bold leading-none text-[#0A2036] mmdark:text-zinc-50">
                    Makan <span className="text-saffron">Mantraa</span>
                  </div>
                  <div className="mt-1.5 text-[11px] font-medium text-slate-500 mmdark:text-zinc-500">Property assistant</div>
                </div>

                <div className="space-y-3 px-5">
                  <button
                    onClick={startNewChat}
                    className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-900 shadow-sm transition hover:border-saffron/60 hover:text-saffron mmdark:border-zinc-800 mmdark:bg-zinc-900 mmdark:text-zinc-100"
                  >
                    <Plus className="h-4 w-4" />
                    New Search
                  </button>
                </div>

                <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate-200 px-5 pt-5 mmdark:border-zinc-800">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mmdark:text-zinc-600">
                    Recent Chats
                  </div>

                  {!signedIn ? (
                    <p className="mt-4 text-xs font-medium leading-5 text-slate-500 mmdark:text-zinc-500">
                      Chats aren&apos;t saved while you&apos;re signed out.{" "}
                      <button
                        onClick={() => openAuthModal("login")}
                        className="font-bold text-saffron underline-offset-2 hover:underline"
                      >
                        Sign in
                      </button>{" "}
                      to keep them.
                    </p>
                  ) : sessions.length === 0 ? (
                    <p className="mt-4 text-xs font-medium text-slate-400 mmdark:text-zinc-600">
                      No past chats yet.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-1 pb-4">
                      {sessions.map((session) => {
                        const active = isActive(session.session_id);
                        return (
                          <div
                            key={session.session_id}
                            className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 transition ${
                              active
                                ? "bg-white shadow-sm mmdark:bg-zinc-900"
                                : "hover:bg-white/70 mmdark:hover:bg-zinc-900/60"
                            }`}
                          >
                            <button
                              onClick={() => void loadSession(session.session_id)}
                              className="flex min-w-0 flex-1 flex-col items-start text-left"
                            >
                              <span
                                className={`w-full truncate text-[13px] font-medium ${
                                  active
                                    ? "text-[#0A2036] mmdark:text-zinc-50"
                                    : "text-slate-500 mmdark:text-zinc-400"
                                }`}
                              >
                                {session.title}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 mmdark:text-zinc-600">
                                {Math.ceil(session.message_count / 2)} message
                                {session.message_count > 2 ? "s" : ""}
                              </span>
                            </button>
                            <button
                              onClick={() => void deleteSession(session.session_id)}
                              aria-label={`Delete chat: ${session.title}`}
                              className="shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500 mmdark:text-zinc-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>


                {/* Pinned below the chat list: who you are is the last thing in
                    the column, not something competing with the chats. */}
                <div className="mt-auto flex h-[92px] shrink-0 items-center border-t border-slate-200 px-4 mmdark:border-zinc-800">
                  {signedIn ? (
                    <div className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm mmdark:border-zinc-800 mmdark:bg-zinc-900">
                      {user?.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.profileImageUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron text-sm font-bold text-white">
                          {(user?.name || "?").trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-slate-900 mmdark:text-zinc-100">
                          {user?.name || "You"}
                        </span>
                        <span className="block truncate text-[11px] font-medium text-slate-400 mmdark:text-zinc-600">
                          {user?.email || "Chats are saved"}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => openAuthModal("login")}
                      className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-2.5 text-left shadow-sm transition hover:border-saffron mmdark:border-zinc-700 mmdark:bg-zinc-900"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 mmdark:bg-zinc-800">
                        <User className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold text-slate-700 mmdark:text-zinc-200">
                          Sign in
                        </span>
                        <span className="block text-[11px] font-medium text-slate-400 mmdark:text-zinc-600">
                          to save your chats
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              </aside>

              <main className="flex min-w-0 flex-1 flex-col bg-white mmdark:bg-black">
                <div className="flex h-20 shrink-0 items-center gap-4 border-b border-slate-100 px-4 mmdark:border-zinc-800 sm:px-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A2036] text-white mmdark:bg-zinc-900">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]" />
                      <h2 className="truncate text-sm font-bold text-slate-950 mmdark:text-zinc-50 sm:text-base">Mantraa</h2>
                    </div>
                    <p className="truncate text-[11px] font-medium text-slate-500 mmdark:text-zinc-500 sm:text-xs">
                      Search smarter, compare faster, shortlist better
                    </p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:text-slate-900 mmdark:border-zinc-800 mmdark:bg-zinc-900 mmdark:hover:text-zinc-100"
                    aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                    title={theme === "dark" ? "Light mode" : "Dark mode"}
                  >
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:text-slate-900 mmdark:border-zinc-800 mmdark:bg-zinc-900 mmdark:hover:text-zinc-100 sm:flex"
                    aria-label="Minimize chat"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:text-slate-900 mmdark:border-zinc-800 mmdark:bg-zinc-900 mmdark:hover:text-zinc-100"
                    aria-label="Close chat"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_34%,#f8fafc_100%)] px-4 py-5 mmdark:bg-none mmdark:bg-black sm:px-7">
                  <section className="mx-auto max-w-3xl text-center">
                    <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-saffron/25 bg-saffron/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-saffron">
                      <Sparkles className="h-3 w-3" />
                      Home discovery
                    </div>
                    <h3 className="mt-4 text-xl font-black leading-tight text-slate-950 mmdark:text-zinc-50 sm:text-2xl">
                      Find a home that fits your plan
                    </h3>
                    <p className="mx-auto mt-2 max-w-2xl text-xs font-medium leading-5 text-slate-500 mmdark:text-zinc-500 sm:text-[13px]">
                      Tell Mantraa your city, budget and property type.
                    </p>
                  </section>

                  <div className="mx-auto mt-7 max-w-3xl space-y-4 pb-3">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm sm:max-w-[76%] ${
                          msg.role === "user"
                            ? "whitespace-pre-wrap rounded-br-md bg-[#0A2036] text-white mmdark:bg-zinc-800 mmdark:text-zinc-50"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800 mmdark:border-zinc-800 mmdark:bg-zinc-950 mmdark:text-zinc-200"
                        }`}>
                          {(() => {
                            const body = msg.id === "welcome" ? welcomeText : msg.text;
                            if (!body) return null;
                            return msg.role === "bot" ? <ChatMarkdown>{body}</ChatMarkdown> : body;
                          })()}
                          {msg.pending && !msg.text && (
                            <span className="flex items-center gap-2 text-slate-400">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Thinking…
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {error && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 mmdark:border-red-900 mmdark:bg-red-950/40 mmdark:text-red-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {error}
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                </div>

                <div className="flex h-[92px] shrink-0 items-center border-t border-slate-100 bg-white px-4 mmdark:border-zinc-800 mmdark:bg-black sm:px-7">
                  <div className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-2xl border-2 border-saffron/70 bg-white p-2 shadow-[0_14px_42px_rgba(255,111,35,0.12)] mmdark:bg-zinc-950 mmdark:shadow-none">
                    <Search className="ml-2 h-5 w-5 shrink-0 text-slate-400" />
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void handleSend()}
                      disabled={busy}
                      placeholder={micStatus === "listening" ? "Listening…" : "Ask for 2 BHK for rent in Faridabad"}
                      className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[13px] font-medium text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed mmdark:text-zinc-100 mmdark:placeholder:text-zinc-600"
                    />
                    {micSupported && (
                      <button
                        type="button"
                        onClick={toggleMic}
                        aria-label={micStatus === "listening" ? "Stop listening" : "Voice input"}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          micStatus === "listening"
                            ? "animate-pulse bg-red-500 text-white"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <Mic className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => void handleSend()}
                      disabled={busy || !input.trim()}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saffron text-white transition hover:bg-saffron/90 disabled:opacity-40"
                      aria-label="Send message"
                    >
                      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </main>
            </motion.div>

            {/* Guests get one conversation: starting another means losing this one. */}
            <AnimatePresence>
              {guestPrompt && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50 px-4"
                >
                  <motion.div
                    initial={{ y: 12, scale: 0.97 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 12, scale: 0.97 }}
                    className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl mmdark:bg-zinc-900"
                  >
                    <h4 className="text-lg font-bold text-slate-950 mmdark:text-zinc-50">
                      Start a new chat?
                    </h4>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500 mmdark:text-zinc-400">
                      Signed-out chats aren&apos;t saved, so starting a new one clears this
                      conversation. Sign in to keep your chat history.
                    </p>
                    <div className="mt-5 flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setGuestPrompt(false);
                          openAuthModal("login");
                        }}
                        className="h-11 rounded-xl bg-saffron text-sm font-bold text-white transition hover:bg-saffron/90"
                      >
                        Sign in and keep chats
                      </button>
                      <button
                        onClick={clearGuestAndRestart}
                        className="h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition hover:border-slate-300 mmdark:border-zinc-700 mmdark:text-zinc-200"
                      >
                        Clear and start over
                      </button>
                      <button
                        onClick={() => setGuestPrompt(false)}
                        className="h-9 text-sm font-semibold text-slate-400 transition hover:text-slate-600 mmdark:hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar + bubble */}
      <AnimatePresence>
        {avatarVisible && !open && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2"
          >
            {/* Speech bubble */}
            <AnimatePresence>
              {showBubble && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="relative mr-1 rounded-2xl rounded-br-none border border-border bg-white px-4 py-2.5 shadow-lg"
                >
                  <p className="whitespace-nowrap text-sm font-medium text-gray-800">
                    Still didn&apos;t find? <span className="text-primary">Ask me</span> 💬
                  </p>
                  <span className="absolute -bottom-2 right-4 h-0 w-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Avatar button */}
            <motion.button
              onClick={handleOpen}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A2036] shadow-xl ring-2 ring-saffron/50"
              aria-label="Open property assistant"
            >
              <span className="text-2xl">🏠</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
