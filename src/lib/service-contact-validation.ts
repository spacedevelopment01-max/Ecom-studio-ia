/** Same scalar contact validation for the native Activity form and exact free conversation edits. */
import {HttpError} from './auth';
import {L} from './i18n-server';
export const SERVICE_CONTACT_LIMITS={area:300,phone:40,email:160} as const;
export type ServiceContactField=keyof typeof SERVICE_CONTACT_LIMITS;
export function checkedServiceContact(field:ServiceContactField,value:string):string{
 if(typeof value!=='string'||value.length>SERVICE_CONTACT_LIMITS[field])throw new HttpError(400,L('Coordonnée trop longue pour le champ natif.','Contact value exceeds the native field limit.'));
 const text=value.trim();if(field==='email'&&text&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))throw new HttpError(400,L('Adresse e-mail invalide.','Invalid email address.'));
 return text;
}
