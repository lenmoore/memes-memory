import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseReadingResponse } from "./parseReadingResponse";

const truncatedHistorical = `\`\`\`json
{
"title": "The Shock Template's Long Descent",
"provocativePoints": [
"This meme descends from early-2010s reaction-image culture, but its template—setup/reveal/absurd payoff—predates the internet by centuries.",
"The shark-electrician pairing works because both figures are displaced from their native contexts; the meme form itself is a mutation engine for that displacement.",
"By 2024, this template is archaeologically visible: you can trace its ancestors in woodcut jest-books and vaudeville sketch structure."
],
"sections": [
{
"type": "prose",
"markdown": "This meme is a late-stage descendant of the reaction-image macro era, carrying DNA from setup-punchline templates that predate digital culture by half a millennium.\\n\\nThe \\"sharks don't know X\\" frame inherits from the two-panel joke structure: juxtaposition of incongruent domains staged to produce synthetic discovery. The meme is dormant now, entering the pastiche phase wher`;

describe("parseReadingResponse", () => {
  it("parses complete fenced JSON", () => {
    const result = parseReadingResponse(`\`\`\`json
{
  "title": "Test title",
  "provocativePoints": ["One claim."],
  "sections": [
    { "type": "prose", "markdown": "**Bold.**\\n\\nBody." }
  ]
}
\`\`\``);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reading.title, "Test title");
    assert.equal(result.reading.provocativePoints[0], "One claim.");
  });

  it("salvages title, points, and prose from truncated JSON", () => {
    const result = parseReadingResponse(truncatedHistorical, {
      truncated: true,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reading.title, "The Shock Template's Long Descent");
    assert.equal(result.reading.provocativePoints.length, 3);
    assert.ok(result.reading.sections[0]?.type === "prose");
    assert.ok(
      result.reading.sections[0].markdown.includes("reaction-image macro"),
    );
    assert.ok(!result.reading.sections[0].markdown.includes("wher"));
  });

  it("does not dump raw JSON as prose fallback", () => {
    const result = parseReadingResponse(truncatedHistorical, {
      truncated: true,
    });
    if (result.ok) {
      for (const section of result.reading.sections) {
        if (section.type === "prose") {
          assert.ok(!section.markdown.includes('"provocativePoints"'));
        }
      }
      return;
    }
    assert.equal(result.reason, "truncated");
  });
});
