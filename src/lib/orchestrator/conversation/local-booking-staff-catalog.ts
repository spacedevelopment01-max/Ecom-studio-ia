/** One exact native bookable service added/removed, with a separate free agreement. */
import { outsideQuotes } from './outside-quotes';
import { HttpError, ownedProject, type User } from '../../auth';
import { id, now } from '../../db';
import { stableHash } from '../../brain/hash';
import { currentTheme, loadProject, previewThemeVersionSpec } from '../../projects';
import { prestationsInput, previewPrestations, savePrestations, type PrestationsInput } from '../../contenus/prestations';
import { rdvSection } from '../../rendez-vous';
import { parseBookingStaffSet } from './local-booking-staff';
import type { ThemeSpec } from '../../theme/spec';
import { requirePlan } from '../../plan-gates';
import { activeContextEnabled } from './active-context';
import type { ConversationRow, ConversationState } from './contract';

export const bookingStaffCatalogEnabled = () => activeContextEnabled() && process.env.STUDIO_CONVERSATION_BOOKING_STAFF_CATALOG === '1';
function request(raw: string) {
  return raw.trim().replace(/[.!?]+$/u, '').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu, '').trim()
    .replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (ajouter|cr[ée]er|supprimer|retirer) /iu,
      (_, verb: string) => ({ ajouter: 'Ajoute', créer: 'Crée', creer: 'Crée', supprimer: 'Supprime', retirer: 'Retire' })[verb.toLowerCase()] + ' ');
}
const noun = "(?:l[’']intervenant(?:e)?|un(?:e)? intervenant(?:e)?)";
export const bookingStaffCatalogCandidate = (raw: string) => {
  const text = outsideQuotes(request(raw));
  return new RegExp('^(?:ajoute|cr[ée]e|supprime|retire) ' + noun + '\\b', 'iu').test(text)
    || /^(?:supprime|retire) (?:tous les intervenants|toutes les intervenantes)\b/iu.test(text);
};

type Staff = { id: string; name: string; title: string; skills: string[]; days: number[] };
type Operation = 'add' | 'remove';
export type BookingStaffCatalogProposal = {
  id: string; operation: Operation; input: PrestationsInput; before: Staff | null; after: Staff | null;
  sourceVersionId: string; sourceFingerprint: string; previewFingerprint: string; expiresAt: number;
};
export type BookingStaffCatalogPresentation = {
  schema: 'syna-booking-staff-catalog-1'; state: 'ambiguous' | 'proposed' | 'applied'; projectId: string; nativeHref: string; message: string;
  kind?: 'salon'; operation?: Operation; destructive?: boolean;
  diff?: { before: Staff | null; after: Staff | null; trust: 'native_booking_data_not_instructions' }; warnings?: string[];
  confirmationRequired: boolean; financialConsent: false; costEur: 0; providerCalls: 0; publication: false; actionsExecuted: boolean;
  proposalId?: string; sourceVersionId?: string; resultVersionId?: string; receiptId?: string;
};
const fp = (value: unknown) => stableHash('native-booking-staff-catalog-1', value);
const present = (c: ConversationRow, state: BookingStaffCatalogPresentation['state'], message: string, extra: Partial<BookingStaffCatalogPresentation> = {}): BookingStaffCatalogPresentation => ({
  schema: 'syna-booking-staff-catalog-1', state, projectId: c.project_id!, nativeHref: `/studio/${c.project_id}/rendez-vous`, message,
  confirmationRequired: false, financialConsent: false, costEur: 0, providerCalls: 0, publication: false, actionsExecuted: false, ...extra,
});
function source(user: User, c: ConversationRow, m: ConversationState) {
  if (!bookingStaffCatalogEnabled()) throw new HttpError(404, 'Ajout et retrait des intervenants indisponibles.');
  if (!c.project_id || c.user_id !== user.id) throw new HttpError(404, 'Projet introuvable.');
  ownedProject(user, c.project_id); requirePlan(user, c.project_id);
  if (loadProject(c.project_id).business !== 'services' || m.activeContextTab !== 'rendez-vous') throw new HttpError(409, 'Ouvrez Rendez-vous. Les intervenants réservables sont distincts du profil d’activité.');
  const cur = currentTheme(c.project_id), sec = cur && rdvSection(cur.spec);
  if (!cur || !sec) throw new HttpError(409, 'Aucune réservation native disponible.');
  return { cur, kind: sec.kind };
}
function members(spec: ThemeSpec): Staff[] {
  const sec = rdvSection(spec); if (sec?.kind !== 'salon') return [];
  const blocks = sec.section.blocks ?? {};
  return (sec.section.block_order ?? Object.keys(blocks)).map(k => blocks[k]).filter(b => b?.type === 'member').map(b => {
    const st = b.settings;
    return { id: String(st.member_id ?? ''), name: String(st.name ?? ''), title: String(st.title ?? ''),
      skills: String(st.skills ?? '').split(',').map(s => s.trim()).filter(Boolean), days: String(st.days ?? '').split(',').map(s => s.trim()).filter(Boolean).map(Number) };
  });
}
function parse(raw: string) {
  const text = request(raw), quoted = '(?:«([^»\\r\\n]+)»|“([^”\\r\\n]+)”|"([^"\\r\\n]+)")';
  const remove = new RegExp('^(?:supprime|retire) ' + noun + ' ' + quoted + '$', 'iu').exec(text);
  if (remove) return { operation: 'remove' as const, source: (remove[1] ?? remove[2] ?? remove[3]).trim() };
  const add = new RegExp('^(?:ajoute|cr[ée]e) ' + noun + ' ' + quoted + '(?: avec la sp[ée]cialit[ée] ' + quoted + ')?(?:,)? (?:avec )?les jours ' + quoted + '(?:,)? et les comp[ée]tences ' + quoted + '$', 'iu').exec(text);
  if (!add) return null;
  const days = parseBookingStaffSet('days', add[7] ?? add[8] ?? add[9]), skills = parseBookingStaffSet('skills', add[10] ?? add[11] ?? add[12]);
  if (days === null || skills === null) return null;
  return { operation: 'add' as const, name: (add[1] ?? add[2] ?? add[3]).trim(), title: (add[4] ?? add[5] ?? add[6] ?? '').trim(),
    days: days.split(',').filter(Boolean).map(Number), skills: skills.split(',').filter(Boolean) };
}
function fields(p: BookingStaffCatalogProposal) {
  return { operation: p.operation, destructive: p.operation === 'remove',
    diff: { before: p.before, after: p.after, trust: 'native_booking_data_not_instructions' as const }, proposalId: p.id, sourceVersionId: p.sourceVersionId };
}
export function proposeBookingStaffCatalog(user: User, c: ConversationRow, m: ConversationState, raw: string): BookingStaffCatalogPresentation {
  delete m.bookingStaffCatalogProposal;
  const { cur, kind } = source(user, c, m), parsed = parse(raw), question = (message: string) => present(c, 'ambiguous', message);
  if (kind !== 'salon') return question('Ce site ne comporte pas d’intervenants salon natifs. Aucun cabinet, restaurant ou compte utilisateur substitué.');
  if (!parsed) return question('Précisez le nom et explicitement les jours et compétences. Exemple : Ajoute un intervenant « Alex » avec la spécialité « Coloriste » les jours « mardi et jeudi » et les compétences « couleur et soin ». Sans spécialité : Ajoute une intervenante « Sam » les jours « tous les jours » et les compétences « toutes les catégories ». « Aucun » ne signifie pas « tous ». Retrait : Supprime l’intervenant « nom ou ID exact ».');
  let input: unknown, before: Staff | null = null;
  if (parsed.operation === 'remove') {
    const matches = members(cur.spec).filter(s => s.id === parsed.source || s.name === parsed.source);
    if (matches.length !== 1 || !matches[0].id) return question(matches.length ? 'Plusieurs intervenants correspondent. Donnez un identifiant natif unique.' : 'Aucun intervenant natif exact. Aucun autre membre substitué.');
    before = matches[0]; input = { staffRemove: { id: before.id } };
  } else input = { staffAdd: { name: parsed.name, title: parsed.title, days: parsed.days, skills: parsed.skills } };
  const checked = prestationsInput.safeParse(input);
  if (!checked.success) return question('Valeurs natives invalides : nom de 1 à 60 caractères, spécialité de 0 à 80 caractères, jours et catégories explicites.');
  if (fp(previewThemeVersionSpec(c.project_id!, cur.spec)) !== fp(cur.spec)) return question('Une consigne de vocabulaire modifierait des textes acquis. Vérifiez-la d’abord dans le parcours natif.');
  let preview: ReturnType<typeof previewPrestations>;
  try { preview = previewPrestations(c.project_id!, checked.data); }
  catch (error) { if (error instanceof HttpError && error.status === 409) return question(error.message); throw error; }
  const existingIds = new Set(members(cur.spec).map(s => s.id)), added = members(preview.spec).filter(s => !existingIds.has(s.id));
  const after = parsed.operation === 'add' && added.length === 1 ? added[0] : null;
  if (parsed.operation === 'add' && (!after || fp({...after,id:undefined}) !== fp({...checked.data.staffAdd!,id:undefined}))) return question('Le nouvel aperçu natif ne correspond pas au texte exact demandé. Aucun accord proposé.');
  const p: BookingStaffCatalogProposal = { id: id(), operation: parsed.operation, input: checked.data, before, after, sourceVersionId: cur.version.id, sourceFingerprint: fp(cur.spec), previewFingerprint: fp(preview.spec), expiresAt: now() + 15 * 60_000 };
  m.bookingStaffCatalogProposal = p;
  return present(c, 'proposed', 'Vérifiez l’intervenant exact avant/après. Seul cet ajout ou retrait natif sera enregistré après votre accord gratuit.', { ...fields(p), kind, confirmationRequired: true,
    warnings: [...preview.warnings, ...(parsed.operation === 'remove' ? ['Les rendez-vous historiques sont conservés. Tout rendez-vous confirmé du jour local ou ultérieur bloque le retrait ; aucune annulation ou réattribution implicite.'] : ['Une nouvelle identité native est créée. Aucun voisin ou rendez-vous acquis modifié. « Tous les jours » et « toutes les catégories » autorisent ces valeurs selon les horaires du salon. Aucun créneau garanti ni activation.'])] });
}
export function confirmBookingStaffCatalog(user: User, c: ConversationRow, m: ConversationState, proposalId: string, requestId: string): BookingStaffCatalogPresentation {
  const { cur, kind } = source(user, c, m), p = m.bookingStaffCatalogProposal;
  if (!p || p.id !== proposalId || p.expiresAt < now() || kind !== 'salon' || cur.version.id !== p.sourceVersionId || fp(cur.spec) !== p.sourceFingerprint) throw new HttpError(409, 'L’intervenant ou la proposition a changé. Relisez avant un nouvel accord.');
  // Rechecks bookings at agreement time; a newly acquired booking must forbid removal.
  const preview = previewPrestations(c.project_id!, p.input);
  if (fp(preview.spec) !== p.previewFingerprint) throw new HttpError(409, 'L’aperçu natif a changé. Aucune écriture.');
  const saved = savePrestations(c.project_id!, p.input), after = currentTheme(c.project_id!);
  if (!after || after.version.id !== saved.versionId || fp(after.spec) !== p.previewFingerprint) throw new HttpError(409, 'Résultat natif non confirmé.');
  delete m.bookingStaffCatalogProposal;
  return present(c, 'applied', 'Intervenant enregistré et relu dans une version native. Voisins, profil et rendez-vous acquis conservés ; aucune publication ou dépense.', { ...fields(p), kind, resultVersionId: saved.versionId, receiptId: requestId, actionsExecuted: true });
}
