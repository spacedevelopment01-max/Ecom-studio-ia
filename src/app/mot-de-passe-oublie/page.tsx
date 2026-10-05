import { ForgotPassword } from "@/components/password-forms";
import { ToastProvider } from "@/components/ui";
import { mailConfigured } from "@/lib/mail";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: pick(await serverLang(), "Mot de passe oublié", "Forgot your password"), robots: { index: false } };
}

/** Sans envoi d'e-mails réglé dans l'administration, la page renvoie honnêtement vers le support. */
export default function Page() {
  return (
    <ToastProvider>
      <ForgotPassword mailEnabled={mailConfigured()} />
    </ToastProvider>
  );
}
