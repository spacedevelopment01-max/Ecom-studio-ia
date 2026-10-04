import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getTemplate, missingRequired } from "@/lib/letters/catalog";
import { AddressSchema, RecipientSchema } from "@/lib/letters/service";
import { getDocument, latestAnalysis } from "@/lib/documents";
import { suggestAttachments, type Need } from "@/lib/vault";
import { TEMPLATE_PIECES } from "@/lib/pieces";

export const GET = route(async () => {
  const { user } = await requireSession();
  const rows = await sql()`select id, title, template_id, document_id, folder_id, updated_at, reviewed_at from letters where user_id = ${user.id} order by updated_at desc limit 100`;
  return json({ letters: rows });
});

const Create = z.object({
  template_id: z.string().max(80).optional(),
  document_id: z.string().uuid().optional(),
  folder_id: z.string().uuid().nullable().optional(),
  answers: z.record(z.string(), z.string().max(4000)).default({}),
  sender: AddressSchema.extend({ place: z.string().max(80).optional(), signature: z.string().max(120).optional() }).default({} as never),
  recipient: RecipientSchema.default({} as never),
  /** « Répondre avec mes documents » : joint tout de suite les pièces trouvées dans le coffre. */
  auto_attach: z.boolean().default(false),
});

/**
 * Crée un courrier :
 * - depuis un modèle du catalogue (réponses aux questions) ;
 * - ou depuis le brouillon de réponse d'un document analysé.
 */
export const POST = route(async (req) => {
  const { user } = await requireSession();
  const b = await readJson(req, Create);
  let title = "Courrier";
  let body = "";
  let needs: Need[] = [];
  if (b.template_id) {
    const tpl = getTemplate(b.template_id);
    if (!tpl) throw new HttpError(404, "modele", "Modèle introuvable.");
    if (tpl.plus && user.plan !== "plus") throw new HttpError(402, "offre_plus_requise", "Ce modèle fait partie de l'offre Plus.");
    const missing = missingRequired(tpl, b.answers);
    if (missing.length) throw new HttpError(400, "reponses_manquantes", `Il manque : ${missing.join(", ")}.`);
    const built = tpl.build(b.answers);
    title = tpl.title;
    body = `Objet : ${built.subject}\n\n${built.body}`;
    needs = TEMPLATE_PIECES[tpl.id] ?? [];
  } else if (b.document_id) {
    await getDocument(user.id, b.document_id);
    const analysis = await latestAnalysis(user.id, b.document_id);
    const draft = analysis?.result.brouillon_reponse;
    if (!draft) throw new HttpError(409, "pas_de_brouillon", "Ce document n'a pas de brouillon de réponse.");
    title = `Réponse – ${analysis!.result.titre_court}`.slice(0, 120);
    // Pièces que le courrier reçu demande explicitement (repérées par l'analyse)
    needs = (analysis!.result.pieces_demandees ?? []).map((p) => ({ type: p.type_piece, libelle: p.libelle }));
    body = `Objet : ${draft.objet}\n\n${draft.corps.replace(/\n*(Veuillez agréer|Je vous prie d'agréer)[\s\S]*$/i, "").trim()}`;
  } else {
    throw new HttpError(400, "source", "Choisissez un modèle ou un document.");
  }
  if (b.folder_id) {
    const [f] = await sql()`select id from folders where id = ${b.folder_id} and user_id = ${user.id}`;
    if (!f) throw new HttpError(404, "introuvable", "Dossier introuvable.");
  }
  let attachments: string[] = [];
  if (b.auto_attach && needs.length) {
    const sugg = await suggestAttachments(user.id, needs, b.document_id ? [b.document_id] : []);
    attachments = sugg.flatMap((x) => (x.match ? [x.match.id] : []));
  }
  const [row] = await sql()<{ id: string }[]>`
    insert into letters (user_id, template_id, document_id, folder_id, title, answers, sender, recipient, body, needs, attachments)
    values (${user.id}, ${b.template_id ?? null}, ${b.document_id ?? null}, ${b.folder_id ?? null}, ${title},
            ${sql().json(b.answers)}, ${sql().json(b.sender as never)}, ${sql().json(b.recipient as never)}, ${body},
            ${sql().json(needs as never)}, ${sql().json(attachments)})
    returning id`;
  return json({ id: row.id, attached: attachments.length, needs: needs.length });
});
