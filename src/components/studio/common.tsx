"use client";
/** Éléments partagés entre les espaces du studio. */
import { useState } from "react";
import { Check, Search, Film, FileText, Sparkles } from "lucide-react";
import { Badge, Button, cx, formatBytes, Input, Modal, Progress, Spinner, useApi } from "../ui";
import { useProject, type JobView } from "./project-context";
import { currentLang, useLang, useT } from "../i18n";
import { useBilling } from "../billing-client";
import { pick, type Lang } from "@/lib/i18n";

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

const ROLE_LABELS: Record<string, [string, string]> = {
  original: ["Photo originale", "Original photo"],
  cutout: ["Détourage", "Cutout"],
  packshot: ["Packshot", "Packshot"],
  ambiance: ["Univers (photo libre)", "World (free photo)"],
  "post-photo": ["Image de publication", "Post image"],
  detail: ["Détail", "Detail"],
  scene: ["Scène", "Scene"],
  banner: ["Bannière", "Banner"],
  social: ["Visuel social", "Social visual"],
  ad: ["Publicité", "Ad"],
  logo: ["Logo", "Logo"],
  "logo-light": ["Logo clair", "Light logo"],
  "logo-mark": ["Symbole seul", "Symbol only"],
  "logo-webp": ["Logo WebP", "WebP logo"],
  "logo-light-webp": ["Logo clair WebP", "Light logo WebP"],
  "logo-mark-webp": ["Symbole WebP", "Symbol WebP"],
  "logo-mono": ["Logo noir", "Black logo"],
  "logo-white": ["Logo blanc", "White logo"],
  "brand-board": ["Planche d'identité", "Identity board"],
  "logo-svg": ["Logo SVG", "SVG logo"],
  favicon: ["Favicon", "Favicon"],
  video: ["Vidéo", "Video"],
  "video-poster": ["Affiche vidéo", "Video poster"],
  clip: ["Plan généré", "Generated shot"],
  subtitles: ["Sous-titres", "Subtitles"],
  "brand-guide": ["Charte", "Brand guide"],
  "theme-export": ["Export de thème", "Theme export"],
};

/** Libellé d'un rôle de média dans la langue demandée (undefined si rôle inconnu). */
export const roleLabel = (role: string | null | undefined, lang: Lang = currentLang()) => {
  const l = ROLE_LABELS[role ?? ""];
  return l ? pick(lang, l[0], l[1]) : undefined;
};

/** Libellés des rôles de médias, lus dans la langue courante de l'interface (`ROLE_LABEL[role]`). */
export const ROLE_LABEL: Record<string, string> = new Proxy({} as Record<string, string>, {
  get: (_, k) => (typeof k === "string" ? roleLabel(k) : undefined),
  has: (_, k) => typeof k === "string" && k in ROLE_LABELS,
  ownKeys: () => Object.keys(ROLE_LABELS),
  getOwnPropertyDescriptor: (_, k) => (typeof k === "string" && k in ROLE_LABELS ? { enumerable: true, configurable: true, value: roleLabel(k) } : undefined),
});

export const ASSET_STATUS: Record<string, { label: string; labelEn: string; tone: any }> = {
  ready: { label: "Prêt", labelEn: "Ready", tone: "neutral" },
  review: { label: "À valider", labelEn: "To review", tone: "warn" },
  approved: { label: "Validé", labelEn: "Approved", tone: "ok" },
  rejected: { label: "Écarté", labelEn: "Rejected", tone: "bad" },
};

export function AssetThumb({ a, className }: { a: AssetView; className?: string }) {
  const t = useT();
  if (a.kind === "video") {
    return (
      <div className={cx("relative overflow-hidden bg-ink", className)}>
        {a.thumbUrl ? <img src={a.thumbUrl} alt={a.name} className="size-full object-cover" loading="lazy" /> : <Film className="absolute inset-0 m-auto size-6 text-paper" />}
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">{a.meta?.format ?? t("vidéo", "video")}{a.duration ? ` · ${a.duration.toFixed(0)} s` : ""}</span>
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
export function MediaPicker({ open, onClose, onPick, multiple, kinds, title }: { open: boolean; onClose: () => void; onPick: (a: AssetView[]) => void; multiple?: boolean; kinds?: ("image" | "video" | "logo")[]; title?: string }) {
  const t = useT();
  const { lang } = useLang();
  const { id } = useProject();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<AssetView[]>([]);
  const { data, loading } = useApi<{ assets: AssetView[] }>(open ? `/api/projects/${id}/files?q=${encodeURIComponent(q)}` : null);
  const list = (data?.assets ?? []).filter((a) => !kinds || kinds.includes(a.kind as any)).filter((a) => a.status !== "rejected");
  const toggle = (a: AssetView) => (multiple ? setSel((s) => (s.some((x) => x.id === a.id) ? s.filter((x) => x.id !== a.id) : [...s, a])) : setSel([a]));
  return (
    <Modal open={open} onClose={onClose} title={title ?? t("Choisir dans la bibliothèque", "Choose from the library")} wide>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher (nom, type, recette…)", "Search (name, type, recipe…)")} className="pl-10" />
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
                <span className="block truncate px-1.5 py-1 text-[11px] text-muted">{roleLabel(a.role, lang) ?? a.name}</span>
                {on && <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-signal text-signal-ink"><Check className="size-3.5" /></span>}
              </button>
            );
          })}
          {!list.length && <p className="col-span-full py-10 text-center text-sm text-muted">{t("Aucun média correspondant.", "No matching media.")}</p>}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>{t("Annuler", "Cancel")}</Button>
        <Button disabled={!sel.length} onClick={() => (onPick(sel), setSel([]), onClose())}>{sel.length > 1 ? t(`Utiliser ${sel.length} médias`, `Use ${sel.length} media`) : t("Utiliser ce média", "Use this media")}</Button>
      </div>
    </Modal>
  );
}

export function JobProgress({ job, className }: { job: JobView | null | undefined; className?: string }) {
  const t = useT();
  if (!job) return null;
  return (
    <div className={cx("rounded-2xl border border-line bg-card p-4", className)} role="status">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium">{job.status === "paused" ? <span className="size-2 rounded-full bg-warn" aria-hidden /> : <Spinner className="text-signal" />} {job.label || job.type}</span>
        <span className="text-xs text-muted">{t(`${Math.round(job.progress * 100)} %`, `${Math.round(job.progress * 100)}%`)}</span>
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

/**
 * Bandeau d'information de l'espace : sans forfait (découverte gratuite), rappelle ce que les forfaits ajoutent ;
 * sans fournisseur d'IA sur l'installation, le signale. Jamais de crédits ni de « mode local ».
 */
export function EngineNotice({ what }: { what: string }) {
  const t = useT();
  const { data } = useProject();
  const { billing } = useBilling();
  if (!data) return null;
  // Forfait payant sur une installation sans IA : problème de configuration, pas une question de forfait.
  if (!data.ai.llm && billing?.plan)
    return (
      <div className="mb-6 rounded-2xl border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
        {t(<>L'IA n'est pas encore connectée sur cette installation : version simplifiée pour {what}.</>, <>AI isn't connected on this installation yet: simplified version for {what}.</>)}
      </div>
    );
  if (!billing || billing.plan) return null;
  // Sans forfait (ou sans IA) : on dit franchement que le rendu reste basique, et comment passer à la version complète.
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-info/30 bg-info-soft px-4 py-3.5 text-sm text-info sm:flex-row sm:items-center" data-engine-notice>
      <p className="min-w-0 flex-1">
        <strong>{t("Version de base, sans IA : le rendu final reste très basique.", "Basic version, without AI: the final result stays very basic.")}</strong>{" "}
        {t(
          <>Pour {what}, le studio utilise son moteur simple : textes génériques, peu de personnalisation, aucune photo ni vidéo générée par l'IA. Avec un forfait, l'IA analyse vraiment votre activité, rédige des textes sur mesure, crée de nouveaux visuels et des vidéos, et vous pouvez publier votre boutique.</>,
          <>For {what}, the studio uses its simple engine: generic copy, little personalisation, no AI-generated photos or videos. With a plan, AI truly analyses your business, writes tailored copy, creates new visuals and videos, and you can publish your store.</>,
        )}
      </p>
      <a href="/studio/compte#forfaits" className="plan-sparkle inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full bg-signal px-4 text-sm font-semibold text-signal-ink sm:self-auto">
        <Sparkles className="size-4" aria-hidden /> {t("Passer à la version complète", "Get the full version")}
      </a>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { lang } = useLang();
  const s = ASSET_STATUS[status] ?? ASSET_STATUS.ready;
  return <Badge tone={s.tone}>{lang === "en" ? s.labelEn : s.label}</Badge>;
}

export { formatBytes };
