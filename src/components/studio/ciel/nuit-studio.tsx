"use client";
/**
 * L'intérieur du Studio est de nuit. Tant que le client n'a pas choisi lui-même (clair, sombre ou « comme
 * l'appareil »), on pose la nuit en entrant dans le Studio et on la retire en sortant : son choix passe toujours avant.
 */
import { useEffect } from "react";

export function NuitStudio() {
  useEffect(() => {
    const root = document.documentElement;
    let choix: string | null = null;
    try { choix = localStorage.getItem("ecs-theme"); } catch {}
    if (choix || root.dataset.theme === "light") return;
    const avant = root.dataset.theme;
    root.dataset.theme = "dark";
    return () => {
      let depuis: string | null = null;
      try { depuis = localStorage.getItem("ecs-theme"); } catch {}
      if (!depuis && !avant) delete root.dataset.theme;
    };
  }, []);
  return null;
}
