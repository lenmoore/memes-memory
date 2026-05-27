import { redirect } from "next/navigation";
import { LENSES } from "@/lib/lenses/registry";

export default function PromptsIndexPage() {
  const first = [...LENSES].sort(
    (a, b) => a.screen - b.screen || a.order - b.order,
  )[0];
  redirect(`/prompts/${first.id}`);
}
