import Anthropic from "@anthropic-ai/sdk";
import { getClient } from "@/lib/anthropic";

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

export async function POST(req: Request) {
  const { imageBase64, mediaType } = (await req.json()) as {
    imageBase64: string;
    mediaType: string;
  };
  const client = getClient();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: `You are identifying an internet meme. Return strict JSON: { "description": string, "candidateName": string | null }.
- "description" is 2-4 sentences describing what is depicted, including the template if recognizable.
- "candidateName" is your best guess at a KnowYourMeme-searchable name for this meme (e.g. "Saint Javelin", "NAFO", "Distracted Boyfriend"), or null if you cannot confidently name it.
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
          { type: "text", text: "Identify and describe this meme." },
        ],
      },
    ],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const parsed = JSON.parse(extractJson(text));
    return Response.json(parsed);
  } catch {
    return Response.json(
      { description: text.trim(), candidateName: null },
      { status: 200 },
    );
  }
}
