/** E1 : assemblage natif déterministe, sans fournisseur ni génération. */
import {describe,it,expect} from 'vitest';
import {sampleSpec,serviceSpec} from './fixtures';
import {assembleComposition,type CompositionDependencies} from '@/lib/theme/composition/assemble';
import {CompositionPlanSchema,type CompositionPlan,type CompositionSource} from '@/lib/theme/composition/contract';
import {compileTheme,exportThemeZip} from '@/lib/theme/compile';
import {renderPage} from '@/lib/theme/render';
import {unzipSync,strFromU8} from 'fflate';
import type {ThemeSpec} from '@/lib/theme/spec';
const original=(base:ThemeSpec):CompositionPlan=>({schema:1,mode:'hybrid',versionId:'version-1',summary:'Réordonner et composer une ouverture avec les contenus acquis.',pages:[{template:'index',sections:base.templates.index.order.map(section=>({kind:'existing',section,bindings:[],layout:[]}))}]});
function fixture(base=sampleSpec()){
 const sources:Record<string,CompositionSource>={
  title:{kind:'copy',text:'Une matière, des gestes, votre projet.',scope:'home',provenance:{kind:'client',ref:'brief.title'}},
  body:{kind:'copy',text:'<p>'+('Texte intégral acquis et propre à cette page. '.repeat(80))+'</p>',scope:'home',provenance:{kind:'acquired',ref:'copy.receipt.1'}},
  photo:{kind:'media',assetId:'own-image-1',filename:'own-image-1.webp',scope:'home',provenance:{kind:'client',ref:'asset.own-image-1'}},
  contact:{kind:'link',url:'/pages/contact',scope:'site',provenance:{kind:'client',ref:'native.contact'}},
 };
 const seen:unknown[]=[];const deps:CompositionDependencies={versionId:'version-1',scope:t=>t==='index'?'home':t,source:id=>sources[id],authorize:ops=>{seen.push(...ops);},media:id=>id==='own-image-1'?{filename:'own-image-1.webp'}:null};
 const plan=original(base);plan.pages[0].sections.unshift({kind:'component',id:'opening',type:'image-with-text',blocks:[],layout:[],bindings:[{key:'heading',source:'title'},{key:'text',source:'body'},{key:'image',source:'photo'}]});return{base,sources,seen,deps,plan,apply:(p:unknown=plan)=>assembleComposition(base,p,deps)};
}
describe('#211 E1 — plan sûr, composants natifs, sources intégrales',()=>{
 it('refuse les liens hors site, JavaScript et antislashs de redirection',()=>{for(const url of ['https://intrus.invalid','javascript:alert(1)','/\\intrus.invalid','//intrus.invalid']){const f=fixture();if(f.sources.contact.kind==='link')f.sources.contact.url=url;f.plan.pages[0].sections[0].bindings.push({key:'button_link',source:'contact'});expect(()=>f.apply()).toThrow('lien natif');}});
 it('applique une disposition native et rejette une valeur hors schéma',()=>{const f=fixture();f.plan.pages[0].sections[0].layout=[{key:'layout',value:'image-left'}];const r=f.apply(),sid=r.spec.templates.index.order[0];expect(r.spec.templates.index.sections[sid].settings.layout).toBe('image-left');f.plan.pages[0].sections[0].layout=[{key:'layout',value:'invented-unsafe-layout'}];expect(()=>f.apply()).toThrow();});

 it.each(['mono','multi','service'] as const)('compose et exporte sans toucher aux parcours existants (%s)',async kind=>{
  const f=fixture(kind==='service'?serviceSpec():sampleSpec('atelier',kind)),before=structuredClone(f.base),r=f.apply(),sid=r.record.templateSections.index[0];
  expect(f.base).toEqual(before);expect(r.spec.templates.product).toEqual(before.templates.product);expect(r.spec.store).toEqual(before.store);expect(r.spec.groups).toEqual(before.groups);
  expect(r.spec.templates.index.sections[sid].settings).toMatchObject({heading:f.sources.title.kind==='copy'?f.sources.title.text:'',text:f.sources.body.kind==='copy'?f.sources.body.text:'',image_asset:'own-image-1.webp',button_label:''});expect(r.spec.files['own-image-1.webp']).toBe('own-image-1');expect(r.record.quality).toBe('not_measured');expect(r.record.platformInstallation).toBe('not_tested');
  const files=compileTheme(r.spec),home=await renderPage({spec:r.spec,files,base:'/p',cart:[]},'/',new URLSearchParams());expect(home.status).toBe(200);expect(home.html).toContain('Une matière, des gestes, votre projet.');expect(home.html).toContain('Texte intégral acquis');
  const zip=unzipSync((await exportThemeZip(r.spec,()=>null)).zip);expect(zip['templates/index.json']).toBeTruthy();expect(strFromU8(zip['templates/index.json'])).toContain('Texte intégral acquis');expect(zip['templates/cart.json']).toBeTruthy();
 });
 it('refuse une source de produit utilisée pour une autre page, avant toute sauvegarde',()=>{const f=fixture();f.sources.title.scope='product:autre';expect(()=>f.apply()).toThrow('autre page');expect(f.base.templates.index.order).toEqual(original(f.base).pages[0].sections.map(s=>s.kind==='existing'?s.section:s.id));});
 it('refuse des identifiants, paramètres et cibles en double ou forgés',()=>{const f=fixture();expect(CompositionPlanSchema.safeParse({...f.plan,script:'alert(1)'}).success).toBe(false);const p=structuredClone(f.plan);p.pages.push(p.pages[0]);expect(CompositionPlanSchema.safeParse(p).success).toBe(false);const s=f.plan.pages[0].sections[0];expect(CompositionPlanSchema.safeParse({...f.plan,pages:[{template:'index',sections:[s,s]}]}).success).toBe(false);expect(CompositionPlanSchema.safeParse({...f.plan,versionId:'__proto__'}).success).toBe(false);});
 it('refuse scripts et contenu hors schéma au lieu de générer du code',()=>{const f=fixture();if(f.sources.title.kind==='copy')f.sources.title.text='<script>alert(1)</script>';expect(()=>f.apply()).toThrow('sécurité');const p=structuredClone(f.plan);const s=p.pages[0].sections[0];if(s.kind==='component')s.type='es-custom-script';expect(()=>f.apply(p)).toThrow('bibliothèque');});
 it('refuse le sur-mesure non raccordé et les thèmes importés',()=>{const f=fixture();expect(()=>f.apply({...f.plan,mode:'original'})).toThrow('non raccordé');expect(()=>assembleComposition({...f.base,imported:{} as ThemeSpec['imported']},f.plan,f.deps)).toThrow('importé');});
 it('refuse le mauvais parent et toute erreur d’autorisation native',()=>{const f=fixture();expect(()=>f.apply({...f.plan,versionId:'version-2'})).toThrow('périmée');f.deps.authorize=()=>{throw new Error('forfait insuffisant');};expect(()=>f.apply()).toThrow('forfait insuffisant');});
 it('conserve les fonctions et les verrous, même sur une recomposition hybride',()=>{const f=fixture();f.plan.pages[0]={template:'product',sections:[f.plan.pages[0].sections[0]]};f.deps.scope=()=> 'home';expect(()=>f.apply()).toThrow('fonctionnelle');const g=fixture();const locked=g.base.templates.index.order[0];g.base.locks.push('index:'+locked);expect(()=>g.apply()).toThrow('position verrouillée');const p=original(g.base);expect(()=>g.apply(p)).not.toThrow();});
 it('ne permet aucune mutation d’un formulaire par un champ de composition',()=>{const f=fixture(serviceSpec());const candidate=Object.entries(f.base.templates).find(([,t])=>t.order.some(id=>/contact|booking|form/.test(t.sections[id].type)));expect(candidate).toBeTruthy();const [name,t]=candidate!;const sid=t.order.find(id=>/contact|booking|form/.test(t.sections[id].type))!;f.deps.scope=()=> 'home';expect(()=>f.apply({...f.plan,pages:[{template:name,sections:t.order.map(section=>({kind:'existing',section,bindings:section===sid?[{key:'heading',source:'title'}]:[],layout:[]}))}]})).toThrow('métier');});
 it('refuse un média absent, modifié ou masqué par une sélection Shopify',()=>{const f=fixture();f.deps.media=()=>null;expect(()=>f.apply()).toThrow('média');const g=fixture();g.sources.photo={...g.sources.photo,filename:'forged.webp'} as CompositionSource;expect(()=>g.apply()).toThrow('média');});
 it('refuse texte en réglage de disposition et type de bloc absent',()=>{const f=fixture(),s=f.plan.pages[0].sections[0];s.layout=[{key:'button_label',value:'Une invention'}];expect(()=>f.apply()).toThrow('schéma sûr');const g=fixture(),x=g.plan.pages[0].sections[0];if(x.kind==='component')x.blocks=[{id:'x',type:'script'}];expect(()=>g.apply()).toThrow();});
 it('l’adaptation conserve toutes les sections et les textes longs entiers',()=>{const f=fixture();f.plan.mode='adapt';const r=f.apply();expect(r.spec.templates.index.order).toHaveLength(f.base.templates.index.order.length+1);expect(r.record.sourceRefs.map(s=>s.ref)).toContain('copy.receipt.1');f.plan.pages[0].sections.pop();expect(()=>f.apply()).toThrow('conservées');});
});
