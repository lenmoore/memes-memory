export type VisualArtifactSide = "left" | "right";

export type ProseSection = {
  type: "prose";
  markdown: string;
};

export type ArtifactSection = {
  type: "artifact";
  label: string;
  description: string;
  side: VisualArtifactSide;
};

export type ReadingSection = ProseSection | ArtifactSection;

export type LensReading = {
  title: string;
  provocativePoints: string[];
  sections: ReadingSection[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSide(value: unknown, index: number): VisualArtifactSide {
  if (value === "right") return "right";
  if (value === "left") return "left";
  return index % 2 === 0 ? "left" : "right";
}

function normalizeSection(raw: unknown, index: number): ReadingSection | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;

  if (raw.type === "prose" && typeof raw.markdown === "string") {
    const markdown = raw.markdown.trim();
    if (!markdown) return null;
    return { type: "prose", markdown };
  }

  if (raw.type === "artifact") {
    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    const description =
      typeof raw.description === "string" ? raw.description.trim() : "";
    if (!label || !description) return null;
    return {
      type: "artifact",
      label,
      description,
      side: normalizeSide(raw.side, index),
    };
  }

  return null;
}

function normalizeProvocativePoints(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const points = raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return points.slice(0, 3);
}

function firstBoldLine(sections: ReadingSection[]): string | null {
  for (const section of sections) {
    if (section.type !== "prose") continue;
    for (const rawLine of section.markdown.split("\n")) {
      const trimmed = rawLine.trim();
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        return trimmed.replace(/\*\*/g, "").trim();
      }
    }
  }
  return null;
}

export function parseLensReading(raw: unknown): LensReading | null {
  if (!isRecord(raw) || !Array.isArray(raw.sections)) return null;

  const sections = raw.sections
    .map((section, index) => normalizeSection(section, index))
    .filter((section): section is ReadingSection => section !== null);

  if (sections.length === 0) return null;

  const title =
    typeof raw.title === "string" ? raw.title.trim() : "";
  const provocativePoints = normalizeProvocativePoints(raw.provocativePoints);

  return { title, provocativePoints, sections };
}

export function readingDisplayTitle(
  reading: LensReading,
  lensDisplayName: string,
): string {
  if (reading.title) return reading.title;
  const bold = firstBoldLine(reading.sections);
  if (bold) return bold;
  if (lensDisplayName) return lensDisplayName;
  return "Reading";
}

export function readingProvocativePoints(reading: LensReading): string[] {
  return reading.provocativePoints;
}

export function lensReadingToPlainText(reading: LensReading): string {
  return reading.sections
    .map((section) =>
      section.type === "prose" ? section.markdown : section.description,
    )
    .join("\n\n");
}

export function markdownToFallbackReading(markdown: string): LensReading {
  const trimmed = markdown.trim();
  if (!trimmed) return { title: "", provocativePoints: [], sections: [] };
  return {
    title: "",
    provocativePoints: [],
    sections: [{ type: "prose", markdown: trimmed }],
  };
}
