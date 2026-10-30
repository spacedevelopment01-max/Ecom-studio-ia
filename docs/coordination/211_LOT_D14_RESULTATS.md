# #211 — D14 : choisir l’identité acquise sans racheter une recherche

**Fait :** choix explicite de la proposition textuelle de Préparation depuis SYNA, devis **0 %**, confirmation distincte, version native et reçu vérifiable. Aucun logo, média, Site ou publication créé ; aucune validation juridique ou créative réelle. Drapeau supplémentaire `STUDIO_CONVERSATION_BRAND_REVIEW` fermé par défaut et dépendant du drapeau marque.

Code natif compilé et recette complète : **`5493d7c02d3a06493c32e2ad227a69ecbdac255f`**. Version finale de l’interface : **`e404093c4b711b4dc51980b87b0a9c75e884ceaa`**, types/build propres puis captures des acquis ; seuls un libellé et le diagnostic du harnais changent, backend et worker identiques. Parent #268 `ecdd9cd633022d5289565d1b061253a48c4adc17` ; chaîne de dépendances conservée, aucune fusion implicite de branches Claude.

## Corrections et protections

- `brand-review-contract.ts`, `brand-review-execution.ts`, route `/brand-review`, `conversation-brand-choice.tsx` : propriétaire/CSRF, abonnement natif, données et révisions attendues, devis expiré, identité/source courantes, transaction et reçu de version immuable. L’outil cognitif `brand.confirm` propose seulement l’action ; son texte ne vaut jamais accord. Le devis montre nom, signature, couleurs et typographies appliqués. Confirmation idempotente à 0 %, même budget IA épuisé ; abonnement requis. Aucun job ou appel ajouté au choix.
- Marque déjà confirmée, données fournies, identité artistique, logo, étapes aval et thème existant protégés. Une proposition historique ne remplace pas un choix humain. Aucun coût, nom, couleur ou route arbitraire accepté dans la requête client.
- **Défaut transversal reproduit à l’inspection :** confirmer l’identité rendait une recherche acquise périmée à offre identique. `marketing-strategy/research.ts` et le vrai `preparation/engine.ts::confirmIdentity` conservent maintenant une preuve de compatibilité liée à la version native confirmée, au reçu de recherche et à l’intégralité des faits/brief/contraintes/documents de l’offre. Les mêmes angles sont reprojetés localement ; recherche, choix actif et quota restent identiques. Aucun nouveau marché ou angle inventé, aucune IA appelée.
- Une modification réelle du produit, des contraintes client ou des sources, une preuve forgée ou une version native altérée restent refusées. Les changements cosmétiques ultérieurs n’invalident pas une étude de marché intacte. **Les contenus/publicités acquis ne sont pas retagués** : leur empreinte complète d’identité et leurs contrôles aval restent distincts.
- Le libellé parent « aucune identité activée » était trompeur après le choix : corrigé en « aucun choix automatique ». `agent211-failure-diagnostic.ts` enrichit les prochains échecs de recettes isolées avec états SQL et journal expurgé, sans enlever scénario, assertion, délai ou contrôle réseau. Son exercice volontaire en lecture seule ne constitue pas un échec navigateur D14 et n’est pas joint comme tel.

## Vérifications réellement exécutées

**99 tests ciblés distincts / 9 fichiers**, types, build propre, recette Chromium/SDK/worker/HTTP local réussis. [Commandes exactes, dates, SHA et empreintes des sources](preuves-211-D14/checks.json). Les deux régressions recherche ont d’abord été reproduites en rouge, puis corrigées ; leurs états initiaux sont conservés dans cette preuve.

```bash
node node_modules/vitest/vitest.mjs run tests/conversation211-brand-review.test.ts tests/preparation.test.ts tests/mission160-strategy.test.ts tests/conversation211-strategy-choices.test.ts tests/conversation211-brand.test.ts tests/conversation211-generation-schema.test.ts tests/conversation211-social-preview.test.ts tests/ci-native-brand-placement.test.ts tests/ci211-verdict-complet.test.ts
node node_modules/typescript/bin/tsc --noEmit
# DATA_DIR temporaire isolé, STOCK_OFFLINE=1 ; aucune configuration client
npm run build
# Garde réseau fournisseur active, Chromium système, HTTP loopback simulé
node --import tsx scripts/verify-agent211-build.ts CHEMIN_PREUVE_NEUF --brand-ui --brand-review
```

Trois parcours : mètre pliant, entretien de harpes, **nouveau cas réservé étui pour anches de basson**. Aucune règle applicative dépend de ces noms. Choix natif version 6, recherche prête/reçu exact, angles/quota conservés, 0 nouveau job/appel au choix, doublon même version et rechargement gratuit. Authentification 401, autre compte 404, CSRF 403, champs forgés 400. Proposition précédente conservée après une seconde génération simulée 503, un seul essai. Contrôles aux largeurs 1440/1024/390/360. Concurrence, consentement, expiration, crédit épuisé et protections des acquis également testés par dépendances injectées.

**Zéro fournisseur réel / 0 € réel.** Les traces/coûts fictifs ne sont ni des factures ni une preuve de compréhension ou qualité créative. Les noms, textes et recherche de recette sont synthétiques. Aucun thème/CMS/export modifié par ce lot.

## Preuves et état de livraison

[Devis mobile](preuves-211-D14/01-devis-mobile.png) · [Choix mobile](preuves-211-D14/02-choix-mobile.png) · [Ordinateur](preuves-211-D14/03-choix-ordinateur.png) · [Film réel 11,04 s](preuves-211-D14/choix-identite.mp4) · [Trois parcours natifs](preuves-211-D14/native-proof.json) · [Lecture des acquis sans worker](preuves-211-D14/saved-captures.json) · [Inventaire](211_D14_PREUVES.json).

Les captures finales ont été ouvertes et recadrées sur le reçu. Film et devis proviennent du build 5493d7c0 ; les deux captures après choix du build e404093c. Leur relecture ne crée ni job, appel, version ou média et conserve les données de préparation. Le film n’est pas présenté comme une capture du dernier libellé. Pas de multiplication des générations pour la présentation.

**CI finale complète requise, PR en brouillon à cette rédaction.** Pas de seconde suite complète locale redondante. La recette existante de proposition de marque est étendue au choix ; tous les contrôles antérieurs restent présents. #265 est verte ; #266 échoue sur l’attente du reçu d’annulation de composition, #267 sur une proposition de retouche. Ces échecs restent visibles et leur cause historique n’est pas déclarée résolue par un succès ciblé ultérieur. Aucun relancement général aveugle. #268 est encore en cours.

**#211 reste partielle :** édition ciblée d’identité, autres outils métier/blog, critique visuelle IA et intégration finale notamment. Fournisseurs réels et qualité professionnelle restent non qualifiés. Aucun main, merge, déploiement, activation du Studio réel, budget/donnée client ou composition/branche Claude modifié.
