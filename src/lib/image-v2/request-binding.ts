/** Références natives figées d'une demande : aucune sélection par position ni reprise du premier produit. */
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {HttpError} from '../auth';
import {assetData,getAsset} from '../library';
import {canonicalJSON} from '../brain/hash';
import {getProduct} from '../products/catalog';
import {emptyProduct} from '../project-types';
import type {Project} from '../projects';
import {stripTags} from '../blog-html';
import {L} from '../i18n-server';
import {loadWordingRules} from '../client-wording';
import {isAutoUsable} from '../quality/usable';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const ImageAssetPinSchema=z.object({assetId:key,version:z.number().int().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const ImageBindingSchema=z.object({
 schema:z.literal(1),
 product:z.object({productId:key,version:z.number().int().positive(),variant:z.object({variantId:key,version:z.number().int().positive()}).strict().optional()}).strict().optional(),
 service:z.object({key,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict().optional(),
 references:z.array(ImageAssetPinSchema).max(1),people:z.literal('none'),
 edit:z.object({source:ImageAssetPinSchema,style:ImageAssetPinSchema.optional()}).strict().optional(),
}).strict().superRefine((v,c)=>{if(v.product&&v.service)c.addIssue({code:'custom',message:'Une seule offre cible.'});});
export type ImageBinding=z.infer<typeof ImageBindingSchema>;
export const imageBindingHash=(v:unknown)=>createHash('sha256').update(canonicalJSON(v)).digest('hex');
export function pinImageAsset(userId:string,projectId:string,assetId:string,version:number){
 return pinOwnedImage(userId,projectId,assetId,version,false);
}
/** Lecture d'un essai rejeté uniquement : aucun assouplissement de pinImageAsset ni de la réutilisation. */
export function pinImageDiagnostic(userId:string,projectId:string,assetId:string,version:number){
 const a=getAsset(assetId),meta=JSON.parse(a?.meta||'{}');
 if(!a||a.status!=='rejected'||!meta.imageV2?.briefHash?.startsWith('trial:')||meta.imageV2.verdict==='FINAL'||meta.gate?.verdict==='FINAL')throw new HttpError(404,L('Essai de diagnostic introuvable.','Diagnostic trial not found.'));
 return pinOwnedImage(userId,projectId,assetId,version,true);
}
function pinOwnedImage(userId:string,projectId:string,assetId:string,version:number,diagnostic:boolean){
 const a=getAsset(assetId);
 if(!a||a.user_id!==userId||a.project_id!==projectId||a.deleted_at||(!diagnostic&&a.status==='rejected')||a.kind!=='image'||!['image/png','image/jpeg','image/webp'].includes(a.mime))throw new HttpError(404,L('Image autorisée introuvable.','Authorized image not found.'));
 if(a.version!==version)throw new HttpError(409,L('Cette image a changé. Désignez sa version actuelle.','This image changed. Select its current version.'));
 let bytes:Buffer;try{bytes=assetData(a);}catch{throw new HttpError(409,L('Le fichier de référence manque. Aucun appel lancé.','Reference file is missing. No request started.'));}if(!bytes.length)throw new HttpError(409,L('La référence image est vide. Aucun appel lancé.','Image reference is empty. No request started.'));
 return{assetId:a.id,version:a.version,sha256:createHash('sha256').update(bytes).digest('hex')};
}
/** L'acquis annoncé au devis reste LE fichier réutilisé ; une autre version ne le remplace pas. */
export function boundReusableImage(p:Project,briefHash:string,pin:z.infer<typeof ImageAssetPinSchema>){
 if(imageBindingHash(pinImageAsset(p.userId,p.id,pin.assetId,pin.version))!==imageBindingHash(pin))throw new HttpError(409,L('L’image acquise a changé. Aucun nouvel appel autorisé.','Acquired image changed. No new request authorized.'));
 const a=getAsset(pin.assetId)!,meta=JSON.parse(a.meta||'{}');
 if(!isAutoUsable(a)||meta.gate?.verdict!=='FINAL'||meta.imageV2?.briefHash!==briefHash||a.origin!=='generated')throw new HttpError(409,L('Cette version ne peut plus être réutilisée automatiquement. Aucun nouvel appel.','This version can no longer be reused automatically. No new request.'));
 return a;
}
/** Projection éphémère pour LE moteur natif ; ne modifie ni produit, marque, mémoire ni Site. */
export function resolveImageBinding(p:Project,input:ImageBinding){return resolveBinding(p,input,false);}
/** Réemploi local des pixels acquis uniquement : aucune transmission à un générateur/contrôle IA.
 * Les personnes déjà dans la photo restent celles de la photo ; tous les contrôles propriétaire/version/offre restent appliqués. */
export function resolveLocalVideoImageBinding(p:Project,input:ImageBinding){return resolveBinding(p,input,true);}
function resolveBinding(p:Project,input:ImageBinding,preserveExistingPixels:boolean){
 const binding=ImageBindingSchema.parse(input);
 if(binding.product&&p.business==='services')throw new HttpError(409,L('Une prestation ne devient pas un produit e-commerce.','A service does not become an e-commerce product.'));
 const pins=[...binding.references,...(binding.edit?[binding.edit.source,...(binding.edit.style?[binding.edit.style]:[])]:[])];
 if(binding.edit?.style&&binding.edit.style.assetId===binding.edit.source.assetId)throw new HttpError(409,L('La source et le style désignent la même image. Précisez un autre style, ou demandez la retouche sans style.','Source and style refer to the same image. Select another style, or request the edit without a style.'));
 for(const ref of pins){
  if(imageBindingHash(pinImageAsset(p.userId,p.id,ref.assetId,ref.version))!==imageBindingHash(ref))throw new HttpError(409,L('Les octets de la référence ont changé. Aucun appel lancé.','Reference bytes changed. No request started.'));
  const a=getAsset(ref.assetId)!;const meta=JSON.parse(a.meta||'{}');
  // Le parcours natif de scène produit interdit toute personne. Il ne sait pas prouver l'identité d'un modèle.
  if(!preserveExistingPixels&&(meta.hasPerson===true||meta.triage?.hasPerson===true))throw new HttpError(409,L('Cette référence contient une personne. Ce parcours ne sait pas encore garantir son identité sans en inventer une autre ; référence conservée, génération refusée.','This reference contains a person. This workflow cannot yet guarantee their identity without inventing someone else; reference kept, generation refused.'));
 }
 let project=p;
 if(binding.product){
  const t=binding.product,product=getProduct(p.id,t.productId);
  if(product.status==='archived'||product.version!==t.version)throw new HttpError(409,L('La fiche produit a changé ou est archivée.','Product listing changed or is archived.'));
  const variant=t.variant?product.variants.find(v=>v.id===t.variant!.variantId):null;
  if(t.variant&&(!variant||variant.version!==t.variant.version))throw new HttpError(409,L('La variante a changé ou manque.','Variant changed or is missing.'));
  const allowed=variant?.image?[variant.image]:product.data.images.map(a=>a.assetId);
  if(binding.references.length!==1||!allowed.includes(binding.references[0].assetId))throw new HttpError(409,L('Désignez une photo appartenant à cette fiche ou à cette variante. Aucune photo d’un autre produit ne la remplace.','Select a photo belonging to this listing or variant. No other product photo substitutes for it.'));
  if(binding.edit){const source=getAsset(binding.edit.source.assetId)!,meta=JSON.parse(source.meta||'{}'),provenance=meta.imageV2?.binding?.product;
   if(!allowed.includes(source.id)&&(!provenance||provenance.productId!==t.productId||(provenance.variant?.variantId??null)!==(t.variant?.variantId??null)))throw new HttpError(409,L('La source à retoucher n’appartient pas à cette fiche ou variante. Désignez la bonne source ; aucun produit n’est substitué.','The edit source does not belong to this listing or variant. Select the correct source; no product is substituted.'));
  }
  project={...p,catalog:[],product:{...emptyProduct(),name:product.data.title,nameStatus:'provided',category:product.data.productType,summary:stripTags(product.data.description_html),summaryStatus:'provided',variants:product.data.options,
   ...(variant?{facts:variant.options.map((value,i)=>({key:`catalogue.option.${i}`,label:product.data.options[i]?.name??`Option ${i+1}`,value,status:'confirmed' as const,source:'user' as const}))}:{}),
   sources:binding.references.map(r=>({type:'photo' as const,ref:r.assetId,summary:'Référence native de la fiche désignée.'}))}};
 }
 const service=binding.service?p.services.services.find(s=>s.key===binding.service!.key):null;
 if(binding.service&&(p.business!=='services'||!service||imageBindingHash(service)!==binding.service.sha256))throw new HttpError(409,L('La prestation désignée a changé ou manque.','Selected service changed or is missing.'));
 if(service)project={...p,services:{...p.services,services:[service]},product:{...emptyProduct(),name:service.name,nameStatus:'provided',category:service.name,summary:service.description??'',summaryStatus:'provided'}};
 const productRef=binding.product?binding.references[0]:undefined,edit=binding.edit,nativeEdit=edit?{sourceAssetId:edit.source.assetId,...(edit.style?{styleAssetId:edit.style.assetId}:{}),...(productRef&&productRef.assetId!==edit.source.assetId?{productAssetId:productRef.assetId}:{})}:undefined;
 const references=edit?[edit.source.assetId,...(edit.style?[edit.style.assetId]:[]),...(nativeEdit?.productAssetId?[nativeEdit.productAssetId]:[])]:binding.references.map(a=>a.assetId);
 return{project,binding,pins,digest:imageBindingHash({binding,brand:p.brand,strategy:p.strategy,offer:binding.product||binding.service?null:p.product,wording:loadWordingRules(p.id)}),references,nativeEdit,referenceRoles:edit?references.map((_,i)=>i===0?'scene' as const:i===1&&edit.style?'style' as const:'product' as const):references.map(()=>binding.product?'product' as const:'style' as const),service:service?{name:service.name,description:service.description}:undefined};
}
