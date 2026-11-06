"use client";
/**
 * Coquille SINA du Studio (mission #282, lot 1) — présentation « Encre ».
 *
 * Ce qui change : l'habillage (menu des espaces, en-tête, accès à SINA, barre du téléphone).
 * Ce qui ne change pas : les écrans de chaque espace (rendus tels quels, hors du conteneur `.syna-ui`), leurs adresses,
 * la règle `spaceVisible`, les pastilles, la recherche rapide, les tutoriels, les tâches, les notifications, le budget,
 * le forfait, le compte, et la conversation SINA elle-même (le même `ConversationPanel`, mêmes routes, même fil).
 *
 * L'ancienne pastille noire flottante n'est pas affichée ici : SINA est une colonne repliable à droite, avec un onglet
 * signature quand elle est repliée, et l'onglet « Sina » de la barre basse au téléphone. Si les drapeaux
 * `STUDIO_CONVERSATION_*` sont fermés, aucun accès à SINA n'apparaît (comme aujourd'hui).
 *
 * Lot 1 bis : deux présentations du MÊME Studio, au choix et à tout moment —
 * - Encre : menu complet, conversation en colonne à côté de l'espace de travail ;
 * - Plein cadre : menu compact, l'espace de travail d'abord, SINA en barre de commande (zone réservée) et en feuille.
 * Le mode ne change que des classes et des positions : l'arbre des écrans, la conversation (`ConversationPanel`) et la
 * barre de commande ne sont jamais recréés (brouillon, sélection, page, défilement et tâches conservés). Réglages lus
 * et enregistrés par `SynaPrefsProvider` (compte, projet), personnalisation dans `SynaCustomize`, commandes d'affichage
 * locales dans `SynaCommandBar`.
 */
import "@/components/syna/syna.css";
import "./syna-shell.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { ChevronDown, LayoutGrid, ListChecks, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Pause, Play, Settings, Shield, SlidersHorizontal, Store, Sun, X, Undo2, Sparkles } from "lucide-react";
import { api, Badge, cx, Logo, useApi } from "../ui";
import { LangSwitch, useLang, useT } from "../i18n";
import { useProject } from "./project-context";
import { TutorialButton, TutorialsMenuLink } from "./tutorial";
import { AiUsageBar, PlanLink, QuotaBanner, useBilling } from "../billing-client";
import { ConversationPanel } from "./conversation-panel";
import { SynaThread } from "./syna-thread";
import { useAgentPanel, useAgentUi } from "./agent-ui-context";
import { ActiveJobs, MobileLangToggle, MobileMenu, Notifications, ProjectSwitcher, QuickSearch, SpaceGuide, STATUS, TABS, navCtx, spaceBadge, tabIcon, tabLabel, tabsOf, type TabId } from "./shell";
import { advancedOpen, navSpace, space, spacePurpose, SPACE_GROUPS } from "@/lib/studio-nav";
import { SynaProgress, SynaScope, SynaTrigger } from "@/components/syna";
import { resolveSynaPrefs, SYNA_CONVO_WIDTH, type ResolvedSynaPrefs } from "@/lib/syna-ui/preferences";
import { synaShellCookie, type StudioShellVariant } from "@/lib/syna-ui/studio-shell";
import { SynaPrefsProvider, useOptionalSynaPrefs, useSynaPrefs, type StoredSynaPrefs } from "./syna-prefs";
import { SynaCustomize } from "./syna-customize";
import { SynaCommandBar, type SynaCommandFeedback } from "./syna-command";

/** Réglages de présentation effectifs (compte, projet, défaut). Hors fournisseur (rendu isolé) : valeurs par défaut. */
export function useSynaShellPrefs(): ResolvedSynaPrefs {
  return useOptionalSynaPrefs()?.resolved ?? resolveSynaPrefs();
}

/** Passer d'une interface à l'autre sur cet appareil (retour arrière immédiat pendant la transition). */
export function SynaShellSwitch({ to, compact }: { to: StudioShellVariant; compact?: boolean }) {
  const t = useT();
  const router = useRouter();
  const label = to === "classic" ? t("Interface actuelle", "Current interface") : t("Nouvelle interface", "New interface");
  return (
    <button
      type="button"
      data-syna-shell-switch={to}
      onClick={() => { document.cookie = synaShellCookie(to); router.refresh(); }}
      aria-label={compact ? label : undefined}
      className={compact ? "ss-foot-link" : "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-ink-2 hover:bg-paper-2 hover:text-ink"}
      title={to === "classic" ? t("Revenir à l'interface actuelle du Studio (sur cet appareil)", "Go back to the current Studio interface (on this device)") : t("Essayer la nouvelle interface SINA (sur cet appareil)", "Try the new SINA interface (on this device)")}
    >
      {to === "classic" ? <Undo2 className="size-4 shrink-0" /> : <Sparkles className="size-4 shrink-0" />}
      {!compact && <span className="truncate">{label}</span>}
    </button>
  );
}

/** Dialogue accessible : focus à l'ouverture, Échap pour fermer, Tab qui reste dedans (si modal), focus rendu à la fermeture. */
function useDialogFocus(open: boolean, box: RefObject<HTMLElement | null>, close: () => void, modal: boolean, initial?: () => HTMLElement | null | undefined, restore?: () => HTMLElement | null) {
  const returnTo = useRef<HTMLElement | null>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const target = initial?.() ?? box.current?.querySelector<HTMLElement>("button:not(:disabled),a[href],textarea:not(:disabled),input:not(:disabled)");
    target?.focus();
    const previous = document.body.style.overflow;
    if (modal) document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== "Tab" || !modal) return;
      const items = Array.from(box.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]') ?? []).filter((el) => el.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      const back = returnTo.current;
      if (back && document.contains(back) && back !== document.body) back.focus();
      // Le bouton d'origine a pu être remplacé (onglet signature remis à la fermeture) : on le retrouve après le rendu.
      else if (restore) requestAnimationFrame(() => restore()?.focus());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modal]);
}

function useMedia(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query), update = () => setMatch(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [query]);
  return match;
}

/** Feuille du bas (téléphone, tablette) : tous les espaces, ou le suivi des tâches. */
function Sheet({ label, onClose, children, id }: { label: string; onClose: () => void; children: ReactNode; id: string }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  useDialogFocus(true, box, onClose, true);
  return (
    <div className="ss-sheet-layer" role="dialog" aria-modal="true" aria-label={label} id={id}>
      <button type="button" className="ss-scrim" aria-label={t("Fermer", "Close")} tabIndex={-1} onClick={onClose} />
      <div className="ss-sheet" ref={box}>
        <div className="ss-sheet-h">
          <span className="ss-grip" aria-hidden="true" />
          <p className="sy-title ss-sheet-t">{label}</p>
          <button type="button" className="ss-icon-btn" onClick={onClose} aria-label={t("Fermer", "Close")}><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Hauteur cachée par le clavier virtuel (téléphone) : la barre de commande et la feuille SINA restent au-dessus. */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);
  return inset;
}

/** Clair / sombre en un clic (enregistré dans les réglages ; « Personnaliser » propose aussi « comme l'appareil »). */
function AppearanceToggle({ className }: { className?: string }) {
  const t = useT();
  const p = useSynaPrefs();
  const dark = p.appearance === "dark" || (p.appearance === "auto" && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  return (
    <button type="button" className={cx("ss-icon-btn ss-outline", className)} onClick={() => p.update({ appearance: dark ? "light" : "dark" })} aria-label={dark ? t("Passer en clair", "Switch to light") : t("Passer en sombre", "Switch to dark")} title={dark ? t("Passer en clair", "Switch to light") : t("Passer en sombre", "Switch to dark")}>
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}

/** Sélecteur de mode toujours visible dans l'en-tête (ordinateur, tablette). */
function ModeSwitch() {
  const t = useT();
  const p = useSynaPrefs();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const key = isMac ? "⌘ Maj M" : "Ctrl Maj M";
  return (
    <div className="ss-modeswitch" role="group" aria-label={t(`Mode d'affichage (${key})`, `Display mode (${key.replace("Maj", "Shift")})`)}>
      <button type="button" aria-pressed={p.resolved.mode === "encre"} onClick={() => p.update({ mode: "encre" })} title={t("Encre : la conversation à côté du travail", "Ink: the conversation next to your work")}>Encre</button>
      <button type="button" aria-pressed={p.resolved.mode === "plein"} onClick={() => p.update({ mode: "plein" })} title={t("Plein cadre : le résultat d'abord", "Full frame: the result first")}>{t("Plein cadre", "Full frame")}</button>
    </div>
  );
}

/** La coquille SINA, avec ses réglages lus sur le serveur (`initialPrefs`) : aucun clignotement au chargement. */
export function SynaStudioShell({ projectId, children, initialPrefs = null, agent = false }: { projectId: string; children: ReactNode; initialPrefs?: StoredSynaPrefs | null; agent?: boolean }) {
  return (
    <SynaPrefsProvider projectId={projectId} initial={initialPrefs}>
      <ShellInner projectId={projectId} agent={agent}>{children}</ShellInner>
    </SynaPrefsProvider>
  );
}

function ShellInner({ projectId, children, agent = false }: { projectId: string; children: ReactNode; agent?: boolean }) {
  const t = useT();
  const { lang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const tab = (pathname.split("/")[3] ?? "pilote") as TabId;
  const { id, data, reload } = useProject();
  const prefsCtx = useSynaPrefs();
  const prefs = prefsCtx.resolved;
  const mode = prefs.mode;
  const plein = mode === "plein";
  // Les conteneurs suivent l'apparence du Studio (posée sur la page par les réglages) : jamais deux thèmes mélangés.
  const scopePrefs: ResolvedSynaPrefs = { ...prefs, appearance: "auto" };
  const agentUi = useAgentUi();
  const { open, setOpen } = useAgentPanel();
  const status = data ? (STATUS[data.project.status] ?? STATUS.draft) : null;
  const { data: me } = useApi<{ user: { role: string; email: string } }>("/api/me");
  const { billing } = useBilling({ poll: 15000 });
  const gauge = billing && data && "aiBudget" in data ? { ...billing, ai: data.aiBudget?.usage ?? null, periodEnd: data.aiBudget?.renewsAt ?? billing.periodEnd } : billing;
  const business = data?.business;
  const ctx = navCtx(data);
  const current = TABS.find((x) => x.id === tab);
  const currentLabel = current ? tabLabel(current, lang, business) : "";
  const group = SPACE_GROUPS.find((g) => g.id === space(navSpace(tab))?.group);
  const badge = (x: TabId) => spaceBadge(data, x);
  const active = data?.active ?? [];
  const running = active.filter((j) => j.status !== "paused");
  const runningText = running.length ? t(`${running.length} tâche${running.length > 1 ? "s" : ""} en cours`, `${running.length} task${running.length > 1 ? "s" : ""} running`) : undefined;

  // ——— Menu des espaces (ordinateur) : replié ou déplié en Encre (mêmes clés d'appareil qu'aujourd'hui), compact en Plein cadre.
  const [folded, setFolded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  useEffect(() => {
    try {
      setFolded(localStorage.getItem("ecs-sidebar") === "folded");
      setShowAdvanced(localStorage.getItem("ecs-nav-advanced") === "open");
    } catch {}
  }, []);
  const compactNav = folded || plein;
  const toggleFold = () => setFolded((v) => { try { localStorage.setItem("ecs-sidebar", v ? "open" : "folded"); } catch {} return !v; });
  const toggleAdvanced = () => {
    const next = !advancedOpen(tab, showAdvanced);
    setShowAdvanced(next);
    try { localStorage.setItem("ecs-nav-advanced", next ? "open" : "closed"); } catch {}
  };
  const keysRef = useRef({ toggleFold, plein, update: prefsCtx.update, mode, agentUi, toggleSyna: () => {} });
  keysRef.current = { toggleFold, plein, update: prefsCtx.update, mode, agentUi, toggleSyna: () => setOpen(!open) };
  useEffect(() => {
    // Raccourcis : « [ » replie le menu (Encre), Alt+1…9 change d'espace, Ctrl / ⌘ + Maj + M change de mode,
    // Ctrl / ⌘ + J ouvre ou replie SINA.
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        keysRef.current.update({ mode: keysRef.current.mode === "plein" ? "encre" : "plein" });
        return;
      }
      // Ctrl / ⌘ + J : ouvrir ou replier SINA (si elle est ouverte sur l'installation).
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "j" && keysRef.current.agentUi) {
        e.preventDefault();
        keysRef.current.toggleSyna();
        return;
      }
      if (e.key === "[" && !e.altKey && !e.ctrlKey && !e.metaKey && !typing && !keysRef.current.plein) return keysRef.current.toggleFold();
      if (!e.altKey) return;
      const n = Number(e.key);
      const visible = TABS.filter((x) => !space(x.id)?.within && x.id !== "biens" && x.id !== "carte" && x.id !== "realisations");
      if (n >= 1 && n <= Math.min(9, visible.length)) router.push(`/studio/${projectId}/${visible[n - 1].id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId, router]);

  // Menu : l'espace actif reste visible, et un fondu signale les espaces plus bas (écrans peu hauts).
  const navRef = useRef<HTMLElement>(null);
  const [more, setMore] = useState({ up: false, down: false });
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => setMore({ up: nav.scrollTop > 2, down: nav.scrollTop + nav.clientHeight < nav.scrollHeight - 2 });
    nav.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ block: "nearest" });
    update();
    nav.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { nav.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [tab, compactNav, showAdvanced, data]);

  // ——— Bascule de mode sans perte de lecture : on retient l'élément en haut de l'écran et on le remet à sa place.
  const anchor = useRef<{ el: Element; top: number } | null>(null);
  useEffect(() => {
    let raf = 0;
    const remember = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const main = document.getElementById("studio-main");
        if (!main) return;
        const headBottom = document.querySelector(".ss-head")?.getBoundingClientRect().bottom ?? 0;
        const el = [...main.querySelectorAll("*")].find((x) => { const r = x.getBoundingClientRect(); return r.height > 0 && r.bottom > headBottom + 4; });
        anchor.current = el ? { el, top: el.getBoundingClientRect().top } : null;
      });
    };
    remember();
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("resize", remember);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", remember); window.removeEventListener("resize", remember); };
  }, []);
  // Dernier champ qui a eu le focus (le navigateur le perd quand un champ est masqué par le changement de mode).
  const lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const onIn = (e: FocusEvent) => { lastFocus.current = e.target as HTMLElement; };
    document.addEventListener("focusin", onIn);
    return () => document.removeEventListener("focusin", onIn);
  }, []);
  const [announce, setAnnounce] = useState("");
  const firstMode = useRef(true);
  useLayoutEffect(() => {
    if (firstMode.current) { firstMode.current = false; return; }
    const a = anchor.current;
    if (a && document.contains(a.el) && window.scrollY > 0) window.scrollBy(0, a.el.getBoundingClientRect().top - a.top);
    // Le champ qui avait le focus a pu changer de place (barre de commande) : le focus suit, texte et curseur compris.
    const f = document.activeElement as HTMLElement | null;
    if (lastFocus.current?.matches("[data-syna-command]") && (!f || f === document.body || !f.getClientRects().length || f === lastFocus.current)) {
      const cmd = [...document.querySelectorAll<HTMLInputElement>("[data-syna-command]")].find((x) => x.getClientRects().length);
      if (cmd && cmd !== f) { cmd.focus(); cmd.setSelectionRange(cmd.value.length, cmd.value.length); }
    }
    setAnnounce(mode === "plein" ? t("Mode Plein cadre", "Full-frame mode") : t("Mode Encre", "Ink mode"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ——— SINA : colonne (Encre) ou feuille (Plein cadre) à côté de l'espace de travail dès 1280 px ; par-dessus sinon.
  const docked = useMedia("(min-width: 1280px)");
  const wide = useMedia("(min-width: 1024px)");
  const [mounted, setMounted] = useState(false);
  const pinnedRef = useRef(prefs.panel);
  pinnedRef.current = prefs.panel;
  useEffect(() => { setOpen(false); setMounted(false); }, [projectId, setOpen]);
  // « Ouverte à l'arrivée » : à l'ordinateur seulement (ailleurs, l'espace de travail d'abord).
  useEffect(() => { if (agentUi && docked && pinnedRef.current === "pinned") setOpen(true); }, [agentUi, docked, projectId, setOpen]);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  const panel = useRef<HTMLElement>(null);
  const close = () => setOpen(false);
  const kb = useKeyboardInset();
  useDialogFocus(agentUi && open, panel, close, !docked, () => (docked ? panel.current?.querySelector<HTMLElement>("textarea:not(:disabled)") : null),
    () => [...document.querySelectorAll<HTMLElement>('[aria-controls="syna-panel"], [data-syna-command]')].find((b) => b.getClientRects().length) ?? null);

  // Largeur de la conversation : réglage, ou en direct pendant qu'on glisse le bord.
  const [dragW, setDragW] = useState<number | null>(null);
  const convoW = dragW ?? prefs.convoWidth;
  const clampW = (w: number) => Math.min(SYNA_CONVO_WIDTH.max, Math.max(SYNA_CONVO_WIDTH.min, Math.round(w / SYNA_CONVO_WIDTH.step) * SYNA_CONVO_WIDTH.step));
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => setDragW(clampW(window.innerWidth - ev.clientX - (plein ? 16 : 0)));
    const up = (ev: PointerEvent) => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      const w = clampW(window.innerWidth - ev.clientX - (plein ? 16 : 0));
      setDragW(null);
      if (w !== prefs.convoWidth) prefsCtx.update({ convoWidth: w });
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  };
  const keyResize = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowLeft" ? SYNA_CONVO_WIDTH.step : e.key === "ArrowRight" ? -SYNA_CONVO_WIDTH.step : e.key === "Home" ? -999 : e.key === "End" ? 999 : 0;
    if (!step) return;
    e.preventDefault();
    prefsCtx.update({ convoWidth: clampW(prefs.convoWidth + step) });
  };

  // ——— Téléphone : feuilles « Espaces » et « Suivi », fermées à chaque changement de page. Panneau « Personnaliser ».
  const [sheet, setSheet] = useState<null | "spaces" | "suivi">(null);
  const [customize, setCustomize] = useState(false);
  useEffect(() => setSheet(null), [pathname]);
  const customBox = useRef<HTMLDivElement>(null);
  useDialogFocus(customize, customBox, () => setCustomize(false), !docked, undefined, () => document.querySelector<HTMLElement>("[data-open-customize]:not([hidden])"));
  const [busy, setBusy] = useState(false);
  const pauseResume = async (action: "pause" | "resume") => {
    setBusy(true);
    try { await api(`/api/projects/${id}/pause`, { body: { action } }); reload(); } finally { setBusy(false); }
  };

  const navLink = (x: (typeof TABS)[number], compact: boolean) => {
    const Icon = tabIcon(x, business);
    const b = badge(x.id);
    const label = tabLabel(x, lang, business);
    const here = navSpace(tab) === x.id;
    return (
      <Link key={x.id} href={`/studio/${projectId}/${x.id}`} aria-current={here ? "page" : undefined} aria-label={compact ? label : undefined} title={compact ? label : (spacePurpose(x.id, lang, business) ?? undefined)} className="ss-link" data-space={x.id}>
        <Icon className="ss-link-i" aria-hidden />
        {!compact && <span className="ss-link-l">{label}</span>}
        {b !== null && (compact ? <span className="ss-dot" aria-hidden /> : <span className="ss-badge">{b}<span className="sy-sr">{t(" à traiter", " to handle")}</span></span>)}
      </Link>
    );
  };

  const spacesList = (compact: boolean, onPick?: () => void) => SPACE_GROUPS.map((g) => {
    const shut = !compact && g.folded && !advancedOpen(tab, showAdvanced) && !onPick;
    const items = tabsOf(g.id, ctx);
    if (!items.length) return null;
    const waiting = shut ? items.filter((x) => badge(x.id) !== null).length : 0;
    return (
      <div key={g.id} className="ss-group" data-nav-group={g.id} onClick={onPick ? (e) => { if ((e.target as HTMLElement).closest("a")) onPick(); } : undefined}>
        {compact ? <span className="ss-rule" aria-hidden /> : g.folded && !onPick ? (
          <button type="button" className="ss-group-l ss-group-btn" onClick={toggleAdvanced} aria-expanded={!shut} data-nav-advanced>
            <span>{t(...g.label)}</span>
            {waiting > 0 && <span className="ss-dot" aria-hidden />}
            <ChevronDown className={cx("size-3.5 transition-transform", !shut && "rotate-180")} aria-hidden />
          </button>
        ) : <p className="ss-group-l">{t(...g.label)}</p>}
        {!shut && <div className={onPick ? "ss-grid" : undefined}>{items.map((x) => navLink(x, compact))}</div>}
      </div>
    );
  });

  // Barre de commande : un seul texte partagé entre ses deux places (bas de l'écran en Plein cadre, haut de la colonne en Encre).
  const [cmdValue, setCmdValue] = useState("");
  const [cmdFeedback, setCmdFeedback] = useState<SynaCommandFeedback>(null);
  const openSyna = () => { setSheet(null); setOpen(true); };
  const synaColumnOpen = agentUi && open && docked;
  const sideW = compactNav ? 72 : 252;
  // Espace de travail jamais recouvert : place réservée pour la barre de commande (Plein cadre) et pour SINA ouverte à côté.
  const mainStyle: CSSProperties = {
    ...(plein ? { paddingBottom: `calc(${wide ? 112 : 96}px + env(safe-area-inset-bottom, 0px))` } : {}),
    ...(plein && synaColumnOpen ? { paddingRight: convoW + 40 } : {}),
  };
  const openCustomize = (
    <button type="button" className="ss-icon-btn ss-outline" data-open-customize onClick={() => setCustomize(true)} aria-haspopup="dialog" aria-expanded={customize} aria-controls="ss-customize" aria-label={t("Personnaliser l'interface", "Customise the interface")} title={t("Personnaliser l'interface", "Customise the interface")}>
      <SlidersHorizontal className="size-4" aria-hidden />
    </button>
  );

  return (
    <div
      data-studio-workspace
      data-syna-shell={mode}
      className={cx("ss-root min-h-dvh lg:grid", compactNav ? "lg:grid-cols-[72px_minmax(0,1fr)_auto]" : "lg:grid-cols-[252px_minmax(0,1fr)_auto]")}
    >
      {/* Menu des espaces (ordinateur) */}
      <SynaScope prefs={scopePrefs} lang={lang} className="ss-side-scope hidden lg:block">
        <aside className="ss-side" data-folded={compactNav ? "" : undefined} aria-label={t("Studio", "Studio")}>
          <div className="ss-side-top">
            <Link href="/" className="ss-brand" aria-label={t("Accueil E-COM STUDIO IA", "E-COM STUDIO IA home")}><Logo compact={compactNav} /></Link>
            {!plein && (
              <button type="button" onClick={toggleFold} className="ss-icon-btn" aria-label={folded ? t("Déplier le menu", "Expand menu") : t("Replier le menu", "Collapse menu")} aria-expanded={!folded} title={folded ? t("Déplier le menu ([)", "Expand menu ([)") : t("Replier le menu ([)", "Collapse menu ([)")}>
                {folded ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              </button>
            )}
          </div>
          {compactNav ? (
            <Link href="/studio" title={`${data?.brand?.name ?? data?.project.name ?? ""} · ${t("tous mes projets", "all my projects")}`} className="ss-cover">
              {data?.coverUrl ? <img src={data.coverUrl} alt="" /> : <Store className="size-4" />}
            </Link>
          ) : <div className="ss-switcher"><ProjectSwitcher current={projectId} /></div>}
          <div className="ss-nav-wrap" data-more-up={more.up ? "" : undefined} data-more-down={more.down ? "" : undefined}>
            <nav ref={navRef} className="ss-nav" aria-label={t("Espaces du projet", "Project spaces")}>{spacesList(compactNav)}</nav>
            {more.down && <ChevronDown className="ss-more" aria-hidden />}
          </div>
          <div className="ss-side-foot">
            {!compactNav && <div className="ss-prefs"><LangSwitch /><AppearanceToggle className="shrink-0" /></div>}
            <TutorialsMenuLink tab={tab} business={business} folded={compactNav} />
            <Link href="/studio/compte" className="ss-foot-link" title={compactNav ? t("Mon compte", "My account") : undefined} aria-label={compactNav ? t("Mon compte", "My account") : undefined}><Settings className="size-4 shrink-0" />{!compactNav && <span>{t("Mon compte", "My account")}</span>}</Link>
            {me?.user.role === "admin" && <Link href="/admin" className="ss-foot-link" title={compactNav ? t("Administration", "Admin") : undefined} aria-label={compactNav ? t("Administration", "Admin") : undefined}><Shield className="size-4 shrink-0" />{!compactNav && <span>{t("Administration", "Admin")}</span>}</Link>}
            <SynaShellSwitch to="classic" compact={compactNav} />
            <button type="button" onClick={async () => { await api("/api/auth/logout", { method: "POST" }); router.push("/"); }} className="ss-foot-link" title={compactNav ? t("Déconnexion", "Log out") : undefined} aria-label={compactNav ? t("Déconnexion", "Log out") : undefined}><LogOut className="size-4 shrink-0" />{!compactNav && <span>{t("Déconnexion", "Log out")}</span>}</button>
          </div>
        </aside>
      </SynaScope>

      {/* Espace de travail : les écrans actuels, tels quels */}
      <div className="min-w-0">
        <SynaScope prefs={scopePrefs} lang={lang} className="ss-head-scope" style={plein && synaColumnOpen ? { paddingRight: convoW + 32 } : undefined}>
          <header className="ss-head">
            <Link href="/studio" className="ss-head-logo lg:hidden" aria-label={t("Mes projets", "My projects")}><Logo compact /></Link>
            <div className="ss-head-t">
              <p className="sy-eyebrow ss-crumb">
                {data ? <span className="ss-crumb-p">{data.brand?.name ?? data.project.name}</span> : <span className="skeleton inline-block h-3 w-24 rounded" aria-hidden />}
                {group && <span className="ss-crumb-g">{t(...group.label)}</span>}
              </p>
              <div className="ss-title-row">
                <h1 className="ss-h1">{currentLabel}</h1>
                {status ? <span className="hidden sm:inline-flex"><Badge tone={status.tone} dot>{lang === "en" ? status.labelEn : status.label}</Badge></span> : <span className="skeleton hidden h-6 w-24 rounded-full sm:inline-flex" aria-hidden />}
                <span className="ss-title-mode hidden md:inline-flex"><ModeSwitch /></span>
              </div>
            </div>
            <div className="ss-tools">
              <QuickSearch projectId={projectId} business={business} />
              <TutorialButton tab={tab} business={business} />
              <ActiveJobs />
              <AiUsageBar billing={gauge} />
              <PlanLink billing={billing} />
              <Notifications />
              <div className="hidden shrink-0 sm:flex lg:hidden"><LangSwitch /></div>
              <MobileLangToggle />
              {openCustomize}
              <MobileMenu tab={tab} business={business} isAdmin={me?.user.role === "admin"} billing={gauge} extra={<SynaShellSwitch to="classic" />} />
            </div>
          </header>
        </SynaScope>
        <QuotaBanner billing={billing} />
        <main className="px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-8" id="studio-main" style={mainStyle}>
          <SpaceGuide projectId={projectId} tab={tab} />
          {children}
        </main>
      </div>

      {/* SINA : onglet signature, colonne (Encre) ou feuille (Plein cadre) — le même panneau, jamais recréé */}
      {agentUi && (
        <SynaScope prefs={scopePrefs} lang={lang} className={cx("ss-syna-scope", synaColumnOpen && "is-docked")} style={{ ["--sy-convo-w" as string]: `${convoW}px`, ["--ss-kb" as string]: `${kb}px` } as CSSProperties}>
          <div className="ss-syna-col">
            {!synaColumnOpen && !plein && (
              <div className="ss-rail hidden lg:block">
                <SynaTrigger variant="rail" expanded={open} controls="syna-panel" status={running.length ? "working" : "idle"} statusText={runningText} onActivate={() => setOpen(!open)} lang={lang} />
              </div>
            )}
            {open && !docked && <button type="button" className="ss-scrim ss-syna-scrim" aria-label={t("Fermer SINA", "Close SINA")} tabIndex={-1} onClick={close} />}
            {(mounted || open) && (
              <aside
                ref={panel}
                id="syna-panel"
                hidden={!open}
                className={cx("ss-panel", docked ? "is-docked" : "is-overlay")}
                role={docked ? "complementary" : "dialog"}
                aria-modal={docked ? undefined : true}
                aria-label={t("SINA — conversation du projet", "SINA — project conversation")}
              >
                {docked && (
                  <div className="ss-resize" role="separator" aria-orientation="vertical" tabIndex={0} aria-valuemin={SYNA_CONVO_WIDTH.min} aria-valuemax={SYNA_CONVO_WIDTH.max} aria-valuenow={convoW}
                    aria-label={t("Largeur de la conversation (flèches gauche / droite)", "Conversation width (left / right arrows)")} onPointerDown={startDrag} onKeyDown={keyResize} />
                )}
                <div className="ss-panel-h">
                  <span className="ss-panel-mark"><span className="sy-wordmark">Sina</span><span className="sy-small">{t("une mémoire pour tout le Studio", "one memory across the Studio")}</span></span>
                  <button type="button" className="ss-icon-btn" onClick={close} aria-label={t("Replier SINA", "Collapse SINA")} title={t("Replier (Échap)", "Collapse (Esc)")}><X className="size-4" /></button>
                </div>
                <div className="ss-panel-cmd" hidden={plein}>
                  <SynaCommandBar variant="inline" agentUi={agentUi} onOpenSyna={openSyna} value={cmdValue} onValue={setCmdValue} feedback={cmdFeedback} onFeedback={setCmdFeedback} />
                </div>
                <div className="ss-panel-b">{agent ? <SynaThread key={projectId} projectId={projectId} compact /> : <ConversationPanel key={projectId} projectId={projectId} compact />}</div>
              </aside>
            )}
          </div>
        </SynaScope>
      )}

      {/* Plein cadre : barre de commande dans une zone réservée (au-dessus du clavier au téléphone) */}
      <SynaScope prefs={scopePrefs} lang={lang} className="ss-cmd-scope" style={{ ["--ss-side" as string]: `${wide ? sideW : 0}px`, ["--ss-right" as string]: `${plein && synaColumnOpen ? convoW + 32 : 0}px`, ["--ss-kb" as string]: `${kb}px` } as CSSProperties}>
        {plein && (
          <div className="ss-cmd-zone" data-mobile-nav={wide ? undefined : ""}>
            {!wide && (
              <button type="button" className="ss-zone-btn" aria-expanded={sheet === "spaces"} aria-haspopup="dialog" aria-controls="ss-spaces" onClick={() => { setOpen(false); setSheet(sheet === "spaces" ? null : "spaces"); }} aria-label={t("Espaces", "Spaces")}>
                <LayoutGrid className="size-5" aria-hidden />
                {TABS.some((x) => x.id !== navSpace(tab) && badge(x.id) !== null) && <span className="ss-dot ss-zone-dot" aria-hidden />}
              </button>
            )}
            <SynaCommandBar variant="bar" agentUi={agentUi} onOpenSyna={openSyna} value={cmdValue} onValue={setCmdValue} feedback={cmdFeedback} onFeedback={setCmdFeedback} working={running.length > 0} workingText={runningText} expanded={agentUi ? open : undefined} />
            {!wide && (
              <button type="button" className="ss-zone-btn" aria-expanded={sheet === "suivi"} aria-haspopup="dialog" aria-controls="ss-suivi" onClick={() => { setOpen(false); setSheet(sheet === "suivi" ? null : "suivi"); }} aria-label={t("Suivi des tâches", "Task tracking")}>
                <ListChecks className="size-5" aria-hidden />
                {active.length > 0 && <span className="ss-count">{active.length}<span className="sy-sr">{t(" tâches", " tasks")}</span></span>}
              </button>
            )}
          </div>
        )}
      </SynaScope>

      {/* Téléphone et tablette (Encre) : Sina · espace actuel · Espaces · Suivi ; feuilles communes aux deux modes */}
      <SynaScope prefs={scopePrefs} lang={lang} className="ss-tab-scope lg:hidden">
        {!plein && (
          <nav className="ss-tabbar" data-mobile-nav aria-label={t("Navigation du Studio", "Studio navigation")}>
            {agentUi && (
              <SynaTrigger variant="tab" expanded={open} controls="syna-panel" current={open} status={running.length ? "working" : "idle"} onActivate={() => { setSheet(null); setOpen(!open); }} lang={lang} />
            )}
            <button type="button" className="ss-tab" aria-current={!open && !sheet ? "page" : undefined} onClick={() => { setSheet(null); setOpen(false); }}>
              {current ? (() => { const Icon = tabIcon(current, business); return <Icon className="size-5" aria-hidden />; })() : <LayoutGrid className="size-5" aria-hidden />}
              <span className="ss-tab-l">{currentLabel || t("Aperçu", "Preview")}</span>
            </button>
            <button type="button" className="ss-tab" aria-expanded={sheet === "spaces"} aria-haspopup="dialog" aria-controls="ss-spaces" onClick={() => { setOpen(false); setSheet(sheet === "spaces" ? null : "spaces"); }}>
              <LayoutGrid className="size-5" aria-hidden />
              <span className="ss-tab-l">{t("Espaces", "Spaces")}</span>
              {TABS.some((x) => x.id !== navSpace(tab) && badge(x.id) !== null) && <span className="ss-dot ss-tab-dot" aria-hidden />}
            </button>
            <button type="button" className="ss-tab" aria-expanded={sheet === "suivi"} aria-haspopup="dialog" aria-controls="ss-suivi" onClick={() => { setOpen(false); setSheet(sheet === "suivi" ? null : "suivi"); }}>
              <ListChecks className="size-5" aria-hidden />
              <span className="ss-tab-l">{t("Suivi", "Tasks")}</span>
              {active.length > 0 && <span className="ss-count">{active.length}<span className="sy-sr">{t(" tâches", " tasks")}</span></span>}
            </button>
          </nav>
        )}
        {sheet === "spaces" && (
          <Sheet id="ss-spaces" label={t("Tous les espaces du projet", "All project spaces")} onClose={() => setSheet(null)}>
            <nav className="ss-sheet-nav" aria-label={t("Espaces du projet", "Project spaces")}>{spacesList(false, () => setSheet(null))}</nav>
          </Sheet>
        )}
        {sheet === "suivi" && (
          <Sheet id="ss-suivi" label={t("Suivi des tâches", "Task tracking")} onClose={() => setSheet(null)}>
            {active.length === 0 ? <p className="sy-body ss-empty">{t("Aucune tâche en cours sur ce projet.", "No task running on this project.")}</p> : (
              <ul className="ss-jobs">
                {active.map((j) => (
                  <li key={j.id} className="ss-job">
                    <div className="ss-job-h"><b>{j.label || j.type}</b><span className="sy-num">{j.status === "paused" ? t("En pause · ", "Paused · ") : ""}{Math.round(j.progress * 100)}{lang === "en" ? "%" : " %"}</span></div>
                    {j.message && <p className="sy-small">{j.message}</p>}
                    <SynaProgress value={j.progress} label={j.label || j.type} lang={lang} />
                  </li>
                ))}
              </ul>
            )}
            {active.length > 0 && (
              <div className="ss-jobs-f">
                {active.every((j) => j.status === "paused")
                  ? <button type="button" disabled={busy} className="sy-btn" data-variant="primary" onClick={() => pauseResume("resume")}><Play className="size-4" /> {t("Reprendre", "Resume")}</button>
                  : <button type="button" disabled={busy} className="sy-btn" onClick={() => pauseResume("pause")}><Pause className="size-4" /> {t("Mettre en pause", "Pause")}</button>}
              </div>
            )}
            <p className="sy-small ss-later">{t("Le suivi complet (historique, preuves, annulation d'une tâche) arrivera avec le lot 2 : ici, seulement les tâches réellement en cours.", "Full tracking (history, proofs, cancelling a task) comes with lot 2: here, only tasks actually running.")}</p>
          </Sheet>
        )}
      </SynaScope>

      {/* Personnaliser l'interface */}
      <SynaScope prefs={scopePrefs} lang={lang} className="ss-custom-scope">
        {customize && (
          <>
            {!docked && <button type="button" className="ss-scrim" aria-label={t("Fermer", "Close")} tabIndex={-1} onClick={() => setCustomize(false)} />}
            <div ref={customBox}><SynaCustomize onClose={() => setCustomize(false)} docked={docked} /></div>
          </>
        )}
        <p className="sy-sr" role="status" aria-live="polite">{announce}</p>
      </SynaScope>
    </div>
  );
}
