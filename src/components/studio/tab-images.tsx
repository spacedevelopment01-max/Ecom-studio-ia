"use client";
/**
 * Onglet Images : la BANQUE D'IMAGES du projet. Seulement des images neutres, sans texte (vos photos, détourages,
 * photos libres de droits choisies par le client, images créées par l'IA), réutilisées partout : site,
 * publications, publicités. Les publications avec texte se créent dans Publications.
 * Compléter la banque : chercher des photos libres (gratuit, matière brute choisie par le client), créer une image
 * par l'IA (prix affiché avant ; jamais de gabarit ni de photo libre à la place), importer ses propres photos.
 * IA d'images indisponible : la raison est dite et le bouton payant reste désactivé.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Search, Upload, Wand2 } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Modal, Select, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { JobProgress, ROLE_LABEL, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import {useAgentFocus,useAgentUi} from './agent-ui-context';
import { useCostConfirm } from "./cost-confirm";
import { useT } from "../i18n";
import { PlanRequired, useBudgetPct, useCreationLocked } from "../billing-client";
import { BANK_IMAGE_ROLES } from "@/lib/media/bank";
type ThemeImagePreparation={request:{request:string};themePlacement:{versionId:string;slotKey:string;contextHash:string};kind:string;topic:string;aspect:string};
import { CopyFailureHistory } from "./copy-correction";

/** Tri des images par statut, et encart « Supprimées » pour retrouver (et restaurer) une image supprimée. */
const STATUS_FILTERS = [
  ["", "Toutes", "All"],
  ["review", "À valider", "To review"],
  ["approved", "Validées", "Approved"],
  ["rejected", "Écartées", "Rejected"],
  ["trash", "Supprimées", "Deleted"],
] as const;

function useImageList(projectId: string, roles: string) {
  const [status, setStatus] = useState("");
  const q = status === "trash" ? "&trash=1" : `&latest=1${status ? `&status=${status}` : ""}`;
  const { data, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${projectId}/files?role=${roles}${q}`);
  return { list: data, reload, status, setStatus };
}

function StatusChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  return (
    <div className="scrollbar-none -mt-2 mb-5 flex gap-1.5 overflow-x-auto" role="radiogroup" aria-label={t("Trier par statut", "Filter by status")}>
      {STATUS_FILTERS.map(([v, fr, en]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={cx("shrink-0 rounded-full border px-3 py-1 text-xs", value === v ? "border-signal bg-signal-soft font-medium" : "border-line bg-card text-muted hover:text-ink")}>
          {t(fr, en)}
        </button>
      ))}
    </div>
  );
}

function TrashGrid({ assets, onRestored }: { assets: AssetView[]; onRestored: () => void }) {
  const t = useT();
  const toast = useToast();
  const restore = async (a: AssetView) => {
    try {
      await api(`/api/files/${a.id}`, { method: "PATCH", body: { restore: true } });
      toast("ok", t("Image restaurée.", "Image restored."));
      onRestored();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  if (!assets.length) return <Empty title={t("Aucune image supprimée", "No deleted images")} icon={<ImagePlus className="size-5" />}>{t("Les images que vous supprimez arrivent ici : vous pouvez les restaurer à tout moment.", "Images you delete land here: you can restore them at any time.")}</Empty>;
  return (
    <div className="columns-2 gap-4 sm:columns-3 xl:columns-4">
      {assets.map((a) => (
        <div key={a.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-line bg-card">
          <img src={a.thumbUrl ?? a.url} alt={a.name} className="w-full opacity-70" loading="lazy" style={{ aspectRatio: a.width && a.height ? `${a.width}/${a.height}` : undefined }} />
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="truncate text-xs">{ROLE_LABEL[a.role ?? ""] ?? a.name}</span>
            <Button size="sm" variant="secondary" onClick={() => restore(a)}>{t("Restaurer", "Restore")}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}



const FORMATS = [
  ["product", "4:5 HD (fiche produit)", "4:5 HD (product page)"],
  ["packshot", "1:1 HD (packshot)", "1:1 HD (packshot)"],
  ["square", "1:1 (réseaux)", "1:1 (social)"],
  ["portrait", "4:5 (Instagram)", "4:5 (Instagram)"],
  ["story", "9:16 (story, reel)", "9:16 (story, reel)"],
  ["landscape", "16:9", "16:9"],
  ["banner", "2:1 (bannière)", "2:1 (banner)"],
  ["pin", "2:3 (Pinterest)", "2:3 (Pinterest)"],
];



/**
 * Suit une création lancée depuis l'écran jusqu'à sa fin, puis recharge la liste : avec le moteur local, un visuel est
 * prêt en 1 à 2 s, souvent avant le prochain rafraîchissement du projet (15 s) — sans ce suivi, rien n'apparaissait.
 * Un échec est affiché tout de suite avec sa raison (plus de « en préparation » sans suite).
 */
function useFollowJob(onDone: () => unknown) {
  const { reload: reloadProject } = useProject();
  const toast = useToast();
  const t = useT();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return useCallback(
    (jobId: string | undefined, okMessage: string, noneMessage: string) => {
      reloadProject().catch(() => {});
      if (!jobId) return;
      const started = Date.now();
      const tick = async () => {
        try {
          const { job } = await api<{ job: { status: string; error: string | null; message?: string | null; result?: { outcomes?: { assetId: string | null }[]; delivery?: {state:string;message:string} } | null } }>(`/api/jobs/${jobId}`);
          if (job.status === "done") {
            await done.current();
            reloadProject().catch(() => {});
            // Tâche terminée sans aucune image retenue : dit clairement (jamais « image prête » pour rien).
            const outcomes = job.result?.outcomes;
            if (Array.isArray(outcomes) && !outcomes.some((o) => o.assetId)) toast("bad", noneMessage);
            else if(job.result?.delivery)toast(["delivered","ready"].includes(job.result.delivery.state)?"ok":"info",job.result.delivery.message);
            else toast("ok", okMessage);
            return;
          }
          if (job.status === "failed" || job.status === "cancelled" || job.status === "blocked") {
            // Un échec peut suivre l'enregistrement d'une première image : la rendre accessible sans relance.
            await done.current();
            reloadProject().catch(() => {});
            if (job.status === "failed") toast("bad", job.error || t("La création a échoué.", "Creation failed."));
            if (job.status === "blocked") toast("bad", job.message || t("La création est bloquée : rien n'a été créé à la place.", "Creation is blocked: nothing was created instead."));
            return;
          }
        } catch {}
        if (Date.now() - started < 20 * 60_000) timers.current.push(setTimeout(tick, Date.now() - started < 60_000 ? 1500 : 5000));
      };
      timers.current.push(setTimeout(tick, 800));
    },
    [reloadProject, toast, t],
  );
}



/**
 * Accord du client pour des personnes dans les visuels créés. Sans accord (ni photo du client montrant une personne),
 * le studio n'en ajoute aucune : une image, une vidéo ou une publicité qui en montre une est refusée.
 */
function PeopleConsent() {
  const { id, data, reload } = useProject();
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const on = data.settings.peopleAllowed === true;
  const change = async (v: boolean) => {
    setBusy(true);
    try {
      await api(`/api/projects/${id}`, { method: "PATCH", body: { settings: { peopleAllowed: v } } });
      toast("ok", v ? t("Personnes autorisées dans les visuels créés.", "People allowed in created visuals.") : t("Aucune personne dans les visuels créés.", "No people in created visuals."));
      await reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-4">
      <Toggle checked={on} onChange={change} disabled={busy} label={t("Autoriser des personnes dans les visuels créés (images, vidéos, publicités)", "Allow people in created visuals (images, videos, ads)")} />
      <p className="mt-2 text-xs text-muted">{on ? t("Le studio peut montrer des personnes quand la scène s'y prête.", "The studio may show people when the scene calls for it.") : t("Par défaut, aucune personne n'est ajoutée : un visuel qui en montre une est refusé. Vos propres photos avec des personnes restent utilisables.", "By default no person is added: a visual showing one is rejected. Your own photos with people remain usable.")}</p>
    </Card>
  );
}

/** Provenance d'une image de la banque (badge et filtre). */
export type Source = "mine" | "stock" | "ai" | "studio";
export function sourceOf(a: Pick<AssetView, "origin" | "role" | "meta">): Source {
  if (a.origin === "upload" || a.origin === "site" || a.origin === "link") return a.role === "cutout" ? "studio" : "mine";
  if (a.origin === "import" || a.meta?.stock) return "stock";
  if (a.meta?.aiGenerated || (a.origin === "generated" && a.role === "lifestyle")) return "ai";
  return "studio";
}
const SOURCES: [Source | "", string, string][] = [
  ["", "Toutes", "All"],
  ["mine", "Vos photos", "Your photos"],
  ["stock", "Photos libres", "Royalty-free"],
  ["ai", "Créées par l'IA", "Created by AI"],
  ["studio", "Studio (détourages, mises en scène)", "Studio (cutouts, staged)"],
];
const SOURCE_BADGE: Record<Source, [string, string]> = { mine: ["Vous", "Yours"], stock: ["Libre", "Free"], ai: ["IA", "AI"], studio: ["Studio", "Studio"] };

const PRODUCT_AI_KINDS: [string, string, string][] = [
  ["usage_scene", "Produit en situation", "Product in a real setting"],
  ["lifestyle", "Produit utilisé", "Product in use"],
  ["ambiance", "Univers de la marque (sans produit)", "Brand world (no product)"],
];
const SERVICE_AI_KINDS: [string, string, string][] = [
  ["trade_photo", "Photo du métier", "Photo of the trade"],
  ["ambiance", "Ambiance de l'activité", "Business mood"],
];
const ASPECTS: [string, string, string][] = [
  ["4:5", "4:5 · portrait", "4:5 · portrait"],
  ["1:1", "1:1 · carré", "1:1 · square"],
  ["16:9", "16:9 · paysage", "16:9 · landscape"],
  ["9:16", "9:16 · vertical", "9:16 · vertical"],
];

/** Réponse de GET /api/projects/[id]/images : IA d'images utilisable, raison sinon, prix d'une image. */
export type ImagesQuote = { ai: boolean; reason?: string | null; quote: { ai_image: number } };

/**
 * IA d'images indisponible (forfait payé, mais budget épuisé ou aucun modèle d'images utilisable) : dit clairement,
 * avec la raison ; jamais de « version simplifiée » ni de gabarit à la place (images finales 100 % IA).
 */
export function ImageAiNotice({ reason }: { reason?: string | null }) {
  const t = useT();
  return (
    <div className="rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn" data-image-ai-notice>
      <strong>{t("Création d'images par l'IA indisponible pour l'instant.", "AI image creation is unavailable for now.")}</strong>{" "}
      {reason ? t(`Raison : ${reason}.`, `Reason: ${reason}.`) : t("Budget IA épuisé ou fournisseur désactivé.", "AI budget used up or provider disabled.")}{" "}
      {t("Aucune image n'est fabriquée à la place : vous pouvez importer vos photos ou chercher des photos libres.", "No image is made instead: you can upload your photos or search royalty-free photos.")}
    </div>
  );
}

export default function TabImages() {
  const { id, data } = useProject();
  const t = useT();
  const toast = useToast();
  const services = data?.business === "services";
  const [source, setSource] = useState<Source | "">("");
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const agentUi=useAgentUi()&&data?.conversationContext===true,{setFocus:setAgentFocus}=useAgentFocus();
  useEffect(()=>{if(agentUi&&viewer)setAgentFocus({projectId:id,tab:'images',label:viewer.name,target:{kind:'asset',assetId:viewer.id,version:viewer.version}});},[agentUi,id,viewer,setAgentFocus]);
  const [dialog, setDialog] = useState<"search" | "create" | null>(null);
  const [themePreparation,setThemePreparation]=useState<ThemeImagePreparation|null>(null);
  useEffect(()=>{const q=new URLSearchParams(window.location.search),slot=q.get("themeSlot"),version=q.get("themeVersion");if(!slot||!version)return;let active=true;api<ThemeImagePreparation>(`/api/projects/${id}/theme/adaptation?slot=${encodeURIComponent(slot)}&version=${encodeURIComponent(version)}`).then(p=>{if(active){setThemePreparation(p);setDialog("create");}}).catch(e=>{if(active)toast("bad",(e as Error).message);});return()=>{active=false;};},[id]);
  const locked = useCreationLocked();
  const active = useActive(["image.v2", "image.single", "images.generate"]);
  const { list, reload, status, setStatus } = useImageList(id, BANK_IMAGE_ROLES.join(","));
  const follow = useFollowJob(reload);
  // État de l'IA d'images du projet et prix d'une image (affiché avant toute création payante).
  const { data: q } = useApi<ImagesQuote>(`/api/projects/${id}/images`);
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
      for (const f of Array.from(files).slice(0, 30)) fd.append("files", f);
      fd.append("role", services ? "lifestyle" : "original");
      const r = await fetch(`/api/projects/${id}/files`, { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? t("Import impossible.", "Upload failed."));
      toast("ok", t("Photos ajoutées à votre banque.", "Photos added to your bank."));
      await reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const all = (list?.assets ?? []).filter((a) => a.kind === "image");
  const shown = status === "trash" ? all : all.filter((a) => !source || sourceOf(a) === source);
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6" data-image-bank>
      <CopyFailureHistory/>
      {!locked && q && !q.ai && <ImageAiNotice reason={q.reason} />}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold">{t("Banque d'images", "Image bank")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t("Des images neutres, sans texte, réutilisées partout : site, publications, publicités. Les publications avec texte se créent dans Publications.", "Neutral images, no text, reused everywhere: website, posts, ads. Posts with text are created in Posts.")}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          <Button variant="ghost" icon={<Upload className="size-4" />} loading={uploading} onClick={() => fileRef.current?.click()} data-bank-upload>{t("Importer", "Upload")}</Button>
          <Button variant="secondary" icon={<Search className="size-4" />} disabled={locked} onClick={() => setDialog("search")} data-bank-search>{t("Chercher des photos libres", "Find royalty-free photos")}</Button>
          <Button icon={<Wand2 className="size-4" />} disabled={locked} onClick={() => setDialog("create")} data-bank-create>{t("Créer une image", "Create an image")}</Button>
        </div>
        {locked && <div className="sm:basis-full"><PlanRequired what="images" /></div>}
      </Card>
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <div>
        <div className="scrollbar-none mb-3 flex gap-1.5 overflow-x-auto" role="tablist">
          {SOURCES.map(([v, fr, en]) => (
            <button key={v} role="tab" aria-selected={source === v} onClick={() => setSource(v)} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", source === v ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{t(fr, en)}</button>
          ))}
        </div>
        <div className="mt-4"><StatusChips value={status} onChange={setStatus} /></div>
        {status === "trash" ? (
          <TrashGrid assets={all} onRestored={reload} />
        ) : list && shown.length === 0 ? (
          <Empty title={t("Aucune image ici pour l'instant", "No images here yet")} icon={<ImagePlus className="size-5" />} action={!locked && <Button icon={<Search className="size-4" />} onClick={() => setDialog("search")}>{t("Chercher des photos libres", "Find royalty-free photos")}</Button>}>
            {t("Importez vos photos, cherchez des photos libres de droits ou créez une image : elle arrive ici, sans texte.", "Upload your photos, search royalty-free photos or create an image: it lands here, with no text.")}
          </Empty>
        ) : (
          <div className="columns-2 gap-4 sm:columns-3 xl:columns-4">
            {shown.map((a) => {
              const src = sourceOf(a);
              return (
                <button key={a.id} onClick={() => setViewer(a)} className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-line bg-card text-left transition hover:-translate-y-0.5 hover:shadow-soft">
                  <div className="relative">
                    <img src={a.thumbUrl ?? a.url} alt={a.name} className="w-full" loading="lazy" style={{ aspectRatio: a.width && a.height ? `${a.width}/${a.height}` : undefined }} />
                    <span className="absolute left-2 top-2"><StatusBadge status={a.status} /></span>
                    <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-medium text-paper" data-source-badge>{src === "stock" && (a.meta?.stock?.aiGenerated || a.meta?.stock?.silhouette) ? [t("Libre", "Free"), a.meta?.stock?.aiGenerated && t("créée par l'IA", "AI-made"), a.meta?.stock?.silhouette && t("silhouette", "silhouette")].filter(Boolean).join(" · ") : t(...SOURCE_BADGE[src])}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="truncate text-xs">{ROLE_LABEL[a.role ?? ""] ?? a.name}</span>
                    {a.width && a.height ? <Badge className="shrink-0">{a.width >= a.height * 1.3 ? "16:9" : a.height >= a.width * 1.3 ? "9:16" : a.height > a.width * 1.05 ? "4:5" : "1:1"}</Badge> : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* Fenêtres remontées quand l'activité du projet est connue : ouvertes avant son chargement, elles proposaient le
          « Type » d'une boutique à une entreprise de services (valeur fixée au premier affichage). */}
      <Modal open={dialog === "search"} onClose={() => setDialog(null)} title={t("Chercher des photos libres", "Find royalty-free photos")} wide>
        <SearchPhotos key={services ? "services" : "products"} services={services} peopleAllowed={(data?.settings as { peopleAllowed?: boolean } | undefined)?.peopleAllowed === true} onStarted={(jobId) => (setDialog(null), follow(jobId, t("Photos trouvées : elles sont dans votre banque.", "Photos found: they're in your bank."), t("Aucune photo libre ne convient à ce sujet : rien n'a été ajouté. Essayez un autre sujet ou importez vos photos.", "No royalty-free photo fits this subject: nothing was added. Try another subject or upload your photos.")))} />
      </Modal>
      <Modal open={dialog === "create"} onClose={() => setDialog(null)} title={t("Créer une image", "Create an image")} wide>
        <CreateImage key={themePreparation?.themePlacement.slotKey??(services ? "services" : "products")} preparation={themePreparation} services={services} q={q} onStarted={(jobId) => (setDialog(null), follow(jobId, t("Image prête : elle est dans votre banque.", "Image ready: it's in your bank."), t("Aucune image n'a été retenue (contrôle de qualité ou IA indisponible) : rien n'a été mis à la place. Le détail est dans les tâches du projet.", "No image was kept (quality check or AI unavailable): nothing was put in its place. Details are in the project's tasks.")))} />
      </Modal>
      <AssetViewer asset={viewer} onClose={() => setViewer(null)} onChanged={reload} />
    </div>
  );
}

/** Photos libres de droits (gratuit) : sujet, format, nombre ; licence vérifiée, sujet contrôlé, jamais d'IA. */
function SearchPhotos({ services, peopleAllowed, onStarted }: { services: boolean; peopleAllowed: boolean; onStarted: (jobId?: string) => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [f, setF] = useState({ kind: services ? "trade_photo" : "ambiance", topic: "", aspect: "4:5", count: 2, broad: false, silhouettes: false });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const r = await api<{ jobId?: string }>(`/api/projects/${id}/images/v2`, { body: { action: "generate", request: { kind: f.kind, aspect: f.aspect, topic: f.topic.trim() || undefined, count: f.count, allowGenerate: false, broad: f.broad || undefined, silhouettes: (!peopleAllowed && f.silhouettes) || undefined } } });
      onStarted(r.jobId);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-4" data-bank-search-dialog>
      <p className="text-sm text-muted">{t("Le studio cherche des photos libres de droits sur votre sujet (ou, sans sujet, sur votre activité) : licence vérifiée, sujet contrôlé. Gratuit, aucune IA d'images.", "The studio searches royalty-free photos on your subject (or, without one, on your business): license verified, subject checked. Free, no AI images.")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Sujet (facultatif)", "Subject (optional)")} htmlFor="bs-topic"><Input id="bs-topic" value={f.topic} maxLength={200} onChange={(e) => setF({ ...f, topic: e.target.value })} placeholder={services ? t("Ex. chantier terminé, outils", "E.g. finished job, tools") : t("Ex. salle de bain lumineuse", "E.g. bright bathroom")} /></Field>
        <Field label={t("Type", "Type")} htmlFor="bs-kind">
          <Select id="bs-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            {services ? <option value="trade_photo">{t("Photo du métier", "Photo of the trade")}</option> : null}
            <option value="ambiance">{services ? t("Ambiance de l'activité", "Business mood") : t("Univers de la marque (sans produit)", "Brand world (no product)")}</option>
            <option value="stock_photo">{t("Photo libre, tout sujet", "Royalty-free photo, any subject")}</option>
          </Select>
        </Field>
        <Field label="Format" htmlFor="bs-aspect"><Select id="bs-aspect" value={f.aspect} onChange={(e) => setF({ ...f, aspect: e.target.value })}>{ASPECTS.map(([v, fr, en]) => <option key={v} value={v}>{t(fr, en)}</option>)}</Select></Field>
        <Field label={t("Nombre", "Count")} htmlFor="bs-count"><Select id="bs-count" value={f.count} onChange={(e) => setF({ ...f, count: Number(e.target.value) })}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5" checked={f.broad} onChange={(e) => setF({ ...f, broad: e.target.checked })} data-bank-search-broad />
        <span>{t("Recherche élargie : chaque mot est aussi cherché seul (plus de photos, parfois moins précises)", "Broader search: each word is also searched on its own (more photos, sometimes less precise)")}</span>
      </label>
      {!peopleAllowed && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={f.silhouettes} onChange={(e) => setF({ ...f, silhouettes: e.target.checked })} data-bank-search-silhouettes />
          <span>{t("Accepter les silhouettes (personne de dos ou dans l'ombre, visage non visible)", "Allow silhouettes (seen from behind or in shadow, face not visible)")}</span>
        </label>
      )}
      <p className="text-xs text-muted">{t("Votre texte est cherché tel quel sur Pixabay. Les photos libres de droits illustrent votre activité : ce ne sont pas des photos de vos réalisations. Une photo créée par l'IA et publiée sur Pixabay est signalée « créée par l'IA ».", "Your text is searched as-is on Pixabay. Royalty-free photos illustrate your business: they aren't photos of your own work. A photo made by AI and published on Pixabay is marked \"AI-made\".")}</p>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-sm font-medium text-ok">{t("Gratuit", "Free")}</span>
        <Button icon={<Search className="size-4" />} loading={busy} onClick={go} data-bank-search-go>{t("Chercher", "Search")}</Button>
      </div>
    </div>
  );
}

/**
 * Créer une image pour la banque : toujours créée par l'IA (règle « images finales 100 % IA » : plus de mise en scène
 * composée par le studio), vrai produit en référence, prix affiché avant ; aucune personne sans accord.
 */
function CreateImage({ services, q, onStarted,preparation }: { preparation?:ThemeImagePreparation|null;services: boolean; q: ImagesQuote | null | undefined; onStarted: (jobId?: string) => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const cost = useCostConfirm();
  const ai = !!q?.ai;
  const [f, setF] = useState({ kind: preparation?.kind??(services ? "trade_photo" : "usage_scene"), topic: preparation?.topic??"", aspect: preparation?.aspect??"4:5", count: 1 });
  const [busy, setBusy] = useState(false);
  // Prix d'une image par l'IA : coût probable (un essai), en % du budget IA du mois (jamais en euros). Une reprise
  // n'est décomptée que si elle a lieu, et elle est annoncée.
  const budget = useBudgetPct();
  const unit = q ? q.quote.ai_image : null;
  const price = unit == null ? null : budget.label(Math.round(unit * 1e6 * f.count));
  const operation=useRef<string|null>(null);
  const sending=useRef(false);
  useEffect(()=>{operation.current=null;},[f,id]);
  const go = async () => {
    if(sending.current)return;
    sending.current=true;
    setBusy(true);
    try {
      if (!(await cost.confirm("image"))) return;
      const r = await api<{ jobId?: string }>(`/api/projects/${id}/images/v2`, { body: { action: "generate", operationId:operation.current??(operation.current=crypto.randomUUID()), request: { ...(preparation?{themePlacement:preparation.themePlacement}:{}),kind: f.kind, aspect: f.aspect, topic: f.topic.trim() || undefined, count: f.count, allowGenerate: true, noStock: true } } });
      onStarted(r.jobId);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      sending.current=false;
      setBusy(false);
    }
  };
  const badge = price ? t(`Payant · ${price}`, `Paid · ${price}`) : t("Payant · prix affiché avant", "Paid · price shown first");
  return (
    <div className="grid gap-5" data-bank-create-dialog>
      {cost.dialog}
      <div className="rounded-2xl border border-ink bg-paper-2 p-3 text-sm" data-bank-create-option="ai">
        <span className="block font-medium">{t("Image créée par l'IA", "Image created by AI")}</span>
        <span className="block text-xs text-muted">{services ? t("Une image de votre métier ou de votre activité, contrôlée avant d'arriver dans la banque.", "An image of your trade or business, checked before it reaches the bank.") : t("Une scène autour de votre vrai produit, contrôlée avant d'arriver dans la banque.", "A scene around your real product, checked before it reaches the bank.")}</span>
        <span className="mt-1 inline-block rounded-full bg-signal-soft px-2 py-0.5 text-[11px] font-semibold text-signal">{badge}</span>
      </div>
      {q && !ai && <p className="text-xs text-warn" data-bank-create-unavailable>{q.reason ? t(`Création par l'IA indisponible pour l'instant : ${q.reason}.`, `AI creation unavailable for now: ${q.reason}.`) : t("Création par l'IA indisponible pour ce projet : budget IA épuisé ou fournisseur désactivé.", "AI creation unavailable for this project: AI budget used up or provider disabled.")} {t("Aucune image n'est créée à la place (ni gabarit, ni photo libre).", "No image is made instead (no template, no stock photo).")}</p>}
      {(
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Sujet (facultatif)", "Subject (optional)")} htmlFor="bc-topic"><Input id="bc-topic" value={f.topic} maxLength={200} onChange={(e) => setF({ ...f, topic: e.target.value })} placeholder={services ? t("Ex. atelier lumineux, matériaux posés", "E.g. bright workshop, materials laid out") : t("Ex. sur une table en bois, lumière du matin", "E.g. on a wooden table, morning light")} /></Field>
          <Field label={t("Type", "Type")} htmlFor="bc-aikind"><Select id="bc-aikind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{(services ? SERVICE_AI_KINDS : PRODUCT_AI_KINDS).map(([v, fr, en]) => <option key={v} value={v}>{t(fr, en)}</option>)}</Select></Field>
          <Field label="Format" htmlFor="bc-aspect"><Select id="bc-aspect" value={f.aspect} onChange={(e) => setF({ ...f, aspect: e.target.value })}>{ASPECTS.map(([v, fr, en]) => <option key={v} value={v}>{t(fr, en)}</option>)}</Select></Field>
          <Field label={t("Nombre", "Count")} htmlFor="bc-count"><Select id="bc-count" value={f.count} onChange={(e) => setF({ ...f, count: Number(e.target.value) })}>{[1, 2].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
          <div className="sm:col-span-2"><PeopleConsent /></div>
        </div>
      )}
      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">{price ? t(<>Coût probable : <strong>{price}</strong>. Si le contrôle demande une 2e image, elle est décomptée et vous êtes prévenu. Rien n'est lancé sans votre clic.</>, <>Likely cost: <strong>{price}</strong>. If the check needs a 2nd image, it is counted and you are told. Nothing starts without your click.</>) : t("Calcul du prix…", "Calculating the price…")}</p>
        <Button icon={<Wand2 className="size-4" />} loading={busy} disabled={busy || !ai || !price} onClick={go} data-bank-create-go>
          {t(`Créer · ${price ?? "…"}`, `Create · ${price ?? "…"}`)}
        </Button>
      </div>
    </div>
  );
}
