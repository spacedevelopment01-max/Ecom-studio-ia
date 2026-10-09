"use client";
import { SocialStudio } from "./social-studio";
import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Sparkles, Settings2 } from "lucide-react";
import { api, Button, Card, cx, Field, Input, Modal, Select, Textarea, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { JobProgress, useActive } from "./common";
import { NETWORKS, NetworkDot, POST_STATUS, PostEditor, type PostView } from "./post-editor";
import { useLang, useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";

type ViewMode = "month" | "week" | "day";

function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { id, data, reload } = useProject();
  const toast = useToast();
  const t = useT();
  const [r, setR] = useState(data?.settings.autopublish ?? { enabled: false, networks: [], requireApprovalFor: [] });
  useEffect(() => {
    if (data) setR(data.settings.autopublish);
  }, [data]);
  return (
    <Modal open={open} onClose={onClose} title={t("Règles d'automatisation", "Automation rules")}>
      <p className="text-sm text-muted">{t("Lorsqu'elles sont activées, les publications préparées en mode automatique sont programmées sans validation individuelle, uniquement sur les réseaux cochés et avec un compte connecté. Elles partent ensuite à l'heure prévue, même navigateur fermé.", "When enabled, posts prepared in automatic mode are scheduled without individual approval, only on the checked networks and with a connected account. They then go out at the planned time, even with the browser closed.")}</p>
      <div className="mt-4 grid gap-3">
        <Toggle checked={r.enabled} onChange={(v) => setR({ ...r, enabled: v })} label={t("Autoriser la programmation automatique", "Allow automatic scheduling")} />
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(NETWORKS).map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={r.networks.includes(n)} onChange={(e) => setR({ ...r, networks: e.target.checked ? [...r.networks, n] : r.networks.filter((x) => x !== n) })} className="size-4 accent-[var(--signal)]" /> {NETWORKS[n].label}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={r.requireApprovalFor.includes("video")} onChange={(e) => setR({ ...r, requireApprovalFor: e.target.checked ? [...r.requireApprovalFor, "video"] : r.requireApprovalFor.filter((x) => x !== "video") })} className="size-4 accent-[var(--signal)]" /> {t("Toujours valider les vidéos à la main", "Always approve videos manually")}</label>
      </div>
      <Button className="mt-5" onClick={async () => { await api(`/api/projects/${id}`, { method: "PATCH", body: { settings: { autopublish: r } } }); toast("ok", t("Règles enregistrées.", "Rules saved.")); reload(); onClose(); }}>{t("Enregistrer", "Save")}</Button>
    </Modal>
  );
}

function LegacyCalendrier() {
  const { id, data: project } = useProject();
  const toast = useToast();
  const t = useT();
  const { lang } = useLang();
  const locale = lang === "en" ? enUS : fr;
  const st = (s: string) => (POST_STATUS[s] ? t(POST_STATUS[s].label, POST_STATUS[s].en) : s);
  const tz = project?.settings.timezone ?? "Europe/Paris";
  const [mode, setMode] = useState<ViewMode>("month");
  // Téléphone : la vue Semaine (liste lisible) par défaut ; la vue Mois n'y montre que le nombre de publications par jour.
  useEffect(() => {
    try {
      if (window.matchMedia("(max-width: 639px)").matches) setMode("week");
    } catch {}
  }, []);
  const [cursor, setCursor] = useState(() => toZonedTime(new Date(), tz));
  const [openPost, setOpenPost] = useState<PostView | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const active = useActive(["calendar.plan", "video.render", "post."]);
  const range = useMemo(() => {
    if (mode === "month") return [startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })];
    if (mode === "week") return [startOfWeek(cursor, { weekStartsOn: 1 }), endOfWeek(cursor, { weekStartsOn: 1 })];
    return [cursor, cursor];
  }, [mode, cursor]);
  const from = fromZonedTime(format(range[0], "yyyy-MM-dd") + "T00:00:00", tz).getTime();
  const to = fromZonedTime(format(addDays(range[1], 1), "yyyy-MM-dd") + "T00:00:00", tz).getTime();
  const { data, reload } = useApi<{ posts: PostView[] }>(`/api/projects/${id}/posts?from=${from}&to=${to}`, { poll: 10000 });
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  const days: Date[] = [];
  for (let d = range[0]; d <= range[1]; d = addDays(d, 1)) days.push(d);
  const postsOn = (d: Date) => (data?.posts ?? []).filter((p) => p.scheduledAt && formatInTimeZone(new Date(p.scheduledAt), tz, "yyyy-MM-dd") === format(d, "yyyy-MM-dd")).sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
  const move = async (postId: string, day: Date) => {
    const p = data?.posts.find((x) => x.id === postId);
    if (!p || !p.scheduledAt) return;
    if (["published", "publishing"].includes(p.status)) return toast("bad", t("Une publication envoyée ne peut pas être déplacée.", "A post that has been sent cannot be moved."));
    const time = formatInTimeZone(new Date(p.scheduledAt), tz, "HH:mm");
    try {
      await api(`/api/posts/${postId}`, { method: "PATCH", body: { scheduledAt: fromZonedTime(`${format(day, "yyyy-MM-dd")}T${time}:00`, tz).getTime() } });
      toast("ok", p.status === "scheduled" ? t("Déplacée : à valider de nouveau.", "Moved: needs approval again.") : t("Publication déplacée.", "Post moved."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const step = (n: number) => setCursor(mode === "month" ? addMonths(cursor, n) : addDays(cursor, n * (mode === "week" ? 7 : 1)));
  const today = toZonedTime(new Date(), tz);
  const Chip = (p: PostView) => (
    <button key={p.id} draggable={!["published", "publishing"].includes(p.status)} onDragStart={(e) => e.dataTransfer.setData("text/post", p.id)} onClick={() => setOpenPost(p)} className={cx("flex w-full items-center gap-1.5 truncate rounded-lg border px-1.5 py-1 text-left text-[11px]", p.status === "failed" ? "border-bad/40 bg-bad-soft" : p.status === "published" ? "border-line bg-paper-2 opacity-70" : p.status === "scheduled" ? "border-ok/40 bg-ok-soft" : "border-line bg-card")} title={`${NETWORKS[p.network]?.label} · ${st(p.status)}`}>
      <NetworkDot network={p.network} />
      <span className="shrink-0 tabular-nums text-muted">{formatInTimeZone(new Date(p.scheduledAt!), tz, "HH:mm")}</span>
      <span className="truncate">{p.title || p.caption}</span>
    </button>
  );
  return (
    <div className="mx-auto grid max-w-7xl gap-5">
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => step(-1)} className="grid size-10 place-items-center rounded-full border border-line bg-card" aria-label={t("Précédent", "Previous")}><ChevronLeft className="size-4" /></button>
          <button onClick={() => setCursor(today)} className="h-10 rounded-full border border-line bg-card px-4 text-sm">{t("Aujourd'hui", "Today")}</button>
          <button onClick={() => step(1)} className="grid size-10 place-items-center rounded-full border border-line bg-card" aria-label={t("Suivant", "Next")}><ChevronRight className="size-4" /></button>
        </div>
        <h2 className="font-display text-2xl font-semibold first-letter:uppercase">{mode === "day" ? format(cursor, t("EEEE d MMMM yyyy", "EEEE, MMMM d, yyyy"), { locale }) : mode === "week" ? t(`Semaine du ${format(range[0], "d MMMM", { locale })}`, `Week of ${format(range[0], "MMMM d", { locale })}`) : format(cursor, "MMMM yyyy", { locale })}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line bg-card p-0.5" role="group" aria-label={t("Vue", "View")}>
            {(["day", "week", "month"] as ViewMode[]).map((m) => <button key={m} onClick={() => setMode(m)} className={cx("rounded-full px-3 py-1.5 text-sm", mode === m && "bg-ink text-paper")} aria-pressed={mode === m}>{m === "day" ? t("Jour", "Day") : m === "week" ? t("Semaine", "Week") : t("Mois", "Month")}</button>)}
          </div>
          <Button variant="secondary" size="md" icon={<Settings2 className="size-4" />} onClick={() => setRulesOpen(true)}>{t("Règles d'automatisation", "Automation rules")}</Button>
        </div>
      </div>
      <p className="text-xs text-muted">{t(`Fuseau : ${tz} · glissez une publication sur un autre jour pour la déplacer · les publications programmées partent à l'heure prévue, même navigateur fermé.`, `Time zone: ${tz} · drag a post onto another day to move it · scheduled posts go out at the planned time, even with the browser closed.`)}</p>
      {mode === "month" && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line text-center text-xs text-muted">
            {t(["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."], ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = postsOn(d);
              return (
                <div key={d.toISOString()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => move(e.dataTransfer.getData("text/post"), d)} className={cx("min-h-16 border-b border-r border-line p-1 sm:min-h-32 sm:p-1.5", !isSameMonth(d, cursor) && "bg-paper-2/50")}>
                  <button onClick={() => (setCursor(d), setMode("day"))} className={cx("mb-1 grid size-7 place-items-center rounded-full text-xs", isSameDay(d, today) ? "bg-signal font-bold text-signal-ink" : "text-muted hover:bg-paper-2")}>{format(d, "d")}</button>
                  <div className="hidden gap-1 sm:grid">
                    {list.slice(0, 3).map((p) => Chip(p))}
                    {list.length > 3 && <button onClick={() => (setCursor(d), setMode("day"))} className="text-left text-[11px] text-muted">+ {list.length - 3} {t("autre(s)", "more")}</button>}
                  </div>
                  {list.length > 0 && (
                    <button onClick={() => (setCursor(d), setMode("day"))} className="mx-auto flex items-center gap-1 rounded-full bg-signal-soft px-1.5 py-0.5 text-[11px] font-semibold text-signal sm:hidden" aria-label={t(`${list.length} publication(s) le ${format(d, "d MMMM", { locale })}`, `${list.length} post(s) on ${format(d, "MMMM d", { locale })}`)}>
                      <span className="size-1.5 rounded-full bg-signal" aria-hidden />{list.length}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {mode === "week" && (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d) => (
            <Card key={d.toISOString()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => move(e.dataTransfer.getData("text/post"), d)} className={cx("min-h-48 p-2", isSameDay(d, today) && "border-signal")}>
              <p className="mb-2 text-xs font-medium capitalize">{format(d, "EEE d", { locale })}</p>
              <div className="grid gap-1.5">{postsOn(d).map((p) => Chip(p))}</div>
            </Card>
          ))}
        </div>
      )}
      {mode === "day" && (
        <div className="grid gap-3">
          {postsOn(cursor).length === 0 && <p className="py-10 text-center text-sm text-muted">{t("Aucune publication ce jour-là.", "No posts that day.")}</p>}
          {postsOn(cursor).map((p) => (
            <Card key={p.id} className="flex items-center gap-4 p-3">
              <span className="w-14 shrink-0 text-center font-display text-lg tabular-nums">{formatInTimeZone(new Date(p.scheduledAt!), tz, "HH:mm")}</span>
              <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-paper-2">{p.media[0] && <img src={p.media[0].thumbUrl ?? p.media[0].url} alt="" className="size-full object-cover" />}</span>
              <button onClick={() => setOpenPost(p)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2 text-xs text-muted"><NetworkDot network={p.network} /> {NETWORKS[p.network]?.label} · {st(p.status)}</span>
                <span className="mt-1 line-clamp-2 text-sm">{p.caption || p.title}</span>
              </button>
            </Card>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {Object.entries(POST_STATUS).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><span className={cx("size-2.5 rounded-full", { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", info: "bg-info", ink: "bg-ink", neutral: "bg-line" }[v.tone as string])} /> {t(v.label, v.en)}</span>)}
      </div>
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <PostEditor post={openPost} onClose={() => setOpenPost(null)} onChanged={reload} />
    </div>
  );
}


/**
 * Onglet : le studio social V2 (stratégie, création, calendrier, publications, comptes, statistiques) est le
 * parcours principal ; l'ancien parcours reste accessible, replié et signalé comme tel (mêmes publications).
 */
export default function TabCalendrier() {
  const t = useT();
  const [legacy, setLegacy] = useState(false);
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <SocialStudio initial="calendrier" />
      <div className="mx-auto w-full max-w-6xl">
        <button type="button" onClick={() => setLegacy((v) => !v)} className="text-sm text-muted underline underline-offset-4">{legacy ? t("Masquer l'ancien parcours", "Hide the old view") : t("Ancien calendrier — consultation de vos anciennes publications (les nouvelles se préparent ci-dessus)", "Old calendar — view your earlier posts (new ones are prepared above)")}</button>
      </div>
      {legacy && <LegacyCalendrier />}
    </div>
  );
}
