# #211 — D18 : brouillon Blog natif depuis SYNA

**Fait / vérifié en isolation, fournisseurs simulés.** Application et build propres : `d4fd349242bf2906f0c1530fb4e7eeb91d62dac4`, parent #272 `b5b05d7f638e639715fb2a73d6f153f955dbedc2`. Le cas réservé et les corrections du harnais/faux rédacteur ont été ajoutés après gel de l’application ; `src/` et `worker/` sont identiques au build, réutilisé. La CI complète doit vérifier la tête finale de cette PR ; aucun vert anticipé.

## Périmètre

- `blog-tool-contract.ts`, `intelligence-contract.ts`, `intelligence.ts`, `intelligence-context.ts` : proposition cognitive `blog.draft`, sujet cité dans la dernière demande exacte, source et plan stricts. Module fermé par défaut (`STUDIO_CONVERSATION_BLOG`, dépendant de CONTENT/CONTEXT/TOOLS). Aucun sujet inféré par un remplacement cognitif local. Schéma ancien conservé lorsque fermé.
- Route conversation `/content`, `content-tool-execution.ts`, `blog-tool-support.ts` : devis distinct en %, consigne entière, quota maximal d’un article, confirmation séparée, enveloppe commune/16 appels maximum et plafond natif inchangés. Réutilisation du vrai `runContentEngineV2(requireAi)` / `saveBlogDraftV2`, aucun second rédacteur, publication ou connexion CMS. Le prix du routage `blog_writing` entre dans l’empreinte du devis.
- Tâche native `agent.blog.write`, handler/entitlements : droits de Blog et quota natifs avant achat puis au worker. La réservation atomique du moteur reste autoritaire ; ne pas recompter sa propre réservation avant la relecture du dernier article disponible. Sujet déjà en cours refusé avant une deuxième tâche.
- Le reçu prouve **document versionné + article natif de même propriétaire, titre, HTML, métadonnées et langue**, et le résultat du job correspondant. La création de son propre article n’invalide pas le contexte ; les autres articles/faits/sources/brief restent contrôlés. Article humain protégé à la sauvegarde : tentative conservée, échec sous 100 %, aucune livraison complète annoncée.
- Réemploi exact avant nouveau contrôle de crédit/quota ; reprise du Blog déjà enregistré après perte du checkpoint sans nouvel appel ni décompte. Modification/retrait ultérieur par le client : preuve historique consultable, état courant distinct, aucun écrasement ou recréation. Réécriture globale d’un article depuis SYNA non raccordée dans ce lot : éditeur Blog existant préservé.
- `conversation-content-tools.tsx`, `tab-blog.tsx` : sujet/devis/reçu et lien vers l’article exact, texte entier et téléchargement versionné. Ouverture native par `?article=`, actualisation du Blog et de son quota même panneau replié. Le catalogue raccorde Blog et les métadonnées déjà disponibles au lieu de les qualifier absents.

## Vérifications réellement exécutées

Commandes depuis la copie isolée sans `.env` ni données clients ; tous les statuts et commandes exacts sont dans [checks.json](preuves-211-D18/checks.json).

```bash
node node_modules/vitest/vitest.mjs run tests/conversation211-blog.test.ts tests/conversation211-content.test.ts tests/conversation211-brand-review.test.ts tests/conversation211-intelligence.test.ts tests/budget-ia.test.ts tests/prix-pourcentage-budget.test.ts tests/seo-v2-engine.test.ts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
node node_modules/vitest/vitest.mjs run tests/conversation211-blog.test.ts tests/seo-v2-engine.test.ts
node --import tsx scripts/verify-agent211-build.ts /workspace/reviews/ecom-211-state/D18-browser-final-proof --blog-ui
```

- **162 tests ciblés / 7 fichiers réussis**, types et build propres réussis. Après correction de la seule fixture Blog : **30 tests / 2 fichiers réussis**, recouvrant les précédents, pas 192 tests distincts. Aucun deuxième build pour des données de recette. Le build emploie son propre `DATA_DIR` temporaire ; cache retiré seulement après succès. Chromium utilise son runtime isolé, `CHROMIUM=/usr/bin/chromium` ; garde `NODE_OPTIONS=--import=./scripts/lot9/network-guard.mjs`, HTTP loopback seulement. Les commandes navigateur refusent des sélecteurs de stockage existants et créent leurs propres bases.
- Tests natifs : produit/service, absence d’effet du devis, droits/forfait/quota, isolation, entrées et source forgées, proposition périmée, double confirmation/concurrence, dernier article disponible, contexte modifié, article humain modifié/retiré/protégé pendant sauvegarde, preuve manquante, inventé refusé, panne sans remplacement local, reprise sans crédit ni quota neuf.
- Vrai Studio compilé/worker/SDK/HTTP local : **peigne à tisser, reprise de sièges paillés, puis presse à fleurs définie après gel du moteur**. Trois consignes de 880/880/899 caractères ; devis puis accord, vrai Blog ouvert, corps exactement égal à la version, sujet conservé par le transport fictif, fichier Markdown identique, rechargement/réemploi sans appel. Quatre largeurs 1440/1024/390/360, auth401/autrecompte404/CSRF403/champ forgé400, compteur actualisé panneau fermé. Second sujet en HTTP503 : un seul essai, failed à20%, aucun brouillon local, premier article/document intacts, aucun article décompté pour l’échec. Aucun thème créé.
- Recette finale : **18 requêtes HTTP fictives** (dont trois de préparation commune du harnais),15 lignes d’usage,106812 micro€ simulés. **0 appel fournisseur réel / 0 € réel** ; ces montants ne sont ni des factures ni une estimation de qualité réelle.

Échecs intermédiaires conservés dans les statuts : fixture ouvrant trop tard la conversation d’un projet existant ; SQL de test utilisant une colonne absente. Harnais navigateur attendait « Fermer » au lieu du bouton existant « Replier SYNA » et un titre de liste en tant que heading : sélecteurs corrigés, aucune recompilation ni contrôle applicatif retiré. Une recette complète était déjà passée, mais l’inspection a révélé un faux rédacteur générique (emballage pour un service). Sa branche de test Blog garde désormais uniquement le sujet/faits reçus ; nouvelle recette ciblée passée. Aucun fournisseur réel rejoué.

## Preuves / limites

- [Devis mobile](preuves-211-D18/01-devis-mobile.png) · [Brouillon natif sur ordinateur](preuves-211-D18/02-blog-natif-ordinateur.png)
- [Film réel du parcours,11,76s sans accélération](preuves-211-D18/blog-natif.mp4)
- [Assertions des trois parcours](preuves-211-D18/blog-native-proof.json) · [Manifeste](211_D18_PREUVES.json)

Captures réellement ouvertes : la relecture montre un **court texte de transport synthétique**, pas un article professionnel validé. Compréhension cognitive réelle, pertinence éditoriale, données de marché et qualité fournisseur **non qualifiées**. Pas d’essai CMS, publication, achat ni connexion externe. Pas de création créative autonome de sujets ni d’édition globale d’articles existants revendiquées.

Dépendance #272 et chaîne antérieure explicites. #270 et #271 ont maintenant leur CI complète verte (4328/4330 réussis,31 ignorés, tous jobs) et sont prêtes/non fusionnées ; #269 conserve son échec historique de recette vocale, diagnostic publié sans relance générale. Les autres anciens rouges ne sont pas effacés. Claude #245/#247/#248 et compositions préservés, aucune intégration de ses API métier présumée. **#211 reste partielle** : outils métier dépendants, pages/prestations/RDV originaux, critique visuelle et recette finale commune notamment. Aucun main, merge, déploiement, activation réelle, donnée ou budget client modifié.
