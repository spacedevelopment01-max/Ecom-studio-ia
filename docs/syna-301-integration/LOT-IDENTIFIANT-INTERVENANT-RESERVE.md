# Ne pas allouer le sentinel any à un nouvel intervenant

## Défaut réel

Créer un intervenant nommé Any lui donnait l’identifiant `any`, réservé par le moteur à « sans préférence ». Deux tests créent réellement un rendez-vous fictif avec cet identifiant, après ajout ciblé ou ajout dans la liste complète : le rendez-vous est enregistré chez `voisin-acquis` au lieu du membre demandé. Un troisième cas montre que la présence d’un identifiant acquis canonique any-2 ne protège pas du sentinel. Trois cas rouges sur le parent ; un quatrième contrôle de conservation des acquis passe déjà.

## Correction minimale

Les deux allocations de nouvelles identités d’intervenants réservent désormais `any` en plus des identités brutes et canoniques acquises. Le nouveau membre Any reçoit any-2, ou any-3 si any-2 est déjà réservé. Aucun changement du moteur, du sentinel, des services, des identités déjà acquises ou des rendez-vous. Un membre acquis ANY et son rendez-vous natif any restent exacts.

## Preuves

**4 nouveaux tests, 43 cas distincts dans quatre fichiers et types verts.** Les deux rendez-vous sont maintenant réellement affectés à l’identité du membre demandé. Collisions canoniques, liste complète, ajout ciblé et conservation du voisin/historique vérifiés. Tests natifs directs et SQLite fictive isolée, horloge fixe, fetch interdit et garde réseau ; aucune notification ni fournisseur. Pas de nouvelle recette HTTP ou navigateur revendiquée.

Logs : `/tmp/parity301-native-staff-reserved-id-{parent-red,final,types}.log`. Parent #460/06167960efb25ea398e3dcfc5f88a93208dbe817. Aucun nouveau contrat ou drapeau Claude ; les aperçus existants relisent l’identité attribuée par le moteur. CI du commit livré à suivre séparément.

La préférence explicite pour une identité acquise canonique any reste refusée par le lecteur #460 : aucune migration implicite des anciens rendez-vous. Domaine PARTIEL, cartes et recette compilée indépendante toujours ouvertes. Aucun client réel, dépense, activation, fusion ou déploiement.
