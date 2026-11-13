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

## Ce qui n'est pas réglé

- Le coût réel n'est mesuré qu'une fois (2,88 € pour trois identités, réglage économe). L'estimation d'avant l'essai
  était de 6 à 10 € : la mesure est plus basse, mais une seule mesure ne fait pas une moyenne.
- Les planches de marque sont dessinées en code, sans image créée (dans les essais comme dans le Studio). Celles du
  Studio sont composées avec des pièces sûres (textes courts, nom dessiné avec la vraie police, pictogrammes nettoyés) :
  elles sont plus sobres que celles du troisième essai, dessinées à la main pour chaque marque.
- Le chemin « noms d'un seul mot » n'a pas été exploré (travail coupé par une limite d'utilisation).
- Les noms des essais ne sont vérifiés que sur le web, pas à l'INPI.
