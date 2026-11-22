# Les publications de SINA : la méthode

Écrite le 14 novembre 2026, à la demande du propriétaire. Après une démonstration de publications faites seulement de
lettres et de formes, il a dit : « C'est ce que je dit c'est nul, donc tu va faire comme pour tout le reste et tu va
aller alimenter ton savoir sur internet, tu va regarder tout ce qui ce fait afin de comprendre quel model travailler
pour chaque projet, open ia pour les images sont obligatoires. » Avant cela : « il faut impérativement que les
publications soient à la hauteur de ce que je veux […] plus belles que tous les plus gros community manager du monde ».

**Statut : rien n'est validé par le propriétaire, aucun essai réel.** Les cahiers sont lus par la stratège et le juge
des publications de SINA (`src/lib/syna-agent/posts-knowledge.ts`), avec les modèles du secteur du client. L'étape 9
(publications) reste fermée par défaut.

## Le savoir

Onze recherches sur le web, faites le 14 novembre 2026 ; chaque affirmation porte sa source, ce qui n'a pas été trouvé
est écrit « non trouvé ».

| Fichier | Ce qu'on y apprend |
|---|---|
| `publications-ce-qui-marche.md` | Ce qui marche, en chiffres de 2025 et 2026 : formats, rythme, carrousel, mots-dièse, ce qui fait baisser. |
| `publications-regles-des-reseaux-et-du-droit.md` | Tailles et zones sûres, étiquette « IA » des réseaux, règlement européen (article 50), grille de l'ARPP, droit français, règles par secteur. |
| `publications-direction-artistique.md` | Comment un compte se reconnaît sans son logo ; la photo de marque en 2026 ; composition, texte, mosaïque, carrousel. |
| `publications-images-par-ia.md` | Les modèles d'images d'OpenAI, le vrai produit gardé fidèle, la série cohérente, le texte dans l'image, la consigne, le contrôle. |
| `publications-textes-et-legendes.md` | L'accroche, la légende, l'appel à agir, les mots-dièse, la voix, les tics d'IA à chasser. |
| `publications-ligne-et-calendrier.md` | Les rendez-vous, le lancement d'un compte, le mois type, le calendrier de l'année en France, la mesure. |
| `publications-atlas-des-meilleurs.md` | Les comptes et campagnes primés en 2025 et 2026, et pourquoi ; trois comptes à étudier par secteur. |
| `publications-modeles-*.md` (4) | Les modèles de publication des meilleurs comptes, secteur par secteur (14 secteurs de produits, 15 métiers de services). |
| `references/modeles-publications.json` | La bibliothèque : 29 secteurs, 250 modèles. Pour chacun : rôle, format, ce qu'on voit (prêt pour la consigne d'image), ce qu'on lit, la légende, les données du client nécessaires, où il a été vu, ce qui le fait rater, et pour les services s'il exige une vraie photo. |

## Ce que les recherches ont appris (l'essentiel)

1. **Une marque se reconnaît sans son logo.** Les meilleurs comptes tiennent une direction artistique fixe (lumière,
   palette, cadrage, surface, place du produit, une couleur à elle) et ne font varier que le sujet. Le « fil léché »
   lisse est passé : le responsable d'Instagram l'a dit le 31 décembre 2025 ; on vise le soigné sans être lisse.
2. **Une idée par publication, partie d'un geste vrai.** Les prix de 2025 et 2026 vont aux idées nées d'un geste que
   les gens font déjà. Une jolie image sans idée plafonne (un compte de boissons à 66 000 abonnés fait 150 à 800 vues
   par image pastel ; un autre dépasse 1,8 million avec une seule idée filmée de très près).
3. **Le carrousel convainc, l'image fait désirer, la vidéo fait découvrir.** Le carrousel a le meilleur engagement
   sur Instagram ; sa deuxième image est remontrée seule à qui n'a pas fait glisser, donc chaque image tient seule.
4. **Le signal qui compte : l'envoi à quelqu'un.** Écrire et composer pour être enregistré ou envoyé, pas pour être aimé.
5. **Rythme : 3 à 5 publications du fil par semaine, jamais une semaine vide.**
6. **Mots-dièse : 5 au plus sur Instagram depuis décembre 2025**, sans effet sur la portée ; la recherche lit les mots
   écrits en clair dans la légende.
7. **Le public pardonne l'image créée, pas la tromperie.** Une image créée met en scène le vrai produit, un décor, une
   matière, une idée ; elle ne prouve jamais rien (chantier, plat, coupe, bien, client, lieu). Le règlement européen sur
   l'IA (article 50, depuis le 2 août 2026) et la fiche de l'ARPP du 3 août 2026 l'encadrent : un produit montré plus
   beau que le vrai est trompeur, même avec la mention « Image générée par IA ».
8. **Le vrai produit reste exact.** Le modèle d'images déforme les étiquettes, le verre et le métal : dès qu'un produit
   en porte, la scène se crée autour d'une place libre et le vrai produit détouré y est recollé.
9. **Chaque secteur a ses modèles, et ses interdits** : boissons sans alcool sans codes de l'alcool, compléments sans
   promesse de santé, immobilier avec les mentions d'une annonce, ordres professionnels (avocats, experts-comptables)
   avec leurs règles de publicité, restaurants et coiffeurs avec de vraies photos pour le résultat.

## La méthode, temps par temps

Celle qui fait n'est jamais celle qui juge ; rien n'est montré au client sans avoir été relu ; devis avant, plafond
pendant.

1. **Le dossier (sans IA).** L'angle choisi, la planche de marque (sa direction artistique et son signe), la fiche du
   client, ses produits ou prestations, les personnes autorisées ou non, et le **secteur reconnu** : ses modèles de
   publication sont tirés de la bibliothèque (`publicationModelsFor`).
2. **La ligne du compte (la stratège).** Trois à cinq rendez-vous qui reviennent, pris parmi les modèles du secteur et
   tournés vers l'angle, chacun avec son rôle (arrêter, donner envie, prouver, rendre service, faire sourire, vendre).
   Une fiche de direction artistique fixe (lumière, palette, cadrage, surface, grain, place du produit, signe de la
   marque), recopiée mot pour mot dans chaque consigne d'image.
3. **Les publications (la stratège).** Pour chaque place : une idée, son format (image, carrousel, story), l'accroche
   (3 à 8 mots, précise : qui, quand, quoi), la scène décrite comme une photo (méthode du propriétaire,
   `docs/guide-images-ia.md`), la légende, une seule fin sans ordre au lecteur (question ou invitation), 0 à 3 mots-dièse, le texte alternatif.
4. **Le juge (séparé).** Il lit tout et refuse ce qui ne vaut pas d'être payé : je ne m'arrête pas ; un concurrent
   pourrait la signer ; ce n'est pas vrai d'après la fiche ; je ne l'enverrais à personne ; une image créée présentée
   comme une preuve ; un interdit du secteur ; une ressemblance entre deux publications. Une seule reprise.
5. **Les images (OpenAI, obligatoire).** Créées au format de leur place (4:5 ou 3:4 pour le fil, 9:16 pour une story,
   l'essentiel au centre, les zones sûres libres) par le modèle d'images d'OpenAI ; jamais un autre modèle en silence.
   Le vrai produit en image de référence ; étiquette, logo, verre ou métal poli : scène créée puis vrai produit recollé.
   Aucune personne reconnaissable sans photo ou accord écrit du client. Prix, dates, réductions et mentions légales
   sont toujours posés par le Studio, jamais dessinés par le modèle.
6. **Trois regards avant de montrer.** À la vraie taille (texte, produit entier, fautes, défauts d'IA) ; en vignette
   (l'accroche se lit-elle encore ?) ; dans la mosaïque des neuf dernières (reconnaît-on la marque sans le logo ? deux
   voisines se ressemblent-elles ?). Une image ratée est dite ratée et refaite dans le plafond annoncé, jamais montrée.
7. **Le droit, avant de publier.** Les trois questions de l'ARPP ; la mention « Image générée par IA » quand elle est
   due ; l'étiquette posée par les réseaux sur les images d'OpenAI (marques C2PA et SynthID) dite au client ; jamais ces
   marques retirées.
8. **Le rythme.** 3 à 5 publications par semaine pour une marque de produits, 2 à 3 pour un service ; un compte neuf
   s'ouvre avec 9 publications pensées ensemble ; une série nommée d'abord, jugée après 6 épisodes au moins ; le
   calendrier de l'année ne garde que les dates où la marque a quelque chose de vrai à dire.

**Sur la planche de marque** : trois exemples de trois rendez-vous différents et de trois formats différents (une
image, un carrousel, une story), l'un qui donne envie, l'un qui fait entendre la voix, l'un qui prouve ; et la
mosaïque des neuf premières publications à côté, pour qu'on voie un compte et pas trois images.

## Le prix

Une image de publication créée par OpenAI (modèle de SINA, `syna.mockup.image_route`, qualité haute) coûte au tarif
du Studio environ **0,14 €**, **0,18 € au plus** (calcul du 14 novembre 2026, `photoRequestMaxMicro`). Un carrousel de
cinq images : environ 0,70 €, 0,90 € au plus. Les recherches n'ont pas trouvé de prix officiel par image pour le modèle
2.6 : seul un essai réel le confirmera.

## Points à trancher avec le propriétaire

1. **Les réalisations créées pour les artisans.** Sa règle du 10 novembre 2026 fait créer par SINA des réalisations et
   des avant / après quand l'artisan n'en a pas assez. Présentées comme de vrais chantiers, ces images sont une pratique
   commerciale trompeuse d'après la fiche de l'ARPP du 3 août 2026 et le droit français (jusqu'à 2 ans de prison et
   300 000 €), et le règlement européen impose depuis le 2 août 2026 un marquage visible. Même question pour un plat de
   restaurant, une coupe, un bouquet, un bien immobilier. Proposition : une image créée y montre une ambiance, un geste,
   un outil ou une matière, jamais « notre chantier » ; les preuves restent les vraies photos du client.
2. **Le texte dans l'image.** Une accroche courte peut être écrite par le modèle d'OpenAI (il écrit juste les textes
   courts, mais aucun essai publié sur les accents français n'a été trouvé), ou posée par le Studio dans la police de la
   marque. Prix, dates et mentions : toujours posés par le Studio.
3. **La mention « Image générée par IA »** : où et quand la poser (dans l'image ou en tête de légende).
4. **Les publicités** : les images de publicité suivent-elles aussi OpenAI ? (aujourd'hui seules les publications le
   sont, depuis le 14 novembre 2026).

## Ce que le propriétaire a validé (14 novembre 2026)

Essai réel sur « Pulpe » (infusions de fruits à boire froides), avec son accord écrit. Premier plan refusé par le juge
avant tout paiement (natures mortes pâles, idée absente de l'image, une image servait de fausse preuve) ; puis un
carrousel de trois images que le propriétaire a refusé : « tu m'as juste fait 3 images de la même couleur qui
représente la même chose les clients veulent voir 3 publications différentes possible ».

Ce qu'il a validé : trois publications d'exemple qui ne se ressemblent en rien, chacune une image seule.

| Rôle | Couleur dominante | Cadrage | Idée | Accroche posée par le Studio |
|---|---|---|---|---|
| Donner envie | Tout framboise | Plan de face, dans le frigo | 16 heures : la carafe a pris la place de la canette, poussée de côté | « 16 h. La canette a laissé sa place. » |
| Rendre service | Tout jaune mangue | Vue de dessus | Des glaçons faits avec le fond de la carafe, qui n'allongent pas le verre | « Des glaçons qui ne noient pas ton verre. » |
| Faire sourire | Tout bleu nuit | Très gros plan | La rupture avec la canette racontée comme des fiançailles rompues : un écrin de bague qui présente une languette de canette | « J'ai rendu sa bague à la canette. » |

Ses mots : « j'aime beaucoup l'histoire de la bague. donc oui c'est mieux et sa donne 3 vrai appercu ». À retenir : la
métaphore juste, tirée de l'aveu de la marque (le soda, petite récompense de l'après-midi), dite à la première
personne, sans moquer personne, dans une image de publicité d'un tout autre univers (ici la joaillerie). Six images
créées pour cet essai : 0,31 $ (environ 0,28 €), 0,05 $ l'image en 1088 × 1360, qualité haute.

## Ce qui est construit, et ce qui ne l'est pas

- **Fait le 14 novembre 2026** : les cahiers et la bibliothèque ; la stratège et le juge du plan des publications les
  lisent, avec les modèles du secteur du client (`posts-knowledge.ts`, `posts-plan.ts`) ; les mots-dièse ramenés à 3 à
  5 (puis à 0 à 3 le 22 novembre 2026, avec une fin de légende sans ordre au lecteur) ; **les images des publications passent obligatoirement par OpenAI** (`social_image`, `src/lib/ai/media-routing.ts` :
  aucun autre fournisseur, aucun secours hors d'OpenAI, l'administration ne peut proposer qu'un modèle d'OpenAI).
- **Pas fait** : la ligne de neuf publications et la mosaïque sur la planche de marque ; les trois regards en image ;
  la pose du texte par le Studio sur les images des publications ; le vrai produit recollé dans la scène pour les
  publications ; la mention IA ; aucun essai réel.
