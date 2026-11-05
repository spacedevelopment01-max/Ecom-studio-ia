# Dates de fermeture natives : refuser les dates impossibles

5 novembre 2026, Europe/Paris. Préparation au raccordement SYNA des fermetures datées, après #426/8cb35ff0, chaîne issue de main6354f327/#422. Ne change ni UI Claude ni réservation cliente.

Cinq vrais PUT ont enregistré à tort 2026-02-31, 2027-02-29, 2026-13-01, 2026-11-31 et 2026-12-03..2026-12-01 (HTTP200 au lieu de400). Le schéma natif contrôlait uniquement la forme AAAA-MM-JJ. Ajout d’un contrôle UTC avec aller-retour exact ISO, puis ordre début≤fin. Aucune conversion silencieuse, aucune migration/normalisation des fermetures acquises.

8nouveaux tests HTTP :5rouges avant correctif puisverts ;3valides pour vide explicite,29février2028 etplage/multiples dates. 66tests/6fichiers verts avec heures natives,éditeur etles3moteurs de réservation ;types verts. Logs locaux /tmp/parity301-closure-{red,green,types}.log. Fetch fournisseur interdit/garde réseau active/données fictives isolées ;aucune dépense ou client.

Limites : ce correctif ne raccorde pas encore une carte de conversation. Les moteurs salon/cabinet bornent l’expansion d’une plage à400jours ;aucun assouplissement ni promesse sur les longues périodes. Le prochain adaptateur doit borner ses demandes et préserver toutes les fermetures acquises. CI complète à suivre sur le SHA de ce lot. Aucun merge main, activation ou déploiement.
