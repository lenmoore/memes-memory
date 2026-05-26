"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MarkdownBody from "@/components/MarkdownBody";

export type LensRunInputs =
  | {
      kind: "standard";
      imageBase64: string;
      mediaType: string;
      kym?: string | null;
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
  onComplete?: (text: string) => void;
};

export default function LensPanel({
  lensId,
  displayName,
  inputs,
  primerPath,
  onComplete,
}: Props) {
  const [text, setText] = useState("");
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

  // Stable signature for the inputs so the effect doesn't re-fire on every
  // parent render (inputs is a fresh object each render).
  const inputsSig = useMemo(() => {
    if (!inputs) return "";
    if (inputs.kind === "synthesis") {
      return `synth:${inputs.priorOutputs.historical.length}:${inputs.priorOutputs.semiotic.length}`;
    }
    return `std:${inputs.mediaType}:${inputs.imageBase64.length}:${inputs.kym?.length ?? 0}`;
  }, [inputs]);

  useEffect(() => {
    if (!inputs) {
      setStatus("idle");
      return;
    }
    setText("");
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
        if (!res.body) {
          setError("No response body");
          setStatus("error");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accum = "";
        let first = true;
        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          const chunk = decoder.decode(value, { stream: true });
          accum += chunk;
          if (first) {
            first = false;
            setStatus("streaming");
          }
          setText((t) => t + chunk);
        }
        setStatus("done");
        onCompleteRef.current?.(accum);
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
          <pre className="whitespace-pre-wrap font-serif mt-2">{primerText}</pre>
        </details>
      )}

      <div className="text-[1.0625rem] leading-relaxed">
        <MarkdownBody>{text}</MarkdownBody>
        {status === "starting" && <PulsingDot />}
        {status === "streaming" && !text && <PulsingDot />}
      </div>

      {error && (
        <p className="text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </p>
      )}

      {status === "done" && (
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
