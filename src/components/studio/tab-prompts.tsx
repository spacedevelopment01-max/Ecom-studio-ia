"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Heart, Search, Sparkles, Save, Trash2, ArrowRight } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Input, Select, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";

type P = { id: string; sector: string; sectorLabel: string; category: string; categoryLabel: string; group: string; target: string; title: string; body: string; mine?: boolean; context?: string; objective?: string };
type Data = { prompts: P[]; favorites: string[]; sectors: { id: string; label: string }[]; categories: { id: string; label: string; group: string }[] };

const TARGET_TAB: Record<string, string> = { produit: "produit", marque: "marque", boutique: "boutique", images: "images", videos: "videos", social: "publications", publicites: "publicites", calendrier: "calendrier" };
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
  const [cat, setCat] = useState("");
  const [only, setOnly] = useState<"" | "fav" | "mine">("");
  const [sel, setSel] = useState<P | null>(null);
  const [text, setText] = useState("");
  const [filled, setFilled] = useState(false);
  const [busy, setBusy] = useState(false);
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
  };
  const fill = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      const r = await api<{ body: string }>(`/api/projects/${id}/prompt-fill`, { body: { body: text }, lang: cl.lang });
      setText(r.body);
      setFilled(true);
    } finally {
      setBusy(false);
    }
  };
  const insert = async () => {
    if (!sel) return;
    let body = text;
    if (!filled) body = (await api<{ body: string }>(`/api/projects/${id}/prompt-fill`, { body: { body: text }, lang: cl.lang })).body;
    const tab = TARGET_TAB[sel.target] ?? "boutique";
    try {
      sessionStorage.setItem(`es-insert-${tab}-${id}`, body);
    } catch {}
    toast("ok", t(`Prompt inséré dans l'espace ${TARGET_LABEL[sel.target] ?? tab}, complété avec votre projet.`, `Prompt inserted into the ${TARGET_LABEL_EN[sel.target] ?? tab} area, completed with your project.`));
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
                <p className="mt-1 text-xs text-muted">{sel.sectorLabel} · {sel.categoryLabel} · {t(`s'insère dans « ${TARGET_LABEL[sel.target]} »`, `goes into "${TARGET_LABEL_EN[sel.target]}"`)}</p>
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
            <ContentLangPicker {...cl} className="mt-3" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="signal" icon={<ArrowRight className="size-4" />} onClick={insert}>{t("Insérer dans", "Insert into")} {targetLabel(sel.target)}</Button>
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
          </Card>
        ) : (
          <Empty title={t("Choisissez un prompt", "Choose a prompt")} icon={<Sparkles className="size-5" />}>{t("Prévisualisez-le, complétez-le automatiquement avec votre projet, modifiez-le, puis insérez-le dans l'espace concerné. Les prompts ne sont jamais nécessaires pour démarrer.", "Preview it, complete it automatically with your project, edit it, then insert it into the right area. Prompts are never required to get started.")}</Empty>
        )}
      </div>
    </div>
  );
}
