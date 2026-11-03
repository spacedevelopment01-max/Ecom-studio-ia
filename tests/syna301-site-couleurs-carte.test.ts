/** #301 v3 — carte « Retouche gratuite » : couleurs d'une section montrées en mots et pastilles, sans accolades JSON. */
import {expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {colorChanges,sectionSummary} from '@/components/studio/conversation-local-site';

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

it('FAQ ajoutée / annulation : le JSON de section est résumé en mots, le détail reste consultable',()=>{
 const after='FAQ après image_with_text_2 — contenu de départ à compléter : '+JSON.stringify([{id:'faq_2',type:'faq',settings:{heading:'Questions'},blocks:{question_1:{type:'question',settings:{question:'Combien de temps ?',answer:'<p>À compléter</p>'}},question_2:{type:'question',settings:{question:'Quel prix ?'}}},block_order:['question_1','question_2']}],null,2);
 const s=sectionSummary(after)!;
 expect(s.intro).toBe('FAQ après image_with_text_2 — contenu de départ à compléter');
 expect(s.items).toEqual(['Section « Questions fréquentes » (faq_2) : 2 éléments','— Combien de temps ?','— Quel prix ?']);
 expect(s.raw).toContain('"block_order"');
 expect(sectionSummary('Ordre : a → b')).toBeNull();
 expect(sectionSummary('Nouveau titre')).toBeNull();
});
