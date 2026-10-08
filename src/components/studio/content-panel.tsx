"use client";
/**
 * Panneau « SEO & textes » (phase 8A), réutilisé dans les onglets Produit / Activité et Blog :
 * stratégie SEO (hypothèses sémantiques, pages prioritaires, calendrier, maillage, audit local), rédaction d'un
 * contenu, éditeur de blocs (titres, paragraphes, listes, questions, liens, gras, italique), métadonnées avec
 * compteurs, indicateurs SEO, versions et restauration, aperçu, export et retouches en conversation.
 * Les modifications manuelles n'appellent jamais l'IA.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Bold, Download, Eye, FileText, Italic, Link2, MessageSquare, Plus, RotateCcw, Save, Search, Sparkles, Trash2 } from "lucide-react";
import { api, Badge, Button, Card, cx, Field, Input, Select, Spinner, Textarea, useApi, useToast } from "../ui";
import { useT } from "../i18n";
import { useProject } from "./project-context";

type Lang = "fr" | "en" | "es";
type PageRef = { key: string; title: string; url: string | null; kind: string; status: "existing" | "planned" };
type Block =
  | { id: string; kind: "h1" | "h2" | "h3" | "p"; text: string }
  | { id: string; kind: "ul" | "ol"; items: string[] }
  | { id: string; kind: "faq"; q: string; a: string }
  | { id: string; kind: "cta"; text: string; url: string | null };
type Doc = { version: number; type: string; lang: Lang; page: PageRef; primaryKeyword: string | null; meta: { seoTitle: string; metaDescription: string; slug: string; canonical: string | null; robots: string }; blocks: Block[]; schema: Record<string, unknown>[]; links: PageRef[]; meta2: { source: string; by: string; runId: string | null; createdFrom: string | null } };
type Version = { version: number; source: string; verdict: string | null; note: string; createdAt: number; title: string; type: string; docKey: string; lang: string };
type TechItem = { check: string; status: "ok" | "issue" | "needs_crawl"; detail: string; page?: string };
type Overview = {
  lang: Lang;
  ai: boolean;
  strategy: {
    objectives: string[];
    audience: string;
    priorityPages: (PageRef & { why: string; primaryKeyword: string | null })[];
    clusters: { id: string; theme: string; primary: { term: string; intent: string }; variants: { term: string }[]; questions: string[] }[];
    linking: { from: string; to: string; anchor: string; status: string }[];
    local: { area: string | null; opportunities: string[]; schema: string[] } | null;
    calendar: { week: number; title: string; keyword: string }[];
    hreflang: { recommended: boolean; note: string };
    dataNote: string;
    gaps: string[];
  };
  pages: PageRef[];
  contents: Version[];
  topics: { title: string; keyword: string; covered: boolean }[];
  cms: { platform: string; mode: string; note: string; verified: boolean }[];
  audit: { local: TechItem[]; needsCrawl: TechItem[]; note: string };
};
type DocView = { docKey: string; doc: Doc; version: Version; versions: Version[]; html: string; indicators: { codes: string[]; issues: string[]; measures: Record<string, number | string | null>; links: { to: PageRef; note: string }[] }; edit?: { applied: boolean; summary: string; needsAi: boolean } };

const TYPE_LABEL: Record<string, [string, string]> = {
  product_page: ["Fiche produit", "Product page"],
  category_page: ["Page de collection", "Collection page"],
  service_page: ["Page de prestation", "Service page"],
  home_page: ["Page d'accueil", "Home page"],
  brand_page: ["Page « À propos »", "About page"],
  local_page: ["Page locale (zone)", "Local page (area)"],
  blog_article: ["Article de blog", "Blog post"],
  faq: ["FAQ", "FAQ"],
  metadata: ["Titre et méta-description", "Title and meta description"],
};
const KIND_FOR: Record<string, string[]> = { product_page: ["product"], category_page: ["collection"], service_page: ["service"], home_page: ["home"], brand_page: ["brand"], local_page: ["local"] };
/** Petits menus de la barre d'outils d'un bloc (compacts, sur une ligne). */
const MINI = "h-8 w-auto max-w-[9.5rem] shrink-0 rounded-lg border border-line bg-card px-2 text-xs text-ink";
const VERDICT: Record<string, ["ok" | "info" | "warn" | "bad", string, string]> = {
  FINAL: ["ok", "Validé", "Approved"],
  PROVISIONAL: ["warn", "À relire", "To review"],
  REJECTED: ["bad", "Refusé", "Rejected"],
};

export function ContentPanel({ types, title }: { types: string[]; title?: string }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [lang, setLang] = useState<Lang>("fr");
  const { data, reload } = useApi<Overview>(`/api/projects/${id}/content/v2?lang=${lang}`);
  const [type, setType] = useState(types[0]);
  const [pageKey, setPageKey] = useState("");
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [showStrategy, setShowStrategy] = useState(false);

  useEffect(() => {
    if (!job) return;
    const timer = setInterval(async () => {
      try {
        const { job: j } = await api<{ job: { status: string; result: any; error: string | null } }>(`/api/jobs/${job}`);
        if (["done", "failed", "cancelled"].includes(j.status)) {
          clearInterval(timer);
          setJob(null);
          await reload();
          if (j.status === "done" && j.result?.docKey) setOpen(j.result.docKey);
          else if (j.status === "failed") toast("bad", j.error ?? t("La rédaction a échoué.", "Writing failed."));
        }
      } catch {}
    }, 2000);
    return () => clearInterval(timer);
  }, [job, reload, t, toast]);

  if (!data) return <Card className="grid place-items-center p-10 text-muted"><Spinner className="size-5" /></Card>;
  const pages = data.pages.filter((p) => (KIND_FOR[type] ?? []).includes(p.kind));
  const list = data.contents.filter((c) => types.includes(c.type));

  const generate = async () => {
    setBusy(true);
    try {
      const r = await api<{ docKey?: string; jobId?: string; notes?: string[] }>(`/api/projects/${id}/content/v2`, { body: { type, pageKey: type === "blog_article" ? null : pageKey || null, lang, request: ask || null, keyword: type === "blog_article" && pageKey ? pageKey : null } });
      if (r.jobId) setJob(r.jobId);
      else if (r.docKey) {
        await reload();
        setOpen(r.docKey);
        toast("ok", t("Texte rédigé à partir de vos informations (sans IA, 0 €). Complétez les passages marqués « À compléter ».", "Text written from your information (no AI, €0). Fill in the parts marked “To complete”."));
      }
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="min-w-0 p-5 sm:p-7" data-content-panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold">{title ?? t("SEO & textes", "SEO & copy")}</h3>
          <p className="mt-1 text-sm text-muted">{t("Textes écrits à partir de vos seules informations : rien n'est inventé, ce qui manque est marqué « À compléter ». Vos modifications ne sont jamais écrasées.", "Copy written from your information only: nothing is made up, anything missing is marked “To complete”. Your edits are never overwritten.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t("Langue du contenu", "Content language")} className="h-9 w-auto text-sm">
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </Select>
          <Button size="sm" variant="secondary" icon={<Search className="size-4" />} onClick={() => setShowStrategy((v) => !v)}>{showStrategy ? t("Masquer la stratégie", "Hide strategy") : t("Stratégie SEO", "SEO strategy")}</Button>
        </div>
      </div>

      {showStrategy && <StrategyView data={data} blog={types.includes("blog_article")} onTopic={(k) => (setType("blog_article"), setPageKey(k))} />}

      <div className="mt-5 grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field label={t("Contenu à rédiger", "Content to write")} htmlFor="cnt-type">
          <Select id="cnt-type" value={type} onChange={(e) => (setType(e.target.value), setPageKey(""))}>
            {types.map((x) => <option key={x} value={x}>{t(TYPE_LABEL[x]?.[0] ?? x, TYPE_LABEL[x]?.[1] ?? x)}</option>)}
          </Select>
        </Field>
        {type === "blog_article" ? (
          <Field label={t("Sujet (calendrier de la stratégie)", "Topic (strategy calendar)")} htmlFor="cnt-topic">
            <Select id="cnt-topic" value={pageKey} onChange={(e) => setPageKey(e.target.value)}>
              <option value="">{t("Premier sujet proposé", "First suggested topic")}</option>
              {data.topics.map((x) => <option key={x.keyword} value={x.keyword}>{x.title}{x.covered ? t(" (déjà traité)", " (already covered)") : ""}</option>)}
            </Select>
          </Field>
        ) : pages.length > 1 ? (
          <Field label={t("Page", "Page")} htmlFor="cnt-page">
            <Select id="cnt-page" value={pageKey} onChange={(e) => setPageKey(e.target.value)}>
              {pages.map((p) => <option key={p.key} value={p.key}>{p.title}{p.status === "planned" ? t(" (prévue)", " (planned)") : ""}</option>)}
            </Select>
          </Field>
        ) : <div />}
        <Field label={t("Demande particulière (facultatif)", "Specific request (optional)")} htmlFor="cnt-ask">
          <Input id="cnt-ask" value={ask} onChange={(e) => setAsk(e.target.value)} placeholder={t("Ex. rassurer sur l'entretien", "E.g. reassure about care")} />
        </Field>
        <div className="flex items-end">
          <Button variant="signal" icon={<Sparkles className="size-4" />} loading={busy || !!job} onClick={generate}>{data.ai ? t("Rédiger", "Write") : t("Rédiger (sans IA, 0 €)", "Write (no AI, €0)")}</Button>
        </div>
      </div>

      {list.length > 0 && (
        <ul className="mt-5 grid gap-2">
          {list.map((c) => (
            <li key={c.docKey}>
              <button type="button" onClick={() => setOpen(open === c.docKey ? null : c.docKey)} className={cx("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left hover:border-ink", open === c.docKey ? "border-ink" : "border-line")}>
                <FileText className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.title}</span>
                  <span className="text-xs text-muted">{t(TYPE_LABEL[c.type]?.[0] ?? c.type, TYPE_LABEL[c.type]?.[1] ?? c.type)} · v{c.version} · {c.lang.toUpperCase()}{c.source !== "engine" ? t(" · modifié par vous", " · edited by you") : ""}</span>
                </span>
                {c.verdict && VERDICT[c.verdict] && <Badge tone={VERDICT[c.verdict][0]}>{t(VERDICT[c.verdict][1], VERDICT[c.verdict][2])}</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <DocEditor key={open} projectId={id} docKey={open} onSaved={reload} />}
    </Card>
  );
}

function StrategyView({ data, blog, onTopic }: { data: Overview; blog: boolean; onTopic: (k: string) => void }) {
  const t = useT();
  const s = data.strategy;
  return (
    <div className="mt-5 grid gap-4 rounded-2xl bg-paper-2 p-4 text-sm" data-seo-strategy>
      <p className="rounded-xl border border-info/30 bg-info-soft px-3 py-2 text-info">{s.dataNote}</p>
      <div>
        <p className="font-semibold">{t("Objectifs", "Goals")}</p>
        <ul className="mt-1 list-disc pl-5">{s.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
      </div>
      <div>
        <p className="font-semibold">{t("Pages prioritaires", "Priority pages")}</p>
        <ul className="mt-1 grid gap-1">
          {s.priorityPages.map((p) => (
            <li key={p.key} className="flex flex-wrap items-center gap-2">
              <Badge tone={p.status === "existing" ? "ok" : "neutral"}>{p.status === "existing" ? t("existante", "existing") : t("prévue", "planned")}</Badge>
              <span className="font-medium">{p.title}</span>
              {p.primaryKeyword && <span className="text-muted">— « {p.primaryKeyword} »</span>}
            </li>
          ))}
        </ul>
      </div>
      {blog && s.calendar.length > 0 && (
        <div>
          <p className="font-semibold">{t("Calendrier éditorial (une idée toutes les deux semaines)", "Editorial calendar (one idea every two weeks)")}</p>
          <ul className="mt-1 grid gap-1">{s.calendar.map((c) => <li key={c.keyword}><button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => onTopic(c.keyword)}>{t(`Semaine ${c.week}`, `Week ${c.week}`)} : {c.title}</button></li>)}</ul>
        </div>
      )}
      {s.local && (
        <div>
          <p className="font-semibold">{t("Référencement local", "Local SEO")}</p>
          <ul className="mt-1 list-disc pl-5">{[...s.local.opportunities, ...s.local.schema].map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {s.linking.length > 0 && (
        <div>
          <p className="font-semibold">{t("Maillage interne", "Internal linking")}</p>
          <ul className="mt-1 grid gap-1">{s.linking.slice(0, 8).map((l) => <li key={`${l.from}-${l.to}`}>{l.from} → {l.to} <span className="text-muted">({l.status === "existing" ? t("pages en ligne", "live pages") : t("à lier quand la page existera", "to link once the page exists")})</span></li>)}</ul>
        </div>
      )}
      {s.gaps.length > 0 && (
        <div>
          <p className="font-semibold">{t("À compléter ou confirmer", "To complete or confirm")}</p>
          <ul className="mt-1 list-disc pl-5 text-warn">{s.gaps.slice(0, 8).map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
      )}
      <p className="text-muted">{s.hreflang.note}</p>
      <div>
        <p className="font-semibold">{t("Plateformes", "Platforms")}</p>
        <ul className="mt-1 grid gap-1">{data.cms.map((c) => <li key={c.platform}><span className="font-medium capitalize">{c.platform}</span> — {c.note}</li>)}</ul>
      </div>
      <div>
        <p className="font-semibold">{t("Audit technique", "Technical audit")}</p>
        <p className="text-muted">{data.audit.note}</p>
        <ul className="mt-1 grid gap-1">{data.audit.local.filter((x) => x.status === "issue").slice(0, 8).map((x, i) => <li key={i} className="text-warn">{x.page ? `${x.page} — ` : ""}{x.check} : {x.detail}</li>)}</ul>
      </div>
    </div>
  );
}

function DocEditor({ projectId, docKey, onSaved }: { projectId: string; docKey: string; onSaved: () => void }) {
  const t = useT();
  const toast = useToast();
  const base = `/api/projects/${projectId}/content/v2/${encodeURIComponent(docKey)}`;
  const { data, reload } = useApi<DocView>(base);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [chat, setChat] = useState("");
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data && !dirty) setDoc(data.doc);
  }, [data, dirty]);

  const update = useCallback((fn: (d: Doc) => Doc) => {
    setDoc((d) => (d ? fn(d) : d));
    setDirty(true);
  }, []);
  if (!data || !doc) return <div className="grid place-items-center py-8 text-muted"><Spinner className="size-5" /></div>;

  const setBlock = (id: string, patch: Partial<Block>) => update((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)) }));
  const move = (i: number, dir: -1 | 1) => update((d) => {
    const blocks = [...d.blocks];
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return d;
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    return { ...d, blocks };
  });
  const remove = (id: string) => update((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
  const add = (i: number, kind: Block["kind"]) => update((d) => {
    const nid = `u${Math.random().toString(36).slice(2, 10)}`;
    const b: Block = kind === "ul" || kind === "ol" ? { id: nid, kind, items: [""] } : kind === "faq" ? { id: nid, kind, q: "", a: "" } : kind === "cta" ? { id: nid, kind, text: "", url: null } : { id: nid, kind, text: "" };
    const blocks = [...d.blocks];
    blocks.splice(i + 1, 0, b);
    return { ...d, blocks };
  });
  // Mise en forme du texte sélectionné dans un paragraphe (aucune IA).
  const wrap = (id: string, kind: "bold" | "italic" | "link") => {
    const b = doc.blocks.find((x) => x.id === id);
    if (!b || !("text" in b)) return;
    // Passage sélectionné dans le paragraphe (la sélection reste dans le champ quand on clique sur le bouton).
    const el = root.current?.querySelector<HTMLTextAreaElement>(`textarea[data-block="${id}"]`);
    const [s, e] = el ? [el.selectionStart, el.selectionEnd] : [0, 0];
    if (s === e) return toast("bad", t("Sélectionnez d'abord le texte à mettre en forme.", "Select the text to format first."));
    const sel = b.text.slice(s, e);
    let out = sel;
    if (kind === "bold") out = `**${sel}**`;
    else if (kind === "italic") out = `*${sel}*`;
    else {
      const url = window.prompt(t("Adresse de la page (ex. /products/mon-produit) :", "Page address (e.g. /products/my-product):"));
      if (!url) return;
      if (!/^\/(?!\/)\S*$|^https:\/\/\S+$/.test(url)) return toast("bad", t("Adresse refusée : une page du site (« /… ») ou une adresse https.", "Address refused: a site page (“/…”) or an https address."));
      out = `[${sel}](${url})`;
    }
    setBlock(id, { text: b.text.slice(0, s) + out + b.text.slice(e) });
  };

  const save = async () => {
    setBusy(true);
    try {
      await api(base, { method: "PUT", body: { doc } });
      setDirty(false);
      await reload();
      onSaved();
      toast("ok", t("Enregistré : nouvelle version créée.", "Saved: new version created."));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    if (!chat.trim()) return;
    if (dirty) return toast("bad", t("Enregistrez d'abord vos modifications.", "Save your changes first."));
    setBusy(true);
    try {
      const r = await api<DocView>(base, { body: { action: "edit", request: chat, selected } });
      setChat("");
      setDirty(false);
      await reload();
      onSaved();
      toast(r.edit?.applied ? "ok" : "bad", r.edit?.summary ?? "");
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const restore = async (v: number) => {
    setBusy(true);
    try {
      await api(base, { body: { action: "restore", version: v } });
      setDirty(false);
      await reload();
      onSaved();
      toast("ok", t(`Version ${v} restaurée (copie : rien n'est perdu).`, `Version ${v} restored (copy: nothing is lost).`));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const ind = data.indicators;
  const count = (n: number, max: number) => <span className={cx("text-xs", n > max ? "text-warn" : "text-muted")}>{n}/{max}</span>;

  return (
    <div ref={root} className="mt-5 grid gap-5 border-t border-line pt-5" data-content-editor>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="signal" icon={<Save className="size-4" />} loading={busy} disabled={!dirty} onClick={save}>{t("Enregistrer", "Save")}</Button>
        <Button size="sm" variant="secondary" icon={<Eye className="size-4" />} onClick={() => setPreview((v) => !v)}>{preview ? t("Modifier", "Edit") : t("Aperçu", "Preview")}</Button>
        <a className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink" href={`${base}?export=html`}><Download className="size-3.5" /> HTML</a>
        <a className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink" href={`${base}?export=md`}><Download className="size-3.5" /> Markdown</a>
        <a className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink" href={`${base}?export=json`}><Download className="size-3.5" /> JSON + JSON-LD</a>
        {dirty && <span className="text-xs text-warn">{t("Modifications non enregistrées", "Unsaved changes")}</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Titre SEO", "SEO title")} htmlFor="seo-title" hint={count(doc.meta.seoTitle.length, 60)}>
          <Input id="seo-title" value={doc.meta.seoTitle} onChange={(e) => update((d) => ({ ...d, meta: { ...d.meta, seoTitle: e.target.value } }))} />
        </Field>
        <Field label={t("Adresse (slug)", "Address (slug)")} htmlFor="seo-slug">
          <Input id="seo-slug" value={doc.meta.slug} onChange={(e) => update((d) => ({ ...d, meta: { ...d.meta, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") } }))} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t("Méta-description", "Meta description")} htmlFor="seo-desc" hint={count(doc.meta.metaDescription.length, 155)}>
            <Textarea id="seo-desc" rows={2} value={doc.meta.metaDescription} onChange={(e) => update((d) => ({ ...d, meta: { ...d.meta, metaDescription: e.target.value } }))} />
          </Field>
        </div>
        <p className="text-xs text-muted sm:col-span-2">{t("60 et 155 caractères sont des repères éditoriaux, pas une garantie d'affichage par Google.", "60 and 155 characters are editorial targets, not a guarantee of how Google displays them.")}{doc.primaryKeyword ? t(` Requête visée (hypothèse) : « ${doc.primaryKeyword} ».`, ` Target query (hypothesis): “${doc.primaryKeyword}”.`) : ""}</p>
      </div>

      {preview ? (
        <article className="text-[15px] leading-relaxed [&_a]:text-signal [&_a]:underline [&_details]:my-2 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_summary]:font-medium [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: data.html }} />
      ) : (
        <ol className="grid gap-3">
          {doc.blocks.map((b, i) => (
            <li key={b.id} className={cx("rounded-2xl border p-3", selected.includes(b.id) ? "border-signal" : "border-line")}>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <label className="mr-1 inline-flex items-center gap-1 text-xs text-muted">
                  <input type="checkbox" checked={selected.includes(b.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, b.id] : s.filter((x) => x !== b.id)))} />
                  {t("cibler", "target")}
                </label>
                {"text" in b && b.kind !== "cta" ? (
                  <select value={b.kind} onChange={(e) => setBlock(b.id, { kind: e.target.value as "p" })} className={MINI} aria-label={t("Nature du bloc", "Block type")}>
                    <option value="h1">{t("Titre H1", "H1 title")}</option>
                    <option value="h2">{t("Intertitre H2", "H2 heading")}</option>
                    <option value="h3">{t("Intertitre H3", "H3 heading")}</option>
                    <option value="p">{t("Paragraphe", "Paragraph")}</option>
                  </select>
                ) : (
                  <Badge>{b.kind === "faq" ? t("Question", "Question") : b.kind === "cta" ? t("Bouton", "Button") : t("Liste", "List")}</Badge>
                )}
                {b.kind === "p" && (
                  <>
                    <button type="button" className="rounded-lg p-1 hover:bg-paper-2" title={t("Gras", "Bold")} onClick={() => wrap(b.id, "bold")}><Bold className="size-3.5" /></button>
                    <button type="button" className="rounded-lg p-1 hover:bg-paper-2" title={t("Italique", "Italic")} onClick={() => wrap(b.id, "italic")}><Italic className="size-3.5" /></button>
                    <button type="button" className="rounded-lg p-1 hover:bg-paper-2" title={t("Lien", "Link")} onClick={() => wrap(b.id, "link")}><Link2 className="size-3.5" /></button>
                  </>
                )}
                <span className="flex-1" />
                <button type="button" className="rounded-lg p-1 hover:bg-paper-2" title={t("Monter", "Move up")} onClick={() => move(i, -1)}><ArrowUp className="size-3.5" /></button>
                <button type="button" className="rounded-lg p-1 hover:bg-paper-2" title={t("Descendre", "Move down")} onClick={() => move(i, 1)}><ArrowDown className="size-3.5" /></button>
                <select value="" onChange={(e) => e.target.value && add(i, e.target.value as Block["kind"])} className={MINI} aria-label={t("Ajouter un bloc après", "Add a block after")}>
                  <option value="">{t("+ bloc", "+ block")}</option>
                  <option value="p">{t("Paragraphe", "Paragraph")}</option>
                  <option value="h2">{t("Intertitre", "Heading")}</option>
                  <option value="ul">{t("Liste", "List")}</option>
                  <option value="faq">{t("Question", "Question")}</option>
                </select>
                <button type="button" className="rounded-lg p-1 text-bad hover:bg-bad-soft" title={t("Supprimer", "Delete")} onClick={() => remove(b.id)}><Trash2 className="size-3.5" /></button>
              </div>
              {(b.kind === "h1" || b.kind === "h2" || b.kind === "h3") && <Input value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} className={cx("font-semibold", b.kind === "h1" && "text-lg")} />}
              {b.kind === "p" && <Textarea autoGrow rows={3} data-block={b.id} value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} />}
              {(b.kind === "ul" || b.kind === "ol") && <Textarea autoGrow rows={3} value={b.items.join("\n")} onChange={(e) => setBlock(b.id, { items: e.target.value.split("\n") })} aria-label={t("Une ligne par élément", "One line per item")} />}
              {b.kind === "faq" && (
                <div className="grid gap-2">
                  <Input value={b.q} onChange={(e) => setBlock(b.id, { q: e.target.value })} placeholder={t("Question", "Question")} />
                  <Textarea autoGrow rows={2} value={b.a} onChange={(e) => setBlock(b.id, { a: e.target.value })} placeholder={t("Réponse", "Answer")} />
                </div>
              )}
              {b.kind === "cta" && <Input value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} />}
            </li>
          ))}
          <li><Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => add(doc.blocks.length - 1, "p")}>{t("Ajouter un paragraphe", "Add a paragraph")}</Button></li>
        </ol>
      )}

      <div className="grid gap-2 rounded-2xl border border-line p-4" data-content-chat>
        <p className="flex items-center gap-2 font-semibold"><MessageSquare className="size-4" /> {t("Demander une retouche", "Ask for an edit")}</p>
        <p className="text-xs text-muted">{t("Ex. « Raccourcis ce paragraphe », « Ajoute une FAQ », « Optimise ce titre SEO » (gratuit, sans IA) ; « Rends ce texte plus premium », « Change le ton » (IA, seulement les blocs ciblés).", "E.g. “Shorten this paragraph”, “Add a FAQ”, “Optimize this SEO title” (free, no AI); “Make this more premium”, “Change the tone” (AI, targeted blocks only).")}</p>
        <div className="flex gap-2">
          <Input value={chat} onChange={(e) => setChat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={selected.length ? t(`${selected.length} bloc(s) ciblé(s)`, `${selected.length} block(s) targeted`) : t("Votre demande", "Your request")} />
          <Button loading={busy} onClick={send}>{t("Envoyer", "Send")}</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-paper-2 p-4 text-sm" data-seo-indicators>
          <p className="font-semibold">{t("Indicateurs SEO (contrôles locaux)", "SEO indicators (local checks)")}</p>
          <p className="mt-1 text-muted">{t(`${ind.measures.words ?? 0} mots · ${ind.measures.h1 ?? 0} H1 · ${ind.measures.placeholders ?? 0} à compléter`, `${ind.measures.words ?? 0} words · ${ind.measures.h1 ?? 0} H1 · ${ind.measures.placeholders ?? 0} to complete`)}</p>
          {ind.issues.length ? <ul className="mt-2 list-disc pl-5 text-warn">{ind.issues.slice(0, 10).map((x) => <li key={x}>{x}</li>)}</ul> : <p className="mt-2 text-ok">{t("Aucun défaut détecté localement.", "No defect detected locally.")}</p>}
          {ind.links.length > 0 && (
            <>
              <p className="mt-3 font-semibold">{t("Liens internes suggérés", "Suggested internal links")}</p>
              <ul className="mt-1 list-disc pl-5">{ind.links.map((l) => <li key={l.to.key}>{l.to.title} — <span className="text-muted">{l.note}</span></li>)}</ul>
            </>
          )}
        </div>
        <div className="rounded-2xl bg-paper-2 p-4 text-sm">
          <p className="font-semibold">{t("Versions", "Versions")}</p>
          <ul className="mt-2 grid max-h-56 gap-1.5 overflow-auto">
            {data.versions.map((v) => (
              <li key={v.version} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">v{v.version} · {v.note || v.source}</span>
                {v.version !== data.version.version && <Button size="sm" variant="secondary" icon={<RotateCcw className="size-3.5" />} onClick={() => restore(v.version)}>{t("Restaurer", "Restore")}</Button>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
