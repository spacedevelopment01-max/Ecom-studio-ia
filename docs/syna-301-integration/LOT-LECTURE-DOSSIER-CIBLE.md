# Lecture ciblée de la bibliothèque native

Parent fonctionnel : #437, a0f5ccdf6c4ec426ca581800e6791f29f6689eea. Aucun composant graphique modifié.

## Défauts démontrés

- « Montre les fichiers du dossier “corbeille” » était détourné vers la restauration : le routeur cherchait le mot dans la valeur citée.
- La lecture existante ne savait pas limiter ses résultats à un dossier précis. Les variantes interrogatives et « Montre-moi » n'étaient pas reconnues.
- Une lecture native pouvait obtenir un devis cognitif auprès d'un fournisseur configuré. Les trois tests de refus (lecture, clarification, drapeau fermé) échouaient avant correction, sans appel fournisseur réel.

Avant correctif : 10 échecs / 11 tests de lecture ; puis 3 échecs / 15 tests pour le refus du devis.

## Contrat et garde-fous

Même carte `localFiles`, schéma `syna-local-files-1`, `command:read`. Ajout optionnel `readScope:{folderId,folderName,descendants:false}`. Exemple : `Montre les fichiers du dossier « nom ou identifiant exact »`, `Liste les photos dans le dossier « … »`, `Peux-tu me montrer…`, `Je voudrais voir…`, `Montre-moi…`.

La recherche est limitée aux fichiers directement dans le dossier du projet possédé. Ni descendant implicite, ni premier homonyme choisi, ni retour silencieux à la racine. Filtres natifs conservés : propriétaire/projet, corbeille, rejet, captures internes et visibilité stratégie. Maximum 50 métadonnées, indicateur `hasMore`. Ni octets décrits ni analyse visuelle. Les dossiers absents ne sont pas créés par la lecture ciblée.

Les aiguilleurs utilisent `outsideQuotes(text)`. Les noms cités restent des valeurs. La commande ciblée explicite a priorité sur les autres domaines. Le message client et sa clé de reprise conservent leur texte original.

Une lecture n'a pas d'accord de modification : `confirmationRequired:false`, `actionsExecuted:false`, coût 0. Les accès restent soumis au projet et au forfait. Le devis ET son acceptation cognitive sont refusés avant toute vérification fournisseur pour ce tour gratuit, y compris après retrait du drapeau. Une nouvelle question indépendante libère normalement cet état.

## Vérification exécutée

- 15 nouveaux tests ; 107 tests distincts / 6 fichiers verts (lecture globale/ciblée, fichiers, restauration, renommage dossier, refus cognitif réservation).
- `npm run typecheck` vert, garde réseau obligatoire actif.
- Logs locaux : `/tmp/parity301-library-folder-read-{red,quote-red,final,types}.log`.
- Recette Studio compilée sur ce nouveau commit encore à exécuter ; aucune preuve du build c9a6f830 n'est attribuée à ce lot.

Aucun fournisseur réel, projet client, activation, déploiement ou fusion main. Le raccordement conversationnel de la mise à la corbeille reste un lot distinct à faire.
