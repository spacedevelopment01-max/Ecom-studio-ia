"use client";
/**
 * Vidéo UGC générée par IA : réglages, script relu et modifiable, puis génération.
 * La personne est générée : elle présente le produit, la mention « Vidéo générée par IA » est incrustée.
 */
import { useEffect, useRef, useState } from "react";
import { Clapperboard, Minus, Plus, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { api, Button, cx, Field, Input, Select, Textarea, useToast } from "../ui";
import { useProject } from "./project-context";
import { useCostConfirm } from "./cost-confirm";
import { useBilling, useCreationLocked } from "../billing-client";
import { ugcIssues, type UgcScriptLike } from "@/lib/ugc-rules";
import { useLang, useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";

type Options = { format: "9:16" | "16:9"; beats: number; presenter: string; age: string; setting: string; tone: string; angle: string; url: string; brief: string };

const DEFAULTS: Options = { format: "9:16", beats: 3, presenter: "auto", age: "25-35", setting: "salon", tone: "naturel", angle: "presentation", url: "", brief: "" };

export function UgcPanel() {
  const { id, data } = useProject();
  const toast = useToast();
  const t = useT();
  const { lang } = useLang();
  const cl = useContentLang();
  const [o, setO] = useState<Options>(DEFAULTS);
  const [script, setScript] = useState<UgcScriptLike | null>(null);
  const [writing, setWriting] = useState(false);
  const [sending, setSending] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const cost = useCostConfirm();
  // Vidéo UGC : incluse dans certains forfaits (quota mensuel) ou ajoutée par un pack. Jamais de crédits affichés.
  const { billing } = useBilling();
  const locked = useCreationLocked();
  const noCredits = !!data?.ai.ugc && !!billing && (!billing.plan || billing.quotas.ugc.included + billing.quotas.ugc.rollover + billing.quotas.ugc.pack === 0);
  const ugc = !!data?.ai.ugc && !noCredits;
  const voice = !!data?.ai.ugcVoice;
  // Entreprise de services : « présentation face caméra » de l'activité, sans produit en main.
  const services = data?.business === "services";
  useEffect(() => {
    if (services) setO((x) => (x.setting === "salon" && x.angle === "presentation" ? { ...x, setting: "activite" } : x));
  }, [services]);
  useEffect(() => () => void (poll.current && clearInterval(poll.current)), []);

  const set = <K extends keyof Options>(k: K, v: Options[K]) => setO((x) => ({ ...x, [k]: v }));
  const payload = () => ({ ...o, url: o.url.trim() || undefined, brief: o.brief.trim() || undefined });

  const write = async () => {
    setWriting(true);
    try {
      const { jobId } = await api<{ jobId: string }>(`/api/projects/${id}/ugc/script`, { body: payload(), lang: cl.lang });
      poll.current = setInterval(async () => {
        try {
          const { job } = await api<{ job: { status: string; result: any; error: string | null } }>(`/api/jobs/${jobId}`);
          if (job.status === "done" || job.status === "failed" || job.status === "cancelled") {
            clearInterval(poll.current!);
            setWriting(false);
            if (job.status === "done" && job.result?.script) setScript(job.result.script);
            else toast("bad", job.error ?? t("Le script n'a pas pu être écrit.", "The script could not be written."));
          }
        } catch {}
      }, 1500);
    } catch (e) {
      setWriting(false);
      toast("bad", (e as Error).message);
    }
  };

  const generate = async () => {
    if (!script) return;
    if (!(await cost.confirm("ugc", { beats: script.beats.length, localOk: false }))) return;
    setSending(true);
    try {
      await api(`/api/projects/${id}/ugc`, { body: { options: { ...payload(), beats: script.beats.length }, script }, lang: cl.lang });
      toast("ok", t("Vidéo UGC en production : comptez quelques minutes par plan. Elle apparaîtra ici une fois montée.", "UGC video in production: allow a few minutes per shot. It will appear here once edited."));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const beat = (i: number, k: "line" | "caption" | "action", v: string) =>
    setScript((s) => s && { ...s, beats: s.beats.map((b, j) => (j === i ? { ...b, [k]: v, ...(k === "line" && b.caption === b.line ? { caption: v } : {}) } : b)) });
  const issues = script ? ugcIssues(script, cl.lang, lang) : [];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {cost.dialog}
      <p className="text-xs text-muted">{services ? t("Une personne générée par IA présente votre activité et vos prestations face caméra, à la troisième personne : elle ne se dit ni cliente, ni le professionnel. Vous relisez le script avant de lancer la génération.", "An AI-generated person presents your business and services to camera, in the third person: they never claim to be a customer or the professional. You review the script before starting generation.") : t("Une personne générée par IA présente votre produit réel face caméra, filmée comme au téléphone : décor, gestes, voix et sous-titres. Vous relisez le script avant de lancer la génération.", "An AI-generated person presents your real product to camera, filmed as if on a phone: setting, gestures, voice and subtitles. You review the script before starting generation.")}</p>
      {noCredits && (
        <p className="rounded-2xl border border-info/30 bg-info-soft p-3 text-xs text-info">
          {!billing?.plan
            ? t("Les vidéos UGC sont incluses dans les forfaits. Vous pouvez déjà écrire et préparer le script.", "UGC videos come with the plans. You can already write and prepare the script.")
            : t("Les vidéos UGC ne sont pas incluses dans votre forfait : ajoutez un pack UGC ou changez de forfait. Vous pouvez déjà écrire et préparer le script.", "UGC videos aren't included in your plan: add a UGC pack or change plan. You can already write and prepare the script.")}{" "}
          <a href={billing?.plan ? "/studio/compte?pack=ugc#packs" : "/studio/compte#forfaits"} className="font-semibold underline">{billing?.plan ? t("Ajouter un pack", "Add a pack") : t("Choisir un forfait", "Choose a plan")}</a>
        </p>
      )}
      {!ugc && !noCredits && (
        <p className="rounded-2xl border border-warn/30 bg-warn-soft p-3 text-xs text-warn">
          {t("La génération UGC demande un fournisseur d'images (Google Gemini ou OpenAI) et un fournisseur vidéo (Google Veo ou fal.ai), activés par l'administration. Vous pouvez déjà écrire et préparer le script.", "UGC generation requires an image provider (Google Gemini or OpenAI) and a video provider (Google Veo or fal.ai), enabled by the administrator. You can already write and prepare the script.")}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Format", "Format")} htmlFor="ufmt">
          <Select id="ufmt" value={o.format} onChange={(e) => set("format", e.target.value as Options["format"])}>
            <option value="9:16">{t("9:16 vertical", "9:16 vertical")}</option>
            <option value="16:9">{t("16:9 horizontal", "16:9 horizontal")}</option>
          </Select>
        </Field>
        <Field label={t("Durée", "Length")} htmlFor="ubeats">
          <Select id="ubeats" value={o.beats} onChange={(e) => set("beats", Number(e.target.value))}>
            {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n * 8 + 3} s · {n} {t("plans", "shots")}</option>)}
          </Select>
        </Field>
        <Field label={t("Personne", "Presenter")} htmlFor="upres">
          <Select id="upres" value={o.presenter} onChange={(e) => set("presenter", e.target.value)}>
            <option value="auto">{t("Selon votre cible", "Based on your audience")}</option>
            <option value="femme">{t("Une femme", "A woman")}</option>
            <option value="homme">{t("Un homme", "A man")}</option>
          </Select>
        </Field>
        <Field label={t("Âge", "Age")} htmlFor="uage">
          <Select id="uage" value={o.age} onChange={(e) => set("age", e.target.value)}>
            <option value="18-25">{t("18 à 25 ans", "18 to 25")}</option>
            <option value="25-35">{t("25 à 35 ans", "25 to 35")}</option>
            <option value="35-50">{t("35 à 50 ans", "35 to 50")}</option>
            <option value="50+">{t("Plus de 50 ans", "Over 50")}</option>
          </Select>
        </Field>
        <Field label={t("Décor", "Setting")} htmlFor="uset">
          <Select id="uset" value={o.setting} onChange={(e) => set("setting", e.target.value)}>
            {services && <option value="activite">{t("Lieu typique de l'activité", "Typical place for the business")}</option>}
            <option value="salon">{t("Salon", "Living room")}</option>
            <option value="cuisine">{t("Cuisine", "Kitchen")}</option>
            <option value="salle-de-bain">{t("Salle de bain", "Bathroom")}</option>
            <option value="chambre">{t("Chambre", "Bedroom")}</option>
            <option value="bureau">{t("Bureau", "Office")}</option>
            <option value="exterieur">{t("Extérieur", "Outdoors")}</option>
            <option value="voiture">{t("Voiture", "Car")}</option>
          </Select>
        </Field>
        <Field label={t("Ton", "Tone")} htmlFor="utone">
          <Select id="utone" value={o.tone} onChange={(e) => set("tone", e.target.value)}>
            <option value="naturel">{t("Naturel", "Natural")}</option>
            <option value="enthousiaste">{t("Enthousiaste", "Enthusiastic")}</option>
            <option value="expert">{t("Posé, expert", "Calm, expert")}</option>
          </Select>
        </Field>
      </div>
      {!services && <Field label={t("Angle", "Angle")} htmlFor="uangle">
        <Select id="uangle" value={o.angle} onChange={(e) => set("angle", e.target.value)}>
          <option value="presentation">{t("Présentation face caméra", "Talking to camera")}</option>
          <option value="deballage">{t("Déballage", "Unboxing")}</option>
          <option value="demonstration">{t("Démonstration en situation", "In-context demo")}</option>
          <option value="probleme">{t("Situation du quotidien puis le produit", "Everyday situation, then the product")}</option>
        </Select>
      </Field>}
      <Field label={t("Consigne (facultatif)", "Instructions (optional)")} htmlFor="ubrief"><Input id="ubrief" value={o.brief} onChange={(e) => set("brief", e.target.value)} placeholder={services ? t("Ex. mettre en avant la première consultation", "E.g. highlight the first consultation") : t("Ex. insister sur le format nomade", "E.g. emphasize the portable size")} /></Field>
      <Field label={t("Adresse affichée à la fin (facultatif)", "Address shown at the end (optional)")} htmlFor="uurl"><Input id="uurl" value={o.url} onChange={(e) => set("url", e.target.value)} placeholder={t("ma-marque.fr", "my-brand.com")} /></Field>
      <ContentLangPicker {...cl} />
      <Button variant={script ? "secondary" : "primary"} onClick={write} loading={writing} icon={<Wand2 className="size-4" />}>{script ? t("Réécrire le script", "Rewrite the script") : t("Écrire le script", "Write the script")}</Button>

      {script && (
        <div className="grid gap-3 rounded-2xl border border-line bg-paper-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Script · {script.beats.length} {t("plan", "shot")}{script.beats.length > 1 ? "s" : ""}</p>
            <div className="flex gap-1">
              <button type="button" aria-label={t("Retirer un plan", "Remove a shot")} disabled={script.beats.length <= 1} onClick={() => setScript({ ...script, beats: script.beats.slice(0, -1) })} className="grid size-7 place-items-center rounded-full border border-line bg-card disabled:opacity-40"><Minus className="size-3.5" /></button>
              <button type="button" aria-label={t("Ajouter un plan", "Add a shot")} disabled={script.beats.length >= 5} onClick={() => setScript({ ...script, beats: [...script.beats, { line: "", caption: "", action: script.beats[script.beats.length - 1]?.action ?? (services ? "talks to the phone camera with a friendly gesture" : "holds the product toward the phone camera") }] })} className="grid size-7 place-items-center rounded-full border border-line bg-card disabled:opacity-40"><Plus className="size-3.5" /></button>
            </div>
          </div>
          {script.concept && <p className="text-xs text-muted">{script.concept}</p>}
          {script.beats.map((b, i) => {
            const words = b.line.trim().split(/\s+/).filter(Boolean).length;
            return (
              <div key={i} className="grid gap-1.5 rounded-xl border border-line bg-card p-2.5">
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span className="font-medium text-ink">{t("Plan", "Shot")} {i + 1} · 8 s</span>
                  <span className={cx(words > 22 && "text-bad")}>{words} {t("mots", "words")}</span>
                </div>
                <Textarea aria-label={t(`Réplique du plan ${i + 1}`, `Line for shot ${i + 1}`)} rows={3} value={b.line} onChange={(e) => beat(i, "line", e.target.value)} className="text-sm" />
                <Input aria-label={t(`Sous-titre du plan ${i + 1}`, `Caption for shot ${i + 1}`)} value={b.caption} onChange={(e) => beat(i, "caption", e.target.value)} placeholder={t("Sous-titre", "Caption")} className="text-xs" />
                <details className="text-[11px] text-muted">
                  <summary className="cursor-pointer">{t("Mise en scène", "Direction")}</summary>
                  <Input aria-label={t(`Mise en scène du plan ${i + 1}`, `Direction for shot ${i + 1}`)} value={b.action} onChange={(e) => beat(i, "action", e.target.value)} className="mt-1.5 text-xs" />
                </details>
              </div>
            );
          })}
          {issues.length > 0 && <ul className="grid gap-1 text-xs text-bad">{issues.map((x) => <li key={x}>{x}</li>)}</ul>}
          <p className="flex gap-2 text-[11px] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-signal" />
            {services ? t("La personne est générée par IA : elle présente l'activité sans faux témoignage, sans se dire cliente ni se faire passer pour vous, et la mention « Vidéo générée par IA » est incrustée. Pensez aussi à activer l'étiquette « contenu IA » en publiant.", "The person is AI-generated: they present the business with no fake testimonial, without claiming to be a customer or pretending to be you, and the \"AI-generated video\" label is burned in. Remember to also turn on the \"AI content\" label when posting.") : t("La personne est générée par IA : elle montre et présente le produit, sans faux témoignage, et la mention « Vidéo générée par IA » est incrustée, comme l'exigent les règles des réseaux sociaux. Pensez aussi à activer l'étiquette « contenu IA » en publiant.", "The person is AI-generated: they show and present the product, with no fake testimonial, and the \"AI-generated video\" label is burned in, as social network rules require. Remember to also turn on the \"AI content\" label when posting.")}
          </p>
          {ugc && !voice && <p className="text-[11px] text-warn">{t("Fournisseur vidéo sans voix (fal.ai) : la vidéo sera sous-titrée, sans voix. Google Veo ajoute la voix et le son.", "Video provider without voice (fal.ai): the video will be subtitled, with no voice. Google Veo adds voice and sound.")}</p>}
          <Button onClick={generate} loading={sending} disabled={locked || !ugc || issues.length > 0} icon={<Clapperboard className="size-4" />}>{services ? t("Générer la présentation", "Generate the presentation") : t("Générer la vidéo UGC", "Generate the UGC video")}</Button>
          <p className="flex items-center gap-1.5 text-[11px] text-muted"><Sparkles className="size-3" /> {t("Génération longue (quelques minutes par plan). Utilise 1 vidéo UGC de votre forfait.", "Long generation (a few minutes per shot). Uses 1 UGC video from your plan.")}</p>
        </div>
      )}
    </div>
  );
}
