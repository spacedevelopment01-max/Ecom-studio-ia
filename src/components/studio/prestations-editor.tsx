"use client";
/**
 * Éditeur des prestations, horaires et intervenants (#239, phase 2) : un formulaire simple, à la place du panneau
 * générique de section, qui écrit dans la source unique lue par le moteur de réservation. Chaque enregistrement crée
 * une version du site (restaurable dans « Versions »). Une prestation qui a des rendez-vous à venir ne se supprime pas.
 */
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, Badge, Button, Input, Select, useApi, useToast } from "../ui";
import { useT } from "../i18n";

type Service = { id?: string; name: string; category?: string; short: string; duration: number | null; price: number | null; priceFrom: boolean; modes?: string; upcoming?: number };
type Staff = { id?: string; name: string; title: string; skills: string[]; days: number[] };
type Data = {
  kind: "salon" | "cabinet" | "restaurant"; live: boolean; services: Service[]; staff: Staff[]; hours: Record<string, string>; closures: string;
  restaurant: { openDays: number[]; lunchSlots: string; dinnerSlots: string; capacity: number; minParty: number; maxParty: number; defaults: boolean } | null;
};
const DAYS: [string, number, string, string][] = [["mon", 1, "Lundi", "Monday"], ["tue", 2, "Mardi", "Tuesday"], ["wed", 3, "Mercredi", "Wednesday"], ["thu", 4, "Jeudi", "Thursday"], ["fri", 5, "Vendredi", "Friday"], ["sat", 6, "Samedi", "Saturday"], ["sun", 0, "Dimanche", "Sunday"]];
const CATS: [string, string, string][] = [["coupe", "Coupe", "Cut"], ["couleur", "Couleur", "Colour"], ["coiffage", "Coiffage", "Styling"], ["soin", "Soin", "Care"]];
const toNum = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export function PrestationsEditor({ projectId, onSaved }: { projectId: string; onSaved: () => void }) {
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<Data>(`/api/projects/${projectId}/prestations`);
  const [f, setF] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF(structuredClone(data)); }, [data]);
  if (!f) return <p className="text-sm text-muted">{t("Chargement…", "Loading…")}</p>;
  const setService = (i: number, patch: Partial<Service>) => setF({ ...f, services: f.services.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setStaff = (i: number, patch: Partial<Staff>) => setF({ ...f, staff: f.staff.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  async function save() {
    setBusy(true);
    try {
      const body = f!.kind === "restaurant"
        ? { restaurant: { ...f!.restaurant!, capacity: Number(f!.restaurant!.capacity), minParty: Number(f!.restaurant!.minParty), maxParty: Number(f!.restaurant!.maxParty) }, closures: f!.closures }
        : { services: f!.services.map(({ upcoming: _u, ...s }) => ({ ...s, duration: Number(s.duration), price: s.price })), ...(f!.kind === "salon" ? { staff: f!.staff } : {}), hours: f!.hours, closures: f!.closures };
      const r = await api<{ number: number; warnings: string[] }>(`/api/projects/${projectId}/prestations`, { method: "PUT", body });
      toast("ok", t(`Enregistré : version ${r.number} du site. L'aperçu et la réservation l'utilisent tout de suite ; le site hébergé, après « Publier ».`, `Saved: site version ${r.number}. Preview and booking use it right away; the hosted site after “Publish”.`));
      for (const w of r.warnings) toast("info", w);
      await reload();
      onSaved();
    } catch (e) { toast("bad", (e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-5" data-prestations-editor={f.kind}>
      <p className="text-sm text-ink-2">{t("Une seule saisie : le site (cartes, pages, réservation) et le service de réservation lisent ces valeurs. Chaque enregistrement crée une version du site, restaurable.", "One entry: the site (cards, pages, booking) and the booking service read these values. Each save creates a restorable site version.")}</p>

      {f.kind !== "restaurant" && (
        <section className="grid gap-2">
          <h3 className="font-semibold">{f.kind === "salon" ? t("Prestations", "Services") : t("Séances", "Sessions")}</h3>
          {f.services.map((s, i) => (
            <div key={s.id ?? `new-${i}`} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]" data-prestation={s.id ?? "nouvelle"}>
              <Input aria-label={t("Nom", "Name")} placeholder={t("Nom de la prestation", "Service name")} value={s.name} onChange={(e) => setService(i, { name: e.target.value })} />
              {f.kind === "salon"
                ? <Select aria-label={t("Catégorie", "Category")} value={s.category ?? "coupe"} onChange={(e) => setService(i, { category: e.target.value })}>{CATS.map(([v, fr, en]) => <option key={v} value={v}>{t(fr, en)}</option>)}</Select>
                : <Select aria-label={t("Modalité", "Mode")} value={s.modes ?? "cabinet"} onChange={(e) => setService(i, { modes: e.target.value })}><option value="cabinet">{t("Au cabinet", "In person")}</option><option value="visio">{t("En visio", "Video call")}</option><option value="cabinet,visio">{t("Cabinet ou visio", "In person or video")}</option></Select>}
              <Input aria-label={t("Durée (min)", "Length (min)")} inputMode="numeric" placeholder={t("Durée (min)", "Length (min)")} value={s.duration ?? ""} onChange={(e) => setService(i, { duration: toNum(e.target.value) })} />
              <Input aria-label={t("Prix (€)", "Price (€)")} inputMode="decimal" placeholder={t("Prix (€)", "Price (€)")} value={s.price ?? ""} onChange={(e) => setService(i, { price: toNum(e.target.value) })} />
              <div className="flex items-center gap-2">
                {s.upcoming ? <Badge tone="info">{t(`${s.upcoming} RDV à venir`, `${s.upcoming} upcoming`)}</Badge> : <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} aria-label={t("Supprimer", "Delete")} onClick={() => setF({ ...f, services: f.services.filter((_, j) => j !== i) })}>{""}</Button>}
              </div>
              <Input className="sm:col-span-4" aria-label={t("Description courte", "Short description")} placeholder={t("Description courte (facultatif)", "Short description (optional)")} value={s.short} onChange={(e) => setService(i, { short: e.target.value })} />
              {f.kind === "salon" && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={s.priceFrom} onChange={(e) => setService(i, { priceFrom: e.target.checked })} /> {t("« À partir de »", "“From”")}</label>}
            </div>
          ))}
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setF({ ...f, services: [...f.services, { name: "", short: "", duration: 60, price: null, priceFrom: false, ...(f.kind === "salon" ? { category: "coupe" } : { modes: "cabinet" }) }] })}>{f.kind === "salon" ? t("Ajouter une prestation", "Add a service") : t("Ajouter une séance", "Add a session")}</Button>
          <p className="text-xs text-muted">{t("Un rendez-vous déjà pris garde le nom, le prix et la durée enregistrés au moment de la réservation.", "A booked appointment keeps the name, price and length recorded when it was booked.")}</p>
        </section>
      )}

      {f.kind === "salon" && (
        <section className="grid gap-2">
          <h3 className="font-semibold">{t("Intervenants", "Staff")}</h3>
          {!f.staff.length && <p className="text-sm text-warn" data-no-staff>{t("Aucun intervenant : le calendrier du site ne proposera aucun créneau.", "No staff: the site's calendar won't offer any slot.")}</p>}
          {f.staff.map((m, i) => (
            <div key={m.id ?? `m-${i}`} className="grid gap-2 rounded-xl border border-line p-3" data-intervenant={m.id ?? "nouveau"}>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input aria-label={t("Prénom", "First name")} placeholder={t("Prénom", "First name")} value={m.name} onChange={(e) => setStaff(i, { name: e.target.value })} />
                <Input aria-label={t("Spécialité", "Speciality")} placeholder={t("Spécialité (facultatif)", "Speciality (optional)")} value={m.title} onChange={(e) => setStaff(i, { title: e.target.value })} />
                <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} aria-label={t("Retirer", "Remove")} onClick={() => setF({ ...f, staff: f.staff.filter((_, j) => j !== i) })}>{""}</Button>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="text-muted">{t("Jours (aucun coché = tous) :", "Days (none = all):")}</span>
                {DAYS.map(([k, n, fr, en]) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={m.days.includes(n)} onChange={(e) => setStaff(i, { days: e.target.checked ? [...m.days, n] : m.days.filter((d) => d !== n) })} />{t(fr, en).slice(0, 3)}</label>)}
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="text-muted">{t("Réalise (aucune cochée = toutes) :", "Performs (none = all):")}</span>
                {CATS.map(([v, fr, en]) => <label key={v} className="flex items-center gap-1"><input type="checkbox" checked={m.skills.includes(v)} onChange={(e) => setStaff(i, { skills: e.target.checked ? [...m.skills, v] : m.skills.filter((x) => x !== v) })} />{t(fr, en)}</label>)}
              </div>
            </div>
          ))}
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setF({ ...f, staff: [...f.staff, { name: "", title: "", skills: [], days: [] }] })}>{t("Ajouter un intervenant", "Add a staff member")}</Button>
        </section>
      )}

      {f.kind !== "restaurant" ? (
        <section className="grid gap-2">
          <h3 className="font-semibold">{t("Horaires d'ouverture", "Opening hours")}</h3>
          <p className="text-xs text-muted">{t("Format : 09:00-12:00, 14:00-18:00. Vide = fermé ce jour-là.", "Format: 09:00-12:00, 14:00-18:00. Empty = closed that day.")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DAYS.map(([k, , fr, en]) => <label key={k} className="grid grid-cols-[6rem_1fr] items-center gap-2 text-sm">{t(fr, en)}<Input aria-label={t(`Horaires ${fr}`, `Hours ${en}`)} placeholder={t("fermé", "closed")} value={f.hours[k] ?? ""} onChange={(e) => setF({ ...f, hours: { ...f.hours, [k]: e.target.value } })} /></label>)}
          </div>
        </section>
      ) : (
        <section className="grid gap-2" data-restaurant-slots>
          <h3 className="font-semibold">{t("Services et capacité", "Services and capacity")}</h3>
          {f.restaurant!.defaults && <p className="rounded-xl bg-warn-soft p-3 text-xs text-warn" data-defaults>{t("Ces créneaux et cette capacité sont des valeurs proposées par le studio : vérifiez-les avant d'ouvrir les réservations.", "These slots and capacity are values suggested by the studio: check them before opening bookings.")}</p>}
          <div className="flex flex-wrap gap-3 text-sm">{DAYS.map(([k, n, fr, en]) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={f.restaurant!.openDays.includes(n)} onChange={(e) => setF({ ...f, restaurant: { ...f.restaurant!, openDays: e.target.checked ? [...f.restaurant!.openDays, n] : f.restaurant!.openDays.filter((d) => d !== n) } })} />{t(fr, en)}</label>)}</div>
          <label className="grid gap-1 text-sm">{t("Créneaux du déjeuner", "Lunch slots")}<Input value={f.restaurant!.lunchSlots} onChange={(e) => setF({ ...f, restaurant: { ...f.restaurant!, lunchSlots: e.target.value } })} placeholder="12:00, 12:30, 13:00" /></label>
          <label className="grid gap-1 text-sm">{t("Créneaux du dîner", "Dinner slots")}<Input value={f.restaurant!.dinnerSlots} onChange={(e) => setF({ ...f, restaurant: { ...f.restaurant!, dinnerSlots: e.target.value } })} placeholder="19:00, 19:30, 20:00" /></label>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">{t("Couverts par créneau", "Covers per slot")}<Input inputMode="numeric" value={f.restaurant!.capacity} onChange={(e) => setF({ ...f, restaurant: { ...f.restaurant!, capacity: Number(e.target.value) } })} /></label>
            <label className="grid gap-1 text-sm">{t("Table : minimum", "Party: minimum")}<Input inputMode="numeric" value={f.restaurant!.minParty} onChange={(e) => setF({ ...f, restaurant: { ...f.restaurant!, minParty: Number(e.target.value) } })} /></label>
            <label className="grid gap-1 text-sm">{t("Table : maximum", "Party: maximum")}<Input inputMode="numeric" value={f.restaurant!.maxParty} onChange={(e) => setF({ ...f, restaurant: { ...f.restaurant!, maxParty: Number(e.target.value) } })} /></label>
          </div>
        </section>
      )}

      <section className="grid gap-1">
        <h3 className="font-semibold">{t("Fermetures exceptionnelles", "Exceptional closures")}</h3>
        <Input aria-label={t("Fermetures", "Closures")} placeholder="2026-12-24..2026-12-26, 2027-01-01" value={f.closures} onChange={(e) => setF({ ...f, closures: e.target.value })} />
      </section>

      <div className="flex justify-end"><Button loading={busy} onClick={save} data-prestations-save>{t("Enregistrer", "Save")}</Button></div>
    </div>
  );
}
