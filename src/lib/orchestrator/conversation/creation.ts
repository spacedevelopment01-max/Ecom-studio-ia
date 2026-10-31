/** Proposition de formulaire pour l'API de création existante ; cette couche ne crée ni projet ni abonnement. */
import { StartInput, serviceProfileFromInput } from "../../project-start";
import { contactModesOf } from "../../project-types";
import { stableHash } from "../../brain/hash";
import { L } from "../../i18n-server";
import type { Brief, Input } from "../../preparation/types";
import type { ConversationState } from "./contract";
import type {ServiceProfile} from "../../project-types";
const serviceData=(s:ServiceProfile)=>({...s,services:s.services.map(s=>({name:s.name,description:s.description,price:s.price??"",duration:s.duration??""})),contactModes:contactModesOf(s)});
export const sameServiceData=(a:ServiceProfile,b:ServiceProfile)=>stableHash("conversation-native-services",serviceData(a))===stableHash("conversation-native-services",serviceData(b));
export function creationFields(b: Brief, m: ConversationState) {
  if (!m.business || !b.input.description) return { available: false as const, reason: L("Précisez l’activité avant la création définitive.", "Clarify the activity before final creation.") };
  const i=b.input,s=b.services;
  const fields:Record<string,string>={flow:"preparation",businessType:m.business,description:i.description,productName:i.offerName,brandName:i.brandName,target:i.target,request:i.constraints,price:i.price,link:i.offerUrl??"",services:JSON.stringify(s.services),area:s.area,address:s.address,phone:s.phone,email:s.email,hours:s.hours,bookingUrl:s.bookingUrl,contactMode:s.contactMode,contactModes:contactModesOf(s).join(","),videos:"none"};
  const parsed=StartInput.safeParse(fields);
  if(!parsed.success)return{available:false as const,reason:L("Une donnée dépasse les limites de la création existante. Corrigez-la ; aucun contenu n’est tronqué.","A value exceeds the existing creation limits. Correct it; no content is truncated.")};
  try{serviceProfileFromInput(parsed.data);}catch{return{available:false as const,reason:L("Les prestations ou coordonnées doivent être corrigées avant création.","Services or contact details must be corrected before creation.")};}
  return{available:true as const,endpoint:"/api/projects" as const,method:"POST" as const,format:"multipart" as const,fields,confirmationRequired:true as const};
}
/** Seules les données que l'API existante vient de créer peuvent être enrichies par le brouillon correspondant. */
export function sameCreationInput(a:Input,b:Input){
  const comparable=(i:Input)=>({business:i.business,description:i.description,offerName:i.offerName,brandName:i.brandName,target:i.target,constraints:i.constraints,price:i.price,offerUrl:i.offerUrl??"",services:serviceData(i.services)});
  return stableHash("conversation-native-creation",comparable(a))===stableHash("conversation-native-creation",comparable(b));
}
