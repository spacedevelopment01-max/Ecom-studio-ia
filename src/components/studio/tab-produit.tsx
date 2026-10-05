"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Plus, Trash2, RefreshCw } from "lucide-react";
import { api, Badge, Button, Card, cx, Field, Input, Select, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, EngineNotice, SectionTitle, type AssetView } from "./common";
import { FromSiteBadge } from "./existing-site";
import { CatalogPanel } from "./catalog-panel";
import TabActivite from "./tab-activite";
import type { Fact } from "@/lib/project-types";
import { useT } from "../i18n";

const SOURCE: Record<string, { fr: string; en: string }> = { user: { fr: "vous", en: "you" }, photo: { fr: "photo", en: "photo" }, link: { fr: "lien", en: "link" }, ai: { fr: "analyse", en: "analysis" }, description: { fr: "description", en: "description" } };

/** Onglet « Produit » ; pour le site d'une entreprise de services, il devient « Activité ». */
export default function TabProduitOuActivite() {
  const { data } = useProject();
  if (!data) return null;
  return data.business === "services" ? <TabActivite /> : <TabProduit />;
}

function TabProduit() {
  const { id, data, reload } = useProject();
  const toast = useToast();
  const t = useT();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const { data: originals, reload: reloadOriginals } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=original,cutout`);
  useEffect(() => {
    if (!data || dirty) return;
    setFacts(data.product.facts);
    setName(data.product.name);
    setPrice(data.product.price.amount !== null ? (data.product.price.amount / 100).toFixed(2).replace(".", ",") : "");
  }, [data, dirty]);
  if (!data) return null;
  const p = data.product;
  const edit = (i: number, patch: Partial<Fact>) => {
    setFacts(facts.map((f, k) => (k === i ? { ...f, ...patch, source: "user" } : f)));
    setDirty(true);
  };
  async function save() {
    setBusy(true);
    try {
      const amount = price.trim() ? Math.round(Number(price.replace(/\s|€/g, "").replace(",", ".")) * 100) : null;
      if (price.trim() && !Number.isFinite(amount)) throw new Error(t("Prix illisible.", "Unreadable price."));
      await api(`/api/projects/${id}/product`, { method: "PATCH", body: { name, price: amount, facts: facts.filter((f) => f.label.trim()) } });
      toast("ok", t("Fiche produit enregistrée : elle sera utilisée par toutes les prochaines créations.", "Product sheet saved: it will be used for everything created from now on."));
      setDirty(false);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <EngineNotice what={t("l'analyse produit et l'extraction des faits", "the product analysis and fact extraction")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 p-5 sm:p-7">
          <SectionTitle title={t("Fiche produit", "Product sheet")} action={<div className="flex flex-wrap items-center gap-2"><FromSiteBadge site={data?.settings.existingSite} /><Badge tone={p.analyzedBy === "ai" ? "info" : "neutral"}>{p.analyzedBy === "ai" ? t("Analyse IA", "AI analysis") : t("Version simplifiée", "Simplified version")}</Badge></div>}>
            {t("Les faits « confirmés » sont utilisés tels quels ; les observations visuelles sont formulées avec prudence ; les inconnues restent « à compléter ».", "“Confirmed” facts are used as is; visual observations are worded cautiously; unknowns stay marked “to complete”.")}
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Nom du produit", "Product name")} htmlFor="pname"><Input id="pname" value={name} onChange={(e) => (setName(e.target.value), setDirty(true))} /></Field>
            <Field label={t("Prix TTC (€)", "Price incl. tax (€)")} htmlFor="pprice" hint={p.price.status === "unknown" ? t("Inconnu : nécessaire pour vendre.", "Unknown: required to sell.") : undefined}><Input id="pprice" value={price} onChange={(e) => (setPrice(e.target.value), setDirty(true))} placeholder={t("À renseigner", "To be filled in")} inputMode="decimal" /></Field>
          </div>
          {p.summary && <p className="mt-5 rounded-2xl bg-paper-2 p-4 text-sm leading-relaxed text-ink-2">{p.summary}</p>}
          <div className="mt-6">
            <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_132px_36px] gap-2 pb-2 text-left text-xs font-medium text-muted sm:grid">
              <span>{t("Information", "Information")}</span>
              <span>{t("Valeur", "Value")}</span>
              <span>{t("Statut", "Status")}</span>
            </div>
            <ul className="grid">
              {facts.map((f, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_36px] gap-2 border-t border-line py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_132px_36px] sm:items-start">
                  <Input value={f.label} onChange={(e) => edit(i, { label: e.target.value })} className="h-9 text-sm font-medium" aria-label={t("Information", "Information")} placeholder={t("Information", "Information")} />
                  <button onClick={() => (setFacts(facts.filter((_, k) => k !== i)), setDirty(true))} className="grid size-9 place-items-center rounded-full hover:bg-paper-2 sm:order-last" aria-label={t("Supprimer", "Delete")}><Trash2 className="size-4 text-muted" /></button>
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <Input value={f.value} onChange={(e) => edit(i, { value: e.target.value, status: e.target.value ? "confirmed" : "unknown" })} placeholder={t("Inconnu", "Unknown")} className="h-9 text-sm" aria-label={t("Valeur", "Value")} />
                    <span className="mt-1 block text-[11px] text-muted">{t("source :", "source:")} {SOURCE[f.source] ? t(SOURCE[f.source].fr, SOURCE[f.source].en) : f.source}</span>
                  </div>
                  <Select value={f.status} onChange={(e) => edit(i, { status: e.target.value as Fact["status"] })} className="col-span-2 h-9 text-sm sm:col-span-1" aria-label={t("Statut", "Status")}>
                    <option value="confirmed">{t("Confirmé", "Confirmed")}</option>
                    <option value="inferred">{t("Observé", "Observed")}</option>
                    <option value="unknown">{t("Inconnu", "Unknown")}</option>
                  </Select>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => (setFacts([...facts, { key: `custom_${Date.now()}`, label: "", value: "", status: "confirmed", source: "user" }]), setDirty(true))}>{t("Ajouter une information", "Add information")}</Button>
            <Button onClick={save} loading={busy} disabled={!dirty}>{t("Enregistrer", "Save")}</Button>
          </div>
        </Card>
        <div className="grid min-w-0 content-start gap-6">
          <Card className="p-5">
            <h3 className="font-display text-lg font-semibold">{t("Ce que montre la photo", "What the photo shows")}</h3>
            {p.visual.colors.length > 0 && (
              <div className="mt-3 flex overflow-hidden rounded-xl">
                {p.visual.colors.map((c) => <span key={c.hex} title={`${c.hex} · ${c.name} · ${Math.round(c.share * 100)} %`} className="h-10" style={{ background: c.hex, flex: c.share }} />)}
              </div>
            )}
            <dl className="mt-4 grid gap-2 text-sm">
              {p.visual.shape && <div><dt className="text-xs text-muted">{t("Forme", "Shape")}</dt><dd>{p.visual.shape}</dd></div>}
              {p.visual.materials?.length ? <div><dt className="text-xs text-muted">{t("Matières apparentes", "Visible materials")}</dt><dd>{p.visual.materials.join(", ")}</dd></div> : null}
              {p.visual.labelText?.length ? <div><dt className="text-xs text-muted">{t("Texte lisible", "Readable text")}</dt><dd className="font-mono text-xs">{p.visual.labelText.join(" · ")}</dd></div> : null}
              {p.visual.description && <div><dt className="text-xs text-muted">{t("Description", "Description")}</dt><dd>{p.visual.description}</dd></div>}
            </dl>
            {p.claimsToAvoid.length > 0 && (
              <div className="mt-4 rounded-xl bg-warn-soft p-3 text-xs text-warn">
                <p className="font-semibold">{t("Allégations à éviter", "Claims to avoid")}</p>
                <ul className="mt-1 list-disc pl-4">{p.claimsToAvoid.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{t("Photos du produit", "Product photos")}</h3>
              <Button size="sm" variant="secondary" icon={<ImagePlus className="size-4" />} onClick={() => upload.current?.click()}>{t("Ajouter", "Add")}</Button>
              <input
                ref={upload}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const fd = new FormData();
                  Array.from(e.target.files ?? []).forEach((f) => fd.append("files", f));
                  fd.append("role", "original");
                  try {
                    await api(`/api/projects/${id}/files`, { form: fd });
                    toast("ok", t("Photos ajoutées. Elles seront détourées à la prochaine génération d'images.", "Photos added. Their background will be removed during the next image generation."));
                    reloadOriginals();
                  } catch (err) {
                    toast("bad", (err as Error).message);
                  }
                }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(originals?.assets ?? []).map((a) => (
                <figure key={a.id} className="overflow-hidden rounded-xl border border-line">
                  <AssetThumb a={a} className="aspect-square w-full" />
                  <figcaption className="truncate px-1.5 py-1 text-[10px] text-muted">{a.role === "cutout" ? t("Détourage", "Cutout") : t("Original", "Original")}</figcaption>
                </figure>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3"
              icon={<RefreshCw className="size-4" />}
              onClick={async () => {
                if (!confirm(t("Réanalyser le produit relance aussi les étapes suivantes (marque, textes, images…). Les versions précédentes restent disponibles. Continuer ?", "Reanalyzing the product also reruns the following steps (brand, copy, images…). Previous versions remain available. Continue?"))) return;
                await api(`/api/projects/${id}/resume`, { body: { from: "analysis" } });
                toast("ok", t("Nouvelle analyse lancée.", "New analysis started."));
                reload();
              }}
            >
              {t("Réanalyser tout le projet", "Reanalyze the whole project")}
            </Button>
          </Card>
          <LifestyleCard />
          <VariantsCard />
        </div>
      </div>
      <CatalogPanel />
    </div>
  );
}

/** Variante du produit (ex. coloris) et photo de chaque valeur, montrée quand le client la choisit. */
function VariantsCard() {
  const { id, data, reload } = useProject();
  const toast = useToast();
  const t = useT();
  const v = data?.product.variants[0];
  const [label, setLabel] = useState(v?.name ?? "");
  const [values, setValues] = useState(v?.values.join(", ") ?? "");
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const { data: photos, reload: reloadPhotos } = useApi<{ photos: { id: string; variant: string; url: string }[] }>(`/api/projects/${id}/product/variant-photo`);
  useEffect(() => {
    setLabel(v?.name ?? "");
    setValues(v?.values.join(", ") ?? "");
  }, [v?.name, v?.values.join("|")]);
  const list = (v?.values ?? []).filter(Boolean);
  async function save() {
    setBusy(true);
    try {
      const vals = values.split(",").map((x) => x.trim()).filter(Boolean);
      await api(`/api/projects/${id}/product`, { method: "PATCH", body: { variants: vals.length && label.trim() ? [{ name: label.trim(), values: vals }] : [] } });
      toast("ok", t("Variantes enregistrées. Reconstruisez la boutique pour les voir dans l'aperçu.", "Variants saved. Rebuild the store to see them in the preview."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-5">
      <h3 className="font-display text-lg font-semibold">{t("Variantes", "Variants")}</h3>
      <p className="mt-1 text-xs text-muted">{t("Ex. « Coloris » : Bleu, Vert. Ajoutez la photo de chaque valeur : elle s'affiche quand l'acheteur la choisit.", "E.g. “Color”: Blue, Green. Add a photo for each value: it shows when the shopper selects it.")}</p>
      <div className="mt-3 grid gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("Nom (ex. Coloris, Taille)", "Name (e.g. Color, Size)")} className="h-9 text-sm" aria-label={t("Nom de la variante", "Variant name")} />
        <Input value={values} onChange={(e) => setValues(e.target.value)} placeholder={t("Valeurs séparées par des virgules", "Comma-separated values")} className="h-9 text-sm" aria-label={t("Valeurs", "Values")} />
        <Button size="sm" onClick={save} loading={busy}>{t("Enregistrer les variantes", "Save variants")}</Button>
      </div>
      {list.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {list.map((val) => {
            const ph = photos?.photos.find((x) => x.variant.toLowerCase() === val.toLowerCase());
            return (
              <li key={val} className="flex items-center gap-3 rounded-xl border border-line p-2">
                <span className={cx("grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper-2", !ph && "text-[10px] text-muted")}>
                  {ph ? <img src={ph.url} alt={t(`Photo ${val}`, `${val} photo`)} className="size-full object-cover" /> : t("Photo", "Photo")}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{val}</span>
                <Button size="sm" variant="secondary" icon={<ImagePlus className="size-4" />} onClick={() => (setTarget(val), file.current?.click())}>{ph ? t("Changer", "Change") : t("Photo", "Photo")}</Button>
              </li>
            );
          })}
        </ul>
      )}
      <input
        ref={file}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f || !target) return;
          const fd = new FormData();
          fd.append("value", target);
          fd.append("photo", f);
          try {
            await api(`/api/projects/${id}/product/variant-photo`, { form: fd });
            toast("ok", t(`Photo « ${target} » ajoutée : elle sera détourée à la prochaine construction de la boutique.`, `“${target}” photo added: its background will be removed the next time the store is built.`));
            reloadPhotos();
          } catch (err) {
            toast("bad", (err as Error).message);
          }
        }}
      />
    </Card>
  );
}

/** Photos du produit en situation (vie de tous les jours) : elles ouvrent la boutique et enrichissent la galerie. */
function LifestyleCard() {
  const { id } = useProject();
  const toast = useToast();
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const { data, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=lifestyle`);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{t("Photos en situation", "Lifestyle photos")}</h3>
        <Button size="sm" variant="secondary" icon={<ImagePlus className="size-4" />} onClick={() => input.current?.click()}>{t("Ajouter", "Add")}</Button>
      </div>
      <p className="mt-1 text-xs text-muted">{t("Le produit utilisé dans la vie de tous les jours. La première ouvre la boutique (héros) dans tous les thèmes ; les autres rejoignent la galerie.", "The product in everyday use. The first one opens the store (hero) in every theme; the others join the gallery.")}</p>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const fd = new FormData();
          Array.from(e.target.files ?? []).forEach((f) => fd.append("files", f));
          e.target.value = "";
          fd.append("role", "lifestyle");
          try {
            await api(`/api/projects/${id}/files`, { form: fd });
            toast("ok", t("Photos ajoutées : reconstruisez la boutique pour les voir en ouverture.", "Photos added: rebuild the store to see them at the top."));
            reload();
          } catch (err) {
            toast("bad", (err as Error).message);
          }
        }}
      />
      {(data?.assets ?? []).length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {data!.assets.map((a, i) => (
            <figure key={a.id} className="overflow-hidden rounded-xl border border-line">
              <AssetThumb a={a} className="aspect-square w-full" />
              <figcaption className="truncate px-1.5 py-1 text-[10px] text-muted">{i === 0 ? t("Héros", "Hero") : t("Galerie", "Gallery")}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </Card>
  );
}
