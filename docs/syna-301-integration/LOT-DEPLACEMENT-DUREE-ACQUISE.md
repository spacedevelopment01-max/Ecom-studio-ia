# Déplacement natif : valider la durée réellement conservée

## Défaut démontré

Les quatre chemins de déplacement salon/cabinet, client/professionnel, validaient avec la durée actuelle de la prestation mais enregistraient l’intervalle acquis du rendez-vous. Après passage de 60 à 30 minutes, un déplacement de 09:00 à 10:00 pouvait donc chevaucher un voisin déjà enregistré à 09:30. Après augmentation de la durée courante, un rendez-vous acquis plus court pouvait au contraire être refusé alors qu’il tenait avant son voisin.

**Huit cas sont rouges sur le parent**, avec véritables réservations, jetons clients et écritures SQLite : quatre chevauchements effectivement enregistrés et quatre refus d’intervalles valides. Ce n’est pas un simple échec de fixture ou un résultat de validateur simulé.

## Correction minimale

Les deux modules natifs construisent une configuration temporaire de validation pour le seul service du rendez-vous : durée =end_min−start_min acquis, et durée de longueur correspondante au salon. Les validateurs et suggestions alternatives restent ceux des moteurs partagés. La configuration publiée ne change pas, les nouvelles réservations gardent leur durée courante et les rendez-vous acquis gardent durée, prix, identité et notes. Aucun créneau, statut, frais ou intervenant inventé.

Quatre chemins corrigés sous leur transaction existante : déplacement client et professionnel des deux moteurs. Jetons, propriété, statut, délais client, modes, horaires, fermetures, horizon, pas, compétences et occupation restent contrôlés comme avant. Une durée acquise invalide n’est pas remplacée par une durée supposée. Restaurant et ateliers non modifiables inchangés.

## Preuves

**18 nouveaux tests, 64 cas distincts dans quatre fichiers et types verts.** Huit cas initiaux rouges puis verts, quatre dépassements d’heure de fermeture refusés, deux longueurs salon (prix acquis conservé), deux durées source ultérieurement vidées : le rendez-vous à durée connue reste déplaçable mais aucune nouvelle réservation sans durée n’est autorisée. Deux vrais handlers HTTP propriétaires retournent409 sur chevauchement et préservent les deux lignes exactes.

Les 46 régressions acquises couvrent les deux moteurs natifs (dont API publique et jetons) et la relecture de configuration sous verrou. Alternatives cohérentes avec la durée acquise : elles n’annoncent pas les heures qui ne tiennent pas. Source complète, autres réservations et finances conservées. Aucune durée de prestation modifiée par la correction elle-même.

Logs locaux : `/tmp/parity301-native-move-duration-{parent-red,first,final,types-final}.log`. SQLite, comptes, projets, réservations et jetons fictifs isolés, horloge fixe, fetch interdit et garde réseau. Aucun fournisseur, e-mail ou client réel. Parent #467/02c653ce7d424b7147ce8e8f7b09d789cf8c8e6b.

## Intégration et limites

Correctif moteur/API, aucun nouveau DTO/drapeau ou composant Claude. Préalable au futur raccordement SYNA du déplacement exact. Il ne fournit ni carte ni nouveau parcours dans le Studio compilé. La disponibilité générique de nouvelles réservations continue d’utiliser la durée courante ; un futur aperçu de déplacement doit utiliser le même intervalle acquis que son exécution. Domaine toujours incomplet, aucune réservation réelle autorisée dans cette mission. CI du SHA livré à suivre séparément, aucune activation, fusion ou mise en production.
