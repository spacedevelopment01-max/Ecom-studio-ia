/**
 * #301 vague 2 — carte « Modification gratuite de la création » : l'état du reçu est dit au client en mots (FR / EN),
 * jamais par le code technique du serveur (relevé de la recette : « État du reçu : cancelled » après une annulation) ;
 * les effets de la retouche sont nommés en mots (« Taille du texte (px) », jamais « font.size ») et arrondis.
 */
import {expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {adReceiptStateLabel,adEffectLabel,adEffectValue} from '@/components/studio/conversation-local-ad-document';

const fr=(a:string)=>a,en=(_:string,b:string)=>b;
const STATES=['cancelled','stale','saved','recorded_job_unfinished','queued','running','failed','done','inconnu-futur'];

it('chaque état connu a un libellé FR et EN sans code technique',()=>{
 for(const s of STATES){
  const f=adReceiptStateLabel(s,fr),e=adReceiptStateLabel(s,en);
  for(const label of [f,e]){expect(label).not.toBe(s);expect(label).not.toContain('_');expect(label.split(' ').length).toBeGreaterThan(1);}
  expect(f).not.toMatch(/\b(cancelled|stale|queued|running|failed|saved|done)\b/);
  expect(f).not.toBe(e);
 }
 expect(adReceiptStateLabel('cancelled',fr)).toBe('proposition annulée, rien n’a été modifié');
 expect(adReceiptStateLabel('cancelled',en)).toBe('proposal cancelled, nothing was changed');
 expect(adReceiptStateLabel('failed',fr)).toMatch(/échouée/);
});

it('la carte n’affiche plus l’état brut',()=>{
 const card=fs.readFileSync(path.resolve(import.meta.dirname,'../src/components/studio/conversation-local-ad-document.tsx'),'utf8');
 expect(card).toContain('adReceiptStateLabel(s.state,t)');
 expect(card).not.toMatch(/\{s\.state\}/);
});

it('effets : libellés en mots, valeurs arrondies, champ inconnu sans code brut',()=>{
 for(const f of ['x','y','w','h','font.size','autoFit.minSize']){expect(adEffectLabel(f,fr)).not.toBe(f);expect(adEffectLabel(f,fr)).toMatch(/\(px\)$/);expect(adEffectLabel(f,en)).not.toBe(adEffectLabel(f,fr));}
 expect(adEffectLabel('font.size',fr)).toBe('Taille du texte (px)');
 expect(adEffectLabel('champ.futur',fr)).toBe('Autre réglage');
 expect(adEffectValue(212.16,fr)).toBe('212');
 expect(adEffectValue(null,fr)).toBe('(non défini)');
 const card=fs.readFileSync(path.resolve(import.meta.dirname,'../src/components/studio/conversation-local-ad-document.tsx'),'utf8');
 expect(card).toContain('adEffectLabel(e.field,t)');expect(card).not.toContain('{e.field}</dt>');
});
