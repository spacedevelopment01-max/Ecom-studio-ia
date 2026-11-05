# #356 : verrou global, régression d’assertion

Base9636f000, run41641586420 :5352 tests passent, un échoue,31 exclusions historiques. L’échec attendait une sous-chaîne imposant l’ordre busy/free/files/content ; l’ajout de service.state.busy avant free brisait cette chaîne. Le verrou applicatif contient déjà service,free,files,content,adDocument et le job publicitaire en attente : aucun garde applicatif retiré/modifié.

Le test parse maintenant la véritable expression TSX. Il recense les cinq hooks de confirmation, vérifie tout au repos puis chaque contrôleur occupé séparément, le verrou principal et le job en attente. Chaque état doit verrouiller l’ensemble. Il vérifie que les cinq cartes reçoivent interactionBusy et que perform refuse une mutation concurrente. Les deux parcours HTTP/SQLite de confirmations concurrentes restent inchangés.

Tests ciblés : syna301-ui-union + parity301-service-hours :11/11 PASS. TypeScript/diff-check et CI attribués au commit publié séparément. Aucun appel fournisseur ni mutation de projet client. Le quatrième contrôle de confirmation gratuite et le verdict global restent obligatoires. Aucune nouvelle exclusion de test, aucune modification des interfaces/branches Claude.
