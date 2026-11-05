# Corbeille Images : raccorder les phrases au moteur acquis

Quatre reproductions rouges : la corbeille Images et les demandes « Restaure l’image… » / « Peux-tu restaurer la photo… ? » ne rejoignaient pas le moteur natif déjà utilisé par Fichiers. Aucun nouveau moteur, fichier, version ou régénération.

## Portée et protections

Depuis Images, la corbeille et toute restauration sont filtrées sur assets.kind=image. Depuis Fichiers, le nom image/photo ou une lecture explicite de la corbeille des images impose le même filtre. Un identifiant exact d’un document ne peut pas devenir une image. Homonymes : clarification, jamais le premier résultat. Noms et octets acquis restent inchangés.

Les contrôles du moteur partagé restent obligatoires : propriétaire, projet, forfait, FILES et gardes natifs, onglet autorisé, visibilité de stratégie, exclusion des captures internes, préfixes de stockage, empreinte complète, métadonnées, hash des octets, TTL, accord littéral et relecture atomique. L’exception d’onglet Images s’applique seulement aux propositions de portée image ; A1 reste fermé. Drapeaux et environnements clients inchangés.

La normalisation borne la formule « Peux-tu restaurer… ? » / « Peux-tu me montrer… ? » et la politesse terminale, sans retirer les suffixes métier ni les noms cités. Demande implicite ou mixte : clarification gratuite sans restauration, devis ou rachat. Des octets absents ou changés ne déclenchent aucune génération.

## Contrat Claude

Même DTO localFileRestore, schema syna-local-file-restore-1, mêmes actions confirm-file-restore/cancel-file-restore, factory et événement studio:files-changed. La carte de restauration de fichier existante convient aussi à une image ; aucun composant modifié. L’accord reste confirmation:true, coût/appels0, financialConsent/publication:false.

La portée native de la proposition garde kindScope:image en interne. NativeHref pointe vers /studio/:id/images pour ce parcours. Depuis Images : « Montre la corbeille », « Montre la corbeille des images », « Restaure l’image « ID exact » de la corbeille », « Peux-tu restaurer la photo « ID exact » de la corbeille ? ». Depuis Fichiers, les commandes antérieures restent identiques. La nouvelle opération native.images.restore utilise le même adaptateur, sans en déduire les autres retouches Images.

## Preuves exécutées

53 tests uniques sur cinq fichiers et types :13nouveaux et40régressions. La suite initiale passe52tests, puis les13nouveaux repassent après ajout du cas A1 ; aucun changement métier entre ces deux vérifications. Quatre cas étaient rouges avant correction.

PNG fictifs acquis, liste filtrée et types incompatibles, IDs exacts/homonymes, proposition sans écriture, accord natif et octets/versions conservés, contexte Images/Fichiers, autres médias inchangés. Commandes mixtes, octets absents/changés, droits/forfait/onglet/drapeau, annulation/TTL, solde IA nul et A1 fermé. Réponse perdue récupérée par GET sans second POST, événement une fois. Aucun achat, job ou fournisseur.

Recette navigateur des nouvelles phrases Images et CI complète encore à qualifier sur leur SHA ; les preuves Corbeille de Claude et la recette V9 ne sont pas réattribuées à ce lot. Aucune dépense réelle, modification client, activation, publication, fusion main ou mise en production.
