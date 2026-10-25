# Claude — MAISON & HORIZON : reproduction fidèle des sept maquettes

## Demande explicite de Thomas — 23 octobre 2026
Construire le thème complet d'agence immobilière **Maison & Horizon**, achat ET location, dans E-COM STUDIO IA. Reproduire le rendu des maquettes et toutes leurs fonctions, page par page, desktop et mobile. Ce n'est pas une simple inspiration ni une nouvelle proposition graphique.

**Modèle demandé : Opus ; effort élevé si disponible.** Annoncer le modèle et le réglage réellement utilisés, sans prétendre modifier un réglage inaccessible.

## Sources disponibles
Les sept planches sont réellement versionnées dans ce dossier : ouvrir les fichiers, ne pas travailler seulement d'après ce texte. Copies JPEG haute qualité, dimensions originales conservées.
1. [Accueil desktop et mobile](maquettes/01-accueil.jpg)
2. [Recherche achat, location et carte](maquettes/02-recherche-achat-location-carte.jpg)
3. [Fiche vente desktop et mobile](maquettes/03-fiche-vente.jpg)
4. [Fiche location desktop et mobile](maquettes/04-fiche-location.jpg)
5. [Agence, conseils, article et contact](maquettes/05-agence-conseils-contact.jpg)
6. [Estimation, vendre et mettre en location](maquettes/06-estimation-vendre-louer.jpg)
7. [Favoris, alertes, compte, espace client, légal, 404 et cookies](maquettes/07-favoris-compte-legal.jpg)

**Thomas transmet séparément Maison_Horizon_90_images.zip.** Ne pas chercher ce ZIP dans le dépôt : à sa demande, seuls les sept panneaux et cette consigne y sont publiés.
Le ZIP contient `images/` (90 PNG) et `MANIFEST.json` (correspondance image → planche source → rectangle extrait).
SHA-256 du ZIP : `170d4964c11aa04f30ea6eff9be5bd5541752db1c766e7997b4be7e9a4d64d27`.

Les 90 fichiers sont des **extraits des maquettes**, pas 90 photographies originales haute définition ni 90 visuels tous distincts : certaines scènes se répètent, certaines comportent du texte, un badge, un bouton ou une carte incrustés. Leur résolution est celle de la zone source. Inspecter chaque image avant affectation. Ne pas présenter un extrait avec texte comme une photo propre ; ne pas doubler visuellement les boutons/textes. Préserver les scènes et cadrages. Si une version propre/plus grande manque, identifier précisément le fichier et la zone à compléter, sans remplacer silencieusement par une image générique. Aucun appel IA payant autorisé dans cette mission. Les compteurs « 12/16 photos » des maquettes ne prouvent pas que ces photos distinctes existent : calculer le nombre réel, ne pas dupliquer artificiellement les photos.

## Fidélité visuelle
- Vert profond, ivoire et terre cuite ; grandes photographies, titres serif, textes de lecture sobres, proportions et respirations des planches.
- Reprendre ordre, composition et densité des sections, formats des cartes, fonds, encadrements, pictogrammes, galeries, footers et états visibles. Respecter les compositions propres à chaque page.
- Reconstruire en composants éditables : jamais une capture de page entière utilisée comme site.
- Les textes des maquettes sont la base. Corriger uniquement les artefacts de génération et incohérences ; français clair et naturel, sans remplacer par du texte commercial générique.
- Les planches présentent quelques variantes de logo et des valeurs divergentes pour un même bien. Harmoniser l'identité avec l'accueil ; fiche détaillée du bien = référence pour ses valeurs, puis répercuter partout et consigner les arbitrages. Ne pas garder des prix/surfaces/localisations contradictoires.
- Respecter mobile : ordre et recadrages montrés, menu, galeries tactiles, accordéons et barre de demande de visite sans masquer le contenu. Adapter proprement les pages sans vue mobile fournie.
- Préserver tous les autres thèmes et l'accueil commercial du studio.

## Pages et fonctions à réaliser
**Accueil :** navigation, recherche Acheter/Louer, localisation/type/budget, biens à la une, favoris, blocs acheter/louer, bien d'exception, services, propriétaires, secteurs, agence, conseils, contact, footer. Les entrées de recherche et de secteur conduisent à de vrais résultats filtrés.

**Recherche achat/location :** listes distinctes, cartes reliées aux bonnes fiches, prix vente ou loyer et charges clairement différenciés, filtres adaptés (ville, type, budget, surface, chambres, meublé, disponibilité, extérieur/piscine), tri, pagination, remise à zéro et état sans résultat. Conserver filtres et navigation retour.

**Carte :** bascule carte/liste, marqueurs cohérents avec les résultats, sélection marqueur/carte et panneau de filtres. La carte dessinée dans la maquette est illustrative : ne pas la faire passer pour une carte interactive réelle. Utiliser l'intégration disponible ; documenter toute dépendance manquante sans annoncer une fonction externe opérationnelle.

**Fiches vente/location :** galeries et visionneuse, vrai compteur, favoris, partage, descriptions, caractéristiques/équipements, informations financières, diagnostics, localisation/quartier, biens similaires. Vente : plan illustratif, demande de visite, rappel. Location : distinction hors charges/charges/total, disponibilité, préparation du dossier, étapes et FAQ. Toutes les actions visibles doivent avoir un comportement utile et vérifiable.

**Propriétaires :** estimation en trois étapes (bien/projet/coordonnées), navigation précédent/suivant, validation et état d'envoi ; vendre et mettre en location avec étapes, engagements, formulaires et FAQ. Ne pas fabriquer une estimation chiffrée ou une confirmation de rendez-vous.

**Agence/conseils/contact :** agence complète, catégories d'articles, article complet et articles liés ; contact avec motif acheter/louer/vendre/mettre en location et coordonnées configurables. Aucun lien mort.

**Favoris/alertes/espace client :** ajout/retrait persistant, compteurs, comparaison de sélection, recherches enregistrées et gestion des alertes ; connexion/inscription/mot de passe oublié/profil/déconnexion selon les composants existants ; tableau de bord, visites et préférences. Isoler les données par utilisateur/projet. Un simple localStorage ne remplace pas une authentification. Les emails d'alerte et visites ne doivent jamais être présentés comme envoyés/confirmés si aucun service réel n'a répondu. Utiliser les intégrations disponibles et documenter précisément les limites.

**Légal/cookies/404 :** pages et onglets montrés, mentions, honoraires, confidentialité, préférences cookies persistantes, refuser/accepter/personnaliser, retour accueil. Les coordonnées, mentions professionnelles et diagnostics manquants restent « à renseigner ». Distinguer explicitement les données de démonstration.

## Ajout et gestion des biens — indispensable
Prévoir une rubrique **Biens** rattachée au projet immobilier dans le studio : ajouter, modifier, prévisualiser, enregistrer en brouillon, publier/retirer de l'affichage, marquer vendu/loué et archiver. « Publier » ici signifie rendre visible dans le contenu du projet/export, pas lancer un nouvel hébergement V1.

Saisie unique : référence stable, transaction vente/location, type, titre, description, ville/secteur, adresse et visibilité, prix/loyer/charges, surfaces, pièces/chambres, équipements, disponibilité/statut, DPE/GES documentés, honoraires et autres données applicables, photos ordonnées/couverture/texte alternatif, plan facultatif.
Ces données alimentent automatiquement accueil, listes, filtres, carte, fiche, favoris et biens similaires. Les photos et textes doivent rester rattachés au bon bien. Ne pas présenter des photos de biens différents comme la galerie du même logement.
Sauvegarde durable, rechargement et contrôles serveur ; réutiliser les mécanismes du studio et les droits existants. Tester qu'un bien nouvellement créé apparaît au bon endroit sans modifier le code du thème.

## Intégration et coordination
- Thème de la famille **Prestations de services**, aperçu complet avec démo AVANT sélection ; personnalisation après choix explicite.
- Réutiliser le pipeline d'édition, sauvegarde et export V1 réellement supporté. Décrire plateforme par plateforme ce qui est exporté et ce qui exige un backend (comptes, emails, gestion des biens, carte). Ne pas promettre qu'un export statique suffit à tout.
- Hébergement natif des sites clients/domaines = V2 ; ne pas l'ajouter ici.
- Lire les instructions du dépôt et l'état courant de #167 avant intervention. Claude thèmes est le propriétaire de cette mission. Ne pas empiéter sur Claude 2 / lot 1 (#163) ou Codex / lot 9 (#171).
- Cette branche de brief ne contient aucun changement d'application. Récupérer uniquement le dossier de brief dans le travail thèmes courant, sans écraser les travaux récents par l'ancien main.
- Dépendances moteur partagées : les identifier et coordonner ; ne pas refaire facturation, moteur IA, sécurité ou autres thèmes dans ce lot.
- Pas de fusion ni déploiement automatique. Pas de suppression de données, envoi client réel ou appel fournisseur payant.

## Recette et livraison
1. Matrice planche → pages/routes → composants → médias → actions → preuve/statut.
2. Captures desktop et mobile de TOUTES les pages ; comparaison visuelle côte à côte avec la référence, corrections jusqu'à proximité fidèle.
3. Vérifier navigation, recherche/filtres/tri/pagination, carte, galeries, favoris/comparaison, formulaires, compte/alertes, cookies, 404.
4. Tester création/modification/retrait d'un bien avec ses photos, sauvegarde/rechargement, isolation des comptes, propagation cohérente et export.
5. Tests ciblés et CI appropriée ; une CI verte seule ne vaut pas validation visuelle. Pas de test IA réel à ce stade.
6. Fournir PR/SHA, fichiers modifiés, captures, résultats et limites précises. Ne pas déclarer « terminé » avec boutons inertes ou fonctions seulement dessinées.
7. Fournir à Thomas une explication simple, illustrée si possible : ouvrir Biens → Ajouter → saisir informations → ajouter photos → prévisualiser → enregistrer/publier dans le projet → exporter/mettre à jour selon le support réel.

Avancer jusqu'à une réalisation révisable, pas uniquement un plan. Toute image ou dépendance manquante doit être nommée précisément ; poursuivre les parties indépendantes.
