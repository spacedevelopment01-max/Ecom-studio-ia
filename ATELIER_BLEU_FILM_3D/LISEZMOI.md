# « Votre entreprise prend une autre dimension » — film 3D pour les sociétés de services

**Film :** `ATELIER-BLEU_film-3D_1080x1920.mp4` — vertical 9:16, 1080 × 1920, 30 images/s, 65,8 s, son stéréo
normalisé pour les réseaux (−14 LUFS, crête −1 dB).

Projet **séparé** du studio : rien dans le site, le studio, le thème ou les tests n'a été modifié, et rien n'a été publié.
**Coût : 0 €** — aucune API payante, aucun appel d'IA payant, aucune ressource achetée.

## L'idée

Une entreprise fictive, **ATELIER BLEU — peinture intérieure et rénovation** (Lyon et ses environs), suivie du début à
la fin : même nom, même logo, mêmes prestations, même réalisation (un salon repeint, mur bleu nuit), même identité.
L'entreprise devient un bâtiment impossible, suspendu dans un univers bleu ; chaque espace du bâtiment montre une
fonction du studio. Grand spectacle pendant les transitions, plans stables et lisibles pendant les explications,
une seule information principale à l'écran.

| # | Séquence | Ce qu'on voit | Texte à l'écran |
|---|---|---|---|
| 1 | Ouverture | Un rouleau géant (fibres, peinture fraîche, reflets) déroule une surface bleue dans le vide ; elle se plie rangée par rangée et devient la façade ; recul : le bâtiment surgit, l'enseigne ATELIER BLEU s'allume. Puis trois morceaux flottent, nommés quand la voix les dit : Site, Visuels, Communication. | « Votre métier mérite d'être vu. » |
| 2 | Point de départ | Les morceaux sont aspirés dans la façade, qui s'ouvre comme une architecture articulée. Dans le hall, l'écran du studio : les quatre informations se remplissent sur le mot prononcé (Activité, Prestations, Zone, Style). Plan tenu ≈ 7 s. | « Tout se crée au même endroit. » puis « 1. Décrivez votre activité. » |
| 3 | Identité | La caméra traverse l'œil du B de l'enseigne et entre dans un atelier graphique monumental : le logo s'assemble en volume, cinq surfaces de couleur se déploient, « Aa » se construit. Composition stable Logo / Couleurs / Typographie, puis le résultat : enseigne, papier à en-tête (devis) et carte de visite. | « 2. Créez votre identité. » |
| 4 | Site | Le bâtiment se déplie verticalement et révèle le site d'ATELIER BLEU intégré dans sa structure. Gros plans successifs, chacun sur son mot : ce que fait l'entreprise, la prestation « Murs et plafonds » (vrai texte), la réalisation avant / après, la zone d'intervention, le bouton « Nous contacter ». | « 3. Présentez vos services en ligne. » |
| 5 | Communication | La caméra entre dans la photo de la réalisation, qui devient la pièce en 3D grandeur nature ; le mobilier s'éloigne, les pans du mur pivotent : publication, story (avant / après), publicité, chacune en gros plan, puis la composition d'ensemble. | « 4. Préparez votre communication. » |
| 6 | Contrôle | L'écran « Modifier la publicité » au-dessus de la publicité : « à Lyon » est tapé dans le titre, « Valider », puis la publicité se met à jour sous nos yeux. Chaque mot de la légende s'allume avec son action. | « Ajustez. Personnalisez. Validez. » |
| 7 | Révélation | Sortie du bâtiment : les volumes nommés Identité, Site, Communication glissent et se transforment pour devenir les trois bras d'un « E » dont le bâtiment est la colonne ; le carré sombre et le point bleu se posent : c'est le pictogramme E-COM STUDIO IA. Le nom, puis la phrase ; balayage de lumière sur « lumière ». | « Moins d'outils à gérer. » « Une image cohérente. » « Du temps pour votre métier. » puis E-COM STUDIO IA — « Votre activité, mise en lumière. » |

Le détail phrase par phrase (instants de chaque mot-clé et de chaque transition) est dans
`narration/synchronisation.md`.

## Voix off

- Voix **française de synthèse gratuite** (Kokoro, licence Apache 2.0, calculée sur la machine) : voix « ff_siwis »,
  débit ralenti à 0,94 pour une diction confortable, respirations entre les phrases.
- Chaque phrase a été **retranscrite automatiquement** (Whisper, local) et comparée au texte : `narration/verification-voix.txt`.
  Le nom « E-COM STUDIO IA » est lu « i-com studio i-a » (la transcription l'écrit « Icom/comme studio IA », faute de
  connaître ce mot).
- L'instant de chaque mot-clé (« prestations », « réalisations », « publicités »…) est mesuré par alignement des spectres,
  puis vérifié en coupant l'audio à cet instant et en le retranscrivant : la coupe tombe bien sur le mot.
- **Pour une voix plus chaleureuse** (comédien ou service de voix) : texte et fichier attendu dans
  `narration/voix-a-generer.md`. Le montage se recale tout seul sur la durée réelle du fichier fourni.

## Musique et bruitages

Tout est **synthétisé par le projet** (`scripts/bande-son.py`) : aucune banque de sons, aucun droit à acheter.
Musique électronique cinématographique (nappes, basse pulsée, arpèges, percussions, montées) qui suit le film :
démarrage sur un grave tenu, entrée du rythme quand l'enseigne s'allume, respiration pendant le formulaire, plein
régime sur l'identité et le site, montée finale avec roulement, puis **résolution** en ré majeur sur le nom du studio
(mélodie de cloches) et longue fin. La musique se retire d'environ 8,5 dB sous la voix.
Bruitages calés sur l'image : rouleau mouillé, pliage des rangées, impacts de changement d'échelle, arrivée des volumes,
enseigne qui s'allume, charnières de la façade, saisie des champs, traversée du B, pièces du logo qui s'emboîtent,
surfaces de couleur, dépliage du bâtiment, clic du bouton, plongée dans la photo, pivots des pans, frappe au clavier,
validation, mise à jour, alignement du « E », point bleu qui se pose, balayage de lumière.

## Ce qui a été vérifié — et ce qui ne l'a pas été

Vérifié :
- planches d'images à 30 à 40 instants répartis sur tout le film, regardées une à une à chaque version (lisibilité des
  écrans, cadrages, légendes qui ne recouvrent pas ce qui est expliqué, rien de coupé) ;
- transcription de chaque phrase de la voix et des instants des mots-clés ;
- mesures du son : niveaux de chaque piste, écart voix / musique sous la voix (≈ 15 dB), absence de saturation,
  spectre (les claquements de fin de notes repérés sur une première version ont été corrigés).

Pas vérifié (à faire de votre côté) :
- **l'écoute** : je ne peux pas écouter ; la qualité musicale, le naturel de la voix et l'équilibre ressenti sont à
  juger à l'oreille ;
- le rendu 3D est calculé par la carte graphique logicielle de la machine (pas de lancer de rayons) : matières,
  ombres et reflets sont réels, mais ce n'est pas un rendu de qualité « cinéma » image par image.

## Honnêteté du contenu

- ATELIER BLEU est **fictif** ; le film montre un exemple. Aucun avis, chiffre, délai, prix ou certification inventé ;
  aucun téléphone ni e-mail (pour ne pas viser de vraies personnes) ; aucune personne représentée.
- Les écrans du studio reprennent les vraies couleurs, polices et libellés du studio (« Le site de mon entreprise de
  services », « Zone d'intervention », onglets Marque / Site / Images / Publications / Publicités, bouton « Nous contacter »
  des sites de services). **Simplification à connaître** : le vrai formulaire n'a pas de champ « Style » ; le style se
  donne dans la description de l'activité puis se choisit avec le thème et le style du logo. Le film le montre comme
  un champ pour que l'idée soit claire en une seconde ; à remplacer si vous préférez coller strictement à l'écran réel.
- Le contact passe par le bouton « Nous contacter » (fonction réelle des sites de services) ; aucune réservation ni
  devis interactif n'est montré. Le « devis » visible est un **document papier** de l'identité (papier à en-tête), sans prix.
- Les photos du salon (avant / après) ne sont pas des photos ni des images d'IA : ce sont des rendus de la pièce 3D
  du film, réutilisés tels quels sur le site, la publication, la story et la publicité.
- Logos exacts : celui d'E-COM STUDIO IA est reconstruit depuis son tracé officiel (`public/favicon.svg`) ; celui
  d'ATELIER BLEU (pastille bleue et rouleau) est créé pour l'exemple (`ui/img/logo-atelier-bleu.svg`).

## Refaire le film

```bash
cd ATELIER_BLEU_FILM_3D && npm install                  # three.js et la police Montserrat (libres)
pip install sherpa-onnx==1.12.40 soundfile numpy scipy  # voix Kokoro et bande-son
python3 scripts/voix.py --model-dir …/kokoro-multi-lang-v1_0   # voix (ou scripts/decouper-voix.py pour une voix fournie)
node scripts/planning.cjs        # place les phrases et les transitions → montage/timeline.json
node scripts/photos.cjs          # photos du salon rendues en 3D → ui/img/
node scripts/ecrans.cjs          # écrans HTML photographiés → ui/png/ (+ zones de cadrage)
node scripts/reperes.cjs         # repères de l'image → montage/reperes.json
python3 scripts/bande-son.py     # musique, bruitages, voix, mixage → audio/
node scripts/rendre.cjs          # rendu image par image + assemblage → ATELIER-BLEU_film-3D_1080x1920.mp4
node scripts/apercu.cjs 12.5 33 49   # contrôle rapide de quelques instants (planche d'images)
```

Modèles libres utilisés (non inclus dans le dépôt, téléchargés depuis GitHub) : Kokoro multi-langues v1.0 et Whisper
small (sherpa-onnx). Polices libres (OFL) : Montserrat, Inter, Bricolage Grotesque, Instrument Serif.

## Fichiers

- `scene/` — la scène 3D (three.js) : `film.js` (moteur, caméra, légendes), `batiment.js` (rouleau, façade, hall,
  site), `atelier.js` (identité), `salon.js` (réalisation, communication, contrôle), `finale.js` (révélation),
  `marques.js` (logos en volume), `lib.js` (matières, textures, écrans).
- `ui/` — les écrans (studio, site, publication, story, publicité, éditeur, carte, en-tête) en HTML, et leurs captures.
- `narration/` — texte, vérification de la voix, synchronisation, consignes pour une voix fournie.
- `audio/phrases/` — la voix, phrase par phrase.
- `montage/` — planning (timeline) et repères de l'image.
