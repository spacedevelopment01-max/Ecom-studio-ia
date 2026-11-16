# Données d'essai du lot 2 (la marque)

Branche à part, **jamais fusionnée**. Elle garde les clients inventés de l'essai réel du lot 2 (15 et 16 novembre 2026)
pour le lot 3 : la base du Studio privé d'essai et les images créées (planches, logos, maquettes, publications, chartes).

Clients inventés : `client1@example.com` à `client4@example.com` et `client6@example.com` (dont le réparateur de vélos,
la maroquinière « Atelier Vasco » et la torréfactrice « Braise »), plus le compte d'administration fictif. Aucune donnée
réelle.

## Ce qui a été retiré de la copie

- les clés d'IA (tous les réglages secrets et `provider.*`) ;
- les sessions de connexion ;
- le secret de l'application (`app-secret.txt`) : le Studio privé en crée un neuf au démarrage ;
- le cache et les fichiers temporaires de la base.

## Reconstituer le dossier

```
cat essai-lot2-donnees.tar.part-* > essai-lot2-donnees.tar
sha256sum -c SOMMES-SHA256.txt
mkdir -p donnees && tar -xf essai-lot2-donnees.tar -C donnees
```

Puis lancer le Studio privé sur ce dossier (`DATA_DIR=donnees`, voir `scripts/syna-recette/lancer-agent.mts` sur la
branche principale) : la clé d'IA se remet par la variable d'environnement prévue, jamais dans un fichier.

Contenu : `studio.db` (la base) et `storage/` (les images). Huit morceaux de moins de 90 Mo, environ 600 Mo en tout.
