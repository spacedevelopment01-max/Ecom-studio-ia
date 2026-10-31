# Contenus métier (#239) — Phase 1 : immobilier, fiabiliser l'existant

**Base** : phase 0, PR #240 (`469ef056`), elle-même basée sur #237 (`8a26e287`, CI verte). **Branche** : `claude/239-p1-biens`.
**Principe** : le module des biens n'est pas réécrit (`biens.ts`, onglet Biens, `withBiens`). On le fiabilise avec l'hébergement natif.

## 1. Ce qui change

| Problème (audit de la phase 0) | Correction | Où |
|---|---|---|
| B1 — plus de ~75 biens dépassaient la limite de 80 pages par publication | Les fiches de biens sont comptées à part, 600 au plus. Les autres pages gardent leur limite de 80 | `sites/publish.ts` (`DETAIL_LIMIT`, `isDetail`) |
| B2 — rien n'indiquait que le site en ligne n'avait pas les derniers changements | « Modifications non publiées » : empreinte de ce qui serait publié (thème et biens) comparée à celle de la version en ligne, avec le nombre de biens modifiés depuis. Affiché dans « Publier votre site » et en bandeau dans l'onglet Biens | `siteFreshness`, `siteHash`, API `site-publication`, `site-publication.tsx`, `tab-biens.tsx` |
| Constaté en recette | Une **vente** sans DPE ni GES affichait publiquement « DPE / GES à renseigner » sans être bloquée. Une **location** était refusée, mais avec un message générique de page | Règle **par bien** avant publication publique : classes DPE et GES obligatoires dans une annonce de vente ou de location (sauf terrain). Message avec la référence et le titre, sans refus de page en double. Repère « DPE / GES à renseigner » dans l'onglet Biens | `contentBlockers`, `contentPagesWithReasons`, `tab-biens.tsx` |
| Démonstration | Un bien marqué « démonstration » visible bloque la publication publique (les cartes de liste n'affichent pas la mention, seule la fiche le fait) | `contentBlockers` |

**Inchangé** :
- statuts, saisie, contrôles de publication des biens ;
- médias du projet seulement ;
- adresse de fiche fixée à la première publication ;
- export (avertissements existants : métaobjets Shopify, module serveur ailleurs) ;
- rendu des thèmes : aucune section touchée, donc aucune différence de pixel possible pour les démos.

## 2. Preuves

### Tests automatiques

- **`tests/biens-hebergement.test.ts` : 4/4.**
  - Agence fictive publiée en V1, puis modifiée : prix, titre (adresse inchangée), bien vendu, bien retiré. Le site public ne bouge pas tant qu'on ne republie pas ; V2 ; restauration de V1 avec les biens d'alors.
  - Le brouillon n'est jamais public.
  - Fiches présentes dans le plan du site.
  - Refus du bien de démonstration.
  - Refus DPE/GES par bien.
  - 90 biens publiés, avec leurs 90 fiches.
- **Non régressés** : `biens.test.ts`, `maison-horizon.test.ts`, `hebergement-sites.test.ts` (29/29 au total). Types OK.

### Recette sur l'instance isolée

Studio compilé `cc541f85`, proxy HTTPS local, compte fictif.

Agence fictive « Agence Horizon Lumière » (thème Maison & Horizon composé pour un client), 6 biens :
- 2 ventes publiées ;
- 1 location publiée ;
- 1 bien vendu ;
- 1 brouillon ;
- 1 terrain retiré.

Toutes les photos sont générées : aucune photo réelle.

| Étape | Résultat | Preuves |
|---|---|---|
| Onglet Biens | 6 biens, statuts variés | `p1-01` |
| Publication V1 | 19 pages ; site à jour | `p1-biens.json` |
| Visiteur, ordinateur et téléphone | Accueil, Acheter, Louer et fiches : 200. Acheter montre les ventes et le bien vendu avec la mention « VENDU » ; Louer montre la location. Brouillon et retiré : absents des pages, **404** en accès direct. **18 liens internes, aucun cassé** | `p1-02-*` |
| Prix modifié dans l'onglet Biens (formulaire réel) | Bandeau « Votre site en ligne (publication 2) n'affiche pas encore ces changements (1 bien(s) modifié(s)) ». **Le site public garde l'ancien prix** | `p1-03` |
| « Publier votre site » | « Modifications non publiées … (1 bien(s) modifié(s)) » | `p1-04` |
| Publication V2 | Nouveau prix en ligne ; site à jour | `p1-05` |
| Restauration V1 | Ancien prix en ligne ; le studio indique de nouveau « non publié » (les données actuelles diffèrent de la version en ligne) | `p1-06` |
| Compte étranger | Biens et publication : 404 | `p1-biens.json` |
| Téléphone | Onglet Biens lisible | `p1-07` |

## 3. Fait, testé localement, non fait

- **Fait et testé localement** : tout ce qui est décrit aux §1 et §2.
- **Non fait** :
  - intégration à des portails immobiliers ou à un CRM (hors périmètre, aucune API testée) ;
  - mention « démonstration » sur les cartes de liste (inutile pour un site public, puisque la publication est refusée ; elle reste visible dans l'aperçu de démo).
- **Limite** : un bien exempté de DPE (cas rares hors terrain) ne peut pas être publié sur le site hébergé tant que le module n'accepte pas une valeur « non soumis ». À décider.
