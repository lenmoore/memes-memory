import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ARTIFACT_FLOW_MARGIN,
  ARTIFACT_IMAGE_HEIGHT,
  ARTIFACT_IMAGE_WIDTH,
  ARTIFACT_OUTSET,
  buildReadingContent,
  computeManuscriptLayout,
  embedVisualFramesOverlap,
  layoutReading,
  lineOverlapsEmbed,
  readingArtifacts,
} from "./readingFlow";
import type { LensReading } from "@/lib/lenses/reading";

const fixedMeasure = (value: string) => value.length * 8;

function sampleReading(): LensReading {
  return {
    title: "Sample reading title",
    provocativePoints: ["First provocative claim.", "Second claim."],
    sections: [
      {
        type: "prose",
        markdown:
          "First paragraph of analysis about the meme template and its origins.\n\nSecond paragraph continuing the historical reading with more detail.",
      },
      {
        type: "artifact",
        label: "Illumination",
        description: "Monk examining a demon",
        side: "right",
      },
      {
        type: "prose",
        markdown: "Closing paragraph after the artifact.",
      },
    ],
  };
}

function layoutFor(
  contentWidth: number,
  reading: LensReading = sampleReading(),
) {
  const content = buildReadingContent(reading);
  const artifacts = readingArtifacts(content);
  const layout = computeManuscriptLayout(contentWidth, artifacts);
  const result = layoutReading(content, layout, fixedMeasure);
  return { content, layout, result };
}

describe("computeManuscriptLayout", () => {
  it("uses stacked mode for dual rails at default article width", () => {
    const layout = computeManuscriptLayout(720, [
      { id: "a", description: "", side: "left" },
      { id: "b", description: "", side: "right" },
    ]);

    assert.equal(layout.mode, "stacked");
    assert.equal(layout.canvasWidth, 720);
    assert.equal(layout.textColumnWidth, 720);
  });

  it("expands canvas into bleed so dual rails leave room for text on wide viewports", () => {
    const layout = computeManuscriptLayout(960, [
      { id: "a", description: "", side: "left" },
      { id: "b", description: "", side: "right" },
    ]);

    assert.equal(layout.mode, "rails");
    assert.equal(layout.canvasWidth, 960 + 2 * ARTIFACT_OUTSET);
    assert.ok(layout.textColumnWidth >= 400);
  });

  it("uses stacked mode when canvas cannot fit dual rails", () => {
    const layout = computeManuscriptLayout(360, [
      { id: "a", description: "", side: "left" },
      { id: "b", description: "", side: "right" },
    ]);

    assert.equal(layout.mode, "stacked");
    assert.equal(layout.canvasWidth, 360);
  });

  it("reports no visual overlap for dual rails at desktop width", () => {
    const layout = computeManuscriptLayout(960, [
      { id: "a", description: "", side: "left" },
      { id: "b", description: "", side: "right" },
    ]);

    const left = {
      left: 0 - ARTIFACT_OUTSET,
      right: ARTIFACT_IMAGE_WIDTH,
    };
    const right = {
      left: layout.canvasWidth - ARTIFACT_IMAGE_WIDTH,
      right: layout.canvasWidth + ARTIFACT_OUTSET,
    };

    assert.equal(embedVisualFramesOverlap(left, right), false);
    assert.equal(
      layout.textColumnWidth,
      layout.canvasWidth -
        2 * ARTIFACT_IMAGE_WIDTH -
        2 * ARTIFACT_FLOW_MARGIN,
    );
  });
});

describe("layoutReading", () => {
  it("keeps text lines out of embed columns in rails mode", () => {
    const reading: LensReading = {
      title: "",
      provocativePoints: [],
      sections: [
        {
          type: "prose",
          markdown:
            "Opening diagnosis of the meme. Additional sentence filling the center column without crossing into the side rail reserved for images.",
        },
        {
          type: "artifact",
          label: "Illumination",
          description: "Side image",
          side: "right",
        },
        {
          type: "prose",
          markdown: "Further analysis continues strictly in the center column.",
        },
      ],
    };

    const { content, layout, result } = layoutFor(960, reading);
    assert.equal(layout.mode, "rails");

    const textRight = layout.canvasWidth - ARTIFACT_IMAGE_WIDTH - ARTIFACT_FLOW_MARGIN;
    for (const line of result.lines) {
      assert.ok(line.x + line.width <= textRight + 1);
    }

    for (const embed of result.embeds) {
      for (const line of result.lines) {
        assert.equal(
          lineOverlapsEmbed(line, embed, content.lineHeight),
          false,
        );
      }
    }
  });

  it("stacks artifacts below text on narrow viewports", () => {
    const reading: LensReading = {
      title: "",
      provocativePoints: [],
      sections: [
        {
          type: "prose",
          markdown: "Opening paragraph before the artifact row.",
        },
        {
          type: "artifact",
          label: "Left",
          description: "Left image",
          side: "left",
        },
        {
          type: "artifact",
          label: "Right",
          description: "Right image",
          side: "right",
        },
      ],
    };

    const { layout, result } = layoutFor(720, reading);
    assert.equal(layout.mode, "stacked");
    assert.equal(result.embeds.length, 2);

    const firstEmbed = result.embeds[0];
    assert.ok(firstEmbed);
    const lastLine = result.lines[result.lines.length - 1];
    assert.ok(lastLine);
    assert.ok(firstEmbed.y >= lastLine.y);
    assert.equal(firstEmbed.y, lastLine.y + 28 + 14);
  });

  it("centers stacked artifacts within the canvas", () => {
    const reading: LensReading = {
      title: "",
      provocativePoints: [],
      sections: [
        { type: "prose", markdown: "Text before stacked images." },
        {
          type: "artifact",
          label: "Left",
          description: "Left image",
          side: "left",
        },
        {
          type: "artifact",
          label: "Right",
          description: "Right image",
          side: "right",
        },
      ],
    };

    const { layout, result } = layoutFor(720, reading);
    const embed = result.embeds[0];
    assert.ok(embed);
    assert.equal(
      embed.x,
      (layout.canvasWidth - ARTIFACT_IMAGE_WIDTH) / 2,
    );
    assert.equal(embed.height, ARTIFACT_IMAGE_HEIGHT);
  });
});
