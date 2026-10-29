"use client";
/**
 * Onglet « Carte » (restaurant, thème TABLE SAISON, #239 phase 2) : catégories et plats saisis une fois. La page
 * « La carte » et la « sélection du moment » du site les affichent toutes seules, sans toucher au thème. Les
 * allergènes sont ceux que déclare le restaurateur ; rien n'est vérifié ni certifié par le studio.
 */
import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, Plus, Save, Send } from "lucide-react";
import { api, Badge, Button, Card, Empty, Input, Modal, Select, Spinner, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { useT } from "../i18n";
import { MediaPicker } from "./common";

type Status = "draft" | "published" | "withdrawn" | "archived";
type Category = { id: string; title: string; position: number };
type Item = { id: string; categoryId: string; name: string; description: string; price: number | null; priceText: string; vegetarian: boolean; allergens: string; available: boolean; featured: boolean; photo: string | null; status: Status };
type Carte = { categories: Category[]; items: Item[] };
const STATUS: Record<Status, { fr: string; en: string; tone: "neutral" | "ok" | "warn" | "bad" }> = {
  draft: { fr: "Brouillon", en: "Draft", tone: "neutral" }, published: { fr: "En ligne", en: "Live", tone: "ok" },
  withdrawn: { fr: "Retiré", en: "Withdrawn", tone: "warn" }, archived: { fr: "Archivé", en: "Archived", tone: "bad" },
};
const price = (i: Pick<Item, "price" | "priceText">) => i.priceText.trim() || (i.price == null ? "" : `${String(i.price).replace(".", ",")} €`);

export default function TabCarte() {
  const t = useT();
  const toast = useToast();
  const { id, data: project } = useProject();
  const { data, reload } = useApi<Carte>(`/api/projects/${id}/carte`);
  const [editing, setEditing] = useState<Partial<Item> & { categoryId: string } | null>(null);
  const [newCat, setNewCat] = useState("");
  const versionId = project?.theme?.versionId ?? null;
  const post = async (payload: Record<string, unknown>, done?: string) => {
    try { await api(`/api/projects/${id}/carte`, { body: payload }); if (done) toast("ok", done); await reload(); return true; }
    catch (e) { toast("bad", (e as Error).message); return false; }
  };
  if (!data) return <Spinner />;
  const items = (c: string) => data.items.filter((i) => i.categoryId === c);
  const move = (list: string[], i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= list.length) return null; const n = [...list]; [n[i], n[j]] = [n[j], n[i]]; return n; };

  return (
    <div className="mx-auto max-w-5xl" data-tab-carte>
      <Card className="mb-6 p-5">
        <p className="font-semibold">{t("Votre carte", "Your menu")}</p>
        <p className="mt-1 text-sm text-muted">{t("Ajoutez vos catégories et vos plats, puis publiez-les : la page « La carte » et la sélection du moment du site les affichent toutes seules. Un plat « indisponible » disparaît du site sans être supprimé. Le site hébergé se met à jour à la prochaine publication (onglet Site).", "Add your categories and dishes, then publish them: the site's Menu page and current selection show them by themselves. An “unavailable” dish disappears from the site without being deleted. The hosted site updates on its next publication (Website tab).")}</p>
        <p className="mt-2 text-xs text-muted">{t("Allergènes et mentions : ceux que vous déclarez, affichés tels quels. Le studio ne les vérifie pas.", "Allergens and notes: the ones you declare, shown as is. The studio doesn't check them.")}</p>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (newCat.trim() && await post({ action: "category-add", title: newCat }, t("Catégorie ajoutée.", "Category added."))) setNewCat(""); }}>
          <Input className="min-w-0 flex-1" placeholder={t("Nouvelle catégorie (ex. Entrées)", "New category (e.g. Starters)")} value={newCat} onChange={(e) => setNewCat(e.target.value)} aria-label={t("Nouvelle catégorie", "New category")} />
          <Button type="submit" variant="secondary" icon={<Plus className="size-4" />} disabled={!newCat.trim()}>{t("Ajouter la catégorie", "Add category")}</Button>
          {versionId && <a className="inline-flex items-center gap-1 text-sm underline" href={`/preview/${id}/v/${versionId}/pages/la-carte`} target="_blank" rel="noreferrer"><Eye className="size-4" /> {t("Voir la carte dans l'aperçu", "See the menu in the preview")}</a>}
        </form>
      </Card>

      {!data.categories.length ? <Empty title={t("Aucune catégorie", "No category")}>{t("Commencez par « Entrées », « Plats », « Desserts »…", "Start with “Starters”, “Mains”, “Desserts”…")}</Empty> : data.categories.map((c, ci) => (
        <Card key={c.id} className="mb-4 p-4" data-carte-category={c.title}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{c.title}</p>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" aria-label={t("Monter", "Up")} icon={<ArrowUp className="size-4" />} onClick={() => { const n = move(data.categories.map((x) => x.id), ci, -1); if (n) post({ action: "category-order", ids: n }); }}>{""}</Button>
              <Button size="sm" variant="ghost" aria-label={t("Descendre", "Down")} icon={<ArrowDown className="size-4" />} onClick={() => { const n = move(data.categories.map((x) => x.id), ci, 1); if (n) post({ action: "category-order", ids: n }); }}>{""}</Button>
              <Button size="sm" variant="ghost" onClick={() => { const title = window.prompt(t("Nouveau nom de la catégorie", "New category name"), c.title); if (title?.trim()) post({ action: "category-rename", id: c.id, title }); }}>{t("Renommer", "Rename")}</Button>
              {!items(c.id).length && <Button size="sm" variant="ghost" onClick={() => post({ action: "category-delete", id: c.id }, t("Catégorie supprimée.", "Category deleted."))}>{t("Supprimer", "Delete")}</Button>}
              <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setEditing({ categoryId: c.id, name: "", description: "", price: null, priceText: "", vegetarian: false, allergens: "", available: true, featured: false, photo: null })}>{t("Ajouter un plat", "Add a dish")}</Button>
            </div>
          </div>
          <ul className="mt-3 grid gap-2">
            {items(c.id).map((i, ii) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3 text-sm" data-carte-item={i.name}>
                <span className="min-w-0">
                  <span className="font-medium">{i.name}</span> <span className="text-muted">{price(i)}</span>
                  {" "}<Badge tone={STATUS[i.status].tone} dot>{t(STATUS[i.status].fr, STATUS[i.status].en)}</Badge>
                  {!i.available && <Badge tone="warn" className="ml-1">{t("Indisponible", "Unavailable")}</Badge>}
                  {i.featured && <Badge tone="signal" className="ml-1">{t("Sélection du moment", "Current selection")}</Badge>}
                  {i.vegetarian && <Badge className="ml-1">{t("Végétarien", "Vegetarian")}</Badge>}
                  {i.allergens && <span className="block text-xs text-muted">{t("Allergènes déclarés : ", "Declared allergens: ")}{i.allergens}</span>}
                </span>
                <span className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" aria-label={t("Monter", "Up")} icon={<ArrowUp className="size-4" />} onClick={() => { const n = move(items(c.id).map((x) => x.id), ii, -1); if (n) post({ action: "item-order", ids: n }); }}>{""}</Button>
                  <Button size="sm" variant="ghost" aria-label={t("Descendre", "Down")} icon={<ArrowDown className="size-4" />} onClick={() => { const n = move(items(c.id).map((x) => x.id), ii, 1); if (n) post({ action: "item-order", ids: n }); }}>{""}</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(i)}>{t("Modifier", "Edit")}</Button>
                  {i.status !== "published" && <Button size="sm" onClick={() => post({ action: "item-status", id: i.id, status: "published" }, t(`« ${i.name} » publié.`, `“${i.name}” published.`))}>{t("Publier", "Publish")}</Button>}
                  {i.status === "published" && <Button size="sm" variant="ghost" onClick={() => post({ action: "item-update", id: i.id, item: { available: !i.available } })}>{i.available ? t("Marquer indisponible", "Mark unavailable") : t("Remettre disponible", "Mark available")}</Button>}
                  {i.status === "published" && <Button size="sm" variant="ghost" onClick={() => post({ action: "item-status", id: i.id, status: "withdrawn" })}>{t("Retirer", "Withdraw")}</Button>}
                  {i.status !== "archived" && i.status !== "published" && <Button size="sm" variant="ghost" onClick={() => post({ action: "item-status", id: i.id, status: "archived" })}>{t("Archiver", "Archive")}</Button>}
                </span>
              </li>
            ))}
            {!items(c.id).length && <li className="text-sm text-muted">{t("Aucun plat dans cette catégorie.", "No dish in this category.")}</li>}
          </ul>
        </Card>
      ))}
      {editing && <ItemModal item={editing} categories={data.categories} onClose={() => setEditing(null)} onSave={async (item, publish) => {
        const ok = editing.id
          ? await post({ action: "item-update", id: editing.id, item }, t("Plat enregistré.", "Dish saved."))
          : await (async () => { try { const r = await api<{ item: Item }>(`/api/projects/${id}/carte`, { body: { action: "item-create", item } }); if (publish) await api(`/api/projects/${id}/carte`, { body: { action: "item-status", id: r.item.id, status: "published" } }); toast("ok", publish ? t("Plat publié.", "Dish published.") : t("Plat enregistré en brouillon.", "Dish saved as draft.")); await reload(); return true; } catch (e) { toast("bad", (e as Error).message); return false; } })();
        if (ok) setEditing(null);
      }} />}
    </div>
  );
}

function ItemModal({ item, categories, onClose, onSave }: { item: Partial<Item> & { categoryId: string }; categories: Category[]; onClose: () => void; onSave: (i: Record<string, unknown>, publish: boolean) => void }) {
  const t = useT();
  const [f, setF] = useState({ ...item, priceStr: item.price == null ? "" : String(item.price).replace(".", ",") });
  const [picker, setPicker] = useState(false);
  const payload = () => ({ categoryId: f.categoryId, name: f.name ?? "", description: f.description ?? "", price: f.priceStr.trim() ? Number(f.priceStr.replace(",", ".")) : null, priceText: f.priceText ?? "", vegetarian: !!f.vegetarian, allergens: f.allergens ?? "", available: f.available !== false, featured: !!f.featured, photo: f.photo ?? null });
  return (
    <Modal open onClose={onClose} title={item.id ? t("Modifier le plat", "Edit dish") : t("Nouveau plat", "New dish")}>
      <div className="grid gap-3" data-carte-form>
        <label className="grid gap-1 text-sm">{t("Catégorie", "Category")}<Select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></label>
        <label className="grid gap-1 text-sm">{t("Nom du plat *", "Dish name *")}<Input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="grid gap-1 text-sm">{t("Description", "Description")}<Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">{t("Prix (€)", "Price (€)")}<Input inputMode="decimal" value={f.priceStr} onChange={(e) => setF({ ...f, priceStr: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">{t("Ou mention de prix", "Or price note")}<Input placeholder={t("selon arrivage", "market price")} value={f.priceText ?? ""} onChange={(e) => setF({ ...f, priceText: e.target.value })} /></label>
        </div>
        <label className="grid gap-1 text-sm">{t("Allergènes déclarés (facultatif)", "Declared allergens (optional)")}<Input placeholder={t("gluten, lait, fruits à coque…", "gluten, milk, nuts…")} value={f.allergens ?? ""} onChange={(e) => setF({ ...f, allergens: e.target.value })} /></label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.vegetarian} onChange={(e) => setF({ ...f, vegetarian: e.target.checked })} />{t("Végétarien", "Vegetarian")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.available !== false} onChange={(e) => setF({ ...f, available: e.target.checked })} />{t("Disponible", "Available")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} />{t("Sélection du moment (avec photo)", "Current selection (with photo)")}</label>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {f.photo ? <img src={`/api/files/${f.photo}?thumb=1`} alt="" className="size-16 rounded-lg object-cover" /> : <span className="text-muted">{t("Pas de photo", "No photo")}</span>}
          <Button size="sm" variant="secondary" onClick={() => setPicker(true)}>{t("Choisir une photo du projet", "Choose a project photo")}</Button>
          {f.photo && <Button size="sm" variant="ghost" onClick={() => setF({ ...f, photo: null })}>{t("Retirer la photo", "Remove photo")}</Button>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" icon={<Save className="size-4" />} onClick={() => onSave(payload(), false)}>{t("Enregistrer", "Save")}</Button>
          {!item.id && <Button icon={<Send className="size-4" />} onClick={() => onSave(payload(), true)}>{t("Enregistrer et publier", "Save and publish")}</Button>}
        </div>
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} kinds={["image"]} title={t("Choisir une photo du projet", "Choose a project photo")} onPick={(list) => { if (list[0]) setF({ ...f, photo: list[0].id }); setPicker(false); }} />
    </Modal>
  );
}
