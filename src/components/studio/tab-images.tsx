"use client";
/**
 * Onglet Images : la BANQUE D'IMAGES du projet. Seulement des images neutres, sans texte (vos photos, détourages,
 * photos libres de droits, mises en scène du studio, images créées par l'IA), réutilisées partout : site,
 * publications, publicités. Les publications avec texte se créent dans Publications.
 * Compléter la banque : chercher des photos libres (gratuit), créer (mise en scène gratuite du studio ou image par
 * l'IA, prix affiché avant), importer ses propres photos.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Search, Sparkles, Upload, Wand2 } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Modal, Select, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { EngineNotice, JobProgress, ROLE_LABEL, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import { useCostConfirm } from "./cost-confirm";
import { useLang, useT } from "../i18n";
import { formatEur, PlanRequired, useCreationLocked } from "../billing-client";
import { BANK_IMAGE_ROLES } from "@/lib/media/bank";

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



const STYLES = [
  ["studio", "Studio doux", "Soft studio"],
  ["podium", "Podium", "Podium"],
  ["arch", "Arche", "Arch"],
  ["window", "Lumière de fenêtre", "Window light"],
  ["spotlight", "Projecteur sombre", "Dark spotlight"],
  ["split", "Aplats de couleur", "Color blocks"],
  ["color", "Fond de marque", "Brand background"],
];
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
    (jobId: string | undefined, okMessage: string) => {
      reloadProject().catch(() => {});
      if (!jobId) return;
      const started = Date.now();
      const tick = async () => {
        try {
          const { job } = await api<{ job: { status: string; error: string | null } }>(`/api/jobs/${jobId}`);
          if (job.status === "done") {
            await done.current();
            reloadProject().catch(() => {});
            toast("ok", okMessage);
            return;
          }
          if (job.status === "failed" || job.status === "cancelled" || job.status === "blocked") {
            reloadProject().catch(() => {});
            if (job.status === "failed") toast("bad", job.error || t("La création a échoué.", "Creation failed."));
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

export default function TabImages() {
  const { id, data } = useProject();
  const t = useT();
  const toast = useToast();
  const services = data?.business === "services";
  const [source, setSource] = useState<Source | "">("");
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [dialog, setDialog] = useState<"search" | "create" | null>(null);
  const locked = useCreationLocked();
  const active = useActive(["image.v2", "image.single", "images.generate"]);
  const { list, reload, status, setStatus } = useImageList(id, BANK_IMAGE_ROLES.join(","));
  const follow = useFollowJob(reload);
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
      <EngineNotice what={t("les mises en scène du produit", "the product staging")} />
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
                    <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-medium text-paper">{t(...SOURCE_BADGE[src])}</span>
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
      <Modal open={dialog === "search"} onClose={() => setDialog(null)} title={t("Chercher des photos libres", "Find royalty-free photos")} wide>
        <SearchPhotos services={services} onStarted={(jobId) => (setDialog(null), follow(jobId, t("Photos trouvées : elles sont dans votre banque.", "Photos found: they're in your bank.")))} />
      </Modal>
      <Modal open={dialog === "create"} onClose={() => setDialog(null)} title={t("Créer une image", "Create an image")} wide>
        <CreateImage services={services} onStarted={(jobId) => (setDialog(null), follow(jobId, t("Image prête : elle est dans votre banque.", "Image ready: it's in your bank.")))} />
      </Modal>
      <AssetViewer asset={viewer} onClose={() => setViewer(null)} onChanged={reload} />
    </div>
  );
}

/** Photos libres de droits (gratuit) : sujet, format, nombre ; licence vérifiée, sujet contrôlé, jamais d'IA. */
function SearchPhotos({ services, onStarted }: { services: boolean; onStarted: (jobId?: string) => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [f, setF] = useState({ kind: services ? "trade_photo" : "ambiance", topic: "", aspect: "4:5", count: 2 });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const r = await api<{ jobId?: string }>(`/api/projects/${id}/images/v2`, { body: { action: "generate", request: { kind: f.kind, aspect: f.aspect, topic: f.topic.trim() || undefined, count: f.count, allowGenerate: false } } });
      onStarted(r.jobId);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-4" data-bank-search-dialog>
      <p className="text-sm text-muted">{t("Le studio cherche des photos libres de droits (licence vérifiée, sujet contrôlé) adaptées à votre activité. Gratuit, aucune IA d'images.", "The studio searches royalty-free photos (license verified, subject checked) suited to your business. Free, no AI images.")}</p>
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
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-sm font-medium text-ok">{t("Gratuit", "Free")}</span>
        <Button icon={<Search className="size-4" />} loading={busy} onClick={go} data-bank-search-go>{t("Chercher", "Search")}</Button>
      </div>
    </div>
  );
}

/**
 * Créer une image pour la banque : mise en scène gratuite du studio à partir de la vraie photo du produit
 * (packshot, décor), ou image créée par l'IA (prix affiché avant ; aucune personne sans accord).
 */
function CreateImage({ services, onStarted }: { services: boolean; onStarted: (jobId?: string) => void }) {
  const { id, data } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const cost = useCostConfirm();
  const { data: q } = useApi<{ ai: boolean; quote: { ai_image: number } }>(`/api/projects/${id}/images`);
  const ai = !!q?.ai;
  const [mode, setMode] = useState<"studio" | "ai">(services ? "ai" : "studio");
  const [studio, setStudio] = useState({ kind: "scene", style: "window", format: "product" });
  const [f, setF] = useState({ kind: services ? "trade_photo" : "usage_scene", topic: "", aspect: "4:5", count: 1 });
  const [busy, setBusy] = useState(false);
  // Prix d'une image par l'IA (estimation prudente, une reprise comprise si la première est refusée).
  const unit = q ? q.quote.ai_image : null;
  const price = unit == null ? null : formatEur(Math.max(0.01, Math.ceil(unit * f.count * 100) / 100), lang);
  const go = async () => {
    setBusy(true);
    try {
      if (mode === "studio") {
        const r = await api<{ jobId?: string }>(`/api/projects/${id}/images`, { body: { mode: "single", visual: "free", kind: studio.kind, style: studio.kind === "packshot" ? undefined : studio.style, format: studio.format } });
        onStarted(r.jobId);
      } else {
        if (!(await cost.confirm("image"))) return;
        const r = await api<{ jobId?: string }>(`/api/projects/${id}/images/v2`, { body: { action: "generate", request: { kind: f.kind, aspect: f.aspect, topic: f.topic.trim() || undefined, count: f.count, allowGenerate: true, noStock: true } } });
        onStarted(r.jobId);
      }
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const options: ["studio" | "ai", string, string, string][] = [
    ...(!services ? [["studio", t("Mise en scène du studio", "Studio staging"), t("Votre vraie photo de produit, détourée et posée sur un fond ou un décor (packshot, podium, lumière de fenêtre…). Sans IA.", "Your real product photo, cut out and placed on a background or set (packshot, podium, window light…). No AI."), t("Gratuit", "Free")] as ["studio", string, string, string]] : []),
    ["ai", t("Image créée par l'IA", "Image created by AI"), services ? t("Une image de votre métier ou de votre activité, contrôlée avant d'arriver dans la banque.", "An image of your trade or business, checked before it reaches the bank.") : t("Une scène autour de votre vrai produit, contrôlée avant d'arriver dans la banque.", "A scene around your real product, checked before it reaches the bank."), price ? t(`Payant · environ ${price}`, `Paid · about ${price}`) : t("Payant · prix affiché avant", "Paid · price shown first")],
  ];
  return (
    <div className="grid gap-5" data-bank-create-dialog>
      {cost.dialog}
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1.5 text-sm font-medium">{t("Comment créer l'image ?", "How should the image be created?")}</legend>
        {options.map(([v, label, help, badge]) => {
          const off = v === "ai" && !ai;
          return (
            <label key={v} className={cx("flex gap-3 rounded-2xl border p-3 text-sm", off ? "cursor-not-allowed opacity-55" : "cursor-pointer", mode === v ? "border-ink bg-paper-2" : "border-line")}>
              <input type="radio" name="bank-create" checked={mode === v} disabled={off} onChange={() => setMode(v)} className="mt-1" data-bank-create-option={v} />
              <span>
                <span className="block font-medium">{label}</span>
                <span className="block text-xs text-muted">{help}</span>
                <span className={cx("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", v === "studio" ? "bg-ok-soft text-ok" : "bg-signal-soft text-signal")}>{badge}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      {!ai && <p className="text-xs text-muted">{t("La création par l'IA n'est pas disponible pour ce projet (forfait Découverte, budget IA épuisé ou fournisseur désactivé).", "AI creation isn't available for this project (Discovery plan, AI budget used up or provider disabled).")}{services ? ` ${t("Cherchez plutôt des photos libres (gratuit) ou importez les vôtres.", "Search royalty-free photos instead (free) or upload your own.")}` : ""}</p>}
      {mode === "studio" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("Type", "Type")} htmlFor="bc-kind">
            <Select id="bc-kind" value={studio.kind} onChange={(e) => setStudio({ ...studio, kind: e.target.value, format: e.target.value === "packshot" ? "packshot" : "product" })}>
              <option value="packshot">{t("Packshot (fond uni)", "Packshot (plain background)")}</option>
              <option value="scene">{t("Mise en scène", "Staged scene")}</option>
            </Select>
          </Field>
          {studio.kind !== "packshot" && <Field label={t("Décor", "Set")} htmlFor="bc-style"><Select id="bc-style" value={studio.style} onChange={(e) => setStudio({ ...studio, style: e.target.value })}>{STYLES.map(([v, l, en]) => <option key={v} value={v}>{t(l, en)}</option>)}</Select></Field>}
          <Field label="Format" htmlFor="bc-format"><Select id="bc-format" value={studio.format} onChange={(e) => setStudio({ ...studio, format: e.target.value })}>{FORMATS.filter(([v]) => v !== "banner").map(([v, l, en]) => <option key={v} value={v}>{t(l, en)}</option>)}</Select></Field>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Sujet (facultatif)", "Subject (optional)")} htmlFor="bc-topic"><Input id="bc-topic" value={f.topic} maxLength={200} onChange={(e) => setF({ ...f, topic: e.target.value })} placeholder={services ? t("Ex. atelier lumineux, matériaux posés", "E.g. bright workshop, materials laid out") : t("Ex. sur une table en bois, lumière du matin", "E.g. on a wooden table, morning light")} /></Field>
          <Field label={t("Type", "Type")} htmlFor="bc-aikind"><Select id="bc-aikind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{(services ? SERVICE_AI_KINDS : PRODUCT_AI_KINDS).map(([v, fr, en]) => <option key={v} value={v}>{t(fr, en)}</option>)}</Select></Field>
          <Field label="Format" htmlFor="bc-aspect"><Select id="bc-aspect" value={f.aspect} onChange={(e) => setF({ ...f, aspect: e.target.value })}>{ASPECTS.map(([v, fr, en]) => <option key={v} value={v}>{t(fr, en)}</option>)}</Select></Field>
          <Field label={t("Nombre", "Count")} htmlFor="bc-count"><Select id="bc-count" value={f.count} onChange={(e) => setF({ ...f, count: Number(e.target.value) })}>{[1, 2].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
          <div className="sm:col-span-2"><PeopleConsent /></div>
        </div>
      )}
      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">{mode === "studio" ? <span className="font-medium text-ok">{t("Gratuit : aucun budget IA utilisé.", "Free: no AI budget used.")}</span> : price ? t(<>Coût estimé : environ <strong>{price}</strong>, pris sur le budget IA du projet. Rien n'est lancé sans votre clic.</>, <>Estimated cost: about <strong>{price}</strong>, taken from the project's AI budget. Nothing starts without your click.</>) : t("Calcul du prix…", "Calculating the price…")}</p>
        <Button icon={mode === "studio" ? <Sparkles className="size-4" /> : <Wand2 className="size-4" />} loading={busy} disabled={busy || (mode === "ai" && (!ai || !price))} onClick={go} data-bank-create-go>
          {mode === "studio" ? t("Créer l'image", "Create the image") : t(`Créer · ${price ?? "…"}`, `Create · ${price ?? "…"}`)}
        </Button>
      </div>
    </div>
  );
}
