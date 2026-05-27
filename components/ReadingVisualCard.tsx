"use client";

import type { LensReading, VisualArtifactSide } from "@/lib/lenses/reading";
import {
  readingDisplayTitle,
  readingProvocativePoints,
} from "@/lib/lenses/reading";

type ImageState = {
  status: "idle" | "loading" | "done" | "skipped" | "error";
  url: string | null;
};

type ArtifactSlot = {
  id: string;
  description: string;
  side: VisualArtifactSide;
};

type Props = {
  reading: LensReading;
  lensDisplayName: string;
  artifacts: ArtifactSlot[];
  images: Record<string, ImageState>;
  generateImages: boolean;
};

function GlossLine({ text, isFirst }: { text: string; isFirst: boolean }) {
  if (!isFirst) {
    return <p className="reading-gloss-line">{text}</p>;
  }

  const initial = text.charAt(0);
  const rest = text.slice(1).trimStart();

  return (
    <p className="reading-gloss-line reading-gloss-line-first">
      <span className="reading-gloss-initial" aria-hidden="true">
        {initial}
      </span>
      <span>{rest}</span>
    </p>
  );
}

function Miniature({
  image,
  side,
  index,
}: {
  image: ImageState | undefined;
  side: VisualArtifactSide;
  index: number;
}) {
  return (
    <figure
      className={`reading-miniature reading-miniature--${side}`}
      data-slot={index}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {image?.status === "done" && image.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt="" className="reading-miniature-img" />
      ) : (
        <div className="reading-miniature-placeholder">
          {image?.status === "loading" ? "illuminating…" : ""}
        </div>
      )}
    </figure>
  );
}

export default function ReadingVisualCard({
  reading,
  lensDisplayName,
  artifacts,
  images,
  generateImages,
}: Props) {
  const title = readingDisplayTitle(reading, lensDisplayName);
  const points = readingProvocativePoints(reading);
  const showImages = generateImages && artifacts.length > 0;
  const showPoints = points.length > 0;
  const imageCount = showImages ? artifacts.length : 0;

  if (!title && !showImages && !showPoints) return null;

  const bodyClass = [
    "reading-folio-body",
    imageCount > 0 ? `reading-folio-body--images-${Math.min(imageCount, 3)}` : "",
    showPoints ? "reading-folio-body--has-gloss" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="reading-folio mb-10" aria-label="Illuminated summary">
      <div className="reading-folio-inner">
        {title && <h4 className="reading-rubric">{title}</h4>}

        {title && (showImages || showPoints) && (
          <div className="reading-folio-fleuron" aria-hidden="true">
            ❧
          </div>
        )}

        {(showImages || showPoints) && (
          <div className={bodyClass}>
            {showImages &&
              artifacts.map((artifact, index) => (
                <Miniature
                  key={artifact.id}
                  image={images[artifact.id]}
                  side={artifact.side}
                  index={index}
                />
              ))}

            {showPoints && (
              <div className="reading-gloss-flow">
                {points.map((point, index) => (
                  <GlossLine
                    key={point}
                    text={point}
                    isFirst={index === 0}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
