# Thèmes : diagnostic avant correction (consigne du 22 octobre, PR #162, commentaires 6346035265 et 6346173729)

Branche `claude/themes-differenciation`, partie de `main` = `0a6aa1dd` (fusion de #162).

## Versions comparées

| Repère | Version | Accès | Constat |
|---|---|---|---|
| A, thèmes avant intégration | `e9a3e0ba`, tête de #159 | oui | Rendu identique à B : `theme-base/`, `reference-themes.ts`, `directions.ts`, fixtures et médias des démos n'ont pas changé entre A et B. Seuls des fixtures de test de forfait diffèrent. |
| B, `main` | `0a6aa1dd` | oui | 11 démos préparées par `npm run demos:themes` dans une base temporaire (`demo.json` = `0a6aa1dd`). Analyse automatique des pages (fonds, ouverture, images, mots d'autres marques) puis captures 1440 et 390. |
| B′, installation propre de `main` | clone neuf de `0a6aa1dd`, sans kit privé | oui | Reproduit l'installation d'un Codespace qui n'a pas reçu le kit privé. |
| C, studio de Thomas | — | **non** | Cette session n'a aucun accès à son Codespace, à son serveur ni à ses processus. Ce qui est dit de C est donc une **hypothèse**, à confirmer avec la procédure de vérification en fin de document. |

## Matrice

| Défaut signalé | Reproduit où | Cause | Statut de la cause | Correction | Preuve |
|---|---|---|---|---|---|
| FRAISE, ONDE, ORBE et Atelier Rive n'ont pas d'images | B′ (installation propre) | Leurs visuels sont dans le kit privé `public/demo/<id>/`, ignoré par git (`.gitignore`, lignes 27 à 31). Dans un clone neuf, le dossier ne contient que les deux manifestes. La préparation des démos réussit quand même : FRAISE est exportée avec 9 visuels manquants, ONDE avec 11, ORBE avec 9 et Rive avec 12. `prepare-theme-demos.ts` ne contrôle que la présence de `accueil.html`, et la galerie sert ces démos vides comme « prêtes ». | **prouvée** (journal de préparation B′, champ `missing`) | 1) Une démo dont les visuels manquent n'est plus servie comme prête : la galerie dit ce qui manque et comment le copier. 2) Une vérification du kit, avec une procédure de copie. 3) Pour que les images soient présentes dans toute installation, il faut **soit** l'accord de Thomas pour ajouter ces visuels au dépôt (`public/theme-assets/<id>/`, comme les 7 autres thèmes), **soit** la copie du kit dans son Codespace. Cette décision lui revient. | `demos-propre.log`, test `theme-demos-kit` |
| Vignettes de la galerie absentes pour ces 4 thèmes | B′ | `themePreviewPath()` lit `/demo/directions/<id>.jpg`, lui aussi ignoré par git. Les 7 autres vignettes sont suivies dans `public/theme-assets/<id>/apercu-theme.jpg`. | **prouvée** (fichiers absents du clone neuf) | Même décision que ci-dessus. En attendant, la carte n'affiche plus d'image cassée : elle montre le nom du thème et l'état du kit. | contrôle des 11 chemins dans B′ |
| TRAVERSE (sac) montre du texte de SILLON (café) | B (vignette de galerie) et B (démo) | 1) La vignette suivie `public/theme-assets/traverse/apercu-theme.jpg` date du 20 octobre (`fbcf1342`), d'avant la réécriture du 21 octobre. Elle affiche encore « TRAVERSE, du café du matin au quai de départ ». Les 7 vignettes suivies sont toutes antérieures à la réécriture. 2) La démo actuelle garde une section « Du café du matin / au départ du soir » avec « Le café avant le bureau » : un sac présenté par le café se lit comme la machine à espresso de SILLON. 3) Aucune donnée d'une autre démo n'apparaît : l'analyse des 11 démos, toutes pages, ne trouve aucun nom ni produit d'une autre marque. Les seuls mots communs (« lampe », « fauteuil », « montre » au sens du verbe) décrivent les scènes du thème. | 1) et 3) **prouvées** ; 2) interprétation | Vignettes régénérées depuis les démos actuelles, avec la date et le commit enregistrés à côté. Un test vérifie que le titre de la vignette est celui de la démo. Section TRAVERSE réécrite autour de l'acheteur du sac (trajets, week-end), sans le café. | analyse `scan-main.json`, vignette avant/après |
| TRAVERSE montre du texte de café dans le studio de Thomas | C | Hypothèse : un projet client de café, passé sur le thème TRAVERSE, garde son propre texte, ce qui est le comportement voulu. Ou une ancienne démo préparée est servie (elle est remplacée dès que le commit change). | **hypothèse** (C non accessible) | Rien à corriger si c'est le projet du client. Sinon, la procédure de vérification ci-dessous le montre. | — |
| Aucun thème n'a une vraie grande image d'ouverture | B | Sur 11 démos, une seule (SOUPLE) ouvre sur une image pleine largeur à 1440 px. Ailleurs, l'image est encadrée ou réduite : FRAISE 572×572, SILLON 612×383, TRAVERSE 814×814 en carte, ALCÔVE 520×780, MUSEAU 799×450. ORBE, Rive, HEUREN et ONDE ont une image en retrait des bords. Sur téléphone, l'image d'ouverture fait souvent moins de 230 px de haut (SILLON, NOCTIL, MUSEAU). | **prouvée** (mesures de l'analyse, planche « avant ») | Nouvelle ouverture propre à chaque thème (matrice de direction). | planches avant/après |
| Fonds trop proches, pas de vrai blanc | B | 1) 9 démos sur 11 ont un fond crème entre `#EEEAE2` et `#FBF7F2`. Aucune n'a de fond blanc, seules ONDE et NOCTIL sont sombres. 2) Pour un client, `light()` (`src/lib/theme/directions.ts`) remplace le fond prévu par le thème par la couleur claire de la marque dès qu'elle dépasse 94 % de luminosité, ce qui est presque toujours le cas. Un même client a donc le même fond sur les 11 thèmes : ce réglage aplatit les sites. | **prouvées** (couleurs mesurées ; lecture du code) | Le fond de page devient un choix du thème (blanc pour une partie du catalogue, crème, sable, rose poudré, sombre). La couleur claire de la marque reste utilisée pour un fond secondaire. **Changement visible pour les clients : soumis à l'accord de Thomas.** | couleurs mesurées avant/après |
| Les thèmes se ressemblent | B | HEUREN et Atelier Rive ont la même ouverture : composition « journal », grand titre serif à gauche, texte à droite, photo dessous, fond crème. ORBE, ALCÔVE et TRAVERSE partagent le crème et la serif fine. Les profils CSS diffèrent surtout par les couleurs. | **prouvée** (planche « avant ») | Matrice de direction visuelle, appliquée d'abord à HEUREN et Atelier Rive pour validation. | première comparaison |
| Démo de la page d'accueil du site | B′ | `public/demo/manifest.json` (suivi) pointe vers des captures du kit privé, absentes d'un clone neuf. | **prouvée** | Même décision que pour le kit. | — |
| Images du kit, réseau et décodage | B | Aucune image cassée sur les 127 pages des 11 démos (`naturalWidth` > 0 partout). Les quelques `<img>` sans source relevées (FRAISE 2, SILLON 2, NOCTIL 1, TRAVERSE 1) sont des emplacements de stories ou de panier sans image prévue. | **prouvée** | — | `scan-main.json` |
| Thème clair/sombre du studio | B | La démo est affichée dans un cadre (`iframe`) isolé, sur fond blanc. Les jetons clair/sombre du studio ne s'y appliquent pas. | **prouvée** (lecture de `theme-demo-viewer.tsx`) | — | — |

## Vérification de l'installation de Thomas (procédure sans risque)

Dans le terminal du Codespace, depuis le dossier du projet (lecture seule, rien n'est supprimé) :

```bash
git rev-parse HEAD                    # commit servi
ls public/demo/fraise public/demo/onde public/demo/orbe public/demo/rive | head   # kit présent ?
npx tsx scripts/theme-kit-check.ts    # état des visuels de chaque démo (ajouté par cette branche)
```
