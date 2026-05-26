import type { Recognition } from "@/lib/recognition";
import { MEME_CERTAINTY_THRESHOLD } from "@/lib/recognition";
import type { ReverseSearchResult } from "@/lib/reverseImageSearch";

export type MemeGateSource = "vision" | "web" | "kym" | "none";

export type MemeGateVerdict = {
  approved: boolean;
  source: MemeGateSource;
  message: string | null;
  pending: boolean;
};

const MEME_HOST =
  /knowyourmeme|reddit\.com\/r\/(memes|dankmemes|196|shitposting|me_irl|memeeconomy)|imgur|9gag|memedepot|cheezburger|i\.redd\.it/i;

const MEME_TEXT =
  /\b(meme|image macro|reaction image|template|viral|shitpost|copypasta|loss comic|loss\.jpg|loss edit|wojak|pepe|dank)\b/i;

function haystack(result: ReverseSearchResult): string {
  const parts: string[] = [];
  if (result.queryGuess) parts.push(result.queryGuess);
  parts.push(...result.relatedQueries);
  for (const m of result.matches) {
    if (m.title) parts.push(m.title);
    if (m.snippet) parts.push(m.snippet);
    if (m.source) parts.push(m.source);
    if (m.link) parts.push(m.link);
  }
  return parts.join(" ").toLowerCase();
}

export function webSearchConfirmsMeme(
  result: ReverseSearchResult | null,
): { confirmed: boolean; reason: string | null } {
  if (!result) return { confirmed: false, reason: null };

  for (const m of result.matches) {
    if (!m.link) continue;
    if (MEME_HOST.test(m.link)) {
      let host = m.link;
      try {
        host = new URL(m.link).hostname;
      } catch {
        // use raw link
      }
      return {
        confirmed: true,
        reason: `Web match on ${host}${m.title ? `: ${m.title}` : ""}`,
      };
    }
  }

  const text = haystack(result);
  if (MEME_TEXT.test(text)) {
    const label =
      result.queryGuess ??
      result.matches.find((m) => m.title)?.title ??
      result.relatedQueries[0] ??
      "meme-related pages";
    return {
      confirmed: true,
      reason: `Web text suggests a meme: ${label}`,
    };
  }

  if (result.matches.length >= 3) {
    return {
      confirmed: true,
      reason: "Multiple web matches for this exact image.",
    };
  }

  return { confirmed: false, reason: null };
}

export function visionConfirmsMeme(recognition: Recognition): boolean {
  return recognition.isMeme && recognition.memeCertainty >= MEME_CERTAINTY_THRESHOLD;
}

export function evaluateMemeGate(input: {
  recognition: Recognition | null;
  reverseSearch: ReverseSearchResult | null;
  reverseSearchStatus: "idle" | "skipped" | "running" | "done" | "error";
  kymStatus: "idle" | "skipped" | "running" | "done" | "error";
  kymHasResult: boolean;
}): MemeGateVerdict {
  const {
    recognition,
    reverseSearch,
    reverseSearchStatus,
    kymStatus,
    kymHasResult,
  } = input;

  if (!recognition) {
    return { approved: false, source: "none", message: null, pending: false };
  }

  if (visionConfirmsMeme(recognition)) {
    return { approved: true, source: "vision", message: null, pending: false };
  }

  const reversePending = reverseSearchStatus === "running";
  const kymPending = kymStatus === "running";
  if (reversePending || kymPending) {
    return {
      approved: false,
      source: "none",
      message: null,
      pending: true,
    };
  }

  if (kymHasResult) {
    return {
      approved: true,
      source: "kym",
      message: "KnowYourMeme match — treating as meme.",
      pending: false,
    };
  }

  const web = webSearchConfirmsMeme(reverseSearch);
  if (web.confirmed) {
    return {
      approved: true,
      source: "web",
      message: web.reason,
      pending: false,
    };
  }

  return {
    approved: false,
    source: "none",
    message:
      recognition.notMemeReason ??
      "Vision and web search did not identify this as a meme.",
    pending: false,
  };
}
