# #301 — actions du Studio absentes de la matrice des 84 opérations

Consigne 6618265320 : « confronter cet inventaire aux onglets, boutons et fonctions réellement présents et compléter les
omissions ». Relevé par lecture du code des onglets (`src/components/studio/tab-*.tsx` et composants appelés), tête
`claude/syna-301-complet`. **Correspondances établies par lecture, pas par exécution** : chaque ligne reste à confirmer
(propriétaire du contrat : Codex ; interface et recette : Claude). Statut de départ de chaque omission : **ABSENT** de
SYNA tant qu'aucun contrat ni recette ne la couvre. Les opérations seulement partiellement couvertes sont marquées.

| Domaine | Action absente de la matrice (libellé du Studio) | Où |
|---|---|---|
| Pilote / mémoire | Mémoire du projet : ajouter / oublier | tab-pilote |
| Pilote | Pause / arrêt / reprise de la production (partiel : `native.workflow`) | tab-pilote |
| Préparation | Affecter un média à un emplacement et revérifier | tab-preparation |
| Produit | Détourage : lancer / refaire / écarter | tab-produit |
| Marque | Supprimer une piste | tab-marque |
| Marque | Palette : choisir / revenir à vos couleurs | tab-marque |
| Marque | Kit réseaux (créer / recréer), ligne éditoriale (refaire) | tab-marque |
| Marque | Charte PDF, planche d'identité (créer / refaire) | tab-marque |
| Site | Importer / modifier mon thème Shopify | tab-boutique, theme-import |
| Site | Animations (activer, intensité, parallaxe) | tab-boutique |
| Site | Versions : restaurer une version précise (partiel : `theme.undo`) | tab-boutique |
| Site | Retirer le site / remettre en ligne une ancienne version | site-publication |
| Site | Domaine : désactiver / réactiver / retirer | site-publication |
| Demandes reçues | Renvoyer l'e-mail, effacer ; destinataires (ajouter / retirer / renvoyer le lien) | site-publication |
| Catalogue | Réordonner, archiver un produit ; déconnecter une boutique | tab-catalogue |
| Rendez-vous | Passer en réservations réelles / revenir en démonstration ; déplacer une réservation | tab-rendez-vous |
| Images | Restaurer depuis la corbeille ; pack CapCut | tab-images, asset-viewer |
| Vidéos | Importer une vidéo ; chercher des plans libres (création IA : partielle) | tab-videos |
| Publications | Dupliquer / supprimer ; approuver (sélection, 7 jours, version) ; déprogrammer ; pause / reprise | social-studio |
| Pilote automatique | Activer / désactiver / réglages | social-autopilot |
| Publicités | Supprimer une campagne ; export CSV pour le gestionnaire | ad-campaigns |
| Blog | Marquer comme prêt ; retirer du blog ; export HTML / WordPress ; supprimer / restaurer ; idées de sujets (partiel) | tab-blog |
| Fichiers | Restaurer depuis la corbeille ; supprimer un dossier vide (partiel) | tab-fichiers |
| Prompts | Créer, supprimer un prompt ; « Compléter avec le projet » | tab-prompts |
| Connexions | Déconnecter un compte | tab-connexions |
| Compte | Supprimer le projet ; forfait (payer et réactiver, changer, résilier, annuler la résiliation) | delete-project, project-subscription |

Actions sensibles (suppression de projet, forfait, retrait du site, domaine, déconnexion, publication) : par SYNA, au
mieux proposition + accord explicite + exécution native ; les actions réelles externes restent non exécutées en recette.
Ce relevé s'ajoute à la matrice ; il ne la remplace pas. Total indicatif : ~60 actions absentes ou partielles.
