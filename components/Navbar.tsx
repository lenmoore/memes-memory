"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Analyze" },
  { href: "/prompts", label: "Lens prompts", matchPrefix: "/prompts" },
] as const;

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="border-b border-neutral-200 bg-white"
    >
      <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-6 px-6 py-4">
        <Link
          href="/"
          className="font-serif text-lg tracking-tight text-neutral-900 hover:text-neutral-600"
        >
          Memes as stained glass
        </Link>
        <ul className="flex items-baseline gap-6 text-sm">
          {LINKS.map(({ href, label, ...rest }) => {
            const matchPrefix =
              "matchPrefix" in rest ? rest.matchPrefix : undefined;
            const active = matchPrefix
              ? pathname === matchPrefix || pathname.startsWith(`${matchPrefix}/`)
              : pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "text-neutral-900 underline underline-offset-4"
                      : "text-neutral-500 hover:text-neutral-900"
                  }
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
