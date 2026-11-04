/** #301 « SYNA complète » — cartes Calendrier (#375) et Choix du thème (#376) : fuseau toujours affiché, aucun accord sur un refus. */
import fs from 'node:fs';
import {expect,it} from 'vitest';
import {calendarDate} from '@/components/studio/conversation-local-calendar';
it('les dates du calendrier portent toujours leur fuseau (contrat #375), en heure locale du brouillon',()=>{
 const ms=Date.UTC(2027,0,15,17,0);
 const paris=calendarDate(ms,'Europe/Paris'),tokyo=calendarDate(ms,'Asia/Tokyo');
 expect(paris).toMatch(/18:00/);expect(paris).toContain('(Europe/Paris)');
 expect(tokyo).toMatch(/02:00/);expect(tokyo).toContain('(Asia/Tokyo)');
 expect(calendarDate(ms,'Fuseau/Inconnu')).toMatch(/\(UTC\)$/);
 const card=fs.readFileSync('src/components/studio/conversation-local-calendar.tsx','utf8');
 expect(card).toContain('data-syna-calendar-before');expect(card).toContain('calendarDate(s.diff.after,tz,lang)');
});
it('la carte Thème montre les deux vrais aperçus et ne propose la confirmation qu’à l’état « proposé »',()=>{
 const card=fs.readFileSync('src/components/studio/conversation-local-theme-choice.tsx','utf8');
 expect(card).toContain('s.preview.beforeHref');expect(card).toContain('s.preview.afterHref');
 // Refus du moteur (retouches non reportées) = état « ambiguous » : aucun bouton de confirmation n'est rendu.
 expect(card.split("'Confirmer gratuitement'").length).toBe(2);
 expect(card.slice(card.indexOf("s?.state==='proposed'&&enabled&&<div"),card.indexOf("'Confirmer gratuitement'"))).not.toContain('\n');
 expect(card).toContain('onSuggest(`Choisis le thème ${c.name} pour mon site`)');
});
