export type Recognition = {
  isMeme: boolean;
  memeCertainty: number;
  notMemeReason: string | null;
  description: string;
  candidateName: string | null;
  visualElements: string[];
  culturalSituation: string;
  affectAndTone: string;
  thematicHooks: string[];
};

/** Minimum certainty (0–100) required before running lens analysis. */
export const MEME_CERTAINTY_THRESHOLD = 55;

export function isMemeForAnalysis(recognition: Recognition): boolean {
  return recognition.isMeme && recognition.memeCertainty >= MEME_CERTAINTY_THRESHOLD;
}

export function formatRecognitionForContext(recognition: Recognition): string {
  const parts = [
    `Meme certainty: ${recognition.memeCertainty}%`,
    `Description:\n${recognition.description}`,
    `Visual elements: ${recognition.visualElements.join("; ")}`,
    `Cultural situation: ${recognition.culturalSituation}`,
    `Affect and tone: ${recognition.affectAndTone}`,
    `Thematic hooks: ${recognition.thematicHooks.join("; ")}`,
  ];
  if (recognition.candidateName) {
    parts.push(`Candidate meme name: ${recognition.candidateName}`);
  }
  return parts.join("\n\n");
}
