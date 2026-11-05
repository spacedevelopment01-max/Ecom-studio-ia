# Recette d'intégration Claude + Codex (#292) : Encre / Plein cadre avec le moteur SYNA

Branche de recette isolée `integration/syna-claude-codex-recette`. **Ne pas fusionner dans `main`.** Rien n'est déployé,
aucune donnée client n'est utilisée, aucun fournisseur d'IA n'est appelé (**coût IA : 0**).

## 1. Ce qui est intégré

| Étape | Source | SHA | CI de la source |
|---|---|---|---|
| Base | `main` | `37fcfd25` | — |
| Pile Codex, une seule fois par ascendance | A1 #286 → A2 #287 → B1 #289 → confirmation gratuite #291 → contrat CI #296 → GET Logos #297 | tête `aaff6ae7` | verte, [run 41249279133](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41249279133) |
| Pile Claude, une seule fois par ascendance | lot 0 #288 → lot 1 #290 → lot 1 bis #293 | tête `101d6713` | verte, [run 41237201521](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41237201521) |
| **Correctif Codex #300** (désignation conservée après l'actualisation) | `git cherry-pick -x c2fbeb9d` | `64adddd7` | verte sur #300, [run 41448390271](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41448390271) |
| Hors recette | #295 et #298 (logos) | — | volontairement exclus |

- **Fusions** : `faed1dcb` (Codex), puis `531ef3b5` (Claude), toutes deux `--no-ff` avec message de traçabilité, puis
  le cherry-pick de #300 (`64adddd7`).
- **Conflits : aucun.** Les deux piles ne modifient **aucun fichier commun** ; #300 s'applique tel quel.
  - La coquille Encre / Plein cadre rend **un seul** `ConversationPanel` : celui de Codex, avec sa confirmation gratuite (`useLocalSiteConfirmation`, `conversation-local-site.tsx`).
  - La sélection A2, les handlers `confirm-local`, la relecture d'aperçu, la lecture seule A1, les reçus et les droits sont donc **repris tels quels**.
  - Les préférences des deux modes (table `studio_ui_prefs`, route `/api/studio/ui-prefs`) et `shop.chat` sont intacts.
- **Ajouts de cette branche** :
  - scripts de recette (`syna-integration-recette.ts`, `syna-integration-designation.ts`), lanceur de parité #301
    (`syna-parite-shell.ts`), un test, ce dossier ;
  - **un correctif d'affichage** trouvé par la recette (§ 2) : en Plein cadre sur tablette, la barre de commande
    recouvrait le bas de la feuille SYNA. Il est dans `syna-shell.css` (code de Claude), à reporter dans #293 après
    validation.
- Aucune ligne du moteur de Codex n'est modifiée par Claude.

## 2. Recette des deux modes avec le moteur SYNA réel (`scripts/syna-integration-recette.ts`)

Le parcours reprend celui de Codex (`verify-syna284-b1-confirmation-ui.ts`), **avec ses assertions**, joué dans la
coquille.

Conditions :
- vrai Next.js, moteur SYNA réel (A1/A2/B1/#291/#300) ;
- drapeaux ouverts **dans ce processus seulement** ;
- stockage temporaire isolé, clés vides, réseau hors boucle locale refusé (serveur et navigateur) ;
- projets fictifs.

Combinaisons : 2 métiers (boutique, services) × 2 modes (Encre, Plein cadre).

**Résultat sur la tête avec #300 (`80f93921`) : 6 cas sur 6 réussis, 0 erreur JavaScript, 0 requête interdite.
`ai_calls`, `jobs`, `usage_events` = 0.** La recette ne contient **aucun contournement** de l'actualisation automatique.

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
| Conflit N→N+1 : l'ancien accord n'écrase rien, revalidation explicite | ✓ | ✓ |
| **17 s réelles après « Revalider »** : la section est toujours désignée, puis nouvelle proposition gratuite confirmée | ✓ | ✓ |
| Restauration manuelle native : retour exact à l'état initial, anciennes versions intactes, autres projets intacts | ✓ | ✓ |
| **17 s réelles après la restauration** et une nouvelle désignation : la section est toujours désignée | ✓ | ✓ |
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
- **Couverture** : la recette vérifie, à chaque taille en Plein cadre, que la barre ne recouvre jamais la feuille ; un
  test unitaire (`tests/syna-integration-292.test.ts`) fixe la règle.
- Le téléphone et l'ordinateur n'étaient pas touchés.

### Autres vérifications (tête `80f93921`)
- **Retouche gratuite fermée** (`SYNA_UI_CLOSED=1`, 4 cas + 2 historiques) : **6 sur 6**. Message « Les retouches
  gratuites ne sont pas activées ici. Aucun appel IA lancé. », aucun bouton mort, aucun repli payant, version inchangée.
- **Interface actuelle** (coquille fermée) : `scripts/verify-syna284-b1-confirmation-ui.ts` de Codex, rejoué tel quel :
  **4 cas sur 4** (boutique, services, 2 historiques A1). Avant #300, il échouait 3 fois sur 3 en local
  (`captures/codex-interface-actuelle/avant-correctif-300/`).

## 3. Désignation après l'actualisation automatique (consigne #292, point 4) — **levé par #300**

Script `scripts/syna-integration-designation.ts`, **sans contournement**. On attend volontairement 17 s, plus que la
relecture du projet (`ProjectProvider` : 15 s au repos), puis on envoie « Remplace le titre de cette section par … ».

| Situation | Avant #300 (2 passages) | Avec #300 (`80f93921`) |
|---|---|---|
| Témoin : aucune nouvelle version | conservée 4/4 | conservée, Encre ✓ Plein cadre ✓ |
| Restauration, puis désignation sur l'aperçu à jour | conservée 2/2 | conservée, Encre ✓ Plein cadre ✓ |
| **Modification manuelle → « Revalider la cible actuelle » → attente** | **perdue 3 fois sur 4** (« Page désignée : / ») | **conservée, Encre ✓ Plein cadre ✓**, puis proposition gratuite |

**Cause d'origine** : à l'actualisation suivante, l'effet `selectionCurrent` de `tab-boutique.tsx` remplaçait par la
page la désignation que la revalidation venait de poser sur la nouvelle version. **Correctif #300 (Codex)** : il adopte
la portée de version courante d'une désignation déjà revalidée, seulement si projet, onglet, page, modèle, section, bloc
et version correspondent. Aucun garde de version, de droits ou de devis n'est relâché.

Preuves : `captures/designation/avant-correctif-300/` et `captures/designation/apres-correctif-300/`, avec leurs
`RESUME-DESIGNATION*.json`.

Limite restante (connue, non bloquante) : environ une seconde après le clic « Restaurer », l'aperçu montre encore
l'ancienne version. Une désignation faite à cet instant précis porte sur l'ancienne version, et elle est retirée au
rafraîchissement, comme le veulent les gardes de version. La personne qui désigne après l'affichage de l'aperçu à jour
n'est pas concernée.

## 4. Tests et contrôles sur la tête intégrée

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | aucune erreur |
| Tests ciblés : `syna-lot0-*`, `syna-lot1-shell`, `syna-lot1bis-*`, `syna-integration-292`, `preview-revalidated-scope` (#300), `conversation284-*`, `local-site-confirmation-client`, `ci211-verdict-complet`, `plan-studio`, `fenetres-studio`, `hooks-avant-retour` | **17 fichiers, 232 tests sur 232** |
| `next build` | **réussi**, 62 pages (`NODE_OPTIONS=--max-old-space-size=6144` : limite de mémoire de ce conteneur) |
| CI complète (4 contrôles + verdict) | **sur la PR #299** : le statut exact est donné dans la PR et dans #292, jamais présumé |

## 5. Bilan

| | |
|---|---|
| **Fait et vérifié** | intégration sans conflit, #300 compris ; Encre et Plein cadre avec le moteur SYNA réel ; modifications gratuites (titre, déplacement), « Gratuit — 0 € », double clic, reprise réseau, conflit, restauration, droits ; **section conservée 17 s après revalidation et restauration** ; une seule conversation, conservée pendant 12 séries de bascules ; A1 en lecture seule ; drapeau fermé ; interface actuelle ; 0 appel IA ; ZIP ; compilation |
| **Corrigé** | Plein cadre sur tablette : la barre de commande recouvrait la feuille SYNA (Claude). Désignation perdue à l'actualisation (Codex, #300) |
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
#289, #291, #296, #297, #300, #288, #290, #293) ne sont pas modifiées. Pour retirer seulement #300 : `git revert` du
commit `64adddd7`.
