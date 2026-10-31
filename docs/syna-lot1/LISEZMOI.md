# SYNA — lot 1 : coquille du Studio (mission #282)

Autorisation du propriétaire : « Le lot 1 de SYNA est autorisé » et consigne du 31 octobre sur l'issue #282 (« GO
pour CLAUDE : développer le LOT 1 · Coquille du Studio »). Ce lot branche réellement les fondations du lot 0 dans le
Studio : une nouvelle coquille avec une navigation premium, et l'accès à SYNA à la place de la pastille noire.
**Il ne fusionne rien, ne déploie rien et ne commence pas le lot 1 bis.**

- Branche `claude/syna-lot1-coquille`, empilée sur le lot 0 (`claude/syna-lot0-fondations`, PR #288). La PR du lot 1
  vise cette branche : son diff ne contient que le lot 1.
- Codex (A1 #286, A2 #287) : aucun de leurs fichiers n'est modifié. En particulier, `conversation-panel.tsx` (modifié
  par #286) est **réutilisé tel quel**.
- Coût IA : 0. Aucun appel à un fournisseur. Aucune donnée, base, production ou Codespace touché.

## Activer la coquille sur une installation de test

| Variable | Effet |
|---|---|
| (rien) | **Studio inchangé** : l'interface actuelle, exactement comme sur `main`. |
| `STUDIO_SYNA_SHELL=1` | Nouvelle coquille pour tous les projets. Chaque personne peut revenir à l'interface actuelle (bouton « Interface actuelle »), puis revenir (« Nouvelle interface »). Ce choix est mémorisé sur l'appareil. |
| `STUDIO_CONVERSATION_LOT_A`, `_AI`, `_UI` | Inchangés. S'ils sont fermés, la coquille n'affiche **aucun** accès à SYNA, comme aujourd'hui. |

Retour arrière complet : retirer `STUDIO_SYNA_SHELL` (effet immédiat au prochain chargement), ou annuler le commit.

## Ce qui change dans la coquille

| Élément | Interface actuelle | Coquille SYNA (Encre) |
|---|---|---|
| Accès à SYNA | Grosse pastille noire flottante « SYNA » en bas à droite | **Colonne SYNA à droite**. À l'ordinateur (≥ 1280 px), elle s'ouvre à côté de l'espace, sans le recouvrir ; à la tablette, en panneau. Quand elle est repliée, un **onglet signature** « Syna » à l'italique bleu d'encre reste sur le bord droit. Au téléphone, l'**onglet « Syna »** de la barre basse. **Plus de pastille noire.** |
| Conversation | `ConversationPanel` dans un panneau générique | **Le même `ConversationPanel`** (mêmes routes, même fil, mêmes devis, droits et erreurs), dans la colonne. Pas de seconde conversation. |
| Menu des espaces | Menu latéral, espace actif sur fond noir | Menu latéral Encre : groupes « Votre projet · Créer · Diffuser · Outils avancés », espace actif en bleu doux avec un filet bleu, pastilles conservées. Repliable avec la touche « [ », et Alt+1…9 comme aujourd'hui. Un fondu signale les espaces plus bas. |
| En-tête | Titre de l'espace + outils | Fil d'Ariane (projet · groupe), titre en Newsreader, état du projet. Les outils sont inchangés : recherche rapide (Ctrl K), tutoriel, tâches, budget IA, forfait, notifications. La langue et le thème passent au pied du menu à l'ordinateur ; ils restent dans l'en-tête au téléphone. |
| Téléphone | Pilote · Images · Vidéos · Publications · Plus | **Syna · espace actuel · Espaces · Suivi**. « Espaces » ouvre une feuille avec tous les espaces du projet. « Suivi » montre les tâches **réellement en cours**, avec pause et reprise ; l'historique, les preuves et l'annulation arrivent au lot 2, et la feuille le dit. |
| Écrans des espaces | — | **Identiques** : rendus tels quels, hors du conteneur `.syna-ui`, à leur adresse actuelle. |

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/syna-ui/studio-shell.ts` | Choix de l'interface : variable d'installation et cookie de retour |
| `src/app/studio/[projectId]/layout.tsx` | Choisit la coquille sur le serveur ; mêmes contrôles d'accès au projet qu'avant |
| `src/components/studio/syna-shell.tsx` / `.css` | La coquille (Encre), enfermée dans `.syna-ui` |
| `src/components/studio/shell.tsx` | Interface actuelle **inchangée à l'écran**. Ses éléments (recherche, tâches, notifications, menus, pastilles) sont exportés pour être réutilisés, et une entrée « Nouvelle interface » n'apparaît que si la coquille est activée |
| `tests/syna-lot1-shell.test.ts` | Activation, espaces et adresses, pastilles, accès à SYNA, drapeaux fermés, retour arrière, isolement du style |
| `tests/syna-lot0-scope.test.ts` | Garde-fou du lot 0 : la coquille est ajoutée à la liste des fichiers autorisés à utiliser les primitives |
| `scripts/syna-lot1-recette.ts` | Recette dans un vrai navigateur (voir `RESULTATS.md`) |

## Point d'extension Plein cadre (lot 1 bis, non fait)

La coquille lit sa présentation à un seul endroit, `useSynaShellPrefs()`, qui renvoie aujourd'hui les valeurs par
défaut (Encre, apparence du Studio). Elle pose les attributs de mode sur ses conteneurs. Le lot 1 bis branchera les
préférences du compte et du projet, le sélecteur, le raccourci et la barre de commande Plein cadre, déjà prête dans le
lot 0. Aucun de ces éléments n'est développé ici.
