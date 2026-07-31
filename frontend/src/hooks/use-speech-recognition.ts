"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((e: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
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

export function useSpeechRecognition(onResult: (text: string) => void) {
  const [isSupported, setIsSupported] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; });

  useEffect(() => {
    setIsSupported(!!getSR());
    return () => recognitionRef.current?.abort();
  }, []);

  const toggle = useCallback(() => {
    if (status === "listening") {
      recognitionRef.current?.stop();
      return;
    }

    const SR = getSR();
    if (!SR) return;

    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => setStatus("listening");
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      onResultRef.current(transcript);
    };
    rec.onend = () => setStatus("idle");
    rec.onerror = () => setStatus("idle");

    recognitionRef.current = rec;
    rec.start();
  }, [status]);

  return { isSupported, status, toggle };
}
