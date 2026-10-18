# Preuves techniques — ORBE et Atelier Rive avec le pack du 18 octobre 2026

Le rendu final, les huit captures complètes et les interactions correspondent au commit **`563ab003ca1d4ca836738767f898027be24acc59`**. Le harnais fige ce SHA au démarrage et vérifie que HEAD reste identique. Les descendants de documentation ne changent pas ce rendu.

Le dépôt est public et le pack interdit une diffusion publique des images. Ce dossier contient uniquement des mesures, des empreintes et des journaux techniques. Les 24 images sources, les captures, les vidéos et les dix exports contenant ces photos restent privés. Les huit PNG finaux, leurs huit aperçus, deux gros plans et quatre MP4 ont été transmis dans une Page privée explicitement autorisée par le propriétaire. Aucun accès anonyme à ces fichiers n’est annoncé.

## Rapport et mesures

- [Rapport complet, fichiers modifiés, vérifications et limites par CMS](../../../docs/coordination/LOT_2B_ORBE_RIVE_RESULTATS.md)
- [Mesures du navigateur : 16 visites, médias, achats, contact, exports](preuves.json)
- [Finitions, clavier, geste tactile et navigation](widget-checks.json)
- [17 sections des exports Woo exécutées en PHP local](php-exports.json)
- [Theme Check des deux vrais ZIP Shopify : zéro erreur, zéro avertissement](shopify-export-check.json)
- [Décodage et lecture des quatre MP4](video-checks.json)
- [Empreintes des fichiers de preuves privés](empreintes-preuves-privees.json)
- [24 médias sources : dimensions, rôles et empreintes](medias-source-verifies.json)

Les empreintes permettent de comparer les fichiers privés remis au propriétaire ; elles ne rendent pas les images accessibles sur GitHub. Les vidéos sont de vrais enregistrements du navigateur, décodés intégralement, ouverts et inspectés à plusieurs instants.

## Journaux

Les codes ANSI et les espaces de fin de ligne sont retirés de ces copies textuelles ; les résultats et messages sont conservés.

| Vérification | Résultat et journal |
|---|---|
| Types sur le commit final | [sortie 0, journal vide](verification/types.log) |
| Tests ciblés du lot sur le commit final | [44 réussites](verification/tests-cibles.log) |
| Suite générale terminée | [1 990 réussites, quatre dépassements de délai, sortie 1](verification/suite-complete.log) |
| Reprise des quatre cas avec un seul worker sur le commit final | [quatre réussites, 13 cas non sélectionnés](verification/reprises-faible-concurrence.log) |
| Calendrier sur la base distante 077a210 | [réussi en 82,90 s](verification/calendrier-base-077.log) |
| Reprise intermédiaire du calendrier | [dépassement de délai encore présent](verification/calendrier-reprise-intermediaire.log) |
| Vérification complète des thèmes | [137 cas réussis](verification/theme-check-complet.log) |
| Compilation | [réussie, 49 pages statiques](verification/compilation.log) |
| Preuves finales du navigateur | [exécution réussie](verification/preuves-navigateur.log) |
| Navigation et tactile | [exécution réussie](verification/navigation-tactile.log) |
| PHP local | [exécution réussie](verification/php.log) |
| ZIP Shopify réels | [exécution réussie](verification/shopify-exports.log) |
| Lecture des vidéos | [exécution réussie](verification/lecture-videos.log) |

La suite générale, la compilation et les 137 cas de thème ont été exécutés avant la dernière retouche du ratio CSS et des métadonnées du jeu de démonstration. Les types, 44 tests ciblés, quatre reprises, preuves navigateur et contrôles des exports finaux ont ensuite été exécutés sur `563ab00`. La suite générale ne doit pas être déclarée verte ; la contention reste une hypothèse et aucune cause du calendrier n’est démontrée.

Les sessions et données sont isolées ; aucun appel IA payant n’a été effectué. L’aperçu a été réellement exercé. Les installations CMS, remises/cadeaux au checkout, paiements et réception des contacts externes restent non vérifiés. Aucun merge ni déploiement.
