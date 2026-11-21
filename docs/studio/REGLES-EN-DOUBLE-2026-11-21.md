# Une seule règle à un seul endroit : relevé du 21 novembre 2026

Point 3 du chef d'orchestre. Lecture de toutes les consignes de SINA (sa consigne générale, les consignes de chaque étape,
les notices de ses outils, les consignes des créations) et des cahiers que le code charge vraiment. Chaque point ci-dessous a
été relu dans les fichiers. Rien de ce qui change ce que le client voit ou reçoit n'a été modifié : ces points attendent
la décision du propriétaire.

## 1. Rangé (aucun changement pour le client ni pour ce que reçoit l'IA)

- **La note « 8 sur 10 »** était écrite trois fois (images, angles, noms) : une seule source,
  `src/lib/syna-agent/note-du-proprietaire.ts`, reprise par les trois juges.
- **Deux consignes de logo mortes** (`LOGO_NOT_SCENE`, `LOGO_OWN` dans `brand-images.ts`) : écrites mais envoyées nulle
  part, et contraires à la décision du 21 novembre (« pas de consigne autre que les 50 logos en exemple ») : retirées.
- **Trois commentaires faux** dans `brand-images.ts`, corrigés pour dire ce que fait le code : la planche des 50 logos
  aimés va aussi au dessinateur (« seulement comme exemples ») ; la direction artistique ne reçoit rien des autres logos,
  seul le dessinateur reçoit ceux de la même série ; une image refusée est redessinée deux fois au plus, seule une
  demande en échec chez le fournisseur n'est jamais renvoyée.
- **La façon de demander les preuves** était écrite deux fois mot pour mot (`preuves.ts`) : une seule source ; le texte
  reçu par SINA est identique au caractère près (vérifié).

## Suite : décisions appliquées (accord du propriétaire relayé par le chef d'orchestre, « Oui envoie lui », 21 novembre 2026)

Appliqué, ses décisions déjà écrites seulement (essais : `tests/sina-regles-alignees.test.ts` ; épreuves
`personne-sans-accord-ecrit` et `le-mot-maquette`) :
- point 2, les personnes : une seule phrase (`REGLE_PERSONNES`, `src/lib/people-policy.ts`), reprise dans la consigne
  générale, les réalisations, les sections du site, les cahiers des publications et du site ; la planche n'en montre
  aucune sans photo d'une personne fournie par le client ni son accord écrit (et son relecteur la refuse) ; la galerie
  demande les mots écrits du client lui-même ;
- point 3, les réalisations : SINA les crée quand l'artisan n'en a pas assez ; leur moment n'est plus « absent, sauté » ;
- point 4, la planche : l'objet de la marque, jamais le produit dessiné sans sa photo ;
- points 6 et 7, les cahiers : l'accueil qui contredisait les règles d'or retiré ; le cadre aux angles arrondis et le
  produit dans un rond retirés ;
- point 8 : « clair d'abord ; puis l'émotion, jamais avant le sens » chez le rédacteur du site ;
- point 11 : le prix de la galerie dit à SINA en part du budget d'IA ;
- point 13 : « le haut de ton site » au lieu de « la maquette ».

Pas appliqué :
- **point 1 (les questions)** : la consigne demandait de tout aligner sur « une à la fois » (décision du 14 novembre) ; or
  une décision du propriétaire du 19 novembre, après l'essai Braise, demande de grouper les questions simples (six au
  plus), « faire connaissance » gardant une question à la fois (enregistrement `c982c30`, essai
  `tests/sina-questions-ensemble.test.ts`). Les deux se contredisent : en attente de sa réponse ;
- la méthode « dessiner puis coder » n'est pas touchée : son dessin n'a déjà aucune personne ;
- points 5, 9, 10, 12, 14, 15, 16 et partie 3 : conversations de leur étape ou lot des forfaits.

## 2. Contradictions qui changent ce que le client voit ou reçoit (à trancher par le propriétaire)

Pour chacune : ce qui se contredit, où, et ce que je recommande (rien n'est appliqué).

1. **Une question à la fois, ou plusieurs ensemble ?**
   - Ensemble (faits simples, six au plus) : consigne générale `prompt.ts:7` ; les preuves `preuves.ts`.
   - Une à la fois : la relectrice de ses messages (« une seule question au plus », `conversation.ts:119`, qui peut faire
     réécrire un message groupé) ; l'étape de l'activité (« UNE par UNE », `journey.ts:409`, `tools/activity.ts:30`) ;
     la décision du 14 novembre (« une à la fois »).
   - La galerie pose quatre questions d'un coup, dont l'accord pour montrer une personne (`tools/gallery.ts:31`), que la
     consigne générale veut seule.
   - Recommandation : garder la règle de la consigne générale (une question de choix ou d'accord seule ; des faits
     simples ensemble, six au plus, essai du 19 novembre : douze messages pour les preuves) et aligner les trois autres.
     À confirmer par toi, car elle nuance ta décision du 14 novembre.
2. **Des personnes dans les images** : quatre versions.
   - Jamais, même avec accord : planche de marque (`brand-images.ts`, `brand-prompts.ts`), accueil dessiné.
   - Aucune sans photo du client ou accord écrit (ta règle, `CLAUDE.md`) : `custom-theme/brand.ts`, cahiers du site et des
     publications.
   - Seulement « aucune personne reconnaissable » : consigne générale `prompt.ts:38`, réalisations des artisans
     (`library.ts:150`, `tenue-services.ts:150`) ; un cahier des publications permet des mains et une silhouette de dos,
     que deux relecteurs refusent.
   - Un « oui » dans la conversation suffit pour la galerie (`tools/gallery.ts`).
   - Recommandation : une seule phrase, ta règle (aucune personne sans photo fournie par le client ou accord écrit), à
     un seul endroit, reprise partout.
3. **Les réalisations et les avant/après créés par l'IA.** Le site les crée quand l'artisan n'en a pas assez (ta règle du
   14 novembre, `prompt.ts:38`, `tenue-services.ts:150`) ; les publications les refusent comme trompeuses
   (`posts-plan.ts:98`, deux cahiers des publications) ; deux pièces du site exigent de « vraies réalisations »
   (`partitions.ts:37`, `preuves.ts:17`). Recommandation : ta règle reste pour le site, avec une mention claire qu'elles
   sont des illustrations ; les publications gardent le refus (une publication présente un travail comme réel). À
   trancher par toi : c'est ta responsabilité devant la loi.
4. **Le produit montré sans sa photo.** Le client entend « je ne montre pas tes produits en image, parce que je ne les
   invente pas » (`photos-produits.ts:25`) ; mais la planche de marque dessine « le vrai produit tel que sa fiche le décrit »
   et l'objet (sachet, pot) sans photo (`brand-prompts.ts:286-287`, cahier `maquettes-accueil-mobile.md:84`).
   Recommandation : sur la planche, sans photo du client, l'objet de la marque (sac, carte, emballage) plutôt que son
   produit.
5. **Le nombre de parties d'une page.** Au moins 10 (`partitions.ts`, `theme.ts:396`, cahier de l'ordre) ; au moins 8 à
   l'accueil et 7 sur la fiche produit (ta règle dans `CLAUDE.md`, notice `custom-theme/tools.ts:179`) ; 8 à 10 pour
   l'accueil dessiné (`dessin/methode.ts:11`, `dessiner-puis-coder.md:16`). Recommandation : à décider dans la
   conversation du site ; la méthode « dessiner puis coder » ne change pas.
6. **L'ordre de l'accueil.** Un cahier lu par le concepteur met la conviction de la marque avant toute preuve et finit
   par « questions › lettre d'information » (`theme-construction-des-pages.md:122`) ; les règles d'or 5 et 9 disent
   l'inverse et sont contrôlées par le code (`partitions.ts:38,42`, `ordre.ts:255`). Recommandation : retirer la phrase
   du cahier (le code refuse déjà ce qu'elle conseille).
7. **L'ouverture du haut du site sur la planche.** Le cahier des maquettes propose « la photo dans un grand cadre aux
   angles arrondis » et « le produit dans un rond » (`maquettes-accueil-mobile.md:51,56`) ; le relecteur compte un cadre
   arrondi ou une vignette ronde comme un défaut (`brand-prompts.ts:329`) : des images peuvent être payées puis refusées.
   Recommandation : retirer ces deux manières du cahier (ta règle : jamais d'arche ni de demi-lune).
8. **Clair d'abord, ou émotion d'abord ?** Ta règle : clair d'abord, beau ensuite (`brand-prompts.ts:20`,
   `angles-prompts.ts`) ; le rédacteur du site lit « L'ÉMOTION D'ABORD, partout » (`custom-theme/brand.ts:230`).
   Recommandation : remplacer par ta formule (« clair d'abord ; puis l'émotion, jamais avant le sens »).
9. **Les noms à double lecture.** Ta méthode cite une « deuxième lecture : expression, double sens »
   (`brand-prompts.ts:29`) et une équipe cherche des expressions détournées (`brand-prompts.ts:52,60`) ; mais un jeu de mots
   est noté 6 sur 10 (donc refusé, `brand-prompts.ts:35,187`) et « aucune phrase à double sens » est interdit. Le cahier
   des noms demande au moins 200 pistes et 6 chemins (`noms-de-marque.md:108`) ; la chaîne a 4 équipes de 40 à 70 noms.
   Recommandation : à décider dans la conversation de la marque.
10. **Tu ou vous dans les publications.** Le rédacteur doit toujours tutoyer (`posts-plan.ts:95`) ; son cahier dit
    « vous » pour la santé, le droit, le bâtiment, le luxe, et le client décide (`publications-textes-et-legendes.md:92`).
    Recommandation : le client choisit (il est dans sa fiche), « tu » par défaut.
11. **Des euros donnés à SINA.** La règle : le client ne voit jamais d'euros pour l'IA ; mais la galerie donne à SINA un
    prix « au plus … € » par produit (`tools/gallery.ts:40`), qu'elle pourrait répéter. Recommandation : le donner en
    pourcentage, comme partout ailleurs.
12. **Le prix des forfaits.** Un refus dit « forfait Dominer (129 € par mois) » (`job-entitlements.ts:9`) et SINA le répète
    (`steps-late.ts:51`, `journey.ts:364`) ; tes forfaits validés sont 69, 99 et 169 €, et celui à 99 € comprend une
    campagne. Déjà connu (« le code a encore 49, 89 et 129 € jusqu'au lot des forfaits ») ; à régler au lot des forfaits.
13. **Le mot « maquette » montré au client.** Ta règle : jamais ; mais si la planche n'a pas son haut de site, le client
    lit « je n'ai pas pu préparer la maquette de ton site » (`brand-images.ts:270,599`). Recommandation : « le haut de ton
    site ».
14. **Les angles en réserve.** Le client entend que ses autres angles servent à ses publications et ses publicités
    (`tools/angles.ts:76`, `journey.ts:443`) ; les publications n'utilisent que l'angle choisi (`posts-plan.ts:105`).
    Recommandation : à régler dans la conversation des publications.
15. **Le calendrier.** Un cahier conseille 3 publications par semaine (`publications-ligne-et-calendrier.md:166`) ; l'outil
    en met 1 par jour par défaut et jusqu'à 5 (`tools/calendar.ts:32`, `calendar.ts:194`) ; tes forfaits disent 1, 2 et 3
    par jour. Les publicités du calendrier : seulement si le client le demande (`tools/calendar.ts:32`), mais SINA doit lui
    demander « avec ou sans » (`journey.ts:365`). Recommandation : à régler dans la conversation des publications.
16. **Le client choisit-il un thème ?** Pendant le parcours, non (consigne générale, étape du site) ; mais l'étape 8
    (« un de nos thèmes ») est encore ouverte et ses outils font choisir un thème et une famille (`journey.ts:51,362`,
    `tools/themes.ts`, `tools/families.ts`), cachés seulement dans le parcours. Recommandation : à régler dans la
    conversation du site (aucun retrait sans ton accord).

## 3. Doublons dans les consignes (même règle écrite plusieurs fois ; non modifiés)

Ils ne se contredisent pas, mais l'IA les lit plusieurs fois : les ranger change ce qu'elle reçoit, donc chacun sera rangé
dans la conversation de son étape, après essai.
- La définition d'un angle (sûr, émotion, audacieux) : `prompt.ts:36`, `journey.ts:434`, `angles-prompts.ts:15`,
  `tools/angles.ts:46`, cahier `angles-marketing.md:9`.
- Les dix règles d'or de l'ordre des pages : copiées dans `partitions.ts:33-44` et lues aussi dans le cahier
  `theme-ordre-et-variete.md` (le concepteur les reçoit deux fois).
- « Ta photo ici » pour les produits sans photo : `photos-produits.ts` (quatre fois) et `journey.ts:360`.
- « Jamais mon équipe, ma stratège, le juge » : `prompt.ts:8`, `conversation.ts:118`, `journey.ts`, `angles-prompts.ts`.
- Le site sans choix de thème : `prompt.ts:38`, `journey.ts:360`, `site-job.ts:242`.
- La galerie de 7 images (jusqu'à 9) dans le code, « jamais moins de 3 à 5 » dans le cahier `theme-images.md:59`.
- Les mots-dièse (3 à 5) : `posts-plan.ts` et trois cahiers des publications ; deux cahiers se contredisent sur la
  limite officielle de 5 (annoncée dans l'un, « non trouvée » dans l'autre).
