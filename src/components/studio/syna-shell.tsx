"use client";
/**
 * Coquille SYNA du Studio (mission #282, lot 1) — présentation « Encre ».
 *
 * Ce qui change : l'habillage (menu des espaces, en-tête, accès à SYNA, barre du téléphone).
 * Ce qui ne change pas : les écrans de chaque espace (rendus tels quels, hors du conteneur `.syna-ui`), leurs adresses,
 * la règle `spaceVisible`, les pastilles, la recherche rapide, les tutoriels, les tâches, les notifications, le budget,
 * le forfait, le compte, et la conversation SYNA elle-même (le même `ConversationPanel`, mêmes routes, même fil).
 *
 * L'ancienne pastille noire flottante n'est pas affichée ici : SYNA est une colonne repliable à droite, avec un onglet
 * signature quand elle est repliée, et l'onglet « Syna » de la barre basse au téléphone. Si les drapeaux
 * `STUDIO_CONVERSATION_*` sont fermés, aucun accès à SYNA n'apparaît (comme aujourd'hui).
 *
 * Plein cadre : la coquille lit ses réglages à un seul endroit (`useSynaShellPrefs`) et pose les attributs de mode sur
 * ses conteneurs ; la présentation Plein cadre, le sélecteur et la personnalisation enregistrée relèvent du lot 1 bis.
 */
import "@/components/syna/syna.css";
import "./syna-shell.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronDown, LayoutGrid, ListChecks, LogOut, PanelLeftClose, PanelLeftOpen, Pause, Play, Settings, Shield, Store, X, Undo2, Sparkles } from "lucide-react";
import { api, Badge, cx, Logo, ThemeToggle, useApi } from "../ui";
import { LangSwitch, useLang, useT } from "../i18n";
import { useProject } from "./project-context";
import { TutorialButton, TutorialsMenuLink } from "./tutorial";
import { AiUsageBar, PlanLink, QuotaBanner, useBilling } from "../billing-client";
import { ConversationPanel } from "./conversation-panel";
import { useAgentPanel, useAgentUi } from "./agent-ui-context";
import { ActiveJobs, MobileLangToggle, MobileMenu, Notifications, ProjectSwitcher, QuickSearch, SpaceGuide, STATUS, TABS, navCtx, spaceBadge, tabIcon, tabLabel, tabsOf, type TabId } from "./shell";
import { advancedOpen, navSpace, space, spacePurpose, SPACE_GROUPS } from "@/lib/studio-nav";
import { SynaProgress, SynaScope, SynaTrigger } from "@/components/syna";
import { resolveSynaPrefs, type ResolvedSynaPrefs } from "@/lib/syna-ui/preferences";
import { synaShellCookie, type StudioShellVariant } from "@/lib/syna-ui/studio-shell";

/** Réglages de présentation de la coquille. Lot 1 : valeurs par défaut (Encre, comme l'appareil). Lot 1 bis : compte puis projet. */
export function useSynaShellPrefs(): ResolvedSynaPrefs {
  return resolveSynaPrefs();
}

/** Passer d'une interface à l'autre sur cet appareil (retour arrière immédiat pendant la transition). */
export function SynaShellSwitch({ to }: { to: StudioShellVariant }) {
  const t = useT();
  const router = useRouter();
  const label = to === "classic" ? t("Interface actuelle", "Current interface") : t("Nouvelle interface", "New interface");
  return (
    <button
      type="button"
      data-syna-shell-switch={to}
      onClick={() => { document.cookie = synaShellCookie(to); router.refresh(); }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-ink-2 hover:bg-paper-2 hover:text-ink"
      title={to === "classic" ? t("Revenir à l'interface actuelle du Studio (sur cet appareil)", "Go back to the current Studio interface (on this device)") : t("Essayer la nouvelle interface SYNA (sur cet appareil)", "Try the new SYNA interface (on this device)")}
    >
      {to === "classic" ? <Undo2 className="size-4 shrink-0" /> : <Sparkles className="size-4 shrink-0" />}
      <span className="truncate">{label}</span>
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

export function SynaStudioShell({ projectId, children }: { projectId: string; children: ReactNode }) {
  const t = useT();
  const { lang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const tab = (pathname.split("/")[3] ?? "pilote") as TabId;
  const { id, data, reload } = useProject();
  const prefs = useSynaShellPrefs();
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

  // ——— Menu des espaces (ordinateur) : replié ou déplié, outils avancés, mêmes clés d'appareil que l'interface actuelle.
  const [folded, setFolded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  useEffect(() => {
    try {
      setFolded(localStorage.getItem("ecs-sidebar") === "folded");
      setShowAdvanced(localStorage.getItem("ecs-nav-advanced") === "open");
    } catch {}
  }, []);
  const toggleFold = () => setFolded((v) => { try { localStorage.setItem("ecs-sidebar", v ? "open" : "folded"); } catch {} return !v; });
  const toggleAdvanced = () => {
    const next = !advancedOpen(tab, showAdvanced);
    setShowAdvanced(next);
    try { localStorage.setItem("ecs-nav-advanced", next ? "open" : "closed"); } catch {}
  };
  const toggleFoldRef = useRef(toggleFold);
  toggleFoldRef.current = toggleFold;
  useEffect(() => {
    // Mêmes raccourcis que l'interface actuelle : « [ » replie le menu, Alt+1…9 change d'espace.
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "[" && !e.altKey && !e.ctrlKey && !e.metaKey && !(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)))) return toggleFoldRef.current();
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
  }, [tab, folded, showAdvanced, data]);

  // ——— SYNA : colonne à droite (≥ 1280 px, à côté de l'espace de travail) ou panneau par-dessus (plus petit).
  const docked = useMedia("(min-width: 1280px)");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setOpen(false); setMounted(false); }, [projectId, setOpen]);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  const panel = useRef<HTMLElement>(null);
  const close = () => setOpen(false);
  useDialogFocus(agentUi && open, panel, close, !docked, () => (docked ? panel.current?.querySelector<HTMLElement>("textarea:not(:disabled)") : null),
    () => [...document.querySelectorAll<HTMLElement>('[aria-controls="syna-panel"]')].find((b) => b.getClientRects().length) ?? null);

  // ——— Téléphone : feuilles « Espaces » et « Suivi », fermées à chaque changement de page.
  const [sheet, setSheet] = useState<null | "spaces" | "suivi">(null);
  useEffect(() => setSheet(null), [pathname]);
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

  const synaColumnOpen = agentUi && open && docked;
  return (
    <div
      data-studio-workspace
      data-syna-shell="encre"
      className={cx("ss-root min-h-dvh lg:grid", folded ? "lg:grid-cols-[72px_minmax(0,1fr)_auto]" : "lg:grid-cols-[252px_minmax(0,1fr)_auto]")}
    >
      {/* Menu des espaces (ordinateur) */}
      <SynaScope prefs={prefs} lang={lang} className="ss-side-scope hidden lg:block">
        <aside className="ss-side" data-folded={folded ? "" : undefined} aria-label={t("Studio", "Studio")}>
          <div className="ss-side-top">
            <Link href="/" className="ss-brand" aria-label={t("Accueil E-COM STUDIO IA", "E-COM STUDIO IA home")}><Logo compact={folded} /></Link>
            <button type="button" onClick={toggleFold} className="ss-icon-btn" aria-label={folded ? t("Déplier le menu", "Expand menu") : t("Replier le menu", "Collapse menu")} aria-expanded={!folded} title={folded ? t("Déplier le menu ([)", "Expand menu ([)") : t("Replier le menu ([)", "Collapse menu ([)")}>
              {folded ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          </div>
          {folded ? (
            <Link href="/studio" title={`${data?.brand?.name ?? data?.project.name ?? ""} · ${t("tous mes projets", "all my projects")}`} className="ss-cover">
              {data?.coverUrl ? <img src={data.coverUrl} alt="" /> : <Store className="size-4" />}
            </Link>
          ) : <div className="ss-switcher"><ProjectSwitcher current={projectId} /></div>}
          <div className="ss-nav-wrap" data-more-up={more.up ? "" : undefined} data-more-down={more.down ? "" : undefined}>
            <nav ref={navRef} className="ss-nav" aria-label={t("Espaces du projet", "Project spaces")}>{spacesList(folded)}</nav>
            {more.down && <ChevronDown className="ss-more" aria-hidden />}
          </div>
          <div className="ss-side-foot">
            {!folded && <div className="ss-prefs"><LangSwitch /><ThemeToggle className="shrink-0" /></div>}
            <TutorialsMenuLink tab={tab} business={business} folded={folded} />
            <Link href="/studio/compte" className="ss-foot-link" title={folded ? t("Mon compte", "My account") : undefined} aria-label={folded ? t("Mon compte", "My account") : undefined}><Settings className="size-4 shrink-0" />{!folded && <span>{t("Mon compte", "My account")}</span>}</Link>
            {me?.user.role === "admin" && <Link href="/admin" className="ss-foot-link" title={folded ? t("Administration", "Admin") : undefined} aria-label={folded ? t("Administration", "Admin") : undefined}><Shield className="size-4 shrink-0" />{!folded && <span>{t("Administration", "Admin")}</span>}</Link>}
            {!folded && <SynaShellSwitch to="classic" />}
            <button type="button" onClick={async () => { await api("/api/auth/logout", { method: "POST" }); router.push("/"); }} className="ss-foot-link" title={folded ? t("Déconnexion", "Log out") : undefined} aria-label={folded ? t("Déconnexion", "Log out") : undefined}><LogOut className="size-4 shrink-0" />{!folded && <span>{t("Déconnexion", "Log out")}</span>}</button>
          </div>
        </aside>
      </SynaScope>

      {/* Espace de travail : les écrans actuels, tels quels */}
      <div className="min-w-0">
        <SynaScope prefs={prefs} lang={lang} className="ss-head-scope">
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
              <ThemeToggle className="shrink-0 lg:hidden" />
              <MobileMenu tab={tab} business={business} isAdmin={me?.user.role === "admin"} billing={gauge} extra={<SynaShellSwitch to="classic" />} />
            </div>
          </header>
        </SynaScope>
        <QuotaBanner billing={billing} />
        <main className="px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-8" id="studio-main">
          <SpaceGuide projectId={projectId} tab={tab} />
          {children}
        </main>
      </div>

      {/* SYNA : onglet signature et colonne repliable (seulement si l'installation l'ouvre) */}
      {agentUi && (
        <SynaScope prefs={prefs} lang={lang} className={cx("ss-syna-scope", synaColumnOpen && "is-docked")}>
          <div className="ss-syna-col">
            {!synaColumnOpen && (
              <div className="ss-rail hidden lg:block">
                <SynaTrigger
                  variant="rail"
                  expanded={open}
                  controls="syna-panel"
                  status={running.length ? "working" : "idle"}
                  statusText={running.length ? t(`${running.length} tâche${running.length > 1 ? "s" : ""} en cours`, `${running.length} task${running.length > 1 ? "s" : ""} running`) : undefined}
                  onActivate={() => setOpen(!open)}
                  lang={lang}
                />
              </div>
            )}
            {open && !docked && <button type="button" className="ss-scrim ss-syna-scrim" aria-label={t("Fermer SYNA", "Close SYNA")} tabIndex={-1} onClick={close} />}
            {(mounted || open) && (
              <aside
                ref={panel}
                id="syna-panel"
                hidden={!open}
                className={cx("ss-panel", docked ? "is-docked" : "is-overlay")}
                role={docked ? "complementary" : "dialog"}
                aria-modal={docked ? undefined : true}
                aria-label={t("SYNA — conversation du projet", "SYNA — project conversation")}
              >
                <div className="ss-panel-h">
                  <span className="ss-panel-mark"><span className="sy-wordmark">Syna</span><span className="sy-small">{t("une mémoire pour tout le Studio", "one memory across the Studio")}</span></span>
                  <button type="button" className="ss-icon-btn" onClick={close} aria-label={t("Replier SYNA", "Collapse SYNA")} title={t("Replier (Échap)", "Collapse (Esc)")}><X className="size-4" /></button>
                </div>
                <div className="ss-panel-b"><ConversationPanel key={projectId} projectId={projectId} compact /></div>
              </aside>
            )}
          </div>
        </SynaScope>
      )}

      {/* Téléphone et tablette : Syna · espace actuel · Espaces · Suivi */}
      <SynaScope prefs={prefs} lang={lang} className="ss-tab-scope lg:hidden">
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
                    <div className="ss-job-h"><b>{j.label || j.type}</b><span className="sy-num">{j.status === "paused" ? t("En pause · ", "Paused · ") : ""}{Math.round(j.progress * 100)}{lang === "en" ? "%" : " %"}</span></div>
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
    </div>
  );
}
