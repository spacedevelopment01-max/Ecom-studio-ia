/** #301 v3 — carte « Retouche gratuite » : couleurs d'une section montrées en mots et pastilles, sans accolades JSON. */
import {expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {colorChanges} from '@/components/studio/conversation-local-site';

it('seules les couleurs qui changent sont listées, avec un libellé français',()=>{
 const before=JSON.stringify({background:'#F4F5F2',surface:'#EAECE9',text:'#182521',accent:'#254d43'}),after=JSON.stringify({background:'#1D4ED8',surface:'#EAECE9',text:'#FFFFFF',accent:'#254D43'});
 expect(colorChanges(before,after)).toEqual([{key:'background',label:'Fond',before:'#F4F5F2',after:'#1D4ED8'},{key:'text',label:'Texte',before:'#182521',after:'#FFFFFF'}]);
});
it('les autres retouches (titre, ordre, FAQ) gardent l’affichage d’origine',()=>{
 expect(colorChanges('Ancien titre','Nouveau titre')).toBeNull();
 expect(colorChanges(['a','b'],['b','a'])).toBeNull();
 expect(colorChanges('{"x":"pas une couleur"}','{"x":"#FFFFFF"}')).toBeNull();
});
it('la carte n’affiche plus l’objet brut quand ce sont des couleurs',()=>{
 const card=fs.readFileSync(path.resolve(import.meta.dirname,'../src/components/studio/conversation-local-site.tsx'),'utf8');
 expect(card).toContain('colorChanges(s.diff.before,s.diff.after)&&');
 expect(card).toContain('!colorChanges(s.diff.before,s.diff.after)&&');
});
