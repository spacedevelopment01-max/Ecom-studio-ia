"use client";

import { useEffect, useRef } from "react";

/**
 * Verrouillage après inactivité : le navigateur prévient le serveur, qui verrouille la session.
 * Le serveur verrouille de toute façon de lui-même après le même délai (onglet fermé, veille…).
 */
export function IdleLock({ minutes }: { minutes: number }) {
  const last = useRef(Date.now());
  useEffect(() => {
    const bump = () => {
      last.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => addEventListener(e, bump, { passive: true }));
    const timer = setInterval(async () => {
      if (Date.now() - last.current > minutes * 60_000) {
        clearInterval(timer);
        await fetch("/api/auth/lock", { method: "POST" }).catch(() => {});
        location.href = `/deverrouiller?suite=${encodeURIComponent(location.pathname)}`;
      }
    }, 20_000);
    return () => {
      events.forEach((e) => removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [minutes]);
  return null;
}
