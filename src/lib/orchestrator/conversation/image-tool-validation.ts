/** Résolution des cibles, pas un interprète concurrent du langage libre. */
import {HttpError} from '../../auth';
import {loadProject} from '../../projects';
import {getProduct,listProducts} from '../../products/catalog';
import {pinImageAsset,resolveImageBinding,imageBindingHash,type ImageBinding} from '../../image-v2/request-binding';
import {L} from '../../i18n-server';
import {metaOf} from './store';
import type {ConversationRow} from './contract';
import {ImageToolPlanSchema} from './image-tool-contract';
type Sources={sources:{id:string;text:string}[];lastClientRequest:{sourceId:string|null;text:string}|null};
export function validateImageToolProposal(c:ConversationRow,raw:unknown,sources:Sources){
 const plan=ImageToolPlanSchema.parse(raw),pid=c.project_id;if(!pid)throw new HttpError(409,L('Créez d’abord le projet.','Create the project first.'));
 const latest=sources.lastClientRequest,source=sources.sources.find(s=>s.id===plan.sourceId);
 if(!latest?.sourceId||plan.sourceId!==latest.sourceId||!source?.text.includes(plan.quote)||!latest.text.includes(plan.quote))throw new HttpError(409,L('La proposition doit citer votre dernière demande exacte.','Proposal must cite your latest exact request.'));
 const p=loadProject(pid),focus=metaOf(c).activeContext?.target,binding:ImageBinding={schema:1,people:'none',references:plan.reference?[pinImageAsset(c.user_id,pid,plan.reference.assetId,plan.reference.version)]:[]};
 if(plan.target.kind==='product'){
  const target=plan.target,product=getProduct(pid,target.productId);
  if(focus?.kind==='catalogue-product'||focus?.kind==='catalogue-variant'){
   const version=focus.kind==='catalogue-product'?focus.version:focus.productVersion;
   if(focus.productId!==target.productId||version!==target.version||focus.kind==='catalogue-variant'&&(!target.variant||target.variant.variantId!==focus.variantId||target.variant.version!==focus.version))throw new HttpError(409,L('La proposition ne cible pas la fiche ou variante désignée.','Proposal does not target the selected listing or variant.'));
  }else if(!latest.text.includes(product.data.title)||listProducts(pid,{includeArchived:true}).filter(x=>x.data.title===product.data.title).length!==1)throw new HttpError(409,L('Désignez le produit précis avant de créer ses images.','Select the exact product before creating its images.'));
  binding.product={productId:target.productId,version:target.version,...(target.variant?{variant:target.variant}:{})};
 }else if(plan.target.kind==='service'){
  const target=plan.target,service=p.services.services.find(s=>s.key===target.key);
  if(!service||!latest.text.includes(service.name))throw new HttpError(409,L('Nommez la prestation exacte ; aucune autre n’est substituée.','Name the exact service; none is substituted.'));
  binding.service={key:target.key,sha256:imageBindingHash(service)};
 }else if((p.storeType!=='mono'||listProducts(pid).length>1)&&['product_image','packshot','lifestyle'].includes(plan.kind))throw new HttpError(409,L('Plusieurs produits existent : désignez la fiche précise.','Several products exist: select the exact listing.'));
 if(p.business==='services'&&['product_image','packshot','lifestyle'].includes(plan.kind))throw new HttpError(409,L('Pour cette prestation, proposez une photo de métier ou d’ambiance.','For this service, propose a trade or ambiance photo.'));
 if(['product_image','packshot','lifestyle'].includes(plan.kind)&&binding.references.length!==1)throw new HttpError(409,L('Une vraie photo du produit est obligatoire. Aucune photo choisie automatiquement.','A real product photo is required. No photo chosen automatically.'));
 if(focus?.kind==='asset'&&plan.reference&&(focus.assetId!==plan.reference.assetId||focus.version!==plan.reference.version))throw new HttpError(409,L('La référence diffère du média désigné.','Reference differs from the selected media.'));
 const resolved=resolveImageBinding(p,binding);
 return{plan,binding,project:resolved.project,instruction:latest.text};
}
