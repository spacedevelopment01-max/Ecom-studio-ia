# ORBE / Atelier Rive — vérifier soi-même la livraison (branche `claude/orbe-rive-direction-artistique`)

Procédure reproductible pour lancer les deux démonstrations avec leurs données et les 24 photographies autorisées, puis dérouler les parcours de vérification. Aucun secret à fournir, aucun appel IA, aucune dépense. Les photographies restent sur le poste : elles ne sont jamais ajoutées au dépôt.

**Commit testé** : `[TESTED_COMMIT]` (champ `testedCommit` de [`reports/lot2b-da/preuves.json`](../../reports/lot2b-da/preuves.json)).

## 1. Prérequis

| Besoin | Détail |
|---|---|
| Node.js 22 et npm | `npm ci` à la racine du dépôt |
| Le pack `ORBE_RIVE_2026-10-18` extrait | dossier `images/` contenant `orbe/*.webp` et `rive/*.webp` (24 fichiers, SHA-256 dans `SHA256SUMS`) |
| Pour les preuves automatisées seulement | Chromium (`CHROMIUM=/chemin/chrome`) et `ffmpeg` pour les vidéos |

Aucune clé d'API n'est nécessaire : les démonstrations sont des données locales, le réseau des fournisseurs n'est pas sollicité.

## 2. Installer les démonstrations dans un studio local

```bash
npm ci
npm run setup                      # première fois : .env.local (APP_SECRET aléatoire) et base SQLite dans ./data
npx tsx scripts/lot2b-demo-local.ts <pack>/images            # compte demo-lot2b@example.invalid, créé si absent
npm run dev                        # studio sur http://localhost:3000
```

Le script affiche, pour ORBE et pour Atelier Rive : l'adresse du projet dans le studio, l'adresse d'aperçu de l'accueil et de la fiche produit ou de la prestation, le nombre de médias trouvés (12/12 attendu pour chacun) et, à la première exécution, le mot de passe du compte de démonstration. Les liens d'aperçu signés valent 12 heures ; l'onglet Boutique du studio en régénère. Le panier d'aperçu vit en mémoire du serveur et se vide au redémarrage.

Pour un compte existant : `npx tsx scripts/lot2b-demo-local.ts <pack>/images vous@exemple.fr` (les projets sont créés chez ce compte, son mot de passe n'est pas modifié).

## 3. Parcours de vérification manuels

Largeurs conseillées : 1440, 1024, 768 et 390 px (outils de développement du navigateur, mode appareil pour 390 px).

### Accueil ORBE
1. Ouverture immersive : lampe entière, texte lisible sur la zone calme, aucun rectangle clair ; sur mobile, titre puis texte, bouton, photo.
2. Section « Produit à la une » (troisième section) : chaque finition change le grand visuel et la vignette active ; socle de la lampe entier pour Dune, Argile et Charbon ; offres 1 / 2 / 3 / 4 → 79,00 / 142,20 / 201,45 / 252,80 € ; pochette débloquée à partir de 3 ; prix « 79,00 € par lampe » ; récapitulatif « Total · Le duo — 71,10 € par lampe × 2 ».
3. « Ajouter au panier » depuis l'accueil → page panier au bon total ; « Voir la fiche complète » conserve finition et offre choisies.

### Fiche produit ORBE
4. Prix principal « 79,00 € par lampe » ; offres, variante par article, cadeau, total, prix par article.
5. Trio avec trois finitions différentes (Dune, Argile, Charbon) → panier : **chaque ligne montre le visuel de sa finition**, puis la pochette offerte. Vérifier aussi le tiroir du panier (icône en haut à droite) et le rechargement de la page.
6. Modifier une quantité (bouton « Mettre à jour ») : total recalculé côté serveur, cadeau retiré sous le seuil, visuels conservés ; supprimer les lignes → panier vide.
7. À 390 px : barre d'achat fixe quand le bouton principal sort de l'écran ; elle affiche finition, « … € par lampe » et « Total … € » ; son bouton ajoute réellement la sélection ; sans sélection complète, il mène aux options.

### Atelier Rive
8. Accueil : titre d'ouverture sur trois lignes maîtrisées (ordinateur) ou retours naturels (mobile) ; chapitres des prestations qui changent l'image ; étude en deux vues annoncée comme simulation ; FAQ.
9. Prestation : titre « Repensons la pièce que vous vivez le plus. » lisible à 390 et 768 px ; formulaire → « Demande de test enregistrée. Aucun e-mail envoyé. » ; pieds de page sans logo répété.

### Dans le studio (édition)
10. Onglet Boutique → sélectionner la section « Produit à la une » : modifier son titre, son libellé de prix unitaire ou son nombre d'images ; déplacer la section ; enregistrer puis rouvrir le projet : la version est conservée et l'aperçu la reflète.
11. Les offres se modifient sur la fiche produit (source commune) : un changement de prix de lot y est repris par l'accueil.

Accessibilité : navigation au clavier (vignettes, offres, zoom fermé par Échap, menu mobile) et préférence « réduire les animations » (aucune animation active).

## 4. Preuves automatisées (mêmes routes que le studio)

```bash
CHROMIUM=/chemin/chrome npx tsx scripts/lot2b-da-proof.ts <dossier-privé> <pack>/images
# PROOF_VIDEO=0 pour sauter les vidéos ; PROOF_WIDTHS=1440,390 pour accélérer
```

Base temporaire isolée, réseau fournisseur interdit. Le script vérifie 16 visites (4 pages × 4 largeurs : débordement, H1 unique, images cassées, médias manquants, erreurs JavaScript), la scène du produit à la une pour chaque finition, les montants 1 / 2 / 3 / 4, le cadeau et son indisponibilité à stock nul, le prix « par lampe » (fiche, section, barre), l'ajout depuis l'accueil, la fiche et la barre mobile, les visuels des variantes dans le panier (page, tiroir, `cart.js`, après rechargement, après modification de quantité), la suppression, le formulaire Rive, le menu mobile, le mouvement réduit ; il produit les captures, les vidéos (parcours complets et panier à trois finitions) et `preuves.json`.

## 5. Résultats effectifs sur le commit testé

| Contrôle | État | Détail |
|---|---|---|
| `npx tsc --noEmit` | réussite | sortie 0 |
| `npx vitest run tests/lot2b-featured.test.ts tests/lot2b-editorial.test.ts tests/themes-catalogue.test.ts tests/theme-en.test.ts tests/theme.test.ts` | réussite | 40 tests, 5 fichiers |
| `scripts/verify-theme.sh --rapide` | réussite | 25 cas, zéro erreur, ZIP client valide |
| `scripts/verify-theme.sh` complet (`JOBS=2`) | réussite | 137 cas, zéro erreur Theme Check, ZIP client valide (fichiers de thème identiques entre `3f8abb78` et le commit testé) |
| `scripts/lot2b-da-proof.ts` complet (4 largeurs, vidéos) | réussite | 16 visites, 24 médias, visuels du panier, « par lampe », ajouts, modifications, suppression, formulaire, menu, mouvement réduit ; `preuves.json` |
| `scripts/lot2b-demo-local.ts` (base temporaire) | réussite | deux projets, 12/12 médias chacun, adresses produites |
| Suite complète `npm test` en local | non exécutée | prise en charge par la CI |
| CI GitHub sur `be81697a` (tête précédente) : « Typecheck, tests, Theme Check, build » et « Image Docker » | réussite | les deux contrôles terminés avec succès |
| CI GitHub sur le commit testé | [CI_NEW] | relevée au moment de la rédaction |
| Manipulation indépendante par le reviewer | non exécutée | c'est l'objet de la procédure ci-dessus |
| Exports installés sur un CMS | non exécuté | hors périmètre de cette mission |

## 6. Limites

- Le reviewer doit disposer du pack d'images : sans lui, les pages affichent des cadres « Visuel à importer » et les preuves se déclarent incomplètes.
- Les exports CMS (Shopify, WooCommerce, PrestaShop, Wix, Squarespace) sont générés mais **non installés** : remises et cadeaux y restent désactivés (`purchase_rules_require_server`) ; ils ne sont pas déclarés opérationnels sur les CMS.
- La consolidation avec le travail Codex et le test complet dans le studio (édition par chat, sauvegarde/réouverture systématique, exports) relèvent de l'étape suivante annoncée dans la revue.
