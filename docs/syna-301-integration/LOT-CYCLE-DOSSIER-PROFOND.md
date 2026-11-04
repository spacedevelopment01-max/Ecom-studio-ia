# Dossiers : empêcher les cycles au-delà de 64 niveaux

La vérification native isDescendant interrompait la recherche après64ancêtres et renvoyaitfalse. Une arborescence fictive de70niveaux démontre deux échecs : le descendant réel est ignoré et PATCH accepte200 au lieu de400 pour déplacer la racine dans son descendant, y compris avec un renommage simultané.

Le correctif remplace uniquement ce compteur par un ensemble des dossiers visités. La recherche atteint tous les ancêtres ; elle finit aussi si des données anciennes contiennent déjà une boucle. Aucun plafond de profondeur ne bloque les déplacements valides. Aucun renommage ou déplacement n’est appliqué pendant cette vérification.

Preuves :2tests rouges et1vert avant correction. Après correction,4tests ciblés passent (descendantprofond,refusHTTPsansécriturepartielle,déplacementprofondvalide,bouclepréexistante),avec3tests d’atomicité et28du renommage :35tests réussis/3fichiers,types exit0. Vrais SQLite/routes/auth,fichiers fictifs,dépenses inchangées et fetch interdit. Logs /tmp/parity301-folder-deep-red.log et /tmp/parity301-folder-deep-green.log. Aucun projet client ni donnée acquise réelle modifiés.

Ce lot est indépendant des composants Claude. Le déplacement de dossier depuis la conversation n’est pas encore raccordé ; le moteur natif partagé est ainsi sécurisé avant ce raccordement. CI complète du SHA livré à observer. Aucun fournisseur réel,publication,activation,main ou déploiement.
