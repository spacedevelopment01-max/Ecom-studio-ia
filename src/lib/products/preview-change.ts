/** Prévisualisation transactionnelle des VRAIES opérations du catalogue ; aucune écriture de contenu persistée. */
import {tx} from '../db';
import {currentTheme} from '../projects';
import {createProduct,updateProduct,getProduct,seedFromTheme,ensureProductTables,withStudioProducts,type ProductInput,type StudioProduct} from './catalog';
import {storeProducts,type ThemeSpec} from '../theme/spec';
import {HttpError} from '../auth';
import {L} from '../i18n-server';
class RollbackPreview<T>{constructor(readonly value:T){}}
/** Comparaison des faits réellement projetés par le moteur, pas une seconde implémentation de l'import.
 * Le catalogue natif peut normaliser une ancienne boutique (SKU doublons, combinaisons incomplètes,
 * médias non représentables, indisponibilité sans quantité). SYNA ne doit pas appliquer cela en silence.
 */
function commercialState(spec:ThemeSpec){return storeProducts(spec).map(p=>{const single=!p.options.length||p.variants.length===1&&p.variants[0].title==='Default Title';return({
 title:p.title,handle:p.handle,description:p.description_html,vendor:p.vendor,price:p.price??p.variants[0]?.price??null,compareAt:p.compare_at_price,currency:p.currency,options:single?[]:p.options,images:p.images,tags:p.tags,
 variants:(p.variants.length?p.variants:[{options:[],price:p.price,available:true}]).map(v=>({options:single?[]:v.options,price:v.price??p.price,available:v.available,stock:'inventory_quantity'in v?v.inventory_quantity??null:null,sku:'sku'in v?v.sku??'':'',image:'image'in v?v.image??null:null})),
});});}
export function previewProductMutation(projectId:string,input:ProductInput,target?:{productId:string;version:number}){
 // La table paresseuse doit exister avant le savepoint ; son indicateur de chargement ne doit pas survivre à un DDL annulé.
 ensureProductTables();
 try{return tx(()=>{
  const theme=currentTheme(projectId);
  const originalSpec=theme?withStudioProducts(theme.spec,projectId):null;
  seedFromTheme(projectId,theme?.spec);
  const importedSpec=theme?withStudioProducts(theme.spec,projectId):null;
  if(originalSpec&&importedSpec&&JSON.stringify(commercialState(originalSpec))!==JSON.stringify(commercialState(importedSpec)))throw new HttpError(409,L('La reprise native modifierait des données commerciales existantes (variantes, références, disponibilité, prix ou médias). SYNA refuse cette reprise non fidèle. La boutique et ses données sont intactes.','Native import would alter existing commercial data (variants, references, availability, prices or media). SYNA refuses this unfaithful import. The store and its data remain intact.'),'catalogue_import_not_faithful');
  const before=target?getProduct(projectId,target.productId):null;
  const beforeSpec=theme?withStudioProducts(theme.spec,projectId,before?.status==='draft'?before:undefined):null;
  const after=target?updateProduct(projectId,target.productId,{...input,version:target.version}):createProduct(projectId,{...input,status:'draft'});
  const afterSpec=theme?withStudioProducts(theme.spec,projectId,after.status==='draft'?after:undefined):null;
  throw new RollbackPreview({before,after,beforeSpec,afterSpec,themeVersionId:theme?.version.id??null});
 });}catch(e){if(e instanceof RollbackPreview)return e.value as {before:StudioProduct|null;after:StudioProduct;beforeSpec:ReturnType<typeof withStudioProducts>|null;afterSpec:ReturnType<typeof withStudioProducts>|null;themeVersionId:string|null};throw e;}
}
