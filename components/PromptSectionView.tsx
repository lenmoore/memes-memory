import MarkdownBody from "@/components/MarkdownBody";

type Props = {
  label: string;
  content: string;
  note?: string;
};

export default function PromptSectionView({ label, content, note }: Props) {
  return (
    <section className="border-l-2 border-neutral-300 pl-4">
      <h3 className="text-xs uppercase tracking-[0.2em] text-neutral-400">
        {label}
      </h3>
      {note && (
        <p className="mt-2 text-sm text-neutral-500 italic leading-relaxed">
          {note}
        </p>
      )}
      <MarkdownBody className="mt-3 text-sm text-neutral-800 leading-relaxed">
        {content}
      </MarkdownBody>
    </section>
  );
}
