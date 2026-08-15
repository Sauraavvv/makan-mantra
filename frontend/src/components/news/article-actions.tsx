"use client";

import { Bookmark, Check, Eye, Link2, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NEWS_COMMENTS_CHANGED_EVENT } from "@/components/news/article-comments";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const VIEWER_STORAGE_KEY = "makan-mantra:news-viewer-id";

function getViewerId() {
  const existing = localStorage.getItem(VIEWER_STORAGE_KEY);
  if (existing) return existing;

  const viewerId = crypto.randomUUID();
  localStorage.setItem(VIEWER_STORAGE_KEY, viewerId);
  return viewerId;
}

export function ArticleActions({ compact = false, articleSlug }: { compact?: boolean; articleSlug?: string }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    if (!articleSlug || compact) return;
    const slug = articleSlug;
    let current = true;

    async function recordView() {
      try {
        const response = await fetch(`${API_URL}/news/${encodeURIComponent(slug)}/views`, {
          method: "POST",
          headers: { "X-News-Visitor": getViewerId() },
        });
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        if (current && typeof data.count === "number") setViewCount(data.count);
      } catch {
        // View reporting should never block the article UI.
      }
    }

    void recordView();
    return () => {
      current = false;
    };
  }, [articleSlug, compact]);

  useEffect(() => {
    if (!articleSlug || compact) return;
    const slug = articleSlug;

    let current = true;
    async function loadCommentCount() {
      try {
        const response = await fetch(`${API_URL}/news/${encodeURIComponent(slug)}/comments/count`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        if (current && typeof data.count === "number") setCommentCount(data.count);
      } catch {
        // A count should never block the rest of the article actions.
      }
    }

    void loadCommentCount();
    return () => {
      current = false;
    };
  }, [articleSlug, compact]);

  useEffect(() => {
    if (!articleSlug || compact) return;
    const updateCommentCount = (event: Event) => {
      const detail = (event as CustomEvent<{ articleSlug?: string; commentCount?: number }>).detail;
      if (detail?.articleSlug === articleSlug && typeof detail.commentCount === "number") {
        setCommentCount(detail.commentCount);
      }
    };
    window.addEventListener(NEWS_COMMENTS_CHANGED_EVENT, updateCommentCount);
    return () => window.removeEventListener(NEWS_COMMENTS_CHANGED_EVENT, updateCommentCount);
  }, [articleSlug, compact]);

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

  function openComments() {
    window.dispatchEvent(new Event("makan-mantra:open-news-comments"));
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
          <span className={`${actionClass} relative`} title={`${viewCount} views`} aria-label={`${viewCount} views`}><Eye className="size-4" /><span className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-[#242424] px-1 text-[9px] font-bold leading-4 text-white">{viewCount > 99 ? "99+" : viewCount}</span></span>
          <button type="button" onClick={openComments} className={`${actionClass} relative`} title={`${commentCount} comments`} aria-label={`Open comments (${commentCount})`}>
            <MessageCircle className="size-4" />
            <span className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-[#bb432a] px-1 text-[9px] font-bold leading-4 text-white">{commentCount > 99 ? "99+" : commentCount}</span>
          </button>
        </>
      )}
      {compact && copied && <Link2 className="size-3.5 text-[#b53a22]" aria-hidden="true" />}
    </div>
  );
}
