"use client";
import { useEffect, useState } from "react";
import { Download, Package, Play } from "lucide-react";
import { Badge, Button, Card, cx, Empty, useApi } from "../ui";
import { useProject } from "./project-context";
import { EngineNotice, JobProgress, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import { VideoV2Panel } from "./video-v2-panel";
import { useT } from "../i18n";
import { useCreationLocked } from "../billing-client";

const SCENE_LABEL: Record<string, string> = { title: "Accroche", reveal: "Révélation", callouts: "Points clés", detail: "Détail", scene: "Scène", clip: "Plan généré", end: "Fin + appel", hook: "Produit en action", spotlight: "Projecteur", split: "Écran partagé", words: "Phrases chocs", list: "Prestations", info: "Infos pratiques" };
const SCENE_LABEL_EN: Record<string, string> = { title: "Hook", reveal: "Reveal", callouts: "Key points", detail: "Detail", scene: "Scene", clip: "Generated shot", end: "End + call to action", hook: "Product in action", spotlight: "Spotlight", split: "Split screen", words: "Punchlines", list: "Services", info: "Practical info" };

export default function TabVideos() {
  const { id, data } = useProject();
  const t = useT();
  const active = useActive(["video.render", "video.ugc"]);
  const locked = useCreationLocked();
  const { data: list, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=video,clip,subtitles`);
  const [viewer, setViewer] = useState<AssetView | null>(null);
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  const videoStep = data?.pipeline?.steps.find((s) => s.id === "video")?.status;
  const videos = (list?.assets ?? []).filter((a) => a.kind === "video");
  const subs = (list?.assets ?? []).filter((a) => a.role === "subtitles");
  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <EngineNotice what={t("le découpage des vidéos", "the video storyboards")} />
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <VideoV2Panel />
      <h2 className="font-display text-xl font-semibold">{t("Tous les fichiers vidéo", "All video files")}</h2>
      <div>
        <div className="grid content-start gap-5">
          {videos.length === 0 && <Empty title={t("Aucune vidéo pour l'instant", "No videos yet")} icon={<Play className="size-5" />}>{locked ? t("Les vidéos sont incluses dans les forfaits : le pilote ne les a pas créées pendant la découverte gratuite.", "Videos come with the plans: the autopilot did not create them during the free discovery.") : videoStep === "done" || videoStep === "running" || videoStep === "pending" ? t("La première vidéo est produite automatiquement par le pilote ; vous pouvez en créer d'autres ci-dessus.", "The first video is produced automatically by the autopilot; you can create more above.") : t("Créez votre première vidéo ci-dessus.", "Create your first video above.")}</Empty>}
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
                    <p className="mt-2 text-sm text-ink-2">{v.role === "clip" ? t("Plan vidéo complet généré par l'IA (utilisé en partie dans le montage)", "Full AI-generated video shot (partly used in the edit)") : v.meta?.method}</p>
                    {v.meta?.qcWarning && <p className={cx("mt-2 rounded-xl px-3 py-2 text-xs", v.status === "rejected" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn")}>{v.status === "rejected" ? t("Écarté par le contrôle qualité (non utilisé, non décompté) : ", "Rejected by the quality check (not used, not counted): ") : t("À vérifier : ", "To check: ")}{v.meta.qcWarning}</p>}
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
                            <span className="text-ink-2">{s.text ?? s.headline ?? s.caption ?? [s.heading, ...(s.items ?? [])].filter(Boolean).join(" · ")}{s.rows ? `${s.heading ? " · " : ""}${s.rows.map((r: any) => r.text).join(" · ")}` : ""}{s.cta ? ` · ${s.cta}` : ""}</span>
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
