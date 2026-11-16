"use client";
/** Le ciel seul, sans constellation : le décor vivant des pages d'entrée (connexion, inscription). */
import "./ciel.css";
import { useEffect, useRef, type ReactNode } from "react";
import { monterCiel } from "./moteur";

export function CielFond({ className, children }: { className?: string; children?: ReactNode }) {
  const racine = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!racine.current) return;
    const c = monterCiel(racine.current, { astres: [], sina: null });
    return () => c.detruire();
  }, []);
  return <div ref={racine} className={`ciel ciel-fond ${className ?? ""}`} data-ciel data-vu=""><canvas aria-hidden="true" />{children}</div>;
}
