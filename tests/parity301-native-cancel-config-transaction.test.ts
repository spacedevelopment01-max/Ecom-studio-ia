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
  Object.assign(sec.settings, { booking_mode: 'live', cancel_hours:0, timezone: 'Europe/Paris', hours_thu: '09:00-12:00', hours_fri: '09:00-12:00', slot_step: 30, capacity: 6, min_party: 1, max_party: 6, open_days: '0,1,2,3,4,5,6', lunch_slots: '12:00', dinner_slots: '19:00' });
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

for(const kind of ['salon','cabinet'] as const)for(const change of ['cancel-policy','demo'] as const)it(`${kind} client cancellation uses the configuration committed before its write lock: ${change}`,async()=>{
 const f=await fixture(kind),booking=f.create(originalDate),before=f.rows(),spend=emptySpend();let publishedVersion=currentTheme(f.pid);
 const published=publishBeforeWrite(()=>{const spec=structuredClone(currentTheme(f.pid)!.spec),s=rdvSection(spec)!.section;if(change==='demo')s.settings.booking_mode='demo';else s.settings.cancel_hours=72;saveThemeVersion(f.pid,spec,'Nouvelle règle acquise','user');publishedVersion=currentTheme(f.pid);});
 const insideDeadline=Date.parse('2026-11-18T08:00:00Z');let error:unknown;try{if(kind==='salon')salon.cancelAppointment(f.pid,booking.token,booking.record.number,insideDeadline);else cabinet.cancelAppointment(f.pid,booking.token,insideDeadline);}catch(e){error=e;}
 expect(published()).toBe(true);expect(f.rows()).toEqual(before);expect(error).toMatchObject(change==='demo'?{code:'not_live',status:403}:{code:'too_late',status:409});expect(currentTheme(f.pid)).toEqual(publishedVersion);expect(emptySpend()).toEqual(spend);
});
it('restaurant client cancellation respects demo mode committed before its write lock',async()=>{const f=await fixture('restaurant'),booking=f.create(originalDate),before=f.rows();let source=currentTheme(f.pid);const published=publishBeforeWrite(()=>{const spec=structuredClone(currentTheme(f.pid)!.spec);rdvSection(spec)!.section.settings.booking_mode='demo';saveThemeVersion(f.pid,spec,'Mode acquis','user');source=currentTheme(f.pid);});let error:unknown;try{restaurant.cancelReservation(f.pid,booking.record.number,booking.token,at);}catch(e){error=e;}expect(published()).toBe(true);expect(f.rows()).toEqual(before);expect(error).toMatchObject({code:'not_live',status:403});expect(currentTheme(f.pid)).toEqual(source);});
