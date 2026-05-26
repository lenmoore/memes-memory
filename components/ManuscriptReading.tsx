"use client";

import { flowLayout, type FlowResult } from "pretext-flow";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildReadingFlow,
  EMBED_SETTLE_MS,
  truncateFlowText,
  TYPEWRITER_CHARS_PER_SECOND,
  visualEmbedFrame,
} from "@/lib/manuscript/readingFlow";
import type { LensReading } from "@/lib/lenses/reading";

type Props = {
  reading: LensReading;
  onSettled?: () => void;
};

type ImageState = {
  status: "idle" | "loading" | "done" | "skipped" | "error";
  url: string | null;
};

type EmbedPhase = "loading" | "visible" | "inFlow";

const MIN_COLUMN_WIDTH = 320;

function runFlowLayout(
  flowInput: ReturnType<typeof buildReadingFlow>,
  columnWidth: number,
  text: string,
  embedIds: Set<string>,
): FlowResult | null {
  if (!text.trim() && embedIds.size === 0) return null;

  const embeds = flowInput.embeds.filter((embed) => embedIds.has(embed.id));
  return flowLayout({
    text,
    font: flowInput.font,
    width: columnWidth,
    lineHeight: flowInput.lineHeight,
    embeds,
    paragraphGap: flowInput.paragraphGap,
  });
}

function computeContainerHeight(
  layouts: Array<FlowResult | null>,
  flowInput: ReturnType<typeof buildReadingFlow>,
  sideById: Map<string, "left" | "right">,
  embedPhases: Record<string, EmbedPhase>,
): number {
  let height = 120;

  for (const layout of layouts) {
    if (layout) height = Math.max(height, layout.height);
  }

  for (const embed of flowInput.embeds) {
    const phase = embedPhases[embed.id];
    if (phase !== "visible" && phase !== "inFlow") continue;

    for (const layout of layouts) {
      const resolved = layout?.embeds.find((item) => item.id === embed.id);
      if (!resolved) continue;
      const side = sideById.get(embed.id) ?? "left";
      const frame = visualEmbedFrame(side, resolved.rect);
      height = Math.max(height, frame.top + frame.height);
    }
  }

  return height;
}

export default function ManuscriptReading({ reading, onSettled }: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState(640);
  const [revealedChars, setRevealedChars] = useState(0);
  const [images, setImages] = useState<Record<string, ImageState>>({});
  const [embedPhases, setEmbedPhases] = useState<Record<string, EmbedPhase>>(
    {},
  );
  const settleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const settledRef = useRef(false);

  const flowInput = useMemo(() => buildReadingFlow(reading), [reading]);
  const fullTextLength = flowInput.text.length;
  const typewriterDone = revealedChars >= fullTextLength;
  const allEmbedIds = useMemo(
    () => new Set(flowInput.embeds.map((embed) => embed.id)),
    [flowInput.embeds],
  );

  useEffect(() => {
    settledRef.current = false;
  }, [reading]);

  useEffect(() => {
    const node = measureRef.current;
    if (!node) return;

    const measure = () => {
      const next = node.clientWidth;
      if (next > 0) setColumnWidth(Math.max(MIN_COLUMN_WIDTH, next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setRevealedChars(0);
    setEmbedPhases({});
    setImages({});

    for (const timer of settleTimersRef.current.values()) {
      clearTimeout(timer);
    }
    settleTimersRef.current.clear();
  }, [reading]);

  useEffect(() => {
    if (fullTextLength === 0) return;

    let raf = 0;
    let revealed = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      revealed = Math.min(
        fullTextLength,
        revealed +
          Math.max(
            1,
            Math.round((delta / 1000) * TYPEWRITER_CHARS_PER_SECOND),
          ),
      );
      setRevealedChars(revealed);
      if (revealed < fullTextLength) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fullTextLength, reading]);

  useEffect(() => {
    let cancelled = false;
    const next: Record<string, ImageState> = {};
    const phases: Record<string, EmbedPhase> = {};

    for (const artifact of flowInput.artifacts) {
      next[artifact.id] = { status: "loading", url: null };
      phases[artifact.id] = "loading";
    }
    setImages(next);
    setEmbedPhases(phases);

    for (const artifact of flowInput.artifacts) {
      (async () => {
        try {
          const res = await fetch("/api/generate/artifact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: artifact.description }),
          });
          if (cancelled) return;
          if (res.status === 503) {
            setImages((prev) => ({
              ...prev,
              [artifact.id]: { status: "skipped", url: null },
            }));
            setEmbedPhases((prev) => ({
              ...prev,
              [artifact.id]: "inFlow",
            }));
            return;
          }
          if (!res.ok) {
            setImages((prev) => ({
              ...prev,
              [artifact.id]: { status: "error", url: null },
            }));
            return;
          }
          const data = (await res.json()) as { url?: string };
          if (!data.url) {
            setImages((prev) => ({
              ...prev,
              [artifact.id]: { status: "error", url: null },
            }));
            return;
          }

          setImages((prev) => ({
            ...prev,
            [artifact.id]: { status: "done", url: data.url ?? null },
          }));
          setEmbedPhases((prev) => ({
            ...prev,
            [artifact.id]: "visible",
          }));

          const timer = setTimeout(() => {
            if (cancelled) return;
            setEmbedPhases((prev) => ({
              ...prev,
              [artifact.id]: "inFlow",
            }));
            settleTimersRef.current.delete(artifact.id);
          }, EMBED_SETTLE_MS);
          settleTimersRef.current.set(artifact.id, timer);
        } catch {
          if (!cancelled) {
            setImages((prev) => ({
              ...prev,
              [artifact.id]: { status: "error", url: null },
            }));
          }
        }
      })();
    }

    return () => {
      cancelled = true;
      for (const timer of settleTimersRef.current.values()) {
        clearTimeout(timer);
      }
      settleTimersRef.current.clear();
    };
  }, [flowInput.artifacts, reading]);

  const revealedText = useMemo(
    () => truncateFlowText(flowInput.text, revealedChars),
    [flowInput.text, revealedChars],
  );

  const inFlowEmbedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const artifact of flowInput.artifacts) {
      if (embedPhases[artifact.id] === "inFlow") ids.add(artifact.id);
    }
    return ids;
  }, [embedPhases, flowInput.artifacts]);

  const finalLayout = useMemo(
    () => runFlowLayout(flowInput, columnWidth, flowInput.text, allEmbedIds),
    [flowInput, columnWidth, allEmbedIds],
  );

  const textLayout = useMemo(
    () => runFlowLayout(flowInput, columnWidth, revealedText, inFlowEmbedIds),
    [flowInput, columnWidth, revealedText, inFlowEmbedIds],
  );

  const sideById = useMemo(() => {
    const map = new Map<string, "left" | "right">();
    for (const artifact of flowInput.artifacts) {
      map.set(artifact.id, artifact.side);
    }
    return map;
  }, [flowInput.artifacts]);

  const layoutHeight = useMemo(
    () =>
      computeContainerHeight(
        [textLayout, finalLayout],
        flowInput,
        sideById,
        embedPhases,
      ),
    [textLayout, finalLayout, flowInput, sideById, embedPhases],
  );

  const embedsSettled =
    flowInput.embeds.length === 0 ||
    flowInput.embeds.every((embed) => {
      const phase = embedPhases[embed.id];
      const image = images[embed.id];
      return (
        phase === "inFlow" ||
        image?.status === "skipped" ||
        image?.status === "error"
      );
    });

  const animationSettled = typewriterDone && embedsSettled;
  const allowReflowTransition = animationSettled;

  useEffect(() => {
    if (!animationSettled || settledRef.current) return;
    settledRef.current = true;
    onSettled?.();
  }, [animationSettled, onSettled]);

  const showCaret =
    !typewriterDone &&
    revealedText.length > 0 &&
    revealedText.length < fullTextLength;

  return (
    <div className="manuscript-reading relative overflow-visible -mx-20 px-20">
      <div ref={measureRef} className="h-0 w-full" aria-hidden="true" />

      <div
        className="relative"
        style={{ height: layoutHeight, minHeight: layoutHeight }}
      >
        {textLayout?.lines.map((line) => (
          <span
            key={`${line.y}:${line.x}:${line.text}`}
            className={`absolute z-20 block text-neutral-900 ${
              allowReflowTransition
                ? "transition-[top,left,width] duration-500 ease-out"
                : ""
            } ${flowInput.boldLines.has(line.text.trim()) ? "font-semibold" : ""}`}
            style={{
              font: flowInput.font,
              lineHeight: `${flowInput.lineHeight}px`,
              left: line.x,
              top: line.y,
              width: line.width,
            }}
          >
            {line.text}
          </span>
        ))}

        {showCaret && textLayout && textLayout.lines.length > 0 && (
          <span
            aria-hidden="true"
            className="absolute z-20 inline-block h-[1.1em] w-[2px] animate-pulse bg-neutral-700"
            style={{
              left:
                (textLayout.lines[textLayout.lines.length - 1]?.x ?? 0) +
                (textLayout.lines[textLayout.lines.length - 1]?.width ?? 0),
              top: textLayout.lines[textLayout.lines.length - 1]?.y ?? 0,
            }}
          />
        )}

        {flowInput.embeds.map((embed) => {
          const phase = embedPhases[embed.id] ?? "loading";
          const image = images[embed.id];
          const side = sideById.get(embed.id) ?? "left";
          const inFlow = phase === "inFlow";
          const visible = phase === "visible" || inFlow;

          const rectSource = inFlow
            ? textLayout?.embeds.find((item) => item.id === embed.id)
            : finalLayout?.embeds.find((item) => item.id === embed.id);

          if (!rectSource || !visible) return null;

          const frame = visualEmbedFrame(side, rectSource.rect);

          return (
            <div
              key={embed.id}
              className={`absolute z-10 pointer-events-none manuscript-artifact-enter ${
                inFlow && allowReflowTransition
                  ? "transition-[top,left,width] duration-500 ease-out"
                  : ""
              }`}
              style={{
                left: frame.left,
                top: frame.top,
                width: frame.width,
                height: frame.height,
              }}
              aria-hidden="true"
            >
              {image?.status === "done" && image.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt=""
                  className="h-full w-full border-2 border-neutral-800 bg-[#e8e0d0] object-cover shadow-[4px_6px_0_rgba(0,0,0,0.08)]"
                  style={{ objectPosition: frame.objectPosition }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center border-2 border-neutral-800 bg-[#e8e0d0] text-[0.65rem] uppercase tracking-wider text-neutral-500">
                  {image?.status === "loading" ? "illuminating…" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
