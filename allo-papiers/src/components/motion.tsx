"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Apparitions au défilement. Le contenu est visible par défaut : il n'est masqué que si
 * JavaScript fonctionne (classe .js), et il réapparaît immédiatement si l'observateur échoue.
 */
export function Motion() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.classList.add("js");
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    // Filet de sécurité : rien ne reste caché plus de 2,5 s.
    const t = setTimeout(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")), 2500);
    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(t);
    };
  }, [pathname]);
  return null;
}
