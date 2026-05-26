import * as cheerio from "cheerio";

export interface KymResult {
  url: string;
  title: string | null;
  about: string | null;
  origin: string | null;
  spread: string | null;
}

const UA =
  "Mozilla/5.0 (compatible; MemesAsStainedGlass/0.1; research project)";
const SEARCH_DELAY_MS = 1200;

async function getHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
      // KYM is slow; let it have a moment.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchKym(name: string): Promise<KymResult | null> {
  if (!name) return null;

  // 1. Search.
  const searchUrl = `https://knowyourmeme.com/search?q=${encodeURIComponent(name)}`;
  const searchHtml = await getHtml(searchUrl);
  if (!searchHtml) return null;

  const $s = cheerio.load(searchHtml);
  // KYM search result items are <a class="item" href="/memes/...">.
  // Plain `a[href^="/memes/"]` also matches sidebar widgets and nav links
  // (e.g. /memes/new, /memes/subcultures/*, /memes/events/*), so we filter.
  const isEntryHref = (href: string) => {
    if (!href.startsWith("/memes/")) return false;
    const rest = href.slice("/memes/".length);
    if (!rest) return false;
    if (rest === "new") return false;
    if (rest.startsWith("subcultures/")) return false;
    if (rest.startsWith("events/")) return false;
    if (rest.startsWith("cultures/")) return false;
    if (rest.startsWith("people/")) return false;
    if (rest.startsWith("sites/")) return false;
    return true;
  };

  let firstMemeLink: string | undefined;
  $s("a.item[href^='/memes/']").each((_, el) => {
    const href = $s(el).attr("href");
    if (href && isEntryHref(href)) {
      firstMemeLink = href;
      return false; // break
    }
  });
  // Fallback: looser selector if a.item structure changed.
  if (!firstMemeLink) {
    $s("a[href^='/memes/']").each((_, el) => {
      const href = $s(el).attr("href");
      if (href && isEntryHref(href)) {
        firstMemeLink = href;
        return false;
      }
    });
  }
  if (!firstMemeLink) return null;

  await new Promise((r) => setTimeout(r, SEARCH_DELAY_MS));

  // 2. Fetch the page.
  const pageUrl = `https://knowyourmeme.com${firstMemeLink}`;
  const pageHtml = await getHtml(pageUrl);
  if (!pageHtml) return null;

  const $ = cheerio.load(pageHtml);

  const sectionText = (heading: string): string | null => {
    const h = $(`h2:contains("${heading}")`).first();
    if (!h.length) return null;
    let text = "";
    let el = h.next();
    while (el.length && !el.is("h2")) {
      text += el.text() + "\n\n";
      el = el.next();
    }
    return text.trim() || null;
  };

  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    null;

  return {
    url: pageUrl,
    title,
    about: sectionText("About"),
    origin: sectionText("Origin"),
    spread: sectionText("Spread"),
  };
}

export function summarizeKymForPrompt(k: KymResult): string {
  const parts: string[] = [];
  if (k.title) parts.push(`Title: ${k.title}`);
  parts.push(`Source: ${k.url}`);
  if (k.about) parts.push(`About:\n${k.about}`);
  if (k.origin) parts.push(`Origin:\n${k.origin}`);
  if (k.spread) parts.push(`Spread:\n${k.spread}`);
  return parts.join("\n\n");
}
