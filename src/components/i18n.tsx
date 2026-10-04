"use client";
/**
 * Langue de l'interface côté navigateur.
 * - `useT()` renvoie `t(fr, en)` : le texte dans la langue choisie.
 * - `useLang()` renvoie la langue et `setLang` (cookie + compte + nouveau rendu des pages serveur).
 * - `<LangSwitch />` : sélecteur FR | EN.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LANGS, LANG_COOKIE, pick, type Lang } from "@/lib/i18n";

let current: Lang = "fr";
/** Langue courante pour les fonctions hors composants (dates, nombres, messages d'erreur). */
export const currentLang = () => current;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "fr", setLang: () => {} });

export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setState] = useState<Lang>(initial);
  current = lang;
  const router = useRouter();
  const setLang = useCallback(
    (l: Lang) => {
      current = l;
      setState(l);
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
      fetch("/api/me/lang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: l }) }).catch(() => {});
      router.refresh();
    },
    [router],
  );
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

export function useT() {
  const { lang } = useContext(Ctx);
  return useCallback(<T,>(fr: T, en: T): T => pick(lang, fr, en), [lang]);
}

/** Sélecteur de langue de l'interface. */
export function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label={lang === "en" ? "Language" : "Langue"} className={["inline-flex shrink-0 rounded-full border border-line bg-card p-0.5 text-xs font-semibold", className].filter(Boolean).join(" ")}>
      {LANGS.map((l) => (
        <button key={l.id} type="button" onClick={() => l.id !== lang && setLang(l.id)} aria-pressed={lang === l.id} title={l.label} lang={l.id} className={["rounded-full px-2.5 py-1.5 transition", lang === l.id ? "bg-ink text-paper" : "text-muted hover:text-ink"].join(" ")}>
          {l.short}
        </button>
      ))}
    </div>
  );
}
