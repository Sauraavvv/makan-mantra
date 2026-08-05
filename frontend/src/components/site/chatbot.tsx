"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Heart,
  MapPin,
  Mic,
  Minus,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

// ── Types ────────────────────────────────────────────────────────────────────

type Role = "bot" | "user";

type Message = {
  id: string;
  role: Role;
  text: string;
  options?: { label: string; value: string }[];
};

type Step = "greeting" | "listing_type" | "city" | "budget" | "property_type" | "result";

type State = {
  step: Step;
  listingType?: string;
  city?: string;
  budget?: string;
  propertyType?: string;
};

// ── Conversation logic ───────────────────────────────────────────────────────

const CITIES = ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad"];

const BUDGETS = {
  buy: ["Under ₹30L", "₹30L – ₹60L", "₹60L – ₹1Cr", "₹1Cr – ₹2Cr", "₹2Cr+"],
  rent: ["Under ₹10k/mo", "₹10k – ₹20k/mo", "₹20k – ₹40k/mo", "₹40k+/mo"],
  pg: ["Under ₹6k/mo", "₹6k – ₹12k/mo", "₹12k+/mo"],
};

const PROPERTY_TYPES = {
  buy: ["Flat / Apartment", "Villa", "Plot", "Builder Floor", "Office Space"],
  rent: ["Flat / Apartment", "Villa", "Builder Floor", "Office Space", "Shop"],
  pg: ["PG for Men", "PG for Women", "Co-living"],
};

function nextMessages(state: State, input: string): { messages: Message[]; nextState: State } {
  const id = () => Math.random().toString(36).slice(2);

  switch (state.step) {
    case "greeting":
      return {
        messages: [
          { id: id(), role: "bot", text: "What are you looking for?", options: [
            { label: "🏠 Buy a property", value: "buy" },
            { label: "🔑 Rent a property", value: "rent" },
            { label: "🛏 PG / Hostel", value: "pg" },
          ]},
        ],
        nextState: { ...state, step: "listing_type" },
      };

    case "listing_type": {
      const type = input;
      return {
        messages: [
          { id: id(), role: "bot", text: `Got it! Which city are you looking in?`, options:
            CITIES.map((c) => ({ label: c, value: c })),
          },
        ],
        nextState: { ...state, step: "city", listingType: type },
      };
    }

    case "city": {
      const budgetList = BUDGETS[(state.listingType as keyof typeof BUDGETS) || "buy"];
      return {
        messages: [
          { id: id(), role: "bot", text: `What's your budget?`, options:
            budgetList.map((b) => ({ label: b, value: b })),
          },
        ],
        nextState: { ...state, step: "budget", city: input },
      };
    }

    case "budget": {
      const propList = PROPERTY_TYPES[(state.listingType as keyof typeof PROPERTY_TYPES) || "buy"];
      return {
        messages: [
          { id: id(), role: "bot", text: "What type of property?", options:
            propList.map((p) => ({ label: p, value: p })),
          },
        ],
        nextState: { ...state, step: "property_type", budget: input },
      };
    }

    case "property_type": {
      const s = { ...state, propertyType: input };
      const citySlug = (s.city || "").toLowerCase().replace(/\s+/g, "-");
      const href = `/${citySlug}`;
      return {
        messages: [
          {
            id: id(), role: "bot",
            text: `Great! I found listings for **${input}** in **${s.city}** within **${s.budget}**. Tap below to explore 👇`,
            options: [{ label: `View listings in ${s.city} →`, value: `__link__${href}` }],
          },
        ],
        nextState: { ...s, step: "result" },
      };
    }

    case "result":
      return {
        messages: [
          { id: id(), role: "bot", text: "Want to search again?", options: [
            { label: "🔄 Start over", value: "__reset__" },
          ]},
        ],
        nextState: state,
      };

    default:
      return { messages: [], nextState: state };
  }
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "bot",
    text: "Hi! I'm **Mantraa**, your property assistant. I'll help you find the right home in seconds.",
  },
];

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
  const [open, setOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [avatarVisible, setAvatarVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [convState, setConvState] = useState<State>({ step: "greeting" });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isSupported: micSupported, status: micStatus, toggle: toggleMic } =
    useSpeechRecognition((text) => setInput(text));
  const bubbleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentCity = convState.city || "India";
  const recentChats = messages
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.text);

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

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleOpen() {
    setOpen(true);
    setShowBubble(false);
    if (bubbleTimerRef.current) clearInterval(bubbleTimerRef.current);
    if (messages.length === 1) {
      const { messages: next, nextState } = nextMessages(convState, "");
      setMessages((m) => [...m, ...next]);
      setConvState(nextState);
    }
  }

  function handleOption(value: string, label: string) {
    if (value === "__reset__") {
      setMessages(INITIAL_MESSAGES);
      setConvState({ step: "greeting" });
      const { messages: next, nextState } = nextMessages({ step: "greeting" }, "");
      setMessages([...INITIAL_MESSAGES, ...next]);
      setConvState(nextState);
      return;
    }

    if (value.startsWith("__link__")) {
      window.location.href = value.replace("__link__", "");
      return;
    }

    const userMsg: Message = { id: Math.random().toString(36).slice(2), role: "user", text: label };
    const { messages: next, nextState } = nextMessages(convState, value);
    setMessages((m) => [...m, userMsg, ...next]);
    setConvState(nextState);
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg: Message = { id: Math.random().toString(36).slice(2), role: "user", text };
    const { messages: next, nextState } = nextMessages(convState, text);
    setMessages((m) => [...m, userMsg, ...next]);
    setConvState(nextState);
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-3 py-4 backdrop-blur-sm sm:px-6"
          >
            <motion.div
              initial={{ y: 26, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 26, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex h-[calc(100dvh-2rem)] w-full max-w-[1020px] overflow-hidden rounded-[20px] border border-white/40 bg-white shadow-2xl sm:h-[min(86vh,760px)] sm:min-h-[620px]"
            >
              <aside className="hidden w-[248px] shrink-0 flex-col border-r border-slate-200 bg-[#F4F7FB] md:flex">
                <div className="px-7 pb-5 pt-7">
                  <div className="font-serif text-2xl font-bold leading-none text-[#0A2036]">
                    Makan <span className="text-saffron">Mantraa</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-500">Property assistant</div>
                </div>

                <div className="space-y-3 px-5">
                  <button
                    onClick={() => handleOption("__reset__", "Start over")}
                    className="flex h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-saffron/60 hover:text-saffron"
                  >
                    <Plus className="h-4 w-4" />
                    New Search
                  </button>
                  <div className="flex h-12 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-saffron" />
                      <span className="truncate">{currentCity}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <button className="flex h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm">
                    <Heart className="h-4 w-4" />
                    Shortlist
                  </button>
                </div>

                <div className="mt-6 border-t border-slate-200 px-5 pt-5">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Recent Chats</div>
                  {recentChats.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {recentChats.map((chat) => (
                        <button
                          key={chat}
                          className="flex w-full items-center gap-2 text-left text-sm font-medium text-slate-500 transition hover:text-[#0A2036]"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                          <span className="truncate">{chat}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              <main className="flex min-w-0 flex-1 flex-col bg-white">
                <div className="flex h-20 shrink-0 items-center gap-4 border-b border-slate-100 px-4 sm:px-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A2036] text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]" />
                      <h2 className="truncate text-base font-bold text-slate-950 sm:text-lg">Mantraa</h2>
                    </div>
                    <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
                      Search smarter, compare faster, shortlist better
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:text-slate-900 sm:flex"
                    aria-label="Minimize chat"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:text-slate-900"
                    aria-label="Close chat"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_34%,#f8fafc_100%)] px-4 py-5 sm:px-7">
                  <section className="mx-auto max-w-3xl text-center">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-saffron/25 bg-saffron/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-saffron">
                      <Sparkles className="h-3.5 w-3.5" />
                      Home discovery
                    </div>
                    <h3 className="mt-5 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
                      Find a home that fits your plan
                    </h3>
                    <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                      Tell Mantraa your city, budget and property type.
                    </p>
                  </section>

                  <div className="mx-auto mt-7 max-w-3xl space-y-4 pb-3">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[76%] ${
                          msg.role === "user"
                            ? "rounded-br-md bg-[#0A2036] text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                        }`}>
                          {msg.text.split("**").map((part, i) =>
                            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                          )}
                        </div>

                        {msg.options && msg.role === "bot" && (
                          <div className="flex max-w-[92%] flex-wrap gap-2">
                            {msg.options.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => handleOption(opt.value, opt.label)}
                                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-saffron hover:text-saffron"
                              >
                                {opt.label}
                                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-4 sm:px-7">
                  <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border-2 border-saffron/70 bg-white p-2 shadow-[0_14px_42px_rgba(255,111,35,0.12)]">
                    <Search className="ml-2 h-5 w-5 shrink-0 text-slate-400" />
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder={micStatus === "listening" ? "Listening…" : "Ask for 2 BHK for rent in Faridabad"}
                      className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
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
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saffron text-white transition hover:bg-saffron/90"
                      aria-label="Send message"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </main>
            </motion.div>
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
                  className="relative mr-1 rounded-2xl rounded-br-none bg-white px-4 py-2.5 shadow-lg border border-border"
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
            >
              <span className="text-2xl">🏠</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
