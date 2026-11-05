# Supprimer un dossier entièrement vide depuis SYNA

5 novembre 2026, Europe/Paris. Parent #435, `b24179b6`. Raccordement à la primitive native atomique, sans modification des composants Claude. **Statut PARTIEL jusqu’à la carte, la recette compilée commune et la CI finale.**

## Demande et résultat

Phrases exécutées sur produits et services, préparés et neufs : « Supprime le dossier vide “Dossier ciblé” », « Peux-tu supprimer le dossier “Dossier ciblé” ? », « Je voudrais supprimer le dossier vide “Dossier ciblé” » et « Efface le dossier vide Dossier ciblé ».

Cible unique par nom ou identifiant exact dans ce projet et dans Fichiers. Un homonyme, un parent inconnu ou un dossier absent clarifie ; aucun premier résultat choisi. Dossiers système, sous-dossiers et toute référence de fichier, **y compris dans la corbeille**, empêchent la proposition. Ni fichier ni rattachement modifié implicitement.

Le dossier seul est supprimé définitivement après accord explicite. Le parcours natif ne restaure pas un dossier supprimé ; l’aperçu doit l’annoncer. Annuler avant accord conserve entièrement le dossier. Une réponse perdue se reprend par GET ou rejeu exact ; un nouveau dossier homonyme créé après le reçu n’est jamais supprimé par ce rejeu.

## Contrat pour Claude

`STUDIO_CONVERSATION_FOLDER_DELETE=1` sous FILES/LOT_A/AI/CONTEXT, fermé par défaut. Propriétaire, forfait actif et onglet Fichiers obligatoires ; aucune ouverture de cette capacité nouvelle sur A1.

Vue `localFolderDeleteExecution.enabled` et présentation `localFolderDelete` :

- `schema:'syna-folder-delete-1'`, états `ambiguous/proposed/applied`, `projectId/nativeHref/message`.
- `destructive:true`, `reversible:false`, `financialConsent:false`, `costEur:0`, `providerCalls:0`, `publication:false`.
- `diff.before:{id,name,parentId,system:false}` et `diff.after:null` ; parent `{id,name}` lorsqu’il existe.
- `confirmationRequired`, `proposalId`, avertissements ; après accord, `result:{id,deleted:true,parentId}`, `receiptId=requestId`, `actionsExecuted:true`.

POST `confirm-folder-delete` : `confirmation:true` littéral, proposition/révisions/requestId ; `cancel-folder-delete` distinct. Cible et arbre complets épinglés, TTL15min, droits avant cache, transaction dossier/reçu, résultat relu comme l’arbre précédent moins ce seul dossier. Contrôle de toutes les références de fichiers répété atomiquement. L’aperçu ne lance pas `listFolders`, dont l’initialisation native écrirait des dossiers de base.

Carte attendue : nom et parent, avant/suppression, avertissement de suppression définitive, accord gratuit séparé, annulation, verrou/péremption/reprise partagés et handle anti-devis. Après reçu, émettre `studio:files-changed` pour relecture. Si le dossier supprimé était ouvert, sélectionner son parent ou la racine à partir de `result.parentId` ; **ne pas réutiliser une logique de création qui sélectionnerait l’ID supprimé**. Le listener actuel de `tab-fichiers.tsx` recharge mais ne traite pas cette sélection après suppression : adaptation logique à faire chez Claude, sans changement graphique requis.

Les devis et confirmations cognitifs génériques sont refusés avant fournisseur/job pour cette demande gratuite, même après annulation. Code HTTP409 `conversation_free_folder_reply`. Les mots contenus dans un nom cité restent des valeurs : `outsideQuotes` et priorité de ce domaine empêchent un autre aiguilleur de les consommer.

## Tests et limites

**31 nouveaux tests verts ; 225 tests distincts /10 fichiers et types verts**, en deux ensembles disjoints :149/7 puis76/3. Vrais handlers conversation et listing natif, attente réelle17s puis GETprojet/accord/GETrésultat/rejeu. Arbre et octets d’un fichier acquis voisin inchangés ; refus de fichier actif/corbeille/sous-dossier/système, homonymes, consentement obligatoire, annulation, concurrence après aperçu, TTL/contexte, droits avant cache, rollback, nouveau homonyme après reçu, solde IA nul, A1 et drapeau fermé. Régressions des dossiers, textes réservables, métadonnées Fichiers, registre et devis cognitifs légitimes repassées.

Les tests des endpoints cognitifs utilisent aussi un ancien payload de devis **inséré comme fixture**, et vérifient qu’il ne crée aucun job. L’endpoint corrigé ne crée pas de devis. Aucun fournisseur réel : fetch interdit, garde réseau Node et stockage fictif isolé.

Logs `/tmp/parity301-folder-delete-{first,final,registry-cognitive,types-final}.log`. La recette HTTP17s ne remplace pas la recette navigateur Encre/Plein ordinateur/tactile, préparé/neuf, avec dossier réellement disparu de l’arbre visible. Aucun nouveau build ou capture UI revendiqué pour ce contrat. Drapeau fermé jusqu’à intégration Claude, puis CI du SHA commun.

Aucune dépense, modification de projet client, activation, fusion main ou mise en production. Le libellé d’annulation du texte réservable voisin a également été corrigé pour parler de texte, pas de fermeture ; aucune modification de son comportement ou de sa carte numérique.
