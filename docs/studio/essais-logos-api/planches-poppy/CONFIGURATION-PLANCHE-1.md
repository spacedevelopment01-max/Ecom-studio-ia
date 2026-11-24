# Planche Poppy n° 1 (« La sellerie du matin ») : paramètres exacts

Essai du chef d'orchestre, hors de SINA (24 novembre 2026), script `essai.py`.

- Point d'entrée : `POST https://api.openai.com/v1/images/edits`, formulaire multipart, quatre images dans `image[]`.
- Modèle : `gpt-image-2.6-sunburst`. Qualité `high`, taille `1024x1536`, fond `opaque`, format `png`, `n` 1. Ni
  complexité ni aperçus envoyés (complexité par défaut d'OpenAI : `high`).
- Références, dans l'ordre : `logos/logo-4.png` (le P en collier, finalisé), `photos-client/harnais.png`,
  `laisse.png`, `collier.png` (doublures des photos du client).
- Consigne : 4 889 octets, écrite par `gpt-6.2-astra` (appel « planches-contenu », qui a écrit les trois planches d'un
  coup, 108 s, 0,2001 €), domaine remplacé après vérification RDAP (`maisonpoppy.fr`, libre). Texte intégral dans
  `planches/planche-1-requete.json`.
- Réponse : 37,4 s ; 1 196 jetons de texte et 4 593 jetons d'image en entrée, 1 372 jetons d'image en sortie ;
  0,0721 €. Taille et qualité renvoyées : 1024x1536, high.
- Aucun traitement après génération.
