"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Plus, Trash2, RefreshCw } from "lucide-react";
import { api, Badge, Button, Card, cx, Field, Input, Select, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, EngineNotice, SectionTitle, type AssetView } from "./common";
import { CatalogPanel } from "./catalog-panel";
import type { Fact } from "@/lib/project-types";

const STATUS = { confirmed: { label: "Confirmé", tone: "ok" }, inferred: { label: "Observé", tone: "info" }, unknown: { label: "Inconnu", tone: "warn" } } as const;
const SOURCE: Record<string, string> = { user: "vous", photo: "photo", link: "lien", ai: "analyse", description: "description" };

export default function TabProduit() {
  const { id, data, reload } = useProject();
  const toast = useToast();
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
      if (price.trim() && !Number.isFinite(amount)) throw new Error("Prix illisible.");
      await api(`/api/projects/${id}/product`, { method: "PATCH", body: { name, price: amount, facts: facts.filter((f) => f.label.trim()) } });
      toast("ok", "Fiche produit enregistrée : elle sera utilisée par toutes les prochaines créations.");
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
      <EngineNotice what="l'analyse produit et l'extraction des faits" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 p-5 sm:p-7">
          <SectionTitle title="Fiche produit" action={<Badge tone={p.analyzedBy === "ai" ? "info" : "neutral"}>{p.analyzedBy === "ai" ? "Analyse IA" : "Moteur local"}</Badge>}>
            Les faits « confirmés » sont utilisés tels quels ; les observations visuelles sont formulées avec prudence ; les inconnues restent « à compléter ».
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom du produit" htmlFor="pname"><Input id="pname" value={name} onChange={(e) => (setName(e.target.value), setDirty(true))} /></Field>
            <Field label="Prix TTC (€)" htmlFor="pprice" hint={p.price.status === "unknown" ? "Inconnu : nécessaire pour vendre." : undefined}><Input id="pprice" value={price} onChange={(e) => (setPrice(e.target.value), setDirty(true))} placeholder="À renseigner" inputMode="decimal" /></Field>
          </div>
          {p.summary && <p className="mt-5 rounded-2xl bg-paper-2 p-4 text-sm leading-relaxed text-ink-2">{p.summary}</p>}
          <div className="mt-6">
            <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_132px_36px] gap-2 pb-2 text-left text-xs font-medium text-muted sm:grid">
              <span>Information</span>
              <span>Valeur</span>
              <span>Statut</span>
            </div>
            <ul className="grid">
              {facts.map((f, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_36px] gap-2 border-t border-line py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_132px_36px] sm:items-start">
                  <Input value={f.label} onChange={(e) => edit(i, { label: e.target.value })} className="h-9 text-sm font-medium" aria-label="Information" placeholder="Information" />
                  <button onClick={() => (setFacts(facts.filter((_, k) => k !== i)), setDirty(true))} className="grid size-9 place-items-center rounded-full hover:bg-paper-2 sm:order-last" aria-label="Supprimer"><Trash2 className="size-4 text-muted" /></button>
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <Input value={f.value} onChange={(e) => edit(i, { value: e.target.value, status: e.target.value ? "confirmed" : "unknown" })} placeholder="Inconnu" className="h-9 text-sm" aria-label="Valeur" />
                    <span className="mt-1 block text-[11px] text-muted">source : {SOURCE[f.source] ?? f.source}</span>
                  </div>
                  <Select value={f.status} onChange={(e) => edit(i, { status: e.target.value as Fact["status"] })} className="col-span-2 h-9 text-sm sm:col-span-1" aria-label="Statut">
                    <option value="confirmed">Confirmé</option>
                    <option value="inferred">Observé</option>
                    <option value="unknown">Inconnu</option>
                  </Select>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => (setFacts([...facts, { key: `custom_${Date.now()}`, label: "", value: "", status: "confirmed", source: "user" }]), setDirty(true))}>Ajouter une information</Button>
            <Button onClick={save} loading={busy} disabled={!dirty}>Enregistrer</Button>
          </div>
        </Card>
        <div className="grid min-w-0 content-start gap-6">
          <Card className="p-5">
            <h3 className="font-display text-lg font-semibold">Ce que montre la photo</h3>
            {p.visual.colors.length > 0 && (
              <div className="mt-3 flex overflow-hidden rounded-xl">
                {p.visual.colors.map((c) => <span key={c.hex} title={`${c.hex} · ${c.name} · ${Math.round(c.share * 100)} %`} className="h-10" style={{ background: c.hex, flex: c.share }} />)}
              </div>
            )}
            <dl className="mt-4 grid gap-2 text-sm">
              {p.visual.shape && <div><dt className="text-xs text-muted">Forme</dt><dd>{p.visual.shape}</dd></div>}
              {p.visual.materials?.length ? <div><dt className="text-xs text-muted">Matières apparentes</dt><dd>{p.visual.materials.join(", ")}</dd></div> : null}
              {p.visual.labelText?.length ? <div><dt className="text-xs text-muted">Texte lisible</dt><dd className="font-mono text-xs">{p.visual.labelText.join(" · ")}</dd></div> : null}
              {p.visual.description && <div><dt className="text-xs text-muted">Description</dt><dd>{p.visual.description}</dd></div>}
            </dl>
            {p.claimsToAvoid.length > 0 && (
              <div className="mt-4 rounded-xl bg-warn-soft p-3 text-xs text-warn">
                <p className="font-semibold">Allégations à éviter</p>
                <ul className="mt-1 list-disc pl-4">{p.claimsToAvoid.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Photos du produit</h3>
              <Button size="sm" variant="secondary" icon={<ImagePlus className="size-4" />} onClick={() => upload.current?.click()}>Ajouter</Button>
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
                    toast("ok", "Photos ajoutées. Elles seront détourées à la prochaine génération d'images.");
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
                  <figcaption className="truncate px-1.5 py-1 text-[10px] text-muted">{a.role === "cutout" ? "Détourage" : "Original"}</figcaption>
                </figure>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3"
              icon={<RefreshCw className="size-4" />}
              onClick={async () => {
                if (!confirm("Réanalyser le produit relance aussi les étapes suivantes (marque, textes, images…). Les versions précédentes restent disponibles. Continuer ?")) return;
                await api(`/api/projects/${id}/resume`, { body: { from: "analysis" } });
                toast("ok", "Nouvelle analyse lancée.");
                reload();
              }}
            >
              Réanalyser tout le projet
            </Button>
          </Card>
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
      toast("ok", "Variantes enregistrées. Reconstruisez la boutique pour les voir dans l'aperçu.");
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-5">
      <h3 className="font-display text-lg font-semibold">Variantes</h3>
      <p className="mt-1 text-xs text-muted">Ex. « Coloris » : Bleu, Vert. Ajoutez la photo de chaque valeur : elle s'affiche quand l'acheteur la choisit.</p>
      <div className="mt-3 grid gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom (ex. Coloris, Taille)" className="h-9 text-sm" aria-label="Nom de la variante" />
        <Input value={values} onChange={(e) => setValues(e.target.value)} placeholder="Valeurs séparées par des virgules" className="h-9 text-sm" aria-label="Valeurs" />
        <Button size="sm" onClick={save} loading={busy}>Enregistrer les variantes</Button>
      </div>
      {list.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {list.map((val) => {
            const ph = photos?.photos.find((x) => x.variant.toLowerCase() === val.toLowerCase());
            return (
              <li key={val} className="flex items-center gap-3 rounded-xl border border-line p-2">
                <span className={cx("grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper-2", !ph && "text-[10px] text-muted")}>
                  {ph ? <img src={ph.url} alt={`Photo ${val}`} className="size-full object-cover" /> : "—"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{val}</span>
                <Button size="sm" variant="secondary" icon={<ImagePlus className="size-4" />} onClick={() => (setTarget(val), file.current?.click())}>{ph ? "Changer" : "Photo"}</Button>
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
            toast("ok", `Photo « ${target} » ajoutée : elle sera détourée à la prochaine construction de la boutique.`);
            reloadPhotos();
          } catch (err) {
            toast("bad", (err as Error).message);
          }
        }}
      />
    </Card>
  );
}
