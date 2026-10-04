import { notFound } from "next/navigation";
import { requireSession, isElevated } from "@/lib/auth";
import { getDocument, latestAnalysis, listFiles } from "@/lib/documents";
import { sql } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { DocumentResult } from "./document-result";

export const metadata = { title: "Résultat" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, session } = await requireSession();
  let doc;
  try {
    doc = await getDocument(user.id, id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const locked = doc.sensitive && !isElevated(session);
  const analysis = locked ? null : await latestAnalysis(user.id, id);
  const checklist = locked ? [] : await sql()<{ step_index: number; done: boolean }[]>`select step_index, done from checklist_state where document_id = ${id} and user_id = ${user.id}`;
  const [deadline] = locked ? [] : await sql()<{ id: string; confirmed_at: string | null; enabled: boolean }[]>`select id, confirmed_at, enabled from deadlines where document_id = ${id} and user_id = ${user.id} order by created_at limit 1`;
  const files = (await listFiles(user.id, id)).map((f) => ({ id: f.id, mime: f.mime, position: f.position, page_count: f.page_count }));
  const folders = await sql()<{ id: string; name: string }[]>`select id, name from folders where user_id = ${user.id} and resolved_at is null order by name`;
  return (
    <DocumentResult
      doc={JSON.parse(JSON.stringify(doc))}
      analysis={analysis ? JSON.parse(JSON.stringify(analysis)) : null}
      checklist={checklist}
      deadline={deadline ? JSON.parse(JSON.stringify(deadline)) : null}
      files={files}
      folders={folders}
      locked={locked}
      plan={user.plan}
    />
  );
}
