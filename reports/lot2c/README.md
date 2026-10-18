# Lot 2C — FRAISE GUMMIES et ONDE AUDIO (issue #137)

Preuves publiques de la livraison des deux thèmes fidèles aux références Lumora et Pawish.

- `preuves.json` — produit par `scripts/lot2c-proof.ts` : commit testé (`testedCommit`), état de l'arbre de travail, largeurs
  (1440 et 390 px), mesures par page (largeur de défilement, h1, images cassées, médias manquants, polices, erreurs
  JavaScript), interactions exécutées dans Chromium, comparaisons réalisées, appels IA payants (toujours 0).
- `ressources-licences.json` — manifeste des ressources (images du kit, logos, polices, icônes, clip de test) et de leurs
  licences ou provenances.

Les captures, comparaisons côte à côte et vidéos de parcours contiennent les images IA et les propositions de logos du
kit : elles restent privées (ZIP remis au propriétaire) et n'entrent pas dans le dépôt.

Rejouer la passe de preuves (Chromium préinstallé, base isolée, aucun appel réseau) :

```bash
CHROMIUM=/chemin/vers/chrome npx tsx scripts/lot2c-proof.ts <dossier-sortie> <kit>/Pack_Claude_Fraise_Onde
```

Rapport complet : `docs/coordination/LOT_2C_FRAISE_ONDE_RESULTATS.md`. Inventaire des références :
`docs/coordination/LOT_2C_FRAISE_ONDE_INVENTAIRE.md`.
