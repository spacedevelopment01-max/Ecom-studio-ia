/** Construction pure de la demande native de retouche, sans routage, droit, dépense ou génération. */
import type {MediaUsage} from "../ai/media-routing";
export type PhotoEditInput={image:Buffer;instruction:string;aspect:'1:1'|'4:5'|'9:16'|'16:9';usage?:MediaUsage;style?:Buffer;product?:Buffer;peoplePolicy?:'none';/** Préparé par le moteur natif, jamais un paramètre du client HTTP. */preparedPrompt?:string};
export function photoEditText(instruction:string,aspect:string,options:{style?:boolean;product?:boolean;peoplePolicy?:'none'}={}){
 return editPhotoPrompt(instruction,aspect,options.peoplePolicy)+(options.style?'\nLa référence de style fournit uniquement la palette du décor et la lumière. Ne pas en recopier les objets, le produit, les inscriptions ou des personnes. Le produit de la source garde ses couleurs réelles.':'')+(options.product?'\nLa référence produit montre le véritable article : conserver sa forme, ses matières, sa couleur, ses détails et ses inscriptions ; elle ne remplace pas la scène source à retoucher.':'');
}
/** La même requête native sert au devis et à la retouche ; aucune référence essentielle retirée. */
export function photoEditRequest(input:PhotoEditInput){
 const references:{role:'scene'|'style'|'product';data:Buffer;essential:true}[]=[{role:'scene',data:input.image,essential:true},...(input.style?[{role:'style' as const,data:input.style,essential:true as const}]:[]),...(input.product?[{role:'product' as const,data:input.product,essential:true as const}]:[])];
 const text=input.preparedPrompt??photoEditText(input.instruction,input.aspect,{style:!!input.style,product:!!input.product,peoplePolicy:input.peoplePolicy});
 return{text,aspect:input.aspect,reference:null,references,quality:'high' as const,strictQuality:input.peoplePolicy==='none'||!!input.preparedPrompt,usage:input.usage??'ad_visual' as const,...(input.peoplePolicy==='none'?{need:{people:false}}:{})};
}

export function editPhotoPrompt(instruction: string, aspect: string,peoplePolicy?:'none'): string {
  return `Retoucher la photographie source jointe. Modification exacte demandée par le client, à ne pas écrire sur l'image :\n${instruction}\nFin de la demande exacte.
Appliquer seulement cette modification. Garder tout le reste exactement comme c'est : même cadrage et même composition, même angle de prise de vue, même lumière et mêmes couleurs, et le même produit (forme, proportions, couleurs, matières, détails, étiquette et inscriptions), entier dans le cadre, sauf si le client demande explicitement de le changer.
N'ajouter aucun texte, aucune lettre, aucune légende, aucun filigrane, aucun logo ni prix. ${peoplePolicy==='none'?'Aucune personne, main, silhouette ou visage, même si une autre consigne le demande : ce parcours ne garantit pas encore une identité fournie.':"N'ajouter ni personne, ni main, ni visage sauf si le client le demande."} Résultat photoréaliste. Format ${aspect}.`;
}
