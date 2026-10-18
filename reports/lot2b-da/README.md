# ORBE / Atelier Rive — preuves de la variante « direction artistique » (session Claude)

**Les captures, gros plans et vidéos contiennent les 24 photographies du pack : ils sont déposés dans un emplacement privé, pas dans ce dépôt public.**

- Page privée de preuves (captures 1440 / 1024 / 768 / 390 px, gros plans, vidéos H.264, mesures) : https://claude.ai/artifact/9svdkBiprPc6Ji4ZNnpjUt — accessible au propriétaire du compte ; à partager depuis son menu Partager si quelqu'un d'autre doit la voir.
- Rapport : [docs/coordination/LOT_2B_ORBE_RIVE_DA_CLAUDE.md](../../docs/coordination/LOT_2B_ORBE_RIVE_DA_CLAUDE.md).
- [preuves.json](preuves.json) : commit testé (`24892334`, passe de finition), mesures des 16 visites (largeur, hauteur, H1, en-tête, médias manquants, position du bouton d'achat), interactions et exports générés.
- Plans des contenus et des médias par page : [ORBE](orbe-plan-contenus-medias.json), [Atelier Rive](atelier-rive-plan-contenus-medias.json).

## Rejouer les preuves

```bash
CHROMIUM=/chemin/vers/chrome npx tsx scripts/lot2b-da-proof.ts <dossier-privé> <pack-extrait>/images
```

Base temporaire supprimée à la fin, réseau fournisseur interdit, aucun appel IA. Sans le dossier du pack, les captures montrent des cadres « Visuel à importer » et sont explicitement incomplètes.

## Fichiers produits dans le dossier privé

| ORBE | Atelier Rive |
|---|---|
| accueil et fiche produit : page entière PNG à 1440 / 1024 / 768 / 390 px, aperçus WebP, premier écran et pied de page à chaque largeur | accueil et prestation : mêmes captures |
| produit à la une (ordinateur / mobile, trio avec pochette, scène isolée par finition), achat 1 / 2 / 3, cadeau indisponible, barre d'achat mobile et panier alimenté depuis la barre, zoom, paniers (depuis l'accueil, trio, duo), menu mobile | prestations (chapitres 1 et 2), étude fictive, comparaison, questions, formulaire avec reçu, menu mobile |
| vidéos ordinateur 36,5 s et mobile 36,1 s | vidéos ordinateur 26,0 s et mobile 27,2 s |
| exports Shopify / WooCommerce / PrestaShop / Wix / Squarespace (non installés, avantages commerciaux désactivés) | idem |
