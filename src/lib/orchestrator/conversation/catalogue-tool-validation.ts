/** Contrôle d'une proposition, pas interprétation locale du langage ni droit d'écriture. */
import {HttpError} from '../../auth';
import {getAsset,assetData} from '../../library';
import {createHash} from 'node:crypto';
import {getProduct,listProducts,productDataSchema,combinations,type ProductInput,type StudioProduct} from '../../products/catalog';
import {L} from '../../i18n-server';
import {loadProject,currentTheme} from '../../projects';
import {metaOf} from './store';
import {CataloguePlanSchema,type CataloguePlan} from './catalogue-tool-contract';
import type {ConversationRow} from './contract';
type Sources={sources:{id:string;text:string}[];lastClientRequest:{sourceId:string|null;text:string}|null};
const refuse=(fr:string,en:string,code:string):never=>{throw new HttpError(409,L(fr,en),code);};
export function catalogueMoney(text:string){
 const hit=/^(\d+(?:[ \u00a0\u202f]\d{3})*)(?:[.,](\d{1,2}))?\s*([A-Z]{3}|€)$/.exec(text);
 if(!hit)throw new HttpError(400,L('Prix et devise explicites requis.','Explicit price and currency required.'));
 const n=BigInt(hit[1].replace(/[ \u00a0\u202f]/g,''))*100n+BigInt((hit[2]??'').padEnd(2,'0'));
 if(n>100000000n)throw new HttpError(400,L('Prix hors des limites du catalogue.','Price outside catalog limits.'));
 return{cents:Number(n),currency:hit[3]==='€'?'EUR':hit[3]};
}
export function productContent(p:StudioProduct){return{handle:p.handle,status:p.status,data:p.data,variants:p.variants.map(({options,sku,price,compareAt,stock,stockPolicy,image,barcode,weightGrams})=>({options,sku,price,compareAt,stock,stockPolicy,image,barcode,weightGrams}))};}
export function productFingerprint(p:StudioProduct){return createHash('sha256').update(JSON.stringify(p)).digest('hex');}
function exactLeaves(value:unknown,prefix:string):{path:string;value:unknown}[]{
 if(Array.isArray(value))return value.length?value.flatMap((v,i)=>exactLeaves(v,`${prefix}.${i}`)):[{path:prefix,value:null}];
 if(value&&typeof value==='object')return Object.entries(value).flatMap(([k,v])=>['assetId','version','id'].includes(k)?[]:exactLeaves(v,`${prefix}.${k}`));
 return[{path:prefix,value}];
}
function escapeHtml(t:string){return t.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)).replace(/\r?\n/g,'<br>');}
export function catalogueAsset(userId:string,projectId:string,ref:{assetId:string;version:number}){
 const a=getAsset(ref.assetId);
 if(!a||a.project_id!==projectId||a.user_id!==userId||a.deleted_at||a.status==='rejected'||a.kind!=='image'||a.role==='theme-render-capture'||!a.mime.startsWith('image/'))throw new HttpError(404,L('Image introuvable dans ce projet.','Image not found in this project.'));
 if(a.version!==ref.version)refuse('Cette image a changé. Désignez sa nouvelle version.','This image changed. Select its new version.','catalogue_asset_stale');
 let bytes:Buffer;try{bytes=assetData(a);}catch{throw new HttpError(409,L('Le fichier image manque. Aucun remplacement automatique.','Image file missing. No automatic replacement.'));}
 if(!bytes.length)throw new HttpError(409,L('Le fichier image est vide.','Image file is empty.'));
 return{assetId:a.id,version:a.version,sha256:createHash('sha256').update(bytes).digest('hex')};
}
export function validateCatalogueProposal(c:ConversationRow,raw:unknown,source:Sources){
 const plan=CataloguePlanSchema.parse(raw),pid=c.project_id;if(!pid)throw new HttpError(409,L('Créez d’abord le projet.','Create the project first.'));
 if(loadProject(pid).business==='services'||currentTheme(pid)?.spec.store.business==='services')refuse('Prestations de services : aucun article e-commerce créé.','Service business: no e-commerce item created.','catalogue_service_project');
 const latest=source.lastClientRequest;
 if(!latest?.sourceId)refuse('Une demande client explicite est nécessaire.','An explicit client request is required.','catalogue_request_missing');
 const proof=(path:string,value?:unknown)=>{
  const e=plan.evidence.find(e=>e.path===path),s=e&&source.sources.find(s=>s.id===e.sourceId);
  if(!e||!s||e.sourceId!==latest!.sourceId||!s.text.includes(e.quote)||!latest!.text.includes(e.quote))refuse('Une donnée proposée ne cite pas votre dernière demande. Précisez-la.','A proposed value does not cite your latest request. Clarify it.','catalogue_unproved_field');
  if(value!==undefined&&value!==null&&value!==''){
   const text=String(value),contained=typeof value==='number'?[...e!.quote.matchAll(/[+-]?\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?/g)].some(m=>Number(m[0].replace(/[ \u00a0\u202f]/g,'').replace(',','.'))===value):e!.quote.includes(text);
   if(!contained)refuse('Une valeur proposée n’est pas dans le passage cité.','A proposed value is not in the cited passage.','catalogue_unproved_value');
  }
 };
 let before:StudioProduct|null=null;
 if(plan.action==='update'){
  before=getProduct(pid,plan.target!.productId);
  if(before.version!==plan.target!.version)refuse('La fiche a changé. Reprenez sa version actuelle.','The listing changed. Use its current version.','catalogue_product_stale');
  if(before.status!=='draft')refuse('Cette version de SYNA modifie les brouillons uniquement. La fiche active reste intacte.','This SYNA version edits drafts only. The active listing stays intact.','catalogue_draft_required');
  const focus=metaOf(c).activeContext;
  if(focus?.target?.kind==='catalogue-product'||focus?.target?.kind==='catalogue-variant'){
   if(focus.target.productId!==before.id)refuse('La proposition ne concerne pas le produit désigné.','The proposal does not target the selected product.','catalogue_target_mismatch');
   const version=focus.target.kind==='catalogue-product'?focus.target.version:focus.target.productVersion;
   if(version!==before.version)refuse('Le repère sauvegardé est ancien. Redésignez la fiche.','The saved selection is old. Select the listing again.','catalogue_target_stale');
   if(focus.target.kind==='catalogue-variant'){
    const t=focus.target;if(Object.keys(plan.fields).some(k=>k!=='variants')||plan.fields.variants?.length!==1||plan.fields.variants[0].id!==t.variantId||plan.fields.variants[0].version!==t.version)refuse('Une seule variante est désignée. Précisez une cible plus large avant les autres modifications.','One variant is selected. Choose a broader target before other changes.','catalogue_variant_scope');
   }
  }else{proof('target',before.data.title);if(listProducts(pid,{includeArchived:true}).filter(p=>p.data.title===before!.data.title).length!==1)refuse('Plusieurs fiches portent ce titre. Désignez la fiche précise avant la proposition.','Several listings share this title. Select the exact listing before proposing.','catalogue_target_ambiguous');}
 }
 // IDs, versions et combinaisons de sélection proviennent du moteur, pas de faits commerciaux fabriqués.
 for(const leaf of exactLeaves(plan.fields,'fields')){
  if(/^fields\.variants\.\d+\.options(?:\.|$)/.test(leaf.path))continue;
  proof(leaf.path,leaf.value);
 }
 const f=plan.fields,assets=[] as ReturnType<typeof catalogueAsset>[],input:ProductInput={};
 for(const k of ['title','vendor','productType','categories','tags','options']as const)if(f[k]!==undefined)(input as Record<string,unknown>)[k]=f[k];
 if(f.description!==undefined)input.description_html=`<p>${escapeHtml(f.description)}</p>`;
 if(f.seo)input.seo={...(before?.data.seo??{title:'',description:''}),...f.seo};
 const moneyTexts=[f.price,f.compareAt,...(f.variants??[]).map(v=>v.price)].filter((v):v is string=>typeof v==='string'),currencies=new Set(moneyTexts.map(t=>catalogueMoney(t).currency)),currency=before?.data.currency??[...currencies][0]??'EUR';
 if([...currencies].some(v=>v!==currency))refuse('Les devises diffèrent. Aucune conversion ou réinterprétation automatique des prix.','Currencies differ. No automatic price conversion or reinterpretation.','catalogue_currency_mismatch');
 if(!before)input.currency=currency;
 for(const k of ['price','compareAt']as const)if(f[k]!==undefined)input[k]=f[k]===null?null:catalogueMoney(f[k]!).cents;
 if(f.images)input.images=f.images.map(ref=>{assets.push(catalogueAsset(c.user_id,pid,ref));const old=before?.data.images.find(a=>a.assetId===ref.assetId);return{assetId:ref.assetId,...(old?.file?{file:old.file}:{}),alt:ref.alt??old?.alt??f.title??before?.data.title??''};});
 const data=productDataSchema.parse({...before?.data,...input});
 if(data.options.some(o=>new Set(o.values.map(v=>v.toLowerCase())).size!==o.values.length)||new Set(data.options.map(o=>o.name.toLowerCase())).size!==data.options.length)refuse('Des options ou valeurs sont dupliquées. Précisez les choix distincts.','Options or values are duplicated. Specify distinct choices.','catalogue_duplicate_options');
 const count=data.options.reduce((n,o)=>n*o.values.length,1);
 if(count>100)refuse('Cette opération dépasse 100 combinaisons. Réduisez son périmètre ; aucune valeur n’est tronquée.','This operation exceeds 100 combinations. Narrow its scope; no values are truncated.','catalogue_variant_bound');
 const combos=combinations(data.options),combinationKeys=new Set(combos.map(c=>JSON.stringify(c.map(v=>v.toLowerCase()))));
 if(before?.variants.some(v=>!combinationKeys.has(JSON.stringify(v.options.map(x=>x.toLowerCase())))))refuse('Ce changement retirerait des variantes et leurs identifiants. SYNA le refuse : leur restauration exacte n’est pas assurée.','This would remove variants and their IDs. SYNA refuses because exact restoration is not assured.','catalogue_destructive_options');
 if(f.variants){
  const seen=new Set<string>();input.variants=f.variants.map(v=>{
   const k=JSON.stringify(v.options.map(x=>x.toLowerCase()));if(seen.has(k)||!combinationKeys.has(k))refuse('Combinaison dupliquée ou absente des options.','Duplicate combination or combination missing from options.','catalogue_invalid_variant');seen.add(k);
   const old=before?.variants.find(a=>JSON.stringify(a.options.map(x=>x.toLowerCase()))===k);
   if(old&&(v.id!==old.id||v.version!==old.version)||!old&&(v.id||v.version))refuse('La référence ou version de variante ne correspond pas.','Variant reference or version does not match.','catalogue_variant_stale');
   const patch:{options:string[];sku?:string;price?:number|null;stock?:number|null;image?:string|null}={options:v.options};
   if(v.sku!==undefined)patch.sku=v.sku;if(v.stock!==undefined)patch.stock=v.stock;if(v.price!==undefined)patch.price=v.price===null?null:catalogueMoney(v.price).cents;
   if(v.image!==undefined){if(v.image){assets.push(catalogueAsset(c.user_id,pid,v.image));patch.image=v.image.assetId;}else patch.image=null;}
   return patch;
  });
 }
 const variantImages=(before?.variants??[]).map(v=>({options:v.options,image:v.image}));for(const v of input.variants??[]){const old=variantImages.find(x=>JSON.stringify(x.options)===JSON.stringify(v.options));if(old&&v.image!==undefined)old.image=v.image??null;else if(!old)variantImages.push({options:v.options,image:v.image??null});}
 if((f.images!==undefined||f.variants?.some(v=>v.image!==undefined))&&variantImages.some(v=>v.image&&!data.images.some(i=>i.assetId===v.image)))refuse('Une image de variante doit aussi figurer dans la galerie de ce produit.','A variant image must also be in the product gallery.','catalogue_variant_image_missing');
 if((f.price!==undefined||f.compareAt!==undefined)&&data.price!==null&&data.compareAt!==null&&data.compareAt<=data.price)refuse('Le prix barré proposé n’est pas supérieur au prix. Précisez l’offre ; aucune économie inventée.','The proposed compare-at price is not higher than the price. Clarify the offer; no invented savings.','catalogue_inconsistent_compare_at');
 // Les médias conservés doivent également être présents et versionnés ; aucun remplacement de fichier silencieux.
 for(const i of data.images){const a=getAsset(i.assetId);try{if(!a)throw new HttpError(404,L('Image manquante.','Missing image.'));assets.push(catalogueAsset(c.user_id,pid,{assetId:a.id,version:a.version}));}catch(e){if(!(e instanceof HttpError)||!before?.data.images.some(old=>old.assetId===i.assetId)||f.images!==undefined)throw e;/* Média déjà invalide non touché : ne pas bloquer une correction indépendante. État exact conservé pour la reprise. */}}
 return{plan,input,before,assets:[...new Map(assets.map(a=>[a.assetId,a])).values()]};
}
