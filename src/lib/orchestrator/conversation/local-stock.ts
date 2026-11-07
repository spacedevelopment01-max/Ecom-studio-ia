/** Exact native variant stock. A product never implies a bulk variant edit or remote synchronization. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {id,now} from '../../db';
import {getProduct,setVariantStock,type StudioProduct} from '../../products/catalog';
import {stableHash} from '../../brain/hash';
import {requirePlan} from '../../plan-gates';
import {loadProject} from '../../projects';
import {checkedContextPin,type ContextPin} from './context-session';
import {conversationCatalogueEnabled} from './tool-flags';
import type {ConversationRow,ConversationState} from './contract';
export type StockTarget={productId:string;productVersion:number;variantId:string;variantVersion:number;label:string};
export type StockProposal={id:string;pin:ContextPin;target:StockTarget;fingerprint:string;before:number|null;after:number|null;expiresAt:number};
export type StockPresentation={schema:'syna-local-stock-1';state:'ambiguous'|'proposed'|'applied';projectId:string;message:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;synchronization:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;target?:StockTarget;diff?:{before:number|null;after:number|null};result?:{productVersion:number;variantVersion:number};receiptId?:string;nativeHref?:string};
export const localStockEnabled=()=>conversationCatalogueEnabled();
/** A bounded request envelope; quantity, target and compound suffix remain exact. */
function stockRequest(text:string):string{return text.trim().replace(/\s*\?\s*$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t\s*$/iu,'').trim().replace(/^(?:peux|pourrais)-tu (mettre|fixer|r[ée]gler|changer|modifier|d[ée]finir|passer|d[ée]sactiver)\b/iu,(_all,verb:string)=>({mettre:'mets',fixer:'fixe',régler:'règle',regler:'règle',changer:'change',modifier:'modifie',définir:'définis',definir:'définis',passer:'passe',désactiver:'désactive',desactiver:'désactive'}[verb.toLowerCase()]!));}
export const localStockCandidate=(raw:string)=>{const text=stockRequest(raw);return /\bstock\b/iu.test(outsideQuotes(text))&&/^(?:mets?|fixe|r[èe]gle|change|modifie|d[ée]finis|passe|d[ée]sactive)\b/iu.test(text.trim());};
const present=(c:ConversationRow,state:StockPresentation['state'],message:string,extra:Partial<StockPresentation>={}):StockPresentation=>({schema:'syna-local-stock-1',state,projectId:c.project_id!,message,financialConsent:false,costEur:0,providerCalls:0,publication:false,synchronization:false,confirmationRequired:false,actionsExecuted:false,...extra});
const fp=(p:StudioProduct)=>stableHash('native-stock-1',p);
function owned(user:User,c:ConversationRow){if(!localStockEnabled())throw new HttpError(404,'Stock natif avec SINA indisponible.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet avec un catalogue natif.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(loadProject(c.project_id).business==='services')throw new HttpError(409,'Les prestations et réservations sont distinctes du stock e-commerce.');}
function selected(c:ConversationRow,pin?:ContextPin){const bound=checkedContextPin(c,pin),t=bound?.selection.target;if(!bound||bound.selection.tab!=='catalogue'||(t?.kind!=='catalogue-product'&&t?.kind!=='catalogue-variant'))throw new HttpError(422,'Ouvrez Catalogue et désignez le produit ou la variante native dont le stock doit changer.');const product=getProduct(c.project_id!,t.productId);return{pin:bound,target:t,product};}
export function proposeLocalStock(user:User,c:ConversationRow,m:ConversationState,rawText:string):StockPresentation{
 const text=stockRequest(rawText);
 delete m.localStockProposal;owned(user,c);
 const exact=/^(?:mets?|fixe|r[èe]gle|change|modifie|d[ée]finis|passe) (?:le )?stock de (ce produit|cette variante) [àa] ([+-]?\d+)(?: unit[ée]s?)?\s*[.!]?$/iu.exec(text.trim()),untrack=/^d[ée]sactive le suivi du stock de (ce produit|cette variante)\s*[.!]?$/iu.exec(text.trim());
 if(!exact&&!untrack)return present(c,'ambiguous','Indiquez une quantité entière exacte et une cible native : Mets le stock de ce produit à 12, ou de cette variante à 12. Désactiver le suivi signifie quantité inconnue, pas stock zéro. Aucun devis ni changement.');
 const amount=untrack?null:Number(exact![2]);if(amount!==null&&(!Number.isSafeInteger(amount)||amount< -100000||amount>10000000))return present(c,'ambiguous','Quantité entière hors des limites natives : -100000 à 10000000. Aucun changement.');
 try{
  const {pin,target,product}=selected(c),noun=(exact??untrack)![1];
  if(target.kind==='catalogue-product'&&(product.variants.length!==1||noun==='cette variante'))return present(c,'ambiguous','Cette fiche ne désigne pas une variante unique. Désignez la variante exacte ; le stock ne sera jamais réparti entre plusieurs variantes.');
  if(target.kind==='catalogue-variant'&&noun==='ce produit')return present(c,'ambiguous','Une variante précise est désignée. Dites « Mets le stock de cette variante à … » ou désignez la fiche produit ; aucun changement global ne sera déduit.');
  const variant=target.kind==='catalogue-variant'?product.variants.find(v=>v.id===target.variantId)!:product.variants[0];
  if(variant.stock===amount)return present(c,'ambiguous','Ce stock est déjà enregistré. Aucune nouvelle version ni tentative fournisseur.');
  const p:StockProposal={id:id(),pin,target:{productId:product.id,productVersion:product.version,variantId:variant.id,variantVersion:variant.version,label:product.data.title+(variant.options.length?' · '+variant.options.join(' / '):'')},fingerprint:fp(product),before:variant.stock,after:amount,expiresAt:now()+15*60000};m.localStockProposal=p;
  return present(c,'proposed','Vérifiez la quantité et la variante exactes. Seul ce stock natif changera après accord gratuit ; prix, SKU, autres variantes et politique de vente conservés. Stock non suivi = quantité inconnue. Aucune commande ni synchronisation externe.',{proposalId:p.id,target:p.target,diff:{before:p.before,after:p.after},confirmationRequired:true,nativeHref:`/studio/${c.project_id}/catalogue`});
 }catch(e){if(e instanceof HttpError&&e.status===422)return present(c,'ambiguous',e.message);throw e;}
}
export function confirmLocalStock(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):StockPresentation{
 owned(user,c);const p=m.localStockProposal;if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Cette proposition de stock a expiré ou changé. Préparez un nouvel accord gratuit.');
 const {product}=selected(c,p.pin),variant=product.variants.find(v=>v.id===p.target.variantId);
 if(product.id!==p.target.productId||product.version!==p.target.productVersion||!variant||variant.version!==p.target.variantVersion||fp(product)!==p.fingerprint)throw new HttpError(409,'La fiche ou la variante a changé ; les modifications manuelles sont conservées.');
 setVariantStock(c.project_id!,variant.id,p.after);const read=getProduct(c.project_id!,product.id),actual=read.variants.find(v=>v.id===variant.id);
 if(read.version!==product.version+1||!actual||actual.version!==variant.version+1||actual.stock!==p.after)throw new HttpError(409,'Stock natif non confirmé.');
 delete m.localStockProposal;return present(c,'applied','Stock natif enregistré et relu. Aucun appel IA, achat, commande ni synchronisation externe.',{proposalId:p.id,target:p.target,diff:{before:p.before,after:p.after},result:{productVersion:read.version,variantVersion:actual.version},receiptId:requestId,actionsExecuted:true,nativeHref:`/studio/${c.project_id}/catalogue`});
}
