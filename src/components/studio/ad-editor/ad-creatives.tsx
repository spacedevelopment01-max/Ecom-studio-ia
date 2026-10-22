"use client";
/**
 * Section « Créations publicitaires » de l'onglet Publicités (moteur publicitaire V2) : créer des publicités, voir
 * les propositions, ouvrir l'une d'elles dans l'éditeur visuel (« Modifier »), exporter. Les créations modifiées par
 * le client portent un badge et ne sont jamais écrasées par une nouvelle génération.
 */
import { useEffect, useRef, useState } from "react";
import { Download, PenLine, Sparkles } from "lucide-react";
import {
  api,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Input,
  Modal,
  useApi,
  useToast,
} from "../../ui";
import { useT } from "../../i18n";
import { useProject } from "../project-context";
import { JobProgress, SectionTitle, useActive } from "../common";
import { useBudgetPct } from "../../billing-client";
import { AnimatePost } from "../animate-post";
import { StyleGallery } from "../style-gallery";
import dynamic from "next/dynamic";
// Éditeur à calques (le plus lourd du studio) : chargé seulement à son ouverture.
const AdEditor = dynamic(() => import("./ad-editor").then((m) => m.AdEditor), {
  ssr: false,
});

type DocItem = {
  docKey: string;
  version: number;
  source: string;
  edited: boolean;
  aspect: string | null;
  platform: string | null;
  width: number | null;
  height: number | null;
  title: string;
  url: string | null;
  at: number;
};

const PLATFORM_LABEL: Record<string, string> = {
  meta_feed: "Facebook / Instagram",
  meta_story: "Stories / Reels",
  tiktok: "TikTok",
  google_display: "Google",
  pinterest: "Pinterest",
  linkedin: "LinkedIn",
};

type AdAspect = "4:5" | "1:1" | "9:16" | "16:9" | "1.91:1";
/** Formats proposés au client (et le réseau qui les porte). */
const FORMAT_OPTIONS: {
  aspect: AdAspect;
  platform: string;
  fr: string;
  en: string;
}[] = [
  {
    aspect: "4:5",
    platform: "meta_feed",
    fr: "Publication portrait 4:5",
    en: "Portrait post 4:5",
  },
  {
    aspect: "1:1",
    platform: "meta_feed",
    fr: "Publication carrée 1:1",
    en: "Square post 1:1",
  },
  {
    aspect: "9:16",
    platform: "meta_story",
    fr: "Story / Reel 9:16",
    en: "Story / Reel 9:16",
  },
  {
    aspect: "16:9",
    platform: "linkedin",
    fr: "Paysage 16:9",
    en: "Landscape 16:9",
  },
  {
    aspect: "1.91:1",
    platform: "google_display",
    fr: "Bannière 1.91:1",
    en: "Banner 1.91:1",
  },
];

export function AdCreatives() {
  const { id, data } = useProject();
  const t = useT();
  const toast = useToast();
  const budget = useBudgetPct();
  const { data: list, reload } = useApi<{ docs: DocItem[] }>(
    `/api/projects/${id}/ads/docs`,
  );
  const jobs = useActive("ads.v2");
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{
    count: number;
    aspect: AdAspect;
    offer: string;
    audience: string;
  } | null>(null);
  const [derive, setDerive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<{
    estimateMicro: number;
    ready: boolean;
    reason: string | null;
    concepts: number;
  } | null>(null);
  const operation = useRef<string | null>(null);
  useEffect(() => {
    operation.current = null;
  }, [form?.count, form?.aspect, form?.offer, form?.audience]);
  useEffect(() => {
    if (!form) {
      setQuote(null);
      return;
    }
    let live = true;
    setQuote(null);
    api<any>(`/api/projects/${id}/campaigns/v2`, {
      body: {
        action: "campaign_quote",
        count: form.count,
        platforms: [
          FORMAT_OPTIONS.find((f) => f.aspect === form.aspect)!.platform,
        ],
        aspects: [form.aspect],
      },
    }).then(
      (r) => {
        if (live) setQuote(r);
      },
      () => {
        if (live) setQuote(null);
      },
    );
    return () => {
      live = false;
    };
  }, [id, form?.count, form?.aspect]);
  // Fin d'une génération : la liste se recharge d'elle-même.
  const running = jobs.length > 0;
  const was = useRef(running);
  useEffect(() => {
    if (was.current && !running) reload();
    was.current = running;
  }, [running, reload]);

  const generate = async () => {
    if (!form || !quote?.ready) return;
    setBusy(true);
    try {
      const r = await api<{ jobId: string }>(
        `/api/projects/${id}/campaigns/v2`,
        {
          body: {
            action: "generate",
            operationId:
              operation.current ?? (operation.current = crypto.randomUUID()),
            approvedEstimateMicro: quote.estimateMicro,
            count: form.count,
            platforms: [
              FORMAT_OPTIONS.find((f) => f.aspect === form.aspect)!.platform,
            ],
            aspects: [form.aspect],
            offer: form.offer.trim() || undefined,
            audience: form.audience.trim() || undefined,
          },
        },
      );
      toast(
        "ok",
        t(
          "Création des publicités lancée : elles apparaissent ici dès qu'elles sont prêtes.",
          "Ads are being created: they appear here as soon as they're ready.",
        ),
      );
      setForm(null);
      operation.current = null;
      setBusy(false);
      // Suivi de la tâche : la liste se met à jour dès qu'elle est finie (même si elle a duré moins d'une actualisation).
      for (let i = 0; i < 400; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        const jobs = await api<{
          jobs: { id: string; status: string; error: string | null }[];
        }>(`/api/projects/${id}/jobs?type=ads.v2`);
        const j = jobs.jobs.find((x) => x.id === r.jobId);
        if (
          j &&
          (j.status === "queued" ||
            j.status === "running" ||
            j.status === "paused")
        )
          continue;
        await reload();
        if (j?.status === "failed")
          toast(
            "bad",
            j.error ||
              t(
                "La création des publicités a échoué.",
                "Creating the ads failed.",
              ),
          );
        else {
          window.dispatchEvent(new Event("ecs:ad-creations-ready"));
          toast(
            "ok",
            t(
              "Traitement terminé : consultez les créations IA disponibles ci-dessus et les éventuels blocages de la tâche.",
              "Processing finished: check the available AI creatives above and any task blocks.",
            ),
          );
        }
        return;
      }
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Autre format : d'abord un APERÇU (rien n'est créé) ; la copie n'est créée que si le client valide ce format.
  // Même photo et mêmes textes, mise en page recomposée (aucune IA, gratuit) ; modifiable ensuite dans l'éditeur.
  const [preview, setPreview] = useState<{
    docKey: string;
    f: (typeof FORMAT_OPTIONS)[number];
    image: string;
  } | null>(null);
  const reformat = async (
    docKey: string,
    f: (typeof FORMAT_OPTIONS)[number],
  ) => {
    setDerive(docKey);
    try {
      const r = await api<{ preview: { image: string } }>(
        `/api/projects/${id}/ads/docs/${encodeURIComponent(docKey)}`,
        {
          body: {
            action: "preview_reflow",
            platform: f.platform,
            aspect: f.aspect,
          },
        },
      );
      setPreview({ docKey, f, image: r.preview.image });
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setDerive(null);
    }
  };
  const validateFormat = async (edit: boolean) => {
    if (!preview) return;
    setDerive(preview.docKey);
    try {
      const v = await api<{ docKey: string }>(
        `/api/projects/${id}/ads/docs/${encodeURIComponent(preview.docKey)}`,
        {
          body: {
            action: "reflow",
            platform: preview.f.platform,
            aspect: preview.f.aspect,
          },
        },
      );
      await reload();
      toast(
        "ok",
        t(
          `Format ${preview.f.aspect} ajouté à vos créations (même photo, sans frais).`,
          `${preview.f.aspect} format added to your creatives (same photo, free).`,
        ),
      );
      setPreview(null);
      if (edit) setOpen(v.docKey);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setDerive(null);
    }
  };

  const docs = list?.docs ?? [];
  return (
    <section data-testid="ad-creatives">
      <SectionTitle
        title={t("Créations publicitaires", "Ad creatives")}
        action={
          <Button
            variant="signal"
            icon={<Sparkles className="size-4" />}
            disabled={running || !data?.brand || data.plan!=="dominer"}
            onClick={() =>
              setForm({
                count: 2,
                aspect: "4:5",
                offer: "",
                audience: data?.brand?.audience ?? "",
              })
            }
            data-testid="create-ads"
          >
            {t("Créer des publicités", "Create ads")}
          </Button>
        }
      >
        {t(
          "Les nouvelles créations IA apparaissent au-dessus. Les documents à calques conservés restent modifiables ici gratuitement. Une nouvelle campagne utilise le budget IA annoncé avant le lancement.",
          "New AI creatives appear above. Preserved layered documents remain editable here for free. A new campaign uses the AI budget quoted before starting.",
        )}
      </SectionTitle>
      {jobs[0] && <JobProgress job={jobs[0]} className="mb-4" />}
      {docs.length === 0 ? (
        !running && (
          <Empty
            title={t(
              "Aucun document à calques conservé",
              "No preserved layered documents",
            )}
            icon={<Sparkles className="size-5" />}
          >
            {t(
              "Les nouvelles images IA se retrouvent au-dessus et dans Fichiers. Vos anciens documents restent accessibles ici.",
              "New AI images appear above and in Files. Your previous documents remain available here.",
            )}
          </Empty>
        )
      ) : (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          data-testid="creatives-list"
        >
          {docs.map((d) => (
            <Card
              key={d.docKey}
              className="flex flex-col overflow-hidden p-0"
              data-testid="creative"
            >
              <button
                type="button"
                onClick={() => setOpen(d.docKey)}
                className="group relative block bg-paper-2"
                style={{
                  aspectRatio:
                    d.width && d.height ? `${d.width} / ${d.height}` : "1 / 1",
                }}
                aria-label={t("Modifier", "Edit")}
              >
                {d.url ? (
                  <img
                    src={`${d.url}?v=${d.version}`}
                    alt={d.title}
                    className="absolute inset-0 size-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-xs text-muted">
                    {t("Aperçu à venir", "Preview pending")}
                  </span>
                )}
                {d.edited && (
                  <span className="absolute left-2 top-2">
                    <Badge tone="ok">{t("Modifiée", "Edited")}</Badge>
                  </span>
                )}
              </button>
              <div className="grid gap-2 p-3">
                <p className="line-clamp-2 text-sm font-medium" title={d.title}>
                  {d.title || "—"}
                </p>
                <p className="text-xs text-muted">
                  {d.platform ? (PLATFORM_LABEL[d.platform] ?? d.platform) : ""}{" "}
                  · {d.aspect} · v{d.version}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    icon={<PenLine className="size-3.5" />}
                    onClick={() => setOpen(d.docKey)}
                    data-testid="edit-creative"
                  >
                    {t("Modifier", "Edit")}
                  </Button>
                  <a
                    href={`/api/projects/${id}/ads/docs/${encodeURIComponent(d.docKey)}?export=png`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-2 hover:bg-paper-2"
                    download
                  >
                    <Download className="size-3.5" /> PNG
                  </a>
                </div>
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  aria-label={t("Autres formats", "Other formats")}
                >
                  <span className="text-xs text-muted">
                    {t("Autres formats :", "Other formats:")}
                  </span>
                  {FORMAT_OPTIONS.filter((f) => f.aspect !== d.aspect).map(
                    (f) => (
                      <button
                        key={f.aspect}
                        type="button"
                        disabled={derive === d.docKey}
                        onClick={() => reformat(d.docKey, f)}
                        className="rounded-full border border-line px-2 py-0.5 text-xs hover:bg-paper-2 disabled:opacity-50"
                        title={t(
                          `Voir l'aperçu en ${f.fr} (même photo, gratuit)`,
                          `Preview in ${f.en} (same photo, free)`,
                        )}
                        data-testid={`derive-${f.aspect}`}
                      >
                        {f.aspect}
                      </button>
                    ),
                  )}
                </div>
                <StyleGallery
                  projectId={id}
                  docKey={d.docKey}
                  compact
                  onApplied={reload}
                />
                <AnimatePost projectId={id} docKey={d.docKey} compact />
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={
          preview
            ? t(
                `Aperçu au format ${preview.f.fr}`,
                `Preview in ${preview.f.en}`,
              )
            : ""
        }
      >
        {preview && (
          <div className="grid gap-3" data-testid="format-preview">
            <img
              src={preview.image}
              alt={t("Aperçu du format", "Format preview")}
              className="mx-auto max-h-[60vh] w-auto rounded-lg border border-line object-contain"
            />
            <p className="text-xs text-muted">
              {t(
                "Simple aperçu : rien n'est créé tant que vous ne validez pas. Après validation, vous pourrez la modifier dans l'éditeur autant de fois que vous voulez.",
                "Preview only: nothing is created until you confirm. Once confirmed, you can edit it in the editor as many times as you like.",
              )}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setPreview(null)}
                data-testid="format-cancel"
              >
                {t("Annuler", "Cancel")}
              </Button>
              <Button
                variant="secondary"
                disabled={!!derive}
                onClick={() => validateFormat(true)}
                data-testid="format-validate-edit"
              >
                {t("Valider et modifier", "Confirm and edit")}
              </Button>
              <Button
                disabled={!!derive}
                onClick={() => validateFormat(false)}
                data-testid="format-validate"
              >
                {t("Valider ce format", "Confirm this format")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={t("Créer des publicités", "Create ads")}
      >
        {form && (
          <div className="grid gap-4">
            <Field
              label={t(
                "Nombre d'images différentes",
                "Number of different images",
              )}
              hint={t(
                "Une publicité par image, chacune avec sa propre photo et son propre texte.",
                "One ad per image, each with its own photo and copy.",
              )}
            >
              <Input
                type="number"
                min={1}
                max={6}
                value={form.count}
                onChange={(e) =>
                  setForm({
                    ...form,
                    count: Math.max(1, Math.min(6, +e.target.value || 1)),
                  })
                }
                data-testid="ads-count"
              />
            </Field>
            <Field
              label={t("Format", "Format")}
              hint={t(
                "Un aperçu avec marges est gratuit ; une recomposition IA dans un autre format fait l’objet d’un devis.",
                "A letterboxed preview is free; AI recomposition in another format is quoted separately.",
              )}
            >
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {FORMAT_OPTIONS.map((f) => {
                  const on = form.aspect === f.aspect;
                  return (
                    <button
                      key={f.aspect}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setForm({ ...form, aspect: f.aspect })}
                      className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-ink bg-ink text-paper" : "border-line"}`}
                      data-testid={`ads-format-${f.aspect}`}
                    >
                      {t(f.fr, f.en)}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field
              label={t("Offre réelle (facultatif)", "Real offer (optional)")}
              hint={t(
                "Sans offre, aucune promotion n'est écrite.",
                "Without an offer, no promotion is written.",
              )}
            >
              <Input
                value={form.offer}
                onChange={(e) => setForm({ ...form, offer: e.target.value })}
                placeholder={t(
                  "ex. Livraison offerte dès 50 €",
                  "e.g. Free shipping over €50",
                )}
              />
            </Field>
            <Field
              label={t(
                "Public visé (facultatif)",
                "Target audience (optional)",
              )}
            >
              <Input
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
              />
            </Field>
            <p className="text-sm">
              {quote?.ready
                ? t(
                    `Coût probable : ${budget.label(quote.estimateMicro)} pour ${quote.concepts} création(s). Les reprises éventuelles sont annoncées et plafonnées.`,
                    `Likely cost: ${budget.label(quote.estimateMicro)} for ${quote.concepts} creative(s). Retries are announced and capped.`,
                  )
                : (quote?.reason ??
                  t("Calcul du devis…", "Calculating quote…"))}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setForm(null)}>
                {t("Annuler", "Cancel")}
              </Button>
              <Button
                onClick={generate}
                disabled={!quote?.ready}
                loading={busy}
                data-testid="confirm-create-ads"
              >
                {t("Créer", "Create")}
              </Button>
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
    </section>
  );
}
