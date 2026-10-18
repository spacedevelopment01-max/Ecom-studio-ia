# Parcours amont — résultats et remise pour vérification

Mission : [commentaire 6251627651 de la PR #136](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/136#issuecomment-6251627651). Nouvelle PR : **[#138](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/138)**, branche `codex/parcours-amont-projet`, vers `main`. Aucun merge ni déploiement.

## Version et périmètre

Base distante vérifiée : **ad41c596e859781f33874730891b4bd8b85e259e**. Code final testé : **70924680ea11592220c9965a142fb3335845c5ed**. Les commits de preuves et de rapport suivants ne changent pas ce code. Les PR #133, #134 et #136 non fusionnées ne sont pas embarquées. Les thèmes, sections, démos, styles et fichiers publics réservés à Claude sont préservés ; aucun nouveau fournisseur, connexion ou forfait réel n’a été créé.

Le nouveau parcours s’arrête aux **données prêtes pour composer un thème**. Il ne construit ni thème client, ni page publiée, ni installation CMS. La suite historique de tests continue à exercer ses rendus fictifs dans des dossiers temporaires isolés.

- [Matrice de l’existant et des raccordements](PARCOURS_AMONT_MATRICE.md)
- [Point exact de reprise des exports, PR #136](REPRISE_EXPORTS_PR_136.md)
- [Index des captures, vidéos, données et reproduction](../../reports/parcours-amont/README.md)

## Corrections et preuves

Les mentions **REPRODUIT — simulation** désignent de vrais traitements locaux, avec réponses fournisseurs injectées ; elles ne certifient aucune création IA réelle.

| Constat corrigé | Conséquence et comportement livré | Fichiers / fonctions | Preuve et qualification |
|---|---|---|---|
| La création déclenchait le pipeline complet jusqu’au thème et aux contenus suivants. | Le nouveau projet ouvre une préparation persistante ; aucune génération n’est lancée pour remplir un écran. L’ancien parcours explicite reste disponible pour la compatibilité. | `project-start`, routes création et `/start`, `startPreparation`, `home`, `TabPilote` / `TabPreparation` | **CONFIRMÉ DANS LE CODE** ; **REPRODUIT — navigateur et simulation** : saisies produit/service, seuls jobs `project.prepare`, aucune version de thème dans la base de preuve. |
| Des consignes libres ne servaient qu’à déterminer l’intention SEO ; des branches spécialisées d’image ignoraient les compléments. | Texte exact, cible, contraintes et lien restent distincts du résumé. Les moteurs reçoivent les consignes complètes ; le cache tient compte de leur changement. | `exactInstructions`, SEO `ContentBrief`, `buildBrief`, `writePrompt`, `runKey` ; Image V2 `generationPrompt` / `briefHash`, découverte Logo V2 | **CONFIRMÉ DANS LE CODE**, **REPRODUIT — tests injectés** : marqueur en fin de consigne de plus de 10 000 caractères retrouvé dans les prompts texte, image et logo. Pas de preuve d’acceptation par un fournisseur réel. |
| Recherche et validation d’une stratégie n’étaient pas reliées au début du parcours. | Sources lues avec URL/date/extrait, observations citées, trois hypothèses distinctes, arguments, objections et recommandation. Le client choisit ; aucune validation sans source exploitable. | `researchProject`, `analyzeResearch`, `validateResearch`, `strategyOf` | **CONFIRMÉ DANS LE CODE**, **REPRODUIT — simulation**. Citations inventées, sources absentes et positionnements identiques refusés. **OBSERVÉ DANS LES JOURNAUX** : accès web réel bloqué par DNS sur les deux adresses essayées. |
| Marque proposée et identité définitive pouvaient se confondre. | Proposition séparée ; validation du nom, slogan, palette, polices et règles avant logo ; choix du logo avant validation complète. Disponibilité juridique et domaines indiqués non vérifiés. | `realDependencies.identity`, `confirmIdentity`, `approve`, adaptateur `runLogoEngineV2` | **CONFIRMÉ DANS LE CODE**, **REPRODUIT — simulation**. Aucun appel de choix de logo susceptible de modifier un thème. Logos refusés/provisoires exclus des candidats finaux du parcours. |
| Prestations ou pages de même nature pouvaient partager un contexte trop large. | Cible de page explicite, prestation isolée, plan pages/sections/visuels. Une correction peut ne concerner qu’une page ; les autres documents restent identiques. | `sitePlan`, adaptateur `contents`, `ContentRequestV2.target`, SEO V2 | **REPRODUIT — tests** : deux prestations distinctes et correction de `service:1` sans refaire les autres ; contrat produit sans page de prestation, contrat service sans imposer panier ou stock. |
| Un document édité à la main pouvait rester provisoire malgré une affirmation inventée. | Validation amont refait les contrôles fatals/bloquants, compare la dernière version enregistrée et conserve les versions du client. Un résultat local après échec d’une rédaction payante ne devient pas un succès IA silencieux. | `approve(content)`, `refresh-content`, `latestContent`, adaptateur SEO existant | **CONFIRMÉ DANS LE CODE**, **REPRODUIT — tests** : affirmation/statistique inventée refusée même avec verdict PROVISIONAL après édition. |
| Une photo avec une personne ne constitue pas une autorisation générale. | Pas de personne ajoutée par défaut ; permission enregistrée par emplacement. Références originales, `noStock`, contrôle FINAL des générés et vérification client avant affectation. | `VisualSlot`, `setPeopleConsent`, `assignMedia`, Image V2 `peopleAllowed` | **CONFIRMÉ DANS LE CODE**, **REPRODUIT — tests** : média d’un autre projet, stock, rejet fatal et ancienne identité exclus ; permission d’un emplacement non transmise aux autres. Pas de certification visuelle IA réelle. |
| Une reprise pouvait perdre des données ou refaire une production utilisable. | Instantanés immuables, conflit de révision, obsolescence de la suite sans suppression. Réutilisation si les entrées correspondent ; images conservées pour nouvelle vérification après correction des textes. Le contrat courant est invalidé à chaque mutation. | `commitState`, `inputHash`, `invalidateAfter`, `restoreForReview`, `assertFresh`, `readyContract` | **REPRODUIT — tests et navigateur** : rechargement, changement de cible, restauration, mêmes documents et mêmes médias, sans demande de génération. |
| Après rechargement, la stratégie affichée pouvait différer de celle renvoyée à la validation. | L’interface réutilise le choix enregistré, restaure les champs/choix/logo et repart à l’offre pour revue. Les saisies non enregistrées ne sont plus ignorées lors d’une confirmation ou d’une création. | `TabPreparation.approve`, `restore`, état du logo, contrôles des champs modifiés ; `Slot` | **REPRODUIT — navigateur avant correction** sur `853cb45` : radio `transparence` cochée, `usage` enregistré. **REPRODUIT — navigateur après correction** : stratégie, textes et médias identiques après restauration, zéro demande `quote`/`generate`. |
| Le nouveau démarrage devait préserver les coordonnées déjà connues. | Champs nouveaux non vides prioritaires ; coordonnées existantes conservées dans le brief, puis propagées après confirmation. Le forfait actif reste obligatoire, y compris pour l’administrateur. | `startPreparation`, `mergeServiceProfile`, route `/start`, `coordonnees-demarrage.test.ts` | **REPRODUIT — test de vraie route HTTP** : champs vides sans effacement, nouvelle zone enregistrée après validation. Le test a reçu un abonnement synthétique au lieu de contourner le refus 402. |
| Un statut de tâche terminée ne prouve pas qu’un projet est prêt. | Tâche achevée = proposition disponible ; étape « à vérifier » jusqu’au choix client. Contrat disponible seulement si les cinq validations, versions et médias sont cohérents. Le téléchargement est réellement testé. | `project.prepare`, `blockers`, `readyContract`, API/UI | **REPRODUIT — navigateur** : contrat téléchargé strictement identique au GET, puis indisponible après changement amont. Le badge global ancien du site reste distinct de la progression amont. |

## Protections conservées

**CONFIRMÉ DANS LE CODE** : configuration sécurisée existante, droits du projet, réservations et traçage natifs. Plafond fournisseurs de l’abonnement **40 % du mensuel HT**, recharges séparées **50 % HT**, sans enveloppe ajoutée ni passe-droit administrateur. Les moteurs réels restent ceux du studio.

Le serveur calcule et conserve le devis avec révision, empreinte, plafond et expiration de quinze minutes. Une action payante demande sa confirmation. Les préparations locales sont annoncées comme locales et s’exécutent sous interdiction d’IA payante. Précontrôle à la mise en file, nouveau contrôle à l’exécution, clés d’idempotence et checkpoints existants ; au plus deux demandes pour les mêmes données/action/emplacement, correction exigée pour la seconde, `maxAttempts=1` pour éviter une relance automatique après erreur incertaine.

**REPRODUIT — tests** : double requête, devis périmé, tâche en pause, modification pendant l’attente, forfait résilié et budget insuffisant n’ajoutent pas de nouvelle création. Les reprises internes natives restent bornées par leur budget et leurs protections existantes.

**REPRODUIT — navigateur** : un devis de logo a été refusé avec HTTP 422 parce que les tarifs n’étaient pas confirmés. Aucune tâche ajoutée, choix conservés. Pour les films réussis, la date de tarifs est déclarée fictivement dans le seul processus de test, avec clés fictives et réponses injectées ; ce n’est pas une validation des vrais tarifs fournisseurs et aucune protection de production n’est retirée.

## Vérifications exécutées

Code testé : **70924680ea11592220c9965a142fb3335845c5ed**. Les commandes et sorties utiles sont indexées dans [validation.json](../../reports/parcours-amont/validation.json).

| Commande | Résultat réel |
|---|---|
| `npx vitest run tests/preparation.test.ts tests/preparation-adapters.test.ts tests/preparation-analysis.test.ts tests/coordonnees-demarrage.test.ts --maxWorkers=4` | 24 tests ciblés réussis, fournisseurs simulés. |
| `npx vitest run --maxWorkers=4 --reporter=dot` | 1 898 réussites, 3 tests ignorés (PHP indisponible), 258 fichiers réussis ; 660,05 s. |
| `npx tsc --noEmit` | Réussi, sortie vide. |
| `DATA_DIR=<dossier isolé> npm run build` | Réussi ; build Next.js de production local. |
| `scripts/preparation/test-harness.ts seed / worker / proof` | Base, comptes et abonnements synthétiques, vraie file et vraie persistance ; seules dépendances fournisseurs injectées. Aucun appel IA réel. |
| `scripts/preparation/browser-proof.ts` | Produit et service : saisie, analyse simulée, recherche, choix, identité/logo, textes, médias, téléchargement, rechargement, mobile et changement amont. 0 erreur JavaScript sur les pages ordinateur instrumentées ; 0 px de débordement horizontal à 390 px. |
| `scripts/preparation/restoration-proof.ts` | Reprise des versions utilisables par les boutons, choix/texte/médias préservés, champs non enregistrés bloqués, autorisation non enregistrée non utilisée pour générer, téléchargement cohérent, zéro demande de génération. |
| Deux cas ajoutés après gel de la conception | Kit de tissage « Fibre Atelier » et entretien d’orgues « Grain de Son » : contrat prêt, aucune règle spécifique à leur nom. Sources/réponses simulées ; [données](../../reports/parcours-amont/donnees/cas-nouveaux.json). |
| Lecture web réelle via `importLink` | Échec DNS `EAI_AGAIN` pour Bing RSS et `www.rhodia.com` ; [preuve](../../reports/parcours-amont/donnees/lectures-web-reelles.json). Aucune source réelle prétendue consultée. |

Une première suite a détecté le test de démarrage sans forfait ; elle n’est pas présentée comme validation finale. Trois tests de parité/calendrier PHP sont ignorés car PHP n’est pas disponible dans cet environnement. Les journaux généraux bruts peuvent contenir des jetons de **test** des anciens scénarios ; seul leur résumé sans données sensibles et leur empreinte sont publiés.

**Coûts réels : 0 appel IA payant, 0 dépense fournisseur.** La base navigateur contient zéro appel IA enregistré, zéro réservation fournisseur et zéro thème : voir [preuve de persistance](../../reports/parcours-amont/donnees/persistence-proof.json). Les tests simulés ne vérifient ni l’authentification d’un vrai fournisseur ni la facture réelle d’une génération.

## Contrat de données et reprise par le moteur

Les contrats JSON fournis sont ceux réellement téléchargés dans l’interface, pas des exemples rédigés à la main. Ils contiennent le brief exact, profil, prestations/contact, stratégie choisie, marque/logo, documents complets, pages/sections prévues, affectations média, sources et identifiants/date des validations. Les données de test portent explicitement `provenance: simulation`.

La validation projette les données dans les structures déjà utilisées : produit, services, stratégie et marque du projet ; `content_documents` versionnés ; `shop_copy` de liaison ; assets du projet ; artefact `project.ready_for_theme`. Le consommateur doit appeler **`readyContract(projectId)`** et traiter un retour `null` comme un blocage, plutôt que faire confiance à une copie ancienne de l’artefact. Les chemins des pages sont des destinations **prévues**, pas des URL déjà publiées.

Les textes complets restent dans les documents. Le kit `copy` conserve la forme du moteur actuel : certains champs de liaison sont locaux ou à compléter. Il ne constitue pas une validation commerciale indépendante de toutes les futures sections. La reprise des thèmes doit vérifier leur consommation exacte et ne pas promouvoir ces champs locaux en promesses finales non vérifiées. Aucun rendu final ou export CMS n’est certifié par ce lot.

## Limites et contrôles restant à faire

- **Accès réels** : aucun accès fournisseur réel ni budget de génération réelle n’a été engagé. Vérifier les tarifs, les routes réellement utilisables, l’authentification, les résultats et la facturation dans l’environnement autorisé avant toute conclusion de qualité professionnelle.
- **Recherche** : lecture réseau réelle bloquée par DNS. Vérifier la recherche RSS, la lecture anti-SSRF et l’analyse sur des concurrents accessibles. Les extraits stockés sont bornés à 1 800 caractères ; les propositions locales sont des hypothèses, pas une étude exhaustive du marché.
- **Qualité métier et créations** : les images et logos des preuves sont volontairement synthétiques et signalés. Les inférences locales, la pertinence d’un positionnement et la qualité commerciale/visuelle doivent être contrôlées avec de vrais résultats. Aucun avis, certification, domaine disponible ou résultat commercial n’est déclaré vérifié.
- **Étendue fonctionnelle** : contrat v1 centré sur une offre produit principale ou plusieurs prestations. Le catalogue existant n’est pas effacé ; la préparation complète d’un catalogue multi-références reste à éprouver. L’import complet d’un ancien site n’est pas certifié par son analyse comme source.
- **Versions** : les instantanés sont conservés ; l’interface expose les 80 dernières révisions. Une navigation paginée vers les versions plus anciennes n’est pas livrée.
- **Thèmes et CMS** : aucun thème client nouveau, aucune installation Shopify/WooCommerce/PrestaShop/Wix/Squarespace et aucune publication n’ont été exécutés dans cette mission. Fidélité de composition, affichage de tous les textes/sections, interactions, exports et édition native restent au point de reprise de la PR #136.
- **Tests ignorés** : les trois contrôles PHP nécessitent un environnement PHP ; ils ne sont pas assimilés à des réussites.

## Arrêt et prochaine vérification

Le code, les tests, la matrice, les contrats et les preuves sont remis dans la PR #138 pour vérification. Le point de reprise des exports reste **5dedf9993ac77d5cb95dbb539215694d892c55de**, code des ZIP installés **3ecdcef4e21d8f3912910a6a50c04c4cfbcde973**. La PR #136 n’est ni fusionnée ni remplacée.

Avant reprise des thèmes : faire valider le parcours, puis exécuter un produit et un service avec les seuls accès/budgets explicitement autorisés, contrôler humainement sources, marque, rédaction et fidélité des médias. Garder au moins deux activités nouvelles hors des exemples de développement. Comparer le contrat et le contenu consommé par le moteur, puis seulement reprendre le lot thèmes/exports en coordination avec Claude. Aucune règle ne doit dépendre d’un nom de démonstration.
