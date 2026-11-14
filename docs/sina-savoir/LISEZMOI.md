# Le savoir de SINA pour créer une marque

Dossier ouvert le 12 novembre 2026, à la demande du propriétaire : « tant que la réflexion n'est pas bien meilleure et
que tu ne feras pas le nécessaire pour prendre des informations de partout pour peaufiner l'intelligence de SINA, ça
fonctionnera pas ».

**Statut : validé par le propriétaire le 12 novembre 2026 (« Ok » au premier lot) et branché dans le Studio le même
jour. Les quatre cahiers de métier sont lus par les spécialistes de SINA à chaque création de marque
(`src/lib/syna-agent/brand-knowledge.ts`) : les modifier change ce que SINA sait. Un premier essai réel a eu lieu le
12 novembre 2026, avec l'accord écrit du propriétaire (voir « Premier essai réel » plus bas).**

## Ce qu'il contient

| Fichier | Ce que c'est |
|---|---|
| `methode-creation-de-marque.md` | La méthode proposée pour SINA : sept temps, un spécialiste et une épreuve par temps. |
| `noms-de-marque.md` | Cahier de métier : comment travaillent les agences de noms, la grille de jugement, les épreuves, le dépôt en France. |
| `idee-de-marque.md` | Cahier de métier : l'aveu du client, l'adversaire, les tests d'une idée forte. |
| `slogans-et-ton.md` | Cahier de métier : les principes des grands rédacteurs, la fiche de ton, les tics d'écriture à chasser. |
| `identite-visuelle.md` | Cahier de métier : les signes qu'on reconnaît sans lire le nom, la couleur, le lettrage, la mise en situation. |

Les quatre cahiers viennent de recherches sur le web faites le 12 novembre 2026. Chaque affirmation porte sa source ;
ce qui n'a pas été trouvé est écrit « non trouvé ». Ils sont à relire et à mettre à jour, pas à croire sur parole.

## D'où vient la méthode

De trois essais sur un même projet d'exemple inventé (des infusions aux fruits à boire glacées) :

1. Premier essai : l'étape actuelle de SINA et une première « nouvelle façon ». Verdict du propriétaire : « Je trouve ça
   nul », pour les six propositions, « du début à la fin ».
2. Deuxième essai, avec les cahiers de métier : « C'est mieux, tu peux faire encore mieux ».
3. Troisième essai : cinq équipes de noms séparées (625 pistes), 118 paroles réelles de clientes, onze idées testées,
   trois tours de jury mesurés sur les noms de référence du propriétaire. Verdict : « J'adore la présentation globale »,
   avec « tu peux encore aller beaucoup plus loin ».

## Premier essai réel (12 novembre 2026)

Projet d'exemple : des infusions de fruits en vrac à boire froides, forfait à 89 € (trois identités), sans logo.

- Coût : 2,88 € pour 20 appels (plafond 7,83 €), en 14 minutes. Quatre recherches sur le web : 0,99 € ; le reste : 1,89 €.
- Étude : 11 pages lues, 11 paroles rapportées par la recherche, 7 gardées après relecture des pages elles-mêmes.
- Idées : une seule sur huit passait les deux épreuves ; les routes B et C ont été bâties sur des idées écartées.
- Noms : 199 pistes par quatre équipes ; routes retenues « Tranche », « Froid Devant », « Pas de Quartier ».
- Résultat : A et B cohérentes ; C ratée (le directeur de création a refusé son nom, la reprise l'a rebaptisée dans
  ses textes seulement, et son fond sombre est devenu un second dégradé).
- Corrigé depuis dans le code, et testé : relecture des vraies pages, nom et fond inchangeables pendant une reprise, nom
  refusé remplacé par une réserve, second tour d'idées, tutoiement, défauts décrits et jamais promis.
- Pas encore revérifié par un second essai réel.

## Planche illustrée (retour du propriétaire, 12 novembre 2026)

Devant les planches de l'essai réel, le propriétaire a préféré celles faites à la main au troisième essai : « les
cartes ne sont pas toutes droites », « la base des logos », des couleurs et des dégradés mieux finis, « beaucoup plus
d'icônes, d'images ». Ce qui a été construit pour que SINA atteigne ce niveau :

- **Une illustratrice** dans la chaîne (un appel par planche, après la relecture) : elle dessine la scène de la
  marque, le devant de l'objet, l'image du site, les signes et les publications, et reprend les mêmes objets partout.
- **Un filtre strict** (`src/lib/syna-agent/brand-art.ts`) : un dessin écrit par un modèle n'est jamais affiché tel
  quel. Il n'a droit qu'à des formes, des dégradés, des découpes et du flou ; au moindre écart (texte, lien, style,
  script) il est retiré en entier, et la planche garde sa forme avec une scène de secours.
- **Le nom travaillé** : des gestes de lettrage que le Studio compose lui-même, lettres exactes : une ligne qui penche,
  un mot en couleur, une ligne qui coupe le nom, une lettre remplacée par un dessin, quelques mots écrits à la main.
- **La mise en page** des planches faites à la main : objets penchés, publications décalées, colis, autocollant,
  « Elle est… », la voix en situation, fonds à lueurs.

Vérifié en image, sur téléphone, avec des planches d'exemple, puis par un **second essai réel** le même jour (accord
écrit du propriétaire) : les trois planches du même exemple refaites par SINA, étude et noms du premier essai repris
sans être repayés. Coût : 1,92 € (plafond 5,62 €), 15 appels, 11 minutes. Noms : « Morceaux Choisis », « Tintamarre »,
« Plein les Yeux ». L'illustratrice a rendu la scène, le devant de l'objet et l'image du site des trois planches,
3 signes sur 5 et 8 publications sur 9 ; aucun dessin n'a été refusé par le filtre.

Ce que cet essai a appris (corrigé et testé) :

- un rond à la place d'un A ou d'un i change le nom (« Tintomarre », « Pleon ») : seul un O sans accent peut être
  remplacé par un dessin ;
- « Plein Les Yeux » : les petits mots restent en minuscules dans un nom écrit avec des capitales ;
- le texte des publications passait sur leurs dessins : le dessin est en haut, le texte en dessous, et SINA écrit des
  publications de 60 caractères au plus ;
- le dos du sachet débordait : trois lignes courtes.

**Pas encore fait** : le directeur de création ne relit pas les dessins en image ; ces corrections n'ont pas été
revues par un troisième essai.

## Images de planche par OpenAI (demande du propriétaire, 12 novembre 2026)

Devant le second essai, le propriétaire a demandé qu'OpenAI finisse réellement les planches : un logo par planche, fait
à partir du nom composé et de la direction artistique globale ; la grande scène ; le sachet avec le logo posé dessus ;
le site sur téléphone ; les publications (en dessin, elles pouvaient faire croire que le Studio n'est pas à la hauteur).
Les petits signes restent dessinés par SINA.

Ce qui est construit (`src/lib/syna-agent/brand-images.ts`) : une direction artistique globale par planche, sept
images, puis une relecture par un modèle qui voit. Une image fausse (nom mal écrit, texte en trop, personne, sujet
coupé) n'est pas montrée : la planche garde le dessin de SINA, et SINA le dit. Les textes d'une image viennent toujours
de la planche, lettre pour lettre. Le réglage `sina.brand_images` reste sur « dessins » tant qu'un essai réel n'a pas
été validé.

**Pas encore essayé pour de vrai** : construit et testé avec un faux modèle d'images. Prix calculé d'un essai :
1,21 € probable et 1,67 € au plus pour une planche ; 3,64 € et 5,02 € pour trois.

## Le juge des noms (retour du propriétaire, 12 novembre 2026)

Deux noms du second essai ont été refusés par le propriétaire : « Tintamarre » (« c'est nul comme nom ») et « Morceaux
Choisis » (« ça représente rien et c'est moche, tu appellerais ton site comme ça toi ? »). La cause était dans la
chaîne : la spécialiste qui compose les propositions jugeait aussi ses propres noms. Un juge séparé, sévère, relit
maintenant chaque finaliste avec trois épreuves : le fondateur (« tu appellerais ta marque comme ça, toi ? »), le nom lu
seul (que voit-on, sans l'explication ?) et la beauté. Un nom refusé laisse sa place à un nom gardé ; si trop peu
tiennent, les équipes repartent chercher une fois ; un nom montré faute de mieux l'est avec le doute dit au client.

**Essai réel des noms seuls** (12 novembre, accord écrit du propriétaire, 0,65 €) : le juge passait après la
composition des propositions et ne voyait que 7 noms par tour, sur 178 trouvés. Il en a refusé 13, avec des raisons
proches de celles du propriétaire (« on dirait une rubrique de site », « il parle de voiture, pas de fruits »), et
gardé un seul : « Pulpe ». De meilleurs noms de la réserve n'arrivaient jamais devant lui. Corrigé : le juge lit
maintenant tous les noms avant la composition, et les propositions ne se composent qu'avec les noms qu'il garde. Cette
correction n'a pas encore été réessayée pour de vrai.

**Les notes du propriétaire** sur quatre noms de cette marque servent de mesure chiffrée au juge : « Pulpe » 9/10,
« Haut les Pêches » 6/10, « Tout Feu Tout Fruit » 6/10, « Cerise sur le Verre » 4/10. Le juge ne garde qu'un nom qui
vaudrait 8 sur 10 ou plus. Une proposition peut aussi se faire sur un nom que le client a choisi lui-même.

## Le savoir pour monter un thème (demandes du propriétaire, 13 novembre 2026)

Deux demandes le même jour. D'abord : aller chercher « toutes les idées de comment on construit un thème », pour que
SINA sache monter un thème complet « telle les plus grand créateur de thème au monde ». Puis : « je veux tu aille
beaucoup mais beaucoup plus loin dans la recherche de thème […] sina et ou son sous agent qui fait les thèmes doit
connaître enormenment de référence afin de ne jamais faire de doublon dans les conception sur mesure que ce soit pour
du service ou du produit, je veux aussi que tu me dises comment tu compte demander à sina et son équipe de monter le
thème ».

**La méthode :** `methode-montage-de-theme.md` (dix temps, la carte d'identité d'un thème, la règle contre les
doublons). Proposition, à valider.

**Les cahiers de métier**

| Fichier | Ce que c'est |
|---|---|
| `theme-construction-des-pages.md` | Les pages d'un thème complet, l'ordre des sections et son pourquoi. |
| `theme-images.md` | L'ouverture, le texte sur une image, le recadrage, les tailles, la galerie du produit, la vitesse. |
| `theme-textes.md` | Le titre d'ouverture, la fiche produit, la voix, le référencement, le droit, s'inspirer sans copier. |
| `theme-conception-des-sections.md` | Comment un thème Shopify est bâti, ce que Shopify exige, le système de design, le téléphone d'abord. |
| `theme-pieces-catalogue.md` | La carte produit, la collection, la recherche, le menu, l'international, la vitesse. |
| `theme-pieces-achat.md` | Le bloc d'achat, les avis, les ventes additionnelles, le panier, les fenêtres, la confiance, les formulaires. |
| `theme-typographie-et-couleur.md` | Choisir et régler les polices, bâtir une palette ; 48 couples de polices, 33 palettes. |
| `theme-mise-en-page-et-mouvement.md` | Grilles, hiérarchie, mouvement, système ; 58 mises en page de section. |
| `theme-originalite-et-signature.md` | La méthode des agences, ce que notent les jurys, 22 sites regardés, les clichés, les épreuves d'originalité. |
| `theme-repertoire-gestes-et-ouvertures.md` | 96 gestes de signature et 30 formes d'ouverture. |
| `theme-sections-par-secteur-1.md`, `-2.md` | Les sections propres au produit, sur 18 secteurs, et 40 sections de récit. |
| `theme-services-commerces-et-soins.md` | Sites de services : restaurants, beauté, santé, artisans, immobilier ; référencement local. |
| `theme-services-conseil-loisirs-et-accueil.md` | Sites de services : sport, image, conseil, garage, hébergement, domicile. |
| `theme-atlas-des-references.md` | Les chiffres tirés de la bibliothèque de références. |
| `theme-atlas-par-secteur-et-metier.md` | Les mêmes chiffres par secteur et par métier, et le vocabulaire des sections. |

**La bibliothèque de références :** `references/cartes.json`, 1 072 cartes d'identité de sites (340 démonstrations de
thèmes Shopify, 404 vraies boutiques de marques, 328 modèles de sites de services), relevées par un programme, sans
IA. Notice : `references/LISEZMOI.md`.

**La tenue et les constructions :** 95 sections du thème sur mesure prennent la tenue de la marque et ont plusieurs
constructions (vingt le 13 novembre 2026, 95 le 14). Comment en écrire une, quelles données le Studio y pose, comment
elle part en boutique : `sections-a-tenue.md`. Ce qui est fait, vérifié et pas vérifié : `methode-montage-de-theme.md`
et `specialistes.md`. Code : `src/lib/syna-agent/custom-theme/tenue*.ts`, `public/sections/tenue*.css`.

**Les sections qui manquent :** `inventaire-sections-manquantes.md`, inventaire du 13 novembre 2026. Les 338 idées de
section des cahiers comparées aux 208 sections de la bibliothèque du thème sur mesure : 114 existent, 146 sont
proches (une section à compléter), 78 manquent, soit 48 sections ou fonctions à construire (20 qui servent beaucoup de
clients, 15 pour un secteur ou un métier, 13 cas particuliers). Jugé sur les descriptions des sections, les manques
les plus importants recontrôlés dans leur contenu. Rien n'est construit ; les priorités sont une estimation.

**D'où vient ce savoir.** Neuf recherches sur le web menées le 13 novembre 2026 (règles de Shopify, études du Baymard
Institute et du Nielsen Norman Group, documentation des studios de thèmes, agences de marque, sources officielles
françaises et européennes), et trois relevés faits par le Studio dans un navigateur. Chaque règle porte sa source ; ce
qui n'a pas été vérifié est marqué. Relus à la source par le Studio : les notes exigées par Shopify (60 en vitesse, 90
en accessibilité), ses pages obligatoires, ses limites, son interdiction des faux comptes à rebours, trois constats
d'étude sur la fiche produit, et trois obligations françaises (devis, prix des coiffeurs, agents immobiliers).

**Statut.** Depuis le 13 novembre 2026 (lot 8 des spécialistes), la **documentaliste** de SINA lit la bibliothèque de
références et, dans les cahiers par secteur et par métier, les sections propres au secteur du client ; elle les donne
au concepteur du thème, sans le nom des sites ni des marques. Les autres cahiers (construction des pages, images,
textes, typographie, mise en page, originalité, répertoires) ne sont **pas encore lus par SINA**. Rien n'est **validé
par le propriétaire**. « Copyright », dans sa demande, a été compris comme l'écriture des textes ; le cahier des textes dit
aussi ce qu'on a le droit de reprendre chez les autres. Chaque cahier tient dans la longueur que les spécialistes de la
marque lisent déjà (22 000 caractères avant les sources).

**Suite proposée.** Comme pour les planches de marque : un modèle fait à la main (l'accueil de « Pulpe » sur
téléphone), noté par le propriétaire, puis le branchement dans SINA.

## Ce qui n'est pas réglé

- Le coût réel n'est mesuré qu'une fois (2,88 € pour trois identités, réglage économe). L'estimation d'avant l'essai
  était de 6 à 10 € : la mesure est plus basse, mais une seule mesure ne fait pas une moyenne.
- Les planches de marque sont dessinées en code, sans image créée (dans les essais comme dans le Studio). Celles du
  Studio sont composées avec des pièces sûres (textes courts, nom dessiné avec la vraie police, pictogrammes nettoyés) :
  elles sont plus sobres que celles du troisième essai, dessinées à la main pour chaque marque.
- Le chemin « noms d'un seul mot » n'a pas été exploré (travail coupé par une limite d'utilisation).
- Les noms des essais ne sont vérifiés que sur le web, pas à l'INPI.
