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
