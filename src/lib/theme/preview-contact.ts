/** Démonstrations explicitement optées : reçus locaux de test, jamais un envoi d'e-mail. */
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { DATA_DIR } from "../db";
import { HttpError } from "../auth";
import type { ThemeSpec } from "./spec";
type Receipt = { id: string; submission: string; digest: string; createdAt: string; name: string; email: string; room: string; body: string; isTest: true };
export function previewContactFile(projectId: string) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(projectId)) throw new HttpError(400, "Invalid project");
  return path.join(DATA_DIR, "preview-contact-tests", `${projectId}.json`);
}
export function recordPreviewContact(projectId: string, spec: ThemeSpec, input: unknown) {
  const en = spec.language === "en", message = en ? "Test request recorded. No email sent." : "Demande de test enregistrée. Aucun e-mail envoyé.";
  if (spec.store.business !== "services" || spec.meta?.demo?.isDemo !== true || spec.meta.demo.contactTest !== true) throw new HttpError(403, en ? "Test contact disabled." : "Contact de test désactivé.");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new HttpError(400, "Invalid form");
  const data = input as Record<string, unknown>;
  function field(key: string, max: number) {
    const value = data[key];
    if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new HttpError(422, en ? "Please check the form fields." : "Vérifiez les champs du formulaire.");
    return value.trim();
  }
  const name = field("contact[name]", 160), email = field("contact[email]", 254), room = field("contact[room]", 160), body = field("contact[body]", 4000), submission = field("submission_id", 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-zA-Z0-9_-]{10,80}$/.test(submission)) throw new HttpError(422, en ? "Invalid email or submission." : "E-mail ou identifiant invalide.");
  const file = previewContactFile(projectId);
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const lock = `${file}.lock`;
  let descriptor: number;
  try { descriptor=fs.openSync(lock,"wx",0o600); } catch (error) { if((error as NodeJS.ErrnoException).code==="EEXIST")throw new HttpError(409,en?"A test request is being recorded. Please retry.":"Une demande de test est en cours d'enregistrement. Réessayez.");throw error; }
  try {
  const rows: Receipt[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  const digest = createHash("sha256").update(JSON.stringify({name,email,room,body})).digest("hex"), previous = rows.find(r=>r.submission===submission);
  if (previous) {
    if (previous.digest !== digest) throw new HttpError(409, "Submission conflict");
    return {id:previous.id,message,isTest:true};
  }
  if (rows.length >= 50) throw new HttpError(429, en ? "Test request limit reached." : "Limite de demandes de test atteinte.");
  const receipt: Receipt = {id:randomUUID(),submission,digest,createdAt:new Date().toISOString(),name,email,room,body,isTest:true};
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const temporary = `${file}.${randomUUID()}.tmp`;
  try { fs.writeFileSync(temporary, JSON.stringify([...rows,receipt]), {mode:0o600,flag:"wx"}); fs.renameSync(temporary,file); }
  finally { if(fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return {id:receipt.id,message,isTest:true};
  } finally { fs.closeSync(descriptor);fs.unlinkSync(lock); }
}
