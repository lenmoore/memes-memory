"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReadingVisualCard from "@/components/ReadingVisualCard";
import {
  buildReadingContent,
  buildVisibleLines,
  computeManuscriptLayout,
  layoutCharacterCount,
  layoutReading,
  readingArtifactsFromReading,
  TYPEWRITER_CHARS_PER_SECOND,
} from "@/lib/manuscript/readingFlow";
import type { LensReading } from "@/lib/lenses/reading";

type Props = {
  reading: LensReading;
  lensDisplayName: string;
  generateImages?: boolean;
  onSettled?: () => void;
};

type ImageState = {
  status: "idle" | "loading" | "done" | "skipped" | "error";
  url: string | null;
};

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
  lensDisplayName,
  generateImages = false,
  onSettled,
}: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(640);
  const [revealedChars, setRevealedChars] = useState(0);
  const [images, setImages] = useState<Record<string, ImageState>>({});
  const settledRef = useRef(false);

  const readingContent = useMemo(
    () => buildReadingContent(reading, { includeArtifactsInText: false }),
    [reading],
  );
  const artifacts = useMemo(
    () => readingArtifactsFromReading(reading),
    [reading],
  );
  const layoutArtifacts: typeof artifacts = [];

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
    setImages({});
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

    for (const artifact of artifacts) {
      next[artifact.id] = { status: "loading", url: null };
    }
    setImages(next);

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
    };
  }, [artifacts, reading, generateImages]);

  const visibleLines = useMemo(
    () => buildVisibleLines(fullLayout.lines, revealedChars),
    [fullLayout.lines, revealedChars],
  );

  const embedsSettled =
    !generateImages ||
    artifacts.length === 0 ||
    artifacts.every((artifact) => {
      const image = images[artifact.id];
      return (
        image?.status === "done" ||
        image?.status === "skipped" ||
        image?.status === "error"
      );
    });

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
      <ReadingVisualCard
        reading={reading}
        lensDisplayName={lensDisplayName}
        artifacts={artifacts}
        images={images}
        generateImages={generateImages}
      />

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
