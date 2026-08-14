"use client";

import { Bookmark, Check, Eye, Link2, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

export function ArticleActions({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function share() {
    const shareData = { title: document.title, url: window.location.href };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Dismissing the system share sheet should not surface an error state.
      }
    }

    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const actionClass = compact
    ? "inline-flex h-9 items-center gap-2 rounded-full border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 transition-colors hover:border-[#d75a3a] hover:text-[#b53a22]"
    : "grid size-10 place-items-center rounded-full border border-stone-300 bg-white text-stone-700 transition-colors hover:border-[#d75a3a] hover:text-[#b53a22]";

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col items-center gap-3"}>
      <button type="button" onClick={share} className={actionClass} aria-label="Share this article">
        {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
        {compact && <span>{copied ? "Link copied" : "Share"}</span>}
      </button>
      <button
        type="button"
        onClick={() => setSaved((value) => !value)}
        className={actionClass}
        aria-label={saved ? "Remove article from saved stories" : "Save this article"}
        aria-pressed={saved}
      >
        <Bookmark className={`size-4 ${saved ? "fill-current" : ""}`} />
        {compact && <span>{saved ? "Saved" : "Save"}</span>}
      </button>
      {!compact && (
        <>
          <span className={actionClass} title="Views" aria-label="Views"><Eye className="size-4" /></span>
          <span className={actionClass} title="Comments" aria-label="Comments"><MessageCircle className="size-4" /></span>
        </>
      )}
      {compact && copied && <Link2 className="size-3.5 text-[#b53a22]" aria-hidden="true" />}
    </div>
  );
}
