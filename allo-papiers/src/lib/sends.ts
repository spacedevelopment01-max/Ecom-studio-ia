import "server-only";
import type Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { sql } from "./db";
import { keyedHash, sha256 } from "./crypto";
import { HttpError, notFound } from "./http";
import { env } from "./env";
import { audit } from "./audit";
import { sendMail } from "./mail";
import { postalAdapter, sendPrice } from "./laposte";
import { PostalNotAvailableError } from "./laposte/adapter";
import { addressLines, assertReviewed, buildLetterPdf, getLetter, isCompleteAddress, closingFor, splitSubject, type Address, type LetterRow } from "./letters/service";
import { getDecrypted } from "./storage";
import { imageToPdf, mergePdfs } from "./pdf";
import type { User } from "./auth";

export const VALIDATION_STATEMENT = "J'ai relu et je valide cet envoi en mon nom";

type Attachment = { fileId: string; documentId: string; label: string; sha256: string; mime: string };

export type SendRow = {
  id: string;
  user_id: string;
  letter_id: string | null;
  status: "draft" | "validated" | "payment_pending" | "paid" | "submitted" | "failed" | "cancelled";
  provider_mode: "test" | "real";
  service: string;
  sender: Address;
  recipient: Address;
  recipient_source: "courrier" | "annuaire" | "saisie";
  body: string;
  attachments: Attachment[];
  price_cents: number;
  currency: string;
  content_hash: string;
  validated_hash: string | null;
  validated_at: Date | null;
  tracking_number: string | null;
  tracking_is_fictive: boolean;
  stripe_checkout_session_id: string | null;
  paid_at: Date | null;
  submitted_at: Date | null;
  created_at: Date;
};

/** Texte final exact, tel qu'il sera imprimé (objet + corps + formule + signature). */
export function finalText(letter: LetterRow): string {
  const { subject, body } = splitSubject(letter);
  return `Objet : ${subject}\n\n${body}\n\n${closingFor(body)}\n\n${letter.sender.signature || letter.sender.name}`;
}

/**
 * Empreinte de TOUT ce que l'utilisateur valide : texte, expéditeur, destinataire, pièces,
 * prix, nature de l'envoi et mode. Si un seul de ces éléments change, l'empreinte change
 * et la validation précédente devient inutilisable.
 */
export function contentHash(x: {
  body: string;
  sender: Address;
  recipient: Address;
  attachments: Attachment[];
  priceCents: number;
  currency: string;
  service: string;
  mode: string;
}): string {
  const canon = JSON.stringify([
    x.body,
    [x.sender.name, x.sender.line1, x.sender.line2, x.sender.postalCode, x.sender.city],
    [x.recipient.name, x.recipient.line1, x.recipient.line2, x.recipient.postalCode, x.recipient.city],
    x.attachments.map((a) => [a.fileId, a.sha256]),
    x.priceCents,
    x.currency,
    x.service,
    x.mode,
  ]);
  return sha256(canon);
}

async function loadAttachments(userId: string, fileIds: string[]): Promise<Attachment[]> {
  if (fileIds.length === 0) return [];
  if (fileIds.length > 15) throw new HttpError(400, "trop_de_pieces", "15 pages de pièces jointes au maximum.");
  const rows = await sql()<{ id: string; document_id: string; sha256: string; mime: string; title: string; position: number }[]>`
    select f.id, f.document_id, f.sha256, f.mime, d.title, f.position
      from document_files f join documents d on d.id = f.document_id
     where f.user_id = ${userId} and f.id = any(${fileIds})`;
  if (rows.length !== fileIds.length) throw notFound();
  if (rows.some((r) => r.mime === "image/webp")) throw new HttpError(400, "format_piece", "Une pièce au format WebP ne peut pas être jointe. Utilisez une photo JPEG ou un PDF.");
  return fileIds.map((id) => {
    const r = rows.find((x) => x.id === id)!;
    return { fileId: r.id, documentId: r.document_id, sha256: r.sha256, mime: r.mime, label: `${r.title} (page ${r.position + 1})` };
  });
}

/** Prépare (ou met à jour) le brouillon d'envoi d'un courrier. Toute mise à jour annule la validation. */
export async function prepareSend(user: User, letterId: string, attachmentFileIds: string[]) {
  const letter = await getLetter(user.id, letterId);
  assertReviewed(letter);
  if (!isCompleteAddress(letter.sender)) throw new HttpError(400, "expediteur", "Votre adresse d'expéditeur est incomplète.");
  if (!isCompleteAddress(letter.recipient)) throw new HttpError(400, "destinataire", "L'adresse du destinataire est incomplète.");
  if (letter.recipient.conflict && !letter.recipient.conflictResolved) {
    throw new HttpError(409, "adresse_a_verifier", "L'adresse du courrier et celle de l'annuaire ne concordent pas : vérifiez et choisissez l'adresse avant l'envoi.");
  }
  const adapter = postalAdapter(); // refuse explicitement le mode réel non disponible
  const price = sendPrice();
  const attachments = await loadAttachments(user.id, attachmentFileIds);
  const body = finalText(letter);
  const sender = { ...letter.sender };
  const recipient = { name: letter.recipient.name, line1: letter.recipient.line1, line2: letter.recipient.line2, postalCode: letter.recipient.postalCode, city: letter.recipient.city };
  const hash = contentHash({ body, sender, recipient, attachments, priceCents: price.cents, currency: "eur", service: "lrar", mode: adapter.mode });

  const [existing] = await sql()<{ id: string; status: string }[]>`
    select id, status from send_requests where user_id = ${user.id} and letter_id = ${letterId}
       and status in ('draft', 'validated') order by created_at desc limit 1`;
  const params = {
    sender: sql().json(sender),
    recipient: sql().json(recipient),
    attachments: sql().json(attachments as never),
  };
  if (existing) {
    await sql()`
      update send_requests set sender = ${params.sender}, recipient = ${params.recipient}, recipient_source = ${letter.recipient.source},
             body = ${body}, attachments = ${params.attachments}, price_cents = ${price.cents}, provider_mode = ${adapter.mode},
             content_hash = ${hash},
             -- toute modification rend la validation précédente inutilisable
             status = case when validated_hash = ${hash} then status else 'draft' end,
             validated_hash = case when validated_hash = ${hash} then validated_hash else null end,
             validated_at = case when validated_hash = ${hash} then validated_at else null end,
             updated_at = now()
       where id = ${existing.id} and user_id = ${user.id}`;
    return existing.id;
  }
  const [row] = await sql()<{ id: string }[]>`
    insert into send_requests (user_id, letter_id, provider_mode, service, sender, recipient, recipient_source, body, attachments,
                               price_cents, content_hash, idempotency_key)
    values (${user.id}, ${letterId}, ${adapter.mode}, 'lrar', ${params.sender}, ${params.recipient}, ${letter.recipient.source}, ${body},
            ${params.attachments}, ${price.cents}, ${hash}, ${randomUUID()})
    returning id`;
  await sql()`insert into send_events (send_id, status, detail) values (${row.id}, 'brouillon', 'Brouillon d''envoi préparé')`;
  return row.id;
}

export async function getSend(userId: string, id: string): Promise<SendRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound();
  const [row] = await sql()<SendRow[]>`select * from send_requests where id = ${id} and user_id = ${userId}`;
  if (!row) throw notFound();
  return row;
}

/** Vérifie que l'envoi correspond TOUJOURS au courrier actuel (pas de modification depuis l'affichage). */
async function assertStillMatchesLetter(send: SendRow) {
  if (!send.letter_id) return;
  const letter = await getLetter(send.user_id, send.letter_id);
  const recipient = { name: letter.recipient.name, line1: letter.recipient.line1, line2: letter.recipient.line2, postalCode: letter.recipient.postalCode, city: letter.recipient.city };
  const hash = contentHash({
    body: finalText(letter),
    sender: letter.sender,
    recipient,
    attachments: send.attachments,
    priceCents: send.price_cents,
    currency: send.currency,
    service: send.service,
    mode: send.provider_mode,
  });
  if (hash !== send.content_hash) {
    await sql()`update send_requests set status = 'draft', validated_hash = null, validated_at = null where id = ${send.id}`;
    throw new HttpError(409, "contenu_modifie", "Le courrier a été modifié depuis l'affichage du récapitulatif. Relisez le nouveau récapitulatif et validez à nouveau.");
  }
}

/** Validation explicite : case cochée + empreinte de ce qui a été affiché. */
export async function validateSend(user: User, sendId: string, accepted: boolean, displayedHash: string, ip: string) {
  if (accepted !== true) throw new HttpError(400, "case_non_cochee", `Cochez la case « ${VALIDATION_STATEMENT} ».`);
  const send = await getSend(user.id, sendId);
  if (send.status !== "draft" && send.status !== "validated") throw new HttpError(409, "statut", "Cet envoi ne peut plus être validé.");
  if (displayedHash !== send.content_hash) {
    throw new HttpError(409, "contenu_modifie", "Le récapitulatif a changé. Relisez-le à nouveau avant de valider.");
  }
  await assertStillMatchesLetter(send);
  await sql()`
    update send_requests set status = 'validated', validated_hash = content_hash, validated_at = now(),
           validation_statement = ${VALIDATION_STATEMENT}, validation_ip_hash = ${keyedHash(`ip:${ip}`).slice(0, 16)}, updated_at = now()
     where id = ${sendId} and user_id = ${user.id} and content_hash = ${displayedHash}`;
  await sql()`insert into send_events (send_id, status, detail) values (${sendId}, 'valide', ${`Validation explicite : « ${VALIDATION_STATEMENT} »`})`;
  await audit(user.id, "envoi_valide", { targetType: "envoi", targetId: sendId, meta: { empreinte: displayedHash.slice(0, 16) } });
}

/** Clic sur « Envoyer » : ouvre le paiement Stripe. L'envoi n'aura lieu qu'après confirmation serveur du paiement. */
export async function startSendPayment(user: User, sendId: string): Promise<string> {
  const send = await getSend(user.id, sendId);
  if (send.status !== "validated" || !send.validated_hash || send.validated_hash !== send.content_hash) {
    throw new HttpError(409, "validation_requise", "Validez d'abord l'envoi (case à cocher) après relecture.");
  }
  await assertStillMatchesLetter(send);
  const { stripe } = await import("./billing");
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: send.currency,
            unit_amount: send.price_cents,
            product_data: {
              name: send.provider_mode === "test" ? "Lettre recommandée – MODE TEST (aucun envoi réel)" : "Lettre recommandée avec avis de réception",
            },
          },
        },
      ],
      metadata: { sendId: send.id, userId: user.id, validatedHash: send.validated_hash },
      payment_intent_data: { metadata: { sendId: send.id } },
      locale: "fr",
      success_url: `${env.appUrl}/envois/${send.id}?retour=paiement`,
      cancel_url: `${env.appUrl}/envois/${send.id}?retour=annule`,
    },
    // Idempotence : même envoi + même validation = même session de paiement (pas de double paiement).
    { idempotencyKey: `send-${send.id}-${send.validated_hash}` },
  );
  await sql()`
    update send_requests set status = 'payment_pending', stripe_checkout_session_id = ${session.id}, updated_at = now()
     where id = ${send.id} and user_id = ${user.id} and status = 'validated'`;
  await sql()`insert into send_events (send_id, status, detail) values (${send.id}, 'paiement_en_attente', 'Paiement ouvert chez Stripe')`;
  if (!session.url) throw new Error("Stripe n'a pas renvoyé d'adresse de paiement.");
  return session.url;
}

/**
 * Appelé UNIQUEMENT depuis le webhook Stripe signé, quand le paiement est confirmé.
 * Vérifie montant, devise, validation, puis transmet au module postal (une seule fois).
 */
export async function onSendPaid(session: Stripe.Checkout.Session) {
  const sendId = session.metadata?.sendId;
  if (!sendId) return;
  const [send] = await sql()<SendRow[]>`select * from send_requests where id = ${sendId}`;
  if (!send) return;
  if (session.client_reference_id !== send.user_id) throw new Error("Paiement : utilisateur incohérent");
  if (session.amount_total !== send.price_cents || session.currency !== send.currency) throw new Error("Paiement : montant incohérent");
  if (session.metadata?.validatedHash !== send.validated_hash || send.validated_hash !== send.content_hash) {
    throw new Error("Paiement : la validation ne correspond plus au contenu");
  }
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const moved = await sql()`
    update send_requests set status = 'paid', paid_at = now(), stripe_payment_intent_id = ${paymentIntent}, updated_at = now()
     where id = ${sendId} and status in ('payment_pending', 'validated') returning id`;
  if (moved.length === 0) return; // déjà traité (webhook en double) : aucun second envoi
  await sql()`insert into send_events (send_id, status, detail) values (${sendId}, 'paye', 'Paiement confirmé par Stripe (vérifié côté serveur)')`;
  await submitPaidSend(sendId);
}

export async function submitPaidSend(sendId: string) {
  const [send] = await sql()<SendRow[]>`select * from send_requests where id = ${sendId} and status = 'paid'`;
  if (!send) return;
  try {
    const adapter = postalAdapter();
    if (adapter.mode !== send.provider_mode) throw new PostalNotAvailableError("Le mode d'envoi a changé depuis la validation.");
    const pdf = await buildSendPdf(send);
    const result = await adapter.submit({
      sendId: send.id,
      idempotencyKey: send.id,
      service: "lrar",
      sender: { name: send.sender.name, line1: send.sender.line1, line2: send.sender.line2, postalCode: send.sender.postalCode, city: send.sender.city, country: "FR" },
      recipient: { name: send.recipient.name, line1: send.recipient.line1, line2: send.recipient.line2, postalCode: send.recipient.postalCode, city: send.recipient.city, country: "FR" },
      pdf,
    });
    await sql().begin(async (tx) => {
      await tx`
        update send_requests set status = 'submitted', submitted_at = now(), provider_reference = ${result.providerReference},
               tracking_number = ${result.trackingNumber}, tracking_is_fictive = ${result.fictive}, updated_at = now()
         where id = ${send.id} and status = 'paid'`;
      for (const ev of result.events) await tx`insert into send_events (send_id, status, detail) values (${send.id}, ${ev.status}, ${ev.detail})`;
    });
    const [u] = await sql()<{ email: string }[]>`select email from users where id = ${send.user_id}`;
    await sendMail({
      to: u.email,
      subject: result.fictive ? "Envoi de test enregistré (aucun courrier envoyé)" : "Votre lettre recommandée a été transmise",
      text: result.fictive
        ? `Votre envoi a été enregistré en MODE TEST.\n\nAucun courrier n'a été imprimé ni envoyé. Numéro de suivi FICTIF : ${result.trackingNumber}.\n\nSuivi : ${env.appUrl}/envois/${send.id}`
        : `Votre lettre recommandée a été transmise à La Poste.\nNuméro de suivi : ${result.trackingNumber}\n\nSuivi : ${env.appUrl}/envois/${send.id}`,
    }).catch(() => {});
  } catch (e) {
    await sql()`update send_requests set status = 'failed', updated_at = now() where id = ${send.id} and status = 'paid'`;
    await sql()`insert into send_events (send_id, status, detail) values (${send.id}, 'echec', ${e instanceof Error ? e.message.slice(0, 300) : "Erreur"})`;
    // Remboursement automatique : le client ne paie pas un envoi qui n'est pas parti.
    try {
      if (send.stripe_checkout_session_id) {
        const { stripe } = await import("./billing");
        const s = await stripe().checkout.sessions.retrieve(send.stripe_checkout_session_id);
        const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
        if (pi) {
          await stripe().refunds.create({ payment_intent: pi }, { idempotencyKey: `refund-${send.id}` });
          await sql()`insert into send_events (send_id, status, detail) values (${send.id}, 'rembourse', 'Paiement remboursé automatiquement')`;
        }
      }
    } catch {
      await sql()`insert into send_events (send_id, status, detail) values (${send.id}, 'remboursement_a_traiter', 'Remboursement à effectuer manuellement')`;
    }
  }
}

/** PDF exact de l'envoi, reconstruit à partir de l'instantané validé (pas du courrier modifiable). */
export async function buildSendPdf(send: SendRow): Promise<Buffer> {
  const match = send.body.match(/^Objet : (.*)\n\n([\s\S]*)\n\n.*\n\n(.*)$/);
  const subject = match?.[1] ?? "Courrier";
  const body = match?.[2] ?? send.body;
  const letter = await buildLetterPdf(
    {
      id: send.id,
      user_id: send.user_id,
      template_id: null,
      document_id: null,
      folder_id: null,
      title: subject,
      answers: {},
      sender: { ...send.sender, signature: match?.[3] ?? send.sender.name },
      recipient: { ...send.recipient, source: send.recipient_source, conflict: false, conflictResolved: true },
      body: `Objet : ${subject}\n\n${body}`,
      edited_by_user: true,
      reviewed_at: new Date(),
      attachments: [],
      needs: [],
      created_at: send.created_at,
      updated_at: send.created_at,
    },
    { sendingMention: "Lettre recommandée avec avis de réception", attachments: send.attachments.map((a) => a.label), dateIso: (send.validated_at ?? new Date()).toISOString().slice(0, 10) },
  );
  const parts = [letter];
  for (const a of send.attachments) {
    const [f] = await sql()<{ storage_key: string; sha256: string; mime: string }[]>`
      select storage_key, sha256, mime from document_files where id = ${a.fileId} and user_id = ${send.user_id}`;
    if (!f || f.sha256 !== a.sha256) throw new Error("Une pièce jointe validée n'est plus disponible.");
    const buf = await getDecrypted(f.storage_key);
    parts.push(f.mime === "application/pdf" ? buf : await imageToPdf(buf, f.mime));
  }
  return mergePdfs(parts);
}

export { addressLines };
