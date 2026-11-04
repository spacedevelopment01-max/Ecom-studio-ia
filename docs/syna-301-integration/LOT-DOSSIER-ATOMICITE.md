# Dossier natif : refuser sans écriture partielle

Défaut reproduit avant correction : PATCH avec un nouveau nom et une destination invalide répond 400/404 mais conserve déjà le nouveau nom. Deux tests rouges démontrent la perte du nom initial pour destination soi-même/descendante/absente/étrangère. Ce parcours doit être fiable avant son futur raccordement conversationnel.

Correction minimale : valider toute la destination avant toute écriture, puis un UPDATE atomique contenant seulement les champs effectivement fournis. Un changement de parent seul ne réécrit pas un nom précédemment lu. Les droits, limites, règles anti-cycle et interdiction de destination étrangère restent identiques. Aucun changement de suppression, interface, fichier, génération ni fournisseur.

Preuves : trois tests natifs passent après correction, dont les deux initialement rouges ; sept tests existants de lecture bibliothèque passent ; types passent. Vraies routes, authentification/SQLite et dossiers fictifs, snapshots intégraux avant/après les refus. Les destinations valides et retour à la racine restent possibles. Aucun coût ni appel réseau. Aucun raccordement SYNA de dossier revendiqué dans ce correctif ; le prochain moteur doit ajouter une proposition liée à l'empreinte native et un accord gratuit distinct.
