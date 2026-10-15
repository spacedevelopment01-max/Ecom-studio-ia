"use client";
/**
 * Administration › Fournisseurs IA › Alibaba Cloud — Images & Vidéos : région, adresse d'API (facultative, domaine
 * Alibaba Cloud uniquement), espace de travail (facultatif), état de validation étape par étape. La clé se saisit
 * dans la carte du fournisseur (chiffrée, jamais renvoyée).
 */
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge, Button, Input, Select } from "./ui";
import { useT } from "./i18n";

export type AlibabaData = {
  region: string;
  regions: { id: string; label: string; base: string }[];
  base: string;
  endpoint: string;
  workspace: string;
  lastTest: { ok: boolean; at: number; message: string } | null;
  checks: { id: string; ok: boolean; label: string; fail: string }[];
  status: string;
  ready: boolean;
  models: { key: string; label: string; kind: string; confirmed: boolean; priced: boolean; usable: boolean; enabled: boolean; reasons: string[] }[];
  usedBy: string[];
};
type SetFn = (pairs: { key: string; value: string | null }[], msg?: string) => Promise<void>;

export function AlibabaSettings({ data, set }: { data: AlibabaData; set: SetFn }) {
  const t = useT();
  const [endpoint, setEndpoint] = useState(data.endpoint);
  const [workspace, setWorkspace] = useState(data.workspace);
  return (
    <div className="grid gap-3 border-t border-line pt-3" data-alibaba>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={data.ready ? "ok" : "warn"} dot>{data.status}</Badge>
      </div>
      <label className="grid gap-1 text-xs font-medium text-ink-2">{t("Région (la clé doit venir de cette région)", "Region (the key must come from this region)")}
        <Select value={data.region} onChange={(e) => set([{ key: "provider.alibaba.region", value: e.target.value }], t("Région enregistrée : testez à nouveau la connexion.", "Region saved: test the connection again."))} data-alibaba-region>
          {data.regions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </Select>
      </label>
      <form className="grid gap-1 text-xs font-medium text-ink-2" onSubmit={(e) => { e.preventDefault(); set([{ key: "provider.alibaba.endpoint", value: endpoint.trim() || null }], t("Adresse enregistrée.", "Address saved.")); }}>
        <label htmlFor="ali-endpoint">{t("Adresse d'API (facultatif, sinon celle de la région)", "API address (optional, otherwise the region's)")} <span className="font-mono text-muted">· {data.base}</span></label>
        <div className="flex gap-2"><Input id="ali-endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://dashscope-intl.aliyuncs.com/api/v1" /><Button type="submit" variant="secondary">{t("Enregistrer", "Save")}</Button></div>
      </form>
      <form className="grid gap-1 text-xs font-medium text-ink-2" onSubmit={(e) => { e.preventDefault(); set([{ key: "provider.alibaba.workspace", value: workspace.trim() || null }], t("Espace de travail enregistré.", "Workspace saved.")); }}>
        <label htmlFor="ali-ws">{t("Espace de travail (facultatif)", "Workspace (optional)")}</label>
        <div className="flex gap-2"><Input id="ali-ws" value={workspace} onChange={(e) => setWorkspace(e.target.value)} placeholder="ws-…" /><Button type="submit" variant="secondary">{t("Enregistrer", "Save")}</Button></div>
      </form>
      <ul className="grid gap-1 text-xs" data-alibaba-checks>
        {data.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-1.5">
            {c.ok ? <CheckCircle2 className="size-4 shrink-0 text-ok" /> : <XCircle className="size-4 shrink-0 text-bad" />}
            <span>{c.ok ? c.label : c.fail}</span>
          </li>
        ))}
      </ul>
      <details className="text-xs">
        <summary className="cursor-pointer font-medium">{t(`Modèles Qwen-Image et Wan (${data.models.filter((m) => m.usable).length} utilisable(s) sur ${data.models.length})`, `Qwen-Image and Wan models (${data.models.filter((m) => m.usable).length} usable out of ${data.models.length})`)}</summary>
        <ul className="mt-1 grid gap-1">
          {data.models.map((m) => (
            <li key={m.key} className="flex flex-wrap gap-1.5">
              <span className="font-medium">{m.label}</span>
              <Badge tone={m.usable ? "ok" : "neutral"}>{m.usable ? t("utilisable", "usable") : m.reasons[0] ?? t("verrouillé", "locked")}</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-muted">{t("Confirmez un modèle et saisissez son tarif dans l'onglet « Modèles Images & Vidéos », puis choisissez-le pour un usage (logos, images produit, vidéos…).", "Confirm a model and enter its price in the \"Image & video models\" tab, then pick it for a usage (logos, product images, videos…).")}</p>
      </details>
      {data.usedBy.length > 0 && <p className="text-xs text-muted">{t("Utilisé pour", "Used for")} : {data.usedBy.join(", ")}</p>}
    </div>
  );
}
