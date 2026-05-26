"use client";

import MarkdownBody from "@/components/MarkdownBody";
import VisualArtifactBox from "@/components/VisualArtifactBox";
import type { LensReading } from "@/lib/lenses/reading";

type Props = {
  reading: LensReading;
};

export default function ManuscriptReading({ reading }: Props) {
  return (
    <div className="manuscript-reading text-[1.0625rem] leading-relaxed">
      {reading.sections.map((section, index) => {
        if (section.type === "artifact") {
          return (
            <VisualArtifactBox
              key={`artifact-${index}-${section.label}`}
              label={section.label}
              description={section.description}
              side={section.side}
            />
          );
        }
        return (
          <div key={`prose-${index}`} className="mb-4">
            <MarkdownBody>{section.markdown}</MarkdownBody>
          </div>
        );
      })}
      <div className="clear-both" aria-hidden="true" />
    </div>
  );
}
