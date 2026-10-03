"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, BookOpen, CalendarDays, ChevronDown, Compass, FolderTree, Film, Image as ImageIcon, LayoutGrid, LogOut, Megaphone, Package, Palette, Pause, Play, Plug, Send, Settings, Store, Wallet, Shield, Loader2 } from "lucide-react";
import { api, Badge, cx, formatDate, Logo, Progress, ThemeToggle, useApi } from "../ui";
import { useProject } from "./project-context";

export const TABS = [
  { id: "pilote", label: "Pilote", icon: Compass, group: "Création" },
  { id: "produit", label: "Produit", icon: Package, group: "Création" },
  { id: "marque", label: "Marque", icon: Palette, group: "Création" },
  { id: "boutique", label: "Boutique", icon: Store, group: "Création" },
  { id: "images", label: "Images", icon: ImageIcon, group: "Création" },
  { id: "videos", label: "Vidéos", icon: Film, group: "Création" },
  { id: "prompts", label: "Prompts", icon: BookOpen, group: "Création" },
  { id: "publications", label: "Publications", icon: Send, group: "Diffusion" },
  { id: "calendrier", label: "Calendrier", icon: CalendarDays, group: "Diffusion" },
  { id: "publicites", label: "Publicités", icon: Megaphone, group: "Diffusion" },
  { id: "fichiers", label: "Fichiers", icon: FolderTree, group: "Ressources" },
  { id: "connexions", label: "Connexions", icon: Plug, group: "Ressources" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

const STATUS: Record<string, { label: string; tone: any }> = {
  queued: { label: "En file", tone: "neutral" },
  creating: { label: "Création en cours", tone: "info" },
  awaiting_validation: { label: "À valider", tone: "warn" },
  ready: { label: "Prêt", tone: "ok" },
  error: { label: "À reprendre", tone: "bad" },
  paused: { label: "En pause", tone: "warn" },
  draft: { label: "À démarrer", tone: "neutral" },
};

function ProjectSwitcher({ current }: { current: string }) {
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
            <LayoutGrid className="size-4" /> Toutes mes boutiques
          </Link>
        </div>
      )}
    </div>
  );
}

function ActiveJobs() {
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
      <button onClick={() => setOpen((v) => !v)} className="flex h-10 items-center gap-2 rounded-full border border-line bg-card px-3 text-sm" aria-expanded={open} aria-label={allPaused ? "Tâches en pause" : "Tâches en cours"}>
        {allPaused ? <Pause className="size-4 text-warn" /> : <Loader2 className="size-4 animate-spin text-signal" />}
        <span className="hidden sm:inline">{allPaused ? "En pause" : `${active.length} tâche${active.length > 1 ? "s" : ""}`}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-line bg-card p-3 shadow-soft">
          {active.map((j) => (
            <div key={j.id} className="border-b border-line py-2.5 last:border-0">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{j.label || j.type}</span>
                <span className="text-xs text-muted">{j.status === "paused" ? "En pause · " : ""}{Math.round(j.progress * 100)} %</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted">{j.message}</p>
              <Progress value={j.progress} className="mt-2" />
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted">{allPaused ? "Rien n'est perdu : la reprise repart de l'étape en cours." : "Les tâches continuent même si vous fermez la page."}</p>
            {allPaused ? (
              <button disabled={busy} onClick={() => act("resume")} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper"><Play className="size-3.5" /> Reprendre</button>
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
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}
      >
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-signal text-[10px] font-bold text-signal-ink">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-line bg-card p-2 shadow-soft">
          {(data?.items ?? []).length === 0 && <p className="p-3 text-sm text-muted">Aucune notification.</p>}
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

export function CreditPill() {
  const { data } = useProject();
  const c = data?.credits;
  if (!c) return null;
  if (c.empty)
    return (
      <Link href="/studio/compte" className="hidden h-10 items-center gap-2 rounded-full border border-line bg-card px-3 text-xs md:flex" title="Aucun crédit de création : le moteur intégré est utilisé">
        <Wallet className="size-4" /> Moteur intégré
      </Link>
    );
  const left = Math.max(0, 1 - c.usedPct);
  return (
    <Link href="/studio/compte" className={cx("hidden h-10 items-center gap-2 rounded-full border px-3 text-xs md:flex", c.paused ? "border-bad bg-bad-soft text-bad" : c.alert ? "border-warn bg-warn-soft text-warn" : "border-line bg-card")} title="Crédits de création">
      <Wallet className="size-4" />
      <span className="w-16"><Progress value={left} /></span>
      <span>{Math.round(left * 100)} %</span>
    </Link>
  );
}

export function StudioShell({ projectId, children }: { projectId: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const tab = (pathname.split("/")[3] ?? "pilote") as TabId;
  const { data } = useProject();
  const status = STATUS[data?.project.status ?? "draft"] ?? STATUS.draft;
  const { data: me } = useApi<{ user: { role: string; email: string } }>("/api/me");
  useEffect(() => {
    // Raccourcis clavier Alt+1…9 pour changer d'onglet.
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 9) router.push(`/studio/${projectId}/${TABS[n - 1].id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId, router]);
  const badge = (id: TabId) => {
    if (!data) return null;
    if (id === "produit") return data.product.questions.filter((q) => !q.answer).length || null;
    if (id === "publications") return data.posts.review || null;
    if (id === "pilote" && data.project.status === "awaiting_validation") return "!";
    return null;
  };
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_1fr]">
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-5 border-r border-line bg-paper px-4 py-5 lg:flex">
        <Link href="/" className="px-2" aria-label="Accueil E-COM STUDIO IA">
          <Logo />
        </Link>
        <ProjectSwitcher current={projectId} />
        <nav className="-mx-1 flex-1 overflow-y-auto px-1" aria-label="Espaces du projet">
          {["Création", "Diffusion", "Ressources"].map((g) => (
            <div key={g} className="mb-4">
              <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[.16em] text-muted">{g}</p>
              {TABS.filter((t) => t.group === g).map((t) => {
                const Icon = t.icon;
                const b = badge(t.id);
                return (
                  <Link key={t.id} href={`/studio/${projectId}/${t.id}`} aria-current={tab === t.id ? "page" : undefined} className={cx("mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition", tab === t.id ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2 hover:text-ink")}>
                    <Icon className="size-4" />
                    <span className="flex-1">{t.label}</span>
                    {b !== null && <span className={cx("grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold", tab === t.id ? "bg-paper text-ink" : "bg-signal text-signal-ink")}>{b}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="grid gap-1 border-t border-line pt-3 text-sm">
          <Link href="/studio/compte" className="flex items-center gap-3 rounded-xl px-3 py-2 text-ink-2 hover:bg-paper-2"><Settings className="size-4" /> Compte et crédits</Link>
          {me?.user.role === "admin" && <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2 text-ink-2 hover:bg-paper-2"><Shield className="size-4" /> Administration</Link>}
          <button onClick={async () => { await api("/api/auth/logout", { method: "POST" }); router.push("/"); }} className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-ink-2 hover:bg-paper-2"><LogOut className="size-4" /> Déconnexion</button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Link href="/studio" className="lg:hidden" aria-label="Mes boutiques"><Logo compact /></Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold leading-tight sm:text-xl">{TABS.find((t) => t.id === tab)?.label}</h1>
              <p className="truncate text-xs text-muted">{data?.brand?.name ?? data?.project.name}</p>
            </div>
            <Badge tone={status.tone} dot className="hidden sm:inline-flex">{status.label}</Badge>
            <ActiveJobs />
            <CreditPill />
            <Notifications />
            <ThemeToggle />
          </div>
          {/* Onglets (téléphone et tablette) */}
          <nav className="scrollbar-none flex gap-1.5 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="Espaces du projet">
            {TABS.map((t) => {
              const Icon = t.icon;
              const b = badge(t.id);
              return (
                <Link key={t.id} href={`/studio/${projectId}/${t.id}`} aria-current={tab === t.id ? "page" : undefined} className={cx("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]", tab === t.id ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2")}>
                  <Icon className="size-3.5" /> {t.label}
                  {b !== null && <span className="grid min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-bold text-signal-ink">{b}</span>}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
