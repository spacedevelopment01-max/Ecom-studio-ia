import "server-only";
import { z } from "zod";
import { sql } from "../db";
import { HttpError, notFound } from "../http";
import { formatFrDate, parisDate } from "../time";
import { letterPdf } from "../pdf";

export const AddressSchema = z.object({
  name: z.string().trim().max(120).default(""),
  line1: z.string().trim().max(160).default(""),
  line2: z.string().trim().max(160).default(""),
  postalCode: z.string().trim().max(10).default(""),
  city: z.string().trim().max(80).default(""),
});
export type Address = z.infer<typeof AddressSchema>;

export const RecipientSchema = AddressSchema.extend({
  /** Origine de l'adresse : extraite du courrier, trouvée dans l'annuaire, ou saisie. */
  source: z.enum(["courrier", "annuaire", "saisie"]).default("saisie"),
  /** Une adresse du courrier et une adresse de l'annuaire se contredisent. */
  conflict: z.boolean().default(false),
  /** L'utilisateur a vérifié et choisi l'adresse malgré la contradiction. */
  conflictResolved: z.boolean().default(false),
});
export type Recipient = z.infer<typeof RecipientSchema>;

export type LetterRow = {
  id: string;
  user_id: string;
  template_id: string | null;
  document_id: string | null;
  folder_id: string | null;
  title: string;
  answers: Record<string, string>;
  sender: Address & { place?: string; signature?: string };
  recipient: Recipient;
  body: string;
  edited_by_user: boolean;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export async function getLetter(userId: string, id: string): Promise<LetterRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound();
  const [row] = await sql()<LetterRow[]>`select * from letters where id = ${id} and user_id = ${userId}`;
  if (!row) throw notFound();
  return row;
}

export function addressLines(a: Address): string[] {
  return [a.line1, a.line2, `${a.postalCode} ${a.city}`.trim()].filter((l) => l && l.trim());
}

export function isCompleteAddress(a: Address): boolean {
  return Boolean(a.name && a.line1 && /^\d{5}$/.test(a.postalCode) && a.city);
}

export const CLOSING = "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.";

/** Formule de politesse accordée à l'appel utilisé en tête du courrier (« Maître, » pour un avocat ou un notaire). */
export function closingFor(body: string): string {
  return /^\s*Ma[iî]tre\s*,/m.test(body.split("\n").slice(0, 4).join("\n"))
    ? "Je vous prie d'agréer, Maître, l'expression de mes salutations distinguées."
    : CLOSING;
}

/** Sujet = première ligne « Objet : … » si présente, sinon le titre. */
export function splitSubject(letter: LetterRow): { subject: string; body: string } {
  const m = letter.body.match(/^Objet\s*:\s*(.+)\n+/i);
  if (m) return { subject: m[1].trim(), body: letter.body.slice(m[0].length).trim() };
  return { subject: letter.title, body: letter.body.trim() };
}

export async function buildLetterPdf(letter: LetterRow, opts: { sendingMention?: string; attachments?: string[]; dateIso?: string } = {}) {
  const { subject, body } = splitSubject(letter);
  return letterPdf({
    sender: { name: letter.sender.name || "[Votre nom]", lines: addressLines(letter.sender) },
    recipient: { name: letter.recipient.name || "[Destinataire]", lines: addressLines(letter.recipient) },
    place: letter.sender.place || letter.sender.city || "",
    date: formatFrDate(opts.dateIso ?? parisDate()),
    subject,
    body,
    closing: closingFor(body),
    signature: letter.sender.signature || letter.sender.name || "",
    sendingMention: opts.sendingMention,
    attachments: opts.attachments,
  });
}

export function assertReviewed(letter: LetterRow) {
  if (!letter.reviewed_at || new Date(letter.reviewed_at) < new Date(letter.updated_at)) {
    throw new HttpError(409, "relecture_requise", "Relisez votre courrier et confirmez la relecture avant de l'exporter ou de l'utiliser.");
  }
}
