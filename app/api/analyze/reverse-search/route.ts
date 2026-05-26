import {
  fetchReverseImageSearch,
  summarizeReverseSearchForPrompt,
} from "@/lib/reverseImageSearch";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { imageBase64, mediaType } = (await req.json()) as {
    imageBase64?: string;
    mediaType?: string;
  };

  if (!imageBase64 || !mediaType) {
    return Response.json({ result: null, skipped: true });
  }

  if (!process.env.SERPAPI_KEY?.trim()) {
    return Response.json({
      result: null,
      skipped: true,
      reason: "no_api_key",
    });
  }

  const result = await fetchReverseImageSearch(imageBase64, mediaType);
  if (!result) {
    return Response.json({ result: null, skipped: false });
  }

  return Response.json({
    result,
    summary: summarizeReverseSearchForPrompt(result),
    skipped: false,
  });
}
