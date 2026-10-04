/** Mise en page commune des pages légales. */
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./ui";
import { SiteFooter } from "./site-footer";
import { LangSwitch } from "./i18n";
import { company } from "@/lib/legal";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";

export async function LegalPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  const lang = await serverLang();
  const T = (fr: string, en: string) => pick(lang, fr, en);
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label={T("E-COM STUDIO IA, accueil", "E-COM STUDIO IA, home")} className="shrink-0"><Logo className="max-[479px]:hidden" /><Logo compact className="min-[480px]:hidden" /></Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <LangSwitch />
            <Link href="/" className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-ink-2 hover:text-ink"><ArrowLeft className="size-4" /> {T("Accueil", "Home")}</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1]">{title}</h1>
        <p className="mt-4 text-sm text-muted">{T("Dernière mise à jour :", "Last updated:")} {company(lang).updated}</p>
        {intro && <p className="mt-6 text-lg leading-relaxed text-ink-2">{intro}</p>}
        <div className="legal mt-10 grid gap-8 text-[15px] leading-relaxed text-ink-2 [&_a]:text-signal [&_a]:underline [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_section]:grid [&_section]:gap-3 [&_strong]:text-ink">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
