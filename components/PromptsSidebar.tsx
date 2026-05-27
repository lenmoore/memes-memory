import Link from "next/link";
import { LENSES, type Lens, type Screen } from "@/lib/lenses/registry";

const SCREEN_LABELS: Record<Screen, string> = {
  1: "Screen 1",
  2: "Screen 2",
  3: "Screen 3",
};

function lensesForScreen(screen: Screen): Lens[] {
  return LENSES.filter((l) => l.screen === screen).sort(
    (a, b) => a.order - b.order,
  );
}

type Props = {
  activeLensId: string;
};

export default function PromptsSidebar({ activeLensId }: Props) {
  return (
    <aside className="w-52 shrink-0">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-4">
        Lenses
      </p>
      <nav aria-label="Lens prompts">
        {([1, 2, 3] as const).map((screen) => (
          <div key={screen} className="mb-6">
            <p className="text-xs text-neutral-500 mb-2">
              {SCREEN_LABELS[screen]}
            </p>
            <ul className="flex flex-col gap-1">
              {lensesForScreen(screen).map((lens) => {
                const active = lens.id === activeLensId;
                return (
                  <li key={lens.id}>
                    <Link
                      href={`/prompts/${lens.id}`}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "block text-sm text-neutral-900 border-l-2 border-neutral-800 pl-2 -ml-0.5"
                          : "block text-sm text-neutral-500 hover:text-neutral-900 pl-2 border-l-2 border-transparent"
                      }
                    >
                      {lens.displayName}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
