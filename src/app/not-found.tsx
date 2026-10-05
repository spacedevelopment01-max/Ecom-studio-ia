import Link from "next/link";
import { ArrowLeft, LayoutGrid, LogIn } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/ui";
import { LangSwitch } from "@/components/i18n";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import { currentUser } from "@/lib/auth";

export async function generateMetadata() {
  return { title: pick(await serverLang(), "Page introuvable", "Page not found"), robots: { index: false } };
}

/** Page 404 dans la langue de l'interface, avec retour à l'accueil (ou au studio pour une personne connectée). */
export default async function NotFound() {
  const lang = await serverLang();
  const T = (fr: string, en: string) => pick(lang, fr, en);
  const user = await currentUser().catch(() => null);
  return (
    <div className="flex min-h-dvh flex-col bg-paper px-5 py-6 text-ink sm:px-10">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label={T("E-COM STUDIO IA, accueil", "E-COM STUDIO IA, home")}><Logo /></Link>
        <div className="flex items-center gap-2">
          <LangSwitch />
          <ThemeToggle />
        </div>
      </div>
      <main className="mx-auto my-auto w-full max-w-lg py-16 text-center">
        <p className="font-display text-7xl font-semibold text-signal sm:text-8xl">404</p>
        <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">{T("Cette page n'existe pas.", "This page doesn't exist.")}</h1>
        <p className="mt-3 text-ink-2">{T("Le lien est peut-être incomplet, ou la page a été déplacée.", "The link may be incomplete, or the page has moved.")}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-5 text-sm font-medium hover:border-ink"><ArrowLeft className="size-4" aria-hidden /> {T("Retour à l'accueil", "Back to home")}</Link>
          <Link href={user ? "/studio" : "/connexion"} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper">{user ? <LayoutGrid className="size-4" aria-hidden /> : <LogIn className="size-4" aria-hidden />} {user ? T("Mes projets", "My projects") : T("Se connecter", "Sign in")}</Link>
        </div>
      </main>
    </div>
  );
}
