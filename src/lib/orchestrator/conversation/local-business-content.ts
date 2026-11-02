/** C21 : commandes exactes gratuites sur les vrais contenus natifs, jamais publication ni réservation. */
import {HttpError,type User} from '../../auth';
import {id,now,tx} from '../../db';
import {stableHash} from '../../brain/hash';
import {requirePlan} from '../../plan-gates';
import {adapter,updateContent,type ContentItem} from '../../contenus/api';
import {activeContextEnabled} from './active-context';
import {checkedContextPin,type ContextPin} from './context-session';
import type {ConversationRow,ConversationState} from './contract';
type Type='biens'|'plats'|'realisations';
type Change={type:Type;field:'title'|'price';value:string|number};
export type LocalBusinessContentProposal={id:string;pin:ContextPin;type:Type;itemId:string;version:string;nativeStatus:string|null;fingerprint:string;expectedFingerprint:string;change:Change;diff:{before:string|number|null;after:string|number};nativeEffects?:{field:string;before:string;after:string}[];expiresAt:number};
export type LocalBusinessContentPresentation={schema:'syna-local-business-content-1';state:'proposed'|'applied'|'ambiguous'|'error';message:string;financialConsent:false;costEur:0;providerCalls:0;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;nativeStatus?:string|null;field?:'title'|'price';diff?:LocalBusinessContentProposal['diff'];nativeEffects?:{field:string;before:string;after:string}[];target?:{type:Type;itemId:string;version:string};item?:{id:string;type:Type;version:string;title:string;fingerprint:string};receiptId?:string;publication:false};
const present=(state:LocalBusinessContentPresentation['state'],message:string,extra:Partial<LocalBusinessContentPresentation>={}):LocalBusinessContentPresentation=>({schema:'syna-local-business-content-1',state,message,financialConsent:false,costEur:0,providerCalls:0,confirmationRequired:false,actionsExecuted:false,publication:false,...extra});
const plain=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const localBusinessContentEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_BUSINESS_CONTENT==='1';
export const localBusinessContentCandidate=(text:string)=>/^(?:renomme\s+(?:cette|ce|la|le)\s+(?:realisation|bien|plat)\b|(?:modifie|change)\s+le\s+prix\s+(?:de\s+ce|du)\s+plat\b)/.test(plain(text.trim()));
const fp=(item:ContentItem)=>stableHash('syna-business-content-native-1',item);
// publication:false signifie aucun appel de publication, pas une garantie d’absence d’effet sur un contenu déjà visible.
const visibility=(status:string|null)=>['published','sold','rented'].includes(status??'')?' Ce contenu est déjà visible (état « '+status+' »). La modification native peut être reprise par les aperçus, exports ou affichages connectés qui lisent ces contenus. Vérifiez la version en ligne.':'';
function semantic(item:ContentItem){const data={...(item.data as Record<string,unknown>)};delete data.updatedAt;return{...item,version:null,data};}
const resultFp=(item:ContentItem)=>stableHash('syna-business-content-result-1',semantic(item));
function fail(message:string):never{throw new HttpError(422,message,'conversation_business_content_ambiguous');}
function parse(text:string):Change{
 const rename=/^Renomme (cette réalisation|ce bien|ce plat|la réalisation|le bien|le plat) en\s+[«“"]([^\r\n]{1,120})[»”"]\s*[.!]?$/i.exec(text.trim());
 if(rename){const noun=plain(rename[1]),value=rename[2].trim();if(!value)fail('Donnez un nom exact non vide.');return{type:noun.endsWith('realisation')?'realisations':noun.endsWith('bien')?'biens':'plats',field:'title',value};}
 const price=/^(?:Modifie|Change) le prix (?:de ce|du) plat à (\d{1,6})(?:,(\d{1,2}))?\s*(?:€|EUR)\s*[.!]?$/i.exec(text.trim());
 if(price){const cents=BigInt(price[1])*100n+BigInt((price[2]??'').padEnd(2,'0'));if(cents>10000000n)fail('Prix hors des limites natives du plat.');return{type:'plats',field:'price',value:Number(cents)/100};}
 return fail('Précisez : Renomme cette réalisation / ce bien / ce plat en « nom exact », ou Modifie le prix de ce plat à 18,50 €. Aucun changement libre, statut ou publication.');
}
function selected(c:ConversationRow,pinned?:ContextPin){const pin=checkedContextPin(c,pinned),target=pin?.selection.target;if(!pin||target?.kind!=='content-item')fail('Désignez le contenu métier exact dans son espace natif.');return{pin,target,item:adapter(target.type).get(c.project_id!,target.itemId)};}
function field(item:ContentItem,c:Change){return c.field==='title'?item.title:(item.data as {price:number|null}).price;}
function patch(c:Change):Record<string,unknown>{return c.field==='price'?{price:c.value}:c.type==='plats'?{name:c.value}:{title:c.value};}
class PreviewRollback{constructor(readonly after:ContentItem){}}
function preview(pid:string,item:ContentItem,c:Change){try{return tx(()=>{const after=updateContent(pid,c.type,item.id,patch(c),item.version);throw new PreviewRollback(after);});}catch(e){if(e instanceof PreviewRollback)return e.after;throw e;}}
export function proposeLocalBusinessContent(user:User,c:ConversationRow,m:ConversationState,text:string):LocalBusinessContentPresentation{
 delete m.localBusinessContentProposal;
 if(!localBusinessContentEnabled())return present('error','Les modifications gratuites de contenus métier ne sont pas activées. Aucun appel IA lancé.');
 try{const change=parse(text);requirePlan(user,c.project_id!);const {pin,target,item}=selected(c);if(target.type!==change.type)fail('La demande ne correspond pas au type du contenu désigné.');if(change.field==='price'&&String((item.data as {priceText:string}).priceText??'').trim())fail('Ce plat affiche une mention de prix. La modification du nombre seul ne changerait pas le prix affiché ; utilisez la Carte pour préciser cette mention.');const before=field(item,change);if(before===change.value)fail('Cette valeur est déjà enregistrée. Aucune version inutile.');const after=preview(c.project_id!,item,change);if(field(after,change)!==change.value)throw new HttpError(409,'Le moteur natif ne conserve pas cette valeur exactement.');
  const beforeHandle=(item.data as {handle?:string}).handle,afterHandle=(after.data as {handle?:string}).handle,nativeEffects=beforeHandle&&afterHandle&&beforeHandle!==afterHandle?[{field:'handle',before:beforeHandle,after:afterHandle}]:[];
  const p:LocalBusinessContentProposal={id:id(),pin,type:target.type,itemId:item.id,version:item.version,nativeStatus:item.status,fingerprint:fp(item),expectedFingerprint:resultFp(after),change,diff:{before,after:change.value},nativeEffects,expiresAt:now()+15*60000};m.localBusinessContentProposal=p;return present('proposed','Vérifiez ce changement exact puis confirmez gratuitement. Aucun appel de publication n’est lancé.'+visibility(item.status),{proposalId:p.id,nativeStatus:item.status,field:p.change.field,diff:p.diff,nativeEffects,target:{type:p.type,itemId:p.itemId,version:p.version},confirmationRequired:true});
 }catch(e){if(e instanceof HttpError&&e.status===422)return present('ambiguous',e.message);throw e;}
}
export function confirmLocalBusinessContent(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):LocalBusinessContentPresentation{
 if(!localBusinessContentEnabled())throw new HttpError(404,'Modifications gratuites de contenus métier indisponibles.');requirePlan(user,c.project_id!);const p=m.localBusinessContentProposal;if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Cette proposition est périmée. Reformulez la demande.','conversation_business_content_stale');const {item,target}=selected(c,p.pin);if(target.type!==p.type||item.id!==p.itemId||item.version!==p.version||fp(item)!==p.fingerprint)throw new HttpError(409,'Le contenu métier a changé. Préparez une nouvelle proposition.');
 const result=preview(c.project_id!,item,p.change);if(resultFp(result)!==p.expectedFingerprint)throw new HttpError(409,'Le résultat natif a changé. Préparez une nouvelle proposition.');const saved=updateContent(c.project_id!,p.type,p.itemId,patch(p.change),p.version),read=adapter(p.type).get(c.project_id!,p.itemId);if(saved.version===p.version||saved.version!==read.version||fp(saved)!==fp(read)||resultFp(read)!==p.expectedFingerprint)throw new HttpError(409,'Écriture native non confirmée.');delete m.localBusinessContentProposal;
 return present('applied','Contenu natif enregistré et relu. Aucun crédit consommé ; aucun appel de publication n’a été lancé.'+visibility(read.status),{proposalId:p.id,nativeStatus:read.status,field:p.change.field,diff:p.diff,nativeEffects:p.nativeEffects,target:{type:p.type,itemId:p.itemId,version:p.version},item:{id:read.id,type:p.type,version:read.version,title:read.title,fingerprint:fp(read)},receiptId:requestId,actionsExecuted:true});
}
