"use client";

import { type ReactNode } from "react";

type Props = {
  index: 1 | 2 | 3;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function Screen({ index, title, subtitle, children }: Props) {
  return (
    <section className="border-t border-neutral-300 py-16">
      <div className="mb-10 flex items-baseline gap-4">
        <span className="text-xs uppercase tracking-[0.2em] text-neutral-400 tabular-nums">
          Screen {index} of 3
        </span>
      </div>
      <h2 className="text-2xl font-serif">{title}</h2>
      <p className="mt-1 mb-10 text-neutral-500 italic">{subtitle}</p>
      <div className="flex flex-col gap-14">{children}</div>
    </section>
  );
}
