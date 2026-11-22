# Compte rendu du 22 novembre 2026 — les économies, les juges, les reprises, les ratés de Nadia

Demande du propriétaire, relayée par le chef d'orchestre : « Je t'ai demandé de mettre en place tout ce que l'autre
conversation avait trouvé ». Tout est construit sans aucune dépense (aucun appel payant, aucune image).

## A. Les économies, sans baisser la qualité (mêmes modèles, mêmes images, mêmes relectures)

1. **Mise en mémoire chez le fournisseur.** Ce qui ne change pas passe en tête et est gardé en mémoire : la consigne
   générale, les notices des outils, les cahiers. Nouveau : le fil de la conversation est repris d'un pas à l'autre
   (avant, il était relu en entier à chaque pas), et la fenêtre du fil ne glisse plus à chaque message. La lecture en
   mémoire était comptée au double de son vrai prix (0,1 au lieu de 0,05 pour Opus 5.5) : corrigé. La part reprise et ce
   qu'elle fait gagner se lisent dans Administration › Consommation. [À compléter : la part réelle, mesurée au prochain
   essai.]
2. **Seulement les outils de l'étape.** Moins de 20 notices complètes à chaque étape (il y en avait jusqu'à 30 aux étapes
   5 à 7). Rien n'est retiré à SINA : les autres outils restent nommés en une ligne. Aucun outil retiré du code : les
   anciennes façons du site attendent l'essai réel du lot 4 (règle « rien n'est supprimé avant que ce qui le remplace
   soit prouvé »). Liste des outils dont le retrait changerait ce que voit un client, gardés :
   - le choix « thème du Studio ou sur mesure », les 15 thèmes, la famille, l'ambiance, les deux concepts, la conception
     à part, les retouches de l'ancien moteur (`site.mode`, `theme.*`, `custom.concepts`, `custom.concept`,
     `custom.design`, `custom.compose`, `site.outline`, `site.edit`, `site.versions`, `site.use_version`, `site.pages`) :
     cachés pendant le parcours, encore proposés hors du parcours ;
   - les anciennes maquettes (`mockup.*`, `site.code_from_mockup`, `site.images`, `site.photo_reject`) : seulement pour
     les projets qui en ont déjà ;
   - `site.mockups`, `site.mockup_images`, `site.build`, `project.create` : cachés pendant le parcours.
3. **Le différé à moitié prix** pour les angles, le site et les publications, comme pour la marque. Allumé par défaut ;
   l'administration montre s'il est allumé et combien d'appels il a servis. Attente : mesurée sur la marque au lot 2,
   deux fois plus longue (15 minutes en direct, 30 en différé, pour environ 25 % moins cher, les images n'étant pas
   en différé). Chaque appel attend au plus 10 minutes, une tâche au plus 30 minutes en tout ; au-delà, tout part en
   direct. [À compléter : l'attente des angles, du site et des publications, mesurée au prochain essai.]
4. **Une carte juste.** Dès trois travaux finis du même genre, le prix probable vient de ce qu'ils ont réellement coûté
   (la part de leur plafond dépensée). Le plafond ne change pas.
5. **Le coût par travail accepté** dans Administration › Consommation : payé, gardé par le client, jeté (refait), en
   attente de sa validation.

## B. Les juges

Un onglet « Juges des images » : chaque image relue par le relecteur de la planche (gardée ou refusée, et pourquoi),
avec oui ou non du propriétaire, et la part d'accord entre eux (mesurée à partir de 20 images). Les versions au choix
existent déjà pour le logo : 2, 3 ou 4 identités proposées selon le forfait, chacune avec son logo.

Non fait, à décider par le propriétaire : « tant que l'accord n'est pas mesuré, le relecteur n'écarte que les défauts
visibles ». Sa règle « seule une note de 8 ou plus est montrée » est scellée au banc d'épreuves (épreuve
`image-pas-au-niveau`) ; seul lui peut la changer.

## C. Deux reprises au plus partout

Une seule règle (`reprises.ts`), vérifiée sur chaque chaîne : images de la planche et logo (2), publications (2), angles,
textes et photos du site, galerie, relectrice des messages (1). Ce qui reste raté est dit au client.

## D. Les ratés vus par « Les essais complets » sur Nadia (faire connaissance)

Chacun a son épreuve au banc, puis sa correction :
- **Questions groupées** cinq fois pendant « faire connaissance », dont quatre coordonnées d'un coup. La règle y est une
  question à la fois. Correction : le Studio relit chaque message sans IA ; s'il pose plusieurs questions, SINA le
  réécrit une fois.
- **« C'est parti »** alors que rien ne démarre avant l'accord sur la carte. Correction : même relecture ; une annonce
  de départ avant la carte, ou sans rien de lancé, est réécrite.
- **La carte de dépense vouvoyait** (« de votre budget IA »). SINA tutoie partout : la carte dit « de ton budget IA ».
- **Nadia ne savait pas qui sont ses acheteuses**, et SINA n'a rien proposé. Ce qu'elle peut trouver seule, elle le
  propose : la question « à qui t'adresses-tu » dit maintenant à SINA de proposer elle-même deux ou trois types
  d'acheteurs probables, à choisir ou corriger.

## E. L'essai du grand modèle d'images

Pas lancé : il attend le oui écrit du propriétaire (trois photos par modèle, 1 € au plus).

## La signature « fait par l'IA » des images d'OpenAI (demande urgente du chef d'orchestre)

Vérifié dans le code : la planche ré-encodait chaque image d'OpenAI, ce qui effaçait sa signature C2PA. Corrigé : une
image déjà en PNG est rangée avec ses octets d'origine (`src/lib/media/signature-ia.ts`). Les photos du site et de la
galerie étaient déjà rangées telles quelles. Rien ne change pour ce que voit le client.

Ce qui perd forcément la signature, parce que l'image est transformée : le logo détouré et sa version claire, les photos
détourées du site, les publications composées (texte posé), les recadrages au format d'un réseau. Pour celles-là, il
faudrait que le Studio signe lui-même ses images finales (un manifeste C2PA qui cite l'image d'OpenAI) ; cela demande un
certificat de signature reconnu par la liste de confiance C2PA (payant, à acheter auprès d'un organisme agréé) et une
bibliothèque de signature. Décision au propriétaire : [À compléter : prix du certificat, à demander avant].

## Partie 1 des recherches approfondies : l'urgent, le légal, le cassé

Rien n'a été dépensé. Aucun essai sur une vraie boutique (aucune boutique d'essai ouverte) : tout est vérifié par des
essais du Studio avec Shopify et WooCommerce simulés.

- **Signature « fait par l'IA »** : gardée sur les images de la planche (voir plus haut).
- **Prix barré** : jamais sans la preuve datée du prix le plus bas des 30 derniers jours. Exemple : une bougie à 30 €
  « avant 45 € » ; SINA demande « Quel est le prix le plus bas que tu as pratiqué ces 30 derniers jours ? » ; le client
  répond 40 € ; le site barre 40 € et affiche −25 %. Sans réponse, aucun prix barré. Dans une boutique Shopify, où le prix
  de comparaison s'affiche de lui-même, la mise en boutique le signale.
- **« Renoncer au contrat ici »** : dans le pied de chaque page des boutiques (aperçu et thème Shopify). La page du Studio
  demande le nom, la commande et l'e-mail, puis « Confirmer la rétractation » ; l'acheteur reçoit un accusé daté, le
  client est prévenu. Si l'envoi des e-mails n'est pas réglé, le client est averti d'envoyer l'accusé lui-même. Pas fait :
  le lien dans le compte client de la boutique (il dépend de la plateforme).
- **Mentions légales** : le médiateur de la consommation et l'hébergeur sont demandés à l'étape de l'activité et bloquent
  la validation tant qu'ils manquent. L'identité du Studio dans `legal.ts` reste « [À compléter] » : à donner par le
  propriétaire.
- **L'assistante du site** : aucune assistante IA ne répond aujourd'hui sur les sites des clients (seule une bulle « une
  personne te répond » mène au formulaire) ; rien d'illégal. Elle sera construite avec son badge « je suis une IA » dans
  la partie du suivi.
- **Shopify** : la boutique se relie par l'application du client (Client ID et Client secret, écran guidé), avec un jeton
  redemandé avant chaque envoi ; interface en version 2026-10 ; produits et collections publiés sur la boutique en ligne ;
  menus créés ; pages légales envoyées (jamais avec un trou) ; forfait Starter refusé avant l'envoi du thème. À essayer
  sur une boutique de développement que le propriétaire ouvrira.
- **Une seule adresse** : quand le domaine du client est relié et servi, l'adresse du Studio y renvoie en permanence, et
  chaque page dit son adresse principale à Google.
- **Ventes et visites** : les sites hébergés comptent leurs pages vues sans traceur ni adresse (exemption de la CNIL :
  rangé par client, lien « ne pas être compté », effacé à 25 mois) ; les commandes et les visites Shopify se lisent par
  l'application du client ; les commandes WooCommerce aussi, et la boutique se relie en un clic (« Approuver »). Pas fait :
  la ligne de la mesure d'audience dans les mentions du site (texte prêt : `MENTION_MESURE`), et l'affichage de ces
  chiffres dans le point du mois (partie du suivi).

## Partie 2 : SINA elle-même (rapport 11)

Rien n'a été dépensé.

- **Le coût de la conversation de Nadia, recalculé** (21 réponses, sur les jetons relevés appel par appel) : **1,154 €
  avant, environ 0,80 € après** (−30 %). Détail : 0,90 € avec le fil repris de mémoire ; 0,84 € en comptant la lecture
  en mémoire à son vrai prix ; 0,80 € sans la réécriture des notices à la création du projet. Seule hypothèse du calcul :
  la fiche, le parcours et l'état font environ 3 600 jetons au début et 5 000 à la fin. À mesurer pour de vrai au
  prochain essai (l'administration montre maintenant le coût de SINA étape par étape).
- **Pourquoi la mémoire était réécrite deux fois** : à la 2e réponse, la liste des outils changeait à la création du
  projet (corrigé : la même liste avant et après) ; à la 20e, le passage à l'étape de la marque change la liste des
  outils de l'étape (normal, une fois par étape).
- **Les 760 jetons de sortie par réponse** : ils comprennent la réflexion de SINA (réglée à l'effort moyen). Je n'ai pas
  baissé l'effort : rien ne permet de vérifier sans essai payant que ses décisions resteraient aussi bonnes, et changer
  l'effort en cours de conversation casse la mémoire. Proposition : un essai comparé effort moyen et effort bas sur
  quelques conversations, au prix à donner avant.
- **Ses mots corrigés** : relus par SINA à chaque pas, dès « faire connaissance », et un message qui emploie un mot que le
  client a corrigé ne part pas : SINA le réécrit.
- **La fiche** relue à chaque pas ; quand le fil devient très long, un résumé à rubrique fixe remplace son début.
- **La relectrice** : une règle « pas de complaisance » (une fausse promotion, un faux avis, un prix barré sans preuve, un
  nom à double sens, une photo dans une arche : SINA le dit franchement, avec la raison et une autre proposition), et les
  contrôles propres à l'étape, tirés des règles du propriétaire.
- **Le coût par travail** : une alerte dans l'administration quand le coût moyen d'un travail double en une semaine.
- **Les cas « dire non »** sont au banc d'épreuves (quatre épreuves payantes, prix à mesurer avant de les rejouer).
- **Pas fait, et pourquoi** : les images en série par la Responses API (le prix réel d'une image est à vérifier avant :
  essai payant) ; les propositions réglées par le client (« plus ou moins de propositions ») : c'est le lot 7, « SINA
  prend les devants » ; le différé du point du mois et des publications du mois préparées d'avance : ces travaux
  n'existent pas encore.

## Les économies de l'audit des coûts (demande du chef d'orchestre)

Rien n'a été dépensé. Aucun modèle, aucune taille d'image, aucune relecture et aucune règle du propriétaire n'a changé.

- **Les images d'OpenAI comptées à leur vrai prix.** Chaque image est comptée sur les jetons qu'OpenAI facture (30 $ le
  million en sortie, 8 $ pour les images jointes, 5 $ pour le texte), au lieu de 0,12 $ au forfait. La carte d'accord
  garde la borne de 0,12 $ par image : le client n'accepte jamais un prix plus bas que ce qui peut arriver.
- **Plus d'aperçus payés.** Les deux aperçus envoyés pendant la création d'une image (environ 100 jetons chacun) ne sont
  plus demandés ; le client n'en voyait aucun.
- **16:9 et 9:16 dessinés directement** (1824 × 1024 et 1152 × 2048) au lieu d'être recadrés depuis le 3:2 : même prix
  ou moins, rien de coupé.
- **La relecture des images** reçoit la planche des 50 logos aimés en tête, gardée en mémoire chez le fournisseur : elle
  est la même pour tous les clients. Le modèle et la taille de l'image relue ne changent pas. Le logo est toujours relu
  avant les images qui le portent (déjà le cas).
- **Une image par format, pas par réseau.** Instagram et Facebook, tous deux en 4:5, reçoivent la même image, payée et
  relue une fois ; chacun garde son texte. Exemple : 3 publications sur Instagram et Facebook, c'était 6 images ; c'est
  3 images. Avec LinkedIn en plus (carré), 6 images au lieu de 9. La carte d'accord le dit.
- **La conversation de SINA** : la consigne de l'étape et les images de ce qu'elle a déjà créé (logos, planche, site)
  passent dans la partie gardée en mémoire ; les photos que le client vient de joindre restent avec sa demande.
- **Le résumé du client gardé en mémoire** pour chacune des 43 à 70 sections du site, et pour les appels de la marque qui
  reviennent une fois par route (direction, reprise, images). Pas pour les appels uniques : la mise en mémoire se paie à
  l'écriture et ne rapporte que si elle est relue.
- **Le niveau léger** (tri des photos, classement) passe de Haiku 4.5 à Haiku 5.5 : dix fois moins cher, plus récent.
  Aucune tâche où SINA décide, conseille ou juge n'y passe.

**Pas fait, à décider par le propriétaire** : garder l'effort de SINA constant dans la conversation et passer à l'effort
élevé, aux moments forts, par un message à l'intérieur du fil. C'est l'économie la plus grosse de l'audit (environ
1,80 € par projet), mais elle demande une fonction encore en essai chez Anthropic (« effort par message »). Aujourd'hui,
chaque moment fort efface la mémoire du fil.

### Le coût compté d'un projet complet, avant et après

Projet de référence de l'audit : une boutique d'un produit, 3 identités, Instagram et Facebook, de « faire connaissance »
aux premières publications, sans reprise demandée. Chiffres estimés d'après le code, pas mesurés sur un vrai essai.

| | Gain par projet |
|---|---|
| Avant | **environ 22 €** |
| Mémoire d'une heure pour le fil de SINA et les tâches en différé | −1,40 € |
| Une image par format | −0,80 € |
| Consigne de l'étape et images du parcours en mémoire | −0,70 € |
| Résumé du client en mémoire pour les sections du site | −0,30 € à −1 € |
| Marque : résumé en mémoire pour les appels qui reviennent | −0,25 € |
| Plus d'aperçus payés (environ 46 images) | −0,25 € |
| Planche des 50 logos en mémoire à la relecture | −0,08 € |
| Haiku 5.5 au niveau léger | −0,05 € |
| **Après** | **environ 17,50 € à 18,20 €** |

Encore possible :
- l'effort constant (oui du propriétaire nécessaire, fonction en essai) : environ −1,80 €, soit **environ 16 €** ;
- le prix réel des images : il se lit maintenant sur les jetons rendus par OpenAI. Si une image coûte environ 0,06 $
  au lieu de 0,12 $, le compte d'un projet baisse encore d'environ 2,40 €. [À compléter : prix réel d'une image, lu au
  prochain essai.]

## L'effort de SINA gardé constant dans la conversation (décision du chef d'orchestre, le propriétaire lui ayant laissé trancher)

Rien n'a été dépensé : tout est essayé sur un fournisseur simulé.

- **Ce qui change** : aux moments forts (SINA présente un résultat, explique un échec, répond à un client mécontent,
  juge le site), elle réfléchit toujours plus fort, mais l'effort élevé lui est donné par un message à l'intérieur de la
  conversation (fonction en essai chez Anthropic). L'effort de la demande ne change plus, donc la mémoire du fil n'est
  plus effacée deux fois par moment fort (en montant, puis en redescendant).
- **Condition 1, sans panne visible** : si Anthropic refuse la fonction, rien n'est produit ni facturé ; le Studio
  renvoie aussitôt la même demande à la façon d'avant (l'effort élevé dans la demande) et le client a sa réponse. La
  fonction est alors mise de côté une heure, puis réessayée. Une tâche en différé garde la façon d'avant.
- **Condition 2, l'interrupteur** : Administration › Consommation, carte « Mise en mémoire » : « Éteindre » ou
  « Allumer ». Elle montre aussi le dernier refus du fournisseur, s'il y en a eu un.
- **Essais des chemins** (`tests/sina-effort-par-message.test.ts`) : fonction acceptée (même effort dans la demande, même
  début de demande, effort élevé par le message) ; fonction refusée (second envoi à la façon d'avant, réponse quand même,
  mise de côté une heure) ; réglage éteint et modèle qui ne l'accepte pas (la façon d'avant).
- **Le coût sur la conversation de référence (Nadia, 21 réponses, jetons relevés appel par appel)** : Nadia en était à
  « faire connaissance », sans aucun moment fort : pour elle, rien ne change (0,836 €). Avec, sur ces mêmes 21 réponses,
  4 moments forts (la proportion d'un projet complet selon l'audit) : **1,015 € avec l'effort dans la demande, 0,836 €
  avec l'effort par message**, soit environ 18 % de moins. Sur un projet complet, où le fil est bien plus long, l'audit
  l'estimait à environ 1,80 €. [À compléter : le gain réel, lu dans l'administration au prochain essai.]
- **Non vérifié** : la réponse réelle d'Anthropic à la fonction (aucun appel réel fait) ; c'est précisément ce que le retour
  automatique protège.

## Le fil écrit une seule fois (point urgent du chef d'orchestre)

Vérifié dans le code : le Studio n'envoie jamais à Anthropic d'anciens résultats d'outils ni de réflexions à relire tels
quels ; le fil part comme du texte, dans une seule demande. Le refus (erreur 400) décrit par la page d'Anthropic ne
peut donc pas arriver ici. Mais un ancien résultat était encore raccourci après coup, tous les 40 messages : corrigé. Un
message s'écrit maintenant une seule fois, à son entrée dans le fil, puis ne change plus jamais. Un long résultat y est
court dès son entrée ; il n'est donné en entier qu'à part, pendant la demande qui l'a produit. Épreuve au banc :
`fil-ecrit-une-seule-fois`.

Vérifié aussi : l'état du projet est bien après le dernier point de mémoire et ne s'empile pas (il est refait à chaque
pas) ; les pages lues sur Internet ne sont jamais gardées entières (seulement des extraits de 300 à 1 500 caractères) ;
les réponses de SINA ne sont jamais montrées au client avant leur relecture (aucun flux du brouillon).

## La conversation de SINA (audit fin, environ 3,50 € par projet estimés)

Rien n'a été dépensé ; chaque point a son essai.

1. **Le fil ne glisse plus qu'au changement d'étape** (ou au-delà de 400 messages), au lieu de tous les 40 messages, et
   parfois deux fois de suite. Environ 1 €.
2. **Retouche au clic** : le Studio lit lui-même la section cliquée avant la première réflexion de SINA ; elle la reçoit
   en entier, pour recopier le passage exact. Une réflexion de moins par retouche, environ 0,45 €. La phrase de fin de
   retouche garde sa réflexion (non changé, comme demandé).
3. **Activité** : SINA enregistre la réponse (coordonnées, produits, offres, prestations, preuve de prix) en même temps
   qu'elle pose la question suivante ; la carte « Ton activité » se met à jour seule et lui dit ce qui manque. Une attente
   au lieu de deux ou trois pour le client, environ 0,40 €.
4. **Une retouche ne range que ce qui a changé** (version, pages, points nouveaux à revoir), plus la carte entière du
   site. Environ 0,25 €.
5. **Une seule liste d'outils pour toute la marque** (étapes 1 à 3), avec `brand.finish` et `identity.choose`, que leurs
   consignes demandent d'appeler. Environ 0,18 €. **À décider** : une seule liste pour le site avant et après sa
   création ferait 22 notices complètes, au-delà de la règle « moins de 20 » ; pas fait.
6. **Les consignes fixes des étapes 0 à 5** rejoignent la partie gardée en mémoire. Environ 0,22 €.
7. **L'état du projet nettoyé** : l'état vrai du site créé par SINA (avant, « pas encore construit »), plus d'objets
   coupés, plus de Pilote, plus de changements recopiés. Environ 0,18 €.
8. **Un simple refus** (argument faux, validation incomplète) n'est plus traité comme un échec à expliquer : ni effort
   élevé, ni relectrice. Une panne, un travail payant refusé ou un budget insuffisant le restent. Environ 0,17 €.
9. **Le contrôle gratuit des questions** : « nom » et « site » ne comptent plus comme des coordonnées (« As-tu déjà un
   nom, un logo ou un site ? » n'est plus réécrite) ; le nettoyage gratuit passe avant le compte ; la relectrice lit la
   version déjà corrigée. Environ 0,08 €.
10. **Petits postes** : plus de raison écrite pour chaque action (personne ne la lisait), consigne de la relectrice en
    mémoire d'une heure, fiche donnée une seule fois, compte rendu de la création du site donné une fois avec le
    résultat de la tâche (le contexte ne garde que ce qui reste à régler), pièces jointes anciennes en une ligne.
    Environ 0,30 €.
11. **Ce qui manquait au client** : pendant les retouches, avant la validation, SINA ne voyait pas son site. Elle reçoit
    maintenant ses captures ; elles partent après le fil, pour ne pas le faire réécrire à chaque retouche.

Pas fait : les notices écrites plus court (à essayer d'abord au banc, l'audit le demande) ; la fin de retouche sans
réflexion de plus (à ne pas faire sans le chef). Tout est estimé d'après le code ; le vrai gain se lit dans
Administration › Consommation au prochain essai. [À compléter : gain mesuré.]

## Le moteur commun des appels, et la règle « une erreur de SINA n'est jamais comptée »

Rien n'a été dépensé ; chaque point a son essai.

- **Règle du propriétaire appliquée** (LE-STUDIO-DE-A-A-Z, partie 13 : « une erreur de SINA est toujours corrigée sans
  rien compter ; un changement de goût du client passe par son budget du mois »). Ce que le Studio refait pour sa propre
  qualité ne prend plus rien sur le budget du client, même quand son budget du mois est épuisé :
  - une image refaite parce qu'elle était ratée (marque, publications, photos du site) ;
  - un texte du site repris sur les remarques du relecteur ;
  - une réponse de SINA réécrite après le contrôle ou la relectrice ;
  - une réponse coupée ou mal formée, redemandée.

  Le coût reste inscrit, à la charge du Studio, et le plafond de la tâche s'applique toujours. Une épreuve au banc
  le garantit (`erreur-de-sina-jamais-comptee`). Avant, c'était le client qui payait.
- **La recherche sur Internet** est gardée en mémoire chez le fournisseur : les pages trouvées ne sont plus repayées à
  chaque tour. Chaque part est comptée à son vrai prix. Une recherche arrêtée en route est reprise là où elle s'est
  arrêtée, au lieu d'être payée puis jetée. Environ 0,35 € par projet, à vérifier dans les reçus du prochain essai.
- **Le différé** :
  - la patience de 30 minutes est comptée en temps réel par tâche (avant, quatre appels qui attendaient ensemble la
    mangeaient quatre fois) ; environ 0,30 € ;
  - les petits contrôles (Haiku) ne passent plus par le différé, donc le site arrive plus vite ;
  - le numéro de chaque envoi en différé est gardé : après un redémarrage, la réponse est reprise au lieu d'être
    repayée ;
  - une demande en erreur dans un envoi en différé n'est pas retenue. La page officielle d'Anthropic le dit : « You
    aren't billed for these requests ».
- **Pas de mémoire payée** pour les consignes qui ne servent qu'une fois par projet (étude, vérification, lecture finale
  de la marque).
- **Le journal** garde la part écrite pour une heure, les appels en différé partis au plein tarif et le détail des
  images (taille, qualité, images jointes). L'administration montre maintenant le vrai gain : avant, elle le surestimait.
- **Une erreur du fournisseur rendue avant toute réponse** (500, surcharge 529) : seul le coût de l'envoi est retenu,
  plus le plafond entier. La page officielle ne dit pas si ces erreurs sont facturées : la prudence reste, la retenue est
  juste. Une coupure après le début de la réponse garde le plafond, rendu après rapprochement.
- **Le taux du dollar** : 0,86 par défaut dans le code. Le réglage du Studio en ligne se lit dans Administration ›
  Fournisseurs IA. [À compléter : le taux réglé en ligne, à vérifier par le propriétaire.]

## La marque

Rien n'a été dépensé ; chaque point a son essai. Les gains sont ceux de l'audit, estimés d'après le code.
[À compléter : gain mesuré au prochain essai réel.]

- **Les recherches sur Internet** : une seule famille par recherche (paroles de clients, concurrents, usages). Les
  trois recherches partent en même temps. Une page trouvée deux fois n'est lue qu'une fois. Gain : 0,20 à 0,40 €, et la
  marque arrive 2 à 3 minutes plus tôt.
- **Une retouche de la signature** ne jette plus le logo, la scène ni le téléphone. Elle ne réécrit pas la direction
  artistique et ne montre pas de seconde carte. Gain : 0,32 € par retouche.
- **Un logo refait** :
  - avant ou après le choix, il ne repaie plus la direction artistique. La ligne « La marque » donnée au dessinateur est
    écrite par le code, à partir de la planche : ce qu'elle croit, ce contre quoi elle se bat, ce qu'elle fait ressentir
    et son ton. C'est ce que permet ta règle du 21 novembre. Aucun mot de style de SINA ne peut plus glisser vers lui ;
  - une image refaite sans nouveaux mots du client reprend la direction d'origine ;
  - après le choix, le logo refait remplace l'ancien partout : objet, signes, trois publications et téléphone ;
  - avant le choix, il reçoit les logos des autres planches, avec « je veux un logo complètement différent ».

  Gain : 0,13 € par planche refaite, et 0,07 € après le choix. La carte baisse d'autant.
- **La reprise d'une planche et les quatre équipes de noms** relisent leur consigne en mémoire au lieu de la réécrire au
  double du prix. Le chemin de chaque équipe passe à la fin, et les équipes restent séparées. Gain : environ 0,11 €.
- **Ce qui se mesure est corrigé par le Studio, gratuitement, avant le directeur de création**. Avant, chacun de ces
  défauts déclenchait une reprise payée de la planche entière :
  - un fond « blanc » qui n'est pas blanc pur ;
  - un fond sombre pas assez foncé ;
  - un contraste sous 4,5:1 ;
  - un dégradé trop sombre ;
  - une manière d'ouvrir le site déjà prise ou oubliée ;
  - un chiffre absent de la fiche, désormais annoncé dans « ce qui reste à prouver ».

  Les mots que le client a corrigés une fois (« X, jamais Y ») sont maintenant contrôlés sur la planche. Gain :
  0,13 à 0,22 € par reprise évitée.
- **Le refus du client** est mieux repéré pour le dessinateur du logo : « pas d' », « aucune », « sans », « évite »,
  « déteste ». Une épreuve au banc le garantit (`refus-du-client-toutes-tournures`).
- **L'ordre des images** : la grande scène est relue, et refaite s'il le faut, avant le dessin du téléphone qui la
  reprend. Le logo est relu, et refait avec toutes les raisons de ses refus, avant lui aussi. Le téléphone est toujours
  dessiné : jamais une planche incomplète (correction du chef, 22 novembre 2026). Si le logo reste refusé après ses deux
  reprises, SINA le dit au client, avec la raison, et le téléphone porte le nom écrit seul.
- **Plus de pictogrammes dessinés en code ni de ruban du colis** demandés dans la consigne de la planche. Le nom dessiné
  de secours est en lettres seules, même sur les planches d'avant.
- **Refaire des planches sans nouveaux mots du client** reprend les verdicts du juge des noms. Une nouvelle proposition
  sans ses mots reprend aussi l'étude, les idées et les noms de moins d'un mois, et la carte montre ce prix plus bas.
  Les noms déjà montrés ne reviennent jamais. Gain : environ 1,60 € par nouvelle proposition.

**Pas fait, en attente :**

- *Limiter à 600 caractères ce que le relecteur des images écrit de ce qu'il voit* (0,05 € par marque) : laissé de
  côté, décision du chef (un essai payant d'environ 0,50 € ne vaut pas ce gain).
- *L'aperçu des noms avant les planches* : pas fait sans le propriétaire, comme demandé.

Vérifié : `npx tsc --noEmit` sans erreur. Suite complète : 5 843 essais passés, épreuves comprises. Les derniers lots ont
été vérifiés sur les essais de la marque.

## Le site (partie 3)

Rien n'a été dépensé ; chaque point a son essai. Les gains sont ceux de l'audit, estimés d'après le code, sur un site de
référence (50 sections, 10 pages, 15 photos, environ 7 € aujourd'hui). [À compléter : gain mesuré au prochain essai réel.]

- **Ta règle sur les photos du site** : chacune est maintenant relue, une à une, par le modèle le plus fort au niveau
  élevé (avant : le petit modèle). **Coût en plus : environ 0,80 € par site**, moitié moins quand la création passe en
  différé.
- **Les textes s'écrivent page par page**, au lieu de section par section : 10 à 12 appels au lieu de 43 à 70. Une page
  a huit sections au plus par appel, et les pièces pratiques (en-tête, pied de page, panier, recherche) sont écrites
  ensemble. Le rédacteur voit la page entière, donc il ne répète plus une formule ou un fait à deux sections d'écart. Le
  plan, la relecture et les reprises ne changent pas. Gain : 0,20 à 0,85 €. **La qualité doit être confirmée sur un
  essai réel** (deux clients inventés, avec le nombre de sections refusées par la relecture comparé à aujourd'hui).
- **La partie commune à tout le site** (promesse, voix, menu, titres prévus, pages) part une fois, gardée en mémoire avec
  le dossier du client, au lieu d'être renvoyée dans chaque section. Gain : 0,13 à 0,25 €.
- **La conception** :
  - le juge de l'ordre et la reprise du concepteur ne rendent plus que les pages et les champs qu'ils changent, au lieu
    de recopier tout le site. Gain : 0,27 à 0,55 €, et environ 8 minutes de moins par appel ;
  - les correcteurs gratuits du Studio (variété, rythme, allures, famille, signature…) passent avant de décider la
    reprise payée. Les juges lisent la version corrigée, et la reprise ne se paie que pour ce que le code ne sait pas
    réparer. Gain : 0,05 à 0,35 € (à mesurer) ;
  - le second regard ne juge plus que ce que seul un lecteur voit : la raison du choix parle-t-elle de ce client ? Le
    premier écran dit-il ce qui est vendu ? La preuve est-elle vraie ? Les règles d'or étaient déjà vérifiées deux fois.
- **En même temps** : les photos partent trois à la fois. Le juge de l'originalité et le second regard partent ensemble,
  et les reprises de sections trois à la fois. Les prix ne changent pas, mais le site arrive plus tôt (10 à 20 minutes,
  estimé) et gaspille moins l'attente du différé.
- **Plus de mémoire d'une heure payée** pour les relectures servies une seule fois (juge de l'ordre, plan, relecture des
  textes, relecture des photos). Gain : 0,12 à 0,15 €.
- **Le plan des textes garde jusqu'à 90 sections**. Avant, il était coupé à 40 sans rien dire, alors qu'un site en a 43
  à 70.
- **Le regard sur une page** reçoit la capture découpée en bandes lisibles. Avant, la page arrivait réduite à 170 points
  de large, où aucun texte ne se lit.
- **Un appel en différé encore en cours après 15 minutes** repart en direct au lieu de faire échouer la conception. Son
  coût possible est retenu à la charge du Studio, jamais du client.
- **Images (rapport sur les images)** : une image vide, ou dans le mauvais sens, est refusée sans payer sa relecture. Le
  reste du rapport était déjà fait : comptage au jeton, plus d'aperçus, tailles natives, fond opaque, logo relu avant le
  reste, partie fixe du relecteur en mémoire.

**Pas fait, en attente :**

- *Les mesures gratuites de la partie 12* (temps réellement attendu en différé, part de réflexion d'une section…) : elles
  se lisent sur les données du Studio en ligne, que je n'ai pas ici. Administration › Consommation les montre après un
  essai.
- *La grande scène de la planche en ouverture du site, une image de marque sur la page introuvable* : pas fait sans le
  propriétaire, comme demandé.
- *Les publications du mois en différé* (rapport sur les images, point 9) : à faire avec le lot des publications. Il
  demande d'abord un essai d'une seule image en différé, environ 1 centime, avec son accord.
- *La retouche d'une seule zone* au lieu de refaire l'image : elle demande un essai payant.
- *Rapport sur le texte* : le reste était déjà fait (fil en mémoire, mémoire d'une heure, différé, petit modèle pour le
  mécanique). Le point « refaire au niveau élevé plutôt que deux fois » ne s'applique pas : la marque n'a déjà qu'une
  reprise.

## Les publications et les publicités

Tout a été vérifié par des essais simulés, sans aucun appel payant ni publication réelle. Les gains sont **estimés**
(audit des coûts du 22 novembre 2026), pas mesurés sur une facture.

**Ce qui change pour le client, et l'argent gagné :**

- **Le titre que le client a accepté est celui de l'image.** La stratège écrit maintenant, dans le plan des trois
  publications, le concept de chaque image (idée, composition, cadrage, lieu, lumière, matières, lettres, bouton). Le
  juge le relit avec le reste. À la création, ce concept sert tel quel : plus de second rédacteur qui réécrivait titre
  et scène sans que personne le relise. Gain : environ 0,14 € par projet. Un plan d'avant, sans concept, garde l'ancienne
  façon.
- **Une campagne cohérente d'un format à l'autre.** Pour une publicité, un seul concept d'image par idée, partagé par ses
  formats (fil, carré, récit vertical). Chaque format garde son image et sa relecture. Gain : environ 0,30 € par
  campagne de trois idées. Le devis de la campagne en tient compte.
- **Une relecture plus légère, sans rien perdre.** La photo du produit et le logo sont joints une seule fois (la version
  réduite n'était qu'une copie). Les trois dernières publications, qui ne servent qu'à juger la variété, arrivent en
  petites vignettes. La consigne envoyée au modèle d'images est remplacée par son empreinte. Les règles fixes du
  relecteur passent en tête, gardées en mémoire. L'image relue reste en pleine taille. Gain : environ 0,02 € par
  relecture, soit environ 0,64 €, 1,47 € et 2,30 € par mois (forfaits à 69 €, 99 € et 169 €).
- **Les visuels du pilote en différé.** Les visuels de « Ma communication automatique » servent un à trois jours plus
  tard : leur concept et leurs relectures partent maintenant en différé, à moitié prix, avec une heure de patience pour
  la tâche entière. Au-delà, le reste part en direct. Les visuels que le client lance lui-même restent en direct. Gain :
  jusqu'à 0,74 €, 1,49 € et 2,23 € par mois sur le concept, et la moitié des relectures de ces visuels.
- **Une réponse coupée n'est plus redemandée à l'identique.** Avant, une réponse coupée était redemandée avec la même
  place (8 000 jetons), deux fois de suite. Elle repart maintenant avec deux fois plus de place que celle vraiment
  envoyée. Le devis suit la même règle. Gain : environ 0,10 € à chaque réponse coupée, et moins d'attente. Le nombre de
  réponses coupées reste à mesurer.
- **Petits gains** : la reprise du plan des publications garde la consigne de la stratège, donc ses cahiers sont relus
  en mémoire au lieu d'être réécrits (environ 0,045 € par plan). L'identité et la stratégie ne sont plus envoyées deux
  fois au rédacteur des images (environ 0,08 €, 0,16 € et 0,24 € par mois). Le pilote ne réinscrit plus l'estimation
  d'une tâche déjà lancée : le plafond de la semaine ne paraît plus atteint alors que rien n'a été payé.
- **« Ta journée est prête » et « le point du mois » sont construits, surtout par le code.** La journée se compose sans
  aucun appel à l'IA, à partir du calendrier (publication du jour, réseau, heure, texte à copier). Le point du mois compte
  les chiffres par le code. Un chiffre que le Studio ne peut pas lire est écrit « non disponible ». Un seul appel au
  modèle le plus fort, en différé, écrit le bilan et trois actions. Aucun appel quand rien n'a changé, et un bilan qui
  contient un nombre absent des chiffres comptés est refusé. Coût prévu : environ 5 centimes par mois et par client, au
  lieu d'environ 1,40 € pour un message quotidien écrit par l'IA. Ils ne sont **pas encore allumés** (ni écran, ni
  horaire) : voir plus bas.
- **La fête des mères** suit enfin la loi : quand le dernier dimanche de mai est la Pentecôte, elle passe au premier
  dimanche de juin (prochains cas : 2034 et 2039).

**La relecture par le modèle le plus fort (sa règle) : ce qu'elle coûte en plus.** Chaque image des publications et des
publicités est maintenant relue par le modèle le plus fort, au niveau élevé, une image à la fois, comme les photos du
site. Avant, c'était le modèle moyen, au niveau faible. Les devis et les prix montrés comptent ce nouveau relecteur.
Coût en plus, par mois, après l'allègement de la relecture et avant le différé du pilote :

| Forfait | Relectures par mois (1,3 essai par image) | En plus par mois |
|---|---|---|
| 69 € (30 publications) | environ 39 | environ **+1,58 €** |
| 99 € (60 publications et 1 campagne) | environ 90 | environ **+3,63 €** |
| 169 € (90 publications et 2 campagnes) | environ 140 | environ **+5,69 €** |

Ce sont les chiffres de l'audit (environ 4 centimes de plus par relecture). Recalculé sur le code : si le relecteur
réfléchit plus longuement au niveau élevé (3 000 jetons de réponse au lieu de 2 000), cela monte à environ +2,54 €,
+5,85 € et +9,15 €. Avec le différé du pilote, la part des publications coûte jusqu'à moitié moins : environ +0,80 € à
+1,30 €, +2,05 € à +3,30 € et +3,30 € à +5,35 €. Le vrai chiffre se lira dans Administration › Consommation après un
essai.

**Pas fait, en attente :**

- *Allumer « Ta journée est prête » et « le point du mois »* (écran, notification, horaire chaque mois) : c'est le lot 7,
  et cela engage son argent (environ 5 centimes par mois et par client). **Décision du propriétaire nécessaire.**
- *Les angles en réserve pour les publicités* : le moteur des publicités refait ses propres « angles » (des leviers) au
  lieu de prendre les trois types de clients déjà payés. Une publicité par type de client changerait ce que voit le
  client. **Décision du propriétaire**, au lot des publicités.
- *« Tout dans l'image par OpenAI » ou « la photo par OpenAI, les mots posés par le Studio »* (rapport sur la composition
  des publications) : cela revient sur sa règle des images 100 % IA. **Décision du propriétaire**, après un essai
  gratuit sur des photos déjà payées.
- *Les fins de légende sans ordre* (questions et invitations plutôt que « commente », « partage ») et *0 à 3 mots-dièse
  sur Instagram* : les études disent que la question marche mieux, mais cela change les textes que le client lit, et
  touche sa règle « aucun ordre donné au lecteur ». **Décision du propriétaire.**
- *Publicités* : le budget d'essai conseillé (un seul ensemble de 5 à 20 € par jour au lieu de deux ensembles), le titre
  Meta à 27 caractères, le tutoriel des publicités qui vouvoie encore le client, le marqueur dans les liens. Ce sont des
  changements visibles ou un conseil sur l'argent de ses clients. **Décision du propriétaire**, au lot des publicités.
- *Les trois publications de la marque finie offertes au calendrier* (gratuit, trois publications de plus) : **décision
  du propriétaire.**
- *Le différé des images d'OpenAI* : il demande d'abord un essai d'une seule image (environ 1 centime). **Essai payant,
  avec son accord.**
- *Les angles : la leçon commune en tête, gardée en mémoire* (environ 0,04 € par tour) : pas fait. Le gain est
  incertain (sous un certain nombre de mots, le fournisseur ne garde rien en mémoire), et il faut changer la façon dont
  partent tous les appels.
- *Le calendrier des temps forts par métier, les événements locaux, « ta semaine est prête » le lundi* (rapport sur le
  calendrier et les légendes) : ce sont de nouvelles fonctions visibles, à construire au lot des publications
  automatiques, avec son accord.

## Le suivi dans la durée

Tout a été vérifié par des essais simulés, sans aucun appel payant, aucun envoi réel (SMS, WhatsApp, e-mail) et aucune
vraie boutique. Les coûts sont **estimés**, pas mesurés sur une facture.

**Allumé (décision relayée par le chef d'orchestre : engagements 1 et 6, acceptés le 15 novembre)**

- **Ta journée est prête** (point 10 en partie, engagement 6). Sur le tableau de bord, une fois le projet construit : les
  publications du jour, les demandes reçues par le site depuis hier, les commandes depuis hier. Le rappel du matin (dans
  le Studio et par e-mail) dit aussi les demandes de la veille. La première semaine après la mise en ligne, le premier
  résultat s'affiche dès qu'il arrive (première demande, sinon premières pages vues). Aucun appel à l'IA : gratuit.
- **Le point du mois** (points 2 et 10, engagement 1). Chaque 1er du mois, à partir de 8 h, une tâche part pour chaque
  projet abonné, une seule fois. Les chiffres sont lus par le code, chacun avec sa source : publications, demandes du
  site, commandes et montant (Shopify ou WooCommerce), visites (compteur du Studio, ou visites de la boutique Shopify).
  Un chiffre illisible s'écrit « non disponible » avec sa raison (par exemple « aucune boutique reliée » ou « le droit
  read_orders manque »). Le code dit si le mois est bon ou faible : un mois faible s'ouvre sur le chiffre honnête et sa
  raison, puis le plan, et le travail fait vient à la fin ; il n'a jamais de « ce qui a le mieux marché ». Un bilan qui
  contient un nombre que le code n'a pas compté est refusé. Coût : environ 5 centimes par mois et par client (un appel
  au modèle le plus fort, en différé).
- **La mesure d'audience écrite sur le site** (point 3). Le compteur de pages vues existait déjà ; sa ligne (« sans
  traceur ni adresse… pour ne pas être compté ») est maintenant posée en bas des pages légales des sites hébergés par le
  Studio. Gratuit.

**Construit mais éteint** (chacun a son interrupteur `suivi.…`, éteint par défaut ; rien ne change pour le client tant
que tu n'as pas dit oui) :

- **L'assistante du site** (point 4). Elle dit dès son premier message qu'elle est une IA, avec « Assistante IA » visible
  pendant toute la conversation. Elle ne répond qu'avec ce que le client a donné (ses produits et leurs prix, ses
  réponses, ce qu'il a dit de son activité). Le code relit chaque réponse : un prix, un délai ou une promesse absents de
  sa fiche, et la question est transmise au client avec le formulaire. Au-delà de 40 réponses par jour, le formulaire.
  Coût estimé : environ 1 centime par réponse, donc 40 centimes par jour au plus par site.
- **Les demandes triées et résumées, et les réponses envoyées d'un geste** (point 5). Chaque demande est rangée par le
  code (devis, rendez-vous, question, urgence, ou « à regarder » quand le code ne sait pas) et résumée (qui, quoi, où,
  quand, coordonnées ; « non donné » quand il manque). Les liens d'un geste sont prêts : SMS écrit selon le téléphone,
  WhatsApp, e-mail ; sur ordinateur, « copier » seulement (le SMS n'y marche pas). Gratuit.
- **Le studio photo qui garde le vrai produit** (point 6). La photo du téléphone est jugée par le code (trop petite,
  sombre, floue, produit coupé) avec une phrase pour la refaire, au lieu de payer des images. Un produit avec étiquette
  est toujours posé tel quel sur la scène. Une image refaite est comparée au produit d'origine (forme, proportions,
  couleur) : si le produit a changé, l'image est dite ratée. Gratuit.
- **La fiche Google** (point 7). Le guide geste par geste, avec la page de Google de chaque geste ; le paquet du mois
  (quatre publications, une par semaine, reprises des publications déjà acceptées, sans téléphone ni mot-dièse) ; une
  réponse propre à chaque avis, relue par le code (prénom de l'auteur, un détail de son avis, la signature, aucune
  offre, jamais trop proche d'une réponse déjà donnée). Coût estimé : moins d'un centime par réponse.
- **Le devis contrôlé** (point 8). Les prix viennent seulement des tarifs du client ; une prestation sans tarif devient
  une question. Les mentions obligatoires sont vérifiées selon le métier (déchets et assurance pour le bâtiment). La page
  de signature demande « bon pour accord » et le nom, et garde la preuve (empreinte du devis, date, canal) ; le client
  est prévenu. Une seule relance, sept jours après l'envoi. Gratuit.
- **Le carnet de clients** (point 9). Chaque personne a son origine, son accord daté pour les offres, et s'efface trois
  ans après le dernier contact. Les messages de suivi vont à tous ; les offres seulement à qui a dit oui, ou à un vrai
  client pour des produits semblables. La demande d'avis : vrais clients seulement, une fois, jamais d'offre dedans.
  Gratuit.
- **Le bras droit** (point 11). Une question de droit, de comptabilité ou d'impôts est repérée ; seules les pages
  officielles d'une liste fixe sont ouvertes, avec la date qu'elles affichent ; chaque phrase citée doit être sur la
  page ; pour un litige, un contrat, une déclaration ou des comptes, il dit quel professionnel voir et prépare les
  questions. Ouvrir une page officielle est gratuit.

**Pas fait, en attente :**

- *Allumer chacune des sept fonctions éteintes* : c'est ton oui qui les allume (et, pour l'assistante, son plafond par
  jour). L'interrupteur se règle aujourd'hui par l'administration du Studio (réglage `suivi.<nom>`) ; le bouton dans
  l'écran d'administration n'est pas encore posé.
- *Le guide en six captures pour relier une boutique Shopify, et l'essai sur une vraie boutique* : il faut une boutique
  de développement que toi seul peux ouvrir. Pas vérifié : qu'un marchand ordinaire voie bien « Dev Dashboard ».
- *La grille d'auto-évaluation de la CNIL pour le compteur de visites* : c'est le Studio qui la remplit et la garde ; elle
  engage ta responsabilité, à remplir par toi. La ligne de mesure n'existe pour l'instant qu'en français.
- *L'essai des liens SMS sur un vrai iPhone et un vrai Android de 2026* (gratuit, sur tes téléphones) avant de montrer les
  boutons au client ; et les boutons eux-mêmes dans l'écran des demandes. La réponse prête écrite par SINA pour chaque
  demande n'est pas faite : un appel par demande, à décider avec toi.
- *Brancher le contrôle de fidélité dans le moteur des images* : une image refusée serait refaite, donc payée ; et coller
  le vrai produit sur une scène d'OpenAI touche ta règle « images créées par OpenAI » (la scène l'est, le produit reste
  la photo du client). Ta décision.
- *Les mentions du devis, la page de signature et le formulaire de rétractation d'un devis signé chez le client* :
  textes qui engagent ta responsabilité, à relire par toi (le formulaire et le médiateur n'ont pas été recherchés).
  L'écran où le client enregistre ses tarifs n'est pas fait.
- *La demande d'avis sans offre rangée à part de la prospection* : c'est notre lecture du texte de la CNIL, pas une
  position écrite par elle.
- *Le bras droit dans la conversation de SINA* : la façon de dire au client la limite (« j'informe, je ne conseille
  pas ») engage ta responsabilité ; le branchement attend ton oui.
- *« L'idée du jour »* dans ta journée : elle demanderait un appel à l'IA chaque jour ; pas faite, à décider avec toi.
- *Les « réalisations d'artisans » créées par l'IA* (point 12 du rapport) : ta décision, rien n'a été construit.

## Les décisions appliquées aux publications et aux publicités

Décisions tranchées au nom de tes règles déjà écrites (« aucun ordre donné au lecteur », « Trois angles », « ses
publications deviennent les premières du calendrier »). Tout est vérifié par des essais simulés : aucun appel payant,
aucune publication, aucune publicité lancée, aucune dépense de diffusion.

**Ce qui change pour le client :**

- **Les légendes ne finissent plus sur un ordre.** Plus de « Commande maintenant », « Clique », « Découvre »,
  « Enregistre ce conseil » : une légende finit sur une vraie question, une invitation qui donne envie (« Le coffret
  t'attend à l'atelier jusqu'à samedi ») ou un fait utile. C'est dit à tous les rédacteurs (SINA, le moteur des
  publications, le calendrier) et dans les cahiers de SINA. Le code contrôle chaque légende : un ordre laissé à la fin est
  retiré par le Studio, sans nouvel appel ; une pastille d'appel qui reste un ordre n'est pas posée sur l'image. Une
  légende qui ne serait qu'un ordre n'est jamais vidée : elle est signalée et refaite dans la reprise déjà comprise. Les
  phrases toutes faites du Studio (« Demander un devis », « Enregistrez la publication… ») sont devenues des questions et
  des invitations (« Un devis pour votre projet ? Il se demande en un message. »).
- **De 0 à 3 mots-dièse par légende**, sur tous les réseaux (avant : 3 à 5 exigés sur Instagram et TikTok). Au-delà, le
  Studio garde les 3 premiers.
- **Une publicité par type de client.** Chaque publicité part d'un type de client différent : celui de l'angle choisi
  d'abord, puis ceux des angles en réserve ; jamais deux publicités pour le même type. Le levier (démonstration, détail,
  preuve…) change aussi d'une publicité à l'autre. Il y a autant de publicités que de types de clients connus, au plus.
  Le rédacteur sait à qui parle chaque annonce, et le plan d'essai le montre.
- **Le budget d'essai est un conseil, jamais une promesse** : un seul ensemble d'annonces, de 5 à 20 € par jour au total,
  choisi par le client, 7 jours sans toucher, bilan à 14 jours sur les demandes et les clients obtenus. C'est écrit
  « conseil, pas une garantie : aucun résultat n'est promis », et « le Studio ne dépense rien et ne lance rien ». Avant :
  deux ensembles à 10 à 20 € chacun, au vouvoiement.
- **Le titre des publicités Meta tient en 27 caractères**, contrôlé par le code (avant : 40). Un titre trop long est
  repris ou remplacé par la version du Studio.
- **Le tutoriel des publicités tutoie le client** (plus aucun « vous »).
- **Le marqueur dans les liens** : le Studio ajoute lui-même au lien de chaque publicité les paramètres de suivi
  (utm_source, utm_medium, utm_campaign, utm_content). Les visites venues d'une publicité pourront se compter sur son
  site, sans branchement à Meta. Le lien n'est posé que si son site est en ligne ; sinon l'export écrit « [À compléter :
  l'adresse de ton site, une fois en ligne] ». L'export des campagnes a une colonne « Lien (avec marqueur) ».
- **Les publications de sa marque ouvrent son calendrier**, offertes : les images créées et relues avec la marque
  servent telles quelles, sans nouvel appel payant, sur Instagram et Facebook (elles sont en 4:5), dans l'ordre de la
  planche. Une image refusée à la relecture n'y va jamais. Le client publie lui-même, comme le reste du calendrier.

**Ce qui n'a pas été vérifié :** aucun essai avec la vraie IA (les textes réellement écrits par SINA avec ces consignes
restent à voir) ; la lecture des visites par marqueur dans le point du mois n'est pas faite (le marqueur est posé, le
compte par publicité reste à construire) ; la reconnaissance des ordres est faite par le code avec une liste de verbes :
une tournure rare peut lui échapper.

**Pas touché, en attente de ta décision :** « tout dans l'image par OpenAI » ou « les mots posés par le Studio », et
l'essai du différé des images d'OpenAI.

## Le suivi : cinq fonctions allumées

Décision prise au nom de tes engagements acceptés le 15 novembre (référence, partie 14). Chaque fonction garde son
interrupteur dans Administration : « 0 » l'éteint. Le Studio n'écrit jamais ces réglages lui-même. Tout est vérifié
par des essais simulés : aucun appel payant, aucun SMS, aucun WhatsApp, aucun e-mail réellement envoyé.

**Ce que le client voit maintenant, et où :**

- **L'assistante de son site.** Sur son site en ligne, une bulle « Assistante IA » répond aux visiteurs. Elle dit dès
  son premier message qu'elle est une IA, ne répond qu'avec ce qu'il a donné (ses produits, leurs prix, ses réponses),
  et lui transmet le reste par le formulaire. 40 réponses par jour au plus, puis le formulaire. Dans l'écran « Publier
  ton site », il lit les échanges du jour, et voit ceux qu'elle lui a transmis. Coût estimé : environ 1 centime par
  réponse, pris sur son budget d'IA.
- **Ses demandes, triées et résumées.** Dans « Publier ton site », partie « Demandes reçues » : chaque demande porte sa
  case (devis, rendez-vous, question, urgence, ou « à regarder ») avec sa raison, et son résumé (qui, quoi, où, quand,
  coordonnées ; « non donné » quand il manque). Il écrit sa réponse sous un début déjà posé (« Bonjour Julie, »), puis
  « Envoyer par e-mail » ou « Copier ». Gratuit.
- **Le contrôle de ses photos.** Quand SINA pose une photo de son téléphone sur un produit, le Studio la juge (taille,
  lumière, netteté) : la photo reste posée, et SINA lui dit comment la refaire avant toute image payée. Chaque image
  créée avec son vrai produit est comparée au produit d'origine (forme, proportions, couleur) : un produit changé rend
  l'image ratée, elle n'est jamais montrée, et elle n'est pas refaite toute seule. Gratuit.
- **Sa fiche Google**, dans la conversation avec SINA : le guide geste par geste avec la page d'aide de Google, le
  paquet du mois (quatre publications reprises de celles qu'il a acceptées, sans téléphone ni mot-dièse ; rien
  d'inventé s'il n'y en a pas), et la réponse à un avis qu'il colle, relue avant de lui être montrée (une carte
  d'accord, moins d'un centime estimé).
- **Le bras droit**, dans la conversation avec SINA : pour une question de droit, de comptabilité ou d'impôts, SINA dit
  mot pour mot « Je t'informe à partir des pages officielles (datées). Pour une décision qui t'engage, voici le
  professionnel à consulter et les questions à lui poser. » Elle n'ouvre que des pages officielles d'une liste fixe, en
  donne la date affichée (« non disponible » quand la page n'en a pas), et relit sa réponse avant de l'envoyer. Gratuit.

**Restent éteints :** les boutons SMS et WhatsApp (tant que l'essai sur un vrai iPhone et un vrai Android n'est pas
fait, sur tes téléphones, gratuit), le devis et le carnet de clients.

**Pas vérifié :** aucun essai avec la vraie IA ni sur un vrai site en ligne ; le contrôle de fidélité n'a été essayé
que sur des images simulées (ses seuils restent à régler sur de vraies images) ; « posé tel quel » (coller la vraie
photo du produit sur une scène) n'est pas branché, parce que tu avais refusé le produit collé devant un décor.

## Les vidéos

D'après la recherche 09 du 22 novembre 2026, points 2 à 11. Tout est vérifié par des essais simulés : aucun appel
payant, aucune vidéo réellement créée, aucune clé saisie. Les fabricants que tu as accordés (Vertex, Kling en direct,
BytePlus pour Seedance, Runware en secours) sont branchés mais restent éteints tant que tu n'as pas saisi leur clé dans
Administration › Fournisseurs IA et confirmé chaque modèle ; sans clé, le Studio garde ce qui marche aujourd'hui.

**Ce que le client verra, point par point :**

- **2. Le plan sûr au centre.** Sa vidéo montre son vrai produit, exactement le sien : la photo détourée posée sur les
  couleurs de sa marque, avec son ombre, et la caméra qui avance ou glisse doucement (plus jamais une image figée).
  Rien ne peut changer son étiquette. Gratuit.
- **3. Le mélange.** Un seul plan animé par l'IA dans une publication (deux dans une publicité), le reste en plans sûrs.
  Le modèle animé est celui que tu régleras dans Administration › Images & Vidéos › « Vidéos produit », après l'essai
  comparatif ; tant qu'aucun n'est réglé, la vidéo est faite uniquement de plans sûrs, sans dépense de vidéo.
- **4. Moins de pannes.** Rien de visible : Veo 3.1 Fast et Lite par Vertex (personnes interdites sans accord, son
  coupé), Kling 4.0 en direct (durée toujours envoyée, sinon Kling compte 10 secondes ; vidéo copiée chez nous tout de
  suite, Kling ne la garde que 30 jours), Seedance par BytePlus (l'identifiant du client, chiffré, part à chaque appel),
  Runware en secours (il renvoie le coût exact de chaque vidéo), Alibaba à Francfort (avec l'identifiant de l'espace de
  travail). La durée de Veo est maintenant toujours envoyée.
- **5. Le contrôle image par image.** Cinq images par seconde de chaque plan animé sont comparées à la vraie photo, sans
  rien payer ; au moindre écart, le plan est arrêté avant même la relecture. Le relecteur cherche ensuite tout texte
  inventé dans toute l'image, pas seulement sur l'étiquette. Un plan refusé n'est jamais montré : le plan sûr prend sa
  place.
- **6. Le brouillon.** Prêt pour Seedance 2.5 : un aperçu bon marché en 480p, puis la version finale tirée de
  l'aperçu validé, sans tout refaire.
- **7. Les sous-titres mot à mot.** Deux à quatre mots à la fois, le mot dit s'allume à la couleur de sa marque, comme
  dans CapCut, posés au-dessus du bas de l'image. Le minutage suit la voix mesurée et ses silences. Gratuit.
- **8. Les coupes au rythme de la musique.** Chaque changement de plan tombe sur un temps du morceau composé par le
  Studio, pour toute vidéo sans voix (une vidéo avec voix garde le rythme de la voix). Gratuit.
- **9. Les deux grilles.** Publication de 9 à 15 secondes en cinq temps (l'accroche de son angle en moins de 2
  secondes, deux bénéfices, son produit dans son décor, l'offre en clair) ; publicité de 21 à 30 secondes avec, en plus,
  une preuve vraie quand il en a fourni une (jamais inventée). La carte de fin reste dans le tiers du milieu, jamais dans
  le bas de l'image que cachent les boutons des réseaux.
- **10. Le prix avant.** Il lit le coût probable en pourcentage de son budget avant de dire oui, avec : « Seul le plan
  accepté par le contrôle est compté ». Un plan refusé lui est rendu : le Studio le garde à sa charge.
- **11. Ses droits.** Avant d'animer une photo, il coche « J'ai les droits sur cette photo » ; sans cette case, rien
  n'est animé. Chaque plan créé par l'IA est inscrit au journal (qui, quand, quel modèle, date de son accord), et il peut
  signaler un plan : il est retiré tout de suite, la trace reste.

**Ce que ça coûtera (estimé, d'après les prix officiels du 22 novembre, un dollar compté pour un euro, relecture du
juge non comptée) :** un plan animé de 5 secondes coûte environ 0,19 € avec Wan 2.6 Flash, 0,15 € avec Veo 3.1 Lite,
0,40 € avec Seedance 2.0 Mini, 0,79 € avec Kling 4.0, 1,16 € avec Seedance 2.5. Pour le forfait à 99 € (33 € de budget
d'IA par mois), une publication du mélange prend donc entre environ 0,5 % et 3,5 % de son mois, une publicité (deux
plans animés) le double. Seul le plan accepté lui est compté.

**Pas fait, en attente :**

- **L'essai comparatif** (point 1, environ 10 $) : il te revient, et c'est lui qui choisira le modèle animé.
- **La musique d'ElevenLabs** (point 12) : demande l'abonnement Scale (299 $ par mois) ; la musique reste celle,
  gratuite, du compositeur du Studio.
- **Un décor créé par OpenAI derrière le produit détouré**, comme le proposait la recherche : cela touche ta règle
  « produit collé devant une photo floue », refusé. Le plan sûr reste donc sur les couleurs de la marque. À toi de dire.
- **Le minutage exact de la voix** : la recherche disait ElevenLabs déjà branché, ce n'est pas le cas (aucun appel à
  ElevenLabs dans le code). Le Studio sait déjà lire l'heure de chaque lettre qu'ElevenLabs renvoie, mais l'utiliser
  demande d'ajouter sa voix : ta décision.
- **Le brouillon à l'écran** : l'aperçu puis la version finale sont prêts dans le branchement de Seedance 2.5, pas
  encore dans l'écran ; à faire si Seedance 2.5 est choisi après l'essai.
- **Les données en Europe** : aucun des fabricants ne calcule ses vidéos en Europe (Veo aux États-Unis, Kling à
  Singapour, Seedance en Asie, Wan à Francfort en portée « Global », donc parfois ailleurs). À te dire avant d'ouvrir
  ces modèles aux clients.
- **La vérification d'identité des clients** demandée par BytePlus pour Seedance : pas faite ; le texte exact de
  l'autorisation de ByteDance reste [À compléter].

**Pas vérifié :** aucun appel réel à Vertex, Kling, BytePlus ni Runware ; la forme de la réponse de suivi de BytePlus
n'a pas pu être lue (page fermée sans navigateur) ; le seuil du contrôle image par image est à régler sur de vrais plans.
