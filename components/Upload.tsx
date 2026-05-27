"use client";

import { resolveImageMediaType } from "@/lib/imageMediaType";
import { useRef, useState } from "react";

export type UploadPayload = {
  imageBase64: string;
  mediaType: string;
  hash: string;
  previewUrl: string;
  fileName: string;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/gif", "image/webp"];

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      arr.subarray(i, i + chunk) as unknown as number[],
    );
  }
  return btoa(binary);
}

export default function Upload({
  onUpload,
}: {
  onUpload: (payload: UploadPayload) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const mediaType = resolveImageMediaType(new Uint8Array(buf), file.type);
      if (!mediaType) {
        setError(
          `Unsupported image format${file.type ? ` (browser reported ${file.type})` : ""}`,
        );
        return;
      }
      const [hash, b64] = await Promise.all([
        sha256Hex(buf),
        Promise.resolve(bytesToBase64(buf)),
      ]);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onUpload({
        imageBase64: b64,
        mediaType,
        hash,
        previewUrl: url,
        fileName: file.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="border border-neutral-400 px-4 py-3 text-left hover:bg-neutral-50"
        disabled={busy}
      >
        {busy ? "Reading…" : "Upload a meme"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="uploaded meme"
          className="max-w-xs border border-neutral-300"
        />
      )}
      {error && <p className="text-red-700 text-sm">{error}</p>}
    </div>
  );
}
