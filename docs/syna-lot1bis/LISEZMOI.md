# SYNA — lot 1 bis : Encre et Plein cadre au choix, personnalisation, réglages synchronisés (mission #282)

Autorisation du propriétaire : « Le lot 1 bis de SYNA est autorisé », et consigne du 31 octobre sur l'issue #282
(« GO EXPLICITE — CLAUDE / LOT 1 BIS »). **Rien n'est fusionné, rien n'est déployé, aucun appel IA, aucun lot 2.**

- Branche `claude/syna-lot1bis-modes`, empilée sur la tête du lot 1 (`claude/syna-lot1-coquille`, `f73257c9`).
  La PR brouillon vise cette branche : son diff ne contient que le lot 1 bis.
- Codex : aucun fichier de A1 (#286), A2 (#287) ni B1 (#289) n'est touché. `conversation-panel.tsx` est réutilisé tel
  quel, et B1 n'est pas branché dans l'interface.

## Ce que vous pouvez faire dans le Studio

| Action | Comment |
|---|---|
| Changer de mode | Sélecteur **Encre / Plein cadre** à côté du titre de chaque espace, **Ctrl Maj M** (⌘ Maj M sur Mac), carte « Mode » dans *Personnaliser*, ou en écrivant **« Passe en Plein cadre »** / **« Reviens à Encre »** dans la barre de commande |
| Personnaliser | Bouton ⚙ (curseurs) de l'en-tête → *Personnaliser l'interface* : mode, apparence (appareil, clair, sombre), bleu (encre, cobalt, Prusse), largeur de la conversation (360 à 560 px), conversation ouverte ou repliée à l'arrivée, densité, taille du texte, portée (tout le compte, ou ce projet seulement), réglages par défaut |
| Élargir l'aperçu | **« Agrandis l'aperçu »** dans la barre, curseur de largeur, ou en glissant le bord de la conversation (aussi au clavier : flèches gauche / droite sur le bord) |
| Ouvrir / replier SYNA | Onglet signature (Encre), barre de commande (Plein cadre), onglet *Syna* du téléphone (Encre), **Ctrl J** (⌘ J) |
| Retrouver ses réglages | Ils sont enregistrés **sur votre compte** et retrouvés sur vos autres appareils : au chargement de la page, et dès que vous revenez sur un onglet déjà ouvert |

## Les deux modes

| | **Encre** | **Plein cadre** |
|---|---|---|
| Idée | La conversation à côté de votre travail | Le résultat d'abord |
| Menu des espaces | Complet (repliable avec « [ ») | Compact (icônes) |
| En-tête | Barre pleine, titre en Newsreader | Flottant, titre en Bricolage, outils en pastille |
| SYNA | Colonne à droite (≥ 1280 px), panneau sinon ; onglet signature quand elle est repliée ; barre de commande en tête de la colonne | **Barre de commande** dans une zone réservée en bas, et SYNA en **feuille** flottante : à droite dès 1280 px (l'espace de travail lui réserve sa place), par-dessus avant, en bas au téléphone |
| Téléphone | Barre basse Syna · espace · Espaces · Suivi | Zone de commande : Espaces · barre · Suivi, au-dessus du clavier virtuel |

**Une seule SYNA.** Le même `ConversationPanel` (mêmes routes, même fil, mêmes devis, mêmes droits) est rendu à un seul
endroit de l'arbre, dans les deux modes. Le mode ne change que des classes et des positions : l'écran de l'espace, la
conversation et le texte de la barre de commande **ne sont jamais recréés**. Le mode ne touche **ni le site du client,
ni son thème, ni ses exports** : aucun de ces fichiers ne lit ces réglages.

## Réglages : portée, persistance, priorités

| Point | Comportement |
|---|---|
| Stockage | Table `studio_ui_prefs`, créée à la première utilisation : une ligne par compte, plus une ligne facultative par projet. Valeurs validées, version de schéma enregistrée, supprimées avec le compte. Aucune migration des tables existantes |
| Priorité | **ce projet > le compte > les valeurs par défaut** (Encre, apparence de l'appareil, bleu d'encre, 440 px, conversation ouverte à l'arrivée, densité confortable, texte normal) |
| Accès | Route `/api/studio/ui-prefs` : compte connecté seulement, et uniquement ses propres projets (404 sinon). Écritures protégées contre les autres origines. Aucun lien avec l'IA, le forfait ou l'abonnement : fonctionne sans abonnement |
| Synchronisation | Lus sur le serveur au chargement de la page (sans clignotement). Relus au retour sur la page, à la reconnexion, et quand un autre onglet enregistre. Hors ligne : gardés sur l'appareil et envoyés au retour du réseau |
| Défaut | « Réglages par défaut » vide le compte sans toucher aux projets. « Suivre de nouveau le compte » retire l'exception d'un projet |
| Apparence | Appliquée à tout le Studio (même mécanisme que le bouton clair / sombre actuel), **seulement si elle a été choisie**. Le choix déjà fait sur un appareil est respecté |
| Sécurité d'usage | Largeurs bornées (360 à 560 px), trois bleus contrôlés AA en clair et en sombre, aucun réglage ne peut masquer une confirmation, un coût ou la navigation |

## Commandes d'affichage : frontière avec la future SYNA (B3, Codex)

`src/lib/syna-ui/ui-commands.ts` reconnaît **sur place, sans IA et sans coût**, uniquement des réglages d'affichage du
Studio :
- le mode ;
- l'apparence ;
- la largeur de l'aperçu et de la conversation ;
- la conversation repliée ou épinglée ;
- la densité ;
- la taille du texte ;
- la remise par défaut.

Il annonce le résultat (« … · sur place, sans IA ni coût »), avec **Annuler**. Une demande ambiguë (« change le mode »,
« agrandis ») reçoit une **question** à deux choix.

Toute phrase qui parle du contenu (site, section, image, produit, article, publication, couleur, prix…) ou qui dépasse
douze mots **n'est jamais traitée ici**. Elle est confiée à la conversation SYNA existante : la conversation s'ouvre, et
le texte est placé dans sa zone de saisie quand elle en a une, sans être envoyé. Si SYNA n'est pas ouverte sur
l'installation, la barre le dit et n'envoie rien.

Le raccordement général des intentions SYNA multi-actions (B3) appartient à Codex et n'est pas développé ici.

## Fichiers du lot 1 bis

| Fichier | Rôle |
|---|---|
| `src/lib/syna-ui/prefs-store.ts` | Lecture et écriture des réglages (compte, projet), validation, version |
| `src/app/api/studio/ui-prefs/route.ts` | Route protégée des réglages d'affichage |
| `src/lib/syna-ui/ui-commands.ts` | Commandes d'affichage locales, sans IA |
| `src/components/studio/syna-prefs.tsx` | Réglages côté navigateur : application immédiate, enregistrement, copie locale, synchronisation, apparence |
| `src/components/studio/syna-customize.tsx` | Panneau *Personnaliser l'interface* |
| `src/components/studio/syna-command.tsx` | Barre de commande (commandes locales, demandes confiées à la conversation) |
| `src/components/studio/syna-shell.tsx` / `.css` | Les deux modes, sélecteur, raccourcis, bord ajustable, zone de commande, clavier virtuel, retour du focus |
| `src/app/studio/[projectId]/layout.tsx` | Réglages lus sur le serveur et passés à la coquille |
| `src/components/syna/primitives.tsx` | Le conteneur accepte une largeur imposée (glisser le bord) |
| `tests/syna-lot1bis-*.test.ts`, `tests/syna-lot0-scope.test.ts` | Serveur, droits, commandes, rendu des deux modes, garde-fous |
| `scripts/syna-lot1bis-recette.ts` | Recette navigateur : les 12 tests de bascule (voir `RESULTATS.md`) |

## Retour arrière

- Retirer `STUDIO_SYNA_SHELL` (interface actuelle pour tous), ou « Interface actuelle » (une personne, un appareil).
- Annuler le commit du lot 1 bis : la coquille du lot 1 revient.
- La table `studio_ui_prefs` peut rester : rien d'autre ne la lit.
