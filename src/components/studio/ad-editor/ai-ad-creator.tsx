"use client";
/**
 * Publicités › Publicité image : création guidée entièrement par l'IA d'images (Qwen). Le client choisit le produit ou
 * le service, décrit librement le visuel voulu et le format ; le prix s'affiche avant, rien ne part sans son clic.
 * Trois essais au plus (textes relus lettre par lettre) ; sinon le blocage est signalé sans remplacement.
 */
import { useEffect, useRef, useState } from "react";
import { Download, Wand2 } from "lucide-react";
import { api, Button, Card, cx, useApi, useToast } from "../../ui";
import { useLang, useT } from "../../i18n";
import { useProject } from "../project-context";
import { JobProgress, SectionTitle, useActive } from "../common";
import { useBudgetPct } from "../../billing-client";
import { AiImageActions } from "../ai-image-actions";
import {
  SubjectPicker,
  subjectChoice,
  type SubjectView,
} from "../subject-picker";

type AiAd = {
  id: string;
  url: string;
  aspect: string | null;
  subject: string | null;
  request: string | null;
  at: number;
};
type Campaigns = { access?:boolean; aiAds: AiAd[]; ai: boolean; subjects: SubjectView[] };
const ASPECTS = [
  { aspect: "4:5", fr: "Portrait 4:5", en: "Portrait 4:5" },
  { aspect: "1:1", fr: "Carré 1:1", en: "Square 1:1" },
  { aspect: "2:3", fr: "Pinterest 2:3", en: "Pinterest 2:3" },
  { aspect: "9:16", fr: "Story 9:16", en: "Story 9:16" },
  { aspect: "16:9", fr: "Paysage 16:9", en: "Landscape 16:9" },
] as const;

export function AiAdCreator({ onDone }: { onDone?: () => void }) {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const budget = useBudgetPct();
  const toast = useToast();
  const { data, reload } = useApi<Campaigns>(
    `/api/projects/${id}/campaigns/v2`,
  );
  const jobs = useActive(["image.ai_post", "ads.v2"]);
  const [subjectKey, setSubjectKey] = useState("");
  const [request, setRequest] = useState("");
  const [aspect, setAspect] =
    useState<(typeof ASPECTS)[number]["aspect"]>("4:5");
  const [quote, setQuote] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const operation = useRef<string | null>(null);
  useEffect(() => {
    operation.current = null;
  }, [request, subjectKey, aspect]);
  useEffect(() => {
    const refresh = () => {
      void reload();
    };
    window.addEventListener("ecs:ad-creations-ready", refresh);
    return () => window.removeEventListener("ecs:ad-creations-ready", refresh);
  }, [reload]);
  const subjects = data?.subjects ?? [];
  useEffect(() => {
    if (!subjectKey && subjects[0]) setSubjectKey(subjects[0].key);
  }, [subjects, subjectKey]);
  useEffect(() => {
    api<{ estimateMicro: number }>(`/api/projects/${id}/campaigns/v2`, {
      body: { action: "ai_quote" },
    })
      .then((r) => setQuote(r.estimateMicro))
      .catch(() => setQuote(null));
  }, [id]);
  // Fin de la création : la liste se recharge d'elle-même.
  const running = jobs.length > 0;
  const was = useRef(running);
  useEffect(() => {
    if (was.current && !running) {
      reload();
      onDone?.();
    }
    was.current = running;
  }, [running, reload, onDone]);
  const create = async () => {
    if (quote == null) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}/campaigns/v2`, {
        body: {
          action: "ai_create",
          operationId:
            operation.current ?? (operation.current = crypto.randomUUID()),
          subject: subjectChoice(
            subjects.find((s) => s.key === subjectKey) ?? subjects[0],
          ),
          request: request.trim() || undefined,
          aspect,
          approvedEstimateMicro: quote,
        },
      });
      operation.current = null;
      await reload();
      toast(
        "ok",
        t(
          "Publicité en création par l'IA : elle apparaît ici dès qu'elle est prête.",
          "Ad being created by AI: it appears here as soon as it's ready.",
        ),
      );
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const ads = data?.aiAds ?? [];
  if(data?.access===false)return <Card className="mb-6 p-5" data-ad-plan-lock>{t("La publicité et l’aide aux campagnes sont incluses avec Dominer. Vos créations existantes restent conservées et accessibles.","Advertising and campaign assistance are included with Dominate. Existing creations remain kept and accessible.")}</Card>;
  return (
    <section className="mb-8" data-ai-ad-creator>
      <SectionTitle title={t("Publicité conçue par l'IA", "Ad designed by AI")}>
        {t(
          "Choisissez le produit ou le service, décrivez votre idée : l'IA crée la publicité complète (scène, mise en page, textes) avec votre vrai produit et votre marque.",
          "Pick the product or service, describe your idea: the AI creates the whole ad (scene, layout, copy) with your real product and brand.",
        )}
      </SectionTitle>
      <Card className="grid gap-4 p-5">
        {jobs[0] && <JobProgress job={jobs[0]} />}
        {data && !data.ai ? (
          <p className="text-sm text-muted">
            {t(
              "L'IA n'est pas active pour ce projet (forfait Découverte, budget IA épuisé ou fournisseur désactivé) : la création attend une configuration utilisable, aucun gabarit de secours.",
              "AI isn't active for this project (Discovery plan, AI budget used up or provider disabled): creation waits for a usable configuration, without a template fallback.",
            )}
          </p>
        ) : (
          <>
            <SubjectPicker
              subjects={subjects}
              value={subjectKey}
              onChange={setSubjectKey}
              request={request}
              onRequest={setRequest}
              idPrefix="ai-ad"
              surface="ad_image"
            />
            <div>
              <p className="mb-1.5 text-sm font-medium">
                {t("Format", "Format")}
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label={t("Format", "Format")}
              >
                {ASPECTS.map((f) => (
                  <button
                    key={f.aspect}
                    type="button"
                    role="radio"
                    aria-checked={aspect === f.aspect}
                    onClick={() => setAspect(f.aspect)}
                    className={cx(
                      "rounded-full border px-3 py-1.5 text-sm",
                      aspect === f.aspect
                        ? "border-ink bg-ink text-paper"
                        : "border-line",
                    )}
                    data-ai-ad-format={f.aspect}
                  >
                    {t(f.fr, f.en)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                {quote == null
                  ? t("Calcul du prix…", "Calculating the price…")
                  : t(
                      <>
                        Coût probable : <strong>{budget.label(quote)}</strong>.
                        Si le contrôle demande un nouvel essai, il est décompté
                        et vous êtes prévenu.
                      </>,
                      <>
                        Likely cost: <strong>{budget.label(quote)}</strong>. If
                        the check needs another attempt, it is counted and you
                        are told.
                      </>,
                    )}
              </p>
              <Button
                onClick={create}
                loading={busy}
                disabled={busy || running || quote == null || !subjects.length}
                icon={<Wand2 className="size-4" />}
                className="h-auto min-h-10 w-full py-2 sm:w-auto"
                data-ai-ad-submit
              >
                <span className="min-w-0 whitespace-normal text-center">
                  {t("Créer la publicité", "Create the ad")}
                  {quote != null ? ` · ${budget.label(quote)}` : ""}
                </span>
              </Button>
            </div>
          </>
        )}
      </Card>
      {ads.length > 0 && (
        <div
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          data-ai-ads
        >
          {ads.map((a) => (
            <Card key={a.id} className="overflow-hidden p-0">
              <img
                src={a.url}
                alt={a.subject ?? ""}
                className="w-full bg-paper-2 object-contain"
                style={{ aspectRatio: (a.aspect ?? "4:5").replace(":", " / ") }}
                loading="lazy"
              />
              <div className="flex items-center justify-between gap-2 p-3">
                <p
                  className="truncate text-xs text-muted"
                  title={a.request ?? ""}
                >
                  {a.subject ?? "—"} · {a.aspect}
                </p>
                <a
                  href={`${a.url}?download=1`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-2 hover:bg-paper-2"
                  download
                >
                  <Download className="size-3.5" /> PNG
                </a>
              </div>
              <div className="border-t border-line p-2">
                <AiImageActions
                  projectId={id}
                  assetId={a.id}
                  aspect={a.aspect}
                  onChanged={reload}
                  compact
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
