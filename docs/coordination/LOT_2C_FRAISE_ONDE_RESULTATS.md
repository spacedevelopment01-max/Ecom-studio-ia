# FRAISE GUMMIES et ONDE AUDIO — thèmes fidèles aux références Lumora / Pawish (issue #137)

**État : livré pour revue, en brouillon, sans fusion ni déploiement.** Deux thèmes complets construits dans le moteur du studio sur la branche `claude/fraise-onde-themes-reference` (base `7aa726cf`, tête validée de la PR #135). Commit testé : `[TESTED_COMMIT]` (champ `testedCommit` de `reports/lot2c/preuves.json`). Les captures, comparaisons et vidéos contenant les 18 images IA et les logos du kit sont privées (ZIP remis à Thomas) ; rien de tout cela n'entre dans le dépôt public.

Inventaire des références et correspondance section par section : [`LOT_2C_FRAISE_ONDE_INVENTAIRE.md`](LOT_2C_FRAISE_ONDE_INVENTAIRE.md). Manifeste des ressources et licences : [`reports/lot2c/ressources-licences.json`](../../reports/lot2c/ressources-licences.json).

## Ce qui a été construit

### Dans le moteur (réutilisable par tous les thèmes)

- **Profil « conversion »** (réglage global `conversion_profile` : aucun / pop / contrast) : feuille `conversion.css` et script `conversion.js`, attribut `data-conversion` sur `body`. « Pop » = fond crème, accent vif, boutons bordés noirs à ombre portée, titres capitales (Lumora) ; « contrast » = ouverture anthracite, accent vert, boutons arrondis dégradés (Pawish). Les titres en deux temps (gras + accent) utilisent un italique serif local : aucune police manuscrite n'est disponible hors ligne, écart assumé.
- **Six sections éditables** : `cv-hero` (ouverture produit, note toujours marquée fictive sans application d'avis, coches, bouton, garantie), `cv-cards` (cartes visuel + texte), `cv-reviews` (carrousel d'avis avec note agrégée fictive, mention « Avis fictif » par carte, initiales au lieu de portraits, flèches, points, clavier), `cv-feature` (visuel + argumentaire, pastilles ou points iconés), `cv-guarantee` (bouclier, titre, texte, mention d'exemple, coches), `cv-stories` (voir ci-dessous). Toutes dans la bibliothèque FR/EN du studio, schémas traduits, choix de disposition exposés.
- **Stories vidéo en cartes** (`cv-stories`) : blocs réordonnables, format 9/16, 4/5 ou carré, largeur des cartes, poster (image ou fichier), vidéo de la bibliothèque, fichier du thème ou adresse directe, titre, sous-titre, lien produit, mention « Image IA — démonstration » par carte ; lecteur en boîte de dialogue (source chargée à l'ouverture seulement, lecture/pause, son, précédent/suivant, Échap, vidéo déchargée à la fermeture) ; **sans vidéo, la carte affiche son poster et « Vidéo à venir », sans bouton de lecture**.
- **Panier (tiroir et page)** piloté par des réglages globaux, désactivés par défaut : titre et compteur, bandeau sous le titre, bloc « commande réservée » **toujours marqué « Démonstration fictive »** (le studio ne réserve pas de stock), champ code de réduction (transmis à la plateforme au paiement, note explicite dans l'aperçu), ligne « Économies » (prix barrés et offres), « Total : N articles », libellé et cadenas du bouton, logos des moyens de paiement confirmés uniquement, bloc protection des expéditions (**interrupteur visuel jamais précoché, aucun montant ajouté**), invitation à se connecter si les comptes clients existent. Traductions FR/EN naturelles (erreurs, états vides, accessibilité).
- **Offres** : visuel facultatif par offre et prix de référence barré (prix barrés des variantes, sinon somme des prix) ; **badge de remise** sur le prix principal quand un prix barré existe ; **carte produit** qui montre le visuel de la variante par défaut (fond clair pour le catalogue et le panier).
- **Formulaires** : contact et newsletter indiquent, dans l'aperçu du studio seulement, que l'envoi n'est pas actif ; la validation HTML des champs reste réelle.
- **Logos** : vectorisation réelle des PNG du kit (`tests/lot2c-logo.ts`, tracé par couleur) en SVG couleur, monochrome, inverse pour fond sombre et favicon SVG + PNG ; aucun PNG encodé dans un SVG. Propositions non validées par Thomas : produites à la composition, jamais figées dans le dépôt.

### Les deux démonstrations (`tests/lot2c-fixtures.ts`)

| | FRAISE GUMMIES | ONDE AUDIO |
|---|---|---|
| Référence | Lumora (profil pop) | Pawish (profil contrast) |
| Produit | Gummies à la fraise, 24,90 € (barré 34,90 €, « exemple de promotion ») | Casque ONDE Audio, 149,00 € (barré 189,00 €, « exemple de promotion ») |
| Achat | offres 1 flacon / 2 + 1 offert (3) / 3 + 2 offerts (5) : 24,90 / 49,80 / 74,70 €, totaux fixes calculés par le serveur, barre d'achat mobile | achat simple avec quantité, barre fixe mobile |
| Pages | accueil, fiche, boutique (1 produit, aucun catalogue inventé), à propos, contact, FAQ, livraison et retours (exemples identifiés), mentions légales, confidentialité, conditions (à compléter, rien d'inventé), 404, recherche, panier page et tiroir | idem |
| Avis | 6 avis fictifs étiquetés, note agrégée fictive | idem |
| Images | 8 des 9 images du kit (`04-detail-gummies.webp` vide dans le ZIP → cadre « visuel à importer », non remplacé) | 9 images |
| Panier | compteur, bandeau livraison (exemple), économies, total avec articles, « Paiement sécurisé » avec cadenas, protection des expéditions (visuelle), garantie en exemple | compteur, réservation marquée fictive, code de réduction, économies, total avec articles, « Paiement sécurisé », invitation à se connecter (si comptes) |

## Vérifications réellement exécutées

Commit `[TESTED_COMMIT]` :

| Contrôle | État | Détail |
|---|---|---|
| `npx tsc --noEmit` | [TSC] | |
| `npx vitest run` — thème, catalogue, EN, lot 2A, lot 2B, audit Boutique, lot 2C | [VITEST] | |
| `scripts/verify-theme.sh --rapide` | [THEME_RAPIDE] | |
| `scripts/verify-theme.sh` complet (`JOBS=2`) | [THEME_COMPLET] | |
| `scripts/lot2c-proof.ts` (390 et 1440 px, vidéos, comparaisons) | [PROOF] | |
| `scripts/lot2c-demo-local.ts` sur une base temporaire | [DEMO_LOCAL] | |
| CI GitHub sur le commit testé | [CI] | |
| Suite complète `npm test` en local | non exécutée | prise en charge par la CI |
| Import dans Shopify, WordPress/WooCommerce, PrestaShop et test du panier natif | **non exécuté** | critère de réception à réaliser avec Codex (voir « Raccordements ») |
| Vues ordinateur et interactions des démonstrations de référence | **non observées** | kit limité aux captures mobiles |

### Interactions testées dans Chromium

[INTERACTIONS]

## Écarts assumés et limites

- Compte à rebours des bandeaux d'annonce retiré (consigne) ; bloc « commande réservée » du panier présent mais marqué fictif.
- Abonnement « Subscribe & Save » de Lumora non reproduit : le moteur n'a pas de plans d'abonnement, aucune fausse option.
- « Selling fast ! 44 people… », « #1 Bestseller », « Trusted by 13K+ », « Verified customer », logos de paiement : remplacés par des mentions de démonstration ou omis.
- Colonnes « Autres » des tableaux comparatifs vides, à compléter : rien n'est affirmé sur d'autres marques.
- Chiffres des sections « preuve » = faits de la démonstration (nombre de visuels, d'offres, d'avis fictifs), pas des résultats clients.
- Accent manuscrit remplacé par un italique serif ; typographies « proches », pas identiques.
- Listicle et advertorial Lumora non reproduits (hors liste obligatoire, photographies de personnes).
- Compositions ordinateur : propositions cohérentes, non vérifiées contre les références (captures mobiles uniquement).
- Image `04-detail-gummies.webp` vide dans le kit : emplacement « visuel à importer » explicite.
- Les logos restent des propositions ; le packaging photographié FRAISE garde sa typographie d'origine.
- Contraste texte blanc sur vert vif (ONDE, fidélité à Pawish) : en dessous des recommandations ; à arbitrer avant publication.

## Raccordements à prévoir avec Codex (exports et catalogues)

Aucun fichier de `src/lib/cms-v2/**`, `src/lib/theme/catalog-export.ts` ni `assets/cms/**` n'a été modifié. Pour que les sections et réglages soient réellement éditables après import, les adaptateurs devront connaître :

1. les réglages globaux `conversion_profile` et `cart_*` (schéma `settings_schema.json`, groupe « Panier ») ;
2. les six types de sections `cv-*` (Liquid avec schémas : natifs sur Shopify OS2 ; à mapper vers des blocs/patterns WordPress et des modules PrestaShop) ;
3. le réglage `video_url` et le fichier vidéo des stories, le réglage `image_asset` des offres par quantité ;
4. le panier : les règles d'offres restent côté serveur (`purchase_rules_require_server`) ; le code de réduction du tiroir vise `/discount/<code>` (Shopify) et doit être relié au mécanisme natif de chaque CMS.

Le test d'import par plateforme (modifier un texte et une image, réordonner et dupliquer une section, modifier en-tête et pied de page, ajouter une source vidéo, enregistrer, recharger, panier natif) n'a pas été exécuté dans cette livraison.
