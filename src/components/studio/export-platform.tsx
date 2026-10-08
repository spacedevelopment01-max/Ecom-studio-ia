"use client";
/**
 * Onglet Boutique › Exporter (CMS Engine V2) : parcours Créer → Personnaliser → Plateforme → Vérifier → Exporter →
 * Installer, capacités RÉELLES de la plateforme (registre), informations à compléter, exports déjà générés avec leur
 * verdict de contrôle. Le téléchargement passe par le contrôle qualité : un export refusé n'est jamais livré.
 */
import { useState, type ReactNode } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { Badge, cx, formatDate, useApi, useToast } from "../ui";
import { useT } from "../i18n";

type Status = "SUPPORTED" | "PARTIAL" | "EXPORT" | "KIT" | "UNVERIFIED" | "UNSUPPORTED";
type ExportStatus = {
  platform: string;
  label: string;
  delivery: "theme" | "kit";
  target: string;
  capabilities: { key: string; status: Status; verified: string | null; note: string }[];
  limits: string[];
  missing: string[];
  exports: { id: string; name: string; createdAt: number; themeVersion: number | null; verdict: string | null; scope: string | null; message: string | null; issues: string[] }[];
};

const STATUS_TONE: Record<Status, "ok" | "warn" | "info" | "neutral" | "bad"> = { SUPPORTED: "ok", PARTIAL: "warn", EXPORT: "info", KIT: "info", UNVERIFIED: "neutral", UNSUPPORTED: "bad" };
const VERDICT_TONE: Record<string, "ok" | "warn" | "bad" | "neutral"> = { FINAL: "ok", PROVISIONAL: "warn", RETRY: "warn", REJECTED: "bad" };

export function ExportSteps({ step }: { step: number }) {
  const t = useT();
  const steps = [t("Créer", "Create"), t("Personnaliser", "Customise"), t("Plateforme", "Platform"), t("Vérifier", "Check"), t("Exporter", "Export"), t("Installer", "Install")];
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]" aria-label={t("Étapes", "Steps")}>
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5", i < step ? "bg-ok-soft text-ok" : i === step ? "bg-ink text-paper" : "bg-paper-2 text-muted")} aria-current={i === step ? "step" : undefined}>
            {i < step && <Check className="size-3" aria-hidden />}
            {i + 1}. {s}
          </span>
          {i < steps.length - 1 && <span className="text-muted" aria-hidden>›</span>}
        </li>
      ))}
    </ol>
  );
}

export function useStatusLabels() {
  const t = useT();
  const status: Record<Status, string> = { SUPPORTED: t("Pris en charge", "Supported"), PARTIAL: t("Partiel", "Partial"), EXPORT: t("Fichier à importer", "File to import"), KIT: t("Kit", "Kit"), UNVERIFIED: t("Non vérifié", "Unverified"), UNSUPPORTED: t("Non disponible", "Unavailable") };
  const verdict: Record<string, string> = { FINAL: t("Contrôlé", "Checked"), PROVISIONAL: t("Provisoire", "Provisional"), RETRY: t("À corriger", "To fix"), REJECTED: t("Refusé", "Rejected") };
  const proof: Record<string, string> = { static: t("fichiers contrôlés", "files checked"), automated: t("tests automatisés", "automated tests"), browser_local: t("rendu local", "local rendering"), installed_local: t("installé en local", "installed locally"), real_platform: t("plateforme réelle", "real platform"), human: t("vérifié par une personne", "human-checked") };
  return { status, verdict, proof };
}

/** Télécharge l'export après contrôle ; affiche le verdict (ou le refus) au lieu d'ouvrir une page d'erreur. */
export function ExportDownload({ url, label, onDone, className, children }: { url: string; label: string; onDone?: (message: string | null) => void; className?: string; children?: ReactNode }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await fetch(url);
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            throw new Error(j.error ?? t("Export impossible.", "Export failed."));
          }
          const blob = await r.blob();
          const name = decodeURIComponent((r.headers.get("Content-Disposition") ?? "").match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? "export.zip");
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 5000);
          onDone?.(r.headers.get("X-ES-Verdict"));
        } catch (e) {
          toast("bad", (e as Error).message);
          onDone?.(null);
        } finally {
          setBusy(false);
        }
      }}
      aria-label={label}
      className={className ?? "mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper disabled:opacity-60"}
    >
      {busy ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden /> : <Download className="size-4 shrink-0" aria-hidden />} {children ?? (busy ? t("Génération et contrôle…", "Generating and checking…") : label)}
    </button>
  );
}

/** Capacités, limites, informations manquantes et exports précédents d'une plateforme. */
export function PlatformExportDetails({ projectId, platform, reloadKey }: { projectId: string; platform: string; reloadKey: number }) {
  const t = useT();
  const L = useStatusLabels();
  const { data } = useApi<ExportStatus>(`/api/projects/${projectId}/theme/export/status?platform=${platform}&k=${reloadKey}`);
  const [open, setOpen] = useState<"caps" | "missing" | null>(null);
  if (!data) return <p className="mt-3 text-xs text-muted">{t("Chargement des capacités…", "Loading capabilities…")}</p>;
  const last = data.exports[0];
  return (
    <div className="mt-3 grid gap-2 text-xs">
      {last && (
        <div className="rounded-xl border border-line bg-card p-3">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {t("Dernier export", "Latest export")} <Badge tone={VERDICT_TONE[last.verdict ?? ""] ?? "neutral"}>{L.verdict[last.verdict ?? ""] ?? t("Non contrôlé", "Not checked")}</Badge>
            {last.scope && <span className="text-muted">({L.proof[last.scope] ?? last.scope})</span>}
          </p>
          {last.message && <p className="mt-1 text-ink-2">{last.message}</p>}
        </div>
      )}
      <button onClick={() => setOpen(open === "caps" ? null : "caps")} aria-expanded={open === "caps"} className="text-left font-medium text-ink-2 underline underline-offset-4">{t(`Ce que permet l'export ${data.label}`, `What the ${data.label} export can do`)}</button>
      {open === "caps" && (
        <ul className="grid gap-1.5 rounded-xl bg-paper-2 p-3">
          <li className="text-muted">{data.target}</li>
          {data.capabilities.map((c) => (
            <li key={c.key} className="flex flex-wrap items-start gap-2">
              <Badge tone={STATUS_TONE[c.status]} className="shrink-0">{L.status[c.status]}</Badge>
              <span className="min-w-0 flex-1">{c.note}{c.verified && <span className="text-muted"> — {L.proof[c.verified] ?? c.verified}</span>}</span>
            </li>
          ))}
          {data.limits.map((l) => <li key={l} className="text-warn">⚠ {l}</li>)}
        </ul>
      )}
      {data.missing.length > 0 && (
        <>
          <button onClick={() => setOpen(open === "missing" ? null : "missing")} aria-expanded={open === "missing"} className="text-left font-medium text-ink-2 underline underline-offset-4">{t(`${data.missing.length} information(s) à compléter avant de vendre`, `${data.missing.length} item(s) to complete before selling`)}</button>
          {open === "missing" && <ul className="grid gap-1 rounded-xl bg-warn-soft/50 p-3">{data.missing.map((m) => <li key={m}>{m}</li>)}</ul>}
        </>
      )}
      {data.exports.length > 0 && (
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer font-medium">{t(`Exports précédents (${data.exports.length})`, `Previous exports (${data.exports.length})`)}</summary>
          <ul className="mt-2 grid gap-1.5">
            {data.exports.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2">
                <a href={`/api/files/${e.id}?download=1`} className="inline-flex min-w-0 items-center gap-1 underline underline-offset-2"><Download className="size-3 shrink-0" aria-hidden /><span className="truncate">{e.name}</span></a>
                <Badge tone={VERDICT_TONE[e.verdict ?? ""] ?? "neutral"}>{L.verdict[e.verdict ?? ""] ?? "—"}</Badge>
                <span className="text-muted">{formatDate(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
