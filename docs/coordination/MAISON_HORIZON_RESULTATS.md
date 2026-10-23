# MAISON & HORIZON — résultats (issue #172)

Thème d'agence immobilière (achat et location), famille **Prestations de services**, reproduit d'après les 7 planches de
`docs/briefs/maison-horizon/maquettes/`, avec les 90 images en grand format fournies par Thomas (88 photos, une carte et un
plan illustratifs). Branche `claude/themes-differenciation` (PR #167). Rien n'a été fusionné ni déployé.

## En bref (pour Thomas)

- Le thème est au catalogue : **Maison & Horizon**, 12ᵉ thème actif, famille Prestations de services, ouvert à partir du
  forfait **Vendre** (deuxième thème de la famille après Atelier Rive — à confirmer).
- Les biens ne sont pas écrits dans le thème : ils se saisissent dans un nouvel espace du studio, **Biens**. Un bien publié
  apparaît tout seul sur l'accueil (s'il est « à la une »), les pages Acheter ou Louer, la carte (s'il y est placé), sa
  fiche, les favoris, les biens similaires et l'export.
- La démonstration compte **27 biens** (14 à vendre, 13 à louer), chacun avec **sa propre série de photos** : aucune photo
  n'est partagée entre deux biens (contrôlé par un test).
- Rien n'est inventé : coordonnées, carte professionnelle, garantie financière, honoraires, DPE/GES restent « à renseigner » ;
  aucune estimation chiffrée, aucune visite confirmée, aucune alerte envoyée ; la carte est dite « illustrative ».
- Les images en grand format restent dans le kit privé (`public/demo/maison-horizon/`, hors dépôt), comme le demande le
  dossier. **Question pour Thomas : faut-il les publier dans le dépôt ?**

## Ajouter un bien (guide simple)

1. **Biens** (menu du studio, rubrique Créer — visible quand le site utilise Maison & Horizon).
2. **Ajouter un bien** : choisir « À vendre » ou « À louer », un titre (facultatif). Le bien naît en **brouillon** avec sa
   référence (V-0001, L-0001…).
3. **Saisir** : type, titre, titre de la fiche, ville, prix (vente) ou loyer hors charges et charges (location), surface,
   pièces, chambres, équipements (un par ligne), description (paragraphes séparés par une ligne vide), quartier, lieux
   proches, DPE / GES (ou « à renseigner »).
4. **Photos** : « Ajouter des photos du projet » (photos déjà dans Images ou Fichiers). La première est la couverture ; les
   flèches changent l'ordre ; chaque photo a sa description. Plan facultatif. Une même photo ne sert jamais deux fois.
5. **Prévisualiser** : ouvre la fiche telle qu'elle sera, même en brouillon (le brouillon reste invisible sur le site).
6. **Enregistrer** ou **Enregistrer et publier**. Il faut au minimum : titre, ville, une photo, la surface et le prix (ou le
   loyer) ; sinon le studio dit exactement ce qui manque.
7. Ensuite : **Retirer** (caché du site, gardé), **Vendu / Loué** (reste affiché avec la mention), **Archiver** (hors de
   tout affichage, jamais effacé), flèches pour l'ordre d'affichage.
8. **Exporter** : onglet Site › Exporter. Les biens partent avec l'export (voir « Export » plus bas).

## Matrice planche → pages → composants → médias → actions → preuve

| Planche | Pages (adresses) | Composants (sections) | Médias principaux | Actions réelles | Preuve |
|---|---|---|---|---|---|
| 01 Accueil | `/` | `re-hero` (recherche Acheter/Louer), `re-listings` à la une, `re-tiles` (deux chemins, services, secteurs, conseils), `re-feature` (bien d'exception, bandeau propriétaires, agence, bande de contact) | accueil-hero, acheter, louer, mas-alpilles, bandeau-proprietaires, secteur-*, accueil-agence, conseil-* | recherche → page filtrée (onglet, ville, type, budget), favoris, liens secteurs filtrés | captures 01, interactions §2 |
| 02 Recherche | `/pages/acheter`, `/pages/louer`, `/pages/carte` | `re-hero` (page), `re-listings` grille (panneau posé sur la photo, onglets) et carte illustrative | recherche-*-hero, vente-carte-1…6, location-carte-1…6, carte-reference | filtres, tri, pages, état vide, effacer, critères dans l'adresse et retour arrière, carte/liste, repères liés aux cartes | interactions §1 et §3 |
| 03 Fiche vente | `/pages/bien/<adresse>` | `re-bien` (vente), `re-listings` similaires | vente-jardin, -salon, -cuisine, -terrasse, plan, quartier-* | visionneuse et compteur réel, favoris, partage, demande de visite / rappel vérifiée, « voir plus », accordéons et barre fixe (téléphone) | interactions §4 et §8 |
| 04 Fiche location | `/pages/bien/<adresse>` | `re-bien` (location : prix charges comprises, informations financières, galerie défilante, étapes, questions), similaires « à louer à Lyon » | location-salon…vue, location-parc, location-similaire-1…4 | idem + « Préparer mon dossier » | captures, test « 1 290 € / mois » |
| 05 Agence, conseils, article, contact | `/pages/agence`, `/pages/conseils`, `/pages/conseil-questions-visite`, `/pages/contact` | `re-hero`, `re-feature` (grande photo et encart, appel), `re-tiles` (approche, cartes filtrables, articles liés), `re-article`, `re-form` contact | agence-hero, village, agence-piscine, conseils-hero, article-*, conseil-achat, contact-hero, contact-village, carte | filtre des conseils, formulaire avec motif et vérification | interactions §7 |
| 06 Estimation, vendre, louer | `/pages/estimer`, `/pages/vendre`, `/pages/mettre-en-location` | `re-form` estimation (3 étapes) et rappel, `re-tiles` (étapes, engagements, prestations, questions), `re-feature` | estimation-*, vendre-*, mise-location-* | étapes vérifiées, retour, envoi honnête (aucun prix) | interactions §6 |
| 07 Favoris, alerte, espace, légal, 404 | `/pages/favoris`, `/pages/alertes`, `/pages/mon-espace`, `/pages/mon-projet`, `/pages/mentions-legales`, `/pages/cookies`, page introuvable | `re-favorites`, `re-form` alerte, `re-account` (connexion / tableau de bord), `re-legal`, `re-hero` (404), bandeau de cookies du thème | favori-villa / favori-appartement (biens), alerte-maison, compte-interieur, espace-visite, legal-plaque, 404-village | comparaison, retrait, recherches récentes, effacement des données du navigateur, onglets légaux au clavier, choix de cookies | interactions §5 et §7 |

Tout projet client qui choisit Maison & Horizon reçoit automatiquement les pages Acheter, Louer, Carte, Estimer, Favoris,
Mon espace et le modèle de fiche (`src/lib/theme/real-estate-site.ts`), en plus de ses pages de services.

## Arbitrages (valeurs contradictoires entre planches : la fiche détaillée fait foi)

- **Loyer de l'appartement de Lyon 6ᵉ** : 1 290 € sur l'accueil, 1 200 € + 90 € sur la fiche. Retenu : 1 200 € hors
  charges + 90 € de charges = 1 290 € charges comprises. Règle unique : les cartes montrent le hors charges et « + charges »,
  la fiche et la mise en avant montrent le charges comprises avec le détail.
- **Surface de ce même bien** : 68 m² (accueil) / 64 m² (fiche) → 64 m².
- **Nombre de photos** : « Voir les 12 photos » (vente) et « 16 photos » (location) sur les planches → compteur réel : 4 et 7.
- **Titres** : la carte d'accueil dit « Appartement meublé avec balcon », la fiche « Un appartement lumineux, prêt pour votre
  quotidien » → deux champs : titre (cartes) et titre de la fiche.
- **« Maison de charme avec jardin, Uzès, 485 000 € »** (accueil) et **« Une maison ouverte sur le jardin, Lyon,
  485 000 € »** (fiche) : deux biens distincts (villes et photos différentes).
- **Carte** : la planche liste aussi 980 000 €, 835 000 € et 760 000 € sans photo propre ; ils ne sont pas créés (pas de
  photo réutilisée). La carte s'ouvre sur Aix-en-Provence avec ses 3 biens placés ; sans ville choisie, aucun repère.
- **Compteurs « 6 biens sur 24 / 18 »** → nombres réels (14 à vendre, 13 à louer).
- **« Estimation précise et réaliste, offerte et sans engagement »** → « Une demande d'estimation de votre bien, étudiée par
  un conseiller, sans engagement » ; conditions et délais « à préciser par l'agence ».
- **Coordonnées de la planche 01** (téléphone, e-mail) et **mentions professionnelles** → « à renseigner ».
- **Espace client « Bonjour Camille », visite du 12 avril** → non reproduits (personne et rendez-vous inventés) : le tableau
  de bord montre les vraies données de ce navigateur (favoris, recherches récentes) et dit qu'une visite est confirmée par
  l'agence.
- **Conseils** : l'article de la planche (« Les bonnes questions à poser lors d'une visite ») est rédigé en entier ; les
  autres sont annoncés « Article à venir » (aucun texte de diagnostic, fiscalité ou délai inventé).
- **« Réseau d'acquéreurs sérieux »** → « Une connaissance locale de votre secteur ».
- **En-tête** : planches différentes (« Nous contacter », « Prendre rendez-vous », « Mon espace ») → « Nous contacter », icônes
  cœur (favoris avec leur nombre) et compte.
- **Couleurs** : terre cuite mesurée sur les planches entre #9E5238 et #B55C3C, vert profond #1F3A2F ; retenus #AC4E2A et
  #163A2C, assez éloignés de TRAVERSE et JOAILLERIE (contrôle « deux thèmes n'ont jamais les mêmes couleurs fortes »).
- **Secteurs Luberon et Marseille** : liens vers une recherche réelle ; sans bien publié, la page dit « Aucun bien ne
  correspond » et propose d'effacer les filtres.
- **Logo** : aucun fichier fourni → nom de la boutique en capitales serif précédé d'une arche au trait (aucun logo généré).

## Médias

85 des 90 images sont utilisées. Non utilisées : `article-interieur`, `article-salon`, `vedette-appartement` (quasi-identiques
à d'autres photos : les montrer ferait doublon), `espace-recherche` (photo libre de la démonstration, sert au parcours
« Ajouter un bien » du studio), `footer-interieur` (photo de pied de page de la planche 02 : le pied de page du thème n'a pas
d'emplacement photo). La carte et le plan sont des illustrations sans nom de lieu, annoncées comme telles.

## Export

| Plateforme | Ce qui part | Ce qui demande une étape ou un serveur |
|---|---|---|
| Shopify | Thème complet : pages, fiche `templates/metaobject/bien.json`, photos des biens (médias `es-bien-*`), `biens/biens.json`, `biens/shopify-metaobjets.json` (définition + une entrée par bien), `biens/LISEZ-MOI.md` | Créer les métaobjets « bien » dans la boutique (API Admin : définition puis entrées) — non automatique aujourd'hui ; sans eux, les listes affichent « Aucun bien n'est publié ». Formulaires : formulaire de contact de Shopify. |
| WooCommerce, PrestaShop | Pages du thème, photos, `biens/biens.json`, marche à suivre | Listes, filtres, carte et fiches dynamiques : module serveur (type de contenu « bien ») à créer — V2 |
| Wix, Squarespace | Guide de reconstruction, médias, `biens/biens.json` | Reconstruction manuelle des listes |

L'export signale toujours « biens joints : à importer » (avertissement), jamais une réussite silencieuse.
Hébergement natif du site par le studio : V2.

## Limites (dites aussi à l'écran)

- Favoris, comparaison et recherches récentes : gardés dans le navigateur (localStorage), sans compte ; ils ne suivent pas
  d'un appareil à l'autre. Un vrai compte client dépend de la plateforme (comptes Shopify) ; en démonstration aucune
  connexion n'est possible.
- Formulaires (visite, rappel, estimation, alerte, contact) : vérifiés avant l'envoi ; en démonstration rien n'est envoyé et
  la page le dit ; sur une boutique en ligne, ils passent par le formulaire de contact de la plateforme. L'envoi automatique
  d'alertes par e-mail demande un service d'e-mails (non branché).
- Carte : illustrative, position saisie à la main (0 à 100), pas de géolocalisation.
- Export Shopify : biens à créer comme métaobjets (étape manuelle ou V2) ; autres plateformes : module serveur à créer.
- Une CI verte ne vaut pas validation visuelle : la comparaison avec les planches reste à valider par Thomas.

## Vérifications

Branche `claude/themes-differenciation`, PR #167 (17 commits « MAISON & HORIZON », de `f478467b` au dernier commit de la
branche). Rien n'est fusionné ni déployé.

| Contrôle | Résultat |
|---|---|
| Tests ciblés `tests/maison-horizon.test.ts` | 8/8 : un bien ajouté apparaît (accueil, Acheter, fiche) sans modifier le thème, retiré il disparaît, vendu il reste ; brouillon prévisualisé seul ; formulaires honnêtes ; export Shopify / WooCommerce / PrestaShop ; sections réservées au thème ; site immobilier sans module serveur (chargé par le navigateur) ; démo complète (27 biens, aucune photo partagée — avec le kit privé) |
| Suite complète (vitest, 362 fichiers) | 2 939 réussis, 3 échecs de registres (rôles de contenu des sections `re-*`, fiche d'un bien traitée comme composant structurel, contrôle d'identité qui essayait d'ajouter des sections immobilières sur Atelier Rive) → corrigés, les 20 fichiers concernés repassés (115/115) |
| Theme Check officiel (Shopify), Maison & Horizon en Prestations de services, FR et EN | 0 erreur ; 4 avertissements anciens dans des sections `fs-*` hors de cette mission |
| Preuve des interactions en navigateur (`scripts/maison-horizon-interactions.ts`, démo statique) | 22/22 étapes : filtres, tri, pages, état vide, retour arrière, recherche de l'accueil, carte, visionneuse, demande de visite vérifiée sans envoi, favoris et comparaison, estimation en 3 étapes sans prix, fiche au téléphone, onglets légaux, cookies |
| Preuve du studio (`scripts/maison-horizon-studio-check.ts`, Next.js réel, base temporaire) | 7/7 étapes : onglet Biens et 27 biens listés ; ajout d'un brouillon ; publication refusée avec le message du serveur (« il manque : au moins une photo, la surface, le loyer hors charges ») ; saisie et photo choisie dans les médias ; aperçu du brouillon seul ; publié → visible sur Louer (filtre Lille) et fiche ouverte, version du thème inchangée ; retiré → absent du site, gardé dans l'onglet |
| Captures et comparaisons | 40 captures (20 pages × ordinateur et téléphone), aucun débordement horizontal ; 20 planches « maquette / rendu » côte à côte (images du kit privé : envoyées à Thomas, non publiées) |

Défaut trouvé par la preuve du studio et corrigé : le site immobilier lisait les schémas de sections sur le disque ;
or `directions.ts` est aussi chargé par l'onglet Marque (navigateur) : le studio ne compilait plus. Il compose désormais
les sections avec leurs seuls réglages (les valeurs par défaut viennent du schéma au rendu) et un test empêche le retour
d'un import serveur.

**Une CI verte ne vaut pas validation visuelle** : les comparaisons sont à valider par Thomas.
