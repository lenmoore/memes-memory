import Anthropic from "@anthropic-ai/sdk";
import { getClient } from "@/lib/anthropic";
import type { Recognition } from "@/lib/recognition";

export const runtime = "nodejs";

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

function normalizeRecognition(raw: Record<string, unknown>): Recognition {
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v.trim() : fallback;
  const strArr = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];

  return {
    description: str(raw.description, "Unable to describe this image."),
    candidateName: str(raw.candidateName) || null,
    visualElements: strArr(raw.visualElements),
    culturalSituation: str(raw.culturalSituation),
    affectAndTone: str(raw.affectAndTone),
    thematicHooks: strArr(raw.thematicHooks),
  };
}

export async function POST(req: Request) {
  const { imageBase64, mediaType } = (await req.json()) as {
    imageBase64: string;
    mediaType: string;
  };
  const client = getClient();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1400,
    system: `You are a sharp-eyed analyst of internet memes. Return strict JSON only:
{
  "description": string,
  "candidateName": string | null,
  "visualElements": string[],
  "culturalSituation": string,
  "affectAndTone": string,
  "thematicHooks": string[]
}

Field requirements:
- "description": 2–3 short paragraphs (150–250 words total). Name the template if recognizable. Describe composition, text overlays, figures, symbols, and what the meme is doing rhetorically — not just what it looks like.
- "candidateName": best KnowYourMeme-searchable name (e.g. "Saint Javelin", "NAFO", "Distracted Boyfriend"), or null if you cannot confidently name it.
- "visualElements": 4–8 concrete visual details as short phrases (e.g. "Orthodox icon halos", "Javelin missile in hand").
- "culturalSituation": 2–4 sentences on what discourse, community, conflict, or platform context this meme sits in.
- "affectAndTone": 1–2 sentences on the emotional register (grief, irony, rage, tenderness, etc.).
- "thematicHooks": 4–8 thematic tags as short phrases that could guide critical-theory readings (e.g. "religious iconography repurposed", "expatriate dislocation", "information warfare").

Return only the JSON object, no surrounding prose.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "Analyze this meme in depth. Identify it if you can, and extract as much contextual material as possible for downstream critical readings.",
          },
        ],
      },
    ],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const parsed = JSON.parse(extractJson(text)) as Record<string, unknown>;
    return Response.json(normalizeRecognition(parsed));
  } catch {
    return Response.json(
      normalizeRecognition({ description: text.trim(), candidateName: null }),
      { status: 200 },
    );
  }
}
