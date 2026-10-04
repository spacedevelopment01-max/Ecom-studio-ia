import { notFound } from "next/navigation";
import { requirePageSession } from "@/lib/auth";
import { getLetter } from "@/lib/letters/service";
import { getTemplate } from "@/lib/letters/catalog";
import { latestAnalysis } from "@/lib/documents";
import { HttpError } from "@/lib/http";
import { sql } from "@/lib/db";
import { LetterEditor } from "./letter-editor";

export const metadata = { title: "Mon courrier" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pieces?: string }> }) {
  const { id } = await params;
  const { pieces } = await searchParams;
  const { user } = await requirePageSession();
  let letter;
  try {
    letter = await getLetter(user.id, id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const tpl = letter.template_id ? getTemplate(letter.template_id) : null;
  const analysis = letter.document_id ? await latestAnalysis(user.id, letter.document_id) : null;
  const vaultDocs = await sql()<{ id: string; label: string; type: string | null; pages: number }[]>`
    select id, coalesce(piece_label, title) as label, piece_type as type, page_count as pages from documents
     where user_id = ${user.id} and page_count > 0 order by vault_category nulls last, piece_date desc nulls last, created_at desc limit 200`;
  return (
    <LetterEditor
      letter={JSON.parse(JSON.stringify(letter))}
      template={tpl ? { title: tpl.title, warning: tpl.warning ?? null, professionalNotice: Boolean(tpl.professionalNotice), sendingNote: tpl.sending.note, checks: tpl.build(letter.answers).checks } : null}
      courrierAddress={analysis?.result.destinataire ? { name: analysis.result.destinataire.nom ?? "", text: analysis.result.destinataire.adresse, page: analysis.result.destinataire.source.page } : null}
      organismType={analysis?.result.organisme.type ?? null}
      vaultDocs={vaultDocs}
      autoAttached={pieces != null && /^\d+$/.test(pieces) ? Number(pieces) : null}
      plan={user.plan}
    />
  );
}
