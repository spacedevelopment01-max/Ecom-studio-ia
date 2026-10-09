import type { KeyboardEvent } from "react";

/**
 * Onglets accessibles (motif WAI-ARIA) : flèches, Début et Fin déplacent la sélection et le focus.
 * À poser sur l'élément role="tablist" ; seul l'onglet sélectionné reçoit tabIndex 0 (focus itinérant).
 */
export function onTabKeys(e: KeyboardEvent<HTMLElement>, current: number, count: number, select: (k: number) => void) {
  const k =
    e.key === "ArrowRight" || e.key === "ArrowDown" ? (current + 1) % count
    : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (current - 1 + count) % count
    : e.key === "Home" ? 0
    : e.key === "End" ? count - 1
    : -1;
  if (k < 0) return;
  e.preventDefault();
  select(k);
  e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[k]?.focus();
}
