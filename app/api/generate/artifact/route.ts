import {
  generateArtifactImage,
  isArtifactGenerationConfigured,
} from "@/lib/generate/falFlux";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isArtifactGenerationConfigured()) {
    return Response.json(
      { error: "FAL_KEY not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { description?: string };
  const description = body.description?.trim();
  if (!description) {
    return Response.json({ error: "description required" }, { status: 400 });
  }

  try {
    const result = await generateArtifactImage(description);
    if (!result) {
      return Response.json({ error: "generation failed" }, { status: 502 });
    }
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 502 });
  }
}
