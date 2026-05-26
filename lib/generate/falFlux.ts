import { fal } from "@fal-ai/client";
import { buildArtifactImagePrompt } from "@/lib/generate/artifactPrompt";
import {
  hashPrompt,
  readImageCache,
  writeImageCache,
} from "@/lib/generate/imageCache";

const FLUX_MODEL = "fal-ai/flux-2-pro";

type FluxProOutput = {
  images?: Array<{ url?: string }>;
};

export type GenerateArtifactResult = {
  url: string;
  prompt: string;
  cached: boolean;
};

function getFalKey(): string | null {
  return process.env.FAL_KEY?.trim() ?? null;
}

export function isArtifactGenerationConfigured(): boolean {
  return Boolean(getFalKey());
}

export async function generateArtifactImage(
  description: string,
): Promise<GenerateArtifactResult | null> {
  const falKey = getFalKey();
  if (!falKey) return null;

  fal.config({ credentials: falKey });

  const prompt = buildArtifactImagePrompt(description);
  const hash = hashPrompt(prompt);

  const cachedUrl = await readImageCache(hash);
  if (cachedUrl) {
    return { url: cachedUrl, prompt, cached: true };
  }

  const result = await fal.subscribe(FLUX_MODEL, {
    input: {
      prompt,
      image_size: "portrait_16_9",
      output_format: "png",
      safety_tolerance: "2",
    },
  });

  const data = result.data as FluxProOutput;
  const url = data.images?.[0]?.url;
  if (!url) return null;

  await writeImageCache(hash, url);
  return { url, prompt, cached: false };
}
