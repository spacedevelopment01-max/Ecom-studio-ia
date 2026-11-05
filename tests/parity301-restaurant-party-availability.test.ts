import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { account, emptySpend, project } from './conversation209-fixtures';
import { serviceSpec } from './fixtures';
import { all } from '@/lib/db';
import { currentTheme, saveThemeVersion } from '@/lib/projects';
import { rdvSection } from '@/lib/rendez-vous';
import { availability, bookedCovers, core, createReservation, restaurantOf } from '@/lib/restaurant/booking';
import { GET } from '@/app/api/public/restaurant/[projectId]/[[...path]]/route';

const at = Date.parse('2026-11-05T08:00:00Z'), date = '2026-11-10';
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); })); });
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function fixture(capacity = 24, max = 6) {
  const u = await account(), pid = project(u, 'services'), spec = serviceSpec('table-saison');
  // Isolated theme fixture only; never activate a real project or send a notification.
  Object.assign(rdvSection(spec)!.section.settings, { booking_mode: 'live', open_days: '0,1,2,3,4,5,6', lunch_slots: '12:00, 12:30', dinner_slots: '19:00', min_party: 2, max_party: max, capacity });
  saveThemeVersion(pid, spec, 'Restaurant fictif isolé', 'user'); bookedCovers(pid, date);
  return { pid, config: restaurantOf(pid).config };
}

it.each([1, 7, 0, -2, 2.5, NaN, Infinity])('an invalid party %s must receive no slots from the shared native engine', async party => {
  const f = await fixture(), rows = all('SELECT * FROM restaurant_reservations WHERE project_id=?', f.pid), before = currentTheme(f.pid), spend = emptySpend();
  expect(core.slotsFor(f.config, date, party, {}, at)).toEqual([]);
  expect(availability(f.pid, date, party, at).services).toEqual([]);
  expect(all('SELECT * FROM restaurant_reservations WHERE project_id=?', f.pid)).toEqual(rows); expect(currentTheme(f.pid)).toEqual(before); expect(emptySpend()).toEqual(spend);
});

it.each([2.5, 4.5])('native creation rejects fractional party %s instead of storing a number larger than its validated integer', async party => {
  const f = await fixture(4, 4), before = all('SELECT party FROM restaurant_reservations WHERE project_id=?', f.pid);
  let error: unknown;
  try { createReservation(f.pid, { party, date, time: '12:00', firstName: 'Alex', lastName: 'Fictif', email: 'fictif@example.invalid', terms: true }, at); }
  catch (caught) { error = caught; }
  expect(all('SELECT party FROM restaurant_reservations WHERE project_id=?', f.pid)).toEqual(before);
  expect(error).toMatchObject({ code: 'invalid', status: 400 });
});

it.each(['1', '7', '2.5', 'invalid'])('real public availability HTTP never advertises slots for invalid party=%s', async party => {
  const f = await fixture(), before = all('SELECT * FROM restaurant_reservations WHERE project_id=?', f.pid);
  vi.spyOn(Date, 'now').mockReturnValue(at);
  const r = await GET(new Request(`http://localhost/api/public/restaurant/${f.pid}/availability?date=${date}&party=${party}`), { params: Promise.resolve({ projectId: f.pid, path: ['availability'] }) });
  expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ services: [] }); expect(all('SELECT * FROM restaurant_reservations WHERE project_id=?', f.pid)).toEqual(before);
});

it('valid integer groups retain native capacity and the existing numeric-string shared-core compatibility', async () => {
  const f = await fixture(6, 6);
  const available = core.slotsFor(f.config, date, 2, { '12:00': 4 }, at);
  expect(available[0].slots[0]).toMatchObject({ time: '12:00', available: true });
  expect(core.slotsFor(f.config, date, 3, { '12:00': 4 }, at)[0].slots[0]).toMatchObject({ available: false, reason: 'full' });
  expect(core.slotsFor(f.config, date, 6, {}, at)[0].slots[0].available).toBe(true);
  // The browser may restore a numeric string from its draft; avoid string concatenation with occupied covers.
  expect(core.slotsFor(f.config, date, '2' as never, { '12:00': 4 }, at)[0].slots[0]).toMatchObject({ available: true });
  expect(core.validate(f.config, { party: '2', date, time: '12:00' }, {}, at)).toEqual([]);
});
