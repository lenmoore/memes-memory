export type Recognition = {
  description: string;
  candidateName: string | null;
  visualElements: string[];
  culturalSituation: string;
  affectAndTone: string;
  thematicHooks: string[];
};

export function formatRecognitionForContext(recognition: Recognition): string {
  const parts = [
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
