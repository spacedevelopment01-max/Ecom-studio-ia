# SYNA #301 — recette commune de la vague 1

Application exécutée : **6fd996637611c929ba9dfe258a320435dfe62f2f**, arbre complet **1d303664973b784b00c3edcddb17652cc5a532d3**, build de production propre. Sources : coquille Claude cdbaa1a9, cartes Fichiers #328 d7131534 et Contenus #330 356b20ab, correctifs moteur/finance de #326 explicitement intégrés. Aucun résultat ancien n’est réattribué à ce build.

## Parcours exécutés

**22 cas réussis, 94 captures conservées** : 4 Fichiers, 4 Contenus métier, 3 contrôles B1 de 4 cas chacun et 2 compléments de capture séparés. Ce compteur de scénarios ne mesure pas le nombre d’opérations du Studio intégralement raccordées.

- Fichiers, Encre/Plein cadre × ordinateur/téléphone : désignation native, ambiguïté, proposition avant/après, annulation, accord gratuit, réponse perdue après enregistrement et reprise de la même confirmation, reçu relu, liste actualisée, rechargement, renommage et déplacement. Octets et version du fichier conservés.
- Contenus : prix d’un plat 16,00 → 18,50 € avec réponse perdue, bien renommé sur téléphone, réalisation renommée après ambiguïté/annulation, plat à 21,00 € sur téléphone. Ces quatre cas échantillonnent les trois types ; ils ne représentent pas chaque type dans les quatre configurations. Statuts conservés et effets natifs relus. **Adresse/slug annoncés et vérifiés pour le bien uniquement** ; la réalisation couvre le nom et le statut, pas son URL ni un CRUD complet.
- B1 obligatoire : ouverte, après **17 000 ms réelles**, fermée. Produits/services et deux anciens contextes A1 par contrôle. Cible revalidée conservée, refus de version/droits, idempotence, restauration et voie manuelle ; fermeture sans bouton mort ni repli payant. Le quatrième contrôle CI reste obligatoire.
- Deux compléments, avec leurs propres données fictives, montrent les cartes Fichiers et Réalisation avant accord entièrement visibles. Ils sont séparés des huit cas métier initiaux.

Les sept exécutions UI ont vérifié les tables réelles : `ai_calls`, `jobs`, `usage_events`, `ai_reservations` restent à **0** ; erreurs JavaScript 0. Des tentatives de CSS Google Fonts du thème fictif ont été bloquées : cela ne doit pas devenir une affirmation « aucune tentative externe ». Aucun appel fournisseur IA réel ni dépense réelle.

## Finance et parcours Social natif

Neuf cas HTTP/dispatch/SQLite passent sur cette source exacte : prompts payants refusés sans devis, classement local conservé, rédaction/retouche et documents publicitaires protégés, approbations manquantes ou inférieures au devis refusées. SDK, transport fournisseur, appels comptabilisés, usages et réservations restent à 0. Des tâches locales ou anciennes tâches de fixture existent dans certains cas ; ne pas généraliser « aucune tâche » à ces neuf tests.

Le parcours Social natif utilise le **devis serveur exact de 350 880 micro€**, avec plafond de 1 €. Trois changements de version sont refusés avant fournisseur ; réemploi d’un résultat acquis conservé à coût nul. Aucun faux fournisseur appelé. Cela ne qualifie pas les 199 autres lignes encore non exécutées du précédent inventaire financier.

## Harnais et validation

196 tests ciblés / 12 fichiers et TypeScript séparé passent avant publication de 6fd. Le build exact passe. La suite locale complète initiale a été interrompue (exit 130) après découverte de fixtures absentes du checkout partiel et de restrictions de sandbox (`spawnSync ffmpeg EPERM`, écoute HTTP locale refusée). 21 fichiers de référence Git exacts ont été restaurés ; une relance complète conserve la garde réseau fournisseur et utilise les permissions nécessaires. Aucun test ni garde n’a été supprimé. Son verdict et la CI finale sont rapportés dans les commentaires de PR ; aucun vert n’est déduit de cette note.

Un autre run CI a prouvé une lecture B1 pendant le remplacement de l’iframe (`Frame was detached`). Le correctif #332 ne reprend que cette lecture dans la deadline existante de 30 s, avec locator actuel ; aucun geste/POST/achat rejoué. 53 tests ciblés / 3 suites et TypeScript séparé passent ; un rejeu unique après 17 s passe sur le build 6fd (4 cas, 10 captures supplémentaires, **hors compteur 94**). Le nombre de détachements rencontrés dans ce passage n’est pas instrumenté ; les branches sont vérifiées par les tests contrôlés. Ce harnais ultérieur n’est pas présenté comme du code déjà compilé dans 6fd.

## Preuves et captures

Les JSON compagnons conservent SHA, modes, viewport, compteurs natifs, adaptations temporaires, hashes des 94 captures, erreurs et limites : `PREUVES-UI-COMMUNE-6fd.json`, `PREUVES-FINANCE-SOCIAL-6fd.json` et `PREUVES-FINANCE-9-6fd.json`. Les originaux locaux sont sous `preuves-convergence6fd`. Les copies temporaires de recette ont été retirées ; sources propres, serveurs/workers/navigateurs arrêtés.

Sélection de captures relues :

- [Fichier : proposition complète](captures-6fd/fichiers-avant-confirmation.png) et [reçu sur téléphone](captures-6fd/fichiers-recu-telephone.png).
- [Plat : prix avant accord](captures-6fd/plat-prix-avant-confirmation.png) et [reçu sur téléphone](captures-6fd/plat-prix-recu-telephone.png).
- [Bien : nom et adresse enregistrés](captures-6fd/bien-nom-adresse-recu.png).
- [Réalisation : proposition complète](captures-6fd/realisation-avant-confirmation.png).

La matrice conserve **83 opérations / 25 domaines**, avec les limites des raccords. A1/cartes, Blog acquis, demandes reçues et plusieurs fonctions natives restent partiels ou sans parcours commun qualifié. Les fonctions produit absentes, actes externes et devis incompatibles restent distingués. Aucune déclaration de parité globale. Aucun client modifié, aucune fusion dans main, aucun déploiement ou activation.
