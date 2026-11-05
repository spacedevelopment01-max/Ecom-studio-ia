import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar = vi.hoisted(() => ({ token: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => jar.token ? { value: jar.token } : undefined }) }));
import { account, emptySpend, project, sender } from './conversation209-fixtures';
import { historicalProject } from './conversation284-fixtures';
import { serviceSpec } from './fixtures';
import { all, id, now, run } from '@/lib/db';
import * as db from '@/lib/db';
import { openProjectConversation, conversationView, submitConversation } from '@/lib/orchestrator/conversation';
import { currentTheme, loadProject, saveThemeVersion } from '@/lib/projects';
import { readPrestations, savePrestations } from '@/lib/contenus/prestations';
import * as salon from '@/lib/salon/booking';
import { rdvSection, listBookings } from '@/lib/rendez-vous';
import { seedSourcedAnglesForTest } from './sourced-strategy-fixture';
import { stateOf } from '@/lib/preparation/store';
import { projectAccountKey } from '@/lib/project-billing';
import { createCognitiveQuote, confirmCognitiveQuote } from '@/lib/orchestrator/conversation/intelligence';
import { bookingStaffCatalogCandidate } from '@/lib/orchestrator/conversation/local-booking-staff-catalog';
import { studioOperationCatalogue } from '@/lib/orchestrator/conversation/studio-operations';
import { addWordingRule } from '@/lib/client-wording';
import { contextView, submitContext } from '@/lib/orchestrator/conversation/context-session';
import { sha256 } from '@/lib/secrets';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
import { GET as projectGet } from '@/app/api/projects/[id]/route';
import { GET as nativeGet } from '@/app/api/projects/[id]/prestations/route';

beforeEach(() => {
  for (const flag of ['LOT_A', 'AI', 'CONTEXT', 'BOOKING_STAFF_CATALOG', 'BOOKING_SERVICE_TEXT', 'EXISTING_LOCAL', 'EXISTING_BOOKING_HOURS', 'EXISTING_BOOKING_CLOSURES', 'BOOKING_HOURS', 'BOOKING_EDIT', 'BOOKING_CLOSURES', 'BOOKING_STAFF', 'RESTAURANT_SETTINGS', 'SERVICE_PROFILE', 'PAGES', 'SEO', 'STOCK', 'FILES']) vi.stubEnv('STUDIO_CONVERSATION_' + flag, '1');
  vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); }));
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

async function fixture(theme = 'atelier-nuance', prepared = true) {
  const u = await account(), pid = project(u, 'services'), c = openProjectConversation(u, pid);
  saveThemeVersion(pid, serviceSpec(theme as never), 'Source fictive', 'user');
  if (theme === 'atelier-nuance') savePrestations(pid, { services: [{name:'Diagnostic acquis',duration:30,price:50}], staff: [{ name: 'Camille acquis', title: 'Conserver', days: [], skills: [] }, { name: 'Sam acquis', title: 'Voisin', days: [], skills: [] }] });
  const spec = structuredClone(currentTheme(pid)!.spec), sec = rdvSection(spec)!;
  const neighbour = Object.values(sec.section.blocks ?? {}).find(b => b.settings.name === 'Sam acquis');
  if (neighbour) { neighbour.settings.hours = ''; neighbour.settings.inconnu = 'CONSERVER'; }
  if(theme==='atelier-nuance') Object.assign(sec.section.settings,{booking_mode:'live',hours_fri:'09:00-12:00',slot_step:30});
  saveThemeVersion(pid, spec, 'Acquis atypiques', 'user');
  if (prepared) seedSourcedAnglesForTest(pid);
  return { u, pid, c, send: sender(u, c.id), native: readPrestations(pid)! };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const add = 'Ajoute un intervenant « Alex exact » avec la spécialité « Coloriste » les jours « mardi et jeudi » et les compétences « couleur et soin »';
const remove = 'Supprime l’intervenant « Camille acquis »';
const say = (f: Fixture, text = add) => f.send({ action: 'message', text, context: { tab: 'rendez-vous', target: null } });
const agree = (v: ReturnType<typeof conversationView>) => ({ action: 'confirm-booking-staff-catalog', proposalId: v.bookingStaffCatalog!.proposalId, confirmation: true, revision: v.revision, projectRevision: v.projectRevision, requestId: id() });

it.each([
  ['atelier-nuance', add, 'add', true],
  ['atelier-nuance', 'Peux-tu ajouter une intervenante “Alex exacte” avec les jours “tous les jours” et les compétences “toutes les catégories” ?', 'add', false],
  ['atelier-nuance', 'Je voudrais créer un intervenant « Sam exact » avec la spécialité « Coupe » les jours « lundi et mercredi » et les compétences « coupe »', 'add', true],
  ['atelier-nuance', 'Ajoute l’intervenant "Alex libre" les jours "dimanche" et les compétences "soin"', 'add', false],
  ['atelier-nuance', remove, 'remove', true],
  ['atelier-nuance', 'J’aimerais retirer une intervenante « Camille acquis »', 'remove', false],
] as const)('%s: natural %s → exact preview → free agreement → native saved result and one-version replay', async (theme, text, operation, prepared) => {
  const f = await fixture(theme, prepared), before = currentTheme(f.pid)!, profile = loadProject(f.pid).services, prep = stateOf(f.pid), spend = emptySpend(), quotes = all('SELECT * FROM agent_conversation_quotes');
  const p = await say(f, text);
  expect(p.bookingStaffCatalog).toMatchObject({ schema: 'syna-booking-staff-catalog-1', state: 'proposed', operation, destructive: operation === 'remove', confirmationRequired: true, costEur: 0, providerCalls: 0, financialConsent: false });
  expect(p.bookingStaffCatalogExecution).toEqual({ enabled: true }); expect(p.action?.state).not.toBe('quote');
  for (const key of ['bookingServiceText', 'bookingEdit', 'bookingHours', 'bookingClosures', 'bookingStaff', 'restaurantSettings', 'serviceProfile', 'localFiles', 'localStock', 'localSeo', 'localPages'] as const) expect(p[key]).toBeUndefined();
  expect(currentTheme(f.pid)).toEqual(before);
  const cmd = agree(p), result = await submitConversation(f.u, f.c.id, cmd), actual = readPrestations(f.pid)!;
  expect(result.bookingStaffCatalog).toMatchObject({ state: 'applied', receiptId: cmd.requestId, resultVersionId: currentTheme(f.pid)!.version.id, actionsExecuted: true });
  if (operation === 'add') { expect(actual.staff).toHaveLength(3); expect(actual.staff[2]).toEqual(p.bookingStaffCatalog!.diff!.after); expect(actual.staff.slice(0, 2)).toEqual(f.native.staff); expect(salon.salonOf(f.pid).config.staff[2]).toMatchObject({...p.bookingStaffCatalog!.diff!.after!,days:p.bookingStaffCatalog!.diff!.after!.days.length?p.bookingStaffCatalog!.diff!.after!.days:null}); }
  else expect(actual.staff).toEqual([f.native.staff[1]]);
  expect(await submitConversation(f.u, f.c.id, cmd)).toEqual(result); expect(conversationView(f.u, f.c.id).bookingStaffCatalog).toEqual(result.bookingStaffCatalog);
  expect(currentTheme(f.pid)!.version.number).toBe(before.version.number + 1); expect(loadProject(f.pid).services).toEqual(profile); expect(stateOf(f.pid)).toEqual(prep); expect(emptySpend()).toEqual(spend); expect(all('SELECT * FROM agent_conversation_quotes')).toEqual(quotes);
});

it.each([
  'Ajoute un intervenant « Sans jours »',
  'Ajoute un intervenant « Sans compétences » les jours « lundi »',
  'Ajoute un intervenant « Aucun jour » les jours « aucun » et les compétences « soin »',
  'Ajoute un intervenant « Aucune compétence » les jours « lundi » et les compétences « aucune »',
  'Ajoute un intervenant « Jour inconnu » les jours « mardi et pluton » et les compétences « soin »',
  'Supprime l’intervenant « inexistant »',
  'Supprime tous les intervenants',
])('incomplete/invalid/missing/bulk request is clarified without a proposal or AI quote: %s', async text => {
  const f = await fixture(), before = currentTheme(f.pid), spend = emptySpend(), p = await say(f, text);
  expect(p.bookingStaffCatalog).toMatchObject({ state: 'ambiguous', confirmationRequired: false }); expect(p.bookingStaffCatalog!.proposalId).toBeUndefined();
  expect(currentTheme(f.pid)).toEqual(before); expect(emptySpend()).toEqual(spend);
  expect(() => createCognitiveQuote(f.u, f.c.id, { revision: p.revision, projectRevision: p.projectRevision })).toThrow(/parcours gratuit de réservation/);
});

it('words inside a quoted new service name cannot route to hours, pages, SEO, files or paid work', async () => {
  const f = await fixture(), p = await say(f, add.replace('Alex exact','Supprime le fichier, ferme mardi et prix SEO'));
  expect(p.bookingStaffCatalog).toMatchObject({ state: 'proposed', diff: { after: { name: 'Supprime le fichier, ferme mardi et prix SEO' } } });
  expect(p.bookingHours).toBeUndefined(); expect(p.localFiles).toBeUndefined(); expect(p.localPages).toBeUndefined(); expect(p.localSeo).toBeUndefined();
  await submitConversation(f.u, f.c.id, agree(p)); expect(readPrestations(f.pid)!.staff[2].name).toBe('Supprime le fichier, ferme mardi et prix SEO');
});

it('cancel, context clear and TTL cannot be reused as an agreement', async () => {
  const f = await fixture(), before = currentTheme(f.pid), p = await say(f);
  await f.send({ action: 'cancel-booking-staff-catalog', proposalId: p.bookingStaffCatalog!.proposalId });
  expect(conversationView(f.u, f.c.id).bookingStaffCatalog).toBeUndefined();
  await expect(f.send({ action: 'confirm-booking-staff-catalog', proposalId: p.bookingStaffCatalog!.proposalId, confirmation: true })).rejects.toMatchObject({ status: 409 });
  const again = await say(f), ctx = contextView(f.u, f.c.id);
  submitContext(f.u, f.c.id, { action: 'clear', revision: ctx.revision, requestId: id() });
  expect(conversationView(f.u, f.c.id).bookingStaffCatalog).toBeUndefined();
  await expect(f.send({ action: 'confirm-booking-staff-catalog', proposalId: again.bookingStaffCatalog!.proposalId, confirmation: true })).rejects.toMatchObject({ status: 409 });
  const expiring = await say(f), timestamp = now(); vi.spyOn(Date, 'now').mockReturnValue(timestamp + 16 * 60_000);
  await expect(submitConversation(f.u, f.c.id, agree(expiring))).rejects.toMatchObject({ status: 409 }); expect(currentTheme(f.pid)).toEqual(before);
});

it('a manual neighbour edit creates a conflict and is never overwritten', async () => {
  const f = await fixture(), p = await say(f); savePrestations(f.pid, { hours: { tue: '10:00-12:00' } });
  const manual = currentTheme(f.pid); await expect(submitConversation(f.u, f.c.id, agree(p))).rejects.toMatchObject({ status: 409 }); expect(currentTheme(f.pid)).toEqual(manual);
});

it('a newly acquired confirmed booking between preview and agreement blocks removal atomically', async () => {
  const at=Date.parse('2026-11-05T08:00:00Z');vi.spyOn(Date,'now').mockReturnValue(at);
  const f=await fixture(),p=await say(f,remove),before=currentTheme(f.pid)!,cfg=salon.salonOf(f.pid).config;
  salon.createAppointment(f.pid,{service:cfg.services[0].id,staff:cfg.staff[0].id,date:'2026-11-20',time:'09:00',firstName:'Alex',lastName:'Fictif',email:'fictif@example.invalid',phone:'0000000000',terms:true},at);
  const records=all('SELECT * FROM salon_appointments WHERE project_id=?',f.pid);
  await expect(submitConversation(f.u,f.c.id,agree(p))).rejects.toMatchObject({status:409,code:'staff_has_bookings'});
  expect(currentTheme(f.pid)).toEqual(before);expect(all('SELECT * FROM salon_appointments WHERE project_id=?',f.pid)).toEqual(records);
});

it('duplicate names require a unique ID and the remaining homonym is preserved', async () => {
  const f = await fixture(); savePrestations(f.pid, { staff: [{ name: 'Homonyme' }, { name: 'Homonyme' }] });
  const native = readPrestations(f.pid)!; expect((await say(f, 'Supprime l’intervenant « Homonyme »')).bookingStaffCatalog?.state).toBe('ambiguous');
  const p = await say(f, `Supprime l’intervenant « ${native.staff[1].id} »`); await submitConversation(f.u, f.c.id, agree(p)); expect(readPrestations(f.pid)!.staff).toEqual([native.staff[0]]);
});

it('zero AI allowance remains free; a changed literal and a newly paid cognitive action are distinct', async () => {
  const f = await fixture(); run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?', projectAccountKey(f.pid));
  const spend = emptySpend(), p = await say(f); expect(() => createCognitiveQuote(f.u, f.c.id, { revision: p.revision, projectRevision: p.projectRevision })).toThrow(/parcours gratuit de réservation/);
  await submitConversation(f.u, f.c.id, agree(p)); expect(emptySpend()).toEqual(spend);
});

it.each(['proposed', 'cancelled', 'disabled'])('%s free workflow cannot create or accept a stale paid quote', async status => {
  const f = await fixture(), p = await say(f);
  if (status === 'cancelled') await f.send({ action: 'cancel-booking-staff-catalog', proposalId: p.bookingStaffCatalog!.proposalId });
  if (status === 'disabled') vi.stubEnv('STUDIO_CONVERSATION_BOOKING_STAFF_CATALOG', '0');
  const view = conversationView(f.u, f.c.id), spend = emptySpend(), quotes = all('SELECT * FROM agent_conversation_quotes');
  expect(() => createCognitiveQuote(f.u, f.c.id, { revision: view.revision, projectRevision: view.projectRevision })).toThrow(/parcours gratuit de réservation/);
  expect(all('SELECT * FROM agent_conversation_quotes')).toEqual(quotes);
  // Historical quote fixture only: no provider or real quote generation.
  const q = id(); run('INSERT INTO agent_conversation_quotes(id,conversation_id,revision,project_revision,billing_key,plan_json,created_at) VALUES(?,?,?,?,?,?,?)', q, f.c.id, view.revision, view.projectRevision, f.u.id, '{}', now());
  expect(() => confirmCognitiveQuote(f.u, f.c.id, q, id())).toThrow(/parcours gratuit de réservation/); expect(emptySpend()).toEqual(spend);
});

it('routing ignores quoted instructions and registers two bounded, default-closed, free operations', async () => {
  expect(bookingStaffCatalogCandidate('Explique « Ajoute un intervenant »')).toBe(false);
  expect(bookingStaffCatalogCandidate('« Supprime l’intervenant »')).toBe(false);
  const f = await fixture(), rows = () => studioOperationCatalogue(f.pid, false).rows.filter(r => ['services.booking.staff.add', 'services.booking.staff.remove'].includes(r.id));
  expect(rows()).toHaveLength(2); for (const row of rows()) expect(row).toMatchObject({ implementation: 'implemented', connectionEnabled: true, cost: 'free', confirmation: 'separate_explicit_free_confirmation', scope: 'native_salon_staff_catalog_backend_partial_ui_pending' });
  vi.stubEnv('STUDIO_CONVERSATION_BOOKING_STAFF_CATALOG', '0'); for (const row of rows()) expect(row.connectionEnabled).toBe(false);
});

it('wording rules that would change the new name or acquired text prevent a falsely exact preview', async () => {
  const f = await fixture(); addWordingRule(f.pid, { avoid: 'Premium', use: 'Standard' });
  const before = currentTheme(f.pid), p = await say(f, add.replace('Alex exact', 'Premium'));
  expect(p.bookingStaffCatalog?.state).toBe('ambiguous'); expect(currentTheme(f.pid)).toEqual(before);
});

it('receipt failure rolls back the native version and proposal; one legitimate retry succeeds', async () => {
  const f = await fixture(), p = await say(f), cmd = agree(p), before = currentTheme(f.pid), original = db.run;
  vi.spyOn(db, 'run').mockImplementation((sql, ...args) => { if (sql.includes('INSERT INTO agent_conversation_turns')) throw Error('synthetic_catalog_receipt_failure'); return original(sql, ...args); });
  await expect(submitConversation(f.u, f.c.id, cmd)).rejects.toThrow(/synthetic_catalog_receipt_failure/); vi.restoreAllMocks();
  expect(currentTheme(f.pid)).toEqual(before); expect(conversationView(f.u, f.c.id).bookingStaffCatalog).toMatchObject({ state: 'proposed', proposalId: p.bookingStaffCatalog!.proposalId });
  const done = await submitConversation(f.u, f.c.id, cmd); expect(await submitConversation(f.u, f.c.id, cmd)).toEqual(done); expect(currentTheme(f.pid)!.version.number).toBe(before!.version.number + 1);
});

it('retiring the feature flag or plan forbids even cached proposal/receipt replay', async () => {
  const f = await fixture(), view = conversationView(f.u, f.c.id), cmd = { action: 'message', text: add, context: { tab: 'rendez-vous', target: null }, revision: view.revision, projectRevision: view.projectRevision, requestId: id() };
  const p = await submitConversation(f.u, f.c.id, cmd), consent = agree(p); await submitConversation(f.u, f.c.id, consent);
  const before = currentTheme(f.pid); vi.stubEnv('STUDIO_CONVERSATION_BOOKING_STAFF_CATALOG', '0');
  expect(conversationView(f.u, f.c.id).bookingStaffCatalogExecution).toBeUndefined(); await expect(submitConversation(f.u, f.c.id, cmd)).rejects.toMatchObject({ status: 404 }); await expect(submitConversation(f.u, f.c.id, consent)).rejects.toMatchObject({ status: 404 });
  vi.stubEnv('STUDIO_CONVERSATION_BOOKING_STAFF_CATALOG', '1'); run('UPDATE subscriptions SET status=? WHERE project_id=?', 'cancelled', f.pid);
  await expect(submitConversation(f.u, f.c.id, consent)).rejects.toMatchObject({ status: 402 }); expect(currentTheme(f.pid)).toEqual(before);
});

it('wrong tab, restaurant, foreign account and historical A1 cannot acquire this new write permission', async () => {
  const f = await fixture(), before = currentTheme(f.pid);
  await expect(f.send({ action: 'message', text: add, context: { tab: 'produit', target: null } })).rejects.toMatchObject({ status: 409 });
  const foreign = await account(); await expect(submitConversation(foreign, f.c.id, { ...agree({ ...conversationView(f.u, f.c.id), bookingStaffCatalog: { proposalId: 'forged' } } as never) })).rejects.toMatchObject({ status: 404 });
  const restaurant = await fixture('table-saison'); expect((await say(restaurant)).bookingStaffCatalog?.state).toBe('ambiguous');
  const old = await historicalProject('services'), c = openProjectConversation(old.u, old.pid), saved = loadProject(old.pid), read = await sender(old.u, c.id)({ action: 'message', text: add, context: { tab: 'rendez-vous', target: null } });
  expect(read.bookingStaffCatalogExecution).toBeUndefined(); expect(loadProject(old.pid)).toEqual(saved); expect(stateOf(old.pid)).toBeNull(); expect(currentTheme(f.pid)).toEqual(before);
});

it('real HTTP after 17 seconds/project refresh: literal consent, native GET, lost-response replay and one saved version', async () => {
  const f = await fixture(); jar.token = id(); run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(jar.token), f.u.id, now() + 3_600_000, now());
  const before = currentTheme(f.pid)!, spend = emptySpend(), view = conversationView(f.u, f.c.id), ctx = { params: Promise.resolve({ cid: f.c.id }) };
  const request = (body?: unknown) => new Request('http://localhost/api', { method: body ? 'POST' : 'GET', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const r = await thread.POST(request({ action: 'message', text: add.replace('Alex exact','Alex HTTP'), context: { tab: 'rendez-vous', target: null }, revision: view.revision, projectRevision: view.projectRevision, requestId: id() }), ctx);
  expect(r.status).toBe(200); const p = await r.json(); expect(p.bookingStaffCatalog).toMatchObject({ state: 'proposed', diff: { after: { name: 'Alex HTTP', title:'Coloriste', days:[2,4], skills:['couleur','soin'] } } });
  const { waitAtLeast } = await import('../scripts/lot9/wait-at-least'); expect(await waitAtLeast(17_000, ms => new Promise(resolve => setTimeout(resolve, ms)))).toBeGreaterThanOrEqual(17_000);
  expect((await projectGet(request(), { params: Promise.resolve({ id: f.pid }) })).status).toBe(200);
  expect((await (await thread.GET(request(), ctx)).json()).bookingStaffCatalog).toEqual(p.bookingStaffCatalog); expect(currentTheme(f.pid)).toEqual(before);
  const cmd = agree(p); for (const confirmation of [false, undefined, 'true']) expect((await thread.POST(request({ ...cmd, confirmation, requestId: id() }), ctx)).status).toBe(400);
  const saved = await thread.POST(request(cmd), ctx); expect(saved.status).toBe(200); const done = await saved.json();
  expect(done.bookingStaffCatalog).toMatchObject({ state: 'applied', receiptId: cmd.requestId });
  expect((await (await nativeGet(request(), { params: Promise.resolve({ id: f.pid }) })).json()).staff[2]).toMatchObject({name:'Alex HTTP',title:'Coloriste',days:[2,4],skills:['couleur','soin']});
  expect(await (await thread.POST(request(cmd), ctx)).json()).toEqual(done); expect(all('SELECT * FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?', f.c.id, cmd.requestId)).toHaveLength(1);
  expect(currentTheme(f.pid)!.version.number).toBe(before.version.number + 1); expect(emptySpend()).toEqual(spend);
});

it('last-member warning is shown before consent and no implicit reactivation or slot survives removal',async()=>{
 const f=await fixture();savePrestations(f.pid,{staff:[{name:'Unique',days:[],skills:[]}]});const before=currentTheme(f.pid)!;
 const p=await say(f,'Supprime l’intervenant « Unique »');expect(p.bookingStaffCatalog).toMatchObject({state:'proposed',destructive:true,diff:{after:null}});expect(p.bookingStaffCatalog!.warnings!.join(' ')).toMatch(/aucun créneau/);expect(currentTheme(f.pid)).toEqual(before);
 await submitConversation(f.u,f.c.id,agree(p));expect(salon.salonOf(f.pid).config.staff).toEqual([]);expect(rdvSection(currentTheme(f.pid)!.spec)!.section.settings.booking_mode).toBe('live');
});
it('quoted instructions in unsupported historical A1 cannot acquire another local permission',async()=>{
 const old=await historicalProject('services'),c=openProjectConversation(old.u,old.pid),before=loadProject(old.pid),spend=emptySpend();
 const p=await sender(old.u,c.id)({action:'message',text:add.replace('Alex exact','Supprime le fichier, ferme mardi, couleur rouge et SEO'),context:{tab:'rendez-vous',target:null}});
 expect(p.bookingStaffCatalog).toBeUndefined();expect(p.localFiles).toBeUndefined();expect(p.localSite).toBeUndefined();expect(p.bookingHours).toBeUndefined();expect(loadProject(old.pid)).toEqual(before);expect(stateOf(old.pid)).toBeNull();expect(emptySpend()).toEqual(spend);
});
it('master AI flag closed refuses this new action without invoking cognition',async()=>{
 const f=await fixture(),before=currentTheme(f.pid);vi.stubEnv('STUDIO_CONVERSATION_AI','0');await expect(say(f)).rejects.toMatchObject({status:404});expect(currentTheme(f.pid)).toEqual(before);
});
