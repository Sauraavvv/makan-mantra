"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders an assistant reply.
 *
 * The model answers with real markdown — tables of localities and prices,
 * bullet lists, bold figures — so it is parsed rather than printed raw. GFM is
 * on for tables specifically; without it a price table arrives as pipe soup.
 *
 * Every element is styled explicitly because the app ships no prose defaults,
 * and the widget has its own dark theme to satisfy.
 */
export function ChatMarkdown({ children }: { children: string }) {
  return (
    <div className="text-[13px] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-slate-950 mmdark:text-zinc-50">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,

          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="marker:text-saffron">{children}</li>,

          h1: ({ children }) => <h4 className="mb-1.5 mt-2.5 text-[13px] font-bold">{children}</h4>,
          h2: ({ children }) => <h4 className="mb-1.5 mt-2.5 text-[13px] font-bold">{children}</h4>,
          h3: ({ children }) => <h5 className="mb-1 mt-2.5 text-xs font-bold">{children}</h5>,

          a: ({ href, children }) => (
            <a href={href} className="font-semibold text-saffron underline underline-offset-2">
              {children}
            </a>
          ),

          // A wide price table must scroll inside the bubble; letting it push
          // the bubble wider would break the whole message column.
          table: ({ children }) => (
            <div className="my-3 -mx-1 overflow-x-auto">
              <table className="w-full min-w-[300px] border-collapse text-[11px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-slate-200 mmdark:border-zinc-700">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1.5 text-left font-bold text-slate-900 mmdark:text-zinc-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-slate-100 px-2 py-1.5 align-top mmdark:border-zinc-800">
              {children}
            </td>
          ),

          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] mmdark:bg-zinc-800">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs mmdark:bg-zinc-900">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-saffron/50 pl-3 text-slate-600 mmdark:text-zinc-400">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-slate-200 mmdark:border-zinc-800" />,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
