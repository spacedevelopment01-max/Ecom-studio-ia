"use client";
import { MarketingStrategy } from "./marketing-strategy";
import {GuidedVideo} from "./guided-video";
import { LogoV2Panel } from "./logo-v2-panel";
import { InitialCreatives } from "./initial-creatives";
import { InitialAuthorization } from "./initial-authorization";
import { PreparationHandoff } from "./preparation-handoff";
import {
  cloneElement,
  isValidElement,
  useId,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
} from "react";
import {
  api,
  Badge,
  Button as BaseButton,
  Card,
  Field as BaseField,
  Input,
  Select,
  Textarea,
  useApi,
} from "../ui";
import { useProject, type JobView } from "./project-context";
import { JobProgress } from "./common";
import { useT } from "../i18n";
import { ContentPanel } from "./content-panel";
import {
  STEPS,
  type Input as BriefInput,
  type ReadyContract,
  type State,
  type Step,
  type VisualSlot,
  type ThemeRecommendation,
} from "@/lib/preparation/types";
import { REFERENCE_THEMES } from "@/lib/project-handoff/categories";
function Button(props: ComponentProps<typeof BaseButton>) {
  return (
    <BaseButton
      {...props}
      className={`max-w-full py-2 ${props.className || ""}`}
      style={{
        whiteSpace: "normal",
        height: "auto",
        minHeight: 40,
        ...props.style,
      }}
    />
  );
}
/** Libellés associés aux champs : navigation clavier et lecteurs d’écran. */
function Field(props: ComponentProps<typeof BaseField>) {
  const id = useId();
  return (
    <BaseField {...props} htmlFor={id}>
      {isValidElement(props.children)
        ? cloneElement(
          props.children as ReactElement<{
            id?: string;
            "aria-label"?: string;
          }>,
          { id, "aria-label": props.label },
        )
        : props.children}
    </BaseField>
  );
}
type AssetView = {
  kind?: string;
  id: string;
  name: string;
  role: string;
  origin: string;
  status: string;
  verdict: string | null;
  url: string;
};
type View = {
  state: State;
  job: JobView | null;
  recoverable?: boolean;
  recovering?: boolean;
  ready: ReadyContract | null;
  blockers: string[];
  history: { revision: number; at: number }[];
  assets: AssetView[];
};
const LABEL: Record<Step, [string, string]> = {
  brief: ["Votre offre", "Your offer"],
  research: ["Recherche et stratégie", "Research and strategy"],
  brand: ["Votre marque", "Your brand"],
  content: ["Contenus et plan du site", "Content and site plan"],
  media: ["Visuels et préparation finale", "Visuals and final preparation"],
};
function RecommendedReferences({ recommendation: r }: { recommendation: ThemeRecommendation }) {
  const t = useT();
  const references = [r.recommendedReferenceId, ...(r.alternativesReferenceIds ?? [])].filter((referenceId): referenceId is NonNullable<typeof referenceId> => !!referenceId);
  const active = REFERENCE_THEMES.filter(reference => references.includes(reference.referenceId));
  return <section className="grid gap-3 rounded-xl border border-line p-4" data-recommendation-references>
    <h3 className="font-semibold">{t("Références de thème pour votre offre", "Theme references for your offer")}</h3>
    {active.map(reference => <div key={reference.referenceId} data-recommendation-reference={reference.referenceId}>
      <p className="font-medium">{reference.name}{r.recommendedReferenceId === reference.referenceId ? t(" — référence conseillée", " — recommended reference") : ""}</p>
    </div>)}
    {r.reasons.map((reason, i) => <p key={i} className="text-sm">{reason}</p>)}
    {r.status === "clarification_required"
      ? <p className="text-sm" role="status" data-recommendation-clarification>{t("Confirmez le type de site adapté à votre offre. Vos textes et médias restent enregistrés ; aucune ancienne démonstration n’est choisie à votre place.", "Confirm the website category that fits your offer. Your copy and media remain saved; no former demonstration is selected for you.")}</p>
      : <p className="text-sm" role="status" data-recommendation-pending>{t("Ces références sont consultables dans Boutique. Préparez et validez vos textes et médias avant de choisir et construire votre thème. Aucun thème installé n’est modifié à cette étape.", "View these reference themes in Storefront. Prepare and approve copy and media before choosing and building your theme. No installed theme is changed at this stage.")}</p>}
    {r.selectedId && <p className="text-xs">{t("Votre ancien choix reste conservé avec votre projet et ses versions. Il ne fait plus partie des nouvelles sélections.", "Your former selection is preserved with the project and its versions. It is no longer offered for new selections.")}</p>}
  </section>;
}
export default function TabPreparation() {
  const { id, reload: reloadProject } = useProject();
  const t = useT();
  const endpoint = `/api/projects/${id}/preparation`;
  const {
    data,
    reload,
    error: loadError,
  } = useApi<View>(endpoint, { poll: 3000 });
  const [active, setActive] = useState<Step>("brief"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [form, setForm] = useState<BriefInput | null>(null),
    [urls, setUrls] = useState(""),
    [choice, setChoice] = useState(""),
    [logo, setLogo] = useState(""),
    [name, setName] = useState(""),
    [tagline, setTagline] = useState(""),
    [correction, setCorrection] = useState("");
  const [palette, setPalette] = useState<Record<string, string>>({}),
    [fonts, setFonts] = useState({ heading: "", body: "" });
  const [quote, setQuote] = useState<{
    id: string;
    paid: boolean;
    maxBudgetPct: number | null;
    note: string;
  } | null>(null);
  const resumed = useRef(false);
  const state = data?.state;
  const raw = state?.stages.brief?.data.input;
  const identity = state?.stages.brand?.data;
  useEffect(() => {
    if (state && !resumed.current) {
      resumed.current = true;
      setActive(
        STEPS.find((k) => state.stages[k]?.status !== "approved") || "media",
      );
    }
  }, [state]);
  useEffect(() => {
    if (raw) {
      setForm(raw);
      setUrls(raw.referenceUrls.join("\n"));
    }
  }, [JSON.stringify(raw)]);
  useEffect(() => {
    if (identity) {
      setName(identity.proposal.name);
      setTagline(identity.proposal.tagline);
      setPalette(identity.proposal.palette);
      setFonts(identity.proposal.fonts);
      setLogo(identity.selectedLogo || "");
    }
  }, [
    identity?.proposal.name,
    identity?.proposal.tagline,
    JSON.stringify(identity?.proposal.palette),
    JSON.stringify(identity?.proposal.fonts),
    identity?.selectedLogo,
  ]);
  async function send(body: Record<string, unknown>) {
    if (!state) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<View>(endpoint, {
        body: { ...body, revision: state.revision },
      });
      await reload();
      await reloadProject();
      return r;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function prepare(step: Step, runAction = "generate", slot?: string) {
    if (!state) return;
    if (
      (step === "brief" && JSON.stringify(form) !== JSON.stringify(raw)) ||
      (step === "research" &&
        JSON.stringify(
          urls
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
        ) !== JSON.stringify(raw?.referenceUrls ?? [])) ||
      (runAction === "logo" &&
        identity &&
        (name !== identity.proposal.name ||
          tagline !== identity.proposal.tagline ||
          JSON.stringify(palette) !==
          JSON.stringify(identity.proposal.palette) ||
          JSON.stringify(fonts) !== JSON.stringify(identity.proposal.fonts)))
    ) {
      setError(
        "Enregistrez ou validez vos modifications avant de préparer cette proposition.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api<{ quote: NonNullable<typeof quote> }>(endpoint, {
        body: {
          action: "quote",
          step,
          runAction,
          slot,
          revision: state.revision,
        },
      });
      if (r.quote.paid) setQuote(r.quote);
      else await send({ action: "generate", quoteId: r.quote.id, correction });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const saveBrief = async () => {
    const r = await send({ action: "edit-brief", input: form });
    if (r) {
      setError("");
    }
  };
  const approve = async (step: Step) => {
    const r = await send({
      action: "approve",
      step,
      choiceId:
        choice ||
        state?.stages.research?.data.selectedId ||
        state?.stages.research?.data.recommendedId,
      logoId: logo,
    });
    if (r && step !== "media") setActive(STEPS[STEPS.indexOf(step) + 1]);
  };
  async function restore(version: number) {
    const r = await send({ action: "restore", version });
    if (!r) return;
    const input = r.state.stages.brief?.data.input;
    if (input) {
      setForm(input);
      setUrls(input.referenceUrls.join("\n"));
    }
    const brand = r.state.stages.brand?.data;
    setChoice(r.state.stages.research?.data.selectedId || "");
    setLogo(brand?.selectedLogo || "");
    if (brand) {
      setName(brand.proposal.name);
      setTagline(brand.proposal.tagline);
      setPalette(brand.proposal.palette);
      setFonts(brand.proposal.fonts);
    }
    setActive("brief");
  }

  if (!data || !state || !form)
    return (
      <Card className="p-6">
        {loadError ||
          t("Chargement de votre préparation…", "Loading your preparation…")}
      </Card>
    );
  const approved = (s: Step) => state.stages[s]?.status === "approved";
  const enabled = STEPS.slice(0, STEPS.indexOf(active)).every(approved);
  const working = !!data.job && ["queued", "running", "paused"].includes(data.job.status);
  const pendingProblem = state.pending && !working ? data.job?.error || t("Le traitement s’est arrêté avant la livraison. Vos données et les résultats acquis sont conservés. Vérifiez le point signalé avant une nouvelle demande.", "Processing stopped before delivery. Your data and acquired results are kept. Check the reported issue before a new request.") : "";
  const briefDirty = JSON.stringify(form) !== JSON.stringify(raw);
  const referencesDirty =
    JSON.stringify(
      urls
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
    ) !== JSON.stringify(raw?.referenceUrls ?? []);
  const identityDirty =
    !!identity &&
    (name !== identity.proposal.name ||
      tagline !== identity.proposal.tagline ||
      JSON.stringify(palette) !== JSON.stringify(identity.proposal.palette) ||
      JSON.stringify(fonts) !== JSON.stringify(identity.proposal.fonts));
  const field = (key: keyof BriefInput, value: unknown) =>
    setForm({ ...form, [key]: value });
  return (
    <div className="grid gap-5" data-preparation>
      <InitialCreatives onChange={reload}/>
      <InitialAuthorization/>
      {approved("research") && <MarketingStrategy projectId={id} onChange={reload}/> }
      {(active === 'content' || active === 'media') && <PreparationHandoff onChange={reload}/>}
      <Card className="p-5 sm:p-7">
        <p className="text-sm text-muted">
          {t(
            "Construisons les bases de votre projet",
            "Build your project foundations",
          )}
        </p>
        <h1 className="font-display text-3xl">
          {data.ready?.handoff?.status === 'ready'
            ? t(
              "Votre projet est prêt pour le thème",
              "Your project is ready for the theme",
            )
            : t(
              "Votre offre, votre marque, vos contenus",
              "Your offer, your brand, your content",
            )}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          {t(
            "Vous choisissez les orientations importantes. Le studio conserve vos informations et vos versions. Chaque création IA payante demande votre accord sur son devis. Aucun thème ni publication n’est lancé à cette étape.",
            "You choose the important directions. The studio keeps your information and versions. Each paid AI creation requires your quote approval. No theme or publishing starts at this stage.",
          )}
        </p>
        {state.simulation && (
          <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm" role="note">
            Parcours de vérification : réponses fournisseurs simulées et médias
            synthétiques. Aucun appel IA réel ni coût fournisseur.
          </p>
        )}
        <ol className="mt-5 grid gap-2 sm:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step}>
              <button
                type="button"
                onClick={() => {
                  setActive(step);
                  setQuote(null);
                }}
                className={`w-full rounded-xl border p-3 text-left text-sm ${step === active ? "border-signal bg-signal-soft" : "border-line"}`}
                aria-current={step === active ? "step" : undefined}
              >
                <span>
                  {i + 1}. {t(...LABEL[step])}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {approved(step)
                    ? t("Validé", "Approved")
                    : state.stages[step]?.status === "stale"
                      ? t(
                        "À reprendre : choix modifié",
                        "Needs update: choice changed",
                      )
                      : state.stages[step]
                        ? t("À vérifier", "To review")
                        : t("À préparer", "To prepare")}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </Card>
      {(error || loadError || !working && (state.error || pendingProblem)) && (
        <Card className="border-bad p-4" role="alert">
          <p>{error || loadError || state.error?.message || pendingProblem}</p>
          <p className="mt-2 text-sm text-muted">
            {t(
              "Vos résultats précédents sont conservés. Corrigez le point signalé avant de demander un nouvel essai.",
              "Your previous results are kept. Fix the reported issue before requesting another attempt.",
            )}
          </p>
          {data.recoverable && <div className="mt-3 grid gap-2">
            <p className="text-sm">{t("Récupérez les étapes déjà acquises sans nouvelle génération payante. Si un nouvel essai est nécessaire, son devis reste obligatoire.", "Recover acquired steps without a new paid generation. If a new attempt is needed, its quote is still required.")}</p>
            <Button disabled={busy || briefDirty || referencesDirty || identityDirty} onClick={() => send({ action: "recover" })} data-recover-preparation>{t("Récupérer les étapes acquises", "Recover acquired steps")}</Button>
            {(briefDirty || referencesDirty || identityDirty) && <p className="text-sm">{t("Enregistrez vos modifications avant de récupérer les étapes.", "Save your edits before recovering steps.")}</p>}
          </div>}
        </Card>
      )}
      {working && (
        <Card className="p-4" role="status">
          {data.job?.status === "paused" ? t("La préparation est en pause. Les étapes terminées sont conservées.", "Preparation is paused. Completed steps are kept.") : data.recovering ? t("Le studio retrouve les étapes déjà acquises, sans nouvelle génération payante.", "The studio is recovering acquired steps without a new paid generation.") : t(
            "Le studio prépare votre proposition. Vous pouvez quitter puis revenir : l’avancement est enregistré.",
            "The studio is preparing your proposal. You can leave and return: progress is saved.",
          )}
        </Card>
      )}
      {data.job && <JobProgress job={data.job} />}
      {state.stages[active]?.status === "stale" && (
        <Card className="bg-warn-soft p-4">
          {t(
            "Un choix en amont a changé. Cette version est conservée, mais doit être reprise et validée avant la suite.",
            "An earlier choice changed. This version is kept, but must be updated and approved before continuing.",
          )}
        </Card>
      )}
      {!enabled && (
        <Card className="p-4">
          {t(
            "Validez les étapes précédentes avant de préparer celle-ci. Vous pouvez toujours consulter les versions conservées.",
            "Approve the previous steps before preparing this one. You can still view saved versions.",
          )}
        </Card>
      )}
      {active === "brief" && (
        <Card className="grid gap-4 p-5 sm:p-7">
          <h2 className="font-display text-2xl">
            {t("Ce que vous proposez", "What you offer")}
          </h2>
          <Field label={t("Votre activité", "Your business")}>
            <Select
              value={form.business}
              onChange={(e) => field("business", e.target.value)}
            >
              <option value="products">{t("Produit", "Product")}</option>
              <option value="services">
                {t("Prestation de services", "Service business")}
              </option>
            </Select>
          </Field>
          <Field
            label={t(
              "Nom du produit ou de l’activité",
              "Product or business name",
            )}
          >
            <Input
              value={form.offerName}
              onChange={(e) => field("offerName", e.target.value)}
              data-brief-name
            />
          </Field>
          <Field
            label={t("Votre description exacte", "Your exact description")}
          >
            <Textarea
              rows={5}
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
              data-brief-description
            />
          </Field>
          <Field
            label={t(
              "Lien fourni pour cette offre, si disponible",
              "Source link for this offer, if available",
            )}
          >
            <Input
              value={form.offerUrl || ""}
              onChange={(e) => field("offerUrl", e.target.value)}
            />
          </Field>
          <Button
            variant="secondary"
            disabled={
              busy || working || JSON.stringify(raw) !== JSON.stringify(form)
            }
            onClick={() => prepare("brief", "analyze")}
          >
            {t(
              "Analyser mes informations et mes photos par l’IA",
              "Analyze my information and photos with AI",
            )}
          </Button>
          {state.stages.brief?.data.observations && (
            <div className="rounded-xl border border-line p-3">
              <p className="font-semibold">Proposition d’analyse à vérifier</p>
              <p>
                {state.stages.brief.data.profile.name} ·{" "}
                {state.stages.brief.data.profile.category}
              </p>
              {state.stages.brief.data.observations.map((x, i) => (
                <p key={i} className="mt-2 text-sm">
                  {x}
                </p>
              ))}
            </div>
          )}
          {state.stages.brief?.data.profile.questions.filter(q => q.required && !q.answer?.trim()).map(q => <Field key={q.id} label={q.question}><form onSubmit={event => { event.preventDefault(); const input = new FormData(event.currentTarget).get("answer"); if (typeof input === "string") send({ action: "answer", questionId: q.id, answer: input }); }} className="grid gap-2"><p className="text-sm text-muted">{q.why}</p><Input name="answer" required maxLength={3000} /><Button disabled={busy || working} type="submit">{t("Enregistrer ma réponse", "Save my answer")}</Button></form></Field>)}
          <Field
            label={t("À qui s’adresse cette offre ?", "Who is this offer for?")}
          >
            <Input
              value={form.target}
              onChange={(e) => field("target", e.target.value)}
              data-brief-target
            />
          </Field>
          <Field
            label={t(
              "Consignes et contraintes à conserver",
              "Instructions and constraints to keep",
            )}
          >
            <Textarea
              value={form.constraints}
              onChange={(e) => field("constraints", e.target.value)}
            />
          </Field>
          {form.business === "products" && (
            <Field
              label={t("Prix confirmé, si connu", "Confirmed price, if known")}
            >
              <Input
                value={form.price}
                onChange={(e) => field("price", e.target.value)}
              />
            </Field>
          )}
          {form.business === "products" && <div className="grid gap-3"><h3 className="font-semibold">{t("Coordonnées publiques pour la page Contact", "Public contact details for the Contact page")}</h3>{(["email", "phone", "address", "hours"] as const).map(key => <Field key={key} label={({ email: t("E-mail", "Email"), phone: t("Téléphone", "Phone"), address: t("Adresse", "Address"), hours: t("Horaires", "Hours") })[key]}><Input value={form.services[key]} onChange={e => field("services", { ...form.services, [key]: e.target.value })} /></Field>)}</div>}
          {form.business === "services" && (
            <div className="grid gap-3">
              <h3 className="font-semibold">
                {t(
                  "Vos prestations et votre contact",
                  "Your services and contact",
                )}
              </h3>
              {form.services.services.map((service, i) => (
                <div
                  key={i}
                  className="grid gap-2 rounded-xl border border-line p-3"
                >
                  <Input
                    aria-label={t("Prestation", "Service")}
                    value={service.name}
                    onChange={(e) =>
                      field("services", {
                        ...form.services,
                        services: form.services.services.map((x, j) =>
                          j === i ? { ...x, name: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Textarea
                    aria-label={t(
                      "Description de la prestation",
                      "Service description",
                    )}
                    value={service.description}
                    onChange={(e) =>
                      field("services", {
                        ...form.services,
                        services: form.services.services.map((x, j) =>
                          j === i ? { ...x, description: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() =>
                  field("services", {
                    ...form.services,
                    services: [
                      ...form.services.services,
                      { name: "", description: "" },
                    ],
                  })
                }
              >
                {t("Ajouter une prestation", "Add a service")}
              </Button>
              {(["email", "phone", "area", "hours", "bookingUrl"] as const).map(
                (key) => (
                  <Field
                    key={key}
                    label={
                      {
                        email: t("E-mail", "Email"),
                        phone: t("Téléphone", "Phone"),
                        area: t("Zone ou adresse", "Area or address"),
                        hours: t("Horaires", "Opening hours"),
                        bookingUrl: t(
                          "Lien de rendez-vous, si disponible",
                          "Booking link, if available",
                        ),
                      }[key]
                    }
                  >
                    <Input
                      value={form.services[key]}
                      onChange={(e) =>
                        field("services", {
                          ...form.services,
                          [key]: e.target.value,
                        })
                      }
                    />
                  </Field>
                ),
              )}
              <Field
                label={t(
                  "Prochaine étape pour vos visiteurs",
                  "Next step for your visitors",
                )}
              >
                <Select
                  value={form.services.contactMode}
                  onChange={(e) =>
                    field("services", {
                      ...form.services,
                      contactMode: e.target.value,
                      contactModes: [e.target.value],
                    })
                  }
                >
                  <option value="form">Contact</option>
                  <option value="quote">Devis</option>
                  <option value="call">Appel</option>
                  <option value="booking">Rendez-vous</option>
                </Select>
              </Field>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <a href={`/studio/${id}/produit`} className="text-sm underline">
              {t("Ajouter des photos dans Produit", "Add photos in Product")}
            </a>
            <Button
              variant="secondary"
              onClick={() =>
                field(
                  "photoIds",
                  data.assets
                    .filter(
                      (a) =>
                        a.origin === "upload" &&
                        ["original", "lifestyle"].includes(a.role),
                    )
                    .map((a) => a.id)
                    .slice(0, 12),
                )
              }
            >
              {t(
                "Actualiser mes photos de référence",
                "Refresh my reference photos",
              )}
            </Button>
          </div>
          {!!form.photoIds.length && (
            <div className="flex flex-wrap gap-3">
              {form.photoIds.map((assetId) => (
                <img
                  key={assetId}
                  src={`/api/files/${assetId}?thumb=1`}
                  alt={t(
                    "Photo fournie pour ce projet",
                    "Photo provided for this project",
                  )}
                  className="size-28 rounded-xl object-contain"
                />
              ))}
            </div>
          )}
          <p className="text-sm text-muted">
            {t(
              "Les photos sont conservées comme références. Une photo ne confirme pas une matière, une certification ou un résultat.",
              "Photos are kept as references. A photo does not confirm a material, certification or result.",
            )}
          </p>
          {!!state.stages.brief?.data.missing.length && (
            <ul className="list-inside list-disc text-sm text-warn">
              {state.stages.brief.data.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          {briefDirty && (
            <p role="status" className="text-sm text-warn">
              {t(
                "Enregistrez vos modifications avant de confirmer l’offre.",
                "Save changes before confirming your offer.",
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={saveBrief} loading={busy} data-save-brief>
              {t("Enregistrer mes informations", "Save my information")}
            </Button>
            <Button
              onClick={() => approve("brief")}
              disabled={
                busy ||
                working ||
                briefDirty ||
                !!state.stages.brief?.data.missing.length
              }
              data-approve-brief
            >
              {t("Confirmer ces informations", "Confirm this information")}
            </Button>
          </div>
        </Card>
      )}
      {active === "research" && (
        <Card className="grid gap-4 p-5 sm:p-7">
          <h2 className="font-display text-2xl">
            {t(
              "Comprendre le marché et choisir votre approche",
              "Understand the market and choose your approach",
            )}
          </h2>
          <p className="text-sm text-muted">
            {t(
              "Le studio recherche des références publiques. Vous pouvez ajouter jusqu’à quatre liens concurrents ou sectoriels. Les observations citées restent distinctes des hypothèses marketing ; aucun volume de marché n’est inventé.",
              "The studio searches public references. You may add up to four competitor or sector links. Cited observations stay separate from marketing hypotheses; no market volumes are invented.",
            )}
          </p>
          <Field
            label={t(
              "Références, un lien par ligne",
              "References, one link per line",
            )}
          >
            <Textarea value={urls} onChange={(e) => setUrls(e.target.value)} />
          </Field>
          <Button
            variant="secondary"
            onClick={() =>
              send({
                action: "references",
                urls: urls
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            disabled={busy || working}
          >
            {t("Enregistrer ces références", "Save these references")}
          </Button>
          {referencesDirty && (
            <p role="status" className="text-sm text-warn">
              {t(
                "Enregistrez ces références avant de lancer la recherche.",
                "Save these references before starting research.",
              )}
            </p>
          )}
          <Button
            onClick={() => prepare("research")}
            disabled={!enabled || working || busy || referencesDirty}
            data-generate-research
          >
            {t(
              "Rechercher et préparer les approches",
              "Research and prepare approaches",
            )}
          </Button>
          {state.stages.research && (
            <>
              <ul className="grid gap-3">
                {state.stages.research.data.coverage && <p role="status">{state.stages.research.data.coverage.consulted}/10 {t("sources pertinentes consultées — cible indicative de 8 à 12.", "relevant sources read — indicative target of 8–12.")} {state.stages.research.data.coverage.status === "partial" && t("Couverture partielle.", "Partial coverage.")} {state.stages.research.data.coverage.limits.join(" ")}</p>}
                {state.stages.research.data.sources.map((source) => (
                  <li
                    key={source.id}
                    className="rounded-xl border border-line p-3"
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline"
                    >
                      {source.title}
                    </a>
                    <Badge>
                      {source.status === "consulted"
                        ? t("Source consultée", "Source consulted")
                        : t("Lecture impossible", "Unavailable")}
                    </Badge>
                    <p className="mt-2 text-sm">
                      {source.status === "consulted"
                        ? source.excerpt.slice(0, 500)
                        : source.error}
                    </p>
                    {source.provenance === "simulation" && (
                      <p className="text-xs text-warn">
                        Source simulée pour le test
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {!state.stages.research.data.sources.length && (
                <p role="alert">
                  {t(
                    "Aucune source accessible. Ajoutez des liens publics avant de valider une étude.",
                    "No accessible source. Add public links before approving research.",
                  )}
                </p>
              )}
              {state.stages.research.data.angles.length === 3 && !state.stages.research.data.formatVersion && <div role="status" className="rounded-xl border border-line p-4" data-legacy-research>
                <p>{t("Ancienne recherche : trois angles conservés avec votre choix. Vous pouvez demander cinq angles ; vos versions restent disponibles, sans lancement automatique.", "Legacy research: three angles and your choice are preserved. You can request five angles; versions remain available, with no automatic generation.")}</p>
                <Button disabled={!enabled || busy || working || referencesDirty} onClick={() => prepare("research")} data-upgrade-research>{t("Préparer cinq angles", "Prepare five angles")}</Button>
              </div>}
              <p>{t(`${state.stages.research.data.angles.length} angles disponibles : des hypothèses à comparer, pas des résultats de marché certifiés.`, `${state.stages.research.data.angles.length} available angles: hypotheses to compare, not certified market findings.`)}</p>
              <p>{state.stages.research.data.recommendation}</p>
              {state.stages.research.data.angles.map((angle) => (
                <label
                  key={angle.id}
                  className="block rounded-2xl border border-line p-4"
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={angle.id}
                    checked={
                      (choice ||
                        state.stages.research?.data.selectedId ||
                        state.stages.research?.data.recommendedId) === angle.id
                    }
                    onChange={() => setChoice(angle.id)}
                  />
                  <strong className="ml-2">{angle.title}</strong>
                  <p className="mt-2">{angle.positioning}</p>
                  <p className="mt-2 text-sm">{t("Cible", "Audience")} : {angle.audience}</p>
                  {angle.motivation && <p className="text-sm">{t("Motivation", "Motivation")} : {angle.motivation}</p>}
                  {angle.message && <p className="text-sm">{t("Message", "Message")} : {angle.message}</p>}
                  <ul className="mt-2 list-inside list-disc text-sm">
                    {angle.arguments.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">{angle.reason}</p>
                  <dl className="mt-3 grid gap-2 text-sm">
                    {angle.objections.map((x, i) => (
                      <div key={i}>
                        <dt className="font-medium">{x.objection}</dt>
                        <dd className="text-muted">{x.answer}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-xs text-muted">
                    {t(
                      "Hypothèse à valider. Aucune promesse ni preuve chiffrée ajoutée.",
                      "Hypothesis to approve. No invented promises or quantified proof.",
                    )}
                  </p>
                </label>
              ))}
              <Button
                onClick={() => approve("research")}
                disabled={!enabled || busy || working || referencesDirty}
                data-approve-research
              >
                {t("Choisir cette stratégie", "Choose this strategy")}
              </Button>
            </>
          )}
        </Card>
      )}
      {active === "brand" && (
        <Card className="grid gap-4 p-5 sm:p-7">
          <h2 className="font-display text-2xl">
            {t(
              "Une identité cohérente avec votre stratégie",
              "An identity matching your strategy",
            )}
          </h2>
          <Button
            onClick={() => prepare("brand")}
            disabled={!enabled || busy || working}
            data-generate-brand
          >
            {t(
              "Préparer une proposition de marque",
              "Prepare a brand proposal",
            )}
          </Button>
          {identity && (
            <>
              <Field label={t("Nom de marque", "Brand name")}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-brand-name
                />
              </Field>
              <p className="text-sm text-muted">
                {t("Nom unique conservé ; les directions suivent ce nom.", "One name is kept; directions share that name.")}{" "}
                {""}
              </p>
              <Field label="Slogan">
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </Field>
              <p>{identity.proposal.positioning}</p>
              <details>
                <summary>
                  {t(
                    "Règles de rédaction et d’usage",
                    "Writing and usage rules",
                  )}
                </summary>
                <p>{identity.proposal.tone.voice}</p>
                <ul className="list-inside list-disc text-sm">
                  {identity.proposal.tone.do.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                  {identity.proposal.tone.dont.map((x, i) => (
                    <li key={"no" + i}>À éviter : {x}</li>
                  ))}
                </ul>
              </details>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {Object.entries(palette).map(([role, color]) => (
                  <Field
                    key={role}
                    label={
                      (
                        {
                          primary: "Principale",
                          secondary: "Fond secondaire",
                          accent: "Accent",
                          light: "Fond clair",
                          dark: "Texte sombre",
                        } as Record<string, string>
                      )[role] || role
                    }
                  >
                    <input
                      aria-label={role}
                      type="color"
                      value={color}
                      onChange={(e) =>
                        setPalette({ ...palette, [role]: e.target.value })
                      }
                      className="h-10 w-full"
                    />
                  </Field>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("Police des titres", "Heading font")}>
                  <Input
                    value={fonts.heading}
                    onChange={(e) =>
                      setFonts({ ...fonts, heading: e.target.value })
                    }
                  />
                </Field>
                <Field label={t("Police des textes", "Body font")}>
                  <Input
                    value={fonts.body}
                    onChange={(e) =>
                      setFonts({ ...fonts, body: e.target.value })
                    }
                  />
                </Field>
              </div>
              <p className="text-sm text-muted">
                {t(
                  "Disponibilité juridique et nom de domaine non vérifiés. Couleurs : ancrage sombre, couleur principale, accent et neutres ; deux polices cohérentes.",
                  "Legal and domain availability not checked. Colors: dark anchor, brand color, accent and neutrals; two matching fonts.",
                )}
              </p>
              <Button
                onClick={() =>
                  send({
                    action: "identity",
                    identity: { name, tagline, palette, fonts },
                  })
                }
                disabled={!enabled || busy || working}
                data-confirm-identity
              >
                {t(
                  "Valider ce nom avant les trois directions",
                  "Approve this name before the three directions",
                )}
              </Button>
              {identityDirty && (
                <p role="status" className="text-sm text-warn">
                  {t(
                    "Validez les modifications de votre identité avant de créer ou choisir son logo.",
                    "Approve identity changes before creating or selecting its logo.",
                  )}
                </p>
              )}
              {identity.identityConfirmed && (
                <>
                  <p className="text-sm">
                    {t(
                      "Choisissez votre logo fourni ou demandez des propositions au moteur IA configuré. Un essai refusé ne devient pas un logo final.",
                      "Choose your supplied logo or request proposals from the configured AI engine. A rejected attempt cannot become a final logo.",
                    )}
                  </p>
                  <LogoV2Panel onApplied={() => { reload(); reloadProject(); }} />
                  {!identity.seriesId && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {data.assets
                      .filter(
                        (a) =>
                          ["logo", "logo-v2"].includes(a.role) &&
                          (a.origin === "upload" ||
                            identity.logoCandidates.includes(a.id)) &&
                          (a.origin === "upload" || a.verdict === "FINAL"),
                      )
                      .map((a) => (
                        <label
                          key={a.id}
                          className="rounded-xl border border-line p-3"
                        >
                          <img
                            src={a.url}
                            alt={a.name}
                            className="aspect-square w-full object-contain"
                          />
                          <input
                            type="radio"
                            name="logo"
                            value={a.id}
                            checked={logo === a.id}
                            onChange={() => setLogo(a.id)}
                          />
                          <span className="ml-2 text-xs">{a.name}</span>
                        </label>
                      ))}
                  </div>}
                  <Button
                    onClick={() => approve("brand")}
                    disabled={!logo || busy || working || identityDirty}
                    data-approve-brand
                  >
                    {t(
                      identity.seriesId ? state.stages.brand?.status === "approved" ? "Identité complète validée" : "Valider les retouches de l’identité active" : "Valider la marque et ce logo",
                      identity.seriesId ? state.stages.brand?.status === "approved" ? "Complete identity approved" : "Approve active identity edits" : "Approve the brand and this logo",
                    )}
                  </Button>
                </>
              )}
            </>
          )}
        </Card>
      )}
      {active === "content" && (
        <>
          <Card className="grid gap-4 p-5 sm:p-7">
            <h2 className="font-display text-2xl">
              {t(
                "Pages, textes et visuels à prévoir",
                "Pages, copy and visual plan",
              )}
            </h2>
            <Button
              onClick={() => prepare("content")}
              disabled={!enabled || busy || working}
              data-generate-content
            >
              {t(
                "Préparer les contenus et le plan",
                "Prepare content and the plan",
              )}
            </Button>
            {state.stages.content && (
              <>
                {state.stages.content.data.pending && <p role="alert" className="rounded-xl border border-warn p-3">{state.stages.content.data.pending}</p>}
                <p role="status">{t("Les textes à compléter ne peuvent pas être validés. Valider un brouillon ne remplace pas une relecture éditoriale. Certains textes des sections restent à relire avant de créer le thème.", "Incomplete copy cannot be approved. Approving a draft does not replace editorial review. Some section copy still needs review before building the theme.")}</p>
                {state.stages.content.data.recommendation && <RecommendedReferences recommendation={state.stages.content.data.recommendation} />}
                <ol className="grid gap-3">
                  {state.stages.content.data.pages.map((page) => (
                    <li
                      key={page.key}
                      className="rounded-xl border border-line p-3"
                    >
                      <h3 className="font-semibold">{page.title}</h3>
                      <p className="text-sm">{page.kind === "contact" ? ({
                        quote: t("Demande de devis", "Quote request"),
                        booking: t("Prendre rendez-vous", "Book an appointment"),
                        call: t("Appeler", "Call"),
                        form: t("Formulaire de contact", "Contact form"),
                        unknown: t("Moyen de contact à préciser", "Contact method to confirm"),
                      } as Record<string, string>)[page.goal] || page.goal : page.goal}</p>
                      <ul className="mt-2 list-inside list-disc text-xs text-muted">
                        {page.sections.map((sec) => (
                          <li key={sec.key}>{sec.purpose}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
                {state.stages.content.data.documents.map((item) => (
                  <details
                    key={item.docKey}
                    className="rounded-xl border border-line p-3"
                  >
                    <summary>
                      {item.doc.page.title} — {item.verdict === "FINAL" ? item.verdict : t("Brouillon à relire", "Draft to review")}
                    </summary>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        prepare("content", "generate", item.doc.page.key)
                      }
                      disabled={busy || working || !correction.trim()}
                    >
                      {t(
                        "Corriger seulement cette page",
                        "Correct only this page",
                      )}
                    </Button>
                    <p className="my-3 text-sm text-muted">
                      SEO — {t("mots-clés hypothétiques, aucun volume ni classement vérifié", "hypothetical keywords, no verified volume or ranking")} : {item.doc.meta.seoTitle} ·{" "}
                      {item.doc.meta.metaDescription}
                    </p>
                    {item.doc.blocks.map((block: any) => (
                      <div key={block.id} className="my-3 whitespace-pre-wrap">
                        {block.text || block.q || block.items?.join("\n")}
                        {block.a && <p>{block.a}</p>}
                      </div>
                    ))}
                  </details>
                ))}
                {!!state.stages.content.data.notes.length && (
                  <details>
                    <summary>
                      {t("Points à vérifier", "Points to review")}
                    </summary>
                    <ul className="list-inside list-disc text-sm">
                      {state.stages.content.data.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <Button
                  variant="secondary"
                  onClick={() => send({ action: "refresh-content" })}
                  disabled={busy || working}
                >
                  {t(
                    "Reprendre les textes corrigés dans l’éditeur",
                    "Load copy corrected in the editor",
                  )}
                </Button>
                <Button
                  onClick={() => approve("content")}
                  disabled={!enabled || busy || working}
                  data-approve-content
                >
                  {t(
                    "Valider ces contenus et le plan",
                    "Approve this content and the plan",
                  )}
                </Button>
              </>
            )}
          </Card>
          {state.stages.content && (
            <ContentPanel
              types={[
                "home_page",
                "product_page",
                "service_page",
                "brand_page",
                "contact_page",
              ]}
              title={t(
                "Corriger et versionner vos textes",
                "Edit and version your copy",
              )}
            />
          )}
        </>
      )}
      {active === "media" && (
        <Card className="grid gap-4 p-5 sm:p-7">
          <h2 className="font-display text-2xl">
            {t(
              "Les bons visuels, au bon endroit",
              "The right visuals in the right place",
            )}
          </h2>
          <p className="text-sm text-muted">
            {t(
              "Produits : 10 créations IA (4 carrées, 4 paysages, 2 stories) et 1 vidéo d’ambiance. Services : 10 photos et 2 vidéos d’ambiance. Les vidéos ont leur scénario et devis séparés, à valider avant les clips. Chaque média est contrôlé et affecté à une section. Par défaut, aucune personne ajoutée.",
              "Products: 10 AI creations (4 square, 4 landscape, 2 stories) and 1 mood video. Services: 10 photos and 2 mood videos. Video scenarios and quotes are reviewed separately before clips. Each media is checked and placed in a section. No people added by default.",
            )}
          </p>
          <Button onClick={() => prepare("media", "collect")} disabled={busy || working || !enabled}>{t("Préparer les médias manquants (avec devis)", "Prepare missing media (with quote)")}</Button>
          <p role="status">{state.stages.media?.data.slots.filter(s => s.reviewed && s.assetId).length ?? 0}/{state.stages.media?.data.slots.length ?? 0} {t("médias vérifiés par vous. Les résultats incomplets restent enregistrés.", "media reviewed by you. Partial results stay saved.")}</p>
          {state.stages.media?.data.slots.filter(slot=>slot.kind==="video"&&slot.source==="ai").map(slot=><GuidedVideo key={`proposal:${slot.key}`} as="post" initialSlot={slot.key}/>)}
          {state.stages.media?.data.slots.map((slot) => (
            <Slot
              key={slot.key}
              slot={slot}
              pages={state.stages.content?.data.pages ?? []}
              move={(pageKey, sectionKey) => send({ action: "placement", slot: slot.key, placement: { pageKey, sectionKey } })}
              assets={data.assets}
              busy={busy || working || !enabled}
              consentChange={(peopleConsent) =>
                send({ action: "consent", slot: slot.key, peopleConsent })
              }
              generate={() => prepare("media", "image", slot.key)}
              assign={(assetId, peopleConsent) =>
                send({
                  action: "assign",
                  slot: slot.key,
                  assetId,
                  peopleConsent,
                })
              }
            />
          ))}
          <Button
            onClick={() => approve("media")}
            disabled={!enabled || busy || working}
            data-approve-media
          >
            {t(
              "Valider les visuels et vérifier le projet",
              "Approve visuals and check the project",
            )}
          </Button>
        </Card>
      )}
      <Card className="grid gap-3 p-5">
        <Field
          label={t(
            "Défaut précis à corriger pour un nouvel essai",
            "Specific issue to fix for another attempt",
          )}
        >
          <Textarea
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder={t(
              "Ex. : conserver le nom exact et corriger la hiérarchie du texte.",
              "E.g.: keep the exact name and correct text hierarchy.",
            )}
          />
        </Field>
        <p className="text-xs text-muted">
          {t(
            "Deux demandes au plus pour les mêmes données. Une reprise payante a son devis ; aucun essai n’est relancé automatiquement après un échec.",
            "At most two requests for the same inputs. A paid retry has its own quote; failures are never retried automatically.",
          )}
        </p>
      </Card>
      {quote && (
        <Card
          className="border-signal p-5"
          role="dialog"
          aria-label={t("Confirmer cet essai", "Confirm this attempt")}
        >
          <h2 className="font-semibold">
            {t("Avant de lancer", "Before starting")}
          </h2>
          <p className="mt-2">
            {quote.maxBudgetPct == null
              ? t(
                "Coût indisponible : cet essai ne peut pas être confirmé.",
                "Cost unavailable: this attempt cannot be confirmed.",
              )
              : t(
                `Plafond : ${quote.maxBudgetPct.toFixed(1)} % du budget IA de ce projet.`,
                `Cap: ${quote.maxBudgetPct.toFixed(1)}% of this project’s AI budget.`,
              )}
          </p>
          <p className="mt-2 text-sm text-muted">{quote.note}</p>
          <div className="mt-4 flex gap-3">
            <Button
              disabled={busy || quote.maxBudgetPct == null}
              onClick={async () => {
                const q = quote;
                setQuote(null);
                await send({ action: "generate", quoteId: q.id, correction });
              }}
            >
              {t("Confirmer cet essai", "Confirm this attempt")}
            </Button>
            <Button variant="secondary" onClick={() => setQuote(null)}>
              {t("Annuler", "Cancel")}
            </Button>
          </div>
        </Card>
      )}
      <Card className="p-5">
        <h2 className="font-display text-2xl">
          {data.ready?.handoff?.status === 'ready'
            ? t("Prêt pour le moteur de thèmes", "Ready for the theme engine")
            : t("Ce qui reste avant le thème", "What remains before the theme")}
        </h2>
        {data.ready?.handoff?.status === 'ready' ? (
          <>
            <p className="mt-2">
              {t(
                "Votre marque validée, votre stratégie, vos contenus et leurs médias sont reliés et enregistrés. La construction du thème sera une étape distincte.",
                "Your approved brand, strategy, content and media are linked and saved. Building the theme will be a separate step.",
              )}
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => {
                const blob = new Blob([JSON.stringify(data.ready, null, 2)], {
                  type: "application/json",
                });
                const u = URL.createObjectURL(blob),
                  a = document.createElement("a");
                a.href = u;
                a.download = "projet-pret-pour-theme.json";
                a.click();
                URL.revokeObjectURL(u);
              }}
            >
              {t(
                "Télécharger les données préparées",
                "Download the prepared data",
              )}
            </Button>
          </>
        ) : (
          <ul className="mt-3 list-inside list-disc text-sm">
            {data.blockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        <details className="mt-5">
          <summary>{t("Versions enregistrées", "Saved versions")}</summary>
          <ul className="mt-3 grid gap-2">
            {data.history.map((v) => (
              <li
                key={v.revision}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  Version {v.revision} — {new Date(v.at).toLocaleString()}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || working || v.revision === state.revision}
                  onClick={() => restore(v.revision)}
                >
                  {t("Reprendre pour vérification", "Restore for review")}
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            {t(
              "Une reprise conserve les versions actuelles et remet les choix à vérifier avant propagation.",
              "Restoring keeps current versions and requires choices to be reviewed before propagation.",
            )}
          </p>
        </details>
      </Card>
    </div>
  );
}
function Slot({
  slot,
  pages,
  move,
  assets,
  busy,
  generate,
  assign,
  consentChange,
}: {
  slot: VisualSlot;
  pages: { key: string; title: string; sections: { key: string; purpose: string }[] }[];
  move: (pageKey: string, sectionKey: string) => Promise<unknown>;
  assets: AssetView[];
  busy: boolean;
  generate: () => void;
  consentChange: (consent: VisualSlot["peopleConsent"]) => Promise<unknown>;
  assign: (id: string, people: VisualSlot["peopleConsent"]) => Promise<unknown>;
}) {
  const t = useT(),
    [selected, setSelected] = useState(slot.assetId || ""),
    [consent, setConsent] = useState<VisualSlot["peopleConsent"]>(
      slot.peopleConsent || "none_confirmed",
    );
  useEffect(() => setSelected(slot.assetId || ""), [slot.assetId]);
  useEffect(
    () => setConsent(slot.peopleConsent || "none_confirmed"),
    [slot.peopleConsent, slot.key],
  );
  const [placement, setPlacement] = useState(`${slot.pageKey}|${slot.sectionKey}`);
  const consentDirty =
    (consent === "this_slot") !== (slot.peopleConsent === "this_slot");
  return (
    <div className="grid gap-3 rounded-2xl border border-line p-4">
      <h3 className="font-semibold">{slot.purpose}</h3>
      <p className="text-xs text-muted">
        {pages.find(p => p.key === slot.pageKey)?.title ?? slot.pageKey} · {pages.find(p => p.key === slot.pageKey)?.sections.find(s => s.key === slot.sectionKey)?.purpose ?? slot.sectionKey}
      </p>
      <Field label={t("Affectation dans les pages", "Page placement")}><Select value={placement} onChange={e => setPlacement(e.target.value)}>{pages.flatMap(pg => pg.sections.map(section => <option key={`${pg.key}|${section.key}`} value={`${pg.key}|${section.key}`}>{pg.title} — {section.purpose}</option>))}</Select></Field>
      <Button variant="ghost" disabled={busy || placement === `${slot.pageKey}|${slot.sectionKey}`} onClick={() => { const [pageKey, sectionKey] = placement.split("|"); move(pageKey, sectionKey); }}>{t("Enregistrer l’affectation et revérifier", "Save placement and recheck")}</Button>
      <p className="text-xs">{slot.source === "pixabay" ? "Pixabay" : "IA"} · {slot.kind ?? "image"} · {slot.aspect}</p>
      {slot.alignment && <p role="status">{slot.alignment.status === "accepted" ? t("Cohérence texte-image contrôlée", "Text-media consistency checked") : t("À corriger", "Correction required")} : {slot.alignment.reason}</p>}
      {slot.assetId && slot.kind === "video" ? <video src={`/api/files/${slot.assetId}`} poster={slot.posterId ? `/api/files/${slot.posterId}` : undefined} controls playsInline muted preload="metadata" className="max-h-72 w-full rounded-xl object-contain" /> : slot.assetId && (
        <img
          src={`/api/files/${slot.assetId}`}
          alt={slot.alt || slot.purpose}
          loading="lazy"
          className="max-h-72 w-full rounded-xl object-contain"
        />
      )}
      <p>
        {slot.reviewed
          ? t("Visuel vérifié par vous", "Visual reviewed by you")
          : t(
            "À créer ou à choisir puis vérifier",
            "Create or choose, then review",
          )}
      </p>
      {consentDirty && (
        <p role="status" className="text-sm text-warn">
          {t(
            "Enregistrez cette autorisation avant de créer le visuel.",
            "Save this permission before creating the visual.",
          )}
        </p>
      )}
      <Button
        variant="secondary"
        onClick={generate}
        disabled={busy || consentDirty || (slot.kind==="video"&&slot.source==="ai"&&!slot.assetId)}
      >
        {slot.kind==="video"&&slot.source==="ai"?t("Contrôler et affecter la vidéo obtenue","Review and place the obtained video"):slot.source === "pixabay" ? t("Chercher et contrôler sur Pixabay", "Search and review on Pixabay") : t("Créer ce visuel par l’IA", "Create this visual with AI")}
      </Button>
      <Field
        label={t(
          "Ou choisir une de vos images du projet",
          "Or choose a project image",
        )}
      >
        <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">{t("Choisir une image", "Choose an image")}</option>
          {assets
            .filter((a) => (a.kind ?? "image") === (slot.kind ?? "image") && a.verdict === "FINAL")
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field
        label={t(
          "Présence humaine dans cette utilisation",
          "People in this use",
        )}
      >
        <Select
          value={consent}
          onChange={(e) =>
            setConsent(e.target.value as VisualSlot["peopleConsent"])
          }
        >
          <option value="none_confirmed">
            {t(
              "Je confirme l’absence de personne",
              "I confirm there are no people",
            )}
          </option>
          <option value="this_slot">
            {t(
              "J’autorise cette utilisation précise avec une personne",
              "I authorize this specific use with a person",
            )}
          </option>
        </Select>
      </Field>
      <Button
        variant="secondary"
        onClick={() => consentChange(consent)}
        disabled={busy}
      >
        {t(
          "Enregistrer cette autorisation pour ce visuel",
          "Save this permission for this visual",
        )}
      </Button>
      <Button
        onClick={() => assign(selected, consent)}
        disabled={!selected || busy}
      >
        {t(
          "J’ai vérifié : utiliser cette image ici",
          "I reviewed it: use this image here",
        )}
      </Button>
    </div>
  );
}
