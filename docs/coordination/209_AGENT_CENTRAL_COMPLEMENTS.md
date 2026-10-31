# #209 — Compléments : IA prioritaire, spécialistes à la demande et conception Site

Lecture intégrale des trois compléments de l’issue #209 le 28 octobre 2026 : orchestration adaptative, arbitrage prioritaire IA, conception Site. **L’arbitrage IA prime** : « économique » signifie le moins cher **parmi les solutions de qualité démontrée**, jamais remplacer la compréhension ou la création par des règles faute de budget. Ce document complète l’audit et le contrat de la PR #210 ; aucune activation, modification des thèmes, fusion ou dépense réelle.

## Version et portée

Code de production examiné : livraison `477e47f57612878d001223fafd2b666fd81ac31b` de la PR #210 ; main `70204a7ff83eb2382835a27a37a8465c0851a70a`. #208 et sa copie `a0246c7753bca30e365d57b4cd8202ce95c3f812` restent indépendantes. Les sources applicatives ne changent pas dans ce complément. Les nouvelles fonctions exécutables vivent uniquement dans `scripts/agent209-orchestration-study.ts`, importé par son test et non par le Studio : **banc d’étude hors production**, pas nouveau routeur, orchestrateur, budget ou agents actifs.

La proposition locale de type et les questions fixes du prototype livré restent utiles à la recette des contrats, de la persistance et de la sécurité. **Leur équivalence à une découverte IA n’est pas démontrée ; ce n’est donc pas le moteur cognitif retenu pour le produit futur.** Le drapeau demeure fermé. Leur activation comme découverte intelligente exige le prochain lot IA autorisé, sa comparaison de qualité et le raccordement devis #208 vérifié. Une simulation réussie ne justifie pas cette activation.

Statuts : **CONFIRMÉ DANS LE CODE** pour les fonctions et branches lues ci-dessous ; **REPRODUIT EN SIMULATION** pour le banc chiffré et ses refus ; **PROPOSITION** pour les contrats/seuils futurs ; aucune observation de nouveaux journaux clients ni validation artistique réelle.

Les références exactes des principales preuves de code (fichier, fonction/branche, ligne, SHA-256 et lien GitHub figé) sont dans [site-source-audit.json](preuves-209-agent/site-source-audit.json), sur **18 fichiers réellement lus**. Les liens pointent au code examiné, pas à une ancienne conclusion de rapport.

## Matrice des domaines — capacité actuelle et routage visé

Niveaux : léger = extraction/classification évaluée ; standard = raisonnement/rédaction contrôlée ; fort = stratégie/composition/arbitrage complexe ; vision = aptitude à lire les médias, indépendante du niveau. Un niveau n’est pas une preuve de qualité. Valider le modèle sur le domaine puis choisir le moins cher des qualifiés ; modèle désactivé/non confirmé/non tarifé = indisponible. Pas d’identifiant de modèle figé dans ce contrat.

| Domaine et code actuel | Cognitive ou exacte ; rôle de l’IA | Niveau et comparaison nécessaire | Coût/repli autorisé |
|---|---|---|---|
| Découverte/questions : `orchestrator/conversation/questions.ts`, `preparation/understanding.ts`, Intent `understand` | Comprendre le métier, expliciter les inconnues, choisir une bonne question = cognitif. Enregistrer un choix explicite = exact. Le prototype local ne prouve pas l’intelligence. | Standard, fort si ambigu ; échantillon FR/EN, métiers mixtes, refus d’invention et correction. Comparer au prototype en aveugle. | Devis natif avant raisonnement payant. Sans budget, préserver la saisie et attendre ; formulaire manuel possible **explicitement**, pas conseil local présenté comme équivalent. |
| Recherche/positionnement : `marketing-strategy/`, `preparation/research.ts`, `strategy-consumption.ts` | Recherche factuelle sourcée, choix de positionnement = cognitif ; vérification format/source = code. | Fort + outil recherche, fraîcheur/citations, distinction fait/hypothèse ; pas de persona transformé en fait client. | Inclure recherche, synthèse, critique, corrections ; si sources manquent, conclusion non prouvée. |
| Marque/logo : `logo-v2/`, `media/identity-board.ts` | Direction artistique, choix des pistes et jugement de logo = cognitif ; gabarit de charte et export exacts. | Fort + image/vision, identité et nom exacts ; vraie grille visuelle, sources humaines autorisées. | Réutiliser les créations approuvées ; réserve commune ; circuit logo existant à respecter, aucun agent qui redessine automatiquement. |
| Textes/SEO : `ai/tasks.ts::aiShopCopyChecked`, `seo-v2/`, `theme/client-copy.ts` | Écrire des textes propres à chaque offre/section = cognitif ; appliquer mot pour mot une correction ou sauvegarder = exact. | Standard/fort selon complexité ; pertinence du CTA, faits, ton, diversité et textes complets jusqu’à l’export. | Conserver les textes approuvés ; retouche limitée au champ concerné ; pas de gabarit commercial de secours silencieux. |
| Images : `image-v2/`, `ai/media-routing.ts` | Choix du cadrage/scène et fidélité visuelle = cognitif ; tailles et droits de médias = code. | Modèle image autorisé + vision ; produit entier, variante exacte, texte/logo exacts. | Tarifs réels, références autorisées, contrôle inclus ; conserver la version utilisable et signaler tout échec. |
| Vidéo : `video-v2/` | Scénario, plans et jugement de continuité = cognitif ; montage et formats exacts. | Fort + génération/vision selon besoin ; référence produit/personne, cohérence de marque, durée. | Plafonner plans, reprises et contrôles ; réponse fournisseur incertaine = pas de relance automatique. |
| Site/composition : `theme/spec.ts`, `engine/shop.ts`, `engine/custom-theme.ts` | Plan de page, proportions, direction artistique et copywriting = cognitifs ; renderer, opérations, versions = code. | Fort + vision ; comparer les trois modes sur desktop/mobile et parcours complets. | Prototype de section nouvelle seulement après devis ; pas d’abaissement de qualité ni de modification de maquette validée. |
| Contrôle qualité : `quality/`, `theme-v2/quality.ts`, `ai/tasks.ts::aiReviewHome` | Schéma, calculs, liens = exact ; lisibilité artistique, ton, adéquation image/texte = cognitif. | Déterministe d’abord pour les mesures exactes ; vision/standard-fort pour jugements, indépendant si bénéfice prouvé. | Critiquer la version réellement rendue, puis une correction ciblée plafonnée ; sinon état incomplet, pas « terminé ». |
| Blog : `engine/blog.ts`, `seo-v2/blog.ts` et routes `blog` | Intention de recherche, rédaction et pertinence = cognitif ; version et export = exact. | Standard/fort ; citations, non-invention, qualité éditoriale ; pas validation par longueur seule. | Réemploi du brief ; publication distincte, jamais impliquée par rédaction. |
| Publicités : `ads-v2/` | Angles et composition = cognitif ; prix, formats et diffusion autorisée = exact. | Fort + image/vision ; angle de campagne séparé du positionnement global ; aucune preuve sociale inventée. | Total créa + contrôle + reprises dans budget commun ; achat média non autorisé par le chat. |
| Réseaux/calendrier : `social-v2/` | Conseil et programmation éditoriale = cognitif ; dates, file et envoi = exact. | Standard/fort ; cohérence intercontenus, diversité, droits d’images. | Réutiliser approuvés, tâche de fond explicite et bornée ; pas de surveillance permanente. |
| RDV/devis métier : `rendez-vous.ts`, `salon/booking.ts`, `cabinet/booking.ts`, `restaurant/booking.ts` | Conseil sur une prestation = cognitif ; disponibilités, prix et réservation = exact. | IA seulement si conseil requis ; disponibilités/prix jamais inventés. | Outils serveur existants, confirmation de mutation et droits ; distinguer devis métier et estimation IA. |
| Catalogue/prix/stock : `products/`, `theme/purchase-offers.ts` | Explication contextualisée = cognitif ; variantes, sommes, stock et cadeaux = exact. | Pas de LLM pour calculer ; exactitude catalogue/panier testée par plateforme. | Gardes d’export serveur conservés ; ne pas garantir un stock CMS synchronisé parce qu’un ZIP existe. |
| Auth/droits/budget/transferts : `auth.ts`, `project-billing.ts`, `billing.ts` (`reserve`) | Déterministe obligatoire ; IA ne réimplémente ni n’accorde les droits. | Tests isolement/transactions/concurrence ; aucun seuil sémantique. | Même abonnement/projet, mêmes réservations et coût réel, aucun portefeuille par spécialiste. |
| Export/publication : `cms-v2/export.ts`, `theme/export` | Compilation, validations et transfert = exact ; jugement du résultat exporté = cognitif + humain. | ZIP réel, navigateur plateforme si autorisé ; mesures techniques distinctes du verdict visuel. | Kit ≠ site installé. Publication/achat/suppression : accord et droit explicites. |

**Écart de routage confirmé** : `orchestrator/router.ts::route` renvoie local si IA inactive ; `localWhenSimple` et `simpleTier` peuvent également choisir local/léger. Le fallback trie par niveau puis peut retenir un niveau inférieur faute de capacité suffisante. `policy.ts` décrit la qualité d’abord, mais ces branches **ne constituent pas une preuve d’équivalence cognitive**. Avant raccordement futur : passer `allowLocal:false` pour le cognitif, vérifier niveau/capacité/qualification après décision, refuser une route sous le minimum qualifié, bloquer si IA indisponible. Ne pas changer globalement les anciens moteurs dans cette PR. `engine/local-first.ts` doit rester utile pour les opérations exactes sur cible explicite ; ses mots-clés ne sont pas une nouvelle intelligence générale.

## Point d’entrée unique, spécialistes optionnels et contrat d’extension

**PROPOSITION, non raccordée.** L’agent principal assure le dialogue ; les compétences stratégie, identité, médias, Site, communication et contrôle sont des tâches ponctuelles du **Planner/Router existants**. Même modèle possible pour plusieurs compétences ; pas six agents permanents, pas de seconde mémoire, pas de nouveau wallet. Le banc utilise des rôles, pas de vrais agents ou sessions fournisseurs.

Enveloppe serveur proposée pour chaque tâche :

```ts
type CognitiveWorkOrder = {
  requestId: string; parentPlanId: string; stepId: string;
  // Propriétaire/projet et consentement résolus par le serveur, jamais par le modèle.
  briefRevision: number; briefFingerprint: string; themeVersionId?: string;
  skill: 'discovery'|'strategy'|'identity'|'copy'|'media'|'site'|'quality';
  mode: 'cognitive'; minimumQualifiedTier: 'standard'|'strong';
  contextProjection: string[]; criticalConstraintsFingerprint: string;
  acceptanceCriteria: string[]; comparisonEvidenceId?: string;
  envelopeId: string; maxCalls: number; maxDurationMs: number;
  targetIds: string[]; expectedInputFingerprint: string;
};
```

Extension future à `RouteRequest`/`PlanStep` (pas ajoutée à leurs contrats servis) : `workOrder` lié à une capacité, qualification datée et permissions serveur. Le modèle fournit seulement une proposition structurée et ses références ; **pas d’exécuteur, HTML/JS exécutable, SQL, URL de publication ou budget fourni par son texte**. Revalidation sous transaction de la révision, de l’acquis, des droits et du devis avant effet ; reçu réel lié à la tâche et au livrable. Une réponse extérieure, un lien ou un texte client restent des données non fiables, jamais des instructions système. Les frontières de langue (FR/EN), de compte et de projet restent celles du Studio.

Projection de contexte : même Brief versionné + empreinte Brain/stratégie approuvée ; toujours transmettre description originale utile, contraintes négatives, textes exacts, inconnues, décisions/verrous et provenance. Ajouter uniquement offre/cible/pages/médias/sources utiles à la compétence. **Ne pas envoyer l’historique entier à tous les rôles.** La projection testée ici conserve les champs critiques intacts, refuse un autre compte/projet et refuse le dépassement de fenêtre, au lieu de tronquer silencieusement. Les résumés générés restent secondaires et doivent référencer leurs sources ; une nouvelle contrainte invalide les résumés et devis concernés.

Déduplication future : compte + projet + révision + empreinte de demande/correction + compétence + modèle/réglages + versions des médias et du renderer. Réutiliser résultat approuvé compatible ; jamais cache interclients. Pas de cache de raisonnement privé. Une empreinte ou projection ne suffit pas à autoriser la réutilisation : relire droits et acquittements au moment d’agir. Le banc ne crée aucun cache.

### Tableau de décision (règles futures, pas résultats qualité)

| Besoin | Appel / contexte minimal | Enveloppe initiale proposée | Critère de choix et arrêt |
|---|---|---|---|
| Enregistrer un choix, montrer une version, déplacer la section explicitement désignée | Code natif local ; ID cible/révision, pas spécialiste | 0 appel cognitif | Effet déterministe identique ; conflit = recharger, pas deviner. |
| Découverte ou conseil même « simple » | Principal IA, brief/contraintes + inconnues | 1 appel + 1 correction ciblée maximum | Questions utiles et non redondantes ; aucun gain spécialiste présumé. Sans IA qualifiée : attendre. |
| Construire marque + Site | Principal fort ; spécialiste copy/Site seulement si comparatif positif | Plan plafonné illustré par l’étude : 4 ou 7 appels max | Garder mono si équivalent ; spécialistes si amélioration représentative mesurée et budget/temps autorisés. |
| Site + annonces + images | Principal, outils médias existants ; tâches ciblées, jamais tous les historiques | Étude : 8 ou 11 appels max, dont 3 images + 1 reprise image au plus | Prix du plan complet, évaluations incluses ; défaut visuel bloquant interdit la validation même si coût faible. |
| Contrôle indépendant | Brief original + décisions + captures versionnées + parcours ; pas seulement l’auto-évaluation du créateur | Une critique, une correction ciblée, nouveau contrôle dans l’enveloppe totale | Gain de détection/réduction erreurs démontré ; aucune critique/régénération infinie. |
| Option suffisante trop chère / réponse incertaine | Conserver acquis et état ; proposer réduire le périmètre, différer ou nouvel accord | Pas de dépense supplémentaire implicite | **Aucun fallback créatif local inférieur présenté comme validé** ; pas de retry fournisseur ambigu. |

Seuils **proposés et à calibrer**, non garanties : échantillon de qualification ≥ 30 projets diversifiés + 10 cas tenus à l’écart, zéro fuite/invention critique, aucune régression fonctionnelle bloquante, notes brief/marque/visuel/copy toutes ≥ 4/5 par deux relecteurs indépendants ; comparer en aveugle à critères identiques. Spécialiste admis si ≥ 0,5/5 de gain médian sur l’axe visé **sans perte sur les autres** ou ≥ 20 % de défauts importants en moins, sur ce corpus, avec total proposé ≤ 125 % du mono et durée ≤ 150 %. Ces seuils ne disent pas qu’un gain existe. Si coûts dépassés : mono seulement s’il satisfait les mêmes critères, sinon arrêt/nouvelle proposition. Version, corpus, évaluateurs et incertitude doivent être publiés avant de déclarer une équivalence.

## Comparaison instrumentée — SIMULATION uniquement

Reproduction : `NODE_OPTIONS='--import=./scripts/lot9/network-guard.mjs' npx tsx scripts/agent209-orchestration-study.ts`. Le script lit **statiquement** `policy.ts`, `config.ts` et `media-models.ts` par AST, sans importer les modules applicatifs, ouvrir la base, lire des clés ou contacter un fournisseur. Les tarifs sont les **valeurs par défaut du dépôt**, empreintes des trois fichiers dans le JSON ; pas les réglages de l’administration réelle, pas une vérification des prix publics actuels. Aucune erreur de tarif n’est remplacée par zéro.

Tarifs d’étude texte USD/million : léger entrée 1 / sortie 5 ; standard 2 / 10 ; fort 4 / 20 ; image primaire du catalogue 0,081 USD, borne avec références du dépôt. Les IDs sont résolus dans le code existant, pas fixés dans cette livraison. **Information d’administration/étude seulement** : le client voit toujours les % calculés par le devis natif. Pas de conversion euro ou de pourcentage inventé sans snapshot autorisé du wallet et des prix réellement applicables.

| Même périmètre d’étude | Variante | Appels prévus / max | Tokens entrée / sortie ESTIMÉS | USD théoriques prévus / borne d’étude | Durée séquentielle ESTIMÉE |
|---|---|---:|---:|---:|---:|
| Conseil client contextualisé | Mono | 1 / 2 | 1 600 / 400 | 0,0072 / 0,024 | 1,8 s |
| Idem | Principal + spécialiste | 3 / 4 | 3 800 / 800 | 0,0156 / 0,03725 | 4,6 s |
| Marque + Site, images client acquises | Mono | 3 / 4 | 26 000 / 6 800 | 0,24 / 0,5945 | 23,5 s |
| Idem | Principal + spécialistes | 6 / 7 | 28 000 / 9 000 | 0,2576 / 0,5915 | 30,5 s |
| Site + 3 annonces + 3 images, sans vidéo | Mono | 6 / 8 | 28 000 / 8 000 | 0,515 / 0,994 | 86,5 s |
| Idem | Principal + spécialistes | 9 / 11 | 29 500 / 9 400 | 0,5146 / 0,939 | 92,5 s |

Tokens = texte seulement, **hypothèses de fixtures**, pas comptage tokenizer ni usage réellement observé. Images comptées séparément au tarif unitaire ; volume vision inconnu. Latences synthétiques, aucune concurrence chronométrée ; complexité accrue avec chaque transfert/contextualisation/synthèse. Le mono inclut son auto-relecture ; le multi inclut l’évaluateur séparé et la synthèse. Réparer/évaluer/replier exige toujours un appel inscrit dans la même enveloppe : borne d’étude = entrée × 1,25, sortie × 2, plus **une** correction texte au prix maximal d’une étape, et reprise image déclarée. Ce n’est pas une garantie fournisseur ni un devis de production. Recherche externe, vidéo, installation CMS et taxes ne font pas partie de ces périmètres ; FX/markup non vérifiés. Un projet nécessitant une recherche n’obtient donc **pas** son devis complet à partir de ce tableau.

**Qualité et gain : NON MESURÉS dans les six variantes.** Les très faibles écarts de prix des deux derniers scénarios dépendent des quantités supposées, ne prouvent aucun gain de qualité ni même que le multi coûtera moins cher en pratique. Le banc teste le refus des candidats non qualifiés ; il n’en qualifie aucun en production. Préférence recommandée : mono adapté pour la cognition jusqu’à preuve de valeur du spécialiste, code exact pour les fonctions exactes. Le tableau n’autorise aucun appel.

### Budget commun, suivi et reprise

Réutiliser `ai/llm.ts`, `billing.ts` (`reserve`, `recordUsage`), `ai_calls` et les checkpoints natifs : tous les appels principal/spécialiste/recherche/évaluation/reprise/repli portent même projet et abonnement, IDs de plan/étape/call/réservation. Aucun budget nouveau, aucun reset. Le consentement lie maximum total + empreinte du plan/contexte ; une correction qui change les entrées invalide le devis. Réserver avant appel avec les règles natives ; ne pas additionner à nouveau une réservation enfant déjà comprise dans la réserve parent. Un succès facturé reste enregistré même si le livrable est refusé. Réponse ambiguë : état incertain et rapprochement, pas appel supplémentaire automatique.

Plafonds inchangés : fournisseur ≤ 40 % abonnement HT et ≤ 50 % recharge HT. Client : estimation probable et maximum en % de son budget IA, confirmation adaptée ; admin : coût fournisseur réel vs estimé, modèle demandé/servi, coût de critique/reprise, réservations, latence, cache/réemploi, tentatives et raison synthétique de routage. Ne pas exposer un raisonnement privé.

Par demande future : borner appels, étapes, tokens/sortie, durée et enveloppe totale ; checkpoint lié aux versions ; aucun travail après fermeture sans autorisation de tâche de fond déjà acquise. Mesures prévues : taux de fidélité brief, inventions/contradictions, conformité produit/marque, défauts visuels desktop/mobile, parcours/export, coût par livrable accepté, coût des reprises, taux d’abandon et latence P50/P95. Un transfert entre spécialistes n’est ni une réussite ni un livrable.

## Audit Site approfondi — capacités et limites effectives

Tous les éléments suivants sont **CONFIRMÉS DANS LE CODE** au SHA audité ; pas constatés dans le rendu d’un nouveau projet réel.

| Source / fonction | Ce qui existe et doit être conservé | Limites / conséquence pour l’agent Site |
|---|---|---|
| `theme/spec.ts::ThemeSpec`, `TemplateJson`, `SectionInstance`, `StorePage`, `ProductContentBinding` | Sections/blocs ordonnés, réglages, fichiers, pages, produits/gabarits, source de texte et verrous ; structure commune aux rendus/exports. | Pas un langage libre de composition responsive avec grille/spans/espacements/points de rupture arbitraires. Disposition dépend du schéma et du CSS de chaque section. |
| `engine/shop.ts::buildShopInScope` | Protection des thèmes de référence, préparation/stratégie native ; pas substitution automatique V2 sur un thème validé. | Projet préparé exige thème de galerie ; moteur V2 explicitement refusé dans cette branche. « Sans thème imposé » n’est donc pas déjà un parcours équivalent. |
| `theme/ops.ts::OpSchema`, `applyOps`, `validateSpec` | Modification ciblée sur copie : texte, image, ordre, remplacement, blocs, couleurs/échelle ; verrous/cibles, validation schéma et contraintes de sections. | `ApplyResult` peut contenir opérations appliquées **et rejetées** ; l’agent doit montrer le partiel, pas traduire HTTP 200 en demande entièrement satisfaite. `element_style` n’est pas un designer complet. |
| `theme/section-fit.ts`, `section-compat.ts`, `theme-own-sections.ts`, `plan-access.ts` | Compatibilités liées au renderer/style chargé, droits serveur sur ajout et commandes ; sections déjà installées conservées. | Liberté de composition n’autorise ni charger le CSS d’un autre thème à l’aveugle ni contourner les droits. Un composant nouveau exige renderer/capacité déclarés. |
| `theme/section-library.ts`, `family-ops.ts`, route `theme/disposition` | Bibliothèque et variantes déclarées, galerie, réglages natifs réutilisables. | Choix de dispositions fini ; aucune preuve que permutations produisent une direction artistique originale. Ne pas proposer les sections d’un autre thème incapables d’être rendues. |
| `engine/custom-theme.ts::CustomPlanSchema`, `aiCustomThemePlan`, `aiCustomSection` | Vrai plan IA et sections Liquid/CSS éditables par schéma ; réutilisation des composants natifs et du contexte. | Plan limité à **3–16 sections, templates index/product**, requiert thème existant non importé. Ce n’est pas un éditeur sur mesure de toutes les pages/services. Les scènes/typos restent dans Liquid/CSS, pas un arbre déclaratif responsive unifié. |
| `custom-theme.ts::writeSection`, `checkCustomSection`, `assembleCustomTheme` | Corrections bornées, contrôles Shopify/schéma/allégations/rendu, garde fiche produit native ; checkpoints préservent les sections écrites. | Après échec, reprise ancienne/bibliothèque ou retrait, trace `fallbacks`. L’assemblage remet accueil et entourage produit à plat et retire leurs anciens verrous : futur outil exige périmètre et accord explicites, pas usage comme retouche ciblée. Un repli n’est pas équivalence artistique démontrée. |
| `theme/content-security.ts::unsafeContentReason`, `assertSafeThemeContent`, `ops.ts::validateCustomSection` | Interdiction contenu actif dangereux, événements, scripts générés, ressources externes ; seuls scripts natifs autorisés. Liquid borné en parse/rendu/mémoire (`render.ts::LIQUID_LIMITS`). | Préserver ces gardes pour toute section originale. Pas d’exécution libre de JS/CSS externe proposé par un modèle. Animations CSS sûres/composants natifs seulement. |
| `theme/client-copy.ts::bindClientCopy`, `section-copy.ts::applySectionCopy`, `client-adaptation.ts::adaptClientReference` | Liaison contenu client/rôle de section, CTA service distinct, données manuelles et compositions préservées ; plans d’emplacement et médias propres au client. | Assemblage par rôle/occurrence et réemploi modulo de textes peuvent répéter une idée. `applySectionCopy` attrape une erreur et renvoie les valeurs de base : succès technique ne prouve pas rédaction contextuelle. Pas correction générale dans cette tranche d’audit. |
| `ai/tasks.ts::aiShopCopyChecked`, `theme/strategic-copy.ts`, `theme-v2/content.ts::fitText` | Rédaction IA avec contrôle/reprises ; textes approuvés/stratégie consommés ; champs SEO plafonnés. | Le réemploi stratégique local ou le raccourcissement d’un champ ne prouve ni qualité commerciale ni cohérence image/section. Conserver texte complet + variante adaptée avec provenance ; ne pas utiliser le nom d’un projet comme règle. |
| `theme-v2/engine.ts::composeThemeV2`, `compose.ts::compose` | Composeur local de pages avec données disponibles ; version et qualité identifiables. | Bibliothèque/branches locales finies, `savedCopy ?? localCopy` ; ne remplace pas une conception IA quand la qualité équivalente n’a pas été démontrée. |
| `theme/render.ts::renderPage`, `compile.ts::compileTheme`, route `theme/section-preview` | Même structure, preview Liquid, schémas modifiables ; aperçu section sans écriture. | Aperçu de galerie non interactif, contenus d’exemple possibles et marqués ; ne valide pas parcours entier ni export CMS installé. |
| `theme/snapshot.ts::snapshotTheme`, `themeContext` | Captures **1440×900 / 390×844**, vrai navigateur isolé, médias/polices, défilement puis image complète ; découpage en planches. | Retour null si navigateur absent. Planches limitées ; mouvement réduit et panier vide factice : aucune preuve d’animation normale ni de variante/panier/formulaire fonctionnels. |
| `ai/tasks.ts::aiReviewHome`, `custom-theme.ts::buildCustomTheme` | IA vision lit captures home et produit, outline et référence ; score et corrections limitées. | Captures produit peuvent être null ; exceptions relecture journalisées puis poursuite avec qualité non contrôlée. Après application des corrections, pas nouvelle capture systématique dans ce bloc avant save. L’agent futur doit marquer non vérifié, recapturer le candidat corrigé, couvrir toutes pages/cas. |
| `theme-v2/quality.ts::checkThemeV2`, `quality/gate.ts`, `scripts/lib/visual-check.ts` | Contrôles exacts + défauts navigateur possibles ; artistique/originalité explicitement « non mesurés » en local. | Un score local ne qualifie pas le design. Certaines allégations sont détectées par motifs : absence de motif interdit ne prouve pas vérité. Mesures navigateur vides ≠ navigateur passé. |
| `projects.ts::saveThemeVersion`, routes `theme/ops`, `theme/restore` | Versions/parents, sauvegarde candidat non activé possible, restauration crée une nouvelle version, refus d’activer une tentative rejetée. | La route d’opérations manuelles n’exige pas un `expectedVersionId` fourni dans son corps. Futur outil doit contrôler la version attendue atomiquement, sans écraser une modification manuelle concurrente. |

### Trois modes sans toucher aux maquettes

**Thème existant** : choisir uniquement une direction autorisée par `theme-fit`/droits. Référence validée immuable ; client reçoit ses contenus et médias, aucune modification des fichiers démo pour l’adapter. L’IA propose des variations dans les capacités des sections ; source manuelle/verrou respectée et différence expliquée avant application.

**Sur-mesure** : cible future avec squelette sûr de navigation/transactions, aucun thème imposé à la composition. Le chemin actuel `theme.custom` n’est pas suffisant : il exige un thème et vise deux gabarits. Introduire d’abord un plan déclaratif versionné de pages et sections, en réutilisant `ThemeSpec` plutôt qu’une deuxième représentation autoritaire. Champs futurs validés : rôle, composant renderer connu, variante, contraintes de largeur/grille/espacement/taille, override mobile autorisé, références de contenu/médias et consentements. Toute nouvelle disposition a une implémentation sûre revue et des tests preview/exports ; pas code arbitraire fourni par le client/agent.

**Hybride — cible privilégiée** : préserver composants natifs achat/variantes/panier/devis/RDV, libérer la mise en scène par dispositions validées et sections nouvelles. L’originalité repose sur le plan cognitif et le rendu vérifié, pas sur changer une couleur. Les pages et textes gardent leur provenance/révision. Le mode choisi est une intention, pas une promesse que toutes les plateformes savent le rendre.

### Contrat d’outils Site (proposé ; aucun nouvel endpoint créé)

Toutes les commandes : session/propriétaire/forfait serveur, `{requestId, expectedThemeVersionId, briefFingerprint, targetIds}`, schéma strict ; retour `{status, applied, rejected, candidateVersionId, checks, missingCapabilities, costPercent, receiptRefs}`. `status` distingue proposé, devis, contrôle incomplet, correction requise, validé techniquement et validé visuellement. Exécution sensible/payante reste séparée. **Existence de fonction ≠ outil connecté au chat central** : tous ces outils Site restent `not_connected` dans la PR.

| Outil futur | Réutilisation réelle | Manque à raccorder / autorisation |
|---|---|---|
| `site.inspect` | `currentTheme`, `outline`, `sectionSchema`, `contentContext` | Contrat de lecture contextualisé, provenance, capacité par plateforme ; aucun effet. |
| `site.plan` | Planner natif, `aiCustomThemePlan` partiel | Plan toutes pages/modes, qualification IA, sources marketing et contrats responsive ; devis global obligatoire. |
| `site.create-section` / `site.edit-section` | `custom_section`, `add_section`, `replace_section`, contrôles existants | Nouveau composant/disposition uniquement validé, forfait et devis ; candidat non activé. Pas écriture dans les maquettes. |
| `site.apply-content` | `use_media`, `set_setting`, `bindClientCopy`, plans d’adaptation | Références du bon produit/page/image, texte exact complet, versions manuelles verrouillées ; pas rotation arbitraire ni faits nouveaux. |
| `site.preview` | `renderPage`, preview versionné et cloisonné | Liens signés privés, candidate exacte, sans activation/publication. |
| `site.capture` | `snapshotTheme`, `themeContext` | Couverture toutes pages/états, hash médias/renderer, conservation des captures et manquants ; normal ET reduced motion, aucun statut « passé » si null. |
| `site.check` | `validateSpec`, `themeCheck`, QC, `visual-check`, `aiReviewHome` | Critères visuels/commerciaux séparés, interactions réelles et rôle indépendant si justifié ; coût critique compris. |
| `site.correct` | `applyOps` sur copie + `saveThemeVersion(...,{activate:false})` | Diagnostic ciblé avec cible/version ; devis et autorisation ; recapture/retest après patch ; aucune boucle. |
| `site.undo` / `site.activate` | `themeVersion`, `saveThemeVersion`, route restore | Consentement selon portée, droits/version revalidés ; restauration non destructive, pas réécriture d’histoire. |
| `site.export` | `cmsExport`, adapters et route export existante | Retour par plateforme, ZIP contrôlé versionné et avertissements ; installation/publication réelle séparées. |

### Exports : ce qui ne doit pas être promis

`cms-v2/export.ts::cmsExport` est le point d’entrée commun, avec guards de médias, adaptation, catalogue, contrôles et reçu. `cms-v2/quality.ts::gateCmsExport` sépare technique/visuel/commercial ; les mesures non faites restent non faites. Sources examinées : `adapters/shopify.ts`, `adapters/wordpress.ts`, `adapters/prestashop.ts`, `adapt.ts`, `capabilities.ts`, `theme/platforms.ts::fromV2`, `purchase-offers.ts::guardPurchaseExport`.

| Plateforme | Capacité et limite à rapporter explicitement |
|---|---|
| Shopify | Liquid/JSON OS2 et sections modifiables, Theme Check réel sur ZIP. Affectation des gabarits produits à faire dans Shopify ; trois axes d’options maximum dans le contrôle actuel. ZIP/export ≠ installation, checkout/paiements ou remises serveur vérifiés. |
| WooCommerce | Adaptateur WordPress, blocs transactionnels natifs, catalogue et médias à importer ; **un gabarit produit partagé**, pertes des mises en page individuelles signalées. Conversion/portabilité des sections sur mesure et leur éditabilité à vérifier par cas ; fichier configuration complet ne prouve pas rendu identique. |
| PrestaShop | Adaptateur enfant Classic/module, conversion Smarty et catalogue ; **un gabarit produit partagé**, même avertissement. Import, activation et cache CMS manuels distincts ; panier/stock serveur à tester sur instance autorisée. |
| Wix / Squarespace | **Kits de reprise**, pas thème installable ni même composition native. `fromV2` peut préserver contenu mais pas tout le langage visuel ; reconstruction sur plateforme à annoncer. |

Aucune nouvelle installation CMS, commande ou API externe réalisée pour cet audit. L’ancienne CI verte n’est pas une recette de chaque composition originale ni des plateformes réelles.

## Plan progressif testable — autorisations distinctes

1. **Ce complément du lot A** : audit sourcé, contrats et matrice, scénarios/coûts fictifs et tests de limites. Fondations conversationnelles conservées ; drapeau fermé. Aucun nouveau site/agent en production.
2. **Qualification cognitive et budgets** : intégrer/recontrôler #208 après accord, adapter le routeur natif à la distinction exact/cognitif et preuve de qualification ; devis complet, consentement, enveloppe commune, maîtrise des retries et contexte. Fixtures et tests avant tout essai réel autorisé.
3. **Plan Site déclaratif en candidat isolé** : commencer par un petit ensemble de dispositions sûres multi-pages, réutiliser schémas/versions/renderer. Comparer thème adapté vs hybride original sur trois scénarios ci-dessous ; aucune modification des maquettes. Section nouvelle explicite, droits et compatibilité avant exécution.
4. **Contenu et composition cohérents** : brief validé, recherche sourcée, DA globale et angles de campagne séparés, textes par page/section/image avec provenance ; mémoire de marque commune, corrections manuelles préservées. Garde version utilisable.
5. **Boucle de rendu bornée** : capture desktop/téléphone du candidat, mesures exactes + revue IA/humaine, correction ciblée autorisée, nouvelles captures/interaction/export. Si contrôle manque ou enveloppe épuisée : partiel et ancienne version conservée.
6. **Interface Site avec Claude après accord** : grand aperçu desktop/mobile, assistant latéral, réglages groupés, aperçu diff, historique/annulation, commandes directes et migration volontaire. Pas lancée dans ce lot.
7. **Essais réels et validation propriétaire séparés** : prix/configuration fournisseur vérifiés, consentement, métriques/coût réel et preuves visuelles/CMS ; seulement ensuite discussion de bascule, jamais fusion/déploiement par cette mission.

### Corpus et critères d’acceptation proposés

Comparer, sur **mêmes données, médias possédés, droits et livrables**, thème adapté et hybride (sur-mesure complet en lot ultérieur) puis mono et spécialistes. Définir les critères avant développement. Aucun nom de démonstration dans les règles.

| Scénario de développement proposé | Rendu et parcours exigés | Cas tenus à l’écart pour recette indépendante |
|---|---|---|
| Produit mono : lampe rechargeable, couleurs vérifiées | Home + fiche complète ; cadrage produit entier, galerie/zoom, choix couleur/quantité, prix exact et panier cohérent ; pas de certification/autonomie inventée. | Capteur météo agricole avec accessoires/mesures vérifiés, sans reprendre le texte ou la composition de la lampe. |
| Produit multi : assortiment de céramiques, chaque fiche avec ses médias | Home, collection, au moins quatre fiches différentes, variants/cross-sell sans mélange de produit ; stock inconnu annoncé, pas créé. | Consommables d’atelier et pièces compatibles, variantes asymétriques et une référence sans image validée. |
| Service : réparation d’instruments confiés par les clients | Home, prestation, méthode sourcée, réalisations autorisées, devis et RDV ; aucune vente d’instrument, coordonnées exactes, confirmation réelle distinguée de la simulation. | Audit énergétique B2B et cours de langue en visio ; service sans prix fixe, zone limitée, créneaux/fuseaux à vérifier. |

Grille commune :

- **Fidélité/non-invention** : chaque fait commercial relié à sa source ; aucun avis, performance, prix ou certification ajouté. Textes client mot pour mot, inconnues visibles. Positionnement global cohérent et angles d’annonces distincts.
- **Art/marketing** : hiérarchie lisible, composition intentionnelle et différenciée, densité/rythme, typographie et contrastes, cohérence ton/DA, aucune section répétée sans rôle, texte adapté à l’image précise et CTA à la bonne conversion. Notes argumentées, aucune moyenne qui efface une faute critique.
- **Rendu réel** : pages complètes à 1440, 1024, 390 et 360 px, cadrage sans partie de produit coupée, pas débordement/chevauchement/texte tronqué ; screenshots versionnés et zooms lisibles. Animations normales perceptibles ET mode réduit, clavier/focus, images chargées.
- **Fonctions** : navigation/menu mobile, galerie/zoom/variantes, panier/prix/cadeaux si applicables, formulaire/devis/RDV, validation des champs, erreurs, annulation/reprise ; mobile et desktop, sans paiement/envoi externe non autorisés. Une démo simulée reste marquée simulation.
- **Exports** : même version/source/médias, inventaire des sections avant/après, Theme Check et contrôles ZIP réels, navigation/assets/textes complets ; affectations et limites par plateforme. Après installation autorisée : tests du CMS réel séparés. Pas de certitude par HTTP 200.
- **Coûts et stabilité** : chaque appel et retry compris, temps de bout en bout, total par livrable accepté, arrêt au plafond sans perdre version utilisable, changements manuels/concurrents conservés, deux comptes isolés. Tests adverses des liens/images/consignes, aucune exécution de contenu actif.

## Vérification et limites de cette passe

Le JSON reproductible [orchestration-study.json](preuves-209-agent/orchestration-study.json) mesure **l’arithmétique des hypothèses**, pas la qualité d’une IA. Les tests couvrent coûts complets, paramètres invalides, refus de modèle non qualifié/local cognitif, budget/consentement/appels/durée, contexte critique/projet/compte et empreinte après correction. Aucun fournisseur, aucune donnée réelle ni interface créée. Les défauts Site relevés sont des **risques/limites confirmés au code, pas des corrections de thèmes réalisées** ; leur traitement relève des lots proposés après revue.

Les fondations actuelles restent prêtes pour revue technique, **pas suffisantes pour approuver le produit conversationnel IA-first final**. Aucun gain artistique, de conversion ou de qualité multi-agent affirmé. #208, les analyses acquises VANS, Contretemps, les autres clients, forfaits/budgets et tous les thèmes validés restent intacts. Arrêt après remise de ce complément du lot A.
