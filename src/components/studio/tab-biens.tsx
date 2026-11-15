"use client";
/**
 * Onglet « Biens » (thème Maison & Horizon, issue #172) : les maisons et appartements à vendre ou à louer du projet.
 * Biens → Ajouter → saisir → photos → prévisualiser → enregistrer / publier → exporter.
 * Une fiche par bien, saisie une fois : l'accueil, les listes Acheter / Louer, la carte, la fiche, les favoris et les
 * biens similaires du site la lisent toute seule. Les contrôles (photos du projet, champs requis pour publier, états
 * vendu / loué) sont faits par le serveur (src/lib/biens.ts) ; ici, on affiche ses messages tels quels.
 */
import { cloneElement, useEffect, useId, useState, type ReactElement, type ReactNode } from "react";
import { Archive, ArrowDown, ArrowUp, Check, Eye, ImagePlus, KeyRound, Map as MapIcon, Plus, RotateCcw, Save, Send, Trash2, Undo2 } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Modal, Select, Spinner, Textarea, useApi, useToast } from "../ui";
import { useT } from "../i18n";
import { useProject } from "./project-context";
import { MediaPicker, type AssetView } from "./common";

type Photo = { assetId: string; alt: string };
type Data = {
  title: string; headline: string; type: string; summary: string; description: string; city: string; postalCode: string; sector: string; address: string; addressVisibility: "secteur" | "exacte" | "masquee";
  price: number | null; rent: number | null; charges: number | null; deposit: number | null; fees: string; surface: number | null; land: number | null; rooms: number | null; bedrooms: number | null; floor: string;
  furnished: boolean | null; exteriors: string[]; pool: boolean; features: string[]; availability: string; dpe: string | null; ges: string | null; propertyTax: string; photos: Photo[]; plan: Photo | null;
  neighborhood: { text: string; photos: Photo[]; places: { label: string; detail: string }[] }; map: { x: number; y: number } | null; featured: boolean; exceptional: boolean; demo: boolean;
};
type Bien = { id: string; ref: string; handle: string; transaction: "vente" | "location"; status: Status; position: number; data: Data; missing: string[]; updatedAt: number };
type Status = "draft" | "published" | "withdrawn" | "sold" | "rented" | "archived";

const STATUS: Record<Status, { fr: string; en: string; tone: "neutral" | "ok" | "warn" | "info" | "bad" }> = {
  draft: { fr: "Brouillon", en: "Draft", tone: "neutral" },
  published: { fr: "En ligne", en: "Live", tone: "ok" },
  withdrawn: { fr: "Retiré de l'affichage", en: "Hidden", tone: "warn" },
  sold: { fr: "Vendu (affiché)", en: "Sold (shown)", tone: "info" },
  rented: { fr: "Loué (affiché)", en: "Let (shown)", tone: "info" },
  archived: { fr: "Archivé", en: "Archived", tone: "neutral" },
};
const TYPES: [string, string, string][] = [["maison", "Maison", "House"], ["appartement", "Appartement", "Apartment"], ["villa", "Villa", "Villa"], ["loft", "Loft", "Loft"], ["propriete", "Propriété", "Estate"], ["mas", "Mas", "Farmhouse"], ["terrain", "Terrain", "Land"], ["autre", "Autre", "Other"]];
const EXTERIORS: [string, string, string][] = [["jardin", "Jardin", "Garden"], ["terrasse", "Terrasse", "Terrace"], ["balcon", "Balcon", "Balcony"], ["cour", "Cour", "Courtyard"]];
const CLASSES = ["A", "B", "C", "D", "E", "F", "G"];
/** Champ du formulaire : libellé relié à sa saisie (lecteurs d'écran, clic sur le libellé). */
function Fld({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return <Field label={label} hint={hint} htmlFor={id}>{cloneElement(children, { id })}</Field>;
}
const thumb = (assetId: string) => `/api/files/${assetId}?thumb=1`;
const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/\s/g, "").replace(",", ".")));
const euros = (n: number | null) => (n == null ? "" : `${n.toLocaleString("fr-FR")} €`);

export default function TabBiens() {
  const t = useT();
  const toast = useToast();
  const { id, data: project } = useProject();
  const [archives, setArchives] = useState(false);
  const { data, loading, reload } = useApi<{ biens: Bien[] }>(`/api/projects/${id}/biens${archives ? "?archives=1" : ""}`);
  const [editing, setEditing] = useState<Bien | null>(null);
  const [adding, setAdding] = useState(false);
  const biens = data?.biens ?? [];
  // Site hébergé par le studio (#234) : ce qui change ici n'apparaît en ligne qu'après une nouvelle publication.
  const { data: site, reload: reloadSite } = useApi<{ live: { number: number } | null; freshness: { upToDate: boolean; changedBiens: number } }>(`/api/projects/${id}/site-publication`);
  const versionId = project?.theme?.versionId ?? null;
  const preview = (b: Bien) => (versionId ? `/preview/${id}/v/${versionId}/pages/bien/${b.handle}${["published", "sold", "rented"].includes(b.status) ? "" : `?es_bien=${b.id}`}` : null);

  const move = async (b: Bien, dir: -1 | 1) => {
    const ids = biens.map((x) => x.id); const i = ids.indexOf(b.id), j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await api(`/api/projects/${id}/biens/ordre`, { body: { ids } }); reload(); reloadSite(); } catch (e) { toast("bad", (e as Error).message); }
  };
  const setStatus = async (b: Bien, status: Status) => {
    try { await api(`/api/projects/${id}/biens/${b.id}`, { method: "PATCH", body: { status } }); toast("ok", t(`« ${b.data.title || b.ref} » : ${STATUS[status].fr.toLowerCase()}.`, `“${b.data.title || b.ref}”: ${STATUS[status].en.toLowerCase()}.`)); reload(); reloadSite(); }
    catch (e) { toast("bad", (e as Error).message); }
  };

  return (
    <div className="mx-auto max-w-6xl">
      {site?.live && !site.freshness.upToDate && (
        <p className="mb-4 rounded-xl bg-warn-soft p-3 text-sm text-warn" data-biens-pending>
          {t(`Votre site en ligne (publication ${site.live.number}) n'affiche pas encore ces changements${site.freshness.changedBiens ? ` (${site.freshness.changedBiens} bien(s) modifié(s))` : ""} : ils sont visibles dans l'aperçu. Publiez une nouvelle version depuis l'onglet Site, « Publier votre site ».`, `Your live site (publication ${site.live.number}) doesn't show these changes yet${site.freshness.changedBiens ? ` (${site.freshness.changedBiens} propert(ies) changed)` : ""}: they're visible in the preview. Publish a new version from the Website tab, “Publish your site”.`)}
          {" "}<a className="underline" href={`/studio/${id}/boutique`}>{t("Aller à l'onglet Site", "Go to the Website tab")}</a>
        </p>
      )}
      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-semibold">{t("Vos biens à vendre et à louer", "Your properties for sale and rent")}</p>
            <p className="mt-1 text-sm text-muted">{t("Ajoutez un bien, saisissez sa fiche et ses photos, prévisualisez-le puis publiez-le : l'accueil, les pages Acheter et Louer, la carte, la fiche et les favoris du site le montrent tout seuls, sans toucher au thème.", "Add a property, fill in its listing and photos, preview it, then publish: the home page, Buy and Rent pages, map, listing and favourites show it by themselves, without touching the theme.")}</p>
            <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {[t("1. Ajouter", "1. Add"), t("2. Saisir", "2. Fill in"), t("3. Photos", "3. Photos"), t("4. Prévisualiser", "4. Preview"), t("5. Enregistrer ou publier", "5. Save or publish"), t("6. Exporter (onglet Site)", "6. Export (Website tab)")].map((x) => <li key={x}>{x}</li>)}
            </ol>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Archive className="size-4" />} onClick={() => setArchives((v) => !v)} aria-pressed={archives}>{archives ? t("Masquer les archives", "Hide archives") : t("Voir les archives", "Show archives")}</Button>
            <Button variant="signal" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>{t("Ajouter un bien", "Add a property")}</Button>
          </div>
        </div>
        {project?.theme?.direction !== "maison-horizon" && <p className="mt-4 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">{t("Le thème actuel du site n'affiche pas les biens : choisissez « Maison & Horizon » dans l'onglet Site pour les voir en ligne.", "The current site theme doesn't show properties: choose “Maison & Horizon” in the Website tab to see them online.")}</p>}
      </Card>

      {loading && !data ? <div className="grid place-items-center py-20"><Spinner /></div> : !biens.length ? (
        <Empty icon={<KeyRound className="size-6" />} title={t("Aucun bien pour l'instant", "No property yet")} action={<Button variant="signal" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>{t("Ajouter un bien", "Add a property")}</Button>}>{t("Ajoutez votre premier bien : il reste en brouillon tant que vous ne le publiez pas.", "Add your first property: it stays a draft until you publish it.")}</Empty>
      ) : (
        <ul className="grid gap-3">
          {biens.map((b, i) => {
            const st = STATUS[b.status]; const cover = b.data.photos[0];
            const amount = b.transaction === "vente" ? euros(b.data.price) : b.data.rent != null ? `${euros(b.data.rent)} ${t("/ mois HC", "/ month excl.")}` : "";
            const href = preview(b);
            return (
              <li key={b.id}>
                <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-paper-2 sm:w-36">{cover ? <img src={thumb(cover.assetId)} alt={cover.alt} className="size-full object-cover" /> : <span className="grid size-full place-items-center text-xs text-muted">{t("Sans photo", "No photo")}</span>}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={st.tone} dot>{t(st.fr, st.en)}</Badge>
                      <Badge>{b.transaction === "vente" ? t("À vendre", "For sale") : t("À louer", "For rent")}</Badge>
                      <span className="text-xs text-muted">{b.ref}</span>
                      {b.data.demo && <Badge tone="warn">{t("Exemple", "Example")}</Badge>}
                      {b.data.type !== "terrain" && (!b.data.dpe || !b.data.ges) && <span title={t("Obligatoires dans une annonce : le site hébergé ne se publiera pas sans eux.", "Required in a listing: the hosted site won't publish without them.")}><Badge tone="warn">{t("DPE / GES à renseigner", "DPE / GES missing")}</Badge></span>}
                    </div>
                    <p className="mt-1 truncate font-semibold">{b.data.headline || b.data.title || t("Sans titre", "Untitled")}</p>
                    <p className="text-sm text-muted">{[b.data.city, amount, b.data.surface ? `${b.data.surface} m²` : "", t(`${b.data.photos.length} photo(s)`, `${b.data.photos.length} photo(s)`)].filter(Boolean).join(" · ")}</p>
                    {!!b.missing.length && b.status === "draft" && <p className="mt-1 text-xs text-warn">{t("Pour publier, il manque : ", "To publish, add: ")}{b.missing.join(", ")}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="ghost" aria-label={t("Monter", "Move up")} disabled={i === 0} onClick={() => move(b, -1)} icon={<ArrowUp className="size-4" />} />
                    <Button size="sm" variant="ghost" aria-label={t("Descendre", "Move down")} disabled={i === biens.length - 1} onClick={() => move(b, 1)} icon={<ArrowDown className="size-4" />} />
                    {href && <a href={href} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:border-ink"><Eye className="size-3.5" />{t("Prévisualiser", "Preview")}</a>}
                    <Button size="sm" variant="secondary" onClick={() => setEditing(b)}>{t("Modifier", "Edit")}</Button>
                    {(b.status === "draft" || b.status === "withdrawn") && <Button size="sm" variant="signal" icon={<Send className="size-3.5" />} onClick={() => setStatus(b, "published")}>{t("Publier", "Publish")}</Button>}
                    {b.status === "published" && <Button size="sm" variant="secondary" icon={<Undo2 className="size-3.5" />} onClick={() => setStatus(b, "withdrawn")}>{t("Retirer", "Hide")}</Button>}
                    {b.status === "published" && <Button size="sm" variant="secondary" icon={<Check className="size-3.5" />} onClick={() => setStatus(b, b.transaction === "vente" ? "sold" : "rented")}>{b.transaction === "vente" ? t("Vendu", "Sold") : t("Loué", "Let")}</Button>}
                    {(b.status === "sold" || b.status === "rented") && <Button size="sm" variant="secondary" icon={<RotateCcw className="size-3.5" />} onClick={() => setStatus(b, "published")}>{b.transaction === "vente" ? t("Remettre en vente", "Back on market") : t("Remettre en location", "Back on market")}</Button>}
                    {b.status !== "archived" ? <Button size="sm" variant="ghost" aria-label={t("Archiver", "Archive")} icon={<Archive className="size-4" />} onClick={() => setStatus(b, "archived")} /> : <Button size="sm" variant="secondary" onClick={() => setStatus(b, "draft")}>{t("Sortir des archives", "Unarchive")}</Button>}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">{t("Rien n'est jamais effacé : « Archiver » retire le bien de tout affichage et le garde ici. « Retirer » le cache du site sans le perdre.", "Nothing is ever deleted: “Archive” removes the property from every page and keeps it here. “Hide” takes it off the site without losing it.")}</p>

      <AddBien open={adding} onClose={() => setAdding(false)} onCreated={(b) => { setAdding(false); reload(); setEditing(b); }} />
      {editing && <EditBien key={editing.id} bien={editing} onClose={() => setEditing(null)} onSaved={(b) => { reload(); reloadSite(); setEditing(b); }} preview={preview(editing)} />}
    </div>
  );
}

function AddBien({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (b: Bien) => void }) {
  const t = useT(); const toast = useToast(); const { id } = useProject();
  const [transaction, setTransaction] = useState<"vente" | "location">("vente");
  const [title, setTitle] = useState(""); const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try { const r = await api<{ bien: Bien }>(`/api/projects/${id}/biens`, { body: { transaction, data: { title } } }); setTitle(""); onCreated(r.bien); }
    catch (e) { toast("bad", (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={t("Ajouter un bien", "Add a property")}>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("Transaction", "Transaction")}>
          {(["vente", "location"] as const).map((x) => <button key={x} type="button" role="radio" aria-checked={transaction === x} onClick={() => setTransaction(x)} className={cx("rounded-2xl border-2 p-4 text-left text-sm", transaction === x ? "border-signal" : "border-line")}>{x === "vente" ? t("À vendre", "For sale") : t("À louer", "For rent")}</button>)}
        </div>
        <Fld label={t("Titre du bien (facultatif)", "Property title (optional)")} hint={t("Ex. « Maison avec jardin ». Une référence (V-0001, L-0001…) est attribuée d'office.", "E.g. “House with garden”. A reference (V-0001, L-0001…) is assigned automatically.")}><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Fld>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t("Annuler", "Cancel")}</Button><Button variant="signal" loading={busy} onClick={create}>{t("Créer le brouillon", "Create draft")}</Button></div>
      </div>
    </Modal>
  );
}

function EditBien({ bien, onClose, onSaved, preview }: { bien: Bien; onClose: () => void; onSaved: (b: Bien) => void; preview: string | null }) {
  const t = useT(); const toast = useToast(); const { id } = useProject();
  const [d, setD] = useState<Data>(bien.data);
  const [transaction, setTransaction] = useState(bien.transaction);
  const [picker, setPicker] = useState<null | "photos" | "plan" | "hood">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setD(bien.data); setTransaction(bien.transaction); }, [bien]);
  const set = <K extends keyof Data>(k: K, v: Data[K]) => setD((x) => ({ ...x, [k]: v }));
  const live = ["published", "sold", "rented"].includes(bien.status);
  const save = async (publish?: boolean) => {
    setBusy(true); setError(null);
    try {
      const r = await api<{ bien: Bien }>(`/api/projects/${id}/biens/${bien.id}`, { method: "PATCH", body: { transaction, data: d, ...(publish ? { status: "published" } : {}) } });
      toast("ok", publish ? t("Bien publié : le site l'affiche.", "Property published: the site shows it.") : t("Fiche enregistrée.", "Listing saved."));
      onSaved(r.bien);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const movePhoto = (i: number, dir: -1 | 1) => { const p = [...d.photos]; const j = i + dir; if (j < 0 || j >= p.length) return; [p[i], p[j]] = [p[j], p[i]]; set("photos", p); };
  const addPhotos = (list: AssetView[]) => {
    const have = new Set(d.photos.map((p) => p.assetId));
    const fresh = list.filter((a) => !have.has(a.id)).map((a) => ({ assetId: a.id, alt: "" }));
    if (fresh.length < list.length) toast("info", t("Une photo déjà présente n'a pas été ajoutée une seconde fois.", "A photo already in the listing wasn't added twice."));
    set("photos", [...d.photos, ...fresh]);
  };
  const numField = (k: "price" | "rent" | "charges" | "deposit" | "surface" | "land" | "rooms" | "bedrooms", label: string, hint?: string) => (
    <Fld label={label} hint={hint}><Input inputMode="decimal" value={d[k] ?? ""} onChange={(e) => set(k, num(e.target.value) as never)} /></Fld>
  );
  return (
    <Modal open onClose={onClose} title={`${bien.ref} — ${d.headline || d.title || t("Nouveau bien", "New property")}`} xl>
      <div className="grid gap-6">
        {live && <p className="rounded-xl bg-info-soft px-3 py-2 text-sm text-info">{t("Ce bien est en ligne : ses champs essentiels doivent rester remplis pour enregistrer. Son adresse sur le site ne change pas.", "This property is live: its essential fields must stay filled to save. Its address on the site doesn't change.")}</p>}
        <section className="grid gap-4 sm:grid-cols-2">
          <Fld label={t("Transaction", "Transaction")}><Select value={transaction} onChange={(e) => setTransaction(e.target.value as never)} disabled={live}><option value="vente">{t("À vendre", "For sale")}</option><option value="location">{t("À louer", "For rent")}</option></Select></Fld>
          <Fld label={t("Type de bien", "Property type")}><Select value={d.type} onChange={(e) => set("type", e.target.value)}>{TYPES.map(([v, fr, en]) => <option key={v} value={v}>{t(fr, en)}</option>)}</Select></Fld>
          <Fld label={t("Titre (cartes et listes) *", "Title (cards and lists) *")}><Input value={d.title} maxLength={120} onChange={(e) => set("title", e.target.value)} /></Fld>
          <Fld label={t("Titre de la fiche (facultatif)", "Listing headline (optional)")} hint={t("Ex. « Une maison ouverte sur le jardin ».", "E.g. “A house open onto the garden”.")}><Input value={d.headline} maxLength={140} onChange={(e) => set("headline", e.target.value)} /></Fld>
          <Fld label={t("Accroche (une phrase)", "Summary (one sentence)")}><Input value={d.summary} maxLength={180} onChange={(e) => set("summary", e.target.value)} /></Fld>
          <Fld label={t("Ville *", "City *")} hint={t("Ex. « Lyon 6e » : les arrondissements comptent comme la même ville pour les biens similaires.", "E.g. “Lyon 6e”: districts count as the same city for similar listings.")}><Input value={d.city} maxLength={80} onChange={(e) => set("city", e.target.value)} /></Fld>
          <Fld label={t("Code postal", "Postcode")}><Input value={d.postalCode} maxLength={12} onChange={(e) => set("postalCode", e.target.value)} /></Fld>
          <Fld label={t("Secteur ou quartier", "Area")}><Input value={d.sector} maxLength={80} onChange={(e) => set("sector", e.target.value)} /></Fld>
          <Fld label={t("Adresse", "Address")}><Input value={d.address} maxLength={160} onChange={(e) => set("address", e.target.value)} /></Fld>
          <Fld label={t("Adresse affichée sur le site", "Address shown on the site")}><Select value={d.addressVisibility} onChange={(e) => set("addressVisibility", e.target.value as never)}><option value="secteur">{t("Ville et secteur seulement", "City and area only")}</option><option value="exacte">{t("Adresse exacte", "Exact address")}</option><option value="masquee">{t("Rien", "Nothing")}</option></Select></Fld>
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          {transaction === "vente" ? numField("price", t("Prix (€) *", "Price (€) *")) : <>{numField("rent", t("Loyer hors charges (€ / mois) *", "Rent excl. charges (€ / month) *"))}{numField("charges", t("Charges (€ / mois)", "Charges (€ / month)"))}{numField("deposit", t("Dépôt de garantie (€)", "Deposit (€)"))}</>}
          <Fld label={t("Honoraires", "Fees")} hint={t("Vide : « À préciser ».", "Empty: “To be specified”.")}><Input value={d.fees} maxLength={200} onChange={(e) => set("fees", e.target.value)} /></Fld>
          {numField("surface", t("Surface habitable (m²) *", "Living area (m²) *"))}
          {numField("land", t("Terrain (m²)", "Land (m²)"))}
          {numField("rooms", t("Pièces", "Rooms"))}
          {numField("bedrooms", t("Chambres", "Bedrooms"))}
          <Fld label={t("Étage", "Floor")}><Input value={d.floor} maxLength={40} onChange={(e) => set("floor", e.target.value)} /></Fld>
          <Fld label={t("Meublé", "Furnished")}><Select value={d.furnished == null ? "" : d.furnished ? "1" : "0"} onChange={(e) => set("furnished", e.target.value === "" ? null : e.target.value === "1")}><option value="">{t("Non précisé", "Not specified")}</option><option value="1">{t("Oui", "Yes")}</option><option value="0">{t("Non", "No")}</option></Select></Fld>
          <Fld label={t("Disponibilité", "Availability")}><Input value={d.availability} maxLength={60} onChange={(e) => set("availability", e.target.value)} /></Fld>
          <Fld label={t("Taxe foncière", "Property tax")}><Input value={d.propertyTax} maxLength={60} onChange={(e) => set("propertyTax", e.target.value)} /></Fld>
          <Fld label="DPE"><Select value={d.dpe ?? ""} onChange={(e) => set("dpe", e.target.value || null)}><option value="">{t("À renseigner", "To be filled")}</option>{CLASSES.map((c) => <option key={c}>{c}</option>)}</Select></Fld>
          <Fld label="GES"><Select value={d.ges ?? ""} onChange={(e) => set("ges", e.target.value || null)}><option value="">{t("À renseigner", "To be filled")}</option>{CLASSES.map((c) => <option key={c}>{c}</option>)}</Select></Fld>
        </section>
        <section className="grid gap-3">
          <p className="text-sm font-medium">{t("Extérieurs et piscine (filtres du site)", "Outdoor space and pool (site filters)")}</p>
          <div className="flex flex-wrap gap-2">
            {EXTERIORS.map(([v, fr, en]) => { const on = d.exteriors.includes(v); return <button key={v} type="button" aria-pressed={on} onClick={() => set("exteriors", on ? d.exteriors.filter((x) => x !== v) : [...d.exteriors, v])} className={cx("rounded-full border px-3 py-1 text-sm", on ? "border-signal bg-signal-soft" : "border-line")}>{t(fr, en)}</button>; })}
            <button type="button" aria-pressed={d.pool} onClick={() => set("pool", !d.pool)} className={cx("rounded-full border px-3 py-1 text-sm", d.pool ? "border-signal bg-signal-soft" : "border-line")}>{t("Piscine", "Pool")}</button>
          </div>
          <Fld label={t("Équipements (un par ligne)", "Features (one per line)")}><Textarea autoGrow value={d.features.join("\n")} onChange={(e) => set("features", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 40))} /></Fld>
          <Fld label={t("Description (paragraphes séparés par une ligne vide)", "Description (paragraphs separated by a blank line)")}><Textarea autoGrow value={d.description} maxLength={6000} onChange={(e) => set("description", e.target.value)} /></Fld>
        </section>
        <section className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{t(`Photos (${d.photos.length}) * — la première est la photo de couverture`, `Photos (${d.photos.length}) * — the first one is the cover`)}</p><Button size="sm" variant="secondary" icon={<ImagePlus className="size-4" />} onClick={() => setPicker("photos")}>{t("Ajouter des photos du projet", "Add project photos")}</Button></div>
          {!d.photos.length && <p className="text-sm text-muted">{t("Les photos viennent des médias de ce projet (onglet Images ou Fichiers). Une même photo ne peut pas servir deux fois.", "Photos come from this project's media (Images or Files tab). The same photo can't be used twice.")}</p>}
          <ul className="grid gap-2">
            {d.photos.map((p, i) => (
              <li key={p.assetId} className="flex items-center gap-3 rounded-xl border border-line p-2">
                <img src={thumb(p.assetId)} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                {i === 0 && <Badge tone="signal">{t("Couverture", "Cover")}</Badge>}
                <Input className="flex-1" value={p.alt} maxLength={200} placeholder={t("Description de la photo (lecteurs d'écran, référencement)", "Photo description (screen readers, SEO)")} onChange={(e) => set("photos", d.photos.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} aria-label={t(`Description de la photo ${i + 1}`, `Description of photo ${i + 1}`)} />
                <Button size="sm" variant="ghost" aria-label={t("Monter", "Move up")} disabled={i === 0} onClick={() => movePhoto(i, -1)} icon={<ArrowUp className="size-4" />} />
                <Button size="sm" variant="ghost" aria-label={t("Descendre", "Move down")} disabled={i === d.photos.length - 1} onClick={() => movePhoto(i, 1)} icon={<ArrowDown className="size-4" />} />
                <Button size="sm" variant="ghost" aria-label={t("Retirer la photo de la fiche", "Remove photo from listing")} onClick={() => set("photos", d.photos.filter((_, j) => j !== i))} icon={<Trash2 className="size-4" />} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium">{t("Plan (facultatif)", "Floor plan (optional)")}</p>
            {d.plan ? <><img src={thumb(d.plan.assetId)} alt="" className="h-14 w-24 rounded-lg bg-white object-contain" /><Button size="sm" variant="ghost" onClick={() => set("plan", null)}>{t("Retirer", "Remove")}</Button></> : <Button size="sm" variant="secondary" onClick={() => setPicker("plan")}>{t("Choisir un plan", "Choose a plan")}</Button>}
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-2">
          <Fld label={t("Le quartier (texte)", "The neighbourhood (text)")}><Textarea autoGrow value={d.neighborhood.text} maxLength={1200} onChange={(e) => set("neighborhood", { ...d.neighborhood, text: e.target.value })} /></Fld>
          <div className="grid gap-2">
            <p className="text-sm font-medium">{t("Lieux proches (un par ligne : lieu | précision)", "Nearby places (one per line: place | detail)")}</p>
            <Textarea autoGrow value={d.neighborhood.places.map((x) => (x.detail ? `${x.label} | ${x.detail}` : x.label)).join("\n")} onChange={(e) => set("neighborhood", { ...d.neighborhood, places: e.target.value.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((x) => x[0]).slice(0, 6).map(([label, detail]) => ({ label, detail: detail ?? "" })) })} />
            <div className="flex flex-wrap items-center gap-2">
              {d.neighborhood.photos.map((p, i) => <span key={p.assetId} className="relative"><img src={thumb(p.assetId)} alt="" className="h-12 w-16 rounded-lg object-cover" /><button type="button" className="absolute -right-1 -top-1 rounded-full bg-card px-1 text-xs" aria-label={t("Retirer", "Remove")} onClick={() => set("neighborhood", { ...d.neighborhood, photos: d.neighborhood.photos.filter((_, j) => j !== i) })}>×</button></span>)}
              {d.neighborhood.photos.length < 4 && <Button size="sm" variant="secondary" onClick={() => setPicker("hood")}>{t("Photos du quartier", "Neighbourhood photos")}</Button>}
            </div>
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3 flex items-center gap-2 text-sm font-medium"><MapIcon className="size-4" />{t("Position sur la carte illustrative (0 à 100) — ce n'est pas une géolocalisation", "Position on the illustrative map (0 to 100) — not a geolocation")}</div>
          <Fld label={t("Horizontal (%)", "Horizontal (%)")}><Input inputMode="numeric" value={d.map?.x ?? ""} onChange={(e) => { const x = num(e.target.value); set("map", x == null ? null : { x: Math.max(0, Math.min(100, x)), y: d.map?.y ?? 50 }); }} /></Fld>
          <Fld label={t("Vertical (%)", "Vertical (%)")}><Input inputMode="numeric" value={d.map?.y ?? ""} onChange={(e) => { const y = num(e.target.value); set("map", y == null ? null : { x: d.map?.x ?? 50, y: Math.max(0, Math.min(100, y)) }); }} /></Fld>
          <div className="flex flex-wrap items-end gap-2">
            {([["featured", t("À la une (accueil)", "Featured (home)")], ["exceptional", t("Bien d'exception", "Exceptional property")], ["demo", t("Exemple de démonstration", "Demo example")]] as const).map(([k, label]) => <button key={k} type="button" aria-pressed={d[k]} onClick={() => set(k, !d[k])} className={cx("rounded-full border px-3 py-1 text-sm", d[k] ? "border-signal bg-signal-soft" : "border-line")}>{label}</button>)}
          </div>
        </section>
        {error && <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {preview && <a href={preview} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm hover:border-ink"><Eye className="size-4" />{t("Prévisualiser (version enregistrée)", "Preview (saved version)")}</a>}
          <Button variant="secondary" icon={<Save className="size-4" />} loading={busy} onClick={() => save()}>{t("Enregistrer", "Save")}</Button>
          {!live && <Button variant="signal" icon={<Send className="size-4" />} loading={busy} onClick={() => save(true)}>{t("Enregistrer et publier", "Save and publish")}</Button>}
        </div>
      </div>
      <MediaPicker open={picker !== null} onClose={() => setPicker(null)} multiple={picker !== "plan"} kinds={["image"]} title={picker === "plan" ? t("Choisir le plan", "Choose the plan") : t("Choisir des photos du projet", "Choose project photos")} onPick={(list) => {
        if (picker === "photos") addPhotos(list);
        else if (picker === "plan" && list[0]) set("plan", { assetId: list[0].id, alt: "" });
        else if (picker === "hood") set("neighborhood", { ...d.neighborhood, photos: [...d.neighborhood.photos, ...list.filter((a) => !d.neighborhood.photos.some((p) => p.assetId === a.id)).map((a) => ({ assetId: a.id, alt: "" }))].slice(0, 4) });
        setPicker(null);
      }} />
    </Modal>
  );
}
