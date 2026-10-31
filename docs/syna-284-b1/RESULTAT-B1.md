# B1 — deux retouches déterministes gratuites depuis SYNA

Autorisé par le [GO B1 uniquement](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/284#issuecomment-6545923263). Branche `codex/syna-284-b1` basée sur la tête A2 `a555100d926ad09642ac43139a7d65218b9a9229`, PR brouillon ciblant `codex/syna-284-a2`. A1/A2 et le travail graphique Claude restent inchangés sur leurs branches.

## Fait

Deux commandes passent avant toute cognition/devis IA dans le vrai `submitConversation` : remplacement exact d'un champ de titre et déplacement d'une section avant/après un ID/libellé unique de la même page. Proposition/diff puis confirmation gratuite. Demande ambiguë, cible absente/protégée/métier, ancien projet A1 ou version modifiée : refus/précision sans fallback fournisseur.

Le moteur `localFirst` existant est réutilisé. Sa petite extension native accepte une adresse A2 déterministe et produit seulement les opérations natives `set_setting` ou `move_section` ; aucun second moteur de thème. Le déplacement `before/after` existait déjà dans `applyOps`. Le trajet `shop.chat`, son worker, les boutons manuels et les moteurs de rendu/export restent inchangés.

Sélection et version relues avant application ; `saveThemeVersion` avec parent attendu, relecture et empreinte du résultat, reçu historique idempotent et restauration manuelle native référencée. Les opérations sont dans la transaction du tour conversationnel : un conflit ou un résultat différent de l'aperçu annule le tour sans faux succès. Les règles de vocabulaire natives ne sont pas contournées : si elles empêchent le texte/diff exact, la vérification refuse l'application.

Aucune modification de `src/components`, CSS, maquette ou thème. Nouveau drapeau B1 fermé par défaut, ouvert seulement pour les tests synthétiques. [Contrat d'intégration unique](CONTRAT-B1.md) pour Claude et les futurs modes.

**Passe finale : 133 tests réussis / 7 fichiers (23 cas B1), typage sans erreur, 32 contrôles HTTP Next.js, deux scénarios complets boutique/services, quatre captures, vrais ZIP Shopify identiques hors `templates/index.json`, restauration native vérifiée. 0 appel réel et 0 € API.** Commit applicatif : `4b98d15adde5d9b5594ea01ce22baec128019876`.

## Vérifications reproductibles

```sh
node node_modules/typescript/bin/tsc --noEmit
NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs" node node_modules/vitest/vitest.mjs run tests/conversation284-b1-local.test.ts tests/local-dabord.test.ts tests/conversation284-a2-context.test.ts tests/conversation284-recovery.test.ts tests/conversation209-http.test.ts tests/conversation211-theme-tools.test.ts tests/conversation209-core.test.ts --maxWorkers=2
node --import ./scripts/lot9/network-guard.mjs --import tsx scripts/verify-syna284-b1-local.ts /tmp/preuves-b1
```

Résultats et empreintes source dans [SOURCE-ET-VERIFICATIONS.json](SOURCE-ET-VERIFICATIONS.json), recette HTTP dans [preuves/RESUME-HTTP.json](preuves/RESUME-HTTP.json). Les journaux bruts, identifiants de fixtures et données de base ne sont pas publiés.

Deux scénarios boutique/services sur vrai serveur Next.js : message SYNA, diff gratuit, confirmation HTTP, retry concurrent, version native relue, déplacement, aperçu rendu, anciennes versions préservées, restauration native. Comparaison des données/fichiers métier hors tables conversation et deux tables de versions/pointeur (`projects`, `theme_versions`) explicitement modifiées par ces actions. Les autres champs du thème sont comparés et les exports vérifiés séparément. Les appels du moteur de devis natif et cognitif, consentement cognitif, classificateur, réservation financière et réseau sont espionnés dans les tests : attendu zéro pour les deux scénarios B1. Le harnais HTTP compare également les tables de consommation, devis, jobs, portefeuille et droits.

Les aperçus et exports natifs créent des caches lors de leur première ouverture : ils sont amorcés avant les empreintes, sans exclure ces tables des comparaisons finales. Les premiers essais ont identifié un déplacement déjà à sa place, une session créée après l'empreinte de référence, les caches non amorcés, un titre services composite qui empêchait une recherche DOM du titre entier, des captures prises au début de l'animation et une course du typage avec la régénération `.next/types`. Le harnais final vérifie le champ exact sans supprimer son accent séparé, utilise la préférence native de mouvement réduit pour les captures et lance le typage après l'arrêt du serveur. Aucun fichier graphique n'a été adapté pour les tests.

## Limites / arrêt

- **Pas d'UI de confirmation gratuite branchée** : parcours action/confirmation démontré par HTTP réel sur la route SYNA. Captures = véritable aperçu natif desktop/mobile après retouches ; elles ne montrent pas une nouvelle interface Encre/Plein cadre.
- Grammaire française volontairement bornée ; pas de génération, recherche approximative ou réécriture. Titres natifs courts seulement ; champ exact, pas réécriture des sous-titres/accent distincts. Le forfait doit déjà autoriser la portée de l'opération.
- Les projets A1 restent non modifiables par SYNA. Aucune migration ou initialisation de Préparation ajoutée.
- Restauration via l'outil manuel déjà existant uniquement ; aucun B2 (couleurs/masquage/médias/undo élargi) ni B3.
- Suite complète, Theme Check, build production et Docker non revendiqués localement. CI A1/A2/B1 vérifiées et publiées au SHA exact ; tant que leurs runs ne sont pas terminés verts, aucune validation globale revendiquée.
- **0 fournisseur réel, 0 € API**, aucune recharge ou dépense déclenchée. Aucun projet réel, tarif, droit, flag de production, fusion, publication ou déploiement modifié.

**STOP après B1.** Prochaine amélioration proposée, non commencée : raccordement par Claude de la confirmation gratuite au contrat commun, puis décision distincte du propriétaire pour B2.

Les quatre captures de l’aperçu ont été vérifiées et présentées dans l’échange. Leur ajout binaire au dépôt public a été refusé par le contrôle automatique (contenu potentiellement sensible / accord explicite demandé), puis une tentative interrompue. Elles ne sont pas jointes à cette PR ; les empreintes et résultats restent disponibles. Code et preuves HTTP livrés indépendamment, sans contournement du refus.
