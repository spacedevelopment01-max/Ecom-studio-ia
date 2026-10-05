import { handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { sendMail, smtpConfig } from "@/lib/mail";
import { L } from "@/lib/i18n-server";

/** Envoie un e-mail de test à l'adresse de l'administrateur avec les réglages SMTP enregistrés. */
export const POST = handle(async () => {
  const admin = await requireAdmin();
  const cfg = smtpConfig();
  if (!cfg) throw new HttpError(409, L("Renseignez au moins le serveur SMTP et l'adresse d'expédition.", "Enter at least the SMTP server and the sender address."));
  try {
    await sendMail({ to: admin.email, subject: L("Test d'envoi — E-COM STUDIO IA", "Sending test — E-COM STUDIO IA"), text: L("Les e-mails du studio partent correctement.", "Studio emails are being sent correctly.") }, cfg);
  } catch (e) {
    return ok({ ok: false, message: L(`Échec de l'envoi : ${(e as Error).message}`, `Sending failed: ${(e as Error).message}`) });
  }
  return ok({ ok: true, message: L(`E-mail de test envoyé à ${admin.email}.`, `Test email sent to ${admin.email}.`) });
});
