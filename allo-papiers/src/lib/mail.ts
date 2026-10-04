import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./env";
import { ConfigError } from "./db";

export type Mail = { to: string; subject: string; text: string; html?: string };

/**
 * Envoi d'emails transactionnels.
 * - Production : Resend (clé RESEND_API_KEY). Sans clé, l'envoi échoue explicitement.
 * - Développement/tests sans clé : les emails sont écrits dans .data/outbox (rien n'est envoyé).
 */
export async function sendMail(mail: Mail): Promise<{ id: string; transport: "resend" | "outbox" }> {
  if (env.resendKey) {
    const { Resend } = await import("resend");
    const resend = new Resend(env.resendKey);
    const { data, error } = await resend.emails.send({
      from: env.mailFrom,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html ?? textToHtml(mail.text),
    });
    if (error) throw new Error(`Envoi d'email refusé : ${error.name}`);
    return { id: data?.id ?? "", transport: "resend" };
  }
  if (env.isProduction && process.env.ALLOW_OUTBOX !== "true") {
    throw new ConfigError("RESEND_API_KEY manquant : les emails ne peuvent pas être envoyés.");
  }
  const dir = path.join(process.cwd(), ".data", "outbox");
  await fs.mkdir(dir, { recursive: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify({ ...mail, at: new Date().toISOString() }, null, 2));
  return { id, transport: "outbox" };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function textToHtml(text: string): string {
  const body = escapeHtml(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#C2410C">$1</a>')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#0F1E36">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<div style="font-size:20px;font-weight:bold;margin-bottom:18px">Allô Papiers</div>
<div style="background:#fff;border-radius:14px;padding:24px;font-size:16px;line-height:1.55">${body}</div>
<p style="font-size:12px;color:#55627A;margin-top:18px">Allô Papiers est un service privé indépendant, non affilié à l'administration.</p>
</div></body></html>`;
}
