import {HttpError}from '../../auth';
import {loadProject}from '../../projects';
import {getProduct,listProducts}from '../../products/catalog';
import {getAsset,assetMeta}from '../../library';
import {ImageBindingSchema,resolveContentSubjectBinding,imageBindingHash,type ImageBinding}from '../../image-v2/request-binding';
import {SocialToolPlanSchema}from './social-tool-contract';
import {selectedLocalVideoSource,isNativeIdentityImage}from './image-tool-sources';
import {metaOf}from './store';
import {publicationCopyIssues,acquiredPublicationCopyReview}from '../../social-v2/publication-copy-policy';
import {platformSpec}from '../../social-v2/platforms';
import {applyWordingDeep,loadWordingRules}from '../../client-wording';
import type {ConversationRow}from './contract';
type Sources={sources:{id:string;text:string}[];lastClientRequest:{sourceId:string|null;text:string}|null};
export function validateSocialProposal(c:ConversationRow,raw:unknown,sources:Sources){
 const plan=SocialToolPlanSchema.parse(raw),pid=c.project_id,last=sources.lastClientRequest,source=sources.sources.find(s=>s.id===plan.sourceId);if(!pid||!last?.sourceId||last.sourceId!==plan.sourceId||!last.text.includes(plan.quote)||!source?.text.includes(plan.quote))throw new HttpError(409,'La proposition doit citer votre dernière demande exacte.');
 const root=loadProject(pid),focus=metaOf(c).activeContext?.target,b:ImageBinding={schema:1,people:'none',references:[]};
 if(plan.target.kind==='product'){
  const target=plan.target,p=getProduct(pid,target.productId);if(root.business==='services')throw new HttpError(409,'Une prestation ne devient pas un produit e-commerce.');
  if(focus?.kind==='catalogue-product'||focus?.kind==='catalogue-variant'){if(focus.productId!==p.id||(focus.kind==='catalogue-product'?focus.version:focus.productVersion)!==target.version||focus.kind==='catalogue-variant'&&(!target.variant||focus.variantId!==target.variant.variantId||focus.version!==target.variant.version))throw new HttpError(409,'La fiche ou variante diffère du repère désigné.');}
  else if(!last.text.includes(p.data.title)||listProducts(pid).filter(v=>v.data.title===p.data.title).length!==1)throw new HttpError(409,'Nommez la fiche exacte avant de préparer ces contenus.');
  b.product={productId:p.id,version:target.version,...(target.variant?{variant:target.variant}:{})};
 }else if(plan.target.kind==='service'){
  const target=plan.target,service=root.services.services.find(s=>s.key===target.key);if(!service||!last.text.includes(service.name))throw new HttpError(409,'Nommez la prestation exacte.');b.service={key:target.key,sha256:imageBindingHash(service)};
 }else if(focus?.kind==='catalogue-product'||focus?.kind==='catalogue-variant')throw new HttpError(409,'La fiche désignée ne doit pas être remplacée par l’offre principale.');
 const resolved=resolveContentSubjectBinding(root,b),project=resolved.project;
 const confirmed:string[]=[];
 if(b.product){const p=getProduct(pid,b.product.productId),v=b.product.variant?p.variants.find(v=>v.id===b.product!.variant!.variantId):null,amount=v?.price??p.data.price;if(amount!=null)confirmed.push(`${amount/100} ${p.data.currency}`);}
 const posts=plan.tool==='social.draft'?plan.posts.map(post=>{
  if(!platformSpec(post.network).formats.includes(post.format))throw new HttpError(409,'Ce format n’est pas pris en charge par ce réseau. Aucun format substitué.');
  if(post.format==='text'&&!post.title.trim()&&!post.caption.trim())throw new HttpError(409,'Le brouillon texte est vide ; précisez son contenu.');
  if(post.format==='image'&&post.media.length!==1||post.format==='carousel'&&post.media.length<2||post.format==='text'&&post.media.length)throw new HttpError(409,'Le nombre de médias doit correspondre au format. Rien n’est ajouté ou retiré automatiquement.');
  const media=post.media.map(selection=>{const selected=selectedLocalVideoSource(c,selection,last.text,true),a=getAsset(selected.pin.assetId)!;
   const copy=acquiredPublicationCopyReview(project,assetMeta(a));if(copy.status==='blocked'||copy.status==='unverified')throw new HttpError(409,'Les textes de ce visuel acquis doivent être relus pour cette offre. Fichier conservé, aucun nouvel achat.');
   if(!isNativeIdentityImage(a)&&b.product){const p=getProduct(pid,b.product.productId),variant=b.product.variant?p.variants.find(v=>v.id===b.product!.variant!.variantId):null,allowed=variant?.image?[variant.image]:p.data.images.map(x=>x.assetId),provenance=selected.binding?.product;if(!allowed.includes(a.id)&&(!provenance||imageBindingHash(provenance)!==imageBindingHash(b.product)))throw new HttpError(409,'Ce média appartient à une autre fiche ou variante.');}
   const prior=selected.binding??ImageBindingSchema.safeParse(assetMeta<any>(a).imageV2?.binding).data;if(prior?.service&&imageBindingHash(prior.service)!==imageBindingHash(b.service??null)||prior?.product&&!b.product)throw new HttpError(409,'Ce média appartient à une autre offre.');return selected.pin;
  });
  if(new Set(media.map(m=>m.assetId)).size!==media.length)throw new HttpError(409,'Un même média est répété dans ce brouillon.');
  if(imageBindingHash(applyWordingDeep({title:post.title,caption:post.caption,hashtags:post.hashtags},loadWordingRules(pid)))!==imageBindingHash({title:post.title,caption:post.caption,hashtags:post.hashtags}))throw new HttpError(409,'Le texte contredit le vocabulaire enregistré ; relisez la proposition.');
  if(publicationCopyIssues(project,{headline:post.title,subline:post.caption,cta:''},last.text,[],confirmed).length)throw new HttpError(409,'Des affirmations commerciales de ce brouillon manquent de faits confirmés ou demandés. Précisez-les avant de l’enregistrer.');
  return{...post,media};
 }):null;
 return{plan,binding:b,bindingDigest:resolved.digest,instruction:last.text,posts};
}
