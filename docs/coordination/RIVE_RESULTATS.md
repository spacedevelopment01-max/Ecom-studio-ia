# Atelier Rive refait d'après les maquettes du 23 octobre : résultats à valider

Consigne : PR #167, commentaire 6353071900 (copie : `docs/design/atelier-rive-reference-20261023/CONSIGNE_VALIDEE.md`).
Accord de Thomas : « Tant que c'est très proche de la maquette oui ».
Travail limité à Atelier Rive. HEUREN, les autres thèmes et l'accueil du studio sont conservés.

**Rien n'est marqué « validé » : la validation visuelle et commerciale revient à Thomas.**
Les tests automatiques prouvent que les choses marchent. Ils ne prouvent pas que le rendu est bon.

Code vérifié : commit `9a444e71` (branche `claude/themes-differenciation`). Le rapport et les preuves sont dans le commit suivant.
Preuves : `docs/design/atelier-rive-reference-20261023/resultats/`.

## Ce qui est fait

### Médias et polices
- Les 14 photos du dossier sont copiées dans le dépôt (`public/theme-assets/rive/`), avec leur empreinte vérifiée. Aucune
  image n'a été régénérée ni prise dans une banque d'images.
- Titres en **Newsreader**, une serif fine et contrastée, la plus proche de la maquette parmi les polices libres essayées.
  Elle est livrée avec sa licence OFL (`assets/fonts/licenses/Newsreader-OFL.txt`).
- Textes en **Inter**.
- Couleurs :
  - fonds blancs et texte presque noir ;
  - boutons et bandeaux prune `#37152C`.

### Six pages, ordinateur et téléphone
Toutes sont faites de vraies sections du thème, avec leurs réglages. Ce ne sont pas des images de pages.

1. **Accueil** : ouverture photo (« Enfin chez vous. », deux boutons) → trois besoins avec icônes → galerie de projets
   asymétrique → trois prestations en miniatures → « Comment ça se passe ? » en colonnes avec photo → bandeau photo →
   questions → bandeau prune → pied.
2. **Prestations** : ouverture texte et photo → trois prestations illustrées avec listes et boutons → méthode en
   colonnes avec un encart de contact.
3. **Projets** : grille asymétrique filtrable (Tous / Appartements / Maisons / Espaces professionnels).
   - Chaque carte ouvre sa propre page.
   - Une phrase annonce que ce sont des projets de démonstration.
4. **Détail d'un projet** : six pages, une par projet, toutes sur le même modèle modifiable.
   - Contenu : ouverture, « Le besoin » et « Notre réponse », trois photos de détail, projet précédent / suivant, carte
     « Un projet similaire ? ».
   - Une note dit que le lieu, le besoin et les photos sont illustratifs.
5. **L'atelier** : photo, « Nous partons de votre vie, pas d'un catalogue. », trois valeurs illustrées, carte de contact.
   - Aucune équipe, aucun diplôme, aucune ancienneté.
   - Une phrase dit qu'Atelier Rive est une marque de démonstration.
6. **Contact** :
   - champs nom, e-mail, lieu, besoin, description, photos ou plan facultatifs, consentement, « Envoyer mon projet » ;
   - états vide, erreurs utiles avec retour sur le premier champ, envoi en cours, succès seulement après la réponse, échec.
   - Dans la démo, l'envoi est **simulé** et la page le dit (« aucun message n'est réellement envoyé »).
   - Aucune connexion de formulaire n'a été inventée.

### Galerie Services (studio réel, base temporaire)
Script : `scripts/rive-studio-check.ts`.
Preuves : `resultats/galerie-dispositions.jpg`, `resultats/studio-edition.jpg`, `resultats/studio.json`, et la vidéo
remise à part.

- Les **13 compositions** des maquettes sont dans « Ajouter une section ». Chacune a un aperçu réel, rendu avec les photos
  du projet.
- Le parcours testé dans le studio, puis vérifié après rechargement complet :
  1. ajout de la galerie de projets asymétrique depuis la galerie ;
  2. dans « Réglages » : titre, texte du lien, filtres masqués, couleurs ;
  3. duplication ;
  4. déplacement.
- Droits du forfait :
  - avec « Dominer », tout est proposé ;
  - avec « Vendre », « Étude de cas » et « Histoire de l'entreprise » ne sont pas proposées (elles sont réservées à
    « Dominer »).
- Bibliothèque : 20 fonctions (le plafond) et 69 dispositions, sans aucun doublon.
- Une même section ne doit servir qu'une seule fonction. « Scène et texte » passe donc de « Besoins accompagnés » à
  « Histoire de l'entreprise », à côté du nouveau bandeau photo, qui utilise la même section.
- Correction faite en chemin : dans le panneau « Réglages », un interrupteur jamais touché s'affichait éteint alors que
  le site l'affichait allumé. Il montre maintenant la valeur réelle.

#### Sections et dispositions ajoutées ou reprises (champs modifiables)

| Fonction de la galerie › disposition | Section | Champs modifiables ajoutés |
|---|---|---|
| Présentation de l'activité › Bandeau photo | ouverture (`ed-opening`, reprise) | second bouton (texte, lien) |
| Besoins accompagnés › Titre, texte et besoins en ligne | `fs-needs` | disposition « en ligne » ; icônes plan, rangement, plante |
| Réalisations › Galerie asymétrique filtrable | `portfolio` | ancre, niveau du titre, filtres (oui/non), libellé « Tous », catégorie sur chaque projet, style de légende, style et texte du lien |
| Prestations proposées › Miniatures en ligne | `services-list` | disposition « miniatures », style du lien (lien, bouton, flèche) |
| Prestations proposées › Colonnes illustrées | `services-list` (reprise) | bouton sous chaque prestation |
| Méthode de travail › Étapes en colonnes | `timeline` | disposition « colonnes », photo et texte alternatif, encart (titre, texte, bouton, lien) |
| Histoire de l'entreprise › Bandeau photo | `ed-scene` (reprise) | aucun nouveau champ |
| Histoire de l'entreprise › Photo, présentation et valeurs | `about` | niveau du titre, disposition « empilée », photo par valeur |
| Questions fréquentes › Titre à côté | `faq` (reprise) | aucun nouveau champ |
| Étude de cas › Besoin, réponse et détails | `fs-case` | disposition « détail », bloc photo (image, texte alternatif, légende), navigation (projet précédent et suivant : libellé, titre, lien) |
| Contact › Bandeau d'appel, titre à gauche | `cta-banner` | style « partagé » (aplat prune, sans photo) |
| Contact › Carte d'appel avec petite photo | `cta-banner` | style « carte » |
| Contact › Formulaire et image | `ed-contact` (reprise) | libellés et exemples de nom, e-mail, lieu et message ; photos ou plan (oui/non, libellés) ; consentement (texte, lien) ; message de réussite ; image pour téléphone |

- En-tête « contact » : menu téléphone à droite.
- Nouveau pied « Signature et liens sur une ligne ».
- Tous les nouveaux libellés sont traduits en anglais.

### Parcours de la démo exportée
**87 contrôles sur 87 réussis** (`resultats/interactions.json`), à 1440 et à 390 px.

| Parcours | Ce qui est vérifié |
|---|---|
| Menu | en-tête : liens ; téléphone : ouverture, liens, bouton de contact, fermeture par Échap |
| Accueil | « Découvrir les projets » descend jusqu'aux projets ; une question s'ouvre |
| Projets | filtres : Tous 6, Maisons 2, Espaces professionnels 1, puis Tous 6 ; bouton actif annoncé |
| Cartes | chacune des 6 cartes ouvre son projet, avec ses photos et sa navigation |
| Navigation | « Projet suivant » mène au projet suivant |
| Contact | vide refusé (5 messages) ; e-mail incomplet signalé ; fichier joint affiché ; « Envoi en cours… » ; succès ; échec simulé (message, formulaire gardé) |
| Toutes les pages | aucun débordement, aucune image cassée, un seul H1, aucune erreur de script |
| 360 et 430 px | toutes les pages : rien de coupé ni de débordant |

Captures : chaque page à 1440 et 390 px, et chaque état important. Elles sont remises à part (zip) ; les planches
`resultats/etats-contact-*.jpg` et `resultats/projets-filtres-menu.jpg` en reprennent l'essentiel.

### Adaptation à un autre client
Un autre client de services est composé dans Atelier Rive (`reference-static-preview.ts --cross`, « piano-en-rive ») :
un atelier d'accord de piano à Lyon, sans aucune photo.
Preuve : `resultats/adaptation-client.jpg`.

- Sur ses pages, **aucun** nom, texte, photo ou projet d'exemple d'Atelier Rive (contrôle sur le HTML exporté).
- Ses couleurs remplacent le prune.
- Les manques restent signalés « [À compléter : …] ». Aucun texte local n'est inventé.
- Le test `rive.test.ts` vérifie aussi :
  - la même absence de traces ;
  - l'absence de pages `projet-*` chez le client ;
  - les exports Shopify, WooCommerce et PrestaShop de la démo.
- Corrections faites en chemin, pour un client sans assez de photos :
  - les prestations en miniatures étaient serrées dans une colonne étroite ;
  - « Comment ça se passe ? » disparaissait de l'accueil quand la photo d'accompagnement manquait. Les étapes du client
    restent maintenant publiées, en pleine largeur, et la photo manquante reste signalée ;
  - la page Projets n'avait plus de titre quand la galerie attend de vraies réalisations (elle est masquée tant que le
    client n'en a pas). Le titre de la page s'affiche alors.

### HEUREN conservé
- La démo HEUREN reconstruite repasse ses **70 contrôles sur 70**.
- Ceux-ci couvrent le formulaire de contact, dont le code est partagé avec Rive.

## Comparaison maquette / rendu à la même largeur
Chaque vue de la maquette est découpée et mise à la largeur du rendu, page entière.

| Planche | Contenu |
|---|---|
| `resultats/comparaison-accueil-ordinateur.jpg` | maquette 01 à gauche |
| `resultats/comparaison-accueil-telephone.jpg` | les deux vues téléphone (maquettes 01 et 03) |
| `resultats/comparaison-prestations-ordinateur.jpg`, `-projets-`, `-projet-detail-`, `-atelier-`, `-contact-` | les panneaux de la maquette 02 |
| `resultats/comparaison-telephone.jpg` | les colonnes de la maquette 03 |

## Écarts qui restent (liste précise)

### Photos
Ce sont des reconstitutions : **elles ne sont pas identiques aux maquettes**. Le mobilier, les objets, les suspensions,
le feuillage et la lumière varient, comme le dit `MEDIAS_ET_RESERVES.md`.

Images du rendu différentes de celles de la maquette, faute de fichier dédié dans le dossier :

| Page | Différence |
|---|---|
| Prestations | les trois miniatures (plan et matières, îlot en marbre, bureau) ; la maquette montre des échantillons, une cuisine, une porte coulissante |
| Détail du projet | les trois photos de détail (cuisine, plan et matières, table) ; la maquette montre une niche, un plan au trait, une table |
| L'atelier | les trois valeurs (bureau, salon, cuisine) ; la maquette montre d'autres pièces |
| Projets | la vignette de la carte de contact |

Deux projets portent le titre « Un salon pour se retrouver » dans les maquettes. Ils restent **deux projets distincts**,
chacun avec ses propres images (réserve du dossier).

### Textes
- Les textes des projets sont reformulés pour ne rien revendiquer : « L'idée : … » au lieu de « Nos clients
  souhaitaient… ».
- Les notes de démonstration sont en plus de la maquette : projets, atelier, contact.
- La maquette téléphone 03 est secondaire et a parfois d'autres titres : « Un coup de pouce… » sur Prestations, « Nos
  prestations pour tous vos projets ». Le rendu garde les titres de l'ordinateur.

### Mise en page
1. **Pied de page** :
   - pas de « Confidentialité » (la démo n'a pas cette page, elle n'est pas inventée) ;
   - pas d'icônes de réseaux sociaux (aucun compte réel) ;
   - le logo et les liens sont sur une ligne et la mention © en dessous, au lieu d'une seule ligne.
2. **Projets** : 6 cartes au lieu de 4, car chaque projet du dossier a sa page. Le dernier rang a une grande carte et une
   petite.
3. **Proportions** : les sections du rendu sont plus hautes et plus aérées que sur les planches, qui sont compressées.
   Exemple : la galerie de l'accueil, les questions.
4. **Téléphone** :
   - « Comment ça se passe ? » montre les trois étapes en entier au lieu de lignes dépliables ;
   - les questions sont listées en entier ;
   - le bouton de l'en-tête est dans le menu ;
   - sur Projets, les filtres défilent sur une ligne, ce ne sont pas des pastilles ;
   - le sous-titre du projet (« Maison familiale au vert ») est au-dessus du titre, pas en dessous ;
   - l'ouverture garde ses deux boutons.
5. **Contact** :
   - la zone « Ajouter des photos ou un plan » dit « Choisir des fichiers » (sans icône) ;
   - le message de succès remplace le formulaire au lieu de s'afficher dessous.
6. **Bandeau photo de l'accueil** : le voile est prune foncé à gauche ; la maquette a un voile brun.
7. **Bandeau « Aperçu de démonstration · paiement désactivé »** en haut de la démo statique. Il n'existe pas sur un vrai
   site.

### Limites techniques
- **Pièces jointes** : le formulaire de contact de Shopify ne transmet pas les fichiers. Le réglage le dit au marchand.
  Le champ reste facultatif.
- **Police Newsreader dans la bibliothèque de polices de Shopify** : pas vérifié. Le site de Shopify est bloqué depuis
  cette session. Le thème embarque la police et sa licence ; le réglage de police Shopify pourrait devoir être choisi à
  la main.
- **Libellé du profil** : « Atelier Rive — journal et espaces (référence) » est visible dans le réglage de profil
  éditorial de l'éditeur Shopify d'un client. Ce libellé existait avant cette mission ; il n'est pas changé sans accord.
- **Bandeau photo sans photo** (chez un autre client, comme pour HEUREN) : il affiche seulement « En situation » jusqu'à
  ce que le marchand choisisse une photo.
- **Disposition « Cartouche »** : elle reste proposée dans la galerie Services (consigne de différenciation du
  22 octobre).

### Tests de garde ajustés (à connaître)
- **Coordonnées sur l'accueil des sites de services** : pour Atelier Rive, le bandeau d'appel vers la page Contact compte
  comme moyen de joindre l'entreprise. La maquette n'a pas de bloc de coordonnées sur l'accueil ; le téléphone reste
  affiché sur l'accueil (vérifié).
- **Adaptation à un client** : le titre de page rallumé (page Projets sans réalisation) est la seule différence permise
  avec la composition de référence.

### Non vérifié
- Le studio de Thomas : pas d'accès depuis cette session. Le studio a été testé en développement, sur une base
  temporaire.
- Un envoi réel du formulaire : il est volontairement exclu.

## Vérifications techniques

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx vitest run` (suite complète) | 359 fichiers sur 359 ; 2 915 tests réussis, 2 suspendus |
| `npm run build` | OK (après effacement du cache de compilation : un premier essai avait échoué dans le cache de webpack, sans lien avec le code) |
| Theme Check (Shopify) sur rive (fr et en), heuren, alcove, souple, orbe | 0 erreur ; 4 avertissements « variable non utilisée » déjà présents sur `main` (sections `fs-*`) |
| Parcours de la démo Rive | 87 / 87 |
| Parcours de la démo HEUREN | 70 / 70 |
| Studio (galerie, édition, rechargement ; forfait « Vendre ») | réussi (`resultats/studio.json`) |
| Adaptation client | aucune trace d'Atelier Rive |

Sur quel état chaque vérification a porté :

| Commit | Vérifications |
|---|---|
| `9a444e71` | `tsc`, suite complète, compilation, parcours de la démo Rive (87/87) et de la démo HEUREN (70/70) |
| `601615a7` | Theme Check, studio et adaptation visuelle ; le thème Shopify n'a pas changé depuis |
