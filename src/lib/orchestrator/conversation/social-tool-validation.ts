import {assertAdvertising}from '../../job-entitlements';
import {projectRights}from '../../plan-gates';
import {claimIssues}from '../../ads-v2/claims';
import {adInsight}from '../../ads-v2/insight';
import {strictestText}from '../../ads-v2/platforms';
import {HttpError}from '../../auth';
import {loadProject}from '../../projects';
import {getProduct,listProducts}from '../../products/catalog';
import {getAsset,assetMeta}from '../../library';
import {ImageBindingSchema,resolveContentSubjectBinding,imageBindingHash,type ImageBinding}from '../../image-v2/request-binding';
import {SocialToolPlanSchema,type SocialToolPlan}from './social-tool-contract';
import {selectedLocalVideoSource,isNativeIdentityImage}from './image-tool-sources';
import {metaOf}from './store';
import {publicationCopyIssues,acquiredPublicationCopyReview}from '../../social-v2/publication-copy-policy';
import {platformSpec}from '../../social-v2/platforms';
import {applyWordingDeep,loadWordingRules}from '../../client-wording';
import type {ConversationRow}from './contract';
type Sources={sources:{id:string;text:string}[];lastClientRequest:{sourceId:string|null;text:string}|null};
type Pin=ImageBinding['references'][number];
type DraftPost=Omit<Extract<SocialToolPlan,{tool:'social.draft'}>['posts'][number],'media'>&{media:Pin[]};
type Campaign=Omit<Extract<SocialToolPlan,{tool:'campaign.draft'}>,'ads'>&{ads:(Omit<Extract<SocialToolPlan,{tool:'campaign.draft'}>['ads'][number],'media'>&{media:Pin[]})[]};
type Prepared={plan:SocialToolPlan;binding:ImageBinding;bindingDigest:string;instruction:string;posts:DraftPost[]|null;campaign:Campaign|null};
export function validateSocialProposal(c:ConversationRow,raw:unknown,sources:Sources):Prepared{
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
 const campaign=plan.tool==='campaign.draft'?(()=>{
  assertAdvertising(pid);const rights=projectRights(pid),maximum=rights?.ads==='full'?6:rights?.ads==='advanced'?3:1;if(plan.ads.length>maximum)throw new HttpError(402,'Ce nombre d’annonces dépasse les droits du forfait ; aucune annonce tronquée.');
  const ads=plan.ads.map(ad=>{const validated=validateSocialProposal(c,{tool:'social.draft',target:plan.target,sourceId:plan.sourceId,quote:plan.quote,posts:[{network:plan.networks[0],format:ad.media.length>1?'carousel':ad.media.length?'image':'text',title:ad.headline,caption:[ad.hook,ad.primary,ad.description,ad.cta].join('\n'),hashtags:'',link:null,media:ad.media}]},sources),media=validated.posts![0].media;return{...ad,media};});
  const platforms=plan.networks.map(n=>n==='facebook'||n==='instagram'?'meta_feed':n==='youtube'?'google_display':n) as import('../../ads-v2/types').Platform[];
  const issues=claimIssues(ads.map((a,i)=>({id:String(i),copy:{hook:a.hook,hookB:null,primary:a.primary,headline:a.headline,description:a.description,cta:a.cta,sub:null,visual:a.visual}})),project,adInsight(project),strictestText(platforms));
  if([...issues.values()].some(v=>v.length))throw new HttpError(409,'Les textes publicitaires nécessitent une correction : '+[...issues.values()].flat().map(v=>v.fix).join(' ; '));
  const labels={name:plan.name,objective:plan.objective,audience:plan.audience,ads:ads.map(a=>({angle:a.angle,visual:a.visual}))};if(imageBindingHash(applyWordingDeep(labels,loadWordingRules(pid)))!==imageBindingHash(labels))throw new HttpError(409,'La campagne contredit le vocabulaire enregistré.');
  return{...plan,ads};
 })():null;
 const posts=plan.tool==='social.draft'?plan.posts.map(post=>{
  if(!platformSpec(post.network).formats.includes(post.format))throw new HttpError(409,'Ce format n’est pas pris en charge par ce réseau. Aucun format substitué.');
  if(post.format==='text'&&!post.title.trim()&&!post.caption.trim())throw new HttpError(409,'Le brouillon texte est vide ; précisez son contenu.');
  if(post.pendingImage&&!post.aspect)throw new HttpError(409,'Précisez le ratio du visuel avant de confirmer : carré, portrait, vertical ou paysage. Aucun format supposé.');
  if(post.aspect&&post.format==='text')throw new HttpError(409,'Un brouillon texte ne doit pas annoncer un ratio image.');
  if(post.pendingImage&&(post.format!=='image'||post.media.length!==0))throw new HttpError(409,'Une image en attente doit être annoncée sans média ; aucun média existant remplacé.');
  if(post.format==='image'&&post.media.length!==1&&!(post.pendingImage&&post.media.length===0)||post.format==='carousel'&&post.media.length<2||post.format==='text'&&post.media.length)throw new HttpError(409,'Le nombre de médias doit correspondre au format. Rien n’est ajouté ou retiré automatiquement.');
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
 return{plan,binding:b,bindingDigest:resolved.digest,instruction:last.text,posts,campaign};
}
