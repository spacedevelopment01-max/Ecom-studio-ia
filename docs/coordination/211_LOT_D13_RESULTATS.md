# #211 — D13 : proposition textuelle de marque native

Le dialogue pouvait proposer une recherche ou des logos, mais ne pouvait pas préparer l’identité textuelle par Préparation. Le raccordement suit maintenant : **dernière consigne entière → devis natif → accord distinct → worker → proposition/version de Préparation → carte SYNA → reprise**. Il ne confirme pas l’identité et ne crée aucun logo, média, thème ou publication. Drapeau `STUDIO_CONVERSATION_BRAND` fermé par défaut.

Application compilée et contrôlée : **`3fdf3c32055a948735e37d7c8802b2454590c78b`**. Harnais final : **`bf0046ba13b9005bde6c2bff19e2bb343e8435d9`**, `src/` et `worker/` identiques. Parent : #267 `6a75de1f9ba7d6a940b36c0a86c1bc638c350540`, puis #266/#265 et parents ; ne pas appliquer les mêmes changements deux fois. `main` et branches Claude restent intacts, aucune intégration de #245/#247/#248.

## Fait et vérifié

- `brand-tool-execution.ts`, contrat/route `/brand`, worker : serveur propriétaire, droits natifs, révisions, tarifs/financement, plafond natif et enveloppe commune, accord distinct, idempotence. Aucun résultat cognitif traité comme consentement ou livrable. La consigne enregistrée entière atteint `realDependencies.identity` puis le SDK ; le schéma conversationnel existant normalise les espaces en début/fin, pas ceux au milieu ni les retours à la ligne.
- Moteur Préparation conservé (`deps.ts`, `engine.ts`, `quote.ts`, `types.ts`). Les tâches SYNA ont un type distinct empêchant un ancien worker de réclamer ce contrat. **Défaut reproduit et corrigé :** ce renommage excluait les tâches du compteur et faisait entrer la deuxième demande en collision. Cohorte et exclusion concurrente natives communes désormais conservées ; deux essais au plus sur les mêmes données, troisième refusé avant devis, versions précédentes intactes.
- Acquisition complète en checkpoint, provenance/trace liée au job et version native immuable liée à ce même job avant toute annonce « enregistrée ». `done {}` n’est pas une livraison. Garde de contexte après acquisition et dans la transaction finale ; annulation ou choix humain préservés. Résultat acquis consultable et demande identique réemployée gratuitement avant toute nouvelle vérification de crédit. Reprise explicite du même enregistrement à **0 %**, sans nouveau fournisseur, après échec récupérable ; aucun retry automatique.
- Marque confirmée, logo/identité artistique et étapes aval protégés. Le nom fourni reste prioritaire ; la marque active n’est pas remplacée. Candidat toujours **à relire, non qualifié et non approuvé**. Contrôle natif local, éventuelle correction bornée : aucune prétention à un critique IA indépendant ou une disponibilité juridique vérifiée.
- `conversation-brand-tools.tsx`, panneau, contexte cognitif et registre : devis avec consigne complète et maximum en %, résultat textuel, erreurs/provenance/historique, reprise et lien Préparation. Schémas fournisseur fermés inchangés lorsque le nouveau module est désactivé. Aucune clé, saisie de plafond ou route venant du client.

## Contrôles exécutés

**60 tests ciblés distincts / 10 fichiers**, types, build et navigateur passés. Détail exact des commandes, dates, SHA et statuts : [checks.json](preuves-211-D13/checks.json). Les trois tests du verdict CI rejoués ne sont pas recomptés.

```bash
node node_modules/vitest/vitest.mjs run tests/conversation211-brand.test.ts tests/conversation211-research.test.ts tests/preparation.test.ts tests/preparation-adapters.test.ts tests/preparation-preuve-api.test.ts tests/conversation211-generation-schema.test.ts tests/conversation211-social-preview.test.ts tests/conversation211-clip-preview.test.ts tests/ci211-verdict-complet.test.ts
node node_modules/vitest/vitest.mjs run tests/ci-native-brand-placement.test.ts tests/ci211-verdict-complet.test.ts
node node_modules/typescript/bin/tsc --noEmit
# DATA_DIR temporaire neuf, STOCK_OFFLINE=1, aucune configuration client :
npm run build
# Réseau fournisseur interdit ; HTTP local seulement, Chromium /usr/bin/chromium :
node --import tsx scripts/verify-agent211-build.ts CHEMIN_PREUVE_NEUF --brand-ui
```

La recette emploie le **Studio Next compilé en production**, le vrai worker et le SDK vers un serveur HTTP local fictif. Produit : mètre pliant ; service : entretien de harpes confiées ; cas supplémentaire réservé : classement d’archives familiales. Les noms ne figurent dans aucune règle applicative. Consignes de **1 274 / 1 278 / 1 284 caractères** retrouvées intégralement dans le SDK ; candidats dans la version native 3 et l’API Préparation ; nom fourni et marque active conservés. Vérifications **1440/1024/390/360**, sans débordement horizontal ; lecture/rechargement gratuits ; HTTP 401/404, CSRF 403 et plafond forgé 400. Seconde demande 503 : **un seul envoi**, tâche en échec avant 100 %, aucun candidat local de remplacement, premier acquis intact.

Les limites d’essais, concurrence, annulation et reprise d’un checkpoint après interruption d’enregistrement, devis expiré et budget épuisé sont vérifiés avec dépendances injectées. La panne 503 et les parcours produit/service sont aussi rejoués dans le navigateur. **Aucun fournisseur réel ni coût réel : 0 appel / 0 €.** Les dix requêtes HTTP locales, traces de fixtures et coûts fictifs ne sont pas des factures ou une preuve de qualité créative.

Premier navigateur arrêté sur un bouton d’ouverture absent parce que la fixture avait déjà ouvert le dialogue : cause constatée, harnais corrigé, même compilation réutilisée. Les premières captures cadraient le bas de longues cartes ; deux captures finales relisent les acquis existants, sans worker, sans tâche ni appel supplémentaires et sans changer leurs données. [Preuve de cette lecture](preuves-211-D13/saved-captures.json).

## Preuves sélectionnées

[Mobile](preuves-211-D13/01-proposition-mobile.png) · [Ordinateur](preuves-211-D13/02-proposition-ordinateur.png) · [Film réel des interactions](preuves-211-D13/proposition-marque.mp4) · [Trois parcours et traces natives](preuves-211-D13/native-proof.json) · [Inventaire](211_D13_PREUVES.json).

Quatre captures ouvertes, deux retenues ; un film. Les captures finales montrent le premier résultat conservé après une correction en échec, d’où l’avertissement de contexte historique. Elles ne montrent pas une identité activée. La recherche en arrière-plan est une fixture générique explicitement simulée, pas une étude pertinente de ces activités.

## CI, dépendances et reste

Une seule CI complète sur la tête finale sera exigée avant « prête pour revue » ; recette native marque ajoutée au job compilé avec garde réseau et artefact, sans retrait des contrôles précédents. Pas de seconde suite complète locale redondante. CI encore en attente à cette rédaction : aucune qualification verte présumée. #263 reste bloquée par sa seconde CI (retouche image, diagnostic distinct) ; #264 ancienne CI annulée à la limite cumulée ; #267 traite séparément la durée des contrôles sans en retirer.

**#211 reste partielle.** Confirmation/édition de l’identité dans le dialogue, autres outils non raccordés (dont certains contenus métier/blog), critique visuelle IA et intégration finale restent à terminer. La confirmation manuelle native existe ; elle n’est pas exécutée ici. Pas de modification de compositions Claude, d’export, de CMS installé, de Studio réel, de budget client ou d’activation de drapeau. Aucun merge ni déploiement. La qualité professionnelle et la compréhension des fournisseurs réels attendent des essais distinctement autorisés.
