"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";

const PUBLIC_LINKS = [
  { href: "/#fonctionnement", label: "Comment ça marche" },
  { href: "/demonstrations", label: "Vidéos" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/#confidentialite", label: "Confidentialité" },
  { href: "/aide", label: "Aide" },
];

const APP_LINKS = [
  { href: "/espace", label: "Mon espace" },
  { href: "/documents", label: "Mes documents" },
  { href: "/courriers", label: "Courriers" },
  { href: "/dossiers", label: "Dossiers" },
  { href: "/coffre-fort", label: "Coffre-fort" },
  { href: "/compte", label: "Compte" },
];

const MORE_APP_LINKS = [
  { href: "/comparer", label: "Comparer deux documents" },
  { href: "/rendez-vous", label: "Préparer un rendez-vous" },
  { href: "/rappels", label: "Échéances et rappels" },
  { href: "/orientation", label: "Trouver France Services" },
  { href: "/aide", label: "Aide" },
];

export function Header({ connected }: { connected: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        setScrolled(scrollY > 8);
        setProgress(max > 0 ? Math.min(1, scrollY / max) : 0);
      });
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = connected ? APP_LINKS : PUBLIC_LINKS;
  const isActive = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    // En-tête OPAQUE : le texte de la page ne transparaît jamais derrière.
    <header className={`sticky top-0 z-50 bg-cream transition-shadow ${scrolled ? "shadow-[0_6px_20px_-14px_rgba(15,30,54,0.45)]" : ""}`}>
      <div className="absolute inset-x-0 top-0 h-[3px] origin-left bg-gradient-to-r from-orange to-[#fb923c]" style={{ transform: `scaleX(${progress})` }} aria-hidden />
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
        <Link href={connected ? "/espace" : "/"} aria-label="Allô Papiers, accueil" className="shrink-0">
          <Logo compact={scrolled} />
        </Link>
        <nav aria-label="Navigation principale" className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`whitespace-nowrap rounded-xl px-2.5 py-2 font-medium transition-colors hover:bg-sand ${isActive(l.href) ? "text-orange" : "text-navy"}`} aria-current={isActive(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {connected ? (
            <Link href="/nouveau" className="btn btn-primary hidden !min-h-11 whitespace-nowrap !px-4 sm:inline-flex">Nouveau document</Link>
          ) : (
            <>
              <Link href="/connexion" className="btn btn-ghost hidden whitespace-nowrap sm:inline-flex">Se connecter</Link>
              <Link href="/nouveau" className="btn btn-primary hidden !min-h-11 whitespace-nowrap !px-4 sm:inline-flex">Comprendre un document</Link>
            </>
          )}
          <button type="button" className="btn btn-ghost !min-h-12 !px-2.5 lg:hidden" aria-expanded={open} aria-controls="menu-mobile" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </button>
        </div>
      </div>
      {open && (
        <div id="menu-mobile" className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-line bg-cream lg:hidden">
          <nav aria-label="Menu" className="container-page grid gap-1 py-4">
            {[...links, ...(connected ? MORE_APP_LINKS : [])].map((l) => (
              <Link key={l.href} href={l.href} className={`rounded-2xl px-4 py-3.5 text-lg font-semibold ${isActive(l.href) ? "bg-orange-soft text-orange-dark" : "text-navy hover:bg-sand"}`}>
                {l.label}
              </Link>
            ))}
            <div className="mt-4 grid gap-3">
              <Link href="/nouveau" className="btn btn-primary w-full">{connected ? "Nouveau document" : "Comprendre un document"}</Link>
              {connected ? (
                <Link href="/courriers" className="btn btn-outline w-full">Rédiger un courrier</Link>
              ) : (
                <Link href="/connexion" className="btn btn-outline w-full">Se connecter</Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
