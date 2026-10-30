/** Native saved document fixture. FINAL is synthetic; no provider or creative qualification. */
import {saveContentVersion} from '../src/lib/seo-v2/store';
import {toHtml} from '../src/lib/seo-v2/doc';
import type {ContentDoc} from '../src/lib/seo-v2/types';
export function seedCompositionCopy(projectId:string,heading:string,description:string){
 const paragraph=Array.from({length:10},()=>description).join(' ')+' Fin du corps acquis : cette dernière phrase doit aussi être conservée.';
 const doc:ContentDoc={version:1,type:'home_page',lang:'fr',page:{key:'home:accueil',title:'Accueil',url:'/',kind:'home',status:'existing'},primaryKeyword:null,meta:{seoTitle:heading,metaDescription:description,slug:'',canonical:null,robots:'index,follow'},blocks:[{id:'title',kind:'h1',text:heading},{id:'body',kind:'p',text:paragraph},{id:'last',kind:'p',text:description}],schema:[],links:[],meta2:{source:'engine',by:'ai',runId:'simulated-acquired-copy-211',createdFrom:null}};
 const docKey='composition-copy-fixture',v=saveContentVersion(projectId,docKey,doc,{verdict:'FINAL',note:'Fixture uniquement : aucun fournisseur ni qualité IA réelle vérifiée.'});
 return{docKey,versionId:v.id,paragraph,bodyHtml:toHtml({blocks:doc.blocks.filter(b=>b.kind!=='h1')}),syntheticQuality:true};
}
