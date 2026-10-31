# SYNA lot 0 : résultats des vérifications

Toutes les vérifications ont été faites en local sur la branche `claude/syna-lot0-fondations`, à partir de `main`
à `37fcfd25`. Aucun appel IA, aucun fournisseur, aucune donnée réelle.

## 1. Tests exécutés

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | aucune erreur |
| `tests/syna-lot0-tokens.test.ts` : jetons de syna.css identiques à `tokens.ts` ; contraste de 312 couples (2 modes × 2 apparences × 3 bleus) | réussi : texte ≥ 4,5:1, contours ≥ 3:1 |
| `tests/syna-lot0-scope.test.ts` : tout sélecteur passe par `.syna-ui` ; rien sur html, body ou :root ; polices « Syna … » présentes avec leur licence ; seule la vitrine importe les primitives ; `globals.css` sans rien de SYNA ; primitives sans requête, sans stockage, sans euro ; vitrine fermée en production | réussi |
| `tests/syna-lot0-preferences.test.ts` : défauts, Plein cadre → cobalt et 420 px, projet > compte > défaut, valeurs invalides ignorées, largeur 360–560 px au pas de 20, « rétablir » | réussi |
| `tests/syna-lot0-components.test.ts` : vrai rendu React des primitives (FR / EN, rôles et libellés d'accessibilité, devis, dépassement de budget, accès à SYNA, coquille au balisage identique dans les deux modes) | réussi |
| Tests existants qui parcourent tout le code (`hooks-avant-retour`, `idempotence-reprise`, `openai-streaming`, `routage-usages`, `brain-moteurs-2c`) | réussis (81 tests au total avec ceux du lot 0) |
| `next build` (compilation de production) | réussi ; la vitrine est une page à part (`/syna-fondations`, 11,7 kB) |
| Production (`next start`) | `/syna-fondations` renvoie 404 ; la feuille de style partagée par `/connexion`, `/` et `/inscription` ne contient rien de SYNA (les styles SYNA vivent dans un fichier séparé, chargé seulement par la vitrine) |
| Suite complète `npx vitest run` | voir le compte rendu de la PR : elle dure plus de 25 minutes dans ce conteneur (environ 1 min 15 sur une machine normale) |

## 2. Vitrine dans un vrai navigateur (`scripts/syna-lot0-captures.ts`)

Quatre tailles (téléphone 360 et 390, tablette 1024, ordinateur 1440) × deux modes × deux apparences, soit 16 pages
(`captures/vitrine/`, rapport détaillé dans `captures/vitrine/rapport.json`).

| Contrôle | Résultat |
|---|---|
| Débordement horizontal | 0 sur les 16 pages |
| Erreurs JavaScript | 0 |
| Polices du mode affiché chargées | toutes |
| Contraste **mesuré** sur chaque texte visible (couleur calculée contre le fond réel) | 0 texte sous le seuil. Minimum : Encre clair 4,96:1, Encre sombre 6,59:1, Plein cadre clair 4,73:1, Plein cadre sombre 5,52:1 |
| Clavier : 40 arrêts de tabulation | chacun avec un anneau de focus visible (la zone de saisie l'affiche sur son cadre) |
| Cibles tactiles au téléphone (pointeur au doigt) | 0 bouton sous 40 px ; les boutons principaux font 44 px |
| Animations réduites demandées par l'appareil | icône « en cours », barre indéterminée et fil de la carte : animations coupées, affichage statique lisible |
| Bascule Encre → Plein cadre → Encre (390 et 1440 px) | le brouillon tapé, l'élément désigné, la tâche en cours, l'adresse et la page restent identiques |

## 3. Écrans actuels inchangés (`scripts/syna-lot0-non-regression.ts`)

Même base temporaire (SILLON et TABLE SAISON), même compte : `main` puis cette branche, lancés tour à tour. Neuf pages
à l'ordinateur et au téléphone : connexion, accueil du Studio, Pilote, Boutique (aperçu du site du client), Catalogue,
Images, Marque, Boutique et Carte de TABLE SAISON. Le panneau SYNA actuel est affiché sur ce serveur local seulement,
avec ses drapeaux d'interface et sans aucune clé d'IA, pour comparer aussi la pastille actuelle.

**Résultat : 18 captures sur 18 identiques au pixel près** (`captures/non-regression/`, `comparaison.json`),
0 erreur JavaScript. La pastille noire actuelle est toujours là : son remplacement appartient au lot 1 / 1 bis.

Aucun fichier existant n'est modifié par le lot (seulement des fichiers neufs). En particulier, ce lot ne touche ni
`shop.chat`, ni les thèmes, ni les exports ZIP, ni les droits des forfaits, ni les devis, ni les fournisseurs, ni le
panneau SYNA (`conversation-panel.tsx`).

## 4. Non vérifié

- **Lecteur d'écran réel** (VoiceOver, NVDA) : non essayé. Les rôles et les libellés sont vérifiés dans le code et
  par les tests.
- **Appareils physiques** (iPhone, Android, iPad) et rotation de l'écran : non essayés. Les tailles ont été simulées
  dans Chromium.
- **Clavier virtuel ouvert au téléphone** : non simulable ici. Les champs utilisent un texte de 16 px pour éviter le
  zoom automatique d'iOS.
- **Contraste forcé (Windows)** : des règles sont prévues, mais elles n'ont pas été capturées.
- Safari et Firefox : non essayés (Chromium seulement).
- Rien n'est branché : la bascule réelle dans le Studio, l'enregistrement des réglages et l'accès à SYNA dans les
  écrans relèvent des lots suivants.

## 5. Suggestions pour la suite (à valider, non faites)

1. **Lot 1** : brancher `SynaScope` sur l'écran du projet. L'onglet signature (Encre) et la barre de commande
   (Plein cadre) y remplaceraient la pastille noire. Le contenu actuel du panneau et le moteur de Codex resteraient
   inchangés.
2. **Lot 1 bis** : enregistrer les réglages (compte, puis projet) côté serveur, avec une copie locale pour l'affichage
   immédiat. Ajouter le panneau « Personnaliser l'interface » et le raccourci Ctrl Maj M.
3. Au téléphone, en Plein cadre, limiter la feuille de conversation à 58 % de la hauteur (c'est le cas dans la
   vitrine). Vérifier sur un vrai appareil, clavier ouvert, que la barre de commande reste visible.
4. Dans une carte étroite, les états de chaque étape pourraient n'afficher que leur icône, le mot restant lu par les
   lecteurs d'écran. Ce changement visible est à décider par le propriétaire.
