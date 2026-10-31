# #211 — E3 : captures natives et correction du rendu dans SYNA

PR de revue **#220**, branche `codex/211-lot-e3-controle-rendu`, parent D3 #219 `6500f0efd1ea6289984babfb16c2db59407050de`. **Code réellement compilé/servi propre : `494f4ac50ea6e91da14f13ad01ad3fed002c948e`**. Le commit de livraison suivant ajoute uniquement ce rapport et les preuves. Aucun merge, activation, déploiement, redémarrage réel, fournisseur réel, connexion CMS ou modification client/démonstration.

[Galerie : 17 captures d’interface, huit captures natives complètes, deux vidéos et deux ZIP](preuves-211-E3/README.md).

## Résultat réellement obtenu

SYNA peut proposer et exécuter le contrôle de rendu natif : demande libre → proposition structurée → devis local **0 % supplémentaire** → confirmation distincte → vrai worker `agent.theme.capture` → captures complètes à 1440/390 px et mesures → fichiers conservés en bibliothèque et reçu vérifié contre leurs octets. Le client ouvre ou télécharge les captures, retrouve les acquis et reprend après reconnexion sans appel supplémentaire. Une capture ne modifie aucune version du Site. Même conversation, mêmes mémoire/jobs/bibliothèque ; le moteur utilisé est `theme/snapshot.ts` et son `themeContext`/renderer existant.

**La capture technique ne vaut pas validation esthétique.** Le reçu distingue `technical` et `creative=not_reviewed`. Le contexte cognitif indique `imagesProvidedToModel=false` : aucun modèle n’a reçu ou jugé ces images. Aucune note esthétique ou validation professionnelle n’est attribuée par le code.

Deux recettes fictives, produit (filtre à café) et service (entretien de pianos), traversent le Studio compilé et le vrai worker. Une version V1 de base et une V2 de fixture avec cadrage portrait sont conservées. Première capture de V2 ; critique explicite du **client de test** sur la légende coupée ; proposition de correction **simulée** ; devis/accord de composition natifs ; changement du seul cadrage de la section éditoriale en paysage, enregistré en V3 ; aperçu effectivement modifié ; nouvelles captures physiques V3. Les textes, données et groupes sont identiques à la version antérieure. La critique n’est pas présentée comme une analyse autonome de vision IA.

Les nouveaux JPEG ont d’autres empreintes ; la différence de proportions observée diminue. Inspection visuelle effectuée : la légende tronquée à gauche en portrait devient complète en paysage sur ordinateur et téléphone. Le compteur de cadrages potentiels reste parfois identique, ce qui confirme qu’il ne constitue pas un jugement de qualité.

Puis export Shopify **depuis SYNA** de la V3 corrigée : version du reçu vérifiée, ZIP réellement téléchargé et SHA-256 comparé. Réutilisation des captures V3, reconnexion sans nouvelle génération, refus du registre et du téléchargement par un autre compte (404), CSRF d’origine étrangère (403). Une capture rendue indisponible dans la fixture fait passer le reçu à « Contrôle non livré », sans remplacement automatique ni nouvel appel ; les autres acquis restent conservés.

## Ce que le contrôle mesure et conserve

- Pages entières, attente du chargement des polices, décodage des images, largeur du document, débordement horizontal, erreurs JavaScript ; dimensions naturelles/rendues et cadrages potentiels documentés.
- Source native hydratée avec le catalogue/bien du projet, empreinte complète, version/révisions et propriétaire recontrôlés avant exécution. Même source que D3 via `currentSiteSource` ; aucun second moteur de thèmes.
- Chaque JPEG a un rôle natif `theme-render-capture`, une origine locale `site`, une preuve de job/devis/source et un SHA-256. Reprise des emplacements déjà acquis après interruption, sans recapture du fichier acquis. Job fermé sans fichiers/résultat : jamais livré.
- Médias sources réellement absents détectés avant le navigateur, sans remplacement par une image simplifiée ; test par suppression physique d’un fichier **fictif isolé**. Navigateur manquant et page 404 refusés sans faux résultat.
- Drapeau fermé par défaut `STUDIO_CONVERSATION_RENDER`, en plus des drapeaux D2 ; schémas stricts, droits/forfait/CSRF et consentement distincts. Job idempotent, une tentative, `withAiDisabled` ; aucune réservation IA pour les opérations locales.
- Les captures QA sont exclues des listes de médias proposées à la composition/retouche, pour ne pas réutiliser une capture de site comme photo du produit.

Limites locales explicites : une ou deux pages par demande, captures 1440/390 px ; au-delà de 20 000 pixels de hauteur, échec annoncé plutôt qu’une page silencieusement coupée. Le moteur de capture est stateless : il rend la spécification native sans reprendre la session de panier du client, avec panier de rendu vide. Il ne teste ni l’envoi d’un formulaire, ni une réservation, ni le paiement. Les interactions restent des recettes distinctes (E2/D3) ; une page capturée ne les valide pas.

## Fichiers principaux

- `src/lib/theme/snapshot.ts` : ajout de `captureThemeEvidence`, renderer natif et vrais JPEG complets/métriques ; `snapshotTheme` existant conservé.
- `src/lib/orchestrator/conversation/render-tool-{contract,execution}.ts` : devis, accord, worker, acquis/reprise, empreintes et reçus.
- `src/app/api/studio-agent/conversations/[cid]/renders/route.ts`, `worker/handlers.ts` : API native et handler.
- `intelligence-{contract,context}.ts`, `contract.ts`, `index.ts`, `tool-{execution,flags}.ts` : proposition stricte `theme.inspect-render`, statut honnête et disponibilité. Les images ne sont pas prétendues lues par le modèle.
- `src/components/studio/conversation-render-tools.tsx`, `conversation-panel.tsx` : cartes dans le même SYNA, ouvertures/téléchargements complets et mesures, grand aperçu Site conservé.
- `export-tool-execution.ts` : export du seul helper de source existant, réutilisé sans changer les exporteurs.
- `theme-tool-context.ts`, `theme/composition/server.ts` : exclusion explicite des captures QA du choix des photographies.
- `tests/theme211-render-evidence.test.ts`, `tests/conversation211-renders.test.ts` : huit tests réels du navigateur/contrat natif sur données fictives. `scripts/verify-agent211-render-ui.ts`, extension `verify-agent211-build.ts --render-ui` et CI : boucle visible complète, tous les contrôles antérieurs conservés.

## Commandes réellement exécutées

```bash
XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx vitest run
XDG_CACHE_HOME=/tmp/ecom209-font-cache npx vitest run tests/conversation211-renders.test.ts tests/theme211-render-evidence.test.ts tests/composition211-syna.test.ts tests/conversation211-exports.test.ts
npx tsc --noEmit
XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 npm run build
CHROMIUM=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=/tmp/ecom211-playwright XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx tsx scripts/verify-agent211-build.ts /tmp/ecom211-E3-delivery --render-ui
XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 scripts/verify-theme.sh --rapide
```

**3 678 tests réussis, 45 ignorés**, 426 fichiers réussis/1 ignoré, 858,86 s ; 24 fichiers applicatifs/tests gelés identiques après exécution. 30 ciblés/4 fichiers réussis, 20,73 s ; types et build propre réussis. 24 cas Theme Check + ZIP client, aucune erreur ; **35 avertissements conservés**. Les scripts de recette ont été complétés séparément ; la première attente de recapture pointait sur le reçu de la version précédente, corrigée en attendant explicitement V3, sans retirer les assertions de livraison/version/fichier.

[Preuve intégrale, empreintes et mesures](preuves-211-E3/verifications.json). Exemple de hauteurs avant/après : produit 1440 px = 7 834 → 7 502 px, mobile = 6 486 → 6 279 px ; service = 8 515 → 8 183 px et 7 991 → 7 785 px. Aucun débordement horizontal ni image non décodée dans les huit captures. Cela n’exclut pas les placeholders de la base ou les défauts graphiques non mesurés.

**7 générations SDK locales simulées / 7 usages / 55 384 micro fictifs enregistrés. 0 fournisseur réel, coût réel 0 €.** Huit jobs locaux (quatre captures, deux compositions, deux exports), zéro réservation et zéro appel IA associés ; huit JPEG et deux ZIP enregistrés. Les requêtes de comptage restent locales et distinctes des générations. [Budgets et fichiers](preuves-211-E3/budget-et-fichiers.json).

## Inspection et limites des preuves

17 PNG d’interface et huit JPEG natifs **originaux complets** ouverts : cinq planches/72 segments, plus détails avant/après 1440/390. Six images réparties sur les deux vidéos ouvertes ; MP4 transcodés seuls, nombres d’images/durées identiques, sans coupe ou accélération. Les JPEG téléchargeables sont les fichiers créés par le moteur et comparés à leur preuve, pas des captures recomposées pour le rapport.

Les illustrations sont des **diagrammes techniques fictifs**, pas des photos client ou des créations d’un modèle réel. Les rubriques « à compléter », le placeholder d’image, les grandes sections/pied de page de la base restent visibles. La correction ne modifie que le cadrage demandé : **aucun site professionnel achevé n’est revendiqué**. Aucune composition de Claude modifiée.

Le ZIP Shopify de V3 passe les contrôles locaux et est téléchargé ; sa portée native reste `static`, installation `not_tested`. Aucune boutique, affectation distante, synchronisation de stock, envoi, réservation ou paiement réels. Téléphone émulé Chromium ; Safari/téléphone physique non testés. La critique autonome IA/vision, la nouvelle rédaction qualifiée et le mode sans thème restent non raccordés à cet incrément. Les captures de thèmes importés n’ont pas été vérifiées dans cette recette. Le harnais déterministe ne qualifie pas la compréhension/créativité réelle des modèles.

## Suite de la mission

Dépendance directe #219 `6500f0ef`, après #218 et les incréments précédents. Aucun merge, activation ni changement de `main`/Studio client. La CI distante de cette livraison reste à suivre séparément.

#211 reste ouverte : poursuivre les autres outils métiers et la création/rédaction qualifiée par les moteurs existants, sans fallback local présenté comme IA, sous les mêmes devis/accords/plafonds. Les outils absents restent explicitement non raccordés. Cette livraison fournit une vraie boucle technique capture/correction/recapture/export ; elle ne termine pas à elle seule toute la mission D/E/F2.
