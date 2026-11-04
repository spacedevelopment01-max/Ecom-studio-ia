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
it('carte Fichiers en lecture (#377) : liste, miniatures, liens, « Désigner » explicite, jamais de reçu ni d’analyse annoncée',()=>{
 const card=fs.readFileSync('src/components/studio/conversation-local-files.tsx','utf8'),panel=fs.readFileSync('src/components/studio/conversation-panel.tsx','utf8');
 expect(card).toContain("s?.command==='read'");expect(card).toContain('data-syna-library-items');expect(card).toContain('src={item.thumbHref}');
 expect(card).toContain('n’a pas regardé les images');expect(card).toContain("t('Fichiers du projet — lecture gratuite'");
 expect(card).toContain('onDesignate(item)');expect(card).not.toContain('loading="lazy"');
 // La désignation reprend exactement le repère natif de l'écran Fichiers.
 expect(panel).toContain("setFocus({projectId,tab:'fichiers',label:item.name,target:item.target})");
});
it('cartes Animations (#379), Versions (#382), Dossier (#387), coordonnées (#384) et import photo (#378) : libellés honnêtes, aucune action sur une liste',()=>{
 const read=(f:string)=>fs.readFileSync('src/components/studio/'+f,'utf8');
 const motion=read('conversation-local-site-motion.tsx'),restore=read('conversation-local-theme-restore.tsx'),folders=read('conversation-local-folders.tsx'),profile=read('conversation-service-profile.tsx'),photo=read('conversation-photo-import.tsx'),panel=read('conversation-panel.tsx');
 expect(motion).toContain("subtle:t('discrète'");expect(motion).toContain('hasLocalSiteMotionReceipt(view)');
 // Versions : « Restaurer » remplit la phrase exacte, jamais sur la version actuelle ; confirmation seulement à l'état proposé.
 expect(restore).toContain('onSuggest(`Restaure la version ${c.number} du site`)');expect(restore).toContain('{!c.current&&<Button');
 expect(restore.split("'Confirmer gratuitement'").length).toBe(2);expect(restore).toContain("s?.state==='proposed'&&enabled&&<div");
 expect(folders).toContain("t('Racine (aucun dossier)'");expect(folders).toContain('aucun fichier n’est déplacé');
 for(const f of ['phone','email','area','contact'])expect(profile).toContain(f+':t(');
 // Photo : import gratuit non analysé, jointe explicitement au message suivant puis oubliée.
 expect(photo).toContain("'importée, non analysée'");expect(photo).not.toContain('loading="lazy"');
 expect(panel).toContain('photoIds:photo.photos.map(p=>p.photoId)');expect(panel).toContain("setText('');photo.clear();");
});
it('carte du profil : prix, durée et description des prestations (#390 → #392) avec la phrase exacte de chaque champ',()=>{
 const profile=fs.readFileSync('src/components/studio/conversation-service-profile.tsx','utf8');
 for(const f of ['service-price','service-duration','service-description'])expect(profile).toContain(`'${f}':t(`);
 expect(profile).toContain('Mets le prix de la prestation du profil « ${n} » à « »');
 expect(profile).toContain('Mets la durée de la prestation du profil « ${n} » à « »');
 expect(profile).toContain('Remplace la description de la prestation du profil « ${n} » par « »');
 expect(profile).toContain("t('(effacé)'");
});
it('carte du profil : le nom natif de la prestation visée (#395) est affiché hors ambiguïté',()=>{
 const profile=fs.readFileSync('src/components/studio/conversation-service-profile.tsx','utf8');
 expect(profile).toContain("service&&s?.serviceName&&s.state!=='ambiguous'");expect(profile).toContain('data-syna-service-name');
});
