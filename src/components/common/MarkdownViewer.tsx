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
      className={`prose max-w-none text-[#d0d6e0] leading-relaxed font-sans ${className}`}
    >
      <ReactMarkdown
        components={{
          // Sanitize images to prevent automatic remote network requests
          img: ({ alt, src }) => (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-[#23252a] bg-[#0f1011] text-xs text-[#8a8f98] my-2 select-none">
              <Image className="w-3.5 h-3.5 shrink-0 text-[#8a8f98]" />
              <span>[Sanitized Image: {alt || src || 'Resource Blocked'}]</span>
            </span>
          ),
          // Clean typography for headers with Linear scale and negative tracking
          h1: ({ children }) => (
            <h1 className="text-xl sm:text-2xl font-semibold tracking-title text-[#f7f8f8] mt-6 mb-3 pb-2 border-b border-[#23252a]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg sm:text-xl font-medium tracking-card-title text-[#f7f8f8] mt-5 mb-2.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base font-medium tracking-card-title text-[#f7f8f8] mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3 text-xs sm:text-sm leading-relaxed text-[#d0d6e0]">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-3 text-xs sm:text-sm pl-2 text-[#d0d6e0]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-3 text-xs sm:text-sm pl-2 text-[#d0d6e0]">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#5e6ad2] rtl:border-l-0 rtl:border-r-2 rtl:border-[#5e6ad2] pl-3.5 rtl:pl-0 rtl:pr-3.5 my-3 text-[#8a8f98] bg-[#0f1011] py-2 rounded-r rtl:rounded-r-none rtl:rounded-l text-xs border-y border-r border-[#23252a]">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="px-1.5 py-0.5 rounded bg-[#141516] text-[#f7f8f8] text-xs font-medium border border-[#23252a]">
                {children}
              </code>
            ) : (
              <pre className="p-3.5 rounded-lg bg-[#0a0a0b] text-[#f7f8f8] text-xs font-normal overflow-x-auto my-3 border border-[#23252a]">
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
