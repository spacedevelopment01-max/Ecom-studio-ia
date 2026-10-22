# HEUREN refait d'après les maquettes du 22 octobre — résultats à valider

Consigne : PR #167, commentaires 6348371373 et 6348848308 (copie : `docs/design/heuren-reference-20261022/CONSIGNE_VALIDEE.md`).
Travail limité à HEUREN. **Rien n'est marqué « validé » : la validation visuelle et commerciale revient à Thomas.**
Les tests automatiques prouvent que les choses marchent ; ils ne prouvent pas que le rendu est bon.

Commit vérifié : `06dcb722` (branche `claude/themes-differenciation`). Preuves : `docs/design/heuren-reference-20261022/resultats/`.

## Ce qui est fait

### Une seule montre, des médias durables
- Les 13 photos fournies sont copiées dans le dépôt (`public/theme-assets/heuren/`) : aucune dépendance à un dossier privé.
  `bureau-corrige` est utilisé ; la version défectueuse est exclue. Aucune image régénérée, aucune banque d'images.
- Une seule montre : cadran bleu nuit sans dateur, boîtier argenté, bracelet bleu nuit, coffret bleu nuit (intérieur ivoire).
- 190 € est annoncé comme **prix de démonstration** (« — prix démo », « Modèle fictif »).
- Tous les textes et boutons sont du vrai HTML modifiable : aucun texte n'est écrit dans une image.

### Construit dans le moteur existant
- Accueil, fiche produit, boutique (un seul produit), Notre histoire, Conseils & FAQ, Contact, Livraison et retours,
  panier rempli et panier vide : ce sont toutes des sections du thème avec leurs réglages, pas des images de pages.
- Profil « cadran » propre à HEUREN :
  - fonds blanc et bleu nuit, boutons champagne `#CDB893`, titres Jost fins ;
  - en-tête transparent sur la photo d'ouverture ;
  - pied bleu nuit ;
  - menu téléphone bleu nuit.
- Nouvelles dispositions, toutes réglables, traduites en anglais et exportables. Ce sont des options ajoutées aux
  sections existantes ; les autres thèmes ne changent pas.

  | Disposition | Section |
  |---|---|
  | Bandeau photo, texte à gauche | ouverture |
  | Bandeau des engagements | engagements |
  | Bandeau photo pleine largeur | ambiance |
  | Triptyque plein cadre | usages |
  | Deux photos, prix et deux boutons | produit à la une |
  | Aide au choix : titre et liens | engagements |
  | Thèmes en colonnes et questions | FAQ |
  | Repères numérotés et détails dépliables | ambiance |
  | Formulaire et image avec titre H1 | contact |

- Panier :
  - boutons − et + ;
  - « Supprimer » ;
  - « Continuer mes achats » ;
  - panier vide avec la montre et « Votre panier attend son premier moment. ».
- Ces réglages du panier sont facultatifs : ils sont éteints pour les autres thèmes.

### Galerie E-commerce (studio réel, base temporaire)
Script : `scripts/heuren-studio-check.ts`. Preuve : `resultats/galerie-dispositions.jpg`, `resultats/studio-edition.jpg`,
`resultats/studio.json`.
- **Les 9 compositions** de la maquette sont dans « Ajouter une section ». Chacune a un aperçu réel, rendu avec les
  photos du projet.
- Le triptyque et la FAQ en colonnes arrivent avec leurs blocs de départ : 3 cadres avec photo, et 3 thèmes illustrés
  avec leurs questions. Sans ces blocs, l'ajout aurait donné une section vide.
- Le parcours testé dans le studio, puis vérifié après rechargement complet :
  1. ajout d'un bandeau depuis la galerie ;
  2. modification du titre, du bouton, du côté du texte et des couleurs dans « Réglages » ;
  3. duplication ;
  4. déplacement.
- Droits du forfait : avec « Vendre », toutes les compositions HEUREN sont proposées. « Avis clients », réservé à
  « Dominer », ne l'est pas.
- Aucun doublon dans la bibliothèque. L'ancienne ouverture « Écrin » est retirée.

### Parcours de la boutique (export statique de la démo)
70 contrôles sur 70 sont réussis (`resultats/interactions.json`), à 1440 et à 390 px.

| Parcours | Ce qui est vérifié |
|---|---|
| Menu | menu téléphone : ouverture, liens, fermeture par Échap ; navigation au clavier |
| Questions | FAQ : ouverture et fermeture |
| Fiche produit | choix d'une miniature ; zoom ouvert puis fermé ; quantité 2 ; ajout au panier ; compteur à 2 |
| Panier | 1 ligne à 380 € ; bouton + : 570 € ; bouton − : 380 € ; quantité 1 : 190 € ; suppression ; panier vide |
| Formulaire | contact vide refusé (champs obligatoires) ; aucun envoi réel |
| Conseils | 3 thèmes et 9 questions |
| Barre d'achat fixe (téléphone) | visible après le bouton d'achat ; masquée en bas de page, elle ne couvre pas le pied |
| Toutes les pages | aucun débordement, aucune image cassée, aucune erreur de script |
| 360 et 430 px | toutes les pages : aucun débordement, un seul H1 |

### Adaptation à un autre client
Le fauteuil d'ALCÔVE (autre produit, ses propres photos et textes) est composé dans HEUREN
(`reference-static-preview.ts --cross`). Preuve : `resultats/adaptation-client.jpg`.
- Sur les 12 pages, **aucun** nom, prix, texte ou image HEUREN ne reste (contrôle automatique sur le texte affiché et
  les fichiers).
- Le test `heuren-alcove` (« appliqués à un autre projet ») vérifie aussi :
  - les couleurs et le nom du projet ;
  - les exports Shopify, WooCommerce et PrestaShop.

### Comparaison maquette / rendu à la même taille
- `resultats/comparaison-accueil.jpg` et `comparaison-produit.jpg` : page entière, même largeur que la maquette.
- `resultats/comparaison-pages.jpg` : les six autres pages, même grille que la planche de la maquette.
- `resultats/comparaison-telephone.jpg` : téléphone 390 px. La planche téléphone de la maquette est un résumé ; le
  rendu garde toutes les sections de l'ordinateur.
- Les captures de toutes les pages (1440 et 390), deux courtes vidéos et l'enregistrement du studio sont remis à part.

## Écarts qui restent (liste précise)

### Photos
Ce sont des images générées : **elles ne sont pas identiques entre elles**.
- **Nom « HEUREN »** : placé sous 12 h sur la vue de face, la macro et le bureau ; en arc ou incliné sur l'ouverture.
- **Trotteuse** : visible sur certaines vues, pas sur d'autres.
- **Couronne** : gravée d'un « H » sur le profil seulement.
- **Coutures et proportions** : les coutures bleues du bracelet et les proportions du boîtier et des cornes varient
  d'une scène à l'autre.

### Différences avec la maquette
1. **Prix** affiché « 190,00 € » (format monétaire commun à tous les thèmes) au lieu de « 190 € ».
2. **Pied de page** :
   - pas de « Mentions légales » ni de « Confidentialité », car la démo n'a pas ces pages et elles ne sont pas
     inventées ;
   - pas d'icônes de réseaux sociaux (aucun compte réel) ;
   - c'est le même type de pied « minimal sur une ligne » qu'ORBE, imposé par la maquette ; les tests de différence
     entre thèmes le disent explicitement.
3. **Boutique** : bandeau puis grille de la collection. Ce n'est pas la carte produit avec macro de la maquette.
4. **Couleur du produit** : pastille texte champagne « Bleu nuit », pas un rond bleu nuit.
5. **Fiche produit** :
   - pas de fil d'Ariane visible (il reste en données structurées) ;
   - 3 repères sur la vue de profil au lieu de 4.
6. **Panier** :
   - titre « Panier » au lieu de « Votre panier » ;
   - pas de lignes « Livraison : calculée à l'étape suivante » ni « Total provisoire » ; la phrase « Taxes et frais
     calculés lors du paiement » et un bouton « Mettre à jour » sont en plus.
7. **Menu téléphone** : 4 liens (pas « Livraison et retours »), sans flèches ni icônes de réseaux.
8. **Barre d'achat fixe (téléphone)** : elle montre nom, quantité et prix, au lieu de « 190 € | Ajouter au panier ».
   Sur les captures « page entière », elle apparaît au milieu de la page : c'est un effet de la capture ; en vrai, elle
   reste en bas de l'écran.
9. **Contact** :
   - un champ « Nom » au lieu de « Prénom » et « E-mail » côte à côte ;
   - pas de « Suivre une commande », car cette page n'existe pas.
10. **Conseils** : « Une autre question ? » en bandeau, et non en carte avec icône.
11. **Proportions** : les sections du rendu sont plus hautes que sur la planche de la maquette, qui est compressée.
12. **Bandeau « Aperçu de démonstration · paiement désactivé »** en haut de la démo statique. Il n'existe pas sur une
    vraie boutique.

### Galerie et adaptation
- **« Formulaire et image »** (disposition commune à tout l'E-commerce, laissée telle quelle) : son aperçu n'a pas de
  photo tant que le marchand n'en choisit pas.
- **Fauteuil d'ALCÔVE dans HEUREN** : quelques textes manquent au client et restent à compléter dans le studio. Rien
  n'est inventé à leur place :
  - le dernier bandeau n'a pas de titre ;
  - les panneaux du triptyque s'appellent tous « En situation » ;
  - sans prix, l'achat est affiché « indisponible ».
- **Bouton de contact flottant** : retiré de la démo HEUREN (absent de la maquette, il couvrait des boutons). Le moteur
  d'adaptation l'ajoute encore pour les clients, comme pour tous les thèmes.

### Non vérifié
- Le studio de Thomas (pas d'accès depuis cette session). Le studio a été testé en développement, sur une base
  temporaire.
- Le test du studio a échoué deux fois quand la machine était très chargée : aperçu lent, puis connexion coupée par le
  serveur de développement. Seul sur la machine, il passe.

## Vérifications techniques

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx vitest run` (suite complète) | 358 fichiers sur 358 ; 2 899 tests réussis, 2 suspendus |
| `npm run build` | OK |
| Theme Check (Shopify) sur heuren, alcove, souple, orbe, rive | 0 erreur ; 4 avertissements « variable non utilisée » déjà présents sur `main` (sections `fs-*`) |
| Parcours de la boutique | 70 / 70 |
| Studio (galerie, édition, rechargement) | réussi (`resultats/studio.json`) |
| Adaptation client | aucune trace HEUREN sur les 12 pages |

Toutes ces vérifications ont été faites sur le contenu du commit `06dcb722`.
