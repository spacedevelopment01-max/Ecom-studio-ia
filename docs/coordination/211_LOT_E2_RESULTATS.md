# #211 — E2/F2 : composition native dans le même SYNA

Livrable de revue dans **PR #218**, branche `codex/211-lot-e2-syna-composition`, parent E1 #217 `26c082bf8e4f92878909b27eafb2be0f39053660`. **Code effectivement compilé et servi propre : `c384e53b336c0c52500c3395cc067d6574abaa69`**. Le commit de livraison suivant ajoute seulement ce rapport et les preuves. Aucun merge, déploiement, activation, redémarrage du Studio réel, appel fournisseur réel ou modification client/démonstration.

[Galerie : 43 captures, 8 vidéos, 8 ZIP](preuves-211-E2/README.md). Les liens relatifs ouvrent les fichiers effectivement publiés avec ce rapport.

## Résultat vérifié

La conversation SYNA existante propose un plan de composition strict : composants du catalogue natif autorisés, dispositions réelles, textes entiers acquis et médias de la bibliothèque du projet. Le client consulte le plan, accepte un devis local à **0 % supplémentaire**, puis le vrai worker enregistre une version native. Le même dialogue montre le reçu, le grand aperçu affiche la section, la reconnexion retrouve les acquis et l’annulation crée une nouvelle version sans supprimer l’historique. Aucune seconde mémoire ni second moteur.

Quatre recettes Chromium complètes : filtre à café, outils de reliure/catalogue, entretien de pianos, cartographie de sentiers. L’activité exacte est enregistrée dans SYNA avant l’acquisition du thème ; la demande suivante porte sur sa composition, sans remplacer la description canonique. Le cas cartographie élargit le domaine ; ce n’est pas une évaluation aveugle indépendante d’un vrai modèle, car ses réponses sont simulées.

Pour chaque projet : demande libre → devis IA fictif/accord → proposition structurée → devis/accord local distinct → vrai job/version V2 → section réellement visible dans l’iframe, texte entier et image décodée → page complète 1440/1024/390/360 px → export Shopify avec octets de l’image identiques à ceux du rendu → reconnexion sans nouvel appel → annulation V3 identique à la V1. Les autres modèles, groupes et données du thème restent identiques. Huit jobs d’application/annulation réussis, aucune réservation IA associée.

Produits : variante Grand, quantité 2, ajout réel au panier d’aperçu, `cart.js` = 2 articles / 29 800 centimes. Aucun passage au paiement. Services : navigation vers le véritable lien « Demande de devis », champs requis/choix/consentement remplis, clic d’envoi ; le mode aperçu affiche son avertissement et **n’envoie aucun POST de contact**. Cela ne prouve ni un envoi CMS ni un rendez-vous enregistré. RDV non testé dans cet incrément.

## Deux causes corrigées

1. **Contexte utile trop volumineux, reproduit avant appel** : les schémas de composants répétaient leurs définitions ; le cas service dépassait les 160 000 caractères. `composition/catalog.ts` factorise sans perte les définitions répétées ; chaque champ, bloc, option et borne est reconstitué strictement à l’identique par le test, toutes les sources restent présentes. Cas mesuré : 142 405 caractères après correction. Aucun relèvement de plafond ni troncature des informations client.
2. **Plan invalide présenté comme panne générique** : `assemble.ts` lançait une erreur ordinaire, transformée par le serveur en 500 et invitation à réessayer. `CompositionPlanError` distingue ce refus attendu ; `server.ts` convertit uniquement cette classe en erreur native lisible `agent_composition_invalid`, HTTP 422. Les véritables erreurs internes restent des erreurs. Le navigateur reçoit effectivement 422 pour une source forgée ; le message apparaît dans SYNA, aucun nouveau job/version ni retry, V3 conservée. Test français/anglais.

## Code concerné

- `src/lib/theme/composition/{catalog,presentation,contract,assemble,server}.ts` : catalogue natif, contexte compact sans perte, comparaison lisible, refus précis.
- `src/lib/orchestrator/conversation/{intelligence-contract,intelligence-context,theme-tool-execution,tool-execution,tool-flags}.ts` : proposition de composition, mêmes devis/confirmation/worker/permissions/version/reçus que D2.
- `src/components/studio/conversation-theme-tools.tsx` : plan et avant/après dans la conversation unique, qualité à contrôler, liens et annulation.
- `scripts/composition211-ui-fixtures.ts`, `scripts/verify-agent211-composition-ui.ts`, extension `scripts/verify-agent211-build.ts --composition-ui` et CI : recettes fictives, véritables routes/SDK/worker/navigateur, toutes les étapes CI antérieures conservées.
- `tests/composition211-syna.test.ts` : raccordement et garde-fous natifs ; tests E1 et D2 conservés.

Drapeau `STUDIO_CONVERSATION_COMPOSITION=1` requis en plus de ceux de D2 ; fermé par défaut. Propriétaire/forfait/CSRF, révisions attendues, sources/scopes et verrous recontrôlés. Une simple réponse IA ou HTTP 200 ne vaut pas résultat livré. Le plan enregistré porte `quality=not_measured`, `platformInstallation=not_tested`.

## Commandes réellement exécutées

Dans la copie isolée, sans `.env` client, avec sélecteurs temporaires et garde réseau loopback :

```bash
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx vitest run
npx vitest run tests/composition211-plan.test.ts tests/composition211-server.test.ts tests/composition211-syna.test.ts tests/conversation211-theme-tools.test.ts
npx tsc --noEmit
XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 npm run build
CHROMIUM=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=/tmp/ecom211-playwright XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx tsx scripts/verify-agent211-build.ts /tmp/ecom211-E2-delivery2 --composition-ui
scripts/verify-theme.sh --rapide
```

Suite finale : **3 659 réussis, 45 ignorés**, 423 fichiers réussis/1 ignoré, 716,85 s. Empreintes des 15 fichiers applicatifs/tests gelés identiques après exécution. 50 ciblés/4 fichiers réussis, 8,75 s. Types et build propre réussis. Le premier lancement de build a rencontré l’écriture de télémétrie Next dans un répertoire non accessible ; le build a été relancé avec la télémétrie désactivée, sans changer le code. Contrôle thèmes : 24 cas + ZIP, aucune erreur, **35 avertissements préexistants conservés** ; aucune section de démonstration modifiée. Les détails/empreintes de logs sont dans [verifications.json](preuves-211-E2/verifications.json).

Le véritable SDK parle uniquement à un faux fournisseur HTTP local : **8 appels simulés, 8 usages, 63 296 micro de coût fictif enregistré ; 0 appel fournisseur réel, coût réel 0 €**. Ce montant fictif ne mesure ni la facture réelle ni la qualité des modèles.

## Captures, critique et exports

43 PNG originaux ouverts : neuf planches couvrant 132 segments de pages, plus originaux clés ; huit vidéos réelles transcodées seules en MP4, sans coupe/accélération, comptes d’images et durées comparés, 24 images réparties effectivement inspectées. Les pages entières et leurs limites sont conservées ; aucun masquage des défauts de la base. Le nouveau composant est visible, texte complet, légende de l’illustration entière. Une première recette avait choisi un cadrage portrait coupant la légende ; la proposition de recette utilise désormais l’option native paysage, suivie de recaptures. C’est une correction du plan simulé, pas une preuve de critique autonome par IA réelle.

Les visuels sont des **diagrammes techniques fictifs**, étiquetés comme tels, jamais des photos client, des personnes ou des générations IA. Les bases existantes de recette conservent notamment un placeholder d’image, des rubriques d’avis/informations « à compléter », de longues sections et un grand pied de page. Elles **ne sont pas qualifiées comme sites professionnels terminés**. Aucun changement des compositions de Claude.

| Plateforme | Vérifié ici | Limite conservée |
|---|---|---|
| Shopify | Quatre ZIP natifs via la route compilée, contrôles natifs, textes et octets médias vérifiés | Aucun CMS installé, affectation distante/paiement non testés |
| WooCommerce | ZIP mono via route native, HTTP 200, verdict PROVISIONAL | Portée native `static`, aucune installation ni dynamique qualifiée |
| PrestaShop | Idem | Portée `static`, aucune installation/module/stock distant qualifiés |
| Wix / Squarespace | Kits mono téléchargés et inspectés | Kits statiques, pas de thèmes CMS installables |

## État de la mission et suite

**Terminé pour cet incrément :** raccordement technique de composition acquise à SYNA, version/annulation, source client conservée, contrôles navigateur/ZIP et erreurs honnêtes. **Non qualifié :** compréhension/copywriting/design d’un fournisseur réel, créativité professionnelle, téléphone physique/Safari, RDV, envoi de formulaires et installations CMS. Aucun mode sur-mesure sans base ou thème importé annoncé : non raccordés. Les nouvelles rédactions qualifiées et la boucle de QA native restent à développer.

Dépendances en ordre : #208/#210 → #212 → #213 → #214/#215 → #216 → #217 → #218. Ce graphe décrit une intégration à revoir, pas une fusion autorisée. #211 reste ouverte ; suite dans des PR ciblées : export natif depuis SYNA (D3), puis création/rédaction/QA et autres domaines encore non raccordés. Aucun changement dans `main` ou le Studio réellement accessible.
