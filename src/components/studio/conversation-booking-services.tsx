"use client";
import {nativeLocalEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {useT} from '../i18n';
/** #408 : lecture seule de la configuration native des services réservables ; aucun bouton de modification ni de réservation. */
export const handlesBookingServices=(v:ConversationView)=>v.bookingServicesRead?.enabled===true&&nativeLocalEditAllowed(v)&&v.bookingServices?.schema==='syna-booking-services-read-1'&&v.bookingServices.readOnly===true;
const euros=(n:number,lang:'fr'|'en')=>new Intl.NumberFormat(lang==='fr'?'fr-FR':'en-GB',{style:'currency',currency:'EUR',maximumFractionDigits:n%1?2:0}).format(n);
export function ConversationBookingServices({view}:{view:ConversationView}){
 const t=useT(),x=view.bookingServices;if(!handlesBookingServices(view)||!x)return null;
 const lang=t('fr','en') as 'fr'|'en';
 const href=view.projectId&&x.nativeHref===`/studio/${view.projectId}/rendez-vous`?x.nativeHref:null;
 return <section aria-label={t('Services réservables — lecture seule','Bookable services — read-only')} data-syna-booking-services={x.state} className="rounded-2xl border border-line bg-paper-2 p-4 text-sm">
  <p className="font-semibold">{t('Lecture seule — 0 €','Read-only — €0')}</p><p className="mt-2 whitespace-pre-wrap break-words">{x.message}</p>
  {x.state==='listed'&&<><p className="mt-3 text-xs text-muted">{x.rows?.length??0} {t('affichés sur','shown out of')} {x.total??0} · {x.bookingMode==='live'?t('Réservation en ligne active','Online booking live'):t('Réservation en démonstration','Booking in demo mode')}</p>
   {x.truncated&&<p className="mt-1 text-xs text-muted">{t('Liste limitée à 20 services. Ouvrez Rendez-vous pour la suite.','Limited to 20 services. Open Appointments for the rest.')}</p>}
   {x.rows&&x.rows.length>0?<ul className="mt-3 space-y-2">{x.rows.map(r=><li key={r.id} data-syna-booking-service={r.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-line bg-card p-3"><span className="min-w-0 whitespace-pre-wrap break-words font-medium">{r.untrustedMetadata.name}</span><span className="text-xs text-muted">{[r.durationMinutes!=null?`${r.durationMinutes} min`:null,r.priceEur!=null?(r.priceFrom?t('à partir de ','from '):'')+euros(r.priceEur,lang):t('prix non renseigné','price not set')].filter(Boolean).join(' · ')}</span></li>)}</ul>
   :<p className="mt-3 text-xs text-muted">{t('Aucun service réservable configuré.','No bookable service configured.')}</p>}
   <p className="mt-3 text-xs text-muted">{t('Configuration de la réservation, distincte du profil d’activité. Aucun rendez-vous créé, aucune disponibilité en temps réel vérifiée.','Booking configuration, separate from the business profile. No appointment created, no real-time availability checked.')}</p>
   {href&&<a href={href} className="mt-2 inline-flex min-h-11 items-center text-xs underline">{t('Ouvrir Rendez-vous','Open Appointments')}</a>}
  </>}
 </section>;
}
