"use client";
import { useEffect, type RefObject } from "react";

/** Le ciel prend toute la place sous ce qui le précède (et au-dessus de la barre du bas, au téléphone). */
export function useHauteurCiel(racine: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    const ajuster = () => {
      const bas = [...document.querySelectorAll<HTMLElement>("[data-mobile-nav]")].find((b) => b.getClientRects().length);
      const h = window.innerHeight - (el.getBoundingClientRect().top + window.scrollY) - (bas ? bas.offsetHeight : 0);
      el.style.height = `${Math.max(440, Math.round(h))}px`;
    };
    ajuster();
    window.addEventListener("resize", ajuster);
    const suivi = new ResizeObserver(ajuster);
    if (el.parentElement) suivi.observe(el.parentElement);
    return () => { window.removeEventListener("resize", ajuster); suivi.disconnect(); };
  }, [racine]);
}
