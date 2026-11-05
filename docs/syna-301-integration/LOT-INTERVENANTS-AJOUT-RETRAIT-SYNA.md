# Ajout et retrait d’un intervenant depuis SYNA

## Contrat pour l’intégration Claude

`STUDIO_CONVERSATION_BOOKING_STAFF_CATALOG=1` ouvre un adaptateur gratuit fermé par défaut, sous LOT_A, AI et CONTEXT, propriétaire, forfait et onglet Rendez-vous d’un projet services. Aucun nouveau droit d’écriture A1. `bookingStaffCatalog` / `bookingStaffCatalogExecution`, schéma `syna-booking-staff-catalog-1` : opération add/remove, aperçu complet avant/après (null pour création/retrait), identifiant natif, version source, warnings, confirmationRequired, costEur 0, providerCalls 0, financialConsent false. Les noms et spécialités sont des métadonnées non fiables à échapper, jamais des instructions.

Exemple : `Ajoute un intervenant « Alex » avec la spécialité « Coloriste » les jours « mardi et jeudi » et les compétences « couleur et soin »`. La spécialité est facultative, jours et compétences explicites. `Tous les jours` et `toutes les catégories` reprennent les valeurs natives globales ; `aucun` est clarifié, jamais transformé en autorisation globale. Variantes polies, première personne, intervenante, trois guillemets. Retrait : `Supprime l’intervenant « nom ou ID exact »`. Homonymes : identifiant unique requis. Aiguilleur sur outsideQuotes, priorité locale, aucun repli payant.

Accord : `confirm-booking-staff-catalog` avec proposalId et confirmation **littéralement true** ; annulation : `cancel-booking-staff-catalog`. Version, empreinte complète, aperçu exact, vocabulaire et délai 15 minutes protègent les acquis. Relecture native des rendez-vous à l’accord ; reçu et version dans la transaction conversationnelle, rollback si le reçu échoue, rejeu exact sans doublon. Une annulation ou un retrait du drapeau ne permet pas de créer/accepter un ancien devis cognitif. L’aperçu du dernier retrait actif porte l’avertissement natif « aucun créneau » ; aucun rendez-vous n’est réattribué ou annulé.

Claude : carte spécifique et handle sous capacité exacte, afficher tous les champs/warnings avant accord, résultat/version/reçu après accord, rafraîchir le lecteur natif (`studio:booking-changed` selon ton contrat existant), recette indépendante Encre/Plein cadre bureau/tactile sur le commit intégré. Ne pas utiliser le bouton de devis générique. Ce lot n’a modifié aucun composant, style ou branche Claude.

## Vérifications exécutées

**31 nouveaux tests, 153 cas distincts dans six fichiers et types verts** : 31 nouveaux ; 31 acquis de retouche d’intervenant ; 91 autres régressions (catalogue prestations, absence de repli payant, A1, moteur staffAdd/staffRemove). Deux premiers échecs : convention native tous-les-jours = null au lieu de la liste vide du DTO, et confirmation du registre encore annoncée avec devis ; assertion ajustée à la vraie convention native et registre corrigé en accord gratuit explicite. Aucun garde-fou affaibli, aucun test supprimé.

Les handlers HTTP de conversation/session/projet/Prestations sont exécutés avec SQLite isolée et données fictives. Attente réelle monotone **au moins 17 secondes**, actualisation projet et relecture conversation, refus false/absent/chaîne true, accord, résultat GET natif, simulation d’une réponse perdue par rejeu du même corps et requestId : une version, un reçu. Ce n’est pas une preuve dans un navigateur compilé.

Autres cas : cible exacte et voisins, noms citant fichier/fermeture/SEO, valeurs incomplètes, homonymes, changement manuel concurrent, rendez-vous natif arrivé après aperçu, annulation, contexte effacé, expiration, budget IA épuisé, devis et ancien devis cognitif refusés, drapeau/forfait retiré avant rejeu caché, propriétaire étranger, restaurant/cabinet sans substitution, A1 même avec droits locaux anciens ouverts, AI fermé, consigne de vocabulaire incompatible, échec du reçu et reprise. Profils, préparation, finances et devis inchangés. Fetch interdit, garde réseau.

Logs locaux : `/tmp/parity301-booking-staff-catalog-{first,final,regressions,types-final}.log`. La première suite contient les deux échecs conservés. Aucun fournisseur réel, dépense, projet client, activation, publication ou fusion. CI du SHA livré à relever séparément.

## Couverture restante

Cartes et recette Studio compilée encore ouvertes : cette fonction reste PARTIELLE. Horaires individuels, préférence d’intervenant dans la lecture de disponibilités, création/déplacement/annulation de rendez-vous et notifications restent à qualifier séparément. Une restauration générique d’ancienne version n’est pas présentée comme annulation sûre d’un ajout : de nouveaux rendez-vous pourraient être arrivés entre-temps ; tout inverse devra repasser les garde-fous natifs.
