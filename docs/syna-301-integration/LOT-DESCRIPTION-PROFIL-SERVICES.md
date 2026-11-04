# Description fournie d'une prestation du profil

Extension ciblée : serviceProfile field service-description, serviceKey natif obligatoire, même aperçu/accord gratuit/contrôleur/reçu que prix et durée. Phrases : « Remplace la description de la prestation du profil “Diagnostic” par “Texte fourni” », « Mets la description de la prestation du profil “clé” à “Texte fourni” », « Efface la description de la prestation du profil “Diagnostic” ». Une description multiligne fournie est conservée intégralement. Aucun fait généré ou inventé.

Moteur natif saveServices, CAS/empreinte complète/TTL/isolement projet et onglet Activité. Limite brute native1000 caractères ; contenu actif, cible ambiguë ou commande chaînée refusés. Effacer signifie description vide, pas supprimer la prestation. Identités/alias/prix/durées/autres prestations et thème de réservation conservés. Reçu relu version+1, coût0, providerCalls0, financialConsentfalse ; aucun contenu acquis ni service réservable réécrit.

Le garde de routage reconnaît aussi les mentions au pluriel : une demande globale de descriptions/prix/durées de prestations reste une clarification gratuite, jamais une modification globale ou un devis implicite. Un test a reproduit l'absence de route déterministe au pluriel avant cette correction.

Preuves :7 nouveaux tests passent (comparaison route PATCH authentifiée, texte multiligne/effacement, clés/ambiguïtés, limites/no-op/contenu actif/chaîne/pluriel, conflit manuel/annulation/TTL, Créer épuisé/retry/reçu, propriétaire/onglet/drapeau).59 régressions passent :prix8,durée7,nom7,coordonnées8,contenu29. Types propres. Aucun autre moteur réécrit, aucun test supprimé, aucun fournisseur ou donnée client.

À Claude : nom exact du profil dans la carte, aperçu du texte complet (multiligne), accord gratuit/verrou/reload et recette indépendante4modes17s sur un même descendant compilé. La recette UI de ce champ reste ouverte ; ne pas la déduire de ces tests moteur. Création/suppression de prestation et services réservables demeurent des unités distinctes.
