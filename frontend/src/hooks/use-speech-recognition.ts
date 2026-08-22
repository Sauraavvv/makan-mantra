"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((e: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSR(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as SpeechRecognitionCtor | undefined;
}

type Status = "idle" | "listening";

/**
 * Why a failure has to be said out loud.
 *
 * Every one of these ends the same way on screen — the button stops pulsing
 * and nothing is written in the box. Blocked permission, no microphone, a
 * laptop offline, a page served over plain HTTP from a LAN address: all of it
 * arrives as "the mic doesn't work", and none of it is guessable from the one
 * thing the user can see.
 */
const REASON: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it from the icon in your browser's address bar, then try again.",
  "service-not-allowed": "Microphone access is blocked. Allow it from the icon in your browser's address bar, then try again.",
  "audio-capture": "No microphone found. Check that one is connected and selected.",
  network: "Voice input needs an internet connection.",
  "no-speech": "Didn't catch that. Try again, a little closer to the mic.",
};

/** Nothing to subscribe to: whether the browser has the API is fixed at load. */
const noop = () => () => {};

export function useSpeechRecognition(onResult: (text: string) => void) {
  // Read rather than stored in state. The server has no `window`, so support
  // must render as false and only then correct itself on the client — doing
  // that with an effect is a second render every mount, and setting state from
  // an effect body is what the lint rule is there to stop.
  const isSupported = useSyncExternalStore(noop, () => !!getSR(), () => false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; });

  useEffect(() => () => recognitionRef.current?.abort(), []);

  // Deliberately dependency-free: the live recogniser is the source of truth
  // for whether we are listening, so a click can never act on a stale `status`
  // and start a second one on top of the first.
  const toggle = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SR = getSR();
    if (!SR) return;

    setError(null);

    // The API exists on the object either way, but the browser refuses the
    // microphone itself outside a secure context — over HTTP from a LAN
    // address it fails as a flat permission denial with no prompt.
    if (!window.isSecureContext) {
      setError("Voice input needs a secure page — use localhost or HTTPS.");
      return;
    }

    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    const release = () => {
      recognitionRef.current = null;
      setStatus("idle");
    };

    rec.onstart = () => setStatus("listening");
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      onResultRef.current(transcript);
    };
    rec.onend = release;
    rec.onerror = (e) => {
      // Stopping on purpose reports as an error too, and has nothing to say.
      if (e.error !== "aborted") {
        setError(REASON[e.error] ?? "Voice input failed. You can type instead.");
      }
      release();
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      // Chrome throws InvalidStateError if a recogniser is somehow still live.
      // Without this the click surfaces as an uncaught error and the button
      // sticks, which is worse than the failure it is reporting.
      release();
      setError("Voice input could not start. Try again in a moment.");
    }
  }, []);

  return { isSupported, status, error, toggle };
}
