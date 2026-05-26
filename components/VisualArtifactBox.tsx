"use client";

type Props = {
  label: string;
  description: string;
  side: "left" | "right";
};

export default function VisualArtifactBox({ label, description, side }: Props) {
  const floatClass = side === "left" ? "float-left mr-6" : "float-right ml-6";

  return (
    <figure
      className={`${floatClass} mb-4 w-[11rem] sm:w-[12.5rem] border-2 border-neutral-800 bg-[#f4efe4] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]`}
      aria-label={`visual artifact: ${label}`}
    >
      <div
        className="mb-2 aspect-square border border-neutral-500 bg-[#e8e0d0]"
        aria-hidden="true"
      />
      <figcaption className="border-b border-neutral-500 pb-1 text-[0.65rem] uppercase tracking-[0.18em] text-neutral-600">
        {label}
      </figcaption>
      <p className="mt-2 text-[0.8125rem] leading-snug text-neutral-800">
        {description}
      </p>
    </figure>
  );
}
