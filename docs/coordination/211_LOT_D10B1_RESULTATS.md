# D10b1 — Scénarios approuvés et devis vidéo lisibles

Suite de #211 après D10a/#238, **préparation du raccordement génératif D10b, pas une livraison de clips/voix IA depuis SYNA**. Branche `codex/211-lot-d10b-clips-voix`, base exacte `ab32ffcec753a35f2213990aebecbb39756cbaf9`. PR **#243**, code testé/compilé **`c827531fcccc615c4d5b7b7cfe550477fedfe98f`** ; publication documentaire distincte. Ni merge, activation, déploiement, fournisseur réel, client ou composition Claude touchés.

## Changements

- Le vrai moteur en scènes garde les champs d'un scénario approuvé. Il n'ajoute plus un bouton commercial quand le bouton accepté est vide, ni des phrases de voix manquantes, ni des scènes locales de remplacement. Couleur explicitement choisie conservée dans le schéma partagé et le document.
- Le scénario non représentable, incomplet, placeholder ou citant une marque tierce est refusé **avant signature/sauvegarde de l'accord dans l'API native et avant le premier média dans le worker**. Le client peut le corriger et relire ; aucune suppression de texte présentée comme une réussite. Les règles de vocabulaire sont contrôlées, sans remplacement implicite du scénario explicitement relu.
- Une scène de18secondes pouvait être silencieusement ramenée à15secondes. Le moteur exige maintenant assez de scènes pour la durée. Les requêtes hors plages natives sont refusées ; aucun clamp implicite.
- Le devis local SYNA lit les vrais documents avant/après : images/vidéos sources, texte intégral, durées, mouvements de caméra locale, transitions et gains/pistes audio. Musique en français/anglais. L'ancienne version se déplie sans modifier ni rendre le montage ; aucun nouveau fichier, version ou appel nécessaire pour lire ce devis.
- Ce panneau montre **les sources et réglages**, pas un rendu animé anticipé ni une analyse de vision. Le cadrage d'un zoom peut masquer des bords de l'image ; il ne crée pas un nouveau point de vue. Les contrôles créatifs natifs et leurs limites restent distincts.

## Preuves déjà acquises, à compléter après build exact

- Avant correctif :7nouveaux contrôles rouges sur7, sources inchangées. Reproduction de l'ajout de voix/bouton, perte de couleur, retrait de texte et acceptation d'un scénario incomplet/non représenté.
- Après :59contrôles natifs réussis. Puis26contrôles de contrat, aperçu et vrais petits rendus locaux réussis.
- Défaut de durée reproduit séparément :1rouge/7réussis. Après correction :**92contrôles ciblés dans9fichiers réussis**, sources figées.
- `npx tsc --noEmit` réussi après correction du typage d'une assertion de test ; premier échec conservé. Pas d'échec de compilation masqué.
- `npx vitest run` : **3961réussis/45ignorés,455fichiers réussis/1ignoré**, sources figées,711,12s. `npm run build` : nouveau build vierge exactc827531f réussi, sans artefact antérieur. Quatre parcours natifs de montage local sur ce build réussi :1440/1024/390/360px, aperçu avant/après explicitement ouvert, caméra/transitions/musique/gains vérifiés, lecture et téléchargement des12MP4/SHA et4documents JSON, réouverture, retouche/restauration/réutilisation et panne d’encodeur simulée. Aucun débordement ni erreur JavaScript observé.
- Garde réseau externe actif ; données synthétiques dans des bases isolées. Coût réel0. Les tests natifs unitaires ont des médias/contrôles injectés ; ils ne qualifient ni fournisseur, ni création IA, ni qualité artistique.

## Périmètre et limites

D10a garde ses opérations locales et ses drapeaux fermés. D10b1 ne raccorde pas encore les outils conversationnels de génération de clips et de nouvelle voix. Les devis historiques `sceneChainQuote` restent des allocations de planification et ne deviennent pas des plafonds garantis par ce correctif. La suite doit partager les builders exacts, borner cognition/critique/images/clips/TTS sous l'enveloppe commune et vérifier les reprises/incertitudes.

La couleur passe désormais sans perte dans le contrat/document ; cela ne prouve pas que tout pixel final conservera cette couleur, le moteur natif de rendu possède déjà une correction locale de contraste. Aucune nouvelle qualification du contraste, d'une voix réelle, du mouvement continu, d'un fournisseur, de l'intelligence ou d'une composition professionnelle n'est revendiquée.

Points vérifiés pour la suite : le sujet vidéo historique n'est pas encore le catalogue natif D8 ; ne pas choisir le premier produit ni confondre leurs versions. Raccorder le binding natif produit/variante/service et les empreintes de référence. Le secours de `aiClip` doit respecter une future route explicitement consentie. Aucun moteur parallèle, fournisseur ajouté, identité/angle activé, publication ou DNS réel.

La suite de la mission demeure D10b2→D11→D12/E/F ; domaines dépendants de Claude #232. Ce rapport de préparation ne constitue pas une fin de #211 ni une version activée du Studio client.


## Livrables et reproduction

[Galerie des92captures finales,4films et12MP4 natifs](preuves-211-D10b1/README.md) · [vérifications](preuves-211-D10b1/verifications.json) · [matrice de couverture](211_D10B1_COUVERTURE.md).

Après le parcours compilé, trois reprises sur des copies distinctes des seules données fictives :

- API native :20requêtes négatives refusées avant accord,4scénarios valides retournés exactement,12anciens MP4 retéléchargés et comparés ; aucun worker, SDK, usage, réservation, tâche ou version créé. Quatre entrées de scénario sont sauvegardées intentionnellement dans la copie de recette, sans médias.
- Galeries/SYNA :16captures,8téléchargements, trames peintes dans le lecteur ; compteurs et versions inchangés. Les quatre captures de réutilisation initiales restent séparées comme diagnostics. Pas de remplacement ni de nouvel encodage.
- Échec rouvert :2captures ordinateur/téléphone montrant effectivement la carte,3anciens fichiers inchangés ; aucune relance, diagnostic technique native conservé, conversation sans commande ni chemin serveur.

92captures finales+4initiales diagnostiques ;15planches de captures ouvertes ;4films MP4 et leurs WebM originaux (trames/durée conservées, trois trames comparées),12MP4 natifs+12JSON de versions+8sources PNG.36trames de4MP4 natifs extraites et ouvertes. Les films gardent le splash/ouverture et les marges grises natives des changements de viewport. **Inspection échantillonnée, aucune lecture humaine continue de tous les films ni évaluation créative professionnelle revendiquée.** Recette UI en français ; pas de parcours anglais distinct nouveau.

20inférences texte HTTP fictives+20requêtes auxiliaires de comptage,20usages connus158240micro fictifs.22lignes `ai_calls` comprennent deux préparations de stratégie service injectées, pas22inférences.0appel image/clip/voix et0coût fournisseur réel. CPU/stockage/traffic non chiffrés ; «0%IA» ne signifie pas infrastructure gratuite. Quatre activités fictives : cadres papier mono, outils de pliage multiples, réparation textile et révision de machines à écrire inédite. Aucune règle applicative fondée sur leurs noms. Les sources sont8fichiers de motifs techniques (deux compositions répétées), pas des photos clients. L’angle de communication des services est préparé explicitement dans le moteur natif avant la recette, pas choisi par SYNA.

Commandes réellement exécutées, dans la copie isolée sans `.env` ni donnée réelle ; garde réseau chargé par `NODE_OPTIONS=--import=…/scripts/lot9/network-guard.mjs`, et `XDG_CACHE_HOME` local pour les fontes :

```bash
npx tsc --noEmit
npx vitest run
npx vitest run tests/video-approved-exactness.test.ts tests/video-creation-rights.test.ts tests/video-beginners-direct.test.ts tests/video-mission-reliability.test.ts tests/video-scenes.test.ts tests/video-receipts-approval.test.ts tests/conversation211-video-preview.test.ts tests/conversation211-video-contract.test.ts tests/conversation211-video-motion.test.ts
npm run build
CHROMIUM=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=/workspace/reviews/ecom-211-state/playwright-runtime npx tsx scripts/verify-agent211-build.ts /workspace/reviews/ecom-211-state/D10b-browser-prep-proof --videos-ui
node /workspace/reviews/ecom-211-state/postflight-D10b-approved.mjs c827531fcccc615c4d5b7b7cfe550477fedfe98f D10b-browser-prep D10b-browser-prep-proof D10b-approved-postflight-proof
node /workspace/reviews/ecom-211-state/postflight-D10b-gallery-painted.mjs c827531fcccc615c4d5b7b7cfe550477fedfe98f D10b-browser-prep D10b-browser-prep-proof D10b-gallery-postflight-proof
node /workspace/reviews/ecom-211-state/postflight-D10b-failure.mjs c827531fcccc615c4d5b7b7cfe550477fedfe98f D10b-browser-prep D10b-browser-prep-proof D10b-error-postflight-proof
```

Les trois scripts de reprise sont joints sous `preuves-211-D10b1/traces/` ; ils prennent le dépôt courant et `AGENT211_PROOF_STATE` pour adapter le chemin des preuves. Les JSON de vérification gardent les commandes exactes de cette exécution, leurs sorties, états et empreintes. Les MP4 navigateur sont transcodés sans coupe ni accélération ; les MP4 natifs sont copiés octet pour octet. Le JSON de version dépend des médias du Studio, pas un pack autonome exportable.

## Fichiers et protections

`src/lib/video-v2/three-scenes.ts` (`approvedScenePlan`,schéma,timing), API native `src/app/api/projects/[id]/creative/video/route.ts` ; projection en lecture seule `src/lib/video-v2/quote-summary.ts` ; `conversation-video-tools.tsx` et nouveau `conversation-video-preview.tsx`, devis dans `video-tool-execution.ts` ; harnais `scripts/verify-agent211-videos-ui.ts`. Deux nouveaux fichiers de tests et extension de `tests/video-creation-rights.test.ts`.

Dixfichiers de code/163704octets réellement retéléchargés depuis GitHub et SHA comparés ; l’objet Git et l’arbre correspondent exactement au code testé. Sources figées, worker inchangé. Thèmes/compositions de Claude, clients, budgets, droits et configurations conservés. Drapeaux toujours fermés par défaut ; aucun changement de version dans le Codespace client. Espace récupéré uniquement par exclusion sparse réversible de copies Git vérifiées de rapports baseline dans nos anciennes copies propres D/E1, sans fichier unique/untracked/client supprimé, et par retrait du cache webpack généré après build, artefact compilé préservé.

#233 : CI corrective complète verte40948738461 sur f82484255abef6a42f723648188c607773980d91, distincte de ce lot. **CI de #243/code puis du commit documentaire à contrôler séparément**, aucun vert emprunté au parent. #238 également à suivre. La mission Claude #239 et ses PRs #240/#241 sont préservées ; APIs métier futures à consommer par SYNA, sans nouveau catalogue immobilier, menu ou moteur de RDV.
