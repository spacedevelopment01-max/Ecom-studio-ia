"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X, KeyRound, Search, Bell, BookOpen, Briefcase, CalendarDays, ChevronDown, Compass, FolderTree, Film, Image as ImageIcon, LayoutGrid, LogOut, Megaphone, MoreHorizontal, Newspaper, Package, Palette, Pause, Play, Plug, Send, Settings, Store, Shield, Loader2, PanelLeftClose, PanelLeftOpen , CalendarCheck, Boxes } from "lucide-react";
import { api, Badge, cx, formatDate, Logo, Progress, ThemeToggle, useApi } from "../ui";
import { LangSwitch, useLang, useT } from "../i18n";
import { useProject } from "./project-context";
import { missingActivity } from "./services-editor";
import { TutorialButton, TutorialsMenuLink } from "./tutorial";
import { AiUsageBar, PlanLink, QuotaBanner, useBilling } from "../billing-client";
import type { BillingView } from "@/lib/plans";
import { DeleteProjectButton } from "./delete-project";
import { advancedOpen, navSpace, space, spacePurpose, SPACE_GROUPS, type SpaceGroup, type SpaceId } from "@/lib/studio-nav";
import { projectProgress } from "@/lib/project-progress";
import { ConversationDock } from "./conversation-panel";
import { useAgentPanel, useAgentUi } from "./agent-ui-context";

export const TABS = [
  { id: "pilote", label: "Pilote", labelEn: "Pilot", icon: Compass },
  { id: "produit", label: "Produit", labelEn: "Product", icon: Package },
  { id: "strategie", label: "Stratégie", labelEn: "Strategy", icon: Palette },
  { id: "marque", label: "Marque", labelEn: "Brand", icon: Palette },
  { id: "boutique", label: "Boutique", labelEn: "Store", icon: Store },
  { id: "catalogue", label: "Catalogue", labelEn: "Catalog", icon: Boxes },
  { id: "biens", label: "Biens", labelEn: "Properties", icon: KeyRound },
  { id: "rendez-vous", label: "Rendez-vous", labelEn: "Bookings", icon: CalendarCheck },
  { id: "images", label: "Images", labelEn: "Images", icon: ImageIcon },
  { id: "videos", label: "Vidéos", labelEn: "Videos", icon: Film },
  { id: "publications", label: "Publications", labelEn: "Posts", icon: Send },
  { id: "calendrier", label: "Calendrier", labelEn: "Calendar", icon: CalendarDays },
  { id: "publicites", label: "Publicités", labelEn: "Ads", icon: Megaphone },
  { id: "blog", label: "Blog", labelEn: "Blog", icon: Newspaper },
  { id: "prompts", label: "Prompts", labelEn: "Prompts", icon: BookOpen },
  { id: "fichiers", label: "Fichiers", labelEn: "Files", icon: FolderTree },
  { id: "connexions", label: "Connexions", labelEn: "Connections", icon: Plug },
] as const satisfies readonly { id: SpaceId; label: string; labelEn: string; icon: unknown }[];
export type TabId = (typeof TABS)[number]["id"];
/** Espaces d'un groupe du plan du studio (votre projet, créer, diffuser, outils avancés). */
const tabsOf = (g: SpaceGroup, realEstate = false) => TABS.filter((x) => space(x.id)?.group === g && !space(x.id)?.within && (x.id !== "biens" || realEstate));
/** L'espace « Biens » n'apparaît que pour un site immobilier (thème Maison & Horizon) ; son adresse reste accessible. */
const isRealEstate = (direction?: string | null) => direction === "maison-horizon";
/** Libellé d'un onglet dans la langue de l'interface ; pour un site de services, « Produit » devient « Activité » et « Boutique » « Site ». */
export const tabLabel = (t: (typeof TABS)[number], lang: "fr" | "en", business?: "products" | "services") =>
  t.id === "produit" && business === "services" ? (lang === "en" ? "Business" : "Activité") : t.id === "boutique" && business === "services" ? (lang === "en" ? "Website" : "Site") : lang === "en" ? t.labelEn : t.label;
/** Icône d'un onglet (l'onglet Activité d'un projet de services a la sienne). */
const tabIcon = (t: (typeof TABS)[number], business?: "products" | "services") => (t.id === "produit" && business === "services" ? Briefcase : t.icon);

const STATUS: Record<string, { label: string; labelEn: string; tone: any }> = {
  queued: { label: "En file", labelEn: "Queued", tone: "neutral" },
  creating: { label: "Création en cours", labelEn: "Creating", tone: "info" },
  awaiting_validation: { label: "À valider", labelEn: "To review", tone: "warn" },
  ready: { label: "Prêt", labelEn: "Ready", tone: "ok" },
  error: { label: "À reprendre", labelEn: "Needs attention", tone: "bad" },
  paused: { label: "En pause", labelEn: "Paused", tone: "warn" },
  draft: { label: "À démarrer", labelEn: "Not started", tone: "neutral" },
};

function ProjectSwitcher({ current }: { current: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { data } = useApi<{ projects: { id: string; name: string; status: string; cover: string | null }[] }>(open ? "/api/projects" : null);
  const { data: p } = useProject();
  const router = useRouter();
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-2 text-left hover:border-ink" aria-expanded={open}>
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-paper-2">
          {p?.coverUrl ? <img src={p.coverUrl} alt="" className="size-full object-cover" /> : <Store className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          {p ? <span className="block truncate text-sm font-semibold">{p.brand?.name ?? p.project.name}</span> : <span className="skeleton block h-4 w-32 rounded" aria-hidden />}
          {p ? <span className="block truncate text-xs text-muted">{p.project.sectorLabel}</span> : <span className="skeleton mt-1 block h-3 w-20 rounded" aria-hidden />}
        </span>
        <ChevronDown className="size-4 text-muted" />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-line bg-card p-1.5 shadow-soft">
          {(data?.projects ?? []).map((x) => (
            <Link key={x.id} href={`/studio/${x.id}/pilote`} onClick={() => setOpen(false)} className={cx("flex items-center gap-3 rounded-xl p-2 text-sm hover:bg-paper-2", x.id === current && "bg-paper-2")}>
              <span className="size-8 shrink-0 overflow-hidden rounded-lg bg-paper-2">{x.cover && <img src={x.cover} alt="" className="size-full object-cover" />}</span>
              <span className="truncate">{x.name}</span>
            </Link>
          ))}
          <Link href="/studio" className="mt-1 flex items-center gap-2 rounded-xl p-2 text-sm font-medium text-signal hover:bg-paper-2">
            <LayoutGrid className="size-4" /> {t("Tous mes projets", "All my projects")}
          </Link>
          {p && <div className="mt-1 border-t border-line pt-1"><DeleteProjectButton projectId={current} name={p.brand?.name ?? p.project.name} onDeleted={() => { setOpen(false); router.push("/studio"); }} /></div>}
        </div>
      )}
    </div>
  );
}

function ActiveJobs() {
  const t = useT();
  const { id, data, reload } = useProject();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = data?.active ?? [];
  if (!active.length) return null;
  const allPaused = active.every((j) => j.status === "paused");
  const act = async (action: "pause" | "resume") => {
    setBusy(true);
    try {
      await api(`/api/projects/${id}/pause`, { body: { action } });
      reload();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex h-10 items-center gap-2 rounded-full border border-line bg-card px-3 text-sm" aria-expanded={open} aria-label={allPaused ? t("Tâches en pause", "Paused tasks") : t("Tâches en cours", "Tasks in progress")}>
        {allPaused ? <Pause className="size-4 text-warn" /> : <Loader2 className="size-4 animate-spin text-signal" />}
        <span className="hidden sm:inline">{allPaused ? t("En pause", "Paused") : t(`${active.length} tâche${active.length > 1 ? "s" : ""}`, `${active.length} task${active.length > 1 ? "s" : ""}`)}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-line bg-card p-3 shadow-soft">
          {active.map((j) => (
            <div key={j.id} className="border-b border-line py-2.5 last:border-0">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{j.label || j.type}</span>
                <span className="text-xs text-muted">{j.status === "paused" ? t("En pause · ", "Paused · ") : ""}{t(`${Math.round(j.progress * 100)} %`, `${Math.round(j.progress * 100)}%`)}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted">{j.message}</p>
              <Progress value={j.progress} className="mt-2" />
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted">{allPaused ? t("Rien n'est perdu : la reprise repart de l'étape en cours.", "Nothing is lost: resuming picks up from the current step.") : t("Les tâches continuent même si vous fermez la page.", "Tasks keep running even if you close the page.")}</p>
            {allPaused ? (
              <button disabled={busy} onClick={() => act("resume")} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper"><Play className="size-3.5" /> {t("Reprendre", "Resume")}</button>
            ) : (
              <button disabled={busy} onClick={() => act("pause")} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium"><Pause className="size-3.5" /> Pause</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { data, reload } = useApi<{ items: { id: string; title: string; body: string; level: string; read_at: number | null; created_at: number }[] }>("/api/notifications", { poll: 30000 });
  const unread = (data?.items ?? []).filter((n) => !n.read_at).length;
  return (
    <div className="relative">
      <button
        onClick={async () => {
          setOpen((v) => !v);
          if (unread) {
            await api("/api/notifications", { method: "POST" });
            reload();
          }
        }}
        className="relative grid size-10 place-items-center rounded-full border border-line bg-card"
        aria-label={`Notifications${unread ? t(` (${unread} non lues)`, ` (${unread} unread)`) : ""}`}
      >
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-signal text-[10px] font-bold text-signal-ink">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-line bg-card p-2 shadow-soft">
          {(data?.items ?? []).length === 0 && <p className="p-3 text-sm text-muted">{t("Aucune notification.", "No notifications.")}</p>}
          {(data?.items ?? []).map((n) => (
            <div key={n.id} className="rounded-xl p-3 hover:bg-paper-2">
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && <p className="mt-0.5 text-xs text-muted">{n.body}</p>}
              <p className="mt-1 text-[11px] text-muted">{formatDate(n.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sélecteur de langue compact pour l'en-tête sur téléphone (un seul bouton : bascule FR ↔ EN). */
function MobileLangToggle() {
  const { lang, setLang } = useLang();
  const next = lang === "en" ? "fr" : "en";
  return (
    <button type="button" onClick={() => setLang(next)} lang={next} className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-card text-xs font-semibold sm:hidden" aria-label={lang === "en" ? "Passer en français" : "Switch to English"} title={lang === "en" ? "Français" : "English"}>
      {next.toUpperCase()}
    </button>
  );
}

/** Menu de l'en-tête sur téléphone et tablette (le menu latéral n'y est pas affiché) : compte, tutoriels, déconnexion. */
function MobileMenu({ tab, business, isAdmin, billing }: { tab: string; business?: "products" | "services"; isAdmin: boolean; billing: BillingView | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      // Le lecteur de tutoriels s'ouvre dans un portail : un clic dedans ne ferme pas le menu (il le démonterait).
      if (box.current && !box.current.contains(e.target as Node) && !(e.target as HTMLElement).closest?.("[role=dialog]")) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const item = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink";
  return (
    <div ref={box} className="relative lg:hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="grid size-10 place-items-center rounded-full border border-line bg-card" aria-expanded={open} aria-haspopup="menu" aria-label={t("Menu : compte, tutoriels, déconnexion", "Menu: account, tutorials, sign out")}>
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 grid w-64 gap-0.5 rounded-2xl border border-line bg-card p-1.5 shadow-soft">
          {/* Téléphone : l'utilisation de l'IA du forfait, en tête du menu (l'en-tête n'a pas la place). */}
          {billing?.ai && <div onClick={() => setOpen(false)} className="mb-1 border-b border-line px-3 pb-3 pt-2"><AiUsageBar billing={billing} variant="full" /></div>}
          <Link role="menuitem" href="/studio" onClick={() => setOpen(false)} className={item}><LayoutGrid className="size-4 shrink-0" /> {t("Mes projets", "My projects")}</Link>
          <Link role="menuitem" href="/studio/compte" onClick={() => setOpen(false)} className={item}><Settings className="size-4 shrink-0" /> {t("Mon compte", "My account")}</Link>
          <TutorialsMenuLink tab={tab} business={business} />
          {isAdmin && <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className={item}><Shield className="size-4 shrink-0" /> {t("Administration", "Admin")}</Link>}
          <button role="menuitem" type="button" onClick={async () => { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); window.location.href = "/"; }} className={cx(item, "border-t border-line text-left")}><LogOut className="size-4 shrink-0" /> {t("Déconnexion", "Log out")}</button>
        </div>
      )}
    </div>
  );
}

/**
 * Recherche rapide (Ctrl+K ou ⌘K) : taper quelques lettres pour aller à un espace du projet, à un autre projet, au
 * compte ou aux tutoriels. Flèches pour choisir, Entrée pour ouvrir, Échap pour fermer.
 */
function QuickSearch({ projectId, business }: { projectId: string; business?: "products" | "services" }) {
  const t = useT();
  const { lang } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const { data } = useApi<{ projects: { id: string; name: string }[] }>(open ? "/api/projects" : null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) (setQ(""), setSel(0));
  }, [open]);
  // Échap ferme la recherche où que soit le curseur (pas seulement dans le champ).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const fold = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const items = [
    ...TABS.map((x) => ({ key: x.id, label: tabLabel(x, lang, business), group: t("Espaces du projet", "Project spaces"), href: `/studio/${projectId}/${x.id}`, Icon: tabIcon(x, business), hint: spacePurpose(x.id, lang, business) })),
    ...(data?.projects ?? []).filter((x) => x.id !== projectId).map((x) => ({ key: x.id, label: x.name, group: t("Autres projets", "Other projects"), href: `/studio/${x.id}/pilote`, Icon: Store, hint: null as string | null })),
    { key: "all", label: t("Tous mes projets", "All my projects"), group: t("Compte", "Account"), href: "/studio", Icon: LayoutGrid, hint: null },
    { key: "account", label: t("Mon compte et forfait", "My account and plan"), group: t("Compte", "Account"), href: "/studio/compte", Icon: Settings, hint: null },
  ].filter((x) => !q.trim() || fold(`${x.label} ${x.hint ?? ""}`).includes(fold(q.trim())));
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hidden h-10 items-center gap-2 rounded-full border border-line bg-card px-3 text-sm text-muted hover:border-ink hover:text-ink md:flex" aria-label={t("Recherche rapide (Ctrl+K)", "Quick search (Ctrl+K)")} data-quick-search>
        <Search className="size-4" /> <span className="hidden xl:inline">{t("Aller à…", "Go to…")}</span> <kbd className="hidden rounded border border-line px-1.5 text-[10px] xl:inline">Ctrl K</kbd>
      </button>
      {/* Rendue hors de l'en-tête : son flou d'arrière-plan (backdrop-filter) confinerait sinon le fond sombre à la barre du haut. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[90] grid place-items-start justify-center bg-black/40 px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label={t("Recherche rapide", "Quick search")} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Search className="size-4 text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => (setQ(e.target.value), setSel(0))}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  else if (e.key === "ArrowDown") (e.preventDefault(), setSel((v) => Math.min(items.length - 1, v + 1)));
                  else if (e.key === "ArrowUp") (e.preventDefault(), setSel((v) => Math.max(0, v - 1)));
                  else if (e.key === "Enter" && items[sel]) go(items[sel].href);
                }}
                placeholder={t("Que cherchez-vous ? logo, vidéo, publier…", "What are you looking for? logo, video, post…")}
                className="h-12 flex-1 bg-transparent text-sm outline-none"
                aria-label={t("Rechercher", "Search")}
              />
              <button type="button" onClick={() => setOpen(false)} className="flex h-8 items-center gap-1.5 rounded-full px-2 text-xs text-muted hover:bg-paper-2 hover:text-ink" aria-label={t("Fermer la recherche", "Close search")} data-quick-search-close>
                <X className="size-3.5" /> <span className="hidden sm:inline">{t("Fermer", "Close")}</span> <kbd className="hidden rounded border border-line px-1 text-[10px] sm:inline">Échap</kbd>
              </button>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-1.5" role="listbox">
              {items.length === 0 && <li className="p-3 text-sm text-muted">{t("Aucun résultat.", "No results.")}</li>}
              {items.map((x, i) => (
                <li key={`${x.group}-${x.key}`} role="option" aria-selected={i === sel}>
                  {(i === 0 || items[i - 1].group !== x.group) && <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[.14em] text-muted">{x.group}</p>}
                  <button type="button" onMouseEnter={() => setSel(i)} onClick={() => go(x.href)} className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm", i === sel ? "bg-paper-2 text-ink" : "text-ink-2")}>
                    <x.Icon className="size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate">{x.label}</span>
                      {x.hint && <span className="block truncate text-xs text-muted">{x.hint}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** Onglets toujours à portée du pouce (téléphone, tablette) : quatre espaces principaux + « Plus » (tous les espaces). */
const MOBILE_MAIN: TabId[] = ["pilote", "images", "videos", "publications"];

function MobileNav({ projectId, tab, business, badge }: { projectId: string; tab: TabId; business?: "products" | "services"; badge: (id: TabId) => string | number | null }) {
  const realEstate = isRealEstate(useProject().data?.theme?.direction);
  const t = useT();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const inMore = !MOBILE_MAIN.includes(navSpace(tab) as TabId);
  const cur = TABS.find((x) => x.id === tab);
  const moreBadge = TABS.some((x) => !MOBILE_MAIN.includes(x.id) && badge(x.id) !== null);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("Tous les espaces du projet", "All project spaces")}>
          <button type="button" className="absolute inset-0 bg-black/40" aria-label={t("Fermer", "Close")} onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-paper p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-soft">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden />
            {SPACE_GROUPS.map((g) => (
              <div key={g.id} className="mb-3">
                <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-[.16em] text-muted">{t(...g.label)}</p>
                <div className="grid grid-cols-3 gap-2">
                  {tabsOf(g.id, realEstate).map((x) => {
                    const Icon = tabIcon(x, business);
                    const b = badge(x.id);
                    return (
                      <Link key={x.id} href={`/studio/${projectId}/${x.id}`} aria-current={navSpace(tab) === x.id ? "page" : undefined} className={cx("relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-center text-[12px]", navSpace(tab) === x.id ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2")}>
                        <Icon className="size-5" />
                        <span className="leading-tight">{tabLabel(x, lang, business)}</span>
                        {b !== null && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-bold text-signal-ink">{b}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label={t("Espaces du projet", "Project spaces")} data-mobile-nav>
        {MOBILE_MAIN.map((id) => {
          const x = TABS.find((y) => y.id === id)!;
          const Icon = tabIcon(x, business);
          const b = badge(id);
          return (
            <Link key={id} href={`/studio/${projectId}/${id}`} aria-current={navSpace(tab) === id ? "page" : undefined} className={cx("relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px]", navSpace(tab) === id ? "font-semibold text-ink" : "text-muted")}>
              {navSpace(tab) === id && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-ink" aria-hidden />}
              <Icon className="size-5" />
              <span>{tabLabel(x, lang, business)}</span>
              {b !== null && <span className="absolute right-[22%] top-2 grid min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-bold text-signal-ink">{b}</span>}
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog" className={cx("relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px]", inMore ? "font-semibold text-ink" : "text-muted")}>
          {inMore && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-ink" aria-hidden />}
          <LayoutGrid className="size-5" />
          <span className="max-w-full truncate px-1">{inMore && cur ? tabLabel(cur, lang, business) : t("Plus", "More")}</span>
          {moreBadge && <span className="absolute right-[26%] top-2.5 size-2 rounded-full bg-signal" aria-hidden />}
        </button>
      </nav>
    </>
  );
}

/**
 * Repère en haut de chaque espace : à quoi il sert (une phrase) et, s'il reste à faire ailleurs, la prochaine étape
 * conseillée du projet en un clic — le client sait toujours où il est et quoi faire ensuite. Pas sur le Pilote, qui
 * montre déjà l'avancement complet. Masquable (mémorisé sur cet appareil).
 */
function SpaceGuide({ projectId, tab }: { projectId: string; tab: TabId }) {
  const t = useT();
  const agentUi = useAgentUi();
  const { lang } = useLang();
  const { data } = useProject();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem("ecs-space-guide") === "hidden");
    } catch {}
  }, []);
  if (!data || tab === "pilote" || hidden) return null;
  const purpose = spacePurpose(tab, lang, data.business);
  if (!purpose) return null;
  const { next } = projectProgress({ business: data.business, product: data.product, missingActivity: data.business === "services" ? missingActivity(data.services).length : 0, brand: data.brand, theme: data.theme, counts: data.counts, posts: data.posts });
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem("ecs-space-guide", "hidden");
    } catch {}
  };
  const content = (
    <div className="mx-auto mb-5 flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-paper-2/60 px-4 py-2.5 text-sm" data-space-guide>
      <p className="min-w-0 flex-1 basis-64 text-ink-2">{purpose}</p>
      {next && next.tab !== tab && (
        <Link href={`/studio/${projectId}/${next.tab}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-paper hover:opacity-90" data-space-next>
          {t("Prochaine étape :", "Next step:")} {lang === "en" ? next.action[1] : next.action[0]} <ArrowRight className="size-3.5" />
        </Link>
      )}
      {next && next.tab === tab && <span className="rounded-full bg-signal-soft px-3 py-1 text-[13px] font-medium text-signal">{t("C'est ici que ça se passe :", "This is the place:")} {lang === "en" ? next.action[1] : next.action[0]}</span>}
      <button type="button" onClick={hide} className="grid size-7 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-ink" aria-label={t("Masquer ce repère", "Hide this guide")} title={t("Masquer ce repère", "Hide this guide")}>
        <X className="size-3.5" />
      </button>
    </div>
  );
  return agentUi&&tab==='boutique'?<details className="mb-3 rounded-xl border border-line px-3 py-2 text-xs"><summary className="cursor-pointer font-semibold">{t('Repères et prochaine étape','Guidance and next step')}</summary>{content}</details>:content;
}

export function StudioShell({ projectId, children }: { projectId: string; children: ReactNode }) {
  const agentPanel = useAgentPanel();
  const t = useT();
  const { lang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const tab = (pathname.split("/")[3] ?? "pilote") as TabId;
  const { data } = useProject();
  // Pas de statut tant que le projet n'est pas chargé (sinon « À démarrer » s'affiche un instant à tort).
  const status = data ? (STATUS[data.project.status] ?? STATUS.draft) : null;
  const { data: me } = useApi<{ user: { role: string; email: string } }>("/api/me");
  // Forfait et quotas (lien « Mon compte », bandeau quand un quota est épuisé) : jamais de crédits.
  // Barre d'IA à jour peu après chaque action (coût réel compté dès la fin de l'appel).
  const { billing } = useBilling({ poll: 15000 });
  // Dans un projet, la jauge « Reste X % » est celle du budget IA DE CE PROJET (un abonnement = un projet).
  const gauge = billing && data && "aiBudget" in data ? { ...billing, ai: data.aiBudget?.usage ?? null, periodEnd: data.aiBudget?.renewsAt ?? billing.periodEnd } : billing;
  // Menu latéral replié ou déplié (ordinateur), mémorisé sur cet appareil.
  const [folded, setFolded] = useState(false);
  useEffect(() => {
    try {
      setFolded(localStorage.getItem("ecs-sidebar") === "folded");
    } catch {}
  }, []);
  // Groupe « Outils avancés » ouvert ou replié, mémorisé sur cet appareil (replié par défaut).
  const [showAdvanced, setShowAdvanced] = useState(false);
  useEffect(() => {
    try {
      setShowAdvanced(localStorage.getItem("ecs-nav-advanced") === "open");
    } catch {}
  }, []);
  const toggleAdvanced = () => {
    const next = !advancedOpen(tab, showAdvanced);
    setShowAdvanced(next);
    try {
      localStorage.setItem("ecs-nav-advanced", next ? "open" : "closed");
    } catch {}
  };
  const toggleFold = () =>
    setFolded((v) => {
      try {
        localStorage.setItem("ecs-sidebar", v ? "open" : "folded");
      } catch {}
      return !v;
    });
  useEffect(() => {
    // Raccourcis clavier Alt+1…9 pour changer d'onglet.
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "[" && !e.altKey && !e.ctrlKey && !e.metaKey && !(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)))) return toggleFoldRef.current();
      if (!e.altKey) return;
      const n = Number(e.key);
      const visible = TABS.filter((x) => !space(x.id)?.within && x.id !== "biens");
      if (n >= 1 && n <= Math.min(9, visible.length)) router.push(`/studio/${projectId}/${visible[n - 1].id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId, router]);
  const toggleFoldRef = useRef(toggleFold);
  toggleFoldRef.current = toggleFold;
  // Menu latéral : l'onglet actif reste visible, et un dégradé signale les onglets plus bas (petits écrans).
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
    return () => {
      nav.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [tab, folded, showAdvanced]);
  const badge = (id: TabId) => {
    if (!data) return null;
    if (id === "produit") return (data.business === "services" ? missingActivity(data.services).length : 0) + data.product.questions.filter((q) => !q.answer).length || null;
    if (id === "publications") return data.posts.review || null;
    if (id === "pilote" && data.project.status === "awaiting_validation") return "!";
    return null;
  };
  return (
    <div data-studio-workspace className={cx("min-h-dvh lg:grid lg:transition-[grid-template-columns] lg:duration-300", folded ? "lg:grid-cols-[76px_minmax(0,1fr)]" : "lg:grid-cols-[272px_minmax(0,1fr)]", agentPanel.open && "xl:pr-[416px]")}>
      {/* Barre latérale (ordinateur), repliable pour agrandir l'espace de travail */}
      <aside className={cx("sticky top-0 hidden h-dvh flex-col gap-5 overflow-hidden border-r border-line bg-paper py-5 lg:flex short:gap-3 short:py-3", folded ? "px-2.5" : "px-4")}>
        <div className={cx("flex items-center gap-2", folded ? "flex-col" : "justify-between px-2")}>
          <Link href="/" aria-label={t("Accueil E-COM STUDIO IA", "E-COM STUDIO IA home")}>
            <Logo compact={folded} />
          </Link>
          <button type="button" onClick={toggleFold} className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink" aria-label={folded ? t("Déplier le menu", "Expand menu") : t("Replier le menu", "Collapse menu")} aria-expanded={!folded} title={folded ? t("Déplier le menu ([)", "Expand menu ([)") : t("Replier le menu ([)", "Collapse menu ([)")}>
            {folded ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
        {folded ? (
          <Link href="/studio" title={`${data?.brand?.name ?? data?.project.name ?? ""} · ${t("tous mes projets", "all my projects")}`} className="mx-auto grid size-11 place-items-center overflow-hidden rounded-xl border border-line bg-paper-2 hover:border-ink">
            {data?.coverUrl ? <img src={data.coverUrl} alt="" className="size-full object-cover" /> : <Store className="size-4" />}
          </Link>
        ) : (
          <ProjectSwitcher current={projectId} />
        )}
        <div className="relative -mx-1 flex min-h-0 flex-1 flex-col">
        <nav ref={navRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1" aria-label={t("Espaces du projet", "Project spaces")}>
          {SPACE_GROUPS.map((g) => {
            // Outils avancés : repliés tant que le client ne les ouvre pas (ou qu'il n'est pas dans l'un d'eux).
            const shut = !folded && g.folded && !advancedOpen(tab, showAdvanced);
            const hidden = shut ? tabsOf(g.id, isRealEstate(data?.theme?.direction)).filter((x) => badge(x.id) !== null).length : 0;
            return (
            <div key={g.id} className="mb-4 short:mb-2" data-nav-group={g.id}>
              {folded ? <div className="mx-auto mb-2 h-px w-8 bg-line short:mb-1" aria-hidden /> : g.folded ? (
                <button type="button" onClick={toggleAdvanced} aria-expanded={!shut} className="mb-1.5 flex w-full items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium uppercase tracking-[.16em] text-muted hover:text-ink short:mb-0.5" data-nav-advanced>
                  <span className="flex-1 text-left">{t(...g.label)}</span>
                  {hidden > 0 && <span className="size-2 rounded-full bg-signal" aria-hidden />}
                  <ChevronDown className={cx("size-3.5 transition", !shut && "rotate-180")} />
                </button>
              ) : <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[.16em] text-muted short:mb-0.5">{t(...g.label)}</p>}
              {!shut && tabsOf(g.id, isRealEstate(data?.theme?.direction)).map((x) => {
                const Icon = tabIcon(x, data?.business);
                const b = badge(x.id);
                const label = tabLabel(x, lang, data?.business);
                return (
                  <Link key={x.id} href={`/studio/${projectId}/${x.id}`} aria-current={navSpace(tab) === x.id ? "page" : undefined} aria-label={folded ? label : undefined} title={folded ? label : (spacePurpose(x.id, lang, data?.business) ?? undefined)} className={cx("relative mb-0.5 flex items-center gap-3 rounded-xl py-2 text-[14px] transition short:py-1.5 shorter:py-1", folded ? "justify-center px-0" : "px-3", navSpace(tab) === x.id ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2 hover:text-ink")}>
                    <Icon className="size-4 shrink-0" />
                    {!folded && <span className="flex-1">{label}</span>}
                    {b !== null && (folded ? <span className="absolute right-2 top-1.5 size-2 rounded-full bg-signal" aria-hidden /> : <span className={cx("grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold", navSpace(tab) === x.id ? "bg-paper text-ink" : "bg-signal text-signal-ink")}>{b}</span>)}
                  </Link>
                );
              })}
            </div>
            );
          })}
        </nav>
          {more.up && <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-paper to-transparent" aria-hidden />}
          {more.down && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-10 items-end justify-center bg-gradient-to-t from-paper via-paper/80 to-transparent" aria-hidden>
              <ChevronDown className="mb-0.5 size-4 text-muted" />
            </div>
          )}
        </div>
        <div className="grid gap-1 border-t border-line pt-3 text-sm short:gap-0 short:pt-2">
          <TutorialsMenuLink tab={tab} business={data?.business} folded={folded} />
          <Link href="/studio/compte" title={folded ? t("Mon compte", "My account") : undefined} aria-label={folded ? t("Mon compte", "My account") : undefined} className={cx("flex items-center gap-3 rounded-xl py-2 text-ink-2 hover:bg-paper-2 short:py-1.5", folded ? "justify-center" : "px-3")}><Settings className="size-4 shrink-0" />{!folded && ` ${t("Mon compte", "My account")}`}</Link>
          {me?.user.role === "admin" && <Link href="/admin" title={folded ? t("Administration", "Admin") : undefined} aria-label={folded ? t("Administration", "Admin") : undefined} className={cx("flex items-center gap-3 rounded-xl py-2 text-ink-2 hover:bg-paper-2 short:py-1.5", folded ? "justify-center" : "px-3")}><Shield className="size-4 shrink-0" />{!folded && ` ${t("Administration", "Admin")}`}</Link>}
          <button onClick={async () => { await api("/api/auth/logout", { method: "POST" }); router.push("/"); }} title={folded ? t("Déconnexion", "Log out") : undefined} aria-label={folded ? t("Déconnexion", "Log out") : undefined} className={cx("flex items-center gap-3 rounded-xl py-2 text-left text-ink-2 hover:bg-paper-2 short:py-1.5", folded ? "justify-center" : "px-3")}><LogOut className="size-4 shrink-0" />{!folded && ` ${t("Déconnexion", "Log out")}`}</button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
          <div className="flex min-h-16 flex-wrap items-center gap-2 px-4 py-2 sm:gap-3 sm:px-6">
            <Link href="/studio" className="shrink-0 lg:hidden" aria-label={t("Mes projets", "My projects")}><Logo compact /></Link>
            <div className="min-w-[min(10rem,100%)] flex-1">
              <h1 className="truncate font-display text-lg font-semibold leading-tight sm:text-xl">{(() => { const cur = TABS.find((x) => x.id === tab); return cur ? tabLabel(cur, lang, data?.business) : null; })()}</h1>
              {data ? <p className="truncate text-xs text-muted">{data.brand?.name ?? data.project.name}</p> : <span className="skeleton mt-1 block h-3 w-28 rounded" aria-hidden />}
            </div>
            <QuickSearch projectId={projectId} business={data?.business} />
            <TutorialButton tab={tab} business={data?.business} />
            {status ? <span className="hidden sm:inline-flex"><Badge tone={status.tone} dot>{lang === "en" ? status.labelEn : status.label}</Badge></span> : <span className="skeleton hidden h-6 w-24 rounded-full sm:inline-flex" aria-hidden />}
            <ActiveJobs />
            <AiUsageBar billing={gauge} />
            <PlanLink billing={billing} />
            <Notifications />
            <div className="hidden shrink-0 sm:flex"><LangSwitch /></div>
            <MobileLangToggle />
            <ThemeToggle className="shrink-0" />
            <MobileMenu tab={tab} business={data?.business} isAdmin={me?.user.role === "admin"} billing={gauge} />
          </div>
        </header>
        <QuotaBanner billing={billing} />
        <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-6">
          <SpaceGuide projectId={projectId} tab={tab} />
          {children}
        </main>
      </div>
      <MobileNav projectId={projectId} tab={tab} business={data?.business} badge={badge} />
      <ConversationDock projectId={projectId} />
    </div>
  );
}
