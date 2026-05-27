import Anthropic from "@anthropic-ai/sdk";
import { getClient } from "@/lib/anthropic";
import {
  resolveImageMediaTypeFromBase64,
  type AcceptedImageMediaType,
} from "@/lib/imageMediaType";
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

function clampCertainty(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeRecognition(raw: Record<string, unknown>): Recognition {
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v.trim() : fallback;
  const strArr = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];

  const memeCertainty = clampCertainty(raw.memeCertainty);
  const isMeme =
    typeof raw.isMeme === "boolean" ? raw.isMeme : memeCertainty >= 55;

  return {
    isMeme,
    memeCertainty,
    notMemeReason: str(raw.notMemeReason) || null,
    description: str(raw.description, "Unable to describe this image."),
    candidateName: str(raw.candidateName) || null,
    visualElements: strArr(raw.visualElements),
    culturalSituation: str(raw.culturalSituation),
    affectAndTone: str(raw.affectAndTone),
    thematicHooks: strArr(raw.thematicHooks),
  };
}

export async function POST(req: Request) {
  const { imageBase64, mediaType: declared } = (await req.json()) as {
    imageBase64: string;
    mediaType: string;
  };
  const mediaType = resolveImageMediaTypeFromBase64(imageBase64, declared);
  if (!mediaType) {
    return Response.json(
      { error: "Unsupported or unrecognized image format" },
      { status: 400 },
    );
  }
  const client = getClient();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    system: `You classify and describe images for a critical archive. Return strict JSON only.
{
  "isMeme": boolean,
  "memeCertainty": number,
  "notMemeReason": string | null,
  "description": string,
  "candidateName": string | null,
  "visualElements": string[],
  "culturalSituation": string,
  "affectAndTone": string,
  "thematicHooks": string[]
}

Field requirements:
- First decide if this is an internet meme (image macro, reaction image, captioned template, viral remix, meme format) vs a non-meme image (plain photo, product shot, artwork, screenshot without meme intent, document, etc.).
- "isMeme": true only if this is meant as an internet meme or clear meme template instance.
- "memeCertainty": integer 0–100 — your confidence that this is a meme, not just a funny photo.
- "notMemeReason": if isMeme is false or memeCertainty < 55, one short sentence why (e.g. "studio portrait, no template or caption"); otherwise null.
- "description": two or three paragraphs, 90–130 words total. Analytic and concrete. If meme, name the template if known and say how it works rhetorically. If not a meme, say plainly what the image is.
- "candidateName": best KnowYourMeme-searchable name, or null if unknown or not a meme.
- "visualElements": 4–8 specific phrases.
- "culturalSituation": one or two sentences on discourse, community, or conflict — specific, not generic (empty string if not a meme).
- "affectAndTone": one sentence on mood and register.
- "thematicHooks": 4–6 tags for critical readings (empty array if not a meme).

Return only the JSON object, no surrounding prose.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType satisfies AcceptedImageMediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "Classify whether this is an internet meme and rate your certainty 0–100. Then describe what you see.",
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
      normalizeRecognition({
        description: text.trim(),
        candidateName: null,
        isMeme: false,
        memeCertainty: 0,
        notMemeReason: "Could not classify this image.",
      }),
      { status: 200 },
    );
  }
}
