# Contre-vérification APRÈS fusion — main final a2d00fcb

**SHA contrôlé : `a2d00fcbc5c2bdf7d7712a8d34373854dc953619`. Arbre : `11b3cea9e26ce9eea7b81d7ca6eb3412c4cc21c2`.** Gel final annoncé par Claude après ses fusions de #202 et #203. Nouvelle copie détachée, nouveaux types/build, nouveaux comptes et données fictifs. Les résultats du candidat 51275 et du main intermédiaire e91 restent dans leurs propres dossiers.

**Verdict : FAVORABLE APRÈS FUSION, dans le périmètre technique vérifié.** Tous les contrôles locaux et la **CI push du SHA final** sont réussis. [Verdict structuré](verdict.json). Les limites réelles ci-dessous ne sont pas transformées en validations.

## Identité et préservation

[Identité et empreintes Git](identite.json). Entre e91 et ce main, seul `docs/coordination/FUSION_GLOBALE_2026-10-25.md` change. Tout le code applicatif est identique au candidat approuvé `51275d063b6ee93301ea20438a9ee6100515e3f5`. `theme-base`, `public`, les composants Studio/Catalogue, le verrou, le wrapper complet et les instructions sont inchangés depuis d2fb. Aucune source applicative suivie modifiée par cette contre-vérification. Aucun travail de Claude remplacé.

## Exports depuis le Studio compilé : réellement exécutés

- Types puis build de cette copie : **sorties 0**, 58 pages ; aucune alerte `createRequire` détruit par Webpack. [Types](types.log), [build](build.log).
- **Nouveau test officiel**, avec la seule garde réseau native, sans double de transport : version **a2/compiled-build**, export HTTP 200, **Theme Check mesuré à 0 erreur / 35 avertissements**, aucune indisponibilité. [Résultat](smoke-officiel/resultat.json), [journal](smoke-officiel.log).
- **Harnais indépendant**, vrai compte de rôle client et abonnement fictifs : produit cosmétique `products` et Atelier Rive explicitement `services`. Studio ouvert à **1440/390**, introduction fermée et onglet Aperçu sélectionné par les gestes normaux ; quatre captures réellement ouvertes et inspectées, aucun JavaScriptError.
- Pour chaque projet : vraie route locale d'export Shopify HTTP 200, compatibilité mesurée, version correcte, puis **téléchargement du ZIP sauvegardé HTTP 200 / SHA256 identique**. ThemeSpec complet et liste des versions strictement inchangés. **0 appel IA enregistré**. [Résultat complet](production/parcours-production.json), [version servie](production/version-compilee.json), [captures](production).
- **Témoin négatif sur le même build** : copie documentaire isolée, seul `preset.json` rendu illisible par simulation, original du SDK intact. Le nouveau test officiel sort **1 comme attendu**, affiche **« Theme Check arrêté »**, compteur non mesuré ; jamais un faux 0 ni « outil indisponible ». La réponse HTTP 200/provisoire ne suffit donc pas à faire passer le test. [Résultat](smoke-doc-illisible/resultat.json), [journal](smoke-doc-illisible.log).

[Synthèse des assertions compilées et traces](controles-compiles.json), [commandes](COMMANDES.md), harnais récupérables dans ce dossier. La garde refuse les transports externes ; les sondes refusent aussi les téléchargements documentaires et l'ancien cache partagé du SDK. Les traces positives attestent l'import du vérificateur, 0 requête documentaire et 0 accès à ce cache.

L'export est honnêtement **PROVISIONAL / static**. Il ne devient pas une installation Shopify certifiée : aucune boutique distante ni transaction réelle n'est testée. Le texte « 429 » du témoin négatif est simulé ; aucun statut HTTP 429 historique n'est observé ici.

## Les 35 avertissements restent visibles

Le CLI natif du main final renvoie **exactement les mêmes 35 tuples contrôle/fichier/ligne/message** que le candidat : [preuve](avertissements-identiques.json), [journal](theme-check.log). Le code des sections est identique ; [analyse détaillée des 35 avertissements](../51275d06/AVERTISSEMENTS.md), inventaire et contrôles complémentaires conservés dans le dossier candidat.

| Nombre | Contrôle | Conclusion conservée |
|---:|---|---|
| 25 | ExcessiveSettingsCount | 41–85 réglages, recalculés dans les schémas ; seuil heuristique recommandé 40, pas une limite d'installation Shopify démontrée ici. Suivi d'ergonomie, sans supprimer de champs. |
| 6 | UnusedAssign | Affectations non consommées : maintenance, sans panne de contenu démontrée par ce signal seul. |
| 2 | UnclosedHTMLElement | Colonnes conditionnelles `ap-form` : quatre rendus natifs contact/devis, vides/remplis, contrôlés sur le HTML brut et équilibrés. Pas une certification HTML générale. |
| 1 | RemoteAsset | Image cachée du zoom FRAISE initialement vide, renseignée par JavaScript avant affichage ; pas de domaine tiers littéral à cet endroit. CMS/CDN réel non testé. |
| 1 | LiquidComplexity | Indice statique 121/120, dette de maintenance, pas une mesure de latence. |

Aucun seuil relevé, règle désactivée, avertissement effacé, section retirée ou thème recomposé. La bibliothèque exportée comprend des sections non affichées sur la page courante ; 35 avertissements ne signifie pas 35 pannes visibles. L'absence d'erreur technique ne prouve pas la qualité créative du site.

## Suite générale et CI finale

**Suite exhaustive du SHA final terminée : 3 409 tests réussis, 0 échec, 31 ignorés, sortie 0**, 400 fichiers réussis / 1 ignoré, 401 rapports complets. Garde réseau native, 2 workers, aucune double de `node-fetch`. [Synthèse et empreinte](suite-synthese.json), [JSON brut](suite-complete.json), [journal](suite-complete.log), [code de sortie](suite-complete.exit). Les compteurs des suites imbriquées dans le JSON ne sont pas des nombres de fichiers. Aucun ancien résultat rebaptisé.

CI **push/main** propre à ce SHA : [40378448440](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40378448440), **entièrement SUCCESS**. Les journaux complets des deux travaux ont été relus ; leurs **deux checkouts sont exactement a2d00fcb**, sans commit synthétique du candidat ni ancien badge réutilisé. [Identité CI](ci-identite.json), [journal principal](ci-principale.log), [Docker](ci-docker.log).

| Contrôle CI de ce main | Résultat réellement observé |
|---|---|
| Types et tests | **3 409 réussis, 0 échec, 31 ignorés**, 400 fichiers réussis / 1 ignoré |
| Theme Check natif complet | **205 contrôles réussis : 204 cas + ZIP client**, 0 erreur ; 35 avertissements par cas conservés |
| Build | Réussi, 58 pages |
| **Nouvel export du build compilé** | Version servie **a2/compiled-build**, HTTP 200, **0 erreur / 35 avertissements**, aucune indisponibilité |
| Docker | Image construite, worker actif, accueil 200, inscription 200, FFmpeg disponible |

Le [résumé des parcours transversaux](parcours-transversaux.json) est extrait de **cette** suite locale terminée : migrations/concurrence DB, isolation A/B, sauvegarde/restauration, Autopilot/quotas, catalogue/stocks et Higgsfield. Ce sont les simulations et contrôles de cette suite, pas des connexions CMS ou fournisseur réelles. Aucune assertion/plafond retiré pour obtenir le résultat. Les avertissements de maintenance des actions GitHub présents dans les journaux sont conservés, distincts des 35 avertissements Theme Check.

## Limites et suites

Les **31 ignorés de cette exécution** sont identiques à ceux du candidat et du main intermédiaire : **27** dépendent de kits privés (APLAT 1, FRAISE 14, Maison & Horizon 1, ONDE 11), **2** contrôles de provenance/répartition des anciens films sont explicitement suspendus, **2** parcours de vraies boutiques WooCommerce/PrestaShop ne sont pas activés. [Liste exacte et fichiers inchangés](tests-ignores.json). Aucun ignoré présenté comme réussi, aucune suppression de contrôle par #202.

Deux scripts historiques et manuels restent hors garantie du nouveau chargeur : `scripts/mission154/export-proof.ts` et `scripts/cms-v2/catalogue-archives-proof.mts`, qui importent encore directement le SDK. Ils ne sont pas exécutés dans cette passe ni pris pour les chemins actifs du Studio corrigés.

**Non vérifié réellement** : prix, authentification et qualité des fournisseurs IA ; installations/achats/réservations sur les CMS ; kits privés absents ; qualité visuelle complète des 15 thèmes et validation créative de Thomas ; version accessible dans son Codespace. Les captures sont celles du Studio local de test. Docker est vérifié en CI pour construction/démarrage, pas comme une installation Shopify de production.

Aucune base, session, configuration d'exploitation, média ou donnée client copié dans les preuves. Les ZIP et données fictifs restent isolés hors publication. Aucun merge Codex, déploiement, redémarrage du studio réel, paiement ou appel fournisseur réel. Les optimisations de capacité visent uniquement mes caches de build et des fichiers de tests terminés strictement identiques ; chemins et octets conservés.
