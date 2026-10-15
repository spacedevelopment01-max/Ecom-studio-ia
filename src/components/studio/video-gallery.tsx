"use client";
import { useEffect, useState } from "react";
import { Download, Package, Play } from "lucide-react";
import { Badge, Button, Card, cx, Empty, useApi } from "../ui";
import { useProject } from "./project-context";
import { JobProgress, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import { VideoV2Panel } from "./video-v2-panel";
import { isAdVisual } from "@/lib/media/bank";
import { useT } from "../i18n";
import { useCreationLocked } from "../billing-client";

const SCENE_LABEL: Record<string, string> = { title: "Accroche", reveal: "Révélation", callouts: "Points clés", detail: "Détail", scene: "Scène", clip: "Plan généré", end: "Fin + appel", hook: "Produit en action", spotlight: "Projecteur", split: "Écran partagé", words: "Phrases chocs", list: "Prestations", info: "Infos pratiques" };
const SCENE_LABEL_EN: Record<string, string> = { title: "Hook", reveal: "Reveal", callouts: "Key points", detail: "Detail", scene: "Scene", clip: "Generated shot", end: "End + call to action", hook: "Product in action", spotlight: "Spotlight", split: "Split screen", words: "Punchlines", list: "Services", info: "Practical info" };

/**
 * Vidéos MONTÉES (titres, sous-titres, appel à l'action) : elles vivent dans Publications › Publication vidéo, à côté
 * de la création ; la banque de l'onglet Vidéos ne garde que les plans neutres.
 */
export function EditedVideos() {
  const { id, data } = useProject();
  const t = useT();
  const active = useActive(["video.render", "video.ugc", "video.v2", "canva."]);
  const locked = useCreationLocked();
  const { data: list, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=video,subtitles`);
  const [viewer, setViewer] = useState<AssetView | null>(null);
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  const videoStep = data?.pipeline?.steps.find((s) => s.id === "video")?.status;
  // Vidéos organiques seulement : les publicités vidéo et UGC sont dans l'onglet Publicités.
  const videos = (list?.assets ?? []).filter((a) => a.kind === "video" && a.role === "video" && !isAdVisual(a));
  const subs = (list?.assets ?? []).filter((a) => a.role === "subtitles");
  return (
    <div className="grid min-w-0 gap-5" data-edited-videos>
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <details className="rounded-3xl border border-line bg-card p-5">
        <summary className="cursor-pointer select-none font-display text-lg font-semibold">{t("Vidéo sur mesure (publicité, démonstration, film de marque…)", "Custom video (ad, demo, brand film…)")}</summary>
        <div className="mt-4"><VideoV2Panel scope="organic" /></div>
      </details>
      <h3 className="font-display text-lg font-semibold">{t("Vos vidéos montées", "Your edited videos")}</h3>
      <div>
        {videos.length === 0 && <Empty title={t("Aucune vidéo pour l'instant", "No videos yet")} icon={<Play className="size-5" />}>{locked ? t("Les vidéos sont incluses dans les forfaits : le pilote ne les a pas créées pendant la découverte gratuite.", "Videos come with the plans: the autopilot did not create them during the free discovery.") : videoStep === "done" || videoStep === "running" || videoStep === "pending" ? t("La première vidéo est produite automatiquement par le pilote ; vous pouvez en créer d'autres ci-dessus.", "The first video is produced automatically by the autopilot; you can create more above.") : t("Créez votre première vidéo ci-dessus.", "Create your first video above.")}</Empty>}
        {/* Galerie compacte : plusieurs vidéos par ligne, le détail (plan, script) se déplie à la demande. */}
        <div className="grid grid-cols-2 content-start gap-4 sm:grid-cols-3 xl:grid-cols-4" data-video-gallery>
          {videos.map((v) => {
            const plan = v.meta?.plan;
            const srt = subs.find((s) => s.sourceAssetId === v.id);
            const tall = (v.height ?? 0) > (v.width ?? 0);
            const beats = v.meta?.kind === "ugc" ? (v.meta.script?.beats ?? []) : [];
            return (
              <Card key={v.id} className="flex min-w-0 flex-col overflow-hidden">
                <div className="grid place-items-center bg-ink">
                  <video src={v.url} poster={v.thumbUrl ?? undefined} controls playsInline preload="none" className={cx("w-full", tall ? "aspect-[9/16]" : v.meta?.format === "1:1" ? "aspect-square" : v.meta?.format === "4:5" ? "aspect-[4/5]" : "aspect-video")} />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {v.meta?.format && <Badge tone="ink">{v.meta.format}</Badge>}
                    <StatusBadge status={v.status} />
                    {v.meta?.kind === "ugc" && <span className="rounded-full bg-signal-soft px-2 py-0.5 text-[10px] font-medium text-signal">{t("IA", "AI")}</span>}
                  </div>
                  {v.meta?.qcWarning && <p className={cx("line-clamp-2 rounded-lg px-2 py-1 text-[11px]", v.status === "rejected" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn")} title={v.meta.qcWarning}>{v.status === "rejected" ? t("Écartée par le contrôle (non décomptée) : ", "Rejected by the check (not counted): ") : t("À vérifier : ", "To check: ")}{v.meta.qcWarning}</p>}
                  {(plan || beats.length > 0 || v.meta?.method || v.role === "clip") && (
                    <details className="text-xs text-ink-2">
                      <summary className="cursor-pointer select-none text-muted hover:text-ink">{t("Détail du montage", "Edit details")}</summary>
                      <p className="mt-1.5">{v.role === "clip" ? t("Plan vidéo complet généré par l'IA (utilisé en partie dans le montage)", "Full AI-generated video shot (partly used in the edit)") : v.meta?.method}</p>
                      {beats.length > 0 && <p className="mt-1.5">{v.meta.aiLabel ?? t("Vidéo générée par IA", "AI-generated video")} · {t("mention incrustée", "label burned in")}</p>}
                      {beats.length > 0 && <ol className="mt-1.5 grid gap-1">{beats.map((b: any, i: number) => <li key={i}><span className="text-muted">{t("Plan", "Shot")} {i + 1} · </span>{t(`« ${b.line} »`, `“${b.line}”`)}</li>)}</ol>}
                      {plan && <ol className="mt-1.5 grid gap-1">{plan.scenes.map((sc: any, i: number) => <li key={i}><span className="text-muted">{t(SCENE_LABEL[sc.kind], SCENE_LABEL_EN[sc.kind]) ?? sc.kind} · {Number(sc.duration).toFixed(1)} s · </span>{sc.text ?? sc.headline ?? sc.caption ?? [sc.heading, ...(sc.items ?? [])].filter(Boolean).join(" · ")}{sc.cta ? ` · ${sc.cta}` : ""}</li>)}</ol>}
                      {v.meta?.issues?.length > 0 && <p className="mt-1.5 text-warn">{t("À vérifier : ", "To check: ")}{v.meta.issues.join(t(" ; ", "; "))}</p>}
                    </details>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                    <Button size="sm" variant="secondary" onClick={() => setViewer(v)}>{t("Ouvrir", "Open")}</Button>
                    <a href={v.downloadUrl} className="grid size-8 place-items-center rounded-full border border-line hover:border-ink" title={t("Télécharger le MP4", "Download the MP4")} aria-label={t("Télécharger le MP4", "Download the MP4")}><Download className="size-3.5" /></a>
                    {srt && <a href={srt.downloadUrl} className="inline-flex h-8 items-center rounded-full border border-line px-2.5 text-[11px] hover:border-ink" title={t("Sous-titres SRT", "SRT subtitles")}>SRT</a>}
                    <a href={`/api/files/${v.id}/capcut`} className="grid size-8 place-items-center rounded-full border border-line hover:border-ink" title={t("Pack CapCut (prêt à importer)", "CapCut pack (ready to import)")} aria-label={t("Pack CapCut", "CapCut pack")}><Package className="size-3.5" /></a>
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
