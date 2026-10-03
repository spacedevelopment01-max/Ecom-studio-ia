"use client";
import { useState } from "react";
import { ImagePlus, Plus, RefreshCw, Trash2, Link2 } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Modal, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { SectionTitle } from "./common";
import { STORE_TYPES, type CatalogItem, type StoreType } from "@/lib/project-types";

type ItemView = CatalogItem & { image: string | null; processed: boolean };
const euros = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ","));
const toCents = (s: string) => {
  const t = s.replace(/\s|€/g, "").replace(",", ".");
  if (!t) return null;
  const n = Math.round(Number(t) * 100);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Type de boutique et produits du catalogue (boutiques multi-produit et niche). */
export function CatalogPanel() {
  const { id, data: project, reload: reloadProject } = useProject();
  const toast = useToast();
  const { data, reload } = useApi<{ storeType: StoreType; items: ItemView[] }>(`/api/projects/${id}/catalog`);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  if (!data) return null;
  const type = data.storeType;
  const patch = async (b: Record<string, unknown>, done?: string) => {
    try {
      await api(`/api/projects/${id}/catalog`, { method: "PATCH", body: b });
      if (done) toast("ok", done);
      reload();
      reloadProject();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  return (
    <Card className="p-5 sm:p-7">
      <SectionTitle
        title="Type de boutique et catalogue"
        action={
          type !== "mono" && data.items.length > 0 && project?.brand ? (
            <Button size="sm" icon={<RefreshCw className="size-4" />} loading={busy === "rebuild"} onClick={async () => { setBusy("rebuild"); await patch({ rebuild: true }, "La boutique se recompose avec tout le catalogue (nouvelle version, l'ancienne reste restaurable)."); setBusy(null); }}>
              Mettre à jour la boutique
            </Button>
          ) : undefined
        }
      >
        Le produit principal est analysé en détail (marque, images, vidéos). En multi-produit ou en niche, les autres produits sont détourés, présentés en packshot aux couleurs de la marque et rangés en collections selon leur catégorie.
      </SectionTitle>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Type de boutique">
        {(Object.keys(STORE_TYPES) as StoreType[]).map((t) => (
          <button key={t} role="radio" aria-checked={type === t} onClick={() => t !== type && patch({ storeType: t }, `Type de boutique : ${STORE_TYPES[t].label}.`)} className={cx("rounded-2xl border p-3 text-left transition", type === t ? "border-signal bg-signal-soft" : "border-line hover:border-ink")}>
            <span className="block text-sm font-semibold">{STORE_TYPES[t].label}</span>
            <span className="mt-0.5 block text-xs text-muted">{STORE_TYPES[t].hint}</span>
          </button>
        ))}
      </div>
      {type === "mono" ? (
        <p className="mt-4 text-sm text-muted">{data.items.length ? `${data.items.length} produit(s) du catalogue sont conservés mais pas affichés en mono-produit.` : "Passez en multi-produit ou en niche pour ajouter d'autres produits."}</p>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{data.items.length + 1} produits dans la boutique <span className="font-normal text-muted">(dont le produit principal)</span></p>
            <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Ajouter un produit</Button>
          </div>
          {data.items.length === 0 ? (
            <Empty title="Aucun autre produit pour l'instant" icon={<ImagePlus className="size-5" />}>Ajoutez la photo, le nom et le prix de chaque produit : le studio s'occupe du détourage, du packshot et des collections.</Empty>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((i) => (
                <li key={i.key} className="flex gap-3 rounded-2xl border border-line p-3">
                  <span className="size-20 shrink-0 overflow-hidden rounded-xl bg-paper-2">{i.image && <img src={i.image} alt="" className="size-full object-cover" />}</span>
                  <div className="min-w-0 flex-1">
                    <Input defaultValue={i.name} onBlur={(e) => e.target.value.trim() && e.target.value !== i.name && patch({ item: { key: i.key, name: e.target.value.trim() } })} className="h-8 text-sm font-medium" aria-label="Nom" />
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <Input defaultValue={i.category} placeholder="Catégorie" onBlur={(e) => e.target.value !== i.category && patch({ item: { key: i.key, category: e.target.value.trim() } })} className="h-8 text-xs" aria-label="Catégorie" />
                      <Input defaultValue={euros(i.price)} placeholder="Prix €" inputMode="decimal" onBlur={(e) => { const c = toCents(e.target.value); if (c !== undefined && c !== i.price) patch({ item: { key: i.key, price: c } }); }} className="h-8 text-xs" aria-label="Prix" />
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {!i.processed && <Badge tone="neutral">packshot à la prochaine mise à jour</Badge>}
                      {i.price === null && <Badge tone="warn">prix à renseigner</Badge>}
                      {i.source?.url && <a href={i.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-muted underline" title="Provenance (visible seulement dans le studio)"><Link2 className="size-3" /> {i.source.supplier}</a>}
                      <button onClick={() => confirm(`Retirer « ${i.name} » du catalogue ?`) && patch({ remove: i.key }, "Produit retiré du catalogue.")} className="ml-auto grid size-8 place-items-center rounded-full hover:bg-paper-2" aria-label={`Retirer ${i.name}`}><Trash2 className="size-4 text-muted" /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <AddProduct open={adding} onClose={() => setAdding(false)} onAdded={() => (reload(), reloadProject())} categories={[...new Set(data.items.map((i) => i.category).filter(Boolean))]} />
    </Card>
  );
}

function AddProduct({ open, onClose, onAdded, categories }: { open: boolean; onClose: () => void; onAdded: () => void; categories: string[] }) {
  const { id } = useProject();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <Modal open={open} onClose={onClose} title="Ajouter un produit au catalogue">
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          try {
            await api(`/api/projects/${id}/catalog`, { form: new FormData(form) });
            toast("ok", "Produit ajouté. Cliquez sur « Mettre à jour la boutique » quand le catalogue est prêt.");
            form.reset();
            setPreview(null);
            onAdded();
            onClose();
          } catch (err) {
            toast("bad", (err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="grid cursor-pointer place-items-center gap-2 rounded-2xl border-2 border-dashed border-line p-5 text-center text-sm text-muted hover:border-ink">
          {preview ? <img src={preview} alt="" className="max-h-40 rounded-xl object-contain" /> : <ImagePlus className="size-6" />}
          <span>{preview ? "Changer la photo" : "Photo du produit (fond uni de préférence)"}</span>
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
        </label>
        <Field label="Nom du produit" htmlFor="cname"><Input id="cname" name="name" required /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Catégorie (collection)" htmlFor="ccat"><Input id="ccat" name="category" list="ccats" placeholder="ex. Accessoires" /><datalist id="ccats">{categories.map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label="Prix TTC" htmlFor="cprice"><Input id="cprice" name="price" inputMode="decimal" placeholder="ex. 24,90" /></Field>
          <Field label="Prix barré (facultatif)" htmlFor="ccmp"><Input id="ccmp" name="compareAt" inputMode="decimal" /></Field>
        </div>
        <Field label="Description" htmlFor="cdesc" hint="Uniquement des faits vérifiés : rien n'est inventé."><Textarea id="cdesc" name="description" rows={3} /></Field>
        <Field label="Caractéristiques (une par ligne)" htmlFor="cfeat"><Textarea id="cfeat" name="features" rows={3} placeholder={"Batterie 2000 mAh\nRecharge USB-C"} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fournisseur (facultatif)" htmlFor="csup"><Input id="csup" name="supplier" placeholder="ex. AliExpress" /></Field>
          <Field label="Lien fournisseur (facultatif)" htmlFor="curl" hint="Visible seulement dans le studio."><Input id="curl" name="supplierUrl" type="url" placeholder="https://…" /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={busy}>Ajouter</Button>
        </div>
      </form>
    </Modal>
  );
}
