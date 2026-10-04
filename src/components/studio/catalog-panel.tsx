"use client";
import { useState } from "react";
import { ImagePlus, Plus, RefreshCw, Trash2, Link2 } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Modal, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { SectionTitle } from "./common";
import { STORE_TYPES, storeTypeInfo, type CatalogItem, type StoreType } from "@/lib/project-types";
import { useLang, useT } from "../i18n";

type ItemView = CatalogItem & { image: string | null; processed: boolean };
const euros = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ","));
const toCents = (s: string) => {
  const v = s.replace(/\s|€/g, "").replace(",", ".");
  if (!v) return null;
  const n = Math.round(Number(v) * 100);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Type de boutique et produits du catalogue (boutiques multi-produit et niche). */
export function CatalogPanel() {
  const { id, data: project, reload: reloadProject } = useProject();
  const toast = useToast();
  const t = useT();
  const { lang } = useLang();
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
        title={t("Type de boutique et catalogue", "Store type and catalog")}
        action={
          type !== "mono" && data.items.length > 0 && project?.brand ? (
            <Button size="sm" icon={<RefreshCw className="size-4" />} loading={busy === "rebuild"} onClick={async () => { setBusy("rebuild"); await patch({ rebuild: true }, t("La boutique se recompose avec tout le catalogue (nouvelle version, l'ancienne reste restaurable).", "The store is being rebuilt with the full catalog (new version; the previous one can still be restored).")); setBusy(null); }}>
              {t("Mettre à jour la boutique", "Update the store")}
            </Button>
          ) : undefined
        }
      >
        {t("Le produit principal est analysé en détail (marque, images, vidéos). En multi-produit ou en niche, les autres produits sont détourés, présentés en packshot aux couleurs de la marque et rangés en collections selon leur catégorie.", "The main product is analyzed in depth (brand, images, videos). In multi-product or niche mode, the other products are cut out, shown as packshots in the brand colors and organized into collections by category.")}
      </SectionTitle>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("Type de boutique", "Store type")}>
        {(Object.keys(STORE_TYPES) as StoreType[]).map((st) => (
          <button key={st} role="radio" aria-checked={type === st} onClick={() => st !== type && patch({ storeType: st }, t(`Type de boutique : ${storeTypeInfo(st, lang).label}.`, `Store type: ${storeTypeInfo(st, lang).label}.`))} className={cx("rounded-2xl border p-3 text-left transition", type === st ? "border-signal bg-signal-soft" : "border-line hover:border-ink")}>
            <span className="block text-sm font-semibold">{storeTypeInfo(st, lang).label}</span>
            <span className="mt-0.5 block text-xs text-muted">{storeTypeInfo(st, lang).hint}</span>
          </button>
        ))}
      </div>
      {type === "mono" ? (
        <p className="mt-4 text-sm text-muted">{data.items.length ? t(`${data.items.length} produit(s) du catalogue sont conservés mais pas affichés en mono-produit.`, `${data.items.length} catalog product(s) are kept but not shown in single-product mode.`) : t("Passez en multi-produit ou en niche pour ajouter d'autres produits.", "Switch to multi-product or niche to add more products.")}</p>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{t(`${data.items.length + 1} produits dans la boutique`, `${data.items.length + 1} products in the store`)} <span className="font-normal text-muted">{t("(dont le produit principal)", "(including the main product)")}</span></p>
            <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>{t("Ajouter un produit", "Add a product")}</Button>
          </div>
          {data.items.length === 0 ? (
            <Empty title={t("Aucun autre produit pour l'instant", "No other products yet")} icon={<ImagePlus className="size-5" />}>{t("Ajoutez la photo, le nom et le prix de chaque produit : le studio s'occupe du détourage, du packshot et des collections.", "Add each product's photo, name and price: the studio takes care of the cutout, packshot and collections.")}</Empty>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((i) => (
                <li key={i.key} className="flex gap-3 rounded-2xl border border-line p-3">
                  <span className="size-20 shrink-0 overflow-hidden rounded-xl bg-paper-2">{i.image && <img src={i.image} alt="" className="size-full object-cover" />}</span>
                  <div className="min-w-0 flex-1">
                    <Input defaultValue={i.name} onBlur={(e) => e.target.value.trim() && e.target.value !== i.name && patch({ item: { key: i.key, name: e.target.value.trim() } })} className="h-8 text-sm font-medium" aria-label={t("Nom", "Name")} />
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <Input defaultValue={i.category} placeholder={t("Catégorie", "Category")} onBlur={(e) => e.target.value !== i.category && patch({ item: { key: i.key, category: e.target.value.trim() } })} className="h-8 text-xs" aria-label={t("Catégorie", "Category")} />
                      <Input defaultValue={euros(i.price)} placeholder={t("Prix €", "Price €")} inputMode="decimal" onBlur={(e) => { const c = toCents(e.target.value); if (c !== undefined && c !== i.price) patch({ item: { key: i.key, price: c } }); }} className="h-8 text-xs" aria-label={t("Prix", "Price")} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {!i.processed && <Badge tone="neutral">{t("packshot à la prochaine mise à jour", "packshot at next update")}</Badge>}
                      {i.price === null && <Badge tone="warn">{t("prix à renseigner", "price needed")}</Badge>}
                      {i.source?.url && <a href={i.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-muted underline" title={t("Provenance (visible seulement dans le studio)", "Source (only visible in the studio)")}><Link2 className="size-3" /> {i.source.supplier}</a>}
                      <button onClick={() => confirm(t(`Retirer « ${i.name} » du catalogue ?`, `Remove “${i.name}” from the catalog?`)) && patch({ remove: i.key }, t("Produit retiré du catalogue.", "Product removed from the catalog."))} className="ml-auto grid size-8 place-items-center rounded-full hover:bg-paper-2" aria-label={t(`Retirer ${i.name}`, `Remove ${i.name}`)}><Trash2 className="size-4 text-muted" /></button>
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
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <Modal open={open} onClose={onClose} title={t("Ajouter un produit au catalogue", "Add a product to the catalog")}>
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          try {
            await api(`/api/projects/${id}/catalog`, { form: new FormData(form) });
            toast("ok", t("Produit ajouté. Cliquez sur « Mettre à jour la boutique » quand le catalogue est prêt.", "Product added. Click “Update the store” when the catalog is ready."));
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
          <span>{preview ? t("Changer la photo", "Change photo") : t("Photo du produit (fond uni de préférence)", "Product photo (plain background preferred)")}</span>
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
        </label>
        <Field label={t("Nom du produit", "Product name")} htmlFor="cname"><Input id="cname" name="name" required /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("Catégorie (collection)", "Category (collection)")} htmlFor="ccat"><Input id="ccat" name="category" list="ccats" placeholder={t("ex. Accessoires", "e.g. Accessories")} /><datalist id="ccats">{categories.map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label={t("Prix TTC", "Price incl. tax")} htmlFor="cprice"><Input id="cprice" name="price" inputMode="decimal" placeholder={t("ex. 24,90", "e.g. 24.90")} /></Field>
          <Field label={t("Prix barré (facultatif)", "Compare-at price (optional)")} htmlFor="ccmp"><Input id="ccmp" name="compareAt" inputMode="decimal" /></Field>
        </div>
        <Field label={t("Description", "Description")} htmlFor="cdesc" hint={t("Uniquement des faits vérifiés : rien n'est inventé.", "Verified facts only: nothing is made up.")}><Textarea id="cdesc" name="description" rows={3} /></Field>
        <Field label={t("Caractéristiques (une par ligne)", "Features (one per line)")} htmlFor="cfeat"><Textarea id="cfeat" name="features" rows={3} placeholder={t("Batterie 2000 mAh\nRecharge USB-C", "2000 mAh battery\nUSB-C charging")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Fournisseur (facultatif)", "Supplier (optional)")} htmlFor="csup"><Input id="csup" name="supplier" placeholder={t("ex. AliExpress", "e.g. AliExpress")} /></Field>
          <Field label={t("Lien fournisseur (facultatif)", "Supplier link (optional)")} htmlFor="curl" hint={t("Visible seulement dans le studio.", "Only visible in the studio.")}><Input id="curl" name="supplierUrl" type="url" placeholder="https://…" /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>{t("Annuler", "Cancel")}</Button>
          <Button type="submit" loading={busy}>{t("Ajouter", "Add")}</Button>
        </div>
      </form>
    </Modal>
  );
}
