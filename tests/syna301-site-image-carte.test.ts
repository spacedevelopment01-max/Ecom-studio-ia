/** #301 — carte Site, remplacement d'image (contrat Codex 73c8865a) : miniatures avant / après depuis `media`, sans JSON. */
import fs from 'node:fs';
import {expect,it} from 'vitest';
it('la carte Site affiche les miniatures avant / après du média natif, et « Aucune image » si le champ était vide',()=>{
 const card=fs.readFileSync('src/components/studio/conversation-local-site.tsx','utf8');
 expect(card).toContain('data-syna-site-media');
 expect(card).toContain("[['Avant',s.media.before],['Après confirmation',s.media.after]]");
 expect(card).toContain('src={m.previewHref}');
 expect(card).toContain('Aucune image');
 expect(card).not.toContain('loading="lazy"');
});
