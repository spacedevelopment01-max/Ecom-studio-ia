# #211 — D1 : une action native depuis SYNA

D1 livré pour revue dans la PR #215, sans fusion ni activation. Build propre effectivement servi et capturé : **`f490fd136433af4e9bc4533c4fb0795bed27e1c6`**. [Captures, vidéos et preuves](preuves-211-D1/README.md). Les commits de documentation suivants ne changent pas ce code.

## Résultat de cet incrément

Une demande libre peut conduire la réponse IA à proposer `understand-offer`. Le client voit ensuite le devis de l’analyse **native** et donne un accord distinct. Le worker `project.prepare` produit une version de Préparation ; SYNA ne présente son résultat qu’après contrôle du job, de cette version et du reçu fournisseur lié au même compte/projet/job. L’analyse reste à relire : aucune approbation et aucune étape 2 implicites.

Le dialogue, l’historique et la mémoire restent ceux de SYNA. Fermeture, changement d’onglet et nouvelle session retrouvent le reçu sans nouvelle réflexion ni analyse. Une correction exige une demande, un devis et un accord nouveaux, dans la limite native de deux analyses ; une erreur conserve la version précédente. Le résultat d’un fournisseur incertain n’est pas relancé automatiquement.

Il s’agit de D1, **pas de la fin de #211**. Les autres outils sont explicitement non raccordés ; le développement D restant / E / F2 se poursuit en incréments distincts.

## Périmètre et protections

- Dépendance directe : #214 `9ac907c09280ac06715a37842fac3f7c746a4b45`, qui dépend de #213/#212 puis des #208/#210 combinées seulement sur branche isolée. Aucun de ces travaux n’est fusionné par cette mission.
- Main de référence : `70204a7ff83eb2382835a27a37a8465c0851a70a`. Aucune modification de main, des projets réels, des démonstrations validées, de VANS/#204 ou de Contretemps.
- Drapeaux serveur fermés par défaut : `STUDIO_CONVERSATION_LOT_A`, `STUDIO_CONVERSATION_AI`, `STUDIO_CONVERSATION_SPECIALISTS`, `STUDIO_CONVERSATION_TOOLS`. L’interface conserve son drapeau F1.
- Réutilisation du devis/contexte complet #208, du moteur de préparation, du SDK/routeur/Brain natifs, du worker, du portefeuille, des versions et des limites d’essais. Aucun moteur d’analyse parallèle.
- Authentification/propriétaire, forfait natif, CSRF, révisions de dialogue et de projet, sélection IA vérifiée quand fournie, schémas stricts. Aucune permission issue du texte du modèle.
- Choix validés et étapes aval même en brouillon protégés : l’outil n’invalide pas leurs acquis. Le second essai natif d’un brief analysé non validé reste possible sur demande explicite.
- Une seule enveloppe persistante de demande, augmentée du plafond exact du nouvel outil **après son accord**, sans remise à zéro des coûts/appels. Limite globale dure 20 appels, profondeur 1, aucune reprise HTTP automatique, même échéance de 15 minutes ; limites portefeuille 40 % abonnement HT / 50 % recharge HT inchangées.
- Un résultat acquis peut être consulté sans fournisseur ni budget disponible. Une tâche `done` sans version/preuve correcte est signalée « résultat non prouvé », jamais livrée.
- Brand/logo, images, vidéos, catalogue, thème, SEO/blog, campagnes, réseaux/calendrier, RDV, connexions et exports : onglets manuels ; outils conversationnels non raccordés. Publier/envoyer/supprimer/acheter/payer indisponibles, sans autorisation implicite.

## Fichiers

- `src/lib/orchestrator/conversation/tool-contract.ts`, `tool-flags.ts`, `tool-execution.ts` : contrats, devis/accords, droits, bornes, versions et reçus.
- `src/app/api/studio-agent/conversations/[cid]/tools/route.ts` : registre, devis, confirmation et lecture des reçus.
- `worker/index.ts` : rattachement à l’enveloppe commune lu depuis la base serveur, jamais depuis un ID libre de la requête.
- `conversation/{contract,index,intelligence-contract,intelligence,intelligence-context}.ts` : disponibilité et identifiant de réponse IA, corrections exactes comme sources communes du même dialogue.
- `src/components/studio/conversation-tools.tsx`, `conversation-panel.tsx` : action dans SYNA, devis, accord, progression, résultat, correction, historique et états non raccordés.
- `tests/conversation211-tools.test.ts` : moteur et protections avec dépendances explicitement simulées.
- `scripts/verify-agent211-build.ts`, `verify-agent211-tools-ui.ts`, `.github/workflows/ci.yml` : vraies routes, worker/SDK puis Chromium, fournisseur HTTP loopback simulé. Tous les contrôles antérieurs de CI sont conservés.

## Vérifications et limites

Deux parcours Chromium, produit et service, traversent le vrai Studio compilé, le SDK et le worker natifs : demande → proposition d’outil IA simulée → devis/accords distincts → version de Préparation → reçu vérifié → autre onglet → reconnexion. Une correction explicitement demandée puis consentie reçoit une panne HTTP 503 simulée : état `failed`, résultat non livré, aucune relance automatique et première version toujours consultable. Les preuves de version/provenance/appels et l’absence de recherche/thème sont contrôlées directement dans les données natives isolées.

- **3 609 tests réussis, 45 ignorés** ; 419 fichiers réussis / un ignoré, 723,84 s. Backend et tests gelés pendant l’exécution ; dernières finitions d’affichage de SYNA vérifiées ensuite par types et navigateur. Aucune qualification visuelle déduite de cette suite.
- **66 ciblés, six fichiers, 11,43 s** ; types réussis après les dernières modifications. Le motif `conversation209-native` de la commande ne correspondait à aucun fichier : il n’ajoute aucun test au total annoncé.
- Builds de production réussis ; code applicatif `8eb698506e97529662291bd23e851d645c1b69ef`. Le commit `f490fd1` ne modifie que le harnais de test : `git diff 8eb6985 f490fd1 -- src worker tests` vide. Nouveau build propre et recette complète effectivement refaits à `f490fd1`.
- **18 PNG originaux et deux MP4** : captures inspectées, devis/échec téléphone et résultat ordinateur ouverts en taille native ; six images des vidéos examinées. Transcodage uniquement : 350/350 et 332/332 images conservées, durées 14 s et 13,28 s, sans coupe ni accélération.
- Le premier test de citation forgée utilisait seulement `businessEvidence` alors que sa fixture avait `business=null` : scénario corrigé avec une modification citant une source inexistante, rejet maintenant effectivement constaté. Ce n’était pas une réponse finale validée.
- Un contrôle à 360 px a échoué pendant le changement de mode responsive. Le harnais attend désormais `aria-modal=true`, les polices et deux images de rendu avant de mesurer ; la même assertion stricte de largeur repasse. Aucun contenu masqué ni règle de débordement supprimée.
- CSRF 403, compte étranger 404, outil forgé 400 dans les vraies routes ; tests des verrous, étapes aval même non approuvées, révisions, droits révoqués, proposition IA périmée, idempotence d’accord, enveloppe expirée et `done` sans preuve.
- Fixture service du parcours API : les deux modes devis/RDV déjà saisis restent conservés après analyse. La recette SYNA n’ouvre ni formulaire de RDV ni réservation : elle analyse l’offre seulement.

Commandes effectivement exécutées (sorties et empreintes dans les preuves) :

```bash
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx tsc --noEmit
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx vitest run
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx vitest run tests/conversation211-tools.test.ts tests/conversation211-intelligence.test.ts tests/conversation211-native-billing.test.ts tests/conversation211-request-bounds.test.ts tests/conversation211-presentation.test.ts tests/conversation211-ui-flag.test.ts tests/conversation209-native.test.ts
NEXT_TELEMETRY_DISABLED=1 XDG_CACHE_HOME=/tmp/ecom209-font-cache npm run build
CHROMIUM=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=/tmp/ecom211-playwright XDG_CACHE_HOME=/tmp/ecom209-font-cache STUDIO_CONVERSATION_SPECIALISTS=1 STUDIO_CONVERSATION_TOOLS=1 NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx tsx scripts/verify-agent211-build.ts /tmp/ecom211-D1-browser-frozen --specialists --tools --tools-ui
```

Recette finale seule : 12 requêtes fournisseur simulées / 12 traces, dont 10 usages réglés totalisant **79 120 micro-euros simulés**. Les deux corrections incertaines retiennent séparément leur maximum simulé : **596 576** (produit) et **236 410** (service). Ces réservations ne sont pas présentées comme des coûts fournisseur confirmés ; coût connu et montant retenu par prudence restent séparés. Dans chaque projet navigateur, les deux succès totalisent 15 824 micro simulés. **Coût réel : 0 €, zéro appel fournisseur réel.** Aucune déduction de performance/prix réel d’un modèle à partir des jetons fictifs du simulateur.

Aucun fournisseur réel, aucune qualification créative réelle, coût réel nul. Les montants simulés sont issus du tarif/compteur natifs avec usage fictif, pas une facture fournisseur. Test navigateur Chromium automatisé ; pas de téléphone physique ni de Safari. Cet incrément ne crée pas un site professionnel, ne valide pas une marque, ne recherche pas de marché et ne prouve aucune installation CMS.

## Suite autorisée

1. D2 : retouche ciblée et annulation d’une copie de thème fictive par SYNA, via opérations/versions natives, garde de révision, refus de modifications verrouillées et preuve d’aperçu. Pas de modification des compositions validées.
2. E1 : plan déclaratif sûr de pages/sections/composants, médias/textes sourcés, mode annoncé conforme aux capacités réellement implémentées, versions éditables.
3. E2/F2 : proposition Site/copywriting IA sous devis, application contrôlée, vraies captures/critique/correction/recapture, contrôles fonctionnels et ZIP sur trois jeux produit mono/multi et service, plus cas nouveaux. Fournisseurs simulés : qualité IA réelle non qualifiée.
4. D suivants/F2 : raccordements métiers natifs progressifs, chacun avec droits/devis/accord, reçu et exemple complet ; les domaines absents restent indisponibles. Aucune nouvelle interface de chat.

Aucun merge, déploiement, activation, nouvelle clé/service, changement commercial, redémarrage client ni essai fournisseur réel. La suite est autorisée en branches isolées ; aucune nouvelle permission n’est nécessaire pour ces micro-étapes techniques.
