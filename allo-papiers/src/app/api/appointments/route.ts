import { randomUUID } from "node:crypto";
import { z } from "zod";
import { HttpError, json, notFound, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AiError, aiMode, prepareAppointment } from "@/lib/ai/provider";
import { commitCredit, releaseCredit, reserveCredit } from "@/lib/quota";
import { env } from "@/lib/env";
import { formatFrDate } from "@/lib/time";
import type { AppointmentSheet } from "@/lib/ai/schema";
import { APPOINTMENT_TARGETS, type AppointmentTarget } from "@/lib/appointments";

export const maxDuration = 120;

const TARGETS = APPOINTMENT_TARGETS;
type Target = AppointmentTarget;

const DEFAULT_QUESTIONS: Record<Target, string[]> = {
  france_services: ["Pouvez-vous m'aider à comprendre ce courrier ?", "Quelle démarche dois-je faire en premier ?", "Quels documents dois-je fournir ?"],
  organisme: ["Où en est mon dossier ?", "Quelles pièces manque-t-il ?", "Quelle est la date limite exacte pour répondre ?"],
  avocat: ["Quels sont mes délais pour agir ?", "Quelles options s'offrent à moi ?", "Combien coûtera votre accompagnement (honoraires, aide juridictionnelle) ?"],
  notaire: ["Pouvez-vous m'expliquer les étapes à venir ?", "Quels frais dois-je prévoir ?", "Quels documents dois-je vous transmettre ?"],
  service_paie: ["Pouvez-vous m'expliquer cette ligne de ma fiche de paie ?", "D'où vient la différence avec le mois précédent ?", "Une régularisation est-elle prévue ?"],
};

export const GET = route(async () => {
  const { user } = await requireSession();
  const rows = await sql()`select id, title, target, folder_id, updated_at from appointment_sheets where user_id = ${user.id} order by updated_at desc`;
  return json({ sheets: rows });
});

const Body = z.object({
  target: z.enum(Object.keys(TARGETS) as [Target, ...Target[]]),
  folder_id: z.string().uuid().nullable().optional(),
  use_ai: z.boolean().default(false),
});

/** Crée une fiche de rendez-vous. AUCUN rendez-vous n'est réservé : c'est une fiche de préparation. */
export const POST = route(async (req) => {
  const { user } = await requireSession();
  const b = await readJson(req, Body);
  let folder: { id: string; name: string; goal: string | null; organism: string | null } | null = null;
  if (b.folder_id) {
    [folder] = await sql()<{ id: string; name: string; goal: string | null; organism: string | null }[]>`
      select id, name, goal, organism from folders where id = ${b.folder_id} and user_id = ${user.id}`;
    if (!folder) throw notFound();
  }
  const docs = folder
    ? await sql()<{ title: string; summary: string | null; created_at: Date }[]>`
        select title, summary, created_at from documents where folder_id = ${folder.id} and user_id = ${user.id} order by created_at`
    : [];
  const events = folder
    ? await sql()<{ event_date: string; label: string }[]>`select to_char(event_date, 'YYYY-MM-DD') as event_date, label from folder_events where folder_id = ${folder.id} and user_id = ${user.id} order by event_date`
    : [];
  const pieces = folder ? await sql()<{ label: string; status: string }[]>`select label, status from folder_pieces where folder_id = ${folder.id} and user_id = ${user.id}` : [];

  let content: AppointmentSheet = {
    titre: `Rendez-vous – ${TARGETS[b.target]}${folder ? ` – ${folder.name}` : ""}`,
    resume: folder?.goal ?? "",
    chronologie: events.map((e) => ({ date: e.event_date, evenement: e.label })),
    pieces_a_apporter: ["Pièce d'identité", ...docs.map((d) => d.title), ...pieces.filter((p) => p.status === "recue").map((p) => p.label)],
    questions_a_poser: DEFAULT_QUESTIONS[b.target],
    points_attention: pieces.filter((p) => p.status === "manquante").map((p) => `Pièce manquante : ${p.label}`),
  };

  if (b.use_ai) {
    if (aiMode() === "absent") throw new HttpError(503, "ia_non_configuree", "L'IA n'est pas encore activée sur ce site.");
    if (!user.ai_consent_at) throw new HttpError(412, "consentement_ia", "Acceptez d'abord les conditions de traitement par l'IA.");
    const ref = randomUUID();
    const usesCredit = !env.demoMode;
    if (usesCredit) await reserveCredit(user.id, "chat", ref);
    try {
      const dossier = [
        folder ? `Dossier : ${folder.name}\nObjectif : ${folder.goal ?? "non précisé"}\nOrganisme : ${folder.organism ?? "non précisé"}` : "Aucun dossier sélectionné.",
        `Documents :\n${docs.map((d) => `- ${formatFrDate(d.created_at.toISOString())} : ${d.title}${d.summary ? ` — ${d.summary}` : ""}`).join("\n") || "aucun"}`,
        `Chronologie :\n${events.map((e) => `- ${e.event_date} : ${e.label}`).join("\n") || "aucune"}`,
        `Pièces :\n${pieces.map((p) => `- ${p.label} (${p.status})`).join("\n") || "aucune"}`,
      ].join("\n\n");
      content = (await prepareAppointment(TARGETS[b.target], dossier)).data;
      if (usesCredit) await commitCredit("chat", ref, user.id);
    } catch (e) {
      if (usesCredit) await releaseCredit("chat", ref, user.id);
      if (e instanceof AiError) throw new HttpError(502, `ia_${e.code}`, `${e.message} Aucun crédit n'a été utilisé.`);
      throw e;
    }
  }
  const [row] = await sql()<{ id: string }[]>`
    insert into appointment_sheets (id, user_id, folder_id, target, title, content)
    values (${randomUUID()}, ${user.id}, ${folder?.id ?? null}, ${b.target}, ${content.titre}, ${sql().json(content as never)}) returning id`;
  return json({ id: row.id });
});
