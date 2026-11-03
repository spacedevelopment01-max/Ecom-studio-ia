> Source publiee #345 : `4055d6aa35d6dff3444c1cbf388efbc8ace0972f`, arbre `d0067faf9f62e24c4c143c72330f47d7857f5341`. Backend PARTIEL ; aucune carte/publisher ni qualification UI de ce nouveau raccordement. Ne pas attribuer les recettes natives ab44 a cet adaptateur.

# Contrat Claude — titre AdDoc gratuit, backend PARTIEL

Base338 `fcc2a8818395ce9e97a4a1f3af0cbbc3e8aa1948`. Branche indépendante `codex/parity301-addoc-free`. Aucun changement graphique, aucun publisher natif ni carte de confirmation implémenté dans ce lot. Seule modification du composant conversation-panel : libellé du nouveau type de cible pour préserver son union TypeScript. Ne pas annoncer parcours UI raccordé ou production qualifiée.

## Activation et périmètre

Drapeau serveur `STUDIO_CONVERSATION_AD_DOCUMENT_LOCAL=1` en plus de LOT_A, AI, SPECIALISTS, TOOLS et CONTEXT ; fermé par défaut. A1 reste lecture seule, requirePlan/ownership restent obligatoires (admin inclus). Opération catalogue `native.ad-document-edit`, `supportedActions:['title-larger']`, backend partiel. Aucune IA, image ou autre calque ; demandes qui entraîneraient un déplacement d'un autre calque sont refusées422. Le titre lui-même peut changer taille, boîte et position selon le moteur natif ; tous les effets géométriques exacts sont dans nativeEffects.

## Désignation native requise

Dans l'éditeur autorisé, cible provenant de la sélection de calque et du GET natif courant, jamais du DOM/texte ni asset JPEG :

```
useAgentFocus().setFocus({projectId,tab:'publicites',label:'Titre de création',
 target:{kind:'ad-document-text',docKey,layerId,version:view.version.version}})
```

Types réutilisés : `ActiveTargetSchema` / `ActiveContextSchema`, `agent-ui-context.tsx:Focus`. Aucun nouveau bus d'événements ni nouveau store. La version est le numéro de ligne native, PAS doc.version (schéma). Ne proposer que si document enregistré/clean ; aucun snapshot dirty du navigateur envoyé silencieusement.

Avant message, persister cette désignation via protocole A2 existant : POST `/api/studio-agent/conversations/{cid}/context`, `{action:'select',revision:conversation.revision,requestId:stableId,context:{projectId,tab:'publicites',target:{kind:'ad-document-text',docKey,layerId,version}}}`. Relire la conversation : select incrémente sa révision. `setFocus` seul n'est pas une désignation serveur persistée et ne suffit pas à l'adaptateur. A2 conserve son reference/fingerprint/canonical, conflit et revalidation explicite existants ; ne pas changer cette mécanique.

## Parole réelle et aperçu

POST `/api/studio-agent/conversations/{cid}`, commande standard `{action:'message',text:'Agrandis le titre de la création sélectionnée',revision,projectRevision,requestId}`. Variante accents/casse et ponctuation finale simple tolérée, aucune grammaire élargie. Le dispatch déterministe intercepte cette phrase sous withAiDisabled, sans classificateur/LLM, lit la cible A2 sauvegardée, rend AVANT le tx SQLite. Le retry même requestId renvoie le reçu de parole existant sans nouvelle proposition.

Réponse et GET conversation exposent `localAdDocumentExecution:{enabled:true}` et `localAdDocument` :

```
{schema:'syna-ad-document-local-1',id,proposalId,
 state:'proposed',recorded:false,delivered:false,
 target:{docKey,layerId,baseVersion},diff:{before:40,after:48},
 nativeEffects:[{field:'font.size',before:40,after:48},
                {field:'w',before:600,after:720}, ...],
 previews:{before:'/api/studio-agent/conversations/{cid}/ad-documents?receipt={id}&preview=before',
           after:'...&preview=after'},
 expiresAt,confirmationRequired:true,
 costEur:0,providerCalls:0,financialConsent:false,actionsExecuted:false,
 job:null,version:null,exportHref:null}
```

Les URLs d'aperçu GET rendent un JPEG natif avec Cache-Control:no-store ; aucun nouvel asset/version pour l'aperçu. Auth/projet/forfait/pin/version/empreinte revérifiés. Après acquisition propre, aperçu avant/après lit les versions natives prouvées, même si le pin est désormais périmé. Aucune image ni texte de calque n'est stocké dans l'état conversation ou la proposition : seulement identifiants/empreintes/effets numériques ; pas de canary titre dans cognition/Brief.

Montrer les deux images et TOUS nativeEffects, puis bouton « Confirmer gratuitement ». Ne pas rendre le devis/réponse IA payante pour ce message local ; ne pas déclarer déjà fait dans la proposition. Garder les commandes manuelles gratuites, sauvegardes, duplication, exports existants indépendants.

## Confirmation et reprise réseau

POST `/api/studio-agent/conversations/{cid}/ad-documents`, `{action:'confirm',proposalId:id,confirmation:true,requestId:stableConfirmationId}`. Patron de `local-site-confirmation-client.ts` / exports : conserver même id après réponse perdue, ne pas recréer une intention automatiquement, GET de vérification avant toute interprétation. Même proposition/id récupère même job. Nouvel id pour proposition déjà confirmée409. Même id sur autre proposition409.

Retour `state:'queued'` / running, `delivered:false`, job natif ; aucun succès optimiste. Poll GET `/api/studio-agent/conversations/{cid}/ad-documents?receipt={id}` ou GET conversation. Ne pas appeler ai_edit : toujours409 sans devis compatible. Le backend utilise UN job `agent.ad-document.local`, maxAttempts1, clé idempotente scoped native ; worker localAdEdit + saveAndRender CAS, zéro fournisseur.

Succès seulement si `delivered:true,state:'saved',recorded:true` : reçu comporte version native, asset lié, hash vérifié, exportHref PNG de cette version. `recorded_job_unfinished` signifie écriture native prouvée mais job non fini : afficher vérification en cours, aucun nouveau POST/save. Même après crash postcommit avant résultat job, worker récupère l'acquis exact via preuve atomique job/proposal/source/result/base/version/hash et zéro seconde version/média. Corruption/manquant → erreur explicite, jamais remplacement automatique.

Après succès : project.reload() puis GET natif document, garder la sélection calque/document mais version nouvelle uniquement après relecture native confirmée et consentement/revalidation A2 existants. Ne pas substituer assetId à docKey. Un autre onglet qui écrit pendant le rendu provoque409 et protège version/PNG du client, aucun merge automatique.

## Validation UI à réaliser ensemble après revue

Publisher natif explicite + carte proposition/accord/reçu dans Encre/Plein cadre, budget0 et fournisseurs sentinelles ; vérification GET/reload/export PNG ; deux onglets race409 ; réponse confirmation perdue puis retry mêmeid ; refresh automatique après17 secondes sans perte silencieuse du repère (conflit explicite si head a changé). Aucun de ces tests navigateur n'a été exécuté dans ce lot backend. Aucun déploiement/fusion.
