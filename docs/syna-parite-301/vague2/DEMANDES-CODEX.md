# #301 vague 2 — actions SYNA absentes, priorisées, avec preuve (relevé sur `e2d8c8ed`, convergence #348)

Méthode : 16 phrases qu'un client écrit vraiment, envoyées à SYNA sur un projet de services avec une section désignée
(`tests/syna301-sondes-348.test.ts`, relevé `preuves/sonde-phrases-e2d8c8ed.json`), puis les mêmes phrases données au
moteur local natif de l'onglet Boutique (`localFirst`, même section ; relevé `preuves/sonde-natif-local-first-e2d8c8ed.json`).
Fournisseurs refusés, 0 appel IA, aucune écriture sans accord : ces trois invariants sont gardés par le test.

Résultat : **1 phrase sur 16** ouvre une carte gratuite (titre exact). **14** aboutissent à « Réflexion IA sur devis et
confirmation. Aucun outil métier n'est exécuté » ; la phrase SEO est mal aiguillée vers la grammaire du titre de section.
Or le moteur local natif fait **5** de ces phrases gratuitement. Rien n'est inventé côté interface : chaque demande
ci-dessous attend un contrat serveur (proposition → aperçu avant / après → accord explicite → écriture native relue →
reçu, annulation si le natif la permet) ; l'interface suivra comme pour Fichiers, Contenus et Demandes.

| Priorité | Domaine / opération | Phrase sondée | SYNA aujourd'hui | Natif aujourd'hui | Contrat demandé |
|---|---|---|---|---|---|
| **P0** (moteur local d'abord) | C05 `theme.exact-edit` — couleurs | « Mets le titre de cette section en rouge » ; « Change la couleur principale du site en #1e3a8a » | devis, aucune action | gratuit : `section_colors` (texte #B42318 ; fond #1E3A8A, section seule, annoncé) | Étendre la proposition `local-site` à **toute opération que `localFirst` accepte sur la cible A2** (`theme-field` / `theme-section`), avec le même `confirm-local-site`, la même version de base et le même reçu. L'interface existante (`conversation-local-site.tsx`) affiche déjà avant / après et le reçu. |
| **P0** | C07 `native.sections` — ajout | « Ajoute une section FAQ après cette section » | devis | gratuit : `add_section` | idem (même passerelle). |
| **P0** | C05 `theme.undo` | « Annule la dernière retouche du site » | devis | gratuit : retour à la version précédente | Route la phrase vers l'annulation native avec reçu (déjà prouvée par la recette `closure-ui` via l'outil). |
| **P1** | C06 `theme.select` | « Choisis le thème Rive pour mon site » | devis | gratuit : changement de direction | Proposition gratuite de thème (aperçu, accord, version) ; l'outil thème existe (recette `specialists-tools-theme-ui` ✓) mais la phrase ne l'atteint pas. |
| **P1** | C15 `seo.update` | « Remplace le titre SEO de la page d'accueil par « … » » | **mal aiguillée** vers la grammaire du titre de section (« Précisez… ») | page SEO native (`native.seo.metadata-only-delivery`) | Grammaire SEO distincte (titre / description d'UNE page désignée), avant / après, accord, relecture. À défaut, ne pas proposer la grammaire du titre de section pour une phrase SEO. |
| **P1** | C07 `native.sections` — masquer / supprimer | « Masque cette section » ; « Supprime cette section » | devis | non compris par la phrase (ops `toggle_section` / `remove_section` existent) | Grammaire explicite + accord distinct pour la suppression (perte de contenu) ; annulation native. |
| **P1** | C22 `services.booking` / `appointments.settings` | « Change les horaires du mardi : 9 h – 18 h » | devis | réglages natifs (Rendez-vous) | Contrat de réglage des horaires : avant / après, accord, relecture ; aucune réservation existante modifiée en silence. |
| **P1** | C21 `services.update` | « Renomme cette prestation en « … » » | devis | natif (fiche services) | Cible A2 `service` (id + empreinte), renommage exact, accord, relecture. |
| **P2** | C16 `calendar.update` | « Déplace ma prochaine publication au 12 novembre » | devis | natif | Déplacement d'un **brouillon** seulement (aucune publication), gratuit, avec reçu ; publication réelle hors champ. |
| **P2** | C12 `catalogue.stock` | « Mets le stock de ce produit à 12 » | devis (aucune fiche désignable) | natif (`native.stock.patch-target-version`) | Cible A2 `catalogue-item` (fiche + variante + version) pour que la phrase atteigne l'outil stock déjà prouvé par `catalogue-ui`. |
| **P2** | C07 `native.pages` | « Ajoute une page « Nos garanties » » | devis | Boutique › Structure seulement | Contrat de page vide (titre, chemin, menu) avec accord. |
| **P1** | C19 `native.ad-document-edit` | « Agrandis le titre de la création sélectionnée » | **refus 422 sur 18/18 créations brutes du moteur V2** (« déplacerait un autre calque ») ; carte gratuite complète seulement quand le titre a de la place | éditeur natif | Le moteur local décale déjà l'accroche pour éviter le chevauchement : accepter ces déplacements dans la proposition, montrés dans l'aperçu « après » et listés, ou proposer « réduis l'accroche ». Aujourd'hui la fonction est inutilisable sur une création neuve. Preuve : `preuves/sonde-publicite-18-creations-e2d8c8ed.json`. |
| P2 (ergonomie) | C19 désignation | — | deux gestes : « Désigner le titre pour SYNA » puis « Utiliser ce titre enregistré » | — | Un seul geste quand la désignation vient de l'éditeur ouvert (même version, même calque). |
| P2 | C01 `conversation.attachments` / C13 `images.upload` | « Lien / photo » | lien conservé sans consultation ; photo non raccordée (annoncé) | Fichiers › Importer | Pièce jointe → bibliothèque du projet (même contrôle que l'import natif), puis désignable. |

Ce qui n'est **pas** demandé : aucune publication réelle, aucun appel payant, aucun nouveau fournisseur.
