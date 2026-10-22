# Bibliothèques de sections par famille — rapport (issue #141)

État courant de la branche `claude/bibliotheques-sections-familles` (pull request
spacedevelopment01-max/Ecom-studio-ia#143). Code vérifié : commit `8d95933d` (CI verte : typecheck, tests, Theme Check,
build). Galerie de contrôle de cette version (page privée) : https://claude.ai/artifact/AQ4xXZvpWQfanCcjBc17mt — le
numéro de version est affiché en haut de chaque page. **À valider par Thomas.**

## Ce qui change pour l'utilisateur du studio

- **« Ajouter une section » ne montre plus que la bibliothèque de la famille du projet** : 20 fonctions pour une
  boutique spécialisée (FRAISE, ONDE), 20 pour l'e-commerce (ORBE), 20 pour les prestations de services (Atelier
  Rive), plus les composants de structure (en-tête, pied de page, panier…) pour leurs réglages. Une fonction d'une
  autre famille est introuvable. La même règle s'applique à l'IA (catalogue donné à l'IA), aux commandes du chat, aux
  modèles de pages et au serveur (toute opération qui ajoute ou remplace une section).
- **Une fonction = une section ; ses dispositions sont des choix dans la galerie et dans le panneau « Réglages »**
  (grille, liste, colonnes, carrousel, visuel à gauche ou à droite, accordéon…). Changer de disposition garde les
  titres, textes, boutons, images et éléments ; quand la disposition est portée par une autre section du thème
  (ex. « Présentation principale » : ouverture conversion ou bannière), le contenu est converti automatiquement.
- **En-têtes et pieds de page : 5 dispositions chacun, par famille**, dans le panneau « Réglages » de l'en-tête et du
  pied de page. La n° 1 est exactement celle du thème validé ; rien n'est remplacé automatiquement.
- **Identité automatique** : une section ajoutée prend les couleurs, polices, boutons, arrondis et largeurs du thème
  installé et les textes, nom, produits, prestations, coordonnées et médias du projet. Une information inconnue
  s'écrit « [À compléter : …] ». Les contenus d'exemple n'existent que dans l'aperçu de la galerie, marqués « Exemple ».
- **Section entièrement écrite par l'IA (« Générer ») : forfait Dominer seulement**, vérifié par le serveur
  (Créer et Développer reçoivent un refus clair). Aucun appel réel ou payant n'a été fait : tests simulés.

## Les 60 entrées

La liste complète (fonctions, dispositions, sections du thème) est dans
[`docs/correspondance-sections-familles.md`](correspondance-sections-familles.md), générée depuis le code.

- **Boutique spécialisée (75 dispositions)** : Présentation principale · Bénéfices du produit · Détails du produit ·
  Composition et matériaux · Caractéristiques · Mode d'emploi · Situations d'utilisation · Démonstration vidéo ·
  Comparatif · Résultats et preuves · Avis et témoignages · Presse et distinctions · Histoire de la marque ·
  Fabrication et savoir-faire · Achat et offres · Produits complémentaires · Garanties et livraison · Questions
  fréquentes · Newsletter · Contact.
- **E-commerce (64 dispositions)** : Présentation principale · Collections et catégories · Sélection de produits ·
  Produit à la une · Ambiance et lookbook · Matières et finitions · Dimensions et proportions · Usages et
  installation · Entretien et durabilité · Comparatif de références · Campagne commerciale · Histoire de la maison ·
  Fabrication et ateliers · Engagements de la marque · Avis clients · Presse et distinctions · Journal et
  inspirations · Informations d'achat et FAQ · Newsletter · Contact et points de vente.
- **Services (57 dispositions)** : Présentation de l'activité · Prestations proposées · Détail d'une prestation ·
  Besoins accompagnés · Réalisations · Étude de cas · Avant / après · Méthode de travail · Engagements de service ·
  Équipe et expertises · Histoire de l'entreprise · Qualifications et assurances · Moyens et équipements · Témoignages
  clients · Références professionnelles · Tarifs et formules · Zone d'intervention et accès · Questions fréquentes ·
  Conseils et actualités · Contact et prise de rendez-vous.

## Correspondance et retraits

Tableau complet (ancien type → famille → fonction → disposition → décision, avec l'usage dans les quatre thèmes,
pages, sections masquées et page « bibliothèque » de démonstration comprises) : même document, partie 3.
157 sections dans le thème : 49 conservées dans au moins une bibliothèque (regroupées par fonction quand plusieurs
font la même chose), 20 créées, 17 composants de structure, **71 retirées du catalogue**. Aucune section utilisée par
FRAISE, ONDE, ORBE ou Atelier Rive n'est retirée. Les sections retirées ne sont plus proposées nulle part, mais leurs
fichiers restent : un projet enregistré qui les utilise s'affiche et s'exporte comme avant (rien n'est supprimé).

## Vérifications

| Vérification | Résultat | Nature |
|---|---|---|
| Quatre thèmes validés avant / après (accueil, fiche, toutes les pages, panier, tiroir ; 360, 390, 430, 1440 px) | 227 captures identiques au pixel sur 236 ; 9 écarts de 0 à 49 pixels (minuterie de démonstration du panier « 58 s / 59 s », lissage) | exécuté |
| Studio réel (Next.js, base temporaire) — FRAISE, ORBE, Atelier Rive : galerie de 20, autre famille introuvable, aperçu d'une disposition, ajout, changement de disposition (titre conservé), titre modifié, déplacement, en-tête et pied de page, rechargement | réussi pour les trois | exécuté (`scripts/family-studio-check.ts`) |
| Galerie de contrôle : 3 familles × 2 marques, 20 pages par famille (toutes les dispositions), 5 en-têtes, 5 pieds de page | 360 pages mesurées à 390 et 1440 px : aucun débordement | exécuté (`scripts/family-gallery-export.ts`) |
| Deux marques de la même famille sans retouche (FRAISE / ONDE ; ORBE / marque test B ; Atelier Rive / marque test B) | noms, textes, palettes et polices propres à chaque projet | exécuté (galerie) + test automatique |
| Tests automatiques (registre, routes, séparation, disposition, en-têtes/pieds, droits « Générer ») + suite complète | CI verte sur `8d95933d` ; en local 2026/2031, écarts corrigés ou dus à la lenteur de la machine (`migration-v2` : 104 s ici, 108 s sur la base, limite 120 s) | exécuté |
| Theme Check (Shopify) | valide | exécuté |
| Génération IA d'une section | refus / acceptation selon le forfait | simulé (aucun appel IA) |
| Téléphone réel de Thomas | — | non vérifié |

## Limites connues

- **Prix du forfait** : le code facture Dominer **129 €/mois** ; l'issue parle de **129,90 €**. Je n'ai pas changé le
  prix : à confirmer par Thomas.
- **Développer (89 €) perd « Générer »** comme demandé ; la grille tarifaire affichée suit automatiquement.
- **Exports WordPress / PrestaShop** : corrigé par l'issue #145 (scripts `family.js`, `conversion.js` et scripts
  des sections inclus ; voir [`LISEZMOI-verification-145.md`](LISEZMOI-verification-145.md)).
- **Méga menus** des en-têtes : la différence entre certaines dispositions ne se voit qu'au survol du menu.
- **Projets dans un ancien thème** (hors des quatre) : seules les dispositions que ce thème sait rendre sont proposées.
- Les **démonstrations** n'ont qu'un produit (ORBE) ou n'ont pas de vidéo : les sélections de produits et la vidéo
  montrent donc peu d'éléments dans la galerie de contrôle.
- Aucune image de kit, logo ni capture de référence n'est dans le dépôt (ZIP privé seulement).
