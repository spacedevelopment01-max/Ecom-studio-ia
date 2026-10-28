# #211 — F2 : en-tête Images lisible dans l’espace disponible

**Livraison pour revue dans #226.** Branche `codex/211-f2-entete-images`, application corrigée `35c2688fa0d5f15db18bbd8a772476c719051c1c`, dernier harnais/build propre réellement servi `510e54ad6c6020e1011167e47e6847decf8b92b1`. Parent D6 #224 `ef67bebe88c73d803d34d03536f80c64f41e4bae`. Aucun merge, activation ou déploiement.

## Constat et correction

Le navigateur reproduit un titre réduit à **95,5px** à1440px avec SYNA ouvert, et1024px en mode manuel. Le code imposait une rangée à partir de la largeur du viewport640px, avec boutons non réductibles, même quand SYNA laissait peu d’espace au contenu. Les mesures et captures du build propre antérieur `012c989fc32fc647dbb5f46bc50dbc4c600483cb` sont conservées.

La modification applicative porte uniquement sur [tab-images.tsx](../../src/components/studio/tab-images.tsx) : la disposition dépend désormais de la largeur du conteneur ; elle s’empile quand l’espace manque. Importer, chercher et créer restent présents, avec leurs droits/verrous et avertissements natifs. La génération, les tarifs, budgets, médias et thèmes sont inchangés.

| Largeur et état | Titre avant | Titre après |
| --- | ---: | ---: |
|1440, SYNA fermé|511,5px|511,5px|
|1440, SYNA ouvert|95,5px|646px|
|1024, SYNA fermé/ouvert|95,5px|646px|
|390, fermé/ouvert|316px|316px|
|360, fermé/ouvert|286px|286px|

Les quatre largeurs passent sans débordement horizontal, sans troncature interne des boutons et sans erreur JavaScript. Le panneau mobile SYNA masque intentionnellement le fond ; les captures panneau fermé montrent l’en-tête et ses actions.

## Vérifications exécutées

- `npx vitest run` : **3 724 réussis /45 ignorés**,430 fichiers réussis/un ignoré,1 484,36s, sur les sources gelées de l’application35c2688f.
- `npx tsc --noEmit` : réussi, y compris après les précisions du harnais.
- `NEXT_TELEMETRY_DISABLED=1 npm run build` : réussi sur le code applicatif initial, puis sur le commit propre final510e54ad.
- `npx tsx scripts/verify-image-bank-header.ts <dossier-isolé> 012c989fc32fc647dbb5f46bc50dbc4c600483cb --before` : reproduction du défaut, attendue et vérifiée.
- Même commande sur `510e54ad6c6020e1011167e47e6847decf8b92b1`, sans `--before` : recette après correction réussie.

Le test navigateur est dans [tests/image-bank-header-browser.ts](../../tests/image-bank-header-browser.ts), appelé explicitement par le [harnais isolé](../../scripts/verify-image-bank-header.ts). Il n’est pas collecté par Vitest. La dernière précision concerne uniquement ce harnais : centrer l’en-tête dans la page pour voir toutes ses actions, puis vérifier avec `elementFromPoint` que le centre de chacun des trois boutons est réellement accessible en mode manuel. Ces contrôles passent aux quatre largeurs. Application et tests unitaires restent identiques à35c2688f ; types, build propre et recette autonomes sont rejoués après ce changement.

Les premières captures à360px plaçaient encore les actions sous le pli de page. Elles restent dans l’historique local ; les captures finales recadrent la page par un vrai défilement du navigateur, sans modifier les PNG. Un premier échec du harnais venait de la transformation d’une fonction JavaScript locale dans `evaluate` ; il a été corrigé dans le test, sans changer le moteur applicatif.

**16 PNG originaux avant/après**, quatre planches de navigation, mesures complètes et journaux. Les planches et des originaux ordinateur/téléphone ont été ouverts et inspectés. Les dialogues de recherche et de création sont ouverts puis fermés, sans soumission. Le bouton d’import est conservé ; un téléversement réel n’a pas été exécuté.

## Coût, limites et dépendances

Le harnais utilise un Studio compilé isolé, un compte/projet fictifs et une base temporaire, sans worker de génération ni fournisseur. **Zéro ligne `ai_calls`, zéro tâche, zéro usage ; zéro fournisseur réel/coût réel.** L’avertissement natif de fournisseur absent reste visible. Ces captures ne constituent pas une qualification de génération d’image ou de fournisseur.

Recette FR uniquement, sur une banque produit vide. Les formulaires propres aux services, l’anglais, un import effectif, les générations, l’instance client et les CMS n’ont pas été testés ici. Aucune vidéo spécifique à cette correction d’en-tête ; les preuves sont les PNG et traces de géométrie/interactions. Aucun projet client/VANS étape1/Contretemps, média, forfait, budget ou composition de Claude n’est modifié.

Le défaut distinct Site390×844 est livré dans #227 ; D7 #225 et E4 #222 sont des branches sœurs à préserver. Ce correctif Images ne les intègre pas et ne suffit pas à déclarer toute la CI verte. Tous les contrôles de thèmes restent conservés ; aucune mise à jour de l’instance client.

[Avant/après et téléchargements](preuves-211-F2-images/README.md) · [mesures, commandes et empreintes](preuves-211-F2-images/verifications.json). Les fichiers distants et des retéléchargements doivent être vérifiés avant l’annonce de publication. **F2 et #211 restent partiels : la couverture exhaustive, les autres outils et la qualification IA réelle restent ouverts.**
