# Intégration globale du 22 octobre 2026 (PR #162)

Consigne de Thomas : « Fait fusionner le tout par Claude » (commentaire 6338118663 sur la PR #159). Cette page dit ce
qui a été réuni, comment les conflits ont été tranchés, ce qui a été vérifié et le sort de chaque PR source.

## Point de départ

- `main` avant intégration : `d97e0b95`, sauvegardé dans la branche `claude/sauvegarde-main-avant-integration`.
  Le proxy de la session refuse l'envoi des étiquettes (tags), d'où une branche.
- Branche d'intégration : `claude/integration-globale`, partie de la tête de #161 (`38da2575`).

## Ascendance réelle des PR (vérifiée par `git merge-base --is-ancestor`)

| PR | Branche | Contenue dans | Remarque |
|---|---|---|---|
| #147 | `claude/verification-sections-145` | #149, #153, #156, #157, #159, #161 | — |
| #149 | `claude/theme-sillon-148` | #153, #156, #157, #159, #161 | — |
| #153 | `claude/themes-noctil-traverse-152` | #156, #157, #159, #161 | base commune des deux têtes (`5eb672f9`) |
| #146 | `codex/142-budgets-suivi-reprise` | #156, #161 | — |
| #151 | `codex/150-forfaits-droits-rdv` | #156, #161 | — |
| #156 | `codex/154-integration-adaptation-client` | #161 | — |
| #157 | `claude/themes-heuren-alcove-155` | #159 | — |
| #159 | `claude/themes-museau-souple-158` | tête Claude | 59 commits depuis la base commune |
| #161 | `codex/160-strategie-client` | tête Codex | 53 commits depuis la base commune |
| #127 | `claude/planifier-avec-visuels` | aucune | 3 commits du 16 octobre, 150 commits de retard sur `main` |

Les deux têtes (#159 et #161) ont été réunies par un vrai commit de fusion. Toutes les autres PR y sont donc incluses
avec leur historique complet. Aucune n'a été réappliquée commit par commit.

## Conflits et décisions

Aucune résolution globale « ours/theirs ». Trois fichiers étaient en conflit de texte. D'autres écarts n'ont été
découverts que par les tests.

| Sujet | Claude (#159) | Codex (#161) | Décision |
|---|---|---|---|
| Catalogue (`theme-access.ts`) | 11 thèmes | 7 thèmes, droits par famille (#150) | 11 thèmes **avec** les droits par famille de Codex |
| Accès par forfait | « inclus dans tout forfait payant » | 1 / 3 / 5 thèmes par famille | grille de Codex conservée (décision forfaits #150) |
| Familles de forfait (`plan-entitlements.ts`) | ONDE en E-commerce (#158) | ONDE en spécialisée ; 4 places libres en E-commerce | Spécialisée : FRAISE, SILLON, NOCTIL, TRAVERSE, MUSEAU CLUB. E-commerce : ORBE, ONDE, HEUREN, ALCÔVE, SOUPLE. Services : Atelier Rive. Un test vérifie que la famille de forfait est la catégorie du thème. |
| Textes galerie et Découverte | « inclus dans tout forfait payant » | « Sept thèmes » | « Onze thèmes, accessibles selon votre forfait (1, 3 ou tous par famille) » |
| Formes de référence de l'adaptation client (`reference-shapes.json`) | — | 7 thèmes, extraites au commit `5eb672f9` (ONDE dans son ancienne composition) | Régénérées par les scripts de Codex sur les 11 démonstrations actuelles : mise en page seule, aucun texte, aucune image ni donnée de démo |
| Ouverture de l'accueil client | ouvertures `fs-campaign` (ONDE) et `cv-hotspots` (MUSEAU CLUB) | seules les sections « hero / opening / banner » comptaient comme ouverture | La première section de l'accueil est l'ouverture et n'est jamais masquée. Un bandeau plus bas devient un appel à l'action : plus de second H1. Une ouverture n'affiche jamais de nom ni de dates de campagne non fournis. |
| Limite par jour dans le calendrier | — | #150 : une publication seulement approuvée ne réserve pas d'envoi | Règle d'envoi de Codex conservée. Déplacer des contenus (« mets les vidéos le mardi ») compte aussi les contenus approuvés du jour, comme avant #150. Le test `social-autopilot-limites` échouait sur la tête de #161 selon le jour de la semaine. |
| Test « deux marques de la même famille » | FRAISE + ONDE | ONDE n'est plus spécialisée | FRAISE + SILLON (deux boutiques spécialisées) |

Effets sur les droits, à connaître :
- Créer ouvre FRAISE, ORBE et Atelier Rive.
- Développer ajoute SILLON, NOCTIL, ONDE et HEUREN.
- Dominer ajoute TRAVERSE, MUSEAU CLUB, ALCÔVE et SOUPLE.

NOCTIL passe de Dominer à Développer, puisque ONDE a quitté la famille spécialisée. Un projet qui utilise déjà un thème le garde.

## Rédaction (consigne du 21 octobre, 21 h 45)

Conservée telle quelle : fixtures de démonstration, `docs/COPYWRITING-themes.md` et
`docs/coordination/ROLES-CONTENU-THEMES.md` sont identiques à la tête de #159.
- NOCTIL : l'enfant utilise, le parent achète.
- FRAISE : gummies vitaminés goût fraise, composition fictive annoncée, aucun positionnement capillaire.
- Atelier Rive : site complet ; les angles de campagne sont réservés aux communications.

Les données fictives des démonstrations n'entrent pas dans les projets clients. Les formes de référence ne gardent que
la mise en page, et le test d'adaptation vérifie l'absence de noms de démonstration sur les 11 thèmes.

## PR #127

Reprise **à la main** sur le code actuel (commit `5c7b3f55`, réuni ici), sans fusionner l'ancienne branche. Détail dans
`docs/coordination/PR127-SORT.md`.
- **Repris** : calendrier modifié en une phrase.
  - Dates en FR et EN, périodes, jours.
  - Aperçu avant d'agir, confirmation obligatoire avant une suppression, annulation prudente.
  - Coût de l'IA en % du budget.
  - « Remplace les images » produit une image par l'IA, avec devis et accord, sans jamais repayer.
- **Non repris** : le mode « Visuels gratuits » (banque de photos, photos libres, vidéos montées sans IA), contraire à la
  règle des images finales 100 % IA.
- La PR #127 peut être fermée comme « reprise dans #162 ».
