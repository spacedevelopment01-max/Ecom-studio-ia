"use client";
/**
 * Vidéos (Video & UGC Engine V2) dans l'onglet Vidéos : demande → plan et estimation (rien n'est payé) → accord →
 * production ; liste des documents vidéo, ouverture (plans, durée, versions), retouche simple en français, rendu,
 * approbation et exports (MP4, sous-titres SRT/VTT, document JSON).
 * Il n'y a PAS encore de timeline interactive (montage plan par plan à la souris) : voir reports/v1-to-v2-migration.md.
 */
import { AiWait } from "../wait-time";
import { useEffect, useState } from "react";
import { Check, Download, Film, History, Play, Wand2 } from "lucide-react";
import { api, Badge, Button, Card, Field, Input, Modal, Select, Textarea, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { JobProgress, SectionTitle, useActive } from "./common";
import { useT } from "../i18n";
import { PlanRequired, useBudgetPct, useCreationLocked } from "../billing-client";
import { AD_VIDEO_INTENTS } from "@/lib/media/bank";
import { MusicChoice } from "./music-choice";

type VideoItem = { docKey: string; version: number; edited: boolean; intent: string | null; aspect: string | null; platform: string | null; durationS: number; clips: number; url: string | null; renderedAssetId: string | null; renderedVersion: number | null; needsRender: boolean; status: string | null; verdict: string | null; at: number };
type Plan = { approvalToken?:string; shots: { id: string; part: string; durationS: number; subject: string; method: string; paid: boolean; estimateMicro: number }[]; estimateMicro: number; notes: string[]; script?: { hook?: string } | null };
type DocView = { docKey: string; version: {version:number}; versions: { version: number; source: string; note: string; renderedAssetId: string | null; createdAt: number }[]; problems: string[]; durationS: number; doc: { aspect: string; audio?: { music?: unknown | null }; clips: { id: string; durationS: number; source?: { kind?: string }; text?: { value?: string }[] }[] } };

const KINDS: [string, string, string][] = [
  ["video_ad", "Publicité vidéo", "Video ad"],
  ["product_demo", "Démonstration produit", "Product demo"],
  ["social_content", "Contenu court pour les réseaux", "Short social content"],
  ["brand_film", "Vidéo de marque", "Brand film"],
  ["ugc", "UGC (personnage synthétique, signalé)", "UGC (synthetic presenter, disclosed)"],
  ["company_presentation", "Présentation de l'entreprise", "Company presentation"],
  ["service_presentation", "Présentation d'une prestation", "Service presentation"],
];
const AD_KINDS = new Set<string>(AD_VIDEO_INTENTS);
const PLATFORMS: [string, string][] = [["reels", "Instagram Reels (9:16)"], ["tiktok", "TikTok (9:16)"], ["shorts", "YouTube Shorts (9:16)"], ["meta_feed", "Facebook / Instagram (4:5)"], ["youtube", "YouTube (16:9)"], ["shop_page", "Boutique (16:9)"], ["website", "Site (16:9)"], ["linkedin", "LinkedIn"]];

/** `scope` : « ad » (Publicités : publicité vidéo, UGC) ou « organic » (Publications : contenus des réseaux). */
export function VideoV2Panel({ scope }: { scope?: "ad" | "organic" } = {}) {
  const { id, data } = useProject();
  const t = useT();
  const budget = useBudgetPct();
  const toast = useToast();
  const locked = useCreationLocked();
  const services = data?.business === "services";
  const active = useActive("video.v2");
  const { data: list, reload } = useApi<{ videos: VideoItem[] }>(`/api/projects/${id}/videos/v2`, { poll: active.length ? 4000 : undefined });
  useEffect(()=>{const updated=(event:Event)=>{if((event as CustomEvent<{projectId?:string}>).detail?.projectId===id)void reload();};window.addEventListener('studio:videos-changed',updated);return()=>window.removeEventListener('studio:videos-changed',updated);},[id,reload]);
  const kinds = KINDS.filter(([v]) => !scope || (scope === "ad") === AD_KINDS.has(v));
  const [form, setForm] = useState({ kind: scope === "ad" ? "video_ad" : scope === "organic" ? (services ? "service_presentation" : "social_content") : services ? "company_presentation" : "video_ad", platform: scope === "ad" ? "meta_feed" : "reels", text: "", allowGeneration: false });
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const aiVideo = !!data?.ai.video;
  const ask = () => ({generation:form.allowGeneration&&aiVideo?"direct":undefined, purpose:scope==="organic"?"organic":scope==="ad"?"ad":undefined, kind: form.kind, platform: form.platform, text: form.text.trim() || undefined, allowGeneration: form.allowGeneration && aiVideo });
  async function preparePlan() {
    setBusy("plan");
    try {
      setPlan(await api<Plan>(`/api/projects/${id}/videos/v2`, { body: { action: "plan", ask: ask() } }));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function produce() {
    setBusy("go");
    try {
      // Accord explicite : les plans payants ne sont produits qu'après avoir vu l'estimation (sinon montage local).
      await api(`/api/projects/${id}/videos/v2`, { body: { approvalToken:plan?.approvalToken, action: "generate", ask: ask(), approveGeneration: !!plan && plan.estimateMicro > 0 && form.allowGeneration && aiVideo } });
      toast("ok", t("Vidéo en préparation : elle apparaît ci-dessous à la fin du rendu.", "Video in progress: it appears below once rendered."));
      setPlan(null);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const videos = (list?.videos ?? []).filter((v) => !scope || (scope === "ad") === AD_KINDS.has(v.intent ?? ""));
  return (
    <Card className="p-5 sm:p-7">
      <SectionTitle title={t("Vidéos", "Videos")}>
        {t("Décrivez la vidéo : le studio prépare l'intention, le script, le découpage en plans et une estimation du coût avant toute production. Sans votre accord, la vidéo est montée uniquement avec vos médias (gratuit). Chaque vidéo est un document modifiable, versionné, avec sous-titres.", "Describe the video: the studio prepares the intent, script, shot list and a cost estimate before producing anything. Without your consent, the video is edited only from your media (free). Each video is an editable, versioned document with subtitles.")}
      </SectionTitle>
      {active.map((j) => <JobProgress key={j.id} job={j} className="mb-4" />)}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Type de vidéo", "Video type")} htmlFor="v2vkind">
          <Select id="v2vkind" value={form.kind} onChange={(e) => (setForm({ ...form, kind: e.target.value }), setPlan(null))}>{kinds.map(([v, fr, en]) => <option key={v} value={v}>{t(fr, en)}</option>)}</Select>
        </Field>
        <Field label={t("Diffusion", "Where it runs")} htmlFor="v2vplat">
          <Select id="v2vplat" value={form.platform} onChange={(e) => (setForm({ ...form, platform: e.target.value }), setPlan(null))}>{PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        </Field>
        <div className="sm:col-span-2"><Field label={t("Votre demande (facultatif)", "Your request (optional)")} htmlFor="v2vtext">
          <Textarea id="v2vtext" rows={2} maxLength={12000} value={form.text} onChange={(e) => (setForm({ ...form, text: e.target.value }), setPlan(null))} placeholder={t("Ex. 20 secondes, montrer la texture et finir sur la boutique", "E.g. 20 seconds, show the texture and end on the store")} />
        </Field></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Toggle checked={form.allowGeneration && aiVideo} disabled={!aiVideo} onChange={(v) => (setForm({ ...form, allowGeneration: v }), setPlan(null))} label={aiVideo ? t("Autoriser des plans filmés par l'IA si utile (estimation avant accord)", "Allow AI-filmed shots when useful (estimate before consent)") : t("Plans filmés par l'IA non disponibles : montage à partir de vos médias", "AI-filmed shots not available: edited from your media")} />
        <Button variant="secondary" icon={<Film className="size-4" />} loading={busy === "plan"} disabled={locked} onClick={preparePlan}>{t("Préparer le plan et l'estimation", "Prepare the plan and estimate")}</Button>
      </div>
      {locked && <PlanRequired what="videos" />}
      <AiWait busy={busy === "plan"} label={t("Préparation du plan de la vidéo et de l'estimation…", "Preparing the video plan and estimate…")} waitKey="video-plan" expectedMs={20000} className="mt-3" />
      {plan && (
        <div className="mt-4 rounded-xl border border-line p-4 text-sm">
          <p className="font-medium">{t(`${plan.shots.length} plan(s) · coût probable : ${budget.label(plan.estimateMicro)}`, `${plan.shots.length} shot(s) · likely cost: ${budget.label(plan.estimateMicro)}`)}</p>
          <ul className="mt-2 grid gap-1 text-xs text-ink-2">
            {plan.shots.map((s) => <li key={s.id}>{s.part} · {s.durationS} s · {s.subject} — {s.paid ? t(`plan généré (${budget.short(s.estimateMicro)})`, `generated shot (${budget.short(s.estimateMicro)})`) : t("montage local (gratuit)", "local edit (free)")}</li>)}
          </ul>
          {plan.notes.length > 0 && <p className="mt-2 text-xs text-muted">{plan.notes.slice(0, 3).join(" · ")}</p>}
          <Button className="mt-3" icon={<Play className="size-4" />} loading={busy === "go"} onClick={produce}>{plan.estimateMicro > 0 && form.allowGeneration && aiVideo ? t(`J'accepte (coût probable ${budget.label(plan.estimateMicro)}) : produire`, `I accept (likely cost ${budget.label(plan.estimateMicro)}): produce`) : t("Produire (montage local, gratuit)", "Produce (local edit, free)")}</Button>
        </div>
      )}
      {videos.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <div key={v.docKey} className="overflow-hidden rounded-xl border border-line bg-card">
              {v.url ? <video src={v.url} controls preload="metadata" className="aspect-video w-full bg-black object-contain" /> : <div className="grid aspect-video place-items-center bg-paper-2 text-xs text-muted">{t("Pas encore rendue", "Not rendered yet")}</div>}
              <div className="grid gap-2 p-3 text-xs">
                <div className="flex flex-wrap gap-1">
                  <Badge>{v.aspect}</Badge>
                  <Badge>{v.durationS} s</Badge>
                  <Badge>{t(`v${v.version}`, `v${v.version}`)}</Badge>
                  {v.edited && <Badge tone="info">{t("Modifiée", "Edited")}</Badge>}
                  {v.status === "approved" ? <Badge tone="ok">{t("Approuvée", "Approved")}</Badge> : v.verdict && <Badge tone={v.verdict === "FINAL" ? "ok" : "warn"}>{v.verdict === "FINAL" ? t("Contrôlée", "Checked") : t("À vérifier", "To check")}</Badge>}
                  {v.needsRender && v.renderedVersion && <Badge tone="warn">{t("Modifications à rendre", "Changes to render")}</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setOpen(v.docKey)}>{t("Ouvrir", "Open")}</Button>
                  {v.renderedAssetId && v.status !== "approved" && <Button size="sm" variant="ghost" icon={<Check className="size-4" />} onClick={async () => { try { await api(`/api/files/${v.renderedAssetId}`, { method: "PATCH", body: { status: "approved" } }); reload(); } catch (e) { toast("bad", (e as Error).message); } }}>{t("Approuver", "Approve")}</Button>}
                  {v.url && <a className="inline-flex items-center gap-1 underline" href={`${v.url}?download=1`}><Download className="size-3" /> MP4</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && <VideoDocModal docKey={open} onClose={() => (setOpen(null), reload())} />}
    </Card>
  );
}

export function VideoDocModal({ docKey, onClose }: { docKey: string; onClose: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const base = `/api/projects/${id}/videos/v2/${encodeURIComponent(docKey)}`;
  const { data, reload } = useApi<DocView>(base);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  async function post(body: Record<string, unknown>, ok: string, key: string) {
    setBusy(key);
    try {
      const r = await api<{ edit?: { local: boolean; reason?: string; summary?: string } }>(base, { body });
      if (r?.edit && !r.edit.local) toast("info", r.edit.reason ?? t("Cette retouche demande une nouvelle production.", "This change needs a new production."));
      else toast("ok", ok);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal open onClose={onClose} title={t("Document vidéo", "Video document")}>
      {!data ? null : (
        <div className="grid gap-4 text-sm">
          <p className="text-xs text-muted">{t(`Version ${data.version.version} · ${data.durationS} s · ${data.doc.clips.length} plan(s) · format ${data.doc.aspect}`, `Version ${data.version.version} · ${data.durationS} s · ${data.doc.clips.length} shot(s) · ${data.doc.aspect} format`)}</p>
          <ol className="grid gap-1 text-xs">
            {data.doc.clips.map((c, i) => <li key={c.id} className="rounded-lg bg-paper-2 px-2 py-1">{i + 1}. {c.durationS} s{c.text?.[0]?.value ? ` — « ${c.text[0].value} »` : ""}</li>)}
          </ol>
          {data.problems.length > 0 && <ul className="list-disc pl-5 text-xs text-warn">{data.problems.slice(0, 5).map((p) => <li key={p}>{p}</li>)}</ul>}
          <div className="flex flex-wrap items-center gap-3" data-video-music>
            <span className="text-sm font-medium">{t("Musique", "Music")}</span>
            <MusicChoice
              compact
              value={!!data.doc.audio?.music}
              onChange={(on) => {
                if (on === !!data.doc.audio?.music) return;
                // Musique composée par le studio (droits inclus) ou aucune ; nouvelle version, puis rendu.
                void post({ action: "ops", ops: [{ op: "music", music: on ? { source: "synth", mood: "warm", gainDb: -14 } : null }], note: on ? "musique ajoutée" : "musique retirée" }, on ? t("Musique ajoutée : relancez le rendu.", "Music added: render again.") : t("Musique retirée : relancez le rendu.", "Music removed: render again."), "music");
              }}
            />
          </div>
          <Field label={t("Retouche simple (ex. « raccourcis à 15 secondes », « change le titre en … »)", "Simple change (e.g. \"shorten to 15 seconds\", \"change the title to …\")")} htmlFor="v2edit">
            <Input id="v2edit" value={instruction} maxLength={400} onChange={(e) => setInstruction(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Wand2 className="size-4" />} disabled={!instruction.trim()} loading={busy === "edit"} onClick={() => post({ action: "edit", instruction }, t("Retouche appliquée (nouvelle version) : relancez le rendu.", "Change applied (new version): render again."), "edit")}>{t("Appliquer", "Apply")}</Button>
            <Button size="sm" variant="secondary" icon={<Play className="size-4" />} loading={busy === "render"} onClick={() => post({ action: "render" }, t("Rendu lancé.", "Rendering started."), "render")}>{t("Rendre la vidéo", "Render the video")}</Button>
            <Button size="sm" variant="ghost" loading={busy === "dup"} onClick={() => post({ action: "duplicate" }, t("Copie créée.", "Copy created."), "dup")}>{t("Dupliquer", "Duplicate")}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2" data-video-reformat>
            <span className="text-xs text-muted">{t("Dupliquer dans un autre format (gratuit) :", "Duplicate in another format (free):")}</span>
            {(["9:16", "4:5", "1:1", "16:9"] as const)
              .filter((a) => a !== data.doc.aspect)
              .map((a) => (
                <Button key={a} size="sm" variant="secondary" loading={busy === `fmt${a}`} onClick={() => post({ action: "reformat", aspect: a }, t(`Copie au format ${a} en préparation.`, `${a} copy being prepared.`), `fmt${a}`)}>
                  {a}
                </Button>
              ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <a className="underline" href={`${base}?export=srt`}>{t("Sous-titres SRT", "SRT subtitles")}</a>
            <a className="underline" href={`${base}?export=vtt`}>{t("Sous-titres VTT", "VTT subtitles")}</a>
            <a className="underline" href={`${base}?export=json`}>{t("Document (JSON)", "Document (JSON)")}</a>
          </div>
          <details className="text-xs">
            <summary className="inline-flex cursor-pointer items-center gap-1"><History className="size-3" /> {t(`${data.versions.length} version(s)`, `${data.versions.length} version(s)`)}</summary>
            <ul className="mt-2 grid gap-1">
              {data.versions.map((v) => (
                <li key={v.version} className="flex items-center justify-between gap-2">
                  <span>v{v.version} · {v.note || v.source}</span>
                  {v.version !== data.version.version && <button className="underline" onClick={() => post({ action: "restore", version: v.version }, t("Version restaurée.", "Version restored."), `r${v.version}`)}>{t("Restaurer", "Restore")}</button>}
                </li>
              ))}
            </ul>
          </details>
          <p className="text-[11px] text-muted">{t("Le montage plan par plan sur une ligne de temps n'est pas encore disponible : les retouches passent par la demande ci-dessus.", "Shot-by-shot timeline editing isn't available yet: changes go through the request above.")}</p>
        </div>
      )}
    </Modal>
  );
}
