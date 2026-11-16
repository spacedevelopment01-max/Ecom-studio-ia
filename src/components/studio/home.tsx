"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Phone, Briefcase, Palette, Plus, Settings, Shield, Sparkles, Store } from "lucide-react";
import { api, Badge, Button, Card, formatDate, Logo, Select, ThemeToggle, useApi, useToast } from "../ui";
import type { BusinessType } from "@/lib/project-types";
import { LangSwitch, useLang, useT } from "../i18n";
import { QuotaBanner, UsageMeter, useBilling } from "../billing-client";
import { LogoutButton } from "../password-forms";
import { PLANS, type Billing, type PlanId } from "@/lib/plans";
import { NewSubscription } from "./new-subscription";
import { ProjectSubscriptionDialog, SUB_STATUS } from "./project-subscription";
import { isPlatform, platformInfo } from "./platform-picker";
import { DeleteProjectButton } from "./delete-project";
import { SynaThread } from "./syna-thread";

type ProjectCard = { id: string; name: string; status: string; sector: string | null; platform: string; business: BusinessType; updatedAt: number; cover: string | null; palette: Record<string, string> | null; brand: string | null; logo: string | null; subscription: { id: string; plan: PlanId; status: string; billing: Billing | null; periodEnd: number | null; cancelAtPeriodEnd: boolean } | null; ai: { plan: { used: number }; credits: { used: number } | null; paused: boolean } | null };

const STATUS: Record<string, { label: string; labelEn: string; tone: any }> = {
  queued: { label: "En file", labelEn: "Queued", tone: "neutral" },
  creating: { label: "En création", labelEn: "Creating", tone: "info" },
  awaiting_validation: { label: "À valider", labelEn: "To review", tone: "warn" },
  ready: { label: "Prêt", labelEn: "Ready", tone: "ok" },
  error: { label: "À reprendre", labelEn: "Needs attention", tone: "bad" },
  paused: { label: "En pause", labelEn: "Paused", tone: "warn" },
  draft: { label: "À démarrer", labelEn: "Not started", tone: "neutral" },
  building: { label: "En création avec SINA", labelEn: "Being created with SINA", tone: "info" },
};

type Pending = { id: string; plan: PlanId; billing: Billing | null; createdAt: number | null };
type Hidden = { id: string; name: string; updatedAt: number };

/** Paramètres d'adresse : ?nouveau=1 (créer un projet), ?plan=&billing= (forfait présélectionné), ?abonnement= (abonnement payé à utiliser). */
function useStudioParams() {
  const [p, setP] = useState<{ nouveau: boolean; plan: PlanId | null; abonnement: string | null; paiement: string | null }>({ nouveau: false, plan: null, abonnement: null, paiement: null });
  useEffect(() => {
    const u = new URL(window.location.href);
    const plan = u.searchParams.get("plan");
    setP({ nouveau: u.searchParams.has("nouveau") || u.searchParams.has("abonnement"), plan: plan && plan in PLANS ? (plan as PlanId) : null, abonnement: u.searchParams.get("abonnement"), paiement: u.searchParams.get("paiement") });
  }, []);
  return p;
}

export function StudioHome({agentEnabled=false}:{agentEnabled?:boolean}) {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const params = useStudioParams();
  const { data, error, reload: reloadProjects } = useApi<{ projects: ProjectCard[]; pending: Pending[]; hidden: Hidden[]; subscriptions: number }>("/api/projects", { poll: 8000 });
  const { data: me } = useApi<{ user: { role: string; name: string } }>("/api/me");
  const [creating, setCreating] = useState(false);
  const [useSub, setUseSub] = useState<string | null>(null);
  const [manage, setManage] = useState<ProjectCard | null>(null);
  const { billing } = useBilling({ poll: 60000 });
  const projects = data?.projects ?? [];
  const pending = data?.pending ?? [];
  const hidden = data?.hidden ?? [];
  // Retour du paiement : l'abonnement n'existe qu'une fois le paiement confirmé par le serveur (quelques secondes).
  useEffect(() => {
    if (!params.paiement) return;
    toast("info", params.paiement === "ok" ? t("Retour du paiement : votre abonnement apparaîtra après confirmation par le serveur. Consultez son état avant un nouvel achat.", "Back from payment: your subscription will appear after server confirmation. Check its status before another purchase.") : t("Vous avez quitté le paiement. Vérifiez son état avant de recommencer.", "You left checkout. Check its status before trying again."));
    window.history.replaceState(null, "", "/studio");
  }, [params.paiement, toast, t]);
  useEffect(() => {
    if (params.nouveau) setCreating(true);
    if (params.abonnement) setUseSub(params.abonnement);
  }, [params.nouveau, params.abonnement]);
  // Tant que la liste n'est pas chargée : squelette.
  const firstLoad = !data && !error;
  const freeSub = pending.find((s) => s.id === useSub) ?? pending[0] ?? null;
  const discovery = !!data && data.subscriptions === 0 && projects.length === 0;
  const showNew = creating || (!!data && projects.length === 0 && pending.length > 0);
  const startNew = () => {
    setCreating(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const resume = async (h: Hidden) => {
    try {
      await api(`/api/projects/hidden/${h.id}`, { body: freeSub ? { subscription: freeSub.id } : {} });
      toast("ok", t("Projet repris : il est maintenant rattaché à cet abonnement.", "Project resumed: it is now tied to this subscription."));
      reloadProjects();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
          <Link href="/" aria-label="E-COM STUDIO IA" className="shrink-0"><span className="hidden sm:inline"><Logo /></span><span className="sm:hidden"><Logo compact /></span></Link>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            {me?.user.role === "admin" && <Link href="/admin" className="hidden h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm sm:inline-flex"><Shield className="size-4" /> {t("Administration", "Admin")}</Link>}
            <Link href="/studio/rendez-vous" aria-label={t("Rendez-vous", "Appointments")} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-card px-3 text-sm sm:px-4"><Phone className="size-4" /> <span className="hidden lg:inline">{t("Rendez-vous", "Appointments")}</span></Link>
            <Link href="/studio/themes" aria-label={t("Thèmes", "Themes")} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-card px-3 text-sm sm:px-4"><Palette className="size-4" /> <span className="hidden sm:inline">{t("Thèmes", "Themes")}</span></Link>
            <Link href="/studio/compte" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-card px-3 text-sm sm:px-4" aria-label={t("Mon compte", "My account")}><Settings className="size-4" /> <span className="hidden sm:inline">{t("Mon compte", "My account")}</span></Link>
            <LangSwitch />
            <ThemeToggle />
            <LogoutButton iconOnly className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-card text-ink-2 hover:border-ink hover:text-ink" />
          </div>
        </div>
      </header>
      <QuotaBanner billing={billing} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {firstLoad && !creating ? (
          <div aria-busy="true" aria-label={t("Chargement de vos projets", "Loading your projects")}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="skeleton h-10 w-56 rounded-xl" />
                <div className="skeleton mt-2 h-4 w-72 max-w-full rounded" />
              </div>
              <div className="skeleton h-10 w-40 rounded-full" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-3xl border border-line bg-card">
                  <div className="skeleton aspect-[4/3] rounded-none" />
                  <div className="grid gap-2 p-4"><div className="skeleton h-5 w-2/3 rounded" /><div className="skeleton h-3 w-1/2 rounded" /></div>
                </div>
              ))}
            </div>
          </div>
        ) : showNew && freeSub ? (
          <div className="mx-auto grid max-w-3xl gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <span>{t("Abonnement sélectionné", "Selected subscription")} : {PLANS[freeSub.plan].name[lang]}</span>
              {pending.length > 1 && (
                <Select aria-label={t("Abonnement à utiliser", "Subscription to use")} value={freeSub.id} onChange={(e) => setUseSub(e.target.value)}>
                  {pending.map((s) => <option key={s.id} value={s.id}>{PLANS[s.plan].name[lang]}</option>)}
                </Select>
              )}
            </div>
            {/* Une seule porte : le projet se crée en parlant à SINA. */}
            {agentEnabled ? (
              <Card className="overflow-hidden"><div className="h-[70vh]"><SynaThread key={freeSub.id} projectId={null} subscriptionKey={freeSub.id} /></div></Card>
            ) : (
              <Card className="p-6 text-center" data-testid="sina-fermee">
                <p className="font-display text-xl font-semibold">{t("SINA revient dans un instant", "SINA will be back in a moment")}</p>
                <p className="mt-2 text-sm text-ink-2">{t("Votre abonnement est conservé : votre projet se créera avec elle dès son retour.", "Your subscription is kept: your project will be created with her as soon as she is back.")}</p>
              </Card>
            )}
            {projects.length > 0 && <div className="flex justify-center"><Button variant="ghost" onClick={() => setCreating(false)}>{t("Mes projets", "My projects")}</Button></div>}
          </div>
        ) : creating || discovery ? (
          <div>
            {discovery && !creating ? (
              <div className="mb-10 grid gap-6 rounded-[2rem] border border-line bg-card p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[.18em] text-signal">{t("Compte Découverte · gratuit", "Discovery account · free")}</p>
                  <h1 className="mt-3 font-display text-4xl font-semibold">{t("Découvrez le studio, gratuitement.", "Discover the studio, for free.")}</h1>
                  <p className="mt-3 text-ink-2">{t("Votre compte gratuit ouvre le studio de démonstration : les 30 thèmes, des marques, boutiques, publicités et calendriers d'exemple. Pour créer votre vrai projet, choisissez un forfait ci-dessous.", "Your free account opens the demo studio: all 30 themes, sample brands, stores, ads and calendars. To create your real project, choose a plan below.")}</p>
                </div>
                <Link href="/studio/decouverte" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-paper"><Sparkles className="size-4" aria-hidden /> {t("Ouvrir le studio de démonstration", "Open the demo studio")}</Link>
              </div>
            ) : (
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[.18em] text-signal">{t("Nouveau projet", "New project")}</p>
                  <h1 className="mt-2 font-display text-4xl font-semibold">{t("Choisissez l'abonnement de ce projet", "Choose this project's subscription")}</h1>
                </div>
                {projects.length > 0 && <Button variant="ghost" onClick={() => setCreating(false)}>{t("← Retour à mes projets", "← Back to my projects")}</Button>}
              </div>
            )}
            <NewSubscription paymentsOpen={!!billing?.paymentsLive} initialPlan={params.plan} />
            {hidden.length > 0 && <p className="mt-6 text-center text-sm text-ink-2">{t(`Vos ${hidden.length} essai(s) gratuit(s) précédent(s) sont conservés : après votre premier abonnement, vous pourrez reprendre l'un d'eux comme projet.`, `Your ${hidden.length} previous free trial(s) are kept: after your first subscription, you can take one of them as your project.`)}</p>}
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-4xl font-semibold">{t("Mes projets", "My projects")}</h1>
                <p className="mt-1 text-muted">{t(`${projects.length} projet${projects.length > 1 ? "s" : ""} · 1 abonnement par projet`, `${projects.length} project${projects.length > 1 ? "s" : ""} · 1 subscription per project`)}</p>
              </div>
              <Button variant="signal" icon={<Plus className="size-4" />} onClick={startNew}>{t("Nouveau projet", "New project")}</Button>
            </div>
            {pending.length > 0 && (
              <div className="mb-6 grid gap-2">
                {pending.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-signal bg-signal-soft p-4">
                    <p className="text-sm"><strong>{t(`Abonnement ${PLANS[s.plan].name.fr} payé`, `${PLANS[s.plan].name.en} subscription paid`)}</strong> · {t("en attente de création de projet. Vous ne payez pas une seconde fois.", "waiting for its project. You don't pay twice.")}</p>
                    <Button size="sm" variant="signal" onClick={() => (setUseSub(s.id), startNew())}>{t("Créer ce projet", "Create this project")}</Button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => <ProjectTile key={p.id} p={p} onManage={() => setManage(p)} onDeleted={() => reloadProjects()} />)}
              <button type="button" onClick={startNew} className="grid min-h-64 place-items-center rounded-3xl border-2 border-dashed border-line bg-card/50 p-6 text-center transition hover:border-ink">
                <span>
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-paper-2"><Plus className="size-5" aria-hidden /></span>
                  <span className="mt-3 block font-display text-lg font-semibold">{t("Créer un nouveau projet", "Create a new project")}</span>
                  <span className="mt-1 block text-sm text-muted">{pending.length ? t("Avec votre abonnement payé en attente", "With your paid subscription waiting") : t("Avec un nouvel abonnement", "With a new subscription")}</span>
                </span>
              </button>
            </div>
            {hidden.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-xl font-semibold">{t("Anciens essais gratuits", "Former free trials")}</h2>
                <p className="mt-1 text-sm text-ink-2">{t("Conservés tels quels. Un abonnement payé encore libre peut reprendre l'un d'eux comme son projet.", "Kept as they are. A paid subscription that's still free can take one of them as its project.")}</p>
                <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-card">
                  {hidden.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                      <span>{h.name} <span className="text-muted">· {formatDate(h.updatedAt, { day: "numeric", month: "short", year: "numeric" })}</span></span>
                      {pending.length ? <Button size="sm" variant="secondary" onClick={() => resume(h)}>{t("Reprendre avec mon abonnement", "Resume with my subscription")}</Button> : <span className="text-muted">{t("Nécessite un abonnement", "Needs a subscription")}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
      {manage && <ProjectSubscriptionDialog open projectId={manage.id} name={manage.brand ?? manage.name} onClose={() => setManage(null)} onChanged={() => reloadProjects()} />}
    </div>
  );
}

/** Carte d'un projet : visuel ou logo, activité, forfait, statut de l'abonnement, échéance, IA restante, actions. */
function ProjectTile({ p, onManage, onDeleted }: { p: ProjectCard; onManage: () => void; onDeleted: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const s = p.subscription;
  const st = SUB_STATUS[s?.status ?? "none"] ?? SUB_STATUS.none;
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-card transition hover:shadow-soft">
      <Link href={`/studio/${p.id}/pilote`} className="relative block aspect-[4/3] bg-paper-2" aria-label={t(`Ouvrir ${p.brand ?? p.name}`, `Open ${p.brand ?? p.name}`)}>
        {p.cover ? <img src={p.cover} alt="" className="size-full object-cover transition duration-700 group-hover:scale-105" /> : p.logo ? <img src={p.logo} alt="" className="absolute inset-0 m-auto max-h-20 max-w-[60%] object-contain" /> : p.business === "services" ? <Briefcase className="absolute inset-0 m-auto size-8 text-muted" /> : <Store className="absolute inset-0 m-auto size-8 text-muted" />}
        <Badge tone={STATUS[p.status]?.tone ?? "neutral"} dot className="absolute left-3 top-3">{(lang === "en" ? STATUS[p.status]?.labelEn : STATUS[p.status]?.label) ?? p.status}</Badge>
        {p.logo && p.cover && <img src={p.logo} alt="" className="absolute bottom-3 left-3 h-9 max-w-[40%] rounded-lg bg-card/90 object-contain p-1 backdrop-blur" />}
      </Link>
      <div className="grid flex-1 gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold">{p.brand ?? p.name}</p>
          <p className="truncate text-xs text-muted">{p.business === "services" ? t("Services", "Services") : t("Boutique", "Store")}{p.sector ? ` · ${p.sector}` : ""}{isPlatform(p.platform) ? ` · ${platformInfo(p.platform, p.business, t).short}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {s ? <span className="font-medium">{PLANS[s.plan].name[lang]}</span> : <span className="text-muted">{t("Sans abonnement", "No subscription")}</span>}
          <Badge tone={st.tone} dot>{st[lang]}</Badge>
          {s?.periodEnd && <span className="text-xs text-muted">{s.cancelAtPeriodEnd || s.status === "canceled" ? t("fin le", "ends") : t("échéance le", "renews")} {formatDate(s.periodEnd, { day: "numeric", month: "short" })}</span>}
        </div>
        {p.ai && (
          <div>
            <p className="flex justify-between text-xs text-ink-2"><span>{t("IA du forfait", "Plan AI")}</span><span className="tabular-nums">{p.ai.paused ? t("En pause", "Paused") : t(`reste ${100 - p.ai.plan.used} %`, `${100 - p.ai.plan.used}% left`)}</span></p>
            <div className="mt-1"><UsageMeter used={p.ai.plan.used} label={t("IA du forfait", "Plan AI")} thin /></div>
          </div>
        )}
        <div className="mt-auto grid gap-2 pt-1">
          <Link href={`/studio/${p.id}/pilote`} className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-4 text-sm font-medium text-paper">{t("Ouvrir le studio", "Open the studio")} <ArrowRight className="size-4" aria-hidden /></Link>
          {s && <button type="button" onClick={onManage} className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full border border-line px-4 text-sm font-medium hover:border-ink">{t("Gérer mon abonnement", "Manage my subscription")}</button>}
        </div>
      </div>
      <DeleteProjectButton compact projectId={p.id} name={p.brand ?? p.name} onDeleted={onDeleted} className="absolute right-3 top-3 opacity-100 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100" />
    </div>
  );
}
