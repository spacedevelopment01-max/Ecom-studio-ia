# Réservations : enregistrer réellement les intervenants seuls

Défaut reproduit par les vraies routes GET/PUT : sans tableau services, une modification du tableau staff renvoie200 et crée une version, mais ignore entièrement la demande. Deux tests rouges démontrent le remplacement et le retrait explicite de tous les intervenants. Le contrôle des doublons passe déjà et reste inchangé.

Correction native ciblée : le traitement staff sort du bloc conditionné par services. Il reste limité aux salons. Les blocs membres sont remplacés à leur emplacement ; les autres blocs et leur ordre relatif sont conservés. Le traitement combiné prestations+intervenants utilise la même allocation d’identifiants de #414. Aucune reconstruction des prestations depuis leur DTO de lecture : leurs champs inconnus et valeurs vides acquises restent exacts.

Validation : 63tests sur six fichiers et types réussis, avec interdiction réseau fournisseur. Trois nouveaux tests HTTP vérifient remplacement, retrait explicite, doublons400, conflit de version409, une seule version nouvelle, aucun changement du profil/métier/autres sections/prix/durées/prestations/dépenses. Les régressions existantes salon/cabinet/restaurant et rendez-vous confirmés restent actives. Journaux /tmp/parity301-staff-only-red.log, /tmp/parity301-staff-only-delivery.log, /tmp/parity301-staff-only-types.log.

Ce lot répare l’éditeur natif ; il ne déclare pas services.booking raccordé à la conversation. L’aperçu natif sans écriture puis le contrat d’accord gratuit exact restent à développer. Aucun composant Claude, activation, publication, donnée client, appel fournisseur ou fusion main. CI finale à observer sur le commit livré.
