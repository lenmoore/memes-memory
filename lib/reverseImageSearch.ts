import { uploadTemporaryImageUrl } from "@/lib/imageHosting";

export interface ReverseSearchMatch {
  title: string | null;
  source: string | null;
  link: string | null;
  snippet: string | null;
}

export interface ReverseSearchResult {
  imageUrl: string;
  queryGuess: string | null;
  matches: ReverseSearchMatch[];
  relatedQueries: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseMatches(data: Record<string, unknown>): ReverseSearchMatch[] {
  const matches: ReverseSearchMatch[] = [];
  const seen = new Set<string>();

  const push = (item: Record<string, unknown>) => {
    const title = str(item.title);
    const link = str(item.link);
    const source = str(item.source) ?? str(item.displayed_link);
    const snippet = str(item.snippet) ?? str(item.about_this_image);
    const key = `${title ?? ""}|${link ?? ""}|${source ?? ""}`;
    if (seen.has(key)) return;
    if (!title && !link && !source && !snippet) return;
    seen.add(key);
    matches.push({ title, source, link, snippet });
  };

  for (const key of ["image_results", "visual_matches", "exact_matches"] as const) {
    const arr = data[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (isRecord(item)) push(item);
    }
  }

  const organic = data.organic_results;
  if (Array.isArray(organic)) {
    for (const item of organic) {
      if (isRecord(item)) push(item);
    }
  }

  return matches.slice(0, 12);
}

function parseRelatedQueries(data: Record<string, unknown>): string[] {
  const queries: string[] = [];
  const related = data.related_content;
  if (!Array.isArray(related)) return queries;
  for (const item of related) {
    if (!isRecord(item)) continue;
    const q = str(item.query);
    if (q) queries.push(q);
  }
  return queries.slice(0, 8);
}

function parseSerpPayload(data: Record<string, unknown>): Omit<ReverseSearchResult, "imageUrl"> {
  const searchInfo = isRecord(data.search_information)
    ? data.search_information
    : null;
  const knowledge = isRecord(data.knowledge_graph) ? data.knowledge_graph : null;

  const queryGuess =
    str(searchInfo?.query_displayed) ??
    str(knowledge?.title) ??
    parseRelatedQueries(data)[0] ??
    null;

  return {
    queryGuess,
    matches: parseMatches(data),
    relatedQueries: parseRelatedQueries(data),
  };
}

async function serpReverseImageSearch(
  imageUrl: string,
  apiKey: string,
): Promise<Omit<ReverseSearchResult, "imageUrl"> | null> {
  const params = new URLSearchParams({
    engine: "google_reverse_image",
    image_url: imageUrl,
    api_key: apiKey,
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Record<string, unknown>;
  const parsed = parseSerpPayload(data);
  if (parsed.matches.length === 0 && !parsed.queryGuess) return null;
  return parsed;
}

async function serpLensSearch(
  imageUrl: string,
  apiKey: string,
): Promise<Omit<ReverseSearchResult, "imageUrl"> | null> {
  const params = new URLSearchParams({
    engine: "google_lens",
    url: imageUrl,
    type: "all",
    api_key: apiKey,
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Record<string, unknown>;
  return parseSerpPayload(data);
}

function mergeResults(
  a: Omit<ReverseSearchResult, "imageUrl"> | null,
  b: Omit<ReverseSearchResult, "imageUrl"> | null,
): Omit<ReverseSearchResult, "imageUrl"> | null {
  if (!a && !b) return null;
  const matches: ReverseSearchMatch[] = [];
  const seen = new Set<string>();
  for (const m of [...(a?.matches ?? []), ...(b?.matches ?? [])]) {
    const key = `${m.title ?? ""}|${m.link ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push(m);
  }
  const relatedQueries = [
    ...new Set([...(a?.relatedQueries ?? []), ...(b?.relatedQueries ?? [])]),
  ].slice(0, 8);

  return {
    queryGuess: a?.queryGuess ?? b?.queryGuess ?? null,
    matches: matches.slice(0, 12),
    relatedQueries,
  };
}

export function summarizeReverseSearchForPrompt(
  result: ReverseSearchResult,
): string {
  const parts: string[] = [];
  if (result.queryGuess) parts.push(`Likely subject: ${result.queryGuess}`);
  if (result.relatedQueries.length > 0) {
    parts.push(`Related queries: ${result.relatedQueries.join("; ")}`);
  }
  for (const m of result.matches.slice(0, 8)) {
    const line = [
      m.title ? `Title: ${m.title}` : null,
      m.source ? `Source: ${m.source}` : null,
      m.snippet ? `Snippet: ${m.snippet}` : null,
      m.link ? `Link: ${m.link}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
    if (line) parts.push(line);
  }
  return parts.join("\n");
}

export async function fetchReverseImageSearch(
  imageBase64: string,
  mediaType: string,
): Promise<ReverseSearchResult | null> {
  const apiKey = process.env.SERPAPI_KEY?.trim();
  if (!apiKey) return null;

  const imageUrl = await uploadTemporaryImageUrl(imageBase64, mediaType);
  if (!imageUrl) return null;

  const [reverse, lens] = await Promise.all([
    serpReverseImageSearch(imageUrl, apiKey),
    serpLensSearch(imageUrl, apiKey),
  ]);

  const merged = mergeResults(reverse, lens);
  if (!merged) return null;

  return { imageUrl, ...merged };
}
