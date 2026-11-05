/** One exact native bookable service added/removed, with a separate free agreement. */
import { outsideQuotes } from './outside-quotes';
import { HttpError, ownedProject, type User } from '../../auth';
import { id, now } from '../../db';
import { stableHash } from '../../brain/hash';
import { currentTheme, loadProject, previewThemeVersionSpec } from '../../projects';
import { prestationsInput, previewPrestations, savePrestations, type PrestationsInput } from '../../contenus/prestations';
import { rdvSection } from '../../rendez-vous';
import type { ThemeSpec } from '../../theme/spec';
import { requirePlan } from '../../plan-gates';
import { activeContextEnabled } from './active-context';
import type { ConversationRow, ConversationState } from './contract';

export const bookingServiceCatalogEnabled = () => activeContextEnabled() && process.env.STUDIO_CONVERSATION_BOOKING_SERVICE_CATALOG === '1';
function request(raw: string) {
  return raw.trim().replace(/[.!?]+$/u, '').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu, '').trim()
    .replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (ajouter|cr[ée]er|supprimer|retirer) /iu,
      (_, verb: string) => ({ ajouter: 'Ajoute', créer: 'Crée', creer: 'Crée', supprimer: 'Supprime', retirer: 'Retire' })[verb.toLowerCase()] + ' ');
}
const noun = '(?:(?:le|un) service|(?:la|une) prestation|(?:la|une) s[ée]ance) r[ée]servable';
export const bookingServiceCatalogCandidate = (raw: string) => {
  const text = outsideQuotes(request(raw));
  return new RegExp('^(?:ajoute|cr[ée]e|supprime|retire) ' + noun + '\\b', 'iu').test(text)
    || /^(?:supprime|retire) (?:tous les services|toutes les prestations|toutes les s[ée]ances) r[ée]servables\b/iu.test(text);
};

type Service = { id: string; name: string; short: string; durationMinutes: number | null; priceEur: number | null; priceFrom: boolean; category?: string; modes?: string };
type Operation = 'add' | 'remove';
export type BookingServiceCatalogProposal = {
  id: string; operation: Operation; input: PrestationsInput; before: Service | null; after: Service | null;
  sourceVersionId: string; sourceFingerprint: string; previewFingerprint: string; expiresAt: number;
};
export type BookingServiceCatalogPresentation = {
  schema: 'syna-booking-service-catalog-1'; state: 'ambiguous' | 'proposed' | 'applied'; projectId: string; nativeHref: string; message: string;
  kind?: 'salon' | 'cabinet'; operation?: Operation; destructive?: boolean; reversibleByVersionRestore?: true;
  diff?: { before: Service | null; after: Service | null; trust: 'native_booking_data_not_instructions' }; warnings?: string[];
  confirmationRequired: boolean; financialConsent: false; costEur: 0; providerCalls: 0; publication: false; actionsExecuted: boolean;
  proposalId?: string; sourceVersionId?: string; resultVersionId?: string; receiptId?: string;
};
const fp = (value: unknown) => stableHash('native-booking-service-catalog-1', value);
const present = (c: ConversationRow, state: BookingServiceCatalogPresentation['state'], message: string, extra: Partial<BookingServiceCatalogPresentation> = {}): BookingServiceCatalogPresentation => ({
  schema: 'syna-booking-service-catalog-1', state, projectId: c.project_id!, nativeHref: `/studio/${c.project_id}/rendez-vous`, message,
  confirmationRequired: false, financialConsent: false, costEur: 0, providerCalls: 0, publication: false, actionsExecuted: false, ...extra,
});
function source(user: User, c: ConversationRow, m: ConversationState) {
  if (!bookingServiceCatalogEnabled()) throw new HttpError(404, 'Ajout et retrait des prestations réservables indisponibles.');
  if (!c.project_id || c.user_id !== user.id) throw new HttpError(404, 'Projet introuvable.');
  ownedProject(user, c.project_id); requirePlan(user, c.project_id);
  if (loadProject(c.project_id).business !== 'services' || m.activeContextTab !== 'rendez-vous') throw new HttpError(409, 'Ouvrez Rendez-vous. Les prestations réservables sont distinctes du profil d’activité.');
  const cur = currentTheme(c.project_id), sec = cur && rdvSection(cur.spec);
  if (!cur || !sec) throw new HttpError(409, 'Aucune réservation native disponible.');
  return { cur, kind: sec.kind };
}
function services(spec: ThemeSpec): Service[] {
  const sec = rdvSection(spec); if (!sec || sec.kind === 'restaurant') return [];
  const blocks = sec.section.blocks ?? {}, number = (v: unknown) => v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v);
  return (sec.section.block_order ?? Object.keys(blocks)).map(k => blocks[k]).filter(b => b?.type === (sec.kind === 'salon' ? 'service' : 'seance')).map(b => {
    const st = b.settings;
    return { id: String(st[sec.kind === 'salon' ? 'service_id' : 'seance_id'] ?? ''), name: String(st.name ?? ''), short: String(st.short ?? ''), durationMinutes: number(st.duration), priceEur: number(st.price), priceFrom: sec.kind === 'salon' && !!st.price_from,
      ...(sec.kind === 'salon' ? { category: String(st.category ?? 'coupe') } : { modes: String(st.modes ?? 'cabinet') }) };
  });
}
function parse(raw: string) {
  const text = request(raw), quoted = '(?:«([^»\\r\\n]+)»|“([^”\\r\\n]+)”|"([^"\\r\\n]+)")';
  const remove = new RegExp('^(?:supprime|retire) ' + noun + ' ' + quoted + '$', 'iu').exec(text);
  if (remove) return { operation: 'remove' as const, source: (remove[1] ?? remove[2] ?? remove[3]).trim() };
  const add = new RegExp('^(?:ajoute|cr[ée]e) ' + noun + ' ' + quoted + ' de (\\d{1,3}) (?:minutes?|min) [àa] (partir de )?(\\d{1,6}(?:[.,]\\d{1,2})?)\\s*(?:€|euros?) (?:cat[ée]gorie ' + quoted + '|en (cabinet et visio|cabinet|visio))$', 'iu').exec(text);
  if (!add) return null;
  return { operation: 'add' as const, name: (add[1] ?? add[2] ?? add[3]).trim(), duration: Number(add[4]), priceFrom: !!add[5], price: Number(add[6].replace(',', '.')),
    category: (add[7] ?? add[8] ?? add[9])?.trim().toLowerCase(), modes: add[10]?.toLowerCase().replace(' et ', ',') };
}
function fields(p: BookingServiceCatalogProposal) {
  return { operation: p.operation, destructive: p.operation === 'remove', reversibleByVersionRestore: true as const,
    diff: { before: p.before, after: p.after, trust: 'native_booking_data_not_instructions' as const }, proposalId: p.id, sourceVersionId: p.sourceVersionId };
}
export function proposeBookingServiceCatalog(user: User, c: ConversationRow, m: ConversationState, raw: string): BookingServiceCatalogPresentation {
  delete m.bookingServiceCatalogProposal;
  const { cur, kind } = source(user, c, m), parsed = parse(raw), question = (message: string) => present(c, 'ambiguous', message);
  if (kind === 'restaurant') return question('Le restaurant n’a pas de prestations salon/cabinet. Aucun service restaurant, article de carte ou profil substitué.');
  if (!parsed) return question('Précisez le nom, la durée, le prix et la catégorie salon ou le mode cabinet. Exemple : Ajoute le service réservable « Soin » de 45 minutes à 65 € catégorie « soin ». Cabinet : Ajoute une séance réservable « Séance » de 50 minutes à 60 € en cabinet. Retrait : Supprime le service réservable « nom ou ID exact ».');
  let input: unknown, before: Service | null = null;
  if (parsed.operation === 'remove') {
    const matches = services(cur.spec).filter(s => s.id === parsed.source || s.name === parsed.source);
    if (matches.length !== 1 || !matches[0].id) return question(matches.length ? 'Plusieurs prestations correspondent. Donnez un identifiant natif unique.' : 'Aucune prestation native exacte. Aucun autre service substitué.');
    before = matches[0]; input = { serviceRemove: { id: before.id } };
  } else {
    if (kind === 'salon' && (!parsed.category || parsed.modes) || kind === 'cabinet' && (!parsed.modes || parsed.category || parsed.priceFrom)) return question('Indiquez une catégorie salon (coupe, couleur, coiffage ou soin), ou un mode cabinet (cabinet, visio, cabinet et visio), selon le site natif. Aucun réglage inventé.');
    input = { serviceAdd: { name: parsed.name, duration: parsed.duration, price: parsed.price, priceFrom: parsed.priceFrom, ...(kind === 'salon' ? { category: parsed.category } : { modes: parsed.modes }) } };
  }
  const checked = prestationsInput.safeParse(input);
  if (!checked.success) return question('Valeurs natives invalides : nom de 1 à 80 caractères, durée de 5 à 600 minutes, prix de 0 à 100 000 €, catégorie ou mode explicite.');
  if (fp(previewThemeVersionSpec(c.project_id!, cur.spec)) !== fp(cur.spec)) return question('Une consigne de vocabulaire modifierait des textes acquis. Vérifiez-la d’abord dans le parcours natif.');
  let preview: ReturnType<typeof previewPrestations>;
  try { preview = previewPrestations(c.project_id!, checked.data); }
  catch (error) { if (error instanceof HttpError && error.status === 409) return question(error.message); throw error; }
  const existingIds = new Set(services(cur.spec).map(s => s.id)), added = services(preview.spec).filter(s => !existingIds.has(s.id));
  const after = parsed.operation === 'add' && added.length === 1 ? added[0] : null;
  if (parsed.operation === 'add' && (!after || after.name !== checked.data.serviceAdd!.name)) return question('Le nouvel aperçu natif ne correspond pas au texte exact demandé. Aucun accord proposé.');
  const p: BookingServiceCatalogProposal = { id: id(), operation: parsed.operation, input: checked.data, before, after, sourceVersionId: cur.version.id, sourceFingerprint: fp(cur.spec), previewFingerprint: fp(preview.spec), expiresAt: now() + 15 * 60_000 };
  m.bookingServiceCatalogProposal = p;
  return present(c, 'proposed', 'Vérifiez la prestation exacte avant/après. Seul cet ajout ou retrait natif sera enregistré après votre accord gratuit.', { ...fields(p), kind, confirmationRequired: true,
    warnings: parsed.operation === 'remove' ? ['Les textes et liens acquis qui présentent cette prestation restent en place. Les rendez-vous historiques sont conservés ; tout rendez-vous confirmé du jour local ou ultérieur bloque le retrait.'] : ['Une nouvelle identité native est créée. Aucun profil, service voisin ou rendez-vous existant modifié. Aucun créneau ou service réel activé.'] });
}
export function confirmBookingServiceCatalog(user: User, c: ConversationRow, m: ConversationState, proposalId: string, requestId: string): BookingServiceCatalogPresentation {
  const { cur, kind } = source(user, c, m), p = m.bookingServiceCatalogProposal;
  if (!p || p.id !== proposalId || p.expiresAt < now() || kind === 'restaurant' || cur.version.id !== p.sourceVersionId || fp(cur.spec) !== p.sourceFingerprint) throw new HttpError(409, 'La prestation ou la proposition a changé. Relisez avant un nouvel accord.');
  // Rechecks bookings at agreement time; a newly acquired booking must forbid removal.
  const preview = previewPrestations(c.project_id!, p.input);
  if (fp(preview.spec) !== p.previewFingerprint) throw new HttpError(409, 'L’aperçu natif a changé. Aucune écriture.');
  const saved = savePrestations(c.project_id!, p.input), after = currentTheme(c.project_id!);
  if (!after || after.version.id !== saved.versionId || fp(after.spec) !== p.previewFingerprint) throw new HttpError(409, 'Résultat natif non confirmé.');
  delete m.bookingServiceCatalogProposal;
  return present(c, 'applied', 'Prestation enregistrée et relue dans une version native. Voisins, profil et rendez-vous acquis conservés ; aucune publication ou dépense.', { ...fields(p), kind, resultVersionId: saved.versionId, receiptId: requestId, actionsExecuted: true });
}
