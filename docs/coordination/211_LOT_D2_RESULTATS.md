# #211 — D2 : retoucher un vrai thème depuis SYNA puis annuler

Livraison D2 pour revue dans **PR #216**, sans fusion. Application testée `8c1f288161a121a69488eb5cad4cb1a2cf18129e` ; **build propre réellement servi et capturé `974d2b9e6956a0a5ecde150c27e921488d964ca4`**. Entre ces deux commits, seules les vérifications navigateur ont été étendues aux images et à la stabilisation des captures ; aucun fichier `src/`, `worker/` ou test applicatif n’a changé.

[Galerie : 22 captures et 2 vidéos](preuves-211-D2/README.md) · [preuves structurées](preuves-211-D2/verifications.json) · [absence de réservation pour les opérations locales](preuves-211-D2/budget-simule.json). Les fichiers de rapport et preuves sont ajoutés après cette recette, sans changement applicatif.

## Résultat de cet incrément

SYNA reçoit une demande naturelle avec le texte exact à reprendre. La réponse IA propose des opérations structurées sur les champs présents dans la version du thème du propriétaire. Le devis local montre l’avant/après, à **0 % supplémentaire** ; son accord lance un job natif, qui applique les opérations et crée une vraie version. La carte de résultat renvoie cette version et son aperçu. L’annulation exige son propre devis/accord, crée une troisième version identique à la première et conserve tout l’historique.

Le même panneau, la même conversation et la mémoire du projet sont conservés. La réponse IA garde son devis normal ; application et annulation exactes ne font aucun appel fournisseur et n’ont aucune réservation IA. Le traitement interdit explicitement l’IA avec le garde natif `withAiDisabled`, indépendamment du corps libre d’une requête.

La génération de nouveaux textes, images, thèmes ou compositions n’est pas ce lot : le texte proposé doit figurer exactement dans les sources client, et les images doivent déjà appartenir à sa bibliothèque. Autres outils et actions sensibles restent non raccordés. E/F2 se poursuivent ensuite.

## Moteurs et protections conservés

- Base D1 #215 `5427f9838cca463995918833ea5ad114df435491`, puis F1 #214, C/B, #208/#210. Le correctif de harnais CI de F1 `6c98263` est déjà identique dans D1 ; pas de changement applicatif de ces dépendances ni de fusion.
- Registre de contrats stricts, proposition IA datée de la même conversation/fiche, devis distinct et confirmation ; fonctions natives `applyOps`, `assertThemeOperations`, `validateSpec`, `saveThemeVersion(expectedParent)` et `themeVersion`.
- Authentification/propriétaire, CSRF, forfait courant vérifié au devis, à l’accord et dans le worker ; révisions, version parent, consignes, disponibilité des médias et empreinte avant exécution.
- Aucun code, Liquid/JavaScript, changement de structure ou déverrouillage fourni par le modèle. Une section verrouillée, masquée ou un modèle sans page reliée est refusé. Les URL d’aperçu viennent du routage natif et des affectations réelles des produits/pages.
- Toute opération rejetée fait refuser le lot avant sauvegarde. Les champs déjà identiques sont acceptés avec les vrais changements ; un lot entièrement identique ne crée aucune version inutile. La même image sous un autre alias ne crée pas une fausse retouche.
- Idempotence du devis/job ; une version acquise avant interruption n’est pas recréée. Un job done sans version/empreinte conforme n’est pas livré. Une sauvegarde effective sans fermeture de tâche est affichée séparément comme version enregistrée à vérifier.
- Restauration : version courante inchangée depuis l’opération, contrôle qualité non refusé, médias encore disponibles, nouvelle version, aucun effacement. Une modification manuelle concurrente est conservée.
- Une proposition acquise peut être réutilisée après un échec local sans effet, par un nouveau devis/accord gratuits ; aucune nouvelle réflexion facturante n’est imposée pour relire cette proposition.
- Budget commun natif inchangé ; les opérations locales restent possibles avec budget IA épuisé, sans nouveau droit commercial. Drapeaux fermés par défaut, avec `STUDIO_CONVERSATION_THEME_TOOLS=1` nécessaire en plus des dépendances.
- Les textes longs sont représentés dans le contexte IA par une référence explicitement non lue, pas par un fragment présenté comme complet. Leur avant/après entier reste conservé dans le devis natif. Les 40 médias récents sont listés avec le total disponible, aucun fichier supprimé.

## Vérifications effectivement exécutées

Deux scénarios Chromium finaux réussis sur le serveur compilé propre : produit sur ordinateur et service sur téléphone. Demande libre → réponse simulée → avant/après → accord → version 2 → **titre H1 réellement rendu exactement égal à la demande** → reconnexion sans appel → annulation → version 3 exactement identique à la première. Les champs non ciblés sont comparés intégralement ; aucune réservation pour les jobs locaux. Contrôles HTTP 403 CSRF, 404 autre compte, 400 corps forgé, et largeur 360 px.

Le harnais a d’abord visé un titre secondaire puis supposé les mêmes champs dans deux compositions différentes. Le contrôle du H1 a correctement refusé ces preuves. La fixture fournisseur est désormais construite à partir du H1 effectivement rendu, de son attribution native et des champs du schéma présent. Cela ne qualifie pas la capacité d’un modèle réel à choisir la bonne cible : elle demeure non testée. Aucune règle applicative fondée sur un nom de projet/démonstration.

Un **vrai blocage injustifié** a aussi été reproduit : le compteur natif ne compte pas un réglage déjà identique comme une écriture. Le nouvel adaptateur comparait à tort le nombre d’écritures au nombre de propositions et refusait un titre dont la première partie était déjà correcte. Correction : garder le refus de toute opération réellement rejetée, accepter les champs déjà satisfaits et vérifier l’absence de changement global avant d’enregistrer. Test spécifique ajouté, sans retirer le test de refus des lots partiellement invalides.

Le premier préflight a été refusé avant envoi fournisseur car le contexte du serveur compilé différait du worker modifié depuis le build. Reconstruction des deux, sans affaiblir l’empreinte du devis. Un contrôle types a également croisé le renouvellement des fichiers générés `.next` ; il est relancé après la fin du build. Ces essais non finaux ne sont pas présentés comme des livraisons réussies.

Contrôle d’image supplémentaire depuis SYNA sur le produit : sélection du fichier du projet dans la proposition simulée → devis avec les deux vrais visuels → accord → version 4 → comparaison exacte des octets rendus et décodage → annulation distincte → version 5 identique à la première. Les trois versions du service et cinq versions du produit sont conservées. Les médias sont des diagrammes de test locaux explicitement annoncés, pas des images IA ou des photos client.

Le premier contrôle d’image cherchait le nom du fichier dans son URL. Il a échoué : le transport sécurisé natif incorpore le média en `data:`. Inspection du DOM : PNG décodé, largeur 1400 px, bon fichier enregistré. Le test compare désormais le contenu binaire réellement affiché au média attendu et à l’original après annulation ; aucun contournement applicatif ni assertion supprimée. La première capture a également croisé la transition de largeur de l’aperçu : les captures finales terminent les animations finies avant leur prise, tandis que les vidéos gardent toute la séquence réelle.

Commandes réellement exécutées depuis la copie isolée :

```bash
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx vitest run
npx vitest run tests/conversation211-theme-tools.test.ts tests/conversation211-tools.test.ts tests/conversation211-intelligence.test.ts tests/conversation211-native-billing.test.ts tests/conversation211-request-bounds.test.ts tests/theme.test.ts
npx tsc --noEmit
scripts/verify-theme.sh --rapide
NEXT_TELEMETRY_DISABLED=1 XDG_CACHE_HOME=/tmp/ecom209-font-cache npm run build
CHROMIUM=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=/tmp/ecom211-playwright XDG_CACHE_HOME=/tmp/ecom209-font-cache NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx tsx scripts/verify-agent211-build.ts /tmp/ecom211-D2-delivery --theme-ui
```

Le nouveau passage ciblé de livraison conserve explicitement cette commande et l’empreinte de son journal dans les preuves. Suite complète gelée : **3 628 réussis / 45 ignorés**, 420 fichiers réussis / 1 ignoré, 669,67 s. **92 ciblés**, types après build, compilation propre, 24 cas Theme Check rapides et ZIP réussis, 35 avertissements conservés. Les ajouts ultérieurs au harnais n’ont pas justifié une nouvelle suite applicative complète ; types et parcours compilés finaux repassés.

Six appels HTTP de génération **simulés** au total, six usages, 47 472 micro-euros simulés : trois de contrôle du socle, deux pour le scénario produit et un pour le service. Les six jobs d’application/annulation ont zéro réservation et zéro appel IA. **Zéro appel fournisseur réel, coût réel 0 €**. Les compteurs de simulation ne sont pas une facture fournisseur.

22 captures originales inspectées et 12 images réparties dans les deux vidéos, avec ouvertures des images clés. Vidéos réelles continues de Chromium, transcodage seul : produit 483 images / 19,32 s en 1440×960, service 278 images / 11,12 s en 390×844 ; aucune coupe ni accélération. Le contrôle 360 px attend la mise en place réelle du panneau mobile. Aucun débordement du Studio ni erreur JavaScript dans ces parcours.

La CI D1 `40690196832` a fini avec succès. CI de la dernière tête D2 à suivre, non présumée verte ; tous les contrôles antérieurs restent présents.

## Limites et suite

Fournisseur HTTP local simulé ; aucun appel réel, coût réel nul. La qualité d’interprétation/copywriting IA réelle reste non qualifiée. Les sites de recette sont des fixtures techniques avec diagramme local annoncé, pas les démonstrations validées ni des sites professionnels générés. Aucun CMS installé, publication, paiement, Safari ou téléphone physique testé.

Ne ferme pas #211. E : plan déclaratif sûr et versionné, vrais rendus comparés/corrigés et exports sur trois jeux mono/multi/service plus cas nouveaux ; F2 : raccorder ces résultats au même SYNA. Autres outils métiers D à étendre progressivement, toujours explicitement indisponibles tant qu’ils ne le sont pas. Aucune fusion, activation réelle, nouvelle connexion, dépense, donnée client/démo ou redémarrage de Studio réel.
