/** Resolve a read-only calendar day once, in the exact native timezone, never on refresh. */
export const BOOKING_READ_DATE_PATTERN = "(?:\\d{4}-\\d{2}-\\d{2}|aujourd[’']hui|demain|apr[èe]s-demain)";
export type BookingReadDateResolution={expression:'aujourd’hui'|'demain'|'après-demain';date:string;timezone:string;resolvedAt:number;policy:'fixed_at_request_not_reinterpreted_on_refresh'};
const realDate=(date:string)=>{const n=Date.parse(date+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===date;};
export function resolveBookingReadDate(token:string,timezone:string,at:number):{date:string;dateResolution?:BookingReadDateResolution}|null{
 if(/^\d{4}-\d{2}-\d{2}$/.test(token))return realDate(token)?{date:token}:null;
 const normalized=token.toLowerCase().replaceAll("'",'’').replace('apres-','après-'),offset=normalized==='aujourd’hui'?0:normalized==='demain'?1:normalized==='après-demain'?2:null;
 if(offset===null||typeof timezone!=='string'||!timezone||!Number.isFinite(at))return null;
 try{
  const parts=new Intl.DateTimeFormat('en',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at),part=(name:string)=>parts.find(p=>p.type===name)?.value;
  const today=`${part('year')}-${part('month')}-${part('day')}`;if(!realDate(today))return null;
  const date=new Date(Date.parse(today+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);if(!realDate(date))return null;
  return{date,dateResolution:{expression:normalized as BookingReadDateResolution['expression'],date,timezone,resolvedAt:at,policy:'fixed_at_request_not_reinterpreted_on_refresh'}};
 }catch{return null;}
}
