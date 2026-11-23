"use client";
/**
 * L'ATELIER DE CRÉATION (rapport 10 du 22 novembre 2026) : le client y fait ses images et ses vidéos pour vendre, avec
 * SINA, de trois façons (SINA s'en occupe, ensemble, moi-même). Le prix est sur chaque bouton, en part du budget d'IA
 * du mois (jamais en euros) ; chaque demande et chaque photo sont vérifiées avant ; une image ratée est dite ratée.
 * Les gestes payants passent par les devis et accords existants (images : `/images/v2`, vidéos : la vidéo guidée).
 *
 * Présentation embellie le 23 novembre 2026 (maquette approuvée par le propriétaire, « Yes ») : une grande scène sombre
 * avec les vraies créations du client (sinon ses vraies photos, sinon rien), les modèles de vidéo en cartes avec un
 * aperçu animé fait en CSS sur la vraie photo (aucune IA), les retouches en tuiles « un geste », « Mes créations » en
 * mur d'images. Rien d'autre ne change : mêmes devis, mêmes prix, mêmes relectures, mêmes garde-fous.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarPlus, Columns2, Eraser, Expand, ImageIcon, Info, Lock, Megaphone, Monitor, Pin, Play, ShieldCheck, Sparkles, Square, Video, Wallpaper, Wand2, Layers } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Modal, useApi, useToast } from "../ui";
import { useLang, useT } from "../i18n";
import { useProject } from "./project-context";
import { MediaPicker, type AssetView } from "./common";
import { useCostConfirm } from "./cost-confirm";
import { PlanRequired, useCreationLocked } from "../billing-client";
import { avertissement, type Mode } from "@/lib/atelier/conseil";
import type { OutilMontre } from "@/lib/atelier/outils";
import { lienVideoGuidee, type ModeleVideo } from "@/lib/atelier/modeles-videos";

type T2 = readonly [string, string];
type OutilVue = { id: string; nom: T2; mieux: T2; disponible: boolean; conseille: boolean; redessine: boolean; secours: boolean; prixMicro: number | null; prix: string | null; prixCourt: string | null };
type GesteVue = { id: string; nom: T2; aide: T2; kind: "image" | "video"; demande: { label: T2; exemple: T2; min: number } | null; outils: OutilVue[]; conseil: string | null };
type ModeleImageVue = { id: string; nom: T2; idee: T2; offre?: boolean; format: string; epingle: boolean; dansJours: number | null };
export type ModeleVideoVue = { id: string; nom: T2; quoi: T2; geste: string; dureeS: number; plans: number; garde: T2; as: "post" | "ad"; scene: string; sansIa?: boolean; offre?: boolean; outil: string | null; gratuit: boolean; prix: string | null; prixCourt: string | null; auPlus: string | null; raison: string | null; planSur?: string | null };
type Creation = { id: string; assetId: string | null; url: string | null; thumbUrl: string | null; geste: string; mode: string; kind: "image" | "video"; outil: string; cout: string; costMicro: number; status: "ok" | "rate" | "produit_modifie"; at: number; servie: boolean; usages: string[] };
type PhotoProduit = { id: string; url: string; thumbUrl: string | null };
type EnCours = { id: string; kind: "image" | "video"; progress: number | null; sourceUrl: string | null };
export type Etat = {
  modes: { id: Mode; nom: T2; aide: T2 }[];
  conditions: { acceptees: boolean; texte: T2[] };
  phraseAccord: T2;
  sousLePrix: T2;
  gestes: GesteVue[];
  lotMax: number;
  plafondVideos: { inclus: number; faites: number; restantes: number; phrase: string | null };
  modelesImages: ModeleImageVue[];
  modelesVideos: ModeleVideoVue[];
  gestesCamera: { id: string; nom: T2 }[];
  musique: { nom: string; elevenlabs: boolean; raison: T2 };
  couleurs: string[];
  vraisPixels: boolean;
  creations: Creation[];
  nonServies: { n: number; phrase: string | null };
  produit: { nom: string | null; services: boolean };
  photosProduit: PhotoProduit[];
  enCours: EnCours[];
};

/** Le texte dans la langue choisie ; en français, une espace insécable avant « : ; ! ? » (jamais un deux-points seul en début de ligne). */
export const pick = (x: T2, lang: string) => (lang === "en" ? x[1] : x[0].replace(/ ([:;!?»])/g, "\u00a0$1").replace(/« /g, "«\u00a0"));

/**
 * Le mouvement de l'aperçu d'une carte de vidéo, tiré du geste de caméra du modèle (CSS sur la vraie photo, sans IA) :
 * tour lent, rapprochement, éloignement, travelling, plongée, tout près, plan qui respire.
 */
export const MOUVEMENT_APERCU: Record<string, { anim: string; nom: T2 }> = {
  tour: { anim: "tour", nom: ["Tour lent", "Slow turn"] },
  "demi-tour": { anim: "tour", nom: ["Tour lent", "Slow turn"] },
  rapprochement: { anim: "rapprochement", nom: ["Rapprochement", "Push-in"] },
  arret: { anim: "rapprochement", nom: ["Rapprochement", "Push-in"] },
  eloignement: { anim: "eloignement", nom: ["Éloignement", "Pull-out"] },
  travelling: { anim: "travelling", nom: ["Travelling", "Tracking shot"] },
  panoramique: { anim: "travelling", nom: ["Panoramique", "Pan"] },
  plongee: { anim: "plongee", nom: ["Vue de haut", "From above"] },
  "contre-plongee": { anim: "plongee", nom: ["Vue d'en bas", "From below"] },
  detail: { anim: "pres", nom: ["Tout près", "Up close"] },
  fixe: { anim: "respire", nom: ["Plan fixe", "Still shot"] },
  "main-legere": { anim: "respire", nom: ["Caméra légère", "Light handheld"] },
};

/** Une étiquette de prix courte (« ≈ 1,8 % ») ; sans base connue, la phrase entière du même prix. */
const etiquette = (o: { prixCourt: string | null; prix: string | null } | null | undefined) => o?.prixCourt ?? o?.prix ?? null;

/** Suit une tâche jusqu'à sa fin, puis recharge l'atelier (une création ratée est dite ratée). */
function useSuivi(onDone: () => unknown) {
  const toast = useToast();
  const t = useT();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return useCallback((jobId?: string) => {
    if (!jobId) return;
    const start = Date.now();
    const tick = async () => {
      try {
        const { job } = await api<{ job: { status: string; error: string | null; message?: string | null } }>(`/api/jobs/${jobId}`);
        if (job.status === "done") { await onDone(); toast("ok", t("C'est prêt : regarde dans « Mes créations ».", "It's ready: look in \"My creations\".")); return; }
        if (["failed", "cancelled", "blocked"].includes(job.status)) { await onDone(); toast("bad", job.error || job.message || t("La création a échoué : rien ne t'est compté pour un essai raté par l'outil.", "Creation failed: a try the tool got wrong is never charged to you.")); return; }
      } catch { /* on réessaie */ }
      if (Date.now() - start < 20 * 60_000) timers.current.push(setTimeout(tick, Date.now() - start < 60_000 ? 1500 : 5000));
    };
    timers.current.push(setTimeout(tick, 800));
  }, [onDone, toast, t]);
}

/** Le client a-t-il demandé moins de mouvement (la vidéo de la scène ne part alors pas toute seule) ? */
function useMouvementReduit() {
  const [reduit, setReduit] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduit(m.matches);
    const on = () => setReduit(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduit;
}

type Ouvert = { geste: "fond" | "retirer" | "story" | "carre" | "lot" } | null;

export default function TabAtelier() {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const locked = useCreationLocked();
  const [poll, setPoll] = useState<number | undefined>(undefined);
  const { data, reload } = useApi<Etat>(`/api/projects/${id}/atelier`, { poll });
  const [mode, setMode] = useState<Mode>("ensemble");
  const [type, setType] = useState<"image" | "video">("image");
  const [decor, setDecor] = useState("");
  const [ajouts, setAjouts] = useState<string[]>([]);
  const [geste, setGeste] = useState<Ouvert>(null);
  const [modele, setModele] = useState<ModeleVideoVue | null>(null);
  const [avantApres, setAvantApres] = useState(false);
  const suivre = useSuivi(reload);
  const sceneRef = useRef<HTMLDivElement>(null);
  const decorRef = useRef<HTMLInputElement>(null);
  // Pendant une création, l'écran relit l'atelier (avancement réel de la tâche) ; au repos, rien ne tourne.
  useEffect(() => { setPoll(data?.enCours?.length ? 4000 : undefined); }, [data?.enCours?.length]);
  if (!data) return <div className="py-24 text-center text-muted">{t("Ouverture de l'atelier…", "Opening the workshop…")}</div>;
  const onStarted = (jobId?: string) => { suivre(jobId); void reload(); };
  const accepter = async () => {
    try { await api(`/api/projects/${id}/atelier`, { body: { action: "accepter_conditions" } }); await reload(); } catch (e) { toast("bad", (e as Error).message); }
  };
  const versLaScene = () => {
    setType("image");
    if (mode === "sina") setMode("ensemble");
    sceneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => decorRef.current?.focus({ preventScroll: true }), 350);
  };
  const remplir = (m: ModeleImageVue) => {
    setDecor(pick(m.idee, lang));
    setAjouts([]);
    versLaScene();
  };
  const ferme = locked || !data.conditions.acceptees;
  return (
    <div className="@container mx-auto grid max-w-7xl grid-cols-1 gap-8" data-atelier>
      {locked && <PlanRequired what="images" />}
      {!data.conditions.acceptees && (
        <Card className="p-5" data-atelier-conditions>
          <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4" aria-hidden />{t("Les règles de l'atelier, à lire une fois", "The workshop rules, to read once")}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{data.conditions.texte.map((c, k) => <li key={k}>{pick(c, lang)}</li>)}</ul>
          <Button className="mt-3" onClick={accepter} data-atelier-accepter>{t("J'ai lu, j'accepte", "I've read them, I accept")}</Button>
        </Card>
      )}

      <div ref={sceneRef} className="scroll-mt-4">
        <Scene etat={data} mode={mode} setMode={setMode} type={type} setType={setType} decor={decor} setDecor={setDecor} ajouts={ajouts} setAjouts={setAjouts} onStarted={onStarted} disabled={ferme} decorRef={decorRef} onModele={setModele} />
      </div>
      <VideosSection etat={data} onChoisir={setModele} />
      <RetouchesSection etat={data} disabled={ferme} onGeste={(g) => setGeste({ geste: g })} onScene={versLaScene} onAvantApres={() => setAvantApres(true)} />

      <section data-atelier-modeles-images aria-labelledby="atelier-idees">
        <h3 id="atelier-idees" className="font-display text-xl font-semibold">{t("Des idées prêtes", "Ready-made ideas")}</h3>
        <p className="mt-1 text-sm text-muted">{t("Un clic remplit ta demande ; tu la vois et tu la changes. J'en épingle trois pour le moment de l'année.", "One click fills in your request; you see it and change it. I pin three for this time of year.")}</p>
        <div className="mt-3 grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-4">
          {data.modelesImages.map((m) => (
            <button key={m.id} type="button" onClick={() => remplir(m)} data-atelier-modele-image={m.id} className={cx("flex h-full flex-col items-start justify-start rounded-2xl border p-3 text-left", m.epingle ? "border-[var(--or-2)] bg-[var(--or-soft)]" : "border-line bg-card hover:border-ink")}>
              <span className="flex items-center gap-1.5 font-medium">{m.epingle && <Pin className="size-3.5 text-[var(--or-texte)]" aria-label={t("Épinglé par SINA", "Pinned by SINA")} />}{pick(m.nom, lang)}</span>
              <span className="mt-1 block text-xs text-muted">{pick(m.idee, lang)}</span>
              {m.offre && <span className="mt-1 block text-xs text-warn">{t("Écris ton offre dans la demande : je ne l'invente pas.", "Write your offer in the request: I don't invent it.")}</span>}
              {m.dansJours != null && m.dansJours <= 21 && <span className="mt-1 block text-xs">{m.dansJours === 0 ? t("C'est aujourd'hui", "It's today") : t(`Dans ${m.dansJours} jours`, `In ${m.dansJours} days`)}</span>}
            </button>
          ))}
        </div>
      </section>

      <MurCreations etat={data} projectId={id} onNouvelle={versLaScene} />

      <GesteDialog etat={data} ouvert={geste} setOuvert={setGeste} mode={mode} onStarted={onStarted} disabled={ferme} />
      <ModeleDialog etat={data} modele={modele} onClose={() => setModele(null)} projectId={id} onAvantApres={() => { setModele(null); setAvantApres(true); }} />
      <AvantApres open={avantApres} onClose={() => setAvantApres(false)} />
    </div>
  );
}

/** Les images de la scène : les vraies créations réussies d'abord, puis les vraies photos du produit ; jamais rien d'inventé. */
export function imagesDeLaScene(creations: Pick<Creation, "id" | "url" | "thumbUrl" | "kind" | "status">[], photos: PhotoProduit[]) {
  const faites = creations.filter((c) => c.status === "ok" && c.url).map((c) => ({ id: c.id, url: c.url!, poster: c.thumbUrl, kind: c.kind, creation: true }));
  const vraies = photos.map((p) => ({ id: p.id, url: p.url, poster: p.thumbUrl, kind: "image" as const, creation: false }));
  return [...faites, ...vraies].slice(0, 3);
}

/** La grande barre « Que veux-tu créer ? » : un bouton qui ne se coupe jamais (il passe à la ligne et grandit). */
const BOUTON_BARRE = "!h-auto min-h-11 !whitespace-normal py-2.5 text-center leading-tight";

export function Scene({ etat, mode, setMode, type, setType, decor, setDecor, ajouts, setAjouts, onStarted, disabled, decorRef, onModele }: { etat: Etat; mode: Mode; setMode: (m: Mode) => void; type: "image" | "video"; setType: (t: "image" | "video") => void; decor: string; setDecor: (s: string) => void; ajouts: string[]; setAjouts: (a: string[]) => void; onStarted: (jobId?: string) => void; disabled: boolean; decorRef: React.RefObject<HTMLInputElement | null>; onModele: (m: ModeleVideoVue) => void }) {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const cost = useCostConfirm();
  const reduit = useMouvementReduit();
  const geste = etat.gestes.find((g) => g.id === "scene")!;
  const outilScene = geste.outils.find((o) => o.conseille) ?? null;
  const [aspect, setAspect] = useState("4:5");
  const [busy, setBusy] = useState(false);
  const [modeleId, setModeleId] = useState<string>(etat.modelesVideos.find((m) => !m.gratuit && m.prix)?.id ?? etat.modelesVideos[0]?.id ?? "");
  const operation = useRef<string | null>(null);
  useEffect(() => { operation.current = null; }, [decor, ajouts, aspect]);
  const ameliorer = async () => {
    try {
      const r = await api<{ texte: string; ajouts: string[] }>(`/api/projects/${id}/atelier`, { body: { action: "ameliorer", texte: decor, geste: "scene", aspect } });
      setAjouts(r.ajouts);
    } catch (e) { toast("bad", (e as Error).message); }
  };
  const demande = [decor.trim(), ...ajouts].filter(Boolean).join(lang === "en" ? "; " : " ; ").slice(0, 200);
  const go = async () => {
    setBusy(true);
    try {
      const operationId = operation.current ?? (operation.current = crypto.randomUUID());
      const request = { kind: "usage_scene", aspect, topic: demande || undefined, count: 1, allowGenerate: true, noStock: true, atelier: { mode } };
      const quote = await api<{ jobId?: string; approvalToken: string; maximumMicro: number; estimatePct: number; maximumPct: number; maximumCalls: number }>(`/api/projects/${id}/images/v2`, { body: { action: "quote", operationId, request } });
      if (quote.jobId) return onStarted(quote.jobId);
      if (quote.maximumMicro > 0 && !(await cost.confirm("image", { quote }))) return;
      const r = await api<{ jobId?: string }>(`/api/projects/${id}/images/v2`, { body: { action: "generate", operationId, request, approvalToken: quote.approvalToken, confirmation: true } });
      onStarted(r.jobId);
    } catch (e) { toast("bad", (e as Error).message); } finally { setBusy(false); }
  };
  const risque = avertissement({ outil: outilScene as unknown as OutilMontre, produitATexte: true, vraisPixels: etat.vraisPixels }, lang === "en" ? "en" : "fr");
  const images = imagesDeLaScene(etat.creations, etat.photosProduit);
  const nom = etat.produit.nom;
  const sujet = nom ?? (etat.produit.services ? t("Ton métier", "Your trade") : t("Ton produit", "Your product"));
  const modeleChoisi = etat.modelesVideos.find((m) => m.id === modeleId) ?? null;
  const prixScene = etiquette(outilScene);
  const prixModele = modeleChoisi ? etiquette(modeleChoisi) : null;
  const modeCourant = etat.modes.find((m) => m.id === mode);
  return (
    <section className="atelier-scene overflow-hidden rounded-3xl ring-1 ring-white/5 px-4 pb-5 pt-5 @xl:px-9 @xl:pb-7 @xl:pt-8" data-atelier-scene aria-labelledby="atelier-titre">
      {cost.dialog}
      <div className={cx("flex flex-col-reverse gap-6", images.length > 0 && "@4xl:grid @4xl:grid-cols-[minmax(0,1fr)_412px] @4xl:items-start @4xl:gap-8")}>
        <div>
          <h2 id="atelier-titre" className="max-w-xl font-display text-[30px] font-semibold leading-[1.08] tracking-[-0.01em] @xl:text-[44px]" data-atelier-titre>
            {sujet},<br />{t("comme dans une ", "shot like a ")}<span className="text-[var(--or-1)]">{t("campagne", "campaign")}</span>.
          </h2>
          <p className="mt-3 max-w-[470px] text-[15px] leading-relaxed text-white/75">
            {etat.produit.services
              ? t("Ton vrai métier dans des images et des vidéos qui donnent envie. Chaque création est relue avant de t'être montrée.", "Your real work in images and videos that make people want it. Every creation is checked before you see it.")
              : t("Ton vrai produit dans des images et des vidéos qui donnent envie. Chaque création est relue avant de t'être montrée.", "Your real product in images and videos that make people want it. Every creation is checked before you see it.")}
          </p>
          <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/[.08] p-1" role="radiogroup" aria-label={t("Ce que tu crées", "What you create")}>
            {(["image", "video"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={type === k} onClick={() => setType(k)} data-atelier-type={k} className={cx("inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors", type === k ? "bg-white font-semibold text-[#0B1220]" : "text-white/80 hover:text-white")}>
                {k === "image" ? <ImageIcon className="size-4" aria-hidden /> : <Video className="size-4" aria-hidden />}
                {k === "image" ? t("Image", "Image") : t("Vidéo", "Video")}
              </button>
            ))}
          </div>
        </div>
        {images.length > 0 && (
          <div className={cx("grid gap-3", images.length === 1 ? "grid-cols-1" : "grid-cols-[1.6fr_1fr] @4xl:grid-cols-[250px_150px]")} data-atelier-scene-images={images.map((i) => (i.creation ? "creation" : "photo")).join(",")}>
            {images.map((im, k) => (
              <div key={im.id} className={cx("relative overflow-hidden rounded-2xl bg-white/5 shadow-[0_20px_50px_rgba(0,0,0,.45)]", k === 0 ? (images.length > 1 ? "row-span-2 h-56 @xl:h-72 @4xl:h-[352px]" : "h-56 @xl:h-72 @4xl:h-[352px]") : "h-[106px] @xl:h-[136px] @4xl:h-[170px]", images.length === 2 && k === 1 && "row-span-2 h-56 @xl:h-72 @4xl:h-[352px]")}>
                {im.kind === "video"
                  ? <video src={im.url} poster={im.poster ?? undefined} muted loop playsInline autoPlay={!reduit} preload="metadata" className="h-full w-full object-cover" aria-label={t("Ta vidéo", "Your video")} />
                  : <img src={im.poster && k > 0 ? im.poster : im.url} alt={im.creation ? t("Une de tes créations", "One of your creations") : t("Ta photo de produit", "Your product photo")} className="h-full w-full object-cover" />}
                {im.kind === "video" && k === 0 && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur"><Play className="size-3 fill-current" aria-hidden />{t("Vidéo", "Video")}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-[20px] bg-card p-2.5 text-ink shadow-[0_18px_40px_rgba(0,0,0,.35)] @xl:pl-5" data-atelier-barre={type}>
        {type === "image" ? (
          <>
            <label htmlFor="atelier-decor" className="sr-only">{t("Que veux-tu créer ?", "What do you want to create?")}</label>
            <input id="atelier-decor" ref={decorRef} value={decor} maxLength={200} onChange={(e) => setDecor(e.target.value)} placeholder={t("Que veux-tu créer ?", "What do you want to create?")} title={geste.demande ? `${t("Par exemple", "For example")} : ${pick(geste.demande.exemple, lang)}` : undefined} className="min-h-11 min-w-0 grow basis-full rounded-xl bg-transparent px-3 text-[15px] placeholder:text-muted focus-visible:outline-2 focus-visible:outline-[var(--or-2)] @xl:px-0 @6xl:basis-0" data-atelier-decor />
            <div className="flex grow flex-wrap gap-2 @6xl:grow-0">
              <label className="relative inline-flex min-h-11 flex-1 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-[13px] @xl:flex-none">
                <Square className="size-3.5" aria-hidden /><span className="sr-only">{t("Format", "Format")}</span>
                <select id="atelier-aspect" aria-label={t("Format", "Format")} className="bg-transparent pr-1 outline-none" value={aspect} onChange={(e) => setAspect(e.target.value)}>{["4:5", "1:1", "9:16", "16:9"].map((a) => <option key={a} value={a}>{a}</option>)}</select>
              </label>
              {mode !== "moi" && <Button variant="secondary" className={cx(BOUTON_BARRE, "flex-1 @xl:flex-none")} icon={<Wand2 className="size-4" aria-hidden />} onClick={ameliorer} disabled={disabled} data-atelier-ameliorer>{t("Améliorer avec SINA (gratuit)", "Improve with SINA (free)")}</Button>}
            </div>
            <button type="button" className={cx("atelier-or inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-[15px] font-semibold leading-tight shadow-[0_6px_18px_rgba(196,154,90,.35)] transition hover:brightness-105 disabled:opacity-55", "w-full @xl:w-auto")} disabled={disabled || busy || !outilScene} onClick={go} data-atelier-scene-go aria-label={outilScene?.prix ? `${t("Créer", "Create")} : ${outilScene.prix}` : undefined} title={outilScene?.prix ?? undefined} aria-busy={busy || undefined}>
              <Sparkles className={cx("size-4", busy && "animate-pulse")} aria-hidden />
              {outilScene && prixScene ? <span>{t("Créer", "Create")} <span className="font-medium opacity-80">· {prixScene}</span></span> : t("Pas encore ouvert", "Not open yet")}
            </button>
          </>
        ) : (
          <>
            <label htmlFor="atelier-modele" className="basis-full px-2 text-[15px] text-muted @xl:basis-auto @xl:px-0">{t("Quelle vidéo veux-tu ?", "Which video do you want?")}</label>
            <select id="atelier-modele" value={modeleId} onChange={(e) => setModeleId(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-3 text-[15px] font-medium" data-atelier-modele-barre>
              {etat.modelesVideos.map((m) => <option key={m.id} value={m.id}>{pick(m.nom, lang)}</option>)}
            </select>
            <button type="button" className="atelier-or inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-[15px] font-semibold leading-tight shadow-[0_6px_18px_rgba(196,154,90,.35)] transition hover:brightness-105 disabled:opacity-55 @xl:w-auto" disabled={!modeleChoisi} onClick={() => modeleChoisi && onModele(modeleChoisi)} data-atelier-video-barre-go title={modeleChoisi?.prix ?? undefined}>
              <Sparkles className="size-4" aria-hidden />
              <span>{t("Créer", "Create")}{prixModele && <span className="font-medium opacity-80"> · {prixModele}</span>}</span>
            </button>
          </>
        )}
      </div>

      {type === "image" && ajouts.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" data-atelier-ajouts>
          <span className="text-xs text-white/70">{t("Ce que SINA ajoute :", "What SINA adds:")}</span>
          {ajouts.map((a) => <button key={a} type="button" onClick={() => setAjouts(ajouts.filter((x) => x !== a))} className="rounded-full border border-white/25 px-2.5 py-1 text-xs text-white/90 hover:border-white/60" title={t("Retirer", "Remove")} aria-label={`${t("Retirer", "Remove")} : ${a}`}>{a} ×</button>)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={t("Comment on fait", "How we do it")}>
        {etat.modes.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} data-atelier-mode={m.id} className={cx("rounded-full border px-3.5 py-1.5 text-[13px] transition-colors", mode === m.id ? "border-[var(--or-2)] bg-[rgba(201,164,106,.18)] text-[#F1DFBD]" : "border-white/20 text-white/75 hover:border-white/45 hover:text-white")}>{pick(m.nom, lang)}</button>
        ))}
      </div>
      <div className="mt-2 grid max-w-3xl gap-1 text-xs leading-relaxed text-white/65">
        {modeCourant && <p>{pick(modeCourant.aide, lang)}</p>}
        {type === "image" && geste.conseil && <p data-atelier-conseil>{geste.conseil}</p>}
        {type === "image" && risque && <p className="text-[#F3C98B]">{risque}</p>}
        <p>{pick(etat.sousLePrix, lang)}</p>
      </div>
    </section>
  );
}

export function VideosSection({ etat, onChoisir }: { etat: Etat; onChoisir: (m: ModeleVideoVue) => void }) {
  const t = useT();
  const { lang } = useLang();
  const photos = etat.photosProduit;
  const plafond = etat.plafondVideos.phrase ?? t(`Il te reste ${etat.plafondVideos.restantes} vidéo${etat.plafondVideos.restantes > 1 ? "s" : ""} ce mois-ci, sur ${etat.plafondVideos.inclus}.`, `You have ${etat.plafondVideos.restantes} video${etat.plafondVideos.restantes > 1 ? "s" : ""} left this month, out of ${etat.plafondVideos.inclus}.`);
  return (
    <section data-atelier-videos aria-labelledby="atelier-videos">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h3 id="atelier-videos" className="font-display text-xl font-semibold">{t("Des vidéos pour vendre", "Videos that sell")}</h3>
          <p className="mt-1 text-sm text-muted">{t(`Une image validée d'abord, puis le mouvement ; chaque image est relue. Ta musique « ${etat.musique.nom} » est composée par le Studio, sans droits à payer.`, `An approved still first, then the motion; every frame is reviewed. Your "${etat.musique.nom}" music is composed by the Studio, with no rights to pay.`)}</p>
        </div>
        <span className="rounded-full border border-line bg-card px-3 py-1.5 text-[13px]" data-atelier-plafond>{plafond}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 @xl:gap-4 @4xl:grid-cols-4">
        {etat.modelesVideos.map((m, k) => {
          const photo = photos.length ? photos[k % photos.length] : null;
          const mv = MOUVEMENT_APERCU[m.geste] ?? MOUVEMENT_APERCU.fixe;
          const ferme = !m.gratuit && etat.plafondVideos.restantes <= 0;
          const verrou = !m.gratuit && (m.raison || ferme);
          const prix = etiquette(m);
          return (
            <article key={m.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card" data-atelier-modele-video={m.id}>
              <div className="atelier-apercu relative aspect-[5/4] overflow-hidden bg-[#14130F]" data-mouvement={mv.anim}>
                {photo ? <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  : <div className="grid h-full place-items-center text-center text-sm text-white/70" data-atelier-ta-photo><span className="grid justify-items-center gap-1.5"><ImageIcon className="size-6" aria-hidden />{t("Ta photo ici", "Your photo here")}</span></div>}
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-medium text-[#2A3246]">{pick(mv.nom, lang)}</span>
                <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">{t(`${m.dureeS} s`, `${m.dureeS}s`)}</span>
                <span className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full bg-white/90 text-[#0B1220] shadow-[0_6px_16px_rgba(0,0,0,.25)]" aria-hidden><Play className="size-3.5 fill-current" /></span>
              </div>
              <div className="flex flex-1 flex-col p-3 @xl:p-4">
                <h4 className="text-[15px] font-semibold leading-snug @xl:text-base">{pick(m.nom, lang)}</h4>
                <p className="mt-1 text-[13px] leading-snug text-muted @xl:text-[13.5px]">{pick(m.quoi, lang)}</p>
                {verrou && <p className="mt-2 flex items-start gap-1.5 text-xs text-muted" data-atelier-verrou={m.id}><Lock className="mt-0.5 size-3 shrink-0" aria-label={t("Réservé", "Locked")} />{m.raison ?? etat.plafondVideos.phrase}</p>}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                  {prix ? <span className={cx("rounded-full px-2.5 py-1 text-xs font-semibold", m.gratuit ? "bg-ok-soft text-ok" : "bg-[var(--or-soft)] text-[var(--or-texte)]")} data-atelier-video-prix={m.id} title={m.prix ?? undefined}>{prix}</span> : <span className="text-xs text-muted" data-atelier-video-prix={m.id}>{m.raison ? t("Pas dans ton forfait", "Not in your plan") : t("Pas encore ouvert", "Not open yet")}</span>}
                  <button type="button" onClick={() => onChoisir(m)} className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 py-1.5 text-[13.5px] font-semibold leading-tight hover:bg-paper-2" data-atelier-video-choisir={m.id} aria-label={`${t("Choisir", "Choose")} : ${pick(m.nom, lang)}`}>{t("Choisir", "Choose")}<ArrowRight className="size-3.5" aria-hidden /></button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {etat.produit.services && <p className="mt-3 text-xs text-muted">{t("Pour une entreprise de services, les vidéos montrent ton métier et tes réalisations, jamais une personne inventée.", "For a service business, videos show your trade and your work, never an invented person.")}</p>}
    </section>
  );
}

/** Le choix d'un modèle de vidéo : ses mises en garde et son « au plus » se lisent AVANT de partir vers la vidéo guidée. */
export function ModeleDialog({ etat, modele: m, onClose, projectId, onAvantApres }: { etat: Etat; modele: ModeleVideoVue | null; onClose: () => void; projectId: string; onAvantApres: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const geste = m ? etat.gestesCamera.find((g) => g.id === m.geste) : null;
  const ferme = !!m && !m.gratuit && etat.plafondVideos.restantes <= 0;
  return (
    <Modal open={!!m} onClose={onClose} title={m ? pick(m.nom, lang) : ""} wide>
      {m && (
        <div className="grid gap-4" data-atelier-modele-choix={m.id}>
          <p className="text-sm">{pick(m.quoi, lang)}</p>
          <p className="text-sm text-muted">{t(`${m.dureeS} secondes`, `${m.dureeS} seconds`)}{geste ? ` · ${pick(geste.nom, lang)}` : ""}</p>
          <p className="flex items-start gap-2 rounded-2xl bg-warn-soft p-3 text-sm text-warn" data-atelier-garde={m.id}><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />{pick(m.garde, lang)}</p>
          {m.offre && <p className="text-sm text-warn">{t("Écris ton offre dans la demande : je ne l'invente pas.", "Write your offer in the request: I don't invent it.")}</p>}
          {etat.produit.services && <p className="text-xs text-muted">{t("Pour une entreprise de services, les vidéos montrent ton métier et tes réalisations, jamais une personne inventée.", "For a service business, videos show your trade and your work, never an invented person.")}</p>}
          <div className="grid gap-1 rounded-2xl border border-line p-3 text-sm">
            {m.prix ? <span className="font-medium" data-atelier-modele-prix>{m.gratuit ? m.prix : `${t("Prix probable", "Likely price")} : ${m.prix}`}</span> : m.raison ? <span className="text-warn" data-atelier-raison>{m.raison}</span> : <span className="text-muted">{t("Pas encore ouvert", "Not open yet")}</span>}
            {m.auPlus && <span className="text-muted" data-atelier-au-plus>{t("Jamais plus que", "Never more than")} : {m.auPlus}</span>}
            {m.planSur && <span className="text-muted" data-atelier-plan-sur={m.id}>{m.planSur}</span>}
            {ferme && etat.plafondVideos.phrase && <span className="text-warn">{etat.plafondVideos.phrase}</span>}
            {!m.gratuit && <span className="text-xs text-muted">{pick(etat.sousLePrix, lang)} {t("Le prix exact t'est redonné sur la carte d'accord, avant toute création.", "The exact price is given again on the approval card, before anything is created.")}</span>}
          </div>
          <div className="flex justify-end">
            {m.gratuit ? <Button className={BOUTON_BARRE} onClick={onAvantApres} data-atelier-avant-apres>{t("Choisir mes deux photos", "Choose my two photos")}</Button>
              : ferme || !m.prix ? <Button variant="secondary" className={BOUTON_BARRE} disabled>{t("Utiliser ce modèle", "Use this template")}</Button>
              : <a className="atelier-or inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-center text-sm font-semibold leading-tight" href={lienVideoGuidee(projectId, m as unknown as ModeleVideo, lang === "en" ? "en" : "fr")} data-atelier-video-go={m.id}>{t("Régler ma vidéo et la créer", "Set up and create my video")}<ArrowRight className="size-4" aria-hidden /></a>}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function RetouchesSection({ etat, disabled, onGeste, onScene, onAvantApres }: { etat: Etat; disabled: boolean; onGeste: (g: "fond" | "retirer" | "story" | "lot") => void; onScene: () => void; onAvantApres: () => void }) {
  const t = useT();
  const prixDe = (g: string) => etiquette(etat.gestes.find((x) => x.id === g)?.outils.find((o) => o.conseille));
  const tuiles: { id: string; nom: string; icone: React.ReactNode; prix: string | null; gratuit?: boolean; go: () => void }[] = [
    { id: "fond", nom: t("Changer le fond", "Change the background"), icone: <Wallpaper className="size-5" aria-hidden />, prix: prixDe("fond"), go: () => onGeste("fond") },
    { id: "scene", nom: t("Mettre dans une scène", "Put it in a scene"), icone: <Sparkles className="size-5" aria-hidden />, prix: prixDe("scene"), go: onScene },
    { id: "retirer", nom: t("Retirer un détail", "Remove a detail"), icone: <Eraser className="size-5" aria-hidden />, prix: prixDe("retirer"), go: () => onGeste("retirer") },
    { id: "agrandir", nom: t("Agrandir le cadre", "Widen the frame"), icone: <Expand className="size-5" aria-hidden />, prix: prixDe("story"), go: () => onGeste("story") },
    { id: "avant-apres", nom: t("L'avant et l'après", "Before and after"), icone: <Columns2 className="size-5" aria-hidden />, prix: t("Gratuit", "Free"), gratuit: true, go: onAvantApres },
  ];
  const lot = prixDe("lot");
  return (
    <section data-atelier-gestes aria-labelledby="atelier-retouches">
      <h3 id="atelier-retouches" className="font-display text-xl font-semibold">{t("Retoucher une image", "Edit an image")}</h3>
      <p className="mt-1 text-sm text-muted">{t("Un geste, un résultat. Tu choisis ta photo juste après.", "One action, one result. You pick your photo right after.")}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 @2xl:grid-cols-3 @5xl:grid-cols-5">
        {tuiles.map((g, k) => (
          <button key={g.id} type="button" onClick={g.go} disabled={disabled} data-atelier-geste={g.id} className={cx("flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 text-left transition-colors hover:border-ink disabled:opacity-55 @xl:p-4", k === 4 && "col-span-2 @2xl:col-span-2 @5xl:col-span-1")}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--or-soft)] text-[var(--or-texte)]">{g.icone}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-snug">{g.nom}</span>
              <span className={cx("block text-xs", g.gratuit ? "font-medium text-ok" : "text-muted")} data-atelier-geste-prix={g.id}>{g.prix ?? t("Pas encore ouvert", "Not open yet")}</span>
            </span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onGeste("lot")} disabled={disabled} data-atelier-geste="lot" className="mt-3 inline-flex min-h-10 flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-line bg-card px-4 py-2 text-left text-sm leading-tight hover:border-ink disabled:opacity-55">
        <Layers className="size-4" aria-hidden /><span className="font-medium">{t("Tout mon catalogue", "My whole catalogue")}</span>
        <span className="text-muted">{t(`le même fond pour tes photos de produit, jusqu'à ${etat.lotMax} d'un coup`, `the same background for your product photos, up to ${etat.lotMax} at once`)}{lot ? ` · ${lot} ${t("par photo", "per photo")}` : ""}</span>
      </button>
    </section>
  );
}

/** La liste des outils d'un geste : quatre ou cinq au plus, celui que SINA conseille marqué, le prix sur chacun. */
function Outils({ geste, choisi, onChoix, mode }: { geste: GesteVue; choisi: string | null; onChoix: (id: string) => void; mode: Mode }) {
  const t = useT();
  const { lang } = useLang();
  const liste = mode === "sina" ? geste.outils.filter((o) => o.id.startsWith("openai:")) : geste.outils;
  return (
    <div className="grid gap-2" role="radiogroup" aria-label={t("Outil", "Tool")}>
      {liste.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={choisi === o.id} disabled={!o.disponible || mode === "sina"} onClick={() => onChoix(o.id)} data-atelier-outil={o.id} className={cx("rounded-xl border p-2.5 text-left text-sm disabled:opacity-60", choisi === o.id ? "border-ink bg-paper-2" : "border-line bg-card")}>
          <span className="flex flex-wrap items-center gap-2 font-medium">{pick(o.nom, lang)}{o.conseille && <Badge tone="ok">{t("Conseillé par SINA", "Recommended by SINA")}</Badge>}{o.secours && <Badge>{t("Secours", "Backup")}</Badge>}</span>
          <span className="block text-xs text-muted">{pick(o.mieux, lang)}</span>
          <span className="block text-xs">{o.disponible ? o.prix ?? t("Prix à confirmer", "Price to confirm") : t("Pas encore ouvert", "Not open yet")}</span>
        </button>
      ))}
    </div>
  );
}

/** Les champs d'un geste, ouverts au clic sur sa tuile, avec tous les garde-fous (outil, conseil, avertissement, prix). */
function GesteDialog({ etat, ouvert, setOuvert, mode, onStarted, disabled }: { etat: Etat; ouvert: Ouvert; setOuvert: (o: Ouvert) => void; mode: Mode; onStarted: (jobId?: string) => void; disabled: boolean }) {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const cost = useCostConfirm();
  const [photo, setPhoto] = useState<AssetView | null>(null);
  const [picker, setPicker] = useState(false);
  const [mots, setMots] = useState("");
  const [outil, setOutil] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const geste = etat.gestes.find((g) => g.id === ouvert?.geste) ?? null;
  useEffect(() => { setOutil(geste?.outils.find((o) => o.conseille)?.id ?? null); setMots(""); }, [ouvert?.geste]); // eslint-disable-line react-hooks/exhaustive-deps
  const lancer = async (assetIds: string[]) => {
    if (!geste) return;
    setBusy(true);
    try {
      const corps = (assetId: string) => ({ assetId, instruction: mots.trim(), geste: geste.id, mode, ...(mode !== "sina" && outil ? { outil } : {}) });
      const devis: { assetId: string; operationId: string; approvalToken: string; maximumMicro: number; estimatePct: number; maximumPct: number; maximumCalls: number }[] = [];
      for (const assetId of assetIds) {
        const operationId = crypto.randomUUID();
        const q = await api<{ approvalToken: string; maximumMicro: number; estimatePct: number; maximumPct: number; maximumCalls: number }>(`/api/projects/${id}/images/v2`, { body: { action: "quote_edit", operationId, ...corps(assetId) } });
        devis.push({ assetId, operationId, ...q });
      }
      const total = devis.reduce((s, d) => ({ estimatePct: s.estimatePct + d.estimatePct, maximumPct: s.maximumPct + d.maximumPct, maximumCalls: s.maximumCalls + d.maximumCalls }), { estimatePct: 0, maximumPct: 0, maximumCalls: 0 });
      if (!(await cost.confirm("image", { quote: total }))) return;
      for (const d of devis) {
        const r = await api<{ jobId?: string }>(`/api/projects/${id}/images/v2`, { body: { action: "edit", operationId: d.operationId, approvalToken: d.approvalToken, confirmation: true, ...corps(d.assetId) } });
        onStarted(r.jobId);
      }
      setOuvert(null);
    } catch (e) { toast("bad", (e as Error).message); } finally { setBusy(false); }
  };
  const go = async () => {
    if (geste?.id === "lot") {
      try {
        const { photos } = await api<{ photos: string[] }>(`/api/projects/${id}/atelier`, { body: { action: "catalogue" } });
        if (!photos.length) return toast("bad", t("Je ne trouve aucune photo de produit à toi dans ce projet.", "I can't find any of your product photos in this project."));
        await lancer(photos);
      } catch (e) { toast("bad", (e as Error).message); }
      return;
    }
    if (!photo) return toast("bad", t("Choisis d'abord une photo.", "Choose a photo first."));
    await lancer([photo.id]);
  };
  const choisi = geste?.outils.find((o) => o.id === outil) ?? null;
  const risque = geste && choisi ? avertissement({ outil: choisi as unknown as OutilMontre, produitATexte: true, vraisPixels: etat.vraisPixels }, lang === "en" ? "en" : "fr") : null;
  const cadre = geste?.id === "story" || geste?.id === "carre";
  const titre = !geste ? "" : cadre ? t("Agrandir le cadre", "Widen the frame") : pick(geste.nom, lang);
  return (
    <>
      {cost.dialog}
      <Modal open={!!geste} onClose={() => setOuvert(null)} title={titre} wide>
        {geste && (
          <div className="grid gap-4" data-atelier-geste-dialog={geste.id}>
            {cadre && (
              <div className="inline-flex w-fit rounded-full border border-line p-1" role="radiogroup" aria-label={t("Format du cadre", "Frame format")}>
                {(["story", "carre"] as const).map((g) => <button key={g} type="button" role="radio" aria-checked={geste.id === g} onClick={() => setOuvert({ geste: g })} data-atelier-format-cadre={g} className={cx("rounded-full px-4 py-1.5 text-sm", geste.id === g ? "bg-ink text-paper" : "text-ink")}>{g === "story" ? t("En hauteur, pour une story", "Tall, for a story") : t("En carré", "Square")}</button>)}
              </div>
            )}
            <p className="text-sm text-muted">{pick(geste.aide, lang)}{geste.id === "lot" ? ` ${t(`Jusqu'à ${etat.lotMax} photos d'un coup ; le prix de toutes est donné avant.`, `Up to ${etat.lotMax} photos at once; the price for all of them is given first.`)}` : ""}</p>
            {geste.id !== "lot" && (
              <div className="flex flex-wrap items-center gap-3">
                {photo ? <img src={photo.thumbUrl ?? photo.url} alt={photo.name} className="h-20 w-20 rounded-xl object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-line text-xs text-muted">{t("Aucune", "None")}</div>}
                <Button variant="secondary" className={BOUTON_BARRE} onClick={() => setPicker(true)} data-atelier-choisir-photo>{photo ? t("Changer d'image", "Change image") : t("Choisir une image", "Choose an image")}</Button>
              </div>
            )}
            {geste.demande && <Field label={pick(geste.demande.label, lang)} htmlFor="atelier-mots"><Input id="atelier-mots" value={mots} maxLength={300} onChange={(e) => setMots(e.target.value)} placeholder={pick(geste.demande.exemple, lang)} /></Field>}
            {geste.conseil && <p className="text-sm">{geste.conseil}</p>}
            <Outils geste={geste} choisi={mode === "sina" ? geste.outils.find((o) => o.id.startsWith("openai:"))?.id ?? null : outil} onChoix={setOutil} mode={mode} />
            {risque && <p className="text-xs text-warn">{risque}</p>}
            <p className="text-xs text-muted">{pick(etat.sousLePrix, lang)}</p>
            <div className="flex justify-end"><Button className={BOUTON_BARRE} loading={busy} disabled={disabled || busy || (geste.id !== "lot" && !photo) || (!!geste.demande && mots.trim().length < (geste.demande.min || 0))} onClick={go} data-atelier-geste-go>{choisi?.prix ? `${pick(geste.nom, lang)} : ${choisi.prix}` : pick(geste.nom, lang)}</Button></div>
          </div>
        )}
      </Modal>
      <MediaPicker open={picker} onClose={() => setPicker(false)} kinds={["image"]} title={t("Choisis une image", "Choose an image")} onPick={(sel) => { setPhoto(sel[0] ?? null); setPicker(false); }} />
    </>
  );
}

function AvantApres({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [avant, setAvant] = useState<AssetView | null>(null);
  const [apres, setApres] = useState<AssetView | null>(null);
  const [picker, setPicker] = useState<"avant" | "apres" | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!avant || !apres) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}/atelier`, { body: { action: "avant_apres", avant: avant.id, apres: apres.id } });
      toast("ok", t("Je monte tes deux photos : la vidéo arrive dans « Mes créations ».", "Putting your two photos together: the video lands in \"My creations\"."));
      onClose();
    } catch (e) { toast("bad", (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <Modal open={open} onClose={onClose} title={t("L'avant et l'après", "Before and after")} wide>
        <div className="grid gap-4" data-atelier-avant-apres-dialog>
          <p className="text-sm text-muted">{t("Deux de tes vraies photos, l'avant puis l'après. Je n'invente jamais l'après. Gratuit.", "Two of your real photos, before then after. I never invent the after. Free.")}</p>
          <div className="grid grid-cols-2 gap-3">
            {(["avant", "apres"] as const).map((k) => {
              const a = k === "avant" ? avant : apres;
              return <button key={k} type="button" onClick={() => setPicker(k)} className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-dashed border-line">{a ? <img src={a.thumbUrl ?? a.url} alt={a.name} className="h-full w-full object-cover" /> : <span className="text-sm">{k === "avant" ? t("Photo d'avant", "Before photo") : t("Photo d'après", "After photo")}</span>}</button>;
            })}
          </div>
          <div className="flex justify-end"><Button className={BOUTON_BARRE} loading={busy} disabled={!avant || !apres || busy} onClick={go}>{t("Monter mes deux photos (gratuit)", "Put my two photos together (free)")}</Button></div>
        </div>
      </Modal>
      <MediaPicker open={!!picker} onClose={() => setPicker(null)} kinds={["image"]} title={t("Choisis une de tes photos", "Choose one of your photos")} onPick={(sel) => { if (picker === "avant") setAvant(sel[0] ?? null); else setApres(sel[0] ?? null); setPicker(null); }} />
    </>
  );
}

const USAGES: Record<string, T2> = { post: ["dans une publication", "in a post"], campaign: ["dans une publicité", "in an ad"], theme_section: ["sur ton site", "on your site"], video: ["dans une vidéo", "in a video"], brand: ["dans ta marque", "in your brand"] };

/** La barre d'une création en cours : l'avancement réel de la tâche, sinon une barre qui va et vient, sans aucun chiffre. */
export function BarreCreation({ progress, label }: { progress: number | null; label: string }) {
  const reel = progress != null && progress > 0 && progress < 1;
  return (
    <div role="progressbar" aria-label={label} {...(reel ? { "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(progress! * 100) } : {})} className="relative mx-auto mt-2.5 h-1.5 w-36 overflow-hidden rounded-full bg-white/30" data-atelier-barre-creation={reel ? "reelle" : "sans-chiffre"}>
      {reel ? <span className="block h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${Math.round(progress! * 100)}%` }} /> : <span className="atelier-barre-indet" />}
    </div>
  );
}

export function MurCreations({ etat, projectId, onNouvelle }: { etat: Etat; projectId: string; onNouvelle: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const [pose, setPose] = useState<string | null>(null);
  // Une création qui vient d'arriver apparaît floue puis nette (une seule fois, jamais au premier affichage).
  const connues = useRef<Set<string> | null>(null);
  const [nouvelles, setNouvelles] = useState<Set<string>>(new Set());
  useEffect(() => {
    const ids = etat.creations.map((c) => c.id);
    if (connues.current) { const n = ids.filter((x) => !connues.current!.has(x)); if (n.length) setNouvelles(new Set(n)); }
    connues.current = new Set(ids);
  }, [etat.creations]);
  // La création va vraiment là où le client la veut : brouillon de publication, publicité préparée (rien n'est publié).
  const poser = async (c: Creation, cible: "publication" | "publicite") => {
    setPose(`${c.id}:${cible}`);
    try {
      const r = await api<{ lien: string; deja: boolean }>(`/api/projects/${projectId}/atelier`, { body: { action: "poser", creationId: c.id, cible } });
      toast("ok", cible === "publication" ? (r.deja ? t("Elle est déjà dans un brouillon de publication : je te l'ouvre.", "It's already in a draft post: opening it.") : t("Brouillon de publication prêt avec ton image. Rien n'est publié.", "Draft post ready with your image. Nothing is published.")) : (r.deja ? t("Elle est déjà dans une publicité préparée : je te l'ouvre.", "It's already in a prepared ad: opening it.") : t("Publicité préparée avec ton image, en brouillon. Rien n'est diffusé.", "Ad prepared with your image, as a draft. Nothing is running.")));
      window.location.href = r.lien;
    } catch (e) { toast("bad", (e as Error).message); } finally { setPose(null); }
  };
  const [filtre, setFiltre] = useState<"toutes" | "dorment">("toutes");
  const visibles = (filtre === "dorment" ? etat.creations.filter((c) => c.status === "ok" && !c.servie) : etat.creations).filter((c) => c.status !== "rate");
  const ratees = filtre === "toutes" ? etat.creations.filter((c) => c.status === "rate") : [];
  const enCours = filtre === "toutes" ? etat.enCours : [];
  const date = (at: number) => new Date(at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short" });
  const tuiles = [...enCours.map((e) => ({ enCours: e, c: null as Creation | null })), ...visibles.map((c) => ({ enCours: null as EnCours | null, c }))];
  const lire = (v: HTMLVideoElement | null, on: boolean) => { if (!v) return; if (on) void v.play().catch(() => {}); else v.pause(); };
  return (
    <section data-atelier-creations aria-labelledby="atelier-mur">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="atelier-mur" className="font-display text-xl font-semibold">{t("Mes créations", "My creations")}</h3>
          {etat.nonServies.phrase && <p className="mt-1 text-sm text-muted" data-atelier-dorment>{etat.nonServies.phrase} <a className="font-medium text-ink underline underline-offset-2" href={`/studio/${projectId}/publications#calendrier`}>{t("Ouvrir mon calendrier", "Open my calendar")}</a></p>}
        </div>
        <div className="flex gap-1.5" role="radiogroup" aria-label={t("Lesquelles", "Which ones")}>
          {(["toutes", "dorment"] as const).map((f) => <button key={f} type="button" role="radio" aria-checked={filtre === f} onClick={() => setFiltre(f)} className={cx("rounded-full border px-3 py-1.5 text-[13px]", filtre === f ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{f === "toutes" ? t("Toutes", "All") : t(`Pas encore servies (${etat.nonServies.n})`, `Not used yet (${etat.nonServies.n})`)}</button>)}
        </div>
      </div>
      {!tuiles.length && !ratees.length ? <div className="mt-4"><Empty title={t("Rien ici pour l'instant", "Nothing here yet")} icon={<ImageIcon className="size-5" />}>{t("Ce que tu crées dans l'atelier arrive ici, avec l'outil, la date et ce que ça a pris sur ton budget.", "What you create in the workshop lands here, with the tool, the date and what it took from your budget.")}</Empty></div> : (
        <div className="mt-4 grid auto-rows-[150px] grid-cols-2 gap-3 @xl:auto-rows-[200px] @2xl:grid-cols-3 @5xl:grid-cols-4 @4xl:gap-3.5" data-atelier-mur>
          {tuiles.map(({ enCours: e, c: cc }, k) => {
            const grand = k === 0 ? "col-span-2 row-span-2" : "";
            if (e) return (
              <figure key={e.id} className={cx("relative overflow-hidden rounded-2xl bg-[#14130F]", grand)} data-atelier-en-cours={e.id}>
                {e.sourceUrl && <img src={e.sourceUrl} alt="" className="atelier-flou h-full w-full object-cover" />}
                <figcaption className="absolute inset-0 grid place-items-center bg-black/45 p-3 text-center text-[13.5px] font-medium text-white [text-shadow:0_1px_8px_rgba(0,0,0,.5)]">
                  <div>{e.kind === "video" ? t("Ta vidéo se monte…", "Your video is being put together…") : t("Ta création apparaît…", "Your creation is appearing…")}<BarreCreation progress={e.progress} label={t("Avancement de la création", "Creation progress")} /></div>
                </figcaption>
              </figure>
            );
            const c = cc!;
            const pret = c.status === "ok";
            const actions = pret && !c.servie && !!c.assetId;
            const etatTexte = c.status === "produit_modifie" ? t("Gardée à part : ton produit a changé", "Kept aside: your product changed") : c.servie ? `${t("A servi", "Used")} ${c.usages.map((u) => pick(USAGES[u] ?? [u, u], lang)).join(", ")}` : t("Pas encore servie", "Not used yet");
            let video: HTMLVideoElement | null = null;
            return (
              <figure key={c.id} className={cx("group relative overflow-hidden rounded-2xl bg-paper-2", grand)} data-atelier-creation={c.id} onMouseEnter={() => lire(video, true)} onMouseLeave={() => lire(video, false)} onFocus={() => lire(video, true)} onBlur={() => lire(video, false)}>
                {c.url ? c.kind === "video" ? <video src={c.url} poster={c.thumbUrl ?? undefined} preload="metadata" ref={(v) => { video = v; }} className={cx("h-full w-full object-cover", nouvelles.has(c.id) && "atelier-net")} muted loop playsInline aria-label={t("Ta vidéo, lue au survol, sans le son", "Your video, plays on hover, muted")} /> : <img src={k === 0 ? c.url : c.thumbUrl ?? c.url} alt="" className={cx("h-full w-full object-cover", nouvelles.has(c.id) && "atelier-net")} loading="lazy" /> : <div className="grid h-full place-items-center text-xs text-muted">{t("Aucune image retenue", "No image kept")}</div>}
                {c.kind === "video" && <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] text-white"><Play className="size-3 fill-current" aria-hidden />{t("Vidéo", "Video")}</span>}
                <details className="absolute right-2.5 top-2.5 text-xs [&_summary::-webkit-details-marker]:hidden" data-atelier-details={c.id}>
                  <summary className="grid size-8 cursor-pointer list-none place-items-center rounded-full bg-black/55 text-white hover:bg-black/75" aria-label={t("Détails de la création", "Creation details")} title={t("Détails", "Details")}><Info className="size-4" aria-hidden /></summary>
                  <div className="absolute right-0 top-9 z-10 grid w-56 gap-0.5 rounded-xl border border-line bg-card p-2.5 text-ink shadow-soft">
                    <span>{c.outil}</span>
                    <span className="text-muted">{new Date(c.at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR")} · {c.cout}</span>
                  </div>
                </details>
                <figcaption className={cx("absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8 @xl:p-3 @xl:pt-10", k === 0 ? "items-end justify-between" : "flex-col-reverse items-stretch")}>
                  <span className="flex min-w-0 items-center gap-1.5 text-xs leading-tight text-white" data-atelier-etat={c.status}>
                    <span className={cx("size-2 shrink-0 rounded-full", c.status === "produit_modifie" ? "bg-[#FF9C8F]" : c.servie ? "bg-[#6FD39B]" : "bg-[var(--or-1)]")} aria-hidden />
                    <span className={cx("min-w-0", k > 0 && "line-clamp-2")} title={etatTexte}>{etatTexte}{k === 0 && <span className="block text-[11px] text-white/75">{date(c.at)}</span>}</span>
                  </span>
                  {actions && (
                    <span className={cx("flex shrink-0 gap-1.5", k > 0 && "self-end")}>
                      <button type="button" className="grid size-8 place-items-center rounded-[10px] bg-white/90 text-[#0B1220] hover:bg-white disabled:opacity-50" disabled={!!pose} onClick={() => void poser(c, "publication")} data-atelier-poser="publication" title={t("Mettre dans une publication", "Put in a post")} aria-label={t("Mettre dans une publication", "Put in a post")}><CalendarPlus className="size-4" aria-hidden /></button>
                      {c.kind === "image" && <button type="button" className="grid size-8 place-items-center rounded-[10px] bg-white/90 text-[#0B1220] hover:bg-white disabled:opacity-50" disabled={!!pose} onClick={() => void poser(c, "publicite")} data-atelier-poser="publicite" title={t("En faire une publicité", "Make it an ad")} aria-label={t("En faire une publicité", "Make it an ad")}><Megaphone className="size-4" aria-hidden /></button>}
                      {c.kind === "image" && <a className="grid size-8 place-items-center rounded-[10px] bg-white/90 text-[#0B1220] hover:bg-white" href={`/studio/${projectId}/boutique?poser=${encodeURIComponent(c.id)}`} data-atelier-poser="site" title={t("Mettre sur mon site", "Put on my site")} aria-label={t("Mettre sur mon site", "Put on my site")}><Monitor className="size-4" aria-hidden /></a>}
                    </span>
                  )}
                </figcaption>
              </figure>
            );
          })}
          <button type="button" onClick={onNouvelle} className="grid place-items-center rounded-2xl border border-dashed border-[var(--or-2)] bg-[var(--or-soft)] p-4 text-center text-sm font-medium text-[var(--or-texte)] hover:brightness-[1.03]" data-atelier-nouvelle>
            <span className="grid justify-items-center gap-1.5"><Sparkles className="size-5" aria-hidden />{t("Nouvelle création", "New creation")}</span>
          </button>
        </div>
      )}
      {ratees.length > 0 && (
        <ul className="mt-3 grid gap-1 text-xs text-muted" data-atelier-ratees>
          {ratees.map((c) => <li key={c.id} className="flex items-center gap-1.5" data-atelier-creation={c.id} data-atelier-etat="rate"><span className="size-1.5 rounded-full bg-bad" aria-hidden />{t("Ratée le", "Failed on")} {date(c.at)} {t("avec", "with")} {c.outil} : {t("je te le dis, elle n'est pas comptée si l'outil s'est trompé.", "I'm telling you, it isn't charged if the tool got it wrong.")}</li>)}
        </ul>
      )}
    </section>
  );
}
