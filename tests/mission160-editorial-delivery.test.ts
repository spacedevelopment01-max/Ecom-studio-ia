/** Regression found in actual browser review: alt descriptions must not replace acquired commercial copy. */
import {it,expect} from 'vitest';
import {clientFixture} from './mission154-fixtures';
import {buildShop} from '@/lib/engine/shop';
import {currentTheme,loadProject} from '@/lib/projects';
import {all,run} from '@/lib/db';
for(const services of [false,true])it(`séquence éditoriale conservée, description média uniquement accessible, services=${services}`,async()=>{
 const f=await clientFixture({services,copySource:'ai'});
 const originals=all<{id:string;meta:string}>('SELECT id,meta FROM assets WHERE project_id=? AND kind=\'image\' AND role!=\'logo\'',f.pid);
 for(const row of originals){const m=JSON.parse(row.meta);m.themeContent={...m.themeContent,description:`DESCRIPTION_ACCESSIBILITE_${row.id}`};run('UPDATE assets SET meta=? WHERE id=?',JSON.stringify(m),row.id);}
 await buildShop(null,f.pid,{direction:services?'rive':'traverse',useAi:false});const spec=currentTheme(f.pid)!.spec;
 let altSeen=false;const visible:string[]=[];const headings:string[]=[];
 for(const page of Object.values(spec.templates))for(const section of Object.values(page.sections)){
  const visit=(settings:Record<string,unknown>)=>{for(const [key,value] of Object.entries(settings)){if(typeof value!=='string')continue;if(/alt$/.test(key)&&value.startsWith('DESCRIPTION_ACCESSIBILITE_'))altSeen=true;if(/^(title|heading|text|lead|intro|description|caption)$/.test(key))visible.push(value);}};
  if(page===spec.templates.index&&/alternating/.test(section.type)){const first=Object.values(section.blocks??{})[0];if(first)expect(section.settings.heading).not.toBe(first.settings.heading??first.settings.title);}
  visit(section.settings);for(const block of Object.values(section.blocks??{})){visit(block.settings);if(page===spec.templates.index&&/alternating/.test(section.type)){const heading=block.settings.heading??block.settings.title;if(typeof heading==='string')headings.push(heading);}}
 }
 expect(altSeen).toBe(true);expect(visible.join(' ')).not.toContain('DESCRIPTION_ACCESSIBILITE_');
 if(!services){expect(headings.length).toBeGreaterThan(1);expect(new Set(headings).size).toBe(headings.length);expect(visible.join(' ')).toContain('Partager le moment');}
 else expect(visible.join(' ')).toContain(loadProject(f.pid).services.services[1].name);
 expect(all('SELECT id FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'',f.pid)).toHaveLength(0);
});
