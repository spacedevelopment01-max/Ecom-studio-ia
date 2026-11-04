# Reprise continue #301 — 4 novembre 2026

**Mission inachevée. Poursuivre les lacunes indépendantes sans nouvelle autorisation.** Aucun fournisseur réel, projet client, envoi, activation, fusion main ou déploiement. Claude possède les interfaces, cartes, désignations, verrou commun et recettes indépendantes ; Codex les moteurs, contrats, intentions, droits et reprises. Ne pas refaire #348.

## Source commune

PR brouillon #383, branche `codex/parity301-convergence-v4`, SHA `af6e16b85a054e02ff797f68eb24e85276dafbb1`. Vraie fusion de deux parents :

- Codex `0b627c90cceead14070e4c159b9b0e2d43a64366` (tous les moteurs et correctifs ci-dessous).
- Claude #369 `b280657b0e13d03a7b3321b04439d9497074a5eb` (miniatures image).

Les cinq fichiers Claude sont repris tels quels, sans conflit ni retouche graphique. Sa branche reste inchangée. Ne pas refusionner l’ancienne convergence #371 `827795d` : son défaut de retry est déjà corrigé par Claude dans la base `ea6f0fd9`.

## Livraisons et CI

Toutes les PR sont brouillon et non fusionnées. Chaque base est la précédente ; la documentation `2691bf2` s’intercale avant #377.

| PR | SHA livré | Preuves locales | CI au relevé |
|---|---|---|---|
| #372 image | 73c8865a942b556035dd89258a05f6cdfdf2a4c1 | 12 métier +24 régressions ; recette production 4/4,17s,toucher,reload,undo | **SUCCESS 41797066076** :5556 pass/31 skips ;601 fichiers pass/1 skip ;quatre contrôles et verdict verts |
| #373 stock | 97a8a15820fca4f350845b7b8473d9f41650cdac | 11 métier +9 PATCH ;56 confirmations +40 catalogue ;20 connaissance ;types | **SUCCESS 41799372210** :5574 pass/31 skips ;602 fichiers pass/1 skip ;quatre contrôles et verdict verts |
| #374 prestation | d315af5ea0c82f646bc531b40f941a4fa777934d | 7 nouveaux +9 horaires +56 confirmations ;20 connaissance ;types | 41800023935 :une attente d’inventaire obsolète,5580 pass/31 skips ;corrigée dans #380 |
| #375 calendrier | 0561c6cfc9aee5609fe71e00dd07544efe5e6258 | 16 métier dont DST ;63 transports ;16 registre ;types | 41800842314 :deux attentes obsolètes,5602 pass/31 skips ;corrigées dans #380 |
| #376 thème | cf159b91358934c3d83bb203a2c011eb1a49360d | 10 métier ;70 transports ;20 connaissance ;types | 41801965980 :suite en échec sur attentes anciennes ;Docker/recettes/contrôle gratuit verts ;inclure #380/#381 |
| #377 bibliothèque | 2da4884f4c828e588992f9da3471d3c70132db0c | 7 nouveaux +20 Fichiers ;20 connaissance ;types | 41802991745 :dernière vue en cours ;hérite des attentes anciennes avant #380 |
| #378 photo | 0d37f5fc74490b378c81d997150172613e56b439 | 14 routes/DB/octets/transports ;20 connaissance ;types | 41804686463 :dernière vue en cours ;inclure #380 |
| #379 animations | 93f5bf94b865f5ea5065970ccd801a022b7f000f | 9 métier +77 transports +16 registre ;types | 41805672739 :dernière vue en cours ;inclure #380 |
| #380 deux tests CI | 1091793754e016ee8bf98cd671368c1379afc0a6 | 59 ciblés,worktree isolé ;types ;aucun code applicatif modifié | 41807018751 en cours |
| #381 report manuel | 04b37b021fc3cd88bc1954e86c51d56cc2316c96 | 3 rouge→vert +10 thème ;14 report/adaptation ;types | 41808380657 en cours |
| #382 restauration | 0b627c90cceead14070e4c159b9b0e2d43a64366 | 13 métier +112 régressions (84 transports,16 registre,12 image) ;types | 41808879291 en cours |
| #383 convergence | af6e16b85a054e02ff797f68eb24e85276dafbb1 | carte Claude ;build production propre ;image 4/4 avec miniatures,17s,vrai toucher | 41809285172 en cours :attendre son propre verdict final |

Ne jamais déduire le succès d’un nouveau SHA d’un ancien verdict. Ne pas relancer les anciens commits pour les deux assertions déjà corrigées dans #380 : qualifier le descendant complet, puis corriger tout autre défaut démontré. Les quatre contrôles obligatoires restent présents. Aucun test supprimé ;les 31 skips sont ceux qui existaient déjà.

### Causes CI et correctif commun

Logs #374/job126473233504 :`conversation301-business-content` attend encore `services.update` absent, alors que le profil exact est implémenté avec son drapeau fermé. Logs #375/job126475918471 :même attente, plus `calendar.update` attendu absent malgré le raccordement des dates de brouillons. Les stderr « cookies hors contexte » proviennent de tests administrateur qui passent ;ils ne causent pas ces échecs.

#380 modifie uniquement ces deux tests. Ils vérifient maintenant les actions supportées/interdites, le périmètre partiel, l’accord gratuit, le coût nul et la fermeture par drapeaux. Réservations, calendriers approuvés/programmés/en pause, publication, approbation, bulk et génération restent interdits. Blog/social publish et ads.launch restent absents. Les anciens verdicts ne sont pas réécrits comme succès.

## Recette commune réellement exécutée

Application `af6e16b…`, BUILD_ID `onDHt-VFlzkgfMG7m02ho`. `/api/version` confirme :commit exact, `commitOrigin:build`, `mode:production`, `tree:clean`, `source:compiled-build`. Serveur `next start`, stockage fictif `/tmp`, clés fournisseurs vides et garde réseau lot9.

Image :**4/4 parcours,16 étapes**, Encre/Plein ×1440/390, produits/services. Vraie souris et vrai toucher pour désigner l’image ;deux miniatures chargées ;URI avant native et URI après exacte ;pixels RGBA après identiques à la photo choisie. Pas d’écriture avant l’accord ni après annulation. Quatre accords image après 17 secondes réelles ;une version, seul champ et fichier attendus ;image iframe chargée comparée aux octets du compilateur natif. Rechargement sans doublon, puis quatre accords d’annulation et restauration exacte. **0 IA,0 requête externe,0 erreur JavaScript.**

Harnais :`scripts/parity301-existing-image-proof.ts`. Rapport :`PREUVE-IMAGE-CONVERGENCE-V4.json`. Captures locales seulement dans `/tmp/parity301-convergence-v4-image`. Le précédent rapport `1f6002ed…` porte sur l’application `73c8865…` ;ne pas les confondre.

Claude signalait `hero_editorial_1/image` non visible :**non reproduit sur af6e16b**. Notre première cible produits, sans en sauter une, est précisément cette image ;elle est cliquée et touchée avec succès. Diagnostic natif :`/tmp/parity301-hero-diagnostic.log`. Le template appelle `es-image` et produit un img ;mon ancien terme « image de fond » était inexact. Aucun template ni backend n’a été modifié pour ce cas. Le harnais Claude livré dans b280 utilise `next dev` et un repère repris sur téléphone ;notre preuve utilise la production, le vrai toucher et 17s. Demander version/clé/trace DOM précise si le défaut persiste ailleurs.

## Contrats transmis à Claude et limites

Tous les SHA et contrats sont publiés dans #369. Lire les documents `LOT-*` de chaque PR. La carte Image de Claude est intégrée à la convergence ;les autres cartes restent à raccorder. Partir d’un descendant incluant #380 et #381.

- **Stock** :`localStock`, confirm/cancel-stock, versions produit et variante, empreinte, null distinct de zéro, prix/SKU/policy conservés. Pas de bulk/synchronisation. Carte Catalogue et recette à faire.
- **Prestations** :`serviceProfile.field=service-name|hours`, clé/alias natifs, CAS et empreinte complète. « Cette prestation » demande une précision, puis nom/clé exacts. Services réservables distincts. Carte Horaires à généraliser.
- **Calendrier** :`localCalendar`, confirm/cancel-calendar, événement `studio:social-changed`. Seulement dates éditoriales planned/draft/review ;aucune programmation/envoi. Égalités de dates et heures DST ambiguës/inexistantes refusées.
- **Choix de thème** :`localThemeChoice`, confirm/cancel-theme-choice, vrai aperçu inactif puis accord de remplacement du site de travail. #381 exige une référence automatique prouvée ;sinon refus. `dropped` bloque la confirmation ;pas de mapping arbitraire. Ni premier site, importé ou publication.
- **Bibliothèque** :`localFiles.state=listed,command=read,vision=false`, métadonnées/liens/A2/dossiers,50+hasMore. Aucune mutation ni meta brute. Ancienne proposition de renommage invalidée. Liste/sélection UI à faire.
- **Photo** :capability `photoImport`, POST/GET conversations/:cid/photos, une photo200Mo, reçu atomique et lease5min, transport upload/verify/retry. Stockage client de l’identité seulement ;photoId explicitement joint au message. Pas d’avant-projet/A1/vision/PDF/vidéo. Bouton/miniature à faire.
- **Animations** :`localSiteMotion`, confirm/cancel-motion, set_global natif. Le garde conversationnel Créer refuse checkbox/select, les boutons manuels restent inchangés :distinction de droits à traiter sans contournement implicite. Reduced motion conservé. Carte à faire.
- **Restauration** :`localThemeRestore`, confirm/cancel-restore, numéro/ID acquis exact et deux aperçus. Undo des reçus gratuits courants animation/SEO/pages/thème/restauration, ancien contrat Site/image conservé. Acquis restaurables en forfait actif Créer ;pas de nouvel achat/importé/publication. Carte à faire.

#381 corrige une perte native reproduite :sans ancien gate, `preservation(null,current)` oubliait les retouches. Repli strict vers première composition1/system/parent=null/non importée, sans inventer une référence manuelle. Un réglage global manuel est effectivement reporté ;un titre sans équivalent reste bloqué.

## Matrice unique

162 unités conservées, mêmes CSV/MD et identifiants ;les 77 décompositions restent un inventaire. **58 PARTIEL,74 ABSENT,4 NON_TESTE,26 BLOQUE ;aucune complète.** Périmètres et formulations contradictoires des nouveaux lots actualisés. Ne pas certifier une UI ou une opération voisine à partir d’un moteur partiel.

## Workspace et reprise

Principal :`/workspace/work/parity301-intents-v5`, branche convergence-v4, HEAD af6e16b. Fichiers suivis propres ;harnais Image et diagnostic héros non suivis, également conservés dans les preuves documentaires. `.next` correspond exactement à af6e16b et au BUILD_ID ci-dessus. `node_modules` pointe vers `/workspace/Ecom-studio-ia/node_modules`. Le cache webpack inactif a été supprimé avant build faute de place ;ne supprimer que ce cache si aucun build/serveur ne l’utilise, jamais les données ou sources.

Second worktree :`/workspace/work/parity301-ci-guards`, HEAD04b37b0, branche theme-baseline-guard, propre. Ancien `/workspace/work/parity301-next-domains` toujours interrompu en merge (e1ba254/MERGE_HEAD30f67e), **intouché :ne pas reset**.

Tous les processus app/tests/build :`NODE_OPTIONS="--import=$PWD/scripts/lot9/network-guard.mjs"`. IPC/tsx/Vitest/Chromium demandent l’exécution locale autorisée (`require_escalated`). Aucun secret fournisseur configuré. Recettes sur données fictives `/tmp`, refus du stockage préexistant, Chromium `/usr/bin/chromium`.

Logs :`/tmp/parity301-convergence-v4-build.log`, `convergence-v4-image.log` et dossier de résultats ;`ci-capability-guards.log` ;`theme-baseline-loss-red.log`, `theme-baseline-green.log`, `baseline-native-regressions.log` ;`restore-final.log`, `restore-regressions.log`, `photo-transport-final.log`, `motion-final.log` et types correspondants.

## Prochaines tâches indépendantes

1. Relever les verdicts finaux #380–#383 sur leurs SHA et publier les comptes exacts. Continuer les domaines indépendants durant les CI ;corriger seulement les échecs démontrés.
2. Reprendre les cartes livrées par Claude sur une branche de convergence propre, reconstruire puis tester les vrais parcours quatre modes/toucher/17s. Ne pas modifier sa branche ni déduire une preuve de deux piles séparées.
3. Profil services :téléphone/e-mail/zone peuvent être des champs exacts avec CAS/empreinte. Validation native :area300,phone40,email160+regex. **Adresse couplée** :PATCH projet appelle `syncBookingAddress` après saveServices et crée une version du site. Ne pas raccorder address par une simple écriture de profil sans traiter cette concurrence. Même prudence pour bookingUrl/contactModes ;les services réservables ont leurs propres IDs/versions.
4. Continuer CRUD métiers, variantes/réservations, dossiers/versions de fichiers et champs restants de la matrice. Vérifier #348 avant développement. Connexions/publications réelles restent interdites ;seuls contrats et fixtures peuvent être qualifiés sans nouvel accord réel.

## Reprise prioritaire actualisée — 4 novembre, 10 h 24 UTC

La source commune suivante est **PR #388 / codex/parity301-convergence-v5 / 488da3e572c0fd2d2289021c1134b795d3719dce**, vrai merge des parents #387 `9c9efda6f23224f9983fb39c932af181154fc128` et #385 `df4fce028547771f3e96d3a187a3919c51fe062d`. Sa construction propre est en cours : ne pas attribuer à ce SHA les anciennes preuves af6. Les fichiers graphiques Claude sont inchangés.

Nouveaux lots livrés, brouillon et non fusionnés :

- **#384** `8024d2e9acbf296002ea5ef543ccb4bbedb6c771` : téléphone/e-mail/zone du profil, aperçu et accord gratuit/CAS/validation partagée au PATCH natif. 8 tests + 20 connaissances/types passent. Adresse toujours exclue, car syncBookingAddress touche aussi le site.
- **#385** `df4fce028547771f3e96d3a187a3919c51fe062d` : contrôle monotone d’au moins 17000 ms, seuil et contrôles inchangés. #380 échouait dans l’assertion de délai AVANT clic, pas une perte applicative démontrée. Trois tests/type passent ; véritable recette sections af6 4/4, huit accords après minimum17s, reload/undo,0IA/externe/JS. La cause précise minuteur/horloge civile n’est pas départagée par les logs. Run #385 `41812683859` en cours.
- **#386** `3a035bf2a44eb37bedf0e249e6f0f9f38d22cee3` : vrai PATCH dossier répondait400/404 mais avait déjà renommé. Deux tests rouges avant,3verts après+7bibliothèque/types. Validation complète puis UPDATE des seuls champs fournis. Aucun moteur dossier réinventé.
- **#387** `9c9efda6f23224f9983fb39c932af181154fc128` : création d’un dossier natif vide, parent/racine explicites, localFolders / confirm-folder / cancel-folder et contrôleur persistant. 14 métier +91 transports (7 nouveaux) +30 régressions/types passent. Cartes et recettes Claude à faire ; pas de déplacement/suppression implicite.

Chaque contrat et SHA a été transmis à Claude dans #369 (commentaires 6628121531,6628186393,6628213551,6628333533,6628370123). Les nouvelles cartes restent sa responsabilité ; aucune modification directe de sa branche.

CI exactes relevées : #381 suite5661pass/31skips,609fichierspass/1skip ; #382 suite5681pass/31skips,610fichierspass/1skip ; #383 suite5682pass/31skips,611fichierspass/1skip. Docker et confirmation obligatoire verts sur ces trois SHA ; grandes recettes encore en cours, aucun verdict global anticipé. #384 run41812294387 en cours, Docker vert. #380 reste historiquement rouge sur son contrôle du temps ; son correctif est #385, ne pas maquiller le vieux SHA.

Matrice canonique mise à jour sans perdre les162 unités : **163 unités**, ajout explicite de l’omission native folders.create ; **59 PARTIEL,74 ABSENT,4 NON_TESTE,26 BLOQUE**, aucune complète. Chemin historique conservé. Coordonnées services et défaut d’atomicité documentés sur leurs lignes.

Workspace : source propre dans /workspace/work/parity301-intents-v5, branche convergence-v5, build /tmp/parity301-convergence-v5-build.log en cours (session76961). Documentation dans /workspace/work/parity301-ci-guards, branche continuous-matrix-v5, basée sur488da3e ; .next est un lien vers le build source. Ne pas exécuter deux builds/recettes simultanément. Aucun ancien checkout de panne nettoyé.

Prochaines actions : observer le build puis vérifier /api/version sur488da3e ; suivre les CI finales des SHA exacts, poursuivre les modules indépendants. Étendre les formulations/clarifications naturelles et les opérations de dossiers (renommer/déplacer/supprimer vide) avec moteur natif partagé, concurrence et reçus prouvés ; restauration corbeille/native files et services réservables restent ouverts. Ne pas considérer la création de dossier comme preuve de ses autres actions. Attendre seulement les dépendances réelles de cartes Claude, continuer les autres moteurs. Aucun fournisseur/client/main/déploiement.
