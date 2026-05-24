# Memes as Stained Glass — Web MVP

## What this project is

A web app that takes an uploaded meme and produces critical-theoretical readings of it through ~13 distinct analytical lenses, displayed in a scrollable, three-screen layout. The conceptual frame is the project's larger argument that internet memes are the vernacular stained glass of the technofeudal age — containers for grief, identity, and political feeling that modernity has otherwise stripped of public grammar.

For this MVP, the work is **textual only**. No image generation. No visual register (medieval typography, illuminations, etc.) yet — that comes in a later phase. Right now we are building the text pipeline end-to-end.

The editorial voice is "cathedral docent": deadpan, precise, written in the register of a museum wall label. Not jokey, not hedging, not bullet-pointed corporate LLM voice. The prompts must enforce this — defaults will undo it.

## Scope for this MVP

Build:
- Single-page web app, upload at top, scroll down through analyses
- Vision-based meme recognition pass
- KnowYourMeme lookup (with graceful fallback)
- 13 lens analyses, organized into 3 screens
- Streaming responses
- Hash-based caching so re-uploads don't re-spend API calls

Do not build:
- Image generation (later phase)
- The medieval visual register (later phase)
- Lens-selection logic (for now all 13 lenses always run; intelligent selection is a later phase)
- User accounts, persistence beyond the cache, billing, analytics
- Proper database; file-based JSON cache is fine for MVP
- RAG / vector DB; per-lens primers are pasted in as context

## Tech stack

Locked decisions — do not relitigate:

- **Next.js 15+ with App Router**, TypeScript
- **Tailwind CSS** for styling
- **`@anthropic-ai/sdk`** for all Claude calls (server-side only)
- **`cheerio`** for KYM HTML parsing
- **File-based JSON cache** in `.cache/` at the project root, gitignored
- **Node.js 20 LTS or later** (required by the SDK)
- **Environment variable** `ANTHROPIC_API_KEY` — never client-exposed

API routes are server-side only. The Anthropic key must never reach the browser. All Claude calls go through `/app/api/*` routes.

## File structure

```
/app
  page.tsx                          # main page: upload + scrollable results
  layout.tsx
  globals.css
  /api
    /analyze
      /recognize/route.ts           # POST: image -> { description, candidateName }
      /kym/route.ts                 # POST: { name } -> { origin, spread, about } | null
      /lens/[lensId]/route.ts       # POST: streams analysis for one lens
/components
  Upload.tsx                        # client component, handles file -> base64
  ResultsScroll.tsx                 # client component, orchestrates all lens calls
  LensPanel.tsx                     # display one lens result, streaming-aware
  Screen.tsx                        # wrapper for one of the 3 screens
/lib
  anthropic.ts                      # SDK client singleton
  cache.ts                          # hash-based file cache helpers
  kym.ts                            # KYM fetch + parse
  hash.ts                           # SHA-256 of image bytes
  /lenses
    registry.ts                     # the 13 lens definitions
    /primers                        # per-lens corpus primers (markdown)
      historical.md
      semiotic.md
      cyberfeminist.md
      ... (13 total)
    /prompts
      systemTemplate.ts             # shared system-prompt builder
      synthesisPrompt.ts            # screen-1 synthesis-specific
/.cache                             # gitignored, holds JSON per image hash
/.env.local                         # ANTHROPIC_API_KEY=...
```

## The pipeline

Sequence per upload:

1. **Client: upload + hash.** User selects an image. Client reads as base64, computes SHA-256 of the bytes.
2. **Client: cache check.** GET `/api/analyze/cache/[hash]`. If hit, render and stop.
3. **Server: recognize.** POST image to `/api/analyze/recognize`. Returns `{ description, candidateName }` — what's in the meme and a guess at its identifiable name (or `null` if it can't name it).
4. **Server: KYM.** If `candidateName` is non-null, POST `{ name: candidateName }` to `/api/analyze/kym`. Returns origin/spread/about sections from KYM, or `null` on miss. Cache by name.
5. **Client: fire screen 1.** Sequentially:
   - `historical` (uses image + KYM data if present + primer)
   - `semiotic` (uses image + primer)
   - `synthesis` (uses outputs of the two above, NO primer needed — it's pure synthesis)
6. **Client: fire screen 2.** All six lenses in parallel: `cyberfeminist`, `geopolitical`, `anthropological`, `sociological`, `hauntology_content`, `trauma`.
7. **Client: fire screen 3.** Three (or four) lenses in parallel: `technofeudalism`, `algorithmic`, `interface`, optionally `hauntology_medium`.
8. **Server: write cache** as each lens completes. The cache entry accumulates progressively — partial caches are fine and useful.
9. **Display:** each `LensPanel` streams tokens as they arrive. Screen 1 panels render in sequence (historical → semiotic → synthesis). Screen 2 and 3 panels render in parallel as they complete.

## Lens registry

The single source of truth for what lenses exist. Defined in `lib/lenses/registry.ts`:

```ts
export type Screen = 1 | 2 | 3;

export interface Lens {
  id: string;                       // 'cyberfeminist', 'technofeudalism', etc.
  screen: Screen;
  displayName: string;              // 'Cyberfeminist'
  primerPath: string | null;        // relative to lib/lenses/primers/, null for synthesis
  isSynthesis?: boolean;            // synthesis takes prior outputs as input, not a primer
  order: number;                    // ordering within its screen
}

export const LENSES: Lens[] = [
  // Screen 1 — sequential
  { id: 'historical',         screen: 1, displayName: 'Historical / Evolutionary',
    primerPath: 'historical.md',         order: 1 },
  { id: 'semiotic',           screen: 1, displayName: 'Visual Semiotic / Semantic',
    primerPath: 'semiotic.md',           order: 2 },
  { id: 'synthesis',          screen: 1, displayName: 'Plain-Language Meaning',
    primerPath: null, isSynthesis: true, order: 3 },

  // Screen 2 — parallel
  { id: 'cyberfeminist',      screen: 2, displayName: 'Cyberfeminist',
    primerPath: 'cyberfeminist.md',      order: 1 },
  { id: 'geopolitical',       screen: 2, displayName: 'Geopolitical / Postcolonial / Military',
    primerPath: 'geopolitical.md',       order: 2 },
  { id: 'anthropological',    screen: 2, displayName: 'Anthropological',
    primerPath: 'anthropological.md',    order: 3 },
  { id: 'sociological',       screen: 2, displayName: 'Sociological',
    primerPath: 'sociological.md',       order: 4 },
  { id: 'hauntology_content', screen: 2, displayName: 'Hauntology (Content)',
    primerPath: 'hauntology_content.md', order: 5 },
  { id: 'trauma',             screen: 2, displayName: 'Trauma / Medical',
    primerPath: 'trauma.md',             order: 6 },

  // Screen 3 — parallel
  { id: 'technofeudalism',    screen: 3, displayName: 'Technofeudalism',
    primerPath: 'technofeudalism.md',    order: 1 },
  { id: 'algorithmic',        screen: 3, displayName: 'Algorithmic',
    primerPath: 'algorithmic.md',        order: 2 },
  { id: 'interface',          screen: 3, displayName: 'Interface',
    primerPath: 'interface.md',          order: 3 },
  // hauntology_medium intentionally omitted from the registry by default;
  // re-enable if the team decides to keep the hauntology split
];
```

Adding/removing a lens means editing this registry and adding/removing a primer file. Nothing else should hard-code lens IDs.

## Models

Use these model strings (verify against `https://docs.claude.com/en/api/overview` if anything fails):

- **Recognition:** `claude-sonnet-4-6` — vision-capable, good cultural priors, fast enough.
- **Lens analyses:** `claude-sonnet-4-6` for MVP. If a specific lens consistently produces weak output, override that lens to `claude-opus-4-7` in `registry.ts` via an optional `model` field. Don't escalate everything to Opus blindly.
- **Synthesis:** `claude-haiku-4-5-20251001` — synthesis is the simplest job and Haiku handles it cheaply.
- **KYM scraping flow has no model call.** Just HTTP + parse.

## Key implementation patterns

### Anthropic client singleton (`lib/anthropic.ts`)

```ts
import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}
```

### System prompt template (`lib/lenses/prompts/systemTemplate.ts`)

The voice must be enforced explicitly. Default Claude voice will undo the cathedral register.

```ts
export function buildSystemPrompt(lensDisplayName: string): string {
  return `You are a cathedral docent. You read internet memes through a ${lensDisplayName} lens, in the editorial register of a museum wall label.

Voice constraints (these are not suggestions):
- Deadpan, precise, declarative. No hedging.
- Do not say "interestingly", "notably", "it is worth noting", "in many ways", "arguably".
- Do not apologize for the academic register.
- Do not bullet-point. Write in prose.
- Cite named theorists when relevant ("Mauss", "Fisher", "Haraway") but do not pad with citations to seem thorough.
- Open with a single-sentence diagnosis. Then two or three short paragraphs of analysis. End on the most consequential claim you can defend, not on a hedge.
- 150-250 words total.
- Write at the level of a smart magazine essay, not a journal article. The audience is a museum visitor with intellectual curiosity, not a specialist.

You are reading ONE meme through ONE lens. Do not try to be comprehensive. Make the lens earn its place.`;
}
```

### Vision recognition call (`app/api/analyze/recognize/route.ts`)

```ts
import { getClient } from '@/lib/anthropic';

export async function POST(req: Request) {
  const { imageBase64, mediaType } = await req.json();
  const client = getClient();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: `You are identifying an internet meme. Return strict JSON: { "description": string, "candidateName": string | null }. 
- "description" is 2-4 sentences describing what is depicted, including the template if recognizable.
- "candidateName" is your best guess at a KnowYourMeme-searchable name for this meme (e.g. "Saint Javelin", "NAFO", "Distracted Boyfriend"), or null if you cannot confidently name it.
Return only the JSON object, no surrounding prose.`,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: 'Identify and describe this meme.' },
      ],
    }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text).join('');

  return Response.json(JSON.parse(text));
}
```

### Per-lens streaming endpoint (`app/api/analyze/lens/[lensId]/route.ts`)

Returns a text stream the client reads progressively. Use the SDK's `messages.stream` and pipe to a `ReadableStream`.

```ts
import { getClient } from '@/lib/anthropic';
import { LENSES } from '@/lib/lenses/registry';
import { buildSystemPrompt } from '@/lib/lenses/prompts/systemTemplate';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function POST(
  req: Request,
  { params }: { params: { lensId: string } }
) {
  const { imageBase64, mediaType, kym, priorOutputs } = await req.json();
  const lens = LENSES.find(l => l.id === params.lensId);
  if (!lens) return new Response('Unknown lens', { status: 404 });

  const client = getClient();
  const system = buildSystemPrompt(lens.displayName);

  // Build user message content
  const userContent: Anthropic.MessageParam['content'] = [];

  if (lens.isSynthesis) {
    // synthesis: takes prior outputs, NOT the image and NOT a primer
    userContent.push({
      type: 'text',
      text: `Two prior readings of this meme:

HISTORICAL READING:
${priorOutputs.historical}

SEMIOTIC READING:
${priorOutputs.semiotic}

Write a 2-4 sentence plain-language synthesis explaining what this meme means and does, for a smart non-internet-native reader. No jargon. Do not repeat the readings above; synthesize them.`,
    });
  } else {
    // standard lens: primer + image + (optional KYM)
    const primer = await readFile(
      join(process.cwd(), 'lib/lenses/primers', lens.primerPath!),
      'utf-8'
    );
    userContent.push({ type: 'text', text: `Primer:\n\n${primer}` });
    if (kym && lens.id === 'historical') {
      userContent.push({ type: 'text', text: `KnowYourMeme context:\n\n${kym}` });
    }
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: imageBase64 },
    });
    userContent.push({
      type: 'text',
      text: `Read this meme through the ${lens.displayName} lens.`,
    });
  }

  const stream = client.messages.stream({
    model: lens.isSynthesis ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6',
    max_tokens: 500,
    system,
    messages: [{ role: 'user', content: userContent }],
  });

  // Pipe to a streaming text response
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      stream.on('text', (text) => {
        controller.enqueue(encoder.encode(text));
      });
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
  });

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

The client reads this with `fetch().body.getReader()` and updates the relevant `LensPanel`'s text state on each chunk.

### KYM fetch (`lib/kym.ts`)

KYM has no API. Scrape politely.

```ts
import * as cheerio from 'cheerio';

export interface KymResult {
  url: string;
  about: string | null;
  origin: string | null;
  spread: string | null;
}

const UA = 'Mozilla/5.0 (compatible; MemesAsStainedGlass/0.1; research project)';

export async function fetchKym(name: string): Promise<KymResult | null> {
  // 1. search
  const searchUrl = `https://knowyourmeme.com/search?q=${encodeURIComponent(name)}`;
  const searchHtml = await fetch(searchUrl, { headers: { 'User-Agent': UA } })
    .then(r => r.ok ? r.text() : null);
  if (!searchHtml) return null;

  const $s = cheerio.load(searchHtml);
  const firstMemeLink = $s('a[href^="/memes/"]').first().attr('href');
  if (!firstMemeLink) return null;

  // be polite
  await new Promise(r => setTimeout(r, 1500));

  // 2. fetch the page
  const pageUrl = `https://knowyourmeme.com${firstMemeLink}`;
  const pageHtml = await fetch(pageUrl, { headers: { 'User-Agent': UA } })
    .then(r => r.ok ? r.text() : null);
  if (!pageHtml) return null;

  const $ = cheerio.load(pageHtml);
  const sectionText = (heading: string): string | null => {
    const h = $(`h2:contains("${heading}")`).first();
    if (!h.length) return null;
    let text = '';
    let el = h.next();
    while (el.length && !el.is('h2')) {
      text += el.text() + '\n\n';
      el = el.next();
    }
    return text.trim() || null;
  };

  return {
    url: pageUrl,
    about: sectionText('About'),
    origin: sectionText('Origin'),
    spread: sectionText('Spread'),
  };
}
```

If KYM returns 403 (Cloudflare), the fetch returns null and the historical lens falls back to reasoning from the image alone. Do not add Playwright in the MVP — handle the miss gracefully.

### Cache (`lib/cache.ts`)

```ts
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CACHE_DIR = join(process.cwd(), '.cache');

export async function readCache(hash: string): Promise<any | null> {
  try {
    const txt = await readFile(join(CACHE_DIR, `${hash}.json`), 'utf-8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

export async function writeCachePartial(
  hash: string,
  patch: Record<string, any>
): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const existing = (await readCache(hash)) ?? {};
  const merged = { ...existing, ...patch };
  await writeFile(join(CACHE_DIR, `${hash}.json`), JSON.stringify(merged, null, 2));
}
```

Each lens result is written to the cache as it completes. Partial caches are useful: if the user closes the tab mid-analysis and returns, we can resume from where we left off.

## Primers

The primers live in `lib/lenses/primers/*.md`. Each is a 500–1500 word document with:
- A definition of the lens
- The essential moves the lens makes
- Short illustrative quotes from key theorists (well under fair-use length)
- A few worked example sentences in the cathedral voice

These are the team's editorial responsibility, not Claude Code's — Claude Code should expect them to exist and load them, but should NOT generate them from scratch. If a primer file is missing, the lens endpoint should return a clear error like "Primer not found for lens '${id}'. Add lib/lenses/primers/${id}.md".

A placeholder primer (~50 words, marked `<!-- PLACEHOLDER -->`) can be created for each lens to unblock end-to-end testing, but real primers must be in place before the system produces real outputs.

## Build order

Build incrementally. Do not try to do all of this at once.

1. **Project skeleton.** Next.js 15+ App Router, TypeScript, Tailwind, install `@anthropic-ai/sdk` and `cheerio`. `.env.local` with `ANTHROPIC_API_KEY`.
2. **Lens registry + placeholder primers.** All 13 entries in `registry.ts`. One-paragraph placeholder primer per lens.
3. **Single lens end-to-end.** Pick `cyberfeminist`. Build the recognize endpoint, the lens endpoint, and a minimal upload + display in `page.tsx`. Confirm streaming works in the browser, confirm the voice is right.
4. **Cache layer.** Add hash-based caching. Re-uploading the same meme should be instant.
5. **All 13 lenses wired up.** Add `ResultsScroll` orchestration; fire screen 1 sequentially, screens 2 and 3 in parallel.
6. **KYM integration.** Add the `kym` endpoint and feed its output into the historical lens. Handle misses gracefully.
7. **Layout polish.** Three visually distinct screens, scrollable. Don't over-design — the visual register comes later.
8. **Test on the three reference memes:** Saint Javelin, NAFO, Liam Carpenter's "Living in Germany be like." Iterate on prompts and primers based on what comes back.

Stop and check in with the user at the end of each step. Don't power through all 8 in one session.

## What to ask before changing

Don't relitigate without checking:
- The three-screen structure
- The 13-lens list (registry is the source of truth; lens IDs/screens come from the team)
- The cathedral voice (the system prompt enforces it; if you want to soften it, ask first)
- Anthropic-only (no calls to OpenAI, no other model providers, no local model integration in this MVP)
- Text-only (no image gen, no embedding models, no RAG, no vector DB)

Do change freely:
- Internal code organization within a file or module
- CSS / Tailwind classes
- Error messages
- Logging
- Performance optimizations that don't change behavior

## Reference memes for testing

Three memes the team is using as proof-of-concept across the larger project:

1. **Saint Javelin** — Marian icon reskinned as Ukrainian military fundraising. Strong on cyberfeminist, geopolitical/military, hauntology.
2. **NAFO (North Atlantic Fella Organization)** — Shiba dog avatars deployed in Twitter information warfare against Russian state media. Strong on anthropological (kinship/communitas), interface, algorithmic.
3. **"Living in Germany be like"** (Liam Carpenter, British expat TikTok) — soft expatriation, comedic register over migration. Strong on sociological, trauma, hauntology, geopolitical (in a softer key).

When prompts or primers change, re-run all three and visually compare outputs before/after. Quality regression on any of them is a stop-the-line problem.

## Voice failure modes to watch for

The model will, by default, drift toward:
- Hedging ("arguably", "in some ways", "one might say")
- Bullet points
- Tour-of-the-lens summaries instead of actual readings of *this* meme
- Both-sidesing
- Closing on a hedge instead of a claim

If any of these appear in outputs, the system prompt or primer for that lens needs to be tightened. This is a tuning loop, not a one-shot.

## Out of scope (for now)

The following are real future requirements but explicitly not for this MVP:
- Image generation per-lens (the medieval visual register: reliquary tree, stone inscription, illuminated manuscript with marginalia, painted scroll, theological diagram, polyglot bible page)
- Medieval typography in the display layer
- Lens-selection logic (instead of running all 13, pick 2-4 based on the meme)
- Multilingual output (the larger installation uses ecclesiastical Latin, theorists' original languages, meme-makers' languages — but not for this MVP)
- Migration of lens analyses to a local model (Qwen3-30B-A3B) for political coherence with the technofeudalism critique
- Auth, accounts, persistence, hosting decisions beyond local dev
