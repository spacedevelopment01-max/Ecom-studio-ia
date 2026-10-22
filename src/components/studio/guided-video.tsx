"use client";
import {CommunicationAngleSelector,useCommunicationAngle} from "./communication-angle";
/**
 * Vidéo guidée (Publications › Publication vidéo, Publicités › Publicité vidéo) : le client choisit le produit ou le
 * service, décrit son idée (avec les idées de prompts), puis le format, la durée totale et le nombre de scènes.
 * Produit et service : clips IA directs ou référence facultative, étapes supplémentaires explicites. Montage du studio (titres, logo, musique). Prix affiché avant, rien ne part sans le clic du client.
 */
import { useEffect, useRef, useState } from "react";
import { Clapperboard, Download, Pencil, Wand2 } from "lucide-react";
import { api, Button, Card, cx, useApi, useToast } from "../ui";
import { useLang, useT } from "../i18n";
import { useProject } from "./project-context";
import { JobProgress, SectionTitle, useActive,MediaPicker } from "./common";
import { useBudgetPct } from "../billing-client";
import { SubjectPicker, subjectChoice, type SubjectView } from "./subject-picker";
import { MusicChoice } from "./music-choice";
import type { ThreeScenesRequest } from "@/lib/video-v2/three-scenes";
import { VideoDocModal } from "./video-v2-panel";

type Quote = { suggestedScenario?:NonNullable<Quote["scenario"]>; capMicro?:number;initialImagesRequired?:boolean;generation?:"direct"|"reference"|"staged"; request?:ThreeScenesRequest; steps?:{id:string;count:number}[]; scriptMicro?:number;scenarioJobId?:string; approvalToken?:string;scenario?:{scenes:{title:string;voice?:string;intent?:string;still:string;motion:string}[];line?:string;voiceEnd?:string;cta:string}; mode: "ai" | "stock"; allowed: boolean; reason: string | null; estimateMicro: number; scenes: number; totalS: number; clipS: number };
type VideoItem = { id: string; docKey: string | null; url: string; aspect: string | null; durationS: number | null; as: "post" | "ad"; mode: string | null; subject: string | null; request: string | null; reviewRequired: boolean; warnings: string[]; at: number };
type Data = { scenarios:Quote[]; drafts:{purpose?:string;initialSlot?:string;generation?:string;id:string;docKey?:string|null;error:string;scenes:number;as:"ad"|"post";used:boolean;retakeMicro:number}[]; voiceAvailable:boolean; voice:{voice?:"on"|"off";voiceId?:string;voiceConsent?:string}; videos: VideoItem[]; ai: boolean; subjects: SubjectView[]; limits: { scenes: [number, number]; totalS: [number, number] } };
const ASPECTS = [
  { v: "9:16", fr: "Vertical 9:16 (Reels, TikTok, Stories)", en: "Vertical 9:16 (Reels, TikTok, Stories)" },
  { v: "4:5", fr: "Portrait 4:5 (fil d'actualité)", en: "Portrait 4:5 (feed)" },
  { v: "1:1", fr: "Carré 1:1", en: "Square 1:1" },
  { v: "16:9", fr: "Paysage 16:9 (YouTube, site)", en: "Landscape 16:9 (YouTube, website)" },
] as const;
const DURATIONS = [10, 15, 20, 30, 45, 60];

export function GuidedVideo({ as,initialSlot }: { as: "post" | "ad";initialSlot?:string }) {
  const { id,data:project } = useProject();
  const t = useT();
  const { lang } = useLang();
  const budget = useBudgetPct();
  const toast = useToast();
  const { data, reload } = useApi<Data>(`/api/projects/${id}/creative/video`,{poll:4000});
  const jobs = useActive(["video.scenario","video.scenes", "video.v2.render"]);
  const [editing, setEditing] = useState<string | null>(null);
  const reformat = async (docKey: string, to: string) => {
    try {
      await api(`/api/projects/${id}/videos/v2/${encodeURIComponent(docKey)}`, { body: { action: "reformat", aspect: to } });
      toast("ok", t(`Copie au format ${to} en préparation (gratuit) : elle apparaît ici dès qu'elle est prête.`, `${to} copy being prepared (free): it appears here as soon as it's ready.`));
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const subjects = data?.subjects ?? [];
  const [subjectKey, setSubjectKey] = useState("");
  const [request, setRequest] = useState(initialSlot?"Préparer une vidéo d’ambiance pour ce projet, à partir de son activité et de son identité validées. Illustration, sans voix ni texte commercial.":"");
  const [angleId,setAngleId]=useCommunicationAngle();
  const [generation,setGeneration]=useState<"direct"|"reference"|"staged">("direct");
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]["v"]>(initialSlot?"16:9":"9:16");
  const [totalS, setTotalS] = useState(15);
  const [scenes, setScenes] = useState(3);
  const [music, setMusic] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [sceneImages,setSceneImages]=useState<({assetId:string;use:"reuse"|"reference"}|null)[]>([]);
  const [imageScene,setImageScene]=useState<number|null>(null);
  const [repairScene,setRepairScene]=useState<Record<string,number>>({});
  const [scenario,setScenario]=useState<Quote|null>(null);
  const [busy, setBusy] = useState(false);
  const [correction,setCorrection]=useState("");
  useEffect(() => {
    if (!subjectKey && subjects[0]) setSubjectKey(subjects[0].key);
  }, [subjects, subjectKey]);
  const subject = subjectChoice(subjects.find((s) => s.key === subjectKey) ?? subjects[0]);
  const quoteContext=useRef("");
  const draftKey=`ecs-video-draft:${id}:${initialSlot??as}`;
  const hydrated=useRef(false);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(draftKey)??"null");if(saved){setGeneration(saved.generation);setSubjectKey(saved.subjectKey);setAspect(saved.aspect);setTotalS(saved.totalS);setScenes(saved.scenes);setRequest(saved.request);setMusic(saved.music);setSceneImages(saved.sceneImages??[]);quoteContext.current=saved.context;setScenario(saved.scenario);}}catch{}hydrated.current=true;},[draftKey]);
  useEffect(()=>{if(!hydrated.current)return;localStorage.setItem(draftKey,JSON.stringify({generation,subjectKey,aspect,totalS,scenes,request,music,sceneImages,context:quoteContext.current,scenario}));},[draftKey,generation,subjectKey,aspect,totalS,scenes,request,music,sceneImages,scenario]);
  // Prix recalculé à chaque réglage (format, durée, scènes, produit ou service).
  useEffect(() => {
    if (!subjects.length) return;
    let off = false;
    setQuote(null);
    const context=JSON.stringify([angleId,id,as,generation,initialSlot,subjectKey,aspect,totalS,scenes,request,music,data?.voice.voiceId,data?.voice.voice,sceneImages]);
    if(quoteContext.current!==context) {
      const previous=(()=>{try{return JSON.parse(quoteContext.current)}catch{return []}})();
      if(JSON.stringify(previous.slice(0,-1))===JSON.stringify(JSON.parse(context).slice(0,-1)))setScenario(old=>old?{...old,approvalToken:undefined}:old);else setScenario(null);
    }

    quoteContext.current=context;
    api<Quote>(`/api/projects/${id}/creative/video`, { body: { action: "quote",angleId,generation,purpose:initialSlot?"site":undefined,initialSlot, as, subject, aspect, totalS, scenes,request,music,sceneImages } })
      .then((q) => {if(off)return;setQuote(q);if(initialSlot&&q.suggestedScenario)setScenario(old=>old??{...q,scenario:q.suggestedScenario});})
      .catch(() => !off && setQuote(null));
    return () => {
      off = true;
    };
  }, [angleId,id, as,generation,initialSlot, subjectKey, aspect, totalS, scenes, subjects.length,request,music,data?.voice.voiceId,data?.voice.voice,JSON.stringify(sceneImages)]); // eslint-disable-line react-hooks/exhaustive-deps
  const running = jobs.length > 0;
  const was = useRef(running);
  useEffect(() => {
    if (was.current && !running) reload();
    was.current = running;
  }, [running, reload]);
  useEffect(()=>{if(!scenario?.scenarioJobId || scenario.scenario)return;const ready=data?.scenarios?.find(s=>s.scenarioJobId===scenario.scenarioJobId);if(ready)setScenario(ready);},[data?.scenarios,scenario?.scenarioJobId,scenario?.scenario]);
  const create = async () => {
    if (!quote?.allowed) return;
    setBusy(true);
    try {
      if(!scenario?.approvalToken) {setScenario(await api<Quote>(`/api/projects/${id}/creative/video`,{body:{scenarioJobId:scenario?.scenarioJobId,approvedScriptMicro:quote.scriptMicro??0,draftPlan:scenario?.scenario,action:"plan",angleId,generation,purpose:initialSlot?"site":undefined,initialSlot,as,subject,request:request.trim()||undefined,aspect,totalS,scenes,music,sceneImages}}));return;}
      await api(`/api/projects/${id}/creative/video`, { body: { approvalToken:scenario.approvalToken, action: "create",angleId,generation,purpose:initialSlot?"site":undefined,initialSlot, as, subject, request: request.trim() || undefined, aspect, totalS, scenes, music,sceneImages, approvedEstimateMicro: quote.estimateMicro } });
      toast("ok", t("Vidéo en préparation : elle apparaît ici dès qu'elle est prête.", "Video being prepared: it appears here as soon as it's ready."));
    } catch (e) {
      setScenario(old=>old?{...old,approvalToken:undefined}:old);
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const videos = (data?.videos ?? []).filter((v) => v.as === as && (initialSlot ? (v as VideoItem & {initialSlot?:string}).initialSlot===initialSlot : !(v as VideoItem & {purpose?:string}).purpose));
  const perScene = Math.round((totalS / scenes) * 10) / 10;
  return (
    <section className="mb-8" data-guided-video={initialSlot?"site":as}>
      {!initialSlot&&<CommunicationAngleSelector value={angleId} onChange={setAngleId}/>}
      <MediaPicker open={imageScene!==null} onClose={()=>setImageScene(null)} kinds={["image"]} onPick={assets=>{if(imageScene===null||!assets[0])return;const index=imageScene;setSceneImages(old=>Array.from({length:scenes},(_,k)=>index===-1||k===index?{assetId:assets[0].id,use:"reuse"}:old[k]??null));setImageScene(null);}} />
      <SectionTitle title={initialSlot?t("Vidéo d’ambiance du projet","Project mood video"):as === "ad" ? t("Publicité vidéo guidée", "Guided video ad") : t("Publication vidéo guidée", "Guided video post")}>
        {t("Choisissez le produit ou le service, décrivez votre idée, puis le format, la durée et le nombre de scènes. Clips IA directs pour produits et services ; une référence peut être fournie. Les scènes imaginées restent des illustrations.", "Pick the product or service, describe your idea, then the format, length and number of scenes. Direct AI clips for products and services; a reference may be supplied. Imagined scenes remain illustrations.")}
      </SectionTitle>
      {(data?.drafts??[]).filter(d=>d.as===as&&(initialSlot?d.initialSlot===initialSlot:!d.purpose)).map(d=><Card key={d.id} className="mb-4 grid gap-3 p-4" data-video-incomplete><p className="font-medium">{t("Vidéo incomplète — acquis conservés","Incomplete video — obtained media preserved")}</p><p className="text-sm">{d.error}</p>{d.docKey?<Button variant="secondary" disabled={running} data-video-resume-render={d.docKey} onClick={()=>setEditing(d.docKey!)}>{t("Reprendre le montage conservé (gratuit)","Resume the saved edit (free)")}</Button>:!d.used&&<div className="flex flex-wrap gap-3"><select aria-label={t("Scène à reprendre","Scene to repair")} value={repairScene[d.id]??0} onChange={e=>setRepairScene(old=>({...old,[d.id]:Number(e.target.value)}))}>{Array.from({length:d.scenes},(_,k)=><option value={k} key={k}>{t("Scène","Scene")} {k+1}</option>)}</select><Button variant="secondary" onClick={async()=>{try {await api(`/api/projects/${id}/creative/video`,{body:{action:"repair",jobId:d.id,index:repairScene[d.id]??0,kind:d.generation&&d.generation!=="staged"?"clip":"image"}});reload();}catch(e){toast("bad",(e as Error).message);}}}>{t("Reprendre cette scène uniquement","Repair only this scene")} · {budget.label(d.retakeMicro)}</Button></div>}</Card>)}
      {!scenario && (data?.scenarios??[]).filter(s=>s.request?.as===as&&(initialSlot?s.request?.initialSlot===initialSlot:!s.request?.purpose)).map(saved=><Card key={saved.approvalToken} className="mb-3 flex flex-wrap items-center justify-between gap-3 p-4" data-video-saved-scenario>
        <p className="text-sm">{saved.request?.request || saved.scenario?.scenes[0]?.title || t("Scénario préparé", "Prepared scenario")}</p>
        <Button variant="secondary" className="h-auto max-w-full whitespace-normal text-left" onClick={()=>{
          const r=saved.request!;const key=r.subject?.kind==="service"?r.subject.name:r.subject?.key??subjectKey;
          quoteContext.current=JSON.stringify([id,as,r.generation??"staged",initialSlot,key,r.aspect??"9:16",r.totalS??15,r.scenes??3,r.request??"",r.music!==false,data?.voice.voiceId,data?.voice.voice,r.sceneImages??[]]);
          setGeneration(r.generation??"staged");setSubjectKey(key);setRequest(r.request??"");setAspect(r.aspect??"9:16");setTotalS(r.totalS??15);setScenes(r.scenes??3);setMusic(r.music!==false);setSceneImages(r.sceneImages??[]);setScenario(saved);
        }}>{t("Reprendre ce scénario sans nouvelle rédaction", "Resume scenario without rewriting")}</Button>
      </Card>)}
      <Card className="grid min-w-0 gap-5 p-5">
        <label className="grid min-w-0 gap-2 text-sm">{t("Comment créer les clips ?","How should clips be created?")}<select data-video-generation className="w-full min-w-0 max-w-full rounded-xl border border-line p-2" value={generation} onChange={e=>{setGeneration(e.target.value as typeof generation);if(e.target.value==="direct")setSceneImages([]);}}><option value="direct">{t("Clips IA directs — sans image intermédiaire","Direct AI clips — no intermediate image")}</option><option value="reference">{t("Animer une photo de référence fournie","Animate a supplied reference photo")}</option><option value="staged">{t("Créer d’abord des images — coût supplémentaire","Create images first — additional cost")}</option></select></label>
        {generation==="reference"&&<Button variant="secondary" className="min-w-0 max-w-full py-2 text-left" style={{height:"auto",whiteSpace:"normal"}} data-video-reference onClick={()=>setImageScene(-1)}>{t("Choisir une photo pour les scènes (modifiable par scène)","Choose a photo for the scenes (editable per scene)")}</Button>}
        {jobs[0] && <JobProgress job={jobs[0]} />}
        <SubjectPicker subjects={subjects} value={subjectKey} onChange={setSubjectKey} request={request} onRequest={setRequest} idPrefix={`video-${as}`} video photoOptional surface={as === "ad" ? "ad_video" : "post_video"} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("Format", "Format")}</p>
            <div className="grid gap-1.5" role="radiogroup" aria-label={t("Format", "Format")}>
              {ASPECTS.map((a) => (
                <button key={a.v} type="button" role="radio" aria-checked={aspect === a.v} onClick={() => setAspect(a.v)} className={cx("rounded-xl border px-3 py-1.5 text-left text-sm", aspect === a.v ? "border-ink bg-paper-2" : "border-line")} data-video-aspect={a.v}>
                  {t(a.fr, a.en)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("Durée totale", "Total length")}</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("Durée totale", "Total length")}>
              {DURATIONS.map((d) => (
                <button key={d} type="button" role="radio" aria-checked={totalS === d} onClick={() => setTotalS(d)} className={cx("rounded-full border px-3 py-1.5 text-sm", totalS === d ? "border-ink bg-ink text-paper" : "border-line")} data-video-duration={d}>
                  {d} s
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("Nombre de scènes", "Number of scenes")}</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("Nombre de scènes", "Number of scenes")}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={scenes === n} onClick={() => setScenes(n)} className={cx("size-9 rounded-full border text-sm", scenes === n ? "border-ink bg-ink text-paper" : "border-line")} data-video-scenes={n}>
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t(`≈ ${perScene} s par scène ; logo et conclusion sur le dernier plan.`, `≈ ${perScene} s per scene; logo and closing message on the last clip.`)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium">{t("Musique", "Music")}</p>
          <MusicChoice value={music} onChange={setMusic} />
          <p className="text-xs text-muted">{music ? t("Morceau composé par le studio dans le style de votre marque (droits inclus).", "Track composed by the studio in your brand's style (rights included).") : t("Vidéo sans musique.", "Video without music.")}</p>
        </div>
        {!initialSlot&&<label className="flex flex-wrap items-center gap-3 text-sm">
          {t("Voix du projet", "Project voice")}
          <select data-video-voice value={data?.voice.voice === "on" ? data?.voice.voiceId??"off" : "off"} onChange={async e=>{const value=e.target.value;try {await api(`/api/projects/${id}/videos/creative-memory`,{method:"PATCH",body:value==="off"?{voice:"off"}:{voice:"on",voiceId:value,voiceConsent:"synthetic"}});reload();}catch(error){toast("bad",(error as Error).message);}}} className="rounded-lg border border-line bg-paper px-3 py-2">
            <option value="off">{t("Sans voix", "No voice")}</option>
            <option value="ff_siwis" disabled={!data?.voiceAvailable}>{t("Voix française de synthèse autorisée", "Authorized French synthetic voice")}</option>
          </select>
          <span className="text-xs text-muted">{data?.voiceAvailable?t("Choix enregistré pour ce projet. Sous-titres calés par phrase, pas mot à mot.","Saved for this project. Phrase-level subtitle timing, not word alignment."):t("Modèle vocal non installé sur ce serveur.","Voice model is not installed on this server.")}</span>
        </label>}
        {!initialSlot&&as==="ad"&&project?.business==="services"&&<p className="text-sm" data-video-contact>{t("Coordonnées ajoutées au montage : ","Contact details added in the edit: ")}{[project.services.phone,project.services.email].filter(Boolean).join(" · ")||t("Aucune fournie : aucun contact inventé.","None supplied: no invented contact.")}</p>}
        {initialSlot&&<p className="text-sm">{t("Proposition locale gratuite issue du projet. Modifiez-la puis validez le scénario exact et son enveloppe avant les clips. Ambiance du site : sans voix ni texte superposé.","Free local proposal based on the project. Edit and approve the exact scenario and budget before clips. Website mood video: no voice or text overlays.")}</p>}
        {scenario?.scenario && <div data-video-scenario className="rounded-xl border border-line p-4 text-sm"><p className="font-medium">{t("Scénario à vérifier avant lancement", "Review the scenario before starting")}</p><label className="mt-2 grid gap-2">{t("Une correction simple ?","A simple correction?")}<input data-video-correction value={correction} onChange={e=>setCorrection(e.target.value)} placeholder={t("Plus dynamique, plutôt ma prestation…","More dynamic, focus on my service…")} className="w-full rounded border border-line p-2"/></label><Button variant="secondary" disabled={!correction.trim()} onClick={async()=>{try{const r=await api<Quote>(`/api/projects/${id}/creative/video`,{body:{action:"refine",angleId,as,generation,purpose:initialSlot?"site":undefined,initialSlot,draftPlan:scenario.scenario,instruction:correction}});setScenario(old=>old?{...old,scenario:r.scenario,approvalToken:undefined}:old);setCorrection("");}catch(e){toast("bad",(e as Error).message);}}}>{t("Appliquer au scénario (gratuit)","Apply to scenario (free)")}</Button><ol className="mt-2 list-decimal space-y-2 pl-5">{scenario.scenario.scenes.map((s,k)=><li key={k}>{quote?.mode==="ai"&&generation!=="direct"&&<><Button size="sm" variant="secondary" onClick={()=>setImageScene(k)}>{sceneImages[k]?t("Changer la photo fournie","Change supplied photo"):t("Utiliser une photo de Mes images","Use a photo from My images")}</Button>{sceneImages[k]&&<button type="button" className="ml-2 underline" onClick={()=>setSceneImages(old=>old.map((s,i)=>i===k?null:s))}>{t("Retirer cette photo","Remove this photo")}</button>}</>}<p className="my-2">{s.intent}</p><label>{t("Ce que montre le plan","What the shot shows")}<textarea value={s.still} className="my-1 block w-full rounded border border-line p-2" onChange={e=>setScenario(old=>old?.scenario?{...old,approvalToken:undefined,scenario:{...old.scenario,scenes:old.scenario.scenes.map((sc,i)=>i===k?{...sc,still:e.target.value}:sc)}}:old)}/></label><label>{t("Mouvement","Movement")}<input value={s.motion} className="my-1 block w-full rounded border border-line p-2" onChange={e=>setScenario(old=>old?.scenario?{...old,approvalToken:undefined,scenario:{...old.scenario,scenes:old.scenario.scenes.map((sc,i)=>i===k?{...sc,motion:e.target.value}:sc)}}:old)}/></label>{!initialSlot&&<><label>{t("Titre", "Title")}<input data-video-scene-title={k} maxLength={40} value={s.title} className="my-1 block w-full rounded border border-line bg-paper px-2 py-1" onChange={e=>setScenario(old=>old?.scenario?{...old,approvalToken:undefined,scenario:{...old.scenario,scenes:old.scenario.scenes.map((sc,i)=>i===k?{...sc,title:e.target.value}:sc)}}:old)}/></label><label>{t("Voix", "Voice")}<textarea data-video-scene-voice={k} maxLength={200} value={s.voice??""} className="my-1 block w-full rounded border border-line bg-paper px-2 py-1" onChange={e=>setScenario(old=>old?.scenario?{...old,approvalToken:undefined,scenario:{...old.scenario,scenes:old.scenario.scenes.map((sc,i)=>i===k?{...sc,voice:e.target.value}:sc)}}:old)}/></label></>}</li>)}</ol>{!initialSlot&&<div className="mt-3 grid gap-2">{([['line',t('Signature','Tagline')],['cta',t('Conclusion / action (facultative)','Closing / action (optional)')],['voiceEnd',t('Voix finale','Closing voice')]] as const).map(([field,label])=><label key={field}>{label}<input data-video-plan-field={field} value={scenario.scenario?.[field]??''} className="block w-full rounded border border-line p-2" onChange={e=>setScenario(old=>old?.scenario?{...old,approvalToken:undefined,scenario:{...old.scenario,[field]:e.target.value}}:old)}/></label>)}</div>}</div>}
        <div className="flex min-w-0 flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between" data-video-price>
          <p className="text-sm">
            {!quote ? t("Calcul du prix…", "Calculating the price…") : !quote.allowed ? <span className="text-warn">{quote.reason}</span> : quote.estimateMicro === 0 ? <span className="font-medium text-ok">{t("Gratuit : plans libres de droits de votre métier, montés par le studio.", "Free: royalty-free footage of your trade, edited by the studio.")}</span> : t(<>Coût probable : <strong>{budget.label(quote.estimateMicro)}</strong> ({quote.mode === "ai" ? `${quote.steps?.find(s=>s.id==="reference_images")?.count??0} image(s) + ${quote.scenes} clips IA` : "contrôle des plans"}). Une reprise éventuelle est décomptée et annoncée.</>, <>Likely cost: <strong>{budget.label(quote.estimateMicro)}</strong> ({quote.mode === "ai" ? `${quote.steps?.find(s=>s.id==="reference_images")?.count??0} image(s) + ${quote.scenes} AI clips` : "shot checks"}). Any redo is counted and announced.</>)}
          </p>
          {quote?.allowed&&quote.capMicro!=null&&quote.capMicro>0&&<p className="text-sm" data-video-cap>{t("Plafond maximal de cet accord, marge de réservation et une reprise ciblée incluses : ","Maximum for this approval, including reservation margin and one targeted retake: ")}{budget.label(quote.capMicro)}. {t("Une reprise n’est lancée qu’à votre demande.","A retake starts only at your request.")}</p>}
          <Button className="min-w-0 max-w-full py-2 text-center [&>svg]:shrink-0" style={{whiteSpace:"normal",height:"auto"}} onClick={create} loading={busy} disabled={busy || running || !quote?.allowed || !subjects.length} icon={<Wand2 className="size-4" />} data-guided-video-submit>
            <span className="min-w-0">{scenario?.approvalToken?t("Valider et créer la vidéo","Approve and create video"):t("Préparer le scénario","Prepare scenario")}{!scenario?.approvalToken && (quote?.scriptMicro??0)>0?` · ${t("rédaction","script")} ${budget.label(quote!.scriptMicro!)}`:""}
            {quote?.allowed && quote.estimateMicro > 0 ? ` · ${budget.label(quote.estimateMicro)}` : ""}</span>
          </Button>
        </div>
      </Card>
      {videos.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-guided-videos>
          {videos.map((v) => (
            <Card key={v.id} className="overflow-hidden p-0">
              <video src={v.url} controls playsInline preload="metadata" className="w-full bg-ink" style={{ aspectRatio: (v.aspect ?? "9:16").replace(":", " / ") }} />
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="truncate text-xs text-muted" title={v.request ?? ""}>
                  <Clapperboard className="mr-1 inline size-3.5" />
                  {v.subject ?? "—"} · {v.aspect} · {v.durationS ? `${Math.round(v.durationS)} s` : ""}
                </p>
                <a href={`${v.url}?download=1`} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-2 hover:bg-paper-2" download>
                  <Download className="size-3.5" /> MP4
                </a>
              </div>
              {v.reviewRequired && (
                <details className="border-t border-line px-3 py-2 text-xs text-muted" data-video-review>
                  <summary className="cursor-pointer font-medium text-warn">{t("Vidéo rendue — à vérifier", "Video rendered — review required")}</summary>
                  <p className="mt-2">{t("Le fichier est disponible. Le rendu ne prouve pas le respect de toutes vos demandes.", "The file is available. Rendering does not establish that every requirement was met.")}</p>
                  {v.warnings.length > 0 && <ul className="mt-2 grid list-disc gap-1 pl-4">{v.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>}
                </details>
              )}
              {v.docKey && (
                <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2" data-guided-video-actions>
                  <button type="button" onClick={() => setEditing(v.docKey)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-2 hover:bg-paper-2" data-guided-video-edit>
                    <Pencil className="size-3.5" /> {t("Modifier", "Edit")}
                  </button>
                  <select aria-label={t("Dupliquer dans un autre format", "Duplicate in another format")} value="" disabled={running} onChange={(e) => e.target.value && reformat(v.docKey!, e.target.value)} className="h-8 rounded-full border border-line bg-paper px-2 text-xs" data-guided-video-reformat>
                    <option value="">{t("Autre format…", "Other format…")}</option>
                    {ASPECTS.filter((a) => a.v !== v.aspect).map((a) => (
                      <option key={a.v} value={a.v}>{t(a.fr, a.en)}</option>
                    ))}
                  </select>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <VideoDocModal
          docKey={editing}
          onClose={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </section>
  );
}
