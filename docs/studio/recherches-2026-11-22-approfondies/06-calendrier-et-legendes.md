# Recherche approfondie 6 : le calendrier de publication et les textes des publications

Recherche du 22 novembre 2026 (après-midi). Elle part des trous du rapport du matin
(`docs/studio/recherches-2026-11-22/07-calendrier-de-publication.md`, partie « Ce que je n'ai pas pu vérifier ») et du
rapport sur les publications (`03-publications.md`), et ne répète pas ce qu'ils disent déjà. Aucun appel payant. Aucun
autre fichier du dépôt modifié.

**Niveaux de preuve** : **officiel** (texte de loi, page d'un ministère, d'une préfecture, d'une chambre de commerce, de
l'INSEE, aide officielle d'une plateforme) ; **étude publiée** (grosse base de données ou institut, avec méthode) ;
**test indépendant** ; **article d'éditeur** (vendeur d'outils, sans données) ; **avis**. Une date **« calculée »** est
déduite par moi d'une règle officielle lue (calcul refait par programme, jour de la semaine compris). Une date **« à
confirmer »** n'a été trouvée que sur des sites secondaires, ou pas encore annoncée.

**Ce qui existe déjà dans le code, vérifié avant de chercher**

- `src/lib/syna-agent/calendar.ts` et `tools/calendar.ts` : le calendrier MANUEL (7, 15 ou 30 jours) range des
  publications déjà créées, à des heures fixes (`DEFAULT_SLOTS` de `social-v2/planner.ts` : 11 h 30, 18 h 30, 8 h 30,
  13 h, 21 h), annonce les manques sans les combler, refuse une date passée ou deux publications le même jour sur le
  même réseau ; rappel une fois par jour à partir de 8 h, par notification et par courriel (`remindDue`).
- Il existe bien une liste de temps forts, que le rapport du matin n'avait pas vue : `keyMoments()` dans
  `src/lib/engine/social-quality.ts`, utilisée par `social-v2/strategy.ts` et `strategy-long.ts`. Elle ne contient que
  **six moments** (Noël, Saint-Valentin, fête des mères, fête des pères, rentrée, Halloween), avec une avance de 12 à
  24 jours, **une seule publication par temps fort**, et des métiers rangés par grands secteurs de boutique (beauté,
  mode, bijoux, maison…) : aucun artisan, aucun restaurant, aucune période de soldes, aucun jour férié, aucune zone scolaire.
- Dans cette liste, la fête des mères est toujours « le dernier dimanche de mai » (`sunday(y, 4, -1)`) : **la règle
  du report quand ce dimanche est la Pentecôte n'y est pas**. Elle ne joue pas avant 2034 (calcul : Pentecôte le
  28 mai 2034, fête des mères le 4 juin 2034 ; de même 2039), mais c'est une règle fausse dans le code.
- `NETWORK_RULES` (même fichier) : Instagram 3 à 5 mots-dièse, première ligne de 125 caractères, légende de 60 à
  2 200 caractères ; Facebook 0 à 2 ; TikTok 3 à 5, 400 caractères au plus ; une liste de mots-dièse vides
  (« fyp », « viral », « instagood »…) jamais proposés ; une liste d'ouvertures faibles (« Découvrez », « Voici »,
  « Nouveau ») refusées ; `hashtagsFor()` dans `social-v2/copy.ts` fabrique 5 mots-dièse au plus (catégorie, ville,
  matière, thème, marque).

---

## 1. Les dates encore non confirmées ce matin

### 1.1 Soldes : la règle complète, enfin lue en entier

La page de Légifrance a encore refusé l'accès (erreur 403). La règle complète a été lue sur la fiche de la **Chambre de
commerce et d'industrie de Paris Île-de-France**, mise à jour le 25 juin 2026, qui recopie l'arrêté du 27 mai 2019. Le
moteur de recherche montre le même texte pour l'article 1 de l'arrêté sur Légifrance (extrait seulement).
Preuve : officiel (chambre de commerce), recoupé par la page de la Direction générale des entreprises.
https://www.entreprises.cci-paris-idf.fr/fiches-pratiques/les-soldes ;
https://www.entreprises.gouv.fr/fr/commerce-et-artisanat/ventes-reglementees/soldes

- Été : « Elles débutent le dernier mercredi du mois de juin, à 8 heures du matin. Cette date est avancée à
  l'avant-dernier mercredi du mois de juin lorsque le dernier mercredi intervient après le 28 du mois. »
- Hiver : « le 2ème mercredi du mois de janvier, à 8 heures du matin », avancé « au 1er mercredi du mois lorsque le
  2ème mercredi intervient après le 12 janvier ».
- Durée : « quatre semaines chacune ».
- Exceptions, mot pour mot :
  - été : Alpes-Maritimes et Pyrénées-Orientales « 1er mercredi du mois de juillet » ; Corse « 2ème mercredi du mois de
    juillet » ; Guadeloupe « dernier samedi de septembre » ; Saint-Barthélemy et Saint-Martin « 2ème samedi
    d'octobre » ; Martinique « 1er jeudi d'octobre » ; Guyane « 1er jeudi du mois d'octobre » ; La Réunion « 1er samedi
    du mois de février » ; Saint-Pierre-et-Miquelon « 1er mercredi après le 14 juillet » ;
  - hiver : Meurthe-et-Moselle, Meuse, Moselle, Vosges « 1er jour ouvré du mois de janvier » ; Guadeloupe « 1er samedi
    de janvier » ; Saint-Barthélemy et Saint-Martin « 1er samedi de mai » ; Guyane « 1er mercredi du mois de janvier » ;
    La Réunion « 1er samedi du mois de septembre » ; Saint-Pierre-et-Miquelon « 1er mercredi après le 15 janvier ».
  - La fiche ne donne pas de période d'hiver pour la Martinique ni de ligne pour Mayotte : **à confirmer**.
- La page de la Direction générale des entreprises donne pour l'hiver 2026 : métropole du mercredi 7 janvier 2026 à
  8 h au mardi 3 février 2026 ; Moselle et voisins le vendredi 2 janvier 2026 ; Guadeloupe le samedi 3 janvier 2026 ;
  Saint-Pierre-et-Miquelon le mercredi 21 janvier 2026 ; elle ne donne **aucune date 2027** au 22 novembre 2026 (le
  calendrier officiel paraît en général en décembre).

**Les dates 2027 qui en découlent (calculées)**

| Zone | Soldes d'hiver 2027 | Soldes d'été 2027 |
|---|---|---|
| Métropole (règle générale) | mercredi 6 janvier au mardi 2 février 2027 (le 2e mercredi, le 13, tombe après le 12) | mercredi 23 juin au mardi 20 juillet 2027 (le dernier mercredi, le 30, tombe après le 28) |
| Meurthe-et-Moselle, Meuse, Moselle, Vosges | « 1er jour ouvré » de janvier : le 1er est férié, le 2 est un samedi. Les sites d'information donnent le **samedi 2 janvier 2027** (au 29 janvier) ; si « ouvré » s'entend du lundi au vendredi, ce serait le lundi 4. **À confirmer** à la parution | règle générale |
| Alpes-Maritimes, Pyrénées-Orientales | règle générale | mercredi 7 juillet 2027 |
| Corse | règle générale | 2e mercredi de juillet = **mercredi 14 juillet 2027**, jour de la fête nationale : **à confirmer** (un report par arrêté est possible) |
| Guadeloupe | samedi 2 janvier 2027 | samedi 25 septembre 2027 |
| Guyane | mercredi 6 janvier 2027 | jeudi 7 octobre 2027 |
| Martinique | **non lu** | jeudi 7 octobre 2027 |
| La Réunion | samedi 4 septembre 2027 (ses soldes « d'hiver » austral) | samedi 6 février 2027 |
| Saint-Barthélemy, Saint-Martin | samedi 1er mai 2027 | samedi 9 octobre 2027 |
| Saint-Pierre-et-Miquelon | mercredi 20 janvier 2027 | mercredi 21 juillet 2027 |

Et pour 2028 (calculées) : hiver le mercredi 12 janvier 2028, été le mercredi 28 juin 2028.

**Ce que SINA pourrait en faire** : coder la règle, pas les dates. Le Studio calcule chaque année les dates à partir du
département du client (tiré de son adresse), marque « calculée » jusqu'à la parution officielle de décembre, puis
« vérifiée » ; la campagne de soldes est prête cinq semaines avant (délai de La Poste, rapport du matin), donc
dès le 2 décembre 2026 pour l'hiver 2027.

### 1.2 Fête des mères : ce qui est sûr, ce qui ne l'est pas

- **Sûr (officiel)** : la réponse du ministère publiée au Journal officiel le 25 février 2025 (question n° 181) dit :
  « Seule la fête des mères est inscrite dans le code de l'action sociale et des familles (article R215-1). Les fêtes
  des pères, des grand-mères et des grands-pères n'ont, en revanche, pas d'existence juridique et sont des initiatives
  commerciales. » La question recopie l'article R. 215-1 : « chaque année, la République française rend officiellement
  hommage, aux mères, au cours d'une journée consacrée à la célébration de la « Fête des mères ». Le ministre chargé
  de la famille organise cette fête avec le concours de l'Union nationale des associations familiales ». La même page
  confirme les grands-mères (« depuis 1987, le 1er dimanche de mars, à l'initiative d'une entreprise commerciale ») et
  les grands-pères (« le premier dimanche d'octobre […] initiée en 2008 »).
  https://www.assemblee-nationale.fr/dyn/17/questions/QANR5L17QE181 (lue en entier dans sa version imprimable)
- **Pas lu sur le texte officiel** : la phrase de la date (« dernier dimanche de mai ; si cette date coïncide avec
  celle de la Pentecôte, la fête des mères a lieu le premier dimanche de juin »), qui vient de la loi du 24 mai 1950.
  Elle n'est pas dans l'extrait de l'article R. 215-1 recopié par l'Assemblée ; elle est reprise partout (Europe 1,
  WebLex, calendriers), mais je n'ai pas pu lire le texte en vigueur (Légifrance bloqué). Un site juridique (WebLex)
  rappelle qu'un arrêt de la Cour de cassation (11 mai 2016, n° 14-26975) traite la fête des mères comme une journée
  légalement consacrée.
- Dates calculées : 30 mai 2027 (Pentecôte le 16 mai), 28 mai 2028, puis premier report en **2034** (4 juin) et
  **2039** (5 juin).

**Ce que SINA pourrait en faire** : corriger `keyMoments()` (règle de la Pentecôte) et marquer la date « règle de 1950,
reprise par toutes les sources, texte en vigueur non lu ».

### 1.3 Les événements nationaux de 2027

| Événement | 2027 | Ce qui a été lu | Preuve |
|---|---|---|---|
| Journées européennes des métiers d'art | **30 mars au 4 avril 2027**, selon des agendas (Unidivers, office de tourisme de Haute-Savoie : un atelier le dimanche 4 avril 2027) | Aucune annonce de l'organisateur (Institut pour les savoir-faire français) trouvée. Le ministère de la Culture a créé en 2025 le « Printemps des manufactures », festival national des métiers d'art qui se tient pendant ces Journées (communiqué du 3 avril 2025) | agenda (à confirmer) ; officiel pour le lien. https://www.culture.gouv.fr/presse/communiques-de-presse/rachida-dati-ministre-de-la-culture-annonce-la-creation-du-printemps-des-manufactures-un-festival-national-pour-celebrer-les-metiers-d-art-d |
| Journées européennes du patrimoine | samedi 18 et dimanche 19 septembre 2027, **calculées** (3e week-end de septembre) | 2026 : 43e édition, 19 et 20 septembre, avec une journée des écoles le 18 (ministère de la Culture). Aucun communiqué pour 2027 ; l'habitude du 3e week-end n'a été lue que dans des résumés | officiel pour 2026, à confirmer pour 2027. https://www.culture.gouv.fr/presse/communiques-de-presse/preprogramme-des-43e-journees-europeennes-du-patrimoine-les-samedi-19-et-dimanche-20-septembre-2026 |
| French Days de printemps | **non annoncées** ; estimations 28 avril au 3 mai 2027 (Klaviyo, icalendrier), 30 avril (un autre site) | Opération privée de commerçants en ligne, annoncée peu avant ; 2026 : 29 avril au 5 mai environ | avis. Le Studio ne doit pas la dater d'avance |
| Fête du pain | **non trouvée** | 2026 : 8 au 17 mai (Le Bonbon, article du 26 février 2026, qui dit « on connaît enfin les dates de l'édition 2027 » sans les donner) ; le site des boulangers n'a pas de page à jour ; le site de la fête ne répondait pas | à confirmer |
| Semaine du goût | **non annoncée** | 2026 : 37e édition, du lundi 12 au dimanche 18 octobre | à confirmer |
| Beaujolais nouveau | jeudi 18 novembre 2027 (**calculée**, 3e jeudi de novembre) | la règle est la même partout, mais son texte (« décret du 29 octobre 1985 » selon une source, décision de l'INAO selon une autre) n'a pas été lu | règle reprise partout, texte non lu |

### 1.4 Loi Montagne : lue sur une source officielle

Communiqué de la préfecture des Pyrénées-Atlantiques (5 octobre 2021), lu en entier :
- l'obligation vient du « décret n° 2020-1264 du 16 octobre 2020 » (application de la loi Montagne II du 28 décembre
  2016) ; ce sont **les préfets** qui dressent « la liste des communes » concernées ;
- choix entre « détenir dans leur coffre des dispositifs antidérapants amovibles (chaînes à neige métalliques ou
  textiles) permettant d'équiper au moins deux roues motrices » ou « être équipés de quatre pneus hiver » ;
- « A partir du 1er novembre 2024, elle couvrira uniquement les pneus identifiés par la présence conjointe du
  marquage symbole alpin (reconnu sous l'appellation 3PMSF […]) et de l'un des marquages M+S, M.S ou M&S » ;
- la note sur les « 3 premiers hivers » (« Du 1er novembre 2021 au 31 mars 2024 ») confirme la période du 1er novembre
  au 31 mars.
Preuve : officiel (préfecture). https://www.pyrenees-atlantiques.gouv.fr/contenu/telechargement/40084/255883/file/211005%20-%20CP%20Equipements%20hiver%20v%C3%A9hicules.pdf
La page d'info.gouv.fr sur le même sujet a refusé l'accès. Le nombre de départements varie selon les sources (34, 48)
et dépend des arrêtés de chaque préfet : **à ne jamais écrire dans une publication**.

**Ce que SINA pourrait en faire** : pour un garage dont le département a des communes concernées, une campagne
« équipements d'hiver » prête vers le 10 octobre ; la publication dit « dans les communes de montagne signalées par
un panneau » et renvoie à la carte de la Sécurité routière, sans citer de chiffre.

---

## 2. Un calendrier par métier, sourcé

### 2.1 Une source nouvelle, officielle et gratuite : les indices de chiffre d'affaires de l'INSEE

Le rapport du matin n'avait presque aucun chiffre de saison par métier. L'INSEE publie chaque mois, pour chaque métier
(code d'activité, dit « NAF »), un **indice de chiffre d'affaires** tiré des déclarations de TVA, en données brutes
(non corrigées des saisons). Ces séries s'interrogent librement, sans clé, par le service de l'INSEE
(`bdm.insee.fr/series/sdmx`, jeux « ICA-2021-COMMERCE », « ICA-2021-SERVICES », « ICA-2021-IND-CONS ») ; dernier mois
publié au 22 novembre 2026 : septembre 2026 (août pour l'artisanat).
Preuve : officiel (INSEE), lu directement dans les séries. Méthode de l'INSEE (déclarations de TVA mensuelles,
transmises par l'administration fiscale) : https://www.insee.fr/fr/metadonnees/source/indicateur/p1725/documentation-methodologique

**Mon calcul** : pour chaque métier, moyenne des années complètes 2022 à 2025, chaque mois rapporté à la moyenne de
l'année (100 = un mois moyen). En **gras** le mois le plus fort, en *italique* le plus faible.

**Deux précautions, à dire au propriétaire** :
- dans toutes les séries brutes, juillet est anormalement bas et août anormalement haut, y compris pour les coiffeurs
  et les plombiers : c'est un effet de calendrier des déclarations, pas la vraie activité. J'ai donc **fusionné juillet
  et août** en une seule colonne ;
- ces indices viennent des entreprises qui déclarent la TVA chaque mois (d'après la documentation de l'INSEE lue en
  résumé : celles au régime « réel normal »), donc pas des micro-entreprises ; et le pic de décembre des artisans du
  bâtiment ressemble à des factures de fin d'année plus qu'à des chantiers. C'est une forme de saison du métier, pas
  la saison d'un client donné.

| Métier (code NAF) | janv | févr | mars | avr | mai | juin | juil-août | sept | oct | nov | déc |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Boulangerie et boulangerie-pâtisserie (10.71C) | 104 | *87* | 98 | 98 | 100 | 99 | 97 | 101 | 103 | 97 | **119** |
| Pâtisserie (10.71D) | 93 | *78* | 94 | 105 | 90 | 88 | 90 | 93 | 98 | 97 | **184** |
| Boulangerie-pâtisserie, commerce de détail (47.24Z) | 73 | *70* | 92 | 120 | 76 | 80 | 84 | 79 | 87 | 97 | **259** |
| Fleuriste (47.76Z) | *73* | 89 | 113 | 125 | **146** | 106 | 84 | 83 | 96 | 90 | 108 |
| Coiffure (96.02A) | *83* | 92 | 101 | 100 | 100 | 102 | 99 | 103 | 102 | 93 | **126** |
| Soins de beauté, esthétique (96.02B) | *83* | 84 | 95 | 97 | 103 | 109 | 102 | 101 | 94 | 95 | **136** |
| Électricien (43.21A) | 96 | *91* | 99 | 96 | 95 | 99 | 95 | 97 | 103 | 103 | **131** |
| Plombier, eau et gaz (43.22A) | 94 | *93* | 102 | 97 | 96 | 99 | 94 | 97 | 107 | 104 | **122** |
| Chauffagiste, climatisation (43.22B) | 97 | *91* | 97 | 94 | 94 | 96 | 95 | 100 | 108 | 107 | **126** |
| Paysagiste (81.30Z) | 86 | *85* | 97 | 99 | 100 | 102 | 96 | 94 | 106 | 104 | **135** |
| Restauration traditionnelle (56.10A) | *76* | 84 | 91 | 95 | 104 | 111 | **124** | 106 | 101 | 87 | 100 |
| Restauration rapide (56.10C) | 88 | *87* | 92 | 95 | 102 | 103 | **111** | 103 | 104 | 97 | 108 |
| Caviste, boissons (47.25Z) | *74* | *74* | 86 | 91 | 97 | 108 | 96 | 94 | 92 | 102 | **189** |
| Parfumerie, cosmétiques (47.75Z) | *77* | *77* | 92 | 80 | 91 | 104 | 86 | 101 | 97 | 119 | **190** |
| Décoration, articles de maison (47.59B) | 90 | *87* | 95 | 94 | 95 | 97 | 90 | 102 | 95 | 112 | **154** |
| Mode, habillement (47.71Z) | 101 | *74* | 82 | 96 | 98 | 110 | 99 | 97 | 104 | 104 | **135** |
| Bijouterie, horlogerie (47.77Z) | *79* | 86 | 92 | 90 | 96 | 100 | 91 | 94 | 98 | 101 | **180** |
| Photographe (74.20Z) | 99 | *87* | 90 | 88 | 92 | 103 | 88 | 94 | 100 | 119 | **151** |
| Salles de sport (93.13Z), le plus proche d'un coach | 94 | *89* | 96 | 100 | 97 | 95 | 96 | 108 | 107 | 108 | **114** |
| Garage, entretien et réparation (45.20A) | *92* | 96 | 105 | 98 | 94 | 105 | 93 | 103 | **109** | 102 | 108 |
| Épicerie fine, autres commerces alimentaires spécialisés (47.29Z) | 95 | *92* | 101 | 97 | 96 | 95 | 95 | 97 | 105 | 102 | **131** |

Ce que le tableau montre, et qui corrige des idées reçues :
- **Février est le mois le plus creux de presque tous les métiers**, même avec la Saint-Valentin : c'est le mois où une
  publication d'offre ou de nouveauté a le plus de raison d'être.
- **Le fleuriste culmine en mai** (146 : muguet et fête des mères), puis avril et mars ; la Saint-Valentin ne fait qu'un
  février à 89 et la Toussaint un octobre à 96 ; son creux est janvier et l'été.
- **La boulangerie-pâtisserie de détail a un pic en avril** (120, Pâques) et un décembre énorme (259) ; le
  « 10.71C » (boulangers-pâtissiers artisans) a un janvier à 104, cohérent avec la galette.
- **Les salles de sport sont hautes en septembre** (108) et non en janvier (94) : la rentrée pèse plus que les bonnes
  résolutions dans le chiffre d'affaires (des abonnements, pas des inscriptions : à prendre avec prudence).
- **Le garage culmine en octobre** (109), ce qui colle avec les équipements d'hiver et la loi Montagne.
- **Le restaurant traditionnel culmine l'été** (124) et en juin, creuse en janvier (76) et en février (84).

**Ce que SINA pourrait en faire** : pour chaque client, partir de la courbe de son code NAF (SINA le demande au client,
ou le lit plus tard dans la base publique des entreprises, non vérifié), marquer ses trois mois forts et ses deux mois creux, et le lui faire
confirmer une fois (« chez toi, le gros mois c'est bien mai ? ») ; la campagne du mois fort démarre trois semaines
avant, et le mois creux reçoit la réserve d'idées d'offre. Le Studio peut relire les séries chaque mois sans rien
payer (aucune clé).

**Google Trends** : toujours non lu (interface en essai, sur demande). Rien de neuf depuis ce matin.

### 2.2 Les temps forts et les sujets, métier par métier

Les dates sont celles de la partie 1 et du rapport du matin. « Ce qui est prouvé » cite une source ; « sujets » est
**mon avis** (aucune étude ne mesure l'effet d'un sujet par métier), à proposer au client, jamais à lui imposer.

| Métier | Temps forts 2027 (dates) | Saison (INSEE, 2.1) | Ce qui est prouvé en plus | Sujets qui marchent (avis) |
|---|---|---|---|---|
| **Boulangerie** | Galette (Épiphanie 6 janvier, tout janvier), Chandeleur 2 février, Pâques 28 mars, fête du pain (mai, à confirmer), fête des mères 30 mai, rentrée 2 septembre, Noël | haut : décembre, janvier ; bas : février | galette ≈ 15 % du chiffre d'affaires annuel (confédération des boulangers, rapporté, rapport du matin) | le geste du matin (four, façonnage, sans personne sans accord), le pain du jour, la galette et sa fève, le goûter de la Chandeleur, les horaires des jours fériés |
| **Pâtisserie** | Galette, Saint-Valentin 14 février, Pâques, fête des mères, fête des pères 20 juin, Noël (bûches) | haut : décembre (184), avril ; bas : février | — | la pièce de saison, la commande à l'avance (« commandes ouvertes jusqu'au… »), le gâteau d'anniversaire sur mesure |
| **Fleuriste** | Saint-Valentin, grands-mères 7 mars, 1er mai (muguet), fête des mères 30 mai, mariages (juin-septembre), Toussaint 1er novembre, Noël | haut : mai (146), avril, mars ; bas : janvier, été | fête des mères : 61,8 millions d'euros pour la filière (Val'hor 2026, rapport du matin) ; la Toussaint compte pour le végétal (Kantar pour Val'hor) | la fleur de la semaine, l'arrivage, le bouquet du jour à emporter, l'entretien d'une plante, le deuil (avec tact, jamais en offre) |
| **Coiffeur** | Fêtes de fin d'année, Saint-Valentin, mariages, rentrée, cartes cadeaux à Noël | haut : décembre (126) ; bas : janvier, février | — | avant / après (seulement avec l'accord écrit de la cliente photographiée : règle du propriétaire), la coupe de saison, le créneau libre de la semaine, les fêtes |
| **Esthétique** | Saint-Valentin, fête des mères (bons cadeaux), avant l'été (mai-juin), mariages, Noël (coffrets, cartes) | haut : décembre (136), juin ; bas : janvier, février | — | le soin du mois, la carte cadeau, le conseil de saison (peau en hiver, soleil), le calme de la cabine (photos du lieu, sans personne) |
| **Artisan du bâtiment** | Printemps (devis d'extérieur), rentrée, avant l'hiver ; aides publiques quand elles rouvrent | haut : octobre-décembre ; bas : février | le guichet MaPrimeRénov' a été fermé du 1er janvier au 23 février 2026 faute de loi de finances, et un rendez-vous France Rénov' est désormais obligatoire avant une rénovation d'ampleur (presse et pages officielles lues en résumé) : **une aide ne s'annonce jamais sans vérifier le jour même** | le chantier fini (photos du client), avant / après d'une pièce, l'étape d'un chantier, la question qu'on lui pose le plus |
| **Plombier-chauffagiste** | Entretien annuel de la chaudière (rentrée, avant l'hiver), premiers froids, coupures d'été | haut : octobre-décembre ; bas : février | l'entretien annuel est obligatoire pour les chaudières de 4 à 400 kW (décret n° 2009-649 ; page de service-public pour les locataires, lue en résumé) | « ta chaudière a-t-elle été vérifiée cette année ? », le geste qui évite une fuite, l'urgence (avec ses vraies horaires), la pompe à chaleur expliquée simplement |
| **Électricien** | Fêtes (illuminations), rentrée, avant l'hiver | haut : décembre, octobre-novembre ; bas : février | — | le chantier fini, la mise en sécurité expliquée, la borne de recharge, l'éclairage d'une pièce |
| **Paysagiste** | Printemps (mars-juin), automne (plantations, octobre-novembre) | haut : octobre-décembre (factures), juin ; bas : janvier, février | — | le jardin avant / après, la plante de saison, le geste du mois au jardin, l'entretien sous contrat |
| **Restaurant** | Saint-Valentin, Saint-Patrick 17 mars (bars), fête des mères et des pères, terrasses (printemps), fête de la musique 21 juin, Beaujolais 18 novembre, réveillons | haut : été (124), juin ; bas : janvier, février | — | le plat du jour, le produit du marché, la terrasse ouverte, la table pour le réveillon, l'équipe en cuisine (avec accord) |
| **Caviste** | Galette (cidre, vins doux), Saint-Valentin, Pâques, fête des pères, foires aux vins (septembre-octobre, opérations privées), Beaujolais, Noël | haut : décembre (189), juin ; bas : janvier, février | **loi Évin** : la réponse du gouvernement (Journal officiel du 10 décembre 2024) rappelle qu'elle « doit être respectée » sur les réseaux sociaux et qu'elle impose de « n'évoquer l'alcool que de façon neutre, objective et informative » (formule de la question). https://www.assemblee-nationale.fr/dyn/17/questions/QANR5L17QE1571 ; sur la fiche Google, les publications sur l'alcool sont restreintes (aide officielle, voir 4.6) | le vin du vigneron (origine, cépage, accord), l'arrivage, la dégustation organisée (date, lieu) ; jamais une scène de fête ou d'ivresse ; le message sanitaire obligatoire (texte du code de la santé publique non lu) |
| **Cosmétiques naturels** | Saint-Valentin, fête des mères, été (soleil), rentrée, Black Friday 26 novembre, Noël (coffrets) | haut : décembre (190), novembre (119) ; bas : janvier-février | — | la composition expliquée, la texture, le rituel du matin, le coffret ; aucune promesse de soin non prouvée (règle « rien d'inventé ») |
| **Bougies et déco** | Fête des mères, rentrée (« cocooning »), Toussaint et premiers froids, Black Friday, Noël | haut : décembre (154), novembre (112) ; bas : février | — | l'ambiance du soir, la bougie de saison, le coffret cadeau, le geste de fabrication |
| **Mode** | Soldes d'hiver 6 janvier, collections printemps et automne, fête des mères, soldes d'été 23 juin, rentrée, Black Friday, Noël | haut : décembre (135), juin ; bas : février | soldes : dates de la partie 1 (officiel) | la tenue de la semaine, la pièce qui revient en stock, le conseil de taille, l'arrivage |
| **Bijoux** | Saint-Valentin, fête des mères, mariages, Black Friday, Noël | haut : décembre (180) ; bas : janvier, février | — | le bijou porté (photo du client), la gravure, le coffret, la fabrication à la main |
| **Photographe** | Saison des mariages (juin-septembre), séances de Noël, fête des mères, rentrée (portraits) | haut : décembre (151), novembre ; bas : février | INSEE : 59 % des mariages de juin à septembre (2019, rapport du matin) | une photo et son histoire, la séance de saison, les dates encore libres |
| **Coach** | Rentrée (septembre), janvier, avant l'été | salles de sport : haut septembre-décembre ; bas février | — | le conseil de la semaine, une séance type, la réponse à une question fréquente |
| **Garage** | Équipements d'hiver (prêts avant le 1er novembre, loi Montagne si le département est concerné), départs en vacances (vacances scolaires par zone), contrôle avant l'hiver | haut : octobre (109), juin, mars ; bas : janvier | loi Montagne, partie 1.4 (officiel) | « tes pneus sont-ils marqués 3PMSF ? », le contrôle avant le départ, le délai pour un rendez-vous |
| **Épicerie fine** | Galette, Pâques (chocolats), fête des pères, Noël (coffrets), Beaujolais | haut : décembre (131), octobre ; bas : février | — | le produit du producteur (origine), le coffret, l'idée de recette, l'arrivage |

**Règle commune trouvée en chemin** : toute annonce de réduction doit indiquer le prix de référence, c'est-à-dire,
depuis l'ordonnance de 2021, le prix le plus bas pratiqué pendant les 30 jours précédant la réduction (fiche de la
répression des fraudes, lue seulement en résumé : la page a refusé l'accès ; une fiche de la préfecture des
Hauts-de-Seine reprend le texte). https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/annonces-de-reduction-de-prix-ce-que-vous-devez-savoir
**Ce que SINA pourrait en faire** : une publication qui annonce « −20 % » demande au client son prix de référence et
ne part pas sans lui (c'est aussi la règle « aucune réduction inventée »).

---

## 3. Les événements locaux vérifiables par le Studio

### 3.1 DATAtourisme : la source la plus solide

- **Ce que c'est** : la base nationale des données touristiques publiques, produite par les offices de tourisme et les
  agences départementales et régionales, pilotée par ADN Tourisme depuis 2022 ; « plusieurs centaines de milliers de
  points d'intérêt », couverture « non exhaustive ».
- **Licence** : **Licence ouverte 2.0** (Etalab) : réutilisation libre, y compris commerciale, en citant la source.
- **Formats** : exports **mis à jour chaque jour** sur data.gouv.fr, complet (format N-Triples) et simplifiés en CSV
  (UTF-8, virgule), par catégorie et par région ; les exports CSV donnent les périodes des événements.
  Preuve : officiel. https://www.data.gouv.fr/datasets/datatourisme-la-base-nationale-des-donnees-publiques-dinformation-touristique-en-open-data
- **Interface de programmation** (documentation officielle lue) : clé gratuite demandée sur datatourisme.fr ; envoyée
  dans l'en-tête `X-API-Key` ; une adresse dédiée `/entertainmentAndEvent` renvoie les « Fêtes et Manifestations » ;
  recherche autour d'un point (`geo_distance=lat,lon,10km`), par rectangle, ou par code INSEE de commune ; **aucun
  filtre par date d'événement documenté** (seulement la date de mise à jour) ; limites : 20 à 30 requêtes simultanées,
  environ 10 par seconde, **1 000 par heure**, pages de 100 au plus ; réponses en JSON, en français et en anglais.
  Preuve : officiel. https://api.datatourisme.fr/v1/docs
- **Attention** : un résumé du moteur de recherche cite une page du ministère de l'Économie disant que l'ancienne
  « plateforme diffuseur » fermera en 2027 ; la page a refusé l'accès et le site de DATAtourisme n'en dit rien. **Non
  vérifié** : à contrôler avant de construire.

**Ce que SINA pourrait en faire** : chaque nuit, le Studio lit les fêtes et manifestations à 10 km autour de l'adresse
du client (une requête par client et par semaine suffit, très en dessous de la limite), filtre lui-même par date, et
garde le lien de la fiche comme preuve.

### 3.2 OpenAgenda

- Interface « gratuite », mais une clé personnelle est obligatoire, même pour lire (compte sur openagenda.com, clé dans
  les réglages). Les événements se lisent **agenda par agenda** (`/v2/agendas/{uid}/events`) ; la liste des agendas se
  consulte à part. Aucune limite chiffrée publiée.
- Licence : « Les données des agendas publiés sont disponibles sous licence », « le plus souvent » la Licence ouverte,
  mais **cela varie selon l'agenda** : « Leur réutilisation doit en respecter les conditions ».
  Preuve : officiel (documentation de l'éditeur). https://developers.openagenda.com/
- OpenAgenda reprend lui-même des données de DATAtourisme (logo parmi les utilisateurs sur datatourisme.fr).
- Les copies anciennes d'OpenAgenda sur data.gouv.fr (« Public events - OpenAgenda ») sont **archivées** (dernière mise à
  jour en 2018) : à ne pas utiliser.

**Ce que SINA pourrait en faire** : n'utiliser OpenAgenda qu'en second, pour les agendas des villes qui s'en servent,
en lisant la licence de chaque agenda avant d'en reprendre un événement.

### 3.3 data.gouv.fr, villes, marchés et foires

- Des villes et des offices publient leurs agendas sur data.gouv.fr (par exemple Île-de-France via OpenAgenda, Nice
  Côte d'Azur, Grand Paris Seine Ouest, Bretagne « Fêtes et manifestations ») : utile mais **inégal d'une ville à
  l'autre**, sans format commun. Preuve : officiel (fiches de jeux de données vues dans la recherche, non lues une à une).
- Marchés, braderies, foires : je n'ai trouvé aucune base nationale à jour. Le site de la mairie reste la source qui
  fait foi.

### 3.4 Comment SINA vérifie un événement avant de le proposer (ma proposition)

1. **Deux sources ou une source officielle** : la fiche DATAtourisme, ou l'agenda de la mairie ou de l'office, avec le
   lien gardé ; un événement vu seulement sur un réseau social n'est jamais proposé.
2. **Date relue la semaine même** : une fiche mise à jour il y a plus de 60 jours est relue ; un événement annulé
   disparaît.
3. **Distance et métier** : à moins de 10 km (ou la zone que le client a donnée), et lié à son métier (une foire aux
   vins pour un caviste, un marché de Noël pour un artisan).
4. **Le client confirme** : « La braderie de ta commune a lieu le [date lue sur la fiche] ; tu y seras ? » ; sans sa
   réponse, rien n'est préparé.
5. **Rien de promis** : la publication dit ce que dit la fiche (date, lieu, heures), jamais une affluence ou un
   programme non écrit.

---

## 4. Les légendes qui marchent en 2026

### 4.1 Ce que Meta dit officiellement de la recherche

- **La recherche d'Instagram** (page de transparence de Meta, mise à jour le 23 juin 2026) classe les photos, vidéos et
  Reels avec cinq signaux : les interactions avec la publication (enregistrements, « j'aime », visites du profil), le
  sujet de la recherche, **« How close your location is to that of the post's author »** (la distance entre la personne
  qui cherche et l'auteur), ce que la personne a vu récemment, et **« The similarity between the words used in your
  search and the search results »**. La page ne nomme pas la légende comme signal, ne parle pas de « mots-clés dans la
  légende », et prévient que les modèles changent souvent.
  Preuve : officiel. https://transparency.meta.com/features/explaining-ranking/ig-search/
  **Ce que SINA pourrait en faire** : pour un commerce local, la ville et le quartier dans le profil et dans la
  légende, et le lieu ajouté à la publication, comptent autant que les mots : la proximité est un signal officiel.
- **Les signaux du fil** (billet d'Adam Mosseri, 31 mai 2023, toujours en ligne) : « j'aime », partages,
  enregistrements, commentaires, rapidité des interactions, lieu ; Instagram évite de montrer trop de publications du
  même auteur à la suite. La légende et les mots-dièse ne sont pas cités. https://about.instagram.com/blog/announcements/instagram-ranking-explained/
- **Mosseri, janvier 2025** (rapporté par Social Media Today) : les trois signaux qui comptent le plus sont le temps de
  visionnage, les « j'aime » par personne touchée et **les envois en message privé par personne touchée** ; les « j'aime »
  pèsent un peu plus auprès des abonnés, les envois un peu plus auprès des inconnus. Preuve : propos rapportés.
  https://www.socialmediatoday.com/news/instagram-shares-algorithm-insights-2025/738034/
  **Ce que SINA pourrait en faire** : une légende qui donne envie d'envoyer la publication à quelqu'un (« pour celle
  qui… », une idée de cadeau, une date à retenir) vaut mieux qu'une légende qui réclame des « j'aime ».
- **Google montre les publications Instagram** des comptes professionnels publics, à partir du 10 juillet 2025
  (réglage activé par défaut, désactivable). Plusieurs médias concordants ; **l'annonce d'Instagram elle-même n'a pas
  été lue**. https://metricool.com/instagram-indexing-on-google/

### 4.2 La structure de l'accroche

Ce qui est prouvé est mince ; ce qui suit croise les sources officielles et les études chiffrées.
1. **Première ligne = ce que c'est, pour qui, où**, en mots qu'un inconnu comprend et qu'un client taperait
   (« Galette frangipane à Rennes, au beurre de baratte »). Raison : la recherche compare les mots de la requête aux
   résultats (Meta, ci-dessus), Google lit les publications (4.1), et la règle du propriétaire « clair d'abord ».
2. **Deuxième temps = la scène ou la sensation** (règle « l'émotion ») : une ou deux phrases.
3. **Troisième temps = l'information utile** (prix, date, horaires, où la trouver), seulement si elle est vraie et
   fournie par le client.
4. **Dernière ligne = une question ou une invitation**, voir 4.3.
Le code a déjà la limite de 125 caractères pour la première ligne et refuse « Découvrez », « Voici », « Nouveau »
(`social-quality.ts`) : c'est cohérent avec ce qui précède.

### 4.3 Les appels à l'action : ce que mesure l'étude la plus récente, et une contradiction à trancher

**Metricool, étude Instagram 2026** : 24 364 803 publications de 375 118 comptes, janvier-février 2025 et 2026
(article du Blog du Modérateur du 3 juillet 2026, qui reprend l'étude ; le rapport complet est derrière un formulaire) :
- une **question** dans la légende : **+37 % de commentaires** ;
- inviter à commenter ou à enregistrer : **commentaires multipliés par 3, enregistrements par 2** ;
- **demander un « j'aime » fait baisser les « j'aime » de 5 %** ;
- citer un autre compte : **+108 % de portée** pour les tout petits comptes ;
- les trois premiers jours font environ **70 % des vues** d'une publication ; créneau 19 h-21 h le plus favorable.
Preuve : étude publiée par un éditeur d'outils, corrélations (pas des causes).
https://www.blogdumoderateur.com/etude-instagram-formats-leviers-fonctionnent-2026/

**Contradiction avec une règle du propriétaire, à lui signaler sans la recommander** : il a écrit « aucun ordre donné
au lecteur ». Or l'étude mesure surtout l'effet des demandes directes (« commente », « enregistre »), et la liste des
appels à l'action du code (`CTA` dans `social-quality.ts`) contient des ordres (« commentez », « enregistre »,
« partage », « réservez », « appelez »). Ce qui respecte sa règle et garde l'essentiel du gain mesuré : **la question**
(+37 %, sans aucun ordre) et l'invitation qui porte le désir (« Le coffret t'attend à l'atelier jusqu'à samedi »).
Je propose de retirer les impératifs de la liste du code, et de ne jamais demander de « j'aime ».

### 4.4 Les mots-dièse

- **Instagram, 18 décembre 2025** : « Instagram will gradually update the number of hashtags that you can include in a
  caption for a reel or post to five. » Rien n'est dit des Stories ni des commentaires. Mosseri (2025) : ils « don't
  work » pour la portée, mais restent « a great way to let people know what a post is about ». Preuve : citation
  d'Instagram rapportée. https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/
- **Metricool 2026** : les publications avec au moins un mot-dièse ont en moyenne **32 % de vues et 34 % d'interactions
  en moins** que la moyenne (corrélation ; les gros comptes en mettent peut-être moins).
- **Pinterest** (aide officielle) ne parle plus de mots-dièse : il demande d'« add topic tags during the publishing
  process » et des mots-clés dans le titre, la description et le titre du tableau.
  https://help.pinterest.com/en/business/article/pin-performance-and-distribution
- **Ce qui existe dans le code** : Instagram exige **au moins 3** mots-dièse (`tags: [3, 5]`).
**Ce que SINA pourrait en faire** : passer à **0 à 3** mots-dièse sur Instagram (métier + ville, au plus un produit),
jamais le nom de la marque seul, jamais une liste ; sur Pinterest, des sujets choisis à la publication, pas de
mots-dièse.

### 4.5 Les emojis

Aucune étude récente et solide n'a été trouvée pour une petite marque. Deux communications de congrès (EMAC 2025,
13 698 et 96 000 publications de grandes marques) trouvent que l'effet des emojis dépend du sujet et du type d'emoji.
Preuve : étude publiée, faible portée pour nos clients. https://proceedings.emac-online.org/pdfs/A2025-126103.pdf
**Ce que SINA pourrait en faire** : garder le réglage actuel (`emojis` oui ou non, par client), au plus un ou deux par
légende, jamais à la place d'un mot, et aucun dans la première ligne si elle doit être trouvée par la recherche.

### 4.6 La longueur et les règles, réseau par réseau

| Réseau | Ce qui est sûr | Ce que fait le code | Proposition |
|---|---|---|---|
| Instagram | 2 200 caractères au plus ; 5 mots-dièse au plus (officiel). Longueur : les études se contredisent (Socialinsider : courtes ; Later : 75 à 150 mots, lu seulement en résumé ; Mosseri : ni aide ni nuit) | 60 à 2 200 caractères, 3 à 5 mots-dièse | 1 ligne d'accroche + 2 à 4 lignes ; 0 à 3 mots-dièse |
| Facebook | aucune règle officielle lue | 40 à 1 500, 0 à 2 mots-dièse, lien cliquable | garder |
| TikTok | aucune règle officielle lue | 20 à 400, 3 à 5 mots-dièse | le texte à l'écran et la première phrase dite comptent plus que la légende (avis) |
| Pinterest | description **jusqu'à 800 caractères**, lue par le classement, non montrée dans le fil (aide de Pinterest lue en résumé du moteur) ; mots-clés dans titre et description, sujets à la publication | 80 à 500, 0 à 3 mots-dièse | monter à 800, retirer les mots-dièse, titre avec les mots-clés en tête |
| Fiche Google | trois types (Nouveautés, Offres, Événements) ; numéro de téléphone dans le texte = refus possible ; archivage après six mois ; **pour l'alcool et les autres produits réglementés, la page dit que les publications ne doivent pas en contenir** (résumé de l'outil de lecture : formulation exacte à relire) | pas de règles propres trouvées | règle « pas de téléphone » et « caviste : pas d'alcool sur la fiche Google » à coder |

https://support.google.com/business/answer/7342169?hl=fr

### 4.7 Tutoyer ou vouvoyer les clients du client

**La seule étude trouvée sur des publications de marques en français** : Aussilhou, Kacha, Lemoine et Zafri (universités
Côte d'Azur, Lorraine, Paris 1), communication sur 27 615 publications de 25 grandes marques (Facebook, Instagram,
Twitter, 2012-2022), lue en entier :
- les marques tutoient peu : **5,2 % des publications tutoient, 52,4 % vouvoient** ; le tutoiement vient surtout de
  produits « plaisir » (accessoires, sport, restauration rapide), d'une cible jeune, ou d'une passion partagée ;
- les publications qui tutoient ont plus de « j'aime » (moyenne 1 895 contre 757) et de commentaires (337 contre
  141), effets significatifs ; **pas d'effet sur les partages** ;
- les auteurs le disent : c'est une corrélation, de grandes marques, et une expérience reste à faire.
Preuve : étude publiée (communication universitaire). https://events.unamur.be/event/81/attachments/97/218/papier%206-3.pdf

**Ce que SINA pourrait en faire** (mon avis, à partir de cette étude) : proposer le tutoiement pour la mode, les
bijoux, les bougies, les cosmétiques, le coach, la restauration rapide ; le vouvoiement pour le bâtiment, le plombier,
l'électricien, le garage, le photographe de mariage, le caviste ; laisser le choix au client pour le restaurant,
la boulangerie, le coiffeur et l'esthétique. **Le client tranche une fois, pendant la création**, et c'est gardé pour
toujours (règle « ce qu'il dit une fois vaut pour toujours »). Cela ne change rien au fait que SINA tutoie le client
lui-même.

---

## 5. Le rythme et l'organisation

### 5.1 Séries récurrentes et recyclage

- **Le code sait déjà** décrire des « séries récurrentes » dans la ligne éditoriale (`series` dans `voiceIssues`,
  refus des séries en double) : il manque de les placer à jour fixe dans le calendrier.
- **Les trois premiers jours font environ 70 % des vues** (Metricool 2026) : une très bonne publication est
  « épuisée » vite, ce qui justifie de la faire revenir plus tard.
- **Instagram (30 avril 2026, rapport du matin)** ne recommande plus les comptes qui republient surtout le travail des
  autres ; **Pinterest** demande des épingles « fresh, new » chaque semaine ; **Google** archive les publications de la
  fiche après six mois. Donc : recycler l'**idée** et le **texte** d'une publication qui a marché, jamais la même image.
- Le délai de 60 à 90 jours avant de refaire une publication intemporelle ne vient toujours que d'avis (rapport du
  matin) ; aucune étude trouvée.
**Ce que SINA pourrait en faire** : deux ou trois séries par client, chacune à jour fixe (« le produit du vendredi »,
« le geste de l'atelier du mardi »), dont la place est réservée dans le calendrier ; et une liste des cinq meilleures
publications du trimestre (celles que le client a cochées « publiée » et dont il a dit qu'elles avaient marché, ou les
visites du site qu'elles ont amenées), reprises avec une nouvelle image après au moins deux mois.

### 5.2 Garder le client dans la boucle : ce que font les outils (aides officielles lues)

| Outil | Comment le client valide | Ce qui se passe sans réponse | Rappels |
|---|---|---|---|
| **Planable** (rapport du matin) | liste « Mes validations », bouton « Tout valider » ; un simple lien permet de voir et commenter, pas de valider | réglage possible : programmation automatique dès la validation | — |
| **Metricool** | portail de relecture **sans compte** : un courriel mène au portail qui regroupe toutes les publications en attente ; approuver, rejeter ou commenter sans rejeter ; validation en masse pour les relecteurs qui ont un compte | trois règles au choix : un seul relecteur suffit, tous doivent valider, ou **« validation automatique sauf rejet »** ; une publication non validée garde **3 heures de grâce** après l'heure prévue, puis « it will not be published » ; « Rejection always blocks publication » | **aucun rappel automatique** ; un courriel par publication pour un relecteur sans compte, un seul courriel groupé pour un relecteur qui a un compte |
| **Buffer** | brouillons « en attente de validation », validation réservée à l'offre d'équipe ; l'auteur peut retirer sa demande | rien n'est publié sans validation | courriel à chaque demande de validation |
| **Later** | non lu | — | — |

Preuves : officiel (aides des outils). https://help.metricool.com/how-to-send-posts-for-review-with-metricools-approval-system-yvdr0 ;
https://support.buffer.com/articles/requesting-approval-and-approving-draft-posts-57li7M8tDA ;
https://planable.io/guides/content-approvals-in-planable/

**Leçons pour SINA** :
- **un seul message groupé**, jamais un par publication (Metricool fait les deux, et le courriel par publication est
  précisément ce qui dérange) ;
- **« Tout valider » pour la semaine**, avec la possibilité d'ouvrir une case (Planable) ;
- **« sans réponse, rien ne part »** par défaut ; « validé sauf refus » seulement si le client l'a choisi par écrit,
  dans son plafond (règle du propriétaire : elle n'agit seule que là où il l'a autorisé) ;
- **un refus bloque toujours** (Metricool), et un commentaire ne vaut pas refus ;
- comme le Studio ne publie pas lui-même (branchements mis de côté), « valider » veut dire « prêt à publier d'un
  geste » : la case du jour apparaît dans « Ta journée est prête ».

### 5.3 Des rappels qui ne dérangent pas (complète le rapport du matin)

- Aujourd'hui : une notification et **un courriel par jour** dès 8 h (`remindDue`).
- Proposition : **le lundi**, un seul message « Ta semaine est prête » (nombre de publications, temps fort de la
  semaine, un bouton « Tout valider ») ; **chaque jour**, une seule notification à l'heure où le client publie
  d'habitude (celle de ses cases cochées), et rien les jours sans publication ; le courriel quotidien seulement s'il le
  demande ; une campagne de temps fort annoncée **une fois**, trois semaines avant, puis rappelée seulement si elle n'a
  pas été ouverte au bout de cinq jours.

---

## 6. Le reste d'utile

1. **Corriger la fête des mères dans `keyMoments()`** (règle de la Pentecôte, partie 1.2) et y ajouter les soldes, les
   jours fériés, les vacances par zone, la Chandeleur, la galette, Pâques, le 1er mai, la Toussaint, le Beaujolais, le
   Black Friday, la loi Montagne : la liste actuelle (six moments, une publication chacun) ne peut pas tenir
   l'engagement 3 (« les grands moments de l'année »).
2. **Les sujets qui demandent une vérification le jour même** : aides publiques (MaPrimeRénov' a fermé puis rouvert en
   2026), soldes (dates officielles de décembre), événements locaux, offres (prix de référence), alcool (loi Évin).
   SINA ne les écrit qu'avec une source relue la semaine même, citée dans la case du calendrier.
3. **Ce que l'INSEE permet en plus** : les mêmes séries existent corrigées des saisons ; le point du mois pourrait dire
   « ton métier, en France, a fait +X % sur un an en septembre » (chiffre officiel, à citer avec sa date), ce qui donne
   un repère honnête au client sans rien inventer.
4. **Le code NAF du client** se lit dans la base publique des entreprises (non vérifié ici) ; à défaut, SINA le demande.

---

## Pas vérifié

- Le texte de l'arrêté du 27 mai 2019 sur Légifrance (refus d'accès) : la règle a été lue sur la fiche de la chambre
  de commerce de Paris, qui le recopie, et dans l'extrait du moteur de recherche.
- Les dates officielles des soldes 2027 (parution attendue en décembre 2026) ; le sens de « 1er jour ouvré » pour la
  Moselle et ses voisins en 2027 (samedi 2 ou lundi 4 janvier) ; les soldes d'été en Corse le 14 juillet 2027 ; la
  période d'hiver de la Martinique et le cas de Mayotte.
- La phrase de la loi de 1950 sur le report de la fête des mères à juin (texte en vigueur non lu ; seule la partie
  « hommage » de l'article R. 215-1 a été lue, dans la question parlementaire).
- Les dates 2027 des Journées européennes des métiers d'art (agendas seulement), des Journées du patrimoine (calcul),
  des French Days, de la fête du pain et de la Semaine du goût (non annoncées).
- Le texte qui fixe le Beaujolais nouveau au 3e jeudi de novembre.
- La page d'info.gouv.fr sur la loi Montagne (refus d'accès) ; le nombre de départements concernés.
- La fermeture annoncée en 2027 de la « plateforme diffuseur » de DATAtourisme (vue dans un résumé seulement).
- La licence de chaque agenda OpenAgenda (elle varie).
- La page de la répression des fraudes sur les prix de référence (refus d'accès) et l'article L. 3323-4 du code de la
  santé publique (message sanitaire), non lus.
- La formulation exacte de l'aide Google sur les produits réglementés dans les publications de la fiche.
- L'annonce d'Instagram sur l'affichage des publications dans Google (juillet 2025).
- Les rapports complets de Metricool, Later et Socialinsider ; l'aide de Later sur la validation.
- La cause exacte de l'anomalie juillet-août dans les séries brutes de l'INSEE, et le champ exact des entreprises
  couvertes.
- Google Trends France par métier.

---

## Ce qu'il faut construire dans SINA, dans l'ordre

1. **Un fichier des temps forts tenu par règle, pas par date** (soldes par département, fête des mères avec la
   Pentecôte, Pâques, jours fériés, vacances par zone, Beaujolais, Black Friday, loi Montagne), chaque date marquée
   « officielle », « calculée » ou « à confirmer », avec sa source. *Le client voit* : dans son calendrier, ses vrais
   moments de l'année, chacun avec une petite mention « date officielle » ou « date à confirmer ».
2. **La correction de `keyMoments()`** et son remplacement par ce fichier, avec tous les métiers du tableau 2.2.
   *Le client voit* : un fleuriste reçoit le muguet et la Toussaint, un garage les pneus d'hiver, et plus jamais une
   fête qui ne le concerne pas.
3. **La saison de son métier lue à l'INSEE** (code NAF, séries gratuites), confirmée une fois par lui. *Le client
   voit* : « Chez les fleuristes, mai est le plus gros mois de l'année et janvier le plus calme : c'est pareil chez
   toi ? », puis un calendrier qui prépare ses mois forts et remplit ses mois creux.
4. **La campagne complète trois semaines avant chaque temps fort** (cinq pour les soldes), présentée une seule fois.
   *Le client voit* : « Ta campagne fête des mères est prête » avec publications, story, publication de fiche Google et
   texte de l'offre, qu'il accepte, retouche ou refuse.
5. **Les événements locaux tirés de DATAtourisme** (10 km autour de son adresse), lien gardé, confirmés par lui.
   *Le client voit* : « La braderie de ta commune a lieu le [date de la fiche] ; tu y seras ? », avec le lien.
6. **Les légendes en quatre temps** (ce que c'est et où, la scène, l'information vraie, une question), ville et métier
   en première ligne, lieu ajouté. *Le client voit* : des textes clairs dès la première ligne, qui sonnent comme lui.
7. **Les appels à l'action sans ordre** : questions et invitations, plus aucun impératif ni demande de « j'aime »
   (à faire valider par le propriétaire, partie 4.3). *Le client voit* : des fins de légende qui donnent envie de
   répondre ou d'envoyer à quelqu'un.
8. **0 à 3 mots-dièse sur Instagram, aucun sur Pinterest, 800 caractères pour Pinterest**, règles de la fiche Google
   (pas de téléphone, pas d'alcool). *Le client voit* : moins de mots-dièse, et aucune publication refusée par Google.
9. **Tutoiement ou vouvoiement choisi une fois** pendant la création, avec la proposition de SINA selon le métier.
   *Le client voit* : une question simple, une fois, puis le même ton partout.
10. **Deux ou trois séries à jour fixe et le retour des meilleures publications** avec une image neuve après deux
    mois. *Le client voit* : des rendez-vous que ses clients reconnaissent, sans jamais revoir la même image.
11. **« Ta semaine est prête » le lundi, avec « Tout valider »**, un refus qui bloque toujours, et « validé sauf
    refus » seulement s'il l'a choisi par écrit. *Le client voit* : un seul message par semaine, un bouton, et la main
    sur chaque case.
12. **Une seule notification par jour à son heure de publication**, rien les jours vides, courriel en résumé de
    semaine. *Le client voit* : moins de messages, mais toujours au bon moment.
