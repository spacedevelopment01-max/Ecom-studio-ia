# Durée affichée d'une prestation du profil

Extension ciblée du contrat #390 : field service-duration avec serviceKey natif obligatoire. « Mets la durée de la prestation du profil “Diagnostic” à “45 min” », « Change la durée de la prestation du profil “clé” pour “environ une heure” », « Efface la durée de la prestation du profil “Diagnostic” ». Le texte affiché n'est jamais converti en durée de réservation ni utilisé pour déplacer un rendez-vous. Les demandes ambiguës profil/réservation restent des questions gratuites.

Même protocole serviceProfile / aperçu diff / accord gratuit séparé / version CAS / empreinte complète / TTL / reçu relu version+1. Le contrôleur existant accepte seulement ce champ avec clé et toutes ses garanties financières inchangées. Texte brut60caractères maximum comme le formulaire, zéro fournisseur/achat. La branche prix affiché utilise le même chemin scalaire, avec ses huit tests maintenus.

Défaut natif réel : l'effacement de duration dans le PATCH répondait200 mais gardait “30 min” via la fusion native des métadonnées. Test rouge avant correction. Signal explicite duration:undefined au PATCH et dans le moteur, DAO/alias inchangés ; les prix, identités, sources et autres prestations restent exacts. Aucun champ de durée numérique ou service réservable modifié.

Preuves :7 nouveaux tests passent, incluant native rouge→vert, comparaison PATCH authentifié, thème intégral de réservation identique, effacement, clé/ambiguïté, valeurs exactes sans calcul, limites/chaînes/no-op, conflit manuel, reprise idempotente/reçu avec clé, annulation/TTL et Créer épuisé.68 régressions passent :prix8,nom7,coordonnées8,contenu29,CAS natif8,horaires8. Types propres. Aucun test supprimé ni garde réduit.

À Claude : carte identifiant clairement “durée affichée du profil”, aperçu texte complet, accord/verrou et recette indépendante4modes17s dans un même Studio compilé. Le backend seul ne qualifie pas ces parcours UI. Description, création/suppression de prestation du profil et services réservables restent des unités distinctes ouvertes.
