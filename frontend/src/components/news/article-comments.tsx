"use client";

import { LoaderCircle, MessageCircle, Pencil, Send, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const OPEN_COMMENTS_EVENT = "makan-mantra:open-news-comments";
export const NEWS_COMMENTS_CHANGED_EVENT = "makan-mantra:news-comments-changed";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const OWNERSHIP_STORAGE_PREFIX = "makan-mantra:news-comment-owner:";

export type NewsComment = {
  id: string;
  article_slug: string;
  author_name: string;
  body: string;
  created_at: string;
  editable_until?: string;
  updated_at?: string;
};

type CommentOwnership = {
  token: string;
  editableUntil: string;
};

type NewsCommentCreateResponse = NewsComment & {
  owner_token: string;
  comment_count: number;
};

type NewsCommentsChangedDetail = {
  articleSlug: string;
  commentCount: number;
  newComment?: NewsComment;
  ownership?: CommentOwnership;
};

function ownershipKey(commentId: string) {
  return `${OWNERSHIP_STORAGE_PREFIX}${commentId}`;
}

function saveOwnership(commentId: string, ownership: CommentOwnership) {
  localStorage.setItem(ownershipKey(commentId), JSON.stringify(ownership));
}

function readOwnership(commentId: string): CommentOwnership | null {
  try {
    const raw = localStorage.getItem(ownershipKey(commentId));
    if (!raw) return null;
    const ownership = JSON.parse(raw) as CommentOwnership;
    if (!ownership.token || !ownership.editableUntil || Date.parse(ownership.editableUntil) <= Date.now()) {
      localStorage.removeItem(ownershipKey(commentId));
      return null;
    }
    return ownership;
  } catch {
    return null;
  }
}

function commentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function timeRemaining(editableUntil: string, now: number) {
  const remaining = Math.max(0, Date.parse(editableUntil) - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function dispatchCommentsChanged(detail: NewsCommentsChangedDetail) {
  window.dispatchEvent(new CustomEvent<NewsCommentsChangedDetail>(NEWS_COMMENTS_CHANGED_EVENT, { detail }));
}

export function NewsCommentForm({ articleSlug }: { articleSlug: string }) {
  const [isPosting, setIsPosting] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = body.trim();
    if (!message || isPosting) return;

    setIsPosting(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/news/${encodeURIComponent(articleSlug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: authorName.trim() || "Reader", body: message }),
      });
      if (!response.ok) throw new Error("Could not post comment");

      const comment = (await response.json()) as NewsCommentCreateResponse;
      const ownership = { token: comment.owner_token, editableUntil: comment.editable_until || "" };
      if (!comment.id || !ownership.editableUntil) throw new Error("Could not secure comment ownership");

      saveOwnership(comment.id, ownership);
      setBody("");
      dispatchCommentsChanged({ articleSlug, commentCount: comment.comment_count, newComment: comment, ownership });
    } catch {
      setError("Your comment could not be posted. Please try again.");
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <section aria-labelledby="leave-comment" className="border-t-2 border-[#242424] pt-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#bb432a]">Community</p>
      <h2 id="leave-comment" className="mt-1 font-serif text-2xl font-bold text-[#242424]">Join the conversation</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">Post anonymously. You can edit or delete your comment for 2 minutes.</p>
      <form onSubmit={submitComment} className="mt-4 space-y-3">
        <input
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          maxLength={80}
          placeholder="Your name (optional)"
          className="h-9 w-full border border-stone-300 bg-white px-3 text-sm text-[#242424] outline-none placeholder:text-stone-400 focus:border-[#bb432a]"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          required
          rows={4}
          placeholder="Share your thoughts…"
          className="w-full resize-none border border-stone-300 bg-white px-3 py-2 text-sm leading-relaxed text-[#242424] outline-none placeholder:text-stone-400 focus:border-[#bb432a]"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-stone-500">{body.length}/2000</span>
          <button type="submit" disabled={!body.trim() || isPosting} className="inline-flex h-9 items-center gap-2 bg-[#242424] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#bb432a] disabled:cursor-not-allowed disabled:bg-stone-300">
            {isPosting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            {isPosting ? "Posting" : "Post comment"}
          </button>
        </div>
        {error ? <p role="alert" className="text-xs text-[#bb432a]">{error}</p> : null}
      </form>
    </section>
  );
}

export function ArticleComments({ articleTitle, articleSlug }: { articleTitle: string; articleSlug: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<NewsComment[]>([]);
  const [ownershipByComment, setOwnershipByComment] = useState<Record<string, CommentOwnership>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const showComments = () => setOpen(true);
    const handleCommentsChanged = (event: Event) => {
      const detail = (event as CustomEvent<NewsCommentsChangedDetail>).detail;
      if (!detail || detail.articleSlug !== articleSlug || !detail.newComment) return;

      setComments((current) => [detail.newComment!, ...current.filter((comment) => comment.id !== detail.newComment!.id)]);
      if (detail.ownership) {
        setOwnershipByComment((current) => ({ ...current, [detail.newComment!.id]: detail.ownership! }));
      }
      setOpen(true);
      setError("");
    };

    window.addEventListener(OPEN_COMMENTS_EVENT, showComments);
    window.addEventListener(NEWS_COMMENTS_CHANGED_EVENT, handleCommentsChanged);
    return () => {
      window.removeEventListener(OPEN_COMMENTS_EVENT, showComments);
      window.removeEventListener(NEWS_COMMENTS_CHANGED_EVENT, handleCommentsChanged);
    };
  }, [articleSlug]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let isCurrent = true;
    async function loadComments() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_URL}/news/${encodeURIComponent(articleSlug)}/comments`, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load comments");
        const data = (await response.json()) as NewsComment[];
        if (!isCurrent) return;

        setComments(data);
        setOwnershipByComment(
          data.reduce<Record<string, CommentOwnership>>((owned, comment) => {
            const ownership = readOwnership(comment.id);
            if (ownership) owned[comment.id] = ownership;
            return owned;
          }, {}),
        );
      } catch {
        if (isCurrent) setError("Comments could not be loaded. Please try again.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadComments();
    return () => {
      isCurrent = false;
    };
  }, [articleSlug, open]);

  useEffect(() => {
    if (!open) return;
    const updateClock = () => setNow(Date.now());
    const initial = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 1_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [open]);

  function canManage(comment: NewsComment) {
    const ownership = ownershipByComment[comment.id];
    const expiry = ownership?.editableUntil || comment.editable_until;
    return Boolean(now && ownership && expiry && Date.parse(expiry) > now);
  }

  function editComment(comment: NewsComment) {
    setEditingId(comment.id);
    setEditingBody(comment.body);
    setError("");
  }

  async function saveComment(comment: NewsComment) {
    const body = editingBody.trim();
    const ownership = ownershipByComment[comment.id];
    if (!body || !ownership || isSavingId) return;

    setIsSavingId(comment.id);
    setError("");
    try {
      const response = await fetch(`${API_URL}/news/${encodeURIComponent(articleSlug)}/comments/${encodeURIComponent(comment.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Comment-Token": ownership.token },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) throw new Error("Could not update comment");
      const updated = (await response.json()) as NewsComment;
      setComments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingId(null);
    } catch {
      setError("Your comment could not be updated. The edit window may have ended.");
    } finally {
      setIsSavingId(null);
    }
  }

  async function deleteComment(comment: NewsComment) {
    const ownership = ownershipByComment[comment.id];
    if (!ownership || isDeletingId || !window.confirm("Delete your comment? This cannot be undone.")) return;

    setIsDeletingId(comment.id);
    setError("");
    try {
      const response = await fetch(`${API_URL}/news/${encodeURIComponent(articleSlug)}/comments/${encodeURIComponent(comment.id)}`, {
        method: "DELETE",
        headers: { "X-Comment-Token": ownership.token },
      });
      if (!response.ok) throw new Error("Could not delete comment");
      const result = (await response.json()) as { comment_count: number };
      localStorage.removeItem(ownershipKey(comment.id));
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setOwnershipByComment((current) => {
        const next = { ...current };
        delete next[comment.id];
        return next;
      });
      dispatchCommentsChanged({ articleSlug, commentCount: result.comment_count });
    } catch {
      setError("Your comment could not be deleted. The edit window may have ended.");
    } finally {
      setIsDeletingId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label="Close comments" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />
      <aside role="dialog" aria-modal="true" aria-labelledby="comments-heading" className="absolute bottom-0 right-0 top-0 flex w-full max-w-[25rem] flex-col border-l border-stone-300 bg-[#faf9f6] shadow-2xl">
        <header className="flex items-center justify-between border-b-2 border-[#242424] bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#bb432a]">Community</p>
            <h2 id="comments-heading" className="mt-0.5 text-xl font-bold text-[#242424]">Comments</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full border border-stone-300 text-stone-600 transition-colors hover:border-[#bb432a] hover:text-[#bb432a]" aria-label="Close comments"><X className="size-4" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <p className="line-clamp-2 border-b border-stone-200 pb-4 text-sm font-medium leading-snug text-stone-600">{articleTitle}</p>
          {error ? (
            <p role="alert" className="mt-8 text-center text-sm leading-relaxed text-[#bb432a]">{error}</p>
          ) : isLoading ? (
            <div className="mt-12 grid place-items-center text-sm text-stone-500"><LoaderCircle className="size-5 animate-spin text-[#bb432a]" /></div>
          ) : comments.length ? (
            <div className="divide-y divide-stone-200">
              {comments.map((comment) => {
                const isMine = canManage(comment);
                const ownership = ownershipByComment[comment.id];
                const isEditing = editingId === comment.id;
                return (
                  <article key={comment.id} className="py-5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#242424] text-xs font-bold uppercase text-white">{comment.author_name.charAt(0)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <h3 className="text-sm font-bold text-[#242424]">{comment.author_name}</h3>
                          <time className="text-[11px] text-stone-500">{commentDate(comment.created_at)}</time>
                          {comment.updated_at ? <span className="text-[11px] text-stone-400">Edited</span> : null}
                        </div>
                        {isEditing ? (
                          <div className="mt-3">
                            <textarea value={editingBody} onChange={(event) => setEditingBody(event.target.value)} maxLength={2000} rows={3} className="w-full resize-none border border-stone-300 bg-white px-3 py-2 text-sm leading-relaxed text-[#242424] outline-none focus:border-[#bb432a]" />
                            <div className="mt-2 flex items-center gap-3">
                              <button type="button" onClick={() => void saveComment(comment)} disabled={!editingBody.trim() || isSavingId === comment.id} className="inline-flex h-8 items-center gap-1.5 bg-[#242424] px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white disabled:bg-stone-300">
                                {isSavingId === comment.id ? <LoaderCircle className="size-3 animate-spin" /> : null}{isSavingId === comment.id ? "Saving" : "Save"}
                              </button>
                              <button type="button" onClick={() => setEditingId(null)} className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500 hover:text-[#bb432a]">Cancel</button>
                            </div>
                          </div>
                        ) : <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{comment.body}</p>}
                        {isMine && ownership ? (
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                            <span className="text-[11px] font-medium text-stone-500">Edit/delete for {timeRemaining(ownership.editableUntil, now)}</span>
                            {!isEditing ? <button type="button" onClick={() => editComment(comment)} className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500 hover:text-[#bb432a]"><Pencil className="size-3" />Edit</button> : null}
                            <button type="button" onClick={() => void deleteComment(comment)} disabled={isDeletingId === comment.id} className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500 hover:text-[#bb432a] disabled:text-stone-300">
                              {isDeletingId === comment.id ? <LoaderCircle className="size-3 animate-spin" /> : <Trash2 className="size-3" />}{isDeletingId === comment.id ? "Deleting" : "Delete"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-12 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full border border-stone-300 bg-white text-[#bb432a]"><MessageCircle className="size-5" /></div>
              <h3 className="mt-4 text-lg font-bold text-[#242424]">Start the conversation</h3>
              <p className="mx-auto mt-2 max-w-[17rem] text-sm leading-relaxed text-stone-500">Be the first reader to add a comment.</p>
            </div>
          )}
        </div>

        <footer className="border-t border-stone-200 bg-white px-5 py-4 text-xs leading-relaxed text-stone-500">Add a comment from the conversation box beside the latest news.</footer>
      </aside>
    </div>
  );
}
