import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const jar = vi.hoisted(() => ({ token: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: jar.token }) }) }));
import { account, emptySpend, project } from './conversation209-fixtures';
import { serviceSpec } from './fixtures';
import { GET, PUT } from '@/app/api/projects/[id]/prestations/route';
import { currentTheme, loadProject, saveThemeVersion } from '@/lib/projects';
import { previewPrestations } from '@/lib/contenus/prestations';
import { listBookings, rdvSection } from '@/lib/rendez-vous';
import { all, id, now, run } from '@/lib/db';
import { sha256 } from '@/lib/secrets';

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); })); });
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });
const newService = { name: 'Soin exact', duration: 45, price: 65, short: 'Texte exact', category: 'soin', priceFrom: true, modes: 'cabinet,visio' };
async function fixture(theme = 'atelier-nuance') {
  const user = await account(), pid = project(user, 'services');
  saveThemeVersion(pid, serviceSpec(theme as never), 'Fixture fictive', 'user');
  jar.token = id(); run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(jar.token), user.id, now() + 86_400_000, now());
  const ctx = { params: Promise.resolve({ id: pid }) };
  const put = (body: unknown) => PUT(new Request('http://localhost/api', { method: 'PUT', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify(body) }), ctx);
  const read = async () => { const r = await GET(new Request('http://localhost/api'), ctx); expect(r.status).toBe(200); return r.json(); };
  let native = await read();
  if (theme !== 'table-saison') {
    expect((await put({ ifVersion: native.versionId, services: [{ name: 'Diagnostic acquis', duration: 30, price: 50 }, { name: 'Voisine acquise', duration: 40, price: null }] })).status).toBe(200);
    const spec = structuredClone(currentTheme(pid)!.spec), sec = rdvSection(spec)!;
    const rows = Object.values(sec.section.blocks!).filter(b => b.type === (theme === 'parenthese' ? 'seance' : 'service'));
    rows[1].settings.duration = ''; rows[1].settings.inconnu_acquis = 'CONSERVER'; rows[1].disabled = true;
    // Acquired block keys are independent from native IDs; never overwrite a colliding unrelated block.
    const collidingKey = (theme === 'parenthese' ? 'seance' : 'service') + '-soin-exact';
    sec.section.blocks![collidingKey] = { type: 'member', settings: { member_id: 'acquis', name: 'Alex', custom: 'CONSERVER' } };
    sec.section.block_order!.splice(1, 0, collidingKey);
    saveThemeVersion(pid, spec, 'Valeurs acquises', 'user'); native = await read();
  }
  return { user, pid, put, read, native };
}

it.each(['atelier-nuance', 'parenthese'])('%s: a targeted addition previews without writing, then appends exactly one service and preserves every acquired neighbour', async theme => {
  const f = await fixture(theme), before = currentTheme(f.pid)!, profile = loadProject(f.pid).services, spend = emptySpend();
  const preview = previewPrestations(f.pid, { serviceAdd: newService });
  expect(currentTheme(f.pid)).toEqual(before);
  const r = await f.put({ ifVersion: f.native.versionId, serviceAdd: newService }); expect(r.status).toBe(200);
  const after = currentTheme(f.pid)!, native = await f.read();
  expect(after.spec).toEqual(preview.spec); expect(after.version.number).toBe(before.version.number + 1);
  expect(native.services.slice(0, 2)).toEqual(f.native.services); expect(native.services[2]).toMatchObject({ id: 'soin-exact', name: newService.name, short: newService.short, duration: 45, price: 65 });
  const expected = structuredClone(before.spec), section = rdvSection(expected)!.section, actual = rdvSection(after.spec)!.section;
  const addedKeys = Object.keys(actual.blocks!).filter(k => !(k in section.blocks!)); expect(addedKeys).toHaveLength(1);
  section.blocks![addedKeys[0]] = actual.blocks![addedKeys[0]]; section.block_order!.push(addedKeys[0]);
  expect(after.spec).toEqual(expected); expect(loadProject(f.pid).services).toEqual(profile); expect(emptySpend()).toEqual(spend);
});

it.each(['atelier-nuance', 'parenthese'])('%s: targeted removal deletes only the exact block/order entry; acquired profile and historical appointments remain', async theme => {
  const f = await fixture(theme), kind = theme === 'parenthese' ? 'cabinet' : 'salon';
  listBookings(f.pid, kind, '2000-01-01', '2000-01-01');
  const row: Record<string, unknown> = { id: id(), project_id: f.pid, number: 'FICTIF-HISTORIQUE', status: 'confirmed', service: f.native.services[0].id, service_name: 'Diagnostic acquis', date: '2000-01-01', start_min: 600, end_min: 630, price: 50, first_name: 'Alex', last_name: 'Fictif', email: 'fictif@example.invalid', phone: '0000000000', created_at: now(), updated_at: now(), ...(kind === 'salon' ? { client_id: 'fictif-client', staff: 'fictif' } : { kind: 'seance', modality: 'cabinet' }) };
  const keys = Object.keys(row); run(`INSERT INTO ${kind}_appointments(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, ...keys.map(k => row[k]));
  const before = currentTheme(f.pid)!, profile = loadProject(f.pid).services, appointments = all(`SELECT * FROM ${kind}_appointments WHERE project_id=?`, f.pid), spend = emptySpend();
  const payload = { serviceRemove: { id: f.native.services[0].id } }, preview = previewPrestations(f.pid, payload);
  expect(currentTheme(f.pid)).toEqual(before);
  expect((await f.put({ ifVersion: before.version.id, ...payload })).status).toBe(200);
  const expected = structuredClone(before.spec), sec = rdvSection(expected)!.section, nativeId = kind === 'salon' ? 'service_id' : 'seance_id';
  const key = Object.keys(sec.blocks!).find(k => sec.blocks![k].settings[nativeId] === f.native.services[0].id)!;
  delete sec.blocks![key]; sec.block_order = sec.block_order!.filter(k => k !== key);
  expect(currentTheme(f.pid)!.spec).toEqual(expected); expect(preview.spec).toEqual(expected);
  expect((await f.read()).services).toEqual([f.native.services[1]]); expect(loadProject(f.pid).services).toEqual(profile);
  expect(all(`SELECT * FROM ${kind}_appointments WHERE project_id=?`, f.pid)).toEqual(appointments); expect(emptySpend()).toEqual(spend);
});

it.each([
  { serviceAdd: { ...newService, id: 'override' } },
  { serviceAdd: { ...newService, duration: 0 } },
  { serviceAdd: { ...newService, name: '' } },
  { serviceRemove: { id: '' } },
  { serviceRemove: { id: 'diagnostic-acquis', unsafe: true } },
  { serviceRemove: { id: 'diagnostic-acquis' }, services: [] },
  { serviceAdd: newService, servicePatch: { id: 'diagnostic-acquis', price: 0 } },
  { serviceAdd: newService, serviceRemove: { id: 'diagnostic-acquis' } },
  { serviceAdd: newService, hours: { tue: '' } },
])('rejects malformed/mixed targeted commands without a version: %j', async payload => {
  const f = await fixture(), before = currentTheme(f.pid);
  expect((await f.put({ ifVersion: f.native.versionId, ...payload })).status).toBe(400); expect(currentTheme(f.pid)).toEqual(before);
});

it.each([{ serviceAdd: newService }, { serviceRemove: { id: 'diagnostic-acquis' } }])('a restaurant cannot be substituted for a salon/cabinet: %j', async payload => {
  const f = await fixture('table-saison'), before = currentTheme(f.pid);
  expect((await f.put({ ifVersion: f.native.versionId, ...payload })).status).toBe(409); expect(currentTheme(f.pid)).toEqual(before);
});

it('missing or duplicate native IDs refuse removal without substituting a name', async () => {
  const f = await fixture(), before = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: before.version.id, serviceRemove: { id: 'absent' } })).status).toBe(409); expect(currentTheme(f.pid)).toEqual(before);
  const spec = structuredClone(before.spec), sec = rdvSection(spec)!.section, source = Object.values(sec.blocks!).find(b => b.type === 'service')!;
  sec.blocks!.duplicate = structuredClone(source); sec.block_order!.push('duplicate'); saveThemeVersion(f.pid, spec, 'Identité ambiguë', 'user');
  const duplicate = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: duplicate.version.id, serviceRemove: { id: f.native.services[0].id } })).status).toBe(409); expect(currentTheme(f.pid)).toEqual(duplicate);
});

it('colliding names receive a fresh deterministic ID, and a stale retry cannot add twice', async () => {
  const f = await fixture(), payload = { serviceAdd: { ...newService, name: 'Diagnostic acquis' } };
  expect((await f.put({ ifVersion: f.native.versionId, ...payload })).status).toBe(200);
  const after = currentTheme(f.pid)!; expect((await f.read()).services.map((s: { id: string }) => s.id)).toEqual(['diagnostic-acquis', 'voisine-acquise', 'diagnostic-acquis-2']);
  expect((await f.put({ ifVersion: f.native.versionId, ...payload })).status).toBe(409); expect(currentTheme(f.pid)).toEqual(after);
});

for (const kind of ['salon', 'cabinet'] as const) {
  async function bookedFixture() {
    const f = await fixture(kind === 'salon' ? 'atelier-nuance' : 'parenthese');
    listBookings(f.pid, kind, '2099-01-01', '2099-01-01');
    const row: Record<string, unknown> = { id: id(), project_id: f.pid, number: 'FICTIF-FUTUR', status: 'confirmed', service: f.native.services[0].id, service_name: 'Diagnostic acquis', date: '2099-01-01', start_min: 600, end_min: 630, price: 50, first_name: 'Alex', last_name: 'Fictif', email: 'fictif@example.invalid', phone: '0000000000', created_at: now(), updated_at: now(), ...(kind === 'salon' ? { client_id: 'fictif-client', staff: 'fictif' } : { kind: 'seance', modality: 'cabinet' }) };
    const keys = Object.keys(row); run(`INSERT INTO ${kind}_appointments(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, ...keys.map(k => row[k]));
    return f;
  }
  it(`${kind}: confirmed upcoming appointments block targeted removal and stay byte-for-byte unchanged`, async () => {
    const f = await bookedFixture(), before = currentTheme(f.pid), rows = all(`SELECT * FROM ${kind}_appointments WHERE project_id=?`, f.pid);
    const r = await f.put({ ifVersion: f.native.versionId, serviceRemove: { id: f.native.services[0].id } });
    expect(r.status).toBe(409); expect(await r.json()).toMatchObject({ code: 'service_has_bookings' });
    expect(currentTheme(f.pid)).toEqual(before); expect(all(`SELECT * FROM ${kind}_appointments WHERE project_id=?`, f.pid)).toEqual(rows);
  });
  it(`${kind}: a real SQLite count failure must not turn an acquired future appointment into zero bookings`, async () => {
    const f = await bookedFixture(), before = currentTheme(f.pid), rows = all(`SELECT * FROM ${kind}_appointments WHERE project_id=?`, f.pid);
    run(`ALTER TABLE ${kind}_appointments RENAME COLUMN date TO inaccessible_date`);
    try {
      const r = await f.put({ ifVersion: f.native.versionId, serviceRemove: { id: f.native.services[0].id } });
      expect(r.status).toBe(409); expect(await r.json()).toMatchObject({ code: 'booking_records_unavailable' });
      expect(currentTheme(f.pid)).toEqual(before);
    } finally { run(`ALTER TABLE ${kind}_appointments RENAME COLUMN inaccessible_date TO date`); }
    expect(all(`SELECT * FROM ${kind}_appointments WHERE project_id=?`, f.pid)).toEqual(rows);
  });
}

it('targeted creation enforces the native 60-service maximum without rebuilding acquired blocks', async () => {
  const f = await fixture(), native = await f.read();
  const services = Array.from({ length: 60 }, (_, n) => ({ name: 'Fictif ' + n, duration: 30, price: 50 }));
  expect((await f.put({ ifVersion: native.versionId, services })).status).toBe(200);
  const before = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: before.version.id, serviceAdd: newService })).status).toBe(409);
  expect(currentTheme(f.pid)).toEqual(before);
});

it('an implicit block order stays implicit; targeted addition/removal preserve all remaining keys', async () => {
  const f = await fixture(), spec = structuredClone(currentTheme(f.pid)!.spec), section = rdvSection(spec)!.section;
  delete section.block_order; saveThemeVersion(f.pid, spec, 'Ordre natif implicite', 'user');
  const before = currentTheme(f.pid)!;
  expect((await f.put({ ifVersion: before.version.id, serviceAdd: newService })).status).toBe(200);
  const added = currentTheme(f.pid)!; expect(rdvSection(added.spec)!.section.block_order).toBeUndefined();
  expect((await f.put({ ifVersion: added.version.id, serviceRemove: { id: 'soin-exact' } })).status).toBe(200);
  expect(currentTheme(f.pid)!.spec).toEqual(before.spec);
});
