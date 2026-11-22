# SYNA — audit de parité et plan d’exécution, étape 1 de #284

**Décision recommandée : valider seulement A1, « reprendre un projet existant sans le modifier ».** Le Studio possède déjà de nombreux moteurs utiles ; le travail porte sur leur accès fiable depuis la conversation, leur contexte et leur parité économique. Rien ne justifie encore de retirer un ancien bouton IA ou `shop.chat`.

Livraison du 31 octobre 2026. **Documentation uniquement**, branche `codex/syna-284-audit-parite`. Aucun développement applicatif, changement graphique, drapeau activé, migration client, déploiement ou fusion. **0 appel fournisseur réel ; coût IA consommé : 0.** Arrêt après cette étape pour décision du propriétaire, conformément à #284.

## Sources et portée vérifiable

- [Issue #284](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/284) lue intégralement ; [#282](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/282) et ses trois commentaires lus, notamment la décision Encre **et** Plein cadre.
- Code fusionné figé : [`37fcfd2526705d274fd813b5da95be46058b7c9f`](https://github.com/spacedevelopment01-max/Ecom-studio-ia/commit/37fcfd2526705d274fd813b5da95be46058b7c9f). Les PR #278 et #279 sont fusionnées ; leurs descriptions et preuves historiques ne sont pas de nouveaux tests de cette mission.
- [PR #283](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/283), brouillon ouvert, tête `1f38ec565a7462e2da1a2b506586131e15ba72be` : `01-AUDIT.md`, `02-INVENTAIRE.md`, `05-PLAN-MIGRATION.md` lus en entier. Les interfaces sont des maquettes/prototypes à cette référence, pas une refonte applicative fusionnée. L’extension détaillée des deux modes reste le chantier Claude décrit dans #282.
- Les rapports intégrés [`211_CLOTURE_SYNA.md`](../coordination/211_CLOTURE_SYNA.md), [`276-INTEGRATION-CLAUDE-CODEX.md`](../fusion/276-INTEGRATION-CLAUDE-CODEX.md) et les propositions déjà écrites dans [`211_PROPOSITIONS_SYNA.md`](../coordination/211_PROPOSITIONS_SYNA.md) ont été relus pour éviter de refaire les travaux acquis.
- **Limite d’environnement :** la copie Git locale date d’octobre 17 ; `git fetch` échoue car le proxy `:8080` est inaccessible. L’audit a donc utilisé le connecteur GitHub, avec lecture des sources actuelles à SHA figés. La branche distante a été créée depuis le `main` actuel, puis son SHA de départ vérifié. La branche locale ancienne n’a pas servi à certifier le code actuel.
- **51 fichiers applicatifs/tests/documentaires du main** ont été récupérés et leurs empreintes Git vérifiées ; trois documents Claude sont référencés séparément. [Manifeste et limites](PREUVES-AUDIT-284.json). Aucun serveur actuel ni test runtime/UI/HTTP/fournisseur n’a été exécuté ici. Les tests existants sont identifiés comme preuves de conception et critères à rejouer au lot concerné, jamais présentés comme de nouveaux succès.

## Livrables et lecture

| Livrable | Contenu |
|---|---|
| [Matrice de parité](MATRICE-PARITE-SYNA-284.md) / [CSV](MATRICE-PARITE-SYNA-284.csv) | 25 capacités, couvrant les **65 opérations du catalogue**, plus les capacités utiles hors catalogue : endpoints/worker, préconditions, autorisations, effets, sauvegardes, coûts/accord, couverture, manque et priorité |
| [Traçabilité des 75 contrôles](TRACABILITE-75-CONTROLES.md) | Chaque ligne du groupe 2 de Claude affectée à un chantier ; **75 lignes → 12 chantiers**, liens source immuables et doublons identifiés |
| [Preuves](PREUVES-AUDIT-284.json) | SHA de base, empreintes des fichiers lus, décomptes, absence d’essais réels et limites |
| [Vérificateur statique](verifier-audit.py) / [résultat](VERIFICATION-STATIQUE.json) | 54 empreintes, décomptes, traçabilité et 7 constats centraux ; vérification exécutée sans réseau, distincte d’une recette applicative |
| Ce rapport | Diagnostic, ordre des lots, premier lot proposé, innovations et contrat UX |

« Raccordé » signifie ici **adaptateur présent dans le code pour une portée précise**. Cela ne signifie ni activé, ni fonctionnement fournisseur réel validé, ni parité complète avec un contrôle natif. Le catalogue déclare lui-même `realProviderTested:false`, `clientInstanceTested:false`, `ownerValidated:false`.

Reproduction : depuis ce dossier, exécuter `python verifier-audit.py CHEMIN_MAIN CHEMIN_CLAUDE` avec les deux checkouts aux SHA ci-dessus. Le script contrôle chaque fichier du manifeste et la traçabilité ; il ne lance pas l’application et ne consomme aucune API.

Le catalogue contient **37 opérations avec adaptateur et 28 sans**, dont **13 sensibles**. Les chiffres Claude **7 / 75 / 259 / 2** désignent des contrôles UI, pas des capacités. Les 75 lignes du groupe 2 ont été retrouvées ; les 343 contrôles ne sont pas réaudités un par un en exécution. Les 7 candidats comportent notamment deux accès à la même recherche ; ils ne prouvent donc pas sept moteurs distincts. Les 259 commandes manuelles restent et apportent aussi des capacités à rendre pilotables : elles ne sont pas hors périmètre produit parce qu’elles sont classées « manuelles ».

## Diagnostic technique

### Ce qui existe et doit être réutilisé

Le socle comprend une conversation persistante par projet, les messages et révisions, les devis séparés de leur confirmation, les bornes de dépenses, l’idempotence, les tâches et reçus, le réemploi d’acquis et plusieurs restaurations natives. Les adaptateurs couvrent déjà analyse/recherche, choix stratégiques, identité, logos, catalogue brouillon, images, vidéo/voix/clip, documents et blog, retouche/composition/export/rendu du site, brouillons sociaux et campagnes.

L’intégration #278 a déjà raccordé les contenus métier au rendu/export/captures (`withContenus`), protégé les sections dont le contenu vient des onglets métier et ajouté une connaissance en lecture des capacités non raccordées. #279 ajoute des sondes de concurrence, isolation et conservation des prestations. **Ne pas reconstruire ces moteurs ou refaire cette intégration.** Leur preuve historique reste limitée aux recettes locales et fournisseurs simulés décrits dans les PR.

### Écarts prioritaires confirmés dans le code actuel

| Constat | Preuve exacte | Conséquence |
|---|---|---|
| Un projet ancien rempli **sans** état de Préparation est refusé par `openProjectConversation` avec `conversation_migration_unavailable`. Un projet ayant déjà la Préparation peut suivre un autre chemin ; tous les projets existants ne sont donc pas indistinctement bloqués. | [store.ts:71](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/37fcfd2526705d274fd813b5da95be46058b7c9f/src/lib/orchestrator/conversation/store.ts#L71), fonctions `hasAcquiredData`, `openProjectConversation`, `currentBrief` | Premier verrou transversal. Il faut lire/rattacher sans initialiser ou remplacer la préparation, ni confondre une fiche historique avec une nouvelle fiche modifiable. |
| Le moteur `localFirst` est appelé dans `shop.chat`, pas dans le trajet SYNA audité. La retouche SYNA exacte accepte seulement texte natif et image acquise. | [local-first.ts](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/37fcfd2526705d274fd813b5da95be46058b7c9f/src/lib/engine/local-first.ts), [handlers.ts:290](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/37fcfd2526705d274fd813b5da95be46058b7c9f/worker/handlers.ts#L290), [theme-tool-contract.ts:4](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/37fcfd2526705d274fd813b5da95be46058b7c9f/src/lib/orchestrator/conversation/theme-tool-contract.ts#L4) | Application gratuite ≠ commande conversationnelle gratuite : une proposition obtenue par réponse IA peut coûter. Les demandes déterministes doivent être routées **avant** cette réponse payante. |
| Le contexte ne porte pas le texte/chemin/image sélectionné utilisés par `shop.chat`, ni publication/campagne/créneau/doc publicitaire. `carte` et `realisations` ne figurent pas dans l’enum d’onglets lu. | [active-context-contract.ts:4](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/37fcfd2526705d274fd813b5da95be46058b7c9f/src/lib/orchestrator/conversation/active-context-contract.ts#L4) | Retouche locale sûre et actions métier ont besoin d’une cible précise et versionnée ; la sélection n’accorde aucune permission. |
| Le relais de dessin OpenAI des logos est rejeté par `if(input.relay || …)`. Le reçu SYNA exige trois directions complètes ; il ne faut pas annoncer un relais ou un meilleur logo non validé comme une livraison SYNA déjà couverte. | [logo-tool-execution.ts:60](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/37fcfd2526705d274fd813b5da95be46058b7c9f/src/lib/orchestrator/conversation/logo-tool-execution.ts#L60), reçu même fichier | Étendre le devis et les preuves du relais, sans contourner les plafonds ; conserver les essais et le choix humain. |
| « Recréer les propositions » peut mettre `brand.logo.v2` en file sans devis accepté ni plafond dans son payload natif. Droits série et verrou concurrent existent, mais ne remplacent pas le consentement économique. | [brand/logo/route.ts:79](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/37fcfd2526705d274fd813b5da95be46058b7c9f/src/app/api/projects/[id]/brand/logo/route.ts#L79) | **P0 dépense** : sécuriser avant toute recette payante de régénération. Ce constat ne prétend pas qu’un appel a été réellement facturé pendant l’audit. |
| Nouvelle version publicitaire : l’éditeur envoie `generate,count:1` sans `approvedEstimateMicro`, que le serveur exige. | [ad-editor.tsx:361](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/37fcfd2526705d274fd813b5da95be46058b7c9f/src/components/studio/ad-editor/ad-editor.tsx#L361), [campaigns/v2/route.ts:121](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/37fcfd2526705d274fd813b5da95be46058b7c9f/src/app/api/projects/[id]/campaigns/v2/route.ts#L121) | Refus 409 attendu au contrôle devis si les gardes amont sont satisfaits ; pas de succès HTTP revendiqué. Réutiliser `campaign_quote`, jamais supprimer la garde serveur. |
| `/contenus` est un **GET manifeste** ; CRUD sur `/contenus/:type` et `/contenus/:type/:itemId`. Le contrôle `ifVersion` est natif mais **facultatif**. | [route manifeste](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/37fcfd2526705d274fd813b5da95be46058b7c9f/src/app/api/projects/[id]/contenus/route.ts), [API métier](https://github.com/spacedevelopment01-max/Ecom-studio-ia/blob/37fcfd2526705d274fd813b5da95be46058b7c9f/src/lib/contenus/api.ts) | Corrige la formulation trop générale de l’inventaire. Les futurs outils devront imposer une version attendue ; visibilité exige `confirm:true`. Archivage ≠ restauration de toute ancienne valeur. |

Les autres manques sont détaillés dans la matrice : slots et insertion de médias, modes vidéo et moteurs de réparation différents, sujets/réécriture blog, brouillons créés hors SYNA, formats et LinkedIn, calendrier local gratuit, documents publicitaires à calques, lots initiaux, workflows/impact de marque, fichiers/prompts et services/RDV/domaines. **Un asset généré en bibliothèque ne prouve pas son placement dans le site, une fiche ou un calque. Un document SEO ne prouve pas la métadonnée exportée.**

## Priorités et petits lots proposés

Chaque ligne ci-dessous est une **proposition**, à découper/valider avant exécution ; seul **A1** est proposé pour démarrer. Aucun ancien contrôle ne disparaît pendant ces lots techniques.

| Ordre | Lot borné | Dépendances et preuve attendue | Coût IA des vérifications |
|---|---|---|---|
| 1 | **A1 — Reprise sûre d’un projet existant, lecture et fil persistants** | Voir périmètre précis ci-dessous ; contrat de données partagé avec Claude, aucun design à modifier | **0 appel réel** |
| 2 | A2 — Contexte sélectionné et reprise après conflit | A1 ; cible/versions/texte utile, relecture après changement manuel ; contrat commun aux deux modes | 0 réel ; éventuelle réponse simulée |
| 3 | B1 — Deux retouches locales : titre exact et déplacement d’une section | A1/A2 ; brancher moteur natif avant cognition ; mêmes versions, résultat et coût 0 que shop.chat ; ambiguïté sans exécution | 0 réel |
| 4 | B2 — Couleurs/masquage, média acquis et undo | B1 ; ajouter un type d’opération à la fois ; ancienne discussion toujours disponible | 0 réel |
| 5 | B3 — Commandes locales de mode et dimensions | Contrat accepté avec Claude ; interprétation locale sans appel ; Claude implémente présentation et préférences | 0 réel |
| 6 | C0 — Fermer la régénération logo sans devis | Indépendant d’A1, **à traiter avant toute dépense logo** ; refus sans accord, idempotence, ancien choix intact | 0 réel, fournisseur simulé |
| 7 | C1 — Relais logo devisé puis choix des acquis | C0 ; cas Qwen insuffisant, relais autorisé plafonné, acquis et meilleur résultat signalés ; ensuite redraw ciblé séparé | Simulation 0 ; essai réel seulement sur devis propriétaire |
| 8 | C2 — Catalogue et placement média | A2 ; réemploi des adaptateurs existants ; un slot/objet natif hors SYNA à la fois, sans synchro CMS | Simulation 0 ; image réelle seulement autorisée |
| 9 | C3 — Vidéo scénario puis reprise d’une scène | D’abord choisir le trajet natif ; ne pas confondre video.scenes et video.v2.render ; acquis non rachetés | Simulation 0 ; coût réel scénario + seuls clips/voix modifiés au devis |
| 10 | D0 — Réparer nouvelle version pub au devis | Indépendant ; appel campaign_quote, accord puis generate ; contrôle serveur conservé ; sans refonte éditeur | 0 réel |
| 11 | D1 — Calendrier local, puis production de brouillon natif | A2 ; d’abord déplacer une date avec aperçu/accord ; lot suivant : un visuel, hors préparation SYNA | Local 0 ; production IA séparément devisée |
| 12 | D2 — Retouche texte/blog, puis campagnes | Un document et une action par sous-lot ; retouche locale d’abord ; ensuite calques/lot initial séparés | Local 0 ; chaque génération IA au devis |
| 13 | E1 — Métier en lecture, puis un plat brouillon | Réutiliser manifeste déjà intégré ; outil d’écriture ifVersion obligatoire et reçu ; biens/réalisations/prestations ensuite séparés | CRUD 0 ; rédaction optionnelle devisée |
| 14 | E2 — Préparation actions sensibles | Un parcours natif à la fois : publication, RDV, domaine, CMS ; connexions/droits réels nécessaires | Aucun engagement/exécution réelle sans accord |
| 15 | F puis G — Innovations retenues, puis retrait contrôlé des doublons | Seulement après sélection et parité par capacité ; Claude conserve la main sur les retraits et les deux présentations | Devis par innovation, puis recette propriétaire |

P0 signifie blocage transversal ou risque de dépense ; cela ne transforme pas C0/D0 en travaux autorisés. Je propose **A1 en premier**, C0 avant tout futur test logo payant. Cet ordre avance la reprise/conversation avant les modules, et remet le moteur local/site avant la migration médias/marketing. Il diffère volontairement du lot UX #283 qui plaçait la reprise existante tardivement : #284 la rend prioritaire.

**Contrôle économique commun.** Garder les plafonds fournisseur du code : ≤40 % abonnement HT, ≤50 % recharge HT. Le compte admin test n’est pas une exemption pour les appels consommés. L’interface client présente coût probable et plafond en **% du budget IA**, validité et accord explicite. Le rapport de recette propriétaire mesure aussi les micro-unités réellement consommées et les appels, y compris les échecs/incertitudes. Les tarifs/routes/configurations du compte actif n’ont pas été interrogés pour générer un devis : aucun montant fournisseur chiffré n’est inventé ici. Estimation technique = nombre d’appels/éléments ci-dessus ; devis réel à recalculer avec les routes et prix natifs au moment de l’accord. Aucun plafond global de session n’est ajouté implicitement.

## Premier lot unique recommandé : A1

**Résultat utilisateur :** ouvrir SYNA sur une boutique ou un projet services déjà rempli, retrouver le même fil après fermeture et voir honnêtement ce que le projet contient, sans reconstruction du site ni dépense.

Périmètre de développement proposé, **non commencé** :

1. Conserver le chemin existant des projets avec Préparation et les conversations déjà présentes. Ajouter le rattachement idempotent d’un ancien projet sans Préparation, après vérification serveur propriétaire/forfait. Une conversation maximum par projet, y compris double requête.
2. Lire un instantané de contexte avec provenance et références : projet/métier, version thème courante, identité, compteurs catalogue/médias/contenus et références vers historique. Pour un ancien projet, le contexte est une lecture des acquis, **pas une nouvelle fiche canonique Préparation**. Adapter les lectures aujourd’hui liées à `currentBrief` sans appel à `initialize`, sans modifier les statuts/validations historiques. Signaler les informations absentes au lieu de les inventer.
3. Garder `shop.chat` intact et consultable via son parcours natif ; exposer sa présence/référence sans recopier ses réponses IA comme des faits client. Ne pas importer tout son historique dans une nouvelle mémoire sans règle de provenance. Enregistrer/lire les nouveaux messages SYNA avec les mécanismes persistants déjà présents.
4. Exposer à la présentation Claude un état explicite : repris en lecture, actions encore indisponibles, contexte/versions, liens natifs. Le devis et les autorisations des outils actuels restent nécessaires ; pas d’ouverture globale des outils sur un projet simplement rattaché.

**Hors A1 :** migration de Préparation, fusion des deux historiques, réanalyse, génération, retouche du thème, moteur local, préférences Encre/Plein cadre, enrichissement de toutes les cibles, publication/RDV/domaine. Ces limites gardent le lot petit et permettent de tester sa conservation avant toute écriture métier.

Recette d’acceptation à réaliser pendant A1, pas déclarée réussie maintenant :

- Deux projets synthétiques préexistants : boutique et services, sans Préparation, avec thème, médias, contenus métier, historique `shop.chat` et retouches manuelles ; plus un projet avec Préparation et un projet ayant déjà sa conversation.
- Relevé avant/après des identifiants et empreintes : thème courant et liste des versions, brand/product/settings, assets et fichiers, contenus métier, chat historique, droits/abonnement, historique jobs/appels. Ils restent identiques ; seules les écritures conversation explicitement attendues sont autorisées.
- Double POST/réessai après réponse perdue → même conversation ; message enregistré une fois avec le mécanisme requestId ; fermeture/réouverture → même fil.
- Compte étranger, compte admin étranger, forfait révoqué, drapeau fermé → refus selon garde existante, aucune lecture interclient ni écriture ; noms/texte des anciens contenus traités comme données, jamais comme instructions.
- Modification manuelle du thème/contenu pendant la reprise → état relu/version actualisée ou conflit explicite ; aucune donnée restaurée silencieusement depuis un instantané périmé.
- **Compteurs de nouveaux appels fournisseur, consommations et tâches de génération : 0**. Aucune initialisation Préparation ni nouveau thème.
- Preuves HTTP des codes et corps utiles, captures desktop/mobile avec l’interface existante, stockage isolé, tests ciblés et bilan coût/échecs/limites. Aucun redesign requis pour prouver le lot.

Réutiliser les tests de conversation `conversation209-core/http` et les sondes `integration276`/#279 plutôt que lancer toutes les anciennes recettes pendant l’audit. Les tests de conservation legacy ci-dessus sont nouveaux et nécessaires au lot A1. Après recette : PR limitée, rapport et **arrêt pour validation**, sans fusion automatique.

## Contrat d’intégration proposé à Claude

Contrat **à valider**, pas annoncé implémenté ni convenu avec Claude. Les deux modes consomment les mêmes routes et états. Aucun fichier de `docs/syna-2030/`, composant graphique, police, thème client ou maquette Claude n’est modifié par cette livraison.

| Objet partagé | Champs/garanties minimales | Responsabilité |
|---|---|---|
| Conversation / message / brouillon | `conversationId`, `projectId`, `revision`, messages avec provenance ; brouillon conservé au changement de présentation ; pagination existante | Codex contrat/persistance ; Claude présentation |
| Contexte sélectionné | `tab`, type/id objet, version attendue, page/section/bloc/champ, texte/source nécessaires ; référence média autorisée ; aucune permission donnée par le contexte | Codex validation ; Claude sélection/transmission |
| Proposition / outil | opération explicite, paramètres relus, portée, diff avant/après ; `implemented` séparé de `enabled` et de `verified` | Codex moteur ; Claude carte commune |
| Devis / consentement | `quoteId`, coût probable/plafond en %, route figée côté serveur, expiration, révisions ; accord distinct, `requestId`, reçu d’accord ; modification de portée → nouveau devis | Codex garanties ; Claude affiche sans dissimuler les limites |
| Tâche / progression | job/receipt id exact, statut réel, progression/étape, reprise sans nouvel achat ; arrêt disponible seulement si API réelle correspondante | Codex ; Claude états partagés |
| Résultat / preuve | effet réellement enregistré, sortie/version/empreinte ou preuve native, lien aperçu/fichier, reçu coût réel ; `done` seul ne signifie pas vérifié | Codex ; Claude distingue enregistré/à relire/vérifié |
| Erreur / restauration | code stable, conflit de version, action possible, acquis conservés, résultat fournisseur incertain sans relance ; restore seulement si version/outil permettent | Codex ; Claude état d’erreur/action accessible |
| Préférences d’interface | mode Encre/Plein cadre, dimensions/densité/clair-sombre ; héritage compte puis surcharge projet à confirmer ; état partagé conserve brouillon/cible/tâche | Claude persistance UX ; Codex routeur local commande textuelle |

Commandes « mets Plein cadre », « reviens à Encre », « agrandis l’aperçu » : interprétation locale bornée, émission d’une intention UI ; **0 appel IA, 0 mutation du thème client, aucun second moteur/conversation**. Les valeurs demandées hors limites sont clarifiées localement. Bascule pendant tâche, clavier mobile, rechargement et deux appareils font partie de la recette UX future ; aucune capacité de synchronisation déjà livrée n’est affirmée.

## Huit capacités intelligentes à proposer, sans les développer

Ces pistes prolongent les propositions de #211 ; elles ne comptent pas la simple présence d’un adaptateur comme une innovation livrée. Les appels ci-dessous sont des **bornes de conception**, pas des prix du compte ; toute dépense reste devisée et consentie.

| Proposition / valeur | Données nécessaires | Coût estimable | Sécurité / faisabilité et preuve |
|---|---|---|---|
| **1. Prochaine action utile** : détecter une variante/coordonnée/validation manquante avant de créer le mauvais contenu | État natif, dépendances Préparation, inconnues, catalogue, reçus | Règles locales 0 ; conseil rédigé dans une réponse déjà devisée, pas de nouvel appel implicite | Faisable après A1/A2 ; une suggestion justifiée, aucune action automatique ; corpus produit/services tenu à l’écart |
| **2. Audit qualité après action** : comparer la demande au résultat enregistré et au rendu | Diff, fichiers réellement livrés, captures/mesures, document/cible d’origine | Vérifications locales 0 ; au plus un contrôle IA optionnel devisé par résultat | Faisable ; checks techniques ne prouvent pas qualité esthétique ; défaut montré avec preuve, pas auto-régénéré |
| **3. Correction propagée avec aperçu** : une correction de fait ou vocabulaire retrouve tous les contenus touchés | Wording rules, documents, fiches, médias textuels, provenance et versions | Recherche exacte locale 0 ; réécriture IA par document si requise, lot devisé | Effort moyen ; aperçu des seuls diffs, modifiés à la main protégés ; accord et reprise idempotente |
| **4. Cohérence de marque mesurable** : repérer ancien nom, signature, palette ou logo après changement | Identité active/historique, assets, contenu et thème versions | Comparaisons locales 0 ; contrôle visuel IA séparément devisé | Effort moyen ; produit impact existant à réutiliser ; aucune substitution de marque sur création manuelle sans accord |
| **5. Campagne multi-sorties cohérente** : une offre réelle devient page, e-mail/brouillon social et annonce avec mêmes faits | Brief sourcé, droits, canaux connectés, formats, documents et stratégie | Devis texte + somme des médias manquants ; réemploi acquis 0 ; plafond global détaillé | Faisable après C/D ; préparer seulement, chaque publication/lancement validé ; succès partiels et coûts distincts conservés |
| **6. Conseils fondés sur performances connectées** : recommander à partir de mesures réellement lues | Connexions autorisées, période, fuseau, métriques attribuables, consentement | Lecture selon API connectée ; un raisonnement devisé ; fréquence/plafond à décider | Conditionnel aux connecteurs ; aucune statistique inventée, corrélation ≠ causalité ; sans données, annonce indisponible |
| **7. Alternative économique expliquée** : comparer réemploi, retouche locale et génération avant achat | Catalogue acquis, budget restant, tarifs/routes natifs, demande/cible | Comparaison locale 0 ; raisonnement optionnel devisé ; aucun achat par recommandation | Faisable après B ; coût/limites affichés sans dégrader silencieusement la qualité ou contourner fournisseurs |
| **8. Plan de réparation après conflit** : conserver les acquis puis proposer seulement les changements encore utiles | Reçus, versions avant/après, modifications humaines, statut jobs/fournisseur | Relecture/diff 0 ; rédaction ou médias supplémentaires seulement au devis | Faisable par module ; jamais relancer une requête fournisseur incertaine ; test concurrence/crash et preuve du non-rachat |

Premiers choix conseillés après la parité de base : **1, 2 et 3**. Les performances connectées restent conditionnelles aux données disponibles et les campagnes multi-sorties dépendent du raccordement effectif des modules.

## Décision attendue et arrêt

Valider **A1 seul**, ou réordonner explicitement les priorités. Le lot proposé contient déjà son périmètre, ses exclusions et ses critères observables. Aucun lot A/B/C/D/E/F n’a commencé ; aucune autorisation de fournisseur réel, de fusion ou de déploiement n’est demandée pour cet audit documentaire.
