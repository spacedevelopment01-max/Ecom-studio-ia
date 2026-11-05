# Intervenant salon : patch natif ciblé

Parent #440 /f1cf44ae0584a377d06a6371634417d806e156f3. Prépare les intentions SYNA ; aucun nouveau contrat conversationnel ni composant graphique dans ce lot.

Nouveau `staffPatch:{id,name?,title?,skills?,days?}` dans le même moteur `prestationsInput`/aperçu/enregistrement que l'éditeur natif. Identifiant obligatoire, un champ au moins, clés strictes. Limites natives conservées : nom1..60 trim, spécialité0..80, compétences max40 chaînes de40, jours max7 entiers0..6. Refus du mélange avec remplacement `staff`. Les défauts de titre/compétences/jours sont retirés du schéma du patch : un renommage ne les efface jamais implicitement.

Une seule identité de bloc `member` du salon et une seule identité relue autorisées. Absence, doublon, identifiant présent uniquement dans un autre projet, cabinet et restaurant refusés. Même contrôle natif ifVersion/droits. Patch uniquement des champs donnés ; le nom adapte aussi l'initiale comme l'éditeur manuel. Les autres attributs acquis, l'ordre des blocs, les identifiants, les services, horaires individuels, jours/compétences non demandés, profil et réservations restent exacts. Aucun ajout/suppression/déplacement de membre.

**19 nouveaux tests ;41 tests distincts/3 fichiers et types verts.** Vrais PUT/GET, comparaisons du thème entier, champs voisins atypiques, effacements explicites, erreurs de forme/scopes/version/identité, régressions des identités et textes de prestations. Rendez-vous acquis conservé, même ID d'intervenant et même créneau occupé ; nom relu par le moteur salon partagé. Aucun devis, fournisseur, usage ou consommation.

Comparaison parent : les champs de patch inconnus étaient ignorés (200 et version sans retouche) ; les tests de valeurs, de validation et de cible démontrent la lacune. Premières fixtures corrigées avant conclusion (équipe absente du thème minimal, client_id manquant, session restée sur autre compte). Le dernier contrôle de cible parent est refait avec la vraie identité étrangère et la bonne session :200 au lieu409 ; le correctif refuse sans version. Les essais de fixture ne sont pas présentés comme défauts produit.

Logs : `/tmp/parity301-native-staff-patch-{parent-red-final,scope-parent-red,delivery-final,foreign-id-final,types}.log`.

**Suite à faire : intentions naturelles/aperçu/accord/reçu/reprise SYNA, puis carte/handle Claude et recette compilée indépendante.** Ne pas déduire une fonction SYNA complète de cette seule primitive. Le mode natif « jours vides = tous » et « compétences vides = toutes » reste conservé ; une future carte doit l'expliciter, jamais annoncer « aucun » à tort.

Aucun fournisseur réel, projet client, activation, déploiement ou fusion main.
