# #301 — reprise exacte après indisponibilité de l’environnement

**Mission inachevée. Ne pas déclarer SYNA complète.** Consignes #301/6618265320 et #301/6618279690 : avancer les lacunes indépendantes sans attendre une nouvelle consigne. Aucun fournisseur réel, client, main, déploiement, publication ou activation autorisés.

## Blocage constaté

L’environnement `ccarenv_b64_Y2NhcmVudl84MDM3MmEyMmNlM2M4MTkxYmY1ZWE1YmZiOGFkZDU0OA` est devenu indisponible. Dernier échec : `exec-server transport disconnected; failed to resume exec-server session; unknown session id`. Le connecteur cloud indique `connectivity: offline`, aucune capacité disponible, même si sa phase observée reste `running` ; aucune cause racine n’est démontrée et aucun outil de redémarrage n’est disponible. Ce n’est pas un refus d’approbation. Docker GitHub est vert sur plusieurs lots ; ne pas attribuer cette panne à Docker sans preuve.

GitHub est resté accessible : les correctifs exécutés ont été publiés et la convergence reconstruite à partir des snapshots immuables a été soumise à sa CI. Les nouvelles recettes de convergence ne sont pas déclarées exécutées localement après la panne.

## Livraisons et ascendance

Base commune #363 : `f25a729036cc03975d6ac7b95eef945a5214177a`. Toutes les PR restent brouillon ; aucune fusion main. Ne pas déplacer les branches servant de base à ces PR empilées.

| PR | Tête publiée | Preuves acquises | CI à suivre |
|---|---|---|---|
| #364 — confirmation/proposition/projet, cinq transports | `958a4ddea960f48751b8bd5a567c39f96c7fb674` | 35 nouveaux cas (29 rouges avant),81 existants, types ; Docker et confirmation compilée verts au relevé | 41741979583 |
| #365 — contraste moteur natif | `4df1e1ec9c0f90d5882ae580a100a3443c2bb0f1` | 6 nouveaux dont phrase/SQLite,18 couleurs,36 Site/B1 ; types/suite complète,Docker,confirmation CI verts ; natif en cours au relevé | 41742511723 |
| #366 — horaires naturels | `413170ac084e92b94bb5b9ed277fcc518a4d0656` | 9 nouveaux +8 sécurité ; types/suite complète,Docker,confirmation CI verts ; natif en cours au relevé | 41742901271 |
| #367 — SEO exact gratuit | `7418d2228ca51a00e82e94c86d9f073962a45af0` | 14 natifs/HTML ;42 confirmations,13 Site,16 catalogue, types ; flag lu tardivement dans #370 | 41743805258 |
| #368 — masquer/supprimer, libellés de bouton | `8e836499742aa452fd4dd00944f93c0b4e15058f` | 15 nouveaux +49 régressions ; build/types ; parcours compilé4/4 local ET contrôle obligatoire CI,0 IA/JS/externe ; huit accords après17s | 41745217253 |
| #370 — Pages natives | `e1ba25425e6fff3fc13280d7ab71e21d2154b8c7` | 20 métier,49 confirmations dont7 Pages,16 catalogue ;14 SEO au raccordement ; types ; aucune carte Pages qualifiée | 41747837472 |
| #371 — convergence Claude + Codex | `827795d014c3ebc2f251e7209ad85b88d4332c66` | 113 tests combinés sur fusion locale AVANT panne ; nouveau harnais production ensuite soumis à CI, pas validé localement | chercher le run de cette tête exacte |

Les suites se recouvrent : ne pas additionner les réexécutions. Un contrôle individuel vert n’est pas le verdict global.

#371 est un vrai commit de fusion : parents `e1ba25425e6fff3fc13280d7ab71e21d2154b8c7` et `30f67e6c7fb67608cfc4497b0d4f2ee39d502530` (#369 Claude). Sept fichiers UI de Claude conservés sans réécriture. Sa réconciliation Site et ses corrections de thème sont conservées. Aucune branche de Claude déplacée. Aucun cherry-pick.

## Contrats transmis à Claude

Messages #363 : 6618450673,6618516476,6618563308,6618681788,6618868528 ; #301 : 6618967086 ; #369 : 6619216183 et6619351343. Détails complets des contrats dans les corps de #367 et #370.

- SEO : `view.localSeo`, schema `syna-local-seo-1`, `localSeoExecution.enabled`, target `/` ou `/pages/handle`, label/field/diff/proposalId ; commandes `confirm-seo` (confirmation:true) / `cancel-seo`, révisions/requestId ; reçu/version/previewHref. Transport `createLocalSeoConfirmation`, callback `{projectId,versionId,version,receiptId}`.
- Pages : `view.localPages`, schema `syna-local-pages-1`, `localPagesExecution.enabled`, command create/rename/navigation/duplicate/remove, target/diff/proposalId ; modèles et leur aperçu natif, choix contextuel « À propos ». `modelPreviewHref` est l’aperçu vivant du modèle, pas une version enregistrée d’avance ; sourceVersionId et résultat recalculé contrôlés avant accord. Créations/copies en brouillon, hors du menu ; assertPageModels maintenu. Commandes confirm-pages/cancel-pages ; transport createLocalPagesConfirmation et même callback versionné.
- Site : localSite.command étendu hide/remove/button, même carte/transport gratuit ; section entière ou libellé natif précis ; verrous, CAS et forfaits conservés. Annulation par reçu courant.
- Horaires : plusieurs formulations explicites du texte COMPLET du profil ; demandes ambiguës distinguées gratuitement des créneaux réservables. Aucun créneau modifié par ce lot.
- Claude garde cartes/désignation/aperçus/intégration/recettes indépendantes. Les nouvelles cartes SEO/Pages doivent utiliser son `useStaleConfirmation` et le verrou partagé, en préservant les six cartes existantes. Elles ne sont pas encore livrées ni qualifiées par Codex.

## Preuves exécutées et limites

`preuves/sections-natives-368.json` : source8e836499, build local `TLROy0MFiCpAgINrV7NIq`, Chromium système154.0.8037.57. Encre/Plein ×1440/390, produits/services fictifs : phrase naturelle→avant/après→aucune écriture avant accord→17s réelles→une version→disparition dans aperçu/base→rechargement sans doublon→annulation naturelle/restauration exacte.4/4,28 étapes,0 appel IA,0 erreur JS,0 requête hors boucle locale. Le mobile reprend une désignation A2 préparée : geste tactile complet non certifié. Boutons seulement moteur dans cette nouvelle recette. Captures locales uniquement, aucun upload nouveau.

CI #368 : job126296696649 du run41745217253, contrôle obligatoire réussi ; logs confirment4/4 et0 IA/JS/externe. Les résultats de ce commit ne certifient pas automatiquement #371.

Claude #369 rapporte une recette Fichiers4/4 et18 contrôles indépendants. Son script publié lançait next dev. #371 ajoute SYNA_UI_PRODUCTION=1/next start, exige BUILD_ID et consigne mode/SHA/navigateur ; la recette devient un passage supplémentaire du contrôle obligatoire existant, sans aucune assertion supprimée ni continue-on-error. Son résultat sur build compilé commun doit être lu dans la CI #371. Les cartes Contenus/Demandes/Horaires/Publicité restent à rejouer séparément en navigateur.

La mesure de contraste cumulée (#365 moteur + #369 rendu) reste à relire dans Chromium. Les113 tests combinés incluent les tests de contraste, pas une mesure navigateur de tous les fonds composés. Images de fond, gradients, couleurs explicites et styles personnalisés gardent leurs limites. Ne pas modifier la branche graphique de Claude ; transmettre tout défaut démontré et son test.

## État du workspace à récupérer sans perte

Chemin : `/workspace/work/parity301-next-domains`, node_modules partagé avec `/workspace/Ecom-studio-ia/node_modules`. La copie locale était sur `codex/parity301-convergence-369`, HEAD e1ba254… et MERGE_HEAD30f67e… après `git merge --no-commit --no-ff`. Fusion sans conflit. Des modifications de harnais non commitées existent. Le snapshot distant827795… est préservé ; ne pas supposer que son harnais est octet pour octet celui de la copie locale.

Dernière tentative : étendre les cas de changement de projet au transport Site. La création du processus a échoué ; aucun résultat rouge/vert de ces nouveaux cas n’est acquis. La convergence distante garde les49 cas validés, pas56. Vérifier les fichiers avant toute reprise, ne pas annoncer ces cas comme exécutés.

À la remise à disposition :
1. Lire git status, git diff, git diff --cached et MERGE_HEAD. Ne pas faire reset --hard, ne rien supprimer ni écraser.
2. Récupérer827795… dans un checkout Codex isolé ou comparer les modifications locales avant alignement. Conserver toutes les expériences utiles.
3. Recompiler ce commit avec stockage temporaire fictif, STOCK_OFFLINE=1 et NODE_OPTIONS=`--import=$PWD/scripts/lot9/network-guard.mjs`. Le dernier build local correspondait8e836499, il ne contient pas la convergence UI #369.
4. Relire les derniers jobs CI des SHA livrés. Ne relancer que les échecs transitoires démontrés ; aucun garde-fou affaibli.
5. Qualifier le mode production de syna301-confirmation-perimee-recette.ts ; sur Chromium système fournir STUDIO_PROOF_CHROMIUM=/usr/bin/chromium et consigner sa version. Aucun navigateur embarqué Playwright n’était installé localement. Sur CI, le navigateur Playwright isolé est installé normalement.

État local antérieur : /workspace/work/parity301-continuous-state.json (peut être en retard sur ce point GitHub). Logs acquis : /tmp/parity301-pages-final4.log, /tmp/parity301-pages-types-final.log, /tmp/parity301-convergence-369-tests.log, /tmp/parity301-native-sections-proof.log, /tmp/parity301-sections-build-final.log. Leur disponibilité dépend de la conservation du workspace ; les preuves importantes sont déjà sur GitHub.

## Travail restant, sans nouvelle validation à demander

Même matrice cumulative CSV/MD, désormais162 unités :85 précédentes +77 vérifications décomposées depuis OMISSIONS-MATRICE de Claude. Ces77 sont des omissions de couverture signalées par lecture, pas77 bogues reproduits ni une autorisation de refaire l’acquis #348. Certaines détaillent une ligne parente. Chaque ligne porte manque/responsable/dépendance/critère/preuve ; aucune complète.

Priorités : cartes/recettes SEO et Pages avec Claude ; risque Site pendant changement de projet à reproduire ; contraste cumulé à mesurer ; images et choix de thème ; prestations/réservation structurées ; stock/variantes ; calendrier/brouillons ; pièces jointes/bibliothèque ; puis omissions natives. Conserver les droits inclus/acquis et retouches gratuites, les devis existants avant toute dépense. Les accès réels interdits restent ouverts ; développer et tester les parcours simulés de connexion/consentement, puis poursuivre les modules indépendants. Ne pas conclure au succès de la mission parce que les lots ou la CI passent.
