"use client";
/**
 * En-tête de l'accueil public : logo, navigation, bascule clair / sombre (soleil / lune), langue, connexion et appel
 * principal ; menu plein écran sur téléphone. Le thème choisi est mémorisé (« ecs-theme », lu avant l'affichage par
 * le script de src/app/layout.tsx, donc sans flash) ; sans choix, le thème du système s'applique.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, LogIn, Menu, Moon, Sun, X } from "lucide-react";
import { cx, Logo } from "../ui";
import { LangSwitch, useT } from "../i18n";

type Mode = "light" | "dark";

function currentMode(): Mode {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Bascule soleil / lune : fondu doux des couleurs (aucun si l'utilisateur demande moins de mouvement). */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useT();
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => {
    setMode(currentMode());
    // Sans choix mémorisé, le thème suit le système en direct.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => !document.documentElement.dataset.theme && setMode(currentMode());
    mq.addEventListener("change", on);
    // Deux bascules sur la page (en-tête, menu) : elles restent synchronisées.
    const sync = () => setMode(currentMode());
    window.addEventListener("ecs-theme", sync);
    return () => {
      mq.removeEventListener("change", on);
      window.removeEventListener("ecs-theme", sync);
    };
  }, []);
  const toggle = () => {
    const next: Mode = currentMode() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) root.classList.add("hp-theme-anim");
    root.dataset.theme = next;
    try {
      localStorage.setItem("ecs-theme", next);
    } catch {}
    setMode(next);
    window.dispatchEvent(new Event("ecs-theme"));
    if (!reduce) window.setTimeout(() => root.classList.remove("hp-theme-anim"), 520);
  };
  const dark = mode === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? t("Passer en thème clair", "Switch to light theme") : t("Passer en thème sombre", "Switch to dark theme")}
      title={dark ? t("Thème clair", "Light theme") : t("Thème sombre", "Dark theme")}
      className={cx("relative grid size-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-line bg-card text-ink transition hover:border-ink/40", className)}
    >
      {/* Les deux icônes tournent l'une à la place de l'autre. */}
      <Sun aria-hidden className={cx("absolute size-[18px] transition-all duration-500 ease-out", dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0")} />
      <Moon aria-hidden className={cx("absolute size-[18px] transition-all duration-500 ease-out", dark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100")} />
    </button>
  );
}

export type NavLink = { href: string; label: string };

export function HomeHeader({ links, loggedIn, ctaHref }: { links: NavLink[]; loggedIn: boolean; ctaHref: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  // Menu ouvert : défilement de la page bloqué, Échap ferme, le focus reste dans le menu.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab" || !panel.current) return;
      const f = Array.from(panel.current.querySelectorAll<HTMLElement>("a,button")).filter((x) => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) (e.preventDefault(), f[f.length - 1].focus());
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) (e.preventDefault(), f[0].focus());
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      menuBtn.current?.focus();
    };
  }, [open]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const on = () => mq.matches && setOpen(false);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const ctaLabel = loggedIn ? t("Mon studio", "My studio") : t("Commencer mon projet", "Start my project");
  return (
    <header className={cx("sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300", scrolled ? "hp-glass border-b border-line/80" : "border-b border-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-6">
        <Link href="/" aria-label={t("E-COM STUDIO IA, accueil", "E-COM STUDIO IA, home")} className="shrink-0 rounded-lg">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 xl:flex" aria-label={t("Navigation principale", "Main navigation")}>
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-[15px] font-medium text-ink-2 transition hover:bg-paper-2 hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block"><LangSwitch large /></span>
          <ThemeSwitch />
          {!loggedIn && (
            <Link href="/connexion" className="hidden h-11 items-center rounded-full px-4 text-[15px] font-medium text-ink-2 transition hover:text-ink xl:inline-flex">
              {t("Connexion", "Sign in")}
            </Link>
          )}
          <Link href={ctaHref} className="hp-btn hp-btn-primary hidden whitespace-nowrap !min-h-11 !px-5 !text-sm sm:inline-flex">
            {ctaLabel} <ArrowRight className="size-4" aria-hidden />
          </Link>
          <button ref={menuBtn} type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="hp-menu" aria-label={t("Ouvrir le menu", "Open menu")} className="grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-card text-ink xl:hidden">
            <Menu className="size-5" aria-hidden />
          </button>
        </div>
      </div>
      {/* Menu téléphone et tablette */}
      <div id="hp-menu" ref={panel} role="dialog" aria-modal="true" aria-label={t("Menu", "Menu")} hidden={!open} className="fixed inset-0 z-[60] xl:hidden">
        <div className="absolute inset-0 bg-[#020512]/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
        <div className="hp absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col overflow-y-auto rounded-b-[1.75rem] border-b border-line px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:px-6">
          <div className="flex h-12 items-center justify-between">
            <Logo />
            <button type="button" onClick={() => setOpen(false)} aria-label={t("Fermer le menu", "Close menu")} className="grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-card">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <nav className="mt-4 grid" aria-label={t("Navigation principale", "Main navigation")}>
            {links.map((l, i) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex items-center justify-between border-b border-line py-4 font-display text-2xl font-semibold tracking-tight">
                {l.label}
                <span className="text-sm font-normal text-muted">{String(i + 1).padStart(2, "0")}</span>
              </a>
            ))}
          </nav>
          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper-2 p-3">
            <span className="text-sm font-medium text-ink-2">{t("Thème et langue", "Theme and language")}</span>
            <span className="flex items-center gap-2">
              <LangSwitch large />
              <ThemeSwitch />
            </span>
          </div>
          <div className="mt-4 grid gap-2.5">
            <Link href={ctaHref} onClick={() => setOpen(false)} className="hp-btn hp-btn-primary w-full">
              {ctaLabel} <ArrowRight className="size-4" aria-hidden />
            </Link>
            {!loggedIn && (
              <Link href="/connexion" onClick={() => setOpen(false)} className="hp-btn hp-btn-ghost w-full">
                <LogIn className="size-4" aria-hidden /> {t("Connexion", "Sign in")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
