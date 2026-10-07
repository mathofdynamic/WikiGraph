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
            <h1 dir="auto" className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)] mt-6 mb-3 pb-2 border-b border-[var(--separator)]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 dir="auto" className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--foreground)] mt-5 mb-2.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 dir="auto" className="text-sm sm:text-base font-medium text-[var(--foreground)] mt-4 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 dir="auto" className="text-xs sm:text-sm font-medium text-[var(--foreground)] mt-3 mb-1.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p dir="auto" className="mb-3 text-[13px] sm:text-sm leading-relaxed text-[var(--foreground)]">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-3 text-[13px] sm:text-sm ps-2 text-[var(--foreground)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-3 text-[13px] sm:text-sm ps-2 text-[var(--foreground)]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li dir="auto" className="leading-relaxed">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote
              dir="auto"
              className="border-s-2 border-[var(--accent)] ps-3.5 my-3 text-[var(--muted)] bg-[var(--surface-secondary)]/50 py-2 rounded-e text-xs border-y border-e border-[var(--border)]"
            >
              {children}
            </blockquote>
          ),
          code: ({ children, className: codeClass }) => {
            const isInline = !codeClass;
            return isInline ? (
              <code dir="ltr" className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--foreground)] text-xs font-mono border border-[var(--border)] inline-block text-left">
                {children}
              </code>
            ) : (
              <pre dir="ltr" className="p-3.5 rounded-lg bg-[var(--field-background)] text-[var(--field-foreground)] text-xs font-mono overflow-x-auto my-3 border border-[var(--border)] text-left">
                <code dir="ltr" className="text-left">{children}</code>
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
