import type { Screen } from "@/lib/lenses/registry";

export type ImagePipelineContext = {
  screen1TextComplete: boolean;
  screen1DisplaySettled: boolean;
  lensHasReading: boolean;
  screen2TextComplete: boolean;
};

export function shouldGenerateImages(
  lensScreen: Screen,
  ctx: ImagePipelineContext,
): boolean {
  if (!ctx.lensHasReading) return false;
  if (lensScreen === 1) return ctx.screen1TextComplete;
  if (lensScreen === 2) return ctx.screen1DisplaySettled;
  return ctx.screen2TextComplete;
}

export function shouldRunScreen2Lenses(
  screen1DisplaySettled: boolean,
  selectedScreen2Ids: string[] | null,
): boolean {
  return screen1DisplaySettled && selectedScreen2Ids !== null;
}
