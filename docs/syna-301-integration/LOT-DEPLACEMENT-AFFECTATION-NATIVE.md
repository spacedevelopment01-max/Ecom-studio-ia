# Déplacement sans préférence : enregistrer le vrai professionnel

## Défaut démontré

Le déplacement professionnel salon acceptait staff:any comme « sans préférence » pendant la validation, puis enregistrait littéralement any. Avec Camille déjà occupée et Sam libre, la réponse API et la ligne obtenaient any au lieu de Sam. Une réservation suivante chez Sam pouvait alors chevaucher ce rendez-vous déplacé : l’occupation était enregistrée sous le mauvais identifiant.

**Quatre cas rouges sur le parent**, une limite acquise déjà verte. Le doublon est réellement enregistré dans la fixture native avant correction ; aucune simulation du résultat de validate.

## Correction minimale

Réutilisation de slotsFor puis assign, les mêmes fonctions natives que la création, avec l’occupation relue sous verrou et la configuration temporaire de durée acquise du lot #468. La ligne et la réponse utilisent l’identifiant réellement affecté. Une préférence explicite, les refus d’inconnu ou de planning complet et la politique native du professionnel le moins occupé restent en place. Aucune réécriture d’identité, prestation, source ou prix.

## Tests

**5 nouveaux tests, 49 cas distincts dans quatre fichiers et types verts.** Affectation réelle et champs conservés, seconde réservation concurrente refusée, handler HTTP propriétaire montrant la même affectation, inconnu/planning complet refusés, choix calculé sur toute la durée acquise avant la sélection du moins occupé. Dix-huit régressions de durée acquise, moteur salon et relecture de configuration sous verrou conservés.

Logs locaux : `/tmp/parity301-native-move-staff-{parent-red,final,types}.log`. SQLite, comptes, projets et rendez-vous fictifs isolés, horloge fixe, fetch interdit et garde réseau. Parent #468/5e8775fb73007f00bba1298c96cfc5a766f3ea84.

Aucun nouveau DTO/drapeau/composant Claude ; prérequis au futur contrat de déplacement SYNA. Aucun parcours navigateur compilé nouveau revendiqué. Réel toujours interdit dans cette mission : aucun client, fournisseur, dépense, notification, activation, fusion ou déploiement. CI du SHA livré à vérifier séparément.
