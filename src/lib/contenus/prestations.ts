/**
 * Prestations, horaires et intervenants d'un site avec réservation native (#239, phase 2) : salon (ATELIER NUANCE),
 * cabinet (PARENTHÈSE), restaurant (TABLE SAISON, créneaux et capacité).
 *
 * Source unique : la section de réglages que lisent les moteurs de réservation (`an-salon`, `pa-cabinet`,
 * `ts-restaurant`, rendez-vous.ts). Ce module l'édite avec un formulaire dédié au lieu du panneau générique, et chaque
 * enregistrement crée une version du site (restaurable). Aucune seconde table : rien ne peut diverger.
 *
 * - Les textes « Prix / Durée affichés » écrits pour un affichage sans script (accueil, prestations, en-tête) sont
 *   remis d'accord avec la source à l'enregistrement, seulement s'ils sont remplis (un champ vide est rempli par le site).
 * - Une prestation qui a des rendez-vous à venir ne peut pas être supprimée (le déplacement deviendrait impossible) ;
 *   un rendez-vous confirmé garde le nom, le prix et la durée enregistrés à la réservation.
 */
import { z } from "zod";
import { HttpError } from "../auth";
import { all } from "../db";
import { L } from "../i18n-server";
import { currentTheme, saveThemeVersion } from "../projects";
import { rdvSection, type RdvKind } from "../rendez-vous";
import type { SectionInstance, ThemeSpec } from "../theme/spec";

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const HOURS = /^\s*$|^\s*\d{2}:\d{2}\s*-\s*\d{2}:\d{2}(\s*,\s*\d{2}:\d{2}\s*-\s*\d{2}:\d{2})*\s*$/;
const SLOTS = /^\s*$|^\s*\d{2}:\d{2}(\s*,\s*\d{2}:\d{2})*\s*$/;
const CLOSURES = /^\s*$|^\s*\d{4}-\d{2}-\d{2}(\.\.\d{4}-\d{2}-\d{2})?(\s*,\s*\d{4}-\d{2}-\d{2}(\.\.\d{4}-\d{2}-\d{2})?)*\s*$/;
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "prestation";
const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

const hoursSchema = z.string().max(120).regex(HOURS, "horaires : « 09:00-12:00, 14:00-18:00 » ou vide (fermé)").refine((v) => !v.trim() || !HOURS.test(v) || v.split(",").every((r) => { const [a, b] = r.split("-").map((x) => x.trim()); return toMin(a) < toMin(b) && toMin(b) <= 24 * 60; }), "horaires : l'heure de fin doit suivre l'heure de début");
const serviceSchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(1, "nom de la prestation").max(80),
  category: z.enum(["coupe", "couleur", "coiffage", "soin"]).optional(),
  short: z.string().max(160).default(""),
  duration: z.number().int().min(5, "durée : 5 minutes au moins").max(600),
  price: z.number().min(0).max(100000).nullable(),
  priceFrom: z.boolean().default(false),
  modes: z.enum(["cabinet", "visio", "cabinet,visio"]).optional(),
});
const staffSchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(1, "prénom de l'intervenant").max(60),
  title: z.string().max(80).default(""),
  skills: z.array(z.string().max(40)).max(40).default([]),
  days: z.array(z.number().int().min(0).max(6)).max(7).default([]),
});
export const prestationsInput = z.object({
  services: z.array(serviceSchema).max(60).optional(),
  staff: z.array(staffSchema).max(20).optional(),
  hours: z.object(Object.fromEntries(DAYS.map((d) => [d, hoursSchema])) as Record<(typeof DAYS)[number], typeof hoursSchema>).partial().optional(),
  address: z.string().trim().max(300).optional(),
  closures: z.string().max(2000).regex(CLOSURES, "fermetures : dates AAAA-MM-JJ ou périodes AAAA-MM-JJ..AAAA-MM-JJ").optional(),
  restaurant: z.object({
    openDays: z.array(z.number().int().min(0).max(6)).max(7),
    lunchSlots: z.string().max(200).regex(SLOTS, "créneaux : « 12:00, 12:30 »"),
    dinnerSlots: z.string().max(200).regex(SLOTS, "créneaux : « 19:00, 19:30 »"),
    capacity: z.number().int().min(1).max(500),
    minParty: z.number().int().min(1).max(50),
    maxParty: z.number().int().min(1).max(50),
  }).optional(),
});
export type PrestationsInput = z.infer<typeof prestationsInput>;

/** Rendez-vous confirmés à venir, par prestation (salon : `salon_appointments.service`, cabinet : séance). */
function futureBookings(projectId: string, kind: RdvKind): Record<string, number> {
  const today = new Date().toISOString().slice(0, 10);
  const table = kind === "salon" ? "salon_appointments" : kind === "cabinet" ? "cabinet_appointments" : null;
  if (!table) return {};
  try {
    return Object.fromEntries(all<{ service: string; n: number }>(`SELECT service, COUNT(*) n FROM ${table} WHERE project_id = ? AND status = 'confirmed' AND date >= ? GROUP BY service`, projectId, today).map((r) => [r.service, r.n]));
  } catch { return {}; }
}

const num = (v: unknown) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const blocksOf = (s: SectionInstance) => (s.block_order ?? Object.keys(s.blocks ?? {})).map((k) => ({ key: k, block: s.blocks![k] })).filter((x) => x.block);

/** Lecture pour l'éditeur : ce que lit réellement le moteur de réservation. */
export function readPrestations(projectId: string) {
  const cur = currentTheme(projectId);
  const sec = cur ? rdvSection(cur.spec as ThemeSpec) : null;
  if (!sec) return null;
  const st = (sec.section.settings ?? {}) as Record<string, unknown>;
  const booked = futureBookings(projectId, sec.kind);
  const blocks = blocksOf(sec.section);
  const services = sec.kind === "salon"
    ? blocks.filter((b) => b.block.type === "service").map(({ block: b }) => { const v = b.settings ?? {}; return { id: String(v.service_id ?? ""), name: String(v.name ?? ""), category: String(v.category ?? "coupe"), short: String(v.short ?? ""), duration: num(v.duration), price: num(v.price), priceFrom: !!v.price_from, upcoming: booked[String(v.service_id ?? "")] ?? 0 }; })
    : sec.kind === "cabinet"
      ? blocks.filter((b) => b.block.type === "seance").map(({ block: b }) => { const v = b.settings ?? {}; return { id: String(v.seance_id ?? ""), name: String(v.name ?? ""), short: String(v.short ?? ""), duration: num(v.duration), price: num(v.price), priceFrom: false, modes: String(v.modes ?? "cabinet"), upcoming: booked[String(v.seance_id ?? "")] ?? 0 }; })
      : [];
  const staff = sec.kind === "salon" ? blocks.filter((b) => b.block.type === "member").map(({ block: b }) => { const v = b.settings ?? {}; return { id: String(v.member_id ?? ""), name: String(v.name ?? ""), title: String(v.title ?? ""), skills: String(v.skills ?? "").split(",").map((x) => x.trim()).filter(Boolean), days: String(v.days ?? "").split(",").map((x) => x.trim()).filter(Boolean).map(Number) }; }) : [];
  const hours = Object.fromEntries(DAYS.map((d) => [d, String(st[`hours_${d}`] ?? "")]));
  const restaurant = sec.kind === "restaurant" ? {
    openDays: String(st.open_days ?? "").split(",").map((x) => x.trim()).filter(Boolean).map(Number),
    lunchSlots: String(st.lunch_slots ?? ""), dinnerSlots: String(st.dinner_slots ?? ""),
    capacity: num(st.capacity) ?? 24, minParty: num(st.min_party) ?? 1, maxParty: num(st.max_party) ?? 8,
    // Valeurs proposées par le studio et jamais modifiées : le restaurateur doit les vérifier.
    defaults: String(st.lunch_slots ?? "") === "12:00, 12:30, 13:00" && String(st.dinner_slots ?? "").startsWith("19:00, 19:30, 20:00") && Number(st.capacity) === 24,
  } : null;
  return { kind: sec.kind, live: st.booking_mode === "live", versionId: cur!.version.id, address: String(st.address ?? ""), services, staff, hours, closures: String(st.closures ?? ""), restaurant, open: sec.kind === "restaurant" ? !!restaurant!.openDays.length : Object.values(hours).some((h) => h.trim()) };
}

/** Prix et durée affichés sans script, au format de la composition (« 45 € », « À partir de 45 € », « 1 h 30 »). */
export const shownPrice = (price: number, from: boolean) => { const n = Math.round(price * 100) / 100; const v = n % 1 ? n.toFixed(2).replace(".", ",") : String(n); return from ? `À partir de ${v} €` : `${v} €`; };
export const shownDuration = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`);

/** Textes affichés des autres sections, remis d'accord avec la source quand ils sont remplis. */
function syncShown(spec: ThemeSpec, kind: RdvKind, byId: Map<string, { name: string; oldName: string; duration: number; price: number | null; priceFrom: boolean }>) {
  const idKey = kind === "salon" ? "service_id" : "seance_id";
  const nameKeys = ["name", "title"];
  const fix = (v: Record<string, unknown>) => {
    const ref = String(v[idKey] ?? v.ref_id ?? "");
    const s = byId.get(ref);
    if (!s) return;
    if (typeof v.price === "string" && v.price.trim() && s.price != null) v.price = shownPrice(s.price, s.priceFrom);
    if (typeof v.duration === "string" && v.duration.trim()) v.duration = shownDuration(s.duration);
    for (const k of nameKeys) if (typeof v[k] === "string" && v[k] === s.oldName && s.oldName !== s.name) v[k] = s.name;
  };
  const containers = [spec.groups?.header, spec.groups?.footer, ...Object.values(spec.templates ?? {})];
  for (const c of containers) for (const sec of Object.values(c?.sections ?? {})) {
    if (/^(an-salon|pa-cabinet|ts-restaurant)$/.test(sec.type)) continue;
    fix((sec.settings ?? {}) as Record<string, unknown>);
    for (const b of Object.values(sec.blocks ?? {})) fix((b.settings ?? {}) as Record<string, unknown>);
  }
}

/**
 * Enregistre les prestations, horaires et intervenants dans la section lue par le moteur, et crée une version du site.
 * Refuse de supprimer une prestation qui a des rendez-vous à venir ; signale ceux dont la durée change.
 */
export function savePrestations(projectId: string, raw: unknown) {
  const input = prestationsInput.parse(raw);
  const cur = currentTheme(projectId);
  if (!cur) throw new HttpError(409, L("Créez d'abord le site dans l'onglet Site.", "Create the site in the Site tab first."));
  const spec = structuredClone(cur.spec) as ThemeSpec;
  const sec = rdvSection(spec);
  if (!sec) throw new HttpError(409, L("Ce site n'a pas de réservation intégrée (salon, cabinet ou restaurant).", "This site has no built-in booking (salon, practice or restaurant)."));
  const section = sec.section;
  const st = (section.settings ??= {}) as Record<string, unknown>;
  const warnings: string[] = [];
  const before = readPrestations(projectId)!;

  if (input.services && sec.kind !== "restaurant") {
    const kept = new Set(input.services.map((s) => s.id).filter(Boolean));
    const removed = before.services.filter((s) => !kept.has(s.id) && s.upcoming > 0);
    if (removed.length) throw new HttpError(409, L(`Impossible de supprimer ${removed.map((s) => `« ${s.name} » (${s.upcoming} rendez-vous à venir)`).join(", ")} : ses rendez-vous ne pourraient plus être déplacés. Gardez-la jusqu'à ses derniers rendez-vous.`, `Can't delete ${removed.map((s) => `“${s.name}” (${s.upcoming} upcoming)`).join(", ")}: its appointments could no longer be moved. Keep it until its last appointments.`), "service_has_bookings");
    const used = new Set<string>();
    const blockType = sec.kind === "salon" ? "service" : "seance";
    const idKey = sec.kind === "salon" ? "service_id" : "seance_id";
    const oldBlocks = new Map(blocksOf(section).filter((b) => b.block.type === blockType).map((b) => [String(b.block.settings?.[idKey] ?? ""), b]));
    const others = blocksOf(section).filter((b) => b.block.type !== blockType);
    const byId = new Map<string, { name: string; oldName: string; duration: number; price: number | null; priceFrom: boolean }>();
    const next: { key: string; block: { type: string; settings: Record<string, unknown> } }[] = [];
    for (const s of input.services) {
      const known = !!s.id && oldBlocks.has(s.id);
      let id = known ? s.id! : slug(s.name);
      while (!known && (used.has(id) || oldBlocks.has(id))) id = `${id}-2`;
      used.add(id);
      const old = oldBlocks.get(id);
      const prev = before.services.find((x) => x.id === id);
      if (prev && prev.upcoming && prev.duration !== s.duration) warnings.push(L(`« ${s.name} » : ${prev.upcoming} rendez-vous à venir gardent leur durée enregistrée (${prev.duration} min).`, `“${s.name}”: ${prev.upcoming} upcoming appointment(s) keep their recorded length (${prev.duration} min).`));
      const settings = { ...(old?.block.settings ?? {}), [idKey]: id, name: s.name, short: s.short, duration: s.duration, price: s.price ?? "",
        ...(sec.kind === "salon" ? { category: s.category ?? "coupe", price_from: s.priceFrom } : { modes: s.modes ?? "cabinet" }) };
      next.push({ key: old?.key ?? `${blockType}-${id}`, block: { type: blockType, settings } });
      byId.set(id, { name: s.name, oldName: prev?.name ?? s.name, duration: s.duration, price: s.price, priceFrom: s.priceFrom });
    }
    let staffBlocks = others.filter((b) => b.block.type === "member");
    if (input.staff && sec.kind === "salon") {
      const oldStaff = new Map(staffBlocks.map((b) => [String(b.block.settings?.member_id ?? ""), b]));
      staffBlocks = input.staff.map((m) => {
        const id = m.id && oldStaff.has(m.id) ? m.id : slug(m.name);
        const old = oldStaff.get(id);
        return { key: old?.key ?? `member-${id}`, block: { ...(old?.block ?? {}), type: "member", settings: { ...(old?.block.settings ?? {}), member_id: id, name: m.name, initial: m.name.charAt(0).toUpperCase(), title: m.title, skills: m.skills.join(","), days: m.days.join(",") } } };
      });
    }
    const rest = others.filter((b) => b.block.type !== "member");
    const all3 = [...next, ...staffBlocks, ...rest];
    section.blocks = Object.fromEntries(all3.map((b) => [b.key, b.block as never]));
    section.block_order = all3.map((b) => b.key);
    syncShown(spec, sec.kind, byId);
  }
  if (input.hours && sec.kind !== "restaurant") for (const d of DAYS) if (input.hours[d] !== undefined) st[`hours_${d}`] = input.hours[d]!.trim().replace(/\s*-\s*/g, "-").replace(/\s*,\s*/g, ", ");
  if (input.closures !== undefined) st.closures = input.closures.trim();
  if (input.address !== undefined) st.address = input.address;
  if (input.restaurant && sec.kind === "restaurant") {
    const r = input.restaurant;
    if (r.minParty > r.maxParty) throw new HttpError(400, L("Le nombre minimum de couverts dépasse le maximum.", "The minimum party size exceeds the maximum."));
    Object.assign(st, { open_days: [...new Set(r.openDays)].sort().join(","), lunch_slots: r.lunchSlots.trim(), dinner_slots: r.dinnerSlots.trim(), capacity: r.capacity, min_party: r.minParty, max_party: r.maxParty });
  }
  const v = saveThemeVersion(projectId, spec, L("Prestations et horaires", "Services and hours"), "user");
  return { versionId: v.id, number: v.number, warnings, prestations: readPrestations(projectId) };
}
