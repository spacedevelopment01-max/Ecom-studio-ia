import { randomUUID } from "node:crypto";
import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { getDocument, loadInputFiles } from "@/lib/documents";
import { compareDocuments, AiError, aiMode } from "@/lib/ai/provider";
import { commitCredit, releaseCredit, reserveCredit } from "@/lib/quota";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

export const maxDuration = 300;

const KINDS = { paie: "deux fiches de paie", contrat: "deux versions d'un contrat", devis_facture: "un devis (A) et une facture (B)" } as const;
const Body = z.object({ a: z.string().uuid(), b: z.string().uuid(), kind: z.enum(["paie", "contrat", "devis_facture"]) });

export const POST = route(async (req) => {
  const { user } = await requireSession();
  const { a, b, kind } = await readJson(req, Body);
  if (a === b) throw new HttpError(400, "meme_document", "Choisissez deux documents différents.");
  if (aiMode() === "absent") throw new HttpError(503, "ia_non_configuree", "L'IA n'est pas encore activée sur ce site.");
  if (!user.ai_consent_at) throw new HttpError(412, "consentement_ia", "Acceptez d'abord les conditions de traitement par l'IA.");
  const [docA, docB] = await Promise.all([getDocument(user.id, a), getDocument(user.id, b)]);
  const ref = randomUUID();
  const usesCredit = !env.demoMode;
  if (usesCredit) await reserveCredit(user.id, "compare", ref);
  try {
    const [fa, fb] = await Promise.all([loadInputFiles(user.id, a), loadInputFiles(user.id, b)]);
    if (!fa.length || !fb.length) throw new HttpError(400, "sans_page", "Les deux documents doivent contenir au moins une page.");
    const { data } = await compareDocuments({ files: fa, title: docA.title }, { files: fb, title: docB.title }, KINDS[kind]);
    const [row] = await sql()<{ id: string }[]>`
      insert into comparisons (id, user_id, document_a, document_b, kind, result) values (${ref}, ${user.id}, ${a}, ${b}, ${kind}, ${sql().json(data as never)}) returning id`;
    if (usesCredit) await commitCredit("compare", ref, user.id);
    return json({ id: row.id, comparison: data });
  } catch (e) {
    if (usesCredit) await releaseCredit("compare", ref, user.id);
    if (e instanceof AiError) throw new HttpError(502, `ia_${e.code}`, `${e.message} Aucun crédit n'a été utilisé.`);
    throw e;
  }
});

export const GET = route(async () => {
  const { user } = await requireSession();
  const rows = await sql()`
    select c.id, c.kind, c.created_at, c.result, da.title as title_a, db.title as title_b
      from comparisons c join documents da on da.id = c.document_a join documents db on db.id = c.document_b
     where c.user_id = ${user.id} order by c.created_at desc limit 20`;
  return json({ comparisons: rows });
});
