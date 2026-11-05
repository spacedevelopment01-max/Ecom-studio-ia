/** Read-only native move preview and exact acquired binding, never a speculative UPDATE/rollback. */
import {z} from 'zod';
import {HttpError} from '../auth';
import {all,readSnapshot,tx} from '../db';
import {stableHash} from '../brain/hash';
import {proMove,type RdvKind} from '../rendez-vous';
import * as salon from '../salon/booking';
import * as cabinet from '../cabinet/booking';
import * as restaurant from '../restaurant/booking';
import {bookingCancelInput,readExactNativeBookingSnapshot,type BookingCancelSnapshot,type BookingCancelSummary} from './booking-cancel';
export const bookingMoveInput=z.object({number:bookingCancelInput.shape.number,date:bookingCancelInput.shape.date.unwrap(),time:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),staff:z.string().min(1).max(64).optional(),party:z.number().int().min(1).max(60).optional()}).strict();
type Input=z.infer<typeof bookingMoveInput>;
type Row=Record<string,unknown>;
export type BookingMoveSummary=BookingCancelSummary&{modality:string|null};
export type BookingMovePreview={before:BookingCancelSnapshot;beforeBooking:BookingMoveSummary;after:BookingMoveSummary;input:Input;noOp:boolean};
const tables:Record<RdvKind,string>={salon:'salon_appointments',cabinet:'cabinet_appointments',restaurant:'restaurant_reservations'};
const fp=(value:unknown)=>stableHash('native-booking-move-1',value);
function rowOf(projectId:string,binding:BookingCancelSnapshot):Row{
 const rows=all<Row>(`SELECT * FROM ${tables[binding.kind]} WHERE project_id=? AND number=? LIMIT 2`,projectId,binding.booking.number);
 if(rows.length!==1)throw new HttpError(409,'Réservation native absente ou ambiguë. Aucun déplacement.','booking_move_conflict');return rows[0];
}
const summary=(native:BookingCancelSnapshot,row:Row):BookingMoveSummary=>({...native.booking,modality:native.kind==='cabinet'?String(row.modality??''):null});
function nativeError(error:unknown):never{
 if(error instanceof HttpError)throw error;
 if(error&&typeof error==='object'&&'code' in error&&'status' in error){const code=String(error.code),status=Number(error.status);if(status>=400&&status<500)throw new HttpError(status===404?409:status,code==='not_movable'?'Une place d’atelier ne se déplace pas. Aucune annulation ou nouvelle réservation automatique.':'La cible n’est pas disponible selon le moteur natif. Relisez le planning ; aucune autre réservation substituée.','booking_move_'+code);}
 throw error;
}
export function previewNativeBookingMove(projectId:string,raw:unknown):BookingMovePreview{
 return readSnapshot(()=>{
  const parsed=bookingMoveInput.parse(raw),before=readExactNativeBookingSnapshot(projectId,{number:parsed.number});
  if(before.booking.status!=='confirmed')throw new HttpError(409,'Cette réservation est annulée. Aucun déplacement.','booking_move_conflict');
  if(before.kind==='salon'&&parsed.party!==undefined||before.kind==='cabinet'&&(parsed.staff!==undefined||parsed.party!==undefined)||before.kind==='restaurant'&&parsed.staff!==undefined)throw new HttpError(400,'Ce champ ne fait pas partie de ce type de réservation. Aucun réglage substitué.','booking_move_scope');
  const input={...parsed,number:before.booking.number},row=rowOf(projectId,before),beforeBooking=summary(before,row),after={...beforeBooking,untrustedMetadata:{...beforeBooking.untrustedMetadata}};
  try{
   if(before.kind==='salon'){const target=salon.previewProMoveAppointment(projectId,input.number,input);after.date=target.date;after.start=target.time;after.end=target.end;after.untrustedMetadata.staffId=target.staffId;}
   else if(before.kind==='cabinet'){const target=cabinet.previewProMoveAppointment(projectId,input.number,input);after.date=target.date;after.start=target.time;after.end=target.end;after.modality=target.modality;}
   else{const target=restaurant.previewProModifyReservation(projectId,input.number,input);after.date=target.date;after.start=target.time;after.party=target.party;}
  }catch(error){nativeError(error);}
  return{before,beforeBooking,after,input,noOp:fp(beforeBooking)===fp(after)};
 });
}
export function moveExactNativeBooking(projectId:string,expected:BookingMovePreview):BookingMoveSummary{
 return tx(()=>{
  const fresh=previewNativeBookingMove(projectId,expected.input),a=fresh.before,b=expected.before;
  if(fresh.noOp||a.kind!==b.kind||a.sourceVersionId!==b.sourceVersionId||a.sourceFingerprint!==b.sourceFingerprint||a.bookingFingerprint!==b.bookingFingerprint||fp(fresh.after)!==fp(expected.after))throw new HttpError(409,'La réservation, le planning ou l’aperçu a changé. Relisez avant un nouvel accord.','booking_move_conflict');
  const row=rowOf(projectId,a);
  try{proMove(projectId,a.kind,a.booking.number,fresh.input);}catch(error){nativeError(error);}
  const result=readExactNativeBookingSnapshot(projectId,{number:a.booking.number}),afterRow=rowOf(projectId,result),after=summary(result,afterRow),allowed=a.kind==='salon'?['date','start_min','end_min','staff','updated_at']:a.kind==='cabinet'?['date','start_min','end_min','updated_at']:['date','time','party','updated_at'],unchanged=(value:Row)=>Object.fromEntries(Object.entries(value).filter(([key])=>!allowed.includes(key)));
  if(result.kind!==a.kind||result.sourceVersionId!==a.sourceVersionId||result.sourceFingerprint!==a.sourceFingerprint||fp(after)!==fp(expected.after)||fp(unchanged(afterRow))!==fp(unchanged(row)))throw new HttpError(409,'Déplacement natif non confirmé. Aucune réussite annoncée.','booking_move_unconfirmed');
  return after;
 });
}
