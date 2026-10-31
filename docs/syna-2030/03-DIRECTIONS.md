# 03 — Trois directions artistiques pour SYNA et le Studio

Chaque direction est montrée sur le **même écran clé** : la conversation SYNA avec l'espace de travail du site, le
même projet (SILLON) et la même demande. On compare ainsi la direction, pas le contenu. Maquettes statiques, ouvrables
hors ligne : `maquettes/da-1-encre.html`, `maquettes/da-2-cockpit.html`, `maquettes/da-3-plein-cadre.html`. Captures
à 1440 × 900 (ordinateur) et 390 × 844 (téléphone) dans `captures/`.

Les trois partagent les règles de #282 : bleu signature, SYNA sans avatar humain, pas de dégradé violet, de néon ni de
verre dépoli, états toujours dits en mots, coût en % du budget IA, mouvement réduit respecté.

## Direction 1 — « Encre » (recommandée)

| | |
|---|---|
| Idée | **La voix de SYNA est typographique.** SYNA écrit en serif éditorial, le client et l'interface en grotesque sobre. Un fil bleu à gauche de ses messages se trace quand elle travaille. Calme, papier, filets fins. |
| Références | Mise en page des revues d'art et des catalogues d'exposition ; papeterie haut de gamme ; la lisibilité des applications d'écriture (Things, Craft) plutôt que les tableaux de bord SaaS. |
| Palette | Porcelaine froide `#F4F5F7` (fond), feuille `#FFFFFF`, encre `#0E1526`, **bleu d'encre `#1F3C99`** (signature, une seule couleur d'action), bleu doux `#E7ECF8`, filets `#DCE0E8`. États : vert `#1D6B4A`, ambre `#8A5600`, rouge `#A3271D`, gris `#5C6378`. Version sombre complète (fond `#0B0F19`, bleu `#8EA6FF`). |
| Typographies | **Newsreader** (voix de SYNA, titres), **Geist** (interface, saisie du client), **Geist Mono** (états, versions, pourcentages). Licence SIL OFL, sous-ensembles latins copiés dans `maquettes/fonts/`. |
| Échelle | Voix 16,5 / 22 / 26 / 46 px ; interface 12,5 / 13,5 / 14,5 px ; mono 10,5 / 11,5 / 12 px ; espacement par pas de 4 px ; rayon 10 px (cartes), 8 px (boutons), 999 px (puces). |
| Mouvement | 240 ms, courbe douce. Le fil bleu se trace pendant l'exécution ; les cartes apparaissent en fondu court ; rien ne bouge en continu à part une tâche en cours. Tout est coupé si « réduire les animations » est demandé. |
| Écran clé | `captures/da-1-encre--ordinateur.jpg`, `captures/da-1-encre--telephone.jpg` |
| Avantages | Identité vraiment propre à SYNA (la voix serif ne ressemble à aucun assistant connu). Lecture longue confortable, ce qui sert les explications honnêtes (« je ne sais pas encore… »). Le partage conversation / espace de travail rend visible l'aller-retour demande → résultat. Clair et sombre conçus ensemble. |
| Inconvénients | Deux familles de polices de plus à charger (≈ 250 Ko en latin). Moins « spectaculaire » au premier regard qu'une direction plein cadre. Le serif doit rester réservé à SYNA, sinon la règle se dilue. |

## Direction 2 — « Cockpit »

| | |
|---|---|
| Idée | Un instrument de précision, sombre d'abord. SYNA est une console à droite, avec un état lisible en permanence (« EXÉCUTION 1/2 »). Un journal d'exécution sous l'aperçu montre chaque étape avec son heure. |
| Références | Instruments de mesure, horlogerie, consoles de mixage, outils pro (Linear), cartographie nocturne. |
| Palette | Nuit `#090D16`, panneaux `#0F1522` / `#141B2B`, filets `#1F2738`, texte `#E6EAF2`, **bleu signal `#4D7CFF`**, bleu glacier `#A6BCFF`, vert `#46C89A`, ambre `#E7B04B`, rouge `#FF6B6B`. |
| Typographies | **Instrument Sans** (interface, titres), **JetBrains Mono** (états, chemins, chiffres). |
| Échelle | 11,5 / 12,5 / 13,5 / 14 px, très dense ; rayon 6 px ; grille de 4 px. |
| Mouvement | 120 ms, sec ; curseur clignotant à côté de « SYNA_ » ; point ambre pulsé sur l'étape en cours. |
| Écran clé | `captures/da-2-cockpit--ordinateur.jpg`, `captures/da-2-cockpit--telephone.jpg` |
| Avantages | Transparence d'exécution maximale (journal toujours visible). Très efficace pour un utilisateur avancé qui enchaîne les actions. Le sombre met les visuels du client en valeur. |
| Inconvénients | Intimidant pour un débutant, qui est une grande partie de la cible. Densité difficile à tenir au téléphone (trois zones à replier). Proche de l'esthétique d'outils de développeurs : moins « luxe calme » que demandé. |

## Direction 3 — « Plein cadre »

| | |
|---|---|
| Idée | Le résultat occupe tout l'écran. SYNA est une barre de commande en bas et un **point cobalt** qui se pose sur l'élément dont elle parle. Ses réponses s'ouvrent en feuille flottante, avec l'avant / après côte à côte. |
| Références | Galeries photo, scénographie d'exposition, éditeurs visuels (Framer, Figma), applications photo. |
| Palette | Blanc `#FFFFFF`, pierre `#F2F3F5`, encre `#101114`, **cobalt `#2443D6`** en aplats, cobalt doux `#E8ECFC`. |
| Typographies | **Bricolage Grotesque** (titres, déjà utilisée par la page d'accueil du Studio), **Onest** (interface). |
| Échelle | Titres 30 à 52 px très serrés ; interface 13 à 15 px ; rayons généreux (18 à 22 px). |
| Mouvement | Le point cobalt glisse vers l'élément concerné (300 ms) ; la feuille monte depuis la barre. |
| Écran clé | `captures/da-3-plein-cadre--ordinateur.jpg`, `captures/da-3-plein-cadre--telephone.jpg` |
| Avantages | Le plus spectaculaire ; naturel au téléphone (feuille du bas) ; le client voit d'abord son site, pas l'outil. |
| Inconvénients | La conversation est éphémère (feuille) : l'historique, les devis et les reçus deviennent difficiles à relire, alors que #282 exige « une seule source de conversation » persistante et la transparence d'exécution. Les écrans de travail denses (catalogue, calendrier, tableau des tâches) rentrent mal dans ce modèle. |

## Recommandation

**Direction 1 — « Encre »**, avec deux emprunts :
- au **Cockpit**, la ligne de suivi des tâches (devenue l'espace « Suivi » et l'onglet mobile « Suivi ») ;
- au **Plein cadre**, l'**avant / après** côte à côte dans les preuves de résultat.

Raisons : c'est la seule des trois qui garde à la fois **une conversation persistante et lisible** (exigence 1 de #282)
et **un espace de travail permanent** (exigence 2), avec une identité que l'on ne confond pas avec un autre assistant.
Elle supporte aussi bien le débutant (lecture calme, explications) que le professionnel (commandes manuelles à côté).

Les maquettes détaillées de `04-MAQUETTES-ET-PROTOTYPE.md` sont toutes dans cette direction. Si le propriétaire en
préfère une autre, les maquettes détaillées seront refaites avant tout développement.
