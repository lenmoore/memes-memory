"use client";

import { useState } from "react";
import Upload, { type UploadPayload } from "@/components/Upload";
import LensPanel from "@/components/LensPanel";

export default function Page() {
  const [payload, setPayload] = useState<UploadPayload | null>(null);
  const [recognition, setRecognition] = useState<{
    description: string;
    candidateName: string | null;
  } | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);

  async function handleUpload(p: UploadPayload) {
    setPayload(p);
    setRecognition(null);
    setRecognitionError(null);
    setRecognizing(true);
    try {
      const res = await fetch("/api/analyze/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: p.imageBase64,
          mediaType: p.mediaType,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Recognition failed: ${res.status} ${text}`);
      }
      const data = await res.json();
      setRecognition(data);
    } catch (err) {
      setRecognitionError(err instanceof Error ? err.message : String(err));
    } finally {
      setRecognizing(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 flex flex-col gap-12">
      <header>
        <h1 className="text-3xl font-serif">Memes as Stained Glass</h1>
        <p className="mt-2 text-neutral-600">
          Upload a meme. It will be read aloud by a cathedral docent.
        </p>
      </header>

      <Upload onUpload={handleUpload} />

      {recognizing && (
        <p className="text-neutral-500 italic">Recognizing…</p>
      )}
      {recognitionError && (
        <p className="text-red-700">{recognitionError}</p>
      )}
      {recognition && (
        <section className="border-l-2 border-neutral-300 pl-4 text-neutral-700">
          <p className="text-sm uppercase tracking-wide text-neutral-500">
            Recognition
          </p>
          <p className="mt-1">{recognition.description}</p>
          {recognition.candidateName && (
            <p className="mt-2 text-sm text-neutral-500">
              Candidate name: {recognition.candidateName}
            </p>
          )}
        </section>
      )}

      {payload && recognition && (
        <section>
          <div className="bg-neutral-200 aspect-[4/3] mb-6" aria-label="manuscript placeholder" />
          <h2 className="text-xl mb-3">Cyberfeminist</h2>
          <LensPanel
            lensId="cyberfeminist"
            imageBase64={payload.imageBase64}
            mediaType={payload.mediaType}
          />
        </section>
      )}
    </main>
  );
}
