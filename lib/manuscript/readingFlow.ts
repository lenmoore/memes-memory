import type { LensReading, VisualArtifactSide } from "@/lib/lenses/reading";

export const ARTIFACT_IMAGE_WIDTH = 280;
export const ARTIFACT_IMAGE_HEIGHT = Math.round(
  ARTIFACT_IMAGE_WIDTH * (16 / 9),
);
export const ARTIFACT_OUTSET = 80;
export const ARTIFACT_FLOW_MARGIN = 36;

export const TYPEWRITER_CHARS_PER_SECOND = 90;
export const EMBED_SETTLE_MS = 600;
export const MIN_TEXT_COLUMN_WIDTH = 400;

export type ArtifactMeta = {
  id: string;
  description: string;
  side: VisualArtifactSide;
};

export type ReadingBlock =
  | { type: "prose"; paragraphs: string[] }
  | {
      type: "artifact";
      id: string;
      description: string;
      side: VisualArtifactSide;
    };

export type ReadingContent = {
  blocks: ReadingBlock[];
  boldLines: Set<string>;
  font: string;
  lineHeight: number;
  paragraphGap: number;
};

export type LayoutLine = {
  x: number;
  y: number;
  text: string;
  width: number;
};

export type LayoutEmbed = {
  id: string;
  side: VisualArtifactSide;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutResult = {
  lines: LayoutLine[];
  embeds: LayoutEmbed[];
  height: number;
};

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

export function buildReadingContent(reading: LensReading): ReadingContent {
  const blocks: ReadingBlock[] = [];
  const boldLines = new Set<string>();
  let artifactIndex = 0;

  for (const section of reading.sections) {
    if (section.type === "prose") {
      for (const rawLine of section.markdown.split("\n")) {
        const trimmed = rawLine.trim();
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          boldLines.add(stripMarkdown(trimmed));
        }
      }
      const plain = stripMarkdown(section.markdown);
      const paragraphs = plain
        .split(/\n+/)
        .map((para) => para.trim())
        .filter(Boolean);
      if (paragraphs.length > 0) {
        blocks.push({ type: "prose", paragraphs });
      }
      continue;
    }

    const id = `artifact-${artifactIndex}`;
    artifactIndex += 1;
    blocks.push({
      type: "artifact",
      id,
      description: section.description,
      side: section.side,
    });
  }

  return {
    blocks,
    boldLines,
    font: '17px Georgia, "Times New Roman", serif',
    lineHeight: 28,
    paragraphGap: 14,
  };
}

export function readingArtifacts(content: ReadingContent): ArtifactMeta[] {
  return content.blocks.flatMap((block) =>
    block.type === "artifact"
      ? [{ id: block.id, description: block.description, side: block.side }]
      : [],
  );
}

export function wrapParagraph(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = words[0] ?? "";

  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }

  lines.push(current);
  return lines;
}

export function textColumnBounds(
  layout: ManuscriptLayout,
): { x: number; width: number } {
  if (layout.mode === "stacked") {
    return { x: 0, width: layout.textColumnWidth };
  }

  const leftPad = layout.hasLeftRail
    ? ARTIFACT_IMAGE_WIDTH + ARTIFACT_FLOW_MARGIN
    : 0;
  return { x: leftPad, width: layout.textColumnWidth };
}

export function layoutReading(
  content: ReadingContent,
  layout: ManuscriptLayout,
  measure: (value: string) => number,
): LayoutResult {
  const { x: textX, width: textWidth } = textColumnBounds(layout);
  const lines: LayoutLine[] = [];
  const embeds: LayoutEmbed[] = [];
  let y = 0;

  for (const block of content.blocks) {
    if (block.type === "prose") {
      for (let i = 0; i < block.paragraphs.length; i += 1) {
        const wrapped = wrapParagraph(block.paragraphs[i] ?? "", textWidth, measure);
        for (const text of wrapped) {
          lines.push({
            x: textX,
            y,
            text,
            width: measure(text),
          });
          y += content.lineHeight;
        }
        if (i < block.paragraphs.length - 1) {
          y += content.paragraphGap;
        }
      }
      y += content.paragraphGap;
      continue;
    }

    const frame = artifactLayoutFrame(block.side, y, layout);
    embeds.push({
      id: block.id,
      side: block.side,
      ...frame,
    });

    if (layout.mode === "stacked") {
      y += frame.height + content.paragraphGap;
    }
  }

  const height = Math.max(
    y,
    ...embeds.map((embed) => embed.y + embed.height),
    120,
  );

  return { lines, embeds, height };
}

export function layoutCharacterCount(lines: LayoutLine[]): number {
  return lines.reduce((sum, line) => sum + line.text.length, 0);
}

export function buildVisibleLines(
  lines: LayoutLine[],
  revealedChars: number,
): LayoutLine[] {
  if (revealedChars <= 0) return [];

  let count = 0;
  const visible: LayoutLine[] = [];

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

function artifactLayoutFrame(
  side: VisualArtifactSide,
  y: number,
  layout: ManuscriptLayout,
): { x: number; y: number; width: number; height: number } {
  if (layout.mode === "stacked") {
    return {
      x: (layout.canvasWidth - ARTIFACT_IMAGE_WIDTH) / 2,
      y,
      width: ARTIFACT_IMAGE_WIDTH,
      height: ARTIFACT_IMAGE_HEIGHT,
    };
  }

  if (side === "left") {
    return {
      x: 0,
      y,
      width: ARTIFACT_IMAGE_WIDTH,
      height: ARTIFACT_IMAGE_HEIGHT,
    };
  }

  return {
    x: layout.canvasWidth - ARTIFACT_IMAGE_WIDTH,
    y,
    width: ARTIFACT_IMAGE_WIDTH,
    height: ARTIFACT_IMAGE_HEIGHT,
  };
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

export function lineOverlapsEmbed(
  line: LayoutLine,
  embed: LayoutEmbed,
  lineHeight: number,
): boolean {
  const lineRight = line.x + line.width;
  const embedRight = embed.x + embed.width;
  const lineBottom = line.y + lineHeight;
  const embedBottom = embed.y + embed.height;
  const xOverlap = line.x < embedRight && lineRight > embed.x;
  const yOverlap = line.y < embedBottom && lineBottom > embed.y;
  return xOverlap && yOverlap;
}
