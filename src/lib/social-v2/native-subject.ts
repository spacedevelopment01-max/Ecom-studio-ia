/** L’offre persistée dans le brouillon reste celle du moteur ; jamais le premier produit du projet. */
import {HttpError}from '../auth';import {one}from '../db';import {getAsset,assetMeta}from '../library';import {getProduct}from '../products/catalog';import type {Project}from '../projects';import {ImageBindingSchema,resolveImageBinding,resolveVideoSubjectBinding,resolveContentSubjectBinding,pinImageAsset,imageBindingHash}from '../image-v2/request-binding';import {MAIN_PRODUCT,type SubjectOption}from '../creative-subject';import type {PostBrief}from './deps';
export function nativeSocialSubject(p:Project,post:PostBrief&{media?:string},forGeneration=true){
 if(!post.nativeBinding)return null;
 const binding=ImageBindingSchema.parse(post.nativeBinding);
 if(!forGeneration){const{references:_,edit:__,...target}=binding;const content=resolveContentSubjectBinding(p,{...target,references:[]});const subject:SubjectOption={kind:binding.service?'service':'product',key:binding.service?content.project.product.name:MAIN_PRODUCT,name:content.project.product.name,summary:content.project.product.summary,referenceAssetId:null};return{project:content.project,binding,subject,reference:null,digest:imageBindingHash({offer:content.digest,settings:p.settings,storeType:p.storeType,business:p.business,binding,product:content.project.product,service:content.service})};}
 if(!binding.references.length){
  let media:string[]=[];try{media=JSON.parse(post.media??'[]');}catch{throw new HttpError(409,'Les médias du brouillon sont illisibles.');}
  const product=binding.product?getProduct(p.id,binding.product.productId):null,variant=binding.product?.variant?product?.variants.find(v=>v.id===binding.product!.variant!.variantId):null;
  const allowed=product?(variant?.image?[variant.image]:product.data.images.map(a=>a.assetId)):media;
  const candidates=[...new Set(allowed)].filter(aid=>{const a=getAsset(aid);if(!a||a.deleted_at||a.status==='rejected')return false;const explicitlyAttached=media.includes(aid),named=!!a.name&&!!post.request?.includes(a.name)&&one<{n:number}>('SELECT COUNT(*) n FROM assets WHERE project_id=? AND name=? AND deleted_at IS NULL',p.id,a.name)?.n===1;return explicitlyAttached||named;});
  if(candidates.length>1)throw new HttpError(409,'Plusieurs photos correspondent à ce brouillon. Désignez une seule référence ; rien n’est choisi à votre place.');
  if(candidates.length){const a=getAsset(candidates[0])!;if(assetMeta<any>(a).aiPost)throw new HttpError(409,'Un visuel composé ne remplace pas la photo de référence. Les créations acquises restent conservées.');binding.references=[pinImageAsset(p.userId,p.id,a.id,a.version)];}
 }
 if(binding.product&&!binding.references.length)throw new HttpError(409,'Désignez une photo de cette fiche ou variante avant la génération. Aucune photo du produit principal n’est substituée.');
 const generation=binding.product?resolveImageBinding(p,binding):resolveVideoSubjectBinding(p,binding,true),content=resolveContentSubjectBinding(p,binding),reference=binding.references[0]?.assetId??null;
 const subject:SubjectOption=binding.service?{kind:'service',key:content.project.product.name,name:content.project.product.name,summary:content.project.product.summary,referenceAssetId:reference}:{kind:'product',key:MAIN_PRODUCT,name:content.project.product.name,summary:content.project.product.summary,referenceAssetId:reference};
 return{project:content.project,binding:generation.binding,subject,reference,digest:imageBindingHash({offer:content.digest,settings:p.settings,storeType:p.storeType,business:p.business,binding:generation.binding,product:content.project.product,service:content.service})};
}
