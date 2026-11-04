# Verdict technique — convergence SYNA

Commit qualifié : **9f8507c7776906e1ef85764b6419ce652b64c3c8**, tête de Claude `claude/syna-301-complet`, PR #369. Base main constatée : **37fcfd2526705d274fd813b5da95be46058b7c9f**. Vérifications du 4 novembre 2026, contexte Europe/Paris.

**Avis technique favorable à la livraison des nouveautés présentes sur ce commit. Aucun blocage moteur/API reproduit, aucun correctif produit supplémentaire nécessaire.** Ce verdict ne certifie pas une SYNA complète et ne réalise aucune fusion ou activation. Claude pilote la PR vers main et sa fusion unique.

## Dépendances : aucune reprise fonctionnelle manquante

main est ancêtre de la tête :0retard/232commits d’avance. Tous les commits ci-dessous sont déjà inclus dans #369 et absents de main ; il ne faut pas les appliquer une deuxième fois. Les bases #348/#356/#363, absentes du diff immédiat de #369, sont aussi déjà dans son ascendance. Données vérifiées avec `git merge-base --is-ancestor`, puis comparaison GitHub.

| PR | Commit exact | Dans main | Dans la tête Claude |
|---|---|---|---|
| #348 | `e2d8c8ed91fbb0d20cad93e3db1470e1045f5654` | Non | Oui |
| #356 | `759a2e34c21bc203e87e77461d3a701093ec1595` | Non | Oui |
| #363 | `f25a729036cc03975d6ac7b95eef945a5214177a` | Non | Oui |
| #396 | `506735a7b19b972d4b613d05db2eeb4f537232ed` | Non | Oui |
| #397 | `d7a04a1612096288c436c7b60ae7d8feba82a0aa` | Non | Oui |
| #398 | `504de58833ed3851b31719c9e1efe865ad8126d7` | Non | Oui |
| #399 | `f7b261591cf4c024f54fbc57182d0698f2ba44f8` | Non | Oui |
| #400 | `9b050ff3a14411867b3fa768c58138c8393494ec` | Non | Oui |
| #401 | `e745263291dc36ded53a858ca90851008867b3ad` | Non | Oui |
| #402 | `5950fc2c2cdd1639634d38274a38791c52331881` | Non | Oui |
| #403 | `b650c52e3b75fe81317bd269abb1963a47e98459` | Non | Oui |
| #404 | `eb0f687f6103b27ac880e606b29489bfcceda219` | Non | Oui |
| #405 | `50e5d1e93c7b958238eef871cb1e7478edd0734c` | Non | Oui |
| #406 | `1a7280772ad7e3f92bf9ff9703a77ca2fb9339e0` | Non | Oui |
| #407 | `f3ca45bb5b775e0cd6f970ec381218c0f77968f6` | Non | Oui |
| #408 | `9b6794114aa8193d6aa1302dd413dee00693bc93` | Non | Oui |
| #409 | `f554a6cd428b52fa65ff6b75f51e0dafa72d971c` | Non | Oui |
| #410 | `1c6ece6b1d81ca56f2103f5114575671c9a1ebb6` | Non | Oui |
| #411 | `c094116af043cb729d5eeb45235199dfbc58e1de` | Non | Oui |
| #413 | `3b54dfbe8ebf125b6039f035e2c024ec07d73a4e` | Non | Oui |
| #414 | `05b89fc48b44c44ebbb93d0fade7bdcb91d3d28d` | Non | Oui |
| #415 | `e4d4db0d45f645c3030e745c9f2f78f1cfd83257` | Non | Oui |
| #416 | `10cd443d8a6cced2df31cadba93830b7c73fde0e` | Non | Oui |
| #417 | `81433c15cc2ea822ed698ad01931db92c747aacc` | Non | Oui |
| #418 | `a31c8d3d12d8e9c063e272c47d1232ba08707660` | Non | Oui |
| #419 | `00afb4c4a3653393ccb7b0a7c955656e5cd78fcf` | Non | Oui |

Seul **1110565febf3db7a775c39f3aa11ae308271f4ad** manque par rapport à la dernière branche Codex : trois documents (matrice CSV/Markdown et point de reprise). Aucun moteur/API/interface n’en dépend. Reprise documentaire facultative ; le présent rapport actualise les contrôles et recettes depuis ce point. Le commit `827795d0` n’est pas un ancêtre de la tête qualifiée. Le chantier séparé Liste d’attente #421 n’est pas une dépendance SYNA et n’a pas été repris.

**État de livraison à corriger par Claude, sans changement de moteur :** #369 est encore brouillon et cible `claude/syna-301-integration-356` (`f25a7290`), pas main. Claude doit préparer sa PR finale vers main, ou adapter la cible, conserver ce SHA qualifié et vérifier les contrôles applicables. Aucun verdict de ce rapport ne doit être réattribué automatiquement à un nouveau commit produit ou à une nouvelle base main.

## Contrôles GitHub sur le commit exact

[CI 41881648681](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41881648681) : **SUCCESS**, cinq jobs verts. Types et suite complète : **6109tests réussis,31exclusions préexistantes ;650fichiers réussis,1exclu**. Theme Check/build/recettes natives compilées, Docker, quatrième contrôle obligatoire de confirmation gratuite et verdict agrégé :SUCCESS. Aucun contrôle supprimé, relancé ou contourné. Aucun statut legacy additionnel ; une ancienne discussion de revue est résolue et obsolète, pas de demande de changement active dans les données de revue consultées.

Vérification indépendante : **77tests ciblés/10fichiers verts**, puis build de production propre **EjTDhC-HYFN21izgKOSsO**. API `/api/version` vérifiée à chaque recette :commit9f8507c7,production,compiled-build,tree clean. Aucun serveur de développement utilisé pour ces preuves.

## Parcours réellement exécutés dans le Studio compilé

| Parcours | Formats / état | Étapes | Accords différés≥17s |
|---|---|---:|---:|
| Prix réservable, durée annulée, réponse perdue | Encre/Plein×1440/390 tactile, services préparés :4/4 |8|4|
| Même parcours sur projets neufs | Encre1440 et Plein390 tactile :2/2 |4|2|
| Lecture Réservations et restauration Images | Encre/Plein×1440/390 tactile, préparés :4/4 |12|4|
| Import photo et téléphone du profil | Encre/Plein×1440/390 tactile, préparés :4/4 |8|4|
| A1 :fichier,dossiers,prompts et refus hors exception | Encre/Plein×1440/390 tactile :4/4 |32|12|
| **Total** | **18/18** |**64**|**26**|

Minimum mesuré : **17000,20ms**. Toutes les actions passent par les phrases et boutons réels de SYNA ; aucune substitution par appel direct à un outil. Fixtures et sessions fictives isolées ; aucun projet client. Les recettes vérifient avant/après natifs, aucune écriture avant accord, résultat relu et visible, annulation sans écriture et rechargement. Prix50→60€ visible dans Rendez-vous sans recharger puis après rechargement. Les photos sont réellement chargées ; octets acquis conservés à la restauration. L’import préparé rejoint le fil sans déverrouiller la fiche. A1 conserve l’avis de lecture seule et ne crée aucune Préparation ; seuls les droits bornés fichiers/dossiers sont utilisés, prompts sans bouton d’action.

**Réponse perdue réellement simulée après écriture serveur dans les six parcours de prix :** sur ordinateur, reprise de la même confirmation (même requestId/proposalId, deux POST) ; sur téléphone, « Vérifier l’enregistrement » (GET, un seul POST). Dans chaque cas :une seule version nouvelle, reçu natif exact, résultat visible et aucun devis. Les autres valeurs/rendez-vous acquis restent sous les gardes natives et les tests API de la tête.

**Zéro devis créé, nouvelle dépense/usage/job, nouvel appel IA, requête externe ou erreur JavaScript** sur les cinq recettes. Les12lignes de recherche SIMULÉES des trois groupes préparés restent intégralement identiques ; les groupes neuf et A1 partent sans appel. Vérifications SQL avant/après conservées dans les JSON. Les captures PNG restent exclusivement locales sous `/tmp/syna-convergence-9f-*`.

## Aperçu privé pour filmer

Le fichier `preview-private.env.example` contient les noms exacts vérifiés, avec clés fournisseur vides ; il ne modifie aucun défaut produit. Base :STUDIO_SYNA_SHELL,LOT_A,AI,UI,CONTEXT. Import/Fichiers/Corbeille :FILES ;profil :SERVICE_PROFILE ;bibliothèque :PROMPTS ;lecture et retouche des réservations :BOOKING_READ etBOOKING_EDIT. Chaque nom de conversation porte le préfixe `STUDIO_CONVERSATION_` et vaut1 dans cet aperçu seulement.

A1 :EXISTING_LOCAL pour les exceptions gratuites,EXISTING_FOLDER_RENAME/EXISTING_FOLDER_MOVE pour les dossiers ;EXISTING_PROMPTS_READ pour la lecture des prompts, indépendante du droit d’édition. Aucun droit de modification des réservations sur A1. Site natif :SPECIALISTS,TOOLS,THEME_TOOLS,LOCAL_SITE ;stock, si filmé :CATALOGUE ;calendrier, si filmé :SOCIAL. Les autres drapeaux de génération ne sont pas nécessaires à cette démonstration et restent fermés.

Utiliser un DATA_DIR neuf, aucun DATABASE_FILE/STORAGE_DIR partagé, comptes/projets fictifs, fournisseur non configuré, `STOCK_OFFLINE=1`, et `NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs`. Les recettes bornent next start à127.0.0.1 et bloquent aussi les requêtes navigateur externes. Encre/Plein est une préférence du compte fictif ;le drapeau de coquille seul ne choisit pas le mode. Un aperçu privé n’est ni un déploiement ni une autorisation d’activer les clients. Aucun accès de tournage public n’a été publié ici.

## Reproduction et limites

Les cinq rapports bruts, leurs empreintes et la liste d’ascendance sont fournis. Les harnais sont adaptés des recettes Claude lots5/8/9/A1 :next start, vérification du SHA compilé, attente mesurée, perte de réponse et invariants SQL. Lot5 est limité àphoto/profil ;les parcours Site/versions/dossier inchangés ne sont pas rejoués inutilement. Pour reproduire :checkout propre9f8507c7, build avec garde réseau et stockage temporaire, copier les harnais dans `.next/audit-runners/` (ils conservent ces chemins d’import relatifs), puis lancer via npx tsx avec RECETTE_PREPARE=1 pour lots5/8/9 et RECETTE_A1_DOSSIERS=1 pour A1. Neuf :RECETTE_PREPARE=0 et RECETTE_CAS=encre-ordinateur,plein-telephone. Chaque exécution refuse un stockage existant, crée ses données et arrête son propre serveur.

Deux premiers démarrages de harnais ont échoué avant exécution :les fichiers.ts sous.next héritaient du formatCommonJS. Extension.mts corrigée ;journaux initiaux conservés localement,aucun échec produit masqué. Le cache webpack fermé a été retiré après compilation pour libérer l’espace ;runtime et sources inchangés. Les copies de dépendances de tests réhydratées dans notre ancien checkout ont été retirées de son périmètre sparse ;aucun acquis client ou travail d’un tiers touché.

Aucune nouvelle fonction ajoutée dans cette mission, aucune modification graphique/branche Claude/main, aucun fournisseur réel, envoi, publication, activation client ou déploiement. Les fournisseurs réels et leur qualité ne sont pas qualifiés. Horaires/créneaux,capacité,équipe,noms/descriptions réservables et les autres lacunes de la matrice restent ouverts. Les recettes indépendantes supplémentaires portent sur les services ;la CI de ce SHA couvre aussi les contrôles natifs produits/services. Cet avis vise la convergence des nouveautés décrites, pas la parité complète.
