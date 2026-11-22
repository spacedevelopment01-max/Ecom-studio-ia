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
