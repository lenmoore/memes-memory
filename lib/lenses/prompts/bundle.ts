import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getLens, type Lens } from "@/lib/lenses/registry";
import {
  buildReadingJsonFormat,
  buildSynthesisReadingJsonFormat,
} from "@/lib/lenses/prompts/readingFormat";
import { buildSystemPrompt } from "@/lib/lenses/prompts/systemTemplate";

export interface PromptSection {
  id: string;
  label: string;
  content: string;
  note?: string;
}

export interface LensPromptBundle {
  lensId: string;
  displayName: string;
  screen: 1 | 2 | 3;
  model: string;
  isSynthesis: boolean;
  selectionHint?: string;
  sections: PromptSection[];
}

function buildSynthesisUserMessage(): string {
  return `Two prior readings of this meme:

HISTORICAL READING:
{{historical}}

SEMIOTIC READING:
{{semiotic}}

Write a synthesis: what this meme means and does, for an intelligent reader who may not know the internet. No empty jargon. Do not repeat the readings above. Two or three sentences after the bold opening. 60–100 words of prose.

${buildSynthesisReadingJsonFormat()}`;
}

function buildStandardUserMessage(lens: Lens): string {
  const blocks: string[] = [
    "Primer:\n\n[primer text — sent as its own message block]",
  ];

  if (lens.id === "historical") {
    blocks.push(
      "\n\n--- optional at runtime ---\n\nKnowYourMeme context:\n\n{{kym}}",
    );
  }
  if (lens.id === "historical" || lens.id === "semiotic") {
    blocks.push(
      "\n\n--- optional at runtime ---\n\nArchive lookup (captions and matches):\n\n{{webContext}}",
    );
  }

  blocks.push("\n\n[image: uploaded meme, base64]");
  blocks.push(
    `\n\nRead this meme through the ${lens.displayName} lens.\n\n${buildReadingJsonFormat(lens)}`,
  );

  return blocks.join("");
}

export async function getLensPromptBundle(
  lensId: string,
): Promise<LensPromptBundle | null> {
  const lens = getLens(lensId);
  if (!lens) return null;

  const sections: PromptSection[] = [
    {
      id: "system",
      label: "System prompt",
      content: buildSystemPrompt(lens.displayName),
    },
  ];

  if (lens.isSynthesis) {
    sections.push({
      id: "user",
      label: "User message",
      content: buildSynthesisUserMessage(),
      note: "At runtime, {{historical}} and {{semiotic}} are filled from prior lens outputs. No image or primer is sent.",
    });
  } else {
    if (lens.primerPath) {
      try {
        const primer = await readFile(
          join(process.cwd(), "lib/lenses/primers", lens.primerPath),
          "utf-8",
        );
        sections.push({
          id: "primer",
          label: "Primer",
          content: primer,
          note: "Fed to the model as a separate text block before the image.",
        });
      } catch {
        sections.push({
          id: "primer",
          label: "Primer",
          content: `(missing file: lib/lenses/primers/${lens.primerPath})`,
        });
      }
    }

    sections.push({
      id: "user",
      label: "User message (assembled at runtime)",
      content: buildStandardUserMessage(lens),
      note: "The API sends primer, optional context, image, and instruction as separate content blocks in this order.",
    });
  }

  return {
    lensId: lens.id,
    displayName: lens.displayName,
    screen: lens.screen,
    model: lens.model ?? "claude-haiku-4-5-20251001",
    isSynthesis: Boolean(lens.isSynthesis),
    selectionHint: lens.selectionHint,
    sections,
  };
}
