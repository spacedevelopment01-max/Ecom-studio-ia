# Angles marketing — recette du studio complet

Mission : [complément 6349100223 de la PR #168](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/168#issuecomment-6349100223), validé par Thomas. Branche `codex/angles-recherche-sourcee`, base de cette passe **894b0ce98398411bf1598bada59d0a0aa80bc85f**. Présentation actuelle conservée. Aucun thème de Claude, accueil public, configuration client, donnée ou média client modifié. Aucun appel IA réel, recherche Internet réelle, génération payante, fusion ou déploiement.

Commit du code contrôlé : **289b7d4bcf4c53e852add08f558410c219d153ea**. Version du serveur local compilé : voir `studio-workflow.json`, champ `served.commit` ; elle doit correspondre au commit du code. Le studio de Thomas et son Codespace ne sont ni mis à jour ni déclarés vérifiés.

## Défaut reproduit et correction

**REPRODUIT DANS LE STUDIO COMPLET** : après connexion d’un client de test avec forfait, le bouton « Reprendre les informations de mon offre » appelait correctement la route, initialisait la préparation, puis renvoyait vers `/studio/…/preparation`. Cette adresse n’est pas un onglet valide : HTTP **404**, préparation invisible. La compilation et les tests de fonctions seuls n’avaient pas détecté ce lien cassé.

Correction applicative unique : `resumeUnderstanding`, dans `src/lib/marketing-strategy/understanding.ts`, renvoie maintenant vers `/studio/…/pilote`, qui affiche déjà `TabPreparation`. Aucune nouvelle page ni refonte. Le test `tests/angles-sources.test.ts` vérifie le contrat de navigation ; le navigateur vérifie le vrai chemin authentifié et obtient **200**, préparation visible.

Preuves : [404 avant correction](../../reports/angles-studio/reprise-avant-correction.json), [capture avant](../../reports/angles-studio/00-reprise-avant-correction.png), [reprise corrigée](../../reports/angles-studio/reprise-corrigee.json), [capture corrigée](../../reports/angles-studio/01-reprise-corrigee.png).

## Matrice de vérification

| Demande | Exécution et résultat | Preuve |
| --- | --- | --- |
| Compilation de production | `npm run build` réellement exécuté, sans fournisseur, dans le checkout isolé. La compilation initiale réussissait déjà ; le défaut constaté était la navigation après reprise. Compilation finale réussie, sortie 0, sur le commit 289b7d4b. | Résumé technique dans `verification.json` ; la CI annulée initiale est distinguée de la vérification finale |
| Parcours complet | Vrai serveur **Next de production**, vraie connexion/cookie client, droits du projet, routes HTTP, **vrai `worker/index.ts`**, tâches en base et SQLite persistante. Produit : saisie dans l’interface → devis et compréhension simulée → confirmation des informations → devis et recherche simulée → adoption explicite → choix → confirmation de la recherche → nouvelle session navigateur. Réouverture avec cookie de session natif, pas contournement d’authentification. | Étapes 02 à 08 ci-dessous ; `studio-workflow.json` |
| Blocages honnêtes | Fournisseur désactivé dans la base de test : devis refusé, **aucune tâche de recherche**. Recherche échouée et sources insuffisantes : une tâche de recherche chacune, statut `failed`, progression **5 %**, aucun résultat, aucun nouvel angle, message « Recherche interrompue ». Pas de reprise automatique. | Captures 11 ; trois contrôles structurés |
| Forfaits et historique | Clients avec forfaits 1/2/5, jamais exemption administrateur. Choix jusque la limite, nouvel identifiant refusé, remplacement de souscription sans remise à zéro, retour à un choix autorisé sans place supplémentaire. Pour le forfait 5, les cinq identifiants existants sont consommés ; un sixième identifiant inconnu reçoit **400**, ce n’est pas une preuve de refus commercial 402. Les forfaits 1/2 refusent le choix supplémentaire disponible en **402**. | Captures 09 ; contrôles techniques de quotas |
| Services | Deux prestations conservées. Angle de communication « reassurance », base du site « generalist » (« Présenter l’ensemble de votre offre »), une seule place consommée ; aucun thème créé ou modifié. Préparation de ce cas par les vraies API natives, puis contrôle de l’écran Stratégie ; ce n’est pas une seconde saisie complète par l’interface. | Captures 10 ; contrôle structuré services |
| Autres modules et conservation | Lecture des consommateurs natifs publicité, social, vidéo et des scopes Brain : cible, ton, traitement visuel et origine du choix transmis. **Aucune génération** de contenu ou de média. Image source synthétique conservée octet pour octet ; texte de test existant inchangé. Aucun travail autre que `project.prepare` mis en file ; aucun asset d’origine `generated`. | Résultats techniques structurés ; les consommateurs ne sont pas présentés comme des générations vérifiées |

Le contrôle « API absente » indique aussi la dernière tâche précédente, celle de **compréhension**, déjà terminée à 100 %. La recherche, elle, n’a aucune tâche ni résultat dans ce scénario. Ne pas confondre cet acquis avec une recherche réussie. Le « Reste 100 % » du bandeau concerne le budget fictif, pas la réussite d’une génération.

## Nature des simulations et isolation

`scripts/angles/studio-proof.mts` crée exclusivement un répertoire temporaire `ecs-angles-studio-*`, un compte fictif et des projets avec souscriptions de test. Il refuse de charger `.env` ou `.env.local`. Le serveur écoute uniquement sur **127.0.0.1**, sans partage de port. Les gardes natifs d’authentification, propriété, devis, droits, plafonds, file, progression et sauvegarde restent actifs.

`scripts/angles/studio-simulated-providers.ts` remplace seulement les dépendances de compréhension et recherche dans le processus du worker de recette, via le point d’injection existant. Il exige le marqueur et le répertoire isolés du lanceur. Aucun import de cet adaptateur dans le code applicatif ni option permettant à une requête client d’activer ces simulations. Le worker natif continue d’assurer les verrous, contexte, exécution, erreurs et statuts. Un garde de réseau du banc interdit toute sortie non locale et le navigateur refuse les ressources externes ; **zéro sortie externe tentée** au contrôle final.

Les faux accès servent uniquement à exercer les contrôles de disponibilité et de devis dans cette base temporaire ; ils ne constituent pas une connexion fournisseur ni une authentification réelle. Les sources sont fictives, les réponses écrites dans le banc et les reçus marqués `simulated`. **Maquette — non issue d’une recherche réelle** reste visible. Ni pertinence marketing, ni compréhension IA/vision réelle, ni tarification ou facture fournisseur ne sont validées. L’image source est un aplat synthétique de vérification, pas une photo de création commerciale.

## Commandes et contrôles

- `npm run build` : compilation réelle réussie, sortie 0, sur le commit 289b7d4b.
- `npx tsc --noEmit` : réussi, sortie 0.
- `npx vitest run tests/angles-sources.test.ts tests/mission160-api.test.ts tests/mission160-consumers.test.ts tests/mission160-service-scopes.test.ts` : **4 fichiers, 61 tests réussis**, 27,85 s, sortie 0.
- Suite complète sur le code applicatif et les tests métiers figés (le banc de captures a été ajusté pour les préférences d’introduction et les cadrages, puis rejoué séparément) : `npx vitest run --shard=1/3`, puis `--shard=2/3`, puis `--shard=3/3` : **357 fichiers, 2 894 tests réussis, 22 sautés ; trois sorties 0**, 883,44 s au total. Partitionnement séquentiel pour le disque ; aucun test retiré.
- `npx tsx scripts/angles/studio-proof.mts` : **11 contrôles structurés**, 33 captures de parcours (dont six extraits de viewport pour la lecture), plus avant/après du lien. Réussi, sortie 0 : code et serveur compilé **289b7d4bcf4c53e852add08f558410c219d153ea**, arbre applicatif propre ; zéro erreur JavaScript. Les 35 PNG ont été inspectés, dont les extraits finaux après correction des cadrages du banc.
- `--reproduce-link` est réservé à la compilation antérieure à la correction, à la base 894b0ce9. Sur la version corrigée, le contrôle normal exige 200.

La première CI de 894b0ce9, run 39828935820, était **annulée pendant les tests** : Theme Check et build du job principal non exécutés, aucune validation de ce job. Le job Docker avait réussi. Le job annulé a été relancé et ses tests, Theme Check et compilation ont réussi, ainsi que le job Docker, au contrôle du 22 octobre vers 20 h 16 UTC. Ce succès de 894b0ce9 ne valide pas à lui seul le nouveau commit corrigé. **La CI de la tête finale sera vérifiée séparément et son verdict exact ajouté à la description et au commentaire final de la PR #168**, sans confondre les checks d’une ancienne tête.

Un lancement intermédiaire du banc était parti avant la fin de la reconstruction ; il n’est pas compté comme recette. L’arrêt du banc traite maintenant correctement un processus déjà terminé, puis le parcours a été rejoué après compilation aboutie. La 404 et les refus volontaires restent des preuves distinctes des passages réussis.

## Captures, ordinateur et largeur 390 px

Les images sont produites par Chromium sur le vrai serveur Next authentifié. Les préférences existantes « introduction/tutoriels déjà vus » sont appliquées uniquement au navigateur du banc, sans modification de l’interface ni de ses CSS. Une première capture de services était masquée par l’introduction après changement de session : rejetée, puis toutes les vues ont été refaites. Le mobile correspond à un viewport 390×844, pas à un appareil physique. Les PNG complets restent téléchargeables et zoomables ; les contenus sont fictifs, sans appréciation de leur qualité marketing réelle.

| Étape | Ordinateur | Mobile |
| --- | --- | --- |
| Renseignements | [02](../../reports/angles-studio/02-renseignements-desktop.png) | [02](../../reports/angles-studio/02-renseignements-mobile.png) |
| Compréhension simulée | [03](../../reports/angles-studio/03-comprehension-simulee-desktop.png) | [03](../../reports/angles-studio/03-comprehension-simulee-mobile.png) |
| Recherche simulée | [04](../../reports/angles-studio/04-recherche-simulee-desktop.png) | [04](../../reports/angles-studio/04-recherche-simulee-mobile.png) |
| Propositions dans le studio | [05](../../reports/angles-studio/05-angles-simules-desktop.png) | [05](../../reports/angles-studio/05-angles-simules-mobile.png) |
| Confirmation et conséquences | [06](../../reports/angles-studio/06-confirmation-desktop.png) | [06](../../reports/angles-studio/06-confirmation-mobile.png) |
| Choix sauvegardé | [07](../../reports/angles-studio/07-choix-sauvegarde-desktop.png) | [07](../../reports/angles-studio/07-choix-sauvegarde-mobile.png) |
| Nouvelle session | [08](../../reports/angles-studio/08-session-rouverte.png) | — |
| Quota 1 | [09](../../reports/angles-studio/09-forfait-1-desktop.png) | [09](../../reports/angles-studio/09-forfait-1-mobile.png) |
| Quota 2 | [09](../../reports/angles-studio/09-forfait-2-desktop.png) | [09](../../reports/angles-studio/09-forfait-2-mobile.png) |
| Quota 5 | [09](../../reports/angles-studio/09-forfait-5-desktop.png) | [09](../../reports/angles-studio/09-forfait-5-mobile.png) |
| Services | [10](../../reports/angles-studio/10-services-activite-complete-desktop.png) | [10](../../reports/angles-studio/10-services-activite-complete-mobile.png) |
| API absente | [11](../../reports/angles-studio/11-blocage-absent-desktop.png) | [11](../../reports/angles-studio/11-blocage-absent-mobile.png) |
| Recherche échouée | [11](../../reports/angles-studio/11-blocage-failed-desktop.png) | [11](../../reports/angles-studio/11-blocage-failed-mobile.png) |
| Sources insuffisantes | [11](../../reports/angles-studio/11-blocage-partial-desktop.png) | [11](../../reports/angles-studio/11-blocage-partial-mobile.png) |

[Lecture produit ordinateur](../../reports/angles-studio/05-angles-simules-lecture-desktop.png) · [Lecture produit mobile](../../reports/angles-studio/05-angles-simules-lecture-mobile.png) · [Lecture services](../../reports/angles-studio/10-services-activite-complete-lecture-desktop.png).

[Résultats détaillés du parcours](../../reports/angles-studio/studio-workflow.json) · [Contrôles techniques et empreintes](../../reports/angles-studio/verification.json).

## Limites et réception

### Attente de la première CI de cette recette

La CI du commit de preuves `b1b2cc858637f6bb949d1b5807247d6841c23d09`, run **39849290106**, a réussi le job Docker (construction, worker actif, accueil/inscription HTTP 200). Son job principal reste à l'installation de `ffmpeg` depuis **20 h 30 min 49 s UTC**, avant les types, tests, Theme Check et build. Le journal de ce job encore actif est indisponible (`404 BlobNotFound`) ; la cause détaillée de l'attente n'est donc pas établie. L'accès CLI aux Actions est bloqué (`Forbidden`) et le connecteur n'expose pas l'annulation.

Cette [observation horodatée](../../reports/angles-studio/ci-installation-observee.json) est publiée pour conserver l'état réel. Son envoi relance la CI par l'événement normal de synchronisation de PR ; la règle de concurrence existante annule l'ancienne exécution. Cette annulation ne sera pas une validation. Aucun contrôle n'est retiré ou modifié, aucun code applicatif supplémentaire n'est changé. Le verdict d'une exécution aboutie de la dernière tête sera consigné dans la description et le commentaire final de #168.

Aucune simplification ni refonte des cartes. Aucun essai sur Contretemps. Les cas refusés ont été provoqués dans les données de test, jamais chez un client. Les validations réelles des fournisseurs, de l’analyse d’images/documents, de la pertinence des sources et des angles attendent l’accord explicite de Thomas et les accès nécessaires. La compilation et cette recette simulée ne les prouvent pas.

Aucun thème construit, export CMS exécuté ou résultat marketing généré dans cette passe. Les tests natifs existants couvrent leurs garde-fous ; aucune installation ou réception sur CMS n’est revendiquée. La version accessible dans le studio habituel n’est pas vérifiée. Livré pour revue sur #168, sans fusion ni déploiement.
