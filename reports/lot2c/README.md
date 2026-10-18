# Lot 2C — FRAISE GUMMIES et ONDE AUDIO (issue #137)

Preuves publiques de la livraison des deux thèmes fidèles aux références Lumora et Pawish.

- `preuves.json` — produit par `scripts/lot2c-proof.ts` : commit testé (`testedCommit`), état de l'arbre de travail, largeurs
  (1440, 768, 390 et 360 px), mesures par page (largeur de défilement, h1, images cassées, médias manquants, polices, erreurs
  JavaScript), interactions exécutées dans Chromium, comparaisons réalisées, appels IA payants (toujours 0).
- `ressources-licences.json` — manifeste des ressources (images du kit, logos, polices, icônes, clip de test) et de leurs
  licences ou provenances.

Les captures, comparaisons côte à côte et vidéos de parcours contiennent les images IA et les propositions de logos du
kit : elles restent privées (ZIP remis au propriétaire) et n'entrent pas dans le dépôt.

Rejouer la passe de preuves (Chromium préinstallé, base isolée, aucun appel réseau) :

```bash
PROOF_WIDTHS=1440,768,390,360 CHROMIUM=/chemin/vers/chrome npx tsx scripts/lot2c-proof.ts <dossier-sortie> <kit>/Pack_Claude_Fraise_Onde
```

Rejouer le test du vrai bouton « Ajouter une section » du studio (serveur Next.js de développement sur une base temporaire,
Chromium piloté ; FRAISE puis ONDE) :

```bash
CHROMIUM=/chemin/vers/chrome npx tsx scripts/lot2c-studio-check.ts <dossier-captures> <kit>/Pack_Claude_Fraise_Onde fraise
```

Rapport complet : `docs/coordination/LOT_2C_FRAISE_ONDE_RESULTATS.md`. Inventaire des références :
`docs/coordination/LOT_2C_FRAISE_ONDE_INVENTAIRE.md`.
