import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CACHE_DIR = join(process.cwd(), ".cache", "images");

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

export async function readImageCache(hash: string): Promise<string | null> {
  try {
    const raw = await readFile(join(CACHE_DIR, `${hash}.json`), "utf-8");
    const parsed = JSON.parse(raw) as { url?: string };
    return typeof parsed.url === "string" ? parsed.url : null;
  } catch {
    return null;
  }
}

export async function writeImageCache(hash: string, url: string): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    join(CACHE_DIR, `${hash}.json`),
    JSON.stringify({ url }, null, 2),
  );
}
