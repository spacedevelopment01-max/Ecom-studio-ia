# Sections IA incluses — #301

Base : #348 e2d8c8ed. Un test rouge démontre qu'après acceptation sous Dominer puis passage à Développer, le worker atteignait le SDK au lieu de refuser avant l'appel. Les droits de génération n'étaient contrôlés qu'au POST.

Correctif ciblé : le POST persiste l'intention native Generate ; le worker revalide le forfait Dominer et l'autorisation budgétaire avant le fournisseur. Les anciennes tâches en file restent couvertes par leur message natif Generate/Générer déjà persisté. Aucun nouveau devis, compteur, supplément ou moteur ajouté. Les retouches ordinaires locales restent à zéro fournisseur.

16 tests réussis dans3 suites :7 cas économiques HTTP/SQLite/dispatcher/rendu, thèmes sur mesure, isolation des familles/forfaits. TypeScript et diff-check réussis. Sont vérifiés les refus Créer/Développer, le changement de forfait après acceptation (y compris ancienne tâche), le budget épuisé et l'absence d'exemption administrateur. Le cas positif Dominer traverse le SDK simulé, écrit une consommation fictive dans usage_events et dans le budget natif, conserve le quota Blog et enregistre une section native dont le vrai moteur de rendu restitue le contenu. Une retouche locale enregistre une version sans SDK ni usage IA.

Le fournisseur SDK est simulé, aucun transport externe autorisé. Coût fournisseur réel0€, aucune donnée client ni main/branche Claude/déploiement touchés. Les données de démonstration suivies nécessaires aux tests historiques ont été restaurées dans le checkout partiel ; aucun test ni assertion supprimé.

CI complète et recette navigateur intégrée de cette nouvelle source restent à qualifier ; ne pas déduire leur passage des preuves #348 ou de ce seul rendu natif.
