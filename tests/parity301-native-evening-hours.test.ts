import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar = vi.hoisted(() => ({ token: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: jar.token }) }) }));
import { core as salonCore, availability as salonAvailability, salonOf } from '@/lib/salon/booking';
import { core as cabinetCore, availability as cabinetAvailability, cabinetOf } from '@/lib/cabinet/booking';
import { account, emptySpend, project } from './conversation209-fixtures';
import { serviceSpec } from './fixtures';
import { currentTheme, loadProject, saveThemeVersion } from '@/lib/projects';
import { readPrestations, savePrestations } from '@/lib/contenus/prestations';
import { rdvSection } from '@/lib/rendez-vous';
import { PUT } from '@/app/api/projects/[id]/prestations/route';
import { id, now, run } from '@/lib/db';
import { sha256 } from '@/lib/secrets';

const at = Date.parse('2026-11-05T08:00:00Z'), date = '2026-11-10';
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); })); });
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });

for (const kind of ['salon', 'cabinet'] as const) {
  const core = kind === 'salon' ? salonCore : cabinetCore;
  it.each([20, 21, 22, 23, 24])(`${kind}: a valid evening end at %s:00 is not truncated to 02:00`, end => {
    const cfg = core.normalize({ timezone: 'Europe/Paris', hours: { 2: `18:00-${end}:00` }, step: 30, services: [{ id: 'fictif', name: 'Fictif', duration: 30, price: 50 }], staff: [{ id: 'alex', name: 'Alex fictif' }], seances: [{ id: 'fictif', name: 'Fictif', duration: 30, price: 50, modes: 'cabinet' }] });
    expect(cfg.hours[2]).toEqual([[1080, end * 60]]);
    const slots = core.slotsFor(cfg as never, { date, service: 'fictif' }, at);
    expect(slots.length).toBe((end - 18) * 2); expect(slots.at(-1)).toMatchObject({ time: `${end - 1}:30`, available: true });
  });

  it(`${kind}: real authenticated native PUT saves one exact late interval and the native engine offers its final complete slot`, async () => {
    const u = await account(), pid = project(u, 'services');
    saveThemeVersion(pid, serviceSpec(kind === 'salon' ? 'atelier-nuance' : 'parenthese'), 'Source fictive', 'user');
    savePrestations(pid, { services: [{ name: 'Diagnostic fictif', duration: 30, price: 50, modes: 'cabinet' }], ...(kind === 'salon' ? { staff: [{ name: 'Alex fictif', skills: [], days: [] }] } : {}) });
    const spec = structuredClone(currentTheme(pid)!.spec); Object.assign(rdvSection(spec)!.section.settings, { booking_mode: 'live', slot_step: 30 }); saveThemeVersion(pid, spec, 'Mode isolé déjà réel', 'user');
    jar.token = id(); run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(jar.token), u.id, now() + 3_600_000, now());
    const before = currentTheme(pid)!, profile = loadProject(pid).services, spend = emptySpend(), serviceId = readPrestations(pid)!.services[0].id;
    const r = await PUT(new Request('http://localhost/api', { method: 'PUT', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify({ ifVersion: before.version.id, hours: { tue: '18:00-24:00' } }) }), { params: Promise.resolve({ id: pid }) });
    expect(r.status).toBe(200);
    const expected = structuredClone(before.spec); rdvSection(expected)!.section.settings.hours_tue = '18:00-24:00'; expect(currentTheme(pid)!.spec).toEqual(expected); expect(currentTheme(pid)!.version.number).toBe(before.version.number + 1);
    const cfg = kind === 'salon' ? salonOf(pid).config : cabinetOf(pid).config; expect(cfg.hours[2]).toEqual([[1080, 1440]]);
    const native = kind === 'salon' ? salonAvailability(pid, { date, service: serviceId, staff: 'any' }, at) : cabinetAvailability(pid, { date, service: serviceId, modality: 'cabinet' }, at);
    expect(native.slots.at(-1)).toMatchObject({ time: '23:30', available: true }); expect(loadProject(pid).services).toEqual(profile); expect(emptySpend()).toEqual(spend);
  });
}
