import { fetchKym, summarizeKymForPrompt } from "@/lib/kym";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { name } = (await req.json()) as { name?: string };
  if (!name || typeof name !== "string") {
    return Response.json({ result: null });
  }
  const result = await fetchKym(name.trim());
  if (!result) {
    return Response.json({ result: null });
  }
  return Response.json({
    result,
    summary: summarizeKymForPrompt(result),
  });
}
