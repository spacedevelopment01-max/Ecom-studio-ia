# Suivi indépendant #195 — PR198 / PR199 / PR200

**Dernier contrôle : [APRÈS fusion réelle d2fb63ee :3405tests,parcours compilés et CI entièrement verts](apres-main-d2fb63ee/README.md).**

**Verdict AVANT : ACCORD POUR FUSION pour chacune des trois têtes ci-dessous, CI verte. Claude seul opérateur. Contrôle du vrai main final d2fb63ee terminé favorablement ; voir les preuves APRÈS ci-dessus. Aucun appel API fournisseur réel.**

| PR | Tête effectivement contrôlée | Verdict | Preuves |
|---|---|---|---|
|198 — FRAISE mobile | `44546ab98b44fac4823e41eccbb4c4b034979f51` | Favorable |8tests natifs réussis dont3nouveaux,14ignorés kit privé ; types0 ; navigateur184captures,26pages,10pages ciblées ; [résultat](fraise/resultat.json) |
|200 — texte du stock | `e005414cb8edbe9fa85faa2bdbc0b0c5011fcc48` | Favorable |33tests natifs réussis dont4libellé ; types0 ; FR/EN à1440/390,bloc fermé/ouvert,8PNG ; [résultat](stock/resultat.json) |
|199 — menu section masquée | `d63bba1127a8487c426d5b2259ff36a9bbfaba06` | Favorable |3tests natifs réussis ; types0 ;8déplacements normaux enregistrés en base à1440/390/360/768,contrôle hit-test,4témoins7/7,pas de JSexception ; [résultat](menu/resultat.json) |

[SHA, bases, vrais runs CI et checkouts temporaires](sha-et-ci.json). Sources suivies propres, dépendances exactes et données fictives : [provenance et préparation](proprete-et-environnement.json). Les tests lisant le source ne remplacent pas les parcours navigateur, exécutés séparément ici. Les résultats antérieurs333bccc8 ne sont pas rebaptisés sur ces nouvelles têtes.

## FRAISE : résultat visuel et non-régression

Les pages viennent des exports statiques du vrai moteur (`reference-static-preview.ts --only=fraise`), avant333bccc8 puis candidat44546ab9. Aucun HTML ou média fabriqué en parallèle. Serveurs de lecture loopback, requêtes externes navigateur bloquées. Les25images privées absentes restent absentes, aucun remplacement.26HTML dont404,52comparaisons ordinateur/mobile,plus les10pages article/légal à360/390/430/749/750/1440 :184captures. Deux frames de rendu attendues après chaque changement de taille, fonte et images disponibles décodées.

| Page | Avant mobile | Après mobile | Ordinateur après |
|---|---|---|---|
|Mentions légales|[PNG](fraise/avant-390-page-mentions-legales.png)|[PNG](fraise/apres-390-page-mentions-legales.png)|[PNG](fraise/apres-1440-page-mentions-legales.png)|
|Article|[PNG](fraise/avant-390-page-journal-les-details-d-un-petit-rituel.png)|[PNG](fraise/apres-390-page-journal-les-details-d-un-petit-rituel.png)|[PNG](fraise/apres-1440-page-journal-les-details-d-un-petit-rituel.png)|
|Conditions de vente|[PNG](fraise/avant-360-page-conditions-de-vente.png)|[PNG](fraise/apres-360-page-conditions-de-vente.png)|[PNG](fraise/apres-1440-page-conditions-de-vente.png)|

Largeur utile sur360/390/430 : environ327/354/390px (0avant),corps ≥14px ; titres dans leur boîte. Les10pages ciblées changent à390 mais sont pixel-identiques à1440. **Sur les52comparaisons initiales :39identiques,10changements mobiles attendus,3écarts minuscules sur pages non ciblées** (contact mobile30pixels,FAQ ordinateur10pixels,livraison ordinateur40pixels),sans différence de composition visible. [Comparaisons complètes](fraise/comparaisons.json). Le [rejeu à source identique](fraise-repetition/comparaison-meme-source.json) reproduit des variations de30/40pixels sur ces contrôles : ce n'est pas un critère fiable de changement du thème à cette échelle. Aucun masque,retouche ou tolérance transformant ces images en « zéro pixel » ; les PNG restent natifs. Le diff CSS est entièrement sous `max-width:749px`,règles ordinateur inchangées. Inspection des avant/après article/légal et contrôles natifs effectuée.

Limites préexistantes conservées : petit texte ordinateur (article11,5px à1440) et certaines dispositions du pied de page,25médias privés absents. Ce verdict valide la correction ciblée sans annoncer la complétude photographique ou la qualité de chaque page de démonstration.

## Menu masqué : vraie sauvegarde, autres listes

Harnais natif `section-masquee-studio-check.ts` rejoué dans une copie séparée de d63, avec garde STORAGE_DIR avant imports, blocage des requêtes navigateur externes, deux largeurs supplémentaires et journal serveur. Assertions d'origine conservées. Base temporaire,Rive de démonstration,aucun worker. **Descendre puis Monter :2→3→2**,quatre largeurs ; chaque centre du menu réellement au-dessus de l'élément sous-jacent, clic normal sans `force`, ordre relu en SQLite. Témoins section visible7/7 à chaque largeur,0erreurJS. Menu relu à360 et1440.

- [Petit téléphone : menu ouvert](menu/petit-telephone-descendre-menu-ouvert.png)
- [Téléphone : après déplacement](menu/telephone-descendre-apres.png)
- [Ordinateur : menu ouvert](menu/ordinateur-descendre-menu-ouvert.png)

Recherche des autres listes du studio : aucun autre menu contextuel de section placé dans une ligne entière à opacité réduite retrouvé. Les atténuations de boutons inactifs, vignettes et formulaire désactivé n'ont pas cette structure ; pas d'élargissement arbitraire du correctif. Cela n'est pas un test manuel de tous les menus de l'application.

Le premier serveur s'est arrêté pendant l'essai (ECONNREFUSED),sans réponse ni ordre modifié : [échec conservé](premier-serveur-arrete-menu-browser.log),[résultat partiel](menu-premier-serveur-arrete/resultat.json). Aucun succès déduit des seuls clics. Rejeu seul avec journal serveur : tous les déplacements réussis. La cause de l'arrêt initial n'est pas établie ; ne pas l'affirmer comme un défaut applicatif ni comme un OOM confirmé.

## Stocks : description confrontée au moteur

Diff applicatif de200 : uniquement textes et commentaires,aucun changement de calcul,connecteur ou protection. Vérification `sync.ts` : calcul à trois points,Shopify`adjustStock`,Woo/Presta`setStock`+relecture,journal durable et absence de rejeu d'une opération incertaine,liaison initiale conservant le distant,verrou par projet/boutique. Les33tests exécutés comprennent concurrence,réponse perdue,reprise et variations de stock ; transports mémoire,faux accès uniquement. L'envoi absolu conserve sa fenêtre vente/écriture ; le texte FR et EN l'annonce et demande une vérification.

- [Français mobile,limites ouvertes](stock/fr-390-ouvert.png)
- [Anglais mobile,limites ouvertes](stock/en-390-ouvert.png)
- [Français ordinateur](stock/fr-1440-ouvert.png)

Aucun débordement horizontal ou JSexception dans les4vues. Les coordonnées/session sont fictives,aucune boutique connectée ni synchronisation réelle. Premier harnais sélectionné par erreur sur un service : Catalogue correctement remplacé par l'information « prestations » ; rejoué avec la fixture produit SILLON. Ce premier résultat n'est pas présenté comme un défaut du studio.

## CI : rouge expliqué, dernière tête verte

- 198 : [40307621221](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40307621221),3398réussis/31ignorés,types,ThemeCheck,build,Docker verts.
- 200 : [40312590161](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40312590161),3399/31,tous verts.
- 199/d63 : [40334225760](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40334225760),3398/31,tous verts,journaux relus. L'ancienne tête86525ca9 n'est pas la tête approuvée.

Les anciens rouges n'ont pas été cachés : [199/865](ci-199-86525ca9-rouge.txt),[mainbe488](ci-main-be488de1-rouge.txt). Cause observée : `ValidSchema`,JSON distant Shopify impossible à parser à l'offset0 (`preset.json`,`theme_block_entry.json`,`targetted_block_entry.json`),sur plusieurs cas. #201 ajoute des annotations mais ne durcit pas encore cette dépendance réseau intermittente. La dernière exécution verte n'efface pas ce risque de CI ; aucune garde ou vérification désactivée. Aucun appel fournisseur de création effectué.

## Rejeu et contrôle final

Les journaux `pr*-tests.log`,sorties,`*-execution.json` et types se trouvent dans ce dossier. Commandes : `vitest run` sur les fichiers ciblés de chaque PR,workers1,garde native du lot9 ; `tsc --noEmit`,tas3GiB. Les33tests de200 utilisent les transports simulés existants. Harnais ajoutés uniquement dans des copies de preuve : [sources](harnais/),hors code applicatif. Premier contrôle types avec tas1,5GiB insuffisant et omissions de métadonnées du checkout partiel sont conservés dans les fichiers `preparation-*` ; corrigés dans l'environnement,aucune assertion ni délai relâchés. Le premier inventaire FRAISE a aussi démarré avant la fin de l'export ; seule la comparaison finale184captures après sorties0 des deux exports fait foi.

**Étape maintenant accomplie : Claude a fusionné les trois PR,figé d2fb63ee ; Codex a contre-vérifié ce main dans une nouvelle copie,avec CI entièrement verte.** Les résultats du main333 antérieur restent historiques. La version réellement servie n'est pas vérifiée et aucun déploiement n'est autorisé. CMS réels,prix et générations fournisseurs,tests ignorés et médias privés restent hors validation de cette passe.
