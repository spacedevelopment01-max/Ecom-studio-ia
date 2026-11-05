/**
 * #301 — débordement mobile de l'onglet « Activité » (projet de services) : à 390 px la page mesurait 404 px.
 * Cause : dans la barre collante du bas (flex-wrap), les deux boutons remplissaient la ligne et le message d'état
 * (`flex-1`, base 0) restait sur la même ligne, écrasé à 0 px, son texte dépassant de la fenêtre. À 360 px les boutons
 * passaient à la ligne autrement, d'où l'absence de débordement. Une base minimale fait passer le message à la ligne.
 * Mesure navigateur : scripts/syna301-debordement-mobile.ts (Encre / Plein cadre, 390 / 360 / 1440 px, écrans voisins).
 */
import {expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

it('le message d’état de la barre Activité a une base minimale et passe à la ligne au lieu d’être écrasé',()=>{
 const src=fs.readFileSync(path.resolve(import.meta.dirname,'../src/components/studio/tab-activite.tsx'),'utf8');
 const bar=src.slice(src.indexOf('sticky bottom-3'),src.indexOf('</div>',src.indexOf('sticky bottom-3')));
 expect(bar).toContain('flex-wrap');
 const p=bar.match(/<p className="([^"]*)">/)?.[1]??'';
 expect(p.split(' ')).toEqual(expect.arrayContaining(['min-w-0','flex-1']));
 expect(p).toMatch(/\bbasis-(\d+|\[[^\]]+\])\b/);
});
