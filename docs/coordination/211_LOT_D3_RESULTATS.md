# #211 — D3 : exports natifs depuis SYNA

Livré pour revue dans **PR #219**, branche `codex/211-lot-d3-export-natif`, parent #218 `bf85aa4e9f71b8367e80e88ecfd6f8602f7c6146`. **Code réellement compilé et servi propre : `9841f1ae0c65ec7461b4e9b570a87a88640848e1`**. Le commit suivant ajoute uniquement ce rapport et ses preuves. Aucun merge, déploiement, activation, redémarrage réel, connexion CMS, appel fournisseur réel ou changement client/démonstration.

[11 captures originales, deux vidéos et dix ZIP téléchargés](preuves-211-D3/README.md).

## Parcours réellement exécuté

Même conversation SYNA, même mémoire, bibliothèque et worker : demande libre → réponse structurée d’un fournisseur **HTTP local simulé** proposant `theme.export` → devis local à **0 % supplémentaire** → confirmation distincte → job natif `agent.theme.export` → `cms-v2/exportAndRecord` existant → fichier versionné, contrôles natifs, empreinte SHA-256 → reçu et véritable téléchargement dans le navigateur. Aucune seconde implémentation des exporteurs.

Deux projets entièrement fictifs et cohérents : filtre à café, entretien de pianos. Pour chacun, cinq ZIP ont été créés et réellement téléchargés depuis le lien du reçu : Wix, Shopify, WooCommerce, PrestaShop, Squarespace. Octets téléchargés comparés au SHA-256 du fichier natif, ZIP décompressables et non vides. Le test ne qualifie pas l’ensemble des textes/images de ces ZIP comme professionnels ni chaque interaction après installation.

Une seconde demande identique retrouve le fichier acquis **sans nouveau job ni appel IA**. Une reconnexion retrouve les six reçus (cinq exports et une réutilisation) sans nouveau débit. Dix jobs natifs au total, tous `done`, dix archives conservées ; aucune réservation ou requête IA associée à ces jobs. Versions de thème et données de catalogue inchangées.

Contrôles HTTP réels : conversation d’un autre compte 404, téléchargement du fichier par cet autre compte 404, POST d’origine étrangère 403. Les unités contrôlent aussi forfait/révisions/expiration/versions, reprise et absence de preuve. Fournisseurs et CMS externes jamais contactés.

## Causes et protections vérifiées

- **Faux statut visible, reproduit puis corrigé** : quand l’archive acquise devenait indisponible, le reçu indiquait « Export non livré » mais reprenait le message `Terminé` du job. Le composant affiche désormais la cause propre au fichier : « Le fichier acquis manque ou a changé. Aucun remplacement ni nouvel essai automatique. » Le navigateur vérifie l’absence de lien et de `Terminé`, l’absence de nouvel export et de nouvel appel. Un job fermé sans résultat donne `result_missing`, jamais une livraison.
- **Réutilisation sûre** : le moteur natif écrit désormais une preuve additive sur les nouveaux exports : version, plateforme, job d’origine, empreinte de la spécification réellement exportée et SHA-256 du ZIP. La présence d’un nom de fichier ou d’une réponse 200 ne suffit pas. Fichier réellement lisible, rôle/origine/projet/propriétaire, empreinte, structure ZIP et non-rejet contrôlés avant livraison/réutilisation.
- **Catalogue et stock réellement pris en compte** : la source utilise `withStudioProducts(withBiens(...))`, comme le parcours natif, puis son empreinte complète. `themeFingerprint` seul ne couvre pas toutes les données du catalogue. Un stock natif modifié sans nouvelle version de thème invalide le devis ; test reproduit avec le vrai catalogue. Rien n’est écrasé. Une autre plateforme ou une source différente ne réutilise pas l’archive précédente.
- **Interruption après sauvegarde** : récupération du fichier lié au job exact grâce à sa preuve native, y compris si le lien mémoire n’avait pas encore été écrit. Aucun doublon. Une archive acquise mais supprimée/corrompue bloque la reprise, même si le lien mémoire manque ; aucun remplacement automatique.
- **Autorisation et budgets** : propriétaire/forfait/CSRF, version/révisions/expiration revérifiés ; schémas stricts, aucune commande arbitraire ou publication. Un seul job idempotent, `maxAttempts=1`, `withAiDisabled` autour de l’export. Les accords/prix/plafonds du dialogue cognitif restent distincts et inchangés. Aucun paiement ou permission de synchronisation déduit d’un export.

Les anciennes archives ne sont ni supprimées ni migrées : sans cette nouvelle preuve complète, elles restent en bibliothèque mais ne sont pas certifiées automatiquement par le nouvel outil. Un nouveau ZIP local exige alors son propre accord gratuit.

## Fichiers principaux

- `src/lib/orchestrator/conversation/export-tool-{contract,execution}.ts` : contrat strict, contexte hydraté natif, devis/accord/job, reprise, réutilisation et reçu physique.
- `src/lib/cms-v2/record.ts` : preuve additive sur les archives produites par le moteur unique ; contrôles de qualité existants conservés.
- `src/app/api/studio-agent/conversations/[cid]/exports/route.ts`, `worker/handlers.ts` : API propriétaire et exécution native.
- `intelligence-{contract,context}.ts`, `tool-{execution,flags}.ts`, `contract.ts`, `index.ts` dans la conversation : proposition `theme.export`, disponibilité honnête et drapeau fermé par défaut `STUDIO_CONVERSATION_EXPORTS` en plus des drapeaux D2.
- `src/components/studio/conversation-export-tools.tsx`, `conversation-panel.tsx`, `conversation-tools.tsx` : cartes dans SYNA, choix manuel de plateforme conservé, devis, erreurs, progression et téléchargements.
- `tests/conversation211-exports.test.ts` : 11 tests natifs ; `scripts/verify-agent211-export-ui.ts`, extension `verify-agent211-build.ts --exports-ui`, étape CI et artefacts ajoutés sans retirer de contrôle antérieur.

## Commandes et résultats

```bash
XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx vitest run
XDG_CACHE_HOME=/tmp/ecom209-font-cache npx vitest run tests/conversation211-exports.test.ts tests/composition211-syna.test.ts tests/conversation211-theme-tools.test.ts
npx tsc --noEmit
XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 npm run build
CHROMIUM=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=/tmp/ecom211-playwright XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx tsx scripts/verify-agent211-build.ts /tmp/ecom211-D3-delivery --exports-ui
XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 scripts/verify-theme.sh --rapide
```

Suite finale : **3 670 réussis, 45 ignorés**, 424 fichiers réussis/1 ignoré, 906,99 s. Quinze fichiers applicatifs/tests gelés identiques avant/après. 41 ciblés/3 fichiers réussis, types et build propre réussis, contrôles natifs des 24 cas + ZIP client sans erreur ; **35 avertissements conservés**, aucun masquage. [Vérifications et empreintes](preuves-211-D3/verifications.json).

Les premières recettes ont corrigé des erreurs du harnais : sélecteur de panneau relatif, choix Wix explicite avant de demander sa réutilisation et attente du reçu de la bonne plateforme pour ne pas confondre un ancien reçu avec le nouveau. Assertions de téléchargement/hash/réutilisation conservées. La dernière recette sur SHA propre comprend également le refus du téléchargement inter-compte. Les fixtures initialement génériques ont été remplacées par les deux scénarios cohérents déclarés, sans modification de l’application ou des données réelles.

**5 appels de génération SDK locaux simulés / 5 usages / 39 560 micro fictifs enregistrés. 0 appel fournisseur réel, coût réel 0 €.** Les dix jobs d’export ont zéro réservation et zéro appel IA. Ces coûts fictifs ne prouvent ni tarif fournisseur ni facture réelle. Les requêtes de comptage des devis restent également locales ; le compteur de générations ne les additionne pas comme des créations. [Budget et archives](preuves-211-D3/budget-et-fichiers.json).

Les 11 captures ont été ouvertes en deux planches et deux originaux clés ; six images réparties dans les deux vidéos inspectées. MP4 issus des enregistrements réels, transcodage seul : mêmes nombres d’images et durées, aucune coupe ni accélération. Téléphone émulé Chromium ; téléphone physique et Safari non testés.

## Portée exacte des plateformes

| Plateforme | Livrable vérifié sur les deux projets | Limite réelle |
|---|---|---|
| Shopify | ZIP natif, contrôles du moteur, fichier physique et téléchargement identiques | Portée native `static` dans cette recette ; aucune installation, affectation distante, boutique ou paiement vérifiés |
| WooCommerce | ZIP natif généré/téléchargé et contrôlé | `static` ; installation, modules, dynamique catalogue/panier non qualifiés ici |
| PrestaShop | ZIP natif généré/téléchargé et contrôlé | `static` ; aucune installation, module ou synchronisation de stock testés |
| Wix / Squarespace | Kits de reconstruction téléchargés | `static` ; pas des thèmes importables, reconstruction manuelle indiquée |

Le reçu reprend le message et la portée du moteur ; il ne convertit pas un résultat provisoire/statique en compatibilité installée. Aucun envoi de produits, stock ou médias vers une boutique. Aucun formulaire/RDV/paiement qualifié par l’export. Les illustrations de recette et les textes acquis ne constituent pas une création IA réelle ou une validation professionnelle du rendu.

## Suite et dépendances

#218 → #219, après la chaîne #208/#210/#212/#213/#214/#215/#216/#217. Ordre d’intégration à revoir, **aucune fusion autorisée ou réalisée**. `main` et le Studio réel ne reçoivent pas ce code dans cette mission. La CI de la livraison doit être consultée séparément ; un résultat local ne la rend pas verte.

#211 reste ouverte : le contrôle natif de rendu E3 est déjà en développement dans une autre copie (captures complètes, mesures, reçus et critique/correction/recapture). Nouvelle rédaction qualifiée, mode sur-mesure/importés et autres outils métier restent à développer. Aucune nouvelle API payante, publication, connexion, donnée client ou composition de Claude modifiée.
