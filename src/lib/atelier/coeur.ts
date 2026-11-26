/**
 * LE CŒUR PAYANT DE L'ATELIER, UNE SEULE FAÇON DE FAIRE : l'écran de l'atelier (par `/images/v2`) et SINA dans sa
 * conversation (outils `atelier.*`) passent par ces mêmes fonctions. Mêmes garde-fous d'entrée (conditions acceptées,
 * demande et photo vérifiées, personnes seulement avec leur accord écrit), même devis en part du budget du mois, même
 * accord signé avant toute dépense, même tâche lancée, même inscription dans « Mes créations ».
 *
 *  - `devisRetouche` / `lancerRetouche` : fond, objet retiré, story, carré, tout le catalogue (retouche native) ;
 *  - `devisScene` / `lancerScene` : « Mets mon produit dans une scène » (création native, toujours par OpenAI).
 *
 * Rien n'est lancé sans un devis signé et sa confirmation : ces fonctions ne décident jamais seules d'une dépense.
 */
import { HttpError, type User } from "../auth";
import { one } from "../db";
import { avecLaDepenseAnnoncee, enqueue } from "../jobs";
import { L } from "../i18n-server";
import { checkedNativePhotoEdit, nativeEditJobKey, nativeEditRequestHash, quoteNativePhotoEdit, signedNativePhotoEdit } from "../image-v2/native-edit-approval";
import { checkedNativeImageApproval, nativeImageJobKey, quoteNativeImageGeneration, signedNativeImageApproval, type NativeImageRequest } from "../image-v2/native-approval";
import { imageBindingHash } from "../image-v2/request-binding";
import { gardeFousAtelier } from "./service";
import type { Mode } from "./conseil";

export type GesteRetoucheId = "fond" | "retirer" | "story" | "carre" | "lot";
export type DemandeRetouche = { assetId: string; instruction?: string; geste?: GesteRetoucheId; outil?: string; mode?: Mode };
type RequeteRetouche = { assetId: string; instruction: string; geste?: GesteRetoucheId; outil?: string; mode?: Mode };

/** La demande telle qu'elle est signée (la même pour le devis et pour la création). */
export function requeteRetouche(projectId: string, d: DemandeRetouche): RequeteRetouche {
  const a = one<{ id: string }>("SELECT id FROM assets WHERE id = ? AND project_id = ? AND deleted_at IS NULL AND mime LIKE 'image/%'", d.assetId, projectId);
  if (!a) throw new HttpError(404, L("Photo introuvable.", "Photo not found."));
  const instruction = (d.instruction ?? "").trim();
  // La version story ou carrée n'a pas besoin de mots ; les autres gestes oui.
  if (!(d.geste === "story" || d.geste === "carre") && instruction.length < 3) throw new HttpError(400, d.geste ? L("Dis-moi ce que tu veux changer.", "Tell me what you want to change.") : L("Décrivez la modification souhaitée.", "Describe the change you want."));
  return { assetId: a.id, instruction, ...(d.geste ? { geste: d.geste, ...(d.outil ? { outil: d.outil } : {}), ...(d.mode ? { mode: d.mode } : {}) } : {}) };
}

const tacheRetouche = (userId: string, projectId: string, operationId: string, r: RequeteRetouche) =>
  one<{ id: string }>("SELECT id FROM jobs WHERE user_id=? AND project_id=? AND type='image.edit' AND json_extract(payload,'$.nativeEditQuote.operationId')=? AND json_extract(payload,'$.nativeEditQuote.requestHash')=?", userId, projectId, operationId, nativeEditRequestHash(r));

/** Devis d'une retouche : garde-fous de l'atelier d'abord, puis le prix signé (ou la tâche déjà lancée). */
export async function devisRetouche(user: User, projectId: string, operationId: string, d: DemandeRetouche) {
  const r = requeteRetouche(projectId, d);
  if (r.geste) await gardeFousAtelier(user.id, projectId, { texte: r.instruction, assetId: r.assetId });
  const deja = tacheRetouche(user.id, projectId, operationId, r);
  if (deja) return { jobId: deja.id } as const;
  return quoteNativePhotoEdit(user, projectId, operationId, r);
}

/** La retouche confirmée : l'accord signé est relu, puis la tâche part (une seule fois par demande). */
export async function lancerRetouche(user: User, projectId: string, operationId: string, d: DemandeRetouche, approvalToken: string | undefined): Promise<{ jobId: string }> {
  const r = requeteRetouche(projectId, d);
  signedNativePhotoEdit(user, projectId, operationId, r, approvalToken);
  const deja = tacheRetouche(user.id, projectId, operationId, r);
  if (deja) return { jobId: deja.id };
  const approval = await checkedNativePhotoEdit(user, projectId, operationId, r, approvalToken);
  // La dépense annoncée (le coût montré, ici un seul appel) voyage avec la tâche (26 novembre 2026).
  const job = avecLaDepenseAnnoncee(approval.capMicro, () => enqueue({ userId: user.id, projectId, type: "image.edit", idempotencyKey: nativeEditJobKey(user.id, projectId, operationId, r), maxAttempts: 1, label: L("Retouche confirmée de la photo", "Confirmed photo edit"), payload: { projectId, ...r, costCapMicro: approval.capMicro, nativeEditQuote: { operationId, requestHash: nativeEditRequestHash(r), token: approvalToken } } }));
  return { jobId: job.id };
}

/** La demande d'une scène de l'atelier, telle qu'elle est signée (création seulement, jamais une photo libre). */
export function requeteScene(r: NativeImageRequest): NativeImageRequest {
  return r.allowGenerate === false ? r : { ...r, allowGenerate: true, noStock: true };
}

const tacheScene = (userId: string, projectId: string, operationId: string, r: NativeImageRequest) =>
  one<{ id: string }>("SELECT id FROM jobs WHERE user_id=? AND project_id=? AND type='image.v2' AND json_extract(payload,'$.nativeImageQuote.operationId')=? AND json_extract(payload,'$.nativeImageQuote.requestHash')=?", userId, projectId, operationId, imageBindingHash(r));

/** Devis d'une création d'image ; celle de l'atelier passe d'abord par ses garde-fous. */
export async function devisScene(user: User, projectId: string, operationId: string, request: NativeImageRequest) {
  const r = requeteScene(request);
  if (r.atelier) await gardeFousAtelier(user.id, projectId, { texte: r.topic ?? null });
  const deja = tacheScene(user.id, projectId, operationId, r);
  if (deja) return { jobId: deja.id } as const;
  return quoteNativeImageGeneration(user, projectId, operationId, r);
}

/** La création confirmée : l'accord signé est relu, puis la tâche part (une seule fois par demande). */
export async function lancerScene(user: User, projectId: string, operationId: string, request: NativeImageRequest, approvalToken: string | undefined): Promise<{ jobId: string; deja: boolean }> {
  const r = requeteScene(request);
  signedNativeImageApproval(user, projectId, operationId, r, approvalToken);
  const deja = tacheScene(user.id, projectId, operationId, r);
  if (deja) return { jobId: deja.id, deja: true };
  const approval = await checkedNativeImageApproval(user, projectId, operationId, r, approvalToken, true);
  // Le coût probable montré est la dépense annoncée : la tâche s'arrête et le demande avant d'en dépasser le double.
  const job = avecLaDepenseAnnoncee(approval.cost.estimateMicro, () => enqueue({ userId: user.id, projectId, type: "image.v2", idempotencyKey: nativeImageJobKey(user.id, projectId, operationId, r), maxAttempts: 1, label: L("Images : création confirmée", "Images: confirmed creation"), payload: { projectId, request: r, costCapMicro: approval.cost.capMicro, nativeImageQuote: { operationId, requestHash: imageBindingHash(r), token: approvalToken } } }));
  return { jobId: job.id, deja: false };
}
