import Anthropic from "@anthropic-ai/sdk";
import { getClient } from "@/lib/anthropic";
import { getLensesForScreen } from "@/lib/lenses/registry";
import { formatRecognitionForContext, type Recognition } from "@/lib/recognition";

export const runtime = "nodejs";

type SelectLensesRequest = {
  recognition: Recognition;
  screen1?: {
    historical?: string;
    semiotic?: string;
    synthesis?: string;
  };
  kymSummary?: string | null;
};

type SelectLensesResponse = {
  selected: string[];
  rationale: string;
};

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}

function normalizeSelection(
  raw: Record<string, unknown>,
  allowedIds: string[],
): SelectLensesResponse {
  const allowed = new Set(allowedIds);
  const rawSelected = Array.isArray(raw.selected)
    ? raw.selected.filter((id): id is string => typeof id === "string")
    : [];
  const deduped: string[] = [];
  for (const id of rawSelected) {
    if (allowed.has(id) && !deduped.includes(id)) deduped.push(id);
  }

  for (const id of allowedIds) {
    if (deduped.length >= 3) break;
    if (!deduped.includes(id)) deduped.push(id);
  }

  const selected = deduped.slice(0, 3);
  while (selected.length < 2) {
    const next = allowedIds.find((id) => !selected.includes(id));
    if (!next) break;
    selected.push(next);
  }

  const rationale =
    typeof raw.rationale === "string" ? raw.rationale.trim() : "";

  return { selected, rationale };
}

export async function POST(req: Request) {
  const body = (await req.json()) as SelectLensesRequest;
  const screen2Lenses = getLensesForScreen(2);
  const allowedIds = screen2Lenses.map((l) => l.id);

  const lensCatalog = screen2Lenses
    .map(
      (l) =>
        `- ${l.id}: ${l.displayName} — ${l.selectionHint ?? l.displayName}`,
    )
    .join("\n");

  const contextParts = [
    formatRecognitionForContext(body.recognition),
    body.kymSummary ? `KnowYourMeme context:\n${body.kymSummary}` : null,
    body.screen1?.historical
      ? `Historical reading:\n${body.screen1.historical}`
      : null,
    body.screen1?.semiotic
      ? `Semiotic reading:\n${body.screen1.semiotic}`
      : null,
    body.screen1?.synthesis
      ? `Plain-language synthesis:\n${body.screen1.synthesis}`
      : null,
  ].filter(Boolean);

  const client = getClient();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: `You choose which critical-theory lenses will yield the sharpest readings of a specific meme.

Available lenses (choose exactly 2 or 3):
${lensCatalog}

Return strict JSON only:
{ "selected": string[], "rationale": string }

Rules:
- "selected" must contain 2 or 3 lens ids from the list above — no others.
- Pick lenses where this meme has real material to work with, not where a reading would be forced or generic.
- Prefer lenses that would produce distinct, non-overlapping readings.
- "rationale": two sentences. Analytic, specific to this meme — say why these lenses fit.`,
    messages: [
      {
        role: "user",
        content: `Meme context:\n\n${contextParts.join("\n\n---\n\n")}\n\nWhich 2–3 lenses should run?`,
      },
    ],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const parsed = JSON.parse(extractJson(text)) as Record<string, unknown>;
    return Response.json(normalizeSelection(parsed, allowedIds));
  } catch {
    return Response.json(
      normalizeSelection({ selected: allowedIds.slice(0, 3), rationale: "" }, allowedIds),
    );
  }
}
