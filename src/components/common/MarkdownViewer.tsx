import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Image, Copy, Check, Hash } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
  className?: string;
  skipFirstH1?: boolean;
  highlightText?: string | null;
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\t\n]+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '');
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  className = '',
  skipFirstH1 = false,
  highlightText = null,
}) => {
  let hasSkippedH1 = false;

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
          h1: ({ children }) => {
            if (skipFirstH1 && !hasSkippedH1) {
              hasSkippedH1 = true;
              return null;
            }
            const rawText = String(children || '');
            const id = slugifyHeading(rawText);
            return (
              <h1
                id={id}
                dir="auto"
                className="group relative text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)] mt-8 mb-3 pb-2 border-b border-[var(--separator)] scroll-mt-24"
              >
                <a
                  href={`#${id}`}
                  className="inline-flex items-center gap-1.5 hover:text-[var(--accent)] text-inherit no-underline"
                >
                  <span>{children}</span>
                  <Hash className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity text-[var(--muted)]" />
                </a>
              </h1>
            );
          },
          h2: ({ children }) => {
            const rawText = String(children || '');
            const id = slugifyHeading(rawText);
            return (
              <h2
                id={id}
                dir="auto"
                className="group relative text-lg sm:text-xl font-semibold tracking-tight text-[var(--foreground)] mt-6 mb-2.5 scroll-mt-24"
              >
                <a
                  href={`#${id}`}
                  className="inline-flex items-center gap-1.5 hover:text-[var(--accent)] text-inherit no-underline"
                >
                  <span>{children}</span>
                  <Hash className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity text-[var(--muted)]" />
                </a>
              </h2>
            );
          },
          h3: ({ children }) => {
            const rawText = String(children || '');
            const id = slugifyHeading(rawText);
            return (
              <h3
                id={id}
                dir="auto"
                className="group relative text-sm sm:text-base font-medium text-[var(--foreground)] mt-5 mb-2 scroll-mt-24"
              >
                <a
                  href={`#${id}`}
                  className="inline-flex items-center gap-1.5 hover:text-[var(--accent)] text-inherit no-underline"
                >
                  <span>{children}</span>
                  <Hash className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity text-[var(--muted)]" />
                </a>
              </h3>
            );
          },
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
              className="border-s-2 border-[var(--accent)] ps-3.5 pe-3.5 my-3 text-[var(--muted)] bg-[var(--surface-secondary)]/50 py-2.5 rounded-e-md text-xs border-y border-e border-[var(--border)]"
            >
              {children}
            </blockquote>
          ),
          code: ({ children, className: codeClass }) => {
            const isInline = !codeClass;
            const codeString = String(children || '').replace(/\n$/, '');

            if (isInline) {
              return (
                <code dir="ltr" className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--foreground)] text-xs font-mono border border-[var(--border)] inline text-left">
                  {children}
                </code>
              );
            }

            return <CodeBlock code={codeString} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div dir="ltr" className="relative group my-3 rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--field-background)]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--surface-secondary)]/60 border-b border-[var(--border)] text-[11px] font-mono text-[var(--muted)]">
        <span>code</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--foreground)] cursor-pointer transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[var(--accent)]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-[var(--field-foreground)] text-xs font-mono overflow-x-auto text-left leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};
