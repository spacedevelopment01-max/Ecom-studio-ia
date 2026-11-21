"use client";
/**
 * Tableau de bord du projet : la page d'accueil d'un projet. Pendant que le client parle à SINA, elle s'affiche à côté
 * de la conversation et se remplit en direct (ses neuf étapes, et sous chacune ce qui existe vraiment : sa fiche, sa
 * marque, son angle). Après la construction, elle reste le résumé du projet. Tout se demande à SINA, sauf sa fiche
 * (« Ce que SINA sait de toi ») : il la lit et la corrige lui-même (le socle, 21 novembre 2026).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cx } from "../ui";
import { useT } from "../i18n";
import { stepLabel } from "./journey-labels";
import type { DashboardData, DashboardStep } from "@/lib/syna-agent/dashboard";

export function ProjectDashboard({ data }: { data: DashboardData }) {
  const t = useT(), router = useRouter();
  // En direct : la page se relit seule pendant la construction (et à la fin de chaque réponse de SINA, par le fil).
  useEffect(() => {
    if (!data.building) return;
    const h = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(h);
  }, [router, data.building]);
  const cur = data.steps.find((s) => s.n === data.current);
  const done = data.steps.filter((s) => s.status === "done").length;
  return (
    <div className="mx-auto w-full max-w-2xl" data-dashboard data-building={data.building ? "1" : "0"}>
      <header>
        <p className="flex items-center gap-2 text-sm text-muted">
          {data.building && <span className="relative flex size-2" aria-hidden><span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-60 motion-reduce:hidden" /><span className="relative inline-flex size-2 rounded-full bg-signal" /></span>}
          {data.building ? t("Ton projet, en direct", "Your project, live") : t("Ton projet", "Your project")}
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold leading-tight [overflow-wrap:anywhere]">{data.name}</h1>
        <p className="mt-2 text-sm text-ink-2">
          {data.started && cur
            ? <>{t("Étape", "Step")} {data.current} {t("sur", "of")} {data.steps.length} <span className="text-muted">·</span> {t(cur.fr, cur.en)}</>
            : t("Parle à SINA pour commencer : ton projet se remplit ici au fur et à mesure.", "Talk to SINA to get started: your project fills in here as you go.")}
        </p>
        <div className="mt-3 flex gap-1" role="img" aria-label={t(`${done} étape${done > 1 ? "s" : ""} validée${done > 1 ? "s" : ""} sur ${data.steps.length}`, `${done} of ${data.steps.length} steps approved`)}>
          {data.steps.map((s) => <span key={s.n} className={cx("h-1.5 flex-1 rounded-full", s.status === "done" ? "bg-ink" : s.n === data.current && data.started ? "bg-signal" : "bg-line")} />)}
        </div>
      </header>

      <ol className="mt-7" aria-label={t("Les étapes de ton projet", "Your project steps")}>
        {data.steps.map((s, i) => <Step key={s.n} s={s} data={data} last={i === data.steps.length - 1} />)}
      </ol>
      {data.building && <p className="mt-2 text-xs text-muted">{t("Pour changer quelque chose, demande-le à SINA dans la conversation.", "To change something, ask SINA in the conversation.")}</p>}
    </div>
  );
}

function Step({ s, data, last }: { s: DashboardStep; data: DashboardData; last: boolean }) {
  const t = useT();
  const here = data.started && s.n === data.current;
  const isDone = s.status === "done";
  return (
    <li className="relative flex gap-3.5 pb-5" data-step={s.n} data-status={s.status} aria-current={here ? "step" : undefined}>
      {!last && <span className={cx("absolute left-[13px] top-7 bottom-0 w-px", isDone ? "bg-ink" : "bg-line")} aria-hidden />}
      <span className={cx("relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", isDone ? "bg-ink text-paper" : here ? "bg-signal text-signal-ink ring-4 ring-signal-soft" : "border border-line bg-card text-muted")}>
        {isDone ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : s.n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className={cx("font-medium", !isDone && !here && "text-ink-2")}>{t(s.fr, s.en)}</span>
          <span className={cx("text-xs", here ? "font-medium text-signal" : "text-muted")}>{stepLabel(s, data.started ? data.current : 0, t)}</span>
        </p>
        {!isDone && s.status !== "skipped" && <p className="mt-0.5 text-sm text-muted">{t(s.promise.fr, s.promise.en)}</p>}
        {s.n === 1 && <Fiche data={data} open={here} />}
        {s.n === 2 && data.brand && <Brand brand={data.brand} />}
        {s.n === 3 && data.angle && (
          <div className="mt-2 rounded-2xl border border-line bg-card px-4 py-3" data-dashboard-angle>
            <p className="font-medium">{data.angle.title}</p>
            {data.angle.promise && <p className="mt-1 text-sm text-ink-2">{data.angle.promise}</p>}
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * « Ce que SINA sait de toi » : sa fiche entière (ses réponses, ce qu'il a dit, aime et refuse avec leur portée, ses choix,
 * ses mots), ouverte pendant qu'ils font connaissance, repliée ensuite (un clic la rouvre). Il corrige ou efface une ligne
 * lui-même ; SINA relit sa fiche en entier avant chaque création.
 */
function Fiche({ data, open }: { data: DashboardData; open: boolean }) {
  const t = useT();
  const v = data.savoir;
  const notes = v?.notes ?? [];
  const n = data.fiche.length + (v ? notes.length + v.choix.length + v.mots.length : data.notes.length);
  if (!n) return null;
  const answers = new Map((v?.reponses ?? []).map((r) => [r.label, r]));
  const groups = [
    { genre: "fait", title: t("Ce que tu nous as dit", "What you told us") },
    { genre: "aime", title: t("Ce que tu aimes", "What you like") },
    { genre: "refuse", title: t("Ce que tu refuses", "What you refuse") },
  ] as const;
  return (
    <details className="group mt-2 rounded-2xl border border-line bg-card" open={open} data-dashboard-fiche>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span>{t("Ce que SINA sait de toi", "What SINA knows about you")}</span>
        <span className="text-xs font-normal text-muted"><span className="group-open:hidden">{t(`Voir les ${n} lignes`, `Show ${n} lines`)}</span><span className="hidden group-open:inline">{t("Replier", "Hide")}</span></span>
      </summary>
      <p className="border-t border-line px-4 pt-2.5 text-xs text-muted">{t("SINA relit tout ceci avant chaque création. Si une ligne n'est pas juste, corrige-la ici.", "SINA rereads all of this before each creation. If a line is wrong, fix it here.")}</p>
      <dl className="divide-y divide-line px-4">
        {data.fiche.map((f) => {
          const r = answers.get(f.fr) ?? answers.get(f.en);
          return <Line key={f.fr} projectId={data.projectId} label={t(f.fr, f.en)} value={f.value} muted={f.later} edit={r ? { type: "reponse", champ: r.champ, value: r.status === "answered" ? r.value : "" } : null} />;
        })}
        {v ? groups.map((g) => notes.filter((x) => x.genre === g.genre).length > 0 && (
          <div key={g.genre} className="py-2.5" data-dashboard-genre={g.genre}>
            <p className="text-xs font-medium text-ink-2">{g.title}</p>
            <dl className="mt-1 divide-y divide-line">
              {notes.filter((x) => x.genre === g.genre).map((x) => (
                <Line key={x.sujet} projectId={data.projectId} label={x.sujet} tag={x.porteeLabel} value={x.value} corrected={!!x.corrigeLe} edit={{ type: "note", sujet: x.sujet, value: x.value }} note />
              ))}
            </dl>
          </div>
        )) : data.notes.map((x, i) => (
          <div key={`n${i}`} className="py-2.5" data-dashboard-note><dt className="text-xs text-muted first-letter:uppercase">{x.sujet}</dt><dd className="mt-0.5 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{x.value}</dd></div>
        ))}
        {!!v?.choix.length && (
          <div className="py-2.5" data-dashboard-choix>
            <p className="text-xs font-medium text-ink-2">{t("Tes choix", "Your choices")}</p>
            <ul className="mt-1 space-y-0.5 text-sm">{v.choix.map((c) => <li key={c}>{c}</li>)}</ul>
            <p className="mt-1 text-xs text-muted">{t("Validés par toi : SINA n'y touche que si tu le lui demandes.", "Approved by you: SINA only changes them if you ask.")}</p>
          </div>
        )}
        {!!v?.mots.length && (
          <div className="py-2.5" data-dashboard-mots>
            <p className="text-xs font-medium text-ink-2">{t("Tes mots", "Your words")}</p>
            <ul className="mt-1 space-y-0.5 text-sm">{v.mots.map((m) => <li key={m.avoid}>{t(`« ${m.use} », jamais « ${m.avoid} »`, `"${m.use}", never "${m.avoid}"`)}</li>)}</ul>
          </div>
        )}
        {data.mode === "refonte" && !!data.keep.length && (
          <div className="py-2.5"><dt className="text-xs text-muted">{t("Gardé tel quel", "Kept as is")}</dt><dd className="mt-0.5 text-sm">{data.keep.join(", ")}</dd></div>
        )}
      </dl>
    </details>
  );
}

type Edit = { type: "reponse"; champ: string; value: string } | { type: "note"; sujet: string; value: string };
/** Une ligne de la fiche : le client la corrige (ou l'efface, pour une note) ; la page se relit ensuite. */
function Line({ projectId, label, value, tag, muted, corrected, edit, note }: { projectId: string; label: string; value: string; tag?: string; muted?: boolean; corrected?: boolean; edit: Edit | null; note?: boolean }) {
  const t = useT(), router = useRouter();
  const [editing, setEditing] = useState(false), [text, setText] = useState(edit?.value ?? ""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const send = async (payload: Record<string, unknown>) => {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/projects/${projectId}/fiche`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "");
      setEditing(false); router.refresh();
    } catch (e) { setErr((e as Error).message || t("La correction n'a pas pu être enregistrée.", "The correction could not be saved.")); } finally { setBusy(false); }
  };
  const save = () => edit && text.trim() && send(edit.type === "note" ? { type: "note", sujet: edit.sujet, value: text.trim() } : { type: "reponse", champ: edit.champ, value: text.trim() });
  return (
    <div className="py-2.5" data-dashboard-note={note ? "" : undefined}>
      <dt className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted"><span className="first-letter:uppercase">{label}</span>{tag && <span className="rounded-full bg-paper px-2 py-px text-[11px]">{tag}</span>}{corrected && <span className="text-[11px]">{t("corrigé par toi", "corrected by you")}</span>}</dt>
      {editing ? (
        <dd className="mt-1">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm" aria-label={t(`Corriger : ${label}`, `Fix: ${label}`)} />
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button type="button" disabled={busy || !text.trim()} onClick={save} className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-paper disabled:opacity-50">{t("Enregistrer", "Save")}</button>
            <button type="button" disabled={busy} onClick={() => { setEditing(false); setText(edit?.value ?? ""); }} className="rounded-full border border-line px-3.5 py-1.5 text-xs">{t("Annuler", "Cancel")}</button>
          </div>
          {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
        </dd>
      ) : (
        <dd className="mt-0.5 flex items-start gap-3">
          <span className={cx("min-w-0 flex-1 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]", muted && "text-muted")}>{value}</span>
          {edit && (
            <span className="flex shrink-0 gap-2 text-xs">
              <button type="button" onClick={() => setEditing(true)} className="text-ink-2 underline underline-offset-2">{t("Corriger", "Fix")}</button>
              {edit.type === "note" && <button type="button" disabled={busy} onClick={() => { if (window.confirm(t("Effacer cette ligne de ta fiche ?", "Delete this line from your file?"))) void send({ type: "note", sujet: edit.sujet, value: null }); }} className="text-muted underline underline-offset-2">{t("Effacer", "Delete")}</button>}
            </span>
          )}
        </dd>
      )}
    </div>
  );
}

function Brand({ brand }: { brand: NonNullable<DashboardData["brand"]> }) {
  const t = useT();
  return (
    <div className="mt-2 flex items-center gap-4 rounded-2xl border border-line bg-card px-4 py-3" data-dashboard-brand>
      {brand.logo && <img src={brand.logo} alt={t("Ton logo", "Your logo")} className="size-14 shrink-0 rounded-xl bg-white object-contain p-1.5" />}
      <div className="min-w-0 flex-1">
        {brand.name && <p className="font-display text-lg font-semibold leading-tight [overflow-wrap:anywhere]">{brand.name}</p>}
        {brand.slogan && <p className="mt-0.5 text-sm text-ink-2">{brand.slogan}</p>}
        {!!brand.colors.length && <div className="mt-2 flex gap-1.5" role="img" aria-label={t("Tes couleurs", "Your colours")}>{brand.colors.map((c, i) => <span key={`${c}${i}`} className="size-5 rounded-full border border-line" style={{ background: c }} />)}</div>}
      </div>
    </div>
  );
}
