"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MarkdownBody from "@/components/MarkdownBody";
import ManuscriptReading from "@/components/ManuscriptReading";
import type { LensReading } from "@/lib/lenses/reading";

export type LensRunInputs =
  | {
      kind: "standard";
      imageBase64: string;
      mediaType: string;
      kym?: string | null;
      webContext?: string | null;
    }
  | {
      kind: "synthesis";
      priorOutputs: { historical: string; semiotic: string };
    };

type Props = {
  lensId: string;
  displayName: string;
  inputs: LensRunInputs | null;
  primerPath: string | null;
  generateImages?: boolean;
  onComplete?: (reading: LensReading) => void;
  onDisplaySettled?: () => void;
};

export default function LensPanel({
  lensId,
  displayName,
  inputs,
  primerPath,
  generateImages = false,
  onComplete,
  onDisplaySettled,
}: Props) {
  const [reading, setReading] = useState<LensReading | null>(null);
  const [displaySettled, setDisplaySettled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "starting" | "streaming" | "done" | "error"
  >("idle");
  const [showPrimer, setShowPrimer] = useState(false);
  const [primerText, setPrimerText] = useState<string | null>(null);
  const [runToken, setRunToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const run = useCallback(() => {
    if (!inputs) return;
    setRunToken((n) => n + 1);
  }, [inputs]);

  const inputsSig = useMemo(() => {
    if (!inputs) return "";
    if (inputs.kind === "synthesis") {
      return `synth:${inputs.priorOutputs.historical.length}:${inputs.priorOutputs.semiotic.length}`;
    }
    return `std:${inputs.mediaType}:${inputs.imageBase64.length}:${inputs.kym?.length ?? 0}:${inputs.webContext?.length ?? 0}`;
  }, [inputs]);

  useEffect(() => {
    if (!inputs) {
      setStatus("idle");
      return;
    }
    setReading(null);
    setDisplaySettled(false);
    setError(null);
    setStatus("starting");

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    let bodyPayload: Record<string, unknown>;
    if (inputs.kind === "synthesis") {
      bodyPayload = { priorOutputs: inputs.priorOutputs };
    } else {
      bodyPayload = {
        imageBase64: inputs.imageBase64,
        mediaType: inputs.mediaType,
        kym: inputs.kym ?? null,
        webContext: inputs.webContext ?? null,
      };
    }

    (async () => {
      try {
        const res = await fetch(`/api/analyze/lens/${lensId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        });
        if (!res.ok) {
          const errText = await res.text();
          setError(`${res.status} ${errText || res.statusText}`);
          setStatus("error");
          return;
        }
        setStatus("streaming");
        const data = (await res.json()) as { reading: LensReading };
        setReading(data.reading);
        setStatus("done");
        onCompleteRef.current?.(data.reading);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lensId, inputsSig, runToken]);

  async function loadPrimer() {
    if (!primerPath || primerText) {
      setShowPrimer((s) => !s);
      return;
    }
    try {
      const res = await fetch(
        `/lens-primer?file=${encodeURIComponent(primerPath)}`,
      );
      if (res.ok) {
        setPrimerText(await res.text());
      } else {
        setPrimerText("(primer not loadable)");
      }
    } catch {
      setPrimerText("(primer not loadable)");
    }
    setShowPrimer(true);
  }

  const busy = status === "starting" || status === "streaming";

  return (
    <article className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-lg font-serif">{displayName}</h3>
        <div className="flex items-center gap-3 text-xs">
          <StatusBadge status={status} />
          {primerPath && (
            <button
              type="button"
              onClick={loadPrimer}
              className="text-neutral-500 hover:text-neutral-900 underline-offset-2 hover:underline"
            >
              {showPrimer ? "hide primer" : "primer"}
            </button>
          )}
          <button
            type="button"
            onClick={run}
            disabled={!inputs || busy}
            className="text-neutral-500 hover:text-neutral-900 underline-offset-2 hover:underline disabled:opacity-40 disabled:no-underline"
          >
            regenerate
          </button>
        </div>
      </div>

      {showPrimer && primerText && (
        <details
          open
          className="border-l-2 border-neutral-300 pl-3 text-sm text-neutral-600"
        >
          <summary className="cursor-pointer text-xs uppercase tracking-wider text-neutral-400">
            primer fed to the model
          </summary>
          <MarkdownBody className="mt-2 text-sm text-neutral-700 leading-relaxed">
            {primerText}
          </MarkdownBody>
        </details>
      )}

      <div className="relative min-h-[2rem]">
        {reading && (
          <ManuscriptReading
            reading={reading}
            generateImages={generateImages}
            onSettled={() => {
              setDisplaySettled(true);
              onDisplaySettled?.();
            }}
          />
        )}
        {status === "starting" && <PulsingDot />}
        {status === "streaming" && !reading && <PulsingDot />}
      </div>

      {error && (
        <p className="text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </p>
      )}

      {status === "done" && displaySettled && (
        <p className="text-neutral-400 text-xs">— end of reading —</p>
      )}
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: "idle" | "starting" | "streaming" | "done" | "error";
}) {
  if (status === "idle")
    return <span className="text-neutral-400">waiting</span>;
  if (status === "starting")
    return <span className="text-neutral-500">opening…</span>;
  if (status === "streaming")
    return <span className="text-neutral-700">reading</span>;
  if (status === "done") return <span className="text-neutral-400">done</span>;
  if (status === "error") return <span className="text-red-700">error</span>;
  return null;
}

function PulsingDot() {
  return (
    <span
      aria-label="streaming"
      className="inline-block w-2 h-2 ml-1 align-middle bg-neutral-700 rounded-full animate-pulse"
    />
  );
}
