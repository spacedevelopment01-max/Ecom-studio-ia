# CI : capacités raccordées et drapeaux fermés dans la recette de bilan

## Défaut démontré

#471 /123f21ea2bce4ed7df071128c5992dcf6aac8c5c, run42094367246, job127480438642 : verify-agent211-closure-ui.ts:40 attend absent_from_syna pour appointments.create/settings/cancel. L’annulation est raccordée depuis#467 et le fuseau des réglages depuis#476 ; leur registre implemented ne signifie ni drapeau ouvert, ni calendrier activé, ni action effectuée. La recette échoue sur cette hypothèse devenue fausse, pas sur un paiement ou une réservation constatée.

Correction limitée aux scripts/preuves : garde de frontière de la fixture, mêmes parcours navigateur/actions/accords/reprises/exports. Création toujours absente dans ce scénario. **Toutes les capacités Rendez-vous doivent rester désactivées dans cette fixture** ; celles implémentées gardent coût free, preuve locale et confirmation gratuite explicite ou lecture seule. Absentes =non raccordées et non devisées. Aucun drapeau n’est forcé fermé par la recette pour masquer une activation : une capacité connectée fait échouer le garde.

Lecture SQL inerte des trois tables natives, zéro enregistrement du projet avant ET après le parcours de service, quel que soit le statut. Une réservation créée puis annulée fait également échouer la preuve ; une erreur SQL ne vaut jamais zéro. Seule l’absence exacte d’une table lazy vaut zéro, sans initialisation. Le rapport remplace la fausse généralisation appointmentsInSyna:false par les capacités effectivement constatées et leurs flags fermés.

## Vérifications

8 nouveaux tests et types verts : ancienne assertion réellement reproduite contre le registre courant, fixture fermée et finances intactes ; ouverture accidentelle du flag refusée ; mutations coût payant/confirmation affaiblie/preuve simulée refusées ; création devenue implémentée refusée pour ce scénario ; erreur de lecture SQL refusée ; vraies réservations fictives natives confirmée puis annulée détectées.

Recette Studio compilé complète à relever sur le commit livré, résultat exact et captures publiés dans la PR/point de reprise. Ces huit tests de garde ne sont pas présentés comme recette navigateur. Aucun test supprimé, aucun contrôle financier ou quatrième contrôle CI rendu optionnel ; aucun fichier de workflow ou code produit changé. L’annulation au plafond~100min de#467 est un autre événement, sans assertion produit rouge démontrée, suivi séparément.

Logs /tmp/parity301-closure-booking-boundary-{first,types}.log ; autres preuves sur le SHA livré. Parent#481/b14eeab2a6c4a97fb5a85d7b31519a56a6b1a64e. Aucun fournisseur réel, dépense, client réel, activation, main ou déploiement. Ce correctif ne certifie aucune carte SYNA récente encore à intégrer par Claude.
