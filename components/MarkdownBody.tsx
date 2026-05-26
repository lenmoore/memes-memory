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
          p: ({ children: pChildren }) => (
            <p className="mb-4 last:mb-0">{pChildren}</p>
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
