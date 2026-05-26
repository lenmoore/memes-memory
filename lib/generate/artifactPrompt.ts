export const ARTIFACT_STYLE_SUFFIX =
  "medieval manuscript marginalia on parchment, hand-drawn with quill and iron gall ink, colored with washed water-based pigments and uneven dye bleeding into the fibers, no flat digital color fills, no vector art, no clean uniform outlines, stylized Romanesque figures with deliberately wrong flat perspective, stiff poses, elongated limbs, oversized hands, simplified faces, anatomically incorrect in the manner of 12th-century monastic art, no realistic anatomy, no 3D shading, no photorealism";

export function buildArtifactImagePrompt(description: string): string {
  const subject = description.trim();
  return `${subject}, ${ARTIFACT_STYLE_SUFFIX}`;
}
