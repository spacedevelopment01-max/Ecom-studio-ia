# A1 : lire les métadonnées de prompts sans droit d’édition

Les quatre cas produits/services, bibliothèque complète/favoris, reproduisaient une absence de lecture dans A1 malgré le lecteur natif disponible. Le raccordement réutilise listLocalPrompts/localPromptsView et le lecteur privé du compte. Aucun nouveau moteur, table ou Préparation.

## Accès explicite et fermé par défaut

STUDIO_CONVERSATION_EXISTING_PROMPTS_READ=1 et les gardes natifs LOT_A/AI/PROMPTS ouvrent seulement cette consultation sur A1. Aucun drapeau client, environnement, .env ni déploiement n’est activé. EXISTING_LOCAL peut rester fermé : le droit de lire n’est pas un droit de modifier.

Le projet et la conversation doivent toujours appartenir au demandeur, avec le forfait actif exigé par la reprise. Les corps de prompts ne sont ni exposés dans le DTO, ni stockés dans l’état conversationnel, ni transformés en consignes/faits. Les titres et catégories restent des données marquées non fiables. Scope explicite : account_not_project. Limite20, total/truncated et favoris natifs inchangés. Aucune exécution, modification, copie de prompt ou consentement financier.

## Contrat Claude

- Vue existante localPrompts/localPromptsRead, schemas identiques au mode normal. A1 ajoute recovery.localReads={schema:'existing-local-read-1',ops:['prompts'],readOnly:true,confirmationRequired:false,costEur:0,providerCalls:0,financialConsent:false}.
- recovery.localEdits reste séparé. actionsEnabled et aiEnabled restentfalse,projectRevision:null,creation:null,correctionFields:[]. L’absence de Préparation des cas testés reste conservée.
- La carte de lecture doit utiliser **localReadAllowed(view,'prompts')** dans src/lib/existing-local-edits.ts, puis les marqueurs readOnly et l’état listed/ambiguous du DTO. Ce helper fonctionne aussi sur projets normaux/préparés ;il exige la capacité native et les marqueurs exacts de lecture pour A1.
- Ne pas utiliser nativeLocalEditAllowed ou un simple !readOnlyReason/!recovery pour ce lecteur :ces contrôles concernent les écritures. Les autres cartes gardent leurs propres contrôles ;aucune permission d’écriture n’est ajoutée.
- Préserver le refus sur capacité absente ou droit serveur faux. Les tests de carte doivent représenter un vrai droit retiré (GET après retrait ou localEditsWritable:false/capacité absente),sans assimiler le verrou de fiche acquise à un retrait du droit de lire.
- Aucune confirmation ni devis pour cette consultation. Une commande mixte lecture+exécution donne une clarification sans lignes ni appel. Le drapeau retiré masque la lecture vivante et refuse l’ancien résultat mis en cache avant tout lecteur natif. Avec le drapeau fermé dès le départ, le comportement A1 antérieur de simple message conservé reste intact.

## Résultats exécutés et limites

Quatre cas manquants rouges avant raccordement. **105tests ciblés/6fichiers et types passent :16nouveaux et89régressions**. Bibliothèques et projets fictifs réels en SQLite,API auth/cookies,propriété privée/fauxfavoriétranger,cache et corps différent,forfait/drapeaux retirés avant relecture,rôle lecture distinct de l’édition,soldeIA nul,lecture sans désignation,portées withAiDisabled effectives. Une erreur native simulée annule le résultat et la révision du fil,aucun fauxlistedpersisté. Projet/site/acquis/shop.chat/bibliothèque/favoris/dépenses inchangés,stateOfnull. Aucune réserve/tâche ni tentative fournisseur.

Aucun composant Claude modifié. La carte préparée/A1 et sa recette indépendante compilée Encre/Plein ordinateur/toucher restent à qualifier ;aucune paritéUI anticipée. CI complète du SHA livré à observer. Aucun fournisseur réel,projetclient,publication,activation,main ou déploiement.
