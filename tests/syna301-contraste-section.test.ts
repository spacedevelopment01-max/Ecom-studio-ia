/**
 * #301 « SYNA complète », lot 2 — couleur d'une seule section (section_colors, Studio et SYNA) : seuls fond et texte
 * changent ; surface, texte secondaire, accent et texte des boutons venaient de l'ancien fond et devenaient illisibles
 * (mesure navigateur scripts/syna301-contraste-section.ts : 199 textes sous 4,5:1 avant, 6 après sur 4 configurations).
 * Le thème les recalcule pour le schéma « es-<section> » uniquement quand le contraste manque ; les autres schémas
 * sont rendus à l'identique.
 */
import {expect,it} from 'vitest';
import {applyOps} from '@/lib/theme/ops';
import {compileTheme} from '@/lib/theme/compile';
import {renderPage} from '@/lib/theme/render';
import {sampleSpec} from './fixtures';

const lum=(h:string)=>{const n=h.replace('#','');return [0,2,4].map(i=>parseInt(n.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0);};
const ratio=(a:string,b:string)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
async function css(colors?:Record<string,string>){
 const base=sampleSpec('atelier' as never,'mono',{rich:true}) as never as {templates:{index:{order:string[]}}};
 const section=base.templates.index.order[1];
 const spec=colors?applyOps(base as never,[{op:'section_colors',template:'index',section,colors}] as never,{targeted:new Set([`index:${section}`])} as never).spec:base;
 const html=(await renderPage({spec,base:'/p',files:compileTheme(spec as never),cart:[]} as never,'/',new URLSearchParams())).html;
 const block=(id:string)=>{const i=html.indexOf(`.color-${id},`);return html.slice(i,html.indexOf('}',i));};
 const v=(b:string,k:string)=>b.match(new RegExp(`--c-${k}:\\s*(#[0-9a-fA-F]{6})`,'g'))!.map(m=>m.split(':')[1].trim()).at(-1)!;
 return {block,v,section};
}

for(const [nom,colors] of [['bleu',{background:'#1D4ED8',text:'#FFFFFF'}],['vert sombre',{background:'#14352B',text:'#F5F6F1'}],['crème',{background:'#FBF3E4',text:'#1B1B1B'}]] as const)
it(`section recolorée (${nom}) : texte secondaire, surface, accent et texte des boutons lisibles`,async()=>{
 const {block,v,section}=await css(colors);
 const b=block(`es-${section}`),bg=v(b,'bg'),text=v(b,'text'),surface=v(b,'surface'),muted=v(b,'muted'),accent=v(b,'accent'),at=v(b,'accent-text');
 expect(bg.toUpperCase()).toBe(colors.background);
 expect(ratio(text,surface)).toBeGreaterThanOrEqual(4.5);
 expect(Math.min(ratio(muted,bg),ratio(muted,surface))).toBeGreaterThanOrEqual(4.5);
 expect(Math.min(ratio(accent,bg),ratio(accent,surface))).toBeGreaterThanOrEqual(4.5);
 expect(ratio(at,accent)).toBeGreaterThanOrEqual(4.5);
});

it('les schémas d’origine sont rendus à l’identique',async()=>{
 const avant=await css(),apres=await css({background:'#1D4ED8',text:'#FFFFFF'});
 for(const id of ['scheme-1','scheme-2','scheme-3','scheme-4'])expect(apres.block(id)).toBe(avant.block(id));
});
