import { LETTER_TEMPLATES } from "@/lib/letters/catalog";
import { DOMAIN_LABELS } from "@/lib/letters/types";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Catalog } from "./catalog";

export const metadata = { title: "Rédiger un courrier" };

export default async function Page() {
  const { user } = await requireSession();
  const letters = await sql()<{ id: string; title: string; updated_at: Date; reviewed_at: Date | null }[]>`
    select id, title, updated_at, reviewed_at from letters where user_id = ${user.id} order by updated_at desc limit 30`;
  const templates = LETTER_TEMPLATES.map((t) => ({ id: t.id, domain: t.domain, title: t.title, description: t.description, keywords: t.keywords, plus: Boolean(t.plus) }));
  return <Catalog templates={templates} domains={DOMAIN_LABELS} letters={JSON.parse(JSON.stringify(letters))} plan={user.plan} />;
}
