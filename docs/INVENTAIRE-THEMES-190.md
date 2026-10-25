# Inventaire des thèmes — mission #190 (25 octobre 2026)

Branche de travail `ccr-4c6316f6-6dusrt` : elle réunit, sans réécrire leur histoire, les deux lignes de travail non
fusionnées où se trouvent les thèmes refaits d'après maquette :

- `claude/theme-phase` (TABLE SAISON est déjà sur la branche de travail ; ATELIER NUANCE PR #178, PARENTHÈSE PR #181,
  SILLON V2 PR #184, FRAISE PR #186, PHASE) ;
- `claude/themes-differenciation` (PR #167 : NOCTIL, TRAVERSE, HEUREN, Atelier Rive, MUSEAU CLUB, ONDE PR #183,
  SOUPLE PR #180, MAISON & HORIZON issue #172, APLAT PR #187, site client du Coven des Charmes PR #189), au commit
  `67e7b8cf`. Une autre conversation travaillait encore sur cette branche le 25 octobre : ses commits postérieurs seront
  à reprendre par une nouvelle fusion avant toute mise en ligne.

## Méthode

Pour chaque thème : recherche de ses maquettes dans le dépôt (`docs/theme-briefs/`, `docs/briefs/`, `docs/design/`),
dans les branches documentaires (`brief/*`, `assets/*-reference-*`) et dans l'historique des commits (« d'après les
maquettes »). Un thème est dit **sur maquette** quand sa version actuelle a été refaite d'après des planches remises par
Thomas, conservées dans le dépôt ou dans une branche documentaire.

## Thèmes proposés aux clients (version sur maquette conservée)

| Thème (identifiant) | Maquette de référence | Livraison | Médias | Démonstration |
|---|---|---|---|---|
| FRAISE GUMMIES (`fraise`) | 7 planches corrigées du 24 octobre, `docs/theme-briefs/fraise-gummies/` | PR #186 (sections `fg-*`) | kit privé `public/demo/fraise/v2/` (hors dépôt) | `tests/fraise-fixtures.ts` |
| ONDE (`onde`) | 7 planches du 24 octobre, `docs/theme-briefs/onde/` | PR #167 (sections `on-*`) | kit privé `public/demo/onde/` (hors dépôt, **absent de ce serveur**) | `tests/onde-fixtures.ts` |
| SILLON (`sillon`) | V2 : 3 planches ordinateur + 4 téléphone, `docs/theme-briefs/sillon-v2/` | PR #184 (sections `sv-*`) | `public/theme-assets/sillon/` | `tests/sillon-fixtures.ts` |
| NOCTIL (`noctil`) | 7 maquettes du 23 octobre, `docs/design/noctil-reference-20261023/` | PR #167 | `public/theme-assets/noctil/` | `tests/noctil-fixtures.ts` |
| TRAVERSE (`traverse`) | 4 maquettes du 23 octobre, `docs/design/traverse-reference-20261023/` | PR #167 | `public/theme-assets/traverse/` | `tests/traverse-fixtures.ts` |
| HEUREN (`heuren`) | références ordinateur et téléphone du 22 octobre, `docs/design/heuren-reference-20261022/` | PR #167 | `public/theme-assets/heuren/` | `tests/heuren-alcove-fixtures.ts` |
| Atelier Rive (`rive`) | 3 maquettes du 23 octobre, `docs/design/atelier-rive-reference-20261023/` | PR #167 | `public/theme-assets/rive/` | `tests/rive-fixtures.ts` |
| MUSEAU CLUB (`museau-club`) | 8 maquettes enrichies du 23 octobre, `docs/design/museau-club-reference-20261023/` | PR #167 | `public/theme-assets/museau-club/` | `tests/museau-fixtures.ts` |
| SOUPLE (`souple`) | 6 maquettes du 23 octobre, `docs/theme-briefs/souple/` | PR #167 | `public/theme-assets/souple/` | `tests/souple-fixtures.ts` |
| TABLE SAISON (`table-saison`) | 5 planches, branche `brief/table-saison-20261023` (`docs/briefs/table-saison/`) | issue #175 (sections `ts-*`) | `public/theme-assets/table-saison/` | `tests/table-saison-fixtures.ts` |
| ATELIER NUANCE (`atelier-nuance`) | 6 planches, branche `brief/atelier-nuance-20261023` (`docs/briefs/atelier-nuance/`) | PR #178 (sections `an-*`) | `public/theme-assets/atelier-nuance/` | `tests/atelier-nuance-fixtures.ts` |
| PARENTHÈSE (`parenthese`) | 6 planches, `docs/theme-briefs/parenthese/` | PR #181 (sections `pa-*`) | `public/theme-assets/parenthese/` | `tests/parenthese-fixtures.ts` |
| PHASE — Électricité (`phase`) | 10 planches, `docs/theme-briefs/phase/` | branche `claude/theme-phase` (sections `ph-*`) | kit privé `public/demo/phase/images/` (hors dépôt) | `tests/phase-fixtures.ts` |
| MAISON & HORIZON (`maison-horizon`) | 7 maquettes du 23 octobre, `docs/briefs/maison-horizon/` | PR #167 (sections `re-*`) | kit privé `public/demo/maison-horizon/` (hors dépôt, **absent de ce serveur**) | `tests/maison-horizon-fixtures.ts` |
| APLAT (`aplat`) | 10 planches du 25 octobre, `docs/theme-briefs/aplat/` | PR #167 (sections `ap-*`) | kit privé `public/demo/aplat/` (hors dépôt, **absent de ce serveur**) | `tests/aplat-fixtures.ts` |

## Retirés du catalogue proposé (créés avant la méthode sur maquettes) — doute signalé

| Thème | Origine trouvée | Ce qui est fait | Doute |
|---|---|---|---|
| ORBE (`orbe`) | lot 2B (direction artistique écrite, 18 octobre), rédaction reprise le 21 octobre ; **aucune maquette trouvée** | n'est plus proposé ni recommandé ; code, médias et démonstration conservés ; un projet qui l'utilise le garde | si Thomas a remis des maquettes hors GitHub, le remettre au catalogue (une ligne, `MAQUETTE_THEMES`) |
| ALCÔVE (`alcove`) | issue #155 (brief écrit et kit de médias) ; **aucune maquette trouvée** (les références du 22 octobre concernent HEUREN) | idem | idem |

Rien n'est supprimé définitivement : les fichiers, médias et démonstrations restent dans le dépôt, et les projets
existants qui utilisent ces thèmes les conservent (même règle que les 30 thèmes de l'ancien catalogue).

## Anciennes versions d'un même nom (la version sur maquette est conservée)

| Nom | Ancienne version | Version conservée |
|---|---|---|
| FRAISE | composition Lumora du lot 2C (`conversionProject(…, "fraise")`, anciens contrôles) | sept planches (`fg-*`) |
| ONDE | référence Pawish du lot 2C, puis refonte E-commerce « studio » (issue #158) | sept planches (`on-*`) |
| SILLON | V1 de l'issue #148 (profil « nomade ») | V2 des planches (`sv-*`) |
| NOCTIL, TRAVERSE, HEUREN, Atelier Rive, MUSEAU CLUB, SOUPLE | premières versions des issues #152, #155, #158 et du lot 2B | versions refaites d'après les maquettes (PR #167) |

Les anciennes compositions restent constructibles dans les tests (anciens contrôles) ; elles ne sont proposées à aucun
client.

## Hors catalogue

- **Le Coven des Charmes** (PR #189) : site d'un projet client, jamais proposé aux autres clients.
- **Les 30 thèmes de l'ancien catalogue** (retirés le 19 octobre) : lisibles pour les projets qui les utilisent.
