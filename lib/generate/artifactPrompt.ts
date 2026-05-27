export const ARTIFACT_STYLE_SUFFIX =
  "illustration only — the painted marginal scene itself, never a photograph of a book, manuscript, codex, or page; no open book, no photographed pages, no archival or museum documentation, no desk, no hands holding a volume, no camera perspective, no depth-of-field, no photographic lighting, no photo-real paper texture; medieval manuscript marginalia on parchment, hand-drawn with quill and iron gall ink, colored with washed water-based pigments and uneven dye bleeding into the fibers, no flat digital color fills, no vector art, no clean uniform outlines, stylized Romanesque figures with deliberately wrong flat perspective, stiff poses, elongated limbs, oversized hands, simplified faces, anatomically incorrect in the manner of 12th-century monastic art, no realistic anatomy, no 3D shading, no photorealism, no photography";

export function buildArtifactImagePrompt(description: string): string {
  const subject = description.trim();
  return `${subject}, ${ARTIFACT_STYLE_SUFFIX}`;
}
