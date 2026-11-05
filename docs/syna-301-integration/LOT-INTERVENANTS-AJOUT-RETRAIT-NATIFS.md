# Ajout et retrait ciblés des intervenants natifs

## Contrat livré

Le moteur Prestations accepte `staffAdd` (nom, spécialité, compétences et jours natifs) ou `staffRemove: { id }`, exclusivement et uniquement pour un salon. L’ajout conserve les blocs acquis, leurs champs inconnus et leur ordre. Les identifiants bruts et normalisés sont réservés pour éviter une collision. Un identifiant absent ou ambigu ne désigne jamais un autre intervenant.

Le retrait est refusé en présence de rendez-vous confirmés du jour local ou à venir, sans annulation ni réattribution implicite. Les erreurs de lecture des rendez-vous ferment l’autorisation. Les rendez-vous passés ou annulés restent inchangés. Le retrait du dernier intervenant actif avertit que le calendrier ne proposera plus de créneau, sans changer son mode.

Deux tests supplémentaires ont démontré qu’un nom affiché effacé masquait l’identité canonique d’une prestation ou d’un intervenant acquis. Le calcul d’identité utilise maintenant un libellé interne uniquement pour normaliser un identifiant existant. Ce libellé n’est jamais enregistré ni affiché ; les noms vides et les rendez-vous sont conservés.

## Preuves exécutées

25 nouveaux tests, 92 cas distincts dans cinq fichiers verts, puis types verts. Les 23 premiers cas sont rouges sur le parent, puis deux cas de libellé effacé sont rouges avant leur correction. Le cas du dernier intervenant a été renforcé avec un bloc acquis au nom vide : l’avertissement dépend des intervenants réellement reconnus par le moteur. Ce cas est rouge avant ajustement, puis vert ; il ne constitue pas un 26e test.

Tests avec SQLite isolée, sessions et route PUT natives, sources et rendez-vous fictifs, fetch interdit et garde réseau. Contrôles des versions, voisins, profils, identifiants, dates locales, erreurs SQL, limites, ordre implicite et finances inchangées. Logs locaux : `/tmp/parity301-native-staff-create-remove-{parent-red,final}.log`, `/tmp/parity301-native-staff-empty-label-red.log`, `/tmp/parity301-native-staff-last-active-{red,final}.log` et `/tmp/parity301-native-staff-create-remove-types-delivery-check.log`.

## Limites et suite

Parent #456 / 35bb6fc3df09c832b75fb01b1d91f28d5550871e. Ce lot fournit le moteur ciblé ; il ne revendique pas une carte ni un parcours conversationnel ou navigateur. Le remplacement manuel complet de la liste garde sa politique acquise. Le raccordement SYNA doit encore ajouter intention naturelle hors citations, aperçu, accord gratuit explicite, transaction reçu/version, conflits et reprise sans doublon. Aucun nouveau droit A1 ni activation n’est accordé.

Aucun appel fournisseur, projet client, fusion ou déploiement. CI du commit livré à vérifier séparément.
