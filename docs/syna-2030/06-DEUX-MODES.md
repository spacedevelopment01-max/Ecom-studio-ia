# 06 — Deux modes au choix : Encre et Plein cadre

Décision du propriétaire du 31 octobre 2026 ([commentaire #282](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/282#issuecomment-6544915430)) :
« Il faut tout raccorder à SYNA et encore plus. J'aime bien Plein cadre aussi, donc on doit pouvoir choisir et modifier
à notre bon vouloir si on veut Encre ou Plein cadre. » Ce document répond à ce commentaire et au retour sur le bouton
noir ([commentaire](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/282#issuecomment-6544748880)).
**Toujours au stade maquettes : aucun code du Studio modifié.**

## 1. Ce qui a été fait dans les maquettes

| Demande | Où | Vérifié |
|---|---|---|
| Plein cadre sur **les mêmes scénarios** qu'Encre | Les 13 écrans `maquettes/e-00…e-12` et `personnaliser.html` s'affichent dans les deux modes (sélecteur en haut à droite, ou `#plein` / `#encre` à la fin de l'adresse) | 84 captures (14 pages × 2 modes × ordinateur 1440, tablette 1024, téléphone 390) : 0 débordement, 0 image manquante, 0 erreur JavaScript |
| Comparaison côte à côte | `captures/deux-modes/01…14-*.jpg` : Encre à gauche, Plein cadre à droite, chaque fois ordinateur + tablette + téléphone | — |
| Accès SYNA sans pastille noire, **gros plans** ordinateur et téléphone, tous les états | `maquettes/acces-syna.html`, `captures/deux-modes/acces-syna--*.jpg` | 0 débordement, 0 erreur |
| Sélecteur de mode + panneau « Personnaliser l'interface » | `maquettes/personnaliser.html` (réglages réellement actifs dans la maquette) | idem |
| Prototype où le mode change **en gardant** le fil, la sélection, l'étape et le brouillon | `maquettes/prototype.html` (sélecteur, ou bouton « Dire à Syna « passe en plein cadre » ») | Test automatique `outils/bascule.cjs` à 1440, 1024 et 390 px : étape, sélection et brouillon identiques avant / après, retour par la commande SYNA, 0 erreur |

**Comment la maquette prouve qu'il n'y a pas deux Studios** : chaque écran a **un seul balisage**. Le mode Plein cadre
est une seconde feuille de style (`plein.css`) activée par `data-mode="plein"` sur la page. Les composants (fil, cartes
d'action, états, devis, aperçu, sélection) sont les mêmes ; seule leur présentation change.

## 2. Les deux modes

| | Encre (défaut proposé) | Plein cadre |
|---|---|---|
| Idée | Conversation lisible et persistante à côté de l'espace de travail | Le résultat (site, image, vidéo) en grand ; SYNA en barre de commande et feuille contextuelle |
| Accès à SYNA | **Variante A** : colonne fixe à gauche, repliable en un bord de 44 px « Syna » vertical ; onglet « Syna » de la barre basse au téléphone | **Variante B** : barre « Demandez à Syna… » dans une zone réservée en bas (la page s'arrête au-dessus) ; réduite en pastille « • Syna » pendant un travail à la main |
| Fil de conversation | Toujours visible | Feuille à droite (ordinateur, tablette) ou en bas (téléphone), fil complet, défilable |
| Typographie | Newsreader (voix de SYNA), Geist, Geist Mono | Bricolage Grotesque (titres), Onest |
| Bleu | Bleu d'encre `#1F3C99` | Cobalt `#2443D6` |
| Pour qui | Débutant, lecture des explications, devis | Travail visuel, vérification d'un rendu, écran large |

Les deux modes partagent **un seul moteur SYNA, une seule mémoire**, et les mêmes projets, messages, coûts, tâches,
versions, droits, fichiers, validations et historiques. **Le mode ne change jamais le site du client**, ni son thème, ni
son export : il ne concerne que l'interface de travail du Studio.

## 3. Réglages, portée et persistance

| Réglage | Valeurs | Défaut | Portée | Remarque |
|---|---|---|---|---|
| Mode | Encre, Plein cadre | Encre | Compte (tous appareils) ; surcharge possible **par projet** | Bascule instantanée : sélecteur, Ctrl Maj M, ou demande à SYNA (commande locale, **sans IA ni coût**) |
| Apparence | Comme l'appareil, Clair, Sombre | Comme l'appareil | Compte | — |
| Bleu d'accent | Bleu d'encre, Cobalt, Bleu de Prusse | celui du mode | Compte | Trois bleus seulement, chacun contrôlé à 4,5:1 au moins sur clair et sombre ; pas de couleur libre |
| Largeur de la conversation | 360 à 560 px (par pas de 20) | 440 (Encre), 420 (Plein cadre) | Compte | Poignée glissable en phase 2 |
| Densité | Confortable, Compacte | Confortable | Compte | — |
| Taille du texte | Normale, Grande | Normale | Compte | S'ajoute au zoom du navigateur |
| Panneau SYNA | Épinglé, Replié par défaut | Épinglé | Compte | — |
| Animations | Suivre l'appareil | Suivre l'appareil | — | « Réduire les animations » est toujours respecté |

**Priorité** : réglage du projet > réglage du compte > valeur par défaut. **Rétablir les réglages par défaut** remet le
compte à zéro sans toucher aux projets. **Stockage** proposé : préférences du compte côté serveur (synchronisées entre
appareils), avec copie locale pour l'affichage immédiat au chargement. Le compte administrateur a ses propres réglages,
comme un client ; aucun réglage ne dépend du forfait (un mode n'est pas une option payante).

**Garde-fous** : aucun réglage ne peut masquer un bouton de validation, un devis ou un état d'échec, ni descendre sous un
contraste de 4,5:1. Pas de constructeur visuel libre.

## 4. Contrat de composants communs (pour éviter deux frontends)

Une seule couche de données et de comportement, deux présentations. Noms proposés pour la phase 2 :

| Couche | Élément | Rôle | Partagé ? |
|---|---|---|---|
| État | `useSynaThread(projectId)` | Fil unique, messages, envoi, reprise après fermeture | Oui, identique |
| État | `useSelection()` | Élément désigné dans l'aperçu (texte, balise, chemin, image, section, bloc) → contexte de SYNA | Oui |
| État | `useSynaTasks(projectId)` | Tâches en cours, reçus, échecs, annulation | Oui |
| État | `useDraft(projectId)` | Brouillon du message, conservé au changement de mode et d'écran | Oui |
| État | `useStudioPrefs()` | Mode, apparence, accent, largeur, densité, texte ; portée compte / projet | Oui |
| Composant | `<ActionCard>` (plan, devis, reçu) | Les 7 états : proposition, brouillon, confirmé, en cours, vérifié, échec, non disponible | Oui, mêmes props |
| Composant | `<CostQuote>` | Devis en % du budget, barre avant / après, plafond, alternatives | Oui |
| Composant | `<Workspace>` + espaces (Site, Catalogue, Marque, Images, Vidéos, Diffusion, Projet) | Lieux de travail, commandes manuelles | Oui |
| Présentation | `<SynaPanel variant="column">` / `<SynaPanel variant="sheet">` | Colonne (Encre) ou feuille (Plein cadre) | **Deux présentations**, mêmes enfants |
| Présentation | `<SynaTrigger variant="rail">` / `<SynaTrigger variant="commandbar">` | Accès A ou B | **Deux présentations** |
| Présentation | jetons `encre` / `plein` | Couleurs, polices, rayons | **Deux jeux de jetons** |

Règle : **aucune route API, aucun appel ni aucune donnée n'est propre à un mode**. Changer de mode ne fait aucun
appel réseau (sauf l'enregistrement de la préférence).

## 5. Tests de bascule et de non-régression (phase 2)

| # | Test | Critère |
|---|---|---|
| 1 | Basculer pendant la saisie d'un message | Brouillon identique, focus rendu au champ |
| 2 | Basculer avec un élément sélectionné | Même sélection, même puce de contexte |
| 3 | Basculer pendant une tâche IA en cours | Même tâche, même progression ; aucun nouvel appel, aucun double débit |
| 4 | Basculer pendant un devis ouvert | Même devis (même identifiant), accord toujours possible une seule fois |
| 5 | Basculer sur chaque espace (Site, Catalogue, Marque, Images, Vidéos, Diffusion, Projet) | Même page active, même aperçu, aucun rechargement |
| 6 | Demander « passe en plein cadre » à SYNA | Changement local, **0 % de budget**, aucun appel fournisseur, message de confirmation |
| 7 | Préférence compte puis surcharge projet | Priorité projet > compte > défaut ; « Rétablir » ne touche pas aux projets |
| 8 | Deux appareils | Préférence synchronisée au chargement suivant |
| 9 | Ordinateur 1440, tablette 1024, téléphone 390 et 360, paysage | Aucun débordement, rien sous la barre basse ni sous le clavier |
| 10 | Clavier seul et lecteur d'écran | Ctrl J ouvre SYNA, Échap ferme et rend le focus, états annoncés en `aria-live="polite"` |
| 11 | « Réduire les animations » | Aucune animation continue |
| 12 | Export et site du client | Fichiers d'export identiques octet pour octet quel que soit le mode |

## 6. « Tout raccorder à SYNA » : le contrat d'action par écran

Chaque capacité IA du Studio doit, à terme, passer par SYNA avec le même contrat (sauf les actions sensibles, qui
restent des écrans natifs validés par le client). Ce contrat existe déjà en partie dans le moteur de SYNA (devis,
accord, reçu, version) ; la phase 2 l'utilise tel quel côté interface.

| Étape du contrat | Ce que l'interface affiche | Composant |
|---|---|---|
| Lecture de l'état | Ce que SYNA a lu (projet, page, élément sélectionné) | fil, puce de contexte |
| Proposition | Plan en étapes, sans effet | `ActionCard` « Proposition » |
| Paramètres | Ce qui peut être ajusté avant accord | `ActionCard` « Modifier » |
| Devis | % du budget, plafond, alternatives | `CostQuote` |
| Consentement | Un clic explicite (même à 0 %) | bouton principal |
| Exécution | Progression, possibilité d'arrêter | « En cours », espace Suivi |
| Résultat | Résultat réel dans l'espace de travail | aperçu, comparaison |
| Preuve | Version, capture, avant / après, coût débité vs devis | `ActionCard` « Vérifié » |
| Version et restauration | Annuler la version, historique | bouton « Annuler vN » |
| Échec | Cause dite, rien de relancé sans accord | `ActionCard` « Échec » |

| Écran | Capacités IA à raccorder (Codex) | Aujourd'hui dans SYNA |
|---|---|---|
| Site | Toutes les retouches de `shop.chat` (couleurs, style, sections, réglages, thème, retour de version) + **moteur local gratuit** | Retouche exacte texte / image, composition, export, capture |
| Catalogue | Archivage, ordre, ancien catalogue de l'onglet Produit, synchronisation (préparation seulement) | Lecture, brouillon, retouche, stock d'un brouillon |
| Marque | Relais OpenAI des logos, palette et polices | Identité, logos, choix |
| Images | Type d'image par défaut, emplacement demandé par le thème | Création, correction |
| Vidéos | Mode « par étapes », vidéo sur mesure, plan IA de la banque | Montage local, clips, voix, reprise d'un plan |
| Diffusion | Vidéo et LinkedIn, jours exclus, répartition des formats, `calendar.update` | Brouillons, image manquante, brouillon de campagne |
| Textes et blog | Sujet choisi par l'IA, sujets proposés, réécriture, restauration | Document par page, retouche de passages, brouillon d'article |
| Métiers (carte, biens, réalisations, prestations, réservations) | Outils sur `/api/projects/[id]/contenus` | Aucun (non raccordé) |
| Projet existant | Reprise de l'historique et des contenus métier | Lecture partielle |

Les écrans non raccordés restent accessibles dans l'interface jusqu'à la parité (voir `05-PLAN-MIGRATION.md`).

## 7. Recommandation

- **Encre par défaut** pour un nouveau compte : il convient mieux au débutant (explications lisibles, devis à côté du
  travail). **Plein cadre toujours disponible**, en un clic, et mémorisé.
- Accès **A** en Encre, **B** en Plein cadre, **jamais de pastille flottante** au-dessus du contenu.
- Développer les deux présentations **en même temps** sur le même socle (lot « Modes » ci-dessous), plutôt qu'Encre
  d'abord puis Plein cadre : sinon le risque de deux frontends qui divergent est réel.

## 8. Limites

- Plein cadre au téléphone : la feuille SYNA occupe environ la moitié de l'écran, et l'aperçu se lit au-dessus. C'est
  correct dans les maquettes mais à confirmer avec de vrais utilisateurs.
- Vidéo en tablette Plein cadre : la feuille couvre une partie des plans (défilement nécessaire).
- Lecteur d'écran réel, contrastes mesurés et paysage du téléphone : **non testés**.
- Les réglages du panneau « Personnaliser » sont actifs dans la maquette, mais **rien n'est enregistré**, ni sur le
  compte ni sur le projet.
