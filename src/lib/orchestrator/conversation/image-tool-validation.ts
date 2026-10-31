/** Résolution des cibles, pas un interprète concurrent du langage libre. */
import {HttpError} from '../../auth';
import {loadProject} from '../../projects';
import {getProduct,listProducts} from '../../products/catalog';
import {pinImageAsset,resolveImageBinding,imageBindingHash,type ImageBinding} from '../../image-v2/request-binding';
import {L} from '../../i18n-server';
import {metaOf} from './store';
import type {ConversationRow} from './contract';
import {ImageToolPlanSchema} from './image-tool-contract';
import {selectedImageSource} from './image-tool-sources';
import {getAsset} from '../../library';
import {editAspect} from '../../image-v2/edit-photo';
type Sources={sources:{id:string;text:string}[];lastClientRequest:{sourceId:string|null;text:string}|null};
export function validateImageToolProposal(c:ConversationRow,raw:unknown,sources:Sources){
 const plan=ImageToolPlanSchema.parse(raw),pid=c.project_id;if(!pid)throw new HttpError(409,L('Créez d’abord le projet.','Create the project first.'));
 const latest=sources.lastClientRequest,source=sources.sources.find(s=>s.id===plan.sourceId);
 if(!latest?.sourceId||plan.sourceId!==latest.sourceId||!source?.text.includes(plan.quote)||!latest.text.includes(plan.quote))throw new HttpError(409,L('La proposition doit citer votre dernière demande exacte.','Proposal must cite your latest exact request.'));
 const edit=plan.tool==='images.edit',selected=edit?selectedImageSource(c,plan.source,latest.text,'source'):null,style=edit&&plan.style?selectedImageSource(c,plan.style,latest.text,'style'):null;
 const p=loadProject(pid),focus=metaOf(c).activeContext?.target,binding:ImageBinding={schema:1,people:'none',references:plan.tool==='images.create'&&plan.reference?[pinImageAsset(c.user_id,pid,plan.reference.assetId,plan.reference.version)]:[],...(selected?{edit:{source:selected.pin,...(style?{style:style.pin}:{})}}:{})};
 if(selected?.binding?.product&&(plan.target.kind!=='product'||plan.target.productId!==selected.binding.product.productId))throw new HttpError(409,L('La source acquise appartient à un autre produit.','The acquired source belongs to another product.'));
 if(selected?.binding?.service&&(plan.target.kind!=='service'||plan.target.key!==selected.binding.service.key))throw new HttpError(409,L('La source acquise appartient à une autre prestation.','The acquired source belongs to another service.'));
 if(plan.target.kind==='product'){
  const target=plan.target,product=getProduct(pid,target.productId);
  if(focus?.kind==='catalogue-product'||focus?.kind==='catalogue-variant'){
   const version=focus.kind==='catalogue-product'?focus.version:focus.productVersion;
   if(focus.productId!==target.productId||version!==target.version||focus.kind==='catalogue-variant'&&(!target.variant||target.variant.variantId!==focus.variantId||target.variant.version!==focus.version))throw new HttpError(409,L('La proposition ne cible pas la fiche ou variante désignée.','Proposal does not target the selected listing or variant.'));
  }else if(selected?.binding?.product?.productId!==target.productId&&(!latest.text.includes(product.data.title)||listProducts(pid,{includeArchived:true}).filter(x=>x.data.title===product.data.title).length!==1))throw new HttpError(409,L('Désignez le produit précis avant de créer ses images.','Select the exact product before creating its images.'));
  binding.product={productId:target.productId,version:target.version,...(target.variant?{variant:target.variant}:{})};
  if(selected){const original=selected.binding?.references[0];if(original)binding.references=[pinImageAsset(c.user_id,pid,original.assetId,original.version)];else{const variant=target.variant?product.variants.find(v=>v.id===target.variant!.variantId):null,allowed=variant?.image?[variant.image]:product.data.images.map(i=>i.assetId);if(!allowed.includes(selected.pin.assetId))throw new HttpError(409,L('La vraie photo de cette fiche manque pour une retouche fidèle.','The real photo for this listing is missing for a faithful edit.'));binding.references=[selected.pin];}}
 }else if(plan.target.kind==='service'){
  const target=plan.target,service=p.services.services.find(s=>s.key===target.key);
  if(!service||selected?.binding?.service?.key!==target.key&&!latest.text.includes(service.name))throw new HttpError(409,L('Nommez la prestation exacte ; aucune autre n’est substituée.','Name the exact service; none is substituted.'));
  binding.service={key:target.key,sha256:imageBindingHash(service)};
 }else if(plan.tool==='images.create'&&(p.storeType!=='mono'||listProducts(pid).length>1)&&['product_image','packshot','lifestyle'].includes(plan.kind))throw new HttpError(409,L('Plusieurs produits existent : désignez la fiche précise.','Several products exist: select the exact listing.'));
 if(plan.tool==='images.create'){
  if(p.business==='services'&&['product_image','packshot','lifestyle'].includes(plan.kind))throw new HttpError(409,L('Pour cette prestation, proposez une photo de métier ou d’ambiance.','For this service, propose a trade or ambiance photo.'));
  if(['product_image','packshot','lifestyle'].includes(plan.kind)&&binding.references.length!==1)throw new HttpError(409,L('Une vraie photo du produit est obligatoire. Aucune photo choisie automatiquement.','A real product photo is required. No photo chosen automatically.'));
  if(focus?.kind==='asset'&&plan.reference&&(focus.assetId!==plan.reference.assetId||focus.version!==plan.reference.version))throw new HttpError(409,L('La référence diffère du média désigné.','Reference differs from the selected media.'));
 }
 const resolved=resolveImageBinding(p,binding);
 const sourceAsset=selected?getAsset(selected.pin.assetId):null,request=plan.tool==='images.create'?{kind:plan.kind,aspect:plan.aspect,frames:plan.frames}:{kind:'retouch' as const,aspect:editAspect(sourceAsset?.width??1,sourceAsset?.height??1),frames:[{composition:L('Conserver la composition de la source hors demande.','Preserve source composition outside the request.'),lighting:L('Modifier uniquement ce qui est demandé.','Change only what is requested.'),framing:L('Conserver le cadrage de la source.','Preserve source framing.'),environment:L('Conserver le décor hors modification demandée.','Preserve the background outside the requested change.')}]};
 return{plan,binding,project:resolved.project,instruction:latest.text,request};
}
