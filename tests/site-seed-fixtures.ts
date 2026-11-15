/** Site technique fictif pour contrôler l'interface F1, jamais un thème client ou une démo validée.
 * Textes écrits pour cette recette, diagramme créé localement et annoncé comme tel ; aucune qualité IA revendiquée.
 */
import sharp from 'sharp';
import {one} from '../src/lib/db';
import {saveAsset} from '../src/lib/library';
import {saveThemeVersion} from '../src/lib/projects';
import {buildSpec} from '../src/lib/theme/directions';
import type {ShopCopy} from '../src/lib/theme/copy';
export async function seedAgentUiSite(projectId:string,business:string){
  const project=one<{user_id:string}>('SELECT user_id FROM projects WHERE id=?',projectId);if(!project)throw Error('Fixture project missing');
  const service=business==='services',name=service?'Atelier des cordes — RECETTE':'Capteurs de ruches — RECETTE';
  const heading=service?'Votre instrument, votre histoire.':'Observer la ruche, comprendre son rythme.';
  const description=service?'Réparation des instruments apportés à l’atelier. Devis et rendez-vous à préciser ensemble.':'Des capteurs pour les ruches. Les performances, tarifs et délais restent à confirmer.';
  const cta=service?'Parler de mon instrument':'Découvrir les capteurs';
  const copy:ShopCopy={
    seo:{title:name,description},announcement:['RECETTE ISOLÉE — site technique fictif, non publié'],
    hero:{eyebrow:service?'Réparation d’instruments':'Capteurs pour les ruches',heading,line1:service?'Votre instrument,':'Observer la ruche,',line2:service?'votre histoire.':'comprendre son rythme.',text:description,cta},
    statement:{eyebrow:'Informations conservées',heading:service?'Réparer ce qui vous accompagne.':'Chaque projet commence par une question.',text:description},
    features:{heading:'Les repères du projet',items:[{title:service?'Vos instruments':'Vos ruches',text:service?'Les clients apportent leurs instruments.':'La demande porte sur plusieurs capteurs pour les ruches.',icon:'hand'},{title:'À préciser ensemble',text:'Aucune performance ni promesse commerciale inventée.',icon:'check'}]},
    story:{heading:'Construire le projet',steps:[{title:'Vos besoins',text:'Les mots du client restent conservés.'},{title:'Les informations manquantes',text:'Elles restent à préciser.'}]},
    detail:{eyebrow:'Recette de l’interface',heading:'Un aperçu natif, une conversation commune.',text:'Le diagramme est une illustration technique de test, pas une photographie commerciale.'},
    specs:{heading:'Faits du projet',items:[{label:'Activité',value:service?'Réparation d’instruments':'Capteurs pour ruches'}]},
    faq:{heading:'À préciser',items:[{q:'Quels tarifs ?',a:'Ils restent à confirmer par le client.'},{q:'Quels délais ?',a:'Ils restent à confirmer par le client.'}]},
    marquee:[service?'Instruments apportés par les clients':'Capteurs pour les ruches','RECETTE ISOLÉE'],
    gallery:{heading:'Illustration technique de recette',captions:['Diagramme local, pas une photo du projet.']},
    cta:{heading:'Parlons de votre projet.',text:description,button:cta},newsletter:{heading:'Rester en contact',text:'Formulaire de recette, aucun envoi.'},
    product:{title:service?'Réparation d’instruments':'Capteur de ruche',short:description,description_html:`<p>${description}</p>`,highlights:[],tabs:[],reassurance:[]},
    about:{heading:'Votre projet',intro:description,blocks:[{heading:'Les acquis',text:description}],values:[]},shipping:{heading:'Délais',body_html:'<p>À confirmer.</p>'},contact:{heading:'Votre demande',text:description},footer:{about:description,newsletter:'Aucun envoi pendant la recette.'},
  };
  const svg=`<svg width="1400" height="1000" xmlns="http://www.w3.org/2000/svg"><rect width="1400" height="1000" fill="#e5eadf"/><circle cx="860" cy="470" r="290" fill="#c9d4bd"/><rect x="610" y="240" width="500" height="430" rx="56" fill="#254d43"/><path d="M700 520h320M700 570h320M700 620h320" stroke="#a4c9a1" stroke-width="12"/><circle cx="860" cy="380" r="72" fill="#e3b767"/><text x="70" y="865" font-size="34" fill="#254d43">ILLUSTRATION TECHNIQUE — RECETTE ISOLÉE</text></svg>`;
  const asset=await saveAsset({projectId,userId:project.user_id,name:'illustration-technique-recette.webp',mime:'image/webp',data:await sharp(Buffer.from(svg)).webp().toBuffer(),origin:'upload',role:'hero',meta:{testFixture:211,illustration:true,note:'Diagramme local de recette, pas une photo commerciale'}});
  const filename='es-recette-interface.webp';
  const services={services:[{name:'Réparation d’instrument',description:'Instrument apporté par le client',price:'',duration:''}],area:'',address:'',phone:'',email:'',hours:'',bookingUrl:'',contactMode:'quote' as const,contactModes:['quote','booking']as ('quote'|'booking')[]};
  const spec=buildSpec({direction:'atelier',shopName:name,palette:{primary:'#254d43',secondary:'#c9d4bd',accent:'#b68a44',light:'#f5f6f1',dark:'#172b25'},copy,images:{hero:filename,packshot:filename},files:{[filename]:asset.id},product:{title:copy.product.title,handle:'offre-recette',vendor:name,description_html:copy.product.description_html,price:null,compare_at_price:null,currency:'EUR',options:[],variants:[],images:[filename],tags:[]},language:'fr',...(service?{business:'services',services}:{} )});
  const version=saveThemeVersion(projectId,spec,'Site technique de recette F1 — aucune qualification créative','system');
  return{projectId,versionId:version.id,number:version.number,name,heading,description,illustration:'local-technical-fixture-not-product-photo'};
}
