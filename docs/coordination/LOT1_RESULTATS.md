# Lot 1 — Résultats de la reprise (issue #163)

Conversation **Claude 2**, 23 octobre 2026. Branche `ccr-064d1d72-49fbs4` (branche attribuée à cette conversation,
partie de `main` `0a6aa1dd`), dossier de travail séparé dans un conteneur isolé : aucune base, aucun port, aucun cache
partagé avec Claude 1 (#167) ni Codex (#171). Aucun appel IA payant, achat, message client, publication sociale,
modification Stripe, suppression de données réelles ni déploiement. Studio habituel de Thomas non touché.

Documents livrés : `LOT1_PERIMETRE_V1.md` (01), ce rapport (02, 04, livraison), `LOT1_MIGRATION_RESTAURATION.md` (03).

## 1. Matrice des actions 01–04

| Action | Demandé | Réalisé | Testé | Bloqué / non fait | Preuve |
|---|---|---|---|---|---|
| 01 | Liste de référence V1 | Matrice fonction → règle → état → responsable → code/SHA → preuve → limite ; décisions de Thomas séparées des règles historiques ; V2 (hébergement/domaines) ; cible 15 thèmes ; accueil en fin de V1 | relu contre le code de `0a6aa1dd` et les têtes de PR | validation par Thomas | `LOT1_PERIMETRE_V1.md` |
| 02 | Intégration existante, sort de #127, combinaisons | Graphe vérifié (§ 2) ; aucune perte silencieuse ; #127 vérifié fonction par fonction ; combinaison #170 → #168 → #166 préparée sans conflit, testée ; #167 essayée à blanc | voir § 2 | fusions #166/#168/#170 en attente de Thomas ; #167 non reçue ; #171 non publiée | § 2, `reports/lot1/` |
| 03 | Sauvegarde, migration, restauration | Inventaire ; scripts réutilisables avec garde-fous ; 3 époques synthétiques × 2 codes ; restauration effective dans une autre copie ; retour du code ≠ retour des données | 6 essais (45 ou 46 contrôles chacun) + 5 tests automatiques | **données réelles de Thomas non testées** (aucun accès) | `LOT1_MIGRATION_RESTAURATION.md`, `reports/lot1/essais/` |
| 04 | Offres et documentation alignées | README aligné ; grille vérifiée dans le code par un test ; écarts de l'accueil, des CGV et de l'aide recensés sans modifier ces pages réservées ou contractuelles ; décisions ouvertes isolées | `tests/lot1-grille-offres.test.ts` | écrans d'offres du studio : fichiers en cours de modification par #170 (Codex), non retouchés pour ne pas créer de conflit | § 4 |

## 2. Graphe des branches, sort de #127, combinaisons

### Graphe (vérifié par `git merge-base --is-ancestor`, historique complet)

| PR | Tête | Dans `main` `0a6aa1dd` | Remarque |
|---|---|---|---|
| #146, #147, #149, #151, #153, #156, #159, #161 | `656e9a4f`, `e9b20a99`, `f0084332`, `d8114155`, `5eb672f9`, `8d011155`, `e9a3e0ba`, `38da2575` | oui, ancêtres | |
| #157 | `b73995aa` | **pas ancêtre** (10 commits) | contenu repris par des copies réécrites dans #159 : 65 lignes ajoutées sur 66 du dernier commit de finitions présentes dans `main` ; la seule absente (légende « Le coin lecture ») a été remplacée par la rédaction demandée par Thomas le 21/10 à 21 h 45 (`2dd28312`). Aucune perte. |
| #162 | `8266c171` | fusionnée (`0a6aa1dd`) | ne pas refaire |
| #127 | `7b65492d` | non (3 commits, 212 de retard) | ne pas fusionner : voir ci-dessous |
| #166 | `27777896` | non | base `8266c171` (contenu identique à `main`) |
| #168 | `dbfc05ad` | non | base `0a6aa1dd` |
| #170 | `46738852` | non | base `0a6aa1dd` |
| #167 | `f8b7025a` | non (brouillon, 37 commits) | base `0a6aa1dd` |
| #171 | — | pas de branche publiée au relevé | |

**Perte silencieuse :** pour #159, #161 et #156, chaque ligne ajoutée (`src`, `worker`, `theme-base`, `tests`) a été
cherchée dans `main`. Lignes absentes et présentes dans la tête de la PR : 9 (#159), 100 (#161, dont 68 dans
`reference-shapes.json`, régénéré par décision), 4 (#156). Toutes correspondent aux décisions documentées de
l'intégration (`INTEGRATION-GLOBALE-2026-10-22.md`) : catalogue 7 → 11 thèmes et libellés « accessibles selon votre
forfait », familles (ONDE en E-commerce), première section d'accueil = ouverture, limite par jour au déplacement,
formes de référence régénérées. Les 4 lignes de #156 existent dans `main` sous une forme enrichie (même appel,
paramètres ajoutés). Aucune suppression de moteur IA, budget, média, stratégie, quota ou calendrier n'a été trouvée.

### Sort de #127 (contrôlé dans le code de `main`)

| Fonction de #127 | Sort | Preuve dans `main` |
|---|---|---|
| Dates écrites FR/EN | **intégrée** à l'identique | `src/lib/social-v2/edit-dates.ts` identique au fichier de #127 |
| Phrase : « tout », périodes, jours, heures, réseau, format | **portée** | `local-edit.ts` (`EDIT_EXAMPLES`, `strategyVisibilitySql`) |
| Aperçu avant d'agir, confirmation de suppression | **portée** | `data-edit-confirm`, `data-edit-answer` (`social-studio.tsx`) |
| « Annule ma dernière modification » | **portée** et rendue prudente | `snapshotForUndo`, `undoLastEdit`, table `social_edit_undo` |
| Coût IA en % (aucun montant renvoyé) | **portée** | `approvedPct` (route `social/v2`) |
| Déplacements soumis à l'horizon et au nombre par jour | **portée** | `moveRefusal` (`engine.ts`) |
| Suivi « Visuel 3 sur 12 », arrêt sur annulation/pause | **portée** | `worker/handlers.ts` (progress), `production.ts` (`JobCancelled`, `replaceFrom`) |
| Visuels IA depuis « Planifier » | **remplacée** par `BatchVisuals` existant + lien `data-plan-visuals-next` | `social-studio.tsx` |
| Mode « Visuels gratuits » (banque, photos libres, vidéos montées sans IA) | **écartée** : contraire à la règle des images finales 100 % IA | `plan-visuals.ts`, `freeImagePool`, `attachFreeVisuals`, `quoteVisuals`, `visualNote`, `realVideoDeps(…, false)` : absents ; `tests/planifier-visuels.test.ts` absent |
| Captures du mode gratuit | **écartées** | non reprises |

Tests de `main` qui portent ces fonctions : `calendrier-une-phrase`, `calendrier-phrases-variees` (horloge fixée),
`social-v2-engine`, `social-autopilot-limites` (voir § 2, recette). **Proposition :** fermer #127 comme « reprise dans
#162 » (décision de Thomas ; cette conversation ne ferme pas de PR).

### Recette sur têtes figées (sans fournisseur payant)

[RÉSULTATS À COMPLÉTER EN FIN D'EXÉCUTION]

### Combinaison candidate et ordre proposé

Copie isolée `claude/lot1-integration-candidate` partie de `0a6aa1dd` : fusion réelle (commits de fusion, aucun
cherry-pick, aucune résolution globale) de #170 (`46738852`) → #168 (`dbfc05ad`) → #166 (`27777896`), tête
**`fddf1383`**. Aucun conflit de texte. Chevauchements réels :

| Fichier | PR | Résolution constatée |
|---|---|---|
| `src/components/studio/ad-campaigns.tsx` | #168, #170 | morceaux disjoints fusionnés automatiquement : garde `plan === 'dominer'` de #170 **et** « aucune campagne automatique depuis d'anciennes directions » de #168 présents (vérifié) |
| `vitest.config.ts`, `tests/database-global-setup.ts`, `tests/database-file-setup.ts` | #166, #168, #170 | contenus **identiques** dans les trois PR |
| `tests/mission154-adaptation.test.ts`, `tests/mission160-editorial-delivery.test.ts` | #167, #168 | essai de fusion à blanc de #167 sur la candidate : sans conflit ; #167 n'est pas intégrée |

Ordre proposé à Thomas (chaque fusion seulement après son accord) :
1. **#170** (paiements, droits, assistance) — base de la mission sécurité #171 qui en part.
2. **#168** (angles sourcés) — après #170 pour garder les deux protections de `ad-campaigns.tsx`.
3. **#166** (voix, Kling) — indépendante ; ses fichiers de tests sont déjà identiques.
4. **#171** quand Codex l'aura livrée, rebasée sur la tête obtenue (elle part de #170).
5. **#167** quand Claude 1 l'aura déclarée prête et Thomas validée.
6. Ce lot 1 peut être fusionné avant ou après : il ne touche aucun fichier de ces PR (README, `scripts/lot1`, tests et
   documents propres).

À rejouer sur la tête intégrée finale : `npx tsc --noEmit`, `npx vitest run`, `scripts/verify-theme.sh`,
`npm run build`, `scripts/lot1/essais-historiques.sh` avec le code final, la recette ciblée du § 2 (y compris les
7 jours de la semaine), et l'essai à blanc de #167/#171.

## 3. Migration et restauration (résumé)

Détail, commandes et empreintes : `LOT1_MIGRATION_RESTAURATION.md`. **Données synthétiques uniquement** ; la
sauvegarde et la restauration des données de Thomas ne sont **pas** vérifiées. Six essais réussis (3 époques ×
2 codes), chacun : sauvegarde en ligne, restauration, migration ×2 (idempotente, chaque ligne d'origine retrouvée),
rattachement comptes/projets, angles relus, crédits tracés, restauration dans une autre copie, refus de
remplacement, copie de recette neutralisée, source intacte. Retour du code ≠ retour des données (essayé).

## 4. Grille cohérente et décisions ouvertes

### Grille appliquée (source : `src/lib/plans.ts`, vérifiée par `tests/lot1-grille-offres.test.ts`)

Prix TTC 49 / 89 / 129 € par mois (annuel = 10 mois, règle historique) ; 1 projet par abonnement, plusieurs
abonnements par compte ; thèmes 1 / 3 / tous par famille ; sections 8 / 12 / 20 de la bibliothèque de la famille ;
angles 1 / 2 / 5 ; publications 1 / 3 / 5 par jour ; horizon 7 / 30 / 90 jours ; blog 0 / 5 / 10 par mois ; vidéo IA
aux deux supérieurs ; publicité et sections entièrement IA au troisième ; pages, duplication et modèles aux deux
supérieurs ; appel initial unique 60 € / 30 € / inclus ; recharge 10 € par projet ; anciens packs plus vendus
(`PACKS_FOR_SALE = []`, soldes conservés). Interne, jamais montré aux clients : TVA 20 % (`htEur = TTC / 1,2`), budget
IA = 40 % du HT de l'abonnement, 50 % du HT d'une recharge. Aucun pourcentage interne trouvé dans les écrans clients.

### Écarts recensés, non corrigés ici (page réservée, contrat ou fichier d'une autre conversation)

| Où | Écart | Pourquoi non corrigé | Propriétaire |
|---|---|---|---|
| CGV (`src/app/conditions/page.tsx`, § 3) | affiche « chaque mois **0 visuels IA et 0 vidéos IA** », une liste de packs **vide** (« Packs, à ajouter à un forfait :  TTC… »), une phrase de report « sauf avec les forfaits , où… » sans forfait ; ne cite ni la recharge de 10 €, ni l'appel initial, ni les droits de la grille | contrat : aucune modification sans Thomas (et relecture juridique) | Thomas |
| Accueil (`src/app/page.tsx`) | « Onze thèmes… **inclus dans tout forfait** » (faux : 1 / 3 / tous) | page réservée à la refonte de fin de V1 | refonte accueil |
| Accueil, tableau des forfaits (`src/components/pricing.tsx`, affiché sur l'accueil) | Dominer : « Avancées **+ UGC** » (aucune capacité UGC vérifiée) ; « Connexions sociales : oui » sans dire que la publication réelle n'est pas essayée ; aucune ligne « angles 1 / 2 / 5 » | idem | refonte accueil |
| Accueil, FAQ | « Une hausse est facturée au prorata » et « satisfait ou remboursé 14 jours » : règles historiques non confirmées | idem + décision | Thomas |
| Aide, tutoriel « Images » (`src/lib/tutorials/images.ts`) | « Votre produit est toujours composé à partir de ses vraies photos ; les textes sont ajoutés par-dessus » : contraire à la règle des images finales 100 % IA | domaine 3 (tutoriels et leurs vidéos narrées) | domaine 3 |
| Bibliothèque de prompts (`src/lib/prompts-library.ts`) et consigne IA (`src/lib/ai/prompts.ts`) | recommandent « Flux », « Joaillerie », « Gourmand », « Galerie », « Terroir »… (anciennes directions non proposées) | contenu lié aux thèmes | Claude 1 / Thomas |
| Écran « Gérer mon abonnement » | « Une hausse est facturée tout de suite au prorata ; une baisse s'ajuste au prorata » | fichier modifié par #170 ; décision ouverte | Codex / Thomas |
| Écran « Rendez-vous » | annulation/report jusqu'à 24 h, remboursement de l'appel payé | idem | Codex / Thomas |

Proposition de texte pour le § 3 des CGV (à valider par Thomas et à faire relire, **non appliquée**) : « Forfaits
Créer 49 €, Développer 89 €, Dominer 129 € TTC par mois, ou 490 €, 890 €, 1 290 € TTC par an. Chaque abonnement couvre
un seul projet. Les droits de chaque forfait sont ceux de la page des tarifs. Les créations par l'IA sont soumises au
budget IA du projet, renouvelé chaque mois ; une recharge de 10 € TTC peut lui être ajoutée et n'expire pas.
[À compléter : sort des recharges et des anciens packs en fin d'abonnement.] Un appel de départ d'une heure, unique :
60 € (Créer), 30 € (Développer), inclus (Dominer). »

### Décisions ouvertes (à Thomas, rien n'est tranché ici)

1. Anciens comptes « plusieurs boutiques » d'avant V2 : un seul projet garde le forfait après migration ; que faire
   pour les autres (abonnements supplémentaires, geste) ?
2. Anciens crédits hors forfait non justifiés par un paiement, ramenés à 0 (tracés) : compenser ou non ?
3. Prorata et date d'effet des changements de forfait (repris de #170).
4. Résiliation : remboursement, accès aux exports après la fin (repris de #170).
5. Recharges et anciens packs inutilisés : durée, remboursement (repris de #170).
6. Appel initial : droit par **compte** (code actuel) ou par **projet** ? Délais d'annulation et de report (repris de #170).
7. Satisfait ou remboursé 14 jours : conditions précises (premier abonnement, recharges consommées).
8. Règles historiques non citées dans #150 (langues 1/2/5, niveaux SEO/automatisations/support, UGC au 3e forfait,
   2 thèmes sur mesure par mois) : les garder, les retirer ou les afficher ?
9. Responsable du support, délais, gestes commerciaux (repris de #170).
10. Texte des CGV (§ 3) et relecture juridique.

## 5. Conflits, dépendances et propriétaires

| Travail | Propriétaire | Fichiers / zone | Chevauchement avec ce lot | Dépendance |
|---|---|---|---|---|
| #167 thèmes | Claude 1 | `theme-base/`, `src/lib/theme/`, `public/theme-assets/`, démos, galerie | aucun fichier commun | aucune |
| #171 sécurité | Codex | comptes, sessions, entrées, données personnelles (part de #170) | aucun fichier commun ; la procédure de sauvegarde lui est utile pour l'inventaire des données (§ 35) | #170 |
| #170 lot 8 | Codex | paiements, droits, assistance, écrans d'abonnement | aucun ; écarts d'écrans signalés plutôt que corrigés | — |
| #168 angles | Codex | stratégie, préparation, `ad-campaigns.tsx` | aucun | conflit doux avec #170, résolu automatiquement |
| #166 voix | Codex | `video-v2/`, voix | aucun | — |
| Ce lot | Claude 2 | `README.md`, `scripts/lot1/`, `tests/lot1-*`, `tests/fixtures/lot1/`, `docs/coordination/LOT1_*`, `reports/lot1/essais/` | — | aucune |

## 6. Captures et non-régression

Aucun écran du studio n'est modifié par ce lot (README, scripts, tests et documents seulement) : pas de capture
avant/après d'écran modifié. Captures de constat des écrans concernés par les écarts du § 4 :
[À COMPLÉTER EN FIN D'EXÉCUTION]

## 7. Résumé simple

[À COMPLÉTER EN FIN D'EXÉCUTION]
