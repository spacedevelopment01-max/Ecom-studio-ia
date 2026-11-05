import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar = vi.hoisted(() => ({ token: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: jar.token }) }) }));
import { account, emptySpend, project } from './conversation209-fixtures';
import { serviceSpec } from './fixtures';
import { GET, PUT } from '@/app/api/projects/[id]/prestations/route';
import { currentTheme, saveThemeVersion } from '@/lib/projects';
import { listBookings, rdvSection, rdvRules } from '@/lib/rendez-vous';
import { all, id, now, run } from '@/lib/db';
import { sha256 } from '@/lib/secrets';

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); })); });
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.useRealTimers(); vi.unstubAllGlobals(); });

type Kind = 'salon' | 'cabinet';
async function fixture(kind: Kind, timezone: unknown, at: string) {
  const user = await account(), pid = project(user, 'services');
  saveThemeVersion(pid, serviceSpec(kind === 'salon' ? 'atelier-nuance' : 'parenthese'), 'Fixture fictive', 'user');
  jar.token = id();
  // Date is faked only after account/billing setup; the session remains valid at the chosen instant.
  const timestamp = Date.parse(at);
  run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(jar.token), user.id, timestamp + 86_400_000, timestamp);
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(timestamp);
  const ctx = { params: Promise.resolve({ id: pid }) };
  const put = (body: unknown) => PUT(new Request('http://localhost/api', { method: 'PUT', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify(body) }), ctx);
  const read = async () => { const r = await GET(new Request('http://localhost/api'), ctx); expect(r.status).toBe(200); return r.json(); };
  let native = await read();
  expect((await put({ ifVersion: native.versionId, services: [{ name: 'Diagnostic fictif', duration: 30, price: 50, category: 'coupe' }] })).status).toBe(200);
  const spec = structuredClone(currentTheme(pid)!.spec);
  rdvSection(spec)!.section.settings!.timezone = timezone;
  saveThemeVersion(pid, spec, 'Fuseau acquis', 'user');
  native = await read();
  listBookings(pid, kind, '2026-01-01', '2026-12-31'); // Initialize the real native table.
  const table = kind + '_appointments';
  const seed = (date: string, status = 'confirmed', service = native.services[0].id, projectId = pid) => {
    const row: Record<string, unknown> = {
      id: id(), project_id: projectId, number: 'FICTIF-' + id(), status, service, service_name: 'Diagnostic fictif',
      date, start_min: 1380, end_min: 1410, price: 50, first_name: 'Alex', last_name: 'Fictif',
      email: 'fictif@example.invalid', phone: '0000000000', created_at: now(), updated_at: now(),
      ...(kind === 'salon' ? { client_id: 'fictif-client', staff: 'fictif' } : { kind: 'seance', modality: 'cabinet' }),
    };
    const keys = Object.keys(row);
    run(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, ...keys.map(k => row[k]));
  };
  return { pid, native, put, read, seed, rows: () => all(`SELECT * FROM ${table} WHERE project_id=?`, pid) };
}

for (const kind of ['salon', 'cabinet'] as const) {
  it(`${kind}: a still-future local-day booking west of UTC blocks deletion and preserves every row/version`, async () => {
    const f = await fixture(kind, 'America/Los_Angeles', '2026-11-06T01:00:00Z');
    f.seed('2026-11-05'); // Local 17:00; the appointment is at 23:00 tonight.
    expect(rdvRules(f.pid, kind).timezone).toBe('America/Los_Angeles');
    const upcoming = (await f.read()).services[0].upcoming;
    const before = currentTheme(f.pid), rows = f.rows(), spend = emptySpend();
    const result = await f.put({ ifVersion: f.native.versionId, services: [] });
    expect(result.status).toBe(409); expect(await result.json()).toMatchObject({ code: 'service_has_bookings' });
    expect(upcoming).toBe(1);
    expect(currentTheme(f.pid)).toEqual(before); expect(f.rows()).toEqual(rows); expect(emptySpend()).toEqual(spend);
  });

  it(`${kind}: yesterday in the widget timezone does not block deletion east of UTC; historical/cancelled records survive`, async () => {
    const f = await fixture(kind, 'Asia/Tokyo', '2026-11-05T23:00:00Z');
    f.seed('2026-11-05'); f.seed('2026-11-07', 'canceled'); f.seed('2026-11-07', 'confirmed', 'another-service');
    const upcoming = (await f.read()).services[0].upcoming;
    const before = currentTheme(f.pid)!, rows = f.rows(), spend = emptySpend();
    expect((await f.put({ ifVersion: f.native.versionId, services: [] })).status).toBe(200);
    expect(upcoming).toBe(0);
    expect((await f.read()).services).toEqual([]); expect(f.rows()).toEqual(rows);
    expect(currentTheme(f.pid)!.version.number).toBe(before.version.number + 1); expect(emptySpend()).toEqual(spend);
  });

  it.each([
    ['Europe/Paris', '2026-11-05T23:30:00Z', '2026-11-06'],
    ['', '2026-11-05T23:30:00Z', '2026-11-06'],
    ['  Europe/Paris  ', '2026-11-05T23:30:00Z', '2026-11-06'],
    ['invalid/fictif', '2026-11-06T01:00:00Z', '2026-11-06'],
    ['America/Los_Angeles', '2026-11-02T01:00:00Z', '2026-11-01'],
  ])(`${kind}: native timezone/default/fallback/DST semantics protect local today (%s)`, async (timezone, at, date) => {
    const f = await fixture(kind, timezone, at); f.seed(date);
    expect((await f.read()).services[0].upcoming).toBe(1);
    const before = currentTheme(f.pid), rows = f.rows();
    expect((await f.put({ ifVersion: f.native.versionId, services: [] })).status).toBe(409);
    expect(currentTheme(f.pid)).toEqual(before); expect(f.rows()).toEqual(rows);
  });
}
