"use client";
/**
 * Section « Créations publicitaires » de l'onglet Publicités (moteur publicitaire V2) : créer des publicités, voir
 * les propositions, ouvrir l'une d'elles dans l'éditeur visuel (« Modifier »), exporter. Les créations modifiées par
 * le client portent un badge et ne sont jamais écrasées par une nouvelle génération.
 */
import { useEffect, useRef, useState } from "react";
import { Download, PenLine, Sparkles } from "lucide-react";
import { api, Badge, Button, Card, Empty, Field, Input, Modal, useApi, useToast } from "../../ui";
import { useT } from "../../i18n";
import { useProject } from "../project-context";
import { JobProgress, SectionTitle, useActive } from "../common";
import { useCostConfirm } from "../cost-confirm";
import { AdEditor } from "./ad-editor";

type DocItem = { docKey: string; version: number; source: string; edited: boolean; aspect: string | null; platform: string | null; width: number | null; height: number | null; title: string; url: string | null; at: number };

const PLATFORM_LABEL: Record<string, string> = { meta_feed: "Facebook / Instagram", meta_story: "Stories / Reels", tiktok: "TikTok", google_display: "Google", pinterest: "Pinterest", linkedin: "LinkedIn" };
const PLATFORMS = Object.keys(PLATFORM_LABEL);

export function AdCreatives() {
  const { id, data } = useProject();
  const t = useT();
  const toast = useToast();
  const cost = useCostConfirm();
  const { data: list, reload } = useApi<{ docs: DocItem[] }>(`/api/projects/${id}/ads/docs`);
  const jobs = useActive("ads.v2");
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ count: number; platforms: string[]; offer: string; audience: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Fin d'une génération : la liste se recharge d'elle-même.
  const running = jobs.length > 0;
  const was = useRef(running);
  useEffect(() => {
    if (was.current && !running) reload();
    was.current = running;
  }, [running, reload]);

  const generate = async () => {
    if (!form) return;
    // Avec l'IA, les nouvelles photos utilisent le forfait : on le dit avant. Sans IA, tout est gratuit (moteur local).
    if (data?.ai.llm && !(await cost.confirm("images"))) return;
    setBusy(true);
    try {
      const r = await api<{ jobId: string }>(`/api/projects/${id}/campaigns/v2`, { body: { action: "generate", count: form.count, platforms: form.platforms, offer: form.offer.trim() || undefined, audience: form.audience.trim() || undefined } });
      toast("ok", t("Création des publicités lancée : elles apparaissent ici dès qu'elles sont prêtes.", "Ads are being created: they appear here as soon as they're ready."));
      setForm(null);
      setBusy(false);
      // Suivi de la tâche : la liste se met à jour dès qu'elle est finie (même si elle a duré moins d'une actualisation).
      for (let i = 0; i < 400; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        const jobs = await api<{ jobs: { id: string; status: string; error: string | null }[] }>(`/api/projects/${id}/jobs?type=ads.v2`);
        const j = jobs.jobs.find((x) => x.id === r.jobId);
        if (j && (j.status === "queued" || j.status === "running" || j.status === "paused")) continue;
        await reload();
        if (j?.status === "failed") toast("bad", j.error || t("La création des publicités a échoué.", "Creating the ads failed."));
        else toast("ok", t("Publicités prêtes : cliquez sur « Modifier » pour les ajuster.", "Ads ready: click “Edit” to adjust them."));
        return;
      }
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const docs = list?.docs ?? [];
  return (
    <section data-testid="ad-creatives">
      <SectionTitle
        title={t("Créations publicitaires", "Ad creatives")}
        action={<Button variant="signal" icon={<Sparkles className="size-4" />} disabled={running || !data?.brand} onClick={() => setForm({ count: 3, platforms: ["meta_feed", "meta_story"], offer: "", audience: data?.brand?.audience ?? "" })} data-testid="create-ads">{t("Créer des publicités", "Create ads")}</Button>}
      >
        {t("Des visuels prêts à publier, aux formats de chaque réseau. Cliquez sur « Modifier » pour changer vous-même textes, photos, formes, couleurs et positions : ces retouches sont gratuites.", "Ready-to-post visuals in each network's formats. Click “Edit” to change copy, photos, shapes, colours and positions yourself: these edits are free.")}
      </SectionTitle>
      {jobs[0] && <JobProgress job={jobs[0]} className="mb-4" />}
      {docs.length === 0 ? (
        !running && <Empty title={t("Aucune création pour l'instant", "No creatives yet")} icon={<Sparkles className="size-5" />}>{t("Cliquez sur « Créer des publicités » : le studio propose plusieurs angles, aux bons formats.", "Click “Create ads”: the studio suggests several angles in the right formats.")}</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="creatives-list">
          {docs.map((d) => (
            <Card key={d.docKey} className="flex flex-col overflow-hidden p-0" data-testid="creative">
              <button type="button" onClick={() => setOpen(d.docKey)} className="group relative block bg-paper-2" style={{ aspectRatio: d.width && d.height ? `${d.width} / ${d.height}` : "1 / 1" }} aria-label={t("Modifier", "Edit")}>
                {d.url ? <img src={`${d.url}?v=${d.version}`} alt={d.title} className="absolute inset-0 size-full object-contain" loading="lazy" /> : <span className="absolute inset-0 grid place-items-center text-xs text-muted">{t("Aperçu à venir", "Preview pending")}</span>}
                {d.edited && <span className="absolute left-2 top-2"><Badge tone="ok">{t("Modifiée", "Edited")}</Badge></span>}
              </button>
              <div className="grid gap-2 p-3">
                <p className="line-clamp-2 text-sm font-medium" title={d.title}>{d.title || "—"}</p>
                <p className="text-xs text-muted">{d.platform ? PLATFORM_LABEL[d.platform] ?? d.platform : ""} · {d.aspect} · v{d.version}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" icon={<PenLine className="size-3.5" />} onClick={() => setOpen(d.docKey)} data-testid="edit-creative">{t("Modifier", "Edit")}</Button>
                  <a href={`/api/projects/${id}/ads/docs/${encodeURIComponent(d.docKey)}?export=png`} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-2 hover:bg-paper-2" download>
                    <Download className="size-3.5" /> PNG
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={t("Créer des publicités", "Create ads")}>
        {form && (
          <div className="grid gap-4">
            <Field label={t("Nombre d'angles", "Number of angles")}>
              <Input type="number" min={1} max={6} value={form.count} onChange={(e) => setForm({ ...form, count: Math.max(1, Math.min(6, +e.target.value || 1)) })} />
            </Field>
            <Field label={t("Réseaux", "Networks")}>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const on = form.platforms.includes(p);
                  return (
                    <button key={p} type="button" onClick={() => setForm({ ...form, platforms: on ? form.platforms.filter((x) => x !== p) : [...form.platforms, p] })} className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-ink bg-ink text-paper" : "border-line"}`} aria-pressed={on}>
                      {PLATFORM_LABEL[p]}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label={t("Offre réelle (facultatif)", "Real offer (optional)")} hint={t("Sans offre, aucune promotion n'est écrite.", "Without an offer, no promotion is written.")}>
              <Input value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder={t("ex. Livraison offerte dès 50 €", "e.g. Free shipping over €50")} />
            </Field>
            <Field label={t("Public visé (facultatif)", "Target audience (optional)")}>
              <Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setForm(null)}>{t("Annuler", "Cancel")}</Button>
              <Button onClick={generate} loading={busy} disabled={form.platforms.length === 0} data-testid="confirm-create-ads">{t("Créer", "Create")}</Button>
            </div>
          </div>
        )}
      </Modal>
      {open && (
        <AdEditor
          projectId={id}
          docKey={open}
          onClose={() => {
            setOpen(null);
            reload();
          }}
        />
      )}
      {cost.dialog}
    </section>
  );
}
