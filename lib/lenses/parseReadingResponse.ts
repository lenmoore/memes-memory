import {
  markdownToFallbackReading,
  parseLensReading,
  type LensReading,
  type ReadingSection,
} from "@/lib/lenses/reading";

export type ParseReadingResult =
  | { ok: true; reading: LensReading }
  | { ok: false; reason: "empty" | "truncated" | "malformed" };

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const openFence = trimmed.match(/^```(?:json)?\s*/i);
  if (!openFence) return trimmed;

  let body = trimmed.slice(openFence[0].length);
  const closeFence = body.indexOf("```");
  if (closeFence !== -1) {
    body = body.slice(0, closeFence);
  }
  return body.trim();
}

export function extractJsonPayload(text: string): string {
  const stripped = stripCodeFence(text);
  const start = stripped.indexOf("{");
  if (start === -1) return stripped;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = start; i < stripped.length; i += 1) {
    const ch = stripped[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end !== -1) return stripped.slice(start, end + 1);
  return stripped.slice(start);
}

function decodeJsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

function extractJsonStringField(text: string, field: string): string | null {
  const re = new RegExp(`"${field}"\\s*:\\s*"`);
  const match = re.exec(text);
  if (!match) return null;

  const start = match.index + match[0].length;
  let value = "";
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) {
      value += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      value += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') return decodeJsonString(value);
    value += ch;
  }

  return decodeJsonString(trimPartialString(value));
}

function trimPartialString(raw: string): string {
  const decoded = decodeJsonString(raw).trim();
  const sentenceEnd = decoded.search(/[.!?](?:\s|$)/);
  if (sentenceEnd >= 0) return decoded.slice(0, sentenceEnd + 1).trim();
  return decoded.replace(/\s+\S*$/, "").trim();
}

function extractProvocativePoints(text: string): string[] {
  const arrayStart = text.match(/"provocativePoints"\s*:\s*\[/);
  if (!arrayStart || arrayStart.index === undefined) return [];

  const start = arrayStart.index + arrayStart[0].length;
  const slice = text.slice(start);
  const points: string[] = [];
  const re = /"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(slice)) !== null) {
    const decoded = decodeJsonString(match[1]);
    if (decoded.trim()) points.push(decoded.trim());
    if (points.length >= 3) break;
    const after = slice.slice(match.index + match[0].length).trimStart();
    if (after.startsWith("]")) break;
  }

  return points.slice(0, 3);
}

function extractArtifactSections(text: string): ReadingSection[] {
  const sections: ReadingSection[] = [];
  const re =
    /\{\s*"type"\s*:\s*"artifact"\s*,\s*"label"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"description"\s*:\s*"((?:\\.|[^"\\])*)"(?:\s*,\s*"side"\s*:\s*"(left|right)")?/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = re.exec(text)) !== null) {
    const label = decodeJsonString(match[1]).trim();
    const description = decodeJsonString(match[2]).trim();
    if (!label || !description) continue;
    sections.push({
      type: "artifact",
      label,
      description,
      side: match[3] === "right" ? "right" : index % 2 === 0 ? "left" : "right",
    });
    index += 1;
  }

  return sections;
}

function salvagePartialReading(text: string): LensReading | null {
  const payload = extractJsonPayload(text);
  if (!payload.includes("{")) return null;

  const title = extractJsonStringField(payload, "title") ?? "";
  const provocativePoints = extractProvocativePoints(payload);
  const markdown = extractJsonStringField(payload, "markdown");
  const artifacts = extractArtifactSections(payload);

  const sections: ReadingSection[] = [];
  if (markdown) {
    sections.push({ type: "prose", markdown });
  }
  sections.push(...artifacts);

  if (sections.length === 0 && !title && provocativePoints.length === 0) {
    return null;
  }

  return { title, provocativePoints, sections };
}

function looksLikeJsonDump(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith("{") ||
    trimmed.startsWith("```json") ||
    trimmed.includes('"sections"')
  );
}

export function parseReadingResponse(
  text: string,
  options?: { truncated?: boolean },
): ParseReadingResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  const payload = extractJsonPayload(trimmed);

  try {
    const parsed = parseLensReading(JSON.parse(payload));
    if (parsed) return { ok: true, reading: parsed };
  } catch {
    // try salvage below
  }

  const salvaged = salvagePartialReading(trimmed);
  if (salvaged && salvaged.sections.length > 0) {
    return { ok: true, reading: salvaged };
  }

  if (options?.truncated || looksLikeJsonDump(trimmed)) {
    return { ok: false, reason: "truncated" };
  }

  if (!looksLikeJsonDump(trimmed)) {
    return { ok: true, reading: markdownToFallbackReading(trimmed) };
  }

  return { ok: false, reason: "malformed" };
}
