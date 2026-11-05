import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar = vi.hoisted(() => ({ token: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: jar.token }) }) }));
import { account, project, emptySpend } from './conversation209-fixtures';
import { serviceSpec } from './fixtures';
import { all, id, now, run } from '@/lib/db';
import { sha256 } from '@/lib/secrets';
import { currentTheme, loadProject, saveThemeVersion } from '@/lib/projects';
import { readPrestations, savePrestations, previewPrestations } from '@/lib/contenus/prestations';
import { rdvSection } from '@/lib/rendez-vous';
import * as salon from '@/lib/salon/booking';
import { PUT } from '@/app/api/projects/[id]/prestations/route';

const at = Date.parse('2026-11-05T08:00:00Z'), date = '2026-11-20';
const addition = { name: 'Alex nouveau', title: 'Coupe exacte', skills: ['coupe', 'soin'], days: [2, 4] };
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); })); vi.spyOn(Date, 'now').mockReturnValue(at); });
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function fixture(theme = 'atelier-nuance', rawId = 'camille') {
  const u = await account(), pid = project(u, 'services'); saveThemeVersion(pid, serviceSpec(theme as never), 'Source fictive', 'user');
  if (theme === 'atelier-nuance') {
    savePrestations(pid, { services: [{ name: 'Diagnostic fictif', duration: 30, price: 50, category: 'coupe' }], staff: [{ name: 'Camille acquis', title: 'Conserver', skills: [], days: [] }, { name: 'Sam acquis', title: 'Voisin', skills: [], days: [] }] });
    const spec = structuredClone(currentTheme(pid)!.spec), sec = rdvSection(spec)!.section, members = Object.values(sec.blocks!).filter(b => b.type === 'member');
    members[0].settings.member_id = rawId; members[1].settings.hours = ''; members[1].settings.unknown_acquired = { keep: true }; members[1].disabled = true;
    sec.blocks!['member-alex-nouveau'] = { type: 'service', settings: { service_id: 'voisin-cle', name: 'Voisin de clé', duration: '', price: '', custom: 'CONSERVER' } }; sec.block_order!.push('member-alex-nouveau');
    Object.assign(sec.settings, { booking_mode: 'live', hours_fri: '09:00-12:00', timezone: 'Europe/Paris', slot_step: 30 }); saveThemeVersion(pid, spec, 'Acquis atypiques', 'user');
  }
  jar.token = id(); run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(jar.token), u.id, now() + 3_600_000, now());
  const put = (body: unknown) => PUT(new Request('http://localhost/api', { method: 'PUT', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: pid }) });
  return { pid, u, put, native: readPrestations(pid)! };
}
function book(f: Awaited<ReturnType<typeof fixture>>) {
  return salon.createAppointment(f.pid, { service: salon.salonOf(f.pid).config.services[0].id, staff: salon.salonOf(f.pid).config.staff[0].id, date, time: '09:00', firstName: 'Alex', lastName: 'Fictif', email: 'fictif@example.invalid', phone: '0000000000', terms: true }, at).appointment;
}

it('targeted staff addition previews without writing and appends one exact member without touching acquired neighbours', async () => {
  const f = await fixture(), before = currentTheme(f.pid)!, profile = loadProject(f.pid).services, spend = emptySpend(), preview = previewPrestations(f.pid, { staffAdd: addition });
  expect(currentTheme(f.pid)).toEqual(before); const r = await f.put({ ifVersion: before.version.id, staffAdd: addition }); expect(r.status).toBe(200);
  const after = currentTheme(f.pid)!, expected = structuredClone(before.spec), oldSec = rdvSection(expected)!.section, newSec = rdvSection(after.spec)!.section, keys = Object.keys(newSec.blocks!).filter(k => !(k in oldSec.blocks!));
  expect(keys).toHaveLength(1); oldSec.blocks![keys[0]] = newSec.blocks![keys[0]]; oldSec.block_order!.push(keys[0]);
  expect(after.spec).toEqual(expected); expect(after.spec).toEqual(preview.spec); expect(after.version.number).toBe(before.version.number + 1); expect(readPrestations(f.pid)!.staff.slice(0, 2)).toEqual(f.native.staff);
  expect(readPrestations(f.pid)!.staff[2]).toMatchObject({ id: 'alex-nouveau', ...addition }); expect(salon.salonOf(f.pid).config.staff[2]).toMatchObject({ id: 'alex-nouveau', ...addition }); expect(loadProject(f.pid).services).toEqual(profile); expect(emptySpend()).toEqual(spend);
});

it('targeted removal changes only the exact member block and its order entry', async () => {
  const f = await fixture(), before = currentTheme(f.pid)!, profile = loadProject(f.pid).services, spend = emptySpend(), payload = { staffRemove: { id: f.native.staff[0].id } }, preview = previewPrestations(f.pid, payload);
  expect(currentTheme(f.pid)).toEqual(before); expect((await f.put({ ifVersion: before.version.id, ...payload })).status).toBe(200);
  const expected = structuredClone(before.spec), sec = rdvSection(expected)!.section, key = Object.keys(sec.blocks!).find(k => sec.blocks![k].settings.member_id === f.native.staff[0].id)!;
  delete sec.blocks![key]; sec.block_order = sec.block_order!.filter(k => k !== key);
  expect(currentTheme(f.pid)!.spec).toEqual(expected); expect(preview.spec).toEqual(expected); expect(readPrestations(f.pid)!.staff).toEqual([f.native.staff[1]]); expect(loadProject(f.pid).services).toEqual(profile); expect(emptySpend()).toEqual(spend);
});

it.each(['camille', 'Camille__ID', 'toString'])('a real native future booking protects staff source identity %s without changing any customer field', async rawId => {
  const f = await fixture('atelier-nuance', rawId); book(f); const before = currentTheme(f.pid)!, rows = all('SELECT * FROM salon_appointments WHERE project_id=?', f.pid);
  const r = await f.put({ ifVersion: before.version.id, staffRemove: { id: rawId } }); expect(r.status).toBe(409); expect(await r.json()).toMatchObject({ code: 'staff_has_bookings' }); expect(currentTheme(f.pid)).toEqual(before); expect(all('SELECT * FROM salon_appointments WHERE project_id=?', f.pid)).toEqual(rows);
});

it.each(['member', 'service'] as const)('an acquired %s identity still protects native bookings after its display name was manually cleared', async target => {
  const f = await fixture('atelier-nuance', 'Camille__ID'), spec = structuredClone(currentTheme(f.pid)!.spec), section = rdvSection(spec)!.section;
  const service = Object.values(section.blocks!).find(b => b.type === 'service' && b.settings.duration === 30)!; service.settings.service_id = 'Diagnostic__ID'; saveThemeVersion(f.pid, spec, 'Identités acquises', 'user'); book(f);
  const cleared = structuredClone(currentTheme(f.pid)!.spec), block = Object.values(rdvSection(cleared)!.section.blocks!).find(b => b.type === target && b.settings[target === 'member' ? 'member_id' : 'service_id'] === (target === 'member' ? 'Camille__ID' : 'Diagnostic__ID'))!;
  block.settings.name = ''; saveThemeVersion(f.pid, cleared, 'Libellé acquis effacé', 'user'); const before = currentTheme(f.pid)!, rows = all('SELECT * FROM salon_appointments WHERE project_id=?', f.pid);
  const payload = target === 'member' ? { staffRemove: { id: 'Camille__ID' } } : { serviceRemove: { id: 'Diagnostic__ID' } };
  expect((await f.put({ ifVersion: before.version.id, ...payload })).status).toBe(409); expect(currentTheme(f.pid)).toEqual(before); expect(all('SELECT * FROM salon_appointments WHERE project_id=?', f.pid)).toEqual(rows);
});

it.each(['past', 'canceled'])('%s appointments do not prevent retiring staff and are never rewritten', async status => {
  const f = await fixture(), appt = book(f); run("UPDATE salon_appointments SET date=?,status=? WHERE id=?", status === 'past' ? '2000-01-01' : date, status === 'canceled' ? 'canceled' : 'confirmed', appt.id);
  const rows = all('SELECT * FROM salon_appointments WHERE project_id=?', f.pid), before = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: before.version.id, staffRemove: { id: f.native.staff[0].id } })).status).toBe(200); expect(readPrestations(f.pid)!.staff).toEqual([f.native.staff[1]]); expect(all('SELECT * FROM salon_appointments WHERE project_id=?', f.pid)).toEqual(rows);
});

it('normalized acquired identities remain reserved when a new member has a matching generated name', async () => {
  const f = await fixture('atelier-nuance', 'Alex__ID'), before = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: before.version.id, staffAdd: { ...addition, name: 'Alex ID' } })).status).toBe(200); expect(salon.salonOf(f.pid).config.staff.map(m => m.id)).toEqual(['alex-id', 'sam-acquis', 'alex-id-2']); expect(readPrestations(f.pid)!.staff[0].id).toBe('Alex__ID');
});

it.each([
  { staffAdd: { ...addition, id: 'override' } }, { staffAdd: { ...addition, name: '' } }, { staffAdd: { ...addition, days: [7] } }, { staffAdd: { ...addition, skills: ['x'.repeat(41)] } },
  { staffRemove: { id: '' } }, { staffRemove: { id: 'camille', all: true } }, { staffRemove: { id: 'camille' }, staff: [] }, { staffAdd: addition, staffPatch: { id: 'camille', title: '' } }, { staffAdd: addition, hours: { fri: '' } },
])('malformed or mixed targeted staff command cannot save a version: %j', async payload => {
  const f = await fixture(), before = currentTheme(f.pid); expect((await f.put({ ifVersion: before!.version.id, ...payload })).status).toBe(400); expect(currentTheme(f.pid)).toEqual(before);
});

it.each(['parenthese', 'table-saison'])('%s cannot substitute a salon staff list', async theme => {
  const f = await fixture(theme), before = currentTheme(f.pid); for (const payload of [{ staffAdd: addition }, { staffRemove: { id: 'camille' } }]) expect((await f.put({ ifVersion: before!.version.id, ...payload })).status).toBe(409); expect(currentTheme(f.pid)).toEqual(before);
});

it('unknown, duplicated or stale identities are refused without choosing another member', async () => {
  const f = await fixture(), before = currentTheme(f.pid)!; expect((await f.put({ ifVersion: before.version.id, staffRemove: { id: 'absent' } })).status).toBe(409); expect(currentTheme(f.pid)).toEqual(before);
  const spec = structuredClone(before.spec), sec = rdvSection(spec)!.section, member = Object.values(sec.blocks!).find(b => b.type === 'member')!; sec.blocks!.duplicate = structuredClone(member); sec.block_order!.push('duplicate'); saveThemeVersion(f.pid, spec, 'Identité dupliquée', 'user'); const duplicate = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: duplicate.version.id, staffRemove: { id: f.native.staff[0].id } })).status).toBe(409); expect((await f.put({ ifVersion: before.version.id, staffAdd: addition })).status).toBe(409); expect(currentTheme(f.pid)).toEqual(duplicate);
});

it('native count errors refuse retirement rather than silently becoming zero staff bookings', async () => {
  const f = await fixture(); book(f); const before = currentTheme(f.pid)!, rows = all('SELECT * FROM salon_appointments WHERE project_id=?', f.pid); run('ALTER TABLE salon_appointments RENAME COLUMN staff TO inaccessible_staff');
  try { const r = await f.put({ ifVersion: before.version.id, staffRemove: { id: f.native.staff[0].id } }); expect(r.status).toBe(409); expect(await r.json()).toMatchObject({ code: 'booking_records_unavailable' }); expect(currentTheme(f.pid)).toEqual(before); }
  finally { run('ALTER TABLE salon_appointments RENAME COLUMN inaccessible_staff TO staff'); }
  expect(all('SELECT * FROM salon_appointments WHERE project_id=?', f.pid)).toEqual(rows);
});

it('last member removal is warned in preview and yields no native available slots without changing booking mode', async () => {
  const f = await fixture(); savePrestations(f.pid, { staff: [f.native.staff[0]] });
  const spec = structuredClone(currentTheme(f.pid)!.spec), sec = rdvSection(spec)!.section; sec.blocks!.invalid_acquired = { type: 'member', settings: { member_id: 'legacy-without-label', name: '', unknown_acquired: 'CONSERVER' } }; sec.block_order!.push('invalid_acquired'); saveThemeVersion(f.pid, spec, 'Ancien intervenant sans libellé', 'user');
  const before = currentTheme(f.pid)!, payload = { staffRemove: { id: f.native.staff[0].id } }, preview = previewPrestations(f.pid, payload);
  expect(preview.warnings.join(' ')).toMatch(/dernier intervenant|aucun créneau/i); expect(currentTheme(f.pid)).toEqual(before); expect((await f.put({ ifVersion: before.version.id, ...payload })).status).toBe(200); expect(salon.salonOf(f.pid).config.staff).toEqual([]); expect(salon.salonOf(f.pid).mode).toBe('live'); expect(salon.availability(f.pid, { date, service: 'diagnostic-fictif', staff: 'any' }, at).slots).toEqual([]);
});

it('a native maximum of twenty members and implicit order are preserved', async () => {
  const f = await fixture(); savePrestations(f.pid, { staff: Array.from({ length: 20 }, (_, n) => ({ name: 'Fictif ' + n, skills: [], days: [] })) }); const before = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: before.version.id, staffAdd: addition })).status).toBe(409); expect(currentTheme(f.pid)).toEqual(before);
  const spec = structuredClone(before.spec), sec = rdvSection(spec)!.section; delete sec.block_order; const toRemove = readPrestations(f.pid)!.staff[0].id; saveThemeVersion(f.pid, spec, 'Ordre implicite acquis', 'user'); const implicit = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: implicit.version.id, staffRemove: { id: toRemove } })).status).toBe(200); expect(rdvSection(currentTheme(f.pid)!.spec)!.section.block_order).toBeUndefined();
});
