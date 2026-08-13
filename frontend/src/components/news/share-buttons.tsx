"use client";

import { AtSign, Check, Copy, MessageCircle, Send, Share2 } from "lucide-react";
import { useState } from "react";

const buttonClass =
  "inline-flex size-10 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition-colors hover:border-saffron hover:bg-saffron/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron";

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : window.location.href;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const channels = [
    { label: "Share on WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, Icon: MessageCircle },
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, Icon: Share2 },
    { label: "Share on X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, Icon: AtSign },
    { label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, Icon: Send },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 hidden text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground sm:inline">Share</span>
      {channels.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={buttonClass}>
          <Icon className="size-[17px]" aria-hidden="true" />
        </a>
      ))}
      <button type="button" aria-label="Copy article link" title="Copy article link" onClick={copyLink} className={buttonClass}>
        {copied ? <Check className="size-[17px] text-saffron" aria-hidden="true" /> : <Copy className="size-[17px]" aria-hidden="true" />}
      </button>
    </div>
  );
}
