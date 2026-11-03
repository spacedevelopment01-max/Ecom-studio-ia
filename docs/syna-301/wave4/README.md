# SYNA #301 — lot validé, tête be59ddef

Consigne exécutée : commentaire6605791977 de #301 et demandes/preuves de Claude #358. Les trois priorités de ce lot sont livrées ; aucune affirmation de parité complète du Studio.

## Livraison et CI complète

| PR | Objet | SHA exact | CI |
|---|---|---|---|
| #356 | Assertion du verrou global | 759a2e34c21bc203e87e77461d3a701093ec1595 | [41650826363 SUCCESS](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41650826363) |
| #359 | Couleurs, FAQ, annulation natives par phrase | 95d2d79b0890814aedcd9a20090884832861d9d6 | [41661276805 SUCCESS](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41661276805) |
| #360 | Ajustements publicitaires V2 annoncés | e4aa91b9c3723dc3a347d08647ff2b70a7beb298 | [41654870389 SUCCESS](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41654870389) |
| #362 | Rendu natif des couleurs privées | 580d8105cd1a71ec5e5d703dbd01aed450c3952a | [41664285864 SUCCESS](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41664285864) |
| #361 | Convergence de référence | be59ddefe44f8d74b4610f23d7d52be0ab5e08d5 | [41661352329 SUCCESS](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41661352329) |

Arbre livré : e2c2d1ca46702ec09204e6b7c91bea1d405de17a. Les quatre contrôles obligatoires et le verdict global sont verts sur cette tête : types/suite complète, Theme Check/build/recettes natives, Docker et confirmation gratuite dans le Studio compilé. Aucun contrôle contourné.

Résultat exact de la convergence : **5370 tests PASS,31 ignorés historiques ;581 fichiers PASS,1 fichier historiquement ignoré**. Aucun nouveau test ignoré. Les types passent. #356 seule :5353PASS/31ignorés ; le verrou applicatif et ses protections financières sont conservés.

Tous les commits apportant du code, dont #348e2d8c8ed et le correctif CSS original0c6fdbed, sont des ancêtres vérifiés de la convergence. #362 a ensuite repris la base corrigée95d2d79b dans580d8105 : son diff reste limité à2fichiers dont les blobs sont identiques àbe59ddef. Voir source-equivalence.json. Cette mise à jour n'a pas modifié la tête de convergence.

Toutes ces PR restent ouvertes, en brouillon et non fusionnées. Main vérifiée inchangée :37fcfd2526705d274fd813b5da95be46058b7c9f.

## Diagnostic et correctifs

- #356 : le verrou réel des cinq cartes était complet ; une assertion imposait l'ancien ordre textuel de interactionBusy. Le test évalue désormais l'expression TSX réelle par AST, chaque contrôleur occupé (services compris), le job publicitaire en attente et les cinq cartes. Les tests HTTP concurrents restent actifs.
- Site : localFirst, applyOps, versions CAS et reçus natifs sont réutilisés, sans moteur parallèle. cancel-local révoque uniquement la proposition. L'annulation réutilise les gardes D2 de versions, médias, empreintes et contenu ; elle se lie au vrai reçu B1 ou D2 encore courant. Une modification manuelle plus récente n'est pas effacée.
- V2 : l'ancien adaptateur refusait tout mouvement d'un autre calque, alors que le moteur natif doit parfois déplacer sous-titre et bouton. Le moteur reste inchangé ; ces effets sont listés et montrés avant accord gratuit. Seul y est autorisé sur les textes/boutons secondaires admissibles. Images, textes, marque, ordre et autres propriétés sont conservés. Empreintes des effets annoncés/source/résultat et CAS contrôlés avant tâche et dans le commit natif. Calque protégé ou résultat impossible : alternative gratuite explicite.
- Couleurs : une vraie inspection visuelle a révélé que les variables étaient enregistrées mais que theme.css ne peignait que color-scheme-*, pas color-es-*. Une ligne étend la même règle native de fond/texte, utilisée dans l'aperçu et le ZIP. Le navigateur mesure désormais le fond bleu et le texte blanc réellement peints ; les autres sections restent identiques.
- La CI intermédiaire12188835 a aussi détecté la disparition de « gratuitement » dans une clarification ambiguë. Formulation rétablie dans l'application, nouveau test sans devis/écriture ; aucune modification du script obligatoire historique pour masquer l'échec.

## Phrases et portée réelle

| Phrase testée | Résultat |
|---|---|
| Mets le titre de cette section en rouge | Alternative annoncée : couleur principale des textes de la section, utilisée aussi par certains boutons. Titre seul non ciblé ; valeurs accent/muted/accent_text conservées, sans promettre des boutons visuellement identiques. |
| Mets le fond de cette section en bleu | Fond de la section désignée ; correction native de contraste du texte incluse dans le diff. |
| Change la couleur principale du site en #1e3a8a | Clarification gratuite ; aucune couleur de section annoncée comme globale. |
| Ajoute une section FAQ après cette section | Insertion de la bibliothèque native à cette position ; contenu de départ à compléter, sans rédaction IA. |
| Annule la dernière retouche du site | Proposition liée au dernier reçu B1/D2 encore courant, accord distinct puis restauration dans une nouvelle version avec historique. |
| Agrandis le titre de la création sélectionnée | Agrandissement et déplacements secondaires annoncés ; deux JPEG exacts, accord gratuit, version et reçu natifs relus. |
| Change le titre joliment | Clarification explicitement gratuite ; pas de devis ni d'écriture. |

Chaîne conservée : proposition → avant/après → accord explicite gratuit → écriture native avec version/conflit → relecture et reçu. Aucun devis fournisseur automatique pour ces demandes locales. Budget IA0 testé. Les schémas partagés touchant une autre section sont refusés.

Contrats exacts sur be59ddef : docs/syna-301/PHRASES-GRATUITES-SITE.md et PUBLICITES-V2-EFFETS-NATIFS.md.

## Preuves exécutées

- 11/11 ciblés verrou/services ;97/97 Site à la première livraison ;44/44 publicitaires ;36/36 régression finale (13cas natifs+23B1). Batteries recouvrantes : ne pas additionner comme couverture indépendante. La suite complète finale couvre le code livré.
-18documents V2 bruts : count3,6feed+3story+9combinés. Parent18/18 refus422 ; correctif18/18 propositions200, vraie tâche locale, version/reçu relus, images identiques et retry sans nouvelle version. Aucune fixture aménagée pour libérer le titre. Dépendances fournisseur injectées et synthétiques. Le JSON ads18-first-green-summary est la première sonde verte, antérieure au garde supplémentaire sur calque verrouillé ; les44tests et la suite finale valident ensuite ce garde.
- **8/8 nouveaux parcours navigateur sur le build exact be59ddef**, puis les mêmes8cas dans le quatrième contrôle CI. Site de services et publicité produit, Encre/Plein1440/390. Fond réel rgb(29,78,216), texte blanc, titre principal rouge rgb(180,35,24), FAQ après la section, annulation liée au reçu, annulation de proposition sans écriture, accord après17s, réponse perdue/retry identique, résultat relu, recharge et PNG publicitaire. Les versions Site sont1→2→3→4→5 ; la FAQ seule est annulée en conservant les couleurs précédentes.
- **3recettes historiques obligatoires inchangées PASS sur be59ddef**, localement et en CI : ouverte, après revalidation et actualisation de plus de15s, drapeau fermé. Chacune donne4cas produits/services/A1, errors[]. Le script a exactement le même blob que sur759a2e34. Les observations se recouvrent ; aucune somme présentée comme opérations distinctes.
-52PNG et8traces des nouveaux parcours restent locaux. Leur manifeste de noms/SHA256 est publié ; aucun fichier image ou trace n'est publié ici.

Provenance CI : checkout GitHube0c70a56d60b99c4acf9b74b71f651ef1f2f44d6, arbre vérifié par API identiquee2c2d1ca au code livré. Il s'agit du merge ref automatique de CI, pas d'une fusion main. RecetteSHA25695a3fdbc93ed8249c62f42fa32bbea3fde4373c91050067e4d0952bd737675c3.

[Artefact textuel des8cas](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41661352329/artifacts/13244645903), digest rapporté par GitHub7b998254822aa92a8409dcc0171b77d2fb9e9911ef187c662dfc6cd526f51ac6. Les journaux CI contiennent les8PASS et tous les contrôles sont SUCCESS. Le téléchargement du ZIP de staging vers ce workspace a été refusé par le proxy403 ; aucune lecture indépendante de ce ZIP n'est revendiquée. Les journaux, le checkout CI et le JSON local de cette même tête ont été vérifiés.

Fichiers principaux : final-ci-verdict.json, final-ci-tests.json, final-ci-free-confirmation.json, final-local-browser-be59ddef.json, legacy-*-be59ddef.json, source-equivalence.json, local-captures-manifest.json. Les premières sondes et erreurs restent distinguées des preuves finales.

## Limites et coordination

Les nouveaux cas qualifient des projets natifs fictifs en français, pas tous les thèmes importés ni un modèle réel. A2 est préselectionnée par fixtures natives puis reprise par bouton réel du Studio : cette recette complète, sans la remplacer, la désignation par clic dans l'intégration indépendante de Claude.4exemples publicitaires en UI complètent18documents côté HTTP/moteur. Qualité créative et absence de tout chevauchement visuel ne sont pas garanties par cette seule preuve.

Les premières passes insuffisantes ne sont pas comptées comme validation finale : claimNext avant réponse de confirmation, image non encore décodée, variable CSS contrôlée sans peinture, revalidation après une recharge/message ayant retiré la cible. Les attentes et l'ordre du harnais ont été corrigés, puis toutes les recettes finales ont été exécutées sur la tête livrée.

Pas de couleur globale, de titre seul sans adresse native fiable, d'annulation universelle ni d'annulation d'annulation. FAQ de départ non rédigée par IA. Les autres P1/P2 restent au backlog. Les16phrases et la matrice84 sont à réconcilier sur l'assemblage de Claude avec le périmètre de chaque preuve ; aucune promotion globale en SYNA complète.

Contrats et SHA transmis à Claude dans #358 à chaque lot ; #356 et #360 ont été déclarées indépendamment vertes dès leurs résultats disponibles. Aucun travail graphique ni branche Claude modifiés. Aucune fusion main, dépense fournisseur réelle, mise en ligne, activation client ou déploiement. Captures et traces restent hors publication conformément au commentaire6605803273. Arrêt de ce lot pour validation.
