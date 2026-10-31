# #211 — E6 : rédaction native d'une page depuis SYNA

## Fait

Une consigne enregistrée dans l'unique conversation → choix d'une page/type **natifs** → plafond commun et accord distinct → worker → SEO & Copywriting V2 → document versionné, texte entier, téléchargement et ouverture de l'éditeur natif. Aucun thème, approbation de contenu ou publication automatique. Rédaction/relecture/reprises ciblées utilisent le moteur et les routes existants ; pas de second moteur. Drapeau `STUDIO_CONVERSATION_CONTENT` fermé par défaut, ouvert seulement dans les recettes isolées.

Le plafond est celui de la tâche native (`DEFAULT_SEO_CAP_EUR`), pas un prix certain ; seuls ses pourcentages sont exposés au client. Toutes les tentatives partagent la borne de la demande, ses coûts/appels/échéance ; confirmation idempotente, schéma strict sans prix ni outil libre forgé. L'appel suivant reste refusé avant dépassement. Les textes acquis se relisent sans nouvel appel. Un historique de dix reçus est présenté ; pas d'invention d'acquis absent.

**Causes corrigées, reproduites avant correction :**

- Six tests rouges : en cas de panne/limite/rejet IA, le moteur pouvait livrer un remplacement local, ou réemployer un ancien mémo local, malgré une demande IA. Le contrat serveur `requireAi` interdit ces substitutions ; il conserve le comportement explicite du parcours manuel et de la découverte. Erreurs fournisseur et `CostCapReached` d'origine conservées. Une réponse vide n'est pas annoncée comme rédigée.
- Deux autres rouges ciblés : résultat déjà acquis refusé si la dernière relecture épuisait le portefeuille ; tentative au contexte périmé enregistrée comme utilisable. Contrôle contenu/version **dans la transaction de sauvegarde finale**, distinct du contrôle de crédit avant chaque nouvel appel. Une tentative périmée reste enregistrée RETRY et lisible, sans remplacer le dernier texte utilisable. L'épuisement du budget après le dernier appel ne bloque plus sa remise ; aucune borne n'est remise à zéro.
- Les consignes de plus de600 caractères ne pouvaient pas faire l'aller-retour dans le schéma de l'éditeur. Le contrat conserve les8000 caractères autorisés par la conversation, sans troncature.
- Reçu → liste native actualisée, lien vers le document sélectionné ; événement filtré par projet, saisie humaine non enregistrée préservée.

Fichiers : `conversation/content-tool-{contract,execution}.ts`, route `api/studio-agent/conversations/[cid]/content`, composant `conversation-content-tools.tsx`, drapeaux/vue/registre/contexte SYNA, `content-panel.tsx`, `seo-v2/{engine,deps,doc}.ts`, `worker/handlers.ts`, harnais/fixtures de transport/tests et recette CI. L'observateur du moteur ne signale que des versions déjà stockées ; le reçu vérifie leur identifiant, version et empreinte, jamais le seul statut done.

## Versions et contrôles

Application/build final : **`6aedfbd46b03b40ef13f2c614e7774a61c499c2e`**. Harnais final/tests : **`7bd872c746bb3ded4444f75b7c1d4f27d4e20017`** ; sources applicatives identiques au build. Premier build197d9057 réussi puis remplacé pour les deux défauts de finalisation reproduits ci-dessus ; aucune CI intermédiaire déclenchée. Parent #262 `45d5cd50489a72009ad89b794abf543c80f72df5`, chaîne précédente conservée.

**55 tests ciblés distincts / 6 fichiers** :52 sur les cinq fichiers métier/registre, puis3 sur le reproducer du transport. Les passages pendant le code se recouvrent et ne sont pas additionnés. Types réussis ; build final propre valide à nouveau TypeScript. Sources inchangées pendant chaque contrôle final.

**Chromium réel, Next compilé, worker/SDK natifs vers HTTP local simulé : deux parcours réussis.** Produit décapsuleur de poche et prestation de remise en état de stores bannes, indépendants des noms dans le code applicatif. Consignes859/863 caractères exactement décodées dans **rédaction et relecture**, cible product:main/service:atelier conservée, document natif version2, Markdown téléchargé/octets comparés, éditeur ouvert par son lien, titre non enregistré conservé après rafraîchissement. Aucune version de thème créée.

Dans chacun des deux cas, seconde demande → faux503 → **un seul essai HTTP, failed20%, aucun texte local nouveau, premier document intact**, rechargement sans appel. Anonyme401, autre compte404, CSRF403 et budget/contrat forgés400. Les unités vérifient aussi correction de contexte pendant l'appel avec tentative acquise conservée, échéance commune, forfait révoqué avant dispatch, faux done refusé, réemploi sans achat, et nouvelle lignée quand un texte a été modifié par le client.

Les deux premiers navigateurs se sont arrêtés sur une **erreur du harnais**, pas un résultat à présenter comme réussi : il lisait le dernier bloc ajouté par `llmJson` (« répondre en JSON ») au lieu du prompt métier. Après deux échecs, reproducer minimal de la structure réelle des messages, parseur de la consigne JSON et3 tests réussis ; troisième navigateur passé. Égalité exacte maintenue, aucune assertion qualité/budget supprimée. Build applicatif réutilisé pendant ces corrections du harnais.

Commandes réellement exécutées dans la copie isolée sans `.env` ni `.env.local` :

```bash
npm test -- tests/content211-required-ai.test.ts
npm test -- tests/conversation211-content.test.ts -t 'concurrent|already acquired'
npm test -- tests/conversation211-content.test.ts tests/content211-required-ai.test.ts tests/seo-v2-engine.test.ts tests/conversation211-studio-knowledge.test.ts tests/conversation211-communication-registry.test.ts
npm test -- tests/content211-wire.test.ts
npm run typecheck
npm run build
node --import tsx scripts/verify-agent211-build.ts /workspace/reviews/ecom-211-state/E6-content-verified-proof --content-ui
```

Garde réseau : `NODE_OPTIONS=--import=./scripts/lot9/network-guard.mjs`. Build dans son `DATA_DIR=/tmp/ecs-e6-final-build`. Chromium `/usr/bin/chromium`, runtime Playwright isolé. La recette refuse tout sélecteur de stockage préexistant et crée sa propre base temporaire. Aucun compte/configuration/média du Studio réel utilisé.

- [Preuves navigateur, prompts hachés et téléchargements](preuves-211-E6/browser-proof.json), [commandes/statuts avant-après](preuves-211-E6/checks.json).
- [Accord mobile](preuves-211-E6/01-devis-mobile.png), [prestation acquise sur téléphone](preuves-211-E6/02-prestation-mobile.png), [document natif sur ordinateur](preuves-211-E6/03-document-natif-ordinateur.png).
- [Film réel de l'interaction,9,52s](preuves-211-E6/redaction-native.mp4).

Quatre captures ouvertes, trois sélectionnées ; un seul film. Le faux rédacteur/jugement retournent des fixtures, **aucune intelligence ni qualité rédactionnelle réelle n'est qualifiée**, même si le verdict natif de recette est FINAL. Le contenu illustratif ne doit pas servir de texte client. Montants `simulatedMicro` = écritures fictives, pas des factures. **0 fournisseur réel, 0 € réel.**

## CI / reste / dépendances

PR en brouillon jusqu'à sa CI complète finale sur sa tête exacte. Le parent #260 a une CI rouge41082213519 : ECONNRESET dans l'ancien scénario de retouche d'image `verifyUnvalidatedTrial`, cause encore à identifier. Le parcours complet de retouche a été rejoué séparément sur le build6aedfbd4, avec succès ; les sources du scénario et du moteur image concerné sont inchangées depuis #260. Ce contrôle ne remplace pas une CI exacte verte de #260 et n’identifie pas encore la cause du reset. #258/#259 ont leurs propres CI complètes vertes et restent non fusionnées.

Périmètre : pages retournées par le plan éditorial natif (produit principal/catalogue historique/prestations/pages générales). La sélection par fiche/variante du nouveau Catalogue n'est pas encore raccordée à cette rédaction ; ne pas lui substituer implicitement le premier produit. Ce contrôle crée un document ; une retouche ciblée d'un document existant passe encore par son éditeur natif, pas par une rédaction globale. Le titre/type/page, la langue du projet et la consigne sont à relire avant l'accord. Blog, image précise par section, critique professionnelle et application automatique au Site ne sont pas raccordés à cet incrément.

Le réemploi dans une composition s'appuie sur E5 pour les cibles natives associables ; pas de nouvelle recette complète rédaction→thème→CMS installée sur ce SHA. E5 prouve séparément le raccordement acquis→composition→aperçu→ZIP ; aucune fusion de preuves présentée comme recette unique.

**#211 reste partielle :** raccordements D12/E/F restants, rédaction/retouches par offre/section, mode sans thème, autres contrôles Site et limites vidéo à terminer. Les moteurs métier et compositions Claude #245/#247/#248 sont préservés et demeurent des dépendances futures. Aucun merge, changement de main, déploiement, activation, nouveau fournisseur, envoi client ou redémarrage du Studio.
