import { notFound } from "next/navigation";
import PromptSectionView from "@/components/PromptSectionView";
import PromptsSidebar from "@/components/PromptsSidebar";
import { getLensPromptBundle } from "@/lib/lenses/prompts/bundle";
import { LENSES } from "@/lib/lenses/registry";

type PageProps = {
  params: Promise<{ lensId: string }>;
};

export function generateStaticParams() {
  return LENSES.map((l) => ({ lensId: l.id }));
}

export default async function LensPromptPage({ params }: PageProps) {
  const { lensId } = await params;
  const bundle = await getLensPromptBundle(lensId);
  if (!bundle) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex gap-10">
        <PromptsSidebar activeLensId={bundle.lensId} />
        <div className="min-w-0 flex-1">
          <header className="mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
              Screen {bundle.screen}
              {bundle.isSynthesis ? " · synthesis" : ""}
            </p>
            <h1 className="mt-2 text-3xl font-serif tracking-tight">
              {bundle.displayName}
            </h1>
            <p className="mt-3 text-sm text-neutral-600">
              Model: <span className="font-mono text-neutral-800">{bundle.model}</span>
            </p>
            {bundle.selectionHint && (
              <p className="mt-3 text-sm text-neutral-600 border-l-2 border-neutral-300 pl-3 italic leading-relaxed">
                Selection hint: {bundle.selectionHint}
              </p>
            )}
          </header>

          <div className="flex flex-col gap-10">
            {bundle.sections.map((section) => (
              <PromptSectionView
                key={section.id}
                label={section.label}
                content={section.content}
                note={section.note}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
