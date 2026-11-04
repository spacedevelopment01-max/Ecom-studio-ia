# #301 « SYNA complète » — point de reprise (Claude)

Consignes : #301 commentaires 6618265320 et 6618279690. **SYNA n'est pas complète** ; aucune fusion `main`, mise en
ligne, activation, action externe réelle ni dépense fournisseur.

## Branche et base

- Branche Claude : `claude/syna-301-complet`, partie de #363 `f25a7290` (base commune imposée).
- Intègre #364 de Codex (`958a4dde`, confirmations liées à la proposition et au projet courants) par fusion ; aucune
  branche de Codex modifiée.

## Lot 1 — confirmation périmée (fait, à garder vert)

| Élément | Où | Preuve |
|---|---|---|
| Transports des 5 cartes (Fichiers, Contenus, Demandes, Horaires, Publicité) | #364 Codex | `tests/parity301-confirmation-scope.test.ts` (35) |
| Contrôle indépendant des 5 cartes | `tests/syna301-confirmation-perimee-cartes.test.ts` (18) | vert sur #364 |
| **Défaut d'interface trouvé au navigateur** : après rechargement, la nouvelle carte restait « incertaine » (Confirmer grisé, « Réessayer la même confirmation » aurait enregistré la nouvelle proposition) | `src/components/studio/use-stale-confirmation.ts` branché sur les 6 cartes ; relecture côté Site (`local-site-confirmation-client.ts`) | `tests/syna301-confirmation-perimee-interface.test.ts` ; recette navigateur `scripts/syna301-confirmation-perimee-recette.ts` **4/4** (Encre / Plein, 1440 / 390) : ancien accord écarté, une seule écriture, nom relu, autre projet sans héritage, 0 appel IA |

Limite : la recette navigateur couvre Fichiers ; les quatre autres cartes partagent le même crochet d'interface et
sont couvertes par les tests de protocole, pas encore par un parcours navigateur dédié.

## Lot 2 — contraste après couleur de section (fait côté thème)

- Cause : `section_colors` ne change que fond et texte ; surface, texte secondaire, accent et texte de bouton restaient
  ceux de l'ancien fond.
- Correctif : `theme-base/layout/theme.liquid` (schémas `es-*` seulement, recalcul uniquement si contraste < 4,5:1),
  `theme-base/assets/theme.css` (cartes « verre », textes atténués des prestations / infos pratiques).
- Mesure navigateur `scripts/syna301-contraste-section.ts` (chaque texte visible, fond composé réel) : **199 → 6**
  textes sous 4,5:1 (atelier, clinique, terroir produits + atelier services ; fonds bleu, vert sombre, crème).
  Restants : bouton d'origine du thème sur crème à 4,46 (préexistant, hors recoloration) ; carte Google sur bleu
  (dégradé décoratif, mesure au pire cas). Texte sur photo voilée non mesurable (exclu, signalé).
- Test : `tests/syna301-contraste-section.test.ts` ; Theme Check rapide : valide.

## Lot 2 — reste à faire (Codex : routage ; Claude : interface et recette)

1. SEO : la phrase « titre SEO de la page d'accueil » est aiguillée vers la grammaire du site (clarification inadaptée).
2. Horaires : phrase naturelle (« Change les horaires du mardi : 9 h – 18 h ») non comprise ; distinguer profil
   d'activité et créneaux de réservation.
3. Dès qu'un contrat Codex arrive : fusion dans cette branche, carte, recette Encre / Plein × 1440 / 390.

## Lot 3+ — phrases naturelles absentes (voir `docs/syna-301-integration/TABLEAU-16-PHRASES.md`)

Masquer / supprimer une section, page, bouton, image, choix du thème, prestations / réservation, stock / variantes,
calendrier / brouillons, pièces jointes / bibliothèque ; puis domaines restants de la matrice
(`docs/syna-301-integration/MATRICE-CONVERGENCE-84.md`), parcours multi-étapes, anciens / nouveaux projets.

## Relancer les preuves

```bash
npx tsc --noEmit && npx vitest run
npx tsx scripts/syna301-confirmation-perimee-recette.ts <sortie>      # navigateur, ~6 min
DIRECTION=atelier BUSINESS=services npx tsx scripts/syna301-contraste-section.ts <sortie.json>
scripts/verify-theme.sh --rapide
```
