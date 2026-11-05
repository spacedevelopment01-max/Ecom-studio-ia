import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar = vi.hoisted(() => ({ token: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => jar.token ? { value: jar.token } : undefined }) }));
import { account, project, sender, emptySpend } from './conversation209-fixtures';
import { businessFingerprints, historicalProject } from './conversation284-fixtures';
import { serviceSpec } from './fixtures';
import { all, id, now, run } from '@/lib/db';
import { currentTheme, loadProject, saveThemeVersion } from '@/lib/projects';
import { listBookings, rdvSection } from '@/lib/rendez-vous';
import { cabinetOf, workshops } from '@/lib/cabinet/booking';
import { openProjectConversation, conversationView, submitConversation } from '@/lib/orchestrator/conversation';
import { createCognitiveQuote, confirmCognitiveQuote } from '@/lib/orchestrator/conversation/intelligence';
import { bookingWorkshopsCandidate } from '@/lib/orchestrator/conversation/local-booking-workshops';
import { studioOperationCatalogue } from '@/lib/orchestrator/conversation/studio-operations';
import { seedSourcedAnglesForTest } from './sourced-strategy-fixture';
import { stateOf } from '@/lib/preparation/store';
import { sha256 } from '@/lib/secrets';
import * as thread from '@/app/api/studio-agent/conversations/[cid]/route';
import { GET as projectGet } from '@/app/api/projects/[id]/route';

const at = Date.parse('2026-11-05T08:00:00Z'), date = '2026-11-10';
beforeEach(() => { for (const f of ['LOT_A', 'AI', 'CONTEXT', 'BOOKING_WORKSHOPS', 'BOOKING_AVAILABILITY', 'BOOKING_RECORDS', 'BOOKING_HOURS', 'FILES', 'STOCK', 'SEO']) vi.stubEnv('STUDIO_CONVERSATION_' + f, '1'); vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); })); vi.spyOn(Date, 'now').mockReturnValue(at); });
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
async function fixture(prepared = true, live = true) {
  const u = await account(), pid = project(u, 'services'), c = openProjectConversation(u, pid), spec = serviceSpec('parenthese'), sec = rdvSection(spec)!.section;
  sec.blocks = {}; sec.block_order = [];
  for (const [key, title, time, capacity] of [['atelier-a', 'Pause fictive', '10:00', 2], ['atelier-b', 'Voisin fictif', '14:00', 3]] as const) {
    sec.blocks[key] = { type: 'atelier', settings: { atelier_id: key, title, date, time, duration: 60, price: 25, capacity, booked: 500 } }; sec.block_order.push(key);
  }
  Object.assign(sec.settings, { booking_mode: live ? 'live' : 'demo', timezone: 'Europe/Paris' });
  saveThemeVersion(pid, spec, 'Ateliers fictifs', 'user'); listBookings(pid, 'cabinet', date, date); if (prepared) seedSourcedAnglesForTest(pid);
  return { u, pid, c, send: sender(u, c.id) };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const phrase = `Montre les places disponibles de l’atelier « Pause fictive » le ${date}`;
const say = (f: Fixture, text = phrase) => f.send({ action: 'message', text, context: { tab: 'rendez-vous', target: null } });
function seed(f: Fixture, service = 'atelier-a', kind = 'atelier', status = 'confirmed') {
  const row: Record<string, unknown> = { id: id(), project_id: f.pid, number: 'FICTIF-' + id(), status, kind, service, service_name: 'Nom acquis', modality: kind === 'seance' ? 'cabinet' : '', date, start_min: 600, end_min: 660, price: 25, first_name: 'CONTACT_PRIVE', last_name: 'Fictif', email: 'SECRET_EMAIL@example.invalid', phone: 'SECRET_PHONE', note: 'NOTE_PRIVEE', personal_note: 'NOTE_SANTE', created_at: now(), updated_at: now() };
  const keys = Object.keys(row); run(`INSERT INTO cabinet_appointments(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, ...keys.map(k => row[k])); run('INSERT INTO cabinet_tokens(hash,project_id,appt_id,expires_at,created_at) VALUES(?,?,?,?,?)', 'SECRET_TOKEN-' + id(), f.pid, row.id, now() + 3_600_000, now()); return row.id;
}

it.each([false, true])('exact native workshop read, prepared=%s: correct remaining count, native target and no business changes', async prepared => {
  const f = await fixture(prepared); seed(f); seed(f, 'atelier-a', 'atelier', 'canceled'); seed(f, 'atelier-a', 'seance'); seed(f, 'atelier-b');
  const fp = businessFingerprints(), p = await say(f), native = workshops(f.pid, at).ateliers.find(a => a.id === 'atelier-a')!;
  expect(p.bookingWorkshops).toMatchObject({ schema: 'syna-booking-workshops-read-1', state: 'listed', workshopId: 'atelier-a', date, kind: 'cabinet', bookingMode: 'live', timezone: 'Europe/Paris', observedAt: at, total: 1, readOnly: true, confirmationRequired: false, providerCalls: 0, costEur: 0, actionsExecuted: false, rows: [{ ...native, remaining: 1, status: 'unavailable', reason: 'professional_busy', available: false, untrustedMetadata: { title: 'Pause fictive', trust: 'native_booking_data_not_instructions' } }] });
  expect(p.bookingWorkshopsRead).toEqual({ enabled: true }); expect(p.action?.state).not.toBe('quote'); expect(p.bookingAvailability).toBeUndefined();
  for (const secret of ['CONTACT_PRIVE', 'SECRET_EMAIL', 'SECRET_PHONE', 'NOTE_PRIVEE', 'NOTE_SANTE', 'SECRET_TOKEN']) expect(JSON.stringify(p)).not.toContain(secret);
  expect(cabinetOf(f.pid).config.ateliers.every(a => a.booked === 0)).toBe(true); expect(businessFingerprints()).toEqual(fp);
});

it.each(['Montre les ateliers disponibles', 'Liste les ateliers du cabinet', 'Peux-tu me montrer les ateliers disponibles', 'Je voudrais voir les ateliers disponibles', 'Montre-moi les ateliers disponibles'])('natural date list returns only native workshops at that date: %s', async prefix => {
  const f = await fixture(), p = await say(f, prefix + ' le ' + date); expect(p.bookingWorkshops).toMatchObject({ state: 'listed', total: 2 }); expect(p.bookingWorkshops!.rows!.map(a => a.id)).toEqual(['atelier-a', 'atelier-b']);
});

it('GET rereads full capacity and then a manual cancellation releases a place, without storing customer data', async () => {
  const f = await fixture(); await say(f); seed(f); const second = seed(f);
  expect(conversationView(f.u, f.c.id).bookingWorkshops!.rows![0]).toMatchObject({ remaining: 0, status: 'full', available: false });
  run("UPDATE cabinet_appointments SET status='canceled' WHERE id=?", second); const fp = businessFingerprints();
  expect(conversationView(f.u, f.c.id).bookingWorkshops!.rows![0]).toMatchObject({ remaining: 1, status: 'open', available: true }); expect(businessFingerprints()).toEqual(fp);
});

it('unknown capacity stays null/invalid, never zero or an invented number of places', async () => {
  const f = await fixture(), spec = structuredClone(currentTheme(f.pid)!.spec); rdvSection(spec)!.section.blocks!['atelier-a'].settings.capacity = ''; saveThemeVersion(f.pid, spec, 'Capacité non renseignée', 'user');
  const p = await say(f); expect(p.bookingWorkshops!.rows![0]).toMatchObject({ capacity: null, remaining: null, status: 'invalid', available: false });
});

it('large native workshop lists disclose truncation; an exact omitted ID can still be read alone', async () => {
  const f = await fixture(), spec = structuredClone(currentTheme(f.pid)!.spec), sec = rdvSection(spec)!.section;
  for (let n = 2; n <= 20; n++) { const key = 'extra-' + n; sec.blocks![key] = { type: 'atelier', settings: { atelier_id: key, title: 'Atelier fictif ' + n, date, time: '16:00', duration: 60, price: 25, capacity: 3 } }; sec.block_order!.push(key); }
  saveThemeVersion(f.pid, spec, 'Liste dense fictive', 'user'); const fp = businessFingerprints(), p = await say(f, 'Montre les ateliers disponibles le ' + date);
  expect(p.bookingWorkshops).toMatchObject({ state: 'listed', total: 21, limit: 20, hasMore: true }); expect(p.bookingWorkshops!.rows).toHaveLength(20);
  const exact = await say(f, phrase.replace('Pause fictive', 'extra-20')); expect(exact.bookingWorkshops).toMatchObject({ state: 'listed', total: 1, hasMore: false, rows: [{ id: 'extra-20', remaining: 3 }] }); expect(businessFingerprints()).toEqual(fp);
});

it.each(['Montre les ateliers disponibles la semaine prochaine', 'Montre les ateliers disponibles le 2026-02-31', `Montre les places disponibles de l’atelier « absent » le ${date}`, `Montre les places disponibles de l’atelier « Pause fictive » le ${date} puis réserve`])('invalid, absent, ambiguous-relative or chained read clarifies without an inscription: %s', async text => {
  const f = await fixture(), fp = businessFingerprints(), p = await say(f, text); expect(p.bookingWorkshops?.state).toBe('ambiguous'); expect(p.bookingWorkshops!.rows).toBeUndefined(); expect(businessFingerprints()).toEqual(fp);
});

it('homonyms require a unique ID and duplicate IDs across dates never select a first native workshop', async () => {
  const f = await fixture(), spec = structuredClone(currentTheme(f.pid)!.spec), sec = rdvSection(spec)!.section; sec.blocks!['atelier-b'].settings.title = 'Pause fictive'; saveThemeVersion(f.pid, spec, 'Homonymes acquis', 'user');
  expect((await say(f)).bookingWorkshops?.state).toBe('ambiguous'); const p = await say(f, phrase.replace('Pause fictive', 'atelier-b')); expect(p.bookingWorkshops).toMatchObject({ state: 'listed', workshopId: 'atelier-b' });
  const ambiguous = structuredClone(currentTheme(f.pid)!.spec), a = rdvSection(ambiguous)!.section; a.blocks!.duplicate = structuredClone(a.blocks!['atelier-a']); a.blocks!.duplicate.settings.date = '2026-11-11'; a.block_order!.push('duplicate'); saveThemeVersion(f.pid, ambiguous, 'ID ambigu acquis', 'user');
  expect((await say(f, `Montre les ateliers disponibles le ${date}`)).bookingWorkshops?.state).toBe('ambiguous');
});

it('named workshop removal/date change, native engine change and demo mode discard stale places on GET', async () => {
  const f = await fixture(); await say(f); const spec = structuredClone(currentTheme(f.pid)!.spec); rdvSection(spec)!.section.blocks!['atelier-a'].settings.date = '2026-11-11'; saveThemeVersion(f.pid, spec, 'Date manuelle', 'user');
  expect(conversationView(f.u, f.c.id).bookingWorkshops?.state).toBe('unavailable');
  saveThemeVersion(f.pid, serviceSpec('atelier-nuance'), 'Moteur manuel', 'user'); expect(conversationView(f.u, f.c.id).bookingWorkshops?.state).toBe('unavailable');
  const demo = await fixture(true, false), before = currentTheme(demo.pid); expect((await say(demo)).bookingWorkshops).toMatchObject({ state: 'unavailable', bookingMode: 'demo' }); expect(currentTheme(demo.pid)).toEqual(before);
});

it('quoted action words stay workshop-title data and do not route to file, hours or cognitive operations', async () => {
  const f = await fixture(), spec = structuredClone(currentTheme(f.pid)!.spec); rdvSection(spec)!.section.blocks!['atelier-a'].settings.title = 'stock ferme mardi et fichier'; saveThemeVersion(f.pid, spec, 'Titre exact', 'user');
  const p = await say(f, phrase.replace('Pause fictive', 'stock ferme mardi et fichier')); expect(p.bookingWorkshops?.state).toBe('listed'); expect(p.localStock).toBeUndefined(); expect(p.localFiles).toBeUndefined(); expect(p.bookingHours).toBeUndefined(); expect(bookingWorkshopsCandidate('Explique « Montre les ateliers disponibles »')).toBe(false);
});

it.each(['listed', 'ambiguous', 'disabled'])('%s free workshop read cannot create or accept a paid quote', async status => {
  const f = await fixture(), p = await say(f, status === 'ambiguous' ? 'Montre les ateliers disponibles la semaine prochaine' : phrase); if (status === 'disabled') vi.stubEnv('STUDIO_CONVERSATION_BOOKING_WORKSHOPS', '0');
  const v = conversationView(f.u, f.c.id), spend = emptySpend(), quotes = all('SELECT * FROM agent_conversation_quotes'); expect(() => createCognitiveQuote(f.u, f.c.id, { revision: v.revision, projectRevision: v.projectRevision })).toThrow(/parcours gratuit de réservation/); expect(all('SELECT * FROM agent_conversation_quotes')).toEqual(quotes);
  const q = id(); run('INSERT INTO agent_conversation_quotes(id,conversation_id,revision,project_revision,billing_key,plan_json,created_at) VALUES(?,?,?,?,?,?,?)', q, f.c.id, v.revision, v.projectRevision, f.u.id, '{}', now()); expect(() => confirmCognitiveQuote(f.u, f.c.id, q, id())).toThrow(/parcours gratuit de réservation/); expect(emptySpend()).toEqual(spend); expect(p.bookingWorkshops?.financialConsent).toBe(false);
});

it('tab/account/plan/flag/other native engine and cached replay cannot grant unauthorized places', async () => {
  const f = await fixture(), v = conversationView(f.u, f.c.id), cmd = { action: 'message', text: phrase, context: { tab: 'rendez-vous', target: null }, revision: v.revision, projectRevision: v.projectRevision, requestId: id() };
  await expect(submitConversation(await account(), f.c.id, cmd)).rejects.toMatchObject({ status: 404 }); await expect(f.send({ action: 'message', text: phrase, context: { tab: 'produit', target: null } })).rejects.toMatchObject({ status: 409 });
  await submitConversation(f.u, f.c.id, cmd); vi.stubEnv('STUDIO_CONVERSATION_BOOKING_WORKSHOPS', '0'); await expect(submitConversation(f.u, f.c.id, cmd)).rejects.toMatchObject({ status: 404 }); expect(conversationView(f.u, f.c.id).bookingWorkshopsRead).toBeUndefined();
  vi.stubEnv('STUDIO_CONVERSATION_BOOKING_WORKSHOPS', '1'); run("UPDATE subscriptions SET status='canceled' WHERE project_id=?", f.pid); await expect(submitConversation(f.u, f.c.id, cmd)).rejects.toMatchObject({ status: 402 });
  const other = await fixture(); saveThemeVersion(other.pid, serviceSpec('table-saison'), 'Restaurant natif', 'user'); await expect(say(other)).rejects.toMatchObject({ status: 409 });
});

it('read capability is bounded/default-closed and does not add an A1 permission', async () => {
  const f = await fixture(); expect(studioOperationCatalogue(f.pid, false).rows.find(r => r.id === 'appointments.workshops')).toMatchObject({ implementation: 'implemented', cost: 'free', confirmation: 'none_read_only_no_business_action', scope: 'native_cabinet_workshop_places_read_backend_partial' });
  const old = await historicalProject('services'), c = openProjectConversation(old.u, old.pid), before = loadProject(old.pid), p = await sender(old.u, c.id)({ action: 'message', text: phrase, context: { tab: 'rendez-vous', target: null } }); expect(p.bookingWorkshopsRead).toBeUndefined(); expect(loadProject(old.pid)).toEqual(before); expect(stateOf(old.pid)).toBeNull();
});

it('actual HTTP after17s/project refresh rereads the last place and retries the lost response without inscription or duplicate turn', async () => {
  const f = await fixture(); jar.token = id(); run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(jar.token), f.u.id, now() + 3_600_000, now());
  const ctx = { params: Promise.resolve({ cid: f.c.id }) }, request = (body?: unknown) => new Request('http://localhost/api', { method: body ? 'POST' : 'GET', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const v = conversationView(f.u, f.c.id), cmd = { action: 'message', text: phrase, context: { tab: 'rendez-vous', target: null }, revision: v.revision, projectRevision: v.projectRevision, requestId: id() }, fp = businessFingerprints();
  const r = await thread.POST(request(cmd), ctx); expect(r.status).toBe(200); const first = await r.json(); expect(first.bookingWorkshops.rows[0].remaining).toBe(2); expect(businessFingerprints()).toEqual(fp);
  seed(f); const afterManual = businessFingerprints(), { waitAtLeast } = await import('../scripts/lot9/wait-at-least'); expect(await waitAtLeast(17_000, ms => new Promise(resolve => setTimeout(resolve, ms)))).toBeGreaterThanOrEqual(17_000); vi.mocked(Date.now).mockReturnValue(at + 17_000);
  expect((await projectGet(request(), { params: Promise.resolve({ id: f.pid }) })).status).toBe(200); const fresh = await (await thread.GET(request(), ctx)).json(); expect(fresh.bookingWorkshops).toMatchObject({ observedAt: at + 17_000, rows: [{ remaining: 1, available: true }] });
  expect(await (await thread.POST(request(cmd), ctx)).json()).toEqual(first); expect(all('SELECT * FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?', f.c.id, cmd.requestId)).toHaveLength(1); expect(businessFingerprints()).toEqual(afterManual);
});
