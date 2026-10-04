import { notFound } from "next/navigation";
import { getTemplate } from "@/lib/letters/catalog";
import { DOMAIN_LABELS } from "@/lib/letters/types";
import { requirePageSession } from "@/lib/auth";
import { Wizard } from "./wizard";

export default async function Page({ params }: { params: Promise<{ template: string }> }) {
  const { template } = await params;
  const t = getTemplate(template);
  if (!t) notFound();
  const { user } = await requirePageSession();
  return (
    <Wizard
      template={{ id: t.id, title: t.title, description: t.description, domain: DOMAIN_LABELS[t.domain], warning: t.warning ?? null, professionalNotice: Boolean(t.professionalNotice), sending: t.sending, questions: t.questions, plus: Boolean(t.plus) }}
      plan={user.plan}
      defaultName={user.display_name ?? ""}
    />
  );
}
