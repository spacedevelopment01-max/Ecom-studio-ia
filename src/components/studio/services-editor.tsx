"use client";
import { CalendarCheck, Check, FileText, MessageSquare, Phone, Plus, Trash2 } from "lucide-react";
import { Button, cx, Input } from "../ui";
import { useT } from "../i18n";
import { contactModesOf, type ContactMode, type ServiceItem, type ServiceProfile } from "@/lib/project-types";

/** Liste des prestations : nom, description courte, prix et durée facultatifs ; lignes ajoutées ou retirées librement. */
export function ServicesEditor({ value, onChange, idPrefix = "svc" }: { value: ServiceItem[]; onChange: (v: ServiceItem[]) => void; idPrefix?: string }) {
  const t = useT();
  const rows = value.length ? value : [{ name: "", description: "" }];
  const set = (i: number, patch: Partial<ServiceItem>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  return (
    <div className="grid gap-2">
      <ul className="grid gap-2">
        {rows.map((r, i) => (
          <li key={i} className="grid gap-2 rounded-2xl border border-line bg-paper p-3">
            <div className="flex items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-paper-2 text-[11px] font-semibold text-muted" aria-hidden>{i + 1}</span>
              <Input id={`${idPrefix}-name-${i}`} value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder={t("Prestation (ex. Dépannage d'urgence)", "Service (e.g. Emergency repair)")} aria-label={t(`Prestation ${i + 1} : nom`, `Service ${i + 1}: name`)} className="h-10 text-sm font-medium" maxLength={160} />
              <button type="button" onClick={() => onChange(rows.filter((_, k) => k !== i))} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-paper-2" aria-label={t(`Retirer la prestation ${i + 1}`, `Remove service ${i + 1}`)}>
                <Trash2 className="size-4 text-muted" />
              </button>
            </div>
            <Input value={r.description} onChange={(e) => set(i, { description: e.target.value })} placeholder={t("Description courte (facultatif)", "Short description (optional)")} aria-label={t(`Prestation ${i + 1} : description`, `Service ${i + 1}: description`)} className="h-10 text-sm" maxLength={1000} />
            <div className="grid grid-cols-2 gap-2">
              <Input value={r.price ?? ""} onChange={(e) => set(i, { price: e.target.value })} placeholder={t("Prix (facultatif)", "Price (optional)")} aria-label={t(`Prestation ${i + 1} : prix`, `Service ${i + 1}: price`)} className="h-10 text-sm" maxLength={60} />
              <Input value={r.duration ?? ""} onChange={(e) => set(i, { duration: e.target.value })} placeholder={t("Durée (facultatif)", "Duration (optional)")} aria-label={t(`Prestation ${i + 1} : durée`, `Service ${i + 1}: duration`)} className="h-10 text-sm" maxLength={60} />
            </div>
          </li>
        ))}
      </ul>
      <Button type="button" variant="secondary" size="sm" icon={<Plus className="size-4" />} className="justify-self-start" onClick={() => onChange([...rows, { name: "", description: "" }])}>
        {t("Ajouter une prestation", "Add a service")}
      </Button>
    </div>
  );
}

/**
 * Façons dont le client prend contact (plusieurs possibles) : rendez-vous en ligne, devis, appel, formulaire.
 * La première choisie est la principale (bouton principal du site) ; au moins une reste cochée.
 */
/** Rendez-vous (#204) : un lien externe n'est jamais obligatoire pour exprimer ce besoin ; rien n'est mis en ligne ici. */
export const BOOKING_HINT = (t: (fr: string, en: string) => string) =>
  t(
    "Vous utilisez déjà un outil de réservation (Calendly, Planity, Doctolib…) ? Collez son lien : le bouton « Prendre rendez-vous » du site y mènera. Sinon, laissez vide : votre besoin est noté et vous choisirez plus tard comment recevoir les demandes (onglet Rendez-vous du studio avec les thèmes qui le proposent, ou un outil externe). Aucun agenda n'est ouvert à cette étape.",
    "Already using a booking tool (Calendly, Fresha, Acuity…)? Paste its link: the site's “Book an appointment” button will lead there. Otherwise leave it empty: your need is noted and you'll choose later how to receive requests (the studio's Bookings tab with themes that offer it, or an external tool). No calendar is opened at this step.",
  );

/**
 * Façons d'être contacté (cases à cocher) et bouton principal du site (choix explicite parmi les cases cochées).
 * L'ordre de `value` porte le principal en tête (contactMode = value[0]) ; aucune dépendance à l'ordre des clics :
 * cocher ajoute en complément, décocher le principal le passe au suivant, et toute case peut être décochée (le
 * client n'est jamais bloqué sur la valeur par défaut ; une liste vide est signalée, jamais complétée en silence).
 */
export function ContactModePicker({ value, onChange }: { value: ContactMode[]; onChange: (v: ContactMode[]) => void }) {
  const t = useT();
  const toggle = (id: ContactMode) => onChange(value.includes(id) ? value.filter((m) => m !== id) : [...value, id]);
  const makeMain = (id: ContactMode) => onChange([id, ...value.filter((m) => m !== id)]);
  const modes: [ContactMode, typeof Phone, string][] = [
    ["booking", CalendarCheck, t("Rendez-vous", "Appointments")],
    ["quote", FileText, t("Demande de devis", "Quote request")],
    ["call", Phone, t("Appel", "Phone call")],
    ["form", MessageSquare, t("Formulaire de contact", "Contact form")],
  ];
  const label = (id: ContactMode) => modes.find((m) => m[0] === id)![2];
  return (
    <div className="grid gap-2">
      <div role="group" aria-label={t("Façons de vous contacter", "Ways to get in touch")} className="grid grid-cols-2 gap-2">
        {modes.map(([id, Icon, text]) => {
          const on = value.includes(id);
          return (
            <button key={id} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(id)} data-contact-mode={id} className={cx("flex min-h-11 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-[13px] transition", on ? "border-signal bg-signal-soft font-medium" : "border-line bg-card hover:border-ink")}>
              {on ? <Check className="size-4 shrink-0" aria-hidden /> : <Icon className="size-4 shrink-0" aria-hidden />}
              <span className="min-w-0 flex-1">{text}</span>
            </button>
          );
        })}
      </div>
      {value.length ? (
        <fieldset className="grid gap-1.5" data-contact-main>
          <legend className="mb-1 text-[13px] font-medium">{t("Bouton principal du site", "Main button of the website")}</legend>
          <div className="flex flex-wrap gap-2">
            {value.map((id) => (
              <label key={id} className={cx("flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-[13px]", value[0] === id ? "border-ink bg-ink text-paper" : "border-line bg-card")}>
                <input type="radio" name="contact-main" className="sr-only" checked={value[0] === id} onChange={() => makeMain(id)} />
                {label(id)}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted">{t("Les autres façons cochées restent proposées en complément sur le site.", "The other ticked ways stay available on the website as extras.")}</p>
        </fieldset>
      ) : (
        <p role="alert" className="text-xs text-warn">{t("Cochez au moins une façon d'être contacté.", "Tick at least one way to be contacted.")}</p>
      )}
    </div>
  );
}

/** Prestations sans lignes vides (avant envoi). */
export const cleanServices = (list: ServiceItem[]) =>
  list
    .map((s) => ({ ...(s.key ? { key: s.key } : {}), name: s.name.trim(), description: s.description.trim(), ...(s.price?.trim() ? { price: s.price.trim() } : {}), ...(s.duration?.trim() ? { duration: s.duration.trim() } : {}) }))
    .filter((s) => s.name);

/** Informations essentielles d'un site de services encore manquantes (jamais devinées : le client les complète). */
export function missingActivity(s: ServiceProfile | undefined | null): ("services" | "area" | "contact" | "hours" | "booking")[] {
  if (!s) return [];
  const out: ("services" | "area" | "contact" | "hours" | "booking")[] = [];
  if (!s.services.length) out.push("services");
  if (!s.area && !s.address) out.push("area");
  if (!s.phone && !s.email) out.push("contact");
  if (!s.hours) out.push("hours");
  if (contactModesOf(s).includes("booking") && !s.bookingUrl) out.push("booking");
  return out;
}
