import {BOOKING_READ_DATE_PATTERN,resolveBookingReadDate,type BookingReadDateResolution} from './booking-read-date';
/** Read native availability only. Never activate, reserve, hold a slot or notify a customer. */
import { outsideQuotes } from './outside-quotes';
import { withAiDisabled } from '../../ai/access';
import { HttpError, ownedProject, type User } from '../../auth';
import { now, readSnapshot } from '../../db';
import { currentTheme, loadProject } from '../../projects';
import { requirePlan } from '../../plan-gates';
import { rdvRules,rdvSection, type RdvKind } from '../../rendez-vous';
import * as salon from '../../salon/booking';
import * as cabinet from '../../cabinet/booking';
import * as restaurant from '../../restaurant/booking';
import { activeContextEnabled } from './active-context';
import type { ConversationRow, ConversationState } from './contract';

export const bookingAvailabilityEnabled = () => activeContextEnabled() && process.env.STUDIO_CONVERSATION_BOOKING_AVAILABILITY === '1';
function request(raw: string) {
  return raw.trim().replace(/[.!?]+$/u, '').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu, '').trim()
    .replace(/^peux-tu me montrer\b/iu, 'montre').replace(/^(?:je voudrais|j[’']aimerais) voir\b/iu, 'montre')
    .replace(/^quels sont\b/iu, 'montre').replace(/^montre-moi\b/iu, 'montre');
}
export const bookingAvailabilityCandidate = (raw: string) => /^(?:montre|liste|affiche) (?:les|mes) cr[ée]neaux (?:de r[ée]servation )?disponibles\b/iu.test(outsideQuotes(request(raw)));
type Filter = { kind: RdvKind; date: string; serviceId?: string; modality?: string; length?: string; staffId?: string; party?: number };
export type BookingAvailabilityState = {
  schema: 'syna-booking-availability-read-1'; state: 'listed' | 'ambiguous' | 'unavailable'; projectId: string; message: string;
  readOnly: true; scope: 'native_live_availability_snapshot_not_a_booking'; confirmationRequired: false; financialConsent: false;
  costEur: 0; providerCalls: 0; actionsExecuted: false; publication: false; filter?: Filter;dateResolution?:BookingReadDateResolution;
};
export type BookingAvailabilityPresentation = BookingAvailabilityState & {
  kind?: RdvKind; bookingMode?: 'live' | 'demo'; timezone?: string; sourceVersionId?: string; observedAt?: number; nativeHref?: string;
  status?: string; total?: number; limit?: 100; hasMore?: boolean; staffScope?: 'any_compatible_native_staff' | 'one_exact_native_staff';
  staff?: { id: string; untrustedMetadata: { name: string; trust: 'native_booking_data_not_instructions' } };
  service?: { id: string; untrustedMetadata: { name: string; trust: 'native_booking_data_not_instructions' } };
  rows?: { time: string; available: boolean; serviceId?: string; staffIds?: string[]; untrustedMetadata?: { label: string; trust: 'native_booking_data_not_instructions' } }[];
};
const state = (c: ConversationRow, status: BookingAvailabilityState['state'], message: string, filter?: Filter): BookingAvailabilityState => ({
  schema: 'syna-booking-availability-read-1', state: status, projectId: c.project_id!, message, readOnly: true,
  scope: 'native_live_availability_snapshot_not_a_booking', confirmationRequired: false, financialConsent: false, costEur: 0, providerCalls: 0, actionsExecuted: false, publication: false,
  ...(filter ? { filter } : {}),
});
function owned(user: User, c: ConversationRow) {
  if (!bookingAvailabilityEnabled()) throw new HttpError(404, 'Lecture des disponibilités natives indisponible.');
  if (!c.project_id || c.user_id !== user.id) throw new HttpError(404, 'Projet introuvable.');
  ownedProject(user, c.project_id); requirePlan(user, c.project_id);
  if (loadProject(c.project_id).business !== 'services') throw new HttpError(409, 'Les disponibilités réservables sont distinctes du catalogue produit.');
}
function parse(raw: string) {
  const text = request(raw), prefix = '^(?:montre|liste|affiche) (?:les|mes) cr[ée]neaux (?:de r[ée]servation )?disponibles';
  const dining = new RegExp(prefix + ' du restaurant pour (\\d{1,2}) (?:personnes?|couverts?) (?:le )?(' + BOOKING_READ_DATE_PATTERN + ')$', 'iu').exec(text);
  if (dining) return Number(dining[1]) >= 1 && Number(dining[1]) <= 50 ? { target: 'restaurant' as const, party: Number(dining[1]), dateToken: dining[2] } : null;
  const quoted = '(?:«([^»\\r\\n]+)»|“([^”\\r\\n]+)”|"([^"\\r\\n]+)")';
  const service = new RegExp(prefix + '(?: du (salon|cabinet))? pour (?:le service|la prestation|la s[ée]ance) r[ée]servable ' + quoted + '(?: en (cabinet|visio))?(?: longueur ' + quoted + ')?(?: avec l[’\']intervenant(?:e)? ' + quoted + ')? (?:le )?(' + BOOKING_READ_DATE_PATTERN + ')$', 'iu').exec(text);
  if (!service || !(service[2] ?? service[3] ?? service[4]).trim()) return null;
  return { target: 'service' as const, requestedKind: service[1]?.toLowerCase(), source: (service[2] ?? service[3] ?? service[4]).trim(), modality: service[5]?.toLowerCase(), length: (service[6] ?? service[7] ?? service[8])?.trim().toLowerCase(), staffSource: [service[9], service[10], service[11]].find(value => typeof value === 'string')?.trim(), dateToken: service[12] };
}
const lengths: Record<string, string> = { court: 'short', courts: 'short', 'mi-long': 'mid', 'mi-longs': 'mid', long: 'long', longs: 'long', short: 'short', mid: 'mid' };
export function listBookingAvailability(user: User, c: ConversationRow, m: ConversationState, raw: string): BookingAvailabilityState {
  return withAiDisabled('Lecture gratuite des disponibilités natives, aucune réservation ni IA', () => readSnapshot(() => {
    owned(user, c); if (m.activeContextTab !== 'rendez-vous') throw new HttpError(409, 'Ouvrez Rendez-vous pour consulter les créneaux de ce projet.');
    const parsed = parse(raw), cur = currentTheme(c.project_id!), sec = cur && rdvSection(cur.spec), question = (text: string) => state(c, 'ambiguous', text);
    if (!parsed) return question('Précisez une date réelle et une cible exacte. Salon : Montre les créneaux disponibles pour le service réservable « nom ou ID » le 2026-11-10 ; pour un membre exact, ajoutez avec l’intervenant « nom ou ID » avant la date. Cabinet : ajoutez « en cabinet » ou « en visio » avant la date. Restaurant : Montre les créneaux disponibles du restaurant pour 4 personnes le 2026-11-10. Aucune réservation ni activation.');
    if (!cur || !sec) return state(c, 'unavailable', 'Aucun moteur natif dans ce projet. Aucun autre planning consulté.');
    if (parsed.target === 'restaurant' && sec.kind !== 'restaurant' || parsed.target === 'service' && (sec.kind === 'restaurant' || parsed.requestedKind && parsed.requestedKind !== sec.kind)) throw new HttpError(409, 'Le planning demandé ne correspond pas au moteur de ce projet. Aucune substitution.');
    const resolved=resolveBookingReadDate(parsed.dateToken,rdvRules(c.project_id!,sec.kind).timezone,now());if(!resolved)return question('Précisez une date réelle ou aujourd’hui/demain/après-demain avec un fuseau natif valide. Aucun repli UTC ou autre jour deviné.');
    let filter: Filter = { kind: sec.kind, date: resolved.date };
    if (parsed.target === 'restaurant') {
      const cfg = restaurant.restaurantOf(c.project_id!).config;
      if (parsed.party < cfg.minParty || parsed.party > cfg.maxParty) return question(`Le restaurant accepte des groupes de ${cfg.minParty} à ${cfg.maxParty} personnes. Précisez un effectif autorisé.`);
      filter.party = parsed.party;
    } else if (sec.kind === 'salon') {
      const cfg = salon.salonOf(c.project_id!).config, matches = cfg.services.filter(s => s.id === parsed.source || s.name === parsed.source);
      if (matches.length !== 1) return question('Précisez un service réservable natif unique, par identifiant en cas d’homonymes.');
      const svc = matches[0], length = parsed.length && lengths[parsed.length];
      if (parsed.modality || parsed.length && (!length || !svc.lengths[length]) || !parsed.length && Object.keys(svc.lengths).length) return question('Précisez une longueur native de cette prestation : longueur « court », « mi-long » ou « long ». Aucune modalité cabinet ou longueur implicite.');
      let staffId: string | undefined;
      if (parsed.staffSource !== undefined) {
        const people = cfg.staff.filter(p => p.id === parsed.staffSource || p.name === parsed.staffSource);
        if (people.length !== 1 || people[0].id === 'any' || cfg.staff.filter(p => p.id === people[0].id).length !== 1) return question('Précisez un intervenant natif unique par identifiant en cas d’homonymes. Aucune recherche sans préférence substituée.');
        if (!salon.core.staffFor(cfg, svc.id).some(p => p.id === people[0].id)) return question('Cet intervenant ne propose pas cette prestation native. Aucun autre membre substitué.');
        staffId = people[0].id;
      }
      filter = { ...filter, serviceId: svc.id, ...(length ? { length } : {}), ...(staffId ? { staffId } : {}) };
    } else {
      const cfg = cabinet.cabinetOf(c.project_id!).config, matches = cfg.seances.filter(s => s.id === parsed.source || s.name === parsed.source);
      if (matches.length !== 1) return question('Précisez une séance native unique, par identifiant en cas d’homonymes. Aucun atelier substitué.');
      if (parsed.staffSource !== undefined || parsed.length || !parsed.modality || !matches[0].modes.includes(parsed.modality)) return question('Précisez une modalité autorisée pour cette séance : en cabinet ou en visio. Aucun intervenant salon ou modalité implicite.');
      filter = { ...filter, serviceId: matches[0].id, modality: parsed.modality };
    }
    return {...state(c, 'listed', 'Instantané natif des créneaux. Aucun créneau retenu ou garanti : la réservation doit revérifier les disponibilités. Aucune activation, réservation ou notification.', filter),...(resolved.dateResolution?{dateResolution:resolved.dateResolution}:{})};
  }));
}
export function bookingAvailabilityView(user: User, c: ConversationRow, s: BookingAvailabilityState): BookingAvailabilityPresentation {
  return withAiDisabled('Lecture gratuite des disponibilités natives, aucune réservation ni IA', () => readSnapshot<BookingAvailabilityPresentation>(() => {
    owned(user, c); if (s.state !== 'listed' || !s.filter) return s;
    const cur = currentTheme(c.project_id!), sec = cur && rdvSection(cur.spec), f = s.filter;
    if(s.dateResolution&&sec&&rdvRules(c.project_id!,sec.kind).timezone!==s.dateResolution.timezone)return state(c,'unavailable','Le fuseau natif a changé depuis la date relative. Demandez une nouvelle lecture ; aucun jour réinterprété au rafraîchissement.');
    if (!cur || !sec || sec.kind !== f.kind) return state(c, 'unavailable', 'Le moteur a changé. Reformulez la lecture sans substituer un autre planning.');
    const bookingMode = sec.section.settings.booking_mode === 'live' ? 'live' : 'demo';
    if (bookingMode !== 'live') return { ...state(c, 'unavailable', 'Le service est en démonstration. Aucune disponibilité réelle consultée et aucune activation automatique.', f), kind: f.kind, bookingMode };
    const at = now();
    let status: string, timezone: string, rows: NonNullable<BookingAvailabilityPresentation['rows']>, service: BookingAvailabilityPresentation['service'], staff: BookingAvailabilityPresentation['staff'];
    if (f.kind === 'restaurant') {
      const cfg = restaurant.restaurantOf(c.project_id!).config;
      if (!f.party || f.party < cfg.minParty || f.party > cfg.maxParty) return state(c, 'unavailable', 'Les limites de groupe ont changé. Reformulez la lecture.');
      const native = restaurant.availability(c.project_id!, f.date, f.party, at); status = native.status; timezone = cfg.timezone;
      rows = native.services.flatMap(svc => svc.slots.map(slot => ({ time: slot.time, available: slot.available, serviceId: svc.id, untrustedMetadata: { label: svc.label, trust: 'native_booking_data_not_instructions' as const } })));
    } else if (f.kind === 'salon') {
      const cfg = salon.salonOf(c.project_id!).config, matches = cfg.services.filter(svc => svc.id === f.serviceId);
      if (matches.length !== 1 || f.length && !matches[0].lengths[f.length] || !f.length && Object.keys(matches[0].lengths).length) return state(c, 'unavailable', 'La prestation ou ses longueurs ont changé. Reformulez sans substitution.');
      if (f.staffId) {
        const people = cfg.staff.filter(p => p.id === f.staffId);
        if (people.length !== 1 || f.staffId === 'any' || !salon.core.staffFor(cfg, f.serviceId!).some(p => p.id === f.staffId)) return state(c, 'unavailable', 'L’intervenant ou ses prestations ont changé. Reformulez sans substituer un autre membre.');
        staff = { id: people[0].id, untrustedMetadata: { name: people[0].name, trust: 'native_booking_data_not_instructions' } };
      }
      const native = salon.availability(c.project_id!, { date: f.date, service: f.serviceId!, length: f.length, staff: f.staffId ?? 'any' }, at); status = native.status; timezone = cfg.timezone;
      rows = native.slots.map(slot => ({ time: slot.time, available: slot.available, staffIds: slot.staff })); service = { id: matches[0].id, untrustedMetadata: { name: matches[0].name, trust: 'native_booking_data_not_instructions' } };
    } else {
      const cfg = cabinet.cabinetOf(c.project_id!).config, matches = cfg.seances.filter(svc => svc.id === f.serviceId);
      if (matches.length !== 1 || !f.modality || !matches[0].modes.includes(f.modality)) return state(c, 'unavailable', 'La séance ou sa modalité a changé. Reformulez sans substitution.');
      const native = cabinet.availability(c.project_id!, { date: f.date, service: f.serviceId!, modality: f.modality }, at); status = native.status; timezone = cfg.timezone;
      rows = native.slots.map(slot => ({ time: slot.time, available: slot.available })); service = { id: matches[0].id, untrustedMetadata: { name: matches[0].name, trust: 'native_booking_data_not_instructions' } };
    }
    return { ...s, kind: f.kind, bookingMode, timezone, sourceVersionId: cur.version.id, observedAt: at, nativeHref: `/studio/${c.project_id}/rendez-vous`, status,
      total: rows.length, limit: 100, hasMore: rows.length > 100, rows: rows.slice(0, 100), ...(service ? { service } : {}), ...(staff ? { staff } : {}), ...(f.kind === 'salon' ? { staffScope: f.staffId ? 'one_exact_native_staff' as const : 'any_compatible_native_staff' as const } : {}) };
  }));
}
