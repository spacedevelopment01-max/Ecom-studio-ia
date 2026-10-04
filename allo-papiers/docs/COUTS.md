# Estimation des coûts (octobre 2026)

**Ce sont des estimations.** Les tarifs viennent des grilles publiques consultées le 4 octobre 2026. Certains n'ont pu être confirmés que par des sources secondaires : ils sont signalés comme tels. Vérifiez-les avant de vous engager. Les montants sont en dollars quand le fournisseur facture en dollars (1 $ ≈ 0,92 € retenu).

## Tarifs utilisés

| Poste | Tarif retenu | Vérifié ? |
|---|---|---|
| IA Claude Opus 5.5 (modèle par défaut) | 4 $ par million de jetons lus, 20 $ par million écrits | Oui (grille Anthropic) |
| IA Claude Sonnet 5.5 (option `AI_MODEL`) | 2 $ / 10 $ par million | Oui (grille Anthropic) |
| Vercel Pro (obligatoire pour un usage commercial) | 20 $ par mois et par membre | Source secondaire |
| Supabase Pro | 25 $ par mois (crédit de calcul de 10 $ inclus) | Source secondaire |
| Resend Free | 3 000 emails par mois, 100 par jour | Oui (blog Resend) |
| Resend Pro | environ 20 $ par mois pour 50 000 emails | Non vérifié |
| Stripe, cartes européennes | environ 1,5 % + 0,25 € par paiement | **À confirmer** (1,4 % ou 1,5 %) |
| Stripe Billing (abonnements) | environ 0,7 % du montant | Source secondaire |
| Recommandé La Poste/Maileva | inconnu (selon le contrat) | Non |

## Coût de l'IA par action (hypothèses)

- **Analyse d'un document de 2 pages** : environ 5 700 jetons lus (pages en image, consignes, mise en cache des consignes) et environ 4 000 jetons écrits (résultat détaillé et réflexion).
  - Opus 5.5 : **environ 0,10 $** par document.
  - Sonnet 5.5 : environ 0,05 $.
- **Question au document** : environ 6 000 jetons lus et 800 écrits.
  - Opus : environ 0,04 $.
  - Sonnet : environ 0,02 $.
- **Comparaison de deux documents** : environ 0,15 $ avec Opus.
- La rédaction guidée de courriers **ne coûte rien en IA** : ce sont des modèles écrits à l'avance, remplis par le serveur.

## Scénario 100 utilisateurs (par mois)

Hypothèses :
- 70 utilisateurs gratuits, qui analysent en moyenne 2 documents chacun ;
- 30 abonnés Plus, qui font en moyenne 8 documents, 15 questions et 1 comparaison chacun.

| Poste | Opus 5.5 | Sonnet 5.5 |
|---|---|---|
| IA, offre gratuite (140 documents) | 14 $ | 7 $ |
| IA, offre Plus (240 documents, 450 questions, 30 comparaisons) | 47 $ | 24 $ |
| Vercel Pro | 20 $ | 20 $ |
| Supabase Pro (le stockage dépasse vite 1 Go en gratuit) | 25 $ | 25 $ |
| Resend Free | 0 $ | 0 $ |
| **Total** | **≈ 106 $ ≈ 98 €** | **≈ 76 $ ≈ 70 €** |
| Recettes : 30 × 4,99 € TTC = 149,70 € → hors TVA (20 %) ≈ 124,75 €, moins Stripe ≈ 10 € | **≈ 115 €** | **≈ 115 €** |
| **Résultat avant autres frais** | **≈ +17 €** | **≈ +45 €** |

## Scénario 1 000 utilisateurs (par mois)

Mêmes proportions : 700 utilisateurs gratuits et 300 abonnés Plus.

| Poste | Opus 5.5 | Sonnet 5.5 |
|---|---|---|
| IA | ≈ 605 $ | ≈ 305 $ |
| Vercel Pro (avec un peu de dépassement) | ≈ 30 $ | ≈ 30 $ |
| Supabase Pro (environ 15 Go de fichiers, calcul supplémentaire) | ≈ 50 $ | ≈ 50 $ |
| Resend Pro (le quota gratuit de 100 emails par jour est trop juste) | ≈ 20 $ | ≈ 20 $ |
| **Total** | **≈ 705 $ ≈ 650 €** | **≈ 405 $ ≈ 375 €** |
| Recettes nettes (300 abonnés) | ≈ 1 150 € | ≈ 1 150 € |
| **Résultat avant autres frais** | **≈ +500 €** | **≈ +775 €** |

Les « autres frais » ne sont pas comptés ici : comptabilité, assurance responsabilité civile professionnelle, médiateur de la consommation, relecture juridique, domaine (environ 10 € par an), temps passé.

## Point de vigilance : l'abonné qui utilise tout son forfait

Avec les limites actuelles de l'offre Plus (30 documents, 150 questions, 20 comparaisons), un abonné qui utilise **tout** coûte :
- Opus : 3 $ + 6 $ + 3 $ = **12 $**, soit plus que ses 4,16 € hors TVA ;
- Sonnet : environ 6 $.

C'est pourquoi l'offre n'est **pas illimitée** et ses limites sont **réglables sans modifier le code**, dans les variables `PLUS_*_PER_MONTH`.

Pistes, à décider par vous :
1. **Réduire les questions** à 60 par mois et les comparaisons à 10 : le coût maximal tombe à environ 7,7 $ avec Opus.
2. **Passer à Sonnet 5.5** (`AI_MODEL=claude-sonnet-5-5`) : coût divisé par deux environ. La qualité d'analyse reste à vérifier sur vos documents réels.
3. **Plafonner la dépense** dans la console Anthropic (Settings → Limits). Le site affiche alors une erreur propre, sans débiter de crédit.

## Ce qui protège contre les abus (déjà en place)

- **Quotas mensuels vérifiés par le serveur**, avec verrou en base de données. Testé : 12 demandes simultanées donnent exactement 3 analyses en offre gratuite.
- **Limites de fréquence** : demandes de lien de connexion, codes, imports, analyses (20 par heure), annuaire.
- **Taille limitée** : 10 pages et 20 Mo par document, 4 Mo par fichier.
- **Échecs gratuits** : un échec de l'IA libère le crédit, sans relance automatique en boucle.
