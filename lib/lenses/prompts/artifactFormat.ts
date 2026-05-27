import type { Lens } from "@/lib/lenses/registry";

const LENS_ARTIFACT_EXTRAPOLATIONS: Record<string, string> = {
  historical:
    "Prior template, woodcut ancestor, diffusion as genealogy tree, an earlier mutation era — not the meme screenshot again.",
  semiotic:
    "Pure sign: split symbol, empty frame, color field, gesture without face — the structure, not the stock image.",
  cyberfeminist:
    "Body at labor: hands on keyboard, icon turned figure, invisible worker behind the screen, care-work scene.",
  geopolitical:
    "Border, uniform, map edge, siege camp, passport desk — power made visible at human scale.",
  anthropological:
    "Gathering, handshake, shared meal, totem object, initiation — kinship without the meme cast.",
  sociological:
    "Queue, shift clock, commute, lease, break room — the human institution the joke points at.",
  hauntology_content:
    "Ruined mall, dead format, empty playground, faded poster — the future that did not arrive.",
  trauma:
    "Sickbed, chart on wall, clenched hands, waiting room — symptom as scene, not meme face.",
  technofeudalism:
    "Serf at gate, rent scroll, platform badge as livery, lord's ledger — feudal form for digital rule.",
  algorithmic:
    "Sorting chute, ranked shelf, feed as unrolled ribbon, gate that opens for some — sort logic as image.",
  interface:
    "Button, cursor hand, loading wheel, modal frame, scrollbar — the chrome the meme lives inside.",
  synthesis:
    "One human-scale scene and one plain object that carry the joke for a reader who never saw the meme.",
};

export function buildArtifactGuidance(lens: Lens): string {
  const extrapolation =
    LENS_ARTIFACT_EXTRAPOLATIONS[lens.id] ??
    "Scenes and objects the lens pulls out of the meme — not a repeat of its faces.";

  return `Visual artifact rules (${lens.displayName} lens):
- Artifacts are brief visual descriptions. One or two sentences each — specific, concrete, literate.
- Do NOT describe the same figure twice. Do NOT copy the meme panel three times with new adjectives.
- At most ONE artifact may name a literal meme element (a face, animal, prop from the image). The rest must extrapolate.
- Extrapolate the meme's structure into other scenes: human work, ritual, history, architecture, objects, crowds — as this lens would see them.
- For template memes (e.g. "born to X, forced to Y"): one artifact may hold the template logic; others should show where that logic lands in human life (desk job, oath, guild rule, clinic wait) — not more cats, not more reaction faces.
- Lens drift for this reading: ${extrapolation}
- Each artifact must differ in subject, scale, and era. Mix: close figure / wide scene / object-only / architecture / margin symbol.
- Labels name what to paint ("Night shift clerk", "Guild oath", "Feed scroll") — not "the cat on the left".`;
}

export function buildReadingJsonFormat(lens: Lens): string {
  const artifactRules = buildArtifactGuidance(lens);

  return `Return raw JSON only — no markdown code fences, no backticks, no surrounding prose:
{
  "title": "...",
  "provocativePoints": ["...", "..."],
  "sections": [
    { "type": "prose", "markdown": "..." },
    { "type": "artifact", "label": "...", "description": "...", "side": "left" | "right" },
    ...
  ]
}

Top-level fields:
- "title": 3–8 words. A museum placard headline for this reading — not the lens name, not the meme's internet title. Punchy and specific.
- "provocativePoints": array of 1–3 strings. The sharpest claims from your reading — declarative, provocative, under 22 words each. No hedging, no "arguably". Extract the lines a visitor would quote; do not repeat the title verbatim.

Section rules:
- "sections" is an ordered array mixing prose and artifact blocks.
- First section must be prose containing the opening **bold** diagnosis on its own line.
- Include exactly 2 or 3 artifact sections, each placed between prose blocks (never all at the end).
- Prose total: 110–160 words across all prose sections. Analytic but economical. Two or three sentences per paragraph. Markdown only; no headings, bullet lists, or links.

${artifactRules}

- "side": alternate left and right where possible so text can wrap around the placeholders.`;
}

export function buildSynthesisReadingJsonFormat(): string {
  return `Return raw JSON only — no markdown code fences, no backticks, no surrounding prose:
{
  "title": "...",
  "provocativePoints": ["..."],
  "sections": [
    { "type": "prose", "markdown": "..." },
    { "type": "artifact", "label": "...", "description": "...", "side": "left" | "right" }
  ]
}

Top-level fields:
- "title": 3–8 words. Plain-language placard headline for what this meme means — not the lens name.
- "provocativePoints": 1–2 strings. The two sharpest plain-language claims; under 22 words each; no hedging.

Section rules:
- First section: prose with one **bold** summary sentence, then one paragraph of two or three sentences.
- Prose total: 60–100 words. Plain but not dumb — name what the meme does and why it lands.
- Include 1 or 2 artifact sections between prose blocks.

Visual artifact rules (synthesis):
- Artifacts are for a reader who never saw the meme. Do not repeat meme faces or panels.
- Extrapolate to human scenes and objects that carry the joke (work, oath, wait, desire vs duty).
- One or two sentences each, visually specific. Each artifact must look unlike the others and unlike the source image.
- ${LENS_ARTIFACT_EXTRAPOLATIONS.synthesis}
- "side": alternate left and right where possible.`;
}
