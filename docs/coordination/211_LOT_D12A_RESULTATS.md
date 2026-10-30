# #211 D12a — SYNA et les vues natives de communication

**Code/build/Chromium : `c4c31a0e37953cf117f8a1381c4c199524aa3bf7`.** Base #259 `c1cae143`, branche Codex isolée. Aucune intégration du code Claude, fusion, modification de main, activation ou mise à jour du Studio client.

**Corrigé :** le registre déclarait absentes les créations sociales et publicitaires déjà raccordées par D11d/e. Quatre tests rouges reproduisent cette incohérence. Il décrit maintenant l’image manquante d’un brouillon et le visuel d’une annonce native, avec préparation préalable, devis et accord distincts. Le coût est `native_quote_required`, jamais celui de la préparation gratuite. Drapeaux fermés par défaut ; configuration, droits, disponibilité du fournisseur et limites sont contrôlés par les moteurs au devis/exécution, pas présumés par ce catalogue. Diffusion et connexion de comptes restent non raccordées.

Les reçus natifs notifient aussi les vues Publications, Campagnes et Images, par événements limités au projet et dédupliqués. Leurs listes et compteurs se rechargent sans navigation/rechargement de page. Le formulaire de campagne conserve sa saisie en cours ; une notification d’un autre projet est ignorée. Ces notifications ne créent ni tâche, consentement, appel fournisseur, modification métier ou publication.

Fichiers : `studio-operations.ts`, `intelligence-context.ts`, composants `conversation-social-tools`, `conversation-social-production`, `conversation-campaign-visuals`, `social-studio`, `tab-publicites`, `ad-campaigns`, scripts de recette et CI. Les moteurs, prix, budgets et compositions des thèmes ne sont pas modifiés.

## Vérifié

- `npm test -- tests/conversation211-communication-registry.test.ts tests/conversation211-studio-knowledge.test.ts tests/ci-native-production-placement.test.ts tests/ci-native-social-placement.test.ts` : **24 réussis / 4 fichiers**. Registre, fermeture des drapeaux, acquisition payante séparée, publication sensible non raccordée, connaissances/droits/observations et conservation des recettes CI.
- `npm run typecheck`, `npm run build`, puis `node --import tsx scripts/verify-agent211-build.ts <dossier-vide> --integrated-communication-ui` réussis. Build/browser propres exacts `c4c31a0e`, sources inchangées. Pas de répétition locale de l’ancienne suite complète ; CI complète finale exigée sur la tête publiée, état dans la PR.
- **Studio compilé + vrai worker/SDK vers faux HTTP** : deux nouveaux cas, **tranchet de sellier à lame courbe** et **compas de charpentier pour grandes pièces**. Campagne native visible immédiatement au compteur1, image publicitaire au compteur1, publication au compteur de validation1. Une saisie non enregistrée survit au rechargement de la liste ; l’événement d’un autre projet ne lance aucune requête Campagnes.
- Les deux parcours exercent aussi leurs vrais moteurs et reçus : téléchargements exacts, référence réellement transmise/hash contrôlé, 503 publicitaire sans relance/premier acquis intact, conflit social puis accord0% réemployant le même fichier malgré budget épuisé/source retirée/devis et borne expirés. 401/404/403/400/409 selon les cas, zéro appel après rechargement ou refus. Le faux HTTP répond selon le but et le ratio de chaque fixture, sans confondre publicité et publication dans la recette commune.

[Commandes/SHA/empreintes](211_D12A_PREUVES.json) · [preuves natives](preuves-211-D12a/communication-proof.json) · [campagne/compteur](preuves-211-D12a/01-campagne-compteur-ordinateur.png) · [éditeur](preuves-211-D12a/02-editeur-natif-ordinateur.png) · [publication/compteur](preuves-211-D12a/03-publication-compteur-ordinateur.png) · [réemploi mobile](preuves-211-D12a/04-reemploi-mobile.png) · [film campagne 13,33 s](preuves-211-D12a/campaign-integration.mp4) · [film publication 12,6 s](preuves-211-D12a/social-integration.mp4). Six captures ouvertes, quatre sélectionnées, un film par parcours sans accélération.

## Limites / suite

**0 fournisseur réel / 0 € réel.** Mires et réponses synthétiques ; aucune qualité créative, compréhension IA réelle, diffusion ou connexion sociale qualifiée. Cette recette commune utilise deux produits ; les tests natifs produit/multi/service antérieurs sont conservés. Actualisation vérifiée conversation ouverte ; fermeture du panneau avant fin non vérifiée dans cet incrément. Les droits restent contrôlés au serveur.

Claude #245 **`a69fcf7e`**, non fusionnée, fournit les API métiers ; son bilan garde l’authentification SYNA comme point ouvert. #247/#248 ne préparent qu’une fusion future. Aucun de ces travaux n’est recopié, modifié ou présenté comme intégré ici ; `withSiteData`, contenus professionnels et publication hébergée attendent cette intégration autorisée. Les compositions Claude restent intactes.

La création/rédaction Site qualifiée, le mode sans thème, les autres raccordements D12/E/F et limites vidéo restent ouverts. **#211 n’est pas terminée.**
