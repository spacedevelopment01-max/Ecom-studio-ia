"use client";
/**
 * Réglages d'affichage de la coquille SYNA (mission #282, lot 1 bis) : une seule source pour les deux modes.
 *
 * - Lus sur le serveur au chargement de la page (aucun clignotement), puis gardés ici.
 * - Chaque changement s'applique tout de suite (sans recharger, sans toucher à l'arbre des écrans) puis s'enregistre sur
 *   le serveur, pour le compte ou pour ce projet. Une copie locale sert de secours hors ligne et part au retour du réseau.
 * - Synchronisation entre appareils et onglets : relecture au retour sur la page (focus, onglet visible), à la
 *   reconnexion, et quand un autre onglet du même appareil enregistre.
 * - Apparence : appliquée à tout le Studio (même mécanisme que le bouton clair / sombre actuel), seulement si la
 *   personne l'a choisie ; sinon le choix déjà fait sur l'appareil est respecté.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { resolveSynaPrefs, sanitizeSynaPrefs, type ResolvedSynaPrefs, type SynaUiPrefs } from "@/lib/syna-ui/preferences";
import { serialQueue } from "@/lib/syna-ui/serial-queue";

export type StoredSynaPrefs = { account: Partial<SynaUiPrefs>; project: Partial<SynaUiPrefs> | null; updatedAt: number };
export type SynaPrefsScope = "account" | "project";
export type SynaPrefsStatus = "saved" | "saving" | "offline" | "error";

type Ctx = {
  resolved: ResolvedSynaPrefs;
  stored: StoredSynaPrefs;
  scope: SynaPrefsScope;
  setScope: (s: SynaPrefsScope) => void;
  /** Applique tout de suite puis enregistre. Cible : l'exception du projet si elle fixe déjà ce réglage, sinon la portée choisie. */
  update: (patch: Partial<SynaUiPrefs>, target?: SynaPrefsScope) => void;
  /** Réglages du compte remis par défaut (les exceptions des projets ne bougent pas). */
  resetAccount: () => void;
  /** Ce projet suit de nouveau les réglages du compte. */
  clearProject: () => void;
  status: SynaPrefsStatus;
  /** Apparence affichée : choisie, sinon celle déjà retenue sur cet appareil, sinon celle de l'appareil. */
  appearance: "auto" | "light" | "dark";
};

const SynaPrefsCtx = createContext<Ctx | null>(null);
const cacheKey = (projectId: string) => `ecs-syna-prefs:${projectId}`;
const PENDING = "ecs-syna-prefs-pending";
const BUS = "ecs-syna-prefs-bus";

type Pending = { scope: SynaPrefsScope; projectId: string; prefs: Partial<SynaUiPrefs> };

function readLocal<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function writeLocal(key: string, value: unknown) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
}

export function SynaPrefsProvider({ projectId, initial, children }: { projectId: string; initial: StoredSynaPrefs | null; children: ReactNode }) {
  const [stored, setStored] = useState<StoredSynaPrefs>(() => initial ?? { account: {}, project: null, updatedAt: 0 });
  const [scope, setScope] = useState<SynaPrefsScope>(() => (initial?.project ? "project" : "account"));
  const [status, setStatus] = useState<SynaPrefsStatus>("saved");
  const [deviceTheme, setDeviceTheme] = useState<"light" | "dark" | null>(null);
  const storedRef = useRef(stored);
  storedRef.current = stored;
  const writing = useRef(0);

  const url = `/api/studio/ui-prefs?projectId=${encodeURIComponent(projectId)}`;
  const accept = useCallback((v: StoredSynaPrefs) => {
    const clean = { account: sanitizeSynaPrefs(v.account), project: v.project ? sanitizeSynaPrefs(v.project) : null, updatedAt: v.updatedAt ?? 0 };
    setStored(clean);
    writeLocal(cacheKey(projectId), clean);
  }, [projectId]);

  const pull = useCallback(async () => {
    if (writing.current) return;
    try {
      const r = await fetch(url, { cache: "no-store", credentials: "same-origin" });
      if (!r.ok) return;
      const v = (await r.json()) as StoredSynaPrefs;
      if (!writing.current) accept(v);
    } catch { /* hors ligne : on garde l'état courant */ }
  }, [url, accept]);

  // Les enregistrements partent l'un après l'autre, dans l'ordre des changements : deux bascules rapides ne peuvent
  // pas arriver au serveur dans le désordre (l'écran montrerait Encre, le serveur garderait Plein cadre). Seule la
  // réponse du dernier enregistrement est appliquée à l'écran.
  const queue = useRef(serialQueue());
  const push = useCallback((p: Pending) => {
    writing.current++;
    setStatus("saving");
    return queue.current.run(async (isLatest) => {
      try {
        const r = await fetch("/api/studio/ui-prefs", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: p.scope, projectId: p.projectId, prefs: p.prefs }) });
        if (!r.ok) throw new Error(String(r.status));
        const v = (await r.json()) as StoredSynaPrefs;
        if (!isLatest()) return;
        writeLocal(PENDING, null);
        accept(v);
        setStatus("saved");
        try { new BroadcastChannel(BUS).postMessage(Date.now()); } catch { /* ancien navigateur */ }
      } catch (e) {
        // Réseau coupé : on garde la demande et on la renvoie au retour. Refus du serveur (droits, valeur) : signalé.
        const offline = e instanceof TypeError || (typeof navigator !== "undefined" && !navigator.onLine);
        if (offline && isLatest()) writeLocal(PENDING, p);
        setStatus(offline ? "offline" : "error");
      } finally {
        writing.current--;
      }
    });
  }, [accept]);

  // Premier affichage sans données serveur (cas rare) : copie locale, puis relecture.
  useEffect(() => {
    if (!initial) { const local = readLocal<StoredSynaPrefs>(cacheKey(projectId)); if (local) setStored(local); }
    const pending = readLocal<Pending>(PENDING);
    if (pending && pending.projectId === projectId) void push(pending); else void pull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Synchronisation : retour sur la page, onglet visible, reconnexion, autre onglet qui enregistre.
  useEffect(() => {
    const again = () => { const p = readLocal<Pending>(PENDING); if (p && p.projectId === projectId) void push(p); else void pull(); };
    const whenVisible = () => { if (document.visibilityState === "visible") again(); };
    window.addEventListener("focus", again);
    document.addEventListener("visibilitychange", whenVisible);
    window.addEventListener("online", again);
    let bus: BroadcastChannel | null = null;
    try { bus = new BroadcastChannel(BUS); bus.onmessage = () => void pull(); } catch { /* ancien navigateur */ }
    return () => { window.removeEventListener("focus", again); document.removeEventListener("visibilitychange", whenVisible); window.removeEventListener("online", again); bus?.close(); };
  }, [projectId, pull, push]);

  const write = useCallback((target: SynaPrefsScope, next: Partial<SynaUiPrefs>) => {
    const cur = storedRef.current;
    const optimistic = target === "account" ? { ...cur, account: next } : { ...cur, project: Object.keys(next).length ? next : null };
    setStored(optimistic);
    writeLocal(cacheKey(projectId), optimistic);
    void push({ scope: target, projectId, prefs: next });
  }, [projectId, push]);

  const update = useCallback((patch: Partial<SynaUiPrefs>, target?: SynaPrefsScope) => {
    const cur = storedRef.current;
    const keys = Object.keys(patch) as (keyof SynaUiPrefs)[];
    const t: SynaPrefsScope = target ?? (cur.project && keys.some((k) => k in cur.project!) ? "project" : scope);
    write(t, { ...(t === "account" ? cur.account : cur.project ?? {}), ...patch });
  }, [scope, write]);

  const resetAccount = useCallback(() => write("account", {}), [write]);
  const clearProject = useCallback(() => { write("project", {}); setScope("account"); }, [write]);

  // Apparence : seulement si elle a été choisie (sinon on respecte le choix déjà fait avec le bouton clair / sombre).
  const chosen = stored.project?.appearance ?? stored.account.appearance;
  useEffect(() => {
    const root = document.documentElement;
    if (chosen === "light" || chosen === "dark") { root.dataset.theme = chosen; try { localStorage.setItem("ecs-theme", chosen); } catch {} }
    else if (chosen === "auto") { delete root.dataset.theme; try { localStorage.removeItem("ecs-theme"); } catch {} }
    const t = root.dataset.theme;
    setDeviceTheme(t === "light" || t === "dark" ? t : null);
  }, [chosen]);

  const resolved = useMemo(() => resolveSynaPrefs(stored.account, stored.project), [stored]);
  const value = useMemo<Ctx>(() => ({
    resolved, stored, scope, setScope, update, resetAccount, clearProject, status,
    appearance: chosen ?? deviceTheme ?? "auto",
  }), [resolved, stored, scope, update, resetAccount, clearProject, status, chosen, deviceTheme]);
  return <SynaPrefsCtx.Provider value={value}>{children}</SynaPrefsCtx.Provider>;
}

export function useSynaPrefs(): Ctx {
  const v = useContext(SynaPrefsCtx);
  if (!v) throw new Error("useSynaPrefs hors de SynaPrefsProvider");
  return v;
}

/** Variante tolérante : réglages par défaut hors du fournisseur (rendu isolé, tests). */
export function useOptionalSynaPrefs(): Ctx | null {
  return useContext(SynaPrefsCtx);
}
