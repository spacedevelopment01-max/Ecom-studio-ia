"use client";
/**
 * Onglet Vidéos : la BANQUE DE VIDÉOS du projet. Seulement des plans neutres, sans texte (vos vidéos importées, plans
 * libres de droits, plans filmés par l'IA), utilisés ensuite dans les publications vidéo et les publicités. Les vidéos
 * montées avec titres sont dans Publications › Publication vidéo.
 */
import { useEffect, useRef, useState } from "react";
import { Clapperboard, Download, Search, Upload, Wand2 } from "lucide-react";
import { api, Button, Card, cx, Empty, Field, Input, Modal, Select, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import {PLANS,type PlanId} from '@/lib/plans';
import { JobProgress, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import { useLang, useT } from "../i18n";
import { PlanRequired, useBudgetPct, useCreationLocked } from "../billing-client";
import { BANK_IMAGE_ROLES, BANK_VIDEO_ROLES } from "@/lib/media/bank";
import type {ThemePlacement} from '@/lib/theme/placement-request';
type ThemeVideoPreparation={request:{kind:'image'|'video';request:string;referenceAssetIds:string[];aspect:string};themePlacement:ThemePlacement};

type Source = "mine" | "stock" | "ai";
const sourceOf = (a: AssetView): Source => (a.origin === "generated" ? "ai" : a.origin === "import" || a.meta?.stock ? "stock" : "mine");
const SOURCES: [Source | "", string, string][] = [
  ["", "Tous les plans", "All clips"],
  ["mine", "Vos vidéos", "Your videos"],
  ["stock", "Plans libres", "Royalty-free"],
  ["ai", "Filmés par l'IA", "Filmed by AI"],
];
const BADGE: Record<Source, [string, string]> = { mine: ["Vous", "Yours"], stock: ["Libre", "Free"], ai: ["IA", "AI"] };

export default function TabVideos() {
  const { id, data } = useProject();
  const t = useT();
  const toast = useToast();
  const locked = useCreationLocked();
  const aiLocked=locked||!data?.plan||!(data.plan in PLANS)||PLANS[data.plan as PlanId].videos==='none';
  const active = useActive(["video.bank"]);
  const { data: list, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=${BANK_VIDEO_ROLES.join(",")}`);
  const [source, setSource] = useState<Source | "">("");
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [dialog, setDialog] = useState<"search" | "ai" | null>(null);
  const [themePreparation,setThemePreparation]=useState<ThemeVideoPreparation|null>(null);
  useEffect(()=>{const q=new URLSearchParams(window.location.search),slot=q.get('themeSlot'),version=q.get('themeVersion');if(!slot||!version)return;let active=true;api<ThemeVideoPreparation>(`/api/projects/${id}/theme/adaptation?slot=${encodeURIComponent(slot)}&version=${encodeURIComponent(version)}`).then(p=>{if(active&&p.request.kind==='video'){setThemePreparation(p);setDialog('ai');}}).catch(e=>{if(active)toast('bad',(e as Error).message);});return()=>{active=false;};},[id]);
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of Array.from(files).slice(0, 10)) fd.append("files", f);
      fd.append("role", "original");
      const r = await fetch(`/api/projects/${id}/files`, { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? t("Import impossible.", "Upload failed."));
      toast("ok", t("Vidéos ajoutées à votre banque.", "Videos added to your bank."));
      await reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const clips = (list?.assets ?? []).filter((a) => a.kind === "video" && a.status !== "rejected");
  const shown = clips.filter((a) => !source || sourceOf(a) === source);
  const started = (jobId?: string) => {
    setDialog(null);
    if (jobId) toast("ok", t("C'est parti : les plans arrivent dans votre banque.", "Started: the clips will land in your bank."));
  };
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6" data-video-bank>
      <Card className="@container p-5">
        <div className="flex min-w-0 flex-col gap-4 @[60rem]:flex-row @[60rem]:items-center @[60rem]:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold">{t("Banque de vidéos", "Video bank")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t("Des plans vidéo neutres, sans texte, utilisés dans vos publications vidéo et vos publicités. Les vidéos montées avec titres sont dans Publications › Publication vidéo.", "Neutral video clips, no text, used in your video posts and ads. Edited videos with titles are in Posts › Video post.")}</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 @[60rem]:shrink-0 @[60rem]:justify-end">
          <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          <Button variant="ghost" icon={<Upload className="size-4" />} loading={uploading} onClick={() => fileRef.current?.click()} data-bank-upload>{t("Importer", "Upload")}</Button>
          <Button variant="secondary" icon={<Search className="size-4" />} disabled={locked} onClick={() => setDialog("search")} data-bank-search>{t("Chercher des plans libres", "Find royalty-free clips")}</Button>
          <Button icon={<Wand2 className="size-4" />} disabled={aiLocked} onClick={() => setDialog("ai")} data-bank-create>{t("Créer un plan avec l'IA", "Create a clip with AI")}</Button>
        </div>
        </div>
        {locked && <div className="mt-4"><PlanRequired what="videos" /></div>}
        {!locked&&aiLocked&&<p className="mt-4 text-sm text-ink-2" data-video-plan-lock>{t('Les plans filmés par l’IA sont disponibles avec Développer ou Dominer. Vos imports et la recherche de plans libres restent disponibles.','AI-filmed clips require Grow or Dominate. Your uploads and royalty-free clip search remain available.')} <a href="/studio/compte" className="underline">{t('Voir mon forfait','View my plan')}</a></p>}
      </Card>
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <div>
        <div className="scrollbar-none mb-5 flex gap-1.5 overflow-x-auto" role="tablist">
          {SOURCES.map(([v, fr, en]) => (
            <button key={v} role="tab" aria-selected={source === v} onClick={() => setSource(v)} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", source === v ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{t(fr, en)}</button>
          ))}
        </div>
        {list && shown.length === 0 ? (
          <Empty title={t("Aucun plan ici pour l'instant", "No clips here yet")} icon={<Clapperboard className="size-5" />} action={!locked && <Button icon={<Search className="size-4" />} onClick={() => setDialog("search")}>{t("Chercher des plans libres", "Find royalty-free clips")}</Button>}>
            {t("Importez vos vidéos, cherchez des plans libres de droits ou faites filmer un plan par l'IA à partir d'une de vos images.", "Upload your videos, search royalty-free clips or have the AI film a clip from one of your images.")}
          </Empty>
        ) : (
          <div className="grid grid-cols-2 content-start gap-4 sm:grid-cols-3 xl:grid-cols-4" data-video-gallery>
            {shown.map((v) => {
              const tall = (v.height ?? 0) > (v.width ?? 0);
              return (
                <Card key={v.id} className="flex min-w-0 flex-col overflow-hidden">
                  <div className="relative grid place-items-center bg-ink">
                    <video src={v.url} poster={v.thumbUrl ?? undefined} controls playsInline preload="none" className={cx("w-full", tall ? "aspect-[9/16]" : "aspect-video")} />
                    <span className="absolute right-2 top-2 rounded-full bg-paper/90 px-2 py-0.5 text-[10px] font-medium text-ink" title={sourceOf(v) === "stock" ? t("Libre de droits : illustration, pas une vidéo de votre activité", "Royalty-free: an illustration, not a video of your business") : undefined}>{sourceOf(v) === "stock" && (v.meta?.stock?.aiGenerated || v.meta?.stock?.silhouette) ? [t("Libre", "Free"), v.meta?.stock?.aiGenerated && t("créé par l'IA", "AI-made"), v.meta?.stock?.silhouette && t("silhouette", "silhouette")].filter(Boolean).join(" · ") : t(...BADGE[sourceOf(v)])}</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-3">
                    <StatusBadge status={v.status} />
                    {v.duration ? <span className="text-xs text-muted">{Math.round(v.duration)} s</span> : null}
                    <span className="flex-1" />
                    <Button size="sm" variant="secondary" onClick={() => setViewer(v)}>{t("Ouvrir", "Open")}</Button>
                    <a href={v.downloadUrl} className="grid size-8 place-items-center rounded-full border border-line hover:border-ink" title={t("Télécharger", "Download")} aria-label={t("Télécharger", "Download")}><Download className="size-3.5" /></a>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Modal open={dialog === "search"} onClose={() => setDialog(null)} title={t("Chercher des plans libres", "Find royalty-free clips")} wide>
        <SearchClips services={data?.business === "services"} peopleAllowed={(data?.settings as { peopleAllowed?: boolean } | undefined)?.peopleAllowed === true} onStarted={started} />
      </Modal>
      <Modal open={dialog === "ai"} onClose={() => setDialog(null)} title={t("Créer un plan avec l'IA", "Create a clip with AI")} wide>
        <AiClip key={themePreparation?.themePlacement.slotKey??'bank'} preparation={themePreparation} onStarted={started} />
      </Modal>
      <AssetViewer asset={viewer} onClose={() => setViewer(null)} onChanged={reload} />
    </div>
  );
}

/** Plans libres de droits (Pixabay, Pexels) sur un sujet : gratuit, sujet contrôlé, aucune IA de vidéo. */
function SearchClips({ services, peopleAllowed, onStarted }: { services: boolean; peopleAllowed: boolean; onStarted: (jobId?: string) => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [f, setF] = useState({ topic: "", aspect: "9:16", count: 2, broad: false, silhouettes: false });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const r = await api<{ jobId?: string }>(`/api/projects/${id}/videos/bank`, { body: { action: "stock", topic: f.topic.trim() || undefined, aspect: f.aspect, count: f.count, broad: f.broad || undefined, silhouettes: f.silhouettes || undefined } });
      onStarted(r.jobId);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-4" data-bank-search-dialog>
      <p className="text-sm text-muted">{t("Le studio cherche des plans libres de droits sur votre sujet (ou, sans sujet, sur votre activité) et vérifie leurs mots-clés. Gratuit, aucune IA de vidéo.", "The studio searches royalty-free clips on your subject (or, without one, on your business) and checks their keywords. Free, no AI video.")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("Sujet (facultatif)", "Subject (optional)")} htmlFor="vs-topic"><Input id="vs-topic" value={f.topic} maxLength={200} onChange={(e) => setF({ ...f, topic: e.target.value })} placeholder={services ? t("Ex. atelier, mains sur l'établi", "E.g. workshop, hands on the bench") : t("Ex. café du matin, cuisine lumineuse", "E.g. morning coffee, bright kitchen")} /></Field>
        <Field label="Format" htmlFor="vs-aspect"><Select id="vs-aspect" value={f.aspect} onChange={(e) => setF({ ...f, aspect: e.target.value })}><option value="9:16">{t("9:16 · vertical (reels, TikTok)", "9:16 · vertical (reels, TikTok)")}</option><option value="16:9">{t("16:9 · paysage (site, YouTube)", "16:9 · landscape (website, YouTube)")}</option></Select></Field>
        <Field label={t("Nombre", "Count")} htmlFor="vs-count"><Select id="vs-count" value={f.count} onChange={(e) => setF({ ...f, count: Number(e.target.value) })}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5" checked={f.broad} onChange={(e) => setF({ ...f, broad: e.target.checked })} data-bank-search-broad />
        <span>{t("Recherche élargie : chaque mot est aussi cherché seul (plus de plans, parfois moins précis)", "Broader search: each word is also searched on its own (more clips, sometimes less precise)")}</span>
      </label>
      {!peopleAllowed && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={f.silhouettes} onChange={(e) => setF({ ...f, silhouettes: e.target.checked })} data-bank-search-silhouettes />
          <span>{t("Accepter les silhouettes (personne de dos ou dans l'ombre, visage non visible)", "Allow silhouettes (seen from behind or in shadow, face not visible)")}</span>
        </label>
      )}
      <p className="text-xs text-muted">{t("Votre texte est cherché tel quel sur Pixabay. Les plans libres de droits illustrent votre activité : ce ne sont pas des vidéos de vos réalisations. Un plan créé par l'IA et publié sur Pixabay est signalé « créé par l'IA ».", "Your text is searched as-is on Pixabay. Royalty-free clips illustrate your business: they aren't videos of your own work. A clip made by AI and published on Pixabay is marked \"AI-made\".")}</p>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-sm font-medium text-ok">{t("Gratuit", "Free")}</span>
        <Button icon={<Search className="size-4" />} loading={busy} onClick={go} data-bank-search-go>{t("Chercher", "Search")}</Button>
      </div>
    </div>
  );
}

/** Un plan filmé par l'IA à partir d'une image de la banque : prix affiché avant, aucune personne ajoutée sans accord. */
function AiClip({ onStarted,preparation }: { onStarted: (jobId?: string) => void;preparation?:ThemeVideoPreparation|null }) {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const { data: q } = useApi<{ ai: boolean; clipEstimateMicro: number }>(`/api/projects/${id}/videos/bank`);
  const { data: bank } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=${BANK_IMAGE_ROLES.join(",")}`);
  const images = (bank?.assets ?? []).filter((a) => a.kind === "image" && a.status !== "rejected"&&(!preparation||preparation.request.referenceAssetIds.includes(a.id))).slice(0, 40);
  const [imageId, setImageId] = useState(preparation?.request.referenceAssetIds[0]??"");
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState(preparation?.request.aspect==='16:9'?'16:9':"9:16");
  const [busy, setBusy] = useState(false);
  // Prix en % du budget IA du mois (jamais en euros).
  const budget = useBudgetPct();
  const price = q ? budget.label(q.clipEstimateMicro) : null;
  const go = async () => {
    if (!q) return;
    setBusy(true);
    try {
      const r = await api<{ jobId?: string }>(`/api/projects/${id}/videos/bank`, { body: { action: "ai", imageId, prompt: prompt.trim() || undefined, aspect, approvedEstimateMicro: q.clipEstimateMicro,themePlacement:preparation?.themePlacement } });
      onStarted(r.jobId);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (q && !q.ai) return <p className="text-sm text-muted" data-bank-ai-off>{t("La création de plans par l'IA n'est pas disponible pour ce projet (forfait Découverte, budget IA épuisé ou fournisseur désactivé). Cherchez plutôt des plans libres de droits (gratuit) ou importez vos vidéos.", "AI clip creation isn't available for this project (Discovery plan, AI budget used up or provider disabled). Search royalty-free clips instead (free) or upload your videos.")}</p>;
  return (
    <div className="grid gap-4" data-bank-ai-dialog>
      {preparation&&<p className="rounded-xl border border-line p-3 text-sm" data-theme-video-preparation>{preparation.request.request}</p>}
      <p className="text-sm text-muted">{t("Choisissez une image de votre banque : l'IA la fait vivre en un court plan (mouvement de caméra, lumière), sans texte et sans personne ajoutée. Le plan arrive « à vérifier » dans votre banque.", "Pick an image from your bank: the AI brings it to life as a short clip (camera move, light), no text and no added people. The clip lands \"to check\" in your bank.")}</p>
      {images.length ? (
        <div className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-8" role="radiogroup" aria-label={t("Image de départ", "Starting image")}>
          {images.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={imageId === a.id} aria-label={a.name} onClick={() => setImageId(a.id)} className={cx("aspect-square overflow-hidden rounded-lg border-2", imageId === a.id ? "border-ink" : "border-transparent opacity-80 hover:opacity-100")}>
              <img src={a.thumbUrl ?? a.url} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">{t("Votre banque d'images est vide : ajoutez d'abord une image dans l'onglet Images.", "Your image bank is empty: add an image in the Images tab first.")}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Mouvement souhaité (facultatif)", "Desired motion (optional)")} htmlFor="va-prompt"><Input id="va-prompt" value={prompt} maxLength={300} onChange={(e) => setPrompt(e.target.value)} placeholder={t("Ex. lent travelling avant, lumière du matin", "E.g. slow push-in, morning light")} /></Field>
        <Field label="Format" htmlFor="va-aspect"><Select id="va-aspect" value={aspect} onChange={(e) => setAspect(e.target.value)}><option value="9:16">9:16</option><option value="16:9">16:9</option></Select></Field>
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">{price ? t(<>Coût probable : <strong>{price}</strong>. Rien n'est lancé sans votre clic.</>, <>Likely cost: <strong>{price}</strong>. Nothing starts without your click.</>) : t("Calcul du prix…", "Calculating the price…")}</p>
        <Button icon={<Wand2 className="size-4" />} loading={busy} disabled={busy || !imageId || !price} onClick={go} data-bank-ai-go>{t(`Créer le plan · ${price ?? "…"}`, `Create the clip · ${price ?? "…"}`)}</Button>
      </div>
    </div>
  );
}
