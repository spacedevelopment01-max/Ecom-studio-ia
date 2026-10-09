"use client";
/**
 * Moteur d'images (Image Engine V2) dans l'onglet Images : demande (type, format, sujet, nombre), recherche de photos
 * libres puis génération contrôlée seulement si permise ; liste des images avec verdict du contrôle, origine et
 * licence ; refus d'une image (jamais réutilisée ensuite).
 */
import { useState } from "react";
import { Search, X } from "lucide-react";
import { api, Badge, Button, Card, Field, Input, Select, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { JobProgress, SectionTitle, useActive } from "./common";
import { useCostConfirm } from "./cost-confirm";
import { useT } from "../i18n";
import { PlanRequired, useCreationLocked } from "../billing-client";

type V2Image = { id: string; url: string; role: string; status: string; verdict: string | null; score: number | null; reason: string; origin: string; provider: string; brief?: { kind?: string; subject?: string; aspect?: string }; license: { name: string; url?: string } | null; credit: string | null };

const PRODUCT_KINDS: [string, string, string][] = [
  ["lifestyle", "Produit en situation", "Product in a real setting"],
  ["usage_scene", "Produit utilisé", "Product in use"],
  ["ambiance", "Univers de la marque (sans produit)", "Brand world (no product)"],
  ["banner", "Bannière", "Banner"],
  ["social_image", "Photo pour les réseaux", "Photo for social media"],
];
const SERVICE_KINDS: [string, string, string][] = [
  ["trade_photo", "Photo du métier", "Photo of the trade"],
  ["ambiance", "Ambiance de l'activité", "Business mood"],
  ["banner", "Bannière du site", "Website banner"],
  ["social_image", "Photo pour les réseaux", "Photo for social media"],
];
const ASPECTS: [string, string, string][] = [
  ["16:9", "16:9 · site, bannière", "16:9 · website, banner"],
  ["4:5", "4:5 · fiche, Instagram", "4:5 · product page, Instagram"],
  ["1:1", "1:1 · réseaux", "1:1 · social"],
  ["9:16", "9:16 · story, reel", "9:16 · story, reel"],
];
const VERDICT: Record<string, [string, string, string]> = {
  FINAL: ["ok", "Validée", "Approved"],
  PROVISIONAL: ["warn", "À vérifier", "To check"],
  RETRY: ["warn", "À reprendre", "To redo"],
  REJECTED: ["bad", "Écartée", "Rejected"],
};

export function ImageV2Panel() {
  const { id, data } = useProject();
  const t = useT();
  const toast = useToast();
  const cost = useCostConfirm();
  const locked = useCreationLocked();
  const services = data?.business === "services";
  const kinds = services ? SERVICE_KINDS : PRODUCT_KINDS;
  const [form, setForm] = useState({ kind: kinds[0][0], aspect: "16:9", topic: "", count: 1, allowGenerate: false });
  const active = useActive("image.v2");
  const { data: view, reload } = useApi<{ images: V2Image[] }>(`/api/projects/${id}/images/v2`, { poll: active.length ? 4000 : undefined });
  const canGenerate = !!data?.ai.image;
  async function create() {
    if (form.allowGenerate && canGenerate && !(await cost.confirm("image"))) return;
    try {
      await api(`/api/projects/${id}/images/v2`, { body: { action: "generate", request: { kind: form.kind, aspect: form.aspect, topic: form.topic.trim() || undefined, count: form.count, allowGenerate: form.allowGenerate && canGenerate } } });
      toast("ok", t("Recherche lancée : les images retenues apparaissent ci-dessous.", "Search started: the selected images appear below."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  }
  async function reject(assetId: string) {
    try {
      await api(`/api/projects/${id}/images/v2`, { body: { action: "reject", assetId } });
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  }
  const images = (view?.images ?? []).filter((i) => i.status !== "rejected" || i.verdict === "FINAL");
  return (
    <Card className="p-5 sm:p-7">
      {cost.dialog}
      <SectionTitle title={t("Moteur d'images", "Image engine")}>
        {t("Décrivez l'image voulue : le studio cherche d'abord une photo libre de droits pertinente (licence vérifiée, sujet contrôlé), et ne génère une image que si vous l'autorisez. Les images du produit réel partent toujours de votre photo détourée. Chaque image retenue passe un contrôle qualité.", "Describe the image you want: the studio first looks for a relevant royalty-free photo (license verified, subject checked), and only generates an image if you allow it. Images of the real product always start from your cutout photo. Every kept image passes a quality check.")}
      </SectionTitle>
      {active.map((j) => <JobProgress key={j.id} job={j} className="mb-4" />)}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("Type", "Type")} htmlFor="v2kind">
          <Select id="v2kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{kinds.map(([v, fr, en]) => <option key={v} value={v}>{t(fr, en)}</option>)}</Select>
        </Field>
        <Field label="Format" htmlFor="v2aspect">
          <Select id="v2aspect" value={form.aspect} onChange={(e) => setForm({ ...form, aspect: e.target.value })}>{ASPECTS.map(([v, fr, en]) => <option key={v} value={v}>{t(fr, en)}</option>)}</Select>
        </Field>
        <Field label={t("Sujet (facultatif)", "Subject (optional)")} htmlFor="v2topic">
          <Input id="v2topic" value={form.topic} maxLength={200} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder={services ? t("Ex. pose de bandes, chantier terminé", "E.g. finished job, tools on site") : t("Ex. salle de bain lumineuse", "E.g. bright bathroom")} />
        </Field>
        <Field label={t("Nombre", "Count")} htmlFor="v2count">
          <Select id="v2count" value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Toggle checked={form.allowGenerate && canGenerate} disabled={!canGenerate} onChange={(v) => setForm({ ...form, allowGenerate: v })} label={canGenerate ? t("Autoriser la génération par IA si aucune photo ne convient (utilise un visuel de votre forfait)", "Allow AI generation if no photo fits (uses one visual from your plan)") : t("Génération par IA non disponible : recherche de photos libres seulement", "AI generation not available: royalty-free photo search only")} />
        <Button icon={<Search className="size-4" />} disabled={locked || active.length > 0} onClick={create}>{t("Trouver ou créer", "Find or create")}</Button>
      </div>
      {locked && <PlanRequired what="images" />}
      {images.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {images.map((i) => {
            const v = VERDICT[i.verdict ?? ""] ?? ["neutral", i.verdict ?? "—", i.verdict ?? "—"];
            return (
              <div key={i.id} className="overflow-hidden rounded-xl border border-line bg-card">
                <img src={i.url} alt={i.brief?.subject ?? ""} className="aspect-square w-full object-cover" loading="lazy" />
                <div className="grid gap-1 p-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge tone={v[0] as "ok"}>{t(v[1], v[2])}{i.score != null ? ` ${i.score}/10` : ""}</Badge>
                    <Badge>{i.origin === "stock" ? t("Photo libre", "Stock photo") : i.origin === "reused" ? t("Réutilisée", "Reused") : t("Générée", "Generated")}</Badge>
                  </div>
                  {i.license && <span className="text-muted">{t("Licence : ", "License: ")}{i.license.url ? <a className="underline" href={i.license.url} target="_blank" rel="noreferrer">{i.license.name}</a> : i.license.name}</span>}
                  {i.credit && <span className="truncate text-muted" title={i.credit}>{i.credit}</span>}
                  <button onClick={() => reject(i.id)} className="inline-flex items-center gap-1 text-muted hover:text-bad"><X className="size-3" /> {t("Refuser cette image", "Reject this image")}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
