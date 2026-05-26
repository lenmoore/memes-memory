"use client";

type Props = {
  activeScreen: 1 | 2 | 3;
  onScreenChange: (screen: 1 | 2 | 3) => void;
};

const SCREEN_NAMES: Record<1 | 2 | 3, string> = {
  1: "Vernacular foundation",
  2: "Critical theory",
  3: "Infrastructure",
};

export default function ScreenSlidePanel({
  activeScreen,
  onScreenChange,
}: Props) {
  function goPrev() {
    if (activeScreen > 1) onScreenChange((activeScreen - 1) as 1 | 2 | 3);
  }

  function goNext() {
    if (activeScreen < 3) onScreenChange((activeScreen + 1) as 1 | 2 | 3);
  }

  return (
    <nav
      className="sticky top-0 z-10 -mx-6 mb-10 border-y border-neutral-300 bg-white/95 px-6 py-4 backdrop-blur-sm"
      aria-label="Screen navigation"
    >
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={activeScreen === 1}
          className="text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:hover:text-neutral-600"
        >
          ← previous
        </button>

        <div className="flex items-center gap-2">
          {([1, 2, 3] as const).map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onScreenChange(num)}
              aria-current={activeScreen === num ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-xs tabular-nums transition-colors ${
                activeScreen === num
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={activeScreen === 3}
          className="text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:hover:text-neutral-600"
        >
          next →
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-neutral-500">
        Screen {activeScreen} of 3 — {SCREEN_NAMES[activeScreen]}
      </p>
    </nav>
  );
}
