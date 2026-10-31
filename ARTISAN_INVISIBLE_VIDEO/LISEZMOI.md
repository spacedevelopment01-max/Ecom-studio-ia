# Publicité 01 — « L'artisan invisible »

Film publicitaire vertical (1080 × 1920, 58 s, 30 images/s) pour E-COM STUDIO IA, destiné aux artisans du bâtiment.
Fichier final : `artisan-invisible-1080x1920.mp4` (voix « cedar » d'OpenAI, sous-titres dynamiques intégrés, musique du
studio, effets sonores, volume normalisé à −15 LUFS).

## Ce que raconte le film

| Temps | Image | Voix |
| --- | --- | --- |
| 0–8 s | Gros plan d'un couteau à enduire sur une façade, recul jusqu'à la ville miniature à l'heure dorée. Les maisons s'allument, des recherches « plâtrier peintre près de chez moi » apparaissent : le camion blanc de l'artisan n'y figure pas. | « Vous faites du travail exceptionnel. Mais combien de futurs clients le savent ? » |
| 8–16 s | La caméra traverse le toit du camion : bureau miniature, l'artisan devant son ordinateur. Six outils séparés (site, retouche photo, réseaux, publicités, logo, référencement) sortent de l'écran et tournent autour de lui comme un cyclone. | « Créer un site, gérer les réseaux, préparer les publicités… Et trouver le temps de travailler ? » |
| 16–22 s | Le cyclone se fige, une vague bleue rassemble tout dans l'écran : le logo d'E-COM STUDIO ia, puis le studio sort de l'écran dans sa version mobile (écran vertical). L'artisan écrit à Syna : « Syna, je suis plâtrier-peintre. Aide-moi à développer ma visibilité. » | « Et si tout se trouvait au même endroit ? » |
| 22–43 s | Plateau blanc du studio : le logo 3M se construit et habille le camion ; la planche d'identité habille l'artisan ; le site (version mobile) se monte étage par étage (prestations, rénovations, réalisations, devis) ; les photos deviennent publications et publicité ; le calendrier se remplit (« À valider ») ; le SEO s'assemble ; l'artisan demande « Syna, mets mes rénovations intérieures en premier sur le site. » et la section se déplace, nouvelle version v2 restaurable. | « Votre logo, votre site, vos visuels, vos publicités. Et Syna, pour tout faire évoluer par simple conversation. » |
| 43–52 s | Retour en ville au crépuscule : le camion habillé roule, le site, la publication et la publicité flottent au-dessus du quartier, reliés entre eux ; des traits de lumière partent des maisons (du potentiel, aucun chiffre). Le logo 3M s'élève. | « Votre savoir-faire mérite d'être vu. » |
| 52–58 s | La caméra traverse le logo 3M et arrive sur fond bleu nuit, faisceaux de lumière, vrai logo d'E-COM STUDIO ia en relief. Textes : « E-COM STUDIO ia », « Faites connaître votre savoir-faire. », « Créez avec Syna. » | — |

## Fidélité au vrai produit (règles du brief)

**Composé pour le vertical (9:16)** : le studio est montré dans sa vraie version mobile (barre du haut, écran d'entrée,
panneau SYNA plein écran), le site de 3M en version mobile, la planche d'identité et le calendrier recomposés en
portrait avec les intitulés réels, les publications empilées. Chaque objet est cadré en entier, rien n'est rogné.

**Repris du studio réel (branche `main` actuelle)** — reconstruction fidèle des écrans en 3D, pas une capture en direct :
- Logo et mot-symbole d'E-COM STUDIO ia (SVG du studio : carré encre, « E » blanc, point bleu ; « ia » en italique bleu),
  couleurs (encre #0A1024, bleu #2F5BEA, papier #F5F7FC), polices Bricolage / Inter / Instrument, icônes lucide du studio.
- Syna est uniquement le panneau de conversation : « SYNA · Une mémoire pour tout le Studio », « SYNA · Votre projet, une
  conversation », « Je suis SYNA. Décrivez-moi votre projet en quelques mots. Vos réponses sont sauvegardées ; chaque
  réflexion attend votre accord sur son coût. », « Vos choix restent les vôtres. Aucune publication automatique. »
  Icône « étincelles » du studio. **Aucun avatar, aucun robot.**
- Écran d'entrée « Quel projet souhaitez-vous créer ? », champ « Votre idée, votre activité, ce qui compte pour vous… »,
  boutons « Lien / photo » et « Enregistrer », « Utiliser le formulaire manuel ».
- Réponse réelle après le premier message : « Message exact conservé. Une réponse IA nécessite maintenant un devis et
  votre confirmation. »
- Barre latérale d'un projet de services : Pilote, Activité, Stratégie, Marque, Site, Réalisations, Images, Vidéos,
  Publications, Publicités, Blog, Outils avancés ; onglets Discussion / Aperçu / Structure ; pastille de version v1 / v2.
- Modification : la section est **désignée** (« Section désignée : Rénovations intérieures », « Retirer la
  désignation ») et le studio la place **en haut de la page, sous l'ouverture** — c'est le comportement réel du moteur
  (`move_section`, réponse « Section placée en haut de la page (sous l'ouverture). »). Chaque modification crée une
  version restaurable.
- Publications : calendrier « Mois », statut « À valider », mention réelle « Aucune ne dépense d'IA ni ne publie sans
  approbation. » ; publicité en « Brouillon IA » ; rien n'est présenté comme publié ni activé.
- SEO & textes : Titre SEO, Adresse (slug), Méta-description, « Indicateurs SEO (contrôles locaux) — Aucun défaut
  détecté localement. », « Liens internes suggérés ».
- Planche d'identité : intitulés réels (IDENTITÉ DE MARQUE, Logo principal, Sceau · monogramme, Typographies, Papeterie,
  Icônes, noms de couleurs du studio).

**Fictif (créé pour la publicité)** : l'entreprise « 3M Plâtrerie Peinture », son logo, son site, ses textes, ses
publications et sa publicité ; les photos de chantier (pièces rendues en 3D, aucune personne) ; l'artisan (personnage
3D stylisé inventé, autorisé par le propriétaire) ; la ville.

**Aucun chiffre inventé** : pas de pourcentage, de visiteurs, de ventes, de demandes de devis ni de nouveaux clients.
Le retour en ville montre seulement des traits de lumière (le potentiel), jamais un résultat.

**À savoir (honnêteté)** : le film raccourcit le temps. Dans le studio réel, une demande formulée avec « en premier »
(et non « tout en haut ») passe par l'IA : Syna demande alors un devis et votre accord avant d'agir (le film montre ce
principe au premier message). Le résultat affiché (section sous l'ouverture, version v2) est bien celui du studio.

## Coût

Voix : 5 générations « gpt-4o-mini-tts » (voix cedar) + transcriptions pour les sous-titres, environ 0,01 $ au total
(accord du propriétaire). Aucun autre appel payant : 3D, interface, musique (compositeur du studio) et rendu sont
calculés localement.

## Refaire le film

```bash
cd projet && python3 -m http.server 8765 --bind 127.0.0.1
```
- Photos de chantier : `node ui/shoot-photos.cjs assets/tex` (scène 3D `ui/photos.html`).
- Écrans du studio et visuels 3M : `node ui/shoot-boards.cjs assets/tex` (planches `ui/boards.html`, versions verticales
  dans `ui/boards-mobile.js`).
- Sous-titres : `python3 caps.py` (heures des mots tirées des transcriptions `vo/*.json`), puis `python3 gen-index.py`.
- Son : `python3 mix.py` puis `python3 normwav.py assets/audio/mix-raw.wav assets/audio/mix.wav`.
- Images clés : `node snap.cjs renders/snap 1.5,10,25,41.9` ; rendu : `npx hyperframes render -q delivery -o renders/film.mp4 .`

Monde 3D : `assets/film.js` (caméra et enchaînement), `city.js`, `office.js`, `stage.js`, `end.js`, `actors.js`
(artisan, camion, couteau, logos), `lib.js`. Three.js 0.184 et GSAP sont copiés dans `assets/vendor/` (le rendu ne
dépend d'aucun réseau). Polices Outfit et Lato : licence OFL (fichiers joints).
