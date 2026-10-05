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
      className={`prose max-w-none text-zinc-300 leading-relaxed font-sans ${className}`}
    >
      <ReactMarkdown
        components={{
          // Sanitize images to prevent automatic remote network requests
          img: ({ alt, src }) => (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-zinc-800 bg-zinc-900 text-xs text-zinc-400 my-2 select-none">
              <Image className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
              <span>[Sanitized Image: {alt || src || 'Resource Blocked'}]</span>
            </span>
          ),
          // Clean typography for headers
          h1: ({ children }) => (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 mt-6 mb-3 pb-2 border-b border-zinc-800">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-100 mt-5 mb-2.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base font-medium text-zinc-200 mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3 text-xs sm:text-sm leading-relaxed text-zinc-300">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-3 text-xs sm:text-sm pl-2 text-zinc-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-3 text-xs sm:text-sm pl-2 text-zinc-300">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-blue-500 rtl:border-l-0 rtl:border-r-2 rtl:border-blue-500 pl-3.5 rtl:pl-0 rtl:pr-3.5 my-3 text-zinc-400 bg-zinc-900/60 py-2 rounded-r rtl:rounded-r-none rtl:rounded-l text-xs border-y border-r border-zinc-800">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-700/60 font-mono">
                {children}
              </code>
            ) : (
              <pre className="p-3.5 rounded-lg bg-zinc-950 text-zinc-200 text-xs font-mono overflow-x-auto my-3 border border-zinc-800">
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
