# Modèles de pages et gestion multipage — « Modifier le thème »

## 1. Ce qui a été ajouté

- **Bouton « Pages »** dans l'éditeur de la boutique ou du site (Boutique › barre de l'aperçu, à côté du choix de la
  page affichée). Il ouvre la fenêtre « Pages du site » avec trois onglets :
  - **Pages** : liste, recherche, ouverture dans l'éditeur, présence dans le menu (interrupteur), ordre du menu
    (monter/descendre), réglages (nom, adresse `/pages/…`, titre et description pour Google, publiée ou brouillon),
    dupliquer (la copie est un brouillon hors menu), changer de modèle (avec explication et confirmation), supprimer
    (avec la liste des liens qui y mènent ; Contact et pages légales protégées).
  - **Ajouter une page** : bibliothèque des modèles avec vignettes réelles (rendues par le vrai moteur d'aperçu,
    avec les couleurs, polices, images et textes du projet), aperçu ordinateur/téléphone, « Utiliser ce modèle ».
  - **Mises en page des produits** : chaque produit peut garder la fiche commune ou recevoir sa propre mise en page
    (Essentiel, Démonstration, Présentation détaillée), affecter une mise en page existante, ou revenir à la fiche commune.
- **Activité du projet** (vente de produits, rendez-vous, devis, commerce local, mixte) : déduite du projet, affichée
  « à confirmer », modifiable. Elle met en avant les modèles conseillés.
- **Boutons d'action adaptés** : « Ajouter au panier » (produits), « Prendre rendez-vous », « Demander un devis »,
  « Nous contacter ». Aucun panier, stock ni livraison sur les pages de prestation ; le prix d'une prestation est
  affiché seulement s'il a été saisi (ex. « sur devis »).
- **Bouton de réservation jamais mort** : il mène à un lien HTTPS saisi par le client (« Configurer mon calendrier »),
  ou à une page de réservation du site, ou à défaut à la page Contact (« Nous contacter »). Sans aucune destination,
  le bouton n'est pas affiché. C'est distinct des rendez-vous téléphoniques avec E-COM STUDIO.
- **Exports** : Shopify reçoit un modèle par page et par mise en page produit (`templateSuffix` du produit, pages
  brouillon envoyées non publiées) ; WordPress et PrestaShop reçoivent un fichier par page.

## 2. Les 10 modèles

| Modèle | Type | Usage |
|---|---|---|
| Produit — Essentiel | fiche produit | achat rapide, peu de texte |
| Produit — Démonstration | fiche produit | montrer le produit en situation, étapes d'utilisation |
| Produit — Présentation détaillée | fiche produit | produit technique : caractéristiques, questions |
| Prestation — Rendez-vous | page | une prestation (prix et durée si saisis) + bouton de réservation |
| Artisan — Savoir-faire et devis | page | méthode, réalisations, demande de devis |
| Commerce — Présentation | page | commerce local : horaires, accès, contact |
| Réalisations — Portfolio | page | galerie des réalisations (images du projet seulement) |
| À propos — L'entreprise | page | histoire, valeurs, engagement |
| Contact — Informations pratiques | page | coordonnées déjà saisies, formulaire |
| Rendez-vous — Réserver | page | calendrier du site ou lien externe HTTPS |

Chaque page créée est une **copie indépendante** : la modifier ne touche ni le modèle ni les autres pages.
Les modèles n'utilisent que les images et textes du projet ; aucune personne, aucun avis, chiffre ou certification
n'est ajouté. Ce qui manque apparaît en « [À compléter : …] ». Sans photo, le haut de page passe en version
typographique (pas de cadre d'image vide).

## 3. Permissions (vérifiées sur le serveur)

- **Développer (89 €) et Dominer (129 €)** : tout est ouvert.
- **Créer** : voit la fonction avec un cadenas ; peut toujours modifier ses pages existantes (nom, adresse, référencement,
  menu, publication, suppression) et remettre un produit sur la fiche commune. Ajouter une page, dupliquer, changer de
  modèle ou créer une mise en page produit est refusé par le serveur (erreur 402), même en appelant l'API directement.
- **Découverte** : liste des modèles présentée dans la démo, sans IA payante.
- Une recharge ne donne aucune fonction. Un passage à un forfait inférieur **conserve** toutes les pages existantes et
  bloque seulement les nouvelles opérations réservées.
- Appliquer un modèle n'appelle **aucune IA** (moteur local, 0 €).

## 4. Migrations

Aucune migration de base de données ni modification destructive : de nouveaux champs **facultatifs** (modèle, statut,
liens d'une page ; mise en page d'un produit ; activité du projet). Les sites existants gardent leur fiche produit commune
par défaut. Chaque action crée une version restaurable dans l'historique.

## 5. Ce qui a été vérifié

- `npx tsc --noEmit` : OK. `npx vitest run` : 153 fichiers, 1306 tests réussis, dont `tests/modeles-pages.test.ts`
  (10 structures distinctes, verrou Créer, mises en page produit indépendantes et rendues, ajout/duplication/renommage,
  collision d'adresse, double clic (409), page protégée, dépendances à la suppression, prestation sans panier, lien de
  réservation HTTPS uniquement, rétrogradation, isolation entre comptes, exports Shopify/WooCommerce/PrestaShop).
- Theme Check de Shopify (`scripts/verify-theme.sh --rapide`) : aucune erreur. En plus, un thème contenant les
  10 modèles (pages et fiches produit) a été compilé pour 3 projets de test et passé au Theme Check : 0 erreur.
- Parcours dans un vrai navigateur (Chromium, serveur local, base de test) — captures dans
  `reports/screenshots/modeles-pages/` :
  - 01 bibliothèque, 02 création, 03 page ouverte dans l'éditeur, 04 liste après rechargement (persistance),
    05 deux produits avec deux mises en page différentes ;
  - 06 compte Créer : bouton « Utiliser ce modèle » verrouillé ;
  - 07–08 aperçu « Prestation — Rendez-vous » ordinateur et téléphone, 09 calendrier HTTPS configuré ;
  - 10–12 téléphone (390 px) : les trois onglets, aucun débordement horizontal, aucune erreur JavaScript.
    Ce contrôle a révélé un débordement de la liste « Ordre du menu » et de la ligne des pages : corrigé puis revérifié.

## 6. Limites

- **WooCommerce et PrestaShop** n'ont qu'une fiche produit commune : les mises en page propres à un produit ne sont
  exportées que vers Shopify ; l'export le signale (avertissement « product_layouts_shared »). Les pages brouillon
  ne sont pas exportées vers WordPress/PrestaShop (avertissement).
- **Non testé en réel** : aucune publication sur une vraie boutique Shopify, ni installation sur un vrai WordPress ou
  PrestaShop, ni appel à un fournisseur d'IA. Seuls les fichiers d'export et les appels préparés ont été vérifiés.
- La démo Découverte présente la liste des modèles, pas un éditeur multipage complet.
- Renommer une page met à jour les liens internes du site (sections, menus, boutons de réservation) ; un lien vers
  l'ancienne adresse placé hors du site (réseaux sociaux, publicités) n'est pas redirigé automatiquement.
