# Mission 211 — lot F, premier incrément : interface conversationnelle

Recette navigateur en cours avant verdict. Branche `codex/211-lot-f-interface`, parent #212 `d5012ed62a1df08803455e1d9e9af9e3ba8dee9c`. Aucun merge, mise en service, fournisseur réel ou modification de la vitrine publique.

## Interface développée

- Avec les trois drapeaux serveur A/B/UI, le démarrage d’un abonnement payé commence par « Quel projet souhaitez-vous créer ? ». Champ libre, lien/photo avec état honnête, enregistrement sans appel IA. Aucun formulaire de type imposé au premier écran.
- Conversation du lot B : historique sauvegardé et paginé, cartes IA à 2–5 choix, réponse libre/multiple/inconnue, Pourquoi, retour/correction, fiche commune et type d’activité corrigeable gratuitement, propositions à accepter, devis en % et consentement, états en cours/échec et reprise après fermeture.
- Le maximum affiché est arrondi vers le haut ; un coût positif n’apparaît pas nul. L’estimation et le plafond restent distincts. Aucune exécution métier annoncée par le texte du dialogue.
- Création par l’API native avec accord explicite de rattachement à l’abonnement, puis import du même brief. Si la réponse de création a été perdue, le projet du même abonnement est recherché avant toute nouvelle création ; le serveur contrôle la correspondance du brouillon avant rattachement.
- Agent repliable dans tous les onglets, activation volontaire sur un projet existant. Fermeture au clavier, restauration du focus et boucle de tabulation dans le panneau. Aucun contenu client en stockage local du navigateur.
- Éditeur Site : aperçu principal par défaut, panneaux manuels repliés et un seul ouvert à la fois sur ordinateur. Les contrôles existants de page, section, réglages, versions, restauration, plein écran et ordinateur/mobile sont conservés. Aucune composition de démonstration n’est modifiée.
- Le formulaire manuel reste accessible. Sans les trois drapeaux, l’ancien parcours reste celui affiché. Les règles d’abonnement, de découverte et de génération ne changent pas ; aucune migration implicite d’un ancien projet.

## Fichiers

`conversation-panel.tsx`, `agent-ui-context.tsx`, `conversation-presentation.ts`, `ui-enabled.ts` ; raccordements dans `studio/page.tsx`, le layout du projet, `home.tsx`, `shell.tsx`, `tab-boutique.tsx`. Les types sensibles des API sont importés comme types côté navigateur.

Harnais réel : `scripts/verify-agent211-ui.ts`, invoqué par `verify-agent211-build.ts ... --ui` avec un navigateur Chromium, le Studio compilé, son worker et un faux fournisseur HTTP local. Aucun appel externe autorisé par le harnais ; aucun résultat de modèle réel revendiqué.

## Vérifications et état

Première régression complète : **3 571 tests réussis, 45 ignorés**, 416 fichiers réussis / 1 ignoré, 740,55 s. Elle précède les deux retouches d’affichage (maximum en pourcentage et activité visible dans la fiche). Après ces retouches : types et **29 tests ciblés réussis**. Les parcours navigateur, captures et le build de leur SHA exact restent à exécuter à cette rédaction ; aucun verdict visuel n’est anticipé.

## Limites à garder explicites

Cet incrément fournit le dialogue B dans une vraie interface. Il ne prétend pas encore exécuter les outils D ni composer les sites E. Les avis spécialisés C et les outils complémentaires doivent être raccordés dans leurs incréments d’interface ; les onglets manuels restent fonctionnels entre-temps.

Un lien est conservé sans consultation automatique ; une photo avant création n’est pas raccordée. Le panneau l’explique et renvoie à l’ajout de fichiers du projet après création. La migration d’un ancien projet sans préparation compatible peut être refusée : ses données restent conservées et son parcours manuel accessible.

La qualification réelle de compréhension/qualité du modèle n’a pas été autorisée. Une simulation ne suffit pas pour promettre une création professionnelle. La recette visuelle de l’éditeur prouve des interactions et dimensions ; elle ne prouve pas la qualité de nouveaux thèmes ni une installation CMS. Le studio client ne sert pas cette branche.
