"use client";
import { CalendarCheck, FileText, MessageSquare, Phone, Plus, Trash2 } from "lucide-react";
import { Button, cx, Input } from "../ui";
import { useT } from "../i18n";
import type { ServiceItem, ServiceProfile } from "@/lib/project-types";

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

/** Façon dont le client prend contact : rendez-vous en ligne, devis, appel ou formulaire. */
export function ContactModePicker({ value, onChange }: { value: ServiceProfile["contactMode"]; onChange: (v: ServiceProfile["contactMode"]) => void }) {
  const t = useT();
  const modes: [ServiceProfile["contactMode"], typeof Phone, string][] = [
    ["booking", CalendarCheck, t("Rendez-vous en ligne", "Online booking")],
    ["quote", FileText, t("Demande de devis", "Quote request")],
    ["call", Phone, t("Appel", "Phone call")],
    ["form", MessageSquare, t("Formulaire de contact", "Contact form")],
  ];
  return (
    <div role="radiogroup" aria-label={t("Mode de contact", "Contact method")} className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {modes.map(([id, Icon, label]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)} className={cx("flex min-h-11 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-[13px] transition", value === id ? "border-signal bg-signal-soft font-medium" : "border-line bg-card hover:border-ink")}>
          <Icon className="size-4 shrink-0" aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}

/** Prestations sans lignes vides (avant envoi). */
export const cleanServices = (list: ServiceItem[]) =>
  list
    .map((s) => ({ name: s.name.trim(), description: s.description.trim(), ...(s.price?.trim() ? { price: s.price.trim() } : {}), ...(s.duration?.trim() ? { duration: s.duration.trim() } : {}) }))
    .filter((s) => s.name);

/** Informations essentielles d'un site de services encore manquantes (jamais devinées : le client les complète). */
export function missingActivity(s: ServiceProfile | undefined | null): ("services" | "area" | "contact" | "hours" | "booking")[] {
  if (!s) return [];
  const out: ("services" | "area" | "contact" | "hours" | "booking")[] = [];
  if (!s.services.length) out.push("services");
  if (!s.area && !s.address) out.push("area");
  if (!s.phone && !s.email) out.push("contact");
  if (!s.hours) out.push("hours");
  if (s.contactMode === "booking" && !s.bookingUrl) out.push("booking");
  return out;
}
