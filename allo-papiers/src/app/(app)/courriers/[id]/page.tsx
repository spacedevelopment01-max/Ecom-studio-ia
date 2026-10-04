import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getLetter } from "@/lib/letters/service";
import { getTemplate } from "@/lib/letters/catalog";
import { latestAnalysis } from "@/lib/documents";
import { HttpError } from "@/lib/http";
import { sql } from "@/lib/db";
import { LetterEditor } from "./letter-editor";

export const metadata = { title: "Mon courrier" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireSession();
  let letter;
  try {
    letter = await getLetter(user.id, id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const tpl = letter.template_id ? getTemplate(letter.template_id) : null;
  const analysis = letter.document_id ? await latestAnalysis(user.id, letter.document_id) : null;
  const files = await sql()<{ id: string; title: string; position: number; mime: string }[]>`
    select f.id, d.title, f.position, f.mime from document_files f join documents d on d.id = f.document_id
     where f.user_id = ${user.id} and f.mime <> 'image/webp' order by d.created_at desc, f.position limit 60`;
  return (
    <LetterEditor
      letter={JSON.parse(JSON.stringify(letter))}
      template={tpl ? { title: tpl.title, warning: tpl.warning ?? null, professionalNotice: Boolean(tpl.professionalNotice), sendingNote: tpl.sending.note, checks: tpl.build(letter.answers).checks } : null}
      courrierAddress={analysis?.result.destinataire ? { name: analysis.result.destinataire.nom ?? "", text: analysis.result.destinataire.adresse, page: analysis.result.destinataire.source.page } : null}
      organismType={analysis?.result.organisme.type ?? null}
      files={files.map((f) => ({ id: f.id, label: `${f.title} – page ${f.position + 1}` }))}
      plan={user.plan}
    />
  );
}
