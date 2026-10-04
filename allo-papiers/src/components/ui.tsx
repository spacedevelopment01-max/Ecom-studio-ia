import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

export function Alert({ tone = "info", title, children, className = "" }: { tone?: "info" | "ok" | "warn" | "danger"; title?: string; children?: ReactNode; className?: string }) {
  const styles = {
    info: "bg-[#eef3fb] border-[#c9d7ee] text-navy",
    ok: "bg-ok-soft border-[#bfdccb] text-ok",
    warn: "bg-warn-soft border-[#f3d3a6] text-warn",
    danger: "bg-danger-soft border-[#f2c4c0] text-danger",
  }[tone];
  const Icon = { info: Info, ok: CheckCircle2, warn: AlertTriangle, danger: XCircle }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`flex gap-3 rounded-2xl border p-4 ${styles} ${className}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0 text-[0.98rem] leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-1 text-ink/90" : "text-ink/90"}>{children}</div>}
      </div>
    </div>
  );
}

export function UrgencyBadge({ level }: { level: "vert" | "orange" | "rouge" | null | undefined }) {
  if (!level) return null;
  const m = {
    vert: { label: "Pas d'urgence", cls: "bg-ok-soft text-ok", dot: "bg-ok" },
    orange: { label: "À traiter", cls: "bg-warn-soft text-warn", dot: "bg-[#d97706]" },
    rouge: { label: "Urgent", cls: "bg-danger-soft text-danger", dot: "bg-danger" },
  }[level];
  return (
    <span className={`chip ${m.cls}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} aria-hidden />
      {m.label}
    </span>
  );
}

export const STATUS_LABELS = { a_traiter: "À traiter", en_attente: "En attente", traite: "Traité", envoye: "Envoyé" } as const;

export function StatusBadge({ status }: { status: keyof typeof STATUS_LABELS }) {
  const cls = { a_traiter: "bg-orange-soft text-orange-dark", en_attente: "bg-[#eef3fb] text-navy", traite: "bg-ok-soft text-ok", envoye: "bg-sand text-navy" }[status];
  return <span className={`chip ${cls}`}>{STATUS_LABELS[status]}</span>;
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-7 mt-6 md:mt-10">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="font-display text-[2rem] font-semibold md:text-[2.6rem]">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-muted">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-orange-soft text-orange">{icon}</div>}
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <div className="mt-2 max-w-md text-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-3 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-line border-t-orange" aria-hidden />
      {label}
    </span>
  );
}

export const PRO_NOTICE = "Allô Papiers vous aide à comprendre et à répondre, mais ne remplace pas un avocat ou un professionnel habilité.";

export function ProNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`flex gap-2 rounded-xl border border-line bg-white/70 px-4 py-3 text-[0.95rem] text-muted ${className}`}>
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden />
      <span>{PRO_NOTICE}</span>
    </p>
  );
}

export function euros(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}
