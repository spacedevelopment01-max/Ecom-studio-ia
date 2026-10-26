# Contre-vérification indépendante #195 — intégration #194 / PR #196

État au 26 octobre 2026 : **AVIS TECHNIQUE FAVORABLE AVANT FUSION renouvelé sur `d38b0b7c676e045d103238179e0e4a2d30ad5d05`, base main `0a6aa1dd`. Suite indépendante et CI finale entièrement vertes. Contrôle APRÈS en attente du vrai SHA fusionné par Claude ; CMS, kits privés et studio servi restent partiellement non vérifiés.**

Responsabilités : Claude conserve seul la branche d’intégration et la fusion. Codex teste des copies séparées et publie ici ses preuves. Famille de modèle indiquée par la session : GPT-6 / Codex ; identifiant exact et réglage d’effort non exposés. Effort élevé demandé et examen approfondi effectué.

## Versions et périmètre

| Version | Rôle et état |
|---|---|
| `0a6aa1dd6dfa5932a5e42e027cef2a3335e74679` | Dernier main relu, pas encore la version intégrée |
| `2dbdc050ef57bd6c74a44699f158e00d19c92208` | Premier candidat figé ; défaut multi-variante reproduit |
| `8d5d236ad67f9ded1ce8547fe446693b12db7b64` | Même application que 2db ; 16 documents/preuves et timeout CI modifiés |
| `aec79070dce88666e2b59be3452f7b6b1304bdb9` | Corrige la reprise multi-variante ; saisie client concurrente encore perdue |
| `7f854218bb7afd08ec8ec2209b55c36ee53011f7` | Candidat intermédiaire ; corrige aussi la saisie concurrente |
| `3ae89a6d42711c13962571483f55c496d6b3ddaa` | Corrige les faux rejets PrestaShop et la configuration du formulaire APLAT ; 57 contre-épreuves, 17 exports, 38 interactions et suite globale réussis |
| SHA effectivement fusionné | **EN ATTENTE de Claude ; aucun contrôle après fusion possible à ce stade** |

Copies isolées, SQLite et médias fictifs sous `/tmp/ecs-195-*`. Dépôt de travail initial préservé : branche `codex/lot-2a-themes-reference`, commit `9f8b6c437580490acc52fd165986a1c3a79b394a`, propre. Aucun secret/configuration/base client copié. Garde réseau du lot 9 active pendant les tests natifs ; zéro appel fournisseur réel ou payant. Aucune fusion, publication client, modification du studio réel ou suppression globale Docker.

## Défauts traités et contre-épreuves

### P1 : une variante réussie est appliquée deux fois après refus de la suivante

**REPRODUIT** sur 2db, moteur et SQLite natifs, boutique mémoire explicitement simulée. Depuis les stocks 10/5, le client demande 12/7. A réussit ; B refuse 422. La reprise aboutit à **14/7 au lieu de 12/7**, en ajustement relatif comme en écriture absolue. Le point `synced_stock` de A était enregistré trop tard alors que son journal avait déjà été effacé.

Claude a reproduit puis corrigé dans `aec79070`, fichier `src/lib/products/sync.ts` : acquisition transactionnelle par variante ; conservation des opérations réussies/incertaines ; refus 4xx limité à la variante refusée. Deux contre-épreuves Codex inchangées repassent. [Reproduction et test](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/196#issuecomment-6408750773), [exécution indépendante rouge puis verte](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6408849143).

### P1 : saisie du client écrasée pendant l’attente d’une synchronisation

**REPRODUIT** sur aec : synchronisé=10, demande=12 ; pendant l’ajustement, vente distante −1 et nouvelle saisie Studio=15. Le distant finit correctement à 11, mais le Studio reçoit **11 au lieu de 14** (11 acquis +3 encore à envoyer). L’ancien snapshot écrasait la valeur actuelle.

Claude a reproduit puis corrigé dans `7f854218`, même fichier : relire le stock au moment de la décision puis dans la transaction d’acquisition ; garder les variations postérieures et la désactivation du suivi. Notre contre-épreuve inchangée vérifie 11 distant/14 Studio puis 14 partout à l’envoi suivant. [Reproduction exécutée et test complet](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/196#issuecomment-6408857860), [prise en charge et correctif](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6408883932).

### P1 : exports PrestaShop des trois thèmes de réservation rejetés pour leurs scripts natifs

**REPRODUIT sous le verrou exact sur 7f** : `demoProject` → `cmsExport` → `checkCmsExport`, Table Saison, Atelier Nuance et Parenthèse, sans installation CMS ni fournisseur. Tous trois : **REJECTED, fatal=true, dangerous_script**, motif `script dans les contenus : templates/es/header.tpl`. Les références des scripts natifs conservées par `splitHtml` dans l’adaptateur PrestaShop sont traitées comme des injections par `CONTENT_FILE` / `executableContentScript` dans `src/lib/cms-v2/checks.ts`. L’adaptateur assemble pourtant déjà ces scripts dans `assets/js/es-theme.js`. Le JSON de configuration inerte est correctement accepté ; les deux références exécutables déclenchent le refus.

**Correction demandée puis reprise par Claude dans `3ae89a6d` (contre-épreuves ci-dessous)** : conserver l’exécution des scripts natifs et des réservations en corrigeant leur représentation dans l’adaptateur ; ne pas autoriser globalement les scripts de contenus. Ajouter les trois exports aux tests et garder le refus d’un script injecté. Une sortie PROVISIONAL avec installation non mesurée peut être correcte ; aucune transformation arbitraire en FINAL. [Constat et commande](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6409417476). Le gate structuré est publié dans `7f854218-rejets-prestashop-verrou-exact.json`. Le harnais original `exports-190.ts` perdait le verdict par `String(objet)` ; notre harnais séparé conserve les données réelles, sans modifier le moteur.

### Défauts antérieurs de #176

Écrasement d’une vente par réassort, doublon de création concurrente, répétition après réponse perdue et boutique déclarée connectée après 503 : contre-épreuves et traitement déjà publiés [dans #194](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6403952034). Le candidat conserve les journaux durables, verrous et vraies sondes de connexion. L’envoi de stock WooCommerce/PrestaShop reste présent. Leur API d’écriture absolue garde une fenêtre vente/écriture explicitement déclarée ; une double simulée ne prouve pas l’atomicité d’un CMS réel.

## Commandes et résultats exécutés

**Préparation corrigée :** les premiers résultats ci-dessous utilisaient un `node_modules` partagé avec Next 15.5.27, sanitize-html 2.18.0 et PostCSS 8.5.28, au lieu des versions verrouillées 15.5.28 / 2.18.1 / 8.5.31. Une installation `npm ci` isolée a maintenant réussi ; les 43 dépendances directes correspondent au verrou, SQLite natif fonctionne. Les contrôles finaux sont repris dans ce contexte exact. Le premier `npm ci` a échoué sur le téléchargement GPU optionnel ONNX ; l’option officielle CPU seule `npm_config_onnxruntime_node_install_cuda=skip` a permis l’installation sans changer le verrou. Aucun composant partagé initial modifié.

Préfixe de sécurité utilisé : `NODE_OPTIONS='--max-old-space-size=1536 --import=<copie>/scripts/lot9/network-guard.mjs' APP_SECRET=<secret fictif>` ; aucune clé fournisseur configurée.

| Version | Commande / contrôle | Résultat réellement obtenu |
|---|---|---|
| 2db + deux contre-épreuves Codex | `npx vitest run tests/contre-verification-195-products.test.ts --maxWorkers=1` | **13 réussites, 2 échecs**, sortie 1 ; 2,31 s |
| aec + mêmes contre-épreuves | Fichier précédent + `produits-studio-190`, `integration194-securite`, `integration194-isolation-ab`, workers=2 | **48/48**, sortie 0 ; 12,30 s |
| aec + saisie concurrente | `-t 'réassort saisi au Studio' --maxWorkers=1` | **1 échec sélectionné**, sortie 1 ; 18 cas filtrés par `-t`, aucun test désactivé |
| 7f + trois contre-épreuves inchangées | Les quatre fichiers ciblés, workers=2 | **51/51**, sortie 0 ; 11,69 s |
| 7f | `NODE_OPTIONS=--max-old-space-size=3072 npx tsc --noEmit` | **Réussi**, sortie 0 |
| 7f | `scripts/lot1/recette-jours.sh <copie> tests/social-autopilot-pilote.test.ts` | **63/63**, neuf cas sur sept dates, 26 octobre–1er novembre ; sortie 0 |
| 7f | `scripts/lot1/base-historique.ts` puis `essai-complet.ts` depuis dcfc13b1 | **45 contrôles réussis**, migration/restauration fictive, source inchangée |
| 7f | Idem depuis d97e0b95 | **45 contrôles réussis** |
| 7f | Idem depuis main 0a6aa1dd | **46 contrôles réussis** |
| aec, avant correctif stock seul de 7f | Huit fichiers Higgsfield/prix, angles, reçus, idempotence et budgets | **138/138**, sortie 0 ; 34,30 s ; fournisseurs simulés |
| 7f, dépendances partagées préliminaires | Suite complète `npx vitest run --maxWorkers=3` | 391 fichiers réussis, quatre échoués, un ignoré ; 3 355 tests réussis / 15 échoués / 31 ignorés ; sortie 1 ; 1 133,44 s. Les quatre fichiers échoués repassent après restauration des ressources suivies : **32 réussis / 14 ignorés**, sortie 0, 19,15 s. Les 14 ignorés préexistaient et ne pouvaient être collectés avant le rétablissement du JSON. Aucun de ces lancements n’est présenté comme une invocation globale verte. |
| 7f | Build de production / navigateur natif / exports | Terminés ; faux rejets PrestaShop corrigés ensuite sur 3a, détails ci-dessous |

Les commandes de migrations, leurs rapports JSON et les journaux sont livrés dans `reports/contre-verification-195/`. Les harnais isolés ajoutés pour les preuves ne modifient pas le moteur applicatif.

## Preuves GitHub et registre des apports

- Registre et conflits du rapport de Claude lus intégralement ; chaîne #170 → #173 → #168 → #166 → #174 → #176 → #193 conservée. Anciennes branches documentaires confrontées aux fichiers actuels, sans réintroduire les travaux remplacés.
- **Coven #191 explicitement exclu par la décision de Thomas rapportée dans le [commentaire de coordination 6404170120](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6404170120), le rapport actuel et CLAUDE.md**, malgré sa mention dans la liste initiale #195. Branche conservée, pas réintégrée arbitrairement ; protections générales toujours présentes.
- CI 2db [40247116214](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40247116214) et 8d [40266288826](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40266288826) réussies. Dernier journal 8d : **395 fichiers réussis / 1 ignoré ; 3 384 tests réussis / 31 ignorés**. Ce sont les exécutions GitHub, pas des commandes Codex.
- Cette CI testait le merge temporaire `7b46c9f9d0e1848359cf2f27b6bfb9757668a12a` ; arbre `bacfa98f54386348cd27263a0d55ef002df3d211`, identique à la tête 8d. Ce n’est pas une fusion réelle dans main.
- CI 7f [40273960432](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40273960432) : **entièrement réussie**, types, tests, Theme Check, build et Docker. Journal relu : **395 fichiers réussis / 1 ignoré ; 3 389 tests réussis / 31 ignorés**. Cela ne couvre pas le faux rejet PrestaShop reproduit ensuite.
- Diff Git #176 `0af6fe1f` → 7f exécuté : **aucun changement dans `theme-base/`, `public/`, `assets/cms/`**. Changements du moteur de thèmes liés aux protections, import, transport/accès, compilation et médias clients ; ce constat ne suffit pas à lui seul à valider les captures.

## Limites constatées, à ne pas compter comme réussites

1. **CMS locaux bloqués par le stockage Docker VFS plein** : sources officielles WooCommerce 9.3.3, PrestaShop 8.1.7 et WP-CLI téléchargées, mais création WordPress et pivot Docker refusés (`no space left on device`). MariaDB fictive de préparation arrêtée ; anciens conteneurs/volumes intacts ; aucun nettoyage global. **Zéro parcours de CMS réel exécuté ici**. Achats et réservations après export non validés indépendamment.
2. **Kits privés absents** malgré tous les 661 fichiers publics suivis matérialisés : FRAISE 25 médias, ONDE 26, Atelier Nuance 2, Parenthèse 7, Phase 26, Maison & Horizon 87, APLAT 29. Les huit autres fixtures n’annoncent aucun média manquant. Les quinze thèmes se composent dans la base fictive. La complétude visuelle des kits absents reste non vérifiée.
3. Les 884 comparaisons de captures de Claude sont décrites dans son rapport. Elles n’équivalent pas à 884 captures intégralement inspectées par Codex ; publication des images consultables demandée dans #194.
4. Fournisseurs, prix du compte, génération, paiement, e-mail et publication sociale réels non testés. Les tarifs du harnais Higgsfield sont explicitement simulés ; les montants d’estimation ne deviennent pas des prix réels.
5. Studio réellement servi non redémarré ni vérifié ; un SHA fusionné ne prouve pas la version accessible au client.
6. Première suite interrompue pour compléter le manifeste TRAVERSE omis par le checkout partiel ; deuxième lancement a aussi rencontré JSON FRAISE et compétences omises lors d’une réapplication des motifs sparse. Les motifs ont été corrigés durablement (métadonnées suivies + `.claude` + `.devcontainer`) ; ces lancements ne sont pas annoncés verts.

## Verdict par point et suite

Les premiers contrôles 7f et leurs limites sont conservés ci-dessous. Le verdict final 3a couvre stocks, catalogue, sections, droits, isolation, exports natifs, Higgsfield et angles, dans la portée des tests et doubles explicités. Le détail par point et par fichier de test exécuté est dans `3ae89a6d-verdict-par-point.json`. CMS réel, kits privés et version servie : **non vérifiés**, raisons ci-dessus.

**AVANT fusion : avis technique favorable sur 3a, suite complète et CI réussies, avec les limites explicites ci-dessous. Aucun verdict APRÈS fusion.** Claude doit publier le SHA final figé et ses résultats ; Codex complétera le contrôle concerné après toute modification. Après fusion par Claude seulement, repartir du SHA main exact dans une autre copie isolée et publier le second verdict dans #194.


Derniers contrôles sous dépendances exactes : 51/51 ciblés réussis (12,69 s), build Next 15.5.28 réussi ; `/api/version` relu = `7f854218bb7afd08ec8ec2209b55c36ee53011f7`. Parcours admin Higgsfield natif réussi, cinq captures et vidéo : 810 estimations simulées, approbation groupée de deux modèles, actualisation et reprise, accès anonyme 401, aucun secret renvoyé, aucun débordement mobile ni erreur JavaScript. Ce sont des tarifs simulés. Les résultats de cette suite et des parcours navigateur sont détaillés ci-dessous, y compris le dépassement 7f et la suite complète 3a réussie.


## Parcours navigateur et médias : résultats exécutés sur 7f, verrou exact

- **Studio natif de production, contrôlé via navigateur** : création/modification de fiche catalogue, sauvegarde et rechargement sans doublon de la fiche de test ; distinction entreprise de services ; page Rendez-vous accessible ; aperçus des deux métiers de contrôle (filtration et accord de piano). Les parcours de paiement et les formulaires publics de l’aperçu restent volontairement désactivés ; aucun succès commercial simulé présenté comme une transaction.
- **Sécurité de production via navigateur** : connexion ; inscription avec confirmation avant session via un SMTP exclusivement loopback ; export des données du compte sans celles de l’autre ; demande d’effacement enregistrée sans effacement automatique ; parent inaccessible à l’iframe opaque ; pont de panier limité au projet et `/api/me` refusé ; panier signé lisible en vue indépendante. Accueil et détail produit/services sur ordinateur/mobile : images embarquées toutes décodées, aucun débordement. 20 captures, aucun message externe, aucun paiement, aucune erreur JS. Source applicative propre ; SHA compilé identique à 7f, Next 15.5.28.
- **Harnais historique adapté explicitement** : son import `kitProject` supprimé après les apports de #176 ne pouvait plus s’exécuter. Notre copie utilise la fixture native actuelle `noctilProject`. La fixture de stratégie actuelle insère déjà un reçu `provider=simulated`, coût=0, 0 HTTP : le harnais vérifie ces propriétés avant le navigateur et l’identité exacte des appels après, donc **zéro appel ajouté, même simulé**. Il ne supprime pas une garde fournisseur ; ces échecs de préparation et les modifications du harnais sont conservés dans les preuves. Les fichiers applicatifs et tests du candidat restent inchangés.
- **15 accueils, ordinateur/mobile** : 30 vues après défilement et décodage forcé des images disponibles ; scroll remis instantanément à zéro pour les captures ; aucun débordement ni erreur JS. Les images lazy encore non décodées dans le premier relevé ne sont pas traitées comme des défaillances ; la contre-mesure `controle-medias-cadrage.json` laisse seulement **11 références ONDE** non chargées, cohérentes avec le kit absent. Les sept fixtures à médias manquants restent incomplètes : absence de débordement ne prouve pas leur qualité visuelle complète. Les cinq planches des accueils ont été ouvertes et inspectées ; les huit fixtures complètes conservent des identités distinctes. Les autres pages ne sont pas toutes inspectées manuellement par Codex ; les rendus, composants, dispositions et sauvegardes sont aussi couverts par la suite native, avec une portée différente.
- **Livraison visuelle** : 90 captures natives (accueils complets/premiers écrans, studio, sécurité et administrateur), cinq planches d’inspection et deux vidéos réelles du navigateur. Les tarifs Higgsfield sont explicitement simulés ; les kits absents sont signalés. Voir [l’index visuel](../../reports/contre-verification-195/README.md).
- **Autopilot et migrations sous verrou exact** : sept dates × neuf cas = 63 réussites ; bases historiques dcfc13b1 / d97e0b95 / main 0a6aa1dd : 45 / 45 / 46 contrôles de migration/restauration, sources fictives conservées. Rapports JSON marqués `synthetique: true`, `reussi: true`.

Les preuves de cette branche sont consultables directement ; leur branche ne doit pas être fusionnée à la place d’un correctif applicatif pris en charge par Claude. Le défaut PrestaShop de 7f a ensuite été corrigé dans 3a ; les contrôles de ce nouveau candidat sont distingués ci-dessous. Main n’est pas encore la version de cette recette.


## Nouveau candidat corrigé : `3ae89a6d42711c13962571483f55c496d6b3ddaa`

Claude a repris le P1 et l’a étendu à APLAT. Le diff avec 7f a été relu : seul l’adaptateur PrestaShop, `aplat.js`, `ap-form.liquid` et un nouveau fichier de tests changent dans le code ; le reste est documentaire. Aucun changement de verrou ni de DB. `dangerous_script` n’a pas été assoupli. `toSmarty` retire uniquement une référence de script natif déjà présente dans le bundle livré, à partir de `design.scripts`, sans règle portant sur un nom de projet client. La section de formulaire APLAT émet des réglages JSON inertes, lus par son script natif. CSS et médias inchangés.

| Contre-vérification indépendante | Résultat |
|---|---|
| Six nouveaux cas exécutés contre l’ancien moteur 7f | **6/6 échouent**, sortie 1, 74,82 s ; rouge attendu et conservé |
| 3a + ces six cas, produits/sécurité/A-B et trois contre-épreuves stock inchangées | **57/57 réussissent**, sortie 0, 77,98 s |
| 17 exports PrestaShop natifs, dont les deux références historiques ORBE/ALCÔVE | **17 PROVISIONAL**, aucun rejet fatal ; gate intégral dans `3ae89a6d-exports-17-prestashop.json` ; aucune installation ni recette CMS certifiée |
| APLAT, export statique réel, navigateur local | **38/38** : menus/focus/Échap, filtres, FAQ, comparateur au clavier, devis en deux étapes, erreurs, données conservées, fichiers refusés/retirés, double clic, confirmation explicitement simulée, cookies, cinq largeurs 360–1440 |
| APLAT, configuration non démonstration rendue par le moteur natif | **Un seul POST** après double clic vers un récepteur HTTP exclusivement local, `demo=false`, texte d’envoi conservé, aucune fausse confirmation ; aucun e-mail ni CMS testé |
| Compilation de production et types explicites | **Réussis** ; serveur loopback relu : `/api/version` = 3a ; connexion HTTP 200 et administration Higgsfield anonyme 401 |
| PHP réel isolé, sans installation système | **9/9** dans `lot2a-php-export.test.ts` ; binaire Debian PHP 8.4.27 extrait sous `/tmp`, modules explicites, ouverture d’URL externe désactivée. Cela ne fournit pas WordPress/PrestaShop ni une preuve de réservation après export. |
| Suite complète 3a, verrou exact, PHP disponible, deux workers sans navigateur concurrent | **3 395 réussis / 0 échec / 31 ignorés**, 396 fichiers réussis / 1 ignoré, sortie 0, 24 min 47,93 s |

La suite 7f au verrou exact a fini avec **3 374 réussites / un dépassement de 60 s / 45 ignorés**, sortie 1. Le fichier concerné (`mission154-livraison`) a été rejoué intégralement à l’identique en un worker : **15/15**, le cas de média corrompu en 27,72 s, délai et assertions inchangés. L’hypothèse de contention sous les vérifications navigateur parallèles n’est pas une cause applicative démontrée. Le journal rouge est conservé ; il n’est pas présenté comme une invocation verte. Parmi les 45 ignorés, 14 nécessitaient PHP absent alors ; les autres motifs sont les kits privés, CMS de test et films suspendus déjà signalés. La nouvelle invocation 3a emploie PHP et a réussi intégralement ; les 14 cas PHP ont réellement été exécutés.

Le harnais APLAT historique utilise `file://`, refusé par la politique du navigateur de cet environnement. Notre copie sert seulement l’export fictif généré, sur `127.0.0.1`, refuse les écritures et toute requête distante, sans changer la politique du navigateur. Les 38 assertions sont conservées. Le second contrôle utilise un POST local contrôlé, sans transmission au CMS ni à un destinataire. Les 29 médias privés APLAT restent absents : ces interactions ne certifient pas son rendu photographique complet.

Les captures précédentes des quinze accueils restent attribuées au SHA 7f : nous ne les présentons pas comme une nouvelle prise de vue de toutes les pages 3a. Les deux autres fichiers modifiés de thème concernent les réglages et interactions du formulaire APLAT, contre-vérifiés ici ; ses styles et ses médias n’ont pas changé. Les éléments préservés et les limites externes du contrôle précédent restent explicitement séparés.


## Verdict AVANT définitif — 26 octobre 2026

**AVIS TECHNIQUE FAVORABLE pour l’intégration pilotée par Claude du code `3ae89a6d42711c13962571483f55c496d6b3ddaa` sur main `0a6aa1dd6dfa5932a5e42e027cef2a3335e74679`.** Ce verdict autorise la poursuite de la fusion déjà décidée par Thomas ; il ne certifie pas les CMS absents, les médias privés absents ni un studio déployé. Codex ne fusionne rien. Un ajout uniquement documentaire est admissible après comparaison ; tout changement applicatif nécessite de revoir les contrôles concernés. Le contrôle APRÈS portera sur le vrai SHA main, jamais sur le merge temporaire de CI.

| Derniers contrôles indépendants, tous sur 3a exact | Preuve publiée |
|---|---|
| Suite complète : 3 395 réussis, 0 échec, 31 ignorés ; sortie 0 ; 1 487,93 s | `3ae89a6d-suite.log.txt`, `3ae89a6d-suite-synthese.json`, `.exit` |
| 31 ignorés détaillés : FRAISE 14, ONDE 11, APLAT 1, Maison & Horizon 1, films suspendus 2, CMS E2E 2 | Synthèse par fichier ; aucun ignoré compté comme réussite |
| Autopilot : sept dates, neuf tests par date, **63/63**, sortie 0 | `3ae89a6d-autopilot-7jours.log.txt` |
| Migration/restauration de trois bases historiques fictives : **45/45/46**, sorties 0, sources intactes | `migration-*-3ae89a6d.json` |
| Serveur compilé 3a : **64 contrôles HTTP** A/B/admin/anonyme, cookies et SQLite natifs ; sauvegarde du stock propriétaire à 9 ; aucune modification étrangère ; octets du fichier privé autorisé identiques | `3ae89a6d-http-matrice-64.json` ; compteurs observés **0 appel / 0 tâche / 0 boutique connectée** |
| CI GitHub [40280030470](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40280030470) entièrement réussie : types, tests, Theme Check, build, Docker | `3ae89a6d-github-candidat-ci-registre.json` ; journaux lus ; 3 395 tests et 31 ignorés |

Le checkout CI `105095ce0733131990e8d8cf63ffadc06b891c11` est un merge temporaire, avec parents main 0a et candidat 3a. Son arbre `b8eb12b826b92e7320ad4538442f1ee79239dbdd` a été confronté via l’API Git à celui du candidat : égalité vérifiée. **Il ne s’agit pas du SHA réellement fusionné.** Les 13 têtes de PR sources ont été relues et conservées dans le registre machine ; aucune évolution concurrente constatée.

La réutilisation des captures 7f est explicitement attribuée : le diff 7f → 3a n’altère ni CSS ni photographie ; APLAT modifié a son propre navigateur 3a, 38 assertions et mode non-démo. Les preuves visuelles consultables demeurent 101 PNG et trois vidéos. Les outils historiques de preuve ont deux incompatibilités non applicatives signalées : import de fixture supprimé et ancienne exigence de zéro reçu même simulé ; une copie adaptée explicite est fournie, sans toucher aux garde-fous réseau. Le script historique d’exports stringifyait aussi l’objet de gate ; notre harnais conserve sa décision structurée.

**Réserve de plateforme stock** : Shopify utilise un ajustement relatif ; WooCommerce et PrestaShop relisent puis écrivent un nombre absolu. Une vente entre leur dernière lecture et leur écriture ne peut pas être garantie par ces API. Le moteur l’indique ; ne pas annoncer une atomicité absolue pour ces plateformes. Suivi P2 de rédaction avant activation client : `src/components/studio/tab-catalogue.tsx` promet encore « jamais écrasé » ; l’aligner sur la limite réelle. Ce point ne remet pas en cause les contre-épreuves corrigées et n’est pas présenté comme une correction déjà faite.

Restent non vérifiés : vraie installation et parcours CMS (Docker VFS plein, aucun accès devstore), complétude photographique des sept kits privés absents, qualité de génération fournisseur réelle, moyens de paiement/e-mail/publication réels et version du studio client. Les doubles ne valent pas recette CMS. Aucun seuil 40 % / 50 %, droit 49/89, protection d’accès, budget ou travail de thème n’a été arbitrairement changé.


## Complément pendant l’attente de la CI documentaire : éditeur natif 3a

Deux projets distincts entièrement fictifs (théière en grès, cours individuel de tournage) : **déplacement de section par le vrai menu, disposition d’en-tête par les vignettes natives, rechargement de page et réouverture sur mobile**. Ordre et disposition retrouvés ; comparaison profonde du `store` avant/après identique (textes, produits, pages, médias et contexte commercial inchangés) ; version précédente toujours disponible ; aucun appel ajouté, même simulé ; aucune erreur JS dans le parcours final. Quatre captures ouvertes et inspectées ; les résultats sont dans `editeur-3ae89a6d/resultat.json`. Les captures montrent les médias de la fixture de test, pas une création photographique client.

Les essais de préparation sont conservés : sélecteur de bouton au lieu du rôle `tab` mobile ; initialisation de tutoriel injectée trop largement dans une iframe opaque, corrigée en la limitant à l’hôte. La sécurité de l’iframe n’a pas été affaiblie et les erreurs n’ont pas été filtrées pour obtenir du vert. Ces échecs du harnais ne sont pas des échecs applicatifs ; un autre cas ci-dessous est bien un défaut d’interface.

**P2 existant, reproduit, non régression d’intégration : menu d’une section masquée difficile à cliquer.** Sur le service, section `portfolio` masquée « Réalisations », tutoriel fermé : le centre du menu « Descendre » est intercepté par le bouton d’ajout d’une autre section. Le clic normal expire, aucun clic forcé utilisé. Le parent du menu a `opacity: 0.6`, donc un contexte d’empilement qui laisse les autres lignes au-dessus. `src/components/studio/tab-boutique.tsx` applique l’opacité à la ligne entière et à son menu ; `sortable.tsx` structure ces lignes. Ces deux fichiers sont strictement inchangés de #176 à 3a. Preuve : `editeur-3ae89a6d/menu-section-masquee.json` et PNG, journal de l’essai conservé. Le parcours final réussi porte explicitement sur une section visible non verrouillée ; il ne masque pas ce défaut. À traiter séparément avec le suivi P2 avant activation client ; pas de changement applicatif intercalé dans le candidat figé.


## CI finale documentaire rouge : traitement avant fusion

La CI96ad [40286840876](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40286840876) a terminé en **échec : 3 394 réussis / 1 échec / 31 ignorés**, 1 258,39 s. Typecheck et Docker réussis ; Theme Check et build principal non exécutés. Le feu vert historique3a n’est pas utilisé pour contourner ce rouge : fusion retenue dans #194/#196, avis suspendu en attendant la correction et sa CI finale.

**OBSERVÉ DANS LES JOURNAUX et CONFIRMÉ DANS LE CODE** : `affiches-publications.test.ts:81` exigeait un rôle `background`, mais la sélection varie avec `Date.now()` et l’ID du projet. Une composition `panel` conserve la photo dans un calque `image` plutôt que `background`. **REPRODUIT dans le moteur natif** : 37 publications à identifiants fixes successifs, historique de compositions conservé ; graine index36 `post-contre-verification-195-36`, sortie `panel`, mêmes rôles que la CI, photo exacte dans un calque image visible/non verrouillé de1080×702 sur1080×1350. Titre exact et CTA visible, aucune photo arbitraire substituée, zéro appel ajouté. Une ligne `provider=simulated` coût0 vient déjà de la fixture ; la préparation du harnais qui l’attendait à0 a été corrigée par une comparaison des identifiants avant/après, sans affaiblir le réseau. Les rendus stockés ont été ouverts ; le rapport public conserve seulement les métriques fermées de cette fixture, sans republier son identité textuelle. `affiches-3ae89a6d/resultat.json` contient les 37 cas, géométries et illustrations inspectées localement.

**Correction prise par Claude : `d38b0b7c676e045d103238179e0e4a2d30ad5d05`**. Un seul fichier de test change : titre/CTA toujours requis, métadonnée de photo exacte toujours requise, et calque `kind=image`, rôle `background` ou `image`, portant **l’assetId exact de la photo choisie** exigé. Pas de remplacement par « une image quelconque », pas de graine favorable figée, pas d’application ni maquette changée. L’adaptation reflète la composition en panneau déjà admise par le moteur, et conserve le contrôle du contenu éditable et de la séparation publications/publicités. Native6/6 réussis sur une nouvelle copie d38,10,57s ; nouvelle suite complète et CI d38 en cours. Aucun nouvel accord AVANT émis avant leur fin.

## Complément export natif, 3a exact

**17 WooCommerce/WordPress + 17 Shopify PROVISIONAL**, en plus des17PrestaShop précédents : 51 exports natifs sur17références, tous contrôlés par le vrai moteur et gate structuré. `3ae89a6d-exports-17-woo-shopify.json` conserve les limites par thème, pas seulement le code de sortie du script (qui capture aussi ses erreurs). Le statut PROVISIONAL n’est pas une certification CMS. Les ZIP ne sont pas installés dans un CMS ici. Les limites par plateforme restent celles du rapport : mises en page individuelles non reprises sur Woo/Presta, prix barrés Presta manuels, fonctions de réservation après installation non vérifiées ; médias privés absents signalés, y compris les références historiques ORBE/ALCÔVE lorsqu’elles en demandent.


## Suite indépendante finale d38 réussie — CI encore en attente

Sur `d38b0b7c676e045d103238179e0e4a2d30ad5d05`, copie neuve, sources et verrou propres : **396 fichiers réussis / 1 ignoré ; 3 395 tests réussis / 0 échec / 31 ignorés**, sortie0, **1 485,37s**. Commande : `vitest run --maxWorkers=2 --reporter=default --reporter=json --outputFile=<temp>/d38b0b7c-suite.json` ; garde réseau du lot9, PHP8.4CLI isolé, aucun navigateur concurrent. Typecheck explicite réussi ; fichier d’affiche corrigé6/6 confirmé avant la suite. Les assertions/plafonds du pilote, les délais des tests et le code applicatif n’ont pas été modifiés par Codex.

Preuves : `d38b0b7c-suite-synthese.json` (empreinte du rapport brut et compteurs par fichier), journal intégral, fichier de sortie0 et métadonnées d’exécution du processus natif. Les31ignorés restent les mêmes kits privés/CMS absents/films suspendus, sans les compter comme réussites. La CI [40289682986](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40289682986) a passé types/tests et Docker ; **Theme Check en cours au relevé**, build principal encore en attente. **Accord avant fusion toujours retenu jusqu’à sa fin effective.** Les13têtes sources relues à08h16UTC sont inchangées ; le périmètre d’intégration est stable.


## Verdict AVANT renouvelé — d38 et sa CI finale effectivement verte

**AVIS TECHNIQUE FAVORABLE sur `d38b0b7c676e045d103238179e0e4a2d30ad5d05`, combinaison avec main `0a6aa1dd6dfa5932a5e42e027cef2a3335e74679`.** La correction de test a été examinée et reproduite ; la suite complète indépendante et la CI ont fini. Les conclusions antérieures, verts comme rouges, restent historiques et ne sont pas effacées. Aucun contournement de CI, aucune relance de la CI rouge96ad pour en masquer le défaut.

- Native d38 : **3 395 réussis,0échec,31ignorés**,396fichiers réussis/1ignoré, sortie0,1 485,37s ; types et fichier d’affiche6/6 réussis.
- CI [40289682986](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40289682986) : **tous les jobs et étapes réussis**, types,3 395tests/31ignorés, Theme Check30scénarios, build de production, construction et démarrage Docker. Journaux relus, pas seulement le badge.
- Checkout CI temporaire `4fa9902faa7a6febd6a114ae542a4b989fde43d4` : parents main0a et candidatd38 ; arbre `b176bc230eed7a8cb6986a2baafc50f6f7b23d78`, identité confrontée à l’arbre d38 par l’API Git. **Ce checkout temporaire n’est toujours pas main fusionné.**
- D38 ne change que le test d’affiche depuis96ad ; tous les fichiers applicatifs, médias, scripts, verrou et CI sont inchangés depuis3a. Les57contre-épreuves,63Autopilot, migrations45/45/46,64HTTP,38APLATFORM, réouverture éditeur et51exports natifs de3a gardent cette attribution de source, complétés par la suite d38 réellement exécutée. Ils ne sont pas rebaptisés « exécutés après fusion ».
- Les13têtes sources relues juste avant ce verdict sont inchangées. Coven191 reste exclu conformément à la décision de Thomas. Main0a n’a pas changé au dernier relevé.

Claude peut poursuivre la fusion déjà autorisée, seul opérateur. Toute modification applicative supplémentaire invalide les contrôles concernés. **Demande : transmettre le vrai SHA main et figer ensuite tous les commits pendant sa CI et notre seconde passe** (la configuration CI annule les runs précédents du même ref lors d’un nouveau push, même documentaire). Le rapport central peut être finalisé après la vérification du code intégré, avec séparation du SHA de code testé et de la révision documentaire.

Cet accord est technique : les31ignorés, CMS réellement installés absents, sept kits privés actifs absents, fournisseurs réels non testés, version du studio client inconnue et suivis P2 restent explicitement ouverts. Il ne vaut pas activation client ou validation visuelle finale de Thomas. **La mission195 n’est pas encore terminée : contrôle APRÈS à exécuter.**
