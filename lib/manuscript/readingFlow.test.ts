import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ARTIFACT_FLOW_MARGIN,
  ARTIFACT_IMAGE_WIDTH,
  ARTIFACT_OUTSET,
  computeManuscriptLayout,
  embedVisualFramesOverlap,
} from "./readingFlow";

describe("computeManuscriptLayout", () => {
  it("expands canvas into bleed so dual rails leave room for text", () => {
    const layout = computeManuscriptLayout(720, [
      { id: "a", description: "", side: "left" },
      { id: "b", description: "", side: "right" },
    ]);

    assert.equal(layout.mode, "rails");
    assert.equal(layout.canvasWidth, 720 + 2 * ARTIFACT_OUTSET);
    assert.ok(layout.textColumnWidth >= 240);
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
    const layout = computeManuscriptLayout(720, [
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
