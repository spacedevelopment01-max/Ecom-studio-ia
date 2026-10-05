"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Briefcase, Check, Circle, Loader2, Palette, Pause, Play, RotateCcw, SkipForward, Store, X, Brain, Trash2, Plus, Languages, Globe } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, formatDate, Input, Progress, Select, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { EngineNotice, SectionTitle } from "./common";
import { StartCreation } from "./start-creation";
import { useT } from "../i18n";
import { LANGS, type Lang } from "@/lib/i18n";
import { isPlatform, PlatformCards } from "./platform-picker";
import { missingActivity } from "./services-editor";
import { SitePilotCard } from "./existing-site";

function StepIcon({ status }: { status: string }) {
  if (status === "done") return <span className="grid size-7 place-items-center rounded-full bg-ok text-white"><Check className="size-4" /></span>;
  if (status === "running") return <span className="grid size-7 place-items-center rounded-full bg-signal text-signal-ink"><Loader2 className="size-4 animate-spin" /></span>;
  if (status === "failed") return <span className="grid size-7 place-items-center rounded-full bg-bad text-white"><X className="size-4" /></span>;
  if (status === "paused") return <span className="grid size-7 place-items-center rounded-full bg-warn-soft text-warn"><Pause className="size-3.5" /></span>;
  if (status === "skipped") return <span className="grid size-7 place-items-center rounded-full bg-paper-2 text-muted"><SkipForward className="size-3.5" /></span>;
  return <span className="grid size-7 place-items-center rounded-full border border-line text-muted"><Circle className="size-2.5" /></span>;
}

function Questions() {
  const { id, data, reload } = useProject();
  const toast = useToast();
  const t = useT();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const open = (data?.product.questions ?? []).filter((q) => !q.answer);
  if (!open.length) return null;
  async function save() {
    const list = Object.entries(answers).filter(([, v]) => v.trim()).map(([id, answer]) => ({ id, answer }));
    if (!list.length) return;
    setBusy(true);
    try {
      const r = await api<{ themeUpdated: boolean; postsUpdated: number }>(`/api/projects/${id}/product`, { method: "PATCH", body: { answers: list } });
      toast("ok", `${t("Merci.", "Thank you.")} ${r.themeUpdated ? t("La boutique a été complétée. ", "Your store has been completed. ") : ""}${r.postsUpdated ? t(`${r.postsUpdated} publication(s) mise(s) à jour.`, `${r.postsUpdated} post(s) updated.`) : ""}`.trim());
      setAnswers({});
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle title={t("Quelques questions indispensables", "A few essential questions")}>{t("Ces informations ne se déduisent pas d'une photo. Tant qu'elles manquent, elles restent « à compléter » dans vos textes : rien n'est inventé.", "This information can't be inferred from a photo. Until you provide it, it stays marked “to complete” in your copy: nothing is made up.")}</SectionTitle>
      <div className="grid gap-4">
        {open.map((q) => (
          <div key={q.id} className="grid gap-1.5">
            <label htmlFor={`q-${q.id}`} className="flex items-center gap-2 text-sm font-medium">
              {q.question} {q.required && <Badge tone="signal">{t("indispensable", "required")}</Badge>}
            </label>
            <p className="text-xs text-muted">{q.why}</p>
            <Input id={`q-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder={t("Votre réponse", "Your answer")} />
          </div>
        ))}
      </div>
      <Button className="mt-5" onClick={save} loading={busy}>{t("Enregistrer mes réponses", "Save my answers")}</Button>
    </Card>
  );
}

/** Site de services : informations essentielles encore manquantes (jamais devinées). */
function ActivityGaps() {
  const { id, data } = useProject();
  const t = useT();
  if (!data || data.business !== "services" || !data.pipeline) return null;
  const missing = missingActivity(data.services);
  if (!missing.length) return null;
  const LABEL: Record<string, string> = { services: t("vos prestations", "your services"), area: t("votre zone ou adresse", "your area or address"), contact: t("un téléphone ou un e-mail", "a phone number or email"), hours: t("vos horaires", "your opening hours"), booking: t("votre lien de rendez-vous", "your booking link") };
  return (
    <Card className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warn-soft text-warn"><Briefcase className="size-5" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t("Complétez votre activité", "Complete your business details")}</p>
        <p className="mt-0.5 text-sm text-muted">{t("Il manque : ", "Missing: ")}{missing.map((m) => LABEL[m]).join(", ")}. {t("Le studio ne les devine pas : en attendant, le site affiche « à compléter ».", "The studio doesn't guess them: meanwhile, the website shows “to complete”.")}</p>
      </div>
      <Link href={`/studio/${id}/produit`} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper">{t("Ouvrir l'onglet Activité", "Open the Business tab")} <ArrowRight className="size-4" /></Link>
    </Card>
  );
}

function Memory() {
  const { id } = useProject();
  const toast = useToast();
  const t = useT();
  const { data, reload } = useApi<{ items: { id: string; kind: string; key: string; value: string; status: string; source: string; scope: string; updated_at: number }[] }>(`/api/projects/${id}/memory`);
  const [form, setForm] = useState({ kind: "preference", key: "", value: "", scope: "all" });
  const items = (data?.items ?? []).filter((m) => m.kind !== "fact");
  const KIND: Record<string, string> = { decision: t("Décision", "Decision"), correction: t("Correction", "Correction"), preference: t("Préférence", "Preference"), goal: t("Objectif", "Goal") };
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle title={t("Mémoire du projet", "Project memory")}>{t("Décisions, corrections et préférences que l'IA respecte dans toutes les créations suivantes.", "Decisions, corrections and preferences the AI follows in everything it creates next.")}</SectionTitle>
      <ul className="grid gap-2">
        {items.map((m) => (
          <li key={m.id} className="flex items-start gap-3 rounded-2xl border border-line p-3 text-sm">
            <Brain className="mt-0.5 size-4 shrink-0 text-signal" />
            <div className="min-w-0 flex-1">
              <p><Badge tone="neutral">{KIND[m.kind] ?? m.kind}</Badge> <span className="font-medium">{m.key}</span></p>
              <p className="mt-1 break-words text-ink-2">{m.value}</p>
            </div>
            <button onClick={async () => { await api(`/api/projects/${id}/memory?item=${m.id}`, { method: "DELETE" }); reload(); }} className="grid size-8 place-items-center rounded-full hover:bg-paper-2" aria-label={t("Oublier", "Forget")}><Trash2 className="size-4 text-muted" /></button>
          </li>
        ))}
        {!items.length && <li className="text-sm text-muted">{t("Rien encore. Vos corrections dans la boutique ou la marque s'ajouteront ici automatiquement.", "Nothing yet. Your corrections to the store or the brand will be added here automatically.")}</li>}
      </ul>
      <form
        className="mt-4 grid gap-2 sm:grid-cols-[150px_1fr]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.key || !form.value) return;
          try {
            await api(`/api/projects/${id}/memory`, { body: form });
            setForm({ ...form, key: "", value: "" });
            reload();
            toast("ok", t("Ajouté à la mémoire du projet.", "Added to the project memory."));
          } catch (err) {
            toast("bad", (err as Error).message);
          }
        }}
      >
        <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} aria-label={t("Type", "Type")}>
          <option value="preference">{t("Préférence", "Preference")}</option>
          <option value="correction">{t("Correction", "Correction")}</option>
          <option value="decision">{t("Décision", "Decision")}</option>
          <option value="goal">{t("Objectif", "Goal")}</option>
        </Select>
        <Input aria-label={t("Sujet", "Topic")} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder={t("Sujet (ex. ton des légendes)", "Topic (e.g. caption tone)")} />
        <Textarea aria-label={t("Ce qu'il faut retenir", "What to remember")} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={t("Ce qu'il faut retenir (ex. jamais d'emoji, vouvoyer)", "What to remember (e.g. never use emojis, keep a formal tone)")} className="sm:col-span-2" rows={2} />
        <Button type="submit" variant="secondary" icon={<Plus className="size-4" />} className="justify-self-start">{t("Ajouter", "Add")}</Button>
      </form>
    </Card>
  );
}

/** Réglage : langue des contenus créés pour ce projet. */
/** `started` : faux tant que la création n'est pas lancée (la plateforme se choisit alors dans « Démarrer la création »). */
function ContentLanguage({ started = true }: { started?: boolean }) {
  const { id, data, reload } = useProject();
  const toast = useToast();
  const t = useT();
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const current: Lang = data.settings.language ?? "fr";
  async function change(language: Lang) {
    if (language === current) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}`, { method: "PATCH", body: { settings: { language } } });
      await reload();
      toast("ok", t("Langue des contenus enregistrée.", "Content language saved."));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const svc = data.business === "services";
  async function changePlatform(platform: string) {
    if (platform === data!.project.platform) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}`, { method: "PATCH", body: { platform } });
      await reload();
      toast("ok", t("Plateforme enregistrée : l'export et l'installation s'adaptent.", "Platform saved: export and installation adapt accordingly."));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle title={t("Réglages du projet", "Project settings")} />
      <div className="mb-6 grid gap-1.5">
        <p className="flex items-center gap-2 text-sm font-medium">{svc ? <Briefcase className="size-4 text-muted" aria-hidden /> : <Store className="size-4 text-muted" aria-hidden />} {t("Type de projet", "Project type")}</p>
        <p className="text-sm">
          <Badge tone="signal">{svc ? t("Services", "Services") : t("Boutique", "Store")}</Badge>{" "}
          <span className="text-ink-2">{svc ? t("Site d'une entreprise de services : activité, prestations, prise de contact.", "Website for a services business: business, services, getting in touch.") : t("Boutique en ligne : produits, panier, paiement sur votre plateforme.", "Online store: products, cart, checkout on your platform.")}</span>
        </p>
      </div>
      {started && <div className="mb-6 grid gap-2">
        <p className="flex items-center gap-2 text-sm font-medium"><Globe className="size-4 text-muted" aria-hidden /> {svc ? t("Plateforme du site", "Website platform") : t("Plateforme de la boutique", "Store platform")}</p>
        <p className="text-xs text-muted">{svc ? t("Conseil : WordPress pour un site de services ; Shopify convient aussi. Le site reste le même, seule la livraison change.", "Tip: WordPress for a services website; Shopify works too. The website stays the same, only the delivery changes.") : t("Le site reste le même, seule la livraison change (thème installable ou kit de reprise).", "The site stays the same, only the delivery changes (installable theme or rebuild kit).")}</p>
        {data.settings.existingSite?.status === "read" && (
          <p className="text-xs text-info">
            {data.settings.existingSite.decision === "keep"
              ? t(`Détectée sur votre site actuel : ${data.settings.existingSite.platformLabel}.`, `Detected on your current website: ${data.settings.existingSite.platformLabel}.`)
              : t(`Votre site (${data.settings.existingSite.platformLabel}) est reproduit sur ${data.settings.existingSite.target}, la plateforme conseillée.`, `Your website (${data.settings.existingSite.platformLabel}) is reproduced on ${data.settings.existingSite.target}, the recommended platform.`)}
          </p>
        )}
        <div className={busy ? "pointer-events-none opacity-60" : undefined}>
          <PlatformCards value={isPlatform(data.project.platform) ? data.project.platform : "shopify"} onChange={changePlatform} business={data.business} compact />
        </div>
      </div>}
      <div className="grid gap-1.5">
        <label htmlFor="project-content-lang" className="flex items-center gap-2 text-sm font-medium">
          <Languages className="size-4 text-muted" aria-hidden /> {t("Langue des contenus du projet", "Project content language")}
        </label>
        <Select id="project-content-lang" value={current} disabled={busy} onChange={(e) => change(e.target.value as Lang)} className="max-w-xs">
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </Select>
        <p className="text-xs text-muted">
          {t(
            "Les prochains contenus (boutique, images, vidéos, publications, publicités, prompts) seront créés dans cette langue. Chaque action permet aussi de choisir une autre langue ponctuellement. Les contenus existants ne sont pas modifiés.",
            "Upcoming content (store, images, videos, posts, ads, prompts) will be created in this language. Each action also lets you pick another language just for that action. Existing content is not changed.",
          )}
        </p>
      </div>
    </Card>
  );
}

export default function TabPilote() {
  const { id, data, reload } = useProject();
  const toast = useToast();
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  if (!data) return null;
  const pl = data.pipeline;
  const running = pl && (pl.job.status === "running" || pl.job.status === "queued");
  const awaiting = data.project.status === "awaiting_validation";
  // Création arrêtée à la demande du client : ni pause reprenable telle quelle, ni erreur.
  const cancelled = pl?.job.status === "cancelled";
  const paused = !cancelled && (pl?.job.status === "paused" || data.project.status === "paused");
  const failed = !paused && !cancelled && (pl?.job.status === "failed" || data.project.status === "error");
  async function pause(action: "pause" | "resume") {
    setBusy(action);
    try {
      await api(`/api/projects/${id}/pause`, { body: { action } });
      toast("ok", action === "pause" ? t("Pause demandée : l'étape en cours s'arrête proprement, le travail fait est conservé.", "Pause requested: the current step will stop cleanly and the work done so far is kept.") : t("La création reprend là où elle s'était arrêtée.", "Creation resumes where it left off."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function resume(from?: string) {
    setBusy(from ?? "resume");
    try {
      await api(`/api/projects/${id}/resume`, { body: { from } });
      toast("ok", t("La création reprend.", "Creation is resuming."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const done = pl?.steps.filter((s) => s.status === "done" || s.status === "skipped").length ?? 0;
  const svc = data.business === "services";
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <EngineNotice what={t("l'analyse, la marque et les textes", "the analysis, the brand and the copy")} />
      {!pl && <StartCreation />}
      {/* Projet pas encore lancé : pas de carte d'avancement vide ni d'aperçu « en cours » (rien ne tourne). */}
      {pl && <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted">{t("Avancement de la création", "Creation progress")}</p>
              <p className="mt-1 font-display text-3xl font-semibold">{pl ? t(`${done} / ${pl.steps.length} étapes`, `${done} / ${pl.steps.length} steps`) : t("Aucune création lancée", "No creation started")}</p>
            </div>
            {running && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" icon={<Pause className="size-4" />} loading={busy === "pause"} onClick={() => pause("pause")}>{t("Mettre en pause", "Pause")}</Button>
                <Button variant="ghost" size="sm" onClick={async () => { if (!confirm(t("Arrêter définitivement cette création ? (La pause permet de reprendre plus tard.)", "Stop this creation for good? (Pausing lets you resume later.)"))) return; await api(`/api/jobs/${pl!.job.id}`, { body: { action: "cancel" } }); reload(); }}>{t("Arrêter", "Stop")}</Button>
              </div>
            )}
            {paused && <Button size="sm" icon={<Play className="size-4" />} loading={busy === "resume"} onClick={() => pause("resume")}>{t("Reprendre", "Resume")}</Button>}
          </div>
          {pl && <Progress value={running ? pl.job.progress : done / pl.steps.length} className="mt-4" />}
          {running && <p className="mt-3 text-sm text-ink-2" role="status">{pl!.job.message}</p>}
          {paused && (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-warn-soft p-4 text-sm text-warn" role="status">
              <Pause className="size-4 shrink-0" /> {t("Création en pause. Les étapes terminées sont conservées ; la reprise repart de l'étape interrompue.", "Creation paused. Completed steps are kept; resuming restarts from the interrupted step.")}
            </p>
          )}
          {cancelled && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-warn-soft p-4 text-sm text-warn" role="status">
              <Pause className="size-4 shrink-0" />
              <span className="flex-1">{t("Création arrêtée à votre demande. Les étapes terminées sont conservées.", "Creation stopped at your request. Completed steps are kept.")}</span>
              <Button size="sm" icon={<Play className="size-4" />} loading={!!busy} onClick={() => resume(pl!.steps.find((x) => x.status !== "done" && x.status !== "skipped")?.id)}>{t("Relancer", "Restart")}</Button>
            </div>
          )}
          {failed && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-bad-soft p-4 text-sm text-bad">
              <AlertTriangle className="size-5" />
              <span className="flex-1">{pl?.job.error ?? t("Une étape a échoué.", "A step failed.")} {t("Le travail déjà réalisé est conservé.", "The work already done is kept.")}</span>
              <Button size="sm" variant="danger" icon={<RotateCcw className="size-4" />} loading={busy === "retry"} onClick={async () => { setBusy("retry"); await api(`/api/jobs/${pl!.job.id}`, { body: { action: "retry" } }); setBusy(null); reload(); }}>{t("Reprendre où c'était", "Resume where it stopped")}</Button>
            </div>
          )}
          {awaiting && (
            <div className="mt-4 rounded-2xl border border-warn/40 bg-warn-soft p-4 text-sm">
              <p className="font-medium text-warn">{t("Votre marque attend votre validation.", "Your brand is awaiting your approval.")}</p>
              <p className="mt-1 text-ink-2">{svc ? t("Vérifiez le nom, la palette et le logo. La suite (textes, images, vidéos, site, calendrier) partira de vos choix.", "Check the name, palette and logo. Everything that follows (copy, images, videos, website, calendar) will build on your choices.") : t("Vérifiez le nom, la palette et le logo. La suite (textes, images, vidéos, boutique, calendrier) partira de vos choix.", "Check the name, palette and logo. Everything that follows (copy, images, videos, store, calendar) will build on your choices.")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => resume("copy")} loading={busy === "copy"}>{t("Valider et continuer", "Approve and continue")}</Button>
                <Link href={`/studio/${id}/marque`} className="inline-flex h-8 items-center rounded-full border border-line bg-card px-3 text-[13px]">{t("Ajuster la marque", "Adjust the brand")}</Link>
              </div>
            </div>
          )}
          <ol className="mt-6 grid gap-1">
            {(pl?.steps ?? []).map((s) => (
              <li key={s.id} className={cx("flex items-start gap-3 rounded-2xl p-2.5", s.status === "running" && "bg-signal-soft")}>
                <StepIcon status={s.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted">{s.note ?? s.detail}</p>
                </div>
                {(s.status === "done" || s.status === "failed") && !running && ["copy", "images", "video", "shop", "calendar"].includes(s.id) && (
                  <button onClick={() => resume(s.id)} disabled={!!busy} className="shrink-0 rounded-full px-2.5 py-1 text-xs text-muted hover:bg-paper-2 hover:text-ink" title={t("Relancer à partir de cette étape (les étapes précédentes sont conservées)", "Rerun from this step (previous steps are kept)")}>
                    {t("Relancer", "Rerun")}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </Card>
        <div className="grid content-start gap-6">
          <Card className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-paper-2">
              {data.coverUrl ? <img src={data.coverUrl} alt="" className="size-full object-cover" /> : <div className="skeleton size-full" />}
              {data.logoUrl && <img src={data.logoUrl} alt="Logo" className="absolute bottom-3 left-3 h-10 max-w-[60%] rounded-xl bg-white/90 object-contain px-3 py-1.5" />}
            </div>
            <div className="grid grid-cols-3 divide-x divide-line border-t border-line text-center">
              {[
                [t("Images", "Images"), (data.counts.packshot ?? 0) + (data.counts.scene ?? 0) + (data.counts.detail ?? 0) + (data.counts.social ?? 0) + (data.counts.ad ?? 0) + (data.counts.banner ?? 0), "images"],
                [t("Vidéos", "Videos"), data.counts.video ?? 0, "videos"],
                [t("Publications", "Posts"), Object.values(data.posts).reduce((s, n) => s + n, 0), "publications"],
              ].map(([l, n, href]) => (
                <Link key={l as string} href={`/studio/${id}/${href}`} className="p-4 hover:bg-paper-2">
                  <p className="font-display text-2xl font-semibold">{n as number}</p>
                  <p className="text-xs text-muted">{l}</p>
                </Link>
              ))}
            </div>
          </Card>
          {data.settings.existingSite && <SitePilotCard site={data.settings.existingSite} projectId={id} />}
          {data.settings.existingSite?.decision === "keep" && !data.settings.existingSite.newSiteRequested && !data.theme ? null : data.theme ? (
            <Card className="p-5">
              <p className="text-sm text-muted">{svc ? t("Site · version", "Website · version") : t("Boutique · version", "Store · version")} {data.theme.number}</p>
              <p className="mt-1 font-display text-xl">{t(`Direction « ${data.theme.direction} »`, `“${data.theme.direction}” direction`)}</p>
              <p className="mt-1 line-clamp-2 text-sm text-ink-2">{data.theme.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/studio/${id}/boutique`} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper">
                  <Store className="size-4" /> {t("Ouvrir l'éditeur", "Open the editor")} <ArrowRight className="size-4" />
                </Link>
                <Link href={`/studio/${id}/boutique?themes`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium hover:border-ink">
                  <Palette className="size-4" /> {t("Changer de thème", "Change theme")}
                </Link>
              </div>
            </Card>
          ) : (
            <Empty title={svc ? t("Votre site arrive", "Your website is on its way") : t("La boutique arrive", "Your store is on its way")} icon={<Store className="size-5" />}>{svc ? t("Il sera composé après la marque, les textes et les images.", "It will be built after the brand, the copy and the images.") : t("Elle sera composée après la marque, les textes et les images.", "It will be built after the brand, the copy and the images.")}</Empty>
          )}
          {pl?.job.finishedAt && <p className="text-xs text-muted">{t("Dernière exécution terminée le", "Last run finished on")} {formatDate(pl.job.finishedAt)}.</p>}
        </div>
      </div>}
      <ActivityGaps />
      <Questions />
      <ContentLanguage started={!!pl} />
      <Memory />
    </div>
  );
}
