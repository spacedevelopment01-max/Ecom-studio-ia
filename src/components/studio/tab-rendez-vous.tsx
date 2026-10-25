"use client";
/**
 * Rubrique « Rendez-vous » (mission #190, point 7) : planning du professionnel (réservations à venir, annulées), ajout
 * d'une réservation prise par téléphone, déplacement, annulation ; prestations, durées, horaires, fermetures et
 * intervenants (source unique : la section de réglages du thème, ouverte ici dans son éditeur) ; liaison des boutons du
 * site au service réel du studio. Tout est vérifié côté serveur (créneau libre, aucune double réservation).
 */
import { useMemo, useState } from "react";
import { CalendarDays, Link2, Plus, Settings2, XCircle, MoveRight } from "lucide-react";
import { api, Badge, Button, Card, Field, Input, Select, useApi, useToast, Empty, Modal } from "../ui";
import { useProject } from "./project-context";
import { useLang, useT } from "../i18n";
import { SectionSettingsPanel } from "./section-settings";

type Booking = { number: string; status: "confirmed" | "canceled"; date: string; start: string; end: string | null; service: string; staff: string | null; party: number | null; modality: string | null; client: { name: string; email: string; phone: string | null }; note: string | null };
type Rules = { timezone: string; hours: Record<string, [number, number][]>; closures: string[]; step: number | null; horizonDays: number; leadMinutes: number; cancelHours: number | null; services: { id: string; name: string; duration: number | null; price: number | null; slots?: string[] }[]; staff: { id: string; name: string; days: number[] | null }[]; capacity: number | null; workshops: { id: string; title: string; date: string; time: string; capacity: number | null }[] };
type View =
  | { kind: null; reason: string }
  | { kind: "salon" | "cabinet" | "restaurant"; section: { template: string; id: string; type: string }; mode: "demo" | "live"; serviceUrl: string; expectedServiceUrl: string | null; linked: boolean; publicStudio: boolean; notifyEmail: string; rules: Rules; bookings: Booking[] };

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default function TabRendezVous() {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 7 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date(Date.now() + 60 * 86400000)));
  const { data, reload } = useApi<View>(`/api/projects/${id}/rendez-vous?du=${from}&au=${to}`);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<Booking | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCanceled, setShowCanceled] = useState(false);
  const act = async (key: string, body: Record<string, unknown>, ok: string) => {
    setBusy(key);
    try {
      await api(`/api/projects/${id}/rendez-vous`, { method: "POST", body });
      toast("ok", ok);
      reload();
      return true;
    } catch (e) {
      toast("bad", (e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };
  const list = useMemo(() => (data && data.kind ? data.bookings.filter((b) => showCanceled || b.status === "confirmed") : []), [data, showCanceled]);
  if (!data) return <div className="skeleton h-72 rounded-3xl" />;
  if (!data.kind)
    return (
      <Card className="p-6" data-rdv-empty>
        <Empty icon={<CalendarDays className="size-6" />} title={t("Pas de prise de rendez-vous sur ce site", "No booking on this site")}>
          {t("Les thèmes ATELIER NUANCE (salon), PARENTHÈSE (cabinet) et TABLE SAISON (restaurant) prennent les réservations en ligne. Choisissez-en un dans « Boutique › Thèmes » pour gérer ici vos prestations, horaires et réservations.", "The ATELIER NUANCE (salon), PARENTHÈSE (practice) and TABLE SAISON (restaurant) themes take online bookings. Choose one in “Store › Themes” to manage your services, hours and bookings here.")}
        </Empty>
      </Card>
    );
  const days = lang === "en" ? DAYS_EN : DAYS_FR;
  const r = data.rules;
  return (
    <div className="grid gap-5" data-rdv={data.kind}>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">{t("Rendez-vous", "Bookings")}</h2>
            <p className="mt-1 text-sm text-ink-2">{data.kind === "salon" ? t("Salon : prestations, durées, intervenants et rendez-vous.", "Salon: services, durations, staff and appointments.") : data.kind === "cabinet" ? t("Cabinet : séances, ateliers à places, cabinet ou visio.", "Practice: sessions, workshops with seats, in person or video.") : t("Restaurant : services, couverts et réservations de table.", "Restaurant: services, covers and table bookings.")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.mode === "live" ? <Badge tone="ok">{t("Service réel activé", "Live service on")}</Badge> : <Badge tone="warn">{t("Démonstration : aucune réservation réelle", "Demonstration: no real booking")}</Badge>}
            {data.linked && <Badge tone="ok"><Link2 className="mr-1 inline size-3" />{t("Boutons du site reliés", "Site buttons linked")}</Badge>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.mode === "live" ? (
            <Button variant="ghost" loading={busy === "demo"} onClick={() => act("demo", { action: "live", live: false }, t("Le site repasse en démonstration.", "The site is back in demonstration."))}>{t("Revenir en démonstration", "Back to demonstration")}</Button>
          ) : (
            <Button loading={busy === "live"} disabled={!data.publicStudio} onClick={() => act("live", { action: "live", live: true }, t("Réservations réelles activées : les boutons du site enregistrent maintenant dans le studio.", "Real bookings enabled: the site's buttons now record into the studio."))}>{t("Activer les réservations réelles", "Enable real bookings")}</Button>
          )}
          <Button variant="ghost" icon={<Settings2 className="size-4" />} onClick={() => setEditing(true)}>{t("Prestations, horaires, fermetures, intervenants", "Services, hours, closures, staff")}</Button>
          {data.mode === "live" && <Button variant="ghost" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>{t("Ajouter une réservation", "Add a booking")}</Button>}
        </div>
        {!data.publicStudio && <p className="mt-3 text-sm text-warn">{t("Le studio n'a pas encore d'adresse publique HTTPS (réglage APP_URL de l'hébergement) : le site exporté ne pourrait pas joindre le service de réservation. Les réservations réelles s'activeront dès qu'elle sera réglée.", "The studio doesn't have a public HTTPS address yet (APP_URL hosting setting): the exported site couldn't reach the booking service. Real bookings can be enabled as soon as it's set.")}</p>}
        {data.mode === "live" && data.serviceUrl && <p className="mt-3 break-all text-xs text-muted">{t("Adresse appelée par les boutons du site (aussi après export) : ", "Address called by the site's buttons (also after export): ")}<code>{data.serviceUrl}</code></p>}
        {data.mode === "live" && !data.notifyEmail && <p className="mt-2 text-sm text-muted">{t("Aucune adresse e-mail de notification n'est réglée : les nouvelles réservations restent visibles ici.", "No notification e-mail is set: new bookings remain visible here.")}</p>}
      </Card>

      <Card className="p-5" data-rdv-rules>
        <h3 className="font-semibold">{t("Règles en vigueur", "Current rules")}</h3>
        <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium">{data.kind === "restaurant" ? t("Services", "Services") : t("Prestations et durées", "Services and durations")}</p>
            <ul className="mt-1 grid gap-1 text-ink-2">
              {r.services.map((s) => <li key={s.id}>{s.name}{s.duration ? ` · ${s.duration} min` : ""}{s.price != null ? ` · ${(s.price / 100).toLocaleString(lang === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" })}` : ""}{s.slots?.length ? ` · ${s.slots.join(", ")}` : ""}</li>)}
              {!r.services.length && <li className="text-muted">{t("[À compléter : aucune prestation réglée]", "[To complete: no service set]")}</li>}
            </ul>
          </div>
          <div>
            <p className="font-medium">{t("Disponibilités", "Availability")}</p>
            <ul className="mt-1 grid gap-1 text-ink-2">
              {Object.entries(r.hours).map(([d, ranges]) => <li key={d}>{days[Number(d)]} {ranges.length ? ranges.map(([a, b]) => `${hm(a)}–${hm(b)}`).join(", ") : t("(ouvert)", "(open)")}</li>)}
            </ul>
            <p className="mt-2 font-medium">{t("Indisponibilités (fermetures)", "Unavailability (closures)")}</p>
            <p className="text-ink-2">{r.closures.length ? r.closures.join(", ") : t("Aucune", "None")}</p>
            {r.capacity != null && <p className="mt-2 text-ink-2">{t(`Capacité : ${r.capacity} couverts par horaire`, `Capacity: ${r.capacity} covers per time`)}</p>}
          </div>
          {r.staff.length > 0 && (
            <div>
              <p className="font-medium">{t("Intervenants", "Staff")}</p>
              <ul className="mt-1 grid gap-1 text-ink-2">{r.staff.map((s) => <li key={s.id}>{s.name}{s.days ? ` · ${s.days.map((d) => days[d].slice(0, 3)).join(" ")}` : ""}</li>)}</ul>
            </div>
          )}
          {r.workshops.length > 0 && (
            <div>
              <p className="font-medium">{t("Ateliers à places", "Workshops with seats")}</p>
              <ul className="mt-1 grid gap-1 text-ink-2">{r.workshops.map((w) => <li key={w.id}>{w.title} · {w.date} {w.time}{w.capacity ? ` · ${w.capacity} ${t("places", "seats")}` : ""}</li>)}</ul>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5" data-rdv-bookings>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-semibold">{t("Réservations", "Bookings")}</h3>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t("Du", "From")}><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label={t("Au", "To")}><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showCanceled} onChange={(e) => setShowCanceled(e.target.checked)} /> {t("Afficher les annulées", "Show canceled")}</label>
          </div>
        </div>
        {data.mode !== "live" && <p className="mt-3 text-sm text-muted">{t("En démonstration, les réservations faites sur le site restent dans le navigateur du visiteur : aucune n'arrive ici.", "In demonstration, bookings made on the site stay in the visitor's browser: none arrive here.")}</p>}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-muted"><th className="py-2">{t("Date", "Date")}</th><th>{t("Heure", "Time")}</th><th>{data.kind === "restaurant" ? t("Couverts", "Covers") : t("Prestation", "Service")}</th><th>{t("Client", "Customer")}</th><th>{t("Référence", "Reference")}</th><th /></tr></thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.number} className="border-t border-line" data-rdv-booking={b.number}>
                  <td className="py-2">{b.date}</td>
                  <td>{b.start}{b.end ? `–${b.end}` : ""}</td>
                  <td>{data.kind === "restaurant" ? b.party : b.service}{b.staff ? ` · ${b.staff}` : ""}{b.modality ? ` · ${b.modality}` : ""}</td>
                  <td>{b.client.name}<div className="text-xs text-muted">{b.client.email}{b.client.phone ? ` · ${b.client.phone}` : ""}</div></td>
                  <td>{b.number} {b.status === "canceled" && <Badge tone="bad">{t("Annulée", "Canceled")}</Badge>}</td>
                  <td className="text-right">
                    {b.status === "confirmed" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" icon={<MoveRight className="size-4" />} onClick={() => setMoving(b)}>{t("Déplacer", "Move")}</Button>
                        <Button size="sm" variant="ghost" icon={<XCircle className="size-4" />} loading={busy === `cancel-${b.number}`} onClick={() => act(`cancel-${b.number}`, { action: "cancel", number: b.number }, t(`Réservation ${b.number} annulée : le créneau est libéré.`, `Booking ${b.number} canceled: the slot is free again.`))}>{t("Annuler", "Cancel")}</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={6} className="py-6 text-center text-muted">{t("Aucune réservation sur cette période.", "No booking in this period.")}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <Modal open onClose={() => { setEditing(false); reload(); }} title={t("Prestations, horaires, fermetures, intervenants", "Services, hours, closures, staff")} wide>
          <p className="mb-3 text-sm text-ink-2">{t("Ces réglages sont ceux de la section du thème : le site et le service de réservation les lisent tous les deux, il n'y a qu'une seule source.", "These settings are the theme section's: both the site and the booking service read them, there is a single source.")}</p>
          <SectionSettingsPanel projectId={id} target={{ template: data.section.template, section: data.section.id }} onClose={() => { setEditing(false); reload(); }} onChanged={reload} />
        </Modal>
      )}
      {moving && <MoveModal kind={data.kind} booking={moving} staff={r.staff} busy={busy === "move"} onClose={() => setMoving(null)} onSave={async (c) => { if (await act("move", { action: "move", number: moving.number, ...c }, t(`Réservation ${moving.number} déplacée.`, `Booking ${moving.number} moved.`))) setMoving(null); }} />}
      {adding && <AddModal kind={data.kind} rules={r} busy={busy === "add"} onClose={() => setAdding(false)} onSave={async (c) => { if (await act("add", { action: "create", ...c }, t("Réservation enregistrée.", "Booking saved."))) setAdding(false); }} />}
    </div>
  );
}

function MoveModal({ kind, booking, staff, busy, onClose, onSave }: { kind: string; booking: Booking; staff: { id: string; name: string }[]; busy: boolean; onClose: () => void; onSave: (c: Record<string, unknown>) => void }) {
  const t = useT();
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.start);
  const [who, setWho] = useState("");
  const [party, setParty] = useState(String(booking.party ?? 2));
  return (
    <Modal open onClose={onClose} title={t(`Déplacer ${booking.number}`, `Move ${booking.number}`)}>
      <div className="grid gap-3">
        <Field label={t("Nouvelle date", "New date")}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={t("Nouvelle heure", "New time")}><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        {kind === "salon" && staff.length > 0 && <Field label={t("Intervenant", "Staff")}><Select value={who} onChange={(e) => setWho(e.target.value)}><option value="">{t("Le même", "Same")}</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>}
        {kind === "restaurant" && <Field label={t("Couverts", "Covers")}><Input type="number" min={1} value={party} onChange={(e) => setParty(e.target.value)} /></Field>}
        <p className="text-xs text-muted">{t("Le créneau est vérifié de nouveau : s'il est pris ou hors des horaires, le déplacement est refusé et la réservation reste inchangée.", "The slot is checked again: if it's taken or outside opening hours, the move is refused and the booking stays unchanged.")}</p>
        <Button loading={busy} onClick={() => onSave({ date, time, ...(who ? { staff: who } : {}), ...(kind === "restaurant" ? { party: Number(party) } : {}) })}>{t("Déplacer", "Move")}</Button>
      </div>
    </Modal>
  );
}

function AddModal({ kind, rules, busy, onClose, onSave }: { kind: string; rules: Rules; busy: boolean; onClose: () => void; onSave: (c: Record<string, unknown>) => void }) {
  const t = useT();
  const [f, setF] = useState({ service: rules.services[0]?.id ?? "", staff: "", date: "", time: "", party: "2", firstName: "", lastName: "", email: "", phone: "", note: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open onClose={onClose} title={t("Ajouter une réservation", "Add a booking")}>
      <div className="grid gap-3">
        {kind !== "restaurant" && <Field label={t("Prestation", "Service")}><Select value={f.service} onChange={set("service")}>{rules.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>}
        {kind === "salon" && rules.staff.length > 0 && <Field label={t("Intervenant", "Staff")}><Select value={f.staff} onChange={set("staff")}><option value="">{t("Le premier disponible", "First available")}</option>{rules.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>}
        {kind === "restaurant" && <Field label={t("Couverts", "Covers")}><Input type="number" min={1} value={f.party} onChange={set("party")} /></Field>}
        <div className="grid grid-cols-2 gap-2"><Field label={t("Date", "Date")}><Input type="date" value={f.date} onChange={set("date")} /></Field><Field label={t("Heure", "Time")}><Input type="time" value={f.time} onChange={set("time")} /></Field></div>
        <div className="grid grid-cols-2 gap-2"><Field label={t("Prénom", "First name")}><Input value={f.firstName} onChange={set("firstName")} /></Field><Field label={t("Nom", "Last name")}><Input value={f.lastName} onChange={set("lastName")} /></Field></div>
        <Field label={t("E-mail", "E-mail")}><Input type="email" value={f.email} onChange={set("email")} /></Field>
        <Field label={t("Téléphone", "Phone")}><Input value={f.phone} onChange={set("phone")} /></Field>
        <Button loading={busy} onClick={() => onSave({ ...f, party: Number(f.party), staff: f.staff || undefined })}>{t("Enregistrer", "Save")}</Button>
      </div>
    </Modal>
  );
}
