"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, BookOpen, Briefcase, CalendarDays, ChevronDown, Compass, FolderTree, Film, Image as ImageIcon, LayoutGrid, LogOut, Megaphone, MoreHorizontal, Newspaper, Package, Palette, Pause, Play, Plug, Send, Settings, Store, Shield, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { api, Badge, cx, formatDate, Logo, Progress, ThemeToggle, useApi } from "../ui";
import { LangSwitch, useLang, useT } from "../i18n";
import { useProject } from "./project-context";
import { missingActivity } from "./services-editor";
import { TutorialButton, TutorialsMenuLink } from "./tutorial";
import { PlanLink, QuotaBanner, useBilling } from "../billing-client";

export const TABS = [
  { id: "pilote", label: "Pilote", labelEn: "Pilot", icon: Compass, group: "Création", groupEn: "Create" },
  { id: "produit", label: "Produit", labelEn: "Product", icon: Package, group: "Création", groupEn: "Create" },
  { id: "marque", label: "Marque", labelEn: "Brand", icon: Palette, group: "Création", groupEn: "Create" },
  { id: "boutique", label: "Boutique", labelEn: "Store", icon: Store, group: "Création", groupEn: "Create" },
  { id: "images", label: "Images", labelEn: "Images", icon: ImageIcon, group: "Création", groupEn: "Create" },
  { id: "videos", label: "Vidéos", labelEn: "Videos", icon: Film, group: "Création", groupEn: "Create" },
  { id: "prompts", label: "Prompts", labelEn: "Prompts", icon: BookOpen, group: "Création", groupEn: "Create" },
  { id: "publications", label: "Publications", labelEn: "Posts", icon: Send, group: "Diffusion", groupEn: "Publish" },
  { id: "blog", label: "Blog", labelEn: "Blog", icon: Newspaper, group: "Diffusion", groupEn: "Publish" },
  { id: "calendrier", label: "Calendrier", labelEn: "Calendar", icon: CalendarDays, group: "Diffusion", groupEn: "Publish" },
  { id: "publicites", label: "Publicités", labelEn: "Ads", icon: Megaphone, group: "Diffusion", groupEn: "Publish" },
  { id: "fichiers", label: "Fichiers", labelEn: "Files", icon: FolderTree, group: "Ressources", groupEn: "Resources" },
  { id: "connexions", label: "Connexions", labelEn: "Connections", icon: Plug, group: "Ressources", groupEn: "Resources" },
] as const;
export type TabId = (typeof TABS)[number]["id"];
const GROUPS = [["Création", "Create"], ["Diffusion", "Publish"], ["Ressources", "Resources"]] as const;
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
function MobileMenu({ tab, business, isAdmin }: { tab: string; business?: "products" | "services"; isAdmin: boolean }) {
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

export function StudioShell({ projectId, children }: { projectId: string; children: ReactNode }) {
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
  const { billing } = useBilling({ poll: 60000 });
  // Menu latéral replié ou déplié (ordinateur), mémorisé sur cet appareil.
  const [folded, setFolded] = useState(false);
  useEffect(() => {
    try {
      setFolded(localStorage.getItem("ecs-sidebar") === "folded");
    } catch {}
  }, []);
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
      if (n >= 1 && n <= 9) router.push(`/studio/${projectId}/${TABS[n - 1].id}`);
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
  }, [tab, folded]);
  const badge = (id: TabId) => {
    if (!data) return null;
    if (id === "produit") return (data.business === "services" ? missingActivity(data.services).length : 0) + data.product.questions.filter((q) => !q.answer).length || null;
    if (id === "publications") return data.posts.review || null;
    if (id === "pilote" && data.project.status === "awaiting_validation") return "!";
    return null;
  };
  return (
    <div className={cx("min-h-dvh lg:grid lg:transition-[grid-template-columns] lg:duration-300", folded ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[272px_1fr]")}>
      {/* Barre latérale (ordinateur), repliable pour agrandir l'espace de travail */}
      <aside className={cx("sticky top-0 hidden h-dvh flex-col gap-5 overflow-hidden border-r border-line bg-paper py-5 lg:flex [@media(max-height:900px)]:gap-3 [@media(max-height:900px)]:py-3", folded ? "px-2.5" : "px-4")}>
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
          {GROUPS.map(([g, gEn]) => (
            <div key={g} className="mb-4 [@media(max-height:900px)]:mb-2">
              {folded ? <div className="mx-auto mb-2 h-px w-8 bg-line [@media(max-height:900px)]:mb-1" aria-hidden /> : <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[.16em] text-muted [@media(max-height:900px)]:mb-0.5">{t(g, gEn)}</p>}
              {TABS.filter((x) => x.group === g).map((x) => {
                const Icon = tabIcon(x, data?.business);
                const b = badge(x.id);
                const label = tabLabel(x, lang, data?.business);
                return (
                  <Link key={x.id} href={`/studio/${projectId}/${x.id}`} aria-current={tab === x.id ? "page" : undefined} aria-label={folded ? label : undefined} title={folded ? label : undefined} className={cx("relative mb-0.5 flex items-center gap-3 rounded-xl py-2 text-[14px] transition [@media(max-height:900px)]:py-1.5 [@media(max-height:800px)]:py-1", folded ? "justify-center px-0" : "px-3", tab === x.id ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2 hover:text-ink")}>
                    <Icon className="size-4 shrink-0" />
                    {!folded && <span className="flex-1">{label}</span>}
                    {b !== null && (folded ? <span className="absolute right-2 top-1.5 size-2 rounded-full bg-signal" aria-hidden /> : <span className={cx("grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold", tab === x.id ? "bg-paper text-ink" : "bg-signal text-signal-ink")}>{b}</span>)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
          {more.up && <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-paper to-transparent" aria-hidden />}
          {more.down && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-10 items-end justify-center bg-gradient-to-t from-paper via-paper/80 to-transparent" aria-hidden>
              <ChevronDown className="mb-0.5 size-4 text-muted" />
            </div>
          )}
        </div>
        <div className="grid gap-1 border-t border-line pt-3 text-sm [@media(max-height:900px)]:gap-0 [@media(max-height:900px)]:pt-2">
          <TutorialsMenuLink tab={tab} business={data?.business} folded={folded} />
          <Link href="/studio/compte" title={folded ? t("Mon compte", "My account") : undefined} aria-label={folded ? t("Mon compte", "My account") : undefined} className={cx("flex items-center gap-3 rounded-xl py-2 text-ink-2 hover:bg-paper-2 [@media(max-height:900px)]:py-1.5", folded ? "justify-center" : "px-3")}><Settings className="size-4 shrink-0" />{!folded && ` ${t("Mon compte", "My account")}`}</Link>
          {me?.user.role === "admin" && <Link href="/admin" title={folded ? t("Administration", "Admin") : undefined} aria-label={folded ? t("Administration", "Admin") : undefined} className={cx("flex items-center gap-3 rounded-xl py-2 text-ink-2 hover:bg-paper-2 [@media(max-height:900px)]:py-1.5", folded ? "justify-center" : "px-3")}><Shield className="size-4 shrink-0" />{!folded && ` ${t("Administration", "Admin")}`}</Link>}
          <button onClick={async () => { await api("/api/auth/logout", { method: "POST" }); router.push("/"); }} title={folded ? t("Déconnexion", "Log out") : undefined} aria-label={folded ? t("Déconnexion", "Log out") : undefined} className={cx("flex items-center gap-3 rounded-xl py-2 text-left text-ink-2 hover:bg-paper-2 [@media(max-height:900px)]:py-1.5", folded ? "justify-center" : "px-3")}><LogOut className="size-4 shrink-0" />{!folded && ` ${t("Déconnexion", "Log out")}`}</button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <Link href="/studio" className="shrink-0 lg:hidden" aria-label={t("Mes projets", "My projects")}><Logo compact /></Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold leading-tight sm:text-xl">{(() => { const cur = TABS.find((x) => x.id === tab); return cur ? tabLabel(cur, lang, data?.business) : null; })()}</h1>
              {data ? <p className="truncate text-xs text-muted">{data.brand?.name ?? data.project.name}</p> : <span className="skeleton mt-1 block h-3 w-28 rounded" aria-hidden />}
            </div>
            <TutorialButton tab={tab} business={data?.business} />
            {status ? <span className="hidden sm:inline-flex"><Badge tone={status.tone} dot>{lang === "en" ? status.labelEn : status.label}</Badge></span> : <span className="skeleton hidden h-6 w-24 rounded-full sm:inline-flex" aria-hidden />}
            <ActiveJobs />
            <PlanLink billing={billing} />
            <Notifications />
            <div className="hidden shrink-0 sm:flex"><LangSwitch /></div>
            <MobileLangToggle />
            <ThemeToggle className="shrink-0" />
            <MobileMenu tab={tab} business={data?.business} isAdmin={me?.user.role === "admin"} />
          </div>
          {/* Onglets (téléphone et tablette) */}
          <nav className="scrollbar-none flex gap-1.5 overflow-x-auto px-4 pb-3 lg:hidden" aria-label={t("Espaces du projet", "Project spaces")}>
            {TABS.map((x) => {
              const Icon = tabIcon(x, data?.business);
              const b = badge(x.id);
              return (
                <Link key={x.id} href={`/studio/${projectId}/${x.id}`} aria-current={tab === x.id ? "page" : undefined} className={cx("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]", tab === x.id ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2")}>
                  <Icon className="size-3.5" /> {tabLabel(x, lang, data?.business)}
                  {b !== null && <span className="grid min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-bold text-signal-ink">{b}</span>}
                </Link>
              );
            })}
          </nav>
        </header>
        <QuotaBanner billing={billing} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
