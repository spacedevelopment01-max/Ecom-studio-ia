# Parcours de création d'un projet avec SYNA

**Statut : proposition à valider par le propriétaire (6 novembre 2026).**
Barème de qualité : `docs/syna/CHARTE-QUALITE-2026.md`. Décisions d'origine : `scripts/syna-recette/REPRISE.md` § 8.

Principes :
- SYNA pilote tout, dans cet ordre. Elle **pose une question au lieu d'inventer**.
- **Avant chaque étape payante**, elle annonce le coût en % du budget IA du mois du client et attend son accord (ou
  travaille dans le budget que le client lui a autorisé).
- Une étape qui échoue **reprend là où elle s'est arrêtée**, sans repayer ce qui est fait.
- Textes, réflexion, recherche, code : **Claude**. Images : **OpenAI** (à confirmer face à Qwen par l'essai comparatif).
  Vidéos : plus tard (fal).
- Coûts : estimations à confirmer par essais réels (prix vérifiés le 06/11/2026, taux 0,90 €/$).

Légende de l'état actuel : ✅ existe (à brancher) · 🔧 existe en partie (à modifier) · 🆕 à construire.

---

## Étape 0 — Questions de départ 🔧

SYNA s'ouvre dès « Créer un projet ». Elle pose les questions **une à la fois**, dans un langage simple, et ne repose
jamais une question déjà répondue.

Questions (seulement celles dont la réponse manque) :
1. Produit(s) ou service(s) ? Photos du produit, ou description du service.
2. À qui s'adresse-t-il ? (client idéal, âge, situation, ce qu'il cherche)
3. Où vendez-vous ? (en ligne seulement, boutique, zone d'intervention pour un service)
4. Prix prévus (ou fourchette), options, variantes.
5. Ce qui vous rend différent (en vos mots).
6. Avez-vous déjà un nom, un logo, des couleurs ? (si oui : on part de là)
7. Ce que vous aimez / n'aimez pas (sites, marques, styles) — liens ou captures bienvenus.
8. Coordonnées de l'entreprise (reprises de la création du projet, jamais redemandées).
9. Plateforme visée (Shopify, autre, pas encore décidé).

Fin d'étape : SYNA résume ce qu'elle a compris et le client confirme. Analyse des photos (Claude, vision).

## Étape 1 — 3 identités de marque 🔧

- Claude (modèle le plus fort retenu au banc d'essai) crée 3 identités selon la charte § 2.1.
- Contrôle de différence ; vérification indicative des noms par recherche web.
- Présentation côte à côte : nom, slogan, palette, polices, ton, « pourquoi ».
- Aujourd'hui : une seule identité avec 3 pistes de logo → **à modifier**.

## Étape 2 — 3 logos, un par identité 🔧

- Un logo par identité, trois styles différents adaptés au métier (charte § 2.2 à 2.4, niveau des 50 exemples du propriétaire).
- Contrôle de chaque logo (Claude, vision) ; une reprise au plus, annoncée.
- Le client choisit **une identité complète** (il peut demander des retouches : nom, couleur…).

## Étape 3 — Image de marque complète (après validation du client) 🔧

- Vectorisation du logo choisi, déclinaisons exactes, planche de marque, charte PDF (charte qualité § 2.5).
- Planche refaite avec la charte (`saveIdentityBoard`).

## Étape 4 — 5 angles marketing ✅

- Recherche web (places de marché exclues), 5 angles émotionnels distincts, sources réelles, preuves à confirmer.
- Le client choisit un angle.

## Étape 5 — L'activité complète 🔧

- Fiche de l'entreprise, stratégie de l'angle choisi (messages clés, objections et réponses, offre), prix des produits ou
  prestations (proposés, jamais imposés), questions au client si besoin.
- Les produits sont créés dans l'onglet **Produits** du Studio (source unique pour le site).

## Étape 6 — Thème : un des nôtres ou création ? 🆕 (choix) / 🔧 (maquettes)

SYNA demande : « Partir d'un de nos thèmes, ou créer un site sur mesure à partir de 3 maquettes ? »

**Création** : 3 maquettes images (charte § 6, « Maquettes images »), vraiment différentes, fidèles à l'identité choisie,
textes émotionnels et vrais produits ou services. Le client choisit une maquette.

**Aucune page oubliée** — liste de base, adaptée au métier par SINA (restaurant : carte et réservation ; immobilier :
recherche et fiche bien ; salon : prestations et rendez-vous…) :

- *Boutique (produits)* : accueil ; catalogue ; catégorie ; fiche produit (chaque type de produit) ; panier (page et
  tiroir) et panier vide ; recherche et « aucun résultat » ; notre histoire ; contact ; FAQ ; livraison et retours ;
  guide des tailles si utile ; compte client (connexion, inscription, mot de passe oublié, mon compte, commandes,
  adresses) ; CGV ; mentions légales ; confidentialité ; cookies ; page « boutique bientôt ouverte » ; 404 ; blog (liste
  et article, prévus pour l'étape 12). **Pas de page de paiement** : elle est fournie par la plateforme (Shopify) ou
  prend le style du thème (WooCommerce, PrestaShop).
- *Services* : accueil ; prestations et page de chaque prestation ; tarifs ; réalisations et page de chaque projet ;
  l'entreprise ; méthode ; zone d'intervention ; FAQ ; contact ; demande de devis et confirmation ; prise de
  rendez-vous ou réservation, confirmation et gestion (si le métier s'y prête) ; conditions de prestation ; mentions
  légales ; confidentialité ; cookies ; plan du site ; 404 ; blog (liste et article). Publication par le Studio avec le
  domaine du client.
- Chaque page en version ordinateur et téléphone ; en-tête et pied de page sur toutes.

## Étape 7 — Thème codé d'après la maquette choisie 🆕

- Claude code le thème : en-tête, pied, accueil, collection, fiches produit (ou prestations), panier, à propos, contact,
  FAQ, recherche, 404, pages légales (CGV, mentions, confidentialité, livraison et retours, cookies), modèles de blog
  prêts pour l'étape 12.
- Sections modifiables dans le Studio, par SINA et dans Shopify ; export vers WooCommerce et PrestaShop (Wix et
  Squarespace retirés le 6 novembre).
- Images du site créées par l'IA d'images (aucune en double), produits reliés à l'onglet Produits.
- Boucle de contrôle : captures à 5 largeurs comparées à la maquette par Claude, corrections, liens testés, Theme Check,
  SEO complet (charte § 4).
- Base existante : moteur de thème sur mesure (`src/lib/engine/custom-theme.ts`) — il ne part pas encore d'une image.

## Étape 8 — Un de nos thèmes, adapté 🔧

- Le client choisit parmi les thèmes proposés (`MAQUETTE_THEMES`).
- Tous les textes réécrits pour le projet (émotionnels, SEO), toutes les images refaites pour le produit ou service.
- Mêmes exigences que l'étape 7 (pages, liens, SEO, modifiable partout, produits reliés).

## Étape 9 — 3 groupes de publications ✅/🔧

- Formats : carré 1:1 et 4:5 (Instagram, Facebook), 9:16 (Stories, Reels, TikTok), 2:3 (Pinterest), 1,91:1 (Facebook,
  LinkedIn). Le client peut ne garder que ses réseaux.
- Charte § 7 ; réseau indiqué pour chaque publication.

## Étape 10 — 3 groupes de publicités images ✅/🔧

- Mêmes formats et règles, charte § 8.

## Étape 11 — Calendrier de publication 🔧

- SYNA demande : maintenant ou plus tard ? nombre de publications par jour ? sur 7, 15 ou 30 jours ? heures ? emojis ?
- Nombre de publications = jours × publications par jour ; chacune déclinée par format ; sujets variés.
- **Pour l'instant sans publication automatique** : calendrier dans le Studio, kit du jour à télécharger (images nommées
  par date et réseau + texte prêt à copier), fichier d'agenda (.ics) avec rappel à l'heure prévue.
- Liaison automatique plus tard, quand les réseaux auront donné leur accord.

## Étape 12 — 2 articles de blog 🔧

- Sujets utiles au client idéal, recherche web, SEO (charte § 4), images propres, liens vers les produits ou services.
- Reliés au site (menu, accueil, fiches).

## Étape 13 — Rangement ✅

- Tous les fichiers rangés dans Fichiers (Marque, Site, Publications, Publicités, Calendrier, Blog, Exports).

---

## Ordre de travail proposé

1. Validation de la charte et de ce parcours par le propriétaire.
2. **Banc d'essai qualité** (payant, prix annoncé avant, accord écrit) : modèles d'images (OpenAI 2.5, OpenAI 2.6, Qwen)
   et de textes (Opus 5.5, Fable 5.1) sur un même projet exemple.
3. Construction étape par étape (0 → 13), chaque étape essayée en réel et validée avec captures avant la suivante.

---

## Ajouts validés par le propriétaire (6 novembre 2026)

1. **Partir de l'existant, et mode « refonte »** : le client donne un lien (ancien site, Instagram, boutique Etsy) ou
   des photos ; SINA lit tout et ne pose que les questions manquantes. Le client peut dire ce qu'il garde et ce qu'il
   change, par exemple « refais tout, garde le logo et le slogan, change tout le reste » : les éléments gardés sont
   repris tels quels (jamais redessinés), tout le reste est recréé selon le parcours.
2. **Suivi du chantier en direct** : frise des étapes 0 à 13 (fait, en cours, à valider), budget utilisé en %, pause
   et reprise.
3. **Mélanger les identités** : « le nom de la A avec les couleurs de la B » ; SINA recompose sans tout refaire.
4. **Le logo en situation** avant le choix (emballage, vitrine, écran de téléphone).
5. **Liste de ce qui manque avant de publier** (SIRET, adresse, horaires, informations des CGV, mentions légales…),
   questions une par une ; rien n'est publié avec des trous.
6. **Comptes réseaux prêts à l'emploi** : bio par réseau, photo de profil (symbole du logo), bannières aux bons
   formats, icônes des « stories à la une ».
7. **Textes des e-mails automatiques** dans le ton de la marque (bienvenue, confirmation de commande, panier abandonné,
   confirmation de rendez-vous).
8. **Services : fiche Google** (description, catégories, premières publications) pour être trouvé localement.
9. **Services : carte de visite et flyer prêts à imprimer**, avec QR code vers le site.
10. **Livret de lancement PDF** en fin de parcours : identité, site, calendrier, prochaines étapes.

Écartée : la comparaison avec les concurrents.
