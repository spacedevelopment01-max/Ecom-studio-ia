/**
 * Couleur d'une seule section (opération native section_colors, utilisée par l'onglet Boutique et par SINA #359) :
 * l'opération crée un schéma propre « es-<section> » et la section reçoit la classe `color-es-<section>`. La règle qui
 * peint fond et texte ne visait que `color-scheme-…` : les variables changeaient (texte devenu blanc) mais le fond
 * n'était jamais peint — modification annoncée invisible et texte illisible (recette #301 v3, aperçu v2).
 */
import {expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {applyOps} from '@/lib/theme/ops';
import {serviceSpec} from './fixtures';

const css=(f:string)=>fs.readFileSync(path.resolve(import.meta.dirname,'../theme-base/assets',f),'utf8');
const painted=(sheet:string,cls:string)=>sheet.split('}').some(rule=>{const [sel,body='']=rule.split('{');if(!/background:\s*var\(--c-bg\)/.test(body)||!/color:\s*var\(--c-text\)/.test(body))return false;return [...sel.matchAll(/\[class\*="([^"]+)"\]/g)].some(m=>cls.includes(m[1]));});

it('la classe créée par section_colors est peinte (fond et texte du schéma)',()=>{
 const spec=serviceSpec('atelier' as never) as never as {templates:{index:{order:string[];sections:Record<string,{settings:Record<string,unknown>}>}}};
 const section=spec.templates.index.order[1];
 const r=applyOps(spec as never,[{op:'section_colors',template:'index',section,colors:{background:'#1D4ED8',text:'#FFFFFF'}}] as never,{targeted:new Set([`index:${section}`])} as never);
 expect(r.rejected).toEqual([]);
 const scheme=String((r.spec as unknown as typeof spec).templates.index.sections[section].settings.color_scheme);
 expect(scheme).toMatch(/^es-/);
 expect(painted(css('theme.css'),`color-${scheme}`)).toBe(true);
 // Les schémas d'origine restent peints.
 expect(painted(css('theme.css'),'color-scheme-2')).toBe(true);
});
