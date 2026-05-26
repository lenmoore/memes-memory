export type Screen = 1 | 2 | 3;

export interface Lens {
  id: string;
  screen: Screen;
  displayName: string;
  primerPath: string | null;
  isSynthesis?: boolean;
  order: number;
  model?: string;
  selectionHint?: string;
}

export const LENSES: Lens[] = [
  // Screen 1 — sequential
  { id: "historical",         screen: 1, displayName: "Historical / Evolutionary",
    primerPath: "historical.md",         order: 1 },
  { id: "semiotic",           screen: 1, displayName: "Visual Semiotic / Semantic",
    primerPath: "semiotic.md",           order: 2 },
  { id: "synthesis",          screen: 1, displayName: "Plain-Language Meaning",
    primerPath: null, isSynthesis: true, order: 3 },

  // Screen 2 — selected per meme (2–3 of these)
  { id: "cyberfeminist",      screen: 2, displayName: "Cyberfeminist",
    primerPath: "cyberfeminist.md",      order: 1,
    selectionHint: "Gender, embodiment, feminized labor online, cyborg politics, Marian/military iconography" },
  { id: "geopolitical",       screen: 2, displayName: "Geopolitical / Postcolonial / Military",
    primerPath: "geopolitical.md",       order: 2,
    selectionHint: "War, empire, state power, nationalism, postcolonial dynamics, information warfare" },
  { id: "anthropological",    screen: 2, displayName: "Anthropological",
    primerPath: "anthropological.md",    order: 3,
    selectionHint: "Kinship, ritual, communitas, in-group signaling, meme-as-social-bond" },
  { id: "sociological",       screen: 2, displayName: "Sociological",
    primerPath: "sociological.md",       order: 4,
    selectionHint: "Class, migration, everyday life, institutional friction, collective mood" },
  { id: "hauntology_content", screen: 2, displayName: "Hauntology (Content)",
    primerPath: "hauntology_content.md", order: 5,
    selectionHint: "Lost futures, nostalgia, spectral repetition, cultural decay, retro aesthetics" },
  { id: "trauma",             screen: 2, displayName: "Trauma / Medical",
    primerPath: "trauma.md",             order: 6,
    selectionHint: "Psychic wound, diagnostic language, coping registers, body-as-symptom" },

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

export function getLensesForScreen(screen: Screen): Lens[] {
  return LENSES.filter((l) => l.screen === screen).sort((a, b) => a.order - b.order);
}
