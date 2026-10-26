# Contre-vérification APRÈS fusion — main333bccc8

**Code effectivement fusionné par Claude et retesté : `333bccc8daf97b9746dcf590a9525c830a53915f`. Avis technique favorable à l'intégration, avec réserves ci-dessous ; aucune validation visuelle globale ni activation client.**

Copie neuve séparée, sources suivies propres, dépendances verrouillées exactes. [Arbre/parents/préservation](main-333bccc8-preservation.json), [version du serveur compilé de test](main-333bccc8-production-http.json). Ce serveur est exclusivement loopback : aucune mise à jour du studio réel.

## Contrôles réellement rejoués sur main

| Contrôle | Résultat | Preuve |
|---|---|---|
| Suite native intégrale | 3 395 réussis, 0 échec, 31 ignorés ; 396 fichiers réussis/1 ignoré | [Synthèse par fichier](main-333bccc8-suite-synthese.json), [journal](main-333bccc8-suite.log.txt), [processus](main-333bccc8-suite-execution.json) |
| Types et build de production | Sorties0,45,10s et102,07s ; 58pages compilées | [Types](main-333bccc8-types.log.txt), [build](main-333bccc8-build.log.txt) |
| Vraie CI push/main | Tous jobs/étapes verts : types,3 395tests,ThemeCheck30scénarios,build,Docker démarré avec worker actif | [Run40295873897](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40295873897), [SHA exact et jobs](main-333bccc8-ci-identite.json) |
| Stock, concurrence, reprise, isolation et exports sécurisés | 57/57 ; 3contre-épreuves indépendantes ajoutées temporairement puis fichier natif restauré | [Journal](main-333bccc8-cibles57.log.txt), [provenance et empreintes](main-333bccc8-cibles57-execution.json) |
| Autopilot | 7dates ×9cas =63/63, assertions et plafonds conservés | [Journal](main-333bccc8-autopilot-7jours.log.txt) |
| Migrations/restaurations fictives | 45/45/46 contrôles ; sources conservées | [dcfc13b1](migration-dcfc13b1-main-333bccc8.json), [d97e0b95](migration-d97e0b95-main-333bccc8.json), [main0a](migration-0a6aa1dd-main-333bccc8.json) |
| HTTP compilé A/B/anonyme/admin | 64contrôles, catalogue créé/sauvé, stock modifié, étranger et fichier privé inchangés | [Matrice](http-333bccc8/matrice.json) |
| Exports natifs | 17Woo/WordPress +17PrestaShop +17Shopify, tous PROVISIONAL | [51gates structurés et SHA ZIP](exports-51-resume.json) |
| Éditeur natif, produit et service | Déplacement de section visible, disposition d'en-tête, sauvegarde/réouverture ordinateur/mobile, contenus et ancienne version conservés | [Résultat](editeur-main-333bccc8/resultat.json), [produit](editeur-main-333bccc8/produit-ordinateur.png), [service](editeur-main-333bccc8/service-mobile.png) |
| Sécurité navigateur/compte/aperçu/panier | 20captures ; SMTP loopback uniquement ; iframe isolée et pont panier borné | [Résultat et vérifications](lot9/parcours.json), [captures](lot9/) |
| Higgsfield admin | 810estimations fictives ; import, confirmation groupée2modèles, actualisation et reprise ; mobile ; anonyme401 ; aucun secret renvoyé | [Résultat](higgsfield/browser-result.json), [confirmation](higgsfield/03-approbation-groupee-simulee.png) |
| APLAT | 38/38interactions ; mode non démo =1POST contrôlé sur loopback malgré double clic | [38contrôles](aplat-main-333bccc8/resultat.json), [POST local](aplat-main-333bccc8/mode-nondemo.json) |
| Pages natives des15thèmes | 347URLs/694vues : statut200, aucun JSexception/écran vide/littéralundefined ouNaN ; aucune nouvelle activité fournisseur | [Relevé exhaustif](toutes-pages/resultat.json) |

Les archives des51exports ont été réellement générées en mémoire et contrôlées ; seules leurs mesures, empreintes et gates sont conservés (`archiveStored:false`). **Aucun ZIP ici n'a été installé dans un CMS réel.** Les résultats PROVISIONAL gardent leur qualification, y compris pour les réservations.

## Captures lisibles des pages

Chaque index ci-dessous contient les PNG natifs ordinateur/mobile de **toutes les routes inventoriées**, dont les pages secondaires. Captures du premier écran après défilement complet, décodage et remise en haut ; mode mouvement réduit pour cet inventaire. Les30accueils complets et premiers écrans sont aussi dans [navigateur](navigateur/), avec [mesures après décodage](navigateur/controle-medias-cadrage.json). Les animations et actions normales sont visibles dans les vidéos séparées.

| Thème | Pages / vues | Médias source absents | Captures | Planche inspectée |
|---|---:|---:|---|---|
| fraise | 22 / 44 | 25 | [Toutes les pages](toutes-pages/fraise/README.md) | [PNG](toutes-pages/planches/fraise.png) |
| onde | 22 / 44 | 26 | [Toutes les pages](toutes-pages/onde/README.md) | [PNG](toutes-pages/planches/onde.png) |
| rive | 14 / 28 | 0 | [Toutes les pages](toutes-pages/rive/README.md) | [PNG](toutes-pages/planches/rive.png) |
| sillon | 22 / 44 | 0 | [Toutes les pages](toutes-pages/sillon/README.md) | [PNG](toutes-pages/planches/sillon.png) |
| noctil | 31 / 62 | 0 | [Toutes les pages](toutes-pages/noctil/README.md) | [PNG](toutes-pages/planches/noctil.png) |
| traverse | 13 / 26 | 0 | [Toutes les pages](toutes-pages/traverse/README.md) | [PNG](toutes-pages/planches/traverse.png) |
| heuren | 8 / 16 | 0 | [Toutes les pages](toutes-pages/heuren/README.md) | [PNG](toutes-pages/planches/heuren.png) |
| museau-club | 30 / 60 | 0 | [Toutes les pages](toutes-pages/museau-club/README.md) | [PNG](toutes-pages/planches/museau-club.png) |
| souple | 31 / 62 | 0 | [Toutes les pages](toutes-pages/souple/README.md) | [PNG](toutes-pages/planches/souple.png) |
| table-saison | 19 / 38 | 0 | [Toutes les pages](toutes-pages/table-saison/README.md) | [PNG](toutes-pages/planches/table-saison.png) |
| atelier-nuance | 27 / 54 | 2 | [Toutes les pages](toutes-pages/atelier-nuance/README.md) | [PNG](toutes-pages/planches/atelier-nuance.png) |
| parenthese | 33 / 66 | 7 | [Toutes les pages](toutes-pages/parenthese/README.md) | [PNG](toutes-pages/planches/parenthese.png) |
| phase | 36 / 72 | 26 | [Toutes les pages](toutes-pages/phase/README.md) | [PNG](toutes-pages/planches/phase.png) |
| maison-horizon | 19 / 38 | 87 | [Toutes les pages](toutes-pages/maison-horizon/README.md) | [PNG](toutes-pages/planches/maison-horizon.png) |
| aplat | 20 / 40 | 29 | [Toutes les pages](toutes-pages/aplat/README.md) | [PNG](toutes-pages/planches/aplat.png) |

**Défaut visuel réellement trouvé : FRAISE mobile.** Articles et informations légales gardent260px de padding de chaque côté à390px : largeur utile0px et titres tronqués. [PNG natif](toutes-pages/fraise/15--pages-mentions-legales-mobile.png), [mesures DOM](toutes-pages/fraise/mobile-colonne-etroite.json). CSS identique à #176 : préexistant, signalé à Claude dans [#194/6413339947](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6413339947). Le compteur de débordement global ne le voit pas ; **ces pages ne sont pas visuellement validées**. Les médias manquants n'expliquent pas cette géométrie.

Les15planches de pages et5planches d'accueils main ont été ouvertes pour inspection. Cela ne vaut pas lecture manuelle intégrale des347pages ni exercice de chaque bouton. Huit kits sont complets ; sept restent incomplets. Les routes `/cart` et `/collections/all` héritées de la base de certains thèmes de service sont inventoriées sans être présentées comme leur parcours normal. Les écrans compte/commande de démonstration et les champs juridiques « À compléter » ne deviennent pas des transactions ou mentions légales réelles.

## Trois vidéos réelles du navigateur sur main

- [Studio : catalogue, sauvegarde, aperçus](navigateur/parcours-studio-apercus.webm) — [télécharger](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/contre-verification-195-integration/reports/contre-verification-195/apres-main-333bccc8/navigateur/parcours-studio-apercus.webm).
- [Higgsfield : tarifs SIMULÉS, validation groupée, reprise](higgsfield/parcours-admin-simule.webm) — [télécharger](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/contre-verification-195-integration/reports/contre-verification-195/apres-main-333bccc8/higgsfield/parcours-admin-simule.webm).
- [APLAT : formulaire et confirmation explicitement démo](aplat-main-333bccc8/aplat-devis-demo.webm) — [télécharger](https://raw.githubusercontent.com/spacedevelopment01-max/Ecom-studio-ia/codex/contre-verification-195-integration/reports/contre-verification-195/apres-main-333bccc8/aplat-main-333bccc8/aplat-devis-demo.webm).

La vidéo Studio précède le relevé final des images lazy ; le contrôle après décodage et les captures finales font foi. Ni vidéos générées par IA, ni données de client.

## Limites et suivis ouverts

- Aucun fournisseur, prix réel de compte, génération, paiement, e-mail externe ou publication réelle. Transports amont explicitement doublés, garde réseau active ; reçus SIM préexistants des fixtures coût0/HTTP0, IDs inchangés après navigation.
- CMS réels indisponibles : Docker local plein lors de leur préparation ; Shopify de développement absent. Le Docker **du studio en CI** fonctionne ; cela ne constitue pas une installation Woo/Presta. Les14tests PHP CLI exécutés ne le remplacent pas. Achat et réservation réels après export restent non vérifiés.
-31tests ignorés : kits privés FRAISE14/ONDE11/APLAT1/Maison1, films suspendus2, vrais CMS2. Jamais comptés comme réussis.
- P2 existants : colonne FRAISE mobile ci-dessus ; menu d'une section masquée intercepté par la section suivante ; phrase du stock « jamais écrasé » trop absolue pour la fenêtre résiduelle des API Woo/Presta. Aucun de ces points n'est annoncé corrigé. Les maquettes et la transmission du stock sont conservées ; décision d'activation et suivi restent à traiter.
- Anciennes adaptations de harnais documentées : import de fixture renommée et reçus simulés désormais préchargés. Deux préparations après fusion ont aussi échoué avant le navigateur (FFmpeg Playwright, puis chemin Chromium) ; journaux de sortie1 conservés. Résolus seulement par la configuration du harnais vers les binaires système ; tests finaux verts, aucune assertion ni plafond retirés.
- Studio utilisateur réellement servi, données/médias/configuration clients : non touchés, version accessible non vérifiée. Ce rapport n'autorise aucun redémarrage/déploiement.

## Rejouer et contrôler la provenance

[Harnais de preuve](harnais/) : copies `.txt`, hors code applicatif ; runners exacts suite/auxiliaires et trois contre-épreuves stock inclus. Replacer uniquement dans une **nouvelle copie isolée du SHA ci-dessus** selon leurs imports relatifs ; jamais dans le studio client. `npm ci` avec le verrou exact, option CPU `npm_config_onnxruntime_node_install_cuda=skip` ; PHP8.4CLI isolé ; `NODE_OPTIONS=--import=<copie>/scripts/lot9/network-guard.mjs` maintenu. `CHROMIUM=/usr/bin/chromium`, `PLAYWRIGHT_BROWSERS_PATH=/tmp/ecs-195-playwright-cache` (FFmpeg système lié dans ce cache), Chromium explicite. Serveur web seul, loopback3192, données fictives dédiées, aucun worker ; amont Higgsfield sous preload de simulation séparé et clé factice uniquement dans cette base de recette.

[Préparation du compte factice et propreté finale](preparation-et-proprete-finale.json) : le script de seed a reçu temporairement une garde plus stricte avant ses imports, après le build/types/suite ; copie et patch conservés dans `harnais`, puis octets natifs restaurés. Aucun code applicatif modifié.

Les journaux/processus indiquent les commandes réellement exécutées. Seul le57ciblé utilise un overlay temporaire de test, empreinté et restauré ; la suite3395 est native et non modifiée. Les31ignorés préexistent. Pas de relance de fournisseur ni de CI rouge pour masquer un problème.

[Expurgations/empreintes des rapports bruts](publication-expurgations.json) : références embarquées volumineuses compactées et capacités signées expurgées ; métriques et PNG/WebM natifs conservés. Aucune base, session, configuration ou donnée client publiée. Le [manifeste parent](../manifest.json) empreinte tous les fichiers livrés, hors lui-même. Les anciennes preuves restent attribuées à leur propre SHA dans [l'index historique](../README.md).
