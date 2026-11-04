# Restaurations : préserver le moteur natif demandé

La suite CI de #411 (run41855880282, job126664237030) échoue sur un test vidéo existant : « Restaure le premier montage, en conservant les fichiers des deux versions. » Le détecteur de corbeille associait un verbe initial à toute mention ultérieure de fichiers/images/photos. Il capturait donc une restauration de montage et levait404 lorsque le drapeau Fichiers était fermé.

Correction : le complément immédiat du verbe doit désigner un fichier, une image ou une photo. Les demandes de corbeille et les demandes médias ambiguës ou mixtes restent dans leur traitement gratuit protégé. Aucun drapeau, consentement obligatoire, contrôle financier, de propriété, de version, d’octets ou de rôle n’est élargi. Aucun composant modifié.

Preuves : trois cas négatifs reproduits rouges, cinq demandes médias positives conservées ; puis55tests réussis sur cinq fichiers, dont le test vidéo complet initialement défaillant, les restaurations Fichiers et Images, leurs annulations/conflits/confirmations. Types vérifiés. Réseau fournisseur interdit par scripts/lot9/network-guard.mjs. Journaux locaux : /tmp/parity301-restore-routing-red.log, /tmp/parity301-restore-routing-green.log, /tmp/parity301-restore-routing-types.log.

CI finale à observer sur le commit livré ; aucun verdict complet anticipé. Le journal Docker de #413 est momentanément inaccessible (API404 BlobNotFound) : cela ne démontre pas une erreur produit, donc aucun changement Docker spéculatif.
