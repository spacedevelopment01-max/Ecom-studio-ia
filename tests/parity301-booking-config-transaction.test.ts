import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { account, project, emptySpend } from './conversation209-fixtures';
import { serviceSpec } from './fixtures';
import * as db from '@/lib/db';
import { currentTheme, saveThemeVersion } from '@/lib/projects';
import { savePrestations } from '@/lib/contenus/prestations';
import { rdvSection, listBookings, type RdvKind } from '@/lib/rendez-vous';
import * as salon from '@/lib/salon/booking';
import * as cabinet from '@/lib/cabinet/booking';
import * as restaurant from '@/lib/restaurant/booking';

const at = Date.parse('2026-11-05T08:00:00Z'), date = '2026-11-20', originalDate = '2026-11-19';
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => { throw Error('NO_PROVIDER'); })); vi.spyOn(Date, 'now').mockReturnValue(at); });
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function fixture(kind: RdvKind) {
  const u = await account(), pid = project(u, 'services'), spec = serviceSpec(({ salon: 'atelier-nuance', cabinet: 'parenthese', restaurant: 'table-saison' }[kind]) as never), sec = rdvSection(spec)!.section;
  sec.blocks = {}; sec.block_order = [];
  if (kind !== 'restaurant') { sec.blocks.service = { type: kind === 'salon' ? 'service' : 'seance', settings: { service_id: 'diagnostic', seance_id: 'diagnostic', name: 'Diagnostic fictif', duration: 30, price: 50, category: 'coupe', modes: 'cabinet' } }; sec.block_order.push('service'); }
  if (kind === 'salon') { sec.blocks.member = { type: 'member', settings: { member_id: 'alex', name: 'Alex fictif', skills: '', days: '' } }; sec.block_order.push('member'); }
  if (kind === 'cabinet') { sec.blocks.atelier = { type: 'atelier', settings: { atelier_id: 'atelier', title: 'Atelier fictif', date, time: '10:00', duration: 60, price: 25, capacity: 2 } }; sec.block_order.push('atelier'); }
  Object.assign(sec.settings, { booking_mode: 'live', timezone: 'Europe/Paris', hours_thu: '09:00-12:00', hours_fri: '09:00-12:00', slot_step: 30, capacity: 6, min_party: 1, max_party: 6, open_days: '0,1,2,3,4,5,6', lunch_slots: '12:00', dinner_slots: '19:00' });
  saveThemeVersion(pid, spec, 'Planning fictif isolé', 'user'); listBookings(pid, kind, originalDate, date);
  const contact = { firstName: 'Alex', lastName: 'Fictif', email: 'fictif@example.invalid', phone: '0000000000', terms: true };
  function create(day = date) {
    if (kind === 'salon') { const r = salon.createAppointment(pid, { ...contact, date: day, time: '09:00', service: 'diagnostic', staff: 'alex' }, at); return { record: r.appointment, token: r.clientToken! }; }
    if (kind === 'cabinet') { const r = cabinet.createAppointment(pid, { ...contact, kind: 'seance', date: day, time: '09:00', service: 'diagnostic', modality: 'cabinet' }, at); return { record: r.appointment, token: r.token! }; }
    const r = restaurant.createReservation(pid, { ...contact, date: day, time: '12:00', party: 4 }, at); return { record: r.reservation, token: r.token! };
  }
  const rows = () => db.all<Record<string, unknown>>(`SELECT * FROM ${kind === 'restaurant' ? 'restaurant_reservations' : kind + '_appointments'} WHERE project_id=? ORDER BY id`, pid);
  return { pid, kind, create, rows, contact };
}

/** Real native source publication committed immediately before the booking's write transaction starts.
 * Only scheduling is intercepted: validators, configuration reads, tokens and SQL remain real. */
function publishBeforeWrite(publish: () => void) {
  const original = db.tx; let published = false;
  function interleaved<T>(fn: () => T): T {
    if (!published) { published = true; original(() => publish()); }
    return original(fn);
  }
  vi.spyOn(db, 'tx').mockImplementation(interleaved);
  return () => published;
}

for (const kind of ['salon', 'cabinet', 'restaurant'] as const) {
  for (const action of ['create', 'public-move', 'owner-move'] as const) {
    it(`${kind} ${action}: a newly published closure must be authoritative inside the booking transaction`, async () => {
      const f = await fixture(kind), existing = action === 'create' ? null : f.create(originalDate);
      if (action === 'public-move') expect(existing!.token).toBeTruthy();
      const before = f.rows(), version = currentTheme(f.pid)!, spend = emptySpend(), published = publishBeforeWrite(() => { savePrestations(f.pid, { closures: date }); });
      let error: unknown;
      try {
        if (action === 'create') f.create();
        else if (kind === 'salon') {
          if (action === 'public-move') salon.moveAppointment(f.pid, existing!.token, existing!.record.number, { date, time: '09:00' }, at);
          else salon.proMoveAppointment(f.pid, existing!.record.number, { date, time: '09:00' }, at);
        } else if (kind === 'cabinet') {
          if (action === 'public-move') cabinet.moveAppointment(f.pid, existing!.token, { date, time: '09:00' }, at);
          else cabinet.proMoveAppointment(f.pid, existing!.record.number, { date, time: '09:00' }, at);
        } else if (action === 'public-move') restaurant.modifyReservation(f.pid, existing!.record.number, existing!.token, { date, time: '12:00' }, at);
        else restaurant.proModifyReservation(f.pid, existing!.record.number, { date, time: '12:00' }, at);
      } catch (caught) { error = caught; }
      expect(published()).toBe(true);
      expect(f.rows().map(r => r.date)).toEqual(before.map(r => r.date));
      expect(error).toBeInstanceOf(Error); expect(['invalid', 'unavailable']).toContain((error as { code: string }).code);
      expect(f.rows()).toEqual(before); expect(currentTheme(f.pid)!.version.number).toBe(version.version.number + 1); expect(rdvSection(currentTheme(f.pid)!.spec)!.section.settings.closures).toBe(date); expect(emptySpend()).toEqual(spend);
    });
  }
}

it('restaurant creation cannot overbook a capacity reduced before its write lock', async () => {
  const f = await fixture('restaurant'), published = publishBeforeWrite(() => { savePrestations(f.pid, { restaurantCapacityPatch: { capacity: 2 } }); });
  let error: unknown; try { f.create(); } catch (caught) { error = caught; }
  expect(published()).toBe(true); expect(f.rows().map(r => r.party)).toEqual([]); expect(error).toMatchObject({ code: 'unavailable', status: 409 }); expect(restaurant.restaurantOf(f.pid).config.capacity).toBe(2);
});

it('cabinet workshop enrolment cannot overbook a capacity reduced before its write lock', async () => {
  const f = await fixture('cabinet'); cabinet.createAppointment(f.pid, { ...f.contact, kind: 'atelier', service: 'atelier', modality: 'cabinet', date, time: '10:00' }, at);
  const before = f.rows(), published = publishBeforeWrite(() => { const spec = structuredClone(currentTheme(f.pid)!.spec); rdvSection(spec)!.section.blocks!.atelier.settings.capacity = 1; saveThemeVersion(f.pid, spec, 'Capacité native réduite', 'user'); });
  let error: unknown; try { cabinet.createAppointment(f.pid, { ...f.contact, email: 'autre-fictif@example.invalid', kind: 'atelier', service: 'atelier', modality: 'cabinet', date, time: '10:00' }, at); } catch (caught) { error = caught; }
  expect(published()).toBe(true); expect(f.rows().length).toBe(before.length); expect(f.rows()).toEqual(before); expect(error).toMatchObject({ code: 'full', status: 409 }); expect(cabinet.cabinetOf(f.pid).config.ateliers[0].capacity).toBe(1);
});
