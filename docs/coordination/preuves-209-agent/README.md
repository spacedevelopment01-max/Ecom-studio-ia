# Preuves #209 — fondation conversationnelle, lot A

**Données intégralement fictives, aucune génération ni aucun fournisseur réel.** Code compilé : `f4999022089d27778c0961c5d86c5ad7b528f721`, production, arbre propre, source `compiled-build`.

- [Échanges HTTP du vrai serveur compilé](api-proof.json) : deux comptes et deux projets, produit et service ; sept tours de conversation enregistrés par cas, création via l’API native et rattachement, correction, reconnexion ; refus d’accès d’un autre compte/administrateur (404), d’exécution forgée (400), d’origine étrangère (403), de révision périmée (409). Drapeau fermé : nouvelle route 404, ancienne liste de projets 200.
- [Validation structurée](validation.json) : types/build, **3 505 tests réussis / 45 ignorés**, **58 tests lot A + 18 de confidentialité**, contraintes, compteurs avant/après et limites.
- [Défauts de développement reproduits puis corrigés](reproductions.json) : service de réparation confondu avec vente, copie de décision divergente après restauration, prix manuel d’un projet sans titre. Ce sont des contre-vérifications de l’implémentation du lot A, pas des incidents attribués au main.

Compteurs avant = après : **0 appel IA, 0 tâche, 0 événement de consommation**, portefeuille utilisé/réservé à zéro. Le journal contient trois écritures de préparation des abonnements fictifs avant la recette et les mêmes trois après : **aucune nouvelle écriture de journal**. Ce n’est ni une facture fournisseur ni le relevé des deux analyses réelles de la recette VANS.

Les devis positifs et le classement IA injecté sont des **SIMULATIONS dans les tests**, pas des appels depuis le serveur compilé. Ce dernier vérifie le refus honnête du devis quand le fournisseur manque ; le contrat futur de #208 est vérifié par doubles isolés. Aucun moteur créatif, outil de publication ou action payante exécuté.

Il n’y a **pas de nouvelle interface visuelle dans ce lot**, donc pas de capture prétendant en montrer une. L’accueil, le formulaire et les onglets servis restent inchangés ; l’interface est le travail ultérieur de Claude après validation. Les preuves portent sur le contrat/API et les données, pas sur un nouveau rendu de site.

Reproduction : build propre, puis `npx tsx scripts/verify-agent209-build.ts` (avec le garde réseau documenté dans le rapport). Le script refuse les sélecteurs d’une base existante, crée sa base temporaire, utilise uniquement la boucle locale, ne démarre pas de worker et arrête ses serveurs. Aucun mot de passe, cookie ou secret du harnais n’est publié dans ces preuves.
