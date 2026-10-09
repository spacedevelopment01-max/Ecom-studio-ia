# REGISTRE DES TRAVAUX RESTANTS

Tenu à jour à chaque phase. Rien de ce qui figure ici n'est présenté comme fait.
Règle pour les phases 6, 7, 9 et 10 : réutiliser **en priorité l'Image Engine V2** (`src/lib/image-v2/`) et, pour
les publicités, l'**Advertising Engine V2** (`src/lib/ads-v2/`), plutôt que créer des moteurs d'images concurrents.

Dernière mise à jour : **migration V1 → V2** (rapport `reports/v1-to-v2-migration.md`) validée par le propriétaire
sur rapport et fusionnée dans `main` (migration **partielle**, voir ci-dessous) ; **tests fonctionnels et visuels du
propriétaire à venir** : les corrections et améliorations seront décidées à partir de ses observations. Phase 12A et correctifs post-audit **fusionnés** (PR #64 et #65).
Check-up général : `reports/general-checkup.md`. Phase 11A fusionnée (PR #63) ; 11B non commencée. Phase 10A fusionnée
(PR #62) ; **qualité visuelle finale avec les vrais fournisseurs d'IA NON VALIDÉE** ; 10B non commencée ; 9A validée
techniquement, 9B reportée ; 8A validée techniquement, 8B reportée. Phase 13 non commencée.

## Validations visuelles réelles en attente (benchmarks payants, dans le Codespace du propriétaire)

| Phase | Objet | Script | État |
|---|---|---|---|
| 4B | Logos (Brand & Logo Engine V2) | `scripts/benchmark-logo-v2.ts` | en attente |
| 5B | Images et recherche (Image Engine V2) | `scripts/benchmark-image-v2.ts` | en attente |
| 6B | Publicités (Advertising Engine V2) | `scripts/benchmark-ads-v2.ts` | en attente |
| 7B | Vidéos et UGC (Video Engine V2) | `scripts/benchmark-video-v2.ts` | en attente |
| 8B | Textes SEO, fiches, pages, articles (SEO Engine V2) | `scripts/benchmark-seo-v2.ts` | **reporté** par décision du propriétaire |
| 8B | SEO des fiches Shopify (métachamps) | `scripts/verify-shopify-seo.ts` | **reporté** — mécanisme NON VÉRIFIÉ |
| 10B | Sites : installation réelle des thèmes V2 (boutique Shopify de développement, WordPress + WooCommerce, PrestaShop), rendu réel, éventuelles retouches IA réelles | `scripts/theme-v2-check.ts` (ZIP + Theme Check), `scripts/e2e-theme-v2.ts`, puis installation sur des boutiques de test | **non commencée** (avec l'autorisation du propriétaire) |
| 11B | CMS : installation des thèmes exportés sur de VRAIES plateformes (boutique Shopify de développement, hébergement WordPress + WooCommerce, hébergement PrestaShop 8.1), paiement de test, éditeurs natifs réels, comparaison A/B/C sur ces sites | `scripts/cms-v2-bench.ts` (banc local), puis installation sur des plateformes de test | **non commencée** (avec l'autorisation du propriétaire ; aucun envoi sans son accord) |
| 9B | Réseaux sociaux : production réelle (textes, visuels, vidéos), publication réelle de test, statistiques réelles | `scripts/benchmark-social-v2.ts` + comptes de test reliés dans le studio | **reporté** par décision du propriétaire (publication réelle seulement avec son autorisation explicite) |

La qualité visuelle réelle de ces quatre moteurs n'est PAS prouvée tant que ces benchmarks n'ont pas été faits.
En 7A, toutes les vidéos ont été produites avec des fournisseurs SIMULÉS (mires, images de test) : aucune vidéo
réelle n'a été générée ni jugée.

## FONCTIONNALITÉ OBLIGATOIRE — ÉDITEUR VISUEL DES PUBLICITÉS (avant la validation finale de l'Advertising Engine V2)

L'Advertising Engine V2 ne sera pas validé définitivement tant que le client ne peut pas, dans le studio, ouvrir une
publicité générée, sélectionner son titre, changer son texte, remplacer sa photo, modifier une forme, déplacer son
logo, enregistrer et exporter — sans aucun appel d'IA. Une publicité n'est pas « modifiable » parce que l'IA peut
régénérer son texte. Architecture : `reports/ad-editor-architecture.md`.

| Élément | État |
|---|---|
| Document en calques (fond, image, voile, produit, marque, titre, bouton, logo, formes) produit par le moteur V2 | **fait** (`src/lib/ad-doc/types.ts`, `ads-v2/compose.ts`) |
| Moteur de rendu unique aperçu = export (isomorphe navigateur / serveur) | **fait** (`ad-doc/render.ts`) ; vérifié : rendu du document = image enregistrée, à l'octet près |
| Opérations d'édition gratuites (texte, image, recadrage, couleurs, dégradés, transparence, formes, polices, position, taille, rotation, ordre, masquer, verrouiller, dupliquer, supprimer) | **fait** (`ad-doc/ops.ts`) |
| Annuler / rétablir | **fait** (classe `History`, côté éditeur) |
| Versions, historique, restauration, duplication, modifications persistantes | **fait** (table `ad_documents`, `ad-doc/store.ts`) |
| Une régénération n'écrase jamais une création modifiée par le client | **fait** (moteur V2 : `userOwned`) |
| Adaptation aux formats (1:1, 4:5, 9:16, 16:9, bannières) en gardant les modifications | **fait** (`ad-doc/reflow.ts`) |
| Export PNG, JPEG, document éditable (JSON) fidèle à l'aperçu | **fait** (`exportDoc`, API `?export=`) |
| Retouches en langage naturel : simples en local et gratuites ; génération annoncée, jamais lancée sans accord | **fait** (`ad-doc/local-edit.ts`, zone « Demander une retouche » de l'éditeur ; refus vérifié en navigateur : aucune tâche lancée). Génération payante après accord (photo IA, nouvelle version) : **branchée mais jamais exécutée avec un vrai fournisseur** — à vérifier au benchmark 6B |
| Contrôles signalés après modification (lisibilité, zones de sécurité, produit recouvert, texte sur le bouton, affirmations) | **fait** (API : `problems`, bouton « problèmes » de l'éditeur) |
| API de l'éditeur (`/api/projects/[id]/ads/docs`, `/ads/docs/[docKey]`) | **fait** |
| **Interface de l'éditeur** : bouton « Modifier », canevas interactif (sélection, double-clic sur un texte, glisser-déposer, poignées de redimensionnement et de rotation, repères d'alignement), panneau des calques, panneaux couleurs / polices / formes / images (bibliothèque, recadrage), annuler / rétablir, enregistrer, versions, exporter | **fait** (`src/components/studio/ad-editor/`) ; testé en navigateur réel (`scripts/e2e-ad-editor.ts`, 28/28) |
| **Interface mobile et tablette** (gestes tactiles, panneaux d'outils en bas d'écran, édition du texte au clavier mobile) — pas une réduction de l'écran ordinateur | **fait** ; testé au format téléphone (390 × 844, tactile). Pincer pour zoomer : **non fait** (boutons de zoom à la place). Tablette réelle : **non testée** |
| Polices de la marque chargées dans le navigateur (@font-face) pour un aperçu identique à l'export | **fait** (`/api/fonts`, mêmes fichiers et mêmes noms que le serveur) ; mesuré : écart moyen aperçu / export ≈ 0,6 à 1,4 sur 255 (lissage des bords), composition identique |
| Tests de l'interface (captures ordinateur et téléphone) | **fait** (`reports/screenshots/ad-editor/`, `reports/ad-editor-final-report.md`) |

Éditeur validé techniquement par le propriétaire (810 tests automatisés, 28 tests navigateur). **La qualité
esthétique réelle des publicités reste NON VALIDÉE** jusqu'au benchmark 6B avec les API du propriétaire.

Limites connues de l'éditeur (à traiter plus tard) :
- génération payante après accord (photo IA, nouvelle version IA) : branchée, jamais exécutée avec un vrai fournisseur ;
- pas de sélection multiple ni de groupes ;
- pas de « pincer pour zoomer » sur téléphone (boutons de zoom à la place) ; un tiroir ouvert cache le bas de la publicité ;
- tablette réelle, Safari et Firefox non testés (Chromium seulement) ;
- polices du studio uniquement (pas d'import de police personnelle) ;
- l'historique « annuler » ne survit pas au rechargement (les versions enregistrées et le brouillon local, si) ;
- exports PNG, JPEG, JSON seulement (pas de PDF, SVG, vidéo) ;
- relancer la création avec les mêmes angles met à jour les créations existantes (nouvelle version) au lieu d'ajouter des doublons ;
- aperçu du navigateur non identique à l'octet près à l'export (lissage), composition identique ;
- tests faits avec des images de test, pas de vraies photos.

## Video & UGC Engine V2 (phase 7A) — fait et ce qui reste

| Élément | État |
|---|---|
| Intention, stratégie créative, script (local + IA contrôlée), storyboard, planification des plans | **fait**, testé (fournisseurs simulés) |
| Router V2 vidéo : capacités déclarées ET vérifiées, repli sur un fournisseur compatible, estimation avant envoi | **fait**, testé ; capacités « annoncées » (texte vers vidéo de Veo) **non utilisées** tant que non vérifiées (7B) |
| Plans générés contrôlés (produit, personnage, sujet, artefacts), reprise ciblée d'un plan, mémoire des plans payés | **fait**, testé avec des relectures simulées |
| Document vidéo éditable (timeline, calques de l'éditeur publicitaire, sous-titres, pistes audio), opérations gratuites, historique, versions | **fait**, testé |
| Retouches par conversation (raccourcir, musique, sous-titres, rythme, supprimer ; remplacement et nouvelle version annoncés) | **fait**, testé |
| Rendu MP4 (H.264/AAC), sous-titres incrustés + SRT/VTT, affiche, mixage audio (atténuation sous la voix, normalisation) | **fait**, testé (rendu réduit dans les tests) |
| API (`/api/projects/[id]/videos/v2`, `/videos/v2/[docKey]`), tâches `video.v2`, `video.v2.render`, `video.v2.clip`, étape « vidéo » des plans | **fait** (API non testée par un navigateur) |
| **Interface de montage** (timeline visuelle dans le studio) | **À FAIRE** (7A : modèle, opérations et API seulement, comme demandé) |
| **Voix off synthétique** | **À FAIRE** : aucun fournisseur de synthèse vocale branché ; la voix est préparée (texte, timing) et portée par les sous-titres |
| Musique de bibliothèque sous licence | modèle prêt (licence obligatoire), **aucune bibliothèque musicale branchée** ; seule la musique composée par le studio est utilisée |
| Benchmark réel 7B (qualité, coûts réels, continuité réelle des personnages) | **en attente** (`scripts/benchmark-video-v2.ts`) |

**Reportés par décision du propriétaire (après la Phase 8, non développés pendant la Phase 8)** : finalisation de
l'éditeur vidéo (interface de montage dans le studio, bascule de l'onglet Vidéos sur le V2) et voix off
synthétique (fournisseur de synthèse vocale, test d'écoute).

Chemins vidéo encore ANCIENS (conservés pour compatibilité) : onglet Vidéos → `video.render` (`engine/videos.ts`,
`produceVideo`) et `video.ugc` (`engine/ugc.ts`, `produceUgc`). L'étape « vidéo » des plans passe déjà par le
Video Engine V2 ; l'onglet Vidéos sera basculé avec l'interface de montage.

## SEO, Copywriting & Blog Engine V2 (phase 8A) — fait et ce qui reste

Fait (fournisseurs simulés, aucun appel payant) : moteur `src/lib/seo-v2/` (intention, recherche de mots-clés en
HYPOTHÈSES sémantiques, stratégie par projet, brief, faits vérifiés, rédaction locale puis IA contrôlée, 8 politiques
de barrière `seo_*_v2`, reprises ciblées, idempotence, plafond de coût), documents texte versionnés (table
`content_documents`), éditeur de blocs dans les onglets Produit / Activité et Blog, retouches en conversation,
export HTML / Markdown / JSON-LD, Blog V2 rangé dans le blog existant, test navigateur 12/12.

Validé techniquement par le propriétaire (8 octobre 2026) : stratégie SEO V2, intentions, fiches produit et pages
de services, Blog V2, SEO local, multilingue, éditeur de contenus, barrière SEO, intégration Project Brain et
Router V2 (877/877 tests, 12/12 tests navigateur, TypeScript et build OK). **NON VALIDÉS** : qualité réelle des
rédactions IA et performances SEO. **Phase 8B reportée** par décision du propriétaire.

Reste à faire :
- **Intégration Shopify (limite principale)** : le SEO des fiches passe par les métachamps
  `global.title_tag / description_tag` — mécanisme **NON VÉRIFIÉ** (aucun essai sur une vraie boutique ; script
  `scripts/verify-shopify-seo.ts` prêt). Les fiches produit, pages de collection, accueil, « À propos », pages de
  prestation et FAQ rédigées en V2 ne sont **pas envoyées automatiquement** à Shopify : export HTML / Markdown /
  JSON-LD ou copier-coller. Seuls les articles du Blog V2 passent par l'envoi Shopify existant du blog. Les
  données structurées (JSON-LD) ne sont pas installées dans le thème Shopify.
- **Ancien Blog V1 toujours en service** à côté du Blog V2 : « Écrire un article » de l'onglet Blog utilise encore
  l'ancien moteur (700 mots minimum, mots-clés devinés par l'IA sans étiquette « hypothèse », pas de stratégie ni de
  contrôle de cannibalisation, pas de versions). Les deux cohabitent dans la même liste d'articles ; à remplacer par
  le Blog V2 après le benchmark 8B.
- **Benchmark 8B avec vos clés** (`scripts/benchmark-seo-v2.ts`) : la qualité RÉELLE de la rédaction IA n'est pas
  jugée — seules des réponses simulées ont été contrôlées. Aucune performance SEO (positions, trafic) n'est mesurée.
- **Mots-clés** : aucun fournisseur de données (volumes, CPC, difficulté) n'est branché ; l'interface
  `KeywordDataProvider` est prête. Tout reste « hypothèse sémantique ».
- **hreflang** : recommandation seulement, rien n'est installé sur les sites.
- **Audit technique** : indexation, sitemap, robots.txt, redirections, vitesse = exploration du site en ligne, non faite.
- **Espagnol** : textes du moteur et intitulés prêts ; l'interface du studio reste FR/EN ; libellés de métier
  espagnols repris du français (pas de dictionnaire métier ES).
- Retouches IA d'un passage : branchées, testées en simulé seulement.
- Routage : métadonnées et petites réécritures au niveau « standard » (pas de niveau plus économique pour la
  rédaction dans la politique actuelle) ; pages et articles au niveau « fort ».

## Social Media & Automatisation Engine V2 (phase 9A) — fait et ce qui reste

Fait (fournisseurs et comptes SIMULÉS, aucune publication réelle, 0 €) : moteur `src/lib/social-v2/` (stratégie
éditoriale par métier, planificateur 1 à 5 publications par jour, adaptateurs par réseau, textes locaux sans
invention, production par lots plafonnée via Image / Ads / Video Engine V2, barrière `social_post_v2`, approbation
par version, programmation, envoi avec verrou et journal, état « À vérifier » au lieu d'un renvoi à l'aveugle,
reprise après arrêt, automatisations persistantes, statistiques sans chiffre inventé, retouches en conversation),
studio social dans les onglets Calendrier et Publications (mois / semaine / jour / liste, glisser-déposer, éditeur,
comptes, statistiques), test navigateur ordinateur + téléphone. Rapport : `reports/phase-9A-report.md`.

Validé techniquement par le propriétaire (8 octobre 2026) : Social Media & Automatisation V2, calendrier interactif,
programmation de 1 à 5 publications par jour, versions approuvées, automatisations persistantes, protections contre
les doublons, intégration des moteurs V2, interface ordinateur et téléphone (904/904 tests, 28/28 tests navigateur,
TypeScript et build OK). **NON VALIDÉS** : publication réelle, statistiques des réseaux, qualité des contenus IA.
**Phase 9B reportée** par décision du propriétaire.

Reste à faire :
- **9B — publication réelle** (avec votre autorisation explicite, sur des comptes de test) : Facebook, Instagram,
  TikTok, YouTube, Pinterest. Adaptateurs officiels existants **jamais exécutés** dans cette phase. TikTok : audit de
  l'application nécessaire pour publier en public.
- **9B — production réelle** (`scripts/benchmark-social-v2.ts`) : qualité réelle des textes IA, visuels Image V2 /
  Ads V2 et vidéos générées **NON VALIDÉE**.
- **Statistiques des plateformes** (vues, portée, likes, commentaires, partages, clics) : aucun fournisseur branché
  (`registerMetricsProvider` prêt) ; affichées « non connecté » / « indisponible ».
- **LinkedIn** : export seulement (pas de connexion OAuth ni de publication directe).
- **Textes locaux** : beaucoup de « [À compléter] » quand le projet manque d'informations (45/60 à 28/30 selon les
  scénarios simulés) ; prévoir un formulaire « répondez à ces questions » ou une rédaction IA plafonnée ; structure
  de phrases répétitive ; « saas » en minuscules (repris des questions du SEO V2).
- **Éditeur de publication** : pas de lien direct vers l'éditeur publicitaire à calques (visuel Ads V2) ni vers le
  document vidéo éditable (Video V2).
- **Production gratuite des vidéos** : montage local lent (lots de 3 dans l'interface) ; une vidéo impossible à monter
  laisse la publication « planifiée ».
- **Vidéos montées localement « à vérifier »** dans la bibliothèque : l'approbation de la publication est bloquée tant
  que le client ne les a pas validées ; prévoir la validation directe depuis l'éditeur de publication.
- **Anti-doublon** : TikTok, YouTube, Pinterest ne permettent pas de vérifier après un délai dépassé → le client
  confirme l'état « À vérifier ».
- **Limites des réseaux** (longueurs, durées, fréquences, dimensions) : valeurs publiques au moment du
  développement, à revérifier.
- **Ancien calendrier V1** toujours présent (sous le studio V2) pour les anciens calendriers ; ancien éditeur
  `post-editor.tsx` et API `/api/projects/[id]/plans` conservés. À retirer après validation du V2.
- Glisser-déposer sur ordinateur seulement ; tablette, Safari, Firefox non testés.

## Theme Engine V2 (phase 10A) — fait et ce qui reste

Fait (100 % local, 0 €) : moteur `src/lib/theme-v2/` (intention du site, 5 langages visuels, design system en vrais
réglages du thème, contenu confirmé seulement, planificateur de pages avec pages « à compléter » signalées, 9 sections
V2 à variantes, Quality Gate `theme_v2` jamais FINAL sans le propriétaire, mesure de diversité, retouches locales
ciblées), V2 par défaut dans `buildShop`, panneau V2 dans l'onglet Boutique, banc visuel réel (5 projets, AVANT /
APRÈS, ordinateur + téléphone), parcours de l'éditeur en navigateur 24/24, exports Shopify (Theme Check 0 erreur),
WooCommerce, PrestaShop, kits. Rapports : `reports/phase-10A-report.md`, `reports/theme-v2-visual-review.md`.

Validé techniquement par le propriétaire (8 octobre 2026 : 919 tests, 44 vérifications navigateur, build, Theme
Check) et fusionné (PR #62). **NON VALIDÉS** : qualité visuelle finale avec les vrais fournisseurs d'IA ; rendu sur une
vraie boutique installée (10B).

Reste à faire (limites de 10A) :
- **Validation artistique** des 5 sites par le propriétaire (aucun verdict « agence » n'est donné par la machine).
- **10B** : installation réelle sur Shopify (boutique de développement), WordPress + WooCommerce, PrestaShop.
- Sites artisan et restaurant de référence **sans photo authentique** : rendu avec de vraies photos du client non vu.
- Médias de démonstration dessinés (sérum, logiciel) : pas de vraies photos dans le banc.
- ~~WooCommerce / PrestaShop : mise en page V2 non reproduite, jamais installés~~ → repris en 11A (mise en page
  reproduite et installée localement ; voir la section CMS ci-dessous). Installation réelle : 11B.
  **Wix / Squarespace** : kits seulement (pas de thème natif).
- Éditeur : pas d'édition directe dans la page (désigner puis demander), pas de sélecteur visuel des schémas de
  couleurs, remplacement d'image testé sur la section image + texte seulement.
- Accessibilité : pas d'audit axe ni de test avec un vrai lecteur d'écran ; performances mesurées en local, pas de
  Lighthouse ; Chromium seulement, pas de vraie tablette, ni Safari ni Firefox.
- 5 langages visuels seulement ; boutique à plusieurs produits non contrôlée dans le banc visuel.
- **Chemins de thème encore ANCIENS** : galerie des 11 directions et « change de direction » (moteur V1, conservé) ;
  projets dont la version actuelle est V1 tant qu'ils ne sont pas recomposés ; réglage de projet `themeEngine: "v1"`.
- La CI GitHub vérifie le thème V2 par `tests/theme-v2.test.ts` (Theme Check d'un ZIP V2) ; `scripts/verify-theme.sh`
  couvre les directions V1.

## Correctifs post-audit (fusionnés : PR #65)

Fait : budget IA = 40 % du prix HT du forfait (annuel compris, sans enveloppe de création, prorata au changement de
forfait), packs/recharges = 50 % du HT payé, réservation atomique du coût maximal avant tout appel, jamais de solde
négatif, incertain = coût maximal retenu (réconciliable), anciens portefeuilles mis en conformité ; demande unique :
aucune dépense sans accord, plafond pendant les étapes, vidéo jamais auto-approuvée, devis complet, blog filtré,
statuts « non faite », « Réessayer » réel ; OAuth lié à la session ; rôle administrateur après lien de confirmation ;
projet archivé inutilisable ; passe-droits administrateur retirés. Rapport : `reports/post-audit-critical-fixes.md`.

Reste à faire (issu de `reports/general-checkup.md`, non traité dans cette étape) :
- Coûts réels jamais mesurés face aux maximums réservés (vraies API) ; écran d'administration de réconciliation des
  appels incertains ; alerte à 80 % du budget jamais envoyée.
- Plafond fournisseur (section 10 du rapport post-audit) : texte borné par le comptage officiel des jetons, repli
  serveur supprimé, tarifs périmés bloqués. Restent des bornes seulement documentées pour les médias (images OpenAI
  et Gemini, durée Veo, prix fal) et l'exactitude des tarifs saisis.
- « Suite de la création » recrée un calendrier V1 (doublon reproduit) ; tout nouveau projet reçoit un calendrier V1.
- Moteurs V1 encore utilisés par la création complète (visuels, vidéo, textes, logo, calendrier), les onglets Images,
  Vidéos et UGC, et les étapes `image_generate`, `copy`, `logo`, `blog` de la demande unique (étiquetées V2).
- Blog V1 et V2 sur la même table (écrasement possible) ; boutique sur les textes V1 au lieu des documents SEO V2.
- Envoi direct vers Shopify sans les contrôles CMS V2 ; import ZIP sans limite de décompression ; envois de fichiers
  entièrement en mémoire ; adresse IP falsifiable pour les limites de fréquence.
- Propagation de marque : réapprobation non appliquée au statut ; export refait en français.
- Pas d'écran Image V2 ni Vidéo V2 ; vidéos V2 non modifiables ; pas de vérification d'e-mail à l'inscription ni de
  suppression de compte ou de projet.

## Studio Workflow V2 (phase 12A, fusionnée : PR #64) — fait et ce qui reste

Fait (100 % local, 0 €) : demande unique (formulaire de création ou Pilote) → plan de l'orchestrateur existant → devis
par module → accord + plafond si payant → exécution par les moteurs V2 (création complète, Ads V2, Social V2, CMS V2,
SEO, Theme, Quality Gate) → suivi (étapes, verdicts, coûts réels, reprises) → éléments à valider → éditeurs. Propagation
contrôlée d'un changement d'identité (pubs, boutique, visuels de publications, exports). Rapport :
`reports/phase-12A-report.md` ; parcours navigateur `scripts/e2e-workflow-v2.ts` (36/36).

Reste à faire (limites de 12A) :
- Devis, accord, plafond et arrêt au plafond **jamais testés avec un vrai fournisseur d'IA** (fournisseurs simulés).
- Changement d'identité : vidéos et textes seulement signalés (pas refaits) ; liste non regroupée par type.
- Pas de demande récurrente programmée (automatisation) ; la reprise d'une demande identique couvre 24 h.
- Pas de dossier dédié par demande (rangement existant réutilisé).
- Reprise après coupure du worker testée en navigateur pendant la création complète seulement.
- Parcours testés avec recherche de photos hors ligne, photo cosmétique synthétique ; Chromium seulement.

## CMS Integration Engine V2 (phase 11A) — fait et ce qui reste

Fait (100 % local, 0 €) : moteur `src/lib/cms-v2/` (point d'entrée unique, registre des capacités réelles,
contrôles, Quality Gate `cms_export_v2` à trois dimensions avec provenance des mesures), thème de blocs WordPress
dont les sections sont rendues par le MÊME gabarit Liquid que Shopify (moteur PHP livré), intégration WooCommerce
native (boutiques seulement), thème enfant PrestaShop 8.1 + module compagnon, kits Wix / Squarespace présentés
comme kits, écran « Exporter et installer » (étapes, capacités, informations à compléter, verdicts, versions), banc
d'installation locale `scripts/cms-v2-bench.ts` (WordPress 6.6 + WooCommerce 9.3.3 et PrestaShop 8.1.7 en Docker,
5 projets, captures A/B/C). Rapports : `reports/phase-11A-report.md`, `reports/cms-v2-quality-review.md`.

Reste à faire (limites de 11A) :
- **11B** : aucune installation sur une vraie boutique ni un vrai hébergement. **Shopify : jamais installé** (Theme
  Check et rendu local des fichiers exportés seulement) — NON VÉRIFIÉ.
- **Paiement** : aucune commande passée, aucun moyen de paiement réel configuré (page de commande affichée seulement).
- **Fidélité visuelle CMS** : validée localement sur les pages comparées (accueil, page de contenu, mentions) ;
  **fiches produit = pages natives** WooCommerce / PrestaShop habillées, composition différente du studio.
  Validation artistique par le propriétaire : non faite.
- **PrestaShop** : pas d'éditeur visuel natif des sections (textes dans les fichiers du thème) → au mieux PROVISOIRE ;
  aucun fichier d'import des produits (création dans le back-office) ; textes des sections dans une seule langue.
- **WooCommerce** : images du CSV vides sans adresse publique du studio (à ajouter depuis `assets/es`) ; produits
  importés en brouillon ; interface WordPress testée en anglais (pas de paquet de langue hors ligne).
- **Produits sans prix confirmé** (high-tech, SaaS du banc) : non vendables, panier et commande non testables pour eux.
- **Environnement de test** : paquets de langue PrestaShop remplacés par des paquets vides, module
  `ps_distributionapiclient` retiré, icônes `blockreassurance` corrigées en base, MariaDB sur l'hôte ;
  `scripts/cms-v2/env.sh` reconstitué à partir des commandes exécutées, **pas rejoué de bout en bout** sur une
  machine vierge.
- SEO des sites installés : balises de base contrôlées seulement ; référencement réel non mesuré ; SEO Shopify
  (métachamps) toujours NON VÉRIFIÉ.
- Performances : temps de chargement locaux comparés à l'aperçu ; aucun score Lighthouse.
- Accessibilité : contrôles automatiques (contraste, clavier, textes alternatifs) ; pas de lecteur d'écran réel.
- Chromium seulement ; ni Safari, ni Firefox, ni vraie tablette.
- Connexions directes WordPress / PrestaShop : non disponibles (installation par ZIP).
- Shopify SaaS : section d'avis vide sur la fiche produit (venue de 10A, signalée par le contrôle visuel, non corrigée).
- WooCommerce : contraste signalé sur la loupe de la galerie produit (texte masqué par WooCommerce : probable fausse
  alerte, à vérifier).
- PrestaShop : export testé par le gestionnaire de thèmes en ligne de commande (même code que l'écran « Thème et
  logo », écran lui-même non cliqué).

## Migration V1 → V2 (validée sur rapport, fusionnée ; tests du propriétaire en attente)

Fait : création complète, demande unique et onglets sur les moteurs V2 pour les nouvelles créations :
- logo (Logo V2, version du studio provisoire sans IA) ;
- jeu d'images (Image V2 + rendus locaux) ;
- publicités (Ads V2, fenêtre Campagne comprise) ;
- vidéos et UGC (Vidéo V2 : plan, estimation, accord, documents, rendu, approbation, exports) ;
- textes (document SEO V2 de référence de la boutique) ;
- blog (SEO V2, article du client protégé) ;
- calendrier de la création (Social V2, une seule fois par projet : doublon corrigé) ;
- publications créées en V2, ancien point d'accès sans contournement ;
- envoi Shopify contrôlé par le CMS V2.

Détail, inventaire des anciens moteurs restants et risques : `reports/v1-to-v2-migration.md`.

Reste à faire (issu de la migration) :
- **Montage vidéo interactif** : timeline plan par plan, synthèse vocale dans l'interface (aujourd'hui : retouche en
  français, régénération d'un plan avec accord).
- **Directions de thème** : correspondance entre les 11 directions V1 (galerie, « change de direction ») et les
  5 langages du Theme V2 ; reproduction d'un site existant et thème sur mesure encore V1.
- **Stratégie de marque** (nom, positionnement, palette) : pas de module V2 ; **kit de textes de mise en page**
  (accroches de sections) encore produit par l'ancien générateur.
- **Visuels typographiques des services** (annonce de prestation, conseils, horaires) : encore V1 (cartes figées),
  à reprendre dans Social V2.
- **Sujets d'articles** (`blog/topics`) : encore V1 ; réécriture d'un ancien article V1 fermée (modification à la
  main ou nouvel article V2).
- Coût réel d'une création complète V2 avec une vraie IA : **non mesuré**.
- Scénarios A–J sur ordinateur et téléphone : **à faire par le propriétaire** (tests fonctionnels et visuels) ;
  parcours navigateur 12A, éditeur publicitaire et export CMS non rejoués après la migration.
- Corrections et améliorations : à décider après les observations du propriétaire.
- Test intermittent à surveiller : export CMS « mêmes octets » (1 échec sous charge, 3/3 seul).

## Autres limites connues

- Écran Image V2 minimal (onglet Images : demande, verdict, licence, refus) ; pas d'édition avancée d'image
  (recadrage, retouche locale guidée) dans cet écran.
- Seuils locaux (netteté, exposition, contraste, part de texte) non calibrés sur de vrais rendus.
- Limites de texte et zones de sécurité des régies : valeurs publiques au moment du développement, à revérifier.
