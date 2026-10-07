"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Heart, Search, Sparkles, Save, Trash2, ArrowRight } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Input, Select, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";

type P = { id: string; sector: string; sectorLabel: string; category: string; categoryLabel: string; group: string; target: string; title: string; body: string; mine?: boolean; context?: string; objective?: string };
type Data = { prompts: P[]; favorites: string[]; sectors: { id: string; label: string }[]; categories: { id: string; label: string; group: string }[] };

const TARGET_TAB: Record<string, string> = { produit: "produit", marque: "marque", boutique: "boutique", images: "images", videos: "videos", social: "publications", publicites: "publicites", calendrier: "calendrier" };
/** Espaces qui reprennent vraiment un prompt inséré. Les autres (marque, produit, publications, publicités) : le prompt se lance ici avec l'IA. */
const INSERTABLE = new Set(["boutique", "images", "videos", "calendrier"]);
/** Où va chaque prompt, et ce qu'il y fait (affiché sous le titre). */
const WHERE: Record<string, [string, string]> = {
  boutique: ["Inséré dans la conversation de l'onglet Site : envoyez-le, le studio applique les modifications au site.", "Inserted into the Site tab chat: send it and the studio applies the changes to the site."],
  images: ["Ouvre l'onglet Images sur le bon type d'image (packshot, scène, bannière…). Le studio crée l'image à partir de vos photos ; le texte du prompt sert de référence.", "Opens the Images tab on the right image type (packshot, scene, banner…). The studio creates the image from your photos; the prompt text is a reference."],
  videos: ["Inséré dans le champ « Objectif » d'une nouvelle vidéo de l'onglet Vidéos.", "Inserted into the \"Goal\" field of a new video in the Videos tab."],
  calendrier: ["Ouvre « Nouveau calendrier » avec le prompt dans « Objectifs ».", "Opens \"New calendar\" with the prompt in \"Goals\"."],
  marque: ["Se lance ici avec l'IA (« Lancer avec l'IA ») : la réponse s'affiche dessous, à reporter dans l'onglet Marque (positionnement, signature, pistes de logo).", "Runs here with AI (\"Run with AI\"): the answer shows below, to copy into the Brand tab (positioning, tagline, logo routes)."],
  produit: ["Se lance ici avec l'IA : la réponse (analyse, points à confirmer) s'affiche dessous, à reporter dans l'onglet Produit ou Activité.", "Runs here with AI: the answer (analysis, points to confirm) shows below, to copy into the Product or Business tab."],
  social: ["Se lance ici avec l'IA : scripts et textes de publications s'affichent dessous, à reprendre dans l'onglet Publications.", "Runs here with AI: post scripts and copy show below, to use in the Posts tab."],
  publicites: ["Se lance ici avec l'IA : la campagne ou le visuel proposé s'affiche dessous, à reprendre dans l'onglet Publicités.", "Runs here with AI: the proposed campaign or visual shows below, to use in the Ads tab."],
};
/** Variables du projet encore vides : où les compléter. */
const MISSING_WHERE: Record<string, [string, string]> = {
  cible: ["clients visés (onglet Marque)", "target customers (Brand tab)"],
  ton: ["ton de la marque (onglet Marque)", "brand tone (Brand tab)"],
  palette: ["palette (onglet Marque)", "palette (Brand tab)"],
  faits: ["informations confirmées (onglet Produit ou Activité)", "confirmed information (Product or Business tab)"],
  medias: ["photos (onglet Fichiers)", "photos (Files tab)"],
  lien: ["adresse du site publié", "published site address"],
  objectifs: ["objectifs (à écrire dans le prompt)", "goals (write them in the prompt)"],
};
/** Type d'image ouvert dans l'onglet Images selon la catégorie du prompt. */
const IMAGE_KIND: Record<string, string> = { packshot: "packshot", detail: "scene", scene: "scene", banniere: "banner", visuelpub: "ad" };
const TARGET_LABEL: Record<string, string> = { produit: "Produit", marque: "Marque", boutique: "Boutique (conversation)", images: "Images", videos: "Vidéos", social: "Publications", publicites: "Publicités", calendrier: "Calendrier" };
const TARGET_LABEL_EN: Record<string, string> = { produit: "Product", marque: "Brand", boutique: "Store (chat)", images: "Images", videos: "Videos", social: "Posts", publicites: "Ads", calendrier: "Calendar" };

export default function TabPrompts() {
  const { id, data: project } = useProject();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const cl = useContentLang();
  const targetLabel = (k: string) => t(TARGET_LABEL[k], TARGET_LABEL_EN[k]);
  const { data, reload } = useApi<Data>("/api/prompts");
  const [q, setQ] = useState("");
  const [sector, setSector] = useState(project?.product.sector ?? "");
  // Le projet se charge parfois après l'onglet : le filtre prend alors son secteur (une seule fois, sans écraser un choix).
  const sectorInit = useRef(!!project?.product.sector);
  useEffect(() => {
    if (sectorInit.current || !project?.product.sector) return;
    sectorInit.current = true;
    setSector(project.product.sector);
  }, [project?.product.sector]);
  const [cat, setCat] = useState("");
  const [only, setOnly] = useState<"" | "fav" | "mine">("");
  const [sel, setSel] = useState<P | null>(null);
  const [text, setText] = useState("");
  const [filled, setFilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [claims, setClaims] = useState<{ term: string; label: string }[]>([]);
  const [running, setRunning] = useState(false);
  const fav = new Set(data?.favorites ?? []);
  const results = useMemo(() => {
    const words = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean);
    return (data?.prompts ?? []).filter((p) => {
      if (sector && p.sector !== sector && !p.mine) return false;
      if (cat && p.category !== cat) return false;
      if (only === "fav" && !fav.has(p.id)) return false;
      if (only === "mine" && !p.mine) return false;
      if (!words.length) return true;
      const hay = `${p.title} ${p.body} ${p.categoryLabel} ${p.sectorLabel}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return words.every((w) => hay.includes(w));
    });
  }, [data, q, sector, cat, only, fav]);
  const open = (p: P) => {
    setSel(p);
    setText(p.body);
    setFilled(false);
    setMissing([]);
    setAnswer("");
  };
  const fill = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      const r = await api<{ body: string; missing: string[] }>(`/api/projects/${id}/prompt-fill`, { body: { body: text }, lang: cl.lang });
      setText(r.body);
      setFilled(true);
      setMissing(r.missing ?? []);
      toast("ok", t("Prompt complété avec votre projet.", "Prompt completed with your project."));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const run = async () => {
    if (!sel) return;
    setRunning(true);
    setAnswer("");
    setClaims([]);
    try {
      const r = await api<{ prompt: string; answer: string; claims?: { term: string; label: string }[] }>(`/api/projects/${id}/prompt-run`, { body: { body: text }, lang: cl.lang });
      setText(r.prompt);
      setFilled(true);
      setAnswer(r.answer);
      setClaims(r.claims ?? []);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setRunning(false);
    }
  };
  const insert = async () => {
    if (!sel) return;
    let body = text;
    try {
      if (!filled) body = (await api<{ body: string }>(`/api/projects/${id}/prompt-fill`, { body: { body: text }, lang: cl.lang })).body;
    } catch (e) {
      return toast("bad", (e as Error).message);
    }
    const tab = TARGET_TAB[sel.target] ?? "boutique";
    try {
      sessionStorage.setItem(`es-insert-${tab}-${id}`, tab === "images" ? JSON.stringify({ kind: IMAGE_KIND[sel.category] ?? "scene", body }) : body);
    } catch {}
    if (INSERTABLE.has(tab)) {
      toast("ok", t(`Prompt inséré dans l'espace ${TARGET_LABEL[sel.target] ?? tab}, complété avec votre projet.`, `Prompt inserted into the ${TARGET_LABEL_EN[sel.target] ?? tab} area, completed with your project.`));
    } else {
      // Pas de champ qui le reprend automatiquement dans cet espace : on le copie, honnêtement, pour qu'il soit collé au bon endroit.
      let copied = false;
      try { await navigator.clipboard.writeText(body); copied = true; } catch {}
      toast("ok", copied ? t(`Prompt complété et copié : collez-le dans l'espace ${TARGET_LABEL[sel.target] ?? tab}, là où vous voulez vous en servir.`, `Prompt completed and copied: paste it in the ${TARGET_LABEL_EN[sel.target] ?? tab} area, wherever you want to use it.`) : t("Copie impossible : sélectionnez le texte du prompt et copiez-le.", "Couldn't copy: select the prompt text and copy it."));
    }
    router.push(`/studio/${id}/${tab}`);
  };
  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <div className="sticky top-[7.5rem] z-10 grid gap-2 bg-paper pb-3 lg:top-[4.5rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher parmi les prompts…", "Search prompts…")} className="pl-10" aria-label={t("Rechercher", "Search")} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Select value={sector} onChange={(e) => setSector(e.target.value)} aria-label={t("Secteur", "Sector")}>
              <option value="">{t("Tous les secteurs", "All sectors")}</option>
              {data?.sectors.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
            <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t("Type de tâche", "Task type")}>
              <option value="">{t("Toutes les tâches", "All tasks")}</option>
              {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.group} · {c.label}</option>)}
            </Select>
            <Select value={only} onChange={(e) => setOnly(e.target.value as any)} aria-label={t("Filtre", "Filter")} className="col-span-2 sm:col-span-1">
              <option value="">{t("Tous", "All")}</option>
              <option value="fav">{t("Mes favoris", "My favorites")}</option>
              <option value="mine">{t("Mes prompts", "My prompts")}</option>
            </Select>
          </div>
          <p className="text-xs text-muted">{results.length} prompt{results.length > 1 ? "s" : ""} · {data?.prompts.filter((p) => !p.mine).length ?? 0} {t("dans la bibliothèque", "in the library")}</p>
        </div>
        <ul className="grid gap-2">
          {results.slice(0, 80).map((p) => (
            <li key={p.id}>
              <button onClick={() => open(p)} className={cx("w-full rounded-2xl border p-4 text-left transition", sel?.id === p.id ? "border-ink bg-card" : "border-line bg-card hover:border-ink")}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{p.title}</p>
                  {fav.has(p.id) && <Heart className="size-4 shrink-0 fill-signal text-signal" />}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge>{p.group}</Badge>
                  <Badge tone="neutral">{p.sectorLabel}</Badge>
                  {p.mine && <Badge tone="signal">{t("personnel", "personal")}</Badge>}
                </div>
              </button>
            </li>
          ))}
          {results.length > 80 && <li className="py-3 text-center text-xs text-muted">{t(`Affinez la recherche pour voir les ${results.length - 80} autres.`, `Refine your search to see the other ${results.length - 80}.`)}</li>}
        </ul>
      </div>
      <div className="lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)]">
        {sel ? (
          <Card className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">{sel.title}</h2>
                <p className="mt-1 text-xs text-muted">{sel.sectorLabel} · {sel.categoryLabel}</p>
                <p className="mt-2 rounded-xl bg-paper-2 px-3 py-2 text-xs text-ink-2"><strong>{t("Où l'utiliser : ", "Where to use it: ")}</strong>{WHERE[sel.target] ? t(WHERE[sel.target][0], WHERE[sel.target][1]) : ""}</p>
              </div>
              <button
                onClick={async () => {
                  await api(`/api/prompts/${encodeURIComponent(sel.id)}`, { method: "PATCH", body: { favorite: !fav.has(sel.id) } });
                  reload();
                }}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-line"
                aria-label={fav.has(sel.id) ? t("Retirer des favoris", "Remove from favorites") : t("Ajouter aux favoris", "Add to favorites")}
                aria-pressed={fav.has(sel.id)}
              >
                <Heart className={cx("size-4", fav.has(sel.id) && "fill-signal text-signal")} />
              </button>
            </div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-4 min-h-[300px] flex-1 font-mono text-[13px]" aria-label={t("Contenu du prompt", "Prompt content")} />
            {filled && <p className="mt-2 text-xs text-ok">{t("Complété avec le produit, la marque et les médias du projet actif.", "Completed with the active project's product, brand and media.")}</p>}
            {filled && missing.length > 0 && (
              <p className="mt-1 text-xs text-warn">{t("Encore vide dans votre projet (laissé entre crochets) : ", "Still empty in your project (left in brackets): ")}{missing.map((k) => (MISSING_WHERE[k] ? t(MISSING_WHERE[k][0], MISSING_WHERE[k][1]) : k)).join(", ")}.</p>
            )}
            <ContentLangPicker {...cl} className="mt-3" />
            <div className="mt-4 flex flex-wrap gap-2">
              {INSERTABLE.has(TARGET_TAB[sel.target] ?? "boutique") ? (
                <Button variant="signal" icon={<ArrowRight className="size-4" />} onClick={insert}>{t("Insérer dans", "Insert into")} {targetLabel(sel.target)}</Button>
              ) : (
                <Button variant="signal" icon={<Sparkles className="size-4" />} onClick={run} loading={running}>{t("Lancer avec l'IA", "Run with AI")}</Button>
              )}
              <Button variant="secondary" icon={<Sparkles className="size-4" />} onClick={fill} loading={busy} disabled={filled}>{t("Compléter avec le projet", "Complete with the project")}</Button>
              <Button variant="ghost" icon={<Copy className="size-4" />} onClick={async () => { await navigator.clipboard.writeText(text); toast("ok", t("Prompt copié.", "Prompt copied.")); }}>{t("Copier", "Copy")}</Button>
              <Button
                variant="ghost"
                icon={<Save className="size-4" />}
                onClick={async () => {
                  const title = prompt(t("Nom de votre prompt", "Name your prompt"), sel.mine ? sel.title : `${sel.title} ${t("(ma version)", "(my version)")}`);
                  if (!title) return;
                  if (sel.mine) await api(`/api/prompts/${encodeURIComponent(sel.id)}`, { method: "PATCH", body: { title, body: text } });
                  else await api("/api/prompts", { body: { title, sector: sel.sector, category: sel.category, target: sel.target, body: text, basedOn: sel.id } });
                  toast("ok", t("Prompt enregistré dans « Mes prompts ».", "Prompt saved to \"My prompts\"."));
                  reload();
                }}
              >
                {t("Enregistrer", "Save")}
              </Button>
              {sel.mine && <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={async () => { await api(`/api/prompts/${encodeURIComponent(sel.id)}`, { method: "DELETE" }); setSel(null); reload(); }}>{t("Supprimer", "Delete")}</Button>}
            </div>
            {running && <p className="mt-3 text-xs text-muted">{t("L'IA travaille sur votre projet (jusqu'à une minute)…", "AI is working on your project (up to a minute)…")}</p>}
            {answer && (
              <div className="mt-4 grid max-h-[45vh] gap-2 overflow-auto rounded-2xl border border-line bg-paper-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t("Réponse de l'IA", "AI answer")}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" icon={<Copy className="size-4" />} onClick={async () => { await navigator.clipboard.writeText(answer); toast("ok", t("Réponse copiée.", "Answer copied.")); }}>{t("Copier la réponse", "Copy the answer")}</Button>
                    <Button size="sm" variant="secondary" icon={<ArrowRight className="size-4" />} onClick={() => router.push(`/studio/${id}/${TARGET_TAB[sel.target] ?? "marque"}`)}>{t("Ouvrir", "Open")} {targetLabel(sel.target)}</Button>
                  </div>
                </div>
                {claims.length > 0 && (
                  <p className="rounded-xl bg-warn-soft p-3 text-xs text-warn">
                    {t("À vérifier avant de publier (affirmations non confirmées par votre projet) :", "Check before publishing (claims not confirmed by your project):")} {claims.map((c) => `« ${c.term} » (${c.label})`).join(", ")}
                  </p>
                )}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>
              </div>
            )}
          </Card>
        ) : (
          <Empty title={t("Choisissez un prompt", "Choose a prompt")} icon={<Sparkles className="size-5" />}>{t("Prévisualisez-le, complétez-le automatiquement avec votre projet, modifiez-le, puis insérez-le dans l'espace concerné. Les prompts ne sont jamais nécessaires pour démarrer.", "Preview it, complete it automatically with your project, edit it, then insert it into the right area. Prompts are never required to get started.")}</Empty>
        )}
      </div>
    </div>
  );
}
