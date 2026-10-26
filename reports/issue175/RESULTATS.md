# TABLE SAISON (issue #175) — contrôles réellement effectués

Commit contrôlé : voir la PR (dernier commit de la branche). Démo exportée par `scripts/reference-static-preview.ts
--only=table-saison` : 21 pages, 78 fichiers servis, 0 photo manquante (61/61).

## Kit photographique
- 4 ZIP décompressés au même endroit ; `MEDIAS.json` : 61 entrées, 61 fichiers présents, 61 empreintes SHA-256 conformes.
- Conversion WebP qualité 80, dimensions natives : `public/theme-assets/table-saison/` (61 fichiers, 11 Mo) ; les JPEG
  d'origine (61 Mo) restent hors du dépôt.

## Tests automatiques
- `npx tsc --noEmit` : aucune erreur.
- `npx vitest run` (suite complète) : 2 897 réussis, 1 échec corrigé ensuite (adresse de page française dans un thème en
  anglais) ; fichiers concernés relancés : 128/128.
- Nouveaux : `tests/table-saison-theme.test.ts` (10) et `tests/table-saison-booking.test.ts` (9).
- Theme Check : TABLE SAISON produits/services, FR/EN : aucune erreur ; `scripts/verify-theme.sh --rapide` : tout est valide.
  Avertissement restant : la section « Réservation de table » a 62 réglages (Shopify en conseille 40, non bloquant).

## Parcours vérifiés dans un navigateur (Chromium, export statique, 1 440 px et 390 px)
| Vérification | Résultat |
|---|---|
| Continuer sans date | « Choisissez une date disponible dans le calendrier. » |
| Jours passés d'octobre 2026 | 22 jours désactivés |
| Retour étape 2 → 1 → 2 | date et horaire conservés |
| Coordonnées vides | 4 champs signalés (prénom, nom, e-mail, conditions) |
| Confirmation à 19h30 (double clic) | créneau indisponible, alternatives 19h00 et 20h00 |
| Continuer avec 19h00 (double clic) | une seule réservation (TS-0001) |
| Ajouter au calendrier | fichier `TS-0001.ics` |
| Gérer ma réservation | page détail par lien `#r=…&t=…` |
| Modifier (20h00) | « Démonstration : modifications enregistrées dans ce navigateur seulement. » |
| Fenêtre d'annulation | Échap la ferme ; confirmation → « Votre réservation est annulée. Elle n'est plus active. » |
| Page détail après annulation | statut « Annulée », boutons modifier / annuler masqués |
| 18 pages × 360, 390, 430 px | aucun débordement horizontal, aucune erreur de script |

## Non vérifié
- Envoi réel d'e-mails (SMTP non configuré ici) : la confirmation affiche alors « aucun e-mail envoyé ».
- Service réel appelé depuis un site publié sur Shopify (pas de studio joignable publiquement dans cet environnement) ;
  l'API est testée par appel direct de ses routes.
- Lecteurs d'écran réels (seuls les attributs ARIA et le clavier ont été vérifiés).
