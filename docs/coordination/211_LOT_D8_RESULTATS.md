# #211 — D8 : Catalogue natif piloté depuis SYNA

> Livraison technique pour revue, sous drapeau fermé. Aucun fournisseur réel ou CMS réel qualifié. #211 reste partiel.

Mission : [complément propriétaire](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/211#issuecomment-6488971173). PR #229, branche `codex/211-lot-d8-catalogue`, dépendance #228 à `03692928c7b26cd9d21220ae1ebd6aeec2ae057c`, non fusionnée. Les dépendances #208/#210 et les correctifs intégrés dans #228 sont conservés. D8 précède D9, D10 et D11.

## Version et résultat

Code effectivement testé et compilé : **7d900c13ae4f2764ca31689d9041864ce9157567**. La suite avant commit porte sur les sources hachées et figées ; leur arbre est vérifié identique au commit, puis le build et le navigateur contrôlent son SHA propre. Version documentaire : commit contenant ce rapport, distinct du code compilé. Résultat final : **parcours isolés réussis pour les brouillons, avec les limites ci-dessous ; revue et CI encore nécessaires**. CI : **[40865397854](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40865397854) encore en cours lors de la rédaction ; aucune CI finale verte annoncée**. Ce travail n’est ni fusionné, ni activé, ni servi sur le Studio habituel. Nouveau drapeau `STUDIO_CONVERSATION_CATALOGUE` désactivé par défaut et dépendant des protections conversationnelles existantes.

## Parcours réellement raccordé

Même conversation et mémoire → devis de réponse cognitive et accord → proposition structurée avec sources client → devis Catalogue local à 0 % et avant/après complet → accord distinct → job natif `agent.catalogue.change`, une tentative, IA désactivée dans l’exécution locale → création ou modification native et reçu atomiques → preuve du résultat et version acquise → aperçu privé figé et panier isolé → reconnexion et annulation distincte.

Le texte de l’assistant et le statut `done` ne prouvent pas seuls la livraison. Aucun deuxième moteur Catalogue, assistant ou portefeuille n’est créé. Les opérations payantes cognitives passent par le routeur, le Brain, les budgets et le worker existants. Dans cette recette, leur fournisseur HTTP est local et simulé.

## Corrections et fichiers

- `src/lib/orchestrator/conversation/catalogue-tool-contract.ts` : schéma strict, sources par champ, montants/devise explicites, références médias et versions ; refus des champs de publication ou de fournisseur forgés.
- `catalogue-tool-validation.ts` : propriétaire, forfait, projet produit/service, cible native, versions, données commerciales exactes, cohérence des options/SKU/stock/prix, absence de suppression implicite des combinaisons.
- `catalogue-tool-execution.ts` : devis sans mutation, préconditions revérifiées à l’accord, tâche bornée, persistance native, reçu, réutilisation, conflits et restauration. Annuler une création archive le brouillon ; aucun effacement physique.
- `src/lib/products/preview-change.ts` : simulation transactionnelle de la vraie opération native, annulée pour le devis. Refus d’un import hérité qui perdrait un SKU, inventerait une combinaison ou changerait prix, disponibilité ou médias. La lecture n’importe rien ; la reprise native éventuelle est explicitement annoncée au devis.
- `src/lib/products/catalog.ts` : projection privée optionnelle des brouillons dans les aperçus, exclusion du Site et de l’export courants.
- Routes conversationnelles Catalogue et aperçu privé : contrôle serveur des droits, versions et preuve de fichier ; panier séparé par reçu/version.
- `src/components/studio/conversation-catalogue-tools.tsx`, contexte actif et Catalogue manuel : avant/après complet, désignation native, variantes, reprise, devis et annulation ; devise réelle dans les étiquettes, sans conversion.
- `src/components/studio/tab-catalogue.tsx` : grilles imbriquées autorisant une vraie largeur mobile, sans masquer le débordement. Les tests continuent d’exiger `scrollWidth <= innerWidth`.
- `src/lib/orchestrator/conversation/intelligence-context.ts` : correction transversale du devis rendu périmé par le seul temps écoulé après un export. Le contexte conserve l’état et les preuves enregistrés, sans `idleMs`/vivacité calculés à chaque lecture. L’affichage natif de vivacité est conservé. Prix, route, budget, droits, révisions, statut réel et disponibilité du fichier restent vérifiés.
- Reçu sans résultat complet : message « résultat non prouvé », conservation des données acquises, aucune relance automatique ; absence de faux « Terminé » ou 100 %.
- Worker, registre, contexte cognitif, drapeaux et harnais raccordés aux moteurs existants. Aucun fichier de composition `theme-base/` ou `src/lib/theme/` modifié.

La vérification visuelle du candidat 21fa a aussi révélé une ligne Catalogue illisible sur ordinateur avec SYNA ouvert, et une description de brouillon absente de la fiche (accroche statique du produit principal reprise). Les commandes occupent désormais une ligne distincte. Pour une fiche sans gabarit propre, seule la copie privée d’aperçu reçoit un gabarit neutre natif et un bloc de description dynamique ; le Site enregistré, les modèles attribués et les compositions restent intacts. La conséquence est annoncée au devis. Un rendu natif négatif reproduit le défaut avant correction et un test garantit le respect du gabarit propre. Un brouillon hors du Site courant ne propose plus de lien vers sa page absente ; son aperçu privé reste dans le reçu SYNA lorsqu’il est disponible.

Autres causes corrigées : faux refus d’un nombre suivi d’un point ; cible perdue lors d’une désignation hors Catalogue ; ancien média manquant bloquant une retouche indépendante ; ambiguïté de titres ; lien après archivage menant à un produit absent ; euros affichés pour une fiche USD. Le remplacement d’un média impossible à restaurer reste refusé.

## Vérifications exécutées

- `npx tsc --noEmit` : réussi ; `D8-types-list-refresh`.
- `npx vitest run` : **3 794 réussis / 45 ignorés**, 434 fichiers réussis et 1 ignoré, 697,40 s ; `D8-full-list-refresh`. Sources hachées inchangées et arbre `5999b13f021202a1f8a882c3e4bf4667243636c0` identique au commit publié.
- `npx vitest run tests/audit-contenus.test.ts tests/conversation211-catalogue.test.ts` : **55 réussis** ; `D8-preview-security-target`.
- `npx vitest run tests/conversation211-catalogue.test.ts tests/catalogue-actif.test.ts tests/cms-catalogue-fiable.test.ts` : **62 réussis** sur la correction du rendu natif ; contrôle antérieur au dernier renforcement du test de signature.
- `npx vitest run tests/conversation211-exports.test.ts tests/conversation211-intelligence.test.ts tests/conversation211-catalogue.test.ts` : **79 réussis** pour le contexte d’export ; contrôle antérieur au dernier correctif de lisibilité/description, repris dans la suite finale.
- Diagnostic de collision de l’ancien test : réussi, données isolées, zéro fournisseur. Ce script ne modifie pas la protection cryptographique.
- Build/navigateur/export du commit propre : réussis sur `7d900c13ae4f2764ca31689d9041864ce9157567`, arbre propre : `npm run build`, `npx tsx scripts/verify-agent211-build.ts ... --catalogue-ui`, `npx tsx scripts/export-shopify-build-check.ts ...` et la relecture officielle du ZIP. Complément `npx tsx .../verify-D8-real-cart-ui.mts OUT SHA` réussi pour les vrais clics/formulaires et tiroirs/paniers, sans SDK/fournisseur. Les quatre cas conversationnels produisent 37 PNG et 7 vidéos ; le complément ajoute 6 PNG et 2 vidéos. Les 43 captures finales sont séparées des 4 captures avant correction. Les 9 MP4 gardent les dimensions, nombre d’images, cadence et durée des WebM ; échantillons RGB comparés, sans coupe, accélération ni filtre couleur.

Toutes les commandes sont exécutées dans la copie isolée, avec `NEXT_TELEMETRY_DISABLED=1` et `NODE_OPTIONS=--import=.../scripts/lot9/network-guard.mjs`. Chromium local et cache de polices isolé sont utilisés pour les recettes. Les arguments exacts, dates, codes de sortie et empreintes des journaux figurent dans `verifications.json`.

Les bases, utilisateurs, projets et illustrations sont isolés et fictifs. Les réponses du faux fournisseur sont préparées pour tester les raccordements, jamais présentées comme des preuves d’intelligence, de vision, de photographie ou de copywriting professionnel. Aucun contenu ni média client publié. **Zéro appel fournisseur réel et coût réel nul.** Les coûts simulés sont détaillés séparément dans les preuves, sans assimilation à une facture. Les générations HTTP et tokenisations sont distinctes : le compteur de tokenisations conservé à la fin du tronc initial ne couvre pas tout le sous-parcours D8 ; aucun total de tokenisations D8 n’est inventé.

Parcours : mono-produit, véritable catalogue multiproduits avec deux fiches actives préexistantes et nouveau brouillon à deux variantes, activité de services et cas inédit. Ordinateur et téléphone ; création, titre corrigé par ID/version, conservation des variantes, ruptures et quantité maximale, stock inconnu, vraie fiche/panier natifs, reconnexion, historique, annulation et export courant. Compte étranger, CSRF et champ de publication forgé sont refusés. Panne de réponse HTTP simulée et résultat de tâche fictivement corrompu sont distingués : aucun acquis effacé, aucune relance automatique.

Les prix inconnus restent inconnus ; un stock non suivi n’est pas présenté comme une quantité confirmée. Le dollar est contrôlé par une fiche supplémentaire créée via l’API native de recette, pas revendiquée comme création cognitive de ce scénario. La création conversationnelle USD a son test natif distinct.

## Échecs conservés et corrections reproduites

Les premières suites interrompues ne sont pas comptées comme réussies. Les premières recettes ont révélé : mauvais ordre du harnais après fermeture du drapeau, attente d’un ancien reçu, vrai débordement Catalogue de 424 puis 403 px sur écran 390 px. Attente de l’ID confirmé et assertions de version conservées ; grilles corrigées et navigateur rejoué sans injection DOM.

Sur le candidat `25e11d285c59f672b98f4a55a5ef05846c98ee36`, la largeur mobile était corrigée mais le devis de réponse suivant un export retournait HTTP 409 avant tout fournisseur. Cause : `publicJob.idleMs` changeait l’empreinte au seul passage du temps. Deux tests échouaient avant correction (empreinte et vraie confirmation après +2,1 s), puis passent ; un vrai changement de tâche ou de fichier invalide toujours le contexte. Les 79 tests ciblés exports/intelligence/catalogue ont passé avant la suite complète. Les traces négatives restent disponibles.

Un diagnostic antérieur injectait temporairement des classes DOM pour isoler le problème de grille : il reste explicitement un diagnostic, jamais une preuve de la correction native. Les captures finales proviennent du nouveau build exact sans cette injection.

La suite complète suivante a révélé un défaut aléatoire d’un ancien test de signature d’aperçu : 3 793 tests réussis, un échec à la ligne qui remplaçait la fin de la signature par « xx ». Cette transformation pouvait conserver la clé valide. Reproduction isolée : une clé ayant cette terminaison est trouvée après 467 tentatives bornées ; l’ancienne « altération » est identique et acceptée, une clé réellement différente est rejetée. Aucune clé exportée et aucun appel IA. Le test change désormais systématiquement un caractère et vérifie explicitement que la clé diffère ; contrôles de propriétaire, échéance et projet conservés. Aucun code cryptographique modifié, aucune assertion supprimée. La suite est rejouée après ce renforcement.

La recette du candidat `75a92a235eaf95f423543de63e90bfecbf2aff64` passe tous les scénarios préparés et les vrais clics de panier. L’inspection de ses captures découvre cependant une liste Catalogue restée sur l’ancien titre alors que le reçu affiche v2. Une nouvelle assertion navigateur reproduit ce décalage sur ce compilé : la mutation native est acquise mais la ligne attendue n’apparaît pas. Cause : la carte recharge l’aperçu général du projet, pas le `useApi` indépendant des produits. Correction : une notification de relecture au reçu livré, limitée au même `projectId` ; la liste relit son API native. Les formulaires ouverts ne sont pas réinitialisés. Un test navigateur sous `tests/catalogue211-ui-refresh.ts` contrôle réellement la ligne après application et restauration, et son retrait après archivage. Aucune écriture supplémentaire, aucun moteur parallèle. La suite et le navigateur sont rejoués après ce raccordement.

## Export Shopify et 35 avertissements

Sur le compilé propre `7d900c13ae4f2764ca31689d9041864ce9157567` : HTTP 200, ZIP de **8 498 069 octets**, SHA256 **`9dfec228ae3b1994b78e6d3465ba01e4fa3528942cbea4097a9b0372bdd17a7f`**. Contrôle officiel réellement exécuté : **0 erreur /35 avertissements**. Le fichier effectivement sauvegardé est retrouvé dans la base isolée en lecture seule ; ses octets et son empreinte sont revérifiés, puis ce ZIP exact est extrait sans traversée de chemin et contrôlé une seconde fois. Aucun appel IA, usage ni job dans cette recette d’export direct. Les 35 constats actuels sont aussi comparés à I1, sans utiliser son ancien rapport comme preuve du contrôle présent.

Theme Check est exécuté réellement depuis l’export HTTP du Studio compilé, puis le ZIP exact est relu par le vérificateur officiel natif. Les avertissements sont examinés un par un : 25 `ExcessiveSettingsCount` (45 à 85 réglages, seuil indicatif 40), 6 `UnusedAssign`, 1 `RemoteAsset` (source initialement vide du zoom produit remplie par JavaScript), 2 `UnclosedHTMLElement` dans des branches conditionnelles du formulaire, 1 `LiquidComplexity` (121 contre seuil 120). Aucun contrôle, section ou réglage n’est retiré pour les faire disparaître. Les limites HTML conditionnelles et d’édition restent signalées ; elles ne sont pas qualifiées sur une instance CMS réelle.

Une fiche Catalogue, un produit Shopify, un gabarit et un ZIP sont des objets distincts. L’export du Site courant exclut le brouillon de recette ; ce test ne prouve ni import/synchronisation de produits, ni affectation de modèle, ni installation ou édition réelle dans Shopify. Les autres connecteurs/kits sont inchangés : leurs limites natives restent applicables.

## Périmètre et limites restant à lever

- Écriture des brouillons seulement ; fiches actives lisibles. Pas de publication, activation, suppression physique, synchronisation distante, paiement ou commande réels.
- Maximum 100 combinaisons par opération. Le retrait d’anciennes combinaisons est refusé ; ajout et annulation possibles si les IDs initiaux restent restaurables.
- Collections dérivées des catégories, sans éditeur libre de collections/gabarits. SEO non vide ; effacement SEO et prix barré de variante non raccordés.
- Politique de stock conservée, pas modifiée. Aperçu privé des précommandes non qualifié, donc refusé. Stock distant non vérifié.
- Données non EUR conservées sans conversion, aperçu/panier explicitement indisponibles car le renderer existant affiche l’euro. Ne pas transformer cette limite en faux prix.
- Lecture paginée à 50 fiches, index médias borné à 30 ; détail de la fiche/variante désignée. Héritage sans identifiant natif annoncé, aucun pseudo-ID.
- Sources littérales de la dernière demande : pas de rédaction commerciale libre ni reprise sémantique générale de tous les faits anciens. Les changements concurrents conservent les acquis mais interdisent une annulation automatique qui écraserait la nouvelle version.
- Services préservés comme services ; prestations/devis/RDV natifs restent distincts et ne sont pas raccordés par D8.
- Rendu de recette issu du profil technique des tests, sans qualification visuelle des quinze maquettes modernes ou d’une création professionnelle. La compatibilité de l’aperçu privé avec toutes leurs fiches spécialisées n’est pas démontrée dans D8. Les compositions de Claude sont préservées par l’absence de modification de leurs fichiers. La marque technique et le catalogue préexistants de la fixture restent visibles : ces illustrations et phrases ne sont pas présentées comme un résultat client ou une refonte de marque.
- Fournisseur réel, qualité cognitive/créative, coûts facturés et CMS réel non qualifiés. Aucun test réel autorisé pour ce lot.

D9 images/identité, D10 vidéo/audio, D11 publications/campagnes, comparaisons génériques/mélange et création réellement sans thème restent à réaliser. D8 est un incrément Catalogue, pas la clôture de #211.

## Consultation des preuves

- [Galerie et téléchargements](preuves-211-D8/README.md) : 43 PNG finaux originaux, 4 constats avant correction et 9 MP4.
- [Commandes, dates, résultats et comparaisons vidéo](preuves-211-D8/verifications.json).
- [Parcours conversationnels et preuves natives](preuves-211-D8/traces/parcours.json).
- [Vrais clics panier complémentaires](preuves-211-D8/traces/clics-panier.json) et [script réellement exécuté](preuves-211-D8/traces/recette-clics-panier.mts).
- [35 avertissements détaillés et appréciation de leurs limites](preuves-211-D8/avertissements.json).
- [Empreintes des preuves](preuves-211-D8/empreintes.json) et [couverture des 51 opérations](211_D8_COUVERTURE.md).
- [Protection des sources de thèmes, commerce et droits](preuves-211-D8/traces/protection-sources.json).

Les dix appels de génération HTTP de la recette principale sont simulés, dont un échec 503 ; dix lignes `ai_calls`, neuf usages et **71 208 micro fictifs**. Le complément de clics ne fait aucun appel fournisseur, aucune ligne `ai_calls`/usage/réservation. Les tokenisations ne sont pas additionnées comme des générations. **Coût fournisseur réel : 0 €**, aucune facture qualifiée.

Le commentaire de livraison dans la PR #229 indique le SHA documentaire effectivement publié et le résultat réel des contrôles de présence et de retéléchargement. Les suites interrompues/échouées restent distinguées dans l’historique ; leurs résultats ne sont pas présentés comme des réussites finales.

Le contrôle de publication (fichiers, tailles, empreintes et échantillons retéléchargés) est distinct des tests locaux ; consulter son état effectif dans la PR #229. Aucun merge, main, déploiement, activation, redémarrage du Studio réel, nouvelle clé/service/connexion, modification de VANS étape 1, Contretemps, données, droits, forfaits ou plafonds. Les limites de 40 % de l’abonnement HT et 50 % d’une recharge HT restent inchangées.
