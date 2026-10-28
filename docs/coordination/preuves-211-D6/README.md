# D6 — état natif et capacités : preuves réelles

Build propre servi : `012c989fc32fc647dbb5f46bc50dbc4c600483cb`. Produit multi 1440 px, service 390 px. Instances et données fictives isolées, fournisseur HTTP local simulé ; zéro fournisseur réel/coût réel.

La tâche image est un historique fictif inséré directement en échec ; le moteur image n’a pas été exécuté. Les réponses textuelles sont imposées par le simulateur : elles ne qualifient pas une IA réelle. Les relevés natifs, consentements, appels, navigation et contrôles serveur sont réellement traversés.

[Traces et mesures](verifications.json) · [diagnostic du faux positif vidéo](diagnostic-test-video.json)

## produit-multi

[MP4 original des interactions](videos/produit-multi.mp4?raw=1)

- [produit-multi-devis-separe](captures/produit-multi-devis-separe.png?raw=1)
- [produit-multi-etat-natif](captures/produit-multi-etat-natif.png?raw=1)
- [produit-multi-meme-conversation-autre-onglet](captures/produit-multi-meme-conversation-autre-onglet.png?raw=1)
- [produit-multi-mode-original-non-disponible](captures/produit-multi-mode-original-non-disponible.png?raw=1)
- [produit-multi-operation-absente-honnete](captures/produit-multi-operation-absente-honnete.png?raw=1)
- [produit-multi-question-exacte](captures/produit-multi-question-exacte.png?raw=1)
- [produit-multi-reponse-sourcee](captures/produit-multi-reponse-sourcee.png?raw=1)

## service

[MP4 original des interactions](videos/service.mp4?raw=1)

- [service-devis-separe](captures/service-devis-separe.png?raw=1)
- [service-echec-historique-observe](captures/service-echec-historique-observe.png?raw=1)
- [service-etat-natif](captures/service-etat-natif.png?raw=1)
- [service-meme-conversation-autre-onglet](captures/service-meme-conversation-autre-onglet.png?raw=1)
- [service-mode-original-non-disponible](captures/service-mode-original-non-disponible.png?raw=1)
- [service-operation-absente-honnete](captures/service-operation-absente-honnete.png?raw=1)
- [service-question-exacte](captures/service-question-exacte.png?raw=1)
- [service-reponse-sourcee](captures/service-reponse-sourcee.png?raw=1)

Configuration déclarée ≠ fournisseur utilisable ; job terminé ≠ livraison vérifiée. Les 48 opérations sont un inventaire partiel : les absences restent signalées, le mode Site original est indisponible. Les détails des modèles sont omis des JSON publiés, pas des contrôles natifs. PNG inchangés ; planches réduites pour naviguer, MP4 sans coupe/accélération (durées/images comparées aux WebM).
