"use client";
/**
 * Onglet Blog : articles écrits par l'IA pour aider à vendre (forfaits Vendre et Dominer).
 * Compteur d'articles restants, « Écrire un article » (sujet proposé ou libre), liste, éditeur simple avec aperçu,
 * publication dans Shopify ou export (HTML à coller, fichier d'import WordPress).
 * Sans forfait ou avec Créer : présentation et « Inclus dans les forfaits Vendre et Dominer ».
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold, Check, ClipboardCopy, Download, ExternalLink, Eye, Heading2, Heading3, ImageIcon, Lightbulb, Link2, List, Newspaper, Pencil, RefreshCw, RotateCcw, Send, Sparkles, Trash2, TriangleAlert, Wand2, X,
} from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, formatDate, Input, LinkButton, Modal, Spinner, Textarea, useApi, useToast } from "../ui";
import { useLang, useT } from "../i18n";
import { useProject } from "./project-context";
import { JobProgress, MediaPicker, useActive } from "./common";
import { useCostConfirm } from "./cost-confirm";
import { ContentLangPicker, useContentLang } from "./content-lang";
import { PLANS, type PlanId } from "@/lib/plans";
import { countWords, sanitizeBlogHtml } from "@/lib/blog-html";

type Article = {
  id: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  bodyHtml: string;
  tags: string[];
  cover: { id: string; url: string; thumbUrl: string } | null;
  language: string;
  status: "draft" | "ready" | "published";
  publishedUrl: string | null;
  onShopify: boolean;
  qcNotes: string[];
  words: number;
  placeholders: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};
type BlogData = {
  articles: Article[];
  trash?: Article[];
  trashCount: number;
  access: { allowed: boolean; admin: boolean; plan: PlanId | null; left: number; included: number; reason: string | null };
  shopify: boolean;
  ai: boolean;
  links: { title: string; url: string; kind: string }[];
};
type Topic = { title: string; kind: "question" | "usage" | "guide" | "comparison"; why: string; keyword?: string };

const STATUS: Record<Article["status"], { fr: string; en: string; tone: "neutral" | "info" | "ok" }> = {
  draft: { fr: "Brouillon", en: "Draft", tone: "neutral" },
  ready: { fr: "Prêt", en: "Ready", tone: "info" },
  published: { fr: "Publié", en: "Published", tone: "ok" },
};
const KIND: Record<Topic["kind"], { fr: string; en: string }> = {
  question: { fr: "Question d'acheteur", en: "Buyer question" },
  usage: { fr: "Usage", en: "How to use" },
  guide: { fr: "Guide", en: "Guide" },
  comparison: { fr: "Comparatif honnête", en: "Honest comparison" },
};

/** Mise en forme de l'article (aperçu et éditeur). */
const PROSE = "text-[15px] leading-relaxed text-ink [&_a]:text-signal [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-4 [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5";

/** Télécharge un export (le serveur vérifie le forfait : son message s'affiche en cas de refus). */
async function download(url: string, onError: (m: string) => void) {
  const r = await fetch(url);
  if (!r.ok) {
    const j = await r.json().catch(() => null);
    return onError(j?.error ?? `Erreur ${r.status}`);
  }
  const name = decodeURIComponent(r.headers.get("Content-Disposition")?.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? "article");
  const href = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

export default function TabBlog() {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const active = useActive("blog.write");
  const [showTrash, setShowTrash] = useState(false);
  const { data, reload, error } = useApi<BlogData>(`/api/projects/${id}/blog${showTrash ? "?trash=1" : ""}`);
  const [writeOpen, setWriteOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const cost = useCostConfirm();

  // Fin d'une écriture : la liste se met à jour et l'article s'ouvre.
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(async () => {
      try {
        const { job } = await api<{ job: { status: string; result: any; error: string | null } }>(`/api/jobs/${pending}`);
        if (["done", "failed", "cancelled"].includes(job.status)) {
          clearInterval(timer);
          setPending(null);
          await reload();
          if (job.status === "done" && job.result?.articleId) {
            setOpenId(job.result.articleId);
            toast("ok", t("Votre article est prêt : relisez-le avant de le publier.", "Your post is ready: review it before publishing."));
          } else if (job.status === "failed") toast("bad", job.error ?? t("L'article n'a pas pu être écrit.", "The post couldn't be written."));
        }
      } catch {}
    }, 2000);
    return () => clearInterval(timer);
  }, [pending, reload, t, toast]);

  const startJob = useCallback((jobId: string) => setPending(jobId), []);
  const busy = !!pending || active.length > 0;

  if (error && !data) return <Empty title={t("Blog indisponible", "Blog unavailable")} icon={<Newspaper className="size-5" />}>{error}</Empty>;
  if (!data) return <div className="grid place-items-center py-24 text-muted"><Spinner className="size-6" /></div>;
  const { access } = data;
  if (!access.allowed) return <BlogPresentation reason={access.reason} />;

  const left = access.left;
  const canWrite = data.ai && (access.admin || left > 0) && !busy;
  const why = !data.ai
    ? t("L'IA n'est pas encore connectée sur cette installation : l'écriture d'articles sera disponible dès qu'elle le sera.", "AI isn't connected on this installation yet: writing posts will be available as soon as it is.")
    : !access.admin && left < 1
      ? t("Vous avez utilisé tous vos articles de ce mois-ci : ils reviennent au renouvellement de votre forfait. Vous pouvez toujours modifier, publier et exporter vos articles.", "You've used all your posts this month: they come back when your plan renews. You can still edit, publish and export your posts.")
      : busy
        ? t("Un article est en cours d'écriture.", "A post is being written.")
        : null;
  const list = showTrash ? data.trash ?? [] : data.articles;
  const current = data.articles.find((a) => a.id === openId) ?? null;

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6">
      {cost.dialog}
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-signal-soft text-signal"><Newspaper className="size-5" aria-hidden /></span>
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold" data-blog-counter>
              {access.admin
                ? t("Administrateur : articles sans limite", "Administrator: unlimited posts")
                : t(`Il vous reste ${left} ${left > 1 ? "articles" : "article"} ce mois-ci`, `You have ${left} ${left === 1 ? "post" : "posts"} left this month`)}
            </p>
            <p className="mt-0.5 text-sm text-muted">{t("L'IA écrit des articles utiles pour vendre, à partir des faits de votre projet. Elle n'invente rien : ce qui manque est marqué « [À compléter] ».", "AI writes useful posts that help you sell, based on your project's facts. It invents nothing: anything missing is marked \"[To complete]\".")}</p>
          </div>
        </div>
        <div className="grid shrink-0 gap-1.5 sm:justify-items-end">
          <Button variant="signal" icon={<Sparkles className="size-4" />} disabled={!canWrite} onClick={() => setWriteOpen(true)} title={why ?? undefined}>{t("Écrire un article", "Write a post")}</Button>
        </div>
      </Card>
      {why && !busy && <p className="-mt-3 rounded-2xl border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">{why}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">{showTrash ? t("Corbeille", "Trash") : t("Vos articles", "Your posts")}</h2>
        {(data.trashCount > 0 || showTrash) && (
          <button type="button" onClick={() => setShowTrash((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink">
            {showTrash ? <><X className="size-3.5" /> {t("Fermer la corbeille", "Close trash")}</> : <><Trash2 className="size-3.5" /> {t(`Corbeille (${data.trashCount})`, `Trash (${data.trashCount})`)}</>}
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <Empty title={showTrash ? t("La corbeille est vide", "The trash is empty") : t("Aucun article pour l'instant", "No posts yet")} icon={<Newspaper className="size-5" />}>
          {!showTrash && t("Cliquez sur « Écrire un article » : l'IA vous propose des sujets tirés de votre projet, ou écrit sur le sujet de votre choix.", "Click \"Write a post\": AI suggests topics from your project, or writes about the topic of your choice.")}
        </Empty>
      ) : (
        <div className="grid gap-3">
          {list.map((a) => (
            <Card key={a.id} className="flex items-stretch overflow-hidden">
              <button type="button" disabled={showTrash} onClick={() => setOpenId(a.id)} className="flex min-w-0 flex-1 items-center gap-4 p-3 text-left enabled:hover:bg-paper-2">
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-paper-2 text-muted">
                  {a.cover ? <img src={a.cover.thumbUrl} alt="" className="size-full object-cover" /> : <Newspaper className="size-5" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block font-medium">{a.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    <span>{formatDate(a.updatedAt, { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span>· {t(`${a.words} mots`, `${a.words} words`)}</span>
                    <span className="uppercase">· {a.language}</span>
                    {a.placeholders > 0 && <span className="text-warn">· {t(`${a.placeholders} à compléter`, `${a.placeholders} to complete`)}</span>}
                  </span>
                </span>
                <Badge tone={STATUS[a.status].tone}>{t(STATUS[a.status].fr, STATUS[a.status].en)}</Badge>
              </button>
              {showTrash && (
                <div className="grid place-items-center border-l border-line px-3">
                  <Button size="sm" variant="secondary" icon={<RotateCcw className="size-3.5" />} onClick={async () => { try { await api(`/api/projects/${id}/blog/${a.id}`, { method: "PATCH", body: { restore: true } }); toast("ok", t("Article restauré.", "Post restored.")); reload(); } catch (e) { toast("bad", (e as Error).message); } }}>{t("Restaurer", "Restore")}</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <WriteDialog open={writeOpen} onClose={() => setWriteOpen(false)} left={left} admin={access.admin} confirm={cost.confirm} onStarted={(j) => { setWriteOpen(false); startJob(j); }} />
      {current && <ArticleEditor key={current.id} article={current} data={data} busy={busy} confirm={cost.confirm} onClose={() => setOpenId(null)} onChanged={reload} onStarted={(j) => { setOpenId(null); startJob(j); }} />}
    </div>
  );
}

/** Sans forfait ou avec Créer : ce que fait l'onglet et quels forfaits l'incluent. */
function BlogPresentation({ reason }: { reason: string | null }) {
  const t = useT();
  const { lang } = useLang();
  const v = PLANS.vendre;
  const d = PLANS.dominer;
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Card className="overflow-hidden">
        <div className="grid gap-5 p-6 sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-signal-soft text-signal"><Newspaper className="size-6" aria-hidden /></span>
          <div>
            <Badge tone="signal">{t("Inclus dans les forfaits Vendre et Dominer", "Included in the Sell and Dominate plans")}</Badge>
            <h2 className="mt-3 font-display text-3xl font-semibold">{t("Des articles de blog qui aident à vendre", "Blog posts that help you sell")}</h2>
            <p className="mt-2 text-muted">{t("L'IA écrit pour votre boutique des articles complets et optimisés pour Google, à partir de ce qui est vrai sur vos produits ou vos services.", "AI writes complete, Google-ready posts for your store, based on what's true about your products or services.")}</p>
          </div>
          <ul className="grid gap-2.5 text-sm">
            {[
              [t("Des sujets utiles proposés pour vous : questions des acheteurs, usages, guides pour choisir, comparatifs honnêtes.", "Useful topics suggested for you: buyer questions, how-tos, buying guides, honest comparisons."), Lightbulb],
              [t("Un article complet : titre, texte de 700 à 1 200 mots, description pour Google, liens vers vos produits.", "A complete post: title, 700 to 1,200 words, Google description, links to your products."), Pencil],
              [t("Aucune invention : pas de faux avis, pas de chiffres ni de promesses. Ce qui manque est signalé.", "Nothing made up: no fake reviews, no figures or promises. Anything missing is flagged."), Check],
              [t("Publié dans votre blog Shopify, ou exporté pour WordPress et les autres plateformes.", "Published to your Shopify blog, or exported for WordPress and other platforms."), Send],
            ].map(([text, Icon]: any, i) => (
              <li key={i} className="flex gap-3"><Icon className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden /> <span>{text}</span></li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-line p-4"><p className="font-semibold">{v.name[lang]}</p><p className="text-sm text-muted">{t(`${v.quotas.blog} articles par mois`, `${v.quotas.blog} posts a month`)}</p></div>
            <div className="rounded-2xl border border-line p-4"><p className="font-semibold">{d.name[lang]}</p><p className="text-sm text-muted">{t(`${d.quotas.blog} articles par mois`, `${d.quotas.blog} posts a month`)}</p></div>
          </div>
          {reason && <p className="rounded-2xl border border-info/30 bg-info-soft p-3 text-sm text-info">{reason}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <LinkButton href="/studio/compte#forfaits" variant="signal">{t("Voir les forfaits", "See the plans")}</LinkButton>
            <Button variant="secondary" disabled title={reason ?? undefined} icon={<Sparkles className="size-4" />}>{t("Écrire un article", "Write a post")}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

type Confirm = ReturnType<typeof useCostConfirm>["confirm"];

/** Choix du sujet : proposé par l'IA (gratuit) ou libre, puis lancement (1 article). */
function WriteDialog({ open, onClose, onStarted, confirm }: { open: boolean; onClose: () => void; onStarted: (jobId: string) => void; left: number; admin: boolean; confirm: Confirm }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const cl = useContentLang();
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<string>("");
  const [free, setFree] = useState("");
  const [brief, setBrief] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const r = await api<{ topics: Topic[] }>(`/api/projects/${id}/blog/topics${refresh ? "?refresh=1" : ""}`, { lang: cl.lang });
      setTopics(r.topics);
    } catch (e) {
      toast("bad", (e as Error).message);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [id, cl.lang, toast]);
  useEffect(() => {
    if (open && !topics && !loading) void load();
  }, [open, topics, loading, load]);
  useEffect(() => {
    if (!open) return;
    setTopics(null);
  }, [cl.lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const topic = free.trim() || chosen;
  const go = async () => {
    if (!(await confirm("blog"))) return;
    setSending(true);
    try {
      const r = await api<{ jobId: string }>(`/api/projects/${id}/blog`, { body: { topic: topic || undefined, brief: brief.trim() || undefined }, lang: cl.lang });
      toast("ok", t("L'article est en cours d'écriture : comptez une à deux minutes.", "The post is being written: allow one to two minutes."));
      setChosen("");
      setFree("");
      setBrief("");
      onStarted(r.jobId);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("Écrire un article", "Write a post")} wide>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{t("Sujets proposés pour votre projet", "Topics suggested for your project")}</p>
          <Button size="sm" variant="ghost" icon={<RefreshCw className={cx("size-3.5", loading && "animate-spin")} />} disabled={loading} onClick={() => load(true)}>{t("Autres idées", "More ideas")}</Button>
        </div>
        {loading && !topics?.length ? (
          <div className="grid place-items-center py-8 text-muted"><Spinner /></div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {(topics ?? []).map((tp) => {
              const on = chosen === tp.title && !free.trim();
              return (
                <button key={tp.title} type="button" onClick={() => (setChosen(on ? "" : tp.title), setFree(""))} aria-pressed={on} className={cx("grid gap-1 rounded-2xl border p-3 text-left text-sm transition", on ? "border-signal bg-signal-soft" : "border-line hover:border-ink")}>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t(KIND[tp.kind].fr, KIND[tp.kind].en)}</span>
                  <span className="font-medium">{tp.title}</span>
                  {tp.why && <span className="text-xs text-muted">{tp.why}</span>}
                  {tp.keyword && <span className="text-xs text-ink-2">{t("Recherche visée : ", "Target search: ")}<span className="font-medium">{t(`« ${tp.keyword} »`, `"${tp.keyword}"`)}</span></span>}
                </button>
              );
            })}
          </div>
        )}
        <Field label={t("Ou votre propre sujet", "Or your own topic")} htmlFor="blog-free">
          <Input id="blog-free" value={free} onChange={(e) => setFree(e.target.value)} maxLength={200} placeholder={t("Ex. : Comment choisir la bonne taille ?", "E.g. How to choose the right size?")} />
        </Field>
        <Field label={t("Précisions pour l'IA (facultatif)", "Notes for the AI (optional)")} htmlFor="blog-brief" hint={t("Ce que vous voulez mettre en avant, les questions de vos clients… L'IA n'utilise que des informations vraies.", "What you want to highlight, your customers' questions… AI only uses true information.")}>
          <Textarea id="blog-brief" rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={1500} />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ContentLangPicker {...cl} />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>{t("Annuler", "Cancel")}</Button>
            <Button variant="signal" icon={<Sparkles className="size-4" />} loading={sending} disabled={sending} onClick={go}>{topic ? t("Écrire l'article", "Write the post") : t("Laisser l'IA choisir", "Let AI choose")}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Éditeur simple : titre, extrait, corps (mise en forme de base) avec aperçu, méta SEO repliées. */
function ArticleEditor({ article, data, busy, confirm, onClose, onChanged, onStarted }: { article: Article; data: BlogData; busy: boolean; confirm: Confirm; onClose: () => void; onChanged: () => Promise<void> | void; onStarted: (jobId: string) => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [a, setA] = useState(article);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [tags, setTags] = useState(article.tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pick, setPick] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [instruction, setInstruction] = useState("");
  const [publishing, setPublishing] = useState<"draft" | "live" | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  const html = useRef(article.bodyHtml);
  const [words, setWords] = useState(article.words);

  useEffect(() => {
    if (mode === "edit" && editor.current) editor.current.innerHTML = html.current;
  }, [mode]);

  const set = <K extends keyof Article>(k: K, v: Article[K]) => (setA((x) => ({ ...x, [k]: v })), setDirty(true));
  const onInput = () => {
    const next = editor.current?.innerHTML ?? "";
    // Un simple clic (sortie du champ sans rien changer) ne marque pas l'article comme modifié.
    if (next === html.current) return;
    html.current = next;
    setWords(countWords(next));
    setDirty(true);
  };
  const cmd = (name: string, value?: string) => {
    editor.current?.focus();
    document.execCommand(name, false, value);
    onInput();
  };

  const save = async (extra: Record<string, unknown> = {}) => {
    setSaving(true);
    try {
      const r = await api<{ article: Article }>(`/api/projects/${id}/blog/${a.id}`, {
        method: "PATCH",
        body: { title: a.title, slug: a.slug, excerpt: a.excerpt, metaTitle: a.metaTitle, metaDescription: a.metaDescription, bodyHtml: html.current, tags: tags.split(",").map((x) => x.trim()).filter(Boolean), coverAssetId: a.cover?.id ?? null, ...extra },
      });
      setA(r.article);
      html.current = r.article.bodyHtml;
      if (editor.current && mode === "edit") editor.current.innerHTML = r.article.bodyHtml;
      setDirty(false);
      await onChanged();
      return r.article;
    } catch (e) {
      toast("bad", (e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (dirty && !window.confirm(t("Fermer sans enregistrer vos modifications ?", "Close without saving your changes?"))) return;
    onClose();
  };

  /** Article actuellement en ligne sur Shopify (même s'il a été modifié depuis). */
  const online = !!a.publishedUrl;

  const publish = async (live: boolean) => {
    // Repasser en brouillon un article en ligne le retire du blog public : confirmation explicite.
    if (!live && online && !window.confirm(t("Retirer cet article de votre blog Shopify ? Il ne sera plus visible en ligne (il reste en brouillon dans Shopify et ici).", "Remove this post from your Shopify blog? It will no longer be visible online (it stays as a draft in Shopify and here)."))) return;
    setPublishing(live ? "live" : "draft");
    try {
      if (dirty && !(await save())) return;
      const r = await api<{ article: Article; url: string; hasCover?: boolean; coverSent: boolean }>(`/api/projects/${id}/blog/${a.id}/publish`, { body: { publish: live, ...(!live && online ? { unpublish: true } : {}) } });
      setA(r.article);
      await onChanged();
      const msg = live
        ? t("Article publié dans votre blog Shopify.", "Post published to your Shopify blog.")
        : online
          ? t("Article retiré de votre blog Shopify (brouillon).", "Post removed from your Shopify blog (draft).")
          : t("Article envoyé en brouillon dans votre blog Shopify.", "Post sent as a draft to your Shopify blog.");
      const coverNote = r.hasCover && !r.coverSent ? t(" La couverture n'a pas été envoyée : ajoutez-la dans Shopify.", " The cover wasn't sent: add it in Shopify.") : "";
      toast(coverNote ? "info" : "ok", msg + coverNote);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setPublishing(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sanitizeBlogHtml(html.current));
      toast("ok", t("Texte HTML copié : collez-le dans l'éditeur de votre site (mode HTML ou code).", "HTML copied: paste it into your site's editor (HTML or code view)."));
    } catch {
      toast("bad", t("La copie n'est pas autorisée par le navigateur : utilisez « Fichier HTML ».", "The browser didn't allow copying: use \"HTML file\"."));
    }
  };

  const rewrite = async () => {
    if (dirty && !window.confirm(t("La réécriture remplacera vos modifications non enregistrées. Continuer ?", "Rewriting will replace your unsaved changes. Continue?"))) return;
    if (!(await confirm("blog"))) return;
    try {
      const r = await api<{ jobId: string }>(`/api/projects/${id}/blog/${a.id}/rewrite`, { body: { instruction: instruction.trim() || undefined } });
      toast("ok", t("Réécriture en cours : comptez une à deux minutes.", "Rewriting: allow one to two minutes."));
      onStarted(r.jobId);
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };

  const remove = async () => {
    const msg = online
      ? t("Mettre cet article à la corbeille ? Vous pourrez le restaurer. Il reste en ligne sur Shopify tant que vous ne l'y supprimez pas.", "Move this post to the trash? You can restore it. It stays live on Shopify until you delete it there.")
      : t("Mettre cet article à la corbeille ? Vous pourrez le restaurer.", "Move this post to the trash? You can restore it.");
    if (!window.confirm(msg)) return;
    try {
      await api(`/api/projects/${id}/blog/${a.id}`, { method: "DELETE" });
      toast("ok", online ? t("Article mis à la corbeille. Il reste en ligne sur Shopify tant que vous ne l'y supprimez pas.", "Post moved to the trash. It stays live on Shopify until you delete it there.") : t("Article mis à la corbeille.", "Post moved to the trash."));
      await onChanged();
      onClose();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };

  const insertLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    cmd("createLink", url);
    setLinkOpen(false);
    setLinkUrl("");
  };

  const tool = "grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-paper-2 hover:text-ink";
  const exportUrl = (f: "html" | "wxr") => `/api/projects/${id}/blog/${a.id}/export?format=${f}`;
  const exportError = (m: string) => toast("bad", m);

  return (
    <Modal open onClose={close} title={t("Article", "Post")} xl>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 content-start gap-4">
          {a.qcNotes.length > 0 && (
            <div className="rounded-2xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
              <p className="flex items-center gap-2 font-semibold"><TriangleAlert className="size-4" aria-hidden /> {t("À relire avant de publier", "Review before publishing")}</p>
              <ul className="mt-1.5 grid list-disc gap-1 pl-5 text-xs">{a.qcNotes.slice(0, 8).map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
          )}
          <Field label={t("Titre", "Title")} htmlFor="blog-title">
            <Input id="blog-title" value={a.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />
          </Field>
          <Field label={t("Extrait", "Excerpt")} htmlFor="blog-excerpt" hint={t("Une ou deux phrases, affichées dans la liste des articles.", "One or two sentences, shown in the post list.")}>
            <Textarea id="blog-excerpt" rows={2} value={a.excerpt} onChange={(e) => set("excerpt", e.target.value)} maxLength={1000} />
          </Field>
          <div className="grid gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{t("Texte de l'article", "Post body")} <span className="font-normal text-muted">· {t(`${words} mots`, `${words} words`)}</span></span>
              <div className="flex rounded-full border border-line p-0.5 text-sm" role="tablist">
                <button type="button" role="tab" aria-selected={mode === "edit"} onClick={() => setMode("edit")} className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1", mode === "edit" && "bg-ink text-paper")}><Pencil className="size-3.5" /> {t("Modifier", "Edit")}</button>
                <button type="button" role="tab" aria-selected={mode === "preview"} onClick={() => setMode("preview")} className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1", mode === "preview" && "bg-ink text-paper")}><Eye className="size-3.5" /> {t("Aperçu", "Preview")}</button>
              </div>
            </div>
            {mode === "edit" ? (
              <div className="overflow-hidden rounded-2xl border border-line bg-card focus-within:border-ink">
                <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-paper-2/60 p-1">
                  <button type="button" className={tool} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("formatBlock", "<h2>")} title={t("Intertitre", "Heading")} aria-label={t("Intertitre", "Heading")}><Heading2 className="size-4" /></button>
                  <button type="button" className={tool} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("formatBlock", "<h3>")} title={t("Sous-titre", "Subheading")} aria-label={t("Sous-titre", "Subheading")}><Heading3 className="size-4" /></button>
                  <button type="button" className={cx(tool, "w-auto px-2 text-xs font-medium")} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("formatBlock", "<p>")} title={t("Paragraphe", "Paragraph")}>{t("Texte", "Text")}</button>
                  <button type="button" className={tool} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("bold")} title={t("Gras", "Bold")} aria-label={t("Gras", "Bold")}><Bold className="size-4" /></button>
                  <button type="button" className={tool} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("insertUnorderedList")} title={t("Liste", "List")} aria-label={t("Liste", "List")}><List className="size-4" /></button>
                  <button type="button" className={tool} onMouseDown={(e) => e.preventDefault()} onClick={() => setLinkOpen((v) => !v)} title={t("Lien", "Link")} aria-label={t("Lien", "Link")}><Link2 className="size-4" /></button>
                </div>
                {linkOpen && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-line p-2">
                    {data.links.length > 0 && (
                      <select className="h-9 min-w-0 flex-1 rounded-full border border-line bg-card px-3 text-sm" value="" onChange={(e) => setLinkUrl(e.target.value)} aria-label={t("Page de la boutique", "Store page")}>
                        <option value="">{t("Page de la boutique…", "Store page…")}</option>
                        {data.links.map((l) => <option key={l.url} value={l.url}>{l.title}</option>)}
                      </select>
                    )}
                    <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder={t("/products/… ou https://…", "/products/… or https://…")} aria-label={t("Adresse du lien", "Link address")} className="h-9 min-w-0 flex-1" />
                    <Button size="sm" onClick={insertLink} disabled={!linkUrl.trim()}>{t("Ajouter le lien", "Add link")}</Button>
                    <p className="w-full text-xs text-muted">{t("Sélectionnez d'abord les mots à transformer en lien.", "Select the words to turn into a link first.")}</p>
                  </div>
                )}
                <div ref={editor} contentEditable suppressContentEditableWarning onInput={onInput} onBlur={onInput} className={cx(PROSE, "min-h-[320px] max-h-[55dvh] overflow-y-auto px-4 py-2 outline-none")} aria-label={t("Texte de l'article", "Post body")} role="textbox" aria-multiline="true" />
              </div>
            ) : (
              <article className="rounded-2xl border border-line bg-card p-5">
                {a.cover && <img src={a.cover.url} alt="" className="mb-4 aspect-[16/9] w-full rounded-xl object-cover" />}
                <h1 className="font-display text-3xl font-semibold leading-tight">{a.title}</h1>
                {a.excerpt && <p className="mt-2 text-muted">{a.excerpt}</p>}
                <div className={PROSE} dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(html.current) }} />
              </article>
            )}
          </div>
          <details className="rounded-2xl border border-line p-4">
            <summary className="cursor-pointer text-sm font-semibold">{t("Référencement Google (facultatif)", "Google search settings (optional)")}</summary>
            <div className="mt-4 grid gap-4">
              <Field label={t("Titre pour Google", "Title for Google")} htmlFor="blog-mt" hint={`${a.metaTitle.length}/60`}>
                <Input id="blog-mt" value={a.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} maxLength={70} />
              </Field>
              <Field label={t("Description pour Google", "Description for Google")} htmlFor="blog-md" hint={`${a.metaDescription.length}/160`}>
                <Textarea id="blog-md" rows={2} value={a.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} maxLength={180} />
              </Field>
              <Field label={t("Adresse de l'article", "Post address")} htmlFor="blog-slug" hint={`…/blogs/…/${a.slug}`}>
                <Input id="blog-slug" value={a.slug} onChange={(e) => set("slug", e.target.value)} maxLength={120} />
              </Field>
              <Field label={t("Étiquettes", "Tags")} htmlFor="blog-tags" hint={t("Séparées par des virgules.", "Separated by commas.")}>
                <Input id="blog-tags" value={tags} onChange={(e) => (setTags(e.target.value), setDirty(true))} />
              </Field>
            </div>
          </details>
        </div>

        <aside className="grid content-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS[a.status].tone}>{t(STATUS[a.status].fr, STATUS[a.status].en)}</Badge>
            {online && <a href={a.publishedUrl!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-signal underline">{t("Voir en ligne", "View online")} <ExternalLink className="size-3" /></a>}
          </div>
          {online && a.status !== "published" && (
            <p className="rounded-xl border border-warn/30 bg-warn-soft p-2.5 text-xs text-warn">{t("Version en ligne différente : republiez avec « Mettre à jour sur Shopify » pour mettre le blog à jour.", "The live version is different: use \"Update on Shopify\" to update your blog.")}</p>
          )}
          <Button icon={<Check className="size-4" />} loading={saving} disabled={saving || !dirty} onClick={() => save()}>{t("Enregistrer", "Save")}</Button>
          {a.status === "draft" && !dirty && <Button variant="secondary" size="sm" onClick={() => save({ status: "ready" })}>{t("Marquer comme prêt", "Mark as ready")}</Button>}

          <div className="grid gap-2 rounded-2xl border border-line p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Image de couverture", "Cover image")}</p>
            <div className="grid aspect-[16/9] place-items-center overflow-hidden rounded-xl bg-paper-2 text-muted">{a.cover ? <img src={a.cover.thumbUrl} alt="" className="size-full object-cover" /> : <ImageIcon className="size-5" aria-hidden />}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPick(true)}>{a.cover ? t("Changer", "Change") : t("Choisir", "Choose")}</Button>
              {a.cover && <Button size="sm" variant="ghost" onClick={() => set("cover", null)}>{t("Retirer", "Remove")}</Button>}
            </div>
          </div>

          <div className="grid gap-2 rounded-2xl border border-line p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Publier", "Publish")}</p>
            {data.shopify ? (
              <>
                <Button variant="signal" icon={<Send className="size-4" />} loading={publishing === "live"} disabled={!!publishing} onClick={() => publish(true)}>{a.onShopify && online ? t("Mettre à jour sur Shopify", "Update on Shopify") : t("Publier sur Shopify", "Publish on Shopify")}</Button>
                {online ? (
                  <Button variant="ghost" size="sm" loading={publishing === "draft"} disabled={!!publishing} onClick={() => publish(false)}>{t("Retirer du blog (repasser en brouillon)", "Remove from blog (back to draft)")}</Button>
                ) : (
                  <Button variant="secondary" size="sm" loading={publishing === "draft"} disabled={!!publishing} onClick={() => publish(false)}>{t("Envoyer en brouillon sur Shopify", "Send as a draft to Shopify")}</Button>
                )}
              </>
            ) : (
              <p className="text-xs text-muted">{t("Connectez votre boutique Shopify dans l'onglet Connexions pour publier en un clic, ou exportez l'article ci-dessous.", "Connect your Shopify store in the Connections tab to publish in one click, or export the post below.")}</p>
            )}
          </div>

          <div className="grid gap-2 rounded-2xl border border-line p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Exporter", "Export")}</p>
            <Button variant="secondary" size="sm" icon={<ClipboardCopy className="size-3.5" />} onClick={copy}>{t("Copier le texte HTML", "Copy the HTML")}</Button>
            <Button variant="secondary" size="sm" icon={<Download className="size-3.5" />} onClick={() => download(exportUrl("html"), exportError)}>{t("Fichier HTML", "HTML file")}</Button>
            <Button variant="secondary" size="sm" icon={<Download className="size-3.5" />} onClick={() => download(exportUrl("wxr"), exportError)}>{t("WordPress / WooCommerce", "WordPress / WooCommerce")}</Button>
            <p className="text-[11px] text-muted">{t("WordPress : Outils › Importer › WordPress, puis choisissez le fichier.", "WordPress: Tools › Import › WordPress, then choose the file.")}</p>
          </div>

          <div className="grid gap-2 rounded-2xl border border-line p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Réécrire avec l'IA", "Rewrite with AI")}</p>
            <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={1000} placeholder={t("Ex. : plus court, ton plus chaleureux", "E.g. shorter, warmer tone")} aria-label={t("Consigne de réécriture", "Rewrite instruction")} />
            <Button variant="secondary" size="sm" icon={<Wand2 className="size-3.5" />} disabled={busy || !data.ai || (!data.access.admin && data.access.left < 1)} onClick={rewrite} title={!data.access.admin && data.access.left < 1 ? t("Plus d'article disponible ce mois-ci.", "No posts left this month.") : undefined}>{t("Réécrire (1 article)", "Rewrite (1 post)")}</Button>
            <p className="text-[11px] text-muted">{t("Vos modifications à la main ne consomment rien.", "Your own edits don't use anything.")}</p>
          </div>

          <Button variant="danger" size="sm" icon={<Trash2 className="size-3.5" />} onClick={remove}>{t("Supprimer", "Delete")}</Button>
        </aside>
      </div>
      <MediaPicker open={pick} onClose={() => setPick(false)} kinds={["image"]} onPick={(list) => list[0] && set("cover", { id: list[0].id, url: list[0].url, thumbUrl: list[0].thumbUrl ?? list[0].url })} title={t("Image de couverture", "Cover image")} />
    </Modal>
  );
}
