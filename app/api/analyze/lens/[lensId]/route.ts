import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getClient } from "@/lib/anthropic";
import { resolveImageMediaTypeFromBase64 } from "@/lib/imageMediaType";
import { getLens } from "@/lib/lenses/registry";
import { lensReadingToPlainText } from "@/lib/lenses/reading";
import { parseReadingResponse } from "@/lib/lenses/parseReadingResponse";
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
    const mediaType = resolveImageMediaTypeFromBase64(
      body.imageBase64,
      body.mediaType,
    );
    if (!mediaType) {
      return new Response("Unrecognized image format", { status: 400 });
    }
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: body.imageBase64,
      },
    });
    userContent.push({
      type: "text",
      text: `Read this meme through the ${lens.displayName} lens.

${buildReadingJsonFormat(lens)}`,
    });
  }

  const model = lens.model ?? "claude-haiku-4-5-20251001";

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const truncated = message.stop_reason === "max_tokens";
  const parsed = parseReadingResponse(text, { truncated });

  if (!parsed.ok) {
    const detail =
      parsed.reason === "truncated"
        ? "Model response was cut off before JSON finished. Try regenerate."
        : "Could not parse lens reading JSON.";
    return Response.json({ error: detail }, { status: 422 });
  }

  const reading = parsed.reading;

  return Response.json({
    reading,
    plainText: lensReadingToPlainText(reading),
  });
}
