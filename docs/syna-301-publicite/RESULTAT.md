# #282 / #301 — publicité (#347, convergence #348) et bibliothèque de prompts (#344) depuis SYNA

Recette navigateur `scripts/syna301-pub-recette.ts` — créations du moteur V2 générées avec des outils simulés, worker
réel, stockage isolé, clés vides, réseau hors boucle locale refusé — **4/4 parcours réussis** (Encre et Plein cadre,
ordinateur 1440 px et téléphone 390 px), 0 appel IA, 0 requête externe, 0 erreur JavaScript.

Étapes (ordinateur ; le téléphone fait le même parcours sans l'annulation ni l'attente de 17 s) :

- Publicités : créations listées, mode du compte appliqué — 4 création(s)
- éditeur : titre sélectionné, « Désigner le titre pour SYNA »
- proposition : aperçus avant / après, Gratuit — 0 €, aucun devis, aucune écriture — Avant : 76 · Après confirmation : 65 | Avant : 928 · Après confirmation : 950 | Avant : 78 · Après confirmation : 93 | Avant : 68 · Après confirmation : 82 | 
- annulation : aucune écriture, état conservé au rechargement
- nouvelle proposition, attente réelle de 17 s, la confirmation reste possible
- confirmation : tâche gratuite, reçu relu, export PNG — versions 2 → 3, PNG 2269260 octets
- base : seul le titre agrandi, autres calques identiques — taille du titre 68 → 82
- rechargement : reçu et version conservés
- bibliothèque de prompts : lecture seule, aucune exécution — 20 affichés sur 420 ; exécution refusée (aucune tâche)

## Limites vérifiées sans fiction

- **Un seul calque titre** : seules les créations à titre unique, visible et déverrouillé sont proposées (contrat #345).
- **Création brute du moteur refusée** : « Agrandis le titre » est refusé (422 « Cette retouche déplacerait un autre
  calque ») sur **18 créations sur 18** produites par le moteur V2 (`preuves/sonde-18-creations-refusees.json`, capture
  `preuves/refus-creation-brute-du-moteur.png`). Le parcours complet n'est possible que si le titre a de la place : la
  recette part donc d'une version où le client a réduit le titre dans l'éditeur natif (version « user »), après avoir
  vérifié avec le moteur local que l'agrandissement ne touche que le titre. Demande transmise à Codex (#301).
- **Bibliothèque de prompts** : lecture seule (20 affichés sur 420), aucun bouton d'action ; « Exécute le premier prompt
  de ma bibliothèque » ne crée aucune tâche.
- Désignation en deux gestes (« Désigner le titre pour SYNA » puis, si la désignation affichée diffère du repère,
  « Utiliser ce titre enregistré ») : signalé à Codex comme point d'ergonomie.

## Défauts d'interface corrigés par cette PR

1. « État du reçu : cancelled » (code technique en anglais) après une annulation → libellés français / anglais
   (« proposition annulée, rien n'a été modifié »…) — `preuves/avant-correctif-etat-cancelled.png`.
2. Effets affichés « x », « w », « h », « font.size », « autoFit.minSize » avec des valeurs comme 212.16 → « Position
   horizontale (px) », « Largeur du bloc (px) », « Hauteur du bloc (px) », « Taille du texte (px) », « Taille minimale
   du texte (px) », valeurs entières.

Note : le rond « N » en bas à gauche des captures est l'indicateur du serveur de développement Next.js (recette en
`next dev`), absent du Studio compilé.
