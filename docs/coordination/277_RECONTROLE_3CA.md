# #277 — recontrôle du candidat 3ca5ccb0 après retour à Claude

**Version applicative recontrôlée : `3ca5ccb08a9b995d5a86d9024f2ca7e27d86b8e1`, PR #278.** Ce document complète le [NO-GO précédent sur f0019338](277_RESULTATS_F001.md) sans modifier ses preuves. Le traitement du défaut conditionnel est accepté dans les **modes explicitement pris en charge** ; **le verdict global attend encore la CI exacte à la rédaction**. Lire le dernier commentaire daté dans #277/#278 pour sa conclusion.

## Modification examinée, pas de seconde intégration

Claude a reproduit le problème, limité son périmètre et choisi de **documenter/signaler** les adresses d’écoute non prises en charge, en conservant les protections. Deux fichiers applicatifs changent depuis f001 : `src/instrumentation.ts` et le nouveau `src/lib/sites/launch-check.ts`. L’installation du masquage des secrets précède le diagnostic ; le message ne prend que des littéraux de loopback validés. Aucun handler, projection métier, moteur SYNA, permission, tarif, dépendance ou thème n’est modifié. [Liste exacte](preuves-277-3ca/perimetre.json).

**Le 404 avec `-H 127.0.0.1` n’est pas déclaré corrigé.** Il reste une limite de lancement de Next, maintenant annoncée. Les modes documentés sont sans `-H` (commandes Studio/Docker), `-H localhost` ou `-H 0.0.0.0`. Codex n’a ouvert aucun serveur sur une interface publique ; son recontrôle navigateur utilise **localhost seulement**. Les résultats antérieurs du mode 127 sont conservés et ne sont pas convertis en succès.

Cette qualification est proportionnée pour une revue propriétaire de l’intégration : le chemin réellement utilisé par les lanceurs documentés n’introduit pas ce défaut, et une configuration non supportée n’est plus silencieuse. Aucun marqueur entrant n’est reconnu sans vérification du Host, aucune garde n’a été retirée. La prise en charge de tous les binds littéraux n’est pas promise. L’autorisation de déployer/activer reste indépendante.

## Recontrôle indépendant sur la nouvelle tête exacte

- Nouveau checkout détaché de **3ca**, nouveau stockage de build et **nouveau build propre réussi**. `/api/version` des nouveaux serveurs : **3ca / production / clean / compiled-build**. Ni HEAD mouvant de Claude ni ancien build f001 présentés comme cette version.
- **34 tests ciblés existants** réussis (4 fichiers : intégration, hébergement, fiabilité, domaines), puis **5 sondes croisées Codex** réussies sur le nouveau code, fichier de test identique à celui publié dans #279. Types réussis. Les autres moteurs sont inchangés ; les 109 +149 ciblés et recettes SYNA/logo de f001 ne sont pas déclarés rejoués localement sur 3ca. La CI de 3ca contrôle leur combinaison complète.
- **Vérification du vrai démarrage compilé**, sans instrumenter source/bundle : avec `SITES_DOMAIN`, le message `[sites] Lancement … non pris en charge` est présent sur **127.0.0.1**, absent sur **localhost**. La version est contrôlée dans les deux processus. [Résultat](preuves-277-3ca/avertissement-demarrage.json).
- Recette métier complète rejouée sur **le build 3ca** et ses vrais hôtes locaux : agence (achat/location), artisan (réalisation), salon (prestations/réservation). **Dix rendus desktop/mobile à 200**, aucune image cassée ni débordement, refus des routes Studio sur l’hôte public ; accord/version/CSRF/droits 428/409/403/404/401.
- Demande de devis reçue par le POST du site et **enregistrée dans la base fictive**, sans vrai e-mail envoyé. Réservation par l’API publique native : **201**, une ligne fictive. Correction humaine : site inchangé avant publication, V2 visible, restauration V1 vérifiée **par HTTP**. Ni agenda externe ni publication publique réelle.

[Commandes, SHA, dates et empreintes](preuves-277-3ca/commandes.json) · [Résultats HTTP/navigateur](preuves-277-3ca/parcours-metier.json).

Les quatre captures proviennent des nouveaux serveurs 3ca. Illustrations techniques synthétiques, **pas de photos client ou d’évaluation créative professionnelle** : [agence mobile](preuves-277-3ca/01-agence-mobile.png), [agence ordinateur](preuves-277-3ca/02-agence-ordinateur.png), [service mobile](preuves-277-3ca/03-service-mobile.png), [service ordinateur](preuves-277-3ca/04-service-ordinateur.png).

## CI et verdict

[CI propre au candidat 3ca : 41188838689](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41188838689), encore en cours au relevé de ce document. **Pas de vert global attribué à partir de f001 ou 731277d5**. La CI de la PR de tests #279 est elle aussi distincte. Aucun check n’a été retiré ni délai augmenté.

**Conclusion locale : traitement de H1 accepté pour le périmètre documenté, contrôles affectés réussis. GO final pour examen propriétaire seulement après les checks requis sur la tête figée**, ou NO-GO si une nouvelle anomalie étayée apparaît. Cette revue n’autorise ni merge main ni activation.

Les limites fonctionnelles demeurent : outils SYNA métier/devis/RDV encore non raccordés et présentés comme tels, composition détaillée des prestations partielle, qualification fournisseur/qualité créative/CMS installés et SMTP/DNS publics non faite. Les tests de réservation et de publication sont réels **uniquement dans les fixtures locales**. Les 35 avertissements Shopify connus restent dans les preuves précédentes, pas effacés. Aucun nouveau lot SYNA/UX, aucune des neuf propositions #211 développée.

**0 appel fournisseur / 0 € réel ; aucun client, donnée privée, main, composition validée, déploiement ou activation réelle modifié.** Claude reste seul opérateur des corrections de l’intégration et le propriétaire garde la décision finale.
