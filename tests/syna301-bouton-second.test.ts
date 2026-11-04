/**
 * #301 — relecture automatique de #369 (P2) : le second bouton natif s'appelle `button2_label` (héros, diaporama…).
 * L'ancienne expression n'acceptait que `button_2_label` : le second bouton désigné était refusé, et une section
 * entière à deux boutons passait pour « non ambiguë » (le premier aurait été modifié sans demander lequel).
 */
import {expect,it} from 'vitest';
import {buttonKey} from '@/lib/orchestrator/conversation/local-site';
import {serviceSpec} from './fixtures';

it('les clés natives des deux boutons sont reconnues, rien d’autre',()=>{
 for(const k of ['button_label','button2_label','button_2_label','button_text','button2_text','cta_label','cta_text'])expect(buttonKey(k),k).toBe(true);
 for(const k of ['button2','button_link','button2_link','heading','label','buttons_label'])expect(buttonKey(k),k).toBe(false);
 expect(buttonKey('label','button')).toBe(true);
});

it('une section native à deux boutons a bien deux candidats (désignation de la section entière = ambiguë)',()=>{
 const spec=serviceSpec('atelier' as never) as never as {templates:{index:{order:string[];sections:Record<string,{settings:Record<string,unknown>}>}}};
 const twoButtons=spec.templates.index.order.map(id=>spec.templates.index.sections[id]).find(s=>'button2_label' in s.settings);
 expect(twoButtons,'section à deux boutons dans la démonstration de services').toBeDefined();
 expect(Object.keys(twoButtons!.settings).filter(k=>buttonKey(k)).sort()).toEqual(['button2_label','button_label']);
});
