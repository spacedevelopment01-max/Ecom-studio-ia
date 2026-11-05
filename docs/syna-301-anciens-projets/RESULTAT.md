# #301 C03 — anciens projets (lecture seule A1) : rangement gratuit des fichiers depuis SYNA

Contrat serveur : #313 de Codex (`recovery.localEdits.ops`, drapeau `STUDIO_CONVERSATION_EXISTING_LOCAL`), inclus dans la
convergence #348 (`e2d8c8ed`). Interface : une seule règle `localEditAllowed(view, op)` (`src/lib/existing-local-edits.ts`)
utilisée par les cartes Site et Fichiers et par leurs transports : sur un ancien projet, seules les opérations listées par
le serveur s'ouvrent ; tout le reste reste en lecture seule.

Recette navigateur `scripts/syna301-anciens-projets-recette.ts` (stockage isolé, clés vides, réseau hors boucle locale
refusé, comptes fictifs) — **4/4 parcours réussis**, Encre et Plein cadre, ordinateur 1440 px et téléphone 390 px :

1. ancien projet ouvert dans Fichiers : avis « lecture seule » visible, mode du compte appliqué ;
2. « Rédige trois slogans pour ma boutique » : message enregistré seulement, aucun bouton de devis, aucune tâche ;
3. fichier coché + « Renomme ce fichier en « … » » : carte **Gratuit — 0 €**, rien d'écrit avant l'accord ;
4. « Confirmer gratuitement » : reçu « Enregistré et relu », nom écrit en base, liste native à jour, aucune Préparation
   créée (le projet reste un ancien projet en lecture seule), pas de débordement horizontal ;
5. rechargement : reçu conservé.

0 appel IA, 0 requête externe, 0 erreur JavaScript (`RESUME-ANCIENS-PROJETS-301.json`, captures dans `captures/`).

Premier passage : 3/4 — en Encre ordinateur, le clic d'ouverture de SYNA après rechargement est arrivé avant
l'hydratation (machine chargée par la requalification en parallèle). La recette réessaie désormais l'ouverture (3 fois
au plus) ; aucun faux succès possible (le reçu doit être lu dans le panneau).

Non vérifié : retouche Site gratuite sur un ancien projet (`local-site`) — le serveur ne l'ouvre que si l'opération est
listée ; couverte par les tests unitaires, pas par cette recette navigateur.
