"use client";

import { useEffect, useMemo, useState } from "react";
import Upload, { type UploadPayload } from "@/components/Upload";
import LensPanel, { type LensRunInputs } from "@/components/LensPanel";
import Screen from "@/components/Screen";
import ScreenSlidePanel from "@/components/ScreenSlidePanel";
import { LENSES, type Lens, getLensesForScreen } from "@/lib/lenses/registry";
import type { LensReading } from "@/lib/lenses/reading";
import { lensReadingToPlainText } from "@/lib/lenses/reading";
import type { Recognition } from "@/lib/recognition";
import { evaluateMemeGate } from "@/lib/memeGate";
import {
  shouldGenerateImages,
  shouldRunScreen2Lenses,
} from "@/lib/manuscript/imagePipeline";

type KymPayload = {
  result: {
    url: string;
    title: string | null;
    about: string | null;
    origin: string | null;
    spread: string | null;
  } | null;
  summary?: string;
};

type ReverseSearchPayload = {
  result: {
    imageUrl: string;
    queryGuess: string | null;
    matches: Array<{
      title: string | null;
      source: string | null;
      link: string | null;
      snippet: string | null;
    }>;
    relatedQueries: string[];
  } | null;
  summary?: string;
  skipped?: boolean;
  reason?: string;
};

const SCREEN_LABELS: Record<1 | 2 | 3, { title: string; subtitle: string }> = {
  1: {
    title: "Vernacular & semiotic foundation",
    subtitle:
      "What this meme is, where it comes from, what it's doing on the surface.",
  },
  2: {
    title: "Critical theory lenses",
    subtitle: "Two or three readings, chosen for this meme.",
  },
  3: {
    title: "Infrastructural / technological lenses",
    subtitle: "The meme as artifact of a technological order.",
  },
};

export default function Page() {
  const [payload, setPayload] = useState<UploadPayload | null>(null);

  const [recognition, setRecognition] = useState<Recognition | null>(null);
  const [recognitionStatus, setRecognitionStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const [kym, setKym] = useState<KymPayload | null>(null);
  const [kymStatus, setKymStatus] = useState<
    "idle" | "skipped" | "running" | "done" | "error"
  >("idle");
  const [kymError, setKymError] = useState<string | null>(null);

  const [reverseSearch, setReverseSearch] = useState<ReverseSearchPayload | null>(
    null,
  );
  const [reverseSearchStatus, setReverseSearchStatus] = useState<
    "idle" | "skipped" | "running" | "done" | "error"
  >("idle");
  const [reverseSearchError, setReverseSearchError] = useState<string | null>(
    null,
  );

  const [lensOutputs, setLensOutputs] = useState<Record<string, LensReading>>(
    {},
  );
  const [lensSettled, setLensSettled] = useState<Record<string, boolean>>({});
  const [activeScreen, setActiveScreen] = useState<1 | 2 | 3>(1);

  const [selectedScreen2Ids, setSelectedScreen2Ids] = useState<string[] | null>(
    null,
  );
  const [lensSelectionRationale, setLensSelectionRationale] = useState<
    string | null
  >(null);
  const [lensSelectionStatus, setLensSelectionStatus] = useState<
    "idle" | "waiting" | "running" | "done" | "error"
  >("idle");
  const [lensSelectionError, setLensSelectionError] = useState<string | null>(
    null,
  );

  const lensesByScreen = useMemo(() => {
    const by: Record<1 | 2 | 3, Lens[]> = { 1: [], 2: [], 3: [] };
    for (const l of LENSES) by[l.screen].push(l);
    for (const k of [1, 2, 3] as const) by[k].sort((a, b) => a.order - b.order);
    return by;
  }, []);

  async function handleUpload(p: UploadPayload) {
    setPayload(p);
    setRecognition(null);
    setRecognitionError(null);
    setRecognitionStatus("running");
    setKym(null);
    setKymError(null);
    setKymStatus("idle");
    setReverseSearch(null);
    setReverseSearchError(null);
    setReverseSearchStatus("idle");
    setLensOutputs({});
    setLensSettled({});
    setActiveScreen(1);
    setSelectedScreen2Ids(null);
    setLensSelectionRationale(null);
    setLensSelectionStatus("idle");
    setLensSelectionError(null);

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
      const data = (await res.json()) as Recognition;
      setRecognition(data);
      setRecognitionStatus("done");

      setReverseSearchStatus("running");
      let reverseData: ReverseSearchPayload | null = null;
      try {
        const reverseRes = await fetch("/api/analyze/reverse-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: p.imageBase64,
            mediaType: p.mediaType,
          }),
        });
        if (!reverseRes.ok) throw new Error(`Reverse search: ${reverseRes.status}`);
        reverseData = (await reverseRes.json()) as ReverseSearchPayload;
        setReverseSearch(reverseData);
        setReverseSearchStatus(reverseData.skipped ? "skipped" : "done");
      } catch (err) {
        setReverseSearchError(err instanceof Error ? err.message : String(err));
        setReverseSearchStatus("error");
      }

      const kymName =
        data.candidateName ?? reverseData?.result?.queryGuess ?? null;

      if (kymName) {
        setKymStatus("running");
        try {
          const kymRes = await fetch("/api/analyze/kym", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: kymName }),
          });
          if (!kymRes.ok) throw new Error(`KYM lookup: ${kymRes.status}`);
          const kymData = (await kymRes.json()) as KymPayload;
          setKym(kymData);
          setKymStatus("done");
        } catch (err) {
          setKymError(err instanceof Error ? err.message : String(err));
          setKymStatus("error");
        }
      } else {
        setKymStatus("skipped");
      }
    } catch (err) {
      setRecognitionError(err instanceof Error ? err.message : String(err));
      setRecognitionStatus("error");
    }
  }

  const memeGate = useMemo(
    () =>
      evaluateMemeGate({
        recognition,
        reverseSearch: reverseSearch?.result ?? null,
        reverseSearchStatus,
        kymStatus,
        kymHasResult: Boolean(kym?.result),
      }),
    [recognition, reverseSearch, reverseSearchStatus, kymStatus, kym?.result],
  );

  const screen1Ready = memeGate.approved;
  const screen1HistoricalDone = Boolean(lensOutputs["historical"]);
  const screen1Complete =
    screen1HistoricalDone &&
    Boolean(lensOutputs["semiotic"]) &&
    Boolean(lensOutputs["synthesis"]);

  const screen1AllSettled =
    screen1Complete &&
    Boolean(lensSettled["historical"]) &&
    Boolean(lensSettled["semiotic"]) &&
    Boolean(lensSettled["synthesis"]);

  const screen2Lenses = useMemo(() => {
    const all = getLensesForScreen(2);
    if (!selectedScreen2Ids) return [];
    return all.filter((l) => selectedScreen2Ids.includes(l.id));
  }, [selectedScreen2Ids]);

  const screen2Complete = useMemo(() => {
    if (screen2Lenses.length === 0) return false;
    return screen2Lenses.every((l) => Boolean(lensOutputs[l.id]));
  }, [screen2Lenses, lensOutputs]);

  function screenPipelineReady(screenNum: 1 | 2 | 3): boolean {
    if (screenNum === 1) return screen1Ready;
    if (screenNum === 2) {
      return shouldRunScreen2Lenses(screen1AllSettled, selectedScreen2Ids);
    }
    return screen2Complete;
  }

  useEffect(() => {
    if (!recognition || !screen1Complete) {
      if (recognition && screen1Ready && !screen1Complete) {
        setLensSelectionStatus("waiting");
      }
      return;
    }
    if (lensSelectionStatus === "done" || lensSelectionStatus === "running") {
      return;
    }

    setLensSelectionStatus("running");
    setLensSelectionError(null);

    (async () => {
      try {
        const res = await fetch("/api/analyze/select-lenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recognition,
            kymSummary: kym?.summary ?? null,
            screen1: {
              historical: lensOutputs["historical"]
                ? lensReadingToPlainText(lensOutputs["historical"])
                : undefined,
              semiotic: lensOutputs["semiotic"]
                ? lensReadingToPlainText(lensOutputs["semiotic"])
                : undefined,
              synthesis: lensOutputs["synthesis"]
                ? lensReadingToPlainText(lensOutputs["synthesis"])
                : undefined,
            },
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status} ${text}`);
        }
        const data = (await res.json()) as {
          selected: string[];
          rationale: string;
        };
        setSelectedScreen2Ids(data.selected);
        setLensSelectionRationale(data.rationale || null);
        setLensSelectionStatus("done");
      } catch (err) {
        setLensSelectionError(err instanceof Error ? err.message : String(err));
        setSelectedScreen2Ids(
          getLensesForScreen(2)
            .slice(0, 3)
            .map((l) => l.id),
        );
        setLensSelectionStatus("error");
      }
    })();
  }, [
    recognition,
    screen1Complete,
    screen1Ready,
    kym?.summary,
    lensOutputs,
    lensSelectionStatus,
  ]);

  function lensesForScreen(screenNum: 1 | 2 | 3): Lens[] {
    if (screenNum === 2) return screen2Lenses;
    return lensesByScreen[screenNum];
  }

  function inputsForLens(lens: Lens): LensRunInputs | null {
    if (!payload) return null;
    if (lens.isSynthesis) {
      const historical = lensOutputs["historical"];
      const semiotic = lensOutputs["semiotic"];
      if (!historical || !semiotic) return null;
      return {
        kind: "synthesis",
        priorOutputs: {
          historical: lensReadingToPlainText(historical),
          semiotic: lensReadingToPlainText(semiotic),
        },
      };
    }
    if (lens.id === "historical") {
      if (
        kymStatus === "idle" ||
        kymStatus === "running" ||
        reverseSearchStatus === "idle" ||
        reverseSearchStatus === "running"
      ) {
        return null;
      }
      return {
        kind: "standard",
        imageBase64: payload.imageBase64,
        mediaType: payload.mediaType,
        kym: kym?.summary ?? null,
        webContext: reverseSearch?.summary ?? null,
      };
    }
    if (lens.id === "semiotic") {
      if (!screen1HistoricalDone) return null;
      if (
        reverseSearchStatus === "idle" ||
        reverseSearchStatus === "running"
      ) {
        return null;
      }
      return {
        kind: "standard",
        imageBase64: payload.imageBase64,
        mediaType: payload.mediaType,
        kym: null,
        webContext: reverseSearch?.summary ?? null,
      };
    }
    if (lens.screen === 2) {
      if (
        !shouldRunScreen2Lenses(screen1AllSettled, selectedScreen2Ids) ||
        !selectedScreen2Ids?.includes(lens.id)
      ) {
        return null;
      }
    }
    if (lens.screen === 3 && !screen2Complete) {
      return null;
    }
    return {
      kind: "standard",
      imageBase64: payload.imageBase64,
      mediaType: payload.mediaType,
      kym: null,
    };
  }

  const handleLensComplete = (id: string) => (output: LensReading) => {
    setLensOutputs((prev) => ({ ...prev, [id]: output }));
    setLensSettled((prev) => ({ ...prev, [id]: false }));
  };

  const imagePipelineContext = {
    screen1TextComplete: screen1Complete,
    screen1DisplaySettled: screen1AllSettled,
    screen2TextComplete: screen2Complete,
  };

  function generateImagesForLens(lens: Lens): boolean {
    return shouldGenerateImages(lens.screen, {
      ...imagePipelineContext,
      lensHasReading: Boolean(lensOutputs[lens.id]),
    });
  }

  return (
    <main className="mx-auto max-w-3xl overflow-x-visible px-6 py-16">
      <header className="mb-12">
        <h1 className="text-4xl font-serif tracking-tight">
          Memes as Stained Glass
        </h1>
      </header>

      <Upload onUpload={handleUpload} />

      {recognitionStatus !== "idle" && (
        <section className="mt-10 border-l-2 border-neutral-300 pl-4">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            Recognition
          </p>
          {recognitionStatus === "running" && (
            <p className="mt-2 text-neutral-500 italic">
              <ProgressDots /> looking at the image
            </p>
          )}
          {recognitionStatus === "error" && (
            <p className="mt-2 text-red-700">{recognitionError}</p>
          )}
          {recognition && (
            <>
              <p className="mt-2 text-sm text-neutral-600 tabular-nums">
                Meme certainty: {recognition.memeCertainty}%
              </p>
              {memeGate.pending && (
                <p className="mt-3 text-neutral-500 italic">
                  <ProgressDots /> vision uncertain — verifying
                </p>
              )}
              {!memeGate.approved && !memeGate.pending && (
                <p className="mt-3 text-neutral-800 leading-relaxed">
                  This is not a meme
                  {memeGate.message ? ` — ${memeGate.message}` : "."}{" "}
                  Analysis will not run.
                </p>
              )}
              {memeGate.approved && memeGate.source === "kym" && memeGate.message && (
                <p className="mt-3 text-sm text-neutral-600 italic">
                  {memeGate.message}
                </p>
              )}
              {memeGate.approved && (
                <>
                  <p className="mt-2 text-neutral-800 whitespace-pre-wrap leading-relaxed">
                    {recognition.description}
                  </p>
                  {recognition.candidateName && (
                    <p className="mt-3 text-sm text-neutral-500">
                      Candidate name: <em>{recognition.candidateName}</em>
                    </p>
                  )}
                  {(recognition.visualElements.length > 0 ||
                    recognition.culturalSituation ||
                    recognition.affectAndTone ||
                    recognition.thematicHooks.length > 0) && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-neutral-500 text-xs uppercase tracking-wider">
                        analysis details
                      </summary>
                      <div className="mt-3 space-y-3 text-sm text-neutral-700">
                        {recognition.visualElements.length > 0 && (
                          <p>
                            <span className="text-neutral-500">Visual elements: </span>
                            {recognition.visualElements.join("; ")}
                          </p>
                        )}
                        {recognition.culturalSituation && (
                          <p>
                            <span className="text-neutral-500">Cultural situation: </span>
                            {recognition.culturalSituation}
                          </p>
                        )}
                        {recognition.affectAndTone && (
                          <p>
                            <span className="text-neutral-500">Affect and tone: </span>
                            {recognition.affectAndTone}
                          </p>
                        )}
                        {recognition.thematicHooks.length > 0 && (
                          <p>
                            <span className="text-neutral-500">Thematic hooks: </span>
                            {recognition.thematicHooks.join("; ")}
                          </p>
                        )}
                      </div>
                    </details>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}

      {recognitionStatus === "done" && (
        <section className="mt-6 border-l-2 border-neutral-300 pl-4">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            KnowYourMeme
          </p>
          {kymStatus === "running" && (
            <p className="mt-2 text-neutral-500 italic">
              <ProgressDots /> searching the archive
            </p>
          )}
          {kymStatus === "skipped" && (
            <p className="mt-2 text-neutral-500 italic">
              skipped — no candidate name to look up
            </p>
          )}
          {kymStatus === "error" && (
            <p className="mt-2 text-neutral-500 italic">
              archive unavailable ({kymError}) — historical lens will proceed without it
            </p>
          )}
          {kymStatus === "done" && kym?.result && (
            <div className="mt-2 text-neutral-700 text-sm">
              <p>
                Matched:{" "}
                <a
                  href={kym.result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {kym.result.title ?? kym.result.url}
                </a>
              </p>
              {kym.result.about && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-neutral-500 text-xs uppercase tracking-wider">
                    excerpt
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                    {kym.result.about.slice(0, 800)}
                    {kym.result.about.length > 800 ? "…" : ""}
                  </p>
                </details>
              )}
            </div>
          )}
          {kymStatus === "done" && !kym?.result && (
            <p className="mt-2 text-neutral-500 italic">
              no entry found — historical lens will proceed without it
            </p>
          )}
        </section>
      )}

      {screen1Ready && payload && (
        <>
          <ScreenSlidePanel
            activeScreen={activeScreen}
            onScreenChange={setActiveScreen}
          />
          {([1, 2, 3] as const).map((screenNum) => (
            <div
              key={screenNum}
              hidden={activeScreen !== screenNum}
              aria-hidden={activeScreen !== screenNum}
            >
              <Screen
                index={screenNum}
                title={SCREEN_LABELS[screenNum].title}
                subtitle={SCREEN_LABELS[screenNum].subtitle}
              >
                {screenNum === 2 && lensSelectionStatus === "waiting" && (
                  <p className="text-neutral-500 italic -mt-4 mb-6">
                    <ProgressDots /> waiting for screen 1 before choosing lenses
                  </p>
                )}
                {screenNum === 2 &&
                  screen1Complete &&
                  !screen1AllSettled &&
                  lensSelectionStatus !== "waiting" && (
                    <p className="text-neutral-500 italic -mt-4 mb-6">
                      <ProgressDots /> waiting for screen 1 images before critical lenses
                    </p>
                  )}
                {screenNum === 2 && lensSelectionStatus === "running" && (
                  <p className="text-neutral-500 italic -mt-4 mb-6">
                    <ProgressDots /> choosing lenses for this meme
                  </p>
                )}
                {screenNum === 2 &&
                  lensSelectionStatus === "error" &&
                  lensSelectionError && (
                    <p className="text-neutral-500 italic -mt-4 mb-6">
                      lens selection failed ({lensSelectionError}) — using defaults
                    </p>
                  )}
                {screenNum === 2 &&
                  lensSelectionRationale &&
                  selectedScreen2Ids && (
                    <p className="text-neutral-600 text-sm italic -mt-4 mb-6 border-l-2 border-neutral-300 pl-3">
                      {lensSelectionRationale}
                    </p>
                  )}
                {screenNum === 3 && screen1Complete && !screen2Complete && (
                  <p className="text-neutral-500 italic -mt-4 mb-6">
                    <ProgressDots /> waiting for screen 2 before infrastructural lenses
                  </p>
                )}
                {screenPipelineReady(screenNum) &&
                  lensesForScreen(screenNum).map((lens) => (
                    <div key={lens.id}>
                      <LensPanel
                        lensId={lens.id}
                        displayName={lens.displayName}
                        primerPath={lens.primerPath}
                        inputs={inputsForLens(lens)}
                        generateImages={generateImagesForLens(lens)}
                        onComplete={handleLensComplete(lens.id)}
                        onDisplaySettled={() =>
                          setLensSettled((prev) => ({ ...prev, [lens.id]: true }))
                        }
                      />
                    </div>
                  ))}
              </Screen>
            </div>
          ))}
        </>
      )}
    </main>
  );
}

function ProgressDots() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x + 1) % 4), 350);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{".".repeat(n)}</span>;
}
