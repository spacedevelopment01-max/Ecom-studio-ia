"use client";
/**
 * L'ATELIER DE CRÉATION (rapport 10 du 22 novembre 2026) : le client y fait ses images et ses vidéos pour vendre, avec
 * SINA, de trois façons (SINA s'en occupe, ensemble, moi-même). Le prix est sur chaque bouton, en part du budget d'IA
 * du mois (jamais en euros) ; chaque demande et chaque photo sont vérifiées avant ; une image ratée est dite ratée.
 * Les gestes payants passent par les devis et accords existants (images : `/images/v2`, vidéos : la vidéo guidée).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Clapperboard, ImagePlus, Pin, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
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
type OutilVue = { id: string; nom: T2; mieux: T2; disponible: boolean; conseille: boolean; redessine: boolean; secours: boolean; prixMicro: number | null; prix: string | null };
type GesteVue = { id: string; nom: T2; aide: T2; kind: "image" | "video"; demande: { label: T2; exemple: T2; min: number } | null; outils: OutilVue[]; conseil: string | null };
type ModeleImageVue = { id: string; nom: T2; idee: T2; offre?: boolean; format: string; epingle: boolean; dansJours: number | null };
type ModeleVideoVue = { id: string; nom: T2; quoi: T2; geste: string; dureeS: number; plans: number; garde: T2; as: "post" | "ad"; scene: string; sansIa?: boolean; offre?: boolean; outil: string | null; gratuit: boolean; prix: string | null };
type Creation = { id: string; assetId: string | null; url: string | null; thumbUrl: string | null; geste: string; mode: string; kind: "image" | "video"; outil: string; cout: string; costMicro: number; status: "ok" | "rate" | "produit_modifie"; at: number; servie: boolean; usages: string[] };
type Etat = {
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
};

/** Le texte dans la langue choisie ; en français, une espace insécable avant « : ; ! ? » (jamais un deux-points seul en début de ligne). */
export const pick = (x: T2, lang: string) => (lang === "en" ? x[1] : x[0].replace(/ ([:;!?»])/g, "\u00a0$1").replace(/« /g, "«\u00a0"));

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

export default function TabAtelier() {
  const { id, data: project } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const locked = useCreationLocked();
  const { data, reload } = useApi<Etat>(`/api/projects/${id}/atelier`);
  const [mode, setMode] = useState<Mode>("ensemble");
  const [decor, setDecor] = useState("");
  const [ajouts, setAjouts] = useState<string[]>([]);
  const suivre = useSuivi(reload);
  const sceneRef = useRef<HTMLDivElement>(null);
  if (!data) return <div className="py-24 text-center text-muted">{t("Ouverture de l'atelier…", "Opening the workshop…")}</div>;
  const accepter = async () => {
    try { await api(`/api/projects/${id}/atelier`, { body: { action: "accepter_conditions" } }); await reload(); } catch (e) { toast("bad", (e as Error).message); }
  };
  const remplir = (m: ModeleImageVue) => {
    setDecor(pick(m.idee, lang));
    setAjouts([]);
    if (mode === "sina") setMode("ensemble");
    sceneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const business = (project as { business?: string } | undefined)?.business;
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6" data-atelier>
      <Card className="p-5">
        <h2 className="font-display text-2xl font-semibold">{t("L'atelier", "The workshop")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("Ton vrai produit dans de belles images et des vidéos qui vendent. Le prix est sur chaque bouton, en part de ton budget du mois ; chaque image est vérifiée avant de t'être montrée.", "Your real product in beautiful images and videos that sell. The price is on every button, as a share of your monthly budget; every image is checked before you see it.")}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("Comment on fait", "How we do it")}>
          {data.modes.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} data-atelier-mode={m.id} className={cx("rounded-2xl border p-3 text-left text-sm", mode === m.id ? "border-ink bg-paper-2" : "border-line bg-card")}>
              <span className="block font-medium">{pick(m.nom, lang)}</span>
              <span className="block text-xs text-muted">{pick(m.aide, lang)}</span>
            </button>
          ))}
        </div>
        {locked && <div className="mt-4"><PlanRequired what="images" /></div>}
      </Card>

      {!data.conditions.acceptees && (
        <Card className="p-5" data-atelier-conditions>
          <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4" />{t("Les règles de l'atelier, à lire une fois", "The workshop rules, to read once")}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{data.conditions.texte.map((c, k) => <li key={k}>{pick(c, lang)}</li>)}</ul>
          <Button className="mt-3" onClick={accepter} data-atelier-accepter>{t("J'ai lu, j'accepte", "I've read them, I accept")}</Button>
        </Card>
      )}

      {data.nonServies.phrase && <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm" data-atelier-dorment><span>{data.nonServies.phrase}</span><a className="underline" href={`/studio/${id}/publications#calendrier`}>{t("Ouvrir mon calendrier", "Open my calendar")}</a></Card>}

      <div ref={sceneRef}><SceneCard etat={data} mode={mode} decor={decor} setDecor={setDecor} ajouts={ajouts} setAjouts={setAjouts} onStarted={suivre} disabled={locked || !data.conditions.acceptees} /></div>
      <GestesCard etat={data} mode={mode} onStarted={suivre} disabled={locked || !data.conditions.acceptees} />

      <Card className="p-5" data-atelier-modeles-images>
        <h3 className="font-semibold">{t("Des modèles prêts", "Ready-made templates")}</h3>
        <p className="mt-1 text-sm text-muted">{t("Un clic remplit ta demande ; tu la vois et tu la changes. J'en épingle trois pour le moment de l'année.", "One click fills in your request; you see it and change it. I pin three for this time of year.")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.modelesImages.map((m) => (
            <button key={m.id} type="button" onClick={() => remplir(m)} data-atelier-modele-image={m.id} className={cx("flex h-full flex-col items-start justify-start rounded-2xl border p-3 text-left", m.epingle ? "border-signal bg-signal-soft" : "border-line bg-card")}>
              <span className="flex items-center gap-1.5 font-medium">{m.epingle && <Pin className="size-3.5" aria-label={t("Épinglé par SINA", "Pinned by SINA")} />}{pick(m.nom, lang)}</span>
              <span className="mt-1 block text-xs text-muted">{pick(m.idee, lang)}</span>
              {m.offre && <span className="mt-1 block text-xs text-warn">{t("Écris ton offre dans la demande : je ne l'invente pas.", "Write your offer in the request: I don't invent it.")}</span>}
              {m.dansJours != null && m.dansJours <= 21 && <span className="mt-1 block text-xs">{m.dansJours === 0 ? t("C'est aujourd'hui", "It's today") : t(`Dans ${m.dansJours} jours`, `In ${m.dansJours} days`)}</span>}
            </button>
          ))}
        </div>
      </Card>

      <VideosCard etat={data} projectId={id} services={business === "services"} />
      <CreationsCard etat={data} projectId={id} />
    </div>
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

function SceneCard({ etat, mode, decor, setDecor, ajouts, setAjouts, onStarted, disabled }: { etat: Etat; mode: Mode; decor: string; setDecor: (s: string) => void; ajouts: string[]; setAjouts: (a: string[]) => void; onStarted: (jobId?: string) => void; disabled: boolean }) {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const cost = useCostConfirm();
  const geste = etat.gestes.find((g) => g.id === "scene")!;
  const outilScene = geste.outils.find((o) => o.conseille) ?? null;
  const [aspect, setAspect] = useState("4:5");
  const [busy, setBusy] = useState(false);
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
  return (
    <Card className="p-5" data-atelier-scene>
      {cost.dialog}
      <h3 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4" />{pick(geste.nom, lang)}</h3>
      <p className="mt-1 text-sm text-muted">{pick(geste.aide, lang)}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label={t("Le décor que tu veux", "The setting you want")} htmlFor="atelier-decor"><Input id="atelier-decor" value={decor} maxLength={200} onChange={(e) => setDecor(e.target.value)} placeholder={geste.demande ? pick(geste.demande.exemple, lang) : ""} data-atelier-decor /></Field>
        <Field label="Format" htmlFor="atelier-aspect"><select id="atelier-aspect" className="h-11 rounded-2xl border border-line bg-card px-3" value={aspect} onChange={(e) => setAspect(e.target.value)}>{["4:5", "1:1", "9:16", "16:9"].map((a) => <option key={a} value={a}>{a}</option>)}</select></Field>
      </div>
      {mode !== "moi" && <Button variant="secondary" size="sm" className="mt-2" icon={<Wand2 className="size-4" />} onClick={ameliorer} disabled={disabled} data-atelier-ameliorer>{t("Améliorer ma demande avec SINA (gratuit)", "Improve my request with SINA (free)")}</Button>}
      {ajouts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" data-atelier-ajouts>
          <span className="text-xs text-muted">{t("Ce que SINA ajoute :", "What SINA adds:")}</span>
          {ajouts.map((a) => <button key={a} type="button" onClick={() => setAjouts(ajouts.filter((x) => x !== a))} className="rounded-full border border-line px-2 py-0.5 text-xs" title={t("Retirer", "Remove")}>{a} ×</button>)}
        </div>
      )}
      {geste.conseil && <p className="mt-3 text-sm" data-atelier-conseil>{geste.conseil}</p>}
      {risque && <p className="mt-1 text-xs text-warn">{risque}</p>}
      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">{pick(etat.sousLePrix, lang)}</p>
        <Button icon={<Sparkles className="size-4" />} loading={busy} disabled={disabled || busy || !outilScene} onClick={go} data-atelier-scene-go>{outilScene?.prix ? `${t("Créer", "Create")} : ${outilScene.prix}` : t("Pas encore ouvert", "Not open yet")}</Button>
      </div>
    </Card>
  );
}

function GestesCard({ etat, mode, onStarted, disabled }: { etat: Etat; mode: Mode; onStarted: (jobId?: string) => void; disabled: boolean }) {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const cost = useCostConfirm();
  const [photo, setPhoto] = useState<AssetView | null>(null);
  const [picker, setPicker] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [mots, setMots] = useState("");
  const [outil, setOutil] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const geste = etat.gestes.find((g) => g.id === ouvert) ?? null;
  useEffect(() => { setOutil(geste?.outils.find((o) => o.conseille)?.id ?? null); setMots(""); }, [ouvert]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const retouches = etat.gestes.filter((g) => ["fond", "story", "carre", "retirer", "lot"].includes(g.id));
  const choisi = geste?.outils.find((o) => o.id === outil) ?? null;
  const risque = geste && choisi ? avertissement({ outil: choisi as unknown as OutilMontre, produitATexte: true, vraisPixels: etat.vraisPixels }, lang === "en" ? "en" : "fr") : null;
  return (
    <Card className="p-5" data-atelier-gestes>
      {cost.dialog}
      <h3 className="flex items-center gap-2 font-semibold"><ImagePlus className="size-4" />{t("Retoucher une image", "Edit an image")}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {photo ? <img src={photo.thumbUrl ?? photo.url} alt={photo.name} className="h-20 w-20 rounded-xl object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-line text-xs text-muted">{t("Aucune", "None")}</div>}
        <Button variant="secondary" onClick={() => setPicker(true)} data-atelier-choisir-photo>{t("Choisir une image", "Choose an image")}</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {retouches.map((g) => <Button key={g.id} size="sm" variant={g.id === "lot" ? "primary" : "secondary"} disabled={disabled || (g.id !== "lot" && !photo)} onClick={() => setOuvert(g.id)} data-atelier-geste={g.id}>{pick(g.nom, lang)}</Button>)}
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} kinds={["image"]} title={t("Choisis une image", "Choose an image")} onPick={(sel) => { setPhoto(sel[0] ?? null); setPicker(false); }} />
      <Modal open={!!geste} onClose={() => setOuvert(null)} title={geste ? pick(geste.nom, lang) : ""} wide>
        {geste && (
          <div className="grid gap-4" data-atelier-geste-dialog={geste.id}>
            <p className="text-sm text-muted">{pick(geste.aide, lang)}{geste.id === "lot" ? ` ${t(`Jusqu'à ${etat.lotMax} photos d'un coup ; le prix de toutes est donné avant.`, `Up to ${etat.lotMax} photos at once; the price for all of them is given first.`)}` : ""}</p>
            {geste.demande && <Field label={pick(geste.demande.label, lang)} htmlFor="atelier-mots"><Input id="atelier-mots" value={mots} maxLength={300} onChange={(e) => setMots(e.target.value)} placeholder={pick(geste.demande.exemple, lang)} /></Field>}
            {geste.conseil && <p className="text-sm">{geste.conseil}</p>}
            <Outils geste={geste} choisi={mode === "sina" ? geste.outils.find((o) => o.id.startsWith("openai:"))?.id ?? null : outil} onChoix={setOutil} mode={mode} />
            {risque && <p className="text-xs text-warn">{risque}</p>}
            <p className="text-xs text-muted">{pick(etat.sousLePrix, lang)}</p>
            <div className="flex justify-end"><Button loading={busy} disabled={busy || (!!geste.demande && mots.trim().length < (geste.demande.min || 0))} onClick={go} data-atelier-geste-go>{choisi?.prix ? `${pick(geste.nom, lang)} : ${choisi.prix}` : pick(geste.nom, lang)}</Button></div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

/** Bouton d'une carte étroite : il passe à la ligne et grandit au lieu d'être coupé (jamais un bouton coupé). */
const BOUTON_CARTE = "!h-auto min-h-8 w-full !whitespace-normal py-1.5 text-center leading-tight";

function VideosCard({ etat, projectId, services }: { etat: Etat; projectId: string; services: boolean }) {
  const t = useT();
  const { lang } = useLang();
  const [avantApres, setAvantApres] = useState(false);
  const lien = (m: ModeleVideoVue) => lienVideoGuidee(projectId, m as unknown as ModeleVideo, lang === "en" ? "en" : "fr");
  return (
    <Card className="p-5" data-atelier-videos>
      <h3 className="flex items-center gap-2 font-semibold"><Clapperboard className="size-4" />{t("Des vidéos pour vendre", "Videos that sell")}</h3>
      <p className="mt-1 text-sm text-muted">{t(`Une image fixe validée d'abord, puis le mouvement ; chaque image de la vidéo est relue ; ta musique « ${etat.musique.nom} » est composée par le Studio, sans droits à payer.`, `A still approved first, then the motion; every frame is reviewed; your "${etat.musique.nom}" music is composed by the Studio, with no rights to pay.`)}</p>
      <p className="mt-1 text-sm" data-atelier-plafond>{etat.plafondVideos.phrase ?? t(`Il te reste ${etat.plafondVideos.restantes} vidéo${etat.plafondVideos.restantes > 1 ? "s" : ""} ce mois-ci, sur ${etat.plafondVideos.inclus}.`, `You have ${etat.plafondVideos.restantes} video${etat.plafondVideos.restantes > 1 ? "s" : ""} left this month, out of ${etat.plafondVideos.inclus}.`)}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {etat.modelesVideos.map((m) => {
          const ferme = !m.gratuit && etat.plafondVideos.restantes <= 0;
          return (
            <div key={m.id} className="flex flex-col rounded-2xl border border-line bg-card p-3" data-atelier-modele-video={m.id}>
              <span className="font-medium">{pick(m.nom, lang)}</span>
              <span className="mt-1 text-xs text-muted">{pick(m.quoi, lang)}</span>
              <span className="mt-1 text-xs">{t(`${m.dureeS} secondes`, `${m.dureeS} seconds`)} · {etat.gestesCamera.find((g) => g.id === m.geste) ? pick(etat.gestesCamera.find((g) => g.id === m.geste)!.nom, lang) : ""}</span>
              <span className="mt-1 text-xs text-warn">{pick(m.garde, lang)}</span>
              <span className="mt-2 text-xs font-medium">{m.prix ?? t("Pas encore ouvert", "Not open yet")}</span>
              <div className="mt-auto pt-2">
                {m.gratuit ? <Button size="sm" variant="secondary" className={BOUTON_CARTE} onClick={() => setAvantApres(true)} data-atelier-avant-apres>{t("Choisir mes deux photos", "Choose my two photos")}</Button>
                  : ferme || !m.prix ? <Button size="sm" variant="secondary" className={BOUTON_CARTE} disabled>{t("Utiliser ce modèle", "Use this template")}</Button>
                  : <a className="inline-flex min-h-9 w-full items-center justify-center rounded-full bg-ink px-3 py-1.5 text-center text-sm leading-tight text-paper" href={lien(m)} data-atelier-video-go={m.id}>{t("Utiliser ce modèle", "Use this template")}</a>}
              </div>
            </div>
          );
        })}
      </div>
      {services && <p className="mt-2 text-xs text-muted">{t("Pour une entreprise de services, les vidéos montrent ton métier et tes réalisations, jamais une personne inventée.", "For a service business, videos show your trade and your work, never an invented person.")}</p>}
      <AvantApres open={avantApres} onClose={() => setAvantApres(false)} />
    </Card>
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
    <Modal open={open} onClose={onClose} title={t("L'avant et l'après", "Before and after")} wide>
      <div className="grid gap-4">
        <p className="text-sm text-muted">{t("Deux de tes vraies photos, l'avant puis l'après. Je n'invente jamais l'après. Gratuit.", "Two of your real photos, before then after. I never invent the after. Free.")}</p>
        <div className="grid grid-cols-2 gap-3">
          {(["avant", "apres"] as const).map((k) => {
            const a = k === "avant" ? avant : apres;
            return <button key={k} type="button" onClick={() => setPicker(k)} className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-dashed border-line">{a ? <img src={a.thumbUrl ?? a.url} alt={a.name} className="h-full w-full object-cover" /> : <span className="text-sm">{k === "avant" ? t("Photo d'avant", "Before photo") : t("Photo d'après", "After photo")}</span>}</button>;
          })}
        </div>
        <div className="flex justify-end"><Button loading={busy} disabled={!avant || !apres || busy} onClick={go}>{t("Monter mes deux photos (gratuit)", "Put my two photos together (free)")}</Button></div>
      </div>
      <MediaPicker open={!!picker} onClose={() => setPicker(null)} kinds={["image"]} title={t("Choisis une de tes photos", "Choose one of your photos")} onPick={(sel) => { if (picker === "avant") setAvant(sel[0] ?? null); else setApres(sel[0] ?? null); setPicker(null); }} />
    </Modal>
  );
}

const USAGES: Record<string, T2> = { post: ["dans une publication", "in a post"], campaign: ["dans une publicité", "in an ad"], theme_section: ["sur ton site", "on your site"], video: ["dans une vidéo", "in a video"], brand: ["dans ta marque", "in your brand"] };

function CreationsCard({ etat, projectId }: { etat: Etat; projectId: string }) {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const [pose, setPose] = useState<string | null>(null);
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
  const liste = filtre === "dorment" ? etat.creations.filter((c) => c.status === "ok" && !c.servie) : etat.creations;
  const STATUT: Record<Creation["status"], T2> = { ok: ["Réussie", "Successful"], rate: ["Ratée : je te le dis, elle n'est pas comptée si l'outil s'est trompé", "Failed: I'm telling you, it isn't charged if the tool got it wrong"], produit_modifie: ["Ton produit a changé : gardée à part, elle ne part pas vers ta boutique", "Your product changed: kept aside, it won't go to your shop"] };
  return (
    <Card className="p-5" data-atelier-creations>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{t("Mes créations", "My creations")}</h3>
        <div className="flex gap-1.5" role="radiogroup">
          {(["toutes", "dorment"] as const).map((f) => <button key={f} type="button" role="radio" aria-checked={filtre === f} onClick={() => setFiltre(f)} className={cx("rounded-full border px-3 py-1 text-xs", filtre === f ? "border-ink bg-ink text-paper" : "border-line")}>{f === "toutes" ? t("Toutes", "All") : t(`Pas encore servies (${etat.nonServies.n})`, `Not used yet (${etat.nonServies.n})`)}</button>)}
        </div>
      </div>
      {!liste.length ? <Empty title={t("Rien ici pour l'instant", "Nothing here yet")} icon={<ImagePlus className="size-5" />}>{t("Ce que tu crées dans l'atelier arrive ici, avec l'outil, la date et ce que ça a pris sur ton budget.", "What you create in the workshop lands here, with the tool, the date and what it took from your budget.")}</Empty> : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {liste.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-line bg-card" data-atelier-creation={c.id}>
              {c.url ? c.kind === "video" ? <video src={c.url} poster={c.thumbUrl ?? undefined} preload="metadata" className="aspect-square w-full object-cover" muted playsInline controls /> : <img src={c.thumbUrl ?? c.url} alt="" className="aspect-square w-full object-cover" loading="lazy" /> : <div className="grid aspect-square place-items-center text-xs text-muted">{t("Aucune image retenue", "No image kept")}</div>}
              <div className="grid gap-1 p-2.5 text-xs">
                <span className={cx("font-medium", c.status !== "ok" && "text-warn")}>{pick(STATUT[c.status], lang)}</span>
                <span className="text-muted">{c.outil} · {new Date(c.at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR")} · {c.cout}</span>
                <span>{c.servie ? `${t("A servi", "Used")} ${c.usages.map((u) => pick(USAGES[u] ?? [u, u], lang)).join(", ")}` : t("Pas encore servie", "Not used yet")}</span>
                {c.status === "ok" && !c.servie && c.assetId && (
                  <span className="flex flex-wrap gap-2 pt-1">
                    <button type="button" className="underline disabled:opacity-50" disabled={!!pose} onClick={() => void poser(c, "publication")} data-atelier-poser="publication">{t("Une publication", "A post")}</button>
                    {c.kind === "image" && <button type="button" className="underline disabled:opacity-50" disabled={!!pose} onClick={() => void poser(c, "publicite")} data-atelier-poser="publicite">{t("Une publicité", "An ad")}</button>}
                    {c.kind === "image" && <a className="underline" href={`/studio/${projectId}/boutique?poser=${encodeURIComponent(c.id)}`} data-atelier-poser="site">{t("Mon site", "My site")}</a>}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
