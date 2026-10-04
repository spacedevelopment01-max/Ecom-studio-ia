"use client";
import { useEffect, useState } from "react";
import { Download, Film, Package, Play } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Select, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { EngineNotice, JobProgress, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import { UgcPanel } from "./ugc-panel";
import { useCostConfirm } from "./cost-confirm";
import { useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";

const SCENE_LABEL: Record<string, string> = { title: "Accroche", reveal: "Révélation", callouts: "Points clés", detail: "Détail", scene: "Scène", clip: "Plan généré", end: "Fin + appel", hook: "Produit en action", spotlight: "Projecteur", split: "Écran partagé", words: "Phrases chocs" };
const SCENE_LABEL_EN: Record<string, string> = { title: "Hook", reveal: "Reveal", callouts: "Key points", detail: "Detail", scene: "Scene", clip: "Generated shot", end: "End + call to action", hook: "Product in action", spotlight: "Spotlight", split: "Split screen", words: "Punchlines" };

export default function TabVideos() {
  const { id, data } = useProject();
  const toast = useToast();
  const t = useT();
  const cl = useContentLang();
  const active = useActive(["video.render", "video.ugc"]);
  const [mode, setMode] = useState<"motion" | "ugc">("motion");
  const cost = useCostConfirm();
  const { data: list, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=video,subtitles`);
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [form, setForm] = useState({ format: "9:16", goal: "", music: "calm", useAiClip: false, target: "ads", url: "" });
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(`es-insert-videos-${id}`);
      if (pending) {
        setForm((f) => ({ ...f, goal: pending.slice(0, 400) }));
        sessionStorage.removeItem(`es-insert-videos-${id}`);
      }
    } catch {}
  }, [id]);
  const videos = (list?.assets ?? []).filter((a) => a.kind === "video");
  const subs = (list?.assets ?? []).filter((a) => a.role === "subtitles");
  const create = async () => {
    if (form.useAiClip && data?.ai.video && !(await cost.confirm("video-clip"))) return;
    try {
      await api(`/api/projects/${id}/videos`, { body: { ...form, goal: form.goal || undefined, url: form.url || undefined }, lang: cl.lang });
      toast("ok", t("Vidéo en production. Le rendu continue même si vous quittez la page.", "Video in production. Rendering continues even if you leave the page."));
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      {cost.dialog}
      <EngineNotice what={t("le découpage des vidéos", "the video storyboards")} />
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-max p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">{t("Produire une vidéo", "Produce a video")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-paper-2 p-1" role="tablist" aria-label={t("Type de vidéo", "Video type")}>
            {([["motion", t("Motion design", "Motion design")], ["ugc", t("UGC par IA", "AI UGC")]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={cx("rounded-full px-3 py-1.5 text-xs font-medium transition", mode === k ? "bg-card text-ink shadow-soft" : "text-muted hover:text-ink")}>{l}</button>
            ))}
          </div>
          {mode === "ugc" ? <div className="mt-4"><UgcPanel /></div> : <>
          <p className="mt-3 text-xs text-muted">{t("Motion design image par image : typographie animée, révélation du produit réel, balayage lumineux, transitions, musique originale, sous-titres SRT. Livré en MP4 H.264.", "Frame-by-frame motion design: animated typography, real product reveal, light sweep, transitions, original music, SRT subtitles. Delivered as H.264 MP4.")}</p>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
            <Field label={t("Format", "Format")} htmlFor="vfmt">
              <Select id="vfmt" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
                <option value="9:16">{t("9:16 · Reels, TikTok, Shorts, stories (1080×1920)", "9:16 · Reels, TikTok, Shorts, stories (1080×1920)")}</option>
                <option value="1:1">{t("1:1 · fil d'actualité (1080×1080)", "1:1 · news feed (1080×1080)")}</option>
                <option value="4:5">{t("4:5 · fil Instagram et Facebook (1080×1350)", "4:5 · Instagram and Facebook feed (1080×1350)")}</option>
                <option value="16:9">{t("16:9 · boutique, YouTube (1920×1080)", "16:9 · store, YouTube (1920×1080)")}</option>
              </Select>
            </Field>
            <Field label={t("Objectif", "Goal")} htmlFor="vgoal"><Input id="vgoal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder={t("Ex. publicité de lancement, vidéo d'ambiance…", "E.g. launch ad, mood video…")} /></Field>
            <Field label={t("Usage", "Use")} htmlFor="vtarget">
              <Select id="vtarget" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                <option value="ads">{t("Publicité", "Advertising")}</option>
                <option value="social">{t("Réseaux sociaux", "Social media")}</option>
                <option value="shop">{t("Boutique", "Store")}</option>
              </Select>
            </Field>
            <Field label={t("Musique", "Music")} htmlFor="vmusic">
              <Select id="vmusic" value={form.music} onChange={(e) => setForm({ ...form, music: e.target.value })}>
                <option value="calm">{t("Nappe douce (création originale)", "Soft pad (original composition)")}</option>
                <option value="pulse">{t("Pulsation rythmée (création originale)", "Rhythmic pulse (original composition)")}</option>
                <option value="none">{t("Sans son", "No sound")}</option>
              </Select>
            </Field>
            <Field label={t("Adresse affichée à la fin (facultatif)", "Address shown at the end (optional)")} htmlFor="vurl"><Input id="vurl" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder={t("ma-marque.fr", "my-brand.com")} /></Field>
            <div className={cx("rounded-2xl bg-paper-2 p-3", !data?.ai.video && "opacity-60")}>
              <Toggle checked={form.useAiClip && !!data?.ai.video} onChange={(v) => setForm({ ...form, useAiClip: v })} disabled={!data?.ai.video} label={t("Ajouter un plan généré par IA", "Add an AI-generated shot")} />
              <p className="mt-1.5 text-[11px] text-muted">{data?.ai.video ? t("Plan d'ambiance image-vers-vidéo à partir d'une scène réelle, vérifié image par image ; écarté s'il déforme le produit. Coûteux en crédits.", "Image-to-video mood shot from a real scene, checked frame by frame; discarded if it distorts the product. Credit-intensive.") : t("Aucun fournisseur vidéo configuré.", "No video provider configured.")}</p>
            </div>
            <ContentLangPicker {...cl} />
            <Button onClick={create} icon={<Film className="size-4" />}>{t("Produire la vidéo", "Produce the video")}</Button>
          </div>
          </>}
        </Card>
        <div className="grid content-start gap-5">
          {videos.length === 0 && <Empty title={t("Aucune vidéo pour l'instant", "No videos yet")} icon={<Play className="size-5" />}>{t("La première vidéo est produite automatiquement par le pilote ; vous pouvez en créer d'autres ici.", "The first video is produced automatically by the autopilot; you can create more here.")}</Empty>}
          {videos.map((v) => {
            const plan = v.meta?.plan;
            const srt = subs.find((s) => s.sourceAssetId === v.id);
            const tall = (v.height ?? 0) > (v.width ?? 0);
            return (
              <Card key={v.id} className="overflow-hidden">
                <div className={cx("grid gap-0", tall ? "sm:grid-cols-[260px_1fr]" : "")}>
                  <div className="bg-ink">
                    <video src={v.url} poster={v.thumbUrl ?? undefined} controls playsInline preload="none" className={cx("w-full", tall ? "aspect-[9/16]" : v.meta?.format === "1:1" ? "aspect-square" : "aspect-video")} />
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="ink">{v.meta?.format}</Badge>
                      <StatusBadge status={v.status} />
                      <span className="text-xs text-muted">{v.meta?.delivered}</span>
                    </div>
                    <p className="mt-2 text-sm text-ink-2">{v.meta?.method}</p>
                    {v.meta?.kind === "ugc" && (
                      <>
                        <p className="mt-2 inline-flex rounded-full bg-signal-soft px-2.5 py-0.5 text-[11px] font-medium text-signal">{v.meta.aiLabel ?? t("Vidéo générée par IA", "AI-generated video")} · {t("mention incrustée", "label burned in")}</p>
                        <ol className="mt-3 grid gap-1.5 text-sm">
                          {(v.meta.script?.beats ?? []).map((b: any, i: number) => (
                            <li key={i} className="flex gap-3">
                              <span className="w-24 shrink-0 text-xs text-muted">{t("Plan", "Shot")} {i + 1} · 8 s</span>
                              <span className="text-ink-2">{t(`« ${b.line} »`, `“${b.line}”`)}</span>
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                    {plan && (
                      <ol className="mt-4 grid gap-1.5 text-sm">
                        {plan.scenes.map((s: any, i: number) => (
                          <li key={i} className="flex gap-3">
                            <span className="w-24 shrink-0 text-xs text-muted">{t(SCENE_LABEL[s.kind], SCENE_LABEL_EN[s.kind]) ?? s.kind} · {Number(s.duration).toFixed(1)} s</span>
                            <span className="text-ink-2">{s.text ?? s.headline ?? s.caption ?? (s.items ? s.items.join(" · ") : "")}{s.cta ? ` · ${s.cta}` : ""}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {v.meta?.issues?.length > 0 && <p className="mt-3 text-xs text-warn">{t("À vérifier : ", "To check: ")}{v.meta.issues.join(t(" ; ", "; "))}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setViewer(v)}>{t("Valider, réutiliser, Canva…", "Approve, reuse, Canva…")}</Button>
                      <a href={v.downloadUrl} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:border-ink"><Download className="size-3.5" /> MP4</a>
                      {srt && <a href={srt.downloadUrl} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:border-ink"><Download className="size-3.5" /> {t("Sous-titres SRT", "SRT subtitles")}</a>}
                      <a href={`/api/files/${v.id}/capcut`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:border-ink" title={t("CapCut n'a pas d'API publique : pack de montage prêt à importer", "CapCut has no public API: editing pack ready to import")}><Package className="size-3.5" /> {t("Pack CapCut", "CapCut pack")}</a>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      <AssetViewer asset={viewer} onClose={() => setViewer(null)} onChanged={reload} />
    </div>
  );
}
