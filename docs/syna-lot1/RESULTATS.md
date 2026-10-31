# SYNA lot 1 : résultats des vérifications

Toutes les vérifications ont été faites en local, sur des bases temporaires isolées contenant deux projets fictifs
(SILLON, boutique ; TABLE SAISON, restaurant). **Aucune clé d'IA, aucun message envoyé à SYNA, aucun fournisseur
appelé.** Vue d'ensemble : [`captures/planche-lot1.jpg`](captures/planche-lot1.jpg).

## 1. Tests exécutés

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | aucune erreur |
| `tests/syna-lot1-shell.test.ts` (16 tests, vrai rendu React) | réussi. Couvre : fermée par défaut, retour arrière, espaces et adresses (boutique et restaurant), **même ensemble d'espaces que l'interface actuelle**, pastilles, espace actif, plus de pastille noire, drapeaux fermés = aucun accès, interface actuelle intacte, une seule conversation réutilisée, barre du téléphone, attributs Encre, feuille de style enfermée |
| Tests du lot 0 (`tests/syna-lot0-*.test.ts`) | réussis. Le garde-fou d'isolement autorise désormais la coquille et la mise en page du projet, et rien d'autre |
| Tests existants qui lisent le menu ou le Studio (`plan-studio`, `fenetres-studio`, `contenus-api`, `publications-organisation`, `section-masquee-menu`, `hooks-avant-retour`) | réussis |
| `next build` (production) | réussi |
| Suite complète `npx vitest run` | non relancée pour le lot 1 : elle dure plus de 30 minutes dans ce conteneur. Sur le lot 0 : 4 528 réussis, 1 échec dû à l'environnement (Chromium absent de `/usr/bin/chromium`). La CI de la PR fait foi |

## 2. Recette dans un vrai navigateur (`scripts/syna-lot1-recette.ts`)

Le Studio est lancé deux fois. A : coquille et SYNA visibles. B : coquille avec les drapeaux SYNA fermés. Rapport
complet dans `captures/recette/recette.json`. **26 vérifications sur 26 réussies :**

| Vérification | Résultat |
|---|---|
| 24 captures (ordinateur 1440, tablette 1024, téléphones 390 et 360 ; clair et sombre ; Boutique, Images, Carte) | coquille affichée partout, **aucune pastille noire**, onglet signature à l'ordinateur et à la tablette, onglet Syna au téléphone |
| Débordement horizontal, erreurs JavaScript | 0 et 0 |
| Contraste **mesuré** des textes de la coquille | aucun sous le seuil AA (minimum 5,16:1) |
| Les 23 adresses d'espaces (19 du projet boutique, 4 du restaurant) | toutes répondent dans la coquille, avec leur titre |
| Menu | un clic ouvre l'espace (lien profond), l'espace actif est annoncé |
| SYNA à l'ordinateur | s'ouvre au clavier, en colonne à côté de l'espace (non modale) ; Échap la replie et rend le focus à l'onglet signature |
| Conversation | jamais recréée après fermeture ni après changement d'espace : son état et tout brouillon sont conservés (voir la limite plus bas) |
| Bulle « Première visite ? » des tutoriels | ne recouvre plus la colonne SYNA ouverte |
| SYNA à la tablette | panneau modal, le focus reste dedans, Échap le ferme |
| SYNA au téléphone | s'ouvre au-dessus de la barre basse, qui reste visible |
| Feuille « Espaces » au téléphone | suit la règle des métiers ; ses liens sont au premier plan ; choisir un espace l'ouvre et referme la feuille |
| Feuille « Suivi » | montre les tâches réelles (ici aucune) et annonce que le suivi complet arrive au lot 2 ; Échap la ferme |
| Cibles tactiles de la barre basse | toutes ≥ 44 px |
| Animations réduites | le panneau apparaît sans animation |
| Retour arrière | « Interface actuelle » rend l'interface d'origine, pastille comprise ; « Nouvelle interface » rend la coquille |
| Clavier | chaque arrêt de tabulation dans le menu de la coquille montre un anneau de focus |
| Drapeaux SYNA fermés (ordinateur, téléphone) | coquille sans aucun accès ni panneau SYNA |
| Réseau | **aucune requête hors du serveur local** |

## 3. Studio inchangé sans la variable d'activation (`scripts/syna-lot0-non-regression.ts`)

`main` (`37fcfd25`) et la branche du lot 1 ont été lancés tour à tour sur la même base, **sans `STUDIO_SYNA_SHELL`**,
avec le panneau SYNA actuel affiché (drapeaux d'interface sur ce serveur local seulement). **18 captures sur 18 sont
identiques au pixel près** : connexion, accueil du Studio, Pilote, Boutique avec l'aperçu du site du client,
Catalogue, Images, Marque, Boutique et Carte du restaurant, à l'ordinateur et au téléphone. Elles sont dans
`captures/non-regression/`.

## 4. Défauts trouvés et corrigés pendant la recette

1. **Feuille « Espaces » au téléphone** : le voile sombre passait au-dessus de la feuille ; un toucher sur un espace
   l'aurait refermée sans l'ouvrir. Corrigé (ordre d'empilement), et la recette vérifie désormais que rien ne recouvre
   les liens.
2. **Échap** ne rendait pas le focus à l'onglet signature (le bouton est remplacé pendant que la colonne est ouverte).
   Corrigé.
3. **Bulle des tutoriels** posée sur la colonne SYNA ouverte. Corrigé : elle se place à sa gauche.
4. En-tête trop chargé quand SYNA est ouverte, et titre sur deux lignes au téléphone. Corrigé : l'état du projet va
   dans la ligne du titre ; la langue et le thème vont au pied du menu (ordinateur).

## 5. Limites et non vérifié

- **Conversation d'un projet existant** : sur `main`, le serveur refuse encore d'ouvrir le dialogue d'un projet
  existant (« La migration de ce projet existant n'est pas raccordée au lot A »). Cela relève de la reprise A1 de
  Codex, non fusionnée, et le comportement est identique dans l'interface actuelle. Le panneau ne montre donc pas de
  zone de saisie pour ces projets. La conservation du brouillon est prouvée par le fait que le panneau n'est jamais
  recréé, pas par la saisie d'un vrai message.
- La conversation elle-même (contenu du panneau) n'a pas été restylée : c'est le composant actuel, réutilisé tel quel
  (fichier également modifié par Codex en #286).
- Lecteur d'écran réel, appareils physiques, rotation, clavier virtuel ouvert, Safari et Firefox : non essayés.
- Projets en anglais : libellés bilingues prévus et repris de l'interface actuelle, mais pas capturés.
- Mode Plein cadre, préférences de compte et de projet, sélecteur, raccourci : **lot 1 bis, non fait**.
- Suivi complet (historique, preuves, annulation) : **lot 2, non fait** ; la feuille Suivi le dit.

## 6. Retour arrière

- Sur une installation : retirer `STUDIO_SYNA_SHELL` (le Studio redevient l'interface actuelle au chargement suivant).
- Pour une personne : « Interface actuelle » (cookie sur l'appareil).
- Dans le code : annuler le commit du lot 1. `shell.tsx` ne change qu'en ajoutant des `export` et une entrée facultative.
