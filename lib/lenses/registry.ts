export type Screen = 1 | 2 | 3;

export interface Lens {
  id: string;
  screen: Screen;
  displayName: string;
  primerPath: string | null;
  isSynthesis?: boolean;
  order: number;
  model?: string;
}

export const LENSES: Lens[] = [
  // Screen 1 — sequential
  { id: "historical",         screen: 1, displayName: "Historical / Evolutionary",
    primerPath: "historical.md",         order: 1 },
  { id: "semiotic",           screen: 1, displayName: "Visual Semiotic / Semantic",
    primerPath: "semiotic.md",           order: 2 },
  { id: "synthesis",          screen: 1, displayName: "Plain-Language Meaning",
    primerPath: null, isSynthesis: true, order: 3 },

  // Screen 2 — parallel
  { id: "cyberfeminist",      screen: 2, displayName: "Cyberfeminist",
    primerPath: "cyberfeminist.md",      order: 1 },
  { id: "geopolitical",       screen: 2, displayName: "Geopolitical / Postcolonial / Military",
    primerPath: "geopolitical.md",       order: 2 },
  { id: "anthropological",    screen: 2, displayName: "Anthropological",
    primerPath: "anthropological.md",    order: 3 },
  { id: "sociological",       screen: 2, displayName: "Sociological",
    primerPath: "sociological.md",       order: 4 },
  { id: "hauntology_content", screen: 2, displayName: "Hauntology (Content)",
    primerPath: "hauntology_content.md", order: 5 },
  { id: "trauma",             screen: 2, displayName: "Trauma / Medical",
    primerPath: "trauma.md",             order: 6 },

  // Screen 3 — parallel
  { id: "technofeudalism",    screen: 3, displayName: "Technofeudalism",
    primerPath: "technofeudalism.md",    order: 1 },
  { id: "algorithmic",        screen: 3, displayName: "Algorithmic",
    primerPath: "algorithmic.md",        order: 2 },
  { id: "interface",          screen: 3, displayName: "Interface",
    primerPath: "interface.md",          order: 3 },
  // hauntology_medium intentionally omitted; re-enable per CLAUDE.md Q1
];

export function getLens(id: string): Lens | undefined {
  return LENSES.find((l) => l.id === id);
}
