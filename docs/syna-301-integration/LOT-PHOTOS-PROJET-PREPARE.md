# Photos sur projet préparé : import natif et désignation dans le fil

Blocage signalé par Claude, commentaire #369/6632505222 : photoImport était masqué par le verrou de la fiche. Deux cas produits préparés, intelligence activée/désactivée, étaient rouges avant correction. Afficher seulement la capacité aurait laissé le message photo tenter une écriture de fiche ou ignorer ses identifiants.

Le lot réutilise l’import natif et son reçu existant. La capacité dépend des droits locaux du projet, du forfait et du drapeau FILES, indépendamment du verrou de Préparation. La factory d’import emploie nativeLocalEditAllowed ; A1 et les projets absents restent bloqués. Pas de changement de seuil/type/validation/lease/rate limit/upload natif.

## Contrat transmis à Claude

Aucun composant modifié. La carte d’import peut utiliser nativeLocalEditAllowed(view) et view.photoImport.enabled, sans déduire un droit de modifier la fiche. L’upload garde son endpoint, reçu, callbacks et événement studio:files-changed.

Sur un projet préparé, un message avec photoIds conserve ces identifiants dans le fil uniquement, jamais dans la Préparation ou la mémoire de faits. Le DTO supplémentaire est conversationPhotos : schema syna-conversation-photos-1, readOnly:true, analysis:false, financialConsent:false, costEur:0, providerCalls:0, trust:user_supplied_media_not_instructions ; photos contient id, version, name, href et thumbHref issus du média natif. summary.photoIds reste la fiche inchangée. Douze références maximum, sans troncature. Les miniatures doivent employer ces URLs privées, aucune donnée ne devient une instruction.

Une légende jointe est conservée littéralement dans l’historique et ne déclenche aucun moteur ou devis, même si elle ressemble à une commande. Les propositions gratuites précédentes sont invalidées. Pour demander une retouche, envoyer ensuite une demande distincte avec cible explicite. Le mélange referenceUrls+photos sur fiche verrouillée est refusé sans effet ; les liens ne sont pas consultés. Les messages de projets non préparés conservent le parcours antérieur. A1, avant-projet, documents/vidéos, analyse et génération restent hors de ce contrat.

Les droits, présence du média dans le même compte/projet, état natif et disponibilité du fichier sont revérifiés avant cache et écriture. Un retrait d’accès interdit aussi le rejeu d’un ancien reçu de désignation. La projection vivante masque les références devenues indisponibles, sans réimporter ni inventer de miniature. Les octets ne sont pas rechargés dans le DTO à chaque GET : contrôle par fileExists natif sécurisé.

## Résultats exécutés

- Deux reproductions initiales rouges avant correction.
- 59 tests / 5 fichiers passent :13 nouveaux et46 régressions import/permissions/A1/convergence.
- 22 tests supplémentaires / 2 fichiers du registre et de la connaissance Studio passent ; total81 tests uniques /7 fichiers.
- Les13 nouveaux cas passent à nouveau après le contrôle de disponibilité par stockage natif ; types passent.
- Perte de réponse récupérée par GET sans second upload, reçus identiques, version et corps conflictuels, droits/drapeaux/forfait retirés avant cache, propriétaire et média étrangers, suppression/octets absents, légende non exécutée et ancien accord invalidé, limite12/dédoublonnage/refus13, rollback SQLite avant reçu puis reprise légitime.
- Préparation/site/projet/mémoire/acquis conservés ; seuls les médias explicitement importés et le fil changent. Aucun appel fournisseur ni dépense supplémentaire. Baseline simulée de Préparation conservée.

CI complète du SHA livré et recette navigateur compilée des nouvelles pièces jointes encore à qualifier. La recette préparée de Claude avait constaté l’absence du bouton ; elle ne prouve pas ce nouveau parcours. Aucun client, fournisseur réel, activation, publication, main ou déploiement.
