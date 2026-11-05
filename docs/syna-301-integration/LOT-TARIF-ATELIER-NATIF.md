# Tarif d’un atelier natif exact, prix acquis conservés

## Contrat

`workshopPricePatch:{id:"ID canonique natif",price:montant}` strict/exclusif. Bornes0..100000 réutilisées depuis serviceSchema natif, montant au centime exact par multipleOf0.01, aucun arrondi, null/chaîne/sous-centime refusés. 0 est un tarif explicitement gratuit. Schéma/coercition price number du bloc atelier et normalisation core réutilisés ;calendrier cabinet unique,identité raw/canonique etvoisins acquis non ambigus. Aucun autre champ changé.

GET prestations.workshops ajoute price natif effectif. L’aperçu natif ne crée aucune version/inscription ;route PUT ifVersion et transaction natives. **Tarif uniquement pour les nouvelles inscriptions** ;toutes les données des inscriptions déjà acquises,prix inclus,restent inchangées. Aucune rétrofacturation,paiement,notification,activation ou mutation de capacité/date/heure/token/voisin. Ce réglage métier gratuit n’est pas une dépense IA.

## Preuves

**13 nouveaux tests,67 cas distincts dans trois fichiers et types verts.** Trois scénarios parent réellement rouges (0/29.90/0.29),puis tous verts. Vraie inscription fictive acquise25€ :aperçu/PUT/GET/sourceversion exacte,toutes lignes/jetons/finances conservées ;nouvelle inscription fictive seule prend le nouveau prix.0gratuit respecté,0.29 exact sans faux rejet/arrondi,maximum100000 exact. Ancienne inscription jamais réécrite.

Négatif/au-delà borne/sous-centime/chaîne/null/champs/mélange/version obsolète/mauvais moteur/IDraw-inconnu/collisioncanonique avec titre vide refusés.54 régressions capacité native etconversationnelle vertes,même compte/places/reprises/accord libre. Aucun test/garde supprimé,réseau etfetch fournisseurs interdits.

Logs /tmp/parity301-native-workshop-price-{parent-red,final,types}.log. Parent#479/5cb8cfbadbe091ff9f084ea743d485463cf2c37e. CI exacte du commit livré à suivre. Aucun DTO/flag/carte naturelle encore dans ce lot ;prochaine carte doit distinguer prix par personne futur et prix acquis immuables,accord gratuit séparé. Aucun client réel,dépense fournisseur,paiement,activation,main ou déploiement.
