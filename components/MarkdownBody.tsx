"use client";

import ReactMarkdown from "react-markdown";

type Props = {
  children: string;
  className?: string;
};

export default function MarkdownBody({ children, className = "" }: Props) {
  if (!children) return null;

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          h1: ({ children: hChildren }) => (
            <h1 className="mb-4 mt-8 font-serif text-2xl tracking-tight first:mt-0">
              {hChildren}
            </h1>
          ),
          h2: ({ children: hChildren }) => (
            <h2 className="mb-3 mt-8 font-serif text-xl tracking-tight first:mt-0">
              {hChildren}
            </h2>
          ),
          h3: ({ children: hChildren }) => (
            <h3 className="mb-2 mt-6 font-serif text-lg tracking-tight first:mt-0">
              {hChildren}
            </h3>
          ),
          p: ({ children: pChildren }) => (
            <p className="mb-4 last:mb-0">{pChildren}</p>
          ),
          ul: ({ children: uChildren }) => (
            <ul className="mb-4 list-disc space-y-1 pl-5 last:mb-0">{uChildren}</ul>
          ),
          ol: ({ children: oChildren }) => (
            <ol className="mb-4 list-decimal space-y-1 pl-5 last:mb-0">{oChildren}</ol>
          ),
          li: ({ children: lChildren }) => <li>{lChildren}</li>,
          a: ({ href, children: aChildren }) => (
            <a
              href={href}
              className="text-neutral-900 underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {aChildren}
            </a>
          ),
          strong: ({ children: sChildren }) => (
            <strong className="font-semibold">{sChildren}</strong>
          ),
          em: ({ children: eChildren }) => (
            <em className="italic">{eChildren}</em>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
