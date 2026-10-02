"use client";
/** Éléments partagés entre les espaces du studio. */
import { useState } from "react";
import { Check, Search, Film, FileText } from "lucide-react";
import { Badge, Button, cx, formatBytes, Input, Modal, Progress, Spinner, useApi } from "../ui";
import { useProject, type JobView } from "./project-context";

export type AssetView = {
  id: string;
  name: string;
  kind: string;
  role: string | null;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  folderId: string | null;
  origin: string;
  status: string;
  starred: boolean;
  version: number;
  versionOf: string | null;
  sourceAssetId: string | null;
  createdAt: number;
  url: string;
  thumbUrl: string | null;
  downloadUrl: string;
  meta: any;
  usages?: { target_type: string; target_id: string; label: string }[];
};

export const ROLE_LABEL: Record<string, string> = {
  original: "Photo originale",
  cutout: "Détourage",
  packshot: "Packshot",
  detail: "Détail",
  scene: "Scène",
  banner: "Bannière",
  social: "Visuel social",
  ad: "Publicité",
  logo: "Logo",
  "logo-light": "Logo clair",
  "logo-mark": "Monogramme",
  "logo-svg": "Logo SVG",
  favicon: "Favicon",
  video: "Vidéo",
  "video-poster": "Affiche vidéo",
  clip: "Plan généré",
  subtitles: "Sous-titres",
  "brand-guide": "Charte",
  "theme-export": "Export de thème",
};

export const ASSET_STATUS: Record<string, { label: string; tone: any }> = {
  ready: { label: "Prêt", tone: "neutral" },
  review: { label: "À valider", tone: "warn" },
  approved: { label: "Validé", tone: "ok" },
  rejected: { label: "Écarté", tone: "bad" },
};

export function AssetThumb({ a, className }: { a: AssetView; className?: string }) {
  if (a.kind === "video") {
    return (
      <div className={cx("relative overflow-hidden bg-ink", className)}>
        {a.thumbUrl ? <img src={a.thumbUrl} alt={a.name} className="size-full object-cover" loading="lazy" /> : <Film className="absolute inset-0 m-auto size-6 text-paper" />}
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">{a.meta?.format ?? "vidéo"}{a.duration ? ` · ${a.duration.toFixed(0)} s` : ""}</span>
      </div>
    );
  }
  if (a.thumbUrl || a.kind === "image" || a.kind === "logo") {
    return (
      <div className={cx("overflow-hidden bg-[conic-gradient(var(--paper-2)_25%,var(--card)_0_50%,var(--paper-2)_0_75%,var(--card)_0)] bg-[length:16px_16px]", className)}>
        <img src={a.thumbUrl ?? a.url} alt={a.name} className="size-full object-cover" loading="lazy" />
      </div>
    );
  }
  return (
    <div className={cx("grid place-items-center bg-paper-2 text-muted", className)}>
      <FileText className="size-6" />
      <span className="text-[10px] uppercase">{a.name.split(".").pop()}</span>
    </div>
  );
}

/** Sélecteur de médias de la bibliothèque, utilisable depuis tous les espaces. */
export function MediaPicker({ open, onClose, onPick, multiple, kinds, title = "Choisir dans la bibliothèque" }: { open: boolean; onClose: () => void; onPick: (a: AssetView[]) => void; multiple?: boolean; kinds?: ("image" | "video" | "logo")[]; title?: string }) {
  const { id } = useProject();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<AssetView[]>([]);
  const { data, loading } = useApi<{ assets: AssetView[] }>(open ? `/api/projects/${id}/files?q=${encodeURIComponent(q)}` : null);
  const list = (data?.assets ?? []).filter((a) => !kinds || kinds.includes(a.kind as any)).filter((a) => a.status !== "rejected");
  const toggle = (a: AssetView) => (multiple ? setSel((s) => (s.some((x) => x.id === a.id) ? s.filter((x) => x.id !== a.id) : [...s, a])) : setSel([a]));
  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, type, recette…)" className="pl-10" />
      </div>
      {loading && !data ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : (
        <div className="grid max-h-[55dvh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-5">
          {list.map((a) => {
            const on = sel.some((x) => x.id === a.id);
            return (
              <button key={a.id} onClick={() => toggle(a)} className={cx("relative overflow-hidden rounded-2xl border-2 text-left transition", on ? "border-signal" : "border-transparent hover:border-line")} aria-pressed={on}>
                <AssetThumb a={a} className="aspect-square w-full" />
                <span className="block truncate px-1.5 py-1 text-[11px] text-muted">{ROLE_LABEL[a.role ?? ""] ?? a.name}</span>
                {on && <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-signal text-signal-ink"><Check className="size-3.5" /></span>}
              </button>
            );
          })}
          {!list.length && <p className="col-span-full py-10 text-center text-sm text-muted">Aucun média correspondant.</p>}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button disabled={!sel.length} onClick={() => (onPick(sel), setSel([]), onClose())}>Utiliser {sel.length > 1 ? `${sel.length} médias` : "ce média"}</Button>
      </div>
    </Modal>
  );
}

export function JobProgress({ job, className }: { job: JobView | null | undefined; className?: string }) {
  if (!job) return null;
  return (
    <div className={cx("rounded-2xl border border-line bg-card p-4", className)} role="status">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium"><Spinner className="text-signal" /> {job.label || job.type}</span>
        <span className="text-xs text-muted">{Math.round(job.progress * 100)} %</span>
      </div>
      <p className="mt-1 text-xs text-muted">{job.message}</p>
      <Progress value={job.progress} className="mt-3" />
    </div>
  );
}

/** Tâches actives d'un type donné, pour afficher l'avancement dans un espace. */
export function useActive(prefix: string | string[]) {
  const { data } = useProject();
  const list = Array.isArray(prefix) ? prefix : [prefix];
  return (data?.active ?? []).filter((j) => list.some((p) => j.type.startsWith(p)));
}

export function SectionTitle({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {children && <p className="mt-1 max-w-2xl text-sm text-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function EngineNotice({ what }: { what: string }) {
  const { data } = useProject();
  if (!data || data.ai.llm) return null;
  return (
    <div className="mb-6 rounded-2xl border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
      <strong>Moteur local actif.</strong> Aucun fournisseur d'IA n'est configuré sur cette installation : {what} sont produits par le moteur local (détourage, compositions, motion design, textes de base sans invention). L'administration peut activer l'IA à tout moment.
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = ASSET_STATUS[status] ?? ASSET_STATUS.ready;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export { formatBytes };
