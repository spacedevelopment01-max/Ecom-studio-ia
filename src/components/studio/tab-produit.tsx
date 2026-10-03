"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Plus, Trash2, RefreshCw } from "lucide-react";
import { api, Badge, Button, Card, cx, Field, Input, Select, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, EngineNotice, SectionTitle, type AssetView } from "./common";
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
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="p-5 sm:p-7">
          <SectionTitle title="Fiche produit" action={<Badge tone={p.analyzedBy === "ai" ? "info" : "neutral"}>{p.analyzedBy === "ai" ? "Analyse IA" : "Moteur local"}</Badge>}>
            Les faits « confirmés » sont utilisés tels quels ; les observations visuelles sont formulées avec prudence ; les inconnues restent « à compléter ».
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom du produit" htmlFor="pname"><Input id="pname" value={name} onChange={(e) => (setName(e.target.value), setDirty(true))} /></Field>
            <Field label="Prix TTC (€)" htmlFor="pprice" hint={p.price.status === "unknown" ? "Inconnu : nécessaire pour vendre." : undefined}><Input id="pprice" value={price} onChange={(e) => (setPrice(e.target.value), setDirty(true))} placeholder="À renseigner" inputMode="decimal" /></Field>
          </div>
          {p.summary && <p className="mt-5 rounded-2xl bg-paper-2 p-4 text-sm leading-relaxed text-ink-2">{p.summary}</p>}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Information</th>
                  <th className="pb-2 font-medium">Valeur</th>
                  <th className="pb-2 font-medium">Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {facts.map((f, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="py-2 pr-2"><Input value={f.label} onChange={(e) => edit(i, { label: e.target.value })} className="h-9 text-sm" aria-label="Information" /></td>
                    <td className="py-2 pr-2"><Input value={f.value} onChange={(e) => edit(i, { value: e.target.value, status: e.target.value ? "confirmed" : "unknown" })} placeholder="Inconnu" className="h-9 text-sm" aria-label="Valeur" /><span className="mt-1 block text-[11px] text-muted">source : {SOURCE[f.source] ?? f.source}</span></td>
                    <td className="py-2 pr-2">
                      <Select value={f.status} onChange={(e) => edit(i, { status: e.target.value as Fact["status"] })} className="h-9 text-sm" aria-label="Statut">
                        <option value="confirmed">Confirmé</option>
                        <option value="inferred">Observé</option>
                        <option value="unknown">Inconnu</option>
                      </Select>
                    </td>
                    <td className="py-2"><button onClick={() => (setFacts(facts.filter((_, k) => k !== i)), setDirty(true))} className="grid size-9 place-items-center rounded-full hover:bg-paper-2" aria-label="Supprimer"><Trash2 className="size-4 text-muted" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => (setFacts([...facts, { key: `custom_${Date.now()}`, label: "", value: "", status: "confirmed", source: "user" }]), setDirty(true))}>Ajouter une information</Button>
            <Button onClick={save} loading={busy} disabled={!dirty}>Enregistrer</Button>
          </div>
        </Card>
        <div className="grid content-start gap-6">
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
        </div>
      </div>
    </div>
  );
}
