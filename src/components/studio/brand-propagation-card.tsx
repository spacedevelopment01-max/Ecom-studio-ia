"use client";
import { useState } from "react";
import { Check, SkipForward } from "lucide-react";
import { api, Button, Card, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { SectionTitle } from "./common";
import { useT } from "../i18n";
import { useBudgetPct } from "../billing-client";

type Bi = { fr: string; en: string };

/** Changement d'identité : quelles créations utilisent l'ancienne, et mise à jour contrôlée (locale, gratuite). */
export function BrandPropagationCard() {
  const { id, reload: reloadProject } = useProject();
  const t = useT();
  const toast = useToast();
  type Item = { key: string; kind: string; label: string; changes: string[]; userEdited: boolean; updatable: boolean; reapproval?: boolean; paidMicro?: number };
  const { data, reload } = useApi<{ current: string; items: Item[] }>(`/api/projects/${id}/brand/impact`);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [includeEdited, setIncludeEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ updated: { key: string; detail: string }[]; skipped: { key: string; reason: string }[] } | null>(null);
  // Hook appelé avant le retour anticipé : l'ordre des hooks ne doit jamais changer d'un rendu à l'autre.
  const budget = useBudgetPct();
  const items = data?.items ?? [];
  if (!items.length && !result) return null;
  const CH: Record<string, Bi> = { identity: { fr: "direction complète", en: "complete direction" }, name: { fr: "nom", en: "name" }, palette: { fr: "couleurs", en: "colours" }, fonts: { fr: "typographies", en: "fonts" }, logo: { fr: "logo", en: "logo" } };
  // Payant (visuel fait par l'IA) : jamais coché d'office, le client choisit en voyant le prix.
  const isOn = (it: Item) => picked[it.key] ?? (it.updatable && !it.userEdited && !it.paidMicro);
  const paidTotal = items.filter((it) => it.paidMicro && isOn(it)).reduce((n, it) => n + (it.paidMicro ?? 0), 0);
  async function apply() {
    const keys = items.filter((it) => it.updatable && isOn(it)).map((it) => it.key);
    if (!keys.length) return;
    setBusy(true);
    try {
      const r = await api<{ updated: { key: string; detail: string }[]; skipped: { key: string; reason: string }[] }>(`/api/projects/${id}/brand/impact`, { body: { keys, includeEdited, approvedPaidMicro: paidTotal || null } });
      setResult(r);
      setPicked({});
      toast("ok", t(`${r.updated.length} création(s) mise(s) à jour (nouvelle version, l'ancienne reste disponible).`, `${r.updated.length} creation(s) updated (new version, the previous one stays available).`));
      reload();
      reloadProject();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-5 sm:p-7" data-testid="brand-propagation">
      <SectionTitle title={t("Votre identité a changé", "Your identity has changed")}>{t("Ces créations utilisent encore l'ancienne identité. Cochez celles à mettre à jour : une nouvelle version est créée et l'ancienne reste disponible. C'est gratuit, sauf pour les visuels faits par l'IA (prix affiché, jamais cochés d'office). Vos créations modifiées à la main ne sont pas touchées, sauf si vous le demandez.", "These creations still use the previous identity. Tick the ones to update: a new version is created and the previous one stays available. It's free, except for AI-made visuals (price shown, never ticked by default). Creations you edited by hand are left alone unless you ask.")}</SectionTitle>
      <ul className="grid gap-1.5">
        {items.map((it) => (
          <li key={it.key} className="flex items-start gap-3 rounded-xl border border-line px-3 py-2 text-sm">
            <input type="checkbox" className="mt-1" aria-label={it.label} disabled={!it.updatable} checked={it.updatable && isOn(it)} onChange={(e) => setPicked({ ...picked, [it.key]: e.target.checked })} />
            <span className="min-w-0 flex-1">
              <span className="font-medium break-words">{it.label}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {t("Change :", "Changes:")} {it.changes.map((c) => t(CH[c]?.fr ?? c, CH[c]?.en ?? c)).join(", ")}
                {it.userEdited && <> · {t("modifiée par vous", "edited by you")}</>}
                {it.reapproval && <> · {t("demandera une nouvelle approbation", "will need approving again")}</>}
                {!it.updatable && <> · {t("à reprendre dans l'éditeur", "to redo in the editor")}</>}
                {it.paidMicro ? <> · {t(`payant : ${budget.label(it.paidMicro)}`, `paid: ${budget.label(it.paidMicro)}`)}</> : null}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {items.some((it) => it.userEdited) && (
        <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={includeEdited} onChange={(e) => setIncludeEdited(e.target.checked)} /> <span>{t("Mettre aussi à jour mes créations modifiées à la main", "Also update the creations I edited by hand")}</span></label>
      )}
      {paidTotal > 0 && <p className="mt-3 text-sm" data-testid="brand-paid">{t(`Visuels faits par l'IA cochés : nouvelle version par l'IA, coût probable ${budget.label(paidTotal)} (une reprise éventuelle est annoncée ; les anciens visuels sont gardés).`, `AI-made visuals ticked: new version by AI, likely cost ${budget.label(paidTotal)} (any redo is announced; the old visuals are kept).`)}</p>}
      {items.length > 0 && <Button className="mt-4" onClick={apply} loading={busy} data-testid="brand-apply">{paidTotal > 0 ? t(`Mettre à jour la sélection · ${budget.short(paidTotal)}`, `Update the selection · ${budget.short(paidTotal)}`) : t("Mettre à jour la sélection", "Update the selection")}</Button>}
      {result && (
        <div className="mt-4 grid gap-1 text-sm" data-testid="brand-result">
          {result.updated.map((u) => <p key={u.key} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> <span className="break-words">{u.detail}</span></p>)}
          {result.skipped.map((s) => <p key={s.key} className="flex items-start gap-2 text-muted"><SkipForward className="mt-0.5 size-4 shrink-0" aria-hidden /> <span className="break-words">{s.reason}</span></p>)}
        </div>
      )}
    </Card>
  );
}
