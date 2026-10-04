import { randomUUID } from "node:crypto";
import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { getDocument, latestAnalysis, loadInputFiles } from "@/lib/documents";
import { askDocument, AiError, aiMode } from "@/lib/ai/provider";
import { commitCredit, releaseCredit, reserveCredit } from "@/lib/quota";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import type { ChatAnswer } from "@/lib/ai/schema";
import type { IdCtx } from "@/lib/params";

export const maxDuration = 120;

export const GET = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await getDocument(user.id, id);
  const messages = await sql()`select id, role, content, created_at from chat_messages where document_id = ${id} and user_id = ${user.id} order by created_at`;
  return json({ messages });
});

const Body = z.object({ question: z.string().trim().min(2).max(1000) });

/** Discussion avec le document (offre Plus) : chaque question réussie consomme un crédit « question ». */
export const POST = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const doc = await getDocument(user.id, id);
  if (doc.status !== "analyzed") throw new HttpError(409, "non_analyse", "Le document doit d'abord être analysé.");
  if (aiMode() === "absent") throw new HttpError(503, "ia_non_configuree", "L'IA n'est pas encore activée sur ce site.");
  const { question } = await readJson(req, Body);
  const analysis = await latestAnalysis(user.id, id);
  if (!analysis) throw new HttpError(409, "non_analyse", "Analyse introuvable.");

  const ref = randomUUID();
  const usesCredit = !env.demoMode;
  if (usesCredit) await reserveCredit(user.id, "chat", ref);
  try {
    const history = await sql()<{ role: "user" | "assistant"; content: { text?: string; reponse?: string } }[]>`
      select role, content from chat_messages where document_id = ${id} and user_id = ${user.id} order by created_at desc limit 8`;
    const files = await loadInputFiles(user.id, id);
    const { data } = await askDocument(
      files,
      analysis.result,
      history.reverse().map((m) => ({ role: m.role, text: m.role === "user" ? (m.content.text ?? "") : (m.content.reponse ?? "") })),
      question,
    );
    await sql()`insert into chat_messages (document_id, user_id, role, content) values (${id}, ${user.id}, 'user', ${sql().json({ text: question })})`;
    await sql()`insert into chat_messages (document_id, user_id, role, content) values (${id}, ${user.id}, 'assistant', ${sql().json(data as ChatAnswer as never)})`;
    if (usesCredit) await commitCredit("chat", ref, user.id);
    return json({ answer: data });
  } catch (e) {
    if (usesCredit) await releaseCredit("chat", ref, user.id);
    if (e instanceof AiError) throw new HttpError(502, `ia_${e.code}`, `${e.message} Aucun crédit n'a été utilisé.`);
    throw e;
  }
});
