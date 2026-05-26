import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getClient } from "@/lib/anthropic";
import { getLens } from "@/lib/lenses/registry";
import { buildSystemPrompt } from "@/lib/lenses/prompts/systemTemplate";

export const runtime = "nodejs";

type LensRequest = {
  imageBase64?: string;
  mediaType?: string;
  kym?: string | null;
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

Write a 2-4 sentence plain-language synthesis explaining what this meme means and does, for a smart non-internet-native reader. No jargon. Do not repeat the readings above; synthesize them.

Format in Markdown: open with one **bold** summary sentence, then one short prose paragraph if needed. No headings, bullet lists, or links.`,
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
      text: `Read this meme through the ${lens.displayName} lens.`,
    });
  }

  const model =
    lens.model ??
    (lens.isSynthesis ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6");

  const stream = client.messages.stream({
    model,
    max_tokens: 500,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const encoder = new TextEncoder();
  const body_ = new ReadableStream<Uint8Array>({
    start(controller) {
      let settled = false;
      stream.on("text", (text: string) => {
        if (settled) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {}
      });
      stream.on("end", () => {
        if (settled) return;
        settled = true;
        try { controller.close(); } catch {}
      });
      stream.on("error", (err: Error) => {
        if (settled) return;
        settled = true;
        try {
          controller.enqueue(
            encoder.encode(`\n\n[stream error: ${err.message}]`),
          );
        } catch {}
        try { controller.error(err); } catch {}
      });
    },
    cancel() {
      stream.controller?.abort();
    },
  });

  return new Response(body_, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
