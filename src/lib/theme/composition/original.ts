/** Base fonctionnelle en mémoire seulement. Aucun thème du catalogue ni rédaction locale. */
import {HttpError} from '../../auth';
import {stableHash} from '../../brain/hash';
import {collectImages,storeProduct} from '../../engine/shop';
import {assertStrategyChosen} from '../../marketing-strategy';
import {withStudioProducts} from '../../products/catalog';
import {loadProject} from '../../projects';
import {assertFresh} from '../../preparation/engine';
import {L} from '../../i18n-server';
import {stateOf,requireUpstream} from '../../preparation/store';
import {conversationOriginalEnabled} from '../../orchestrator/conversation/tool-flags';
import {assertThemeOperations} from '../plan-access';
import {scheme} from '../directions';
import {globalSettingDefaults,sectionSchema,withDefaults,type ThemeSpec,type SectionInstance,type TemplateJson} from '../spec';
import {assertSafeThemeContent} from '../content-security';
import {pick,type Lang} from '../../i18n';
export function originalCompositionBase(projectId:string){
 if(!conversationOriginalEnabled())throw new HttpError(409,L('Choisissez un thème avant de composer ses pages.','Choose a theme before composing its pages.'));
 const p=loadProject(projectId),brand=p.brand;
 if(!brand?.name.trim())throw new HttpError(409,L('Définissez la marque avant de composer le Site.','Define the brand before composing the Site.'));
 const state=stateOf(projectId);if(state){requireUpstream(state,'media');assertFresh(projectId,state,'media');}
 assertStrategyChosen(projectId);
 const language:Lang=p.settings.language==='en'?'en':'fr',t=(fr:string,en:string)=>pick(language,fr,en),services=p.business==='services';
 const section=(type:string,values:Record<string,unknown>={},blocks:{type:string;settings:Record<string,unknown>}[]=[]):SectionInstance=>{
  const schema=sectionSchema({customSections:{},language},type);if(!schema)throw new HttpError(409,L('Composant natif absent.','Native component missing.'));
  const settings=withDefaults(schema.settings,values);
  // Les valeurs commerciales par défaut ne sont pas les textes du client.
  for(const d of schema.settings)if(d.id&&!Object.hasOwn(values,d.id)&&['text','textarea','richtext','inline_richtext','url','image_picker','html','liquid','video'].includes(d.type))settings[d.id]=d.type==='image_picker'?null:'';
  return{type,settings,...(blocks.length?{blocks:Object.fromEntries(blocks.map((b,i)=>[`block_${i+1}`,{type:b.type,settings:withDefaults(schema.blocks.find(s=>s.type===b.type)?.settings,b.settings)}])),block_order:blocks.map((_,i)=>`block_${i+1}`)}:{})};
 };
 const template=(type:string,values:Record<string,unknown>={},blocks:{type:string;settings:Record<string,unknown>}[]=[],id='main'):TemplateJson=>({sections:{[id]:section(type,values,blocks)},order:[id]});
 const images=collectImages(projectId),description=p.product.summaryStatus==='provided'?p.product.summary:'';
 const product=storeProduct(p,{product:{title:p.product.name,description_html:description}},images.gallery,images.variantImages);product.contentTarget='product:main';
 const palette=brand.clientPalette??brand.palette;
 const spec:ThemeSpec={v:1,name:brand.name,language,direction:'original',settings:{...globalSettingDefaults({language}),theme_kit:'none',type_heading_font:brand.fonts.heading,type_body_font:brand.fonts.body,logo_asset:images.slots.logo??'',color_schemes:{'scheme-1':{settings:scheme(palette.light,palette.dark,palette.primary)},'scheme-2':{settings:scheme(palette.dark,palette.light,palette.accent)},'scheme-3':{settings:scheme(palette.secondary,palette.dark,palette.primary)},'scheme-4':{settings:scheme(palette.light,palette.dark,palette.accent)}}},
  groups:{header:{type:'header',name:t('En-tête','Header'),...template('header',{menu:'main-menu',show_cart:!services,show_search:!services,sticky:true})},footer:{type:'footer',name:t('Pied de page','Footer'),...template('footer',{show_wordmark:true,show_policies:false,show_payment:false})}},
  templates:{index:{sections:{},order:[]},product:template('main-product',{sticky_bar:true},[{type:'title',settings:{}},{type:'price',settings:{}},{type:'description',settings:{}},{type:'buy_buttons',settings:{picker:'buttons',show_quantity:true,show_dynamic_checkout:false}}]),collection:template('main-collection'),cart:template('main-cart'),search:template('main-search'),'404':template('main-404'),page:template('main-page'),'list-collections':template('main-list-collections'),'page.contact':template('contact-form',{heading:t('Votre demande','Your enquiry')},[],'contact')},
  customSections:{},locks:[],files:images.files,meta:{original:{schema:1,foundation:'native_functional_only',quality:'not_measured'}},
  store:{shopName:brand.name,business:services?'services':'products',product,pages:[{handle:'contact',title:t('Contact','Contact'),template_suffix:'contact',body_html:''}],menus:{'main-menu':{title:t('Navigation','Navigation'),links:[{title:t('Accueil','Home'),url:'/'},...(services?[]:[{title:t('Catalogue','Catalog'),url:'/collections/all'}]),{title:t('Contact','Contact'),url:'/pages/contact'}]}},policies:[]}};
 const result=withStudioProducts(spec,projectId);
 assertSafeThemeContent(result);
 // Même droit de structure que la conversation native, sans nouveau droit commercial.
 assertThemeOperations(projectId,result,[{op:'add_section',template:'index',type:'image-with-text'}],true);
 return{spec:result,version:{id:'original.'+stableHash('original-functional-211-v1',{spec:result,product:p.product,services:p.services,brand:p.brand,settings:p.settings,revision:state?.revision??null})},parentVersionId:null,isVirtual:true as const};
}
