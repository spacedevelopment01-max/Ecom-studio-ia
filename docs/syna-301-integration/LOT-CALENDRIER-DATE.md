# Déplacement éditorial local — backend partiel

Base #374 d315af5ea0c82f646bc531b40f941a4fa777934d ; aucun fichier graphique modifié.

## Contrat pour Claude

`localCalendarExecution.enabled`, présentation `localCalendar`, schéma `syna-local-calendar-1`, états ambiguous/proposed/applied. `target:{postId,title,status,timezone}`, diff `{before,after}` en millisecondes, accord séparé et receiptId relu. `scheduling:false`, `publication:false`, coût et appels zéro. `confirm-calendar` avec confirmation:true/révisions/requestId ; `cancel-calendar`. Transport `createLocalCalendarConfirmation`, stockage syna-free-calendar:<conversationId>, événement natif existant `studio:social-changed` pour relecture du calendrier. Carte et verrou partagé à raccorder par Claude, formatage des dates AVEC fuseau obligatoire.

Depuis l’onglet Calendrier : « Décale ma prochaine publication de 2 jours », ou « Déplace ma prochaine publication au vendredi à 18h ». Réutilise planSocialEdit/movedAt/moveToWeekday/moveRefusal/editPostV2 natifs. Une seule prochaine date unique ; égalité de dates = clarification, jamais choix implicite d’un réseau. Uniquement planned/draft/review. Aucun approved/scheduled/paused/failed/sent, aucun bulk, aucune approbation, aucune programmation ni envoi. Les dates locales de brouillons ne constituent pas un envoi programmé.

Avant accord, empreinte entière du calendrier natif et paramètres du projet ; la moindre correction concurrente, nouvelle prochaine publication ou approbation rend l’accord périmé. Recontrôle propriétaire/forfait/onglet/drapeau/date native avant écriture. Relecture exacte de la ligne native : seuls scheduled_at et updated_at changent. Pas de fournisseur, connexion ou tâche planifiée créée. Heures inexistantes/ambiguës au changement d’heure clarifiées ; aucune conversion silencieuse. Limites d’horizon du forfait conservées.

## Vérifications exécutées

16 nouveaux tests métier (produit fictif, brouillon natif) : proposition sans écriture, accord explicite, relecture ligne entière, dépenses/jobs inchangés ;7 statuts à risque refusés ; égalité/bulk/commande chaînée/absence de date ;3 conflits (texte manuel/nouvelle prochaine/approbation) ; annulation/expiration/horizon/passé ; retry identique/propriétaire/onglet ; heure d’été inexistante et heure d’hiver ambiguë Europe/Paris. Première passe14 tests :13 passaient, une attente du harnais supposait les secondes alors que le moteur édite à la minute ; fixture alignée à la minute. Dernière passe16 métier+16 registre=32 passent. Transport63 confirmations (56 conservés+7 calendrier) :63 passent dans la passe93 (14 métier+63 transport+16 registre). Types propres, garde réseau lot9 systématique, aucun test supprimé.

La recette compilée Encre/Plein ordinateur/téléphone avec17s reste à fournir après intégration de la carte Claude ; aucune certification complète de calendar.update, des réseaux réels ni d’un envoi. CI du SHA livré à qualifier.
