# Voir SYNA — preuves F1

**Vrai Studio compilé isolé, fournisseur HTTP local simulé. Aucun appel IA réel.** Code capturé : `ad41f4301052a79dfe4e2e735ba8f6a40b5de476`. Les PNG sont des captures originales ; les longues captures complètes se lisent en ouvrant le fichier à sa taille originale.

## Écrans essentiels

| Écran | Ordinateur (produit) | Téléphone (service) |
|---|---|---|
| Entrée libre, avant formulaire | [PNG](captures/1-produit-entree.png) | [PNG](captures/2-service-entree.png) |
| Dialogue, message de SYNA et choix lisibles | [PNG](captures/1-produit-dialogue-lisible.png) | [PNG](captures/2-service-dialogue-lisible.png) |
| Site, SYNA ouvert | [PNG](captures/1-produit-site-agent-ouvert.png) | [PNG](captures/2-service-site-agent-ouvert.png) |
| Site, SYNA replié | [PNG](captures/1-produit-site-agent-replie.png) | [PNG](captures/2-service-site-agent-replie.png) |
| Outils manuels conservés | [PNG](captures/1-produit-site-outils-conserves.png) | [PNG](captures/2-service-site-outils-conserves.png) |
| Version restaurée | [PNG](captures/1-produit-site-version-restauree.png) | [PNG](captures/2-service-site-version-restauree.png) |

## Vidéos réelles des interactions

[Produit — MP4](videos/produit.mp4) · [Service — MP4](videos/service.mp4) · [Reprise après coupure — MP4](videos/reprise.mp4)

Enregistrements Chromium automatiques, sans montage ni changement de vitesse. Leur rythme dépend du faux fournisseur rapide, pas d’un modèle réel. Mettre en pause pour lire ; voir aussi les PNG et les transcriptions exactes. Les sources WebM sont reproductibles par le harnais et conservées dans les artefacts CI. [Inspection technique des clips](videos-inspection.json).

## Scénarios et limites

- Produit : capteurs de ruches, choix multiple et réponse libre, inconnu puis correction et réouverture.
- Service : instruments apportés par les clients, devis et rendez-vous, sans vente d’instruments.
- Les deux parcours demandent un devis puis un accord avant chaque réponse ; un seul appel simulé par dialogue.
- Dans Site : largeur 720 → 1136 px au repli sur ordinateur ; panneau dédié sur téléphone, aperçu et outils conservés ; section modifiée puis version restaurée, trois versions gardées.
- Le Site est une fixture technique native, avec textes de test et diagramme local annoncé comme illustration technique. Il ne qualifie pas une création professionnelle ou une IA réelle.
- L’introduction est passée par son vrai bouton ; le conseil de tutoriel est capturé puis fermé par son vrai bouton après vérification du bouton central. Aucun élément supprimé ou clic forcé.
- Ces vues 390/360 px sont celles de Chromium redimensionné, pas d’un téléphone physique ou de Safari.

[Conversation produit exacte](produit-conversation.json) · [conversation service exacte](service-conversation.json) · [preuve HTTP/navigateur](api-proof.json) · [rapport](../211_LOT_F_RESULTATS.md)

## Toutes les captures originales

| Fichier | Dimensions |
|---|---|
| [1-produit-autre-onglet-meme-memoire.png](captures/1-produit-autre-onglet-meme-memoire.png) | 1440 × 1203 |
| [1-produit-correction-reouverte.png](captures/1-produit-correction-reouverte.png) | 1440 × 2924 |
| [1-produit-devis.png](captures/1-produit-devis.png) | 1440 × 1210 |
| [1-produit-dialogue-lisible.png](captures/1-produit-dialogue-lisible.png) | 1440 × 960 |
| [1-produit-entree.png](captures/1-produit-entree.png) | 1440 × 960 |
| [1-produit-manuel-conserve.png](captures/1-produit-manuel-conserve.png) | 1440 × 960 |
| [1-produit-memoire.png](captures/1-produit-memoire.png) | 1440 × 2521 |
| [1-produit-projet-repris.png](captures/1-produit-projet-repris.png) | 1440 × 960 |
| [1-produit-question-360.png](captures/1-produit-question-360.png) | 393 × 2445 |
| [1-produit-question.png](captures/1-produit-question.png) | 1440 × 1940 |
| [1-produit-site-agent-ouvert.png](captures/1-produit-site-agent-ouvert.png) | 1440 × 960 |
| [1-produit-site-agent-replie.png](captures/1-produit-site-agent-replie.png) | 1440 × 960 |
| [1-produit-site-conseil-premiere-visite.png](captures/1-produit-site-conseil-premiere-visite.png) | 1440 × 960 |
| [1-produit-site-format-telephone.png](captures/1-produit-site-format-telephone.png) | 1440 × 960 |
| [1-produit-site-outils-conserves.png](captures/1-produit-site-outils-conserves.png) | 1440 × 960 |
| [1-produit-site-version-restauree.png](captures/1-produit-site-version-restauree.png) | 1440 × 960 |
| [2-service-autre-onglet-meme-memoire.png](captures/2-service-autre-onglet-meme-memoire.png) | 390 × 1406 |
| [2-service-correction-reouverte.png](captures/2-service-correction-reouverte.png) | 390 × 3577 |
| [2-service-devis.png](captures/2-service-devis.png) | 390 × 1478 |
| [2-service-dialogue-lisible.png](captures/2-service-dialogue-lisible.png) | 390 × 844 |
| [2-service-entree.png](captures/2-service-entree.png) | 390 × 844 |
| [2-service-manuel-conserve.png](captures/2-service-manuel-conserve.png) | 390 × 1212 |
| [2-service-memoire.png](captures/2-service-memoire.png) | 390 × 3057 |
| [2-service-projet-repris.png](captures/2-service-projet-repris.png) | 390 × 844 |
| [2-service-question-360.png](captures/2-service-question-360.png) | 360 × 2367 |
| [2-service-question.png](captures/2-service-question.png) | 390 × 2323 |
| [2-service-site-agent-ouvert.png](captures/2-service-site-agent-ouvert.png) | 390 × 844 |
| [2-service-site-agent-replie.png](captures/2-service-site-agent-replie.png) | 390 × 844 |
| [2-service-site-conseil-premiere-visite.png](captures/2-service-site-conseil-premiere-visite.png) | 390 × 844 |
| [2-service-site-format-telephone.png](captures/2-service-site-format-telephone.png) | 390 × 844 |
| [2-service-site-outils-conserves.png](captures/2-service-site-outils-conserves.png) | 390 × 844 |
| [2-service-site-version-restauree.png](captures/2-service-site-version-restauree.png) | 390 × 844 |
| [3-reprise-apres-reponse-perdue-390.png](captures/3-reprise-apres-reponse-perdue-390.png) | 390 × 844 |
