"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Building2,
  BedDouble,
  ChevronDown,
  Heart,
  Pencil,
  LandPlot,
  Layers,
  MapPin,
  Phone,
  Ruler,
  Minus,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Loader2,
  Mic,
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
import Link from "next/link";
import { PROPERTY_IMAGES } from "@/lib/properties";

// ── Types ────────────────────────────────────────────────────────────────────

type Role = "bot" | "user";

/**
 * A listing the assistant found once it had all five answers.
 *
 * Fabricated on the server for now — there is no inventory behind the search
 * yet — which is why the block is labelled as sample data on screen.
 */
type Match = {
  id: string;
  title: string;
  price: string;
  locality: string;
  city: string;
  status: string;
  specs: { label: string; value: string }[];
};

/** One editable answer, with the options the question originally offered. */
type FilterRow = {
  field: string;
  label: string;
  options: { label: string; selected: boolean }[];
};

/** Read positionally: the server sends Config, Size, Units, Total area. */
const SPEC_ICONS = [BedDouble, Ruler, Layers, LandPlot];

/** A story from the news desk. Real links, unlike the sample listings. */
type NewsItem = {
  title: string;
  meta: string;
  summary: string;
  href: string | null;
  image: string | null;
  at: string;
};

/** What a desk puts on screen beside its one-line reply. */
type Panel = {
  kind: "news";
  title: string;
  subtitle: string;
  href: string | null;
  links: NewsItem[];
};

type Message = {
  id: string;
  role: Role;
  text: string;
  pending?: boolean;
  matches?: Match[];
  filters?: FilterRow[];
  panel?: Panel;
  /**
   * What the assistant offers when it turns a question down. Only the newest
   * message shows them, so an old refusal does not leave live buttons behind
   * halfway up the transcript.
   */
  suggestions?: string[];
  /** A line to put above those buttons, when they need one. */
  tipsLine?: string;
};

const WELCOME_TEXT =
  "Hi! I\u2019m **Mantraa**, your home-finding assistant.\n\n" +
  "Tell me what you\u2019re looking for \u2014 **Buy or Rent, preferred location, and budget** " +
  "\u2014 and I\u2019ll help you find the right property.";

/**
 * The opening menu.
 *
 * An empty box and an invitation to "ask anything" is the hardest possible
 * first move: it asks the visitor to guess what the assistant can do. These
 * name it instead, and each label is exactly what gets sent — the server
 * matches on it to pick the desk.
 */
const MENU: { label: string; disabled?: boolean }[] = [
  { label: "Recommend property" },
];

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

/**
 * One entry in the sidebar's action list.
 *
 * No `onClick` renders it inert rather than hiding it: a desk that is not open
 * yet still says what is coming, and a button that looks live and does nothing
 * reads as broken. Opening one is then a single prop.
 */
function SidebarAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  const shell = "flex h-11 w-full items-center gap-2.5 rounded-xl px-3.5 text-[13px] font-semibold";

  if (!onClick) {
    return (
      <button
        type="button"
        disabled
        title="Coming soon"
        className={`${shell} cursor-not-allowed border border-dashed border-slate-200 text-slate-300 mmdark:border-[#223140] mmdark:text-[#4b5c6e]`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${shell} border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:border-saffron/60 hover:text-saffron mmdark:border-[#223140] mmdark:bg-[#1b2836] mmdark:text-[#dfe9f2]`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ChatbotWidget() {
  const { user, signOut } = useSession();
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
  const [profileOpen, setProfileOpen] = useState(false);
  // Shortlisted cards, for as long as the widget is open. The real shortlist
  // lives behind /api/saved and keys off a property id — these ids belong to
  // fabricated listings, so nothing here is sent anywhere.
  const [saved, setSaved] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  // Carried back to the server each turn so it need not re-derive filters it
  // already worked out. A ref, because the send path must read the current
  // value rather than whatever a stale closure captured.
  const slotsRef = useRef<Record<string, unknown> | null>(null);
  // Which desk the visitor is at, carried for the same reason and by the same
  // route: naming it once should hold for the turns that follow.
  const deskRef = useRef<string | null>(null);
  // How far the "send it to my inbox" step has got. Carried like the rest, so
  // the server need not work out on every turn whether it is mid-ask.
  const leadRef = useRef<string | null>(null);
  // Full by default, so a restored conversation shows the greeting complete
  // rather than replaying it. Opening a fresh chat restarts the typing.
  const [welcomeText, setWelcomeText] = useState(WELCOME_TEXT);
  // A separate switch drives the animation. Keying the effect off `welcomeText`
  // instead would tear the interval down on its own first tick, since every
  // character it writes is a dependency change.
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isSupported: micSupported, status: micStatus, error: micError, toggle: toggleMic } =
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
      shown += 3;
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
      deskRef.current = null;
      leadRef.current = null;
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
    deskRef.current = null;
    leadRef.current = null;
    setEditing(false);
    setActiveSession(null);
    setMessages(INITIAL_MESSAGES);
    setWelcomeText("");
    setTyping(true);
    setError(null);
    void refreshSessions();
  }

  async function handleSignOut() {
    setProfileOpen(false);
    await signOut();
  }

  function toggleSaved(id: string) {
    setSaved((current) =>
      current.includes(id) ? current.filter((one) => one !== id) : [...current, id],
    );
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
    deskRef.current = null;
    leadRef.current = null;
    setEditing(false);
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
    deskRef.current = null;
    leadRef.current = null;
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

  function handleSend() {
    void sendText(input);
  }

  async function sendText(raw: string) {
    const text = raw.trim();
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
            ? {
                message: text,
                session_id: sessionRef.current,
                slots: slotsRef.current,
                desk: deskRef.current,
                lead: leadRef.current,
              }
            : {
                message: text,
                slots: slotsRef.current,
                desk: deskRef.current,
                lead: leadRef.current,
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
      let tips: string[] = [];
      let tipsLine = "";
      let found: Match[] = [];
      let board: Panel | null = null;
      let refine: FilterRow[] = [];
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
            if (Array.isArray(payload.suggestions)) tips = payload.suggestions as string[];
            if (payload.suggestions_line) tipsLine = String(payload.suggestions_line);
            if (Array.isArray(payload.matches)) found = payload.matches as Match[];
            if (Array.isArray(payload.filters)) refine = payload.filters as FilterRow[];
            if (payload.panel) board = payload.panel as Panel;
            deskRef.current = (payload.desk as string | null) ?? null;
            leadRef.current = (payload.lead as string | null) ?? null;
            // The address was captured server-side; the mail itself goes from
            // here, because Resend lives on this side and always has.
            const wants = payload.mail as { to?: string } | null;
            if (wants?.to) {
              void fetch("/api/chat/email", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ to: wants.to, slots: payload.slots ?? slotsRef.current }),
              }).catch(() => {
                // Nothing is said on screen: the reply already promised it, and
                // a contradiction a second later helps no one. The lead is
                // stored either way, so the search itself is not lost.
              });
            }
          } else if (event === "error") {
            failure = String(payload.message ?? "Something went wrong.");
          }
        }
      }

      setMessages((current) =>
        current
          .map((m) =>
            m.id === replyId
              ? {
                  ...m,
                  text: streamedRef.current,
                  pending: false,
                  suggestions: tips.length ? tips : undefined,
                  tipsLine: tipsLine || undefined,
                  matches: found.length ? found : undefined,
                  filters: refine.length ? refine : undefined,
                  panel: board ?? undefined,
                }
              : m,
          )
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
              className="flex h-[calc(100dvh-2rem)] w-full max-w-[1280px] overflow-hidden rounded-[20px] border border-white/40 bg-white shadow-2xl mmdark:border-[#223140] mmdark:bg-[#0f1923] sm:h-[min(94vh,980px)] sm:min-h-[720px]"
            >
              <aside className="hidden w-[280px] shrink-0 flex-col border-r border-slate-200 bg-[#F4F7FB] mmdark:border-[#223140] mmdark:bg-[#141f2b] md:flex">
                <div className="flex h-14 shrink-0 items-center border-b border-slate-200 px-5 mmdark:border-[#223140]">
                  {/* Same type as the site header's logo — it was set in serif
                      here and sans everywhere else, which read as two brands. */}
                  <div className="text-xl font-bold tracking-tight text-[#0A2036] mmdark:text-[#eaf1f8] sm:text-2xl">
                    Makan <span className="text-saffron">Mantraa</span>
                  </div>
                </div>

                {/* Above the actions rather than under the chat list: signing
                    in is what makes those chats persist, so it belongs before
                    them, not after. */}
                <div className="shrink-0 px-5 pt-4">
                  {signedIn ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mmdark:border-[#223140] mmdark:bg-[#1b2836]">
                    <button
                      onClick={() => setProfileOpen((shown) => !shown)}
                      aria-expanded={profileOpen}
                      className="flex w-full items-center gap-3 p-2.5 text-left"
                    >
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
                        <span className="block truncate text-[13px] font-bold text-slate-900 mmdark:text-[#dfe9f2]">
                          {user?.name || "You"}
                        </span>
                        <span className="block truncate text-[11px] font-medium text-slate-400 mmdark:text-[#7089a0]">
                          {user?.email || "Chats are saved"}
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform mmdark:text-[#7089a0] ${
                          profileOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {profileOpen ? (
                      <div className="space-y-0.5 border-t border-slate-100 p-1.5 mmdark:border-[#223140]">
                        <Link
                          href="/dashboard"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 mmdark:text-[#cbd9e6] mmdark:hover:bg-[#26374a]"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Go to Dashboard
                        </Link>
                        <button
                          onClick={() => void handleSignOut()}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-red-600 transition hover:bg-red-50 mmdark:text-red-400 mmdark:hover:bg-red-950/30"
                        >
                          <LogOut className="h-4 w-4" />
                          Log out
                        </button>
                      </div>
                    ) : null}
                    </div>
                  ) : (
                    <button
                      onClick={() => openAuthModal("login")}
                      className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-2.5 text-left shadow-sm transition hover:border-saffron mmdark:border-[#2f4356] mmdark:bg-[#1b2836]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 mmdark:bg-[#26374a]">
                        <User className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold text-slate-700 mmdark:text-[#cbd9e6]">
                          Sign in
                        </span>
                        <span className="block text-[11px] font-medium text-slate-400 mmdark:text-[#7089a0]">
                          to save your chats
                        </span>
                      </span>
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 px-5 pt-3">
                  <SidebarAction icon={Plus} label="New Search" onClick={startNewChat} />
                  <SidebarAction icon={Building2} label="Post Property" />
                  <SidebarAction icon={Newspaper} label="Latest News" />
                </div>

                <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate-200 px-5 pt-5 mmdark:border-[#223140]">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mmdark:text-[#7089a0]">
                    Recent Chats
                  </div>

                  {!signedIn ? (
                    <p className="mt-4 text-xs font-medium leading-5 text-slate-500 mmdark:text-[#8ea4b8]">
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
                    <p className="mt-4 text-xs font-medium text-slate-400 mmdark:text-[#7089a0]">
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
                                ? "bg-white shadow-sm mmdark:bg-[#1b2836]"
                                : "hover:bg-white/70 mmdark:hover:bg-[#1b2836]/70"
                            }`}
                          >
                            <button
                              onClick={() => void loadSession(session.session_id)}
                              className="flex min-w-0 flex-1 flex-col items-start text-left"
                            >
                              <span
                                className={`w-full truncate text-[13px] font-medium ${
                                  active
                                    ? "text-[#0A2036] mmdark:text-[#eaf1f8]"
                                    : "text-slate-500 mmdark:text-[#a3b6c8]"
                                }`}
                              >
                                {session.title}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 mmdark:text-[#7089a0]">
                                {Math.ceil(session.message_count / 2)} message
                                {session.message_count > 2 ? "s" : ""}
                              </span>
                            </button>
                            <button
                              onClick={() => void deleteSession(session.session_id)}
                              aria-label={`Delete chat: ${session.title}`}
                              className="shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500 mmdark:text-[#4b5c6e]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>


              </aside>

              <main className="flex min-w-0 flex-1 flex-col bg-white mmdark:bg-[#0f1923]">
                <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-100 px-4 mmdark:border-[#223140] sm:px-6">
                  {/* Nothing on the left any more, so the controls carry
                      themselves to the right rather than leaning on a spacer. */}
                  <button
                    onClick={toggleTheme}
                    role="switch"
                    aria-checked={theme === "dark"}
                    className="ml-auto flex h-7 w-[52px] shrink-0 items-center rounded-full border border-slate-300 bg-slate-200 px-[3px] transition-colors mmdark:border-[#3f424b] mmdark:bg-[#2a2f3c]"
                    aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                    title={theme === "dark" ? "Light mode" : "Dark mode"}
                  >
                    {/* The knob shows the state it is in, not the one it would
                        switch to — that is what a switch means, and the icon
                        used to say the opposite of the track it sat on. */}
                    <span
                      className={`flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#FFB067] text-[#1b2836] shadow-sm transition-transform duration-200 ${
                        theme === "dark" ? "translate-x-[22px]" : "translate-x-0"
                      }`}
                    >
                      {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                  {/* macOS traffic lights: the glyph only shows on hover, the
                      way the real ones do. The dot is 14px but the button pads
                      out to 22px, because a 14px tap target is not one. */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setOpen(false)}
                      aria-label="Minimize chat"
                      title="Minimize"
                      className="group -m-1 flex p-1"
                    >
                      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#FEBC2E] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.18)] transition group-hover:brightness-95">
                        <Minus className="h-3.5 w-3.5 text-black/55 opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={3.5} />
                      </span>
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      aria-label="Close chat"
                      title="Close"
                      className="group -m-1 flex p-1"
                    >
                      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#FF5F57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.18)] transition group-hover:brightness-95">
                        <X className="h-3.5 w-3.5 text-black/55 opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={3.5} />
                      </span>
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_34%,#f8fafc_100%)] px-3 py-5 mmdark:bg-none mmdark:bg-[#0f1923] sm:px-5">
                  <section className="mx-auto max-w-4xl text-center">
                    <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-saffron/25 bg-saffron/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-saffron">
                      <Sparkles className="h-3 w-3" />
                      Home discovery
                    </div>
                    <h3 className="mt-4 text-xl font-black leading-tight text-slate-950 mmdark:text-[#eaf1f8] sm:text-2xl">
                      Find a home that fits your plan
                    </h3>
                    <p className="mx-auto mt-2 max-w-3xl text-xs font-medium leading-5 text-slate-500 mmdark:text-[#8ea4b8] sm:text-[13px]">
                      Tell Mantraa your city, budget and property type.
                    </p>
                  </section>

                  <div className="mx-auto mt-7 max-w-4xl space-y-4 pb-3">
                    {messages.map((msg, index) => (
                      <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className={`flex max-w-[86%] items-end gap-1.5 sm:max-w-[76%] ${
                          msg.role === "user" ? "flex-row-reverse" : ""
                        }`}>
                        <div className={`min-w-0 rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                          msg.role === "user"
                            ? "whitespace-pre-wrap rounded-br-md bg-[#0A2036] text-white mmdark:bg-[#26374a] mmdark:text-[#eaf1f8]"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800 mmdark:border-[#223140] mmdark:bg-[#141f2b] mmdark:text-[#cbd9e6]"
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

                        {/* Only on the reply that summarises the five answers, and
                            only while it is the latest: editing a search two results
                            back would rewrite the one on screen. */}
                        {msg.filters?.length && index === messages.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setEditing((shown) => !shown)}
                            aria-expanded={editing}
                            aria-label={editing ? "Done editing" : "Edit your answers"}
                            title="Edit your answers"
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                              editing
                                ? "border-saffron bg-saffron/15 text-saffron"
                                : "border-slate-200 text-slate-400 hover:border-saffron/60 hover:text-saffron mmdark:border-[#223140] mmdark:text-[#7089a0]"
                            }`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        </div>

                        {/* The opening menu, shown only while the greeting is still
                            the whole conversation. Held back until the typing
                            finishes so the buttons do not appear mid-sentence. */}
                        {msg.id === "welcome" && messages.length === 1 && !typing ? (
                          <div className="flex flex-wrap gap-1.5">
                            {MENU.map((entry) =>
                              entry.disabled ? (
                                <span
                                  key={entry.label}
                                  title="Coming soon"
                                  className="cursor-not-allowed rounded-full border border-dashed border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-300 mmdark:border-[#223140] mmdark:text-[#4b5c6e]"
                                >
                                  {entry.label}
                                </span>
                              ) : (
                                <button
                                  key={entry.label}
                                  onClick={() => void sendText(entry.label)}
                                  className="rounded-full border border-saffron/35 bg-saffron/5 px-3 py-1.5 text-[12px] font-semibold text-saffron transition hover:bg-saffron/15 mmdark:border-saffron/45 mmdark:bg-saffron/10"
                                >
                                  {entry.label}
                                </button>
                              ),
                            )}
                          </div>
                        ) : null}

                        {/* Real stories, so these do open — and closing the chat on
                            the way out, because the widget outlives the route and
                            would otherwise sit on top of the page just opened. */}
                        {msg.panel?.links.length ? (
                          <div className="w-full max-w-[86%] space-y-2 sm:max-w-[76%]">
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mmdark:text-[#7089a0]">
                              {msg.panel.subtitle}
                            </div>
                            {msg.panel.links.map((item) =>
                              item.href ? (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setOpen(false)}
                                  className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-saffron/60 mmdark:border-[#223140] mmdark:bg-[#141f2b]"
                                >
                                  {item.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={item.image}
                                      alt=""
                                      className="h-16 w-20 shrink-0 rounded-xl object-cover"
                                    />
                                  ) : null}
                                  <span className="min-w-0 flex-1">
                                    <span className="line-clamp-2 block text-[13px] font-bold leading-snug text-slate-900 mmdark:text-[#dfe9f2]">
                                      {item.title}
                                    </span>
                                    <span className="mt-1 block truncate text-[11px] font-medium text-slate-400 mmdark:text-[#7089a0]">
                                      {[item.meta, item.at].filter(Boolean).join(" · ")}
                                    </span>
                                  </span>
                                </Link>
                              ) : null,
                            )}
                            {msg.panel.href ? (
                              <Link
                                href={msg.panel.href}
                                onClick={() => setOpen(false)}
                                className="block text-[12px] font-bold text-saffron hover:underline"
                              >
                                See all news →
                              </Link>
                            ) : null}
                          </div>
                        ) : null}

                        {/* A row that scrolls rather than a stack that grows: three
                            listings down the page push the question that follows them
                            out of sight. Unlinked on purpose — there is nothing to open
                            yet, and a card that goes nowhere is worse than one that
                            says so. */}
                        {msg.matches?.length ? (
                          <div className="w-full space-y-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mmdark:text-[#7089a0]">
                              Sample results · live listings coming soon
                            </div>
                            {/* Negative margin then padding, so the cards can reach the
                                edge of the column while their shadows still have room. */}
                            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
                              {msg.matches.map((match, spot) => (
                                <div
                                  key={match.id}
                                  className="w-[268px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm mmdark:border-[#223140] mmdark:bg-[#141f2b]"
                                >
                                  <div className="relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={PROPERTY_IMAGES[spot % PROPERTY_IMAGES.length]}
                                      alt=""
                                      className="h-[132px] w-full object-cover"
                                    />
                                    <span className="absolute left-2.5 top-2.5 rounded-lg bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                                      {match.status}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleSaved(match.id)}
                                      aria-pressed={saved.includes(match.id)}
                                      aria-label={saved.includes(match.id) ? "Remove from shortlist" : "Add to shortlist"}
                                      className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:bg-white mmdark:bg-[#1b2836]/95"
                                    >
                                      <Heart
                                        className={`h-4 w-4 transition ${
                                          saved.includes(match.id)
                                            ? "fill-saffron text-saffron"
                                            : "text-slate-400 mmdark:text-[#7089a0]"
                                        }`}
                                      />
                                    </button>
                                  </div>

                                  <div className="p-3">
                                    <div className="truncate text-[14px] font-bold text-slate-900 mmdark:text-[#dfe9f2]">
                                      {match.title}
                                    </div>
                                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500 mmdark:text-[#8ea4b8]">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      <span className="truncate">
                                        {match.locality}, {match.city}
                                      </span>
                                    </div>
                                    <div className="mt-2 text-[17px] font-black text-slate-900 mmdark:text-[#eaf1f8]">
                                      {match.price}
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-3 border-t border-slate-100 pt-3 mmdark:border-[#223140]">
                                      {match.specs.map((spec, slot) => {
                                        const Icon = SPEC_ICONS[slot % SPEC_ICONS.length];
                                        return (
                                          <div key={spec.label} className="flex min-w-0 items-center gap-2">
                                            <Icon className="h-4 w-4 shrink-0 text-slate-400 mmdark:text-[#7089a0]" />
                                            <span className="min-w-0">
                                              <span className="block truncate text-[12px] font-bold text-slate-800 mmdark:text-[#cbd9e6]">
                                                {spec.value}
                                              </span>
                                              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mmdark:text-[#7089a0]">
                                                {spec.label}
                                              </span>
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Both inert while the listings behind them are
                                        fabricated: there is no page to open and nobody
                                        to put on the call. */}
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        disabled
                                        title="Coming soon"
                                        className="h-9 cursor-not-allowed rounded-xl border border-slate-200 text-[12px] font-bold text-slate-400 mmdark:border-[#223140] mmdark:text-[#50545d]"
                                      >
                                        Details
                                      </button>
                                      <button
                                        type="button"
                                        disabled
                                        title="Coming soon"
                                        className="flex h-9 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-saffron/40 text-[12px] font-bold text-white"
                                      >
                                        <Phone className="h-3.5 w-3.5" />
                                        Enquire
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* The five answers again, editable, opened from the
                                pencil on the reply above. Each chip sends its own
                                label, so a correction travels the same path a typed
                                answer does — no separate machinery to keep in step. */}
                            {msg.filters?.length && index === messages.length - 1 && editing ? (
                              <div className="space-y-2.5 border-t border-slate-100 pt-3 mmdark:border-[#223140]">
                                {msg.filters.map((row) => (
                                  <div key={row.field} className="flex flex-wrap items-center gap-2">
                                    <span className="w-[86px] shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 mmdark:text-[#7089a0]">
                                      {row.label}
                                    </span>
                                    {row.options.map((option) => (
                                      <button
                                        key={option.label}
                                        onClick={() => void sendText(option.label)}
                                        disabled={busy}
                                        className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-50 ${
                                          option.selected
                                            ? "border-saffron bg-saffron/15 text-saffron"
                                            : "border-slate-200 text-slate-600 hover:border-saffron/50 hover:text-saffron mmdark:border-[#223140] mmdark:text-[#a3b6c8]"
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {/* Turning a question down is only half an answer; these
                            are the other half, and they are one tap away. */}
                        {msg.suggestions?.length && index === messages.length - 1 && !busy ? (
                          <div className="max-w-[86%] sm:max-w-[76%]">
                            {msg.tipsLine ? (
                              <div className="mb-2 text-[13px] font-semibold text-slate-700 mmdark:text-[#cbd9e6]">
                                {msg.tipsLine}
                              </div>
                            ) : null}
                            <div className="flex flex-wrap gap-1.5">
                            {msg.suggestions.map((tip) => (
                              <button
                                key={tip}
                                onClick={() => void sendText(tip)}
                                className="rounded-full border border-saffron/35 bg-saffron/5 px-3 py-1.5 text-[12px] font-semibold text-saffron transition hover:bg-saffron/15 mmdark:border-saffron/45 mmdark:bg-saffron/10"
                              >
                                {tip}
                              </button>
                            ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}

                    {(error || micError) && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 mmdark:border-red-900 mmdark:bg-red-950/40 mmdark:text-red-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {error || micError}
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                </div>

                <div className="flex h-[92px] shrink-0 items-center border-t border-slate-100 bg-white px-3 mmdark:border-[#223140] mmdark:bg-[#0f1923] sm:px-5">
                  <div className="mx-auto flex w-full max-w-4xl items-center gap-2 rounded-2xl border-2 border-saffron/70 bg-white p-2 shadow-[0_14px_42px_rgba(255,111,35,0.12)] mmdark:bg-[#141f2b] mmdark:shadow-none">
                    <Search className="ml-2 h-5 w-5 shrink-0 text-slate-400" />
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      disabled={busy}
                      placeholder={micStatus === "listening" ? "Listening…" : "Ask for 2 BHK for rent in Faridabad"}
                      className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[13px] font-medium text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed mmdark:text-[#dfe9f2] mmdark:placeholder:text-[#7089a0]"
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
                      onClick={handleSend}
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
                    className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl mmdark:bg-[#1b2836]"
                  >
                    <h4 className="text-lg font-bold text-slate-950 mmdark:text-[#eaf1f8]">
                      Start a new chat?
                    </h4>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500 mmdark:text-[#a3b6c8]">
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
                        className="h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition hover:border-slate-300 mmdark:border-[#2f4356] mmdark:text-[#cbd9e6]"
                      >
                        Clear and start over
                      </button>
                      <button
                        onClick={() => setGuestPrompt(false)}
                        className="h-9 text-sm font-semibold text-slate-400 transition hover:text-slate-600 mmdark:hover:text-[#b9cadb]"
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
