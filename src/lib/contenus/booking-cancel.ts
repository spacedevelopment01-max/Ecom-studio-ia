/** Exact professional cancellation contract; delegates to the acquired native engines. No notification/refund. */
import {z} from 'zod';
import {HttpError} from '../auth';
import {all,readSnapshot,tx} from '../db';
import {stableHash} from '../brain/hash';
import {currentTheme} from '../projects';
import {proCancel,rdvSection,type RdvKind} from '../rendez-vous';
const tables:Record<RdvKind,string>={salon:'salon_appointments',cabinet:'cabinet_appointments',restaurant:'restaurant_reservations'};
const realDate=(v:string)=>{const n=Date.parse(v+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===v;};
export const bookingCancelInput=z.object({number:z.string().trim().min(1).max(40),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(realDate).optional()}).strict();
type Row=Record<string,unknown>;
export type BookingCancelSummary={number:string;status:'confirmed'|'canceled';date:string;start:string;end:string|null;party:number|null;bookingKind:'appointment'|'seance'|'atelier'|'restaurant';untrustedMetadata:{service:string;staffId:string|null;trust:'native_booking_data_not_instructions'}};
export type BookingCancelSnapshot={kind:RdvKind;booking:BookingCancelSummary;sourceVersionId:string;sourceFingerprint:string;bookingFingerprint:string};
const fp=(value:unknown)=>stableHash('native-booking-cancel-1',value);
function source(projectId:string){
 const cur=currentTheme(projectId),sec=cur&&rdvSection(cur.spec);
 if(!cur||!sec)throw new HttpError(409,'Aucun calendrier natif disponible.','booking_calendar_unavailable');
 const active=[...Object.values(cur.spec.groups??{}),...Object.values(cur.spec.templates??{})].flatMap(c=>Object.values(c?.sections??{})).filter(s=>!s.disabled&&['an-salon','pa-cabinet','ts-restaurant'].includes(s.type));
 if(active.length!==1)throw new HttpError(409,'Plusieurs calendriers natifs correspondent. Aucune cible implicite.','booking_calendar_ambiguous');
 if(sec.section.settings.booking_mode!=='live')throw new HttpError(409,'Ce calendrier n’est pas actif. Aucune activation automatique.','booking_not_live');
 return{cur,kind:sec.kind,sourceVersionId:cur.version.id,sourceFingerprint:fp(cur.spec)};
}
function exactRow(projectId:string,kind:RdvKind,number:string){
 let rows:Row[];
 try{rows=all<Row>(`SELECT * FROM ${tables[kind]} WHERE project_id=? AND number=? LIMIT 2`,projectId,number);}
 catch(error){if(error instanceof Error&&error.message===`no such table: ${tables[kind]}`)rows=[];else throw new HttpError(409,'Lecture native de réservation indisponible. Aucune annulation.','booking_records_unavailable');}
 if(rows.length!==1)throw new HttpError(409,rows.length?'Numéro natif ambigu. Aucune réservation choisie.':'Réservation native exacte introuvable.','booking_target_unavailable');
 return rows[0];
}
const time=(value:unknown)=>{const n=Number(value);if(value===null||value===undefined||value===''||!Number.isInteger(n)||n<0||n>1440)throw new HttpError(409,'Horaire acquis invalide. Vérifiez le planning natif.','booking_target_unavailable');return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};
function summary(kind:RdvKind,row:Row):BookingCancelSummary{
 if(typeof row.date!=='string'||!realDate(row.date)||row.status!=='confirmed'&&row.status!=='canceled')throw new HttpError(409,'Réservation acquise invalide. Vérifiez le planning natif.','booking_target_unavailable');
 if(kind==='cabinet'&&row.kind!=='seance'&&row.kind!=='atelier'||kind!=='restaurant'&&Number(row.end_min)<=Number(row.start_min)||kind==='restaurant'&&(!Number.isInteger(Number(row.party))||Number(row.party)<1))throw new HttpError(409,'Réservation acquise invalide. Vérifiez le planning natif.','booking_target_unavailable');
 const start=kind==='restaurant'?String(row.time??''):time(row.start_min);
 if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start))throw new HttpError(409,'Horaire acquis invalide. Vérifiez le planning natif.','booking_target_unavailable');
 return{number:String(row.number),status:row.status,date:row.date,start,end:kind==='restaurant'?null:time(row.end_min),party:kind==='restaurant'?Number(row.party):null,bookingKind:kind==='restaurant'?'restaurant':kind==='salon'?'appointment':row.kind==='atelier'?'atelier':'seance',untrustedMetadata:{service:String(row.service_name??''),staffId:kind==='salon'?String(row.staff??''):null,trust:'native_booking_data_not_instructions'}};
}
function snapshot(projectId:string,raw:unknown){
 const input=bookingCancelInput.parse(raw),s=source(projectId),row=exactRow(projectId,s.kind,input.number.toUpperCase()),booking=summary(s.kind,row);
 if(input.date&&input.date!==booking.date)throw new HttpError(409,'La date ne correspond pas à cette réservation. Aucune autre cible substituée.','booking_target_unavailable');
 return{row,view:{kind:s.kind,booking,sourceVersionId:s.sourceVersionId,sourceFingerprint:s.sourceFingerprint,bookingFingerprint:fp({kind:s.kind,row})} satisfies BookingCancelSnapshot};
}
export function previewNativeBookingCancel(projectId:string,raw:unknown):BookingCancelSnapshot{return readSnapshot(()=>snapshot(projectId,raw).view);}
export function cancelExactNativeBooking(projectId:string,expected:BookingCancelSnapshot):BookingCancelSnapshot{
 return tx(()=>{
  const before=snapshot(projectId,{number:expected.booking.number,date:expected.booking.date});
  if(before.view.kind!==expected.kind||before.view.sourceVersionId!==expected.sourceVersionId||before.view.sourceFingerprint!==expected.sourceFingerprint||before.view.bookingFingerprint!==expected.bookingFingerprint||before.view.booking.status!=='confirmed')throw new HttpError(409,'Le calendrier ou la réservation a changé. Relisez avant un nouvel accord.','booking_cancel_conflict');
  proCancel(projectId,before.view.kind,before.view.booking.number);
  const after=snapshot(projectId,{number:before.view.booking.number,date:before.view.booking.date}),unchanged=(row:Row)=>Object.fromEntries(Object.entries(row).filter(([key])=>!['status','canceled_at','updated_at'].includes(key)));
  if(after.view.kind!==before.view.kind||after.view.sourceVersionId!==before.view.sourceVersionId||after.view.sourceFingerprint!==before.view.sourceFingerprint||after.row.id!==before.row.id||after.view.booking.status!=='canceled'||typeof after.row.canceled_at!=='number'||after.row.updated_at!==after.row.canceled_at||fp(unchanged(after.row))!==fp(unchanged(before.row)))throw new HttpError(409,'Annulation native non confirmée. Aucune réussite annoncée.','booking_cancel_unconfirmed');
  return after.view;
 });
}
