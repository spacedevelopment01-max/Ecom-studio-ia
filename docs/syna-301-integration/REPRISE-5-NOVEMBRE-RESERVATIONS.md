## Mise à jour active — 5 novembre 2026, 13 h 44 Paris

Tête fonctionnelle : **9b02c829a537b1e80f9551a0866d4cff2d411da8 /#436**. Après #434 : **#435 b24179b6e2a9184bf43235c554c7a4fe67968f1f**, moteur natif de suppression atomique de dossier vide (11 nouveaux tests,71/4 fichiers/types,2courses SQLite reproduites) ; puis **#436**, contrat naturel strict de suppression de dossier sans sous-dossier ni référence de fichier, même dans la corbeille (31 nouveaux,225tests distincts/10fichiers/types,HTTP17s et reprise sans supprimer un nouvel homonyme).

**251 tests nouveaux distincts sur #423–#436.** Les ensembles225 et281 se recoupent : ne pas les additionner. La carte dossier reste PARTIELLE ;drapeau FOLDER_DELETE fermé,Claude doit intégrer aperçu irréversible,handle anti-devis/verrou/reprise etrafraîchissement Fichiers avec sélection du parent. Contrat LOT-SUPPRESSION-DOSSIER-SYNA.md ;transmis dans#301 commentaire6658264344. Aucun composant Claude modifié.

Matrice : **170 opérations,70PARTIEL/70ABSENT/4NON_TESTE/26BLOQUE**. La ligne native.files.empty-folder-delete existait déjà :mise àjour,aucune nouvelle unité artificielle.

CI#431 :suite complète verte **6272passés/31ignorés,662fichiers passés/1ignoré** (job127226656964). Docker etconfirmationgratuite verts ;recettesnatives longues encoreencours. #434 :Docker etconfirmationgratuite verts,suitecomplète etnatifencours au dernier relevé. #423 seule CI entièrementverte confirmée àcepoint. Vérifier lesruns desnouveaux#435/#436 auSHAexact.

**Prochaine lacune indépendante :mise àla corbeille d’un fichier**,analyse native seulement àcepoint. La route DELETE de src/app/api/files/[fid]/route.ts protège actuellement les originaux meta.protected etlesusages post scheduled/publishing/published,mais lit lescontrôles hors transaction. Réutiliser library-local-change.ts,protéger lesconcurrences etlesoctets/versions acquis ;vérifier avanttoutecorrection avecdeuxconnexionsSQLite comme#435. Puis contrat naturel,cibleexacte/aperçu/accord/résultat/reprise,restore natif etgarde anti-repli payant. Aucun code nouveau de corbeille encoreécrit. Aucunmain/client/activation/fournisseur/déploiement.

---

# Reprise SYNA #301 — 5 novembre 2026, 13 h 17 Paris

**La mission complète reste en cours.** L’environnement fonctionne. Les contrats serveur ci-dessous sont livrés et testés, mais leurs nouvelles cartes et la recette commune de Claude restent à intégrer. Aucune fonctionnalité nouvelle n’est déclarée complète par les seuls tests backend.

## Références de travail

- Main vérifié à nouveau : `6354f327888d70c64ce4d86604b7b8fdc768947c` (#422), toujours identique à la base de cette reprise.
- Tête fonctionnelle livrée : **`228896588237dc2ebba6bc5a0ebb4d79b1db200c`**, PR brouillon #434.
- Chaîne linéaire à reprendre dans l’ordre : **#423 → #424 → #425 → #426 → #427 → #428 → #429 → #430 → #431 → #432 → #433 → #434**. Chaque PR cible sa précédente ; #423 cible main. Ne pas fusionner ces PR vers main dans cette mission.
- Branche documentaire cumulative : `codex/parity301-booking-resume` ; elle contient l’ascendance fonctionnelle et les preuves, sans modifier les branches de Claude.
- Checkout local : `/workspace/work/parity301-intents-v5`, actuellement sur la branche documentaire. Aucun changement fonctionnel non publié à ce point de reprise.

## Lots livrés

| PR | Commit | Résultat borné | Nouveaux tests |
|---|---|---|---:|
| #423 | `bb0f7b490aa8321ba6fc59f5f23e30c005a7cf56` | Refus des horloges impossibles ; 24:00 seulement en fin de plage | 7 |
| #424 | `1c0166f77cdd7b36ce6feb87120ff46f254425a5` | Plages hebdomadaires salon/cabinet depuis une demande naturelle | 30 |
| #425 | `bb3b7025bce9e99685a7119a8ca6babe2f35e4d4` | Restaurant : patch ciblé et semaine explicitement fermée respectée serveur/public | 9 |
| #426 | `8cb35ff024a1f9be78f0300554acd1d83bd918ab` | Jours ouverts et créneaux déjeuner/dîner du restaurant | 24 |
| #427 | `b5cbbd14a7bb2d08955661139f2db8b60d18b82e` | Dates natives réelles et périodes ordonnées | 8 |
| #428 | `1d97dfb7bdb077d4b68cbe548596e62cea0785d1` | Ajout de fermeture exceptionnelle sans effacer les acquis | 26 |
| #429 | `c9a6f830641e8a7ca6c09f59c739e553b282d524` | Retrait des seules dates ciblées, avec scission sûre des périodes | 18 |
| #430 | `fa20aaa4b2091f9c4f683e6722d94baf25304403` | Refus API des devis/confirmations cognitifs pour ces demandes gratuites | 13 |
| #431 | `9cfc77150615162c02236db2aad71dcd70e8d3b0` | Régression CI #424 : clarification Activité conservée sans ouvrir le drapeau Horaire | 8 |
| #432 | `60e2c2e5076d413d7f7bd93f3d2a4c946962d2a7` | Capacité totale du restaurant par créneau, couverts confirmés conservés | 19 |
| #433 | `077883cf8e14b533fd1541ab88299791c7edc600` | Patch natif des noms et descriptions sans remplacer les voisins | 13 |
| #434 | `228896588237dc2ebba6bc5a0ebb4d79b1db200c` | Renommage, description courte et effacement explicite salon/cabinet depuis SYNA | 34 |

**209 tests nouveaux distincts. Vérification cumulée finale : 281/281 tests, 16/16 fichiers et types verts sur le code de #434.** Les totaux propres à chaque PR contiennent des régressions communes : ne pas les additionner. Log local : `/tmp/parity301-booking-session-final-targets.log`.

Tous les parcours nouveaux gardent un aperçu sans écriture, un accord littéral obligatoire, la cible/version native, les conflits, la relecture du résultat et la reprise sans double écriture. Vrais handlers HTTP et SQLite ; attentes réelles de 17 secondes pour fermetures et textes. Aucune dépense fournisseur. Les simulations de recherche sont des fixtures préacquises, pas des appels réels.

## Ce que le navigateur a réellement montré

Diagnostic indépendant publié dans **`eb6afdb6e4453d81d890808ad56b4c9ba73cecee`**, branche `codex/syna-booking-visibility-c9a6f830`.

- Source compilée **c9a6f830**, BUILD_ID **LUJqaPqWtwx8QP2NZgH81**, `next start` en production et Chromium système ; stockage fictif isolé, aucun accès extérieur.
- 16 demandes réellement saisies : Horaires / Restaurant / Ajout de fermeture / Retrait de fermeture × Encre/Plein × ordinateur/tactile. Quatre attentes de 17 secondes.
- 16 réponses HTTP200 avec proposition native gratuite ; **16 blocages UI : aucun bouton de confirmation, un bouton de devis générique par cas**. Aucune confirmation par API pour contourner cette absence.
- Aucune écriture métier, erreur JavaScript ou requête extérieure ; tables IA/jobs/usage/ledger/devis inchangées, y compris les 16 recherches simulées préacquises.
- JSON et harnais : `preuves-booking-c9a6f830/RESUME.json`, `scripts/parity301-booking-contract-visibility.ts`.
- Les 16 PNG restent **locales uniquement** : `/workspace/work/preuves-syna301-booking-c9a6f830-visibility`. Aucun téléversement ni projet client.

Ce build ne qualifie **pas** #430–#434, ni la capacité ou la nouvelle carte texte. Ne pas réutiliser son identifiant pour ces commits. #430 ferme le repli API payant, mais ne rend pas une carte visible.

Autre défaut visible transmis à Claude : `tab-rendez-vous.tsx:109` affiche « ouvert » pour `ranges.length=0`, alors que les moteurs salon/cabinet interprètent `[]` comme fermé. Ce composant n’a pas été modifié par Codex.

## Contrats à intégrer par Claude

Les quatre drapeaux restent fermés par défaut, sous LOT_A/AI/CONTEXT :

| Drapeau | Présentation | Schéma | Actions |
|---|---|---|---|
| BOOKING_HOURS | bookingHours | syna-booking-hours-1 | confirm/cancel-booking-hours |
| RESTAURANT_SETTINGS | restaurantSettings | syna-restaurant-settings-1 | confirm/cancel-restaurant-settings |
| BOOKING_CLOSURES | bookingClosures | syna-booking-closures-1 | confirm/cancel-booking-closures |
| BOOKING_SERVICE_TEXT | bookingServiceText | syna-booking-service-text-1 | confirm/cancel-booking-service-text |

Ajouter les cartes **et les handles dans toutes les gardes du panneau**, pas seulement le rendu : pas de devis générique pour une demande gratuite. Contrôleur partagé de verrou/péremption/reprise, avant/après exacts, annulation, reçu et `studio:booking-changed`. Carte restaurant : nouveau champ `capacity`. Carte fermeture : `operation:add/remove`. Carte texte : chaînes et `linkedLabelsChanged`, sans détourner la carte numérique prix/durée.

Puis recette indépendante sur un **même SHA compilé** : préparé/neuf, Encre/Plein ordinateur/tactile, accord après ≥17s, résultat réellement visible dans Rendez-vous, annulation, conflit, réponse perdue/rechargement/rejeu sans doublon. Les PDF/PNG anciens et les seuls tests backend ne ferment pas ces lignes de matrice.

Contrats et SHA transmis dans #301, notamment commentaires **6657154353**, **6657224873**, **6657343921** et **6657747550**. Aucune nouvelle réponse ou carte Claude observée au dernier relevé. Continuer les domaines indépendants pendant cette attente.

## CI : résultats exacts et limites

- **#423 entièrement verte**, SHA bb0f7b49, run **42013974148** : suite complète **6136 passés /31 ignorés**, fichiers **654 passés /1 ignoré** ; Docker, confirmation gratuite obligatoire, recettes compilées et verdict global tous `success`.
- **#424 rouge historique** : run **42015562741**, job **127205115147**, un échec parmi6197cas (6165 passés,31 ignorés). Phrase incomplète dans Activité capturée à tort par le nouvel aiguilleur. Reproduit localement et corrigé dans #431 ; les neuf tests acquis sont conservés. Ne pas appeler ce vieux SHA vert ni le relancer aveuglément.
- #431, run **42021961326** : Docker et confirmation gratuite verts ; suite complète et recettes natives encore en cours au dernier relevé. Aucun verdict global présumé.
- Dernière tête #434, run **42025619574**, en cours. C’est sa CI, puis celle de l’intégration commune Claude, qui doivent qualifier la suite.
- Autres runs : #42542016531277 ; #42642017997568 ; #42742018470932 ; #42842019225565 ; #42942019907308 ; #43042021654962 ; #43242022753949 ; #43342023598543. Les consulter avec leur SHA, sans attribuer les verts d’une autre branche.

Les workflows et le quatrième contrôle de confirmation gratuite n’ont pas été modifiés. Aucun test supprimé ou garde financier affaibli.

## Couverture restante et prochaine action

Matrice canonique : **170 opérations, 69 PARTIEL /71 ABSENT /4 NON_TESTE /26 BLOQUE ; aucune complète**. Quatre sous-opérations de réservation détaillées ; le parent `services.booking` reste PARTIEL.

Restent notamment équipe, création/suppression de prestations, prix à partir de/effacement du prix, limites de groupes et réservations clientes. Hors réservation, poursuivre les lignes absentes ou non testées sans refaire #348 ni les moteurs déjà validés.

**Prochaine lacune indépendante retenue : supprimer un dossier réellement vide.** Analyse native commencée dans `src/app/api/folders/[fid]/route.ts` et `src/lib/folder-metadata.ts` ; aucun code de suppression nouveau écrit à ce point. Réutiliser le moteur natif, extraire une opération atomique commune si les tests en montrent le besoin ; refus dossiers système/non vides, cible exacte, aperçu, accord, relecture, conflit et reçu sans doublon. Ne jamais supprimer implicitement un fichier, déplacer un contenu ou perdre un rattachement de corbeille. Garder A1 fermé pour cette capacité nouvelle sauf contrat explicite. Prévoir la garde contre le repli payant et transmettre le contrat à Claude.

## Exécution et sécurité

Tous les Node/tests/builds/navigateurs utilisent `NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs`. Fixtures dans un DATA_DIR neuf, fournisseurs vides ou strictement simulés ; aucun transport fournisseur. Le cache webpack fermé de ce seul build a été retiré après compilation et vérification des descripteurs pour conserver de l’espace ; aucun artefact client ou travail d’un autre agent supprimé.

**Aucun appel fournisseur payant, modification de projet client, activation client, fusion main ou déploiement.** Les capacités payantes encore non qualifiées doivent être préparées et chiffrées pour accord ; les lots de cette reprise sont gratuits et n’en nécessitent pas.
