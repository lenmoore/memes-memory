import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  shouldGenerateImages,
  shouldRunScreen2Lenses,
} from "./imagePipeline";

describe("shouldGenerateImages", () => {
  it("waits for all screen 1 text before any screen 1 images", () => {
    const base = {
      screen1TextComplete: false,
      screen1DisplaySettled: false,
      lensHasReading: true,
      screen2TextComplete: false,
    };
    assert.equal(shouldGenerateImages(1, base), false);
    assert.equal(
      shouldGenerateImages(1, { ...base, screen1TextComplete: true }),
      true,
    );
  });

  it("defers screen 2 images until screen 1 is fully settled", () => {
    const base = {
      screen1TextComplete: true,
      screen1DisplaySettled: false,
      lensHasReading: true,
      screen2TextComplete: false,
    };
    assert.equal(shouldGenerateImages(2, base), false);
    assert.equal(
      shouldGenerateImages(2, { ...base, screen1DisplaySettled: true }),
      true,
    );
  });

  it("defers screen 3 images until screen 2 text is complete", () => {
    const base = {
      screen1TextComplete: true,
      screen1DisplaySettled: true,
      lensHasReading: true,
      screen2TextComplete: false,
    };
    assert.equal(shouldGenerateImages(3, base), false);
    assert.equal(
      shouldGenerateImages(3, { ...base, screen2TextComplete: true }),
      true,
    );
  });
});

describe("shouldRunScreen2Lenses", () => {
  it("waits for screen 1 display settled and lens selection", () => {
    assert.equal(shouldRunScreen2Lenses(false, ["cyberfeminist"]), false);
    assert.equal(shouldRunScreen2Lenses(true, null), false);
    assert.equal(shouldRunScreen2Lenses(true, ["cyberfeminist"]), true);
  });
});
