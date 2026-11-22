# 04 — Maquettes haute fidélité et prototype de parcours (direction « Encre »)

Maquettes HTML statiques, sans serveur ni appel : ouvrir les fichiers de `maquettes/` dans un navigateur. Elles
utilisent de vraies images du dépôt (`public/theme-assets/sillon/` et `table-saison/`, réduites dans `maquettes/img/`) :
produits et plats, **aucune personne**. Données de démonstration fictives (prix, versions, pourcentages).

Chaque écran a été capturé à 1440 × 900 et 390 × 844 (`captures/<écran>--ordinateur.jpg`, `--telephone.jpg`).
Contrôle automatique sur chaque capture : aucune page plus large que l'écran, aucune image manquante, polices chargées.
**Aucune comparaison pixel à pixel n'est revendiquée** : ce sont des maquettes de direction, pas des écrans du Studio.

## Les écrans demandés

| # | Écran demandé par #282 | Fichier | États montrés |
|---|---|---|---|
| 00 | Planche des états | `e-00-etats.html` | proposition, brouillon, confirmé, en cours (attente), vérifié (succès), échec, non disponible, chargement, vide, budget épuisé, hors forfait |
| 01 | Accueil / nouveau projet conversationnel | `e-01-accueil.html` | normal ; choix produits / services / site existant ; projets récents |
| 02 | Interface principale SYNA + espace de travail | `e-02-syna-espace.html` | proposition d'un plan en 2 étapes, sélection active dans l'aperçu |
| 03 | Site, aperçu et sélection d'élément | `e-03-site-selection.html` | élément sélectionné, **section gérée par un espace métier** (non disponible pour SYNA), retouche manuelle, historique |
| 04 | Produits | `e-04-produits.html` | brouillon vérifié par SYNA, stock à saisir à la main, synchronisation boutique restée manuelle |
| 05 | Images et logos | `e-05-images-logos.html` | 3 logos comparés, contrôle par logo, reprise par OpenAI signalée, coût réel comparé au devis, bibliothèque |
| 06 | Vidéo | `e-06-video.html` | devis de reprise d'un seul plan, plans désignables, mode guidé non couvert (lien vers l'écran actuel) |
| 07 | Calendrier / publications | `e-07-diffusion.html` | brouillons, compte non connecté, « à publier vous-même » (LinkedIn) |
| 08 | Confirmation des coûts | `e-08-cout.html` | devis en %, barre budget avant / après, plafond, alternatives moins chères |
| 09 | Exécution longue, progression, erreur, reprise | `e-09-execution.html` | en cours 2/3, échec fournisseur 503 non relancé seul, confirmé en file, vérifié, échec de publication, non disponible |
| 10 | Domaine / publication | `e-10-publication.html` | export ZIP par plateforme, envoi direct non essayé, **hébergement non configuré en développement** (état honnête) |
| 11 | Navigation mobile | `e-11-mobile-navigation.html` | feuille des espaces, désignation au doigt, suivi des tâches |
| 12 | Projet existant | `e-12-projet-existant.html` | état de transition : ce que SYNA a lu, ce qu'elle ne sait pas reprendre, écrans habituels |

## Principes d'architecture visibles dans les maquettes

1. **Une seule conversation** à gauche (ou onglet « Syna » au téléphone), persistante, avec la mémoire du projet.
   Plus de chat par rubrique : la discussion de la boutique et le chat du calendrier deviennent SYNA une fois la
   parité prouvée (voir le plan de migration).
2. **L'espace de travail** reste à droite : aperçu du site, catalogue, logos, vidéo, calendrier, suivi. On y travaille
   aussi à la main. La **sélection** d'un élément devient une puce bleue dans le compositeur (« Sélection : … »).
3. **Transparence** : 7 états nommés (planche 00). Un message de SYNA n'affirme jamais une modification avant
   « Vérifié » ; la preuve montre version, capture, avant / après et coût débité comparé au devis.
4. **Coût** : toujours en % du budget IA du mois, jamais en euros d'IA ; devis = coût probable d'un essai ; une reprise
   n'est débitée que si elle a lieu. Les plafonds actuels (40 % du HT de l'abonnement, 50 % des recharges) ne changent
   pas.
5. **Navigation** : 6 lieux de travail (Site, Catalogue / Carte / Biens selon le métier, Marque, Images, Vidéos,
   Diffusion) + Projet. Les outils avancés (Prompts, Fichiers, Connexions) passent dans Projet. Au téléphone : Syna,
   Aperçu, Espaces (feuille), Suivi.
6. **Honnêteté sur les manques** : quand SYNA ne sait pas, elle le dit et ouvre l'écran natif au bon endroit
   (Carte, Rendez-vous, Structure, Publier).

## Prototype de parcours

`maquettes/prototype.html` : prototype cliquable (flèches du clavier, boutons Précédent / Suivant, ou clic dans
l'aperçu). Deux parcours de 7 étapes, chacun : commande en langage naturel → proposition de SYNA → sélection d'un
élément dans l'aperçu → confirmation de coût → exécution → preuve du résultat → retour manuel et historique.

| Parcours | Ce qu'il démontre | Captures |
|---|---|---|
| Boutique · SILLON | Création d'**une** image payante (≈ 2 %), contrôle, avant / après, version v5 → v6, coût débité = devis ; stock saisi à la main ; restauration possible. | `captures/proto-prod-01…07--ordinateur.jpg` (+ étapes 1, 4, 6 au téléphone) |
| Services · Table Saison | Retouche exacte gratuite (bouton « Réserver une table ») vérifiée par capture ; **menu du dimanche non disponible pour SYNA** → l'écran Carte s'ouvre prérempli ; allergènes « [À compléter] » à déclarer par le client. | `captures/proto-serv-01…07--ordinateur.jpg` (+ étapes 1, 4, 6 au téléphone) |

Vérification réelle : les 28 étapes (2 parcours × 7 étapes × 2 tailles d'écran) ont été parcourues par un navigateur
automatisé, sans erreur JavaScript ni débordement. Deux défauts de mise en page trouvés ainsi (bouton « Suivant »
recouvert, bouton de réservation vide) ont été corrigés avant capture.

## Limites

- Ce sont des maquettes : aucune donnée réelle du Studio, aucun appel à SYNA.
- Les pourcentages, versions et heures sont illustratifs ; ils ne mesurent rien.
- Lecteur d'écran : structure (titres, `aria-label`, états en texte, `aria-live` du prototype) pensée mais **non testée
  avec un vrai lecteur d'écran**. Contrastes non mesurés outil en main (à faire en phase 2 avec l'outil existant du
  Studio).
- Mode sombre : défini dans `encre.css` mais capturé seulement en clair.
