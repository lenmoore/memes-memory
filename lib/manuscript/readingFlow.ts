import type { Embed, FlowLine } from "pretext-flow";
import type { LensReading, VisualArtifactSide } from "@/lib/lenses/reading";

export const ARTIFACT_IMAGE_WIDTH = 280;
export const ARTIFACT_IMAGE_HEIGHT = Math.round(
  ARTIFACT_IMAGE_WIDTH * (16 / 9),
);
export const ARTIFACT_OUTSET = 80;
export const ARTIFACT_FLOW_MARGIN = 36;

export const TYPEWRITER_CHARS_PER_SECOND = 90;
export const EMBED_SETTLE_MS = 600;
export const MIN_TEXT_COLUMN_WIDTH = 240;

export type ArtifactMeta = {
  id: string;
  description: string;
  side: VisualArtifactSide;
};

export type ReadingFlowInput = {
  text: string;
  embeds: Embed[];
  artifacts: ArtifactMeta[];
  boldLines: Set<string>;
  font: string;
  lineHeight: number;
  paragraphGap: number;
};

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

export function buildReadingFlow(reading: LensReading): ReadingFlowInput {
  const paragraphs: string[] = [];
  const artifacts: ArtifactMeta[] = [];
  const embeds: Embed[] = [];
  const boldLines = new Set<string>();

  for (const section of reading.sections) {
    if (section.type === "prose") {
      for (const rawLine of section.markdown.split("\n")) {
        const trimmed = rawLine.trim();
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          boldLines.add(stripMarkdown(trimmed));
        }
      }
      const plain = stripMarkdown(section.markdown);
      for (const para of plain.split(/\n+/)) {
        const text = para.trim();
        if (text) paragraphs.push(text);
      }
      continue;
    }

    const id = `artifact-${artifacts.length}`;
    artifacts.push({
      id,
      description: section.description,
      side: section.side,
    });

    embeds.push({
      id,
      shape: {
        type: "rect",
        width: ARTIFACT_IMAGE_WIDTH,
        height: ARTIFACT_IMAGE_HEIGHT,
      },
      position: {
        type: "flow",
        paragraph: Math.max(0, paragraphs.length - 1),
        progress: Math.min(0.82, 0.12 + artifacts.length * 0.36),
        side: section.side,
      },
      margin: ARTIFACT_FLOW_MARGIN,
    });
  }

  return {
    text: paragraphs.join("\n"),
    embeds,
    artifacts,
    boldLines,
    font: '17px Georgia, "Times New Roman", serif',
    lineHeight: 28,
    paragraphGap: 14,
  };
}

export function layoutCharacterCount(lines: FlowLine[]): number {
  return lines.reduce((sum, line) => sum + line.text.length, 0);
}

export function buildVisibleLines(
  lines: FlowLine[],
  revealedChars: number,
): FlowLine[] {
  if (revealedChars <= 0) return [];

  let count = 0;
  const visible: FlowLine[] = [];

  for (const line of lines) {
    const len = line.text.length;
    if (len === 0) continue;

    if (count + len <= revealedChars) {
      visible.push(line);
      count += len;
      continue;
    }

    if (count < revealedChars) {
      const take = revealedChars - count;
      visible.push({
        ...line,
        text: line.text.slice(0, take),
        width: (line.width / len) * take,
      });
    }
    break;
  }

  return visible;
}

export function truncateFlowText(text: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  return text.slice(0, maxChars);
}

export type EmbedVisualFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  objectPosition: "left center" | "right center";
};

export type ManuscriptLayoutMode = "rails" | "stacked";

export type ManuscriptLayout = {
  mode: ManuscriptLayoutMode;
  contentWidth: number;
  canvasWidth: number;
  canvasOffset: number;
  textColumnWidth: number;
  hasLeftRail: boolean;
  hasRightRail: boolean;
};

export function embedVisualFramesOverlap(
  left: { left: number; right: number },
  right: { left: number; right: number },
): boolean {
  return left.right > right.left;
}

export function computeManuscriptLayout(
  contentWidth: number,
  artifacts: ArtifactMeta[],
): ManuscriptLayout {
  const safeWidth = Math.max(0, contentWidth);
  const hasLeftRail = artifacts.some((artifact) => artifact.side === "left");
  const hasRightRail = artifacts.some((artifact) => artifact.side === "right");
  const dualRails = hasLeftRail && hasRightRail;

  const minRailsWidth =
    (hasLeftRail ? ARTIFACT_IMAGE_WIDTH + ARTIFACT_FLOW_MARGIN : 0) +
    (hasRightRail ? ARTIFACT_IMAGE_WIDTH + ARTIFACT_FLOW_MARGIN : 0) +
    MIN_TEXT_COLUMN_WIDTH;

  const expandedWidth = safeWidth + 2 * ARTIFACT_OUTSET;
  const canUseRails = !dualRails || expandedWidth >= minRailsWidth;

  if (!canUseRails) {
    return {
      mode: "stacked",
      contentWidth: safeWidth,
      canvasWidth: safeWidth,
      canvasOffset: 0,
      textColumnWidth: safeWidth,
      hasLeftRail,
      hasRightRail,
    };
  }

  return {
    mode: "rails",
    contentWidth: safeWidth,
    canvasWidth: expandedWidth,
    canvasOffset: -ARTIFACT_OUTSET,
    textColumnWidth:
      expandedWidth -
      (hasLeftRail ? ARTIFACT_IMAGE_WIDTH + ARTIFACT_FLOW_MARGIN : 0) -
      (hasRightRail ? ARTIFACT_IMAGE_WIDTH + ARTIFACT_FLOW_MARGIN : 0),
    hasLeftRail,
    hasRightRail,
  };
}

export function embedsForLayout(
  embeds: Embed[],
  layout: ManuscriptLayout,
): Embed[] {
  if (layout.mode === "stacked") {
    return embeds.map((embed) => ({
      ...embed,
      position:
        embed.position.type === "flow"
          ? { ...embed.position, side: "center" as const }
          : embed.position,
    }));
  }
  return embeds;
}

export function visualEmbedFrame(
  side: VisualArtifactSide,
  rect: { x: number; y: number; width: number; height: number },
  layout: ManuscriptLayout,
): EmbedVisualFrame {
  if (layout.mode === "stacked") {
    return {
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
      objectPosition: "left center",
    };
  }

  if (side === "left") {
    return {
      left: rect.x - ARTIFACT_OUTSET,
      top: rect.y,
      width: rect.width + ARTIFACT_OUTSET,
      height: rect.height,
      objectPosition: "left center",
    };
  }
  return {
    left: rect.x,
    top: rect.y,
    width: rect.width + ARTIFACT_OUTSET,
    height: rect.height,
    objectPosition: "right center",
  };
}
