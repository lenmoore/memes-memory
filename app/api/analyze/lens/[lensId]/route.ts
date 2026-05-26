import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getClient } from "@/lib/anthropic";
import { getLens } from "@/lib/lenses/registry";
import {
  lensReadingToPlainText,
  markdownToFallbackReading,
  parseLensReading,
  type LensReading,
} from "@/lib/lenses/reading";
import {
  buildReadingJsonFormat,
  buildSynthesisReadingJsonFormat,
} from "@/lib/lenses/prompts/readingFormat";
import { buildSystemPrompt } from "@/lib/lenses/prompts/systemTemplate";

export const runtime = "nodejs";

type LensRequest = {
  imageBase64?: string;
  mediaType?: string;
  kym?: string | null;
  webContext?: string | null;
  priorOutputs?: { historical?: string; semiotic?: string };
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

function parseReadingResponse(text: string): LensReading {
  try {
    const parsed = parseLensReading(JSON.parse(extractJson(text)));
    if (parsed) return parsed;
  } catch {
    // fall through
  }
  return markdownToFallbackReading(text);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ lensId: string }> },
) {
  const { lensId } = await context.params;
  const lens = getLens(lensId);
  if (!lens) {
    return new Response(`Unknown lens: ${lensId}`, { status: 404 });
  }

  const body = (await req.json()) as LensRequest;
  const client = getClient();
  const system = buildSystemPrompt(lens.displayName);

  const userContent: Anthropic.Messages.ContentBlockParam[] = [];

  if (lens.isSynthesis) {
    const prior = body.priorOutputs ?? {};
    userContent.push({
      type: "text",
      text: `Two prior readings of this meme:

HISTORICAL READING:
${prior.historical ?? "(missing)"}

SEMIOTIC READING:
${prior.semiotic ?? "(missing)"}

Write a synthesis: what this meme means and does, for an intelligent reader who may not know the internet. No empty jargon. Do not repeat the readings above. Two or three sentences after the bold opening. 60–100 words of prose.

${buildSynthesisReadingJsonFormat()}`,
    });
  } else {
    if (!lens.primerPath) {
      return new Response(
        `Lens "${lens.id}" has no primer configured.`,
        { status: 500 },
      );
    }
    let primer: string;
    try {
      primer = await readFile(
        join(process.cwd(), "lib/lenses/primers", lens.primerPath),
        "utf-8",
      );
    } catch {
      return new Response(
        `Primer not found for lens "${lens.id}". Add lib/lenses/primers/${lens.primerPath}.`,
        { status: 500 },
      );
    }

    userContent.push({ type: "text", text: `Primer:\n\n${primer}` });
    if (body.kym && lens.id === "historical") {
      userContent.push({
        type: "text",
        text: `KnowYourMeme context:\n\n${body.kym}`,
      });
    }
    if (
      body.webContext &&
      (lens.id === "historical" || lens.id === "semiotic")
    ) {
      userContent.push({
        type: "text",
        text: `Archive lookup (captions and matches):\n\n${body.webContext}`,
      });
    }
    if (!body.imageBase64 || !body.mediaType) {
      return new Response("Missing image", { status: 400 });
    }
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: body.mediaType as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: body.imageBase64,
      },
    });
    userContent.push({
      type: "text",
      text: `Read this meme through the ${lens.displayName} lens.

${buildReadingJsonFormat(lens)}`,
    });
  }

  const model =
    lens.model ??
    (lens.isSynthesis ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6");

  const message = await client.messages.create({
    model,
    max_tokens: 1000,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const reading = parseReadingResponse(text);

  return Response.json({
    reading,
    plainText: lensReadingToPlainText(reading),
  });
}
