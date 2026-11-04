# #301 « SYNA complète » — point de reprise (Claude)

Consignes : #301 commentaires 6618265320 et 6618279690. **SYNA n'est pas complète** ; aucune fusion `main`, mise en
ligne, activation, action externe réelle ni dépense fournisseur.

## Branche et base

- Branche Claude : `claude/syna-301-complet` (PR brouillon #369), partie de #363 `f25a7290`.
- Intègre par fusion, sans les modifier : #364 (`958a4dde`) puis la chaîne #365 → #366 → #367 → #368 → #370 de Codex
  (`e1ba2542`).

## Fait et vérifié

| Lot | Contenu | Preuve |
|---|---|---|
| 1 — confirmation périmée | transports des 5 cartes (#364 Codex) ; crochet d'interface `use-stale-confirmation.ts` sur les 8 cartes : relecture seule **uniquement** si l'accord en mémoire vise une autre proposition (une réponse perdue pour la proposition affichée garde « Vérifier » / « Réessayer », exigés par le contrôle obligatoire) | 18 tests indépendants + test d'interface ; recettes navigateur Fichiers 4/4, Contenus 4/4 (plats, biens, réalisations) et Demandes reçues 4/4 ; contrôle obligatoire vert en CI sur `04d881ee` |
| 2 — contraste | moteur #365 (Codex) + règles CSS des cartes « verre » et textes atténués (Claude) ; ma surcouche `theme.liquid` retirée (mesure identique, respect des couleurs demandées) | mesure navigateur 199 → 6 sous 4,5:1 ; Theme Check rapide valide |
| 2 — SEO | carte « Retouche SEO gratuite » (contrat #367) | recette `scripts/syna301-seo-pages-recette.ts` 4/4 : titre relu dans l'onglet de la page, annulation sans écriture |
| 3 — Pages | carte « Pages du site » (contrat #370) : modèles natifs avec aperçu, « Choisir » remplit la phrase du client | même recette 4/4 : page relue dans la version enregistrée |
| 2 — Horaires naturels | carte Horaires existante sur le contrat #366 : « Change les horaires du mardi… » → clarification profil / créneaux sans devis ; « Les horaires du profil sont : … » → avant / après, accord, reçu | recette `scripts/syna301-horaires-recette.ts` 4/4 : champ Horaires de l'écran Activité relu sans recharger, puis après rechargement |
| 3 — Masquer une section | carte du site (#368) ; après le reçu, message « Section masquée : elle n'est plus désignée » au lieu de l'alerte « cible changée » | même recette 4/4 : seule la section visée change |

| 3 — Pages et sections | créer avec modèle, renommer, refus honnête du menu pour un brouillon (sans liste de modèles hors sujet), retirer une page publiée du menu, dupliquer, supprimer une page ; supprimer une section | recette `scripts/syna301-pages-sections-recette.ts` 4/4 : titre et menu relus dans la version, page supprimée absente, seule la section visée supprimée, carte sans alerte trompeuse |

| 3 — Texte de bouton | bouton désigné dans l'aperçu (ordinateur) ou par repère repris (téléphone) ; libellé « Élément désigné : Bouton · … » au lieu de « Page désignée : undefined » | recette `scripts/syna301-bouton-recette.ts` 4/4 : libellé relu en base et dans le bouton rendu, lien et autres sections inchangés |

## Reste à vérifier ou à faire (ordre proposé)

1. Manque signalé à Codex : aucune phrase ne publie une page brouillon (le menu la refuse donc, à raison) ; champ
   explicite « choix du modèle » souhaité dans la présentation Pages (la carte s'appuie aujourd'hui sur le message).
2. Lot 3 restant (phrases naturelles) : choix du thème, prestations / réservation, stock / variantes, calendrier /
   brouillons, pièces jointes / bibliothèque, boutons / images.
3. Omissions de la matrice (`OMISSIONS-MATRICE.md`) à faire entrer dans la matrice commune de Codex (85 lignes).

## Relancer les preuves

```bash
NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit && npx vitest run
npx tsx scripts/syna301-seo-pages-recette.ts <sortie>             # navigateur, ~10 min
npx tsx scripts/syna301-confirmation-perimee-recette.ts <sortie>
DIRECTION=atelier BUSINESS=services npx tsx scripts/syna301-contraste-section.ts <sortie.json>
scripts/verify-theme.sh --rapide
# contrôle obligatoire : build à la tête puis scripts/verify-syna284-b1-confirmation-ui.ts (3 variantes) et
# STUDIO_PROOF_COMMIT=$(git rev-parse HEAD) scripts/verify-parity301-wave4-ui.ts (arbre propre)
```
