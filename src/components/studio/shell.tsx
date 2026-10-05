"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, BookOpen, Briefcase, CalendarDays, ChevronDown, Compass, FolderTree, Film, Image as ImageIcon, LayoutGrid, LogOut, Megaphone, Newspaper, Package, Palette, Pause, Play, Plug, Send, Settings, Store, Shield, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
          <span className="block truncate text-sm font-semibold">{p?.brand?.name ?? p?.project.name ?? "…"}</span>
          <span className="block truncate text-xs text-muted">{p?.project.sectorLabel}</span>
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

export function StudioShell({ projectId, children }: { projectId: string; children: ReactNode }) {
  const t = useT();
  const { lang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const tab = (pathname.split("/")[3] ?? "pilote") as TabId;
  const { data } = useProject();
  const status = STATUS[data?.project.status ?? "draft"] ?? STATUS.draft;
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
      <aside className={cx("sticky top-0 hidden h-dvh flex-col gap-5 overflow-hidden border-r border-line bg-paper py-5 lg:flex", folded ? "px-2.5" : "px-4")}>
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
        <nav className="-mx-1 flex-1 overflow-y-auto overflow-x-hidden px-1" aria-label={t("Espaces du projet", "Project spaces")}>
          {GROUPS.map(([g, gEn]) => (
            <div key={g} className="mb-4">
              {folded ? <div className="mx-auto mb-2 h-px w-8 bg-line" aria-hidden /> : <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[.16em] text-muted">{t(g, gEn)}</p>}
              {TABS.filter((x) => x.group === g).map((x) => {
                const Icon = tabIcon(x, data?.business);
                const b = badge(x.id);
                const label = tabLabel(x, lang, data?.business);
                return (
                  <Link key={x.id} href={`/studio/${projectId}/${x.id}`} aria-current={tab === x.id ? "page" : undefined} aria-label={folded ? label : undefined} title={folded ? label : undefined} className={cx("relative mb-0.5 flex items-center gap-3 rounded-xl py-2 text-[14px] transition", folded ? "justify-center px-0" : "px-3", tab === x.id ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2 hover:text-ink")}>
                    <Icon className="size-4 shrink-0" />
                    {!folded && <span className="flex-1">{label}</span>}
                    {b !== null && (folded ? <span className="absolute right-2 top-1.5 size-2 rounded-full bg-signal" aria-hidden /> : <span className={cx("grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold", tab === x.id ? "bg-paper text-ink" : "bg-signal text-signal-ink")}>{b}</span>)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="grid gap-1 border-t border-line pt-3 text-sm">
          <TutorialsMenuLink tab={tab} business={data?.business} folded={folded} />
          <Link href="/studio/compte" title={folded ? t("Mon compte", "My account") : undefined} aria-label={folded ? t("Mon compte", "My account") : undefined} className={cx("flex items-center gap-3 rounded-xl py-2 text-ink-2 hover:bg-paper-2", folded ? "justify-center" : "px-3")}><Settings className="size-4 shrink-0" />{!folded && ` ${t("Mon compte", "My account")}`}</Link>
          {me?.user.role === "admin" && <Link href="/admin" title={folded ? t("Administration", "Admin") : undefined} aria-label={folded ? t("Administration", "Admin") : undefined} className={cx("flex items-center gap-3 rounded-xl py-2 text-ink-2 hover:bg-paper-2", folded ? "justify-center" : "px-3")}><Shield className="size-4 shrink-0" />{!folded && ` ${t("Administration", "Admin")}`}</Link>}
          <button onClick={async () => { await api("/api/auth/logout", { method: "POST" }); router.push("/"); }} title={folded ? t("Déconnexion", "Log out") : undefined} aria-label={folded ? t("Déconnexion", "Log out") : undefined} className={cx("flex items-center gap-3 rounded-xl py-2 text-left text-ink-2 hover:bg-paper-2", folded ? "justify-center" : "px-3")}><LogOut className="size-4 shrink-0" />{!folded && ` ${t("Déconnexion", "Log out")}`}</button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <Link href="/studio" className="shrink-0 lg:hidden" aria-label={t("Mes projets", "My projects")}><Logo compact /></Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold leading-tight sm:text-xl">{(() => { const cur = TABS.find((x) => x.id === tab); return cur ? tabLabel(cur, lang, data?.business) : null; })()}</h1>
              <p className="truncate text-xs text-muted">{data?.brand?.name ?? data?.project.name}</p>
            </div>
            <TutorialButton tab={tab} business={data?.business} />
            <span className="hidden sm:inline-flex"><Badge tone={status.tone} dot>{lang === "en" ? status.labelEn : status.label}</Badge></span>
            <ActiveJobs />
            <PlanLink billing={billing} />
            <Notifications />
            <div className="hidden shrink-0 sm:flex"><LangSwitch /></div>
            <MobileLangToggle />
            <ThemeToggle className="shrink-0" />
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
