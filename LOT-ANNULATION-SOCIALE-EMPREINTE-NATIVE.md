# P1 : préserver les modifications lors d’une annulation sociale native

Branche indépendante basée directement sur main `6354f327888d70c64ce4d86604b7b8fdc768947c` (#422). Aucun nouvel aiguilleur SYNA, composant, style ou travail de Claude modifié. Ce correctif moteur répond au défaut constaté pendant la contribution à l’audit #492.

## Preuve sur main

Trois scénarios exécutés sur le moteur natif : duplication avec `applySocialEdit`, modification par `editPostV2`, puis annulation native. Date.now fixé pour démontrer une collision de timestamps ; vraies écritures SQLite, pas une concurrence multiprocessus.

Le contrôle sans modification intermédiaire passe. Deux rouges : la copie modifiée est supprimée ; le texte modifié de la source est écrasé par TEXTE_AVANT. Source originale du diagnostic : `/tmp/parity301-social-undo-main-diagnostic.ts` ; log `/tmp/parity301-social-undo-main-6354f327.log`. Aucun code produit de main modifié lors de cette reproduction.

## Correctif borné

Le journal privé `social_edit_undo.after` conserve désormais pour chaque post un jeton versionné avec timestamp et empreinte de TOUTE la ligne native. L’annulation refuse de restaurer ou supprimer une ligne dont l’état a changé, même à timestamp égal. Pas d’exception cachée pour un champ.

Transaction autour de l’annulation : une erreur technique après une première restauration revient en arrière, journal compris. Les règles déjà présentes pour publications envoyées/incertaines, dates passées, médias supprimés et reprogrammation contrôlée restent conservées. Aucun appel fournisseur ajouté.

Une source déjà identique à son état antérieur n’est plus réécrite inutilement. Sans effet réellement appliqué, résultat applied=false/by=none et message explicite, sans faux succès ; journal conservé. Les annulations ordinaires et les retouches locales existantes restent exécutées avec les nouveaux jetons.

## Limite importante : anciens journaux

Un historique contenant seulement des timestamps, incomplet ou invalide ne prouve pas l’état d’après retouche. Il est conservé avec les données, mais **n’est pas exécuté automatiquement**, même si son timestamp semble correspondre. Aucun rétrocalcul d’empreinte ni migration aveugle : cela certifierait potentiellement une modification intermédiaire comme état original.

Un parcours de nouvel aperçu explicite pour ces historiques reste à concevoir/qualifier ; ce correctif ne le prétend pas livré. Le refus reste gratuit, visible et sans proposition IA payante. Cette limitation de compatibilité doit être examinée avant intégration ; aucune activation ou fusion n’est effectuée ici.

## Vérifications

**16 nouveaux tests ; 35 cas distincts validés ensemble dans trois fichiers sur le dernier code ; types verts.** Moteur natif, scènes calendrier existantes et social-v2-engine. Cas à timestamp identique, champs link/hashtags, historiques anciens/incomplets, états published/publishing/uncertain fictifs, refus sans perte, rollback après une première vraie restauration, vues natives et attente réelle monotone ≥17 secondes sans réécriture de la source.

Le premier passage complet avait31 verts/1 échec de fixture : le test supposait l’original restauré en premier. L’assertion utilise maintenant l’ID réellement restauré avant d’injecter l’erreur ; ce cas a été rejoué seul avec succès. Aucune assertion de conservation affaiblie. Les cas non sélectionnés dans ce rejeu ne sont pas comptés comme exécutés à nouveau.

Vrai handler HTTP/session/SQLite : budget IA explicitement indisponible, deux demandes natives identiques sur journal ancien → refus200/applied=false, aucune confirmation IA, données/journal/wallet/compteurs inchangés. Régressions avec dépendances fournisseurs simulées ; nouveaux cas sans fournisseur réel.

Logs : `/tmp/parity301-native-social-undo-first.log`, `-final.log`, `-rollback-final.log`, `-http-final.log`, `-http-budget-final.log`, `-types-final.log`. Pas de recette navigateur nouvelle, pas de qualification complète de l’annulation dans SYNA. CI finale du commit GitHub publié à suivre séparément. Aucun fournisseur/dépense/client réel, publication, activation, main ou déploiement.


## Complément : source programmée ou en pause intacte

La relecture après publication initiale a démontré deux rouges supplémentaires sur c067eb98 (arbre identique au premier commit distant0518e098) : l’annulation d’une copie réécrivait une source intacte en statut approved lorsqu’elle était scheduled ou paused. États et approbation acquis fictifs semés en SQLite, pas une programmation/publication réellement exécutée. Le test compare TOUTE la ligne source et interdit tout UPDATE posts pendant l’annulation de cette seule copie.

Le premier lancement de ces deux nouveaux tests a échoué dans la fixture (objet User passé à SQL au lieu de user.id). Après correction de la seule fixture, les deux défauts de statut ont été réellement reproduits. Correction : comparer d’abord les champs à l’état original brut, avant toute normalisation de statut pour les restaurations nécessaires. La source intacte est sautée ; une vraie restauration vers un état programmé continue de passer par les contrôles existants.

Dernier passage :35/35, trois fichiers (16 gardes +17 social-v2-engine +2 calendrier), types verts, attente réelle≥17s. Logs /tmp/parity301-social-undo-acquired-source-red.log (fixture), -red-corrected-fixture.log (deux vrais rouges), /tmp/parity301-native-social-undo-acquired-final.log et -types.log. Le verdict CI de l’ancien0518e098 ne doit pas être attribué à cette correction suivante. Aucun nouveau parcours central ni fournisseur.
