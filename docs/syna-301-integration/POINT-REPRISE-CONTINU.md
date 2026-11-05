## Reprise active — 5 novembre 2026, Europe/Paris — réservations natives

Environnement de session fonctionnel : Node, Git, tests, GitHub. Aucun manque de configuration pour cette session ; le bot GitHub « create an environment » concernait son déclenchement séparé. Reprise depuis main6354f327888d70c64ce4d86604b7b8fdc768947c (#422), bilan/reprise lus. Aucun merge main, activation, client ou fournisseur réel.

Lots courts indépendants/empilés transmis à Claude dans #301 :
- #423 bb0f7b490aa8321ba6fc59f5f23e30c005a7cf56 : heures impossibles réellement acceptées corrigées ;58tests/5fichiers,types. Parent main.
- #424 1c0166f77cdd7b36ce6feb87120ff46f254425a5 : horaires hebdomadaires salon/cabinet depuis conversation ;113tests uniques/8fichiers,types,30nouveaux. Parent #423.
- #425 bb3b7025bce9e99685a7119a8ca6babe2f35e4d4 : restaurantPatch strict +semaine explicitement vide respectée serveur/public ;32tests/4fichiers,types,9nouveaux. Parent #424.
- #426 8cb35ff024a1f9be78f0300554acd1d83bd918ab : jours etcréneaux déjeuner/dîner depuis conversation ;69tests uniques/4fichiers,types,24nouveaux. Parent #425.

69/113/58/32 partagent des régressions : ne pas additionner ces totaux comme tests distincts. Horaires/restaurant :54tests conversation nouveaux ;validation horloges7 +patchrestaurant9 nouveaux. Preuves exactes et limites dans LOT-VALIDATION-HEURES-NATIVES.md, LOT-HORAIRES-RESERVABLES-SYNA.md, LOT-RESTAURANT-PATCH-NATIF.md, LOT-RESTAURANT-CONVERSATION.md.

CI observée à11h19UTC : #423 run42013974148, #424 run42015562741, #425 run42016531277 en cours ;Docker#425 ettypes#425 verts,plusieurs recettescompilées#425 vertes. #426 nouvellement lancé. Aucun verdictfinal revendiqué. Relire chaque run/SHA, ne pas répéter les tests déjà verts sans nouveau motif.

Matrice canonique :168opérations,67PARTIEL/71ABSENT/4NON_TESTE/26BLOQUE,aucune complète. Deux sous-opérations ajoutées services.booking.hours/services.booking.restaurant ;services.booking parent reste PARTIEL.

Contrats transmis Claude : #301 commentaires6656331336/6656470648/6656668408. Cartes/handles/verrou/reprise,studio:booking-changed etrecettes compilées préparé/neuf Encre/Plein ordinateur/tactile≥17s toujours attendus. Drapeaux STUDIO_CONVERSATION_BOOKING_HOURS/STUDIO_CONVERSATION_RESTAURANT_SETTINGS fermés par défaut ;ne pas les ouvrir sanscartes. Aucun composantClaude modifié. Ancienbuildlocal9f8507c7/BUILD_ID EjTDhC-HYFN21izgKOSsO ne qualifie PAS ceslots.

Suite immédiate : fermetures datées natives (valider réellement les dates ;ne pas effacer les fermetures acquises), puis autres trous de réservation/équipe/prestations. Continuer pendant CI/cartes. Recette complète desnouveauxlots uniquement sur un build/SHAcommun intégrantClaude ;conserver frontend exact etpreuves sansredistribuerlescaptureslocales. Fournisseurs réels restentpréparés/chiffrés pouraccord,sansappel.

---

# Reprise prioritaire : #418/#419 livrés, CI finale et carte Réservations à poursuivre

Mission #301 ouverte ; aucune dépense fournisseur réelle, donnée client, activation, publication, fusion main ou déploiement. Continuer les tâches indépendantes sans attendre de nouvelle consigne.

## Dernier code et contrats transmis

**#419 /00afb4c4a3653393ccb7b0a7c955656e5cd78fcf**, branche codex/parity301-booking-preview-wording, parent **#418/a31c8d3d12d8e9c063e272c47d1232ba08707660** (codex/parity301-booking-service-patch), puis#417/81433c15→#416/10cd443d→#415/e4d4db0d→#414/05b89fc4. Tous brouillons, bases stables ;aucune branche Claude modifiée. Source de compilation/edit actuelle /workspace/work/parity301-intents-v5, branche documentaireV12 aprèspublication, code00afb4c4. Le build .next est encore celui de#413/3b54dfbe (QcnDvnA7TT22d5jArByuE) :ne pas le qualifier comme build de ces nouveaux commits ;recompiler avant recette.

#418 raccorde réellement le prix et la durée des prestations réservables salon/cabinet àdes phrases naturelles, sousBOOKING_EDIT fermépar défaut.108tests uniques/10fichiers/types (78groupés puis54voisins,24communs),32nouveaux conversation/vraieAPI. DTO **syna-booking-edit-1**, bookingEditExecution.enabled, états ambiguous/proposed/applied, serviceID natif/untrustedMetadata,field price|duration,diff numérique,sourceVersionId UUID,warnings,nativeHref. POST confirm-booking-edit exige confirmation:true etproposition/révisions/requestId ;cancel-booking-edit séparé. Propriété/forfait/drapeau avantcache,sourceUUID/empreinte/TTL etaperçu+warnings revalidés,savePrestations/relecture exacte,receiptId/resultVersionId,reprise sansdeuxversions. Le profil etles rendez-vous acquis restent intacts ;soldeIA nul autorisé. Un nouveau rendez-vous qui change l’avertissement invalide l’accord. Voir LOT-RETOUCHE-RESERVABLE-NATURELLE.md, transmisClaude #369/6636182454.

#419 corrige deux rouges aperçu/vocabulaire, puis un défaut natif d’identifiants :la consigne pouvait réécrire block_order etfaire disparaître une prestation. previewThemeVersionSpec partage vocabulaire/sécurité natifs sansécriture ;normalisation une fois àl’enregistrement ;order/block_order préservés. Consigne globale enattente =clarification gratuite avant proposition numérique ;mémoire changée après proposition =409 avantversion.56tests/5fichiers/types,5nouveaux,aucune garde ni exclusion permanente ajoutée. Contrat inchangé, pas de migration des anciennes sources corrompues. Voir LOT-APERCU-RESERVATIONS-VOCABULAIRE.md, transmisClaude #369/6636395503.

**Carte, aperçu visible, verrou partagé, contrôleur de reprise et recette navigateur Réservations restent ouverts chezClaude.** Aucune capture ou preuve navigateur nouvelle revendiquée pour#414–#419. services.booking devient PARTIEL pour ce sous-parcours moteur seulement ;horaires/créneaux/équipe/noms/descriptions/capacité restent ouverts. Matrice166unités :65PARTIEL/71ABSENT/4NON_TESTE/26BLOQUE,aucune complète.

## Validation complète et environnement : verdicts conservés

La suite locale EXACTE **81433c15** (avant#418/#419) est terminée :**24fichiers enéchec/619réussis/1exclu ;94tests enéchec/5928réussis/31exclusions préexistantes**,1096,83s. Cause diagnostiquée :checkout sparse excluait public/theme-assets,films/fontes,références de thèmes,.claude/skills,fixture PNG archivée et.devcontainer. Aucun défaut de thème corrigé,aucun test supprimé,aucune relance des619fichiers déjà verts.

Après restauration des fichiers SUIVIS àleur SHA :les24fichiers concernés ont été revérifiés,22verts/2échecs,274tests verts/2échecs/16exclusions existantes. Deux restaurations ponctuelles de documents avaient été retirées parune actualisation sparse :manifestTRAVERSE etinventaire de sections. Rétablies àl’identique, puis **2fichiers/21tests verts**. L’ensemble des fichiers de la suite a donc été couvert vert après correction de l’environnement, surlemême code81433c15,avec les trois verdicts bruts conservés. Ce n’est ni une nouvelle exécution monolithique entièrement verte,ni une validation de#418/#419.

Journaux locaux : /tmp/parity301-81433c15-full-suite.log et-clean.log ; /tmp/parity301-81433c15-fixture-recheck.log ; /tmp/parity301-81433c15-final-two-fixtures.log. Les tests ont utilisé scripts/lot9/network-guard.mjs,aucun fournisseur réel. Le PNG archivé reste une fixture acquise ;le fournisseur utilisé par ces tests est simulé.

CI **#418/run41868833969** :DockerSUCCESS ;suite,confirmation obligatoire etgrandes recettes encore en cours au dernier relevé. **#419/run41870438857** en cours. #415/run41865740137,#416/run41866225595,#417/run41866701157 et#414/run41864581107 restent àobserver surleurs SHA. Ne pas convertir un statut intermédiaire enSUCCESS. Le quatrième contrôle de confirmation gratuite reste obligatoire etinchangé. Les rouges historiques#411/#413 restent rouges (même collision vidéo corrigée#415) ;#413Dockerjournal404BlobNotFound,aucune correction spéculative. #394–#405 avaient leur CI complèteSUCCESS,distincte desnouveaux commits.

## Point de reprise matériel exact

- /workspace/work/parity301-intents-v5 :code00afb4c4,branche documentaireV12 ;dernier build ancien3b54dfbe,aucun serveur/navigateur. Derniers tests#41956/types verts,aucun WIP métier.
- /workspace/work/parity301-ci-guards :code81433c15,références restaurées etfin des trois vérifications ;trois documents intermédiaires modifiés (repris danscette livraison),aucun WIP métier. Ne pas écraser ces documents sans vérifier la livraisonV12.
- Répertoire sparse élargi aux seules dépendances démontrées. docs/coordination avait matérialisé352MiB d’artefacts inutiles ;son exclusion rétablie etseul BIBLIOTHEQUE_SECTIONS_COUVERTURE.md restauré exactement,après les tests verts. Une future actualisation sparse peut nécessiter de restaurer ànouveau ce fichier. ManifestTRAVERSE etOFFRES_VALIDEES.json présents. Aucune source,client,autre checkout oupackGit valide supprimé. L’extension sparse est terminée ;aucun test/processus de vérification encore actif. Disque~715MiB libres :vérifier espace avant nouveau build,ne pas supprimer letravail d’un autre.

1. Suivre les CI finales desSHA#418/#419 et diagnostiquer uniquement les erreurs démontrées. Ne pas relancer les contrôles verts. Vérifier le quatrième contrôle obligatoire.
2. Reconsulter Claude#369 ;reprendre sa carte BOOKING_EDIT/contrôleur sur notre convergence,composants exacts de sa branche. Anciennes cartes PromptsA1#403,photo préparée#405 etlecture Réservations#408 àqualifier aussi. Dernière tête Claude observée bdba24fe,aucun nouvel acquittement supposé.
3. Recompiler une convergence propre,avecgarde réseau etclés fournisseur vides,puis vrais parcours conversationnels Encre/Plein1440/390tactile,≥17s,annulation/conflit/recharge/perte réseau/reçu/résultat natif. Distinguer moteurAPI depreuveUI,simulé deréel.
4. Poursuivre lacunes indépendantes :horaires/créneaux réservables puis autres lignes de matrice ;utiliser la source native etun accord exact sansrendre le profil etles réservations interchangeables. Ne pas refaire#348 ni ouvrir de dépense/action externe réelle. Préserver les opérations manuelles gratuites.

Les preuves navigateur précédentes conservent leur SHA réel,rapports etcaptures locales :Images#4134/4,16étapes/4accords≥17s ;V10#41016parcours,100étapes/40accords. Historique détaillé ci-dessous ;le présent point prime pour les derniers statuts etla suite. La mission n’est pas déclarée terminée.

---

# Reprise active : routage CI corrigé et prérequis Réservations livrés

La mission #301 reste ouverte. Continuer sans nouvelle autorisation les lacunes indépendantes. Aucune dépense réelle, donnée client, activation, publication, fusion main ou déploiement.

## Derniers lots livrés, interfaces Claude intactes

- **#414 /05b89fc48b44c44ebbb93d0fade7bdcb91d3d28d**, codex/parity301-booking-native-identities : quatre défauts HTTP reproduits (doublons écrasés, homonymes perdus, IDs générés>40nonréenregistrables). Correctif natif19lignes ;50tests uniques/5fichiers/types. Édition manuelle gratuite sans abonnement/solde conservée. Rapport LOT-IDENTITES-RESERVATIONS-NATIVES.md.
- **#415 /e4d4db0d45f645c3030e745c9f2f78f1cfd83257**, codex/parity301-restore-intent-routing : la restauration de montage « en conservant les fichiers… » était interceptée par la corbeille. Trois cas rouges ;détecteur désormais borné au complément immédiat,55tests/5fichiers/types. Le test vidéo initialement défaillant reste inchangé ;garde-fous et demandes mixtes médias conservés. Rapport LOT-ROUTAGE-RESTAURATIONS-NATIVES.md.
- **#416 /10cd443d8a6cced2df31cadba93830b7c73fde0e**, codex/parity301-booking-staff-only : deux PUT200 sans effet reproduits pour remplacement/retrait de l’équipe sans services. Traitement natif indépendant limité salon ;autres blocs/services, champs vides/personnalisés,profil exacts.63tests/6fichiers/types. Rapport LOT-INTERVENANTS-SEULS-NATIFS.md.
- **#417 /81433c15cc2ea822ed698ad01931db92c747aacc**, codex/parity301-booking-native-preview : previewPrestations(projectId,raw) retourne sourceVersionId UUID actuel,spec cloné,warnings,address normalisée sans écriture. savePrestations utilise le même constructeur.26tests/4fichiers/types dont7nouveaux :salon/cabinet/restaurant,déterminisme,aucune version/profil/dépense avant accord,aperçu égal àla source enregistrée,rendez-vous confirmé acquis protégé,UUID renouvelé après changement indépendant. Rapport LOT-APERCU-RESERVATIONS-NATIF.md.

Chaîne :61736db1(documentationV11/code#413)→05b89fc4→e4d4db0d→10cd443d→81433c15. Chaque PR est courte et empilée sur une base stable ;aucune tête précédente déplacée. Tous les contrats/SHA envoyés à Claude dans #369 (commentaires6635636393,6635772596,6635835022,6635900735). Aucun composant ni branche Claude modifié. services.booking reste ABSENT pour le raccordement conversationnel ;ces prérequis ne sont pas un parcours Studio validé.

## CI : échecs réels et limites exactes

#394–#405 restent SUCCESS complets sur leurs SHA. #411/run41855880282 suite :**1échec,6016réussites,31exclusions préexistantes,637fichiers réussis/1échec/1exclu**. #413/run41859968768 suite :**1échec,6027réussites,31exclusions existantes,638fichiers réussis/1échec/1exclu**. Même cause réelle :conversation211-video-motion.test.ts, Corbeille native avec SYNA indisponible, corrigée par#415. Ne pas attribuer ces succès partiels àune CI verte.

Le quatrième contrôle obligatoire de confirmation gratuite est SUCCESS sur#411 et#413, intact. Docker#411SUCCESS. Docker#413FAILURE, mais journal API job126678751719 inaccessible404BlobNotFound :cause technique nonétablie,aucun correctif Docker spéculatif ni boucle de relance. Grandes recettes encore en cours selonAPI ;certains jobs sont annoncés in_progress malgré leurs dernières étapes terminées,donc ne pas inventer un statut final.

#414/run41864581107 et#415/run41865740137 enfile ;#417/run41866701157 enfile ;#416 àlire parSHA. Une suite complète locale surle code EXACT81433c15 est lancée, journal /tmp/parity301-81433c15-full-suite.log ;résultat àconsulter avant conclusion. Ne pas modifier les sources pendant cette vérification. ChaqueNode/test/build utilise NODE_OPTIONS --import=$PWD/scripts/lot9/network-guard.mjs ;aucun fournisseur réel.

## Reprise exacte

Source /workspace/work/parity301-ci-guards, code81433c15 (branche documentaire aprèspublication,aucun WIP métier). Runtime compilé indépendant /workspace/work/parity301-intents-v5 sur#413/3b54dfbe, buildQcnDvnA7TT22d5jArByuE, aucune recette nouvelle attribuée aux#414–#417. Serveurs et navigateurs précédents arrêtés. Disque ~1,2Gdisponible ;ne pas supprimer les anciens checkouts/packs valides. Suite complète locale en cours seulement.

1. Lire le verdict de la suite locale session38438 etles CI exactes des nouveauxSHA. Corriger uniquement les échecs démontrés ;ne pas supprimer tests/contrôles ni relancer les verts.
2. Développer l’adaptateur services.booking sur branche indépendante :langage naturel avecclarification,IDs natifs etsourceUUID distincts duprofil,cible/champ borné,aperçu sansécriture,empreinte etforfait/propriété avantcache,TTL etconfirmation gratuite obligatoire,écriture via moteur natif,relecture/reçu/reprise sansdoublon. Ne jamais accepter un spec client àenregistrer ni recréer tous les services àpartir d’un DTO normalisé. Préserver prix/durée des rendez-vous confirmés etles opérations manuelles gratuites.
3. Reconsulter Claude #369, tête observée bdba24fe :cartes PromptsA1#403(localReadAllowed),photos préparées#405(conversationPhotos),lecture Réservations#408 àqualifier. Garder composants exacts lorsde convergence sur notre branche ;pas de modification directe de sa branche. Lui transmettre chaque contrat prêt.
4. Continuer les autres lacunes de la matrice, puis recettes deproduction depuis phrases naturelles,Encre/Plein ordinateur/tactile,attente≥17s,annulations/conflits/reload/perte réseau,projets produits ETservices,anciens ETnouveaux. Pas de recette fabriquée àla place de la phrase.

La preuve Images4/4,16étapes/4accords≥17s etles preuves V10 (16parcours/100étapes/40accords) restent attachées àleursSHA réels et auxrapports ci-dessous. Captures LOCALES seulement. Matrice166opérations :64PARTIEL/72ABSENT/4NON_TESTE/26BLOQUE,aucune complète. Historique conservé ci-dessous ;le présent point prime pour les nouveaux statuts CI et prochaines actions.

---

# Reprise active : corbeille Banque Images vérifiée, CI et intégrations à poursuivre

La mission #301 n’est pas terminée. Continuer les modules indépendants et transmettre les corrections à Claude. Aucune dépense fournisseur réelle, modification client, activation, publication, fusion main ou déploiement.

## Dernière livraison et preuve

**#413 — 3b54dfbe8ebf125b6039f035e2c024ec07d73a4e**, branche codex/parity301-image-bank-trash-scope. Parent documentaire45dcec21, qui reprend le correctif CI #411/c094116a et les moteurs précédents. Cinq cas rouges/un vert ont démontré que #409 ne suivait pas les rôles natifs de la Banque Images. Correction avec BANK_IMAGE_ROLES/isBankImage, portée recontrôlée avant accord et lien du contexte exact ; Fichiers conserve sa restauration générale gratuite. 61 tests sur cinq fichiers et types, dont onze nouveaux ; les onze repassent après précision du message. Aucun composant ou garde financier modifié. Contrat LOT-CORBEILLE-IMAGES-PORTEE-NATIVE.md, transmis à Claude dans #369/6634964864.

**Preuve indépendante de production :4/4,16étapes,quatre accords≥17s**, minimum17000,57ms. Source3b54dfbe, build **QcnDvnA7TT22d5jArByuE**, APIversion compiled-build/production/clean. Services préparés, Encre/Plein, ordinateur/téléphone réellement tactile. Corbeille créée par les routes natives ; document, publicité et logo exclus de la Banque. Suggestion d’ID exacte puis « Peux-tu restaurer l’image… ? », aperçu avant/après, annulation, nouvel accord, reçu et rechargement. Image réellement chargée dans la Banque et ses octets vérifiés par HTTP. Tous les autres acquis, Préparation et thème inchangés. Quatre recherches SIMULÉES intégralement conservées ; aucune nouvelle tentativeIA, requête externe, erreurJS ou job. Rapport PREUVE-CORBEILLE-IMAGES-BANQUE-V11.json, harnais scripts/parity301-image-bank-trash-proof.ts, captures locales /tmp/parity301-image-bank-trash et base fictive /tmp/ecs-corbeille301-Ki3VoE.

Deux détails d’affichage à transmettre à Claude : le lien de reçu porte encore le libellé générique « Voir dans Fichiers » alors que sa destination native est Images ; la photo640×480 (4:3) reçoit le badge16:9 dans la Banque. Dimensions et octets natifs sont conservés ; aucun composant de notre côté modifié.

## CI exacte

#394 à #405 : **SUCCESS complet sur leurs SHA**. Derniers runs : #403/b650c52→41846181130 (5949 tests), #404/eb0f687→41846832989 (5958), #405/50e5d1e→41848102025 (5971). Toujours31exclusions existantes ;633/634/635 fichiers réussis etunexclu. Ces succès ne certifient pas leurs cartes encore manquantes.

**#411/c094116af043cb729d5eeb45235199dfbc58e1de**, correctif de test seul, run41855880282 : Docker et confirmation obligatoire verts ; suite et grandes recettes encore en cours au dernier relevé. #406 a un échec de suite connu (5972 succès/un échec/31exclusions), reproduit puis corrigé par #411 avec56tests ciblés/types et deux nouveaux GET réels. Ne pas transformer cet ancien rouge en succès ni supprimer un contrôle.

**#413/3b54dfbe**, run41859968768 : CI complète en cours, à observer sur ce SHA. Les autres anciennes convergences peuvent hériter de l’attente de test corrigée par #411. Le quatrième contrôle de confirmation gratuite demeure obligatoire. Ne pas relancer les contrôles déjà verts.

## Sources, environnement et suite

Source : /workspace/work/parity301-ci-guards, branche documentaire codex/parity301-continuous-proofs-v11, code#413. Checkout de compilation : /workspace/work/parity301-intents-v5, branche codex/parity301-compiled-bank-scope, propre sur3b54dfbe, build ci-dessus. Toutes les recettes sont terminées ; aucun serveur/navigateur actif. Les types du harnais archivé passent. Précharger scripts/lot9/network-guard.mjs pour chaque Node/test/build.

Le cache webpack de notre build terminé a été retiré pour laisser de l’espace. Un pack Git temporaire fermé de notre fetch précédent (tmp_pack_TCn3cp,394002432octets), vérifié sans descripteur actif, a aussi été retiré ; aucun pack valide/source/autre checkout touché. Les preuves précédentes gardent leur source#410/1c6ece6b, build7xwc-ACTdmEkd_leBCxvX :A1 8/8,64étapes/24accords ;Dossiers préparés4/4,16étapes/12accords ;Stock interrogatif4/4,20étapes/4accords. Stock consigne quatre GoogleFonts bloquées, pas zéro tentative externe. Ces100étapes/40accords sont publiés en45dcec21, sans réattribution au nouveau SHA.

1. Publier cette branche de preuves sans déplacer les têtes #411/#413. Envoyer àClaude le rapport Images et les deux détails d’affichage, puis observer les CI finales sur leurs SHA.
2. Relire les adaptations de Claude : Prompts A1 #403, photo du fil sur préparé #405, lecture des services réservables #408. Ses composants actuels bdba24fe sont repris à l’identique ; sa branche n’a pas été modifiée. Ne pas compter une carte ou recette en attente comme qualifiée.
3. Poursuivre les lacunes indépendantes : services réservables natifs (prévisualisation sans écriture nécessaire autour de savePrestations avant raccordement des modifications), autres fonctions de la matrice. Vérifier d’abord les identités de services/intervenants et les risques de collisions, avec fixtures et vraie API ; aucun identifiant commun avec le profil. Ne pas refaire #348 ni répéter une recette verte sans nouvelle raison.

Matrice cumulative166opérations :64PARTIEL/72ABSENT/4NON_TESTE/26BLOQUE,aucune complète. Les limites de périmètre et de CI restent explicites.

---

# Reprise active : preuves V10 obtenues, correctif CI #411, audit Images

La mission #301 reste ouverte. Aucune dépense fournisseur réelle, donnée client, activation, publication, fusion main ou mise en production. Continuer les lacunes indépendantes pendant les CI ; ne pas refaire #348.

## Code et CI prioritaires

**Dernier code livré : #411, c094116af043cb729d5eeb45235199dfbc58e1de**, branche codex/parity301-prompts-read-permission-ci. Parent #410, 1c6ece6b1d81ca56f2103f5114575671c9a1ebb6. Répare uniquement une attente de test incohérente avec le droit préparé de lecture des prompts. Reproduction locale : deux succès/un échec. Après correction : 56 tests sur quatre fichiers et types verts, dont deux GET réels supplémentaires (Préparation verrouillée autorisée, forfait retiré sans lecteur/carte). Aucun composant, moteur, droit ou workflow modifié. Contrat LOT-CI-PROMPTS-PERMISSION.md, transmis à Claude dans #369/6634357679.

CI à suivre sur ce SHA : **run41855880282**. Ne pas considérer la CI terminée. #406 a un échec observé dans sa suite complète, job126639332100 : 5972 succès, un échec, 31 exclusions existantes. L’ancienne assertion readOnlyReason modifiait le message mais conservait le droit serveur actif. Ce rouge reste historique et ne doit pas être masqué ; les descendants antérieurs au correctif peuvent l’hériter. Le quatrième contrôle obligatoire de confirmation gratuite reste intact.

#394 à #402 : SUCCESS complet sur leurs SHA. Suites #403/#404/#405 : respectivement5949/5958/5971 tests réussis et31exclusions préexistantes,633/634/635 fichiers réussis etunexclu ; Docker/confirmation verts, grandes recettes encore à observer. Runs41846181130/41846832989/41848102025. Autres runs : #40641848828779, #40741849991916, #40841851915469, #40941853173903 et #410 à lire par son SHA. Aucun verdict global anticipé.

## Trois preuves indépendantes de production obtenues

Toutes sur **#410/1c6ece6b**, composants EXACTS de Claude bdba24fe, build **7xwc-ACTdmEkd_leBCxvX**, APIversion production/compiled-build/clean. Le correctif de test #411 ne change pas le produit, mais ces preuves gardent leur SHA réel.

- **A1 :8/8**, produits et services × Encre/Plein × ordinateur/téléphone tactile. 64 étapes,24 accords réels≥17s (minimum17000,10ms). Avis de lecture seule conservé ; hors exception, aucune action/devis. Fichier désigné et renommé, dossier renommé puis déplacé avec annulation et nouvel accord, reçus/rechargements. ProjectRevision:null, stateOf:null, actionsEnabled/aiEnabled:false. Métier, thème complet, shop.chat, autres actifs et octets exacts. BaselineIA0→0, aucune dépense/externe/JS. Rapport PREUVE-DOSSIERS-A1-PRODUITS-SERVICES-V10.json ; harnais scripts/parity301-existing-folders-proof.ts ; base fictive /tmp/ecs-a1-301-3qkcYL.
- **Dossiers préparés :4/4**, services × quatre formats. 16 étapes,12 accords≥17s. Renommage puis déplacement dans Archives, annulation/reprise et retour à la racine avec un accord distinct, reçu/rechargement. Préparation, thème, actifs et octets conservés. Quatre recherches SIMULÉES entièrement inchangées, zéro nouvelle tentativeIA/externe/JS/job. Rapport PREUVE-DEPLACEMENT-DOSSIERS-PREPARE-V10.json ; harnais scripts/parity301-prepared-folder-move-proof.ts ; base /tmp/ecs-lot7-301-SeovW9.
- **Stock interrogatif :4/4**, produits préparés × quatre formats. 20 étapes,quatre accords≥17s. Variante désignée dans le Catalogue natif, « Peux-tu mettre le stock de cette variante à12 ? », annulation, reçu/reload ; prix/SKU/politique/variante sœur exacts. Quatre recherches SIMULÉES entièrement inchangées, zéro nouvelle tentativeIA/JS/job. Quatre requêtes CSS GoogleFonts bloquées et consignées ; ne pas annoncer zéro tentative externe pour cette recette. Rapport PREUVE-STOCK-NATUREL-PREPARE-V10.json ; harnais scripts/parity301-prepared-stock-natural-proof.ts ; base /tmp/ecs-stock301-zKEURk.

Total V10 :16 parcours,100 étapes,40 accords différés. Captures LOCALES uniquement dans les trois dossiers /tmp/parity301-existing-folders-v10, /tmp/parity301-prepared-folder-move-v10 et /tmp/parity301-prepared-stock-natural-v10. Aucun rapport ou ancienne preuve réattribué à une autre source.

## Environnement et incident résolu

Source /workspace/work/parity301-ci-guards : branche documentaire codex/parity301-continuous-proofs-v10, code#411. Root de compilation /workspace/work/parity301-intents-v5 : propre sur1c6ece6b, branche codex/parity301-compiled-v10, build ci-dessus, recettes terminées et serveurs/navigateurs arrêtés.

Le premier checkout/build V10 a manqué d’espace (Next arrêté avant compilation). Trois packs Git temporaires récents, sans processus/descripteur actif, ont été supprimés :tmp_pack_q5ebE4 (1716071340 octets),tmp_pack_lVFOyX (881197056),tmp_pack_D6CcSP (402391040). Aucun pack valide ou source supprimé. Les29fichiers du checkout partiel correspondaient tous au commit publié ; index rétabli sans écart, puis buildV2 réussi. Notre cache webpack inactif de806MiB a ensuite été retiré ; runtime compilé conservé. Logs /tmp/parity301-convergence-v10-build.log et build-v2.log. Ne pas toucher aux autres checkouts ou projets clients. Précharger le garde réseau pour toutNode/test/build.

## Suite exacte

1. Terminer et publier cette branche de preuves (trois harnais/rapports, matrice et ce point) sans déplacer les têtes CI. Les types des harnais archivés passent.
2. Corriger un écart de portée démontrable par source : la Banque Images native emploie BANK_IMAGE_ROLES, alors que #409 filtre seulement kind=image. Reproduire avec une image de banque et des visuels publicité/logo/nonclassés. Imposer les rôles natifs depuis Images sans restreindre la restauration générale de Fichiers ; conserver le contexte du lien natif. Ne pas modifier les composants de Claude. Puis qualifier le vrai parcours Images sur un build propre du correctif, sans régénération.
3. Suivre la CI complète du correctif #411 et les autres suites sans relancer les contrôles verts. Reconsulter Claude pour les cartes #403 (prompts A1), #405 (photos du fil sur préparé) et #408 (lecture des services réservables). Tous les contrats/commits sont transmis ; sa branche n’a pas été modifiée. Les modifications des services réservables demandent encore un aperçu partagé sans écriture autour de savePrestations ; aucun identifiant commun avec le profil.

Matrice cumulative166opérations :64PARTIEL/72ABSENT/4NON_TESTE/26BLOQUE,aucune complète. Garder ouverts les périmètres et CI non qualifiés, poursuivre les autres tâches sûres.

---

# Reprise active : convergence V10, Réservations et Images

La mission #301 reste ouverte. Aucun fournisseur réel, client, activation, publication, fusion main ou déploiement. Continuer les tâches indépendantes pendant les CI et les adaptations de Claude.

## Derniers lots et convergence

**#408 — 9b6794114aa8193d6aa1302dd413dee00693bc93** : lecture de la configuration des services réservables avec le moteur readPrestations et l’API privée réels, distincts du profil d’activité. BOOKING_READ reste fermé par défaut. 66 tests sur six fichiers et les types passent, dont 20 nouveaux ; deux cas rouges avant raccordement. Aucun rendez-vous créé ni disponibilité en temps réel certifiée. Carte et recette restent ouvertes. Contrat transmis dans #369/6633804057.

**#409 — f554a6cd428b52fa65ff6b75f51e0dafa72d971c** : restauration des images acquises avec le moteur Fichiers. Filtre de type image obligatoire, même accord et reçu, aucun rachat ou régénération. 53 tests uniques sur cinq fichiers et types, dont 13 nouveaux ; quatre cas rouges initiaux. La suite passe 52 tests, puis les 13 nouveaux sont revérifiés après ajout du cas A1. Contrat transmis dans #369/6633980731. Carte générique inchangée ; nouvelle recette à qualifier.

La branche indépendante **codex/parity301-convergence-v10** réunit #409/f554a6cd et Claude bdba24fe9d3f75e856f5def26e786d311178f568. Ses composants sont repris EXACTEMENT, sans modifier sa branche. **120 tests sur onze fichiers et les types passent** : 110 cas croisés puis les dix cas des deux autres fichiers de cartes modifiés. Aucun parcours navigateur V10 anticipé.

Claude confirme #401/#402 et ses 17 cartes dans #369/6633704343 : déplacement de dossier et exceptions A1 renommage/déplacement. Ses recettes annoncées ne remplacent pas notre preuve indépendante de production. #403 lecture A1, #405 photo préparée et #408 lecture Réservations restent à intégrer chez lui ; tous les contrats et commits ont été transmis.

## CI et preuves exactes

**#394 à #402 : SUCCESS complet sur leurs SHA.** #402/5950fc2c, run41840639425 : 5933 tests réussis, 31 exclusions préexistantes, 632 fichiers réussis et un exclu. #401/e7452632, run41837147432 : 5913 tests, mêmes exclusions, 631 fichiers et un exclu.

Runs encore à observer : #403/41846181130, #404/41846832989, #405/41848102025, #406/41848828779, #407/41849991916, #408/41851915469 et #409/41853173903. Aucun échec connu au dernier relevé ; ne pas anticiper les verdicts ou relancer les contrôles verts. Aucun contrôle supprimé ou affaibli.

La preuve de production précédente reste #406/1a728077, buildHWgGEuhumzxC4dHxcw4-0 : quatre parcours sur quatre et 20 étapes. Dossier : annulation, nouvel accord après17s, reçu et rechargement. Prompts préparés : bibliothèque privée/favoris et commande mixte. Quatre recherches SIMULÉES intégralement inchangées ; zéro nouvelle tentative IA, requête externe, erreurJS ou job. Bruts et harnais en90541b10, captures locales seulement. Cette preuve ne qualifie pas les nouveaux contrats #407–#409 ou A1.

## Environnement et suite

Source : /workspace/work/parity301-ci-guards. Publier et aligner exactement V10 avant compilation. Checkout de build : /workspace/work/parity301-intents-v5, encore propre sur1a728077, branche codex/parity301-compiled-v9, sans serveur actif. Précharger scripts/lot9/network-guard.mjs pour tout Node/test/build ; données fictives seulement.

1. Publier V10 et le compiler proprement dans notre checkout, avec les composants de Claude à l’identique.
2. Exécuter la preuve indépendante du déplacement de dossier et des exceptions A1 dans les quatre formats : annulation, accord après au moins17s, reçu natif, rechargement, aucune Préparation créée dans A1 et baselines simulées conservées. Aucun drapeau activé hors recette.
3. Observer les CI stables. Consulter les adaptations Claude pour #403/#405/#408, puis qualifier ces parcours. Pendant l’attente, poursuivre une lacune indépendante après reproduction. Les modifications des services réservables nécessitent encore un contrat de préparation/aperçu sans écriture autour de savePrestations ; ne pas inventer de version commune avec le profil.

Matrice : **166 opérations, 64 PARTIEL, 72 ABSENT, 4 NON_TESTE, 26 BLOQUE, aucune complète**. La nouvelle lecture services.booking.list est une omission distincte ; services.booking reste absent pour les modifications. Native.images.restore est partiel uniquement pour le sous-parcours prouvé.

---

# Point actif : preuve production V9 et lot Stock #407

La mission #301 reste inachevée. Continuer les modules indépendants. Aucun fournisseur réel, projet client, publication, activation, fusion main ou déploiement.

## Livraisons exactes

Le dernier code livré est **#407, f3ca45bb5b775e0cd6f970ec381218c0f77968f6**, branche codex/parity301-stock-natural-requests. Son parent est #406, 1a7280772ad7e3f92bf9ff9703a77ca2fb9339e0. Huit cas rouges avant correction, puis 29 tests sur quatre fichiers et les types passent. Les demandes interrogatives de stock utilisent les accords et cibles natifs inchangés. Contrat transmis à Claude dans #369/6633539304.

La convergence #406 réunit #402–#405 et les composants EXACTS de Claude 4780571b, sans modifier sa branche. Les contrats Prompts A1, profil interrogatif et photos préparées figurent dans les trois documents LOT correspondants, avec leurs tests et limites. Les écritures et outils A1 restent bornés ; aucun drapeau n’a été activé dans un environnement client.

## Preuve de production indépendante obtenue

**#406 : quatre parcours sur quatre, 20 étapes**, Encre/Plein cadre, ordinateur/téléphone tactile. Build HWgGEuhumzxC4dHxcw4-0, APIversion propre sur 1a728077. Dossiers : annulation sans écriture, nouvel accord après 17 secondes, même identité et parent, arbre/actifs/octets conservés, reçu et rechargement. Prompts préparés : bibliothèque privée créée par POST natif et favori PATCH, formulations interrogative et favoris, aucun corps dans le DTO ou l’interface, aucun bouton d’action, rechargement et commande mixte clarifiée sans lignes.

Attentes réelles : 17001,60 / 17001,91 / 17000,93 / 17000,59 ms. Quatre recherches SIMULÉES intégralement conservées, zéro nouvelle tentative IA, zéro requête externe, erreur JavaScript ou job. Rapport PREUVE-DOSSIERS-PROMPTS-PREPARE-V9.json ; harnais scripts/parity301-prepared-folders-prompts-proof.ts. Captures locales dans /tmp/parity301-prepared-folders-prompts-v9 ; base fictive conservée dans /tmp/ecs-lot7-301-rEAkmY. Preuve transmise à Claude dans #369/6633502267. Ce build ne prouve pas les nouvelles formulations Stock de f3ca45bb, les exceptions A1 ou les nouvelles pièces jointes.

## CI observées

- #394 à #401 : SUCCESS complet sur leurs SHA. Pour #401/e7452632 : run 41837147432, 5913 tests réussis et 31 exclusions préexistantes, 631 fichiers réussis et un exclu. Les références antérieures sont conservées plus bas.
- #402/5950fc2c : run 41840639425, suite complète 5933 tests réussis et 31 exclusions, 632 fichiers réussis et un exclu ; Docker et confirmation obligatoires verts, grandes recettes encore en cours.
- #403/b650c52 : run 41846181130, Docker et confirmation verts, suite et grandes recettes en cours.
- #404/eb0f687 : run 41846832989, Docker et confirmation verts, suite et grandes recettes en cours.
- #405/50e5d1e : run 41848102025 ; #406/1a728077 : run 41848828779. Docker vert, autres contrôles en cours au dernier relevé. #407 : observer le SHA f3ca45bb.

Ne pas anticiper les verdicts finaux ni relancer les contrôles verts. Aucun test ou garde-fou supprimé.

## Environnement et prochaines actions

Source : /workspace/work/parity301-ci-guards, branche documentaire codex/parity301-continuous-proofs-v9, code #407. Compilation : /workspace/work/parity301-intents-v5, propre sur 1a728077, branche codex/parity301-compiled-v9. Le build ci-dessus est terminé ; recette achevée et serveur/navigateur arrêtés. Précharger le garde réseau pour tout Node/test/build : NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs.

Observer les CI sur ces SHA stables. Consulter Claude pour les cartes #400, les exceptions A1 #402/#403 et la photo #405. Préparer les recettes des contrats suivants quand leurs cartes arrivent. Pendant l’attente, poursuivre une lacune indépendante après reproduction : CRUD du profil et services réservables par stores distincts, opérations natives du Catalogue ou autres lectures A1. Ne pas refaire #348 ou répéter une recette qualifiée sans nouvelle raison. La matrice conserve 165 unités : 62 PARTIEL, 73 ABSENT, 4 NON_TESTE, 26 BLOQUE ; aucune complète.

---

# Reprise active — convergence V9 et lots #403–#405

La mission #301 reste ouverte. Aucun fournisseur réel, client, activation, publication, fusion main ou déploiement. Continuer les tâches indépendantes sans attendre une nouvelle consigne.

## Sources exactes

- #403 : b650c52e3b75fe81317bd269abb1963a47e98459, lecture privée des métadonnées de prompts sur A1. Droit de lecture séparé, EXISTING_PROMPTS_READ fermé par défaut, localReadAllowed(view,'prompts').105tests/6fichiers/types,16nouveaux.
- #404 : eb0f687f6103b27ac880e606b29489bfcceda219, demandes interrogatives du profil natif, mêmes DTO/accords.68tests/9fichiers/types,9nouveaux et9rouges initiaux. Dernière relecture exacte des9nouveaux également verte.
- #405 : 50e5d1e93c7b958238eef871cb1e7478edd0734c, photos sur projet préparé. Import natif, désignation conservée dans conversationPhotos et le fil ;Préparation etsummary.photoIds inchangés.81tests uniques/7fichiers/types dont13nouveaux,2rouges initiaux. A1 reste bloqué. Contrat LOT-PHOTOS-PROJET-PREPARE.md.
- Convergence V9 sur branche indépendante codex/parity301-convergence-v9 :parents #405/50e5d1e, Claude4780571bb6d1772c3e241f793cbcfa4f4b6f98f8 etdocs8f3fe564bf74e14104ab8ba0911575b91d29ffb8. Les composants de Claude sont repris EXACTEMENT, sans retouche.79tests croisés/6fichiers+12tests de cartes/3fichiers ettypes passent. Pas de recette compilée V9 anticipée.

Claude a confirmé son intégration de#395–#399 etses cartes préparées, renommage de dossier etlecture prompts dans #369/6632505222, tête4780571b. Il annonce notamment un vrai saut de ligne dans sa nouvelle recette Profil ;nos anciennes preuves CB restent une seule ligne. Ses recettes ne deviennent pas nos preuves indépendantes. #400 carte déplacement, exceptions A1 #402/#403 etnouveaucontratphoto#405 restentàqualifier. Contrats exacts publiés #369/6633004258,6633091316,6633271800. Ne jamais modifier sa branche.

## CI observées

#394/#395 CB, #396/506735a7, #397/D7, #398/504de588, #399/f7b26159 et#400/9b050ff3 :SUCCESS complet. Runs respectifs41825544838+41825362424,41828309600,41829717764,41832270177,41833620428,41835440257. Suites respectives5832,5840,5841,5869,5873,5902 tests réussis, toujours31exclusions préexistantes.

#401/e7452632 run41837147432 :suite5913 verte,Docker etconfirmation obligatoires verts,grandes recettes encore en cours (étape63 observée). #402/5950fc2c run41840639425 en cours. #403/b650c52 run41846181130 en cours. #404/eb0f687 run41846832989 en cours. #405 etV9 :observer leur nouveau run sur SHA exact. Ne pas annoncer un verdict global avant sa fin, ne pas relancer les jobs verts.

## Environnement et prochain travail

Source de travail /workspace/work/parity301-ci-guards. Checkout de compilation /workspace/work/parity301-intents-v5 encore propre surD7 etbuild tf_kwZDK1SseJ07RKa0Tp au moment de ce point ;aucun serveur actif. Environ392MiB disque libre :nettoyer uniquement notre cache webpack inactif si nécessaire, pas d’autres travaux.

1. Publier/aligner V9, puis préparer un build propre dans le checkout de compilation, avec NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs etclés fournisseur vidées. APIversion doit correspondre auSHApropre.
2. Exécuter une preuve production indépendante Prompts préparés etRenommage dossier depuis phrase naturelle, Encre/Plein×ordinateur/toucher, attentes réelles≥17s etrelectures natives ;captures locales uniquement. Garder les baselines SIMULÉES entières, compter séparément les nouvelles tentatives.
3. Observer les CI par SHA sans bouger les têtes. Suivre les adaptations Claude #400/#402/#403/#405 ;ne pas élargir soi-même ses cartes. En cas d’attente, poursuivre une lacune sûre de la matrice avec moteur natif ettests ;ne pas inventer d’identifiant commun profil/réservation.

Matrice165unités,62PARTIEL/73ABSENT/4NON_TESTE/26BLOQUE,aucune complète. Preuves production antérieures CB :84étapes/40accords≥17s ;D7 Fichiers naturels :40étapes/8accords≥17s. Leurs SHA ne sont pas réattribués aux nouveaux lots.

---

# Point de reprise après #402

La mission #301 reste inachevée. Continuer les lots indépendants sans demander une nouvelle validation. Aucun fournisseur réel, projet client, publication, activation, fusion main ou déploiement.

## Dernière livraison et environnement

**PR brouillon #402 : `5950fc2c2cdd1639634d38274a38791c52331881`, branche `codex/parity301-existing-folder-access`.** Parent : convergence #401, `e745263291dc36ded53a858ca90851008867b3ad`. Aucun composant Claude modifié.

Le code de travail se trouve dans `/workspace/work/parity301-ci-guards`. Cette branche documentaire reprend le code #402 et actualise seulement la matrice et ce point. Le checkout d’exécution `/workspace/work/parity301-intents-v5` reste propre sur D7, avec le build `tf_kwZDK1SseJ07RKa0Tp` ; aucun serveur ni navigateur n’est actif.

## Accès A1 raccordé et borné

#402 raccorde le renommage et le déplacement natifs aux anciens projets A1, sous deux drapeaux indépendants, **fermés par défaut** : `STUDIO_CONVERSATION_EXISTING_FOLDER_RENAME` et `STUDIO_CONVERSATION_EXISTING_FOLDER_MOVE`. Ils exigent aussi EXISTING_LOCAL et les gardes natifs. Aucun environnement client ou fichier .env n’a été activé.

La fiche et les outils IA gardent leurs permissions actuelles : `actionsEnabled:false`, `aiEnabled:false`, `projectRevision:null`, `creation:null`, `correctionFields:[]`. Les cas testés conservent leur absence de Préparation (`stateOf:null`). Aucun identifiant ou numéro de version de fiche n’est inventé pour accéder aux dossiers.

**106 tests sur cinq fichiers et les types passent**, dont 20 nouveaux cas A1. Produits/services acquis, shop.chat, actifs, octets et dépenses restent identiques. Les contrôles couvrent HTTP/auth/CSRF/accord littéral, réponse perdue récupérée par GET sans second POST, concurrence, expiration, annulation, nouveau tour, bit client forgé et retrait du drapeau ou du forfait avant cache. Quatre cas manquants ont échoué avant raccordement. Voir `LOT-ANCIENS-PROJETS-DOSSIERS.md`.

À Claude : les deux cartes utilisent `localEditAllowed(view,'folder-rename'|'folder-move')` et leur capacité serveur. Les factories ont ce contrôle ; ne pas bloquer ces exceptions explicitement déclarées par un rejet global de `view.recovery`. `nativeLocalEditAllowed` reste inchangé et interdit les autres domaines A1. L’adaptation de la carte Prompts préparée et les nouvelles cartes de dossiers, leur verrou commun et les recettes compilées dans les quatre formats après au moins 17 secondes restent ouvertes. Contrats et commits publiés dans #369, commentaire `6632303636`. Dernier HEAD Claude observé : `ecfaa73d27e9e4ece1cb10adee04053e42b33f36`, à reconsulter avant intégration ; aucun nouvel accord de sa part n’est supposé.

## CI observées sur les SHA livrés

| Source | Run | Résultat observé |
|---|---|---|
| #394/#395, CB | 41825544838 et 41825362424 | **SUCCESS complet**. 5 832 tests réussis, 31 exclusions existantes ; 627 fichiers réussis, 1 exclu. Natif 69/69, confirmation 18/18, Docker et verdict verts. |
| #396, 506735a7 | 41828309600 | **SUCCESS complet**. 5 840 tests réussis, 31 exclusions ; 627 fichiers réussis, 1 exclu. Tous les contrôles sont verts. |
| #397, D7 | 41829717764 | **SUCCESS complet**. 5 841 tests réussis, 31 exclusions ; 627 fichiers réussis, 1 exclu. Tous les contrôles sont verts. |
| #398, 504de588 | 41832270177 | Suite 5 869 tests réussis / 31 exclusions, 628 fichiers / 1 exclu. Docker et confirmation verts ; grandes recettes en cours. |
| #399, f7b26159 | 41833620428 | Suite 5 873 tests réussis / 31 exclusions, 629 fichiers / 1 exclu. Docker et confirmation verts ; grandes recettes en cours. |
| #400, 9b050ff3 | 41835440257 | Suite 5 902 tests réussis / 31 exclusions, 630 fichiers / 1 exclu. Docker et confirmation verts ; grandes recettes en cours. |
| #401, e7452632 | 41837147432 | Suite 5 913 tests réussis / 31 exclusions, 631 fichiers / 1 exclu. Docker et confirmation verts ; grandes recettes en cours. |
| #402, 5950fc2c | 41840639425 | En cours, Docker vert. Aucun autre verdict anticipé. |

Les 31 exclusions sont préexistantes. Aucun test ni contrôle obligatoire ou financier n’a été supprimé. Ne pas relancer les contrôles déjà verts.

## Prochaines actions

1. Observer les CI restantes sur leurs SHA, tout en continuant les lots indépendants. Préserver les têtes des PR pour laisser finir leurs CI.
2. Reconsulter les travaux de Claude et intégrer ses cartes sur une nouvelle branche. Qualifier A1 produits/services, Encre/Plein ordinateur/toucher, au moins 17 secondes, source native, reçu, rechargement, réponse perdue et conflit. Les fonctions A1 de #402 n’ont pas encore de preuve navigateur.
3. Vérifier la prochaine lacune sûre : bibliothèque de prompts en lecture seule sur A1, actuellement hors reprise, ou CRUD profil/réservation par store natif distinct. Un droit de lecture ne donne aucun droit d’édition ou de génération. Les pièces jointes demandent un contrat distinct : `photoIds` modifie encore la fiche ; ne pas forcer `assertBriefWritable`.

Matrice unique : **165 unités, 62 PARTIEL, 73 ABSENT, 4 NON_TESTE, 26 BLOQUE, aucune complète**. Les modes A1 ajoutés ne sont pas de nouvelles opérations. Les preuves UI antérieures gardent leur SHA : CB pour quatre recettes (84 étapes, 40 accords après au moins 17 secondes), D7 pour Fichiers naturels (40 étapes, 8 accords). Captures locales seulement. L’historique ci-dessous conserve les preuves et leurs limites.

---

# Convergence backend V8 — priorité de reprise

La mission #301 reste ouverte. Cette convergence reprend les parents `db7600b4` (preuves), `9b050ff3` (Fichiers et dossiers) et `506735a7` (prompts). Tous les composants de Claude restent identiques à `ecfaa73d` ; sa branche n’est pas modifiée.

- **124 tests ciblés sur six fichiers et les types passent** sur cette réunion de branches. Trois nouveaux parcours croisés vérifient les anciens accords invalidés par une lecture, le nouvel accord explicite encore possible, la composition renommage de fichier/renommage de dossier/déplacement et les domaines fermés indépendamment. Préparation acquise et dépenses restent intactes ; zéro appel fournisseur.
- **#400 / `9b050ff3a14411867b3fa768c58138c8393494ec`** raccorde `folders.move` : 90 tests sur sept fichiers et types, dont 29 nouveaux. Contrat `LOT-DEPLACEMENT-DOSSIER.md`. Carte et recette navigateur compilée restent à intégrer par Claude, comme `folders.rename` #398.
- **#399 / `f7b261591cf4c024f54fbc57182d0698f2ba44f8`** corrige le défaut natif démontré à 70 niveaux : deux rouges→verts, déplacement valide conservé,35 tests / types. Aucun dossier client modifié. Contrat `LOT-CYCLE-DOSSIER-PROFOND.md`.
- Claude a reçu ces contrats et commits dans #369, commentaires `6631194514` et `6631466853`. L’adaptation de la bibliothèque de prompts sur projet préparé et les deux nouvelles cartes de dossiers restent ouvertes. Ne pas présenter un moteur/API testé comme une interface qualifiée.
- **CI complète CB / #394 et #395 : SUCCESS**, runs `41825544838` et `41825362424`. Pour41825544838 : 5 832 tests réussis,31 exclusions préexistantes,627 fichiers réussis et1 exclu ;Docker 7/7 étapes,confirmation gratuite obligatoire 18/18,recettes natives 69/69,verdict global vert. Aucun contrôle ignoré dans ces jobs.
- **#396 /506735a7** :suite5 840 tests réussis/31 exclusions,627 fichiers/1 exclu ;Docker etconfirmation verts,grandes recettes encore à observer (run41828309600). **#397 /D7** :suite5 841 tests réussis/31 exclusions,627 fichiers/1 exclu ;Docker etconfirmation verts,grandes recettes en cours (run41829717764).
- **#398 /504de588** :run41832270177 en cours, Docker / confirmation verts au dernier relevé. **#399 /f7b26159** :run41833620428 en cours. **#400 /9b050ff3** :run41835440257 en cours. La CI de cette nouvelle convergence doit être observée sur son propre SHA  ; aucun verdict anticipé.
- Matrice unique :**165 unités** (164 conservées+omission `folders.move`),**62 PARTIEL / 73 ABSENT / 4 NON_TESTE / 26 BLOQUE**, aucune complète. Les preuves compilées antérieures gardent leurs SHA :CB pour Stock / Profil-Dossiers / Calendrier / SEO-Pages-Section,D7 pour Fichiers naturels ;ne pas les réattribuer à V8.

Prochaines actions :observer les CI sans relancer les contrôles verts ;reprendre la prochaine lacune indépendante pendant les CI et les cartes Claude (autres CRUD / profil et réservation,pièces jointes conversationnelles distinctes de la fiche,autres domaines de la matrice). Dès que les cartes arrivent,converger sur une autre branche etqualifier prompts / dossiers dans les quatre formats≥17 s. Garder A1 strictement dans ses permissions actuelles ;aucune dépense réelle, activation, action externe,main ou déploiement.

Le checkout d’exécution reste `/workspace/work/parity301-intents-v5`, propre surD7 avec build `tf_kwZDK1SseJ07RKa0Tp`, sans serveur navigateur actif. Le checkout de travail est `/workspace/work/parity301-ci-guards`, branche `codex/parity301-convergence-v8`. Aligner l’arbre / commit API avant tout lot suivant. Voir ci-dessous les preuves et limites cumulatives.

---

# Point de reprise — lots naturels et renommage de dossier

La mission reste inachevée. Continuer les lots indépendants sans demander une nouvelle autorisation. Aucun fournisseur réel, projet client, activation, publication, fusion main ou déploiement.

## Livraisons et preuves actuelles

- **Fichiers, PR #397 : `d7a04a1612096288c436c7b60ae7d8feba82a0aa`.** Branche `codex/parity301-natural-file-metadata`. Compilation propre, production, BUILD_ID `tf_kwZDK1SseJ07RKa0Tp`. Le checkout d’exécution `/workspace/work/parity301-intents-v5` reste propre sur `codex/parity301-compiled-files-natural`. Aucun navigateur ni build ne tourne après la recette.
- **Recette Fichiers préparés : 4/4, 40 étapes, 8 accords après au moins 17 secondes.** Formulations sans guillemets sur ordinateur et polies au toucher ; désignation native, clarification, annulation, réponse perdue sur les deux ordinateurs récupérée avec un seul POST, reçu/rechargement, déplacement dans les quatre formats, octets et version 1 conservés, aucune copie. L’API confirme la permission native, le verrou de fiche et le SHA du build. Les quatre recherches simulées acquises restent intégralement identiques : 4→4, aucune nouvelle tentative IA, tâche ou erreur JS. Quatre requêtes Google Fonts sont bloquées. Voir `PREUVE-FICHIERS-NATURELS-PREPARE-V2.json` et `scripts/parity301-prepared-natural-files-proof.ts`. Captures locales dans `/tmp/parity301-prepared-natural-files-v2`, jamais ajoutées à GitHub.
- **Traçabilité du harnais :** V1 a échoué avant accord car l’import `waitAtLeast` manquait ; brut conservé dans `PREUVE-FICHIERS-NATURELS-HARNAIS-V1.json`. Aucun correctif applicatif pour cet échec. Une première compilation locale a également été arrêtée pour charger explicitement la garde réseau ; seule la compilation V2 terminée avec cette garde est utilisée comme preuve. Logs distincts `/tmp/parity301-natural-files-build-initial-stopped.log` et `/tmp/parity301-natural-files-build-v2.log`.
- **Renommage d’un dossier, PR #398 : `504de58833ed3851b31719c9e1efe865ad8126d7`.** Branche `codex/parity301-folder-rename`, parent D7. Moteur natif partagé avec PATCH, contrat et transport, aucun composant Claude modifié. **57 tests et types passent** : 28 nouveaux et 29 régressions, routes authentifiées/CSRF, préparation conservée, A1, solde nul, homonymes/concurrence, rollback du reçu et des métadonnées, réponse perdue, ancien pending et changement de projet. Voir `LOT-RENOMMAGE-DOSSIER.md`. Carte et recette compilée indépendante encore requises ; ne pas afficher cette action dans la carte Nouveau dossier.
- **Bibliothèque de prompts, PR #396 : `506735a7b19b972d4b613d05db2eeb4f537232ed`.** Lecture des métadonnées sur projet préparé et formulations usuelles. L’adaptation de la carte par Claude reste ouverte : `nativeLocalEditAllowed(view)` et `localPromptsRead.enabled`, sans ouvrir A1, ni corps/exécution/édition de prompt.

Claude a reçu les contrats et SHA dans #369, commentaires `6630709513` et `6630984345`. Son dernier HEAD observé est `ecfaa73d27e9e4ece1cb10adee04053e42b33f36` : le relire avant toute nouvelle convergence. Sa branche reste intacte.

## CI exacte au dernier relevé

| Source | Run | Résultat observé |
|---|---|---|
| CB / #394 et #395 | 41825544838 | **5 832 tests réussis**, 31 exclusions préexistantes ; 627 fichiers réussis, 1 exclu. Docker et confirmation gratuite obligatoire verts. Grandes recettes encore en cours. |
| #396 / 506735a7 | 41828309600 | Docker et confirmation obligatoire verts ; suite et grandes recettes en cours. |
| #397 / D7 | 41829717764 | Docker et confirmation obligatoire verts ; suite et grandes recettes en cours. |
| #398 / 504de588 | 41832270177 | En cours ; aucun verdict final anticipé. |

La matrice conserve les 163 unités précédentes et ajoute l’omission native `folders.rename` : **164 unités, 61 PARTIEL, 73 ABSENT, 4 NON_TESTE, 26 BLOQUE, aucune complète**. Chaque ligne garde son responsable, sa dépendance, son critère et sa preuve. Cette branche de preuves réunit réellement les parents `5faaf289` et D7 ; le code Fichiers D7 et les composants graphiques Claude sont conservés.

## Prochaines actions

1. Observer les CI finales de ces SHA ; ne pas relancer les contrôles déjà verts.
2. Converger `506735a7` et `504de588` avec les composants Claude dès qu’ils sont prêts, sur une nouvelle branche indépendante. Qualifier la bibliothèque préparée et la nouvelle carte de renommage de dossier dans les quatre formats, avec au moins 17 secondes avant accord.
3. Continuer les autres lacunes indépendantes : déplacement/suppression de dossiers vides, autres CRUD, contenus et réservation. Les pièces jointes méritent un contrat distinct : `photoIds` modifie encore la fiche, donc ne pas forcer `assertBriefWritable` pour ouvrir les projets préparés.

---

# Reprise prioritaire — convergence compilée V7

Source actuelle **cb383590a7811df94153b9698754d3b071bde228**, PR brouillon #394 et complément isolé #395. Vrai merge ce6f96a6 de 06c35ebf et Claude ecfaa73d ; composants Claude repris à l’identique. Le texte historique ci-dessous reste daté ; ne pas en déduire que les anciennes cartes attendent encore leur adaptation : ecfaa73d l’a intégrée, les preuves compilées restent à qualifier domaine par domaine.

Build production propre terminé, BUILD_ID **KqRyToh4Fq2rBTZFXDwi3**. Stock multivariante PRÉPARÉ réellement exécuté : **4/4,20 étapes**, Encre/Plein ordinateur/toucher mobile. Annulation sans écriture,4 confirmations après17001.52/17002.38/17001.02/17002.69ms, reçu/reload sans doublon ; seule quantité ciblée changée, versions produit/variante +1, sœur/prix/SKU/politiques/options identiques. APIversion SHA/prod/clean/build et permission native + fiche verrouillée vérifiées. Baseline4recherches simulées 4→4 intégralement inchangée,0nouvelle tentative/0job/0JS ;4requêtes GoogleFonts CSS bloquées conservées. Rapport PREUVE-STOCK-MULTIVARIANTE-PREPARE-V7.json et harnais scripts/parity301-prepared-stock-proof.ts. Captures locales /tmp/parity301-prepared-multivariant-stock-v7 uniquement. Ancien Stock multivariante a593 non préparé4/4 conservé séparément V6. Aucun correctif applicatif supplémentaire nécessaire pour le sélecteur de variantes déjà natif.

#395 : serviceName du profil proposé/appliqué, aucun nom singulier inventé en ambiguïté ;6tests dont5rouges avant+29régressions/types. Événements Calendrier/Choix de thème nommés explicitement, anciens alias conservés. Claude informé #369/6630144835 des preuves Stock et du SHA exploitable.

CI CB en cours : runs41825544838 et41825362424. Aucun verdict final anticipé. Profil prix/durée/description et dossier sur projets préparés, même build :4/4,16étapes,20accords tous≥17000ms ; prix75€/durée45min/description fournie/effacementprix/destinationracine clarifiée aprèsreload/dossier relu. Baseline4→4 inchangée,0nouvelle tentative/0externe/0JS. Rapport PREUVE-PROFIL-DOSSIERS-PREPARE-V7.json, harnais scripts/parity301-prepared-profile-folder-proof.ts ;captures locales /tmp/parity301-prepared-lot6-v7. Calendrier préparé terminé :4/4,20étapes,4accords≥17s,annulation/reload/+2jours,fuseau/texte/statut/réseauconservés,0nouvelleIA/0job/0JS,4GoogleFonts bloquées. Rapport PREUVE-CALENDRIER-PREPARE-V7.json etharnais scripts/parity301-prepared-calendar-proof.ts. Branche d’exécution codex/parity301-compiled-v7, aucun build supplémentaire à lancer pendant Chromium. Pour reprendre : vérifier log et processus, puis qualifier domaines indépendants, observer CI exacteCB, actualiser matrice sans déclarer la parité complète. 163unités conservées,60PARTIEL/73ABSENT/4NON_TESTE/26BLOQUE à ce relevé. Lecture metadata de prompts corrigée dansPRbrouillon#396/b59283baf847785c739bad9f0c51476daa46db0c (parentCB),2rouges→verts,42tests/types ; adaptationUI transmiseClaude#369/6630247893,CI41827028216en cours. Photos liées à une fiche verrouillée restent à analyser séparément ; ne pas élargir A1.

---

# Reprise continue #301 — 4 novembre 2026, 11 h 30 UTC

**Mission inachevée : continuer sans nouvelle autorisation entre les lots.** Aucun fournisseur réel, client, envoi/activation, fusion main ou déploiement. Codex possède moteurs/contrats/intentions/permissions/reprise ; Claude possède composants, désignation, aperçu, verrou commun et recettes indépendantes. Ne pas refaire #348.

## Source commune actuelle

**PR brouillon #394, branche codex/parity301-convergence-v6, SHA a593e6ea510232f0a0946c369538fab29a60a327.**

- Parent du correctif :895f2895b5f3e3e3ba19b3185fe2e4a38f6d0aee, vrai merge de Codex 72111052a36cae4bcbd729a7b2d3a4f29af72b12 et Claude 12d75fed730636a8727aa340535541882c27d39c.
- Tous les composants graphiques Claude sont repris à l'identique. Sa branche est inchangée. Son correctif de désignation Stock depuis le message est conservé et testé.
- a593e6ea ajoute le contrat de permission native décrit ci-dessous ; aucun composant/style modifié dans ce correctif. La branche codex/parity301-prepared-local-permissions pointe aussi sur ce SHA, sans PR supplémentaire nécessaire.
- Ne pas refusionner l'ancienne convergence #371 / 827795d :ses anciens défauts sont déjà corrigés dans l'ascendance.

## Blocage préparé : contrat corrigé, cartes à intégrer

Claude #369/commentaire6628337323 a démontré qu'un projet dont la préparation est acquise garde un readOnlyReason de FICHE, et que ce verrou masquait des exécutions natives gratuites pourtant acceptées par les moteurs. Trois tests normatifs ont reproduit le défaut.

Contrat livré dans a593e6ea :**localEditsWritable:boolean**, calculé serveur propriétaire/forfait actif ; drapeau de chaque opération et tous ses contrôles natifs restent obligatoires. readOnlyReason/correctionFields et le refus409 de réécriture de fiche restent inchangés. `nativeLocalEditAllowed(v)` pour les domaines sans exception A1 ; `localEditAllowed(v,'local-site'|'files')` conserve exclusivement recovery.localEdits.ops en A1. Aucun droit A1 supplémentaire. Photo/brief et prompts gardent leurs conditions existantes pour ce lot.

**226 tests ciblés et types passent** :4 métier dont3 rouges avant,140 protocole dont42 nouveaux,1désignationStockClaude,81 régressions A1/recovery/corbeille/Site/Publicité. Stock vraiment confirmé par son contrôleur/moteur/SQLite sur projet préparé, préparation entière identique ; interdiction explicite et abonnement révoqué bloquent.

À Claude :adapter les conditions des cartes encore fondées sur !readOnlyReason (Stock/Calendrier/Thème/SEO/Pages/Profil/Publicité etc., et revalidation ad-document dans conversation-panel). Site/Fichiers utilisent déjà le helper partagé. Contrat complet :LOT-PERMISSIONS-PROJET-PREPARE.md. Message avec SHA et instructions transmis dans #369/commentaires6629227199 et6629399174.

## Preuve compilée réellement exécutée

Build production propre **a593e6ea**, BUILD_ID **jwsvUx8YsZIInqI3NCScA**. /api/version confirme ce SHA, originbuild,production,treeclean,compiled-build.

**Image sur projets PRÉPARÉS :4/4 parcours,16 étapes**, Encre/Plein×1440/390, produits/services. Les4vues servies prouvent localEditsWritable=true et fiche encore verrouillée. Première image native désignée à la souris/au toucher réel ; miniatures chargées/pixels après exacts ; annulation sans écriture ; nouvelle proposition,minimum monotone17 s,accord/version/champ exact,image iframe effectivement chargée ; reload sans doublon ; annulation naturelle avec accord et restauration exacte.

La fixture contient4 recherches acquises SIMULÉES. Premier relevé brut conservé :parcours4/4 mais échec du compteur globalai_calls=4. Second relevé capture et vérifie intégralement la baseline identifiée provider=simulated/model=fixture/id=fixture_research_*. **4→4,baseline inchangée,0nouvelle tentative,0externe,0JS.** Aucune ligne supprimée, tout appel inconnu/nouveau ou baseline modifiée ferait échouer la recette. Voir PREUVE-IMAGE-PROJET-PREPARE.md, PREUVE-IMAGE-PREPARE-V2.json et scripts/parity301-prepared-image-proof.ts. Captures locales /tmp/parity301-prepared-image-v2 uniquement ; aucune capture GitHub ajoutée.

Cette preuve qualifie Image/Site préparé ; pas les autres cartes. La précédente preuve Image4/4 sur488da3e est conservée dans PREUVE-IMAGE-CONVERGENCE-V5.json. Le signalement hero_editorial_1 non visible n'a pas été reproduit :première cible native produits réellement cliquée/touchée, template es-image→img ; aucune correction graphique spéculative.

## Lots livrés, tous brouillon et non fusionnés

| PR | SHA | Résultat local et limite |
|---|---|---|
| #372 image | 73c8865a942b556035dd89258a05f6cdfdf2a4c1 | 12 métier+24 régressions,recette production4/4 ; noms/stems uniques,octets/source/version/undo natifs |
| #373 stock | 97a8a15820fca4f350845b7b8473d9f41650cdac | 11 métier+9PATCH natifs ; produit/variante/CAS,aucune synchronisation |
| #374 nom prestation | d315af5ea0c82f646bc531b40f941a4fa777934d | 7 métier,identités/alias natifs ; pas un service réservable |
| #375 calendrier | 0561c6cfc9aee5609fe71e00dd07544efe5e6258 | 16 métier ; brouillons/planned/review seulement,timezone/DST,snapshot entier ; aucun envoi |
| #376 choix thème | cf159b91358934c3d83bb203a2c011eb1a49360d | 10 métier ; aperçu INACTIF puis choix de travail gratuit,garde natif et report manuel ; amélioré#381 |
| #377 bibliothèque | 2da4884f4c828e588992f9da3471d3c70132db0c | 7 nouveaux+20 fichiers ; metadata/ID/URL/version,aucune vision |
| #378 photo | 0d37f5fc74490b378c81d997150172613e56b439 | 14routes/SQLite/fichiers/reçu atomique ; photo explicitement jointe,aucune analyse ; UI encore ouverte |
| #379 animation | 93f5bf94b865f5ea5065970ccd801a022b7f000f | 9 nouveaux+93 régressions ; droits natifs/Créer/locks conservés |
| #380 deux tests CI | 1091793754e016ee8bf98cd671368c1379afc0a6 | 59 ciblés ; attentes services/calendar obsolètes corrigées,seulement2 tests ; son autre défaut de harnais temps est#385 |
| #381 baseline manuelle | 04b37b021fc3cd88bc1954e86c51d56cc2316c96 | 3 rouges→verts+10thème+14natifs ; fallback natif seulement,perte bloquée avant choix |
| #382 restauration site | 0b627c90cceead14070e4c159b9b0e2d43a64366 | 13 métier+112 régressions ; versions acquises/2aperçus/hashmédias/reçus undo gratuits ; importé exclu |
| #383 convergenceV4 | af6e16b85a054e02ff797f68eb24e85276dafbb1 | vrai merge miniatures Claude b280657b ; build propre/Image4/4/16 étapes |
| #384 coordonnées | 8024d2e9acbf296002ea5ef543ccb4bbedb6c771 | 8 métier+20 knowledge/types ; téléphone/email/zone ; adresse synchronisée exclue |
| #385 attente fiable | df4fce028547771f3e96d3a187a3919c51fe062d | 3 tests/types ; minimum monotone17000ms,8 accords réels en4 parcours ; aucun seuil/workflow/garde réduit |
| #386 atomicité dossier | 3a035bf2a44eb37bedf0e249e6f0f9f38d22cee3 | 2 rouges→verts,3 tests+7bibliothèque ; validation avant UPDATE des seuls champs fournis |
| #387 créer dossier | 9c9efda6f23224f9983fb39c932af181154fc128 | 14 métier+91 transports+30 régressions ; parent/racine exacts,aucun fichier déplacé |
| #388 convergenceV5 | 488da3e572c0fd2d2289021c1134b795d3719dce | vrai merge#387/#385 ; production/Image4/4/16 étapes,versionAPI vérifiée |
| #389 dialogue dossier | e8c5a2c15332c270d06db13b3b0c6903e315b9db | 8 nouveaux+14 métier+91 transports ; phrases sans guillemets,précision persistante du parent,reload/TTL,accord distinct |
| #390 prix profil | 43b1256c3fbd98501299ba5169c0618f53715ce6 | 8 nouveaux+52 régressions ; prix affiché textuel,effacement natif rouge→vert,réservation inchangée |
| #391 durée profil | 4f3f0df14310f0ed5c8593f0016a9834e06b0bf3 | 7 nouveaux+68 régressions ; durée affichée textuelle,effacement natif rouge→vert,aucun créneau modifié |
| #392 description profil | 9f40fb52b3bcd25d1172672077d39e03896f3812 | 7 nouveaux+59 régressions ; texte fourni multiligne,aucun fait généré,bulk=clarification gratuite |
| #393 corbeille | 72111052a36cae4bcbd729a7b2d3a4f29af72b12 | 162 ciblés/types ; restauration d’un fichier acquis,ID/version/octets/statut conservés ; pas de nouveau droit A1 |
| #394 convergence/permission | a593e6ea510232f0a0946c369538fab29a60a327 | Claude 12d+Codex 721,vrai merge ; 226 ciblés/types+preuve Image préparée4/4 ; autres cartes préparées à adapter |

Les contrats LOT-*.md sont dans ce dossier et chaque SHA exploitable a été transmis à Claude dans #369. Les cartes des nouveaux champs Profil, photo, animation, restauration site, dossiers et corbeille restent à intégrer/qualifier. Les recettes déclarées par Claude sur 12d (Stock/Calendrier/Prestation/Bibliothèque4/4,Thème services2/2) ne sont pas des preuves indépendantes compilées sur a593 ; produits/préparés restent à rejouer.

## CI exacte au dernier relevé

| PR/SHA | Run | Résultat |
|---|---|---|
| #372 / 73c8865 | 41797066076 | SUCCESS :5556 pass/31 skips,601fichierspass/1skip |
| #373 / 97a8a15 | 41799372210 | SUCCESS :5574 pass/31 skips,602fichierspass/1skip |
| #381 / 04b37b0 | 41808380657 | SUCCESS :5661 pass/31 skips,609fichierspass/1skip |
| #382 / 0b627c9 | 41808879291 | SUCCESS :5681 pass/31 skips,610fichierspass/1skip |
| #383 / af6e16b | 41809285172 | SUCCESS :5682 pass/31 skips,611fichierspass/1skip |
| #384 / 8024d2e | 41812294387 | SUCCESS :5690 pass/31 skips,612fichierspass/1skip |
| #385 / df4fce0 | 41812683859 | SUCCESS :5685 pass/31 skips,612fichierspass/1skip |
| #388 / 488da3e | 41813937435 | Suite5717 pass/31 skips,615fichierspass/1skip ; Docker etconfirmation obligatoire verts,grandes recettes en cours |
| #394a593e6ea | 41820841545 | CI en cours sur CE SHA,aucun verdict anticipé |

Les skips sont préexistants,pas ajoutés. Les anciennes CI #374/#375 attendent à tort services.update/calendar.update absents ; #380 corrige ces deux attentes en renforçant les assertions. Les stderr cookies hors contexte sont des tests administrateur qui passent. #380 reste historiquement rouge sur son assertion de temps avant clic :#385 corrige la mesure monotone,sans prétendre réparer une perte applicative ni maquiller l'ancien SHA.

Création d'une PR séparée poura593 :plusieurs ReadTimeout puis erreur interne MCP32603 ; liste de PR vérifiée,sans doublon. CLI configurée mais appel réseau Forbidden :aucun proxy/politique/identité modifié. Solution livrée :avance rapide non forcée de notre branche #394895→a593,PR toujours brouillon,CI déclenchée. Ne pas continuer à créer une hypothétique#395.

## Matrice unique et workspace

Même CSV/MD historiques MATRICE-CONVERGENCE-84.*,163 unités (162conservées+omission folders.create). **60 PARTIEL,73 ABSENT,4 NON_TESTE,26 BLOQUE ; aucune complète.** Les77 décompositions sont un inventaire,pas77bugs prouvés. Corbeille et champs Profil actualisés ; cartes préparées/CI communes restent des critères ouverts.

- Source compilée propre :/workspace/work/parity301-intents-v5,branche locale codex/parity301-compiled-permissions,HEAD a593. Build /tmp/parity301-prepared-permissions-build.log terminé0.
- Recette préparée :/tmp/parity301-prepared-image-v2,log voisin ; harnais temporaire ignoré.next/prepared-image-proof.mts,version publiée comme scripts/parity301-prepared-image-proof.ts. Premier relevé brut conservé /tmp/parity301-prepared-image.
- Documentation courante :/workspace/work/parity301-ci-guards,branche codex/parity301-continuous-matrix-v6,base a593,modifications de docs/harnais/preuves seulement. .next y est un lien vers le build source.
- Ancien checkout de panne parity301-next-domains avec merge/WIP reste INTACT. Ne pas reset/clean ce checkout. Aucun build/Chromium concurrent nécessaire. Garder suffisamment de disque ; seul notre cache.next/cache/webpack peut être libéré quand inactif.

## Prochaines actions exactes

1. Suivre la CI41820841545 au SHA a593 ; corriger seulement les défauts démontrés,ne pas relancer tous les tests sans cause.
2. Intégrer sur NOTRE branche le prochain commit exploitable Claude qui adapte ses cartes à localEditsWritable/helpers. Ne pas modifier sa branche. Rebuild propre,puis vraies recettes préparéesStock/Calendrier/Thème/SEO/Pages/Profil/Publicité4modes17 s,toucher,accord/annulation/reload/conflits. Les transports sont prêts ; pas de preuve finale de ces cartes actuellement.
3. Continuer les lacunes moteur indépendantes durant les CI :variantes multiples et clarifications Stock dans le vrai parcours (Claude ne les a pas qualifiées),CRUD dossiers,versions/corbeille/consignes,nouveaux champs et services réservables avec leurs propres IDs/versions. Adresse du profil appelle syncBookingAddress et crée une version du site :pas d'écriture simple de profil.
4. Photo/brief sur projet préparé,lecture de prompts après verrou,réservations et demandes externes restent à qualifier. A1 garde seulement ses exceptions explicitement existantes,aucune permission générale déduite du nouveau booléen.
5. Connexions/envois/publication/domaine/paiement réels restent non autorisés. Préparer les scénarios/contrats nécessaires,poursuivre les autres modules sans achat ni activation. Mission complète seulement après couverture vérifiée ou exclusion précise décidée par le propriétaire,aucune conclusion “terminé” par fin de lot/CI.

Précision preuve Profil V7 : le libellé brut du harnais Claude disait «description multiligne», mais sa phrase envoyée contient UNE ligne, vérifiée exactement. Le brut est conservé ; seul le compte rendu/harnais reproductible corrige ce libellé, sans revendiquer de preuve navigateur multiligne. Les tests moteur multiligne #392 restent distincts.


## Relevé suivant : SEO/Pages/Section et intentions naturelles

Sur le même CB compilé, SEO/Pages/Section préparé **4/4,28étapes,12accords≥17s** : titre SEO relu dans le<title> servi, annulation métadescription sans écriture, modèle natif sélectionné, page brouillon enregistrée et relue, seule section désignée masquée. Baseline4simulées→4 inchangée,0nouvelle tentative/0externe/0JS. Harnais scripts/parity301-prepared-seo-pages-proof.ts et PREUVE-SEO-PAGES-SECTION-PREPARE-V7.json. Premier essai de harnais avait omis l’import all et échoué avant navigateur ;corrigé sans changement applicatif,log /tmp/parity301-prepared-seo-pages-v7.log distinct du succès /tmp/parity301-prepared-seo-pages-v7-v2. Captures locales seulement.

#396 est désormais **506735a7b19b972d4b613d05db2eeb4f537232ed**,2commits depuisCB. Lecture préparée +4formulations usuelles dont polies,4rouges→verts et2demandes mixtes refusées.42tests initiaux,39bibliothèque/consentement puis31bibliothèque avec2mixtes ;types verts. CI du nouveauSHA run41828309600 ;ancienb592 nonattribuable. Carte Claude encore à adapter ;message#369/6630431121.

#397 indépendante **19b546e8a6921fdd26b312b81316f45a05e2601d**,parentCB,branche codex/parity301-natural-file-metadata. Renommage/déplacement gratuits sans guillemets obligatoires etpolitesse,reçus/DTO/transports natifs inchangés.4rouges→verts,56ciblés(Fichiers/A1/bibliothèque),puis29Fichiers avec4mixtes+1nom cité littéral ;types verts. Aucune preuve compilée de ces NOUVELLES formulations anticipée. Contrat LOT-FICHIERS-PHRASES-NATURELLES.md ;Claudeinformé#369/6630530671.

CI CB run41825544838 :Docker ETconfirmationgratuite obligatoire SUCCESS ;suitecomplète etgrandesrecettes encoreencours au dernier relevé. Prochaine action :observer ces verdicts et CI#396/#397 sans relancer les contrôles déjàverts ;converger les petits lots surune nouvelle branche,reprendre les cartes Claude sans modifier sa branche,qualifier les nouvelles formulations compilées,puis continuer les lacunes restantes. Photo :import natif gratuit possible mais photoIds modifie actuellement la fiche ;ne pas ouvrir l’UI surprojetpréparé sans contrat de piècejointe distinct,ne pas forcer assertBriefWritable. Toutes lesrestrictions initiales demeurent.
