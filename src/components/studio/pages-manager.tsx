"use client";
/**
 * « Pages » dans « Modifier le thème » : liste des pages du site (recherche, ouvrir, renommer, adresse, SEO, menu,
 * brouillon, dupliquer, supprimer), ajout d'une page depuis un modèle (aperçu réel, nom, adresse, prestation liée),
 * mises en page propres à chaque produit, destination du bouton « Prendre rendez-vous ».
 * Modèles, ajout de pages et mises en page par produit : forfaits Développer et Dominer (le serveur le vérifie aussi).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, CalendarClock, Copy, Eye, FileText, LayoutTemplate, Lock, Monitor, Pencil, Plus, Search, Smartphone, Trash2 } from "lucide-react";
import { api, Badge, Button, cx, Field, Input, Modal, Select, Toggle, useApi, useToast } from "../ui";
import { useT } from "../i18n";

type Model = { id: string; kind: "page" | "product"; category: string; name: string; description: string; usage: string };
type PageRow = { handle: string; title: string; url: string; model: string | null; status: "draft" | "published"; inNav: boolean; protected: boolean; seo: { title: string; description: string }; service: string | null; booking: string | null; template: string };
type Data = {
  version: string;
  plan: string | null;
  canUseModels: boolean;
  activity: { value: string; confirmed: boolean; label: string };
  activities: { id: string; label: string }[];
  suggested: string[];
  models: Model[];
  pages: PageRow[];
  navigation: { title: string; url: string }[];
  products: { handle: string; title: string; layout: string | null }[];
  layouts: { suffix: string; products: string[] }[];
  services: string[];
  booking: { kind: "external" | "internal"; url: string } | null;
  contactUrl: string | null;
};

const SERVICE_MODELS = new Set(["prestation-rendez-vous"]);

export function PagesManager({ open, onClose, projectId, sandbox, onOpenPage, onChanged }: { open: boolean; onClose: () => void; projectId: string; sandbox?: string; onOpenPage: (path: string) => void; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const { data, setData, reload } = useApi<Data>(open ? `/api/projects/${projectId}/theme/pages` : null);
  const [tab, setTab] = useState<"pages" | "add" | "products">("pages");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<PageRow | null>(null);
  const [remove, setRemove] = useState<{ page: PageRow; deps: { menu: boolean; buttons: number; booking: number } } | null>(null);
  const [changeModel, setChangeModel] = useState<{ page: PageRow; model: string } | null>(null);
  const [previewing, setPreviewing] = useState<{ model: Model; product?: string; service?: string } | null>(null);
  const [create, setCreate] = useState<Model | null>(null);

  /** Action serveur : version de référence jointe ; conflit (autre onglet, double clic) → liste rechargée. */
  const act = async (key: string, body: Record<string, unknown>, done?: string) => {
    if (!data) return null;
    setBusy(key);
    try {
      const r = await api<Data & { handle?: string; confirmNeeded?: boolean; deps?: any; needsCalendar?: boolean; kept?: number }>(`/api/projects/${projectId}/theme/pages`, { body: { version: data.version, ...body } });
      if (!r.confirmNeeded) {
        setData(r);
        onChanged();
        if (done) toast("ok", done);
      }
      return r;
    } catch (e) {
      toast("bad", (e as Error).message);
      reload();
      return null;
    } finally {
      setBusy(null);
    }
  };

  const pages = useMemo(() => (data?.pages ?? []).filter((p) => !q || `${p.title} ${p.url}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const locked = !!data && !data.canUseModels;
  const lockNote = t("Disponible avec les forfaits Développer et Dominer.", "Available with the Grow and Dominate plans.");

  return (
    <Modal open={open} onClose={onClose} title={t("Pages du site", "Site pages")} xl>
      {!data ? (
        <div className="skeleton h-64 rounded-2xl" aria-busy="true" />
      ) : (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-1.5" role="tablist">
              {([["pages", t("Pages", "Pages")], ["add", t("Ajouter une page", "Add a page")], ["products", t("Mises en page des produits", "Product layouts")]] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx("h-10 rounded-full border px-4 text-sm", tab === k ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink")}>{l}</button>
              ))}
            </div>
            <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">{t("Votre activité :", "Your business:")}</span>
              <Select className="h-10 w-auto text-sm" value={data.activity.value} onChange={(e) => act("activity", { action: "set_activity", activity: e.target.value }, t("Activité enregistrée : les modèles proposés s'adaptent.", "Business saved: the suggested templates adapt."))} aria-label={t("Catégorie d'activité", "Business category")}>
                {data.activities.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </Select>
              {!data.activity.confirmed && <Badge tone="warn">{t("à confirmer", "to confirm")}</Badge>}
            </label>
          </div>
          {locked && <p className="flex items-start gap-2 rounded-2xl bg-paper-2 p-3 text-sm text-ink-2"><Lock className="mt-0.5 size-4 shrink-0" aria-hidden /> {t("Votre forfait permet de modifier les pages existantes (textes, images, sections, nom, adresse, référencement). Les modèles de pages, l'ajout de pages et les mises en page propres à un produit sont inclus dans les forfaits Développer et Dominer.", "Your plan lets you edit the existing pages (copy, images, sections, name, address, SEO). Page templates, adding pages and product-specific layouts are included in the Grow and Dominate plans.")} <Link href="/studio/compte" className="font-semibold text-signal underline-offset-4 hover:underline">{t("Voir les forfaits", "See the plans")}</Link></p>}

          {tab === "pages" && (
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[12rem] flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                  <Input className="pl-10" placeholder={t("Rechercher une page", "Search a page")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Rechercher une page", "Search a page")} />
                </div>
                <Button variant="signal" icon={<Plus className="size-4" />} onClick={() => setTab("add")}>{t("Ajouter une page", "Add a page")}</Button>
              </div>
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {pages.length === 0 && <li className="p-4 text-sm text-muted">{t("Aucune page.", "No pages.")}</li>}
                {pages.map((p) => {
                  const model = data.models.find((m) => m.id === p.model);
                  return (
                    <li key={p.handle} className="grid min-w-0 gap-2 p-3 sm:flex sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          <FileText className="size-4 text-muted" aria-hidden /> {p.title}
                          {p.status === "draft" && <Badge tone="warn">{t("Brouillon", "Draft")}</Badge>}
                          {p.protected && <Badge>{t("Indispensable", "Essential")}</Badge>}
                        </p>
                        <p className="truncate text-xs text-muted">{p.url}{model ? ` · ${model.name}` : ""}{p.service ? ` · ${p.service}` : ""}</p>
                        {(SERVICE_MODELS.has(p.model ?? "") || p.service) && <BookingLine page={p} data={data} busy={busy} onSet={(url) => act(`booking-${p.handle}`, { action: "set_booking", handle: p.handle, url }, t("Bouton de réservation mis à jour.", "Booking button updated."))} />}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Toggle checked={p.inNav} disabled={p.status === "draft" || !!busy} onChange={(v) => act(`nav-${p.handle}`, { action: "set_nav", handle: p.handle, show: v })} label={t("Menu", "Menu")} />
                        <Button size="sm" variant="secondary" onClick={() => (onOpenPage(p.url), onClose())}>{t("Ouvrir", "Open")}</Button>
                        <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setEdit(p)}>{t("Réglages", "Settings")}</Button>
                        <Button size="sm" variant="ghost" icon={<Copy className="size-3.5" />} disabled={locked || !!busy} title={locked ? lockNote : undefined} onClick={() => act(`dup-${p.handle}`, { action: "duplicate_page", handle: p.handle }, t("Copie créée en brouillon.", "Copy created as a draft."))}>{t("Dupliquer", "Duplicate")}</Button>
                        <Button size="sm" variant="ghost" icon={<LayoutTemplate className="size-3.5" />} disabled={locked || !!busy} title={locked ? lockNote : undefined} onClick={() => setChangeModel({ page: p, model: data.models.find((m) => m.kind === "page")!.id })}>{t("Modèle", "Template")}</Button>
                        <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} disabled={p.protected || !!busy} title={p.protected ? t("Page indispensable : modifiable, pas supprimable.", "Essential page: editable, not deletable.") : undefined} onClick={async () => {
                          const r = await act(`rm-${p.handle}`, { action: "remove_page", handle: p.handle });
                          if (r?.confirmNeeded) setRemove({ page: p, deps: r.deps });
                        }}>{t("Supprimer", "Delete")}</Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <MenuOrder data={data} busy={busy} onMove={(urls) => act("reorder", { action: "reorder_nav", urls }, t("Menu réorganisé.", "Menu reordered."))} />
            </div>
          )}

          {tab === "add" && (
            <ModelGallery data={data} kind="page" projectId={projectId} sandbox={sandbox} locked={locked} lockNote={lockNote} onPreview={(m) => setPreviewing({ model: m })} onUse={(m) => setCreate(m)} />
          )}

          {tab === "products" && (
            <ProductLayouts data={data} busy={busy} locked={locked} lockNote={lockNote} onPreview={(m, product) => setPreviewing({ model: m, product })} onAssign={(product, layout) => act(`assign-${product}`, { action: "assign_layout", product, layout }, t("Mise en page enregistrée.", "Layout saved."))} onCreate={async (product, model) => {
              const r = await act(`layout-${product}`, { action: "add_product_layout", product, model }, t("Mise en page créée pour ce produit.", "Layout created for this product."));
              if (r) (onOpenPage(`/products/${product}`), onClose());
            }} />
          )}
        </div>
      )}

      {data && edit && <EditPage page={edit} busy={busy} onClose={() => setEdit(null)} onSave={async (v) => {
        const r = await act(`edit-${edit.handle}`, { action: "update_page", handle: edit.handle, ...v }, t("Page enregistrée.", "Page saved."));
        if (r) setEdit(null);
      }} />}

      {data && remove && (
        <Modal open onClose={() => setRemove(null)} title={t(`Supprimer « ${remove.page.title} » ?`, `Delete "${remove.page.title}"?`)}>
          <div className="grid gap-3 text-sm">
            <ul className="list-disc pl-5 text-ink-2">
              {remove.deps.menu && <li>{t("Elle sera retirée du menu.", "It will be removed from the menu.")}</li>}
              {remove.deps.buttons > 0 && <li className="text-warn">{t(`${remove.deps.buttons} bouton(s) d'autres pages y mènent : ils pointeront vers une page absente, pensez à les modifier.`, `${remove.deps.buttons} button(s) on other pages link to it: they will point to a missing page, remember to edit them.`)}</li>}
              {remove.deps.booking > 0 && <li className="text-warn">{t("Des boutons « Prendre rendez-vous » y mènent : choisissez une autre destination.", "Some \"Book\" buttons link to it: pick another destination.")}</li>}
              <li>{t("La version actuelle reste restaurable depuis l'historique.", "The current version stays restorable from the history.")}</li>
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRemove(null)}>{t("Annuler", "Cancel")}</Button>
              <Button variant="danger" loading={busy === "rm-confirm"} onClick={async () => {
                const r = await act("rm-confirm", { action: "remove_page", handle: remove.page.handle, confirm: true }, t("Page supprimée.", "Page deleted."));
                if (r) setRemove(null);
              }}>{t("Supprimer la page", "Delete the page")}</Button>
            </div>
          </div>
        </Modal>
      )}

      {data && changeModel && (
        <Modal open onClose={() => setChangeModel(null)} title={t(`Changer le modèle de « ${changeModel.page.title} »`, `Change the template of "${changeModel.page.title}"`)}>
          <div className="grid gap-3 text-sm">
            <Select value={changeModel.model} onChange={(e) => setChangeModel({ ...changeModel, model: e.target.value })} aria-label={t("Nouveau modèle", "New template")}>
              {data.models.filter((m) => m.kind === "page").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
            <p className="text-ink-2">{t("Les titres, textes et images des sections de même nature sont repris ; les autres sections de la page sont remplacées. La version actuelle reste restaurable depuis l'historique, et vos images ne sont jamais supprimées.", "Headings, copy and images of matching sections are kept; the page's other sections are replaced. The current version stays restorable from the history, and your images are never deleted.")}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setChangeModel(null)}>{t("Annuler", "Cancel")}</Button>
              <Button loading={busy === "model"} onClick={async () => {
                const r = await act("model", { action: "change_model", handle: changeModel.page.handle, model: changeModel.model }, t("Modèle appliqué (ancienne version restaurable).", "Template applied (previous version restorable)."));
                if (r) setChangeModel(null);
              }}>{t("Appliquer ce modèle", "Apply this template")}</Button>
            </div>
          </div>
        </Modal>
      )}

      {data && previewing && <ModelPreview projectId={projectId} sandbox={sandbox} model={previewing.model} product={previewing.product} onClose={() => setPreviewing(null)} onUse={locked || previewing.model.kind === "product" ? undefined : () => (setCreate(previewing.model), setPreviewing(null))} />}

      {data && create && <CreatePage model={create} data={data} busy={busy} onClose={() => setCreate(null)} onCreate={async (v) => {
        const r = await act("create", { action: "add_page", model: create.id, ...v }, t("Page créée : personnalisez-la dans l'éditeur.", "Page created: customize it in the editor."));
        if (r?.handle) {
          setCreate(null);
          if (r.needsCalendar) toast("info", t("Aucun calendrier configuré : le bouton mène à votre page de contact. Configurez votre calendrier dans « Pages ».", "No calendar set up: the button leads to your contact page. Set up your calendar in \"Pages\"."));
          onOpenPage(`/pages/${r.handle}`);
          onClose();
        }
      }} />}
    </Modal>
  );
}

/** Destination du bouton « Prendre rendez-vous » d'une page de prestation (jamais de faux créneaux). */
function BookingLine({ page, data, busy, onSet }: { page: PageRow; data: Data; busy: string | null; onSet: (url: string | null) => void }) {
  const t = useT();
  const [url, setUrl] = useState(page.booking?.startsWith("https://") ? page.booking : "");
  const internal = data.pages.filter((p) => p.status !== "draft" && p.model === "rendez-vous-reserver").map((p) => p.url);
  const current = page.booking ?? data.booking?.url ?? null;
  return (
    <div className="mt-2 grid gap-1.5 rounded-xl bg-paper-2 p-2.5 text-xs">
      <p className="flex items-center gap-1.5 font-medium"><CalendarClock className="size-3.5" aria-hidden /> {current ? t(`Bouton « Prendre rendez-vous » → ${current}`, `"Book" button → ${current}`) : t("Aucun calendrier configuré : le bouton mène au contact.", "No calendar set up: the button leads to contact.")}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {internal.map((u) => <Button key={u} size="sm" variant="secondary" disabled={!!busy} onClick={() => onSet(u)}>{t(`Calendrier du site (${u})`, `Site calendar (${u})`)}</Button>)}
        <div className="w-56"><Input className="h-9 text-xs" type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label={t("Lien de votre calendrier", "Your calendar link")} /></div>
        <Button size="sm" disabled={!url || !!busy} onClick={() => onSet(url)}>{t("Configurer mon calendrier", "Set up my calendar")}</Button>
      </div>
    </div>
  );
}

function MenuOrder({ data, busy, onMove }: { data: Data; busy: string | null; onMove: (urls: string[]) => void }) {
  const t = useT();
  const urls = data.navigation.map((l) => l.url);
  const move = (i: number, d: -1 | 1) => {
    const next = [...urls];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onMove(next);
  };
  if (!data.navigation.length) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{t("Ordre du menu", "Menu order")}</p>
      <ol className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
        {data.navigation.map((l, i) => (
          <li key={l.url + i} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-1.5 text-sm">
            <span className="min-w-0 truncate">{l.title} <span className="text-xs text-muted">{l.url}</span></span>
            <span className="flex shrink-0 gap-1">
              <button className="grid size-8 place-items-center rounded-full hover:bg-paper-2 disabled:opacity-30" disabled={i === 0 || !!busy} onClick={() => move(i, -1)} aria-label={t("Monter", "Move up")}><ArrowUp className="size-4" /></button>
              <button className="grid size-8 place-items-center rounded-full hover:bg-paper-2 disabled:opacity-30" disabled={i === urls.length - 1 || !!busy} onClick={() => move(i, 1)} aria-label={t("Descendre", "Move down")}><ArrowDown className="size-4" /></button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EditPage({ page, busy, onClose, onSave }: { page: PageRow; busy: string | null; onClose: () => void; onSave: (v: Record<string, unknown>) => void }) {
  const t = useT();
  const [title, setTitle] = useState(page.title);
  const [handle, setHandle] = useState(page.handle);
  const [seoT, setSeoT] = useState(page.seo.title);
  const [seoD, setSeoD] = useState(page.seo.description);
  const [status, setStatus] = useState(page.status);
  return (
    <Modal open onClose={onClose} title={t(`Réglages de « ${page.title} »`, `Settings of "${page.title}"`)}>
      <div className="grid gap-3">
        <Field label={t("Nom de la page", "Page name")} htmlFor="pg-title"><Input id="pg-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
        <Field label={t("Adresse", "Address")} htmlFor="pg-handle" hint={t("Les liens du menu et des boutons suivent automatiquement.", "Menu and button links follow automatically.")}>
          <div className="flex items-center gap-1 text-sm"><span className="text-muted">/pages/</span><Input id="pg-handle" value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={80} /></div>
        </Field>
        <Field label={t("Titre pour Google", "Title for Google")} htmlFor="pg-seo-t" hint={`${seoT.length}/70`}><Input id="pg-seo-t" value={seoT} onChange={(e) => setSeoT(e.target.value)} maxLength={70} /></Field>
        <Field label={t("Description pour Google", "Description for Google")} htmlFor="pg-seo-d" hint={`${seoD.length}/320`}><Input id="pg-seo-d" value={seoD} onChange={(e) => setSeoD(e.target.value)} maxLength={320} /></Field>
        <Toggle checked={status === "published"} onChange={(v) => setStatus(v ? "published" : "draft")} label={status === "published" ? t("Publiée", "Published") : t("Brouillon (hors menu, non publiée)", "Draft (not in menu, not published)")} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Annuler", "Cancel")}</Button>
          <Button loading={busy === `edit-${page.handle}`} onClick={() => onSave({ title, newHandle: handle !== page.handle ? handle : undefined, seo: { title: seoT, description: seoD }, status })}>{t("Enregistrer", "Save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ModelGallery({ data, kind, projectId, sandbox, locked, lockNote, onPreview, onUse }: { data: Data; kind: "page" | "product"; projectId: string; sandbox?: string; locked: boolean; lockNote: string; onPreview: (m: Model) => void; onUse: (m: Model) => void }) {
  const t = useT();
  const models = data.models.filter((m) => m.kind === kind).sort((a, b) => Number(data.suggested.includes(b.id)) - Number(data.suggested.includes(a.id)));
  return (
    <div>
      <p className="mb-3 text-sm text-ink-2">{t("Chaque modèle reprend l'identité de votre thème (couleurs, polices, en-tête, pied de page) et vos images. La page créée est indépendante : vous la modifiez librement ensuite.", "Each template uses your theme's identity (colors, fonts, header, footer) and your images. The created page is independent: you then edit it freely.")}</p>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {models.map((m) => (
          <li key={m.id} className="flex flex-col overflow-hidden rounded-3xl border border-line bg-card">
            <button type="button" onClick={() => onPreview(m)} className="relative block aspect-[4/3] overflow-hidden bg-paper-2 text-left" aria-label={t(`Aperçu du modèle ${m.name}`, `Preview of the ${m.name} template`)}>
              <ModelThumb projectId={projectId} model={m.id} sandbox={sandbox} />
              {data.suggested.includes(m.id) && <Badge tone="signal" className="absolute left-3 top-3">{t("Conseillé pour votre activité", "Suggested for your business")}</Badge>}
            </button>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <p className="font-display text-lg font-semibold">{m.name}</p>
              <p className="text-sm text-ink-2">{m.description}</p>
              <p className="text-xs text-muted">{m.usage}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <Button size="sm" variant="secondary" icon={<Eye className="size-3.5" />} onClick={() => onPreview(m)}>{t("Aperçu", "Preview")}</Button>
                {kind === "page" && <Button size="sm" disabled={locked} title={locked ? lockNote : undefined} icon={locked ? <Lock className="size-3.5" /> : undefined} onClick={() => onUse(m)}>{t("Utiliser ce modèle", "Use this template")}</Button>}
              </div>
              {locked && <p className="text-xs text-muted">{lockNote}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Miniature fidèle : la page du modèle rendue en direct sur le site du projet, réduite. */
function ModelThumb({ projectId, model, sandbox, product }: { projectId: string; model: string; sandbox?: string; product?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const FRAME = 1280;
  return (
    <span ref={box} className="absolute inset-0 block">
      {w > 0 && <iframe src={`/preview/${projectId}/v/model-${model}?es_raw=1${product ? `&produit=${encodeURIComponent(product)}` : ""}`} title="" aria-hidden tabIndex={-1} loading="lazy" sandbox={sandbox ?? "allow-scripts"} className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white" style={{ width: FRAME, height: (box.current!.clientHeight * FRAME) / w, transform: `scale(${w / FRAME})` }} />}
    </span>
  );
}

function ModelPreview({ projectId, sandbox, model, product, onClose, onUse }: { projectId: string; sandbox?: string; model: Model; product?: string; onClose: () => void; onUse?: () => void }) {
  const t = useT();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return (
    <Modal open onClose={onClose} title={t(`Aperçu : ${model.name}`, `Preview: ${model.name}`)} xl>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-2">{t("Aperçu sur votre site, avec vos images. Rien n'est enregistré.", "Preview on your site, with your images. Nothing is saved.")}</p>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-line p-0.5" role="group" aria-label={t("Appareil", "Device")}>
              <button onClick={() => setDevice("desktop")} aria-pressed={device === "desktop"} className={cx("grid h-8 w-9 place-items-center rounded-full", device === "desktop" && "bg-ink text-paper")} title={t("Ordinateur", "Desktop")}><Monitor className="size-4" /></button>
              <button onClick={() => setDevice("mobile")} aria-pressed={device === "mobile"} className={cx("grid h-8 w-9 place-items-center rounded-full", device === "mobile" && "bg-ink text-paper")} title={t("Téléphone", "Mobile")}><Smartphone className="size-4" /></button>
            </div>
            {onUse && <Button size="sm" onClick={onUse}>{t("Utiliser ce modèle", "Use this template")}</Button>}
          </div>
        </div>
        <div className="flex justify-center rounded-2xl bg-paper-2 p-2">
          <iframe key={device} src={`/preview/${projectId}/v/model-${model.id}${product ? `?produit=${encodeURIComponent(product)}` : ""}`} title={t(`Aperçu du modèle ${model.name}`, `Preview of the ${model.name} template`)} sandbox={sandbox ?? "allow-scripts"} className="h-[70vh] rounded-xl border border-line bg-white" style={{ width: device === "mobile" ? 390 : "100%" }} />
        </div>
      </div>
    </Modal>
  );
}

function CreatePage({ model, data, busy, onClose, onCreate }: { model: Model; data: Data; busy: string | null; onClose: () => void; onCreate: (v: Record<string, unknown>) => void }) {
  const t = useT();
  const [title, setTitle] = useState(model.name.split(" — ")[0]);
  const [handle, setHandle] = useState("");
  const [service, setService] = useState(SERVICE_MODELS.has(model.id) ? data.services[0] ?? "" : "");
  const [inNav, setInNav] = useState(true);
  const [draft, setDraft] = useState(false);
  const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (
    <Modal open onClose={onClose} title={t(`Nouvelle page : ${model.name}`, `New page: ${model.name}`)}>
      <div className="grid gap-3">
        <Field label={t("Nom de la page", "Page name")} htmlFor="np-title"><Input id="np-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
        <Field label={t("Adresse", "Address")} htmlFor="np-handle" hint={t("Laissez vide : elle est créée à partir du nom (sans doublon).", "Leave empty: it's built from the name (no duplicates).")}>
          <div className="flex items-center gap-1 text-sm"><span className="text-muted">/pages/</span><Input id="np-handle" placeholder={slug(title)} value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={80} /></div>
        </Field>
        {SERVICE_MODELS.has(model.id) && (
          <Field label={t("Prestation présentée", "Service presented")} htmlFor="np-service" hint={data.services.length ? undefined : t("Ajoutez vos prestations dans l'onglet Activité pour les relier.", "Add your services in the Business tab to link them.")}>
            <Select id="np-service" value={service} onChange={(e) => setService(e.target.value)}>
              <option value="">{t("Aucune en particulier", "None in particular")}</option>
              {data.services.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        )}
        {SERVICE_MODELS.has(model.id) && !data.booking && <p className="rounded-xl bg-warn-soft p-2.5 text-xs text-warn">{t("Aucun calendrier configuré : le bouton « Prendre rendez-vous » mènera à votre page de contact jusqu'à ce que vous configuriez votre calendrier (lien https ou page « Rendez-vous — Réserver »).", "No calendar set up: the \"Book\" button will lead to your contact page until you set up your calendar (https link or an \"Appointment — Book\" page).")}</p>}
        <Toggle checked={inNav} onChange={setInNav} label={t("Afficher dans le menu", "Show in the menu")} />
        <Toggle checked={draft} onChange={setDraft} label={t("Créer en brouillon", "Create as a draft")} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Annuler", "Cancel")}</Button>
          <Button loading={busy === "create"} disabled={!title.trim() || busy === "create"} onClick={() => onCreate({ title, handle: handle || undefined, service: service || undefined, inNav: inNav && !draft, status: draft ? "draft" : "published" })}>{t("Créer la page", "Create the page")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ProductLayouts({ data, busy, locked, lockNote, onPreview, onAssign, onCreate }: { data: Data; busy: string | null; locked: boolean; lockNote: string; onPreview: (m: Model, product: string) => void; onAssign: (product: string, layout: string | null) => void; onCreate: (product: string, model: string) => void }) {
  const t = useT();
  const productModels = data.models.filter((m) => m.kind === "product");
  const [choice, setChoice] = useState<Record<string, string>>({});
  if (!data.products.length) return <p className="text-sm text-muted">{t("Aucun produit dans ce site.", "No products on this site.")}</p>;
  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink-2">{t("Par défaut, tous les produits partagent la même fiche. Donnez à un produit sa propre mise en page : la modifier ne change pas celle des autres. Prix, déclinaisons et stock restent ceux du catalogue.", "By default, all products share the same page. Give a product its own layout: editing it doesn't change the others. Price, variants and stock stay those of the catalog.")}</p>
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {data.products.map((p) => {
          const m = choice[p.handle] ?? productModels[0]?.id;
          return (
            <li key={p.handle} className="grid gap-2 p-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted">{p.layout ? t(`Mise en page propre : ${p.layout}`, `Own layout: ${p.layout}`) : t("Fiche produit commune", "Shared product page")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Select className="h-9 w-auto text-sm" value={p.layout ?? ""} disabled={!!busy} onChange={(e) => onAssign(p.handle, e.target.value || null)} aria-label={t(`Mise en page de ${p.title}`, `Layout of ${p.title}`)}>
                  <option value="">{t("Fiche commune", "Shared page")}</option>
                  {data.layouts.map((l) => <option key={l.suffix} value={l.suffix} disabled={locked && l.suffix !== p.layout}>{l.suffix}</option>)}
                </Select>
                <Select className="h-9 w-auto text-sm" value={m} onChange={(e) => setChoice({ ...choice, [p.handle]: e.target.value })} aria-label={t("Modèle", "Template")}>
                  {productModels.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
                <Button size="sm" variant="secondary" icon={<Eye className="size-3.5" />} onClick={() => onPreview(productModels.find((x) => x.id === m)!, p.handle)}>{t("Aperçu", "Preview")}</Button>
                <Button size="sm" disabled={locked || !!busy} title={locked ? lockNote : undefined} loading={busy === `layout-${p.handle}`} onClick={() => onCreate(p.handle, m)}>{t("Nouvelle mise en page", "New layout")}</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
