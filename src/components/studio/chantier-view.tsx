"use client";
/**
 * Mode chantier (#492) : page Pilote pendant que SINA construit le projet. Le client suit l'avancée en direct
 * (étapes 0 à 13, ce qu'il a dit à SINA) ; les changements se demandent à SINA dans la conversation.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { cx } from "../ui";
import { useT } from "../i18n";
import { stepLabel } from "./journey-labels";

export type ChantierData = {
  current: number; mode: "creation" | "refonte"; keep: string[];
  steps: { n: number; fr: string; en: string; status: "todo" | "doing" | "review" | "done" | "skipped"; ready?: boolean }[];
  fiche: { fr: string; en: string; value: string; later: boolean }[];
};

export function ChantierView({ data }: { data: ChantierData }) {
  const t = useT(), router = useRouter();
  // Avancée en direct : la page se relit seule pendant que SINA travaille.
  useEffect(() => { const h = setInterval(() => router.refresh(), 8000); return () => clearInterval(h); }, [router]);
  return (
    <div className="space-y-6" data-chantier>
      <section className="rounded-3xl border border-line bg-card p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("Ton projet avec SINA", "Your project with SINA")}</p>
        <h1 className="mt-1 text-2xl font-semibold">{t("Où en est la construction", "Construction progress")}</h1>
        <ol className="mt-5 grid gap-2 sm:grid-cols-2">
          {data.steps.map((s) => (
            <li key={s.n} className={cx("flex items-center gap-3 rounded-2xl border px-3 py-2.5", s.n === data.current ? "border-signal bg-signal-soft" : "border-line")} data-step={s.n} data-status={s.status}>
              <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", s.status === "done" ? "bg-ink text-paper" : s.n === data.current ? "bg-signal text-paper" : "bg-paper-2 text-muted")}>{s.status === "done" ? "✓" : s.n}</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{t(s.fr, s.en)}</span><span className="block text-xs text-muted">{stepLabel(s, data.current, t)}</span></span>
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-3xl border border-line bg-card p-5 sm:p-7">
        <h2 className="text-lg font-semibold">{t("Ce que tu as dit à SINA", "What you told SINA")}</h2>
        {data.mode === "refonte" && <p className="mt-1 text-sm text-muted">{t("Refonte : gardé tel quel", "Redesign: kept as is")} — {data.keep.join(", ")}</p>}
        {data.fiche.length
          ? <dl className="mt-4 divide-y divide-line">{data.fiche.map((f) => (
              <div key={f.fr} className="grid gap-1 py-2.5 sm:grid-cols-[180px_1fr]"><dt className="text-sm font-medium">{t(f.fr, f.en)}</dt><dd className={cx("whitespace-pre-wrap text-sm", f.later ? "text-muted" : "")}>{f.value}</dd></div>
            ))}</dl>
          : <p className="mt-2 text-sm text-muted">{t("Réponds aux questions de SINA dans la conversation : tes réponses s'affichent ici au fur et à mesure.", "Answer SINA's questions in the conversation: your answers show up here as you go.")}</p>}
      </section>
    </div>
  );
}
