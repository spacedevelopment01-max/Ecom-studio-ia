# Préparation9a292acf — résultats incomplets, jamais verdict vert

Source `9a292acfa73719644675fd176a108f5024c0e0de`, avant intégration du main d2fb dans le candidat5a. Reproductions natives achevées : document embarqué illisible →ShopifyDocsError ; deux processus avec racine documentaire fournie →thèmes valides sans accès au cache ni téléchargement ; concurrence0/1/0erreur avec vraie LiquidSyntaxError. JSON et harnais conservés, pas renommés sur5a.

**Exécution trop parallèle : types tué137 et suite Vitest incomplète, sortie1.** Le rapport brut annonce `success=true` mais seulement40réussis sur59,2pending et avertissements « Some tests are still running ». Ce n'est pas une suite réussie. [Synthèse explicite](preparation-incomplete.json), journaux complets joints. La pression mémoire est constatée via les compteursOOM du groupe et les processus tués ; aucun défaut applicatif déduit de cette préparation.

Matrice de cette tête interrompue143 quand Claude publie5a figé ; fragment de journaux conservé localement et métadonnées jointes. Aucun résultat complet205annoncé. Reprise sur5a avec types, tests et matrice séparés, deux workers, mêmes assertions. Aucun code applicatif suivi ni dépendance partagée modifié. Ce dossier constitue l'historique des préparations, pas une preuve APRÈS fusion.
