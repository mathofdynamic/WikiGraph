import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Image } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = '' }) => {
  return (
    <div
      dir="auto"
      className={`prose max-w-none text-[var(--foreground)] leading-relaxed font-sans ${className}`}
    >
      <ReactMarkdown
        components={{
          img: ({ alt, src }) => (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] text-xs text-[var(--muted)] my-2 select-none">
              <Image className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
              <span>[Sanitized Image: {alt || src || 'Resource Blocked'}]</span>
            </span>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)] mt-6 mb-3 pb-2 border-b border-[var(--separator)]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--foreground)] mt-5 mb-2.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base font-medium text-[var(--foreground)] mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3 text-[13px] sm:text-sm leading-relaxed text-[var(--foreground)]">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-3 text-[13px] sm:text-sm pl-2 text-[var(--foreground)]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-3 text-[13px] sm:text-sm pl-2 text-[var(--foreground)]">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[var(--accent)] rtl:border-l-0 rtl:border-r-2 rtl:border-[var(--accent)] ps-3.5 my-3 text-[var(--muted)] bg-[var(--surface-secondary)]/50 py-2 rounded-r rtl:rounded-r-none rtl:rounded-l text-xs border-y border-r rtl:border-r-0 rtl:border-l border-[var(--border)]">
              {children}
            </blockquote>
          ),
          code: ({ children, className: codeClass }) => {
            const isInline = !codeClass;
            return isInline ? (
              <code className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--foreground)] text-xs font-mono border border-[var(--border)]">
                {children}
              </code>
            ) : (
              <pre className="p-3.5 rounded-lg bg-[var(--field-background)] text-[var(--field-foreground)] text-xs font-mono overflow-x-auto my-3 border border-[var(--border)]">
                <code>{children}</code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
