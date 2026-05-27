import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseLensReading,
  readingDisplayTitle,
  readingProvocativePoints,
} from "./reading";

describe("parseLensReading", () => {
  it("parses title and provocativePoints alongside sections", () => {
    const parsed = parseLensReading({
      title: "The icon as payroll",
      provocativePoints: [
        "Marian grief becomes logistics.",
        "Fundraising wears the halo.",
      ],
      sections: [
        {
          type: "prose",
          markdown: "**The meme is a receipt.**\n\nBody text.",
        },
      ],
    });

    assert.ok(parsed);
    assert.equal(parsed.title, "The icon as payroll");
    assert.deepEqual(parsed.provocativePoints, [
      "Marian grief becomes logistics.",
      "Fundraising wears the halo.",
    ]);
  });

  it("caps provocativePoints at three and drops empty strings", () => {
    const parsed = parseLensReading({
      provocativePoints: ["one", "", "  ", "two", "three", "four"],
      sections: [{ type: "prose", markdown: "Text." }],
    });

    assert.ok(parsed);
    assert.deepEqual(parsed.provocativePoints, ["one", "two", "three"]);
  });
});

describe("readingDisplayTitle", () => {
  it("prefers explicit title over bold opening line", () => {
    const reading = parseLensReading({
      title: "Explicit title",
      sections: [
        { type: "prose", markdown: "**Bold diagnosis**\n\nMore." },
      ],
    });
    assert.ok(reading);
    assert.equal(
      readingDisplayTitle(reading, "Fallback"),
      "Explicit title",
    );
  });

  it("falls back to first bold prose line then lens name", () => {
    const reading = parseLensReading({
      sections: [
        { type: "prose", markdown: "**Bold diagnosis**\n\nMore." },
      ],
    });
    assert.ok(reading);
    assert.equal(readingDisplayTitle(reading, "Lens name"), "Bold diagnosis");
    assert.equal(readingDisplayTitle(reading, ""), "Reading");
  });
});

describe("readingProvocativePoints", () => {
  it("returns stored points when present", () => {
    const reading = parseLensReading({
      provocativePoints: ["A claim."],
      sections: [{ type: "prose", markdown: "Text." }],
    });
    assert.ok(reading);
    assert.deepEqual(readingProvocativePoints(reading), ["A claim."]);
  });
});
