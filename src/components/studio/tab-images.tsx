"use client";
import { useEffect, useState } from "react";
import { Sparkles, Wand2, ImagePlus } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Select, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, EngineNotice, JobProgress, ROLE_LABEL, SectionTitle, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";

const GROUPS = [
  { id: "all", label: "Tout", roles: "packshot,detail,scene,lifestyle,banner,social,ad,cutout" },
  { id: "packshot", label: "Packshots", roles: "packshot" },
  { id: "detail", label: "Détails", roles: "detail" },
  { id: "scene", label: "Scènes", roles: "scene" },
  { id: "lifestyle", label: "En situation", roles: "lifestyle" },
  { id: "banner", label: "Bannières", roles: "banner" },
  { id: "social", label: "Réseaux", roles: "social" },
  { id: "ad", label: "Publicités", roles: "ad" },
  { id: "cutout", label: "Détourages", roles: "cutout,original" },
];

const STYLES = [
  ["studio", "Studio doux"],
  ["podium", "Podium"],
  ["arch", "Arche"],
  ["window", "Lumière de fenêtre"],
  ["spotlight", "Projecteur sombre"],
  ["split", "Aplats de couleur"],
  ["color", "Fond de marque"],
];
const FORMATS = [
  ["product", "4:5 HD (fiche produit)"],
  ["packshot", "1:1 HD (packshot)"],
  ["square", "1:1 (réseaux)"],
  ["portrait", "4:5 (Instagram)"],
  ["story", "9:16 (story, reel)"],
  ["landscape", "16:9"],
  ["banner", "2:1 (bannière)"],
  ["pin", "2:3 (Pinterest)"],
];

export default function TabImages() {
  const { id, data } = useProject();
  const toast = useToast();
  const [group, setGroup] = useState("all");
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [form, setForm] = useState({ kind: "scene", style: "window", format: "product", layout: "editorial", headline: "", subline: "", cta: "", useAi: false });
  const active = useActive(["images.generate", "image.single"]);
  const { data: list, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=${GROUPS.find((g) => g.id === group)!.roles}`);
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(`es-insert-images-${id}`);
      if (pending) {
        setForm((f) => ({ ...f, kind: "ad", headline: pending.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.slice(0, 80) ?? "" }));
        sessionStorage.removeItem(`es-insert-images-${id}`);
        toast("info", "Prompt inséré : ajustez le titre et lancez la création.");
      }
    } catch {}
  }, [id, toast]);
  const create = async (mode: "set" | "single") => {
    try {
      await api(`/api/projects/${id}/images`, { body: { mode, ...form, headline: form.headline || undefined, subline: form.subline || undefined, cta: form.cta || undefined } });
      toast("ok", mode === "set" ? "Jeu d'images complet en préparation." : "Image en préparation.");
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const textual = form.kind === "social" || form.kind === "ad";
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6">
      <EngineNotice what="les décors (studio, podium, arche, lumière de fenêtre…)" />
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-max p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">Créer</h2>
          <p className="mt-1 text-xs text-muted">Le produit est toujours composé à partir de ses pixels réels ; les textes sont ajoutés typographiquement.</p>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
            <Field label="Type" htmlFor="ikind">
              <Select id="ikind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, format: e.target.value === "packshot" ? "packshot" : e.target.value === "banner" ? "banner" : e.target.value === "scene" ? "product" : "portrait" })}>
                <option value="packshot">Packshot</option>
                <option value="scene">Scène</option>
                <option value="banner">Bannière de boutique</option>
                <option value="social">Visuel social (avec texte)</option>
                <option value="ad">Publicité (avec texte et bouton)</option>
              </Select>
            </Field>
            {form.kind !== "packshot" && (
              <Field label="Mise en scène" htmlFor="istyle">
                <Select id="istyle" value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}>{STYLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
              </Field>
            )}
            <Field label="Format" htmlFor="ifmt">
              <Select id="ifmt" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>{FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            </Field>
            {textual && (
              <>
                <Field label="Composition" htmlFor="ilay">
                  <Select id="ilay" value={form.layout} onChange={(e) => setForm({ ...form, layout: e.target.value })}>
                    <option value="editorial">Éditoriale (texte à gauche)</option>
                    <option value="centered">Centrée</option>
                    <option value="bold">Affiche (fond de marque)</option>
                    <option value="minimal">Minimale</option>
                    <option value="split">Aplats</option>
                  </Select>
                </Field>
                <Field label="Titre (2 à 6 mots)" htmlFor="ihead"><Input id="ihead" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder={data?.brand?.tagline || "Titre"} /></Field>
                <Field label="Sous-titre" htmlFor="isub"><Input id="isub" value={form.subline} onChange={(e) => setForm({ ...form, subline: e.target.value })} placeholder="Un fait confirmé" /></Field>
                {form.kind === "ad" && <Field label="Bouton" htmlFor="icta"><Input id="icta" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="Découvrir" /></Field>}
              </>
            )}
            {(form.kind === "scene" || form.kind === "banner") && (
              <div className={cx("rounded-2xl p-3", data?.ai.image ? "bg-paper-2" : "bg-paper-2 opacity-60")}>
                <Toggle checked={form.useAi && !!data?.ai.image} onChange={(v) => setForm({ ...form, useAi: v })} disabled={!data?.ai.image} label="Décor généré par IA" />
                <p className="mt-1.5 text-[11px] text-muted">{data?.ai.image ? "Seul le décor est généré ; le produit réel est replacé par-dessus puis vérifié. Consomme des crédits IA." : "Aucun fournisseur d'images n'est configuré : décors du studio."}</p>
              </div>
            )}
            <Button onClick={() => create("single")} icon={<Wand2 className="size-4" />}>Créer l'image</Button>
            <Button variant="secondary" className="h-auto! min-h-10 whitespace-normal! py-2 text-center leading-snug" onClick={() => create("set")} icon={<Sparkles className="size-4 shrink-0" />}>Jeu complet (packshots, détails, scènes, bannières, réseaux)</Button>
          </div>
        </Card>
        <div>
          <div className="scrollbar-none mb-5 flex gap-1.5 overflow-x-auto" role="tablist">
            {GROUPS.map((g) => (
              <button key={g.id} role="tab" aria-selected={group === g.id} onClick={() => setGroup(g.id)} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", group === g.id ? "border-ink bg-ink text-paper" : "border-line bg-card")}>
                {g.label}
              </button>
            ))}
          </div>
          {list && list.assets.length === 0 ? (
            <Empty title="Aucune image dans cette catégorie" icon={<ImagePlus className="size-5" />}>Lancez une création à gauche ; elle apparaîtra ici, rangée automatiquement dans vos fichiers.</Empty>
          ) : (
            <div className="columns-2 gap-4 sm:columns-3 xl:columns-4">
              {(list?.assets ?? []).map((a) => (
                <button key={a.id} onClick={() => setViewer(a)} className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-line bg-card text-left transition hover:-translate-y-0.5 hover:shadow-soft">
                  <div className="relative">
                    <img src={a.thumbUrl ?? a.url} alt={a.name} className="w-full" loading="lazy" style={{ aspectRatio: a.width && a.height ? `${a.width}/${a.height}` : undefined }} />
                    <span className="absolute left-2 top-2"><StatusBadge status={a.status} /></span>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="truncate text-xs">{ROLE_LABEL[a.role ?? ""] ?? a.name}</span>
                    {a.meta?.format && <Badge className="shrink-0">{a.meta.format}</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <AssetViewer asset={viewer} onClose={() => setViewer(null)} onChanged={reload} />
    </div>
  );
}
