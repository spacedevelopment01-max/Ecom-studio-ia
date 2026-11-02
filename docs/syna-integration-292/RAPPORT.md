# Recette d'intégration Claude + Codex (#292) : Encre / Plein cadre avec le moteur SYNA

Branche de recette isolée `integration/syna-claude-codex-recette`. **Ne pas fusionner dans `main`.** Rien n'est déployé,
aucune donnée client n'est utilisée, aucun fournisseur d'IA n'est appelé (**coût IA : 0**).

## 1. Ce qui est intégré

| Étape | Source | SHA | CI de la source |
|---|---|---|---|
| Base | `main` | `37fcfd25` | — |
| Pile Codex, une seule fois par ascendance | A1 #286 → A2 #287 → B1 #289 → confirmation gratuite #291 → contrat CI #296 → GET Logos #297 | tête `aaff6ae7` | verte, [run 41249279133](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41249279133) |
| Pile Claude, une seule fois par ascendance | lot 0 #288 → lot 1 #290 → lot 1 bis #293 | tête `101d6713` | verte, [run 41237201521](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41237201521) |
| Hors recette | correctif logos #295 | — | rouge, volontairement exclu |

- **Fusions** : `faed1dcb` (Codex), puis `531ef3b5` (Claude), toutes deux `--no-ff` avec message de traçabilité.
- **Conflits : aucun.** Les deux piles ne modifient **aucun fichier commun**.
  - La coquille Encre / Plein cadre rend **un seul** `ConversationPanel` : celui de Codex, avec sa confirmation gratuite (`useLocalSiteConfirmation`, `conversation-local-site.tsx`).
  - La sélection A2, les handlers `confirm-local`, la relecture d'aperçu, la lecture seule A1, les reçus et les droits sont donc **repris tels quels**.
  - Les préférences des deux modes (table `studio_ui_prefs`, route `/api/studio/ui-prefs`) et `shop.chat` sont intacts.
- **Ajouts de cette branche** :
  - deux scripts de recette, un test, ce dossier ;
  - **un correctif d'affichage** trouvé par la recette (§ 2) : en Plein cadre sur tablette, la barre de commande
    recouvrait le bas de la feuille SYNA. Il est dans `syna-shell.css` (code de Claude), à reporter dans #293 après
    validation.
- Aucune ligne du moteur de Codex n'est modifiée.

## 2. Recette des deux modes avec le moteur SYNA réel (`scripts/syna-integration-recette.ts`)

Le parcours reprend celui de Codex (`verify-syna284-b1-confirmation-ui.ts`), **avec ses assertions**, joué dans la
coquille.

Conditions :
- vrai Next.js, moteur SYNA réel (A1/A2/B1/#291) ;
- drapeaux ouverts **dans ce processus seulement** ;
- stockage temporaire isolé, clés vides, réseau hors boucle locale refusé (serveur et navigateur) ;
- projets fictifs.

Combinaisons : 2 métiers (boutique, services) × 2 modes (Encre, Plein cadre).

**Résultat sur le SHA intégré : 6 cas sur 6 réussis, 0 erreur JavaScript, 0 requête interdite. `ai_calls`, `jobs`,
`usage_events` = 0.**

| Étape du parcours | Encre | Plein cadre |
|---|---|---|
| Le mode du compte est appliqué au chargement ; aucune pastille noire | ✓ | ✓ |
| Désignation d'un titre dans l'aperçu natif (A2) | ✓ | ✓ |
| Demande ambiguë : réponse gratuite, aucune écriture | ✓ | ✓ |
| « Remplace le titre de cette section par … » : avant/après, **« Gratuit — 0 € »**, aucun devis payant | ✓ | ✓ |
| Annulation : aucune version créée | ✓ | ✓ |
| Confirmation en **double clic** : **une seule** version, titre visible dans l'aperçu, conservé après rechargement | ✓ | ✓ |
| Déplacement d'une section : réponse réseau perdue **après** l'enregistrement, reprise avec **un corps identique**, une seule version, ordre vérifié dans l'aperçu | ✓ | ✓ |
| ZIP Shopify : seul `templates/index.json` change ; empreintes métier identiques | ✓ | ✓ |
| Conflit N→N+1 : l'ancien accord n'écrase rien, revalidation explicite, nouvelle proposition | ✓ | ✓ |
| Restauration manuelle native : retour exact à l'état initial, anciennes versions intactes, autres projets intacts | ✓ | ✓ |
| Droits retirés entre la proposition et le clic : refus, aucune version | ✓ | ✓ |
| Captures 1440, **1024**, 390, 360 px, sans débordement horizontal | ✓ | ✓ |
| Projet historique A1 : « Contexte existant · lecture seule », aucune retouche ni devis (téléphone) | ✓ | ✓ |

### Bascules de mode au milieu du parcours

Bascule aller-retour avec Ctrl Maj M, faite à trois moments : pendant le diff ouvert, pendant l'erreur réseau, pendant
le conflit.

**12 séries sur 12 réussies.** À chaque fois :
- même instance de conversation (un marqueur posé avant la bascule est retrouvé après) ;
- même brouillon, même désignation ;
- même état : proposition, bouton « Réessayer » ou « Revalider » ;
- aucune requête d'écriture vers la conversation ;
- le réglage d'affichage revient exactement à sa valeur.

### Défaut d'affichage trouvé et corrigé : Plein cadre sur tablette
Sur tablette (1024 à 1279 px) en Plein cadre, la feuille SYNA descendait jusqu'en bas de l'écran. La barre « Demandez
à Syna… », placée au-dessus d'elle, recouvrait sa zone de saisie et le bouton « Enregistrer ».
- **Correction** : la feuille s'arrête au-dessus de la barre (`syna-shell.css`, une règle).
- **Couverture** : la recette vérifie désormais, à chaque taille en Plein cadre, que la barre ne recouvre jamais la
  feuille ; un test unitaire (`tests/syna-integration-292.test.ts`) fixe la règle.
- Le téléphone et l'ordinateur n'étaient pas touchés.

### Autres vérifications
- **Retouche gratuite fermée** (`SYNA_UI_CLOSED=1`, 4 cas + 2 historiques) : **réussi**.
  - Le message « Les retouches gratuites ne sont pas activées ici. Aucun appel IA lancé. » s'affiche.
  - Aucun bouton de confirmation mort, aucun repli payant, version inchangée.
  - Historiques en lecture seule ; 0 appel IA.
- **Interface actuelle** (coquille fermée) : `scripts/verify-syna284-b1-confirmation-ui.ts` de Codex, **identique à
  #297**, rejoué sur le SHA intégré : **échec 2 fois sur 2**, et **aussi sur la pile Codex seule** (`aaff6ae7`, sans
  aucun fichier de Claude). Cause : le défaut de désignation du § 3.
  - Passages 1 et 2 sur le SHA intégré : arrêt à l'étape « droits retirés », juste après la restauration. La
    désignation est devenue « Page désignée : / », et SYNA répond « Désignez une section ».
  - Pile Codex seule : arrêt à la nouvelle proposition après conflit. « Page désignée : / », bouton « Confirmer »
    désactivé.

  Sur la CI de Codex, ce script passe : le Studio compilé enchaîne les étapes plus vite que la relecture de 15 s. En
  local, sur un serveur de développement plus lent, la relecture tombe au milieu. Preuves :
  `captures/codex-interface-actuelle/` (DOM et capture au moment de l'échec).

## 3. Désignation après l'actualisation automatique (consigne #292, point 4) — **BLOCAGE D'ACCEPTATION**

Script `scripts/syna-integration-designation.ts`, **sans contournement**. On attend volontairement 17 s, plus que la
relecture du projet (`ProjectProvider` : 15 s au repos), puis on envoie « Remplace le titre de cette section par … ».

| Situation | Passage 1, Encre | Passage 1, Plein cadre | Passage 2, Encre | Passage 2, Plein cadre |
|---|---|---|---|---|
| Témoin : aucune nouvelle version | ✓ conservée | ✓ | ✓ | ✓ |
| Restauration, puis désignation **une fois l'aperçu à jour** (passage 2) | ✗ (passage 1 : désignation faite sur l'aperçu pas encore rafraîchi) | ✓ | ✓ | ✓ |
| **Modification manuelle → « Revalider la cible actuelle » → attente** | **✗ « Page désignée : / »** | **✗** | ✓ | **✗** |

**Défaut avéré, intermittent (3 échecs sur 4), indépendant du mode.** Déroulement :
1. « Revalider » désigne bien la section sur la nouvelle version N+1.
2. Au rafraîchissement suivant, l'onglet Boutique (`tab-boutique.tsx`, effet `selectionCurrent`, code de `main`)
   recharge ses données.
3. Il ne reconnaît pas cette désignation : sa sélection locale porte encore sur la version N.
4. Il la remplace par « Page désignée : / ».
5. La demande « … de cette section » reçoit alors « Désignez une section ou un champ natif » : **aucune écriture fausse**,
   mais la personne doit redésigner.

Le défaut a été **reproduit aussi dans l'interface actuelle et sur la pile Codex seule**, sans la coquille :
- le script de Codex avec une pause de 16 s avant « Revalider » ;
- puis le script de Codex **non modifié**, qui échoue 3 fois sur 3 en local (§ 2). Captures : `captures/designation/`, résultats bruts : `RESUME-DESIGNATION-passage*.json`.

Pour la restauration, il ne reste qu'une fenêtre courte : environ une seconde après le clic, l'aperçu montre encore
l'ancienne version, et une désignation faite à cet instant est perdue au rafraîchissement.

**Les gardes de version ne sont pas assouplis.** La recette principale (§ 2) attend la relecture avant « Revalider »
et recharge la page après la restauration. Ces attentes sont écrites et commentées dans le script : elles servent à
tester les bascules, **elles ne valent pas acceptation de ce point**.

**Correctif proposé à Codex** (isolé, à décider dans #292 / #284, **non appliqué ici**) : dans `tab-boutique.tsx`, ne
pas remplacer par la page une désignation `theme-section` de SYNA qui porte **déjà sur la version affichée** (cas de la
revalidation) ; l'adopter comme sélection locale. Les désignations réellement périmées continuent d'être retirées. À
couvrir par un test qui attend plus de 15 s après « Revalider ».

## 4. Tests et contrôles sur le SHA intégré

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | aucune erreur |
| Tests ciblés : `syna-lot0-*`, `syna-lot1-shell`, `syna-lot1bis-*`, `conversation284-*`, `local-site-confirmation-client`, `ci211-verdict-complet`, `plan-studio`, `fenetres-studio`, `hooks-avant-retour` | **15 fichiers, 214 tests sur 214**. Un premier lancement, fait pendant qu'une recette navigateur tournait, avait signalé 2 fichiers en échec sans aucun test en échec ; relancé seul : tout réussit |
| `tests/syna-integration-292.test.ts` (nouveau) et tests de la coquille | réussis (27 sur 27) |
| `next build` | **réussi**, 62 pages (`NODE_OPTIONS=--max-old-space-size=6144` : limite de mémoire de ce conteneur) |
| CI complète (4 contrôles + verdict) | **sur la PR brouillon de recette** : le statut exact est donné dans la PR et dans #292, jamais présumé |

## 5. Bilan

| | |
|---|---|
| **Fait et vérifié** | intégration sans conflit ; Encre et Plein cadre avec le moteur SYNA réel ; modifications gratuites (titre, déplacement), « Gratuit — 0 € », double clic, reprise réseau, conflit, restauration, droits ; une seule conversation, conservée pendant 12 séries de bascules ; A1 en lecture seule ; drapeau fermé ; 0 appel IA ; ZIP ; compilation |
| **Corrigé** | Plein cadre sur tablette : la barre de commande recouvrait la feuille SYNA (§ 2) |
| **Blocage d'acceptation** | la désignation d'une section est perdue après une modification manuelle et « Revalider », à l'actualisation automatique (3 fois sur 4, les deux modes, et aussi sans la coquille) ; le script de Codex, non modifié, échoue en local pour la même raison. Correctif proposé à Codex (§ 3), non appliqué |
| **Non fait** | clavier virtuel, Safari, Firefox, lecteur d'écran, appareils réels |

## 6. Limites (non vérifié)
- Clavier virtuel, Safari, Firefox, lecteur d'écran réel, appareils physiques : non testés. Chromium seulement, sans
  écran.
- La qualité des fournisseurs réels n'est pas en jeu : aucune IA appelée, les retouches testées sont locales et
  gratuites.
- La reprise bornée du GET Logos (#297) ne prouve pas l'origine du `ECONNRESET` historique (voir la note de Codex).
- Captures prises sur des projets fictifs ; aucun média client.

## 7. Retour arrière
Fermer la PR de recette et supprimer la branche `integration/syna-claude-codex-recette`. Les PR sources (#286, #287,
#289, #291, #296, #297, #288, #290, #293) ne sont pas modifiées.
