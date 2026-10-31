/** Native catalogue identity for editorial work. No mutation, image call or main-product fallback. */
import {HttpError} from '../auth';
import {listProducts} from '../products/catalog';
import {resolveContentSubjectBinding,imageBindingHash,type ImageBinding} from '../image-v2/request-binding';
import {ContentBindingSchema} from './subject-contract';
import type {Project} from '../projects';
import type {ContentDoc,PageRef} from './types';

export function nativeContentTargets(p:Project):{page:PageRef;binding:ImageBinding}[]{
 if(p.business==='services')return [];
 return listProducts(p.id).flatMap(product=>{
  const base=`product:studio:${product.id}`,binding:ImageBinding={schema:1,people:'none',references:[],product:{productId:product.id,version:product.version}};
  const page=(key:string,title:string):PageRef=>({key,title:title.slice(0,200),kind:'product',status:'planned',url:null});
  return[{page:page(base,`${product.data.title} — ${product.handle}`),binding},...product.variants.filter(v=>v.options.length).map(v=>({page:page(`${base}:variant:${v.id}`,`${product.data.title} — ${v.options.join(' / ')} (${v.sku||product.handle})`),binding:{...binding,product:{...binding.product!,variant:{variantId:v.id,version:v.version}}}}))];
 });
}
export function contentSubjectProject(p:Project,binding?:ImageBinding):Project{
 return binding?resolveContentSubjectBinding(p,ContentBindingSchema.parse(binding)).project:p;
}
/** A service page carries the stable service key, never the first offer or all the other offers. */
export function contentServiceProject(p:Project,pageKey?:string):Project{
 if(p.business!=='services'||!pageKey?.startsWith('service:'))return p;
 const key=pageKey.slice('service:'.length),service=p.services.services.find(s=>s.key===key);
 if(!service)throw new HttpError(409,'La prestation désignée manque. Texte conservé ; choisissez sa cible actuelle.');
 return resolveContentSubjectBinding(p,{schema:1,people:'none',references:[],service:{key,sha256:imageBindingHash(service)}}).project;
}
/** Historical versions remain readable/editable. Unknown subject facts are never replaced by the main offer. */
export function documentSubject(p:Project,doc:ContentDoc):{project:Project|null;changed:boolean}{
 try{return{project:contentServiceProject(contentSubjectProject(p,doc.meta2.nativeBinding),doc.page.kind==='service'?doc.page.key:undefined),changed:false};}
 catch(e){if(e instanceof HttpError&&(e.status===404||e.status===409))return{project:null,changed:true};throw e;}
}
