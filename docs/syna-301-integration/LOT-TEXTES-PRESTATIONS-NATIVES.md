# Retouches natives ciblées des textes de prestations réservables

5 novembre 2026, Europe/Paris. Parent #432, `60e2c2e5`. Prérequis du prochain raccordement conversationnel ; aucune carte ou intention nouvelle n’est déclarée livrée dans ce lot.

Le moteur existant `savePrestations` accepte maintenant `servicePatch:{id,name}` et `servicePatch:{id,short}`. Les schémas de nom (1–80 caractères, espaces extérieurs retirés) et description courte (0–160 caractères) sont ceux de l’éditeur natif. Une chaîne vide de description doit être explicite ; elle ne devient jamais une valeur par défaut d’une retouche de prix ou de durée.

Le nom change dans le bloc de la prestation et dans ses seuls libellés liés par l’identifiant natif, lorsque ces libellés correspondent exactement à l’ancien nom. Les autres textes restent conservés. La description change seulement dans le champ natif. Identifiant, durée, prix, intervenants, champs atypiques et profil d’activité restent conservés. Les rendez-vous confirmés gardent le nom, le prix et la durée enregistrés au moment de la réservation.

**54 tests uniques / 4 fichiers et types verts**, dont 13 nouveaux : salon et cabinet, libellés liés, description exacte ou effacement explicite, valeurs invalides et inconnues, champ voisin vide conservé, absence de défaut sur les retouches numériques, rendez-vous confirmé inchangé, conflit de version. Les 41 régressions ont passé dans l’exécution groupée ; le seul échec de fixture demandait deux intervenants salon à un cabinet. Après correction de cette attente, les 13 nouveaux tests passent. Aucun test supprimé ou garde financier assoupli.

Logs locaux : `/tmp/parity301-booking-service-text-native-{final,recheck,types-final}.log`. Vrais handlers HTTP PUT/GET, stockage fictif isolé, garde réseau Node et fetch fournisseur interdit. Aucun appel fournisseur, projet client, activation, fusion main ou déploiement.

Le prochain lot doit raccorder des phrases et une cible exacte, montrer le texte avant/après et les libellés liés, demander un accord gratuit séparé, puis relire le résultat avec conflit et reprise sans doublon. Le profil d’activité reste un domaine distinct. CI complète à suivre sur le commit publié ; aucune preuve navigateur attribuée prématurément à ce lot.
