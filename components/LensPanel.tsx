"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  lensId: string;
  imageBase64: string;
  mediaType: string;
  kym?: string | null;
};

export default function LensPanel({
  lensId,
  imageBase64,
  mediaType,
  kym = null,
}: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setText("");
    setError(null);
    setDone(false);

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    (async () => {
      try {
        const res = await fetch(`/api/analyze/lens/${lensId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, mediaType, kym }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const errText = await res.text();
          setError(`${res.status} ${errText || res.statusText}`);
          return;
        }
        if (!res.body) {
          setError("No response body");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          const chunk = decoder.decode(value, { stream: true });
          setText((t) => t + chunk);
        }
        setDone(true);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => controller.abort();
  }, [lensId, imageBase64, mediaType, kym]);

  return (
    <article className="prose max-w-none whitespace-pre-wrap">
      {text || (!error && <span className="text-neutral-400 italic">streaming…</span>)}
      {error && (
        <p className="text-red-700 mt-2">
          <strong>Error:</strong> {error}
        </p>
      )}
      {done && (
        <p className="text-neutral-400 text-xs mt-4">— end of reading —</p>
      )}
    </article>
  );
}
