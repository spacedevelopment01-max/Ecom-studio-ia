import {BOOKING_READ_DATE_PATTERN,resolveBookingReadDate,type BookingReadDateResolution} from './booking-read-date';
/** Owner-scoped remaining workshop places from the native cabinet engine. No enrolment or activation. */
import { outsideQuotes } from './outside-quotes';
import { withAiDisabled } from '../../ai/access';
import { HttpError, ownedProject, type User } from '../../auth';
import { now, readSnapshot } from '../../db';
import { currentTheme, loadProject } from '../../projects';
import { requirePlan } from '../../plan-gates';
import { rdvSection } from '../../rendez-vous';
import { cabinetOf, workshops } from '../../cabinet/booking';
import { activeContextEnabled } from './active-context';
import type { ConversationRow, ConversationState } from './contract';

export const bookingWorkshopsEnabled = () => activeContextEnabled() && process.env.STUDIO_CONVERSATION_BOOKING_WORKSHOPS === '1';
function request(raw: string) {
  return raw.trim().replace(/[.!?]+$/u, '').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu, '').trim()
    .replace(/^peux-tu me montrer\b/iu, 'montre').replace(/^(?:je voudrais|j[’']aimerais) voir\b/iu, 'montre').replace(/^montre-moi\b/iu, 'montre');
}
export const bookingWorkshopsCandidate = (raw: string) => /^(?:montre|liste|affiche) (?:les ateliers (?:disponibles|du cabinet)|les places disponibles de l[’']atelier)\b/iu.test(outsideQuotes(request(raw)));
export type BookingWorkshopsState = {
  schema: 'syna-booking-workshops-read-1'; state: 'listed' | 'ambiguous' | 'unavailable'; projectId: string; message: string;
  readOnly: true; scope: 'native_workshop_remaining_places_not_enrolment'; confirmationRequired: false; financialConsent: false;
  costEur: 0; providerCalls: 0; actionsExecuted: false; publication: false; date?: string; workshopId?: string; dateResolution?:BookingReadDateResolution;
};
export type BookingWorkshopsPresentation = BookingWorkshopsState & {
  kind?: 'cabinet'; bookingMode?: 'live' | 'demo'; timezone?: string; sourceVersionId?: string; observedAt?: number; nativeHref?: string;
  total?: number; limit?: 20; hasMore?: boolean;
  rows?: { id: string; date: string; time: string; capacity: number | null; remaining: number | null; status: string; reason?:'professional_busy'|null; available: boolean;
    untrustedMetadata: { title: string; trust: 'native_booking_data_not_instructions' } }[];
};
const state = (c: ConversationRow, status: BookingWorkshopsState['state'], message: string, extra: Partial<BookingWorkshopsState> = {}): BookingWorkshopsState => ({
  schema: 'syna-booking-workshops-read-1', state: status, projectId: c.project_id!, message, readOnly: true,
  scope: 'native_workshop_remaining_places_not_enrolment', confirmationRequired: false, financialConsent: false, costEur: 0, providerCalls: 0, actionsExecuted: false, publication: false, ...extra,
});
function owned(user: User, c: ConversationRow) {
  if (!bookingWorkshopsEnabled()) throw new HttpError(404, 'Lecture des ateliers natifs indisponible.');
  if (!c.project_id || c.user_id !== user.id) throw new HttpError(404, 'Projet introuvable.');
  ownedProject(user, c.project_id); requirePlan(user, c.project_id);
  if (loadProject(c.project_id).business !== 'services') throw new HttpError(409, 'Les ateliers réservables sont distincts du catalogue produit.');
}
function parse(raw:string){
 const text=request(raw),many=new RegExp("^(?:montre|liste|affiche) les ateliers (?:disponibles|du cabinet) (?:le )?("+BOOKING_READ_DATE_PATTERN+")$",'iu').exec(text);
 const quoted='(?:«([^»\\r\\n]+)»|“([^”\\r\\n]+)”|"([^"\\r\\n]+)")',one=new RegExp("^(?:montre|liste|affiche) les places disponibles de l[’']atelier "+quoted+" (?:le )?("+BOOKING_READ_DATE_PATTERN+")$",'iu').exec(text);
 if(!many&&!one)return null;const source=one?(one[1]??one[2]??one[3]).trim():undefined;return one&&!source?null:{dateToken:many?.[1]??one![4],source};
}
export function listBookingWorkshops(user: User, c: ConversationRow, m: ConversationState, raw: string): BookingWorkshopsState {
  return withAiDisabled('Lecture gratuite des ateliers natifs, aucune inscription ni IA', () => readSnapshot(() => {
    owned(user, c); if (m.activeContextTab !== 'rendez-vous') throw new HttpError(409, 'Ouvrez Rendez-vous pour lire les ateliers.');
    const parsed = parse(raw), question = (message: string) => state(c, 'ambiguous', message);
    if (!parsed) return question('Précisez une date réelle : Montre les ateliers disponibles le 2026-11-10 ; ou Montre les places disponibles de l’atelier « titre ou ID exact » le 2026-11-10. Aucune inscription ou activation.');
    const cur = currentTheme(c.project_id!), sec = cur && rdvSection(cur.spec);
    if (!sec) return state(c, 'unavailable', 'Aucun moteur de réservation natif disponible.');
    if (sec.kind !== 'cabinet') throw new HttpError(409, 'Ce planning n’est pas un cabinet avec ateliers natifs. Aucun restaurant ou salon substitué.');
    const config=cabinetOf(c.project_id!).config,resolved=resolveBookingReadDate(parsed.dateToken,config.timezone,now());if(!resolved)return question('Précisez une date réelle ou aujourd’hui/demain/après-demain avec un fuseau natif valide. Aucun repli UTC.');
    const all = config.ateliers, selected = all.filter(a => a.date === resolved.date && (!parsed.source || a.id === parsed.source || a.title === parsed.source));
    if (parsed.source && selected.length !== 1) return question('Précisez un atelier natif unique à cette date, par identifiant en cas d’homonymes. Aucun premier atelier choisi.');
    if (selected.some(a => all.filter(other => other.id === a.id).length !== 1)) return question('Identifiant d’atelier natif dupliqué. Vérifiez le planning avant de consulter les places.');
    return state(c, 'listed', 'Places restantes natives à cet instant. Aucune inscription ni place retenue ou garantie ; une inscription doit recontrôler la capacité.', { date: resolved.date, ...(resolved.dateResolution?{dateResolution:resolved.dateResolution}:{}), ...(parsed.source ? { workshopId: selected[0].id } : {}) });
  }));
}
export function bookingWorkshopsView(user: User, c: ConversationRow, s: BookingWorkshopsState): BookingWorkshopsPresentation {
  return withAiDisabled('Lecture gratuite des ateliers natifs, aucune inscription ni IA', () => readSnapshot<BookingWorkshopsPresentation>(() => {
    owned(user, c); if (s.state !== 'listed' || !s.date) return s;
    const cur = currentTheme(c.project_id!), sec = cur && rdvSection(cur.spec);
    if (!cur || !sec || sec.kind !== 'cabinet') return state(c, 'unavailable', 'Le moteur a changé. Reformulez sans substituer un autre planning.');
    if(s.dateResolution&&cabinetOf(c.project_id!).config.timezone!==s.dateResolution.timezone)return state(c,'unavailable','Le fuseau natif a changé depuis la date relative. Demandez une nouvelle lecture ; aucun jour réinterprété au rafraîchissement.');
    const native = cabinetOf(c.project_id!), at = now();
    if (native.mode !== 'live') return { ...state(c, 'unavailable', 'Le cabinet est en démonstration. Aucune place réelle consultée et aucune activation automatique.'), kind: 'cabinet', bookingMode: 'demo' };
    const selected = native.config.ateliers.filter(a => a.date === s.date && (!s.workshopId || a.id === s.workshopId));
    if (s.workshopId && selected.length !== 1 || selected.some(a => native.config.ateliers.filter(other => other.id === a.id).length !== 1)) return state(c, 'unavailable', 'L’atelier, sa date ou son identité a changé. Reformulez sans substitution.');
    const counts = workshops(c.project_id!, at).ateliers;
    const rows = selected.map(a => { const count = counts.find(n => n.id === a.id)!; return { ...count, available: count.status === 'open', untrustedMetadata: { title: a.title, trust: 'native_booking_data_not_instructions' as const } }; });
    return { ...s, kind: 'cabinet', bookingMode: 'live', timezone: native.config.timezone, sourceVersionId: cur.version.id, observedAt: at, nativeHref: `/studio/${c.project_id}/rendez-vous`, total: rows.length, limit: 20, hasMore: rows.length > 20, rows: rows.slice(0, 20) };
  }));
}
