/**
 * Envoi d'e-mails par SMTP (nodemailer), réglé dans l'administration (Paramètres › E-mails).
 * Serveur, identifiant et mot de passe sont chiffrés en base et jamais renvoyés en clair au navigateur.
 * Sans réglage, aucun e-mail n'est envoyé : les écrans le disent (par exemple « Mot de passe oublié »
 * renvoie vers la page contact) au lieu de faire semblant.
 */
import { getSetting } from "./settings";
import { logError } from "./db";

export type SmtpConfig = { host: string; port: number; secure: boolean; user: string | null; password: string | null; from: string };

export function smtpConfig(): SmtpConfig | null {
  const host = getSetting("smtp.host")?.trim();
  const from = getSetting("smtp.from")?.trim();
  if (!host || !from) return null;
  const port = Number(getSetting("smtp.port") || 587) || 587;
  return { host, port, secure: port === 465, user: getSetting("smtp.user")?.trim() || null, password: getSetting("smtp.password") || null, from };
}

export const mailConfigured = () => !!smtpConfig();

export type Mail = {
  to: string; subject: string; text: string; html?: string;
  /** Nom affiché devant l'adresse d'expédition du studio (l'adresse elle-même reste celle du réglage, jamais une autre). */
  fromName?: string; replyTo?: string; messageId?: string; headers?: Record<string, string>;
};

/** Adresse seule du réglage « smtp.from » (« Studio <studio@exemple.fr> » ou « studio@exemple.fr »). */
export const fromAddress = (from: string) => (from.match(/<([^<>]+)>/)?.[1] ?? from).trim();

/** Envoi de test ou d'usage : lève une erreur lisible si l'envoi échoue. */
export async function sendMail(m: Mail, cfg: SmtpConfig | null = smtpConfig()): Promise<string | undefined> {
  if (!cfg) throw new Error("SMTP non configuré.");
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    ...(cfg.user ? { auth: { user: cfg.user, pass: cfg.password ?? "" } } : {}),
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  const from = m.fromName ? { name: m.fromName, address: fromAddress(cfg.from) } : cfg.from;
  const info = await transport.sendMail({
    from, to: m.to, subject: m.subject, text: m.text,
    ...(m.html ? { html: m.html } : {}),
    ...(m.replyTo ? { replyTo: m.replyTo } : {}),
    ...(m.messageId ? { messageId: m.messageId } : {}),
    ...(m.headers ? { headers: m.headers } : {}),
  });
  return info.messageId as string | undefined;
}

/** Envoi en arrière-plan (la réponse HTTP n'attend pas : même délai que l'adresse existe ou non). */
export function sendMailInBackground(m: Mail, scope = "mail") {
  sendMail(m).catch((e) => logError(scope, e, { details: { to: m.to.replace(/^(.).*(@.*)$/, "$1…$2") } }));
}
