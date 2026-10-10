# Logos complets par l'IA d'images (Brand & Logo Engine V2)

Branche `claude/ecom-studio-ia-platform-8cwl79`. **Aucun appel payant** : tous les tests utilisent des fournisseurs simulés. Les images des captures sont dessinées par le script : ce ne sont pas des logos produits par une IA.

## Ce qui empêchait la créativité (et ce qui change)

| Avant | Maintenant |
|---|---|
| L'IA d'images devait dessiner « une forme noire pleine, sans lettre, sans texture, sans dégradé ». | L'IA d'images dessine le **logo complet** (symbole, nom, ligne d'activités) dans le style de la direction. |
| Le dessin était vectorisé ou redessiné en 1 à 3 formes SVG simples. | L'**image originale haute définition** est le livrable principal. Une version SVG n'est proposée que si elle reproduit fidèlement le dessin (≥ 96 % des pixels). |
| Une maison, un toit, un rouleau… étaient refusés d'office (liste de mots). | Un objet du métier est **permis** s'il est bien intégré. Seule la relecture du dessin écarte un cliché **maladroit** (icône de banque d'images). |
| Contrôle identique pour tous : noir seul, 24 px. | Contrôle **adapté au style** : la texture, les couleurs et les dégradés ne sont pas des défauts ; la lisibilité est jugée aux tailles prévues. Une version simplifiée sert aux favicons, tampons et broderies. |
| Aucun choix de style. | Le client choisit : **illustré, minimaliste, typographique, monogramme, emblème, texturé, dégradés, premium**, ou « laisser l'IA proposer plusieurs styles ». |
| Les consignes envoyées à l'IA citaient des exemples d'un projet (toit, pinceau, initiales mêlées, enduit, « PLÂTRERIE • PEINTURE… »). | **Consignes neutres** : rien n'est imposé (ni forme, ni objet, ni initiales, ni texture, ni composition). L'IA analyse chaque marque et choisit sa direction. Les seuls exemples d'objets cités viennent du métier analysé du projet lui-même. Un test le vérifie sur trois marques différentes, et contrôle aussi les sources des générateurs de logos. |

## Fonctionnement

1. **Directions** : une demande au directeur artistique (IA de texte). Chaque direction a un style, et 3 axes au moins diffèrent entre deux directions. Le minimalisme n'est pas privilégié.
2. **Dessin** : **3 créations par série**, une seule image payée chacune, par le modèle choisi pour « Logos » dans Administration › Images & Vidéos. Ce modèle doit savoir écrire du texte dans l'image (par exemple OpenAI GPT Image 1). Sinon, 4 logos sont construits avec de vraies polices, et c'est écrit dans les notes de la série.
3. **Relecture** : critères pondérés selon le style (pertinence, originalité, exécution du dessin, typographie, composition, lisibilité aux tailles prévues, mémorisation, usages). La barrière est inchangée : **8/10**, nom exact, aucun texte inventé. La note n'est jamais relevée (testé).
4. **Nom mal écrit** : le studio efface la zone du nom indiquée par la relecture et le réécrit avec une vraie police, dans la couleur trouvée sur place. **Le dessin n'est pas touché** (testé pixel par pixel), et l'original de l'IA est gardé à part. C'est gratuit : aucune image n'est regénérée.
5. **Aucune nouvelle image sans accord** : un logo sous la barrière n'est pas redessiné automatiquement. Il reste visible avec son image originale et ses défauts. Le client peut :
   - le choisir quand même, si le nom est exact (marqué « non validé par le contrôle ») ;
   - demander une « Nouvelle version » : une image, coût confirmé, avec ses remarques. La version précédente reste.
6. **Après le choix** :
   - logo original en logo principal ;
   - version pour fond sombre (encre passée en blanc, couleurs gardées), noir seul et blanc seul ;
   - version simplifiée (initiale, vectorielle) et favicon ;
   - SVG seulement s'il est fidèle ;
   - typographie des titres, boutique mise à jour, **planche d'identité** et charte.
7. **Textes** :
   - **slogan** écrit dans le logo seulement s'il est validé par le client ; sinon il est affiché comme « proposition à valider » ;
   - **ligne d'activités** limitée aux activités réelles du projet (une activité inventée est retirée) ;
   - si le **nom de marque change** après le choix, il est réécrit dans le logo, sans nouvelle image.

L'ancien générateur séparé de « logos complets » est remplacé par ce moteur. Les logos déjà créés avec lui restent visibles et utilisables.

## Coûts et sécurité

- **Devis avant tout appel payant.** Le bouton « Créer les directions » affiche d'abord le montant maximal de la série. Ce montant comprend :
  - la demande des directions ;
  - les 3 images, au coût maximal calculé exactement comme la réservation faite avant chaque image ;
  - 2 relectures par création (dont la relecture après une reprise du nom).

  « Nouvelle version » affiche aussi son propre devis (une image et ses relectures).
- **Le devis est le plafond.** Il est enregistré avec la tâche. Avant chaque appel payant, le studio vérifie que dépense déjà faite + coût maximal de l'appel ≤ plafond ; sinon l'appel ne part pas, et la série s'arrête proprement. Une image déjà payée dont la relecture est bloquée est gardée comme essai. Le devis du Pilote (étape « logo ») utilise le même calcul : les deux ne peuvent pas diverger.
- Chaque image passe en plus par la réservation de son coût maximal dans le budget du compte (plafonds de 40 % et 50 % HT).
- Toute image payée reste conservée (`storage/ai-originals/…`, déjà en place), et les essais écartés gardent leur image.
- Le forfait Découverte reste sans IA : la « Nouvelle version » est refusée (403), et le logo est construit localement.
- Les plafonds de 40 % HT (abonnements) et 50 % HT (recharges) ne sont pas modifiés (aucune modification de la facturation). Forfaits, prix et page d'accueil ne sont pas modifiés. Les projets existants ne sont pas modifiés.
- Changement de politique qualité : nouveau livrable `logo_artwork` (version des politiques `2026-10-p11b`).

## Tests (fournisseurs simulés)

- `tests/logo-v2-artwork.test.ts` (14 parcours) :
  - styles illustré, minimaliste et typographique (demande au style, plus de « formes noires / sans lettre ») ;
  - fond blanc retiré même sur une image « opaque » avec canal alpha (sans effacer un blanc voulu d'un logo transparent) ;
  - style choisi par le client ;
  - original conservé à l'octet près ;
  - contrôle adapté au style, et 7/10 refusé sans nouvelle image ;
  - nom réécrit sans toucher au dessin ;
  - reprise de tâche sans rien repayer ;
  - SVG fidèle ou rien ;
  - déclinaisons, version simplifiée et planche ;
  - choix d'un logo écarté par le client, mais jamais avec un nom faux ;
  - slogan validé uniquement, activités réelles ;
  - nouvelle version à la demande ;
  - nom de marque modifié ;
  - absence de modèle d'images capable d'écrire.
- `tests/logo-budget.test.ts` (vraie chaîne de paiement, fournisseurs simulés) :
  - série de 3 logos complets avec une reprise (nom réécrit) : dépense réelle ≤ devis, aucune réservation en attente ; devis du Pilote = devis du moteur ;
  - plafond plus bas que le devis : les images suivantes ne partent pas et ne sont pas réservées ; chaque image payée est gardée ;
  - « Nouvelle version » : une seule image, sous son devis ;
  - Découverte : aucun appel (ni texte, ni image).
- `tests/logo-v2-artwork.test.ts` : en plus, « aucune consigne d'une marque devenue règle » (3 marques, sources des générateurs).
- `tests/logo-v2-route.test.ts` : style transmis à la tâche ; « Nouvelle version » réservée aux logos complets et refusée en Découverte ; nom faux jamais choisi.
- Tests adaptés :
  - `logo-v2.test.ts` : l'objet du métier n'est plus refusé d'office ;
  - `migration-v2.test.ts` : l'ancien générateur renvoie 410 ;
  - `seo-v2.test.ts` : version des politiques.

## Captures

- `reports/screenshots/logo-artwork/panneau-logo-ordinateur.png`, `panneau-logo-telephone.png` : panneau Logo avec images simulées (script `scripts/screens-logo-artwork.ts`).
- `reports/screenshots/logo-artwork/planche-identite.png` : planche d'identité produite par le moteur à partir d'une image simulée. Les couleurs affichées sont celles de la palette du projet de démonstration (l'image simulée ne les suit pas ; une vraie IA reçoit la palette dans sa demande).
- Vérifié dans le navigateur (version de production) : 0 erreur JavaScript, 0 px de débordement sur téléphone (un débordement de 104 px dû au sélecteur de style et aux boutons a été trouvé puis corrigé).

## Limites connues

- **Non vérifié avec une vraie IA** : la qualité réelle dépend du modèle choisi (OpenAI GPT Image, Gemini…). Le premier essai réel demandera votre accord.
- La réécriture du nom suppose que la relecture situe bien le nom. Si le nom se mêle au dessin, la relecture suivante le refusera : rien ne sera livré abîmé.
- La version simplifiée est une initiale construite par le studio, pas un recadrage du symbole de l'IA.
- Le devis des relectures suppose le modèle de texte habituel pour chaque tâche. Si le routage choisit un modèle plus cher, le plafond peut arrêter la série plus tôt, mais jamais la faire dépasser.
- Les couleurs d'un logo complet ne sont pas recolorées automatiquement quand la palette change : elles font partie du dessin.
