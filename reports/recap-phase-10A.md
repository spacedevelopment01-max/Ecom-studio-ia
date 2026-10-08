# Récapitulatif — Phase 10A : nouveau moteur de création de sites

## Ce qui change pour vous

Quand le studio compose un site, il passe maintenant par un **nouveau moteur**. Il ne coûte rien : aucune IA payante
n'est utilisée.

1. **Il part de votre métier.** Il reconnaît le type de site : boutique, artisan, restaurant ou logiciel. Il en déduit
   le bouton principal : « Acheter », « Demander un devis », « Nous contacter » ou « Demander une démo ».
2. **Il choisit un style adapté.** Il y a 5 styles visuels, chacun avec ses polices, ses couleurs, son ouverture de page
   et son rythme de sections :
   - **Atelier précis** pour Sébastien Blanc ;
   - **Maison éditoriale** pour le sérum ;
   - **Précision technique** pour le drone ;
   - **Bistrot** pour le restaurant ;
   - **Produit numérique** pour le logiciel.
3. **Il crée les pages utiles au métier** : prestations, carte, fonctionnalités, tarifs, questions, contact… Une page
   qui manque d'informations est signalée en orange dans le studio, au lieu d'être remplie de texte inventé.
4. **Il n'affiche que ce qui est confirmé.** Le reste est marqué « [À compléter] » :
   - pas d'avis ni de note sans vrais avis ;
   - pas de prix inventé ;
   - un détail déduit d'une photo (par exemple « Texture : gel fluide ») n'est plus présenté comme un fait.
5. **Il n'y a plus de cadres d'image vides.** Sans photo, la page d'accueil est composée avec du texte, pas avec une
   image générique. Sébastien Blanc n'a **pas de mur de pierre** : sa page d'accueil affiche son métier, Mâcon, son
   numéro, sa zone, ses horaires et son adresse.

## Vos 5 sites de référence

- **Contrôle automatique des défauts** (débordements, textes coupés, contrastes, boutons invisibles, sections vides…) :
  0 défaut bloquant et 0 avertissement sur les 5 sites. Avec l'ancien moteur : 3 défauts bloquants et 38 avertissements.
- **Ressemblance entre les sites :** avant, le drone et le logiciel étaient presque identiques, avec le même titre
  « La technologie, sans détour. ». Aujourd'hui, les 5 sites sont tous nettement différents les uns des autres.
- **Contrôle officiel de Shopify (Theme Check) :** 0 erreur sur les 5 thèmes exportés. L'ancien moteur, toujours
  disponible dans la galerie des thèmes, passe aussi le contrôle sans erreur.

## Modifier son site dans l'onglet Boutique

J'ai fait tout le parcours dans un vrai navigateur, avec le compte gratuit : **24 vérifications sur 24 réussies**, sans
aucun appel à l'IA. On peut :

- choisir la page à afficher et voir l'aperçu sur ordinateur, tablette et téléphone ;
- désigner un élément de l'aperçu puis modifier son texte, ou remplacer son image par une image du projet ;
- changer la couleur des boutons et les polices ;
- changer la disposition d'une section ;
- ajouter, déplacer ou supprimer une section ;
- recharger la page : tout est conservé ;
- revenir à une ancienne version ;
- exporter.

Une retouche ne touche que l'élément visé : le site n'est **jamais régénéré en entier**. L'onglet Boutique a aussi un
nouveau panneau « Site — moteur V2 » :

- choix du style, avec un bouton « Recomposer » (gratuit) ;
- liste des pages complètes ou à compléter ;
- informations qu'il vous reste à fournir.

## Exports

- **Shopify :** fichier de thème complet, sans erreur au contrôle officiel.
- **WooCommerce et PrestaShop :** j'ai trouvé et corrigé un vrai défaut, les nouvelles sections sortaient vides. Le
  contenu est maintenant repris, mais pas la mise en page.
- **Wix et Squarespace :** seulement un kit (images, textes, couleurs, mode d'emploi). Ce n'est pas un vrai thème pour
  ces plateformes.
- **Forfait Découverte :** l'export est refusé, c'est la règle actuelle du produit.

## Ce qui n'est pas prouvé

- **La beauté des sites :** c'est à vous d'en juger. Les captures et les comparaisons avant/après sont dans
  `reports/screenshots/theme-v2/`.
- **Aucune installation sur une vraie boutique** Shopify, WordPress ou PrestaShop : ce sera la phase 10B, avec votre
  accord.
- **Sébastien Blanc et le restaurant n'ont aucune vraie photo :** leurs sites ne montrent que du texte, et je n'ai pas
  pu voir le rendu avec de vraies photos.
- **Le sérum et le logiciel utilisent des images dessinées pour la démonstration**, signalées comme telles.
- **Les sites de référence que vous aviez cités** (scale-ova.ai, banques d'images) n'ont pas pu être consultés : le
  réseau de l'environnement de travail les bloque.
- **Tests faits uniquement dans Chromium** (ni Safari ni Firefox). Vitesse mesurée seulement en local, sans l'outil
  Lighthouse.

## Vérifications

| Vérification | Résultat |
|---|---|
| Tests automatiques | 919 / 919 réussis |
| Vérifications dans un vrai navigateur | 44 / 44 (24 pour l'éditeur, 20 pour les pages des 5 sites) |
| Vérification du code (TypeScript) | OK |
| Construction de l'application | OK |
| Contrôle officiel de Shopify (Theme Check) | OK |
| Dépenses IA | 0 € |
| Enregistrement sur la branche | commit `6847b02` |
| Fusion | NON |
| Phase 10B | NON COMMENCÉE |

Rapports détaillés : `reports/phase-10A-report.md` et `reports/theme-v2-visual-review.md`.

**Je fusionne ?** Je ne le ferai qu'après votre accord, et seulement si toute la vérification automatique de GitHub est
verte.
