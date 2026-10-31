# SYNA lot 1 bis : résultats des vérifications

Code vérifié : commit `a807b43b` de la branche `claude/syna-lot1bis-modes`, empilée sur le lot 1 (`f73257c9`).
Tout a été fait en local, sur des bases temporaires isolées, avec deux comptes fictifs (A et B) et deux projets
fictifs : SILLON (boutique) et TABLE SAISON (restaurant).

- **Aucune donnée de client.**
- **Aucune clé d'IA, aucun message envoyé à SYNA, aucun fournisseur appelé. Coût IA : 0.**

Vue d'ensemble : [`captures/planche-lot1bis.jpg`](captures/planche-lot1bis.jpg).

Environnement :
- Node 22.22.0 et Next.js 15.5.28 (`next dev`) ;
- Chromium 153.0.8010.12, piloté par Playwright ;
- WebKit (Safari) et Firefox ne sont pas installés dans ce conteneur : **non testés**.

## 1. Tests automatiques

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | aucune erreur |
| `tests/syna-lot1bis-prefs.test.ts` (serveur, droits, validation, commandes) | réussi |
| `tests/syna-lot1bis-modes.test.ts` (vrai rendu React des deux modes, garanties du code) | réussi |
| Tests des lots 0 et 1 (`syna-lot0-*`, `syna-lot1-shell`), plus `plan-studio`, `fenetres-studio`, `hooks-avant-retour` | réussis. **Total : 10 fichiers, 101 tests sur 101** |
| `next build` (production) | voir § 6 |
| Suite complète `npx vitest run` | non relancée : elle dure plus de 30 minutes dans ce conteneur. La CI ne tourne que pour les PR vers `main`, donc pas sur cette PR empilée |

Ce que vérifient les tests du serveur :
- **Réglages du compte** : enregistrés, relus et validés ; une valeur inconnue ou un champ en trop est ignoré ; une largeur hors bornes est ramenée à 560 px.
- **Exception d'un projet** : elle l'emporte sur le compte, ne touche pas l'autre projet et se retire.
- **« Réglages par défaut »** : vide le compte et laisse les exceptions des projets.
- **Droits** :
  - sans session : 401 ;
  - projet d'un autre compte : 404, en lecture comme en écriture ;
  - exception de projet sans projet : 400 ;
  - requête d'une autre origine : 403.
- **Stockage** : une valeur devenue invalide en base n'est jamais renvoyée.
- **Commandes** :
  - 11 commandes d'affichage reconnues ;
  - 2 demandes ambiguës reçoivent une question ;
  - 6 demandes de contenu ne sont jamais traitées sur place.

## 2. Recette dans un vrai navigateur (`scripts/syna-lot1bis-recette.ts`)

Le Studio est lancé deux fois :
- **A** : coquille et SYNA visibles (`STUDIO_SYNA_SHELL=1` et drapeaux d'interface de SYNA, sur ce serveur local seulement). Une tâche « en cours » fictive est posée sur SILLON.
- **B** : coquille avec les drapeaux SYNA fermés.

Rapport complet : [`captures/recette/recette.json`](captures/recette/recette.json).

**39 vérifications réussies, 0 échec. 4 cas ne peuvent pas être joués ici ; ils sont expliqués au § 3.**

### Affichage

| Vérification | Résultat |
|---|---|
| 32 captures | Les deux modes s'affichent réellement, dans ces combinaisons : Encre et Plein cadre × ordinateur 1440, tablette 1024, téléphones 390 et 360 × clair et sombre × Boutique (SILLON) et Carte (TABLE SAISON) |
| Débordement horizontal | 0 |
| Erreurs JavaScript | 0 |
| Contraste mesuré des textes de la coquille | AA partout, dans chaque mode, en clair et en sombre. Minimum : 4,99:1 |
| Plein cadre, bas de page | aucun bouton de l'espace n'est caché sous la barre de commande |
| Téléphone en paysage (844 × 390) | Plein cadre sans débordement, rien de caché sous la barre |
| Personnaliser, ouvert dans 4 cas (Encre et Plein cadre, ordinateur et téléphone) | le focus va dans le panneau, Échap le ferme |
| Les 23 adresses d'espaces (19 boutique, 4 restaurant) | toutes répondent **en Encre et en Plein cadre**, avec leur titre |

### Les 12 tests de bascule (`docs/syna-2030/06-DEUX-MODES.md` § 5)

| # | Scénario | Résultat |
|---|---|---|
| 1 | Brouillon dans la barre, puis Ctrl Maj M | **réussi** : texte identique, focus rendu au champ |
| 2 | Conversation et sélection | **réussi** : la conversation SYNA et l'écran de l'espace ne sont **jamais recréés** (marqueur posé dans la page avant la bascule, retrouvé après). Sélection d'un élément de l'aperçu (A2) : **non réalisable**, voir § 3 |
| 3 | Tâche en cours | **réussi** : même tâche, même progression, toujours affichée ; aucune tâche créée |
| 4 | Devis ouvert | **non réalisable** sur cette base, voir § 3 |
| 5 | Bascule sur Boutique, Catalogue, Marque, Images, Vidéos, Publications et Pilote | **réussi** : même page, même titre, sans rechargement |
| 6 | Commandes locales | **réussi**, détail ci-dessous |
| 7 | Exception d'un projet | **réussi** : enregistrée sur le serveur, l'autre projet suit le compte. « Réglages par défaut » vide le compte sans toucher à l'exception ; « Suivre de nouveau le compte » la retire |
| 8 | Deux appareils, deux comptes | **réussi**, détail ci-dessous |
| 9 | Téléphone en Plein cadre | **réussi** : la feuille SYNA s'arrête au-dessus de la zone de commande ; la feuille Espaces ouvre l'espace choisi ; cibles d'au moins 40 px. Clavier virtuel : **non simulable**, voir § 3 |
| 10 | Accessibilité | **réussi** : Ctrl J ouvre SYNA avec le focus dedans ; Échap la ferme et rend le focus là où il était ; le changement de mode est annoncé aux lecteurs d'écran ; la largeur se règle au clavier (flèches sur le bord) et s'enregistre |
| 11 | Animations réduites | **réussi** : rien ne pulse ni ne glisse |
| 12 | Aucune donnée touchée | **réussi** : après 10 bascules de mode et 3 changements de bleu, les projets, versions du thème, tâches, abonnements et appels IA sont strictement identiques. Export ZIP : non comparé, voir § 3 |

Détail du test 6 (commandes locales) :
- « Passe en Plein cadre » est appliqué sur place, avec la mention « sans IA ni coût » ; la seule écriture est le réglage d'affichage.
- « Annuler » rétablit Encre.
- « Agrandis l'aperçu » fait passer la conversation de 440 à 360 px.
- Une demande ambiguë reçoit une question à deux choix, et rien ne change.
- Une vraie demande est confiée à la conversation, et rien n'est envoyé à l'IA.

Détail du test 8 (deux appareils, deux comptes) :
- Le choix fait sur l'ordinateur est retrouvé au chargement du téléphone (autre projet, même compte).
- Le choix fait sur le téléphone arrive sur l'ordinateur **au retour sur la page, sans recharger**.
- Un autre compte ne lit ni n'écrit ces réglages (404) et n'ouvre pas le projet.

### Retour arrière et drapeaux fermés

| Vérification | Résultat |
|---|---|
| « Interface actuelle » puis « Nouvelle interface » | l'interface d'origine revient, puis la coquille revient avec le mode choisi |
| Drapeaux SYNA fermés (ordinateur et téléphone) | aucun accès à SYNA ni conversation simulée. Une demande reçoit « rien n'a été envoyé » ; les commandes d'affichage marchent |
| Réseau | **aucune requête hors du serveur local**, et aucune requête d'écriture vers la conversation ou une génération (0 appel IA) |

## 3. Ce qui n'a pas pu être vérifié (et pourquoi)

1. **Sélection d'un élément de l'aperçu (test 2).** La sélection native vient de A2 (Codex, #287), qui n'est pas dans
   cette base. Le lot 1 bis prouve seulement que le contexte et la conversation ne sont pas recréés. Le test réel se
   fera dans la recette commune (#292).
2. **Devis ouvert pendant la bascule (test 4).** Sur cette base, un projet existant n'ouvre pas encore sa
   conversation (reprise A1 non intégrée), et un devis demanderait un appel IA. Même garantie structurelle : le
   panneau qui porte les devis n'est jamais recréé. Le test réel se fera dans la recette commune (#292), avec la
   confirmation gratuite de B1.
3. **Export ZIP octet pour octet (test 12).** Les projets de démonstration n'ont pas de boutique composée. Ce qui est
   vérifié à la place :
   - la base des projets est identique avant et après les bascules ;
   - un test unitaire prouve qu'aucun fichier du site, du thème ou des exports ne lit ces réglages.
4. **Clavier virtuel (test 9).** Il ne se simule pas dans Chromium sans écran. La barre et la feuille suivent
   `visualViewport` dans le code. **À vérifier sur un vrai téléphone.**
5. **Safari (WebKit) et Firefox** : non installés ici. **Lecteur d'écran réel** (VoiceOver, NVDA) : non testé ; seule
   l'annonce `aria-live` est vérifiée.

Une remarque honnête sur le test 12. Sur toute la durée de la recette, une seule table a changé : `subscriptions`.
J'ai regardé la base : c'est une ligne « aucun forfait » que le code de facturation existant (`getSubscription`,
`src/lib/billing.ts`) crée à la première visite d'un compte. Elle n'a rien à voir avec les modes. Mesurées juste
avant et juste après les bascules, les données sont strictement identiques.

## 4. Défauts trouvés et corrigés pendant ce lot

1. **Réglages du compte non enregistrés (erreur 500).** L'identifiant vide du compte était pris pour une absence de
   projet. Corrigé, et couvert par un test.
2. **Téléphone, Plein cadre** : le bouton « Suivi » recouvrait le bouton d'envoi de la barre. Corrigé : la barre prend
   la place restante, sans déborder.
3. **Plein cadre, conversation ouverte** : les outils de l'en-tête passaient sous la conversation. Corrigé : l'en-tête
   lui laisse sa place.
4. **Encre** : l'en-tête passait sur deux lignes. Corrigé : le sélecteur de mode rejoint la ligne du titre.
5. **Menu compact** : le lien « Interface actuelle » manquait. Corrigé.
6. **Commandes** : « Ajoute une section sombre… » était pris pour « mode sombre ». Corrigé : toute phrase qui parle du
   contenu reste pour la conversation (tests ajoutés).
7. **Confirmation perdue après « Passe en Plein cadre »** tapé depuis la colonne Encre : la confirmation et
   « Annuler » restaient dans la barre devenue cachée. Corrigé : une seule confirmation, partagée par les deux
   places de la barre.
8. **Synchronisation entre appareils** : revenir sur une fenêtre déjà visible ne relisait pas les réglages. Corrigé :
   le retour sur la page relit toujours le serveur (ou renvoie un réglage en attente).

## 5. Captures

Dossier [`captures/recette/`](captures/recette/) (JPG, réduites à 1 440 px de large au plus) :

| Fichiers | Contenu |
|---|---|
| `encre--<appareil>--<espace>--<clair/sombre>.jpg` | Encre : ordinateur 1440, tablette 1024, téléphones 390 et 360 ; Boutique (SILLON) et Carte (TABLE SAISON) |
| `plein--<appareil>--<espace>--<clair/sombre>.jpg` | Plein cadre, mêmes cas |
| `personnaliser--<mode>--<appareil>.jpg`, `personnaliser--portee-projet.jpg` | Panneau *Personnaliser l'interface* dans les deux modes, ordinateur et téléphone, et réglage pour ce projet seulement |
| `commande--passe-en-plein-cadre.jpg` | Commande locale appliquée, avec « Annuler » |
| `plein--telephone-360--syna-ouverte.jpg`, `plein--telephone-360--espaces.jpg`, `plein--telephone-paysage--sillon-images.jpg` | Téléphone en Plein cadre : SYNA ouverte, feuille Espaces, paysage |
| `drapeaux-fermes--*.jpg` | Coquille sans SYNA |

## 6. Compilation de production

`next build` : en cours au moment de ce commit ; le résultat est ajouté au commit suivant.

## 7. Retour arrière

- Pour tout le monde : retirer `STUDIO_SYNA_SHELL`, et l'interface actuelle revient.
- Pour une personne sur un appareil : « Interface actuelle ».
- Pour le code : annuler le commit du lot 1 bis, et la coquille du lot 1 revient telle quelle. La table
  `studio_ui_prefs` peut rester, rien d'autre ne la lit.
