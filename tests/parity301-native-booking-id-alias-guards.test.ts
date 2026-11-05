import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar = vi.hoisted(() => ({ token: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: jar.token }) }) }));
import { account, project, emptySpend } from './conversation209-fixtures';
import { serviceSpec } from './fixtures';
import { currentTheme, saveThemeVersion } from '@/lib/projects';
import { readPrestations, savePrestations } from '@/lib/contenus/prestations';
import { rdvSection } from '@/lib/rendez-vous';
import { all, id, now, run } from '@/lib/db';
import { sha256 } from '@/lib/secrets';
import * as salon from '@/lib/salon/booking';
import * as cabinet from '@/lib/cabinet/booking';
import { PUT } from '@/app/api/projects/[id]/prestations/route';

const at = Date.parse('2026-11-05T08:00:00Z'), date = '2026-11-20';
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); })); });
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });
async function fixture(kind: 'salon' | 'cabinet', sourceId = 'Diagnostic__ID') {
  const u = await account(), pid = project(u, 'services'); saveThemeVersion(pid, serviceSpec(kind === 'salon' ? 'atelier-nuance' : 'parenthese'), 'Source fictive', 'user');
  savePrestations(pid, { services: [{ name: 'Diagnostic acquis', duration: 30, price: 50, modes: 'cabinet' }], ...(kind === 'salon' ? { staff: [{ name: 'Alex acquis', skills: [], days: [] }] } : {}) });
  const spec = structuredClone(currentTheme(pid)!.spec), sec = rdvSection(spec)!.section;
  const svc = Object.values(sec.blocks!).find(b => b.type === (kind === 'salon' ? 'service' : 'seance'))!; svc.settings[kind === 'salon' ? 'service_id' : 'seance_id'] = sourceId;
  if (kind === 'salon') Object.values(sec.blocks!).find(b => b.type === 'member')!.settings.member_id = 'Alex__ID';
  Object.assign(sec.settings, { booking_mode: 'live', timezone: 'Europe/Paris', hours_fri: '09:00-12:00', slot_step: 30 }); saveThemeVersion(pid, spec, 'Identités acquises opaques', 'user');
  jar.token = id(); run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(jar.token), u.id, now() + 3_600_000, now());
  const put = (body: unknown) => PUT(new Request('http://localhost/api', { method: 'PUT', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: pid }) });
  const services = () => kind === 'salon' ? salon.salonOf(pid).config.services : cabinet.cabinetOf(pid).config.seances;
  const book = () => kind === 'salon'
    ? salon.createAppointment(pid, { service: services()[0].id, staff: salon.salonOf(pid).config.staff[0].id, date, time: '09:00', firstName: 'Alex', lastName: 'Fictif', email: 'fictif@example.invalid', phone: '0000000000', terms: true }, at)
    : cabinet.createAppointment(pid, { kind: 'seance', service: services()[0].id, modality: 'cabinet', date, time: '09:00', firstName: 'Alex', lastName: 'Fictif', email: 'fictif@example.invalid', phone: '0000000000', terms: true }, at);
  return { pid, put, services, book };
}

it.each(['salon', 'cabinet'] as const)('%s: a real native booking under the normalized engine ID still protects its opaque acquired service from removal', async kind => {
  const f = await fixture(kind); expect(f.services()[0].id).toBe('diagnostic-id'); const booked = f.book(); expect(booked.appointment.service).toBe('diagnostic-id');
  const before = currentTheme(f.pid)!, rows = all(`SELECT * FROM ${kind}_appointments WHERE project_id=?`, f.pid), spend = emptySpend();
  const r = await f.put({ ifVersion: before.version.id, serviceRemove: { id: 'Diagnostic__ID' } }); expect(r.status).toBe(409);
  expect(readPrestations(f.pid)!.services[0]).toMatchObject({ id: 'Diagnostic__ID', upcoming: 1 }); expect(currentTheme(f.pid)).toEqual(before); expect(all(`SELECT * FROM ${kind}_appointments WHERE project_id=?`, f.pid)).toEqual(rows); expect(emptySpend()).toEqual(spend);
});

it.each(['salon', 'cabinet'] as const)('%s: targeted addition must reserve engine-normalized acquired identities too', async kind => {
  const f = await fixture(kind), before = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: before.version.id, serviceAdd: { name: 'Diagnostic ID', duration: 45, price: 75 } })).status).toBe(200);
  const native = f.services(); expect(native.map(s => s.id)).toEqual(['diagnostic-id', 'diagnostic-id-2']); expect(new Set(native.map(s => s.id)).size).toBe(native.length);
  expect(readPrestations(f.pid)!.services.map(s => s.id)).toEqual(['Diagnostic__ID', 'diagnostic-id-2']);
});

it.each(['salon', 'cabinet'] as const)('%s: acquired numeric retouch warns about canonical-ID bookings while preserving the original appointment', async kind => {
  const f = await fixture(kind); f.book(); const before = all(`SELECT * FROM ${kind}_appointments WHERE project_id=?`, f.pid), theme = currentTheme(f.pid)!;
  const r = await f.put({ ifVersion: theme.version.id, servicePatch: { id: 'Diagnostic__ID', duration: 45 } }); expect(r.status).toBe(200); expect((await r.json()).warnings.join(' ')).toMatch(/1.*conservent|conservent.*1/);
  expect(all(`SELECT * FROM ${kind}_appointments WHERE project_id=?`, f.pid)).toEqual(before); expect(readPrestations(f.pid)!.services[0].id).toBe('Diagnostic__ID');
});

it.each(['salon', 'cabinet'] as const)('%s: native whole-service form can add a neighbour without shadowing an acquired canonical identity', async kind => {
  const f = await fixture(kind), before = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: before.version.id, services: [{ id: 'Diagnostic__ID', name: 'Diagnostic acquis', duration: 30, price: 50 }, { name: 'Diagnostic ID', duration: 45, price: 75 }] })).status).toBe(200);
  expect(f.services().map(s => s.id)).toEqual(['diagnostic-id', 'diagnostic-id-2']); expect(readPrestations(f.pid)!.services[0].id).toBe('Diagnostic__ID');
});

it('native whole-staff form reserves the normalized acquired identity without rewriting its raw member ID', async () => {
  const f = await fixture('salon'), before = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: before.version.id, staff: [{ id: 'Alex__ID', name: 'Alex acquis', skills: [], days: [] }, { name: 'Alex ID', skills: [], days: [] }] })).status).toBe(200);
  expect(salon.salonOf(f.pid).config.staff.map(s => s.id)).toEqual(['alex-id', 'alex-id-2']); expect(readPrestations(f.pid)!.staff[0].id).toBe('Alex__ID');
});

it.each(['salon', 'cabinet'] as const)('%s: an opaque prototype-named source ID is counted numerically and cannot bypass whole-form deletion guards', async kind => {
  const f = await fixture(kind, 'toString'); f.book(); const before = currentTheme(f.pid)!;
  const r = await f.put({ ifVersion: before.version.id, services: [] }); expect(r.status).toBe(409); expect(currentTheme(f.pid)).toEqual(before); expect(readPrestations(f.pid)!.services[0].upcoming).toBe(1);
});
