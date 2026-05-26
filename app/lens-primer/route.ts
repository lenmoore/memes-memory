import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LENSES } from "@/lib/lenses/registry";

export const runtime = "nodejs";

const ALLOWED = new Set(
  LENSES.map((l) => l.primerPath).filter((p): p is string => Boolean(p)),
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const file = url.searchParams.get("file");
  if (!file || !ALLOWED.has(file)) {
    return new Response("not found", { status: 404 });
  }
  try {
    const text = await readFile(
      join(process.cwd(), "lib/lenses/primers", file),
      "utf-8",
    );
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new Response("not readable", { status: 500 });
  }
}
