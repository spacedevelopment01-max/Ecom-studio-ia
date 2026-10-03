"use client";
/**
 * Vidéo UGC générée par IA : réglages, script relu et modifiable, puis génération.
 * La personne est générée : elle présente le produit, la mention « Vidéo générée par IA » est incrustée.
 */
import { useEffect, useRef, useState } from "react";
import { Clapperboard, Minus, Plus, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { api, Button, cx, Field, Input, Select, Textarea, useToast } from "../ui";
import { useProject } from "./project-context";
import { ugcIssues, type UgcScriptLike } from "@/lib/ugc-rules";

type Options = { format: "9:16" | "16:9"; beats: number; presenter: string; age: string; setting: string; tone: string; angle: string; url: string; brief: string };

const DEFAULTS: Options = { format: "9:16", beats: 3, presenter: "auto", age: "25-35", setting: "salon", tone: "naturel", angle: "presentation", url: "", brief: "" };

export function UgcPanel() {
  const { id, data } = useProject();
  const toast = useToast();
  const [o, setO] = useState<Options>(DEFAULTS);
  const [script, setScript] = useState<UgcScriptLike | null>(null);
  const [writing, setWriting] = useState(false);
  const [sending, setSending] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const ugc = !!data?.ai.ugc;
  const voice = !!data?.ai.ugcVoice;
  useEffect(() => () => void (poll.current && clearInterval(poll.current)), []);

  const set = <K extends keyof Options>(k: K, v: Options[K]) => setO((x) => ({ ...x, [k]: v }));
  const payload = () => ({ ...o, url: o.url.trim() || undefined, brief: o.brief.trim() || undefined });

  const write = async () => {
    setWriting(true);
    try {
      const { jobId } = await api<{ jobId: string }>(`/api/projects/${id}/ugc/script`, { body: payload() });
      poll.current = setInterval(async () => {
        try {
          const { job } = await api<{ job: { status: string; result: any; error: string | null } }>(`/api/jobs/${jobId}`);
          if (job.status === "done" || job.status === "failed" || job.status === "cancelled") {
            clearInterval(poll.current!);
            setWriting(false);
            if (job.status === "done" && job.result?.script) setScript(job.result.script);
            else toast("bad", job.error ?? "Le script n'a pas pu être écrit.");
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
    setSending(true);
    try {
      await api(`/api/projects/${id}/ugc`, { body: { options: { ...payload(), beats: script.beats.length }, script } });
      toast("ok", "Vidéo UGC en production : comptez quelques minutes par plan. Elle apparaîtra ici une fois montée.");
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const beat = (i: number, k: "line" | "caption" | "action", v: string) =>
    setScript((s) => s && { ...s, beats: s.beats.map((b, j) => (j === i ? { ...b, [k]: v, ...(k === "line" && b.caption === b.line ? { caption: v } : {}) } : b)) });
  const issues = script ? ugcIssues(script) : [];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <p className="text-xs text-muted">Une personne générée par IA présente votre produit réel face caméra, filmée comme au téléphone : décor, gestes, voix et sous-titres. Vous relisez le script avant de lancer la génération.</p>
      {!ugc && (
        <p className="rounded-2xl border border-warn/30 bg-warn-soft p-3 text-xs text-warn">
          La génération UGC demande un fournisseur d'images (Google Gemini ou OpenAI) et un fournisseur vidéo (Google Veo ou fal.ai), activés par l'administration. Vous pouvez déjà écrire et préparer le script.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Format" htmlFor="ufmt">
          <Select id="ufmt" value={o.format} onChange={(e) => set("format", e.target.value as Options["format"])}>
            <option value="9:16">9:16 vertical</option>
            <option value="16:9">16:9 horizontal</option>
          </Select>
        </Field>
        <Field label="Durée" htmlFor="ubeats">
          <Select id="ubeats" value={o.beats} onChange={(e) => set("beats", Number(e.target.value))}>
            {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n * 8 + 3} s · {n} plans</option>)}
          </Select>
        </Field>
        <Field label="Personne" htmlFor="upres">
          <Select id="upres" value={o.presenter} onChange={(e) => set("presenter", e.target.value)}>
            <option value="auto">Selon votre cible</option>
            <option value="femme">Une femme</option>
            <option value="homme">Un homme</option>
          </Select>
        </Field>
        <Field label="Âge" htmlFor="uage">
          <Select id="uage" value={o.age} onChange={(e) => set("age", e.target.value)}>
            <option value="18-25">18 à 25 ans</option>
            <option value="25-35">25 à 35 ans</option>
            <option value="35-50">35 à 50 ans</option>
            <option value="50+">Plus de 50 ans</option>
          </Select>
        </Field>
        <Field label="Décor" htmlFor="uset">
          <Select id="uset" value={o.setting} onChange={(e) => set("setting", e.target.value)}>
            <option value="salon">Salon</option>
            <option value="cuisine">Cuisine</option>
            <option value="salle-de-bain">Salle de bain</option>
            <option value="chambre">Chambre</option>
            <option value="bureau">Bureau</option>
            <option value="exterieur">Extérieur</option>
            <option value="voiture">Voiture</option>
          </Select>
        </Field>
        <Field label="Ton" htmlFor="utone">
          <Select id="utone" value={o.tone} onChange={(e) => set("tone", e.target.value)}>
            <option value="naturel">Naturel</option>
            <option value="enthousiaste">Enthousiaste</option>
            <option value="expert">Posé, expert</option>
          </Select>
        </Field>
      </div>
      <Field label="Angle" htmlFor="uangle">
        <Select id="uangle" value={o.angle} onChange={(e) => set("angle", e.target.value)}>
          <option value="presentation">Présentation face caméra</option>
          <option value="deballage">Déballage</option>
          <option value="demonstration">Démonstration en situation</option>
          <option value="probleme">Situation du quotidien puis le produit</option>
        </Select>
      </Field>
      <Field label="Consigne (facultatif)" htmlFor="ubrief"><Input id="ubrief" value={o.brief} onChange={(e) => set("brief", e.target.value)} placeholder="Ex. insister sur le format nomade" /></Field>
      <Field label="Adresse affichée à la fin (facultatif)" htmlFor="uurl"><Input id="uurl" value={o.url} onChange={(e) => set("url", e.target.value)} placeholder="ma-marque.fr" /></Field>
      <Button variant={script ? "secondary" : "primary"} onClick={write} loading={writing} icon={<Wand2 className="size-4" />}>{script ? "Réécrire le script" : "Écrire le script"}</Button>

      {script && (
        <div className="grid gap-3 rounded-2xl border border-line bg-paper-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Script · {script.beats.length} plan{script.beats.length > 1 ? "s" : ""}</p>
            <div className="flex gap-1">
              <button type="button" aria-label="Retirer un plan" disabled={script.beats.length <= 1} onClick={() => setScript({ ...script, beats: script.beats.slice(0, -1) })} className="grid size-7 place-items-center rounded-full border border-line bg-card disabled:opacity-40"><Minus className="size-3.5" /></button>
              <button type="button" aria-label="Ajouter un plan" disabled={script.beats.length >= 5} onClick={() => setScript({ ...script, beats: [...script.beats, { line: "", caption: "", action: script.beats[script.beats.length - 1]?.action ?? "holds the product toward the phone camera" }] })} className="grid size-7 place-items-center rounded-full border border-line bg-card disabled:opacity-40"><Plus className="size-3.5" /></button>
            </div>
          </div>
          {script.concept && <p className="text-xs text-muted">{script.concept}</p>}
          {script.beats.map((b, i) => {
            const words = b.line.trim().split(/\s+/).filter(Boolean).length;
            return (
              <div key={i} className="grid gap-1.5 rounded-xl border border-line bg-card p-2.5">
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span className="font-medium text-ink">Plan {i + 1} · 8 s</span>
                  <span className={cx(words > 22 && "text-bad")}>{words} mots</span>
                </div>
                <Textarea aria-label={`Réplique du plan ${i + 1}`} rows={3} value={b.line} onChange={(e) => beat(i, "line", e.target.value)} className="text-sm" />
                <Input aria-label={`Sous-titre du plan ${i + 1}`} value={b.caption} onChange={(e) => beat(i, "caption", e.target.value)} placeholder="Sous-titre" className="text-xs" />
                <details className="text-[11px] text-muted">
                  <summary className="cursor-pointer">Mise en scène</summary>
                  <Input aria-label={`Mise en scène du plan ${i + 1}`} value={b.action} onChange={(e) => beat(i, "action", e.target.value)} className="mt-1.5 text-xs" />
                </details>
              </div>
            );
          })}
          {issues.length > 0 && <ul className="grid gap-1 text-xs text-bad">{issues.map((x) => <li key={x}>{x}</li>)}</ul>}
          <p className="flex gap-2 text-[11px] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-signal" />
            La personne est générée par IA : elle montre et présente le produit, sans faux témoignage, et la mention « Vidéo générée par IA » est incrustée, comme l'exigent les règles des réseaux sociaux. Pensez aussi à activer l'étiquette « contenu IA » en publiant.
          </p>
          {ugc && !voice && <p className="text-[11px] text-warn">Fournisseur vidéo sans voix (fal.ai) : la vidéo sera sous-titrée, sans voix. Google Veo ajoute la voix et le son.</p>}
          <Button onClick={generate} loading={sending} disabled={!ugc || issues.length > 0} icon={<Clapperboard className="size-4" />}>Générer la vidéo UGC</Button>
          <p className="flex items-center gap-1.5 text-[11px] text-muted"><Sparkles className="size-3" /> Génération longue (quelques minutes par plan) et coûteuse en crédits de création.</p>
        </div>
      )}
    </div>
  );
}
