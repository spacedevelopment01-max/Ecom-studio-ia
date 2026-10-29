"use client";
/**
 * Onglet « Catalogue » (mission #190, point 5) : les fiches produits du Studio — nom, description, photos, prix,
 * options et variantes (référence, prix, stock), catégories, informations de plateforme, mise en page de la fiche — et
 * les boutiques connectées (Shopify, WooCommerce, PrestaShop) : envoi, mise à jour sans doublon, import des produits
 * existants. Règles et contrôles côté serveur (src/lib/products/).
 */
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Archive, Boxes, Eye, ImagePlus, Plug, Plus, RefreshCw, Download, Trash2, Unplug } from "lucide-react";
import { api, Badge, Button, Card, Empty, Field, Input, Modal, Select, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { MediaPicker } from "./common";
import { useT } from "../i18n";
import {useAgentFocus,useAgentPanel,useAgentUi} from './agent-ui-context';

type Variant = { id: string; options: string[]; sku: string; price: number | null; compareAt: number | null; stock: number | null; stockPolicy: "deny" | "continue"; image: string | null; barcode: string; weightGrams: number | null };
type Data = { title: string; description_html: string; vendor: string; productType: string; categories: string[]; tags: string[]; images: { assetId: string; file?: string; alt: string }[]; price: number | null; compareAt: number | null; currency: string; options: { name: string; values: string[] }[]; seo: { title: string; description: string }; templateSuffix: string; weightGrams: number | null; barcode: string };
type Product = { id: string; handle: string; status: "active" | "draft" | "archived"; version: number; data: Data; variants: Variant[]; images: { assetId: string; url: string; alt: string }[]; links: { platform: string; store: string; remoteId: string; syncedAt: number }[] };
type Line = { product: string; title: string; action: string; remoteId?: string; stock: { variant: string; studio: number | null; store: number | null; result: number | null; rule: string }[]; warnings: string[]; error?: string };
type Report = { at: number; platform: string; store: string; lines: Line[]; counts: Record<string, number> };
type Store = { id: string; platform: "shopify" | "woocommerce" | "prestashop"; url: string; store: string; lastSyncAt: number | null; lastReport: Report | null; linked: number };
type View = { services: boolean; products: Product[]; stores: Store[]; templates: string[] };

const currencyLabel=(currency:string)=>currency==='EUR'?'€':currency;
const PLATFORM = { shopify: "Shopify", woocommerce: "WooCommerce", prestashop: "PrestaShop" } as const;
const euros = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ","));
const cents = (s: string) => { const v = s.replace(/\s|€/g, "").replace(",", "."); if (!v) return null; const n = Math.round(Number(v) * 100); return Number.isFinite(n) && n >= 0 ? n : null; };
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function TabCatalogue() {
  const { id,data:overview } = useProject();
  const {setFocus}=useAgentFocus(),{setOpen}=useAgentPanel(),agentUi=useAgentUi();
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<View>(`/api/projects/${id}/products`);
  useEffect(()=>{
    const changed=(event:Event)=>{if(event instanceof CustomEvent&&event.detail?.projectId===id)void reload();};
    window.addEventListener('studio:catalogue-changed',changed);
    return()=>window.removeEventListener('studio:catalogue-changed',changed);
  },[id,reload]);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  if (!data) return null;
  if (data.services) return <Card className="p-6"><Empty icon={<Boxes className="size-6" />} title={t("Ce site présente des prestations", "This website presents services")}>{t("Un site de services ne vend pas de produits : les prestations se règlent dans « Activité » et « Rendez-vous ».", "A services website doesn't sell products: services are set in “Business” and “Bookings”.")}</Empty></Card>;
  const patch = async (b: Record<string, unknown>) => { try { await api(`/api/projects/${id}/products`, { method: "PATCH", body: b }); reload(); } catch (e) { toast("bad", (e as Error).message); } };
  const sync = async (store: Store, action: "push" | "import") => {
    setBusy(`${action}:${store.id}`);
    try { const r = await api<{ report: Report }>(`/api/projects/${id}/products/sync`, { method: "POST", body: { store: store.id, action } }); setReport(r.report); reload(); }
    catch (e) { toast("bad", (e as Error).message); }
    setBusy(null);
  };
  const stockOf = (p: Product) => (p.variants.every((v) => v.stock === null) ? null : p.variants.reduce((n, v) => n + (v.stock ?? 0), 0));
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-semibold">{t("Catalogue", "Catalog")}</h2>
            <p className="mt-1 text-sm text-muted">{t("Chaque produit se saisit une fois ici : photos, prix, options et variantes avec leur référence et leur stock. La boutique, ses exports et vos boutiques connectées utilisent ces fiches. Le thème n'est pas modifié.", "Each product is entered once here: photos, prices, options and variants with their SKU and stock. The store, its exports and your connected stores use these listings. The theme isn't changed.")}</p>
          </div>
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>{t("Ajouter un produit", "Add a product")}</Button>
        </div>
        <div className="mt-5 grid min-w-0 grid-cols-1 gap-3">
          {!data.products.length && <Empty icon={<Boxes className="size-6" />} title={t("Aucun produit", "No products")}>{t("Ajoutez votre premier produit, ou importez ceux d'une boutique connectée.", "Add your first product, or import those of a connected store.")}</Empty>}
          {data.products.map((p, i) => {
            const stock = stockOf(p);
            return (
              <div key={p.id} data-catalogue-product={p.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line p-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="aspect-square w-20 shrink-0 overflow-hidden rounded-xl bg-paper-2">{p.images[0] ? <img src={p.images[0].url} alt={p.images[0].alt} className="size-full object-cover" /> : <span className="grid size-full place-items-center text-xs text-muted">{t("Sans photo", "No photo")}</span>}</div>
                <div data-catalogue-product-details className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="max-w-full truncate font-semibold">{p.data.title}</p>{p.status === "draft" && <Badge tone="warn">{t("Brouillon", "Draft")}</Badge>}{p.links.map((l) => <Badge key={l.platform + l.store} tone="ok">{PLATFORM[l.platform as keyof typeof PLATFORM]} · {l.store}</Badge>)}</div>
                  <p className="break-words text-sm text-muted">{[p.data.price !== null ? `${euros(p.data.price)} ${currencyLabel(p.data.currency)}` : t("Prix à renseigner", "Price to enter"), t(`${p.variants.length} variante(s)`, `${p.variants.length} variant(s)`), stock === null ? t("stock non suivi", "stock not tracked") : t(`stock ${stock}`, `stock ${stock}`), p.data.categories.join(", ")].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex w-full flex-wrap gap-1">
                  {agentUi&&overview?.conversationCatalogue&&<Button size="sm" variant="secondary" onClick={()=>{setFocus({projectId:id,tab:'catalogue',label:p.data.title,target:{kind:'catalogue-product',productId:p.id,version:p.version}});setOpen(true);}}>{t('Désigner pour SYNA','Select for SYNA')}</Button>}
                  {p.status==='active'?<a className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-sm hover:bg-paper-2" href={`/preview/${id}/v/current/products/${p.handle}`} target="_blank" rel="noreferrer"><Eye className="size-4" />{t("Voir la fiche", "View page")}</a>:<span className="inline-flex min-h-9 items-center px-3 text-xs text-muted">{t('Hors du Site actuel ; aperçu privé dans le reçu SYNA si disponible.','Outside the current Site; private preview in the SYNA receipt when available.')}</span>}
                  <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>{t("Modifier", "Edit")}</Button>
                  <Button size="sm" variant="ghost" aria-label={t("Monter", "Move up")} disabled={i === 0} onClick={() => patch({ id: p.id, move: "up" })} icon={<ArrowUp className="size-4" />} />
                  <Button size="sm" variant="ghost" aria-label={t("Descendre", "Move down")} disabled={i === data.products.length - 1} onClick={() => patch({ id: p.id, move: "down" })} icon={<ArrowDown className="size-4" />} />
                  <Button size="sm" variant="ghost" aria-label={t("Archiver", "Archive")} onClick={() => patch({ id: p.id, archive: true })} icon={<Archive className="size-4" />} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-semibold">{t("Boutiques connectées", "Connected stores")}</h2>
            <p className="mt-1 text-sm text-muted">{t("Envoyer crée les produits la première fois, puis les met à jour (jamais de doublon). Le stock n'est synchronisé qu'à chaque envoi : les ventes et modifications faites dans la boutique depuis le dernier envoi sont reprises, et vos changements du studio s'y ajoutent.", "Sending creates the products the first time, then updates them (never a duplicate). Stock is only synchronised when you send: sales and changes made in the store since the last send are kept, and your studio changes are added to them.")}</p>
            {/* Garanties réelles de src/lib/products/sync.ts (contre-vérification #195) : ne rien promettre de plus. */}
            <details className="mt-2 text-sm text-muted" data-stock-guarantees>
              <summary className="cursor-pointer font-medium text-ink">{t("Garanties et limites du stock", "Stock guarantees and limits")}</summary>
              <ul className="mt-2 grid list-disc gap-1.5 pl-5">
                <li>{t("Shopify : le studio envoie un ajustement (+3, −2…) et non une quantité ; une vente faite au même moment reste déduite.", "Shopify: the studio sends an adjustment (+3, −2…) rather than a quantity; a sale made at the same moment is still deducted.")}</li>
                <li>{t("WooCommerce et PrestaShop n'acceptent qu'une quantité totale : le studio la relit juste avant de l'envoyer, mais une vente passée pendant l'envoi lui-même peut ne pas être déduite. Le rapport le signale : vérifiez alors le stock dans la boutique.", "WooCommerce and PrestaShop only accept a total quantity: the studio re-reads it just before sending, but a sale made during the send itself may not be deducted. The report says so: then check the stock in the store.")}</li>
                <li>{t("Envoi resté sans réponse (coupure, délai dépassé) : il n'est jamais refait automatiquement. À l'envoi suivant, le studio reprend le stock affiché par la boutique ; s'il diffère de la quantité attendue, le rapport vous demande de vérifier le réassort.", "Send left without an answer (outage, timeout): it is never repeated automatically. On the next send, the studio takes the stock shown by the store; if it differs from the expected quantity, the report asks you to check the restock.")}</li>
                <li>{t("Premier envoi d'un produit qui existait déjà dans la boutique (même identifiant ou même référence) : le stock de la boutique est conservé et repris dans le studio.", "First send of a product that already existed in the store (same handle or same SKU): the store stock is kept and copied into the studio.")}</li>
                <li>{t("Une seule synchronisation à la fois par boutique : un second envoi attend la fin du premier, ou vous demande de réessayer quelques minutes plus tard. Il ne crée pas de doublon.", "One synchronisation at a time per store: a second send waits for the first to finish, or asks you to try again a few minutes later. It does not create a duplicate.")}</li>
              </ul>
            </details>
          </div>
          <Button variant="secondary" icon={<Plug className="size-4" />} onClick={() => setConnecting(true)}>{t("Connecter une boutique", "Connect a store")}</Button>
        </div>
        <div className="mt-4 grid gap-3">
          {!data.stores.length && <p className="text-sm text-muted">{t("Aucune boutique connectée. Les exports restent disponibles dans l'onglet Boutique.", "No store connected. Exports remain available in the Store tab.")}</p>}
          {data.stores.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 rounded-2xl border border-line p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="font-semibold">{PLATFORM[s.platform]} · {s.store}</p><p className="text-sm text-muted">{t(`${s.linked} produit(s) relié(s)`, `${s.linked} linked product(s)`)}{s.lastSyncAt ? ` · ${t("dernier échange", "last exchange")} ${new Date(s.lastSyncAt).toLocaleString()}` : ""}</p></div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" icon={<RefreshCw className="size-4" />} loading={busy === `push:${s.id}`} onClick={() => sync(s, "push")}>{t("Envoyer les produits", "Send products")}</Button>
                <Button size="sm" variant="secondary" icon={<Download className="size-4" />} loading={busy === `import:${s.id}`} onClick={() => sync(s, "import")}>{t("Importer ses produits", "Import its products")}</Button>
                {s.lastReport && <Button size="sm" variant="ghost" onClick={() => setReport(s.lastReport)}>{t("Dernier rapport", "Last report")}</Button>}
                <Button size="sm" variant="ghost" aria-label={t("Déconnecter", "Disconnect")} icon={<Unplug className="size-4" />} onClick={async () => { await api(`/api/projects/${id}/products/stores?id=${s.id}`, { method: "DELETE" }); reload(); }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {editing && <ProductEditor product={editing === "new" ? null : editing} templates={data.templates} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {connecting && <ConnectStore onClose={() => setConnecting(false)} onDone={() => { setConnecting(false); reload(); }} />}
      <Modal open={!!report} onClose={() => setReport(null)} title={t("Rapport d'échange", "Exchange report")} wide>
        {report && <ReportView report={report} />}
      </Modal>
    </div>
  );
}

function ReportView({ report }: { report: Report }) {
  const t = useT();
  const action: Record<string, string> = { created: t("créé", "created"), updated: t("mis à jour", "updated"), linked: t("relié à l'existant", "linked to existing"), unchanged: t("inchangé", "unchanged"), imported: t("importé", "imported"), error: t("erreur", "error") };
  const rule: Record<string, string> = { merged: t("vente et réassort additionnés", "sale and restock added"), store: t("stock de la boutique repris", "store stock kept"), "store-existing": t("stock de la boutique repris", "store stock kept"), studio: t("stock du studio envoyé", "studio stock sent"), new: t("stock du studio envoyé", "studio stock sent"), same: t("identique", "same"), untracked: t("non suivi", "not tracked") };
  return (
    <div className="grid gap-3 text-sm">
      <p className="text-muted">{PLATFORM[report.platform as keyof typeof PLATFORM]} · {report.store} — {Object.entries(report.counts).filter(([, n]) => n).map(([k, n]) => `${n} ${action[k]}`).join(", ")}</p>
      {report.lines.map((l, i) => (
        <div key={i} className="rounded-xl border border-line p-3">
          <p className="font-medium">{l.title} — <span className={l.action === "error" ? "text-bad" : ""}>{action[l.action]}</span>{l.remoteId ? ` (n° ${l.remoteId.split("/").pop()})` : ""}</p>
          {l.error && <p className="text-bad">{l.error}</p>}
          {l.stock.filter((s) => s.rule !== "same" && s.rule !== "untracked").map((s, k) => <p key={k} className="text-muted">{s.variant} : {t("studio", "studio")} {s.studio ?? "—"} · {t("boutique", "store")} {s.store ?? "—"} → {s.result ?? "—"} ({rule[s.rule] ?? s.rule})</p>)}
          {l.warnings.map((w, k) => <p key={k} className="text-warn">{w}</p>)}
        </div>
      ))}
    </div>
  );
}

function ConnectStore({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [f, setF] = useState({ platform: "woocommerce" as Store["platform"], url: "", key: "", secret: "", token: "" });
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title={t("Connecter une boutique", "Connect a store")}>
      <form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await api(`/api/projects/${id}/products/stores`, { method: "POST", body: f }); toast("ok", t("Boutique connectée : accès vérifiés.", "Store connected: access checked.")); onDone(); } catch (err) { toast("bad", (err as Error).message); } setBusy(false); }}>
        <Field label={t("Plateforme", "Platform")}><Select value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value as Store["platform"] })}>{Object.entries(PLATFORM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label={f.platform === "shopify" ? t("Adresse Shopify (nom.myshopify.com)", "Shopify address (name.myshopify.com)") : t("Adresse de la boutique (https://…)", "Store address (https://…)")}><Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} required /></Field>
        {f.platform === "shopify" ? (
          <Field label={t("Jeton d'accès de l'application Shopify", "Shopify app access token")} hint={t("Droits : write_products, write_inventory, read_locations. Une boutique reliée dans « Connexions » est utilisée par l'envoi Shopify sans ce jeton.", "Scopes: write_products, write_inventory, read_locations. A store linked in “Connections” is used by the Shopify send without this token.")}><Input type="password" autoComplete="off" value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} required /></Field>
        ) : (
          <>
            <Field label={f.platform === "woocommerce" ? t("Clé client (consumer key)", "Consumer key") : t("Clé du webservice", "Webservice key")} hint={f.platform === "woocommerce" ? t("WooCommerce › Réglages › Avancé › API REST, droits lecture/écriture.", "WooCommerce › Settings › Advanced › REST API, read/write.") : t("Paramètres avancés › Webservice : products, combinations, stock_availables, categories, images, product_options, product_option_values.", "Advanced parameters › Webservice: products, combinations, stock_availables, categories, images, product_options, product_option_values.")}><Input type="password" autoComplete="off" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} required /></Field>
            {f.platform === "woocommerce" && <Field label={t("Secret client (consumer secret)", "Consumer secret")}><Input type="password" autoComplete="off" value={f.secret} onChange={(e) => setF({ ...f, secret: e.target.value })} required /></Field>}
          </>
        )}
        <p className="text-xs text-muted">{t("Les accès sont essayés, puis enregistrés chiffrés. Ils ne sont plus jamais affichés.", "Access is tested, then stored encrypted. It is never shown again.")}</p>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>{t("Annuler", "Cancel")}</Button><Button type="submit" loading={busy}>{t("Connecter", "Connect")}</Button></div>
      </form>
    </Modal>
  );
}

function ProductEditor({ product, templates, onClose, onSaved }: { product: Product | null; templates: string[]; onClose: () => void; onSaved: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [d, setD] = useState<Data>(product?.data ?? { title: "", description_html: "", vendor: "", productType: "", categories: [], tags: [], images: [], price: null, compareAt: null, currency: "EUR", options: [], seo: { title: "", description: "" }, templateSuffix: "", weightGrams: null, barcode: "" });
  const [variants, setVariants] = useState<Variant[]>(product?.variants ?? []);
  const [status, setStatus] = useState(product?.status === "draft" ? "draft" : "active");
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Data>(k: K, v: Data[K]) => setD({ ...d, [k]: v });
  // Variantes affichées : combinaisons des options ; une ligne déjà saisie garde ses valeurs.
  const combos = d.options.reduce<string[][]>((acc, o) => acc.flatMap((c) => o.values.map((v) => [...c, v])), [[]]);
  const keyOf = (o: string[]) => o.map((x) => x.toLowerCase()).join("\u0000");
  const rows = combos.map((c) => variants.find((v) => keyOf(v.options) === keyOf(c)) ?? { id: "", options: c, sku: "", price: null, compareAt: null, stock: null, stockPolicy: "deny" as const, image: null, barcode: "", weightGrams: null });
  const setRow = (i: number, patch: Partial<Variant>) => { const r = { ...rows[i], ...patch }; setVariants([...variants.filter((v) => keyOf(v.options) !== keyOf(r.options)), r]); };
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...d, status, variants: rows.map(({ options, sku, price, compareAt, stock, stockPolicy, image, barcode, weightGrams }) => ({ options, sku, price, compareAt, stock, stockPolicy, image, barcode, weightGrams })) };
      if (product) await api(`/api/projects/${id}/products`, { method: "PATCH", body: { id: product.id, version: product.version, product: body } });
      else await api(`/api/projects/${id}/products`, { method: "POST", body });
      onSaved();
    } catch (e) { toast("bad", (e as Error).message); }
    setBusy(false);
  };
  return (
    <Modal open onClose={onClose} title={product ? t("Modifier le produit", "Edit product") : t("Nouveau produit", "New product")} xl>
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Nom *", "Name *")}><Input value={d.title} maxLength={160} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label={t("État", "Status")}><Select value={status} onChange={(e) => setStatus(e.target.value as "active" | "draft")}><option value="active">{t("En vente", "On sale")}</option><option value="draft">{t("Brouillon", "Draft")}</option></Select></Field>
        </div>
        <Field label={t("Description", "Description")}><Textarea autoGrow rows={4} value={d.description_html} onChange={(e) => set("description_html", e.target.value)} /></Field>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{t(`Photos (${d.images.length}) — la première est la photo principale`, `Photos (${d.images.length}) — the first is the main photo`)}</p><Button size="sm" variant="secondary" icon={<ImagePlus className="size-4" />} onClick={() => setPicker(true)}>{t("Ajouter des photos du projet", "Add project photos")}</Button></div>
          <div className="flex flex-wrap gap-2">{d.images.map((img, i) => (
            <span key={img.assetId} className="relative"><img src={`/api/files/${img.assetId}?thumb=1`} alt={img.alt} className="size-20 rounded-xl object-cover" />
              <span className="absolute inset-x-0 bottom-0 flex justify-between"><button type="button" className="rounded bg-card px-1 text-xs" aria-label={t("Avancer", "Move earlier")} onClick={() => { if (!i) return; const a = [...d.images]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set("images", a); }}>‹</button><button type="button" className="rounded bg-card px-1 text-xs" aria-label={t("Retirer la photo", "Remove photo")} onClick={() => set("images", d.images.filter((_, j) => j !== i))}><Trash2 className="size-3" /></button></span>
            </span>))}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label={t(`Prix (${currencyLabel(d.currency)})`, `Price (${currencyLabel(d.currency)})`)}><Input inputMode="decimal" defaultValue={euros(d.price)} onBlur={(e) => set("price", cents(e.target.value))} /></Field>
          <Field label={t(`Prix barré (${currencyLabel(d.currency)})`, `Compare-at (${currencyLabel(d.currency)})`)}><Input inputMode="decimal" defaultValue={euros(d.compareAt)} onBlur={(e) => set("compareAt", cents(e.target.value))} /></Field>
          <Field label={t("Catégories (virgules)", "Categories (commas)")}><Input defaultValue={d.categories.join(", ")} onBlur={(e) => set("categories", list(e.target.value))} /></Field>
          <Field label={t("Étiquettes (virgules)", "Tags (commas)")}><Input defaultValue={d.tags.join(", ")} onBlur={(e) => set("tags", list(e.target.value))} /></Field>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between"><p className="text-sm font-medium">{t("Options (ex. Coloris : Sable, Nuit)", "Options (e.g. Colour: Sand, Night)")}</p>{d.options.length < 3 && <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => set("options", [...d.options, { name: "", values: [] }])}>{t("Ajouter une option", "Add an option")}</Button>}</div>
          {d.options.map((o, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input placeholder={t("Nom de l'option", "Option name")} value={o.name} onChange={(e) => set("options", d.options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <Input placeholder={t("Valeurs séparées par des virgules", "Values separated by commas")} defaultValue={o.values.join(", ")} onBlur={(e) => set("options", d.options.map((x, j) => (j === i ? { ...x, values: [...new Set(list(e.target.value))] } : x)))} />
              <Button size="sm" variant="ghost" aria-label={t("Retirer l'option", "Remove option")} icon={<Trash2 className="size-4" />} onClick={() => set("options", d.options.filter((_, j) => j !== i))} />
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-muted"><th className="p-1">{t("Variante", "Variant")}</th><th className="p-1">{t("Référence (SKU)", "SKU")}</th><th className="p-1">{t(`Prix (${currencyLabel(d.currency)})`, `Price (${currencyLabel(d.currency)})`)}</th><th className="p-1">{t("Stock (vide : non suivi)", "Stock (empty: not tracked)")}</th><th className="p-1">{t("Épuisé", "Sold out")}</th></tr></thead>
            <tbody>{rows.map((v, i) => (
              <tr key={keyOf(v.options) || "unique"} className="border-t border-line">
                <td className="p-1">{v.options.join(" / ") || t("Produit unique", "Single product")}</td>
                <td className="p-1"><Input value={v.sku} maxLength={64} onChange={(e) => setRow(i, { sku: e.target.value })} /></td>
                <td className="p-1"><Input inputMode="decimal" defaultValue={euros(v.price)} placeholder={euros(d.price)} onBlur={(e) => setRow(i, { price: cents(e.target.value) })} /></td>
                <td className="p-1"><Input inputMode="numeric" value={v.stock ?? ""} onChange={(e) => setRow(i, { stock: e.target.value === "" ? null : Math.trunc(Number(e.target.value)) || 0 })} /></td>
                <td className="p-1"><Select value={v.stockPolicy} onChange={(e) => setRow(i, { stockPolicy: e.target.value as Variant["stockPolicy"] })}><option value="deny">{t("Plus vendu", "Not sold")}</option><option value="continue">{t("Vendu quand même", "Still sold")}</option></Select></td>
              </tr>))}</tbody>
          </table>
        </div>
        <details className="rounded-2xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium">{t("Fiche produit, plateformes et référencement", "Product page, platforms and SEO")}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label={t("Mise en page de la fiche", "Product page layout")} hint={t("Fiche commune du thème, ou mise en page propre à ce produit (créée dans l'onglet Boutique).", "The theme's shared page, or a layout of its own (created in the Store tab).")}><Select value={d.templateSuffix} onChange={(e) => set("templateSuffix", e.target.value)}>{templates.map((s) => <option key={s} value={s}>{s ? `product.${s}` : t("Fiche produit commune", "Shared product page")}</option>)}{d.templateSuffix && !templates.includes(d.templateSuffix) && <option value={d.templateSuffix}>{`product.${d.templateSuffix} (${t("absente du thème", "missing from theme")})`}</option>}</Select></Field>
            <Field label={t("Marque", "Vendor")}><Input value={d.vendor} onChange={(e) => set("vendor", e.target.value)} /></Field>
            <Field label={t("Type de produit", "Product type")}><Input value={d.productType} onChange={(e) => set("productType", e.target.value)} /></Field>
            <Field label={t("Code-barres (EAN)", "Barcode (EAN)")}><Input value={d.barcode} onChange={(e) => set("barcode", e.target.value)} /></Field>
            <Field label={t("Poids (g)", "Weight (g)")}><Input inputMode="numeric" value={d.weightGrams ?? ""} onChange={(e) => set("weightGrams", e.target.value === "" ? null : Math.max(0, Math.trunc(Number(e.target.value)) || 0))} /></Field>
            <Field label={t("Titre pour Google", "Title for Google")}><Input value={d.seo.title} maxLength={70} onChange={(e) => set("seo", { ...d.seo, title: e.target.value })} /></Field>
            <Field label={t("Description pour Google", "Description for Google")}><Input value={d.seo.description} maxLength={320} onChange={(e) => set("seo", { ...d.seo, description: e.target.value })} /></Field>
          </div>
        </details>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>{t("Annuler", "Cancel")}</Button><Button loading={busy} onClick={save}>{t("Enregistrer", "Save")}</Button></div>
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} multiple kinds={["image"]} title={t("Choisir des photos du projet", "Choose project photos")} onPick={(sel) => { set("images", [...d.images, ...sel.filter((a) => !d.images.some((x) => x.assetId === a.id)).map((a) => ({ assetId: a.id, alt: "" }))]); setPicker(false); }} />
    </Modal>
  );
}
