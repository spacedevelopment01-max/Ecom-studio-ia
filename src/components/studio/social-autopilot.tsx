"use client";
/**
 * « Ma communication automatique » (Autopilot V2) et « Vue d'ensemble » du studio social. Réglages en 5 étapes
 * (objectif, réseaux, fréquence, préférences, validation), état RÉEL de chaque réseau, semaine éditoriale, accord
 * explicite pour le pilote, pause, historique. Aucun chiffre inventé : sans données réelles, « Données
 * indisponibles ».
 */
import { useEffect, useState } from "react";
import { Bot, CalendarDays, Check, History, Pause, Play, Power, Save, ShieldCheck, Sparkles } from "lucide-react";
import { api, Badge, Button, Card, cx, Input, Select, Spinner, useApi, useToast } from "../ui";
import { useT } from "../i18n";
import { useProject } from "./project-context";
import { VisualChoice } from "./visual-choice";
import type { VisualMode } from "@/lib/social-v2/visual-mode";

type Goal = "awareness" | "sales" | "community" | "balanced";
type Net = "instagram" | "facebook" | "tiktok" | "youtube" | "pinterest" | "linkedin";
type Kind = "main" | "info" | "demo" | "more" | "engage" | "convert";
type Config = {
  active: boolean; goal: Goal; platforms: Net[]; perDay: number; weekdays: number[]; slots: string[]; timezone: string; tone: string; language: "fr" | "en";
  commercial: 0 | 1 | 2; focus: string[]; formats: Partial<Record<"image" | "carousel" | "video" | "text", number>>; approval: "manual" | "auto"; autoKinds: Kind[]; exclude: string[];
  suspended: Net[]; horizonDays: number; produceDays: number; paidCapEurWeek: number; visual: VisualMode;
};
type NetworkStatus = { platform: Net; label: string; state: string; text: { fr: string; en: string }; account: string | null; missing: string[]; verified: boolean; note: { fr: string; en: string } | null };
type View = {
  settings: { config: Config; autopilot: boolean; consent: { at: number; by: string; text: string } | null; paused: boolean; lastRunAt: number | null; nextRunAt: number | null; lastResult: string | null; saved: boolean };
  networks: NetworkStatus[];
  limits: { plan: string; perDay: number; calendarDays: number; autopublish: boolean } | null;
  consentText: { fr: string; en: string };
  suggestedSlots: string[];
  memory: { items: { key: string; uses: number }[]; roles: number; materials: number; hooks: number; refused: number };
  log: { at: number; action: string; detail: string }[];
  week: { day: number; title: string; goal: string; roles: { title: string; kind: Kind }[] }[];
  ai: boolean;
  run?: { skipped?: string; created: number; produced: number; approved: number; scheduled: number; waiting: number; notes: string[] };
};

const GOALS: [Goal, string, string, string, string][] = [
  ["awareness", "Notoriété", "Awareness", "Se faire connaître : présentation, coulisses, conseils.", "Get known: introductions, behind the scenes, tips."],
  ["sales", "Ventes ou devis", "Sales or quotes", "Plus de publications qui mènent à l'achat ou à la demande de devis.", "More posts that lead to a purchase or a quote request."],
  ["community", "Communauté", "Community", "Questions, échanges, réponses : faire parler de vous.", "Questions, conversations, answers: get people talking."],
  ["balanced", "Équilibrée", "Balanced", "Un peu de tout, selon la semaine type.", "A bit of everything, following the standard week."],
];
const NETS: Net[] = ["instagram", "facebook", "tiktok", "youtube", "pinterest", "linkedin"];
const DAYS: [number, string, string][] = [[1, "Lun", "Mon"], [2, "Mar", "Tue"], [3, "Mer", "Wed"], [4, "Jeu", "Thu"], [5, "Ven", "Fri"], [6, "Sam", "Sat"], [0, "Dim", "Sun"]];
const KINDS: [Kind, string, string][] = [["main", "Publication principale", "Main post"], ["info", "Conseil / information", "Tip / information"], ["demo", "Démonstration", "Demonstration"], ["more", "Autre produit ou service", "Other product or service"], ["engage", "Échange avec la communauté", "Community engagement"], ["convert", "Vente / devis", "Sale / quote"]];
const STATE_TONE: Record<string, "ok" | "info" | "warn" | "bad" | "neutral" | "signal"> = { auto_available: "ok", connected: "signal", to_connect: "info", expired: "bad", needs_permission: "warn", unavailable: "neutral" };
const ACTIONS: Record<string, [string, string]> = {
  settings: ["Réglages enregistrés", "Settings saved"], consent: ["Pilote automatique activé (accord donné)", "Autopilot enabled (consent given)"], autopilot_off: ["Pilote automatique désactivé", "Autopilot disabled"],
  pause_all: ["Tout mis en pause", "Everything paused"], resume_all: ["Reprise", "Resumed"], produce: ["Visuels préparés (gratuits)", "Visuals prepared (free)"], paid_job: ["Visuels par l'IA lancés (dans le plafond)", "AI visuals started (within the cap)"],
  budget_low: ["Budget IA épuisé : visuels gratuits", "AI budget used up: free visuals"], to_review: ["Publications à valider signalées", "Posts to approve flagged"], auto_approve: ["Approbation par le pilote", "Autopilot approval"], run: ["Passage du pilote", "Autopilot run"],
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="grid gap-3 p-4 sm:p-5" data-autopilot-step={n}>
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><span className="grid size-7 place-items-center rounded-full bg-ink text-sm text-paper">{n}</span>{title}</h3>
      {children}
    </Card>
  );
}

export function AutopilotPanel({ onChanged }: { onChanged: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<View>(`/api/projects/${id}/social/v2/autopilot`);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState<View["run"] | null>(null);
  // Semaine type qui suit les choix en cours (fréquence, objectif, niveau commercial), même avant « Enregistrer ».
  const { data: preview } = useApi<{ week: View["week"] }>(cfg ? `/api/projects/${id}/social/v2/autopilot?preview=week&perDay=${cfg.perDay}&goal=${cfg.goal}&commercial=${cfg.commercial}&lang=${cfg.language}` : null);
  useEffect(() => {
    if (data && !cfg) setCfg(data.settings.config);
  }, [data, cfg]);
  if (!data || !cfg) return <div className="grid place-items-center py-16 text-muted"><Spinner className="size-6" /></div>;
  const set = <K extends keyof Config>(k: K, v: Config[K]) => setCfg({ ...cfg, [k]: v });
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const lim = data.limits;
  const call = async (name: string, body: unknown, ok: string) => {
    setBusy(name);
    try {
      const r = await api<View>(`/api/projects/${id}/social/v2/autopilot`, { body });
      setCfg(r.settings.config);
      if (r.run) setLast(r.run);
      toast("ok", ok);
      reload();
      onChanged();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const { approval: _approval, ...savable } = cfg;
  const save = (active?: boolean) => call("save", { action: "save", config: { ...savable, ...(active !== undefined ? { active } : {}) } }, t("Réglages enregistrés.", "Settings saved."));
  const s = data.settings;
  const statusLine = s.paused ? t("Tout est en pause : rien ne part, rien n'est préparé.", "Everything is paused: nothing is posted or prepared.") : !cfg.active ? t("Non activée.", "Not enabled.") : s.autopilot ? t("Active — pilote automatique (avec votre accord).", "Active — autopilot (with your consent).") : t("Active — vous validez chaque publication.", "Active — you approve each post.");

  return (
    <div className="grid min-w-0 gap-4" data-autopilot>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-lg font-semibold"><Bot className="size-5" aria-hidden />{t("Ma communication automatique", "My automatic communication")}</p>
          <p className="text-sm text-muted" data-autopilot-status>{statusLine}</p>
          {s.lastRunAt && <p className="text-xs text-muted">{t("Dernier passage", "Last run")} : {new Date(s.lastRunAt).toLocaleString()} — {s.lastResult}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {s.paused
            ? <Button size="sm" variant="secondary" icon={<Play className="size-4" />} loading={busy === "resume"} onClick={() => call("resume", { action: "resume_all" }, t("Reprise : chaque publication a été revérifiée.", "Resumed: every post was checked again."))}>{t("Tout reprendre", "Resume all")}</Button>
            : <Button size="sm" variant="secondary" icon={<Pause className="size-4" />} loading={busy === "pause"} onClick={() => call("pause", { action: "pause_all" }, t("Tout est en pause.", "Everything is paused."))} data-pause-all>{t("Tout mettre en pause", "Pause everything")}</Button>}
          {cfg.active && <Button size="sm" variant="secondary" icon={<Sparkles className="size-4" />} loading={busy === "run"} onClick={() => call("run", { action: "run_now" }, t("Passage terminé.", "Run finished."))} data-run-now>{t("Préparer maintenant (gratuit)", "Prepare now (free)")}</Button>}
        </div>
        {last && <p className="basis-full rounded-xl bg-paper-2 p-3 text-sm" data-run-result>{last.skipped ?? t(`${last.created} publication(s) préparée(s), ${last.produced} visuel(s) gratuit(s), ${last.approved} approuvée(s) par le pilote, ${last.scheduled} programmée(s), ${last.waiting} en attente de votre validation.`, `${last.created} post(s) prepared, ${last.produced} free visual(s), ${last.approved} approved by the autopilot, ${last.scheduled} scheduled, ${last.waiting} awaiting your approval.`)}</p>}
      </Card>

      {!lim && <Card className="p-4 text-sm" data-autopilot-demo>{t("Forfait Découverte : démonstration seulement. Les réglages se consultent, la préparation automatique et la publication demandent un forfait.", "Discovery plan: demo only. Settings can be viewed; automatic preparation and publishing need a plan.")}</Card>}

      <Step n={1} title={t("Votre objectif", "Your goal")}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup">
          {GOALS.map(([g, fr, en, dfr, den]) => (
            <button key={g} type="button" role="radio" aria-checked={cfg.goal === g} data-goal={g} onClick={() => set("goal", g)} className={cx("grid gap-1 rounded-2xl border p-3 text-left", cfg.goal === g ? "border-ink bg-paper-2" : "border-line hover:border-ink")}>
              <span className="font-medium">{t(fr, en)}</span><span className="text-xs text-muted">{t(dfr, den)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{t("Changer d'objectif ne supprime rien : les publications déjà prévues restent, les suivantes suivent le nouvel objectif.", "Changing the goal deletes nothing: planned posts stay, the next ones follow the new goal.")}</p>
      </Step>

      <Step n={2} title={t("Vos réseaux", "Your networks")}>
        <div className="grid gap-2" data-networks>
          {data.networks.map((n) => {
            const usable = n.state !== "unavailable";
            return (
              <div key={n.platform} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line p-3" data-network={n.platform} data-state={n.state}>
                <label className="flex min-w-40 items-center gap-2 font-medium"><input type="checkbox" disabled={!usable} checked={cfg.platforms.includes(n.platform)} onChange={() => set("platforms", toggle(cfg.platforms, n.platform))} />{n.label}</label>
                <Badge tone={STATE_TONE[n.state] ?? "neutral"}>{t(n.text.fr, n.text.en)}</Badge>
                {n.account && <span className="text-xs text-muted">{n.account}</span>}
                {n.missing.length > 0 && <span className="text-xs text-warn">{t("Manque", "Missing")} : {n.missing.join(", ")}</span>}
                {n.note && <span className="basis-full text-xs text-muted">{t(n.note.fr, n.note.en)}</span>}
                {usable && cfg.platforms.includes(n.platform) && (
                  <label className="ml-auto flex items-center gap-1.5 text-xs"><input type="checkbox" checked={cfg.suspended.includes(n.platform)} onChange={() => set("suspended", toggle(cfg.suspended, n.platform))} />{t("Suspendre ce réseau", "Suspend this network")}</label>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted">{t("Un même contenu est adapté à chaque réseau choisi (variantes) : il compte pour une seule publication dans votre forfait.", "One piece of content is adapted to each chosen network (variants): it counts as a single post in your plan.")}</p>
      </Step>

      <Step n={3} title={t("Fréquence", "Frequency")}>
        <div className="flex flex-wrap gap-2" data-perday>
          {[1, 3, 5].map((n) => {
            const over = !!lim && n > lim.perDay;
            return <button key={n} type="button" disabled={over || !lim} onClick={() => set("perDay", n)} className={cx("h-10 rounded-xl px-4 text-sm", cfg.perDay === n ? "bg-ink text-paper" : "border border-line", (over || !lim) && "cursor-not-allowed opacity-40")} title={over ? t("Forfait supérieur nécessaire", "Higher plan needed") : undefined}>{n} {t("par jour", "per day")}</button>;
          })}
        </div>
        {lim && <p className="text-xs text-muted">{t(`Votre forfait : jusqu'à ${lim.perDay} publication(s) par jour, ${lim.calendarDays} jours à l'avance.`, `Your plan: up to ${lim.perDay} post(s) per day, ${lim.calendarDays} days ahead.`)}</p>}
        <div className="flex flex-wrap gap-1.5" data-weekdays>
          {DAYS.map(([d, fr, en]) => <button key={d} type="button" aria-pressed={cfg.weekdays.includes(d)} onClick={() => set("weekdays", toggle(cfg.weekdays, d))} className={cx("h-9 min-w-12 rounded-xl px-2 text-sm", cfg.weekdays.includes(d) ? "bg-ink text-paper" : "border border-line")}>{t(fr, en)}</button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">{t("Heures", "Times")}
            <Input value={cfg.slots.join(", ")} onChange={(e) => set("slots", e.target.value.split(/[,\s]+/).filter(Boolean))} placeholder="09:00, 12:30, 18:00" />
            <span className="text-xs text-muted">{t("Heures courantes proposées — sans vos statistiques, impossible de dire lesquelles sont les meilleures.", "Common suggested times — without your statistics, we can't say which are best.")}</span>
          </label>
          <label className="grid gap-1 text-sm">{t("Jours préparés à l'avance", "Days prepared ahead")}
            <Input type="number" min={1} max={lim?.calendarDays ?? 7} value={cfg.horizonDays} onChange={(e) => set("horizonDays", Number(e.target.value))} />
          </label>
          <label className="grid gap-1 text-sm">{t("Fuseau horaire", "Time zone")}
            <Input value={cfg.timezone} onChange={(e) => set("timezone", e.target.value)} />
          </label>
        </div>
      </Step>

      <Step n={4} title={t("Vos préférences", "Your preferences")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">{t("Ton", "Tone")}<Input value={cfg.tone} onChange={(e) => set("tone", e.target.value)} placeholder={t("ex. chaleureux, direct", "e.g. warm, direct")} /></label>
          <label className="grid gap-1 text-sm">{t("Langue des publications", "Post language")}
            <Select value={cfg.language} onChange={(e) => set("language", e.target.value as "fr" | "en")}><option value="fr">Français</option><option value="en">English</option></Select>
          </label>
          <label className="grid gap-1 text-sm">{t("Niveau commercial", "Sales level")}
            <Select value={cfg.commercial} onChange={(e) => set("commercial", Number(e.target.value) as 0 | 1 | 2)}>
              <option value={0}>{t("Discret (pas de vente directe)", "Low-key (no direct selling)")}</option>
              <option value={1}>{t("Mesuré", "Moderate")}</option>
              <option value={2}>{t("Affirmé", "Assertive")}</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm">{t("Produits ou services prioritaires", "Priority products or services")}
            <Input value={cfg.focus.join(", ")} onChange={(e) => set("focus", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} placeholder={t("noms séparés par des virgules", "names separated by commas")} />
          </label>

        </div>
        <VisualChoice value={cfg.visual} onChange={(v) => set("visual", v)} ai={data.ai} name="visual-mode-autopilot" />
        {cfg.visual !== "free" && (
          <label className="grid max-w-sm gap-1 text-sm">{t("Budget IA maximum par semaine pour ces visuels (€)", "Maximum AI budget per week for these visuals (€)")}
            <Input type="number" min={0} max={50} step={0.5} value={cfg.paidCapEurWeek} onChange={(e) => set("paidCapEurWeek", Number(e.target.value))} data-paid-cap />
            <span className="text-xs text-muted">{cfg.paidCapEurWeek > 0 ? t("Le studio ne dépasse jamais ce montant ; au-delà, il continue avec des visuels gratuits.", "The studio never goes over this amount; beyond it, it continues with free visuals.") : t("À 0 €, les visuels restent gratuits : indiquez un montant pour autoriser l'IA.", "At €0, visuals stay free: enter an amount to allow AI.")}</span>
          </label>
        )}
        <div className="flex flex-wrap gap-2" data-formats>
          {(["image", "carousel", "video", "text"] as const).map((f) => {
            const on = (cfg.formats[f] ?? 0) > 0;
            return <button key={f} type="button" aria-pressed={on} onClick={() => set("formats", { ...cfg.formats, [f]: on ? 0 : 25 })} className={cx("h-9 rounded-xl px-3 text-sm", on ? "bg-ink text-paper" : "border border-line")}>{t({ image: "Image", carousel: "Carrousel", video: "Vidéo", text: "Texte" }[f], { image: "Image", carousel: "Carousel", video: "Video", text: "Text" }[f])}</button>;
          })}
          <span className="self-center text-xs text-muted">{t("Aucun choisi : le studio équilibre selon les réseaux. Vidéo : seulement si une vraie vidéo existe.", "None chosen: the studio balances by network. Video: only when a real video exists.")}</span>
        </div>
      </Step>

      <Step n={5} title={t("Validation", "Approval")}>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
          <button type="button" role="radio" aria-checked={!s.autopilot} data-approval="manual" onClick={() => s.autopilot && call("disable", { action: "disable" }, t("Pilote désactivé : ses approbations reviennent « à valider ».", "Autopilot off: its approvals go back to review."))} className={cx("grid gap-1 rounded-2xl border p-3 text-left", !s.autopilot ? "border-ink bg-paper-2" : "border-line")}>
            <span className="flex items-center gap-1.5 font-medium"><Check className="size-4" />{t("Je valide chaque publication", "I approve each post")}</span>
            <span className="text-xs text-muted">{t("Le studio prépare ; rien ne part sans votre accord.", "The studio prepares; nothing is posted without your approval.")}</span>
          </button>
          <div className={cx("grid gap-2 rounded-2xl border p-3", s.autopilot ? "border-ink bg-paper-2" : "border-line")} data-approval="auto">
            <span className="flex items-center gap-1.5 font-medium"><ShieldCheck className="size-4" />{t("Pilote automatique", "Autopilot")}</span>
            {s.autopilot && s.consent ? (
              <>
                <span className="text-xs text-muted" data-consent>{t("Accord donné le", "Consent given on")} {new Date(s.consent.at).toLocaleString()}.</span>
                <Button size="sm" variant="secondary" icon={<Power className="size-4" />} loading={busy === "disable"} onClick={() => call("disable", { action: "disable" }, t("Pilote désactivé.", "Autopilot disabled."))} data-disable>{t("Désactiver tout de suite", "Turn off now")}</Button>
              </>
            ) : (
              <>
                <p className="text-xs">{t(data.consentText.fr, data.consentText.en)}</p>
                <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-consent-check />{t("J'ai lu et j'accepte ce texte.", "I have read and accept this text.")}</label>
                <Button size="sm" disabled={!agree || !lim?.autopublish} loading={busy === "enable"} onClick={async () => { await save(true); await call("enable", { action: "enable", consent: t(data.consentText.fr, data.consentText.en) }, t("Pilote automatique activé.", "Autopilot enabled.")); }} data-enable>{t("Activer le pilote automatique", "Enable the autopilot")}</Button>
              </>
            )}
          </div>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">{t("Ce que le pilote peut approuver seul", "What the autopilot may approve alone")}</p>
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map(([k, fr, en]) => <button key={k} type="button" aria-pressed={cfg.autoKinds.includes(k)} onClick={() => set("autoKinds", toggle(cfg.autoKinds, k))} className={cx("h-8 rounded-xl px-2.5 text-xs", cfg.autoKinds.includes(k) ? "bg-ink text-paper" : "border border-line")}>{t(fr, en)}</button>)}
          </div>
          <label className="grid gap-1 text-sm">{t("Mots qui demandent toujours votre validation", "Words that always need your approval")}
            <Input value={cfg.exclude.join(", ")} onChange={(e) => set("exclude", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} placeholder={t("ex. promotion, prix", "e.g. promotion, price")} />
          </label>
        </div>
      </Step>

      <div className="flex flex-wrap gap-2">
        <Button icon={<Save className="size-4" />} loading={busy === "save"} disabled={!lim} onClick={() => save(true)} data-save-activate>{cfg.active ? t("Enregistrer", "Save") : t("Enregistrer et activer", "Save and enable")}</Button>
        {cfg.active && <Button variant="secondary" loading={busy === "off"} onClick={() => call("off", { action: "save", config: { ...savable, active: false } }, t("Communication automatique arrêtée (rien n'est supprimé).", "Automatic communication stopped (nothing deleted)."))}>{t("Arrêter la préparation automatique", "Stop automatic preparation")}</Button>}
      </div>

      <Card className="grid gap-3 p-4 sm:p-5" data-week>
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><CalendarDays className="size-5" aria-hidden />{t("Votre semaine type", "Your standard week")}</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(preview?.week ?? data.week).map((d) => (
            <div key={d.day} className={cx("grid gap-1 rounded-2xl border border-line p-3", !cfg.weekdays.includes(d.day) && "opacity-40")}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t(["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][d.day], ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.day])}</p>
              <p className="font-medium">{d.title}</p>
              <ol className="list-decimal pl-4 text-xs text-muted">{d.roles.map((r, i) => <li key={i}>{r.title}</li>)}</ol>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">{t("Rien d'inventé : sans information vérifiée (équipe, avis, promotion, chantier…), la publication indique « [À compléter] » au lieu de l'inventer.", "Nothing invented: without verified information (team, reviews, promotion, job site…), the post says \"[To complete]\" instead of making it up.")}</p>
      </Card>

      <Card className="grid gap-2 p-4 sm:p-5" data-history>
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><History className="size-5" aria-hidden />{t("Historique", "History")}</h3>
        {data.log.length === 0 ? <p className="text-sm text-muted">{t("Aucune action pour l'instant.", "No action yet.")}</p> : (
          <ul className="grid gap-1 text-sm">
            {data.log.slice(0, 15).map((l, i) => <li key={i} className="flex flex-wrap gap-2"><span className="tabular-nums text-muted">{new Date(l.at).toLocaleString()}</span><span>{t(ACTIONS[l.action]?.[0] ?? l.action, ACTIONS[l.action]?.[1] ?? l.action)}</span>{l.action === "run" && <span className="text-muted">— {l.detail}</span>}</li>)}
          </ul>
        )}
      </Card>
    </div>
  );
}

const STATUS_FR: [string, string, string][] = [["planned", "Idées", "Ideas"], ["review", "En attente de validation", "Awaiting approval"], ["approved", "Approuvées", "Approved"], ["scheduled", "Programmées", "Scheduled"], ["published", "Publiées", "Published"], ["failed", "Échecs", "Failed"], ["uncertain", "À vérifier", "To verify"]];

/** Vue d'ensemble : uniquement des chiffres réels du studio ; statistiques des réseaux seulement si elles existent. */
export function SocialOverview({ counts, posts, hasMetrics, statsNote, onGo }: { counts: Record<string, number>; posts: { status: string; scheduledAt: number | null; network: string; blocking: string[] }[]; hasMetrics: boolean; statsNote: string; onGo: (s: string) => void }) {
  const t = useT();
  const week = posts.filter((p) => p.scheduledAt && p.scheduledAt > Date.now() && p.scheduledAt < Date.now() + 7 * 86_400_000 && p.status !== "cancelled");
  const incomplete = posts.filter((p) => ["planned", "draft", "review"].includes(p.status) && p.blocking.some((b) => /compléter|to complete/i.test(b))).length;
  return (
    <div className="grid min-w-0 gap-4" data-overview>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUS_FR.map(([k, fr, en]) => (
          <Card key={k} className="p-3"><p className="text-xs text-muted">{t(fr, en)}</p><p className="font-display text-2xl font-semibold tabular-nums" data-count={k}>{counts[k] ?? 0}</p></Card>
        ))}
        <Card className="p-3"><p className="text-xs text-muted">{t("À compléter", "To complete")}</p><p className="font-display text-2xl font-semibold tabular-nums" data-count="incomplete">{incomplete}</p></Card>
      </div>
      <Card className="grid gap-2 p-4 sm:p-5">
        <p className="font-medium">{t("Les 7 prochains jours", "Next 7 days")} : {week.length} {t("publication(s) prévue(s)", "post(s) planned")}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onGo("calendrier")}>{t("Ouvrir le calendrier", "Open the calendar")}</Button>
          <Button size="sm" variant="secondary" onClick={() => onGo("pilote")}>{t("Ma communication automatique", "My automatic communication")}</Button>
          <Button size="sm" variant="secondary" onClick={() => onGo("creer")}>{t("Générer mon calendrier", "Generate my calendar")}</Button>
        </div>
      </Card>
      <Card className="p-4 sm:p-5" data-overview-stats>
        <p className="font-medium">{t("Statistiques des réseaux", "Network statistics")}</p>
        <p className="text-sm text-muted">{hasMetrics ? statsNote : t("Données indisponibles : aucune statistique n'a encore été reçue des réseaux. Rien n'est estimé ni inventé.", "Data unavailable: no statistics have been received from the networks yet. Nothing is estimated or invented.")}</p>
      </Card>
    </div>
  );
}
