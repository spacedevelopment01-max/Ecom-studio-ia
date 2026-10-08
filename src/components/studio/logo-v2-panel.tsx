"use client";
/**
 * Logo V2 : directions créatives (territoire, concept, pourquoi), proposition construite, note du contrôle, choix.
 * Seules les propositions qui ont passé le contrôle de qualité sont montrées ; les essais écartés restent au diagnostic.
 */
import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { api, Badge, Button, Card, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { SectionTitle } from "./common";
import { useT } from "../i18n";

type Proposal = {
  id: string;
  url?: string;
  territory: { name: string; concept: string; why: string; markType: string; composition: string; typography: string; distinctive: string; source: "ai" | "local" };
  font: string;
  score: number | null;
  verdict: string | null;
  reason: string;
  attempts: number;
  change: string | null;
};
type View = { run: { id: string; ai: string; stoppedByCostCap: boolean; territories: { name: string }[]; rejected: { name: string; reason: string }[] } | null; proposals: Proposal[]; discarded: Proposal[] };

const MARK: Record<string, [string, string]> = {
  wordmark: ["Logotype", "Wordmark"],
  lettermark: ["Lettre seule", "Lettermark"],
  monogram: ["Monogramme + nom", "Monogram + name"],
  symbol_wordmark: ["Symbole + nom", "Symbol + name"],
  abstract_mark: ["Marque abstraite + nom", "Abstract mark + name"],
  emblem: ["Emblème", "Emblem"],
};

export function LogoV2Panel({ onApplied }: { onApplied?: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const { data, reload } = useApi<View>(`/api/projects/${id}/brand/logo-v2`, { poll: 5000 });
  async function post(body: Record<string, unknown>, ok: string, key: string) {
    setBusy(key);
    try {
      await api(`/api/projects/${id}/brand/logo-v2`, { body });
      toast("ok", ok);
      reload();
      if (body.action === "choose") onApplied?.();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const proposals = data?.proposals ?? [];
  return (
    <Card className="p-5 sm:p-7">
      <SectionTitle
        title={t("Directions de logo (nouveau moteur)", "Logo directions (new engine)")}
        action={
          <Button size="sm" variant="secondary" icon={<Sparkles className="size-4" />} loading={busy === "gen"} onClick={() => post({ action: "generate" }, t("Directions créatives lancées : quelques minutes.", "Creative directions started: a few minutes."), "gen")}>
            {proposals.length ? t("Nouvelles directions", "New directions") : t("Créer les directions", "Create directions")}
          </Button>
        }
      >
        {t("Comme en agence : plusieurs territoires créatifs vraiment différents, décrits avant d'être dessinés, puis construits avec une vraie typographie (nom exact) et contrôlés en noir et blanc et en petite taille. Seules les propositions au niveau attendu sont montrées.", "Like an agency: several genuinely different creative territories, described before being drawn, then built with real typography (exact name) and checked in black and white and at small size. Only proposals at the expected level are shown.")}
      </SectionTitle>
      {data?.run?.stoppedByCostCap && <p className="mb-3 text-xs text-warn">{t("Série arrêtée au plafond de dépense fixé.", "Series stopped at the set spending cap.")}</p>}
      {data?.run && !proposals.length && <p className="mb-3 text-sm text-ink-2">{t("Aucune direction n'a atteint le niveau attendu dans cette série.", "No direction reached the expected level in this series.")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {proposals.map((p) => (
          <div key={p.id} className="rounded-xl border border-line p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <strong className="text-sm">{p.territory.name}</strong>
              <Badge>{t(...(MARK[p.territory.markType] ?? [p.territory.markType, p.territory.markType]))}</Badge>
              {p.score != null && <Badge tone="good">{t(`Validé ${p.score}/10`, `Approved ${p.score}/10`)}</Badge>}
            </div>
            {p.url && <img src={p.url} alt={p.territory.name} className="mb-3 w-full rounded-lg bg-[#F4F3EF] object-contain p-4" />}
            <p className="text-sm"><span className="font-medium">{t("Concept : ", "Concept: ")}</span>{p.territory.concept}</p>
            <p className="mt-1 text-sm text-ink-2"><span className="font-medium">{t("Pourquoi : ", "Why: ")}</span>{p.territory.why}</p>
            <p className="mt-1 text-xs text-muted">{t(`Typographie : ${p.font} · ${p.attempts} essai(s)`, `Typeface: ${p.font} · ${p.attempts} attempt(s)`)}{p.change ? ` · ${p.change}` : ""}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" icon={<Check className="size-4" />} loading={busy === p.id} onClick={() => post({ action: "choose", assetId: p.id }, t("Logo choisi : déclinaisons et charte en préparation.", "Logo chosen: variations and guidelines being prepared."), p.id)}>{t("Choisir ce logo", "Choose this logo")}</Button>
              <Button size="sm" variant="ghost" icon={<X className="size-4" />} onClick={() => post({ action: "reject", assetId: p.id }, t("Direction écartée : elle ne sera plus proposée.", "Direction dismissed: it won't be offered again."), `r${p.id}`)}>{t("Écarter", "Dismiss")}</Button>
            </div>
          </div>
        ))}
      </div>
      {!!data?.discarded.length && (
        <details className="mt-4 text-xs text-muted">
          <summary>{t(`${data.discarded.length} essai(s) écarté(s) par le contrôle (diagnostic)`, `${data.discarded.length} attempt(s) discarded by the check (diagnostics)`)}</summary>
          <ul className="mt-2 list-disc pl-5">
            {data.discarded.map((d) => <li key={d.id}>{d.territory.name} — {d.verdict}{d.score != null ? ` ${d.score}/10` : ""} : {d.reason}</li>)}
            {data.run?.rejected.map((r) => <li key={r.name}>{r.name} — {r.reason}</li>)}
          </ul>
        </details>
      )}
    </Card>
  );
}
