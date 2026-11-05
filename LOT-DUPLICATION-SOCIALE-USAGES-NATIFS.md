# Duplication sociale : références médias et atomicité natives

Parent #490 /3a63955aec85a07d7df4921cceb1e05a9a5dfafb. Correction ciblée du moteur existant,aucun composant/style/branche Claude modifié.

## Défauts reproduits avant correction

Trois rouges sur le parent :clone sans asset_usages,bibliothèque perdant la protection après suppression de l’original et passage fictif de la copie à scheduled,échec strategyContent laissant le post cloné partiellement enregistré. Deux rouges supplémentaires :une référence média étrangère ou absente était copiée sans contrôle. Logs /tmp/parity301-native-social-duplicate-parent-red.log et/tmp/parity301-native-social-duplicate-scope-parent-red.log. Aucun défaut seulement supposé présenté comme prouvé.

## Correction minimale

`duplicatePostV2` lit et copie sous une transaction native. Liste média valide et contrôle du même projet comme l’édition manuelle,puis `addUsage` pour chaque média copié ;source/clone/provenance/usages sont atomiques. Les échecs n’abandonnent ni clone ni premiers usages partiels. Aucun second store,aucun nouvel actif ou appel IA.

Comportements acquis conservés :même texte/titre/médias/ordre/doublons de références ;original intact,clé publish unique,copie review non approuvée/user_edited,sans historique distant ni job de publication. La date renseignée peut être copiée selon le contrat natif préexistant,mais aucune programmation ou publication n’est activée. Les médias déjà en corbeille restent en corbeille si copiés en review,pas de restauration automatique ni restriction nouvelle de cette action manuelle. Références distinctes enregistrées une fois dans la bibliothèque.

## Vérifications exécutées

**14 nouveaux tests,31 distincts/deux fichiers et types verts**,dont17 régressions social-v2-engine. Logs /tmp/parity301-native-social-duplicate-{first,types}.log,diff vérifié. Vrais moteurs/SQLite/handlers/session isolés,images JPEG fictives64×80 produites localement par Sharp,pas par un fournisseur.

Usages et garde native de corbeille,octets et métadonnées/source conservés,ordre/reprises de médias,listes invalides,texte sans image,source publiée fictive et approbations/historique distants non repris,échec secondusage etprovenance avec rollback,API duplicate puisGET constatant le vrai post,source réellement modifiée et commise avantverrou relue,natif gratuit sans nouveau job/ledger/usage IA. États published/scheduled sont des fixtures SQL explicites :aucun parcours réel de programmation/publication n’a été exécuté. Les fournisseurs des17régressions sont simulés ;pas de preuve créative ou externe réelle.

## Restant

Intention naturelle/aperçu lié à source+références/accord/reçu sans doublon et carte/recette Studio compilée indépendante restent à raccorder. Ce correctif natif n’est pas une nouvelle preuve navigateur. CI du commit livré à suivre séparément,aucune certification héritée de#483. Aucun fournisseur/dépense/client/activation/main/déploiement ;workflows etquatrième contrôle obligatoire inchangés.
