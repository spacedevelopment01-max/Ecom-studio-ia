# #301 v3 — intégration de l'interface et recette indépendante (tête `ee0847d4`)

**SYNA n'est pas complète.** 47 opérations sur 84 sont vérifiées dans un sous-parcours avec fournisseurs simulés
(PARTIEL), 22 restent absentes, 10 bloquées (connexion ou consentement réels), 5 non testées. Aucun fournisseur réel
testé, aucune publication, aucun déploiement, aucune fusion vers `main`, 0 €.

## Assemblage

Branche `claude/syna-301-integration-356`, ascendances conservées (fusions, aucun cherry-pick, aucune branche de Codex
modifiée) : #356 (`759a2e34`, CI verte) → #361 de Codex (`be59ddef` : #359 phrases gratuites, #360 publicité V2, #362
peinture des couleurs) + #352 anciens projets, #354 demandes reçues, #357 publicité (Claude) + correctifs ci-dessous.

Conflits résolus en gardant les deux côtés : verrou global du panneau (carte Services de Codex + carte Demandes de
Claude, garde-fou AST de Codex étendu à la sixième carte), carte publicité (calques secondaires de Codex + libellés
clients de Claude), règle anciens projets (`localEditAllowed`) + annulation sans redésignation (`needsSelection`).
Correctif de peinture des couleurs trouvé indépendamment par les deux équipes : version de Codex retenue.

## Défauts corrigés (Claude)

| Défaut | Correction | Preuve |
|---|---|---|
| Activité (projet de services) : page de 404 px sur un écran de 390 px, Encre et Plein cadre | message de la barre collante avec une base minimale (passe à la ligne) | 96 mesures (8 écrans × services / produits × 2 modes × 390 / 360 / 1440 px) : 0 débordement |
| Couleur d'une section annoncée mais invisible (texte devenu blanc sur fond clair) | règle de peinture étendue aux schémas `color-es-…` (même correctif que Codex #362) | recette : fond réellement bleu / texte blanc dans l'aperçu, deux modes |
| Carte gratuite : couleurs avant / après en objet JSON | « Fond : #F4F5F2 → #1D4ED8 » avec pastilles, seules les couleurs qui changent | test + captures de recette |
| Carte d'annulation / FAQ : JSON brut de la section (`block_order`…) | résumé « Section « Questions fréquentes » : 4 éléments » + questions, détail replié | test + recette |
| Carte publicité : calques secondaires nommés « y », « font.size » | libellés clients sur les effets de Codex (« Position verticale (px) »…) | tests 3/3, recette 4/4 |
| Garde-fou du verrou global ignorant la carte Demandes | carte ajoutée à la vérification AST de Codex | `tests/syna301-ui-union.test.ts` |

## Recette finale indépendante (Studio réel, conversation SYNA, tête `ee0847d4`)

Toutes : Encre et Plein cadre, 1440 et 390 px, 0 appel IA, 0 requête externe, 0 erreur JavaScript.

| Recette | Résultat | Couvre |
|---|---|---|
| Site gratuit (`syna301-site-gratuit-recette.ts`) | **4/4** | désignation native, couleur de section (proposition, annulation sans écriture, rechargement, 17 s, confirmation unique, couleur réellement peinte, reçu), couleur globale → clarification sans devis, FAQ (réponse réseau perdue → une seule écriture), annulation native, conflit avec modification manuelle → refus |
| Publicité brute (`syna301-pub-recette.ts`) | **4/4** | créations BRUTES du moteur : titre agrandi, calques secondaires annoncés avant accord, seuls eux bougent (position verticale), aucun nouveau chevauchement, aperçus, 17 s, PNG, rechargement, prompts en lecture seule, exécution refusée |
| Anciens projets | **4/4** | lecture seule, renommage gratuit, aucune Préparation créée |
| Demandes reçues | **4/4** | liste, piège affiché comme donnée, refus en masse, lue / traitée, réponse perdue, source native relue |
| Historique #292 | **6/6** | bascules Encre ↔ Plein pendant diff, erreur réseau, conflit ; projets historiques en lecture seule |

Suite complète : **5 400 tests verts**, types propres (un test exige `/usr/bin/chromium`, présent en CI : vérifié vert
une fois le navigateur local relié à ce chemin).

## Phrases naturelles et publicités

- 16 phrases d'origine : `TABLEAU-16-PHRASES.md` — 5 aboutissent (titre, couleur de section, couleur globale →
  clarification, FAQ, annulation), 1 clarification inadaptée (SEO), 10 restent sans action (devis seulement).
  Aucune opération gratuite disponible n'affiche de devis (vérifié dans le navigateur).
- 18 créations V2 brutes : 18/18 propositions gratuites ; titre + sous-titre (8) ou sous-titre et bouton (10), tous
  annoncés ; aucun nouveau chevauchement des boîtes (`preuves/sonde-publicite-integration.json`).

## Limites restantes (visibles, non promues)

- Couleur de section : les accents (surtitre, mots en accent, certains boutons) gardent leur couleur et deviennent
  peu lisibles sur un fond très différent (relevé sur fond bleu) — à traiter par Codex.
- Chevauchement publicitaire mesuré sur les boîtes des calques, pas sur les glyphes rendus ; une seule opération (titre).
- Couleur au téléphone vérifiée en base (schéma de la section), pas mesurée dans l'aperçu.
- Horaires : seule la formulation exacte du contrat #355 fonctionne ; preuve navigateur de Codex, non rejouée ici.
- Absents par phrase : masquer / supprimer une section, page, bouton, image, thème, SEO, réservation, prestations,
  calendrier, stock, pièces jointes.

## Matrice

`MATRICE-CONVERGENCE-84.md` / `.csv` : une ligne par opération avec natif, statut SYNA de Codex, accès par phrase,
Encre / Plein simulés, fournisseur réel (toujours non testé), statut commun, recettes avec leur tête, note et
périmètre. En cas de désaccord Claude / Codex, le statut le plus prudent est retenu et la divergence écrite (16 lignes).
