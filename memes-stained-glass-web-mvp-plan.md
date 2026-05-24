# Memes as Stained Glass — Web MVP: Lens Architecture + Technical Plan

## What this document is

A planning doc for the web prototype: the lens taxonomy across three screens, the source texts to gather for each lens, why each text matters for meme analysis, and a sketch of the technical architecture for the MVP.

## Quick flow summary

User uploads a meme → image goes to a vision model with per-lens prompts and per-lens corpus context → three screens of textual analysis stream in sequence (scroll down).

- **Screen 1** is descriptive and grounding: what is this meme, where did it come from, what is it doing visually and semantically.
- **Screen 2** is critical-theoretical: 2–4 lenses (eventually picked by the model based on the meme; for now run all).
- **Screen 3** is infrastructural: the meme as artifact of a technological order.

## Open questions to resolve before or during the build

1. **Hauntology appears on both Screen 2 and Screen 3.** Two possibilities: (a) drop one, or (b) keep both but split — Screen 2 = hauntology of the *content* (what historical ghosts does the meme carry), Screen 3 = hauntology of the *medium* (what dead futures haunt the platform itself, à la Fisher on "the slow cancellation of the future"). Leaning (b) — gives Fisher a home on both axes — but flagging.
2. **"Geopolitical + postcolonial + military"** — one combined lens or three? For the MVP I'd combine: they overlap heavily for diasporic memes, and three thin lenses are weaker than one fat one. Can split later if specific memes demand it.
3. **Screen 1 "explanation of what the meme means"** — its own pass, or a synthesis paragraph that closes Screen 1? Treating it as a synthesis below; flag if it should be a separate beat.
4. **Form/Stance (Shifman's triad)** — currently dropped from the explicit lens list. Folding "stance" into Screen 1's semiotic lens by default, but it could surface as its own sub-lens.
5. **Translation/Resistance** from the original installation lens set is currently absent. For multilingual memes (e.g., SUCHO material) this matters. Worth a beat on Screen 1 or Screen 2? Flagging.

---

## SCREEN 1 — Vernacular + semiotic foundation

*What this meme is, where it comes from, what it's doing on the surface.*

### 1.1 Historical / evolutionary lens (KnowYourMeme-style)

**What it does:** Locates the meme in its lineage — origin moment, mutation tree, notable variants, peak diffusion period, current status. Answers "what is this thing and how did it get here."

**How it relates to memes:** This is the closest thing memes have to provenance documentation. Shifman's distinction between memes and virals matters here — a meme is the *family* of variations on a template, not a single artifact. The historical lens is what makes a meme readable as a meme rather than as a single image.

**Resources to gather:**
- **KnowYourMeme** entries — the de facto archive; pull per-meme via direct URL when available. Cite the entry as primary source for evolution timeline.
- **Limor Shifman, *Memes in Digital Culture* (MIT Press, 2014)** — already in your corpus. Chapters on content/form/stance and memes vs. virals are essential framing.
- **Richard Dawkins, *The Selfish Gene* (1976), Ch. 11** — the etymological origin of "meme"; a paragraph of context per analysis at most.
- **Ryan Milner, *The World Made Meme* (MIT Press, 2016)** — meme participation as vernacular politics; very useful for political memes like Saint Javelin or NAFO.
- **An Xiao Mina, *Memes to Movements* (Beacon, 2019)** — memes as political organizing tool, diasporic and protest memes especially.
- **Susan Blackmore, *The Meme Machine* (1999)** — Dawkins-derived but more about replication dynamics. Optional.

### 1.2 Visual semiotic / semantic analysis

**What it does:** Reads the meme as a sign system — what's the image doing, what's the text doing, what does their juxtaposition do, what cultural references are encoded. Stance reading folds in here.

**How it relates to memes:** Memes are radically intertextual. Half of what they mean is inherited from elsewhere (image macros, reaction templates, cultural shorthand). Semiotics gives us the vocabulary to unpack that layering without flattening it.

**Resources to gather:**
- **Roland Barthes, *Mythologies* (1957)** — especially "Myth Today." The model for reading vernacular images as ideological systems. Probably the most-cited single text for any pop-image analysis.
- **Roland Barthes, *Image-Music-Text* (1977)** — "The Rhetoric of the Image" specifically, on anchorage and relay between image and caption (which is exactly what an image macro is).
- **Gunther Kress & Theo van Leeuwen, *Reading Images: The Grammar of Visual Design* (1996/2006)** — less famous but more usable for systematic readings.
- **Charles Sanders Peirce, *Collected Papers* (selections on icon/index/symbol)** — useful for distinguishing what kind of sign the meme is operating as.
- **W.J.T. Mitchell, *Picture Theory* (1994)** and ***What Do Pictures Want?* (2005)** — image agency, which matters for thinking about meme circulation.
- **Limor Shifman's content/form/stance triad** — fold the "stance" reading in here.

### 1.3 Plain-language meaning (synthesis)

**What it does:** A 2–4 sentence summary of what this meme means and does, written for a smart non-internet-native reader (the museum visitor). Synthesizes 1.1 and 1.2 in lay terms.

**How it relates to memes:** Most meme analysis fails by being either too inside (jargon-laden subreddit speak) or too outside (newspaper trend-piece flatness). The cathedral framing earns its weight only if the plain-language meaning is good — this is the load-bearing accessibility beat.

**Resources:** None additional — this is a synthesis prompt, generated from 1.1 and 1.2. Possibly fed back through the model with instruction "explain this to a smart person who is not online."

---

## SCREEN 2 — Critical theory lenses

*For the MVP, run all six. Later, the model selects 2–4 based on what the meme is doing.*

### 2.1 Cyberfeminist lens

**What it does:** Reads the meme through the politics of embodiment, technology, and gender online. Who is the gendered subject? Whose body is visible, invisible, weaponized? What kind of feminized labor is being performed (emotional, identity-curatorial)?

**How it relates to memes:** Memes are a feminized labor form (unpaid identity-curation, affect-management) and a feminized political form (the meme-as-care-work, mutual-aid coordination via humor). Saint Javelin specifically sits exactly at the cyberfeminist / military intersection — a Marian icon reskinned as military propaganda.

**Resources to gather:**
- **Donna Haraway, "A Cyborg Manifesto" (1985)** — foundational. Particularly the sections on women in the integrated circuit and the politics of partial connection.
- **Legacy Russell, *Glitch Feminism: A Manifesto* (Verso, 2020)** — most contemporary, very meme-adjacent in its argument about the body online as already-glitched. Probably the most directly usable for current meme analysis.
- **Sadie Plant, *Zeros + Ones* (1997)** — early cyberfeminism, the gendered history of computation.
- **Laboria Cuboniks, *The Xenofeminist Manifesto* (2015)** / **Helen Hester, *Xenofeminism* (Polity, 2018)** — for a more accelerationist register.
- **Silvia Federici, *Caliban and the Witch* (2004)** — historical/material baseline on reproductive and affective labor; ties cyberfem back to Marxist-feminist roots.

### 2.2 Geopolitical / postcolonial / military lens

**What it does:** Reads the meme as embedded in geopolitical conflict, asymmetric power, and the politics of who gets to speak / be visible / be mourned in a global media order.

**How it relates to memes:** Diasporic memes (your stated source corpus) are constitutively geopolitical. They are how displaced people narrate their displacement back to themselves and to a world audience. Postcolonial theory gives us the tools to read which displacements get framed as legible tragedy and which don't.

**Resources to gather:**
- **Edward Said, *Orientalism* (1978)** — foundational. For any meme that turns on East/West framings.
- **Achille Mbembe, "Necropolitics" (essay, 2003) and *On the Postcolony* (2001)** — already in your corpus. Essential for war memes: whose death is grievable, whose is administrable.
- **Judith Butler, *Frames of War* (2009) / *Precarious Life* (2004)** — already in your corpus via "grievable life." These actually live more naturally in this lens than in an emotional lens.
- **Paul Virilio, *War and Cinema* (1984) / *Speed and Politics* (1977)** — the militarization of perception; useful for thinking about meme as munition.
- **Eyal Weizman, *Forensic Architecture* (Zone Books, 2017)** — for memes that function as evidence or counter-evidence (some SUCHO material does this).
- **Gayatri Chakravorty Spivak, "Can the Subaltern Speak?" (1988)** — for the question of who is speaking through whom in a viral meme.

### 2.3 Anthropological lens (kinship, ritual, symbolic exchange)

**What it does:** Reads the meme as a ritual object circulating in a kinship structure. Who is bound to whom by sharing this? What gift is being exchanged? What rite of passage or boundary marker is being performed?

**How it relates to memes:** A meme is, in classical anthropological terms, almost exactly a *gift* in Mauss's sense — circulated to create and maintain social bonds, carrying obligations of reciprocity (you laughed at mine, you owe me a laugh at yours), generating prestige through display. The "in-group / out-group" structure of memes (you get it or you don't) is straightforwardly a kinship-marker function.

**Resources to gather:**
- **Marcel Mauss, *The Gift* (1925)** — the meme as gift object is probably the single most productive frame here.
- **Victor Turner, *The Ritual Process* (1969)** — liminality and communitas. Memes are liminal objects par excellence — they exist in a between-state and create temporary communities.
- **Claude Lévi-Strauss, *The Elementary Structures of Kinship* (1949)** — for the formal analysis of who-can-share-with-whom.
- **Mary Douglas, *Purity and Danger* (1966)** — for memes that work by transgressing categorical boundaries (most of them do).
- **Arnold van Gennep, *The Rites of Passage* (1909)** — background for Turner; optional.
- **Pierre Bourdieu, *Distinction* (1979)** — already in your corpus. Memes as taste-markers, cultural capital. Could equally sit in 2.4.

### 2.4 Sociological lens (identity performance, signalling)

**What it does:** Reads the meme as identity work — what is the sharer signalling about themselves by circulating this? What group are they performing membership in?

**How it relates to memes:** The classic Goffmanian frame: sharing a meme is impression management. Low-cost, high-information signal of who you are and who you're with. This is also where Varoufakis's "unpaid identity-labor" sits in concrete sociological vocabulary.

**Resources to gather:**
- **Erving Goffman, *The Presentation of Self in Everyday Life* (1956)** — the foundational text for identity-as-performance. Almost every meme analysis at this lens cites him.
- **Erving Goffman, *Frame Analysis* (1974)** — for the question of what "frame" the meme is invoking.
- **danah boyd, *It's Complicated* (Yale, 2014)** — networked publics, context collapse. The context-collapse argument is essential: a meme means different things to different audiences who all see it simultaneously.
- **Pierre Bourdieu, *Distinction* (1979)** — taste as class signalling. (Already in your corpus.)
- **Nathan Jurgenson, *The Social Photo* (Verso, 2019)** — short, recent, very meme-adjacent.
- **Michael Spence, "Job Market Signaling" (1973)** — for the economic-theoretic frame on costly signalling. Optional.

### 2.5 Hauntology (Screen 2 version: hauntology of content)

**What it does:** Reads the meme as a haunted object — what ghosts of older cultural forms, dead futures, or unmournable losses does it carry? What is being re-animated, and what does the re-animation reveal about what was killed?

**How it relates to memes:** Many memes are explicitly anachronistic — they pastiche Renaissance paintings, medieval marginalia, Soviet posters, 90s sitcoms. The hauntological reading takes this anachronism seriously rather than treating it as random. It also gives us a way to read meme nostalgia structurally rather than dismissively.

**Resources to gather:**
- **Mark Fisher, *Ghosts of My Life* (Zero, 2014)** — the most usable single text for cultural hauntology. Specifically the essays on the "slow cancellation of the future" and the lost futures of post-war culture.
- **Mark Fisher, *Capitalist Realism* (Zero, 2009)** — paired with above. Already implicit in your project's framing.
- **Jacques Derrida, *Specters of Marx* (1993)** — the origin text. Sections on the spectral logic of inheritance are most relevant.
- **Svetlana Boym, *The Future of Nostalgia* (Basic Books, 2001)** — distinction between restorative and reflective nostalgia, very useful for diasporic memes.
- **Walter Benjamin, "Theses on the Philosophy of History" (1940)** — angel of history, the past as wreckage. Foundational for any hauntological reading.

### 2.6 Trauma / medical lens

**What it does:** Reads the meme as a trauma artifact — repetition, displacement, the symptom that speaks what the subject can't. Also: meme as collective self-medication.

**How it relates to memes:** Diasporic memes, war memes, climate-grief memes — these are all classic trauma materials by any clinical or theoretical definition. The meme functions structurally like a symptom: compulsive repetition, displacement onto a smaller object, communal sharing as a low-stakes form of bearing witness.

**Resources to gather:**
- **Cathy Caruth, *Unclaimed Experience* (1996)** — canonical trauma-theory text. The argument that trauma is structurally a problem of belated experience and inadequate language maps very well onto why meme work happens.
- **Dominick LaCapra, *Writing History, Writing Trauma* (2001)** — for the distinction between *acting out* and *working through*; very generative for asking which mode a given meme is in.
- **Judith Herman, *Trauma and Recovery* (1992)** — clinical baseline, for grounding more speculative readings.
- **Bessel van der Kolk, *The Body Keeps the Score* (2014)** — the popular reference; useful for vocabulary even if theoretically thin.
- **Dori Laub & Shoshana Felman, *Testimony* (1992)** — for the witness structure of trauma; helpful for collective/shared meme work.
- **Lauren Berlant, *Cruel Optimism* (Duke, 2011)** — already in your corpus. Sits between trauma and affect theory.

---

## SCREEN 3 — Infrastructural / technological lenses

*The meme as artifact of a technological order.*

### 3.1 Technofeudalism

**What it does:** Reads the meme as cloud-rent extraction. Whose platform did this circulate on, who owns the attention it generated, who captured the surplus from the unpaid identity-labor that produced it?

**How it relates to memes:** This is the load-bearing argument of the whole project. Memes are the form of vernacular cultural production that most clearly exposes the cloud-fief structure: produced by serfs, consumed by serfs, captured by lords, with no payment moving in any direction except up to the platform.

**Resources to gather:**
- **Yanis Varoufakis, *Technofeudalism: What Killed Capitalism* (Bodley Head, 2023)** — already in your corpus. Central text.
- **Cédric Durand, *Techno-féodalisme* (Zones, 2020; English: *Techno-Feudalism*, Verso, 2024)** — the other major technofeudalism text. Often more rigorous than Varoufakis on the mechanics of rent.
- **McKenzie Wark, *Capital is Dead* (Verso, 2019)** — adjacent argument: this is no longer capitalism but something worse. Useful theoretical company.
- **Nick Srnicek, *Platform Capitalism* (Polity, 2016)** — the more orthodox-Marxist alternative framing, useful for triangulating Varoufakis's claim.
- **Shoshana Zuboff, *The Age of Surveillance Capitalism* (2019)** — for the data-extraction angle specifically.
- **Christian Fuchs, *Digital Labour and Karl Marx* (Routledge, 2014)** — for the unpaid-labor argument in classical Marxist vocabulary.

### 3.2 Algorithmic lens

**What it does:** Reads the meme as shaped by the recommender systems that selected for it. What features made this meme algorithmically viable? What kind of meme can no longer exist because the algorithm doesn't reward it?

**How it relates to memes:** Memes don't just spread, they are *selected*. The algorithm is the environment that exerts evolutionary pressure on meme form. Any meme analysis that ignores the algorithm is reading an organism without its ecology.

**Resources to gather:**
- **Tarleton Gillespie, *Custodians of the Internet* (Yale, 2018)** — platform moderation and curation; how visibility is governed.
- **Safiya Umoja Noble, *Algorithms of Oppression* (NYU, 2018)** — what gets surfaced and what gets suppressed, and how that maps onto race and power.
- **Wendy Hui Kyong Chun, *Updating to Remain the Same* (MIT, 2016)** — habitual new media; why the algorithm is a habit-formation engine.
- **Frank Pasquale, *The Black Box Society* (Harvard, 2015)** — algorithmic opacity as governance form.
- **Kate Crawford, *Atlas of AI* (Yale, 2021)** — the material substrate of algorithmic systems; useful pairing with technofeudalism.
- **Ed Finn, *What Algorithms Want* (MIT, 2017)** — useful for thinking about algorithmic intentionality in plain terms.

### 3.3 Interface lens

**What it does:** Reads the meme as constrained by and expressive of the interface it lives in. What does it mean that this meme is the right size for a phone, the right ratio for a TikTok, the right number of seconds for an Instagram story? The interface is not neutral — it has a poetics.

**How it relates to memes:** Different interfaces produce different memes. The IG carousel meme, the Tumblr text-post meme, the Twitter screenshot, the TikTok green-screen — these are not the same form translated across platforms, they are formally distinct genres produced by distinct interface affordances. The interface is the meme's verse-form.

**Resources to gather:**
- **Lev Manovich, *The Language of New Media* (MIT, 2001)** and ***Software Takes Command* (Bloomsbury, 2013)** — foundational interface-as-cultural-form arguments.
- **Alexander Galloway, *The Interface Effect* (Polity, 2012)** — the interface as ideological surface.
- **Alexander Galloway, *Protocol* (MIT, 2004)** — for the deeper infrastructure layer.
- **Matthew Fuller, ed., *Software Studies: A Lexicon* (MIT, 2008)** — practical short-essay reference.
- **Wendy Chun, *Programmed Visions* (MIT, 2011)** — for the deeper history of software as a cultural form.
- **Marshall McLuhan, *Understanding Media* (1964)** — already adjacent to your research. The medium-is-the-message argument is literally what an interface lens is for.

### 3.4 Hauntology (Screen 3 version: hauntology of medium) — *if we keep this split*

**What it does:** Reads the infrastructure itself as haunted. Dead platforms, abandoned features, broken hyperlinks, the unmourned futures of the early internet that the current platform layer was supposed to deliver and didn't. The meme as artifact of an internet that was supposed to be different.

**How it relates to memes:** Many meme formats are nostalgic for an internet that no longer exists — Tumblr formats on a post-Tumblr web, geocities aesthetics, the deliberately broken-look meme that mourns the era of broken-looking sites. The hauntology of medium reads these as structurally significant rather than as random aesthetic preferences.

**Resources:** Same as 2.5, but emphasis shifts to Fisher's writing on internet futures specifically, plus:
- **Olia Lialina, "A Vernacular Web" (essay, 2005) and *Digital Folklore* (2009)** — for the early-internet aesthetic specifically.
- **Justin E. H. Smith, *The Internet Is Not What You Think It Is* (Princeton, 2022)** — historical depth on what the internet was supposed to be.

---

## Technical architecture for the MVP

### Stack recommendation

Given the scope:
- **Frontend:** Next.js (React) or plain Vite + React. Single-page, scrollable. Tailwind for styling so you don't fight CSS for a prototype.
- **Backend:** Next.js API routes are enough; no separate server needed. For a prototype you can also run API calls directly from the client.
- **LLM:** Claude with vision. Start with Sonnet for cost/speed, escalate to Opus for the more theoretically demanding lenses if quality is weak.
- **Storage:** For the MVP, none. Upload → process → display → done. Optionally cache results client-side in IndexedDB so a refresh doesn't lose the analysis.

### Pipeline

1. **Upload.** User selects a meme image; convert to base64 client-side.
2. **Per-lens analysis.** For each of the ~13 lenses, fire an independent API call. Each call includes:
   - The image (as base64 in the message content)
   - A per-lens **system prompt** ("You are reading this meme through a cyberfeminist lens. Deadpan, precise, cathedral-docent voice. Cite named texts where appropriate; do not pad with citations.")
   - A per-lens **corpus excerpt** as user-message context (curated 500–1500 word primer per lens — see "corpus packaging" below)
   - A consistent output format instruction ("Return 150–250 words. Open with a single-sentence diagnosis. Two or three short paragraphs. End on the most consequential claim you can defend, not on a hedge.")
3. **Streaming display.** Use streaming responses so each lens appears progressively. Screen 1 lenses block on each other (the synthesis needs them). Screen 2 and 3 lenses can fire in parallel.
4. **No image gen, no RAG, no lens-selection model yet.** All lenses run; user scrolls.

### Corpus packaging for the MVP

You don't need full RAG yet. For each lens, write or compile a **2–4 page primer** that contains:
- A 200-word definition of the lens
- The 5–7 essential moves the lens makes
- 6–10 short quoted passages from the key texts (well within fair use at this length, but be careful at production scale)
- 4–6 worked example sentences ("a cyberfeminist reading of an image macro typically begins by asking…")

Paste the relevant primer into the prompt for each lens call. This is dumber and faster than RAG, and at MVP scale it produces results that are probably 80% as good as a proper retrieval pipeline. When you have 50+ texts per lens, move to RAG; for now, primers.

This also lets the team split the work: each person takes 2–3 lenses and writes their primers in parallel.

### Prompt template (sketch)

```
SYSTEM:
You are a cathedral docent. You read internet memes through a [LENS NAME] lens,
deadpan and precise, in the editorial register of a museum wall label. You do
not apologize for the academic register. You do not hedge. You do not say
"interestingly" or "it is worth noting." You name names when you cite. You
write at the level of a smart magazine essay, not a journal article.

USER:
Primer on the [LENS NAME] lens:
[PASTE 2–4 PAGE PRIMER HERE]

The meme:
[IMAGE]

Read this meme through the [LENS NAME] lens. 150–250 words. Open with a
single-sentence diagnosis. Two or three short paragraphs of analysis. End on
the most consequential claim you can defend, not on a hedge.
```

### A note on the cathedral voice for the MVP

The original installation work decided that the editorial apparatus commits fully to the medieval register, with the satirical wink only in marginalia drolleries. For the web MVP, the medieval visual register isn't there yet (no stained glass, no manuscript pages). The text alone has to do all the work of holding the cathedral voice. This means the prompt has to be quite directive about tone — otherwise you'll get default LLM hedging-and-bullet-points voice, which is the exact opposite of what the piece should feel like. The prompt template above is sketched in that direction; tune it after you see the first outputs.

### Cost back-of-envelope

~13 lens calls per meme. Each: image input + ~1500-token primer + ~250-token output. On Sonnet at current pricing, this lands roughly in the low-tens-of-cents per meme. Negligible at MVP scale; matters at installation scale (refresh corpus every host city × many visitors) — but that's a later problem.

### Build order

1. This document → team review → resolve open questions.
2. Corpus gathering: one primer per lens, written by hand for v1. Parallelizable across the team — each person takes 2–3 lenses.
3. Bare-bones upload UI + single-lens proof.
4. All 13 lenses wired up, scrollable layout.
5. First end-to-end test on Saint Javelin, NAFO, and the Liam Carpenter "Living in Germany be like" — the three memes already in the PDF proof-of-concept.
6. Then: lens-selection logic, image gen, RAG, the medieval visual register.

---

## Lens count summary

| Screen | Lens | Status |
|---|---|---|
| 1.1 | Historical / evolutionary | Confirmed |
| 1.2 | Visual semiotic / semantic (stance folded in) | Confirmed |
| 1.3 | Plain-language meaning (synthesis) | Confirmed; flagged as possibly its own pass |
| 2.1 | Cyberfeminist | Confirmed |
| 2.2 | Geopolitical / postcolonial / military | Confirmed as combined; possible split |
| 2.3 | Anthropological | Confirmed |
| 2.4 | Sociological | Confirmed |
| 2.5 | Hauntology (content) | Confirmed; depends on Q1 |
| 2.6 | Trauma / medical | Confirmed |
| 3.1 | Technofeudalism | Confirmed |
| 3.2 | Algorithmic | Confirmed |
| 3.3 | Interface | Confirmed |
| 3.4 | Hauntology (medium) | Conditional on Q1 |
| — | Translation / resistance | Flagged as missing |

Total: 13 lenses if Q1 resolves to split-hauntology, 12 if drop-one.
