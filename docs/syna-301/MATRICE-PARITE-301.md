# SYNA FULL PARITY — matrice canonique exécutée #301

**66 opérations du catalogue** après ajout de `blog.edit`, plus **17 opérations natives/hors catalogue** :83lignes,25capacités. C’est un inventaire de scopes, **pas un taux de parité, un total de tests ni une certification « tout SYNA »**. Les suites se recouvrent et leurs nombres ne sont pas additionnés.

## Références et degré de preuve

- Recettes étendues sur build propre `5fd100d8129f352f5bf19c70da501be3e71b7b78` = #299 `7ca231aa` + seul diff#300. Socle documentaire#302 `b515d5c7cf726f0d6a68244ab896bed46f2f1d92`, code applicatif identique pour ces recettes.
- Claude a repris#300 sur `ad5bffe6d0cf5b477e3a6a927b0f0567bd3db013` puis livré le mobile `41931a5ec078267d53c8fc0e14b86f57ec7460e1`. Les preuves5fd/ad5b restent attachées à ces SHA ; **aucune qualification de41931a ni des deux modes pour les autres parcours n’est présumée**.
- Les corrections#303–325 portent leurs propres SHA/tests. La convergence est en intégration : aucun SHA final ni CI globale verte n’est revendiqué ici.
- `NATIF_OK`/`PASSE_SCOPE` signifient seulement la portée de la ligne. **Tout nouveau backend sans cartes/contrôleurs Claude reste PARTIEL**. `ABSENT` dans la colonne SYNA veut dire adaptateur absent, jamais absence du moteur produit. Une déclaration d’adaptateur seule reste NON_TESTE.
- Les liens/colonnes preuve, SHA, scope et limites du [CSV](MATRICE-PARITE-301.csv) font foi ; une phrase de synthèse ne qualifie pas automatiquement chaque sous-opération.
- Fournisseurs HTTP locaux ou SDK sentinelles explicitement simulés : **0 appel fournisseur réel et0€ réel**. Ni achat réel, ni validation de qualité créative.

## Tableau de bord par capacité

| Capacité | Domaine | Lignes | Exécution prouvée / manque |
|---|---|---:|---|
| C01 | Conversation persistante | 2 | PASSE_SCOPE:2 |
| C02 | Démarrage du projet | 1 | PASSE_SCOPE:1 |
| C03 | Reprise d’un projet existant | 1 | PASSE_SCOPE:1 |
| C04 | Contexte et modes Encre/Plein cadre | 2 | PASSE_SCOPE:2 |
| C05 | Retouches gratuites et annulation du site | 2 | PASSE_SCOPE:2 |
| C06 | Composition et choix du thème | 3 | NON_RACCORDE:1 ; PASSE_SCOPE:2 |
| C07 | Pages, sections et thème sur mesure | 3 | PASSE_SCOPE:3 |
| C08 | Rendu et exports | 2 | PASSE_SCOPE:2 |
| C09 | Analyse, recherche et choix stratégiques | 7 | NON_RACCORDE:3 ; NON_TESTE:1 ; PASSE_SCOPE:3 |
| C10 | Identité textuelle | 3 | NON_TESTE:1 ; PASSE_SCOPE:2 |
| C11 | Logos et identité complète | 2 | PASSE_SCOPE:2 |
| C12 | Catalogue produits, variantes, stocks | 6 | CORRIGE_CIBLE:1 ; PASSE_NATIF_NON_RACCORDE:1 ; PASSE_SCOPE:4 |
| C13 | Images, recherche, import et placement | 4 | CORRIGE_NATIF_NON_RACCORDE:1 ; NON_RACCORDE:1 ; PASSE_SCOPE:2 |
| C14 | Montage, voix, clips et reprise vidéo | 7 | NON_RACCORDE:1 ; PASSE_SCOPE:6 |
| C15 | Textes, SEO et blog | 7 | BLOQUE_CONNEXION_OU_CONSENTEMENT:1 ; CORRIGE_CIBLE:2 ; CORRIGE_LOCAL_FALLBACK_BLOQUE:1 ; CORRIGE_MEMO_LOCAL_PAYANT_GARDE:1 ; PASSE_SCOPE:2 |
| C16 | Plan social et calendrier | 4 | BLOQUE_CONNEXION_OU_CONSENTEMENT:2 ; PASSE_SCOPE:2 |
| C17 | Production sociale et texte dans visuel | 1 | CORRIGE_GARDE_SCOPE:1 |
| C18 | Campagnes et visuels publicitaires | 3 | BLOQUE_CONNEXION_OU_CONSENTEMENT:1 ; PASSE_SCOPE:2 |
| C19 | Retouche publicitaire locale et nouvelle version | 2 | BLOQUE_GARDE_FINANCIERE:2 |
| C20 | Lot initial et automatisations | 1 | PASSE_NATIF_NON_RACCORDE:1 |
| C21 | Carte, biens, réalisations, prestations | 4 | PASSE_NATIF_NON_RACCORDE:1 ; PASSE_SCOPE:3 |
| C22 | Rendez-vous et demandes reçues | 5 | PASSE_NATIF_NON_RACCORDE:4 ; PASSE_SCOPE:1 |
| C23 | Publication, hébergement, domaines, connexions | 4 | BLOQUE_CONNEXION_OU_CONSENTEMENT:4 |
| C24 | Fichiers et prompts | 5 | BLOQUE_GARDE_FINANCIERE:1 ; CORRIGE_LOCAL_REGLES_SEULES:1 ; NON_RACCORDE:2 ; PASSE_SCOPE:1 |
| C25 | Workflow ancien et propagation de marque | 2 | PASSE_NATIF_NON_RACCORDE:2 |

Ces comptes par ligne n’impliquent aucun pourcentage de couverture globale. Aucun ABSENT_PRODUIT n’est inventé sans preuve. Les scopes nouveaux C21, fichiers, Blog acquis, A1 local et demandes restent PARTIEL côté utilisateur.

## Parcours compilés exécutés avant les correctifs de domaine

Voir [PREUVES-PARCOURS-5fd100d.json](PREUVES-PARCOURS-5fd100d.json) : version production propre, empreintes SHA256 des rapports, scènes et totaux **simulés** `allSimulatedTotals`. Aucun cumul des socles partagés.

| Recette sur5fd | Scope | HTTP simulés | Micro€ simulés |
|---|---|---:|---:|
| Catalogue/Contenu/Blog | 4/2/3scènes ; services Catalogue refusé | 35 | 185932 |
| Social/campagnes | Brouillons, calendrier préparé et visuels ; aucune publication | 19 | 530654 |
| Images | 5scènes sources/devis/accord/persistance/reprise | 36 | 2986399 |
| Clips/voix/reprise | 4scènes clips +voix et reprise ciblées | 57 | 6292985 |
| Site | Composition4/original4/exports2/rendu2 | 18 | 142416 |
| Motion | 4scènes, montage lisible et versions | 20 | 158240 |
| Recherche / stratégie / marque / logos | Recherche2, choix stratégiques3, marque3, logos3 ; scopes précis ci-dessous | 44 | 1011981 |

**Motion :20appels texte et158240micro€ sur toute la recette**, pas les3appels/23736micro€ du seul socle stdout. Les échecs groupés lors du manque de mémoire restent des échecs de ces essais ; seuls les rejeux isolés sont PASS. Ces recettes ne certifient ni qualité fournisseur réelle, ni installationCMS/domaine, ni les nouveaux backends, ni les deux interfaces ensemble.

**Preuve stratégie/marque retrouvée :** `/workspace/work/preuves-parity301-strategy-brand/api-proof.json`, production propre5fd, success=true. Elle qualifie `research.generate` (hypothèses non approuvées), `strategy.compare` et `strategy.preference` (préférence/rejet/annulation sans activation native), `brand.generate` (propositions acquises), `brand.confirm` (choix textuel acquis sans validation globale Préparation) et `logo.generate` (acquis/reprise, identité inchangée). Les rapports natifs détaillés et champs JSON sont cités dans le CSV. `research.approve`, `proposal.compare` et `proposal.choose` restent NON_RACCORDE ; **brand.correct reste NON_TESTE**, car clientCorrection=false dans les trois scènes. Ces preuves n’étendent pas les interfaces qualifiées ni les nouveaux gardes financiers.

## Livraisons par domaine : portée indépendante et limites

| PR | SHA publié | Portée | CI dans ce relevé |
|---|---|---|---|
| [#303](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/303) | `b6e2a1f5cd446397c914be8feabf59f4a6f4763e` | SEO metadata-only, rendu/ZIP ; pas tous CMS. | SUCCESS branche initiale (root#3016590207302) |
| [#304](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/304) | `46ed3bb71a4536d671b1ff048d6716084d977e2f` | Stock cible/version/transaction ; fixture CI memo-binding corrigée et publiée (84tests+types), nouvelle CI pending. | Échec historique ; fixture corrigée publiée, nouvelle CI pending |
| [#305](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/305) | `a3efbfbaf86b0639f2a118818b303b42355d9f79` | Nom/dossier fichiers gratuits ; carte UI absente →PARTIEL. | SUCCESS branche initiale (root#3016590207302) |
| [#306](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/306) | `1fd40838ef8f2772e6cdecea90e14a4a308b93c8` | Versions métier monotones aux mêmes millisecondes/recul horloge. | SUCCESS branche initiale (root#3016590207302) |
| [#307](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/307) | `29a21dc359b8da489455f676991405e05aa8ae4f` | GénérationV2 devis signé/worker ; navigateur natif2scènes, sujet facultatif vide dans cette preuve. | Docker No space left ; relance demandée, pas vert présumé |
| [#308](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/308) | `ec4663731014f80979b5817f4b3694c5b8788fd2` | Demandes natives vrais404 +fixture SMTP ; pas adaptateur SYNA par cette seule PR. | SUCCESS branche initiale (root#3016590207302) |
| [#309](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/309) | `e23711db58510b4571c3a263b5b8ef638751e186` | blog.edit acquis, devis/accord, document+article atomiques ; carte UI absente →PARTIEL. | SUCCESS branche initiale (root#3016590207302) |
| [#310](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/310) | `f3c1dc151a3916ca3084c8e896cae6e58fad09d6` | Renommage bien/plat/réalisation et prixplat seulement ; effets visibles/handle annoncés. Pas CRUD complet, carte absente ; fixture CI catalogue corrigée et publiée (51tests+types), nouvelle CI pending. | Échec historique ; fixture corrigée publiée, nouvelle CI pending |
| [#311](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/311) | `1d88e97d2d0a3a287c55026f6667ac04f9230e11` | Course du harnais avant reload ; pas patch produit ni test supprimé. | Non qualifiée ici ; pas vert présumé |
| [#312](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/312) | `4b109255e37da300251cc7825b09cd48aa582a1c` | Recherche seule cap0/AIoff, PROVISIONAL ; aucun nouvel outil SYNA search. | Non qualifiée ici ; pas vert présumé |
| [#313](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/313) | `c6b6fa811f5f1d8b615c0110d2cd9cd053e3255d` | Ancien A1 whitelist site/fichiers ; pas autres moteurs/IA ; widgets à adapter. | Non qualifiée ici ; pas vert présumé |
| [#314](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/314) | `dc3c3a7623e3a6defddc5e50d4bc224353d3bc7a` | Demande explicite dans prompt/relecture/hash ; UI2scènes surdc3c3a PASS,7captures,467358micro€ simulés,0réel ; pas qualité fournisseur réelle. | Non qualifiée ici ; pas vert présumé |
| [#315](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/315) | `eda4de594027e48eb45fe9e654eb443907494c2a` | Import explicite#298 après compatibilité#307 ; PNG historiques, pas captures convergence. | Non qualifiée ici ; pas vert présumé |
| [#316](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/316) | `645851e280a9b797858afc20c713429d7248ffb6` | Ancien POST Images fermé sans devis compatible ; pas génération complète. | Non qualifiée ici ; pas vert présumé |
| [#317](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/317) | `785d516ffab9fef457a8f8311ef9855ba397520d` | Retouche photo simple devisée ; pas toutes recompositions/personnes/documents. | Tête corrigée UTF8, arbre entier ==source qualifiée ; CI relancée |
| [#318](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/318) | `b92311b6aedc2761a1db1e9eed50d9fdda3e853b` | Recomposition payante bloquée sans devis ; reformatage gratuit conservé. | Non qualifiée ici ; pas vert présumé |
| [#319](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/319) | `81559e121ff6d61762ab864130c33879f1cbf800` | Liste/statuts demandes reçues0€, source visiteur non fiable hors IA ; carte absente →PARTIEL. | Tête corrigée UTF8, arbre entier ==source qualifiée ; CI relancée |
| [#320](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/320) | `07a285fc402d7586f7e4ffb9de2a5a4d9b4ded26` | Consentement social production minimumlié au devis ;103tests/10+types, pas navigateur/CI convergence qualifiés. | Non qualifiée ici ; pas vert présumé |
| [#321](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/321) | `9e9a75e14cab9c05cce538d7bab62c283039f748` | Retouche contenu native locale seulement ; fallback créatif bloqué sans devis. 63tests/4+types, pas nouvelle parité UI. | CI tête publiée pending |
| [#322](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/322) | `7495a3a4389d6e6783172b5a81b28227cf383e85` | Classement autonome par règles,0SDK ; enfant pipeline initial exactement vérifié préservé. 80tests/8+types, pas adaptateur SYNA. | CI tête publiée pending |
| [#323](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/323) | `0e23a37da9eab2bd02093ee6dc386cbfa1b0c68b` | ai_edit document pub fermé409 sans devis compatible ; opérations locales/acquis conservés. 48tests/5+types ; BLOQUE_CONSENTEMENT, pas capacité livrée. | CI tête publiée pending |
| [#324](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/324) | `f4b74f53b450edf750768ccba5996f820da2ac67` | prompt-run payant fermé409 sans devis compatible ; copie/édition/favoris/remplissage gratuits conservés. 34tests/4 dont10nouveaux+types ; pas parité payante livrée. | Arbre entier vérifié ; CI pending |
| [#325](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/325) | `c966be77928c3d8d746ae1b292901d25baa898a1` | content.v2 acquis mémo exact200 gratuit ; nouveau paid409 avant quota, local AIoff/outils absents/wallet0 préservé. 71tests/4 dont11nouveaux+types ; contexte multiservice/stratégie corrigé avant publication. | Arbre entier vérifié ; CI pending |

Les anciens rouges#317/#319 viennent du transfertUTF8 réparé, pas d’un défaut métier déduit. La vérification de l’arbre entier valide l’identité des sources ; elle ne remplace pas le nouveau verdict CI. Les succès de branche ne qualifient pas leur union. La CI initiale#302 était rouge sur la course du harnais traitée par#311.

## Qualifications navigateur natives séparées

- **#314**, source propre `dc3c3a7623e3a6defddc5e50d4bc224353d3bc7a` : `/workspace/work/preuves-media314-topic/native314-ui-summary.json`, deux scènes produitsdesktop1440/vansmobile390, sujet exact au wire, annulation, accord, réponse perdue/reprise et résultat rechargé ;7captures. Périmètre natif443622micro€ simulés/4HTTP ; harnais entier467358micro€/7HTTP. Aucun fournisseur réel, qualité créative réelle non qualifiée.
- **#317**, source propre `785d516ffab9fef457a8f8311ef9855ba397520d` : `/workspace/work/preuves-photo317-native-run4/photo317-ui-summary.json`,13captures AdEditor desktop1440 ;1SDKimage simulé,58239micro€ sous plafond92700 ; annulation0job, accord1job, réponse perdue→même job, source conservée/résultat relu. Recadrage et reformatage gratuits vérifiés. Harnais entier303786micro€/6HTTP. Recomposition complexe aiPost refusée409, pas résultat inventé.

Ces preuves testent les écrans natifs exacts, **pas les nouvelles cartes ni la parité Encre/Plein cadre intégrée**. Les incidents préliminaires de disque/harnais/simulateur restent décrits dans les rapports ; aucun défaut métier n’en est déduit et aucune dépense réelle n’a eu lieu.

## Audit financier : exécution contre lecture lexicale

`/workspace/work/parity301-finance-matrix.csv` : **208 routes/actions,199 NON_TESTE,6 ECHEC_CONSENTEMENT_PROUVE,3 REFUS_FINANCIER_PROUVE**. Les neuf opérations exécutées appartiennent au **tree9268486f21ff650d3faa55e1051bb477f006220a**, pas aux preuves5fd ni au futur SHA de convergence. Voir [AUDIT-CONSENTEMENT-9268486.json](AUDIT-CONSENTEMENT-9268486.json).

- Écarts au snapshot : `prompt-run`, `files.classify`, `content.v2.create`, fallbackIA `content.v2.edit`, `ads.doc.ai_edit` atteignent la sentinelle sans preuve d’accord financier ; réservation budgétaire active. `social.v2.produce` acceptait0 malgré devis positif : **correctif ciblé ultérieur#320**, pas nouvelle preuve sur tout le snapshot.
- Les retouches contenu#321, le classement autonome#322 et ai_edit publicitaire#323 ont reçu leurs gardes ciblées avec tests ; certaines fonctions payantes sont volontairement bloquées, pas livrées. Les gardes **prompt-run#324 et création content.v2#325 sont désormais publiées et testées dans leurs branches**. Le défaut de contexte multiservice/stratégie de la première proposition#325 a été démontré puis corrigé avant publication ; aucun écart de cette proposition n’est attribué à la tête publiée. **Les six écarts du snapshot926 ne sont pas déclarés globalement fermés : leur audit doit encore être rejoué et validé sur le SHA final de convergence.** Ne pas en déduire absence de plafonds, achat fournisseur réel ou panne produit500 : ces500 sont provoqués par la sentinelle.
- Refus numériques prouvés sur `campaigns.v2.generate`, `images.copy-review.resume`, `social.v2.create_one` ; ne qualifie pas les autres actions des mêmes endpoints.
- Les gardes#307/#312/#315/#316/#317/#318/#320/#321/#322/#323/#324/#325 couvrent des scopes précis, **pas les199 NON_TESTE**. Les limites40%abonnementHT/50%rechargeHT restent à prouver par chemin ; mots-clés et réservations seules ne prouvent pas l’accord.
- Deux lignes hors catalogue distinguent `native.prompt-run` payant de `prompts.edit` local, et `native.files.classify` de `files.organize` gratuit. Les succès des opérations gratuites/acquis sont conservés, sans généralisation financière.

## Priorités restantes

1. P0 : rejouer l’audit financier des six écarts exacts sur le SHA final de convergence ; les gardes ciblées publiées ne valent pas clôture globale. Conserver NON_TESTE pour les autres chemins, sans achat fournisseur réel.
2. CI#304/#310 : qualifier les nouvelles têtes publiées des fixtures (84/84 et51/51 ciblés, typesPASS ; arbres complets vérifiés). Les gardes restent inchangées ; aucune CI globale verte n’est déduite des tests locaux.
3. UI avec Claude : cartes/sélecteurs/contrôleurs #305/#309/#310/#313/#319 ; rendre les supportedActions bornées et les effets visibles avant accord. Les libellés génériques historiques C21 (photos/allergènes) restent à préciser dans une projection backend bornée ; cette revue ne modifie pas les labels du code root et ne prétend pas au CRUD complet. Services/RDV globaux, import/recherche SYNA, workflow et actions externes restent absents/partiels.
4. Requalifier au SHA final de convergence : ciblés, CI complète, puis les deux modes desktop/mobile ; aucune preuve antérieure transférée à41931a par simple présence des fichiers.

Aucune fusion main, activation client, mise en production, réservation/paiement/publication externe ni dépense fournisseur réelle. La [synthèse d’exécution](COMPTE-RENDU-EXECUTION-301.md) complète cette matrice sans remplacer les preuves individuelles.

Gel : #325 a pour tête `52a02981663d02940ab81439a39c023144f8395b`, un test de consignes ajouté au code produit de `c966be7`. Les preuves71/4 restent attribuées à c966 ; la fixture SYNA réelle63/3 à52a. Réemploi gratuit vérifié sans nouveau job, SDK ni version. CI de cette nouvelle tête encore pending. Le CSV précise cette séparation ; sous-ensemble de convergence371/25 passé avant publication.


## Qualification UI commune complementaire — source6fd

Production propre `6fd996637611c929ba9dfe258a320435dfe62f2f`, arbre `1d303664973b784b00c3edcddb17652cc5a532d3` : Fichiers4/4 et Contenus4/4 PASS, Encre/Plein cadre ordinateur/telephone ; trois types contenus repartis, pas matrice exhaustive type×mode×taille. Avant/apres, accord gratuit, resultat natif/recu/reload qualifies sur les cas executes. Captures entieres supplementaires :2cas. Les sources cartes sont #328 `d71315348e2de18d6197576ae1e07fe39939e7d0` et #330 `356b20ab3d2d4ff2bab0a55869a36c35b2c49f31`.

Seules les lignes `properties.update`, `menu.update`, `projects.update`, `files.organize` recoivent ce scope UI complementaire. Elles restent **PARTIEL** : renommage/prix ou nom/dossier ne valent pas CRUD complet ; anciensA1 non qualifies. Effet URL/adresse prouve pour BIEN seul ; realisation : nom et statut draft conserve, aucune assertion URL.

Preuve brute : `/workspace/work/preuves-convergence6fd/FINAL-REPLAY-SUMMARY.json` (94captures et empreintes). B1 : trois recettes4cas chacune PASS dont attente17s et drapeaux fermes ; preuve distincte, pas reecriture des autres lignes canoniques.0appel fournisseur reel/0depense ; tentatives CSS Google Fonts bloquees presentes, donc pas zero tentative externe. Finance9 et Social possedent leurs manifests distincts ; cela ne qualifie pas les199autres lignes financieres NON_TESTE. Sources et captures historiques conservees. Aucun statut global SYNA_OK deduit.
