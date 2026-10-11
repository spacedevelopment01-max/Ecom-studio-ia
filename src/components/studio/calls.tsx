"use client";
/**
 * Accompagnement téléphonique (60 min) : choix du projet (le prix dépend de son forfait), créneaux réels ouverts par
 * l'équipe, réservation (heure offerte DOMINER confirmée tout de suite ; sinon paiement Stripe), rendez-vous à venir
 * avec annulation ou report jusqu'à 24 h avant.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Phone } from "lucide-react";
import { api, Badge, Button, Card, cx, Field, Input, Logo, Select, Textarea, ThemeToggle, useApi, useToast } from "../ui";
import { LangSwitch, useLang, useT } from "../i18n";
import { formatEur } from "../billing-client";
import { PLANS, type PlanId } from "@/lib/plans";

type Data = {
  projects: { id: string; name: string; plan: PlanId; free: boolean; priceEur: number | null; reason: string | null }[];
  slots: { id: string; startsAt: number; endsAt: number }[];
  bookings: { id: string; projectName: string; startsAt: number; status: string; free: boolean; priceEur: number; changeable: boolean }[];
  freeHourUsed: boolean;
};

const day = (ms: number, lang: string) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(ms));
const hour = (ms: number, lang: string) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(ms));

export function CallsPage() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const { data, reload } = useApi<Data>("/api/calls");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const p = new URL(window.location.href).searchParams.get("paiement");
    if (!p) return;
    toast(p === "ok" ? "ok" : "bad", p === "ok" ? t("Paiement reçu : votre rendez-vous est confirmé dès la confirmation du paiement (quelques secondes).", "Payment received: your appointment is confirmed as soon as the payment is confirmed (a few seconds).") : t("Paiement annulé : le créneau est libéré.", "Payment canceled: the slot is released."));
    window.history.replaceState(null, "", "/studio/rendez-vous");
    const timer = setTimeout(() => reload(), 4000);
    return () => clearTimeout(timer);
  }, [toast, t, reload]);
  const project = data?.projects.find((p) => p.id === projectId) ?? data?.projects[0] ?? null;
  const byDay = useMemo(() => {
    const m = new Map<string, Data["slots"]>();
    for (const s of data?.slots ?? []) {
      const k = day(s.startsAt, lang);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()];
  }, [data, lang]);
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const book = () =>
    run("book", async () => {
      if (!project || !slotId) return;
      const r = await api<{ confirmed: boolean; url?: string }>("/api/calls", { body: { projectId: project.id, slotId, topic: topic || undefined, phone: phone || undefined } });
      if (r.url) {
        window.location.href = r.url;
        return;
      }
      toast("ok", t("Rendez-vous confirmé.", "Appointment confirmed."));
      setSlotId(null);
      reload();
    });
  const move = (bookingId: string, slot: string) =>
    run(`move-${bookingId}`, async () => {
      await api(`/api/calls/${bookingId}`, { body: { action: "reschedule", slotId: slot } });
      toast("ok", t("Rendez-vous reporté.", "Appointment moved."));
      setMoving(null);
      reload();
    });
  const cancel = (bookingId: string) =>
    run(`cancel-${bookingId}`, async () => {
      if (!confirm(t("Annuler ce rendez-vous ?", "Cancel this appointment?"))) return;
      const r = await api<{ refund: string | null }>(`/api/calls/${bookingId}`, { body: { action: "cancel" } });
      toast("ok", r.refund === "done" ? t("Rendez-vous annulé et remboursé.", "Appointment canceled and refunded.") : r.refund === "manual" ? t("Rendez-vous annulé : l'équipe effectue le remboursement.", "Appointment canceled: the team will process the refund.") : t("Rendez-vous annulé.", "Appointment canceled."));
      reload();
    });
  const pickSlot = (id: string) => (moving ? move(moving, id) : setSlotId(id));
  const upcoming = (data?.bookings ?? []).filter((b) => b.status !== "done");
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/studio" className="inline-flex items-center gap-2 text-sm"><ArrowLeft className="size-4" aria-hidden /> <Logo compact /></Link>
          <div className="flex items-center gap-2"><LangSwitch /><ThemeToggle /></div>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6">
        <div>
          <h1 className="font-display text-4xl font-semibold">{t("Accompagnement téléphonique", "Phone coaching")}</h1>
          <p className="mt-2 max-w-2xl text-ink-2">{t(`Une heure avec l'équipe pour avancer sur votre projet. ${PLANS.creer.name.fr} : ${PLANS.creer.callPrice} € · ${PLANS.vendre.name.fr} : ${PLANS.vendre.callPrice} € · ${PLANS.dominer.name.fr} : la première heure est offerte, une seule fois par compte.`, `One hour with the team to move your project forward. ${PLANS.creer.name.en}: €${PLANS.creer.callPrice} · ${PLANS.vendre.name.en}: €${PLANS.vendre.callPrice} · ${PLANS.dominer.name.en}: the first hour is free, once per account.`)}</p>
        </div>
        {!data ? (
          <div className="skeleton h-64 rounded-3xl" />
        ) : (
          <>
            {upcoming.length > 0 && (
              <Card className="p-6">
                <h2 className="font-display text-2xl font-semibold">{t("Mes rendez-vous", "My appointments")}</h2>
                <ul className="mt-3 divide-y divide-line">
                  {upcoming.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium first-letter:uppercase">{day(b.startsAt, lang)} · {hour(b.startsAt, lang)}</p>
                        <p className="text-sm text-ink-2">{b.projectName} · {b.free ? t("heure offerte", "free hour") : formatEur(b.priceEur, lang)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={b.status === "confirmed" ? "ok" : "warn"} dot>{b.status === "confirmed" ? t("Confirmé", "Confirmed") : t("En attente de paiement", "Awaiting payment")}</Badge>
                        {b.status === "pending_payment" && <Button size="sm" variant="signal" loading={busy === `pay-${b.id}`} onClick={() => run(`pay-${b.id}`, async () => { window.location.href = (await api<{ url: string }>(`/api/calls/${b.id}`, { body: { action: "pay" } })).url; })}>{t("Payer", "Pay")}</Button>}
                        {b.changeable && b.status === "confirmed" && <Button size="sm" variant="secondary" onClick={() => setMoving(moving === b.id ? null : b.id)}>{moving === b.id ? t("Choisissez un créneau ci-dessous", "Pick a slot below") : t("Reporter", "Move")}</Button>}
                        {b.changeable && <Button size="sm" variant="ghost" loading={busy === `cancel-${b.id}`} onClick={() => cancel(b.id)}>{t("Annuler", "Cancel")}</Button>}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">{t("Annulation ou report possibles jusqu'à 24 h avant. Un rendez-vous payé annulé est remboursé ; une heure offerte annulée reste disponible.", "Cancel or move up to 24 h before. A canceled paid appointment is refunded; a canceled free hour stays available.")}</p>
              </Card>
            )}
            {data.projects.length === 0 ? (
              <Card className="p-6 text-ink-2">{t("L'accompagnement est réservé aux projets avec un abonnement actif.", "Coaching is for projects with an active subscription.")} <Link href="/studio?nouveau=1" className="font-semibold text-signal underline-offset-4 hover:underline">{t("Choisir un forfait", "Choose a plan")}</Link></Card>
            ) : (
              <Card className="grid gap-5 p-6">
                {!moving && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("Projet concerné", "Project")} htmlFor="call-project">
                      <Select id="call-project" value={project?.id ?? ""} onChange={(e) => setProjectId(e.target.value)}>
                        {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name} · {PLANS[p.plan].name[lang]}</option>)}
                      </Select>
                    </Field>
                    <div className="self-end rounded-2xl bg-paper-2 p-3 text-sm">
                      {project?.free ? <strong className="text-ok">{t("Heure offerte (une seule fois)", "Free hour (once)")}</strong> : project?.priceEur != null ? <span>{t("Prix :", "Price:")} <strong>{formatEur(project.priceEur, lang)}</strong> {t("TTC", "incl. VAT")}</span> : <span className="text-warn">{project?.reason}</span>}
                    </div>
                  </div>
                )}
                <div>
                  <p className="font-medium">{moving ? t("Nouveau créneau", "New slot") : t("Créneaux disponibles (heure de Paris)", "Available slots (Paris time)")}</p>
                  {byDay.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">{t("Aucun créneau ouvert pour le moment : l'équipe en ajoute régulièrement.", "No open slots right now: the team adds some regularly.")}</p>
                  ) : (
                    <div className="mt-3 grid gap-3">
                      {byDay.map(([d, slots]) => (
                        <div key={d}>
                          <p className="text-sm text-ink-2 first-letter:uppercase">{d}</p>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {slots.map((s) => (
                              <button key={s.id} type="button" onClick={() => pickSlot(s.id)} disabled={!!busy || (!moving && project?.priceEur == null && !project?.free)} aria-pressed={slotId === s.id} className={cx("h-10 rounded-full border px-4 text-sm tabular-nums transition disabled:opacity-50", slotId === s.id && !moving ? "border-signal bg-signal text-signal-ink" : "border-line bg-card hover:border-ink")}>
                                {hour(s.startsAt, lang)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {!moving && slotId && (
                  <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                    <Field label={t("Téléphone (facultatif)", "Phone (optional)")} htmlFor="call-phone"><Input id="call-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} /></Field>
                    <Field label={t("Sujet (facultatif)", "Topic (optional)")} htmlFor="call-topic"><Textarea id="call-topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={1000} /></Field>
                    <Button className="sm:col-span-2 justify-self-start" variant="signal" icon={<Phone className="size-4" aria-hidden />} loading={busy === "book"} onClick={book}>
                      {project?.free ? t("Réserver mon heure offerte", "Book my free hour") : t("Réserver et payer", "Book and pay")}
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
