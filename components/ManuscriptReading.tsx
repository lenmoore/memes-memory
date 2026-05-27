"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildReadingContent,
  buildVisibleLines,
  computeManuscriptLayout,
  EMBED_SETTLE_MS,
  layoutCharacterCount,
  layoutReading,
  readingArtifacts,
  TYPEWRITER_CHARS_PER_SECOND,
  visualEmbedFrame,
} from "@/lib/manuscript/readingFlow";
import type { LensReading } from "@/lib/lenses/reading";

type Props = {
  reading: LensReading;
  generateImages?: boolean;
  onSettled?: () => void;
};

type ImageState = {
  status: "idle" | "loading" | "done" | "skipped" | "error";
  url: string | null;
};

type EmbedPhase = "loading" | "visible" | "inFlow";

function createTextMeasurer(font: string): (value: string) => number {
  if (typeof document === "undefined") {
    return (value: string) => value.length * 9;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return (value: string) => value.length * 9;
  }

  ctx.font = font;
  return (value: string) => ctx.measureText(value).width;
}

export default function ManuscriptReading({
  reading,
  generateImages = false,
  onSettled,
}: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(640);
  const [revealedChars, setRevealedChars] = useState(0);
  const [images, setImages] = useState<Record<string, ImageState>>({});
  const [embedPhases, setEmbedPhases] = useState<Record<string, EmbedPhase>>(
    {},
  );
  const settleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const settledRef = useRef(false);

  const readingContent = useMemo(() => buildReadingContent(reading), [reading]);
  const artifacts = useMemo(
    () => readingArtifacts(readingContent),
    [readingContent],
  );
  const layoutArtifacts = generateImages ? artifacts : [];

  const manuscriptLayout = useMemo(
    () => computeManuscriptLayout(contentWidth, layoutArtifacts),
    [contentWidth, layoutArtifacts],
  );

  const measureText = useMemo(
    () => createTextMeasurer(readingContent.font),
    [readingContent.font],
  );

  const fullLayout = useMemo(
    () => layoutReading(readingContent, manuscriptLayout, measureText),
    [readingContent, manuscriptLayout, measureText],
  );

  const layoutCharCount = useMemo(
    () => layoutCharacterCount(fullLayout.lines),
    [fullLayout.lines],
  );

  const typewriterDone = revealedChars >= layoutCharCount;

  useEffect(() => {
    settledRef.current = false;
  }, [reading, generateImages]);

  useEffect(() => {
    const node = measureRef.current;
    if (!node) return;

    const measure = () => {
      const next = node.clientWidth;
      if (next > 0) setContentWidth(next);
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
    if (layoutCharCount === 0) return;

    let raf = 0;
    let revealed = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      revealed = Math.min(
        layoutCharCount,
        revealed +
          Math.max(
            1,
            Math.round((delta / 1000) * TYPEWRITER_CHARS_PER_SECOND),
          ),
      );
      setRevealedChars(revealed);
      if (revealed < layoutCharCount) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layoutCharCount, reading]);

  useEffect(() => {
    if (!generateImages) return;

    let cancelled = false;
    const next: Record<string, ImageState> = {};
    const phases: Record<string, EmbedPhase> = {};

    for (const artifact of artifacts) {
      next[artifact.id] = { status: "loading", url: null };
      phases[artifact.id] = "loading";
    }
    setImages(next);
    setEmbedPhases(phases);

    for (const artifact of artifacts) {
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
  }, [artifacts, reading, generateImages]);

  const visibleLines = useMemo(
    () => buildVisibleLines(fullLayout.lines, revealedChars),
    [fullLayout.lines, revealedChars],
  );

  const embedsSettled =
    artifacts.length === 0 ||
    (!generateImages
      ? false
      : artifacts.every((artifact) => {
          const phase = embedPhases[artifact.id];
          const image = images[artifact.id];
          return (
            phase === "inFlow" ||
            image?.status === "skipped" ||
            image?.status === "error"
          );
        }));

  const animationSettled = typewriterDone && embedsSettled;

  useEffect(() => {
    if (!animationSettled || settledRef.current) return;
    settledRef.current = true;
    onSettled?.();
  }, [animationSettled, onSettled]);

  const showCaret =
    !typewriterDone &&
    visibleLines.length > 0 &&
    revealedChars < layoutCharCount;

  return (
    <div className="manuscript-reading relative overflow-visible">
      <div ref={measureRef} className="h-0 w-full" aria-hidden="true" />

      <div
        className="relative"
        style={{
          height: fullLayout.height,
          minHeight: fullLayout.height,
          width: manuscriptLayout.canvasWidth,
          marginLeft: manuscriptLayout.canvasOffset,
        }}
      >
        {fullLayout.embeds.map((embed) => {
          const phase = embedPhases[embed.id] ?? "loading";
          const image = images[embed.id];
          const visible = phase === "visible" || phase === "inFlow";

          if (!visible) return null;

          const frame = visualEmbedFrame(
            embed.side,
            embed,
            manuscriptLayout,
          );

          return (
            <div
              key={embed.id}
              className="absolute z-10 pointer-events-none manuscript-artifact-enter"
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

        {visibleLines.map((line) => (
          <span
            key={`${line.y}:${line.x}:${line.text}`}
            className={`absolute z-20 block whitespace-nowrap text-neutral-900 ${
              readingContent.boldLines.has(line.text.trim())
                ? "text-neutral-950"
                : ""
            }`}
            style={{
              font: readingContent.font,
              lineHeight: `${readingContent.lineHeight}px`,
              left: line.x,
              top: line.y,
              width: line.width,
              maxWidth: line.width,
              overflow: "hidden",
            }}
          >
            {line.text}
          </span>
        ))}

        {showCaret && visibleLines.length > 0 && (
          <span
            aria-hidden="true"
            className="absolute z-20 inline-block h-[1.1em] w-[2px] animate-pulse bg-neutral-700"
            style={{
              left:
                (visibleLines[visibleLines.length - 1]?.x ?? 0) +
                (visibleLines[visibleLines.length - 1]?.width ?? 0),
              top: visibleLines[visibleLines.length - 1]?.y ?? 0,
            }}
          />
        )}
      </div>
    </div>
  );
}
