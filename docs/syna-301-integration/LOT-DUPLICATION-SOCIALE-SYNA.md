# Duplication sociale depuis une demande naturelle

Parent distant : #491 / `9bb10f3233624a5f52ba150b72d212e0513a58fd`. Le parent local testé `1e75291d` a exactement le même arbre. Publication par connecteur GitHub, car l’authentification du Git CLI a expiré. Aucun composant ou style Claude modifié.

## Contrat à intégrer

Drapeau fermé `STUDIO_CONVERSATION_SOCIAL_DUPLICATE` avec LOT_A/AI/CONTEXT. Registre `native.social.duplicate`, gratuit, accord séparé, preuve `isolated_local_execution`, périmètre `native_exact_social_duplicate_backend_partial_ui_pending`.

DTO `socialDuplicate` / `socialDuplicateExecution`, schéma `syna-social-duplicate-1`. Source : ID, réseau, format, statut, date renseignée, fuseau, titre/texte/hashtags/lien non fiables, références médias avec version et état de corbeille. Diff : source conservée → nouvelle copie `review`, non approuvée, mêmes médias, date renseignée conservée sans activer d’envoi. Coût et appels fournisseur à zéro, financialConsent/publication faux, reversible faux. Accord `confirm-social-duplicate` avec proposalId et true littéral ; `cancel-social-duplicate` abandonne sans copie. Résultat : nouvel ID, statut review, sourceId et receiptId.

Phrases : « Duplique la publication « titre ou ID exact » », « Peux-tu copier cette publication “titre” ? », « Duplique la publication identifiée par « ID » ». Homonymes clarifiés, trois guillemets, politesse ; aiguilleur `outsideQuotes`. Aucune commande contenue dans un titre n’est exécutée.

## Moteur et concurrence

Lecture source/médias partagée avec `duplicatePostV2`, sans initialisation de provenance dans l’aperçu. Le lecteur existant `recordedContentStrategy` garde son comportement par défaut ; l’option de lecture seule ne traite comme vide que l’absence exacte de sa table paresseuse. Toute autre erreur refuse l’aperçu.

Instantané complet du post, des médias acquis et de leur provenance ; relecture au verrou avant le même moteur natif. Vérification après copie : champs repris exacts, nouveaux ID et clé d’envoi, review non approuvé, aucun historique distant/job, source et publications voisines intacts, tous actifs intacts, seuls nouveaux usages médias attendus, provenance acquise conservée. Erreur ou effet voisin non annoncé : rollback. Reçu atomique, reprise d’une réponse perdue sans second clone ; drapeau/forfait vérifiés avant cache. A1 fermé, aucun ancien ou nouveau devis cognitif de repli.

Les médias sont réutilisés, pas générés. Une date déjà renseignée peut être copiée comme information, sans programmation ou publication. Un média en corbeille n’est pas restauré automatiquement. Cette commande suit le bouton natif Dupliquer et conserve le journal manuel existant. Le chat social natif possède séparément une annulation via `applySocialEdit`/`undoLastEdit` : elle n’est pas promise ici et doit être qualifiée comme autre parcours, notamment pour les conflits. Ne pas annoncer l’absence de toute annulation native.

## Vérifications exécutées

**39 nouveaux tests, 82 cas distincts validés, types verts.** Premier passage : 38 nouveaux + 14 régressions du correctif natif ; puis 29 régressions sociales/anti-devis ; enfin un cas ciblé de conservation du journal manuel. Aucun cas ignoré ajouté ; les 38 autres cas non sélectionnés dans ce dernier lancement ne sont pas comptés comme rejoués.

Douze parcours produits/services × neuf/préparé × trois formulations : cible exacte, aperçu sans écriture, accord, vrai post natif et usages, octets/acquis/profil/préparation/finances intacts. Homonymes, titres injectés, source/média/provenance concurrents, voisin indépendant, lecture paresseuse sans table, erreur SQL fermée, TTL/contexte/abandon, anciens devis, reçu en erreur et reprise, droits/forfait/budget épuisé/A1. Édition native réellement commise avant verrou refusant l’ancien accord ; effet inattendu sur un actif acquis injecté et rollback.

Provenance historique fictive enregistrée en base pour vérifier sa conservation, sans activation réelle d’angle. Aucun fournisseur, programmation ou publication réels. Handlers/session/SQLite réels : attente monotone **≥17 secondes**, GET projet+fil conservant la proposition, true obligatoire, GET natif constatant la copie review et ses usages, renvoi du même reçu sans doublon.

Logs : `/tmp/parity301-social-duplicate-conversation-first.log`, `-types.log`, `-types-final.log`, `/tmp/parity301-social-duplicate-regressions.log`, `/tmp/parity301-social-duplicate-undo-journal.log`. Diff vérifié.

## Limites

Carte, handle anti-devis, résultat réellement affiché dans la conversation et recette Studio compilée indépendante dans les quatre formats restent à intégrer/qualifier avec Claude sur un SHA exact. HTTP ne vaut pas preuve navigateur. CI finale sur le commit GitHub publié à suivre, sans certification héritée. Aucun client réel, activation, fusion main ou déploiement ; workflows et confirmation gratuite obligatoire inchangés.
