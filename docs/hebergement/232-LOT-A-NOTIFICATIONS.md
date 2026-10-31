# Sites de services (#232) — Lot A : demandes envoyées par e-mail au professionnel

**Base** : prototype #234, SHA `72c572af` (branche `claude/232-hebergement-services`).
**Branche du lot** : `claude/232-notifications-email`. Aucune fusion, aucun déploiement, aucun fournisseur réel.

**Objectif** : un plombier, un peintre ou un salon reçoit chaque demande de devis ou de contact sur sa boîte e-mail habituelle et y répond directement. Une copie reste dans le studio. Pas de CRM.

## 1. État, sans enjoliver

| Élément | Fait | Testé localement | Non testé réellement | Prêt seulement après configuration |
|---|---|---|---|---|
| Demande enregistrée avant tout e-mail (même transaction que la file d'envoi) | ✅ | ✅ tests + recette | — | — |
| Adresse du compte utilisée par défaut, sans nouvelle confirmation | ✅ | ✅ | — | — |
| Autre adresse : lien 48 h, bouton « Confirmer », 3 adresses au plus, retrait | ✅ | ✅ (SMTP local) | réception réelle du lien | SMTP réel |
| E-mail au professionnel (expéditeur studio, « Répondre à » = visiteur, contenu échappé, lien vers la demande) | ✅ | ✅ (SMTP local) | **arrivée dans une vraie boîte, filtrage anti-spam, SPF/DKIM/DMARC** | SMTP réel + DNS du domaine expéditeur |
| File d'envoi persistante : bail, 5 essais espacés, refus 5xx définitif, expiration 7 jours, identifiant de message fixe | ✅ | ✅ (panne simulée, reprise par le worker) | — | — |
| Studio : état de l'e-mail, motif, « traitée », renvoi, effacement, lien direct depuis l'e-mail | ✅ | ✅ ordinateur + téléphone | — | — |
| Pièces jointes (photos du formulaire APLAT) | ❌ hors périmètre | e-mail signale « N photo(s) non transmises » | — | voir §4 |
| Notification réellement reçue dans une messagerie extérieure | — | — | **non revendiquée** | essai autorisé sur un SMTP public |

## 2. Fonctionnement

- **Réception** (`requests.ts`), dans une seule transaction :
  1. purge de conservation (12 mois) ;
  2. enregistrement de la demande, avec son type (devis ou contact) ;
  3. une ligne d'envoi par adresse confirmée.

  L'envoi part ensuite sans attendre : la réponse au visiteur ne dépend jamais du SMTP.
- **Envoi** (`notify.ts`, `processOutbox`) : il est appelé après la demande, mais seulement pour ce projet. Le worker le rappelle toutes les 15 s pour tous les projets.
  - **Réservation atomique** d'une ligne, avec un bail de 2 min : deux passages simultanés n'envoient jamais deux fois.
  - **Échec temporaire** : nouvel essai après 1 min, puis 5 min, 30 min et 2 h, soit 5 essais au total.
  - **Refus 5xx** : « échouée » tout de suite.
  - **Sans SMTP** : la ligne attend. Elle part dès que le SMTP est configuré, sinon elle passe « échouée (EXPIRE) » après 7 jours.
  - **Journal** : code seulement (par exemple `SMTP_451_MAIL`), avec l'adresse masquée (`p…@domaine`), jamais le contenu.
  - **Reste un cas rare** : un arrêt brutal entre l'acceptation par le serveur SMTP et l'écriture « envoyé » peut produire un second envoi au bout du bail. Il porte le même `Message-ID`.
- **E-mail** (`buildNotification`) :
  - `From` : « *Entreprise* (via E-COM STUDIO IA) », avec l'**adresse du réglage SMTP du studio**. Le domaine du visiteur n'est jamais utilisé, ce qui préserve SPF, DKIM et DMARC.
  - `Reply-To` : l'adresse du visiteur, si elle est valide.
  - En-têtes `Message-ID: <site-demande-<id>@domaine-du-studio>` et `Auto-Submitted: auto-generated`.
  - Contenu : objet sur une ligne (aucun en-tête injectable), texte et HTML échappés, site et page, date (heure de Paris), nom, e-mail, téléphone, prestation, autres champs aux libellés lisibles, message intégral, lien vers la demande dans le studio. Aucun jeton.
- **Adresses** (`recipients`) :
  - l'adresse du compte (déjà confirmée à l'inscription) est ajoutée par défaut ;
  - une autre adresse est « en attente » jusqu'au clic sur « Confirmer ». Le simple chargement du lien ne suffit pas, à cause des aperçus automatiques des messageries ;
  - retirer une adresse annule ses envois en attente ;
  - 5 liens par heure et par projet au plus.
- **Studio** (« Publier votre site ») :
  - section « Recevoir les demandes par e-mail » : adresses, état, ajout, renvoi du lien, retrait ;
  - bandeau si le SMTP n'est pas configuré ;
  - « Demandes reçues » :
    - type, nom, date et état de l'e-mail (envoyé, en cours, retardé avec motif, en attente du SMTP, échoué, aucune adresse, ou reçue avant l'envoi par e-mail) ;
    - détail, « Répondre par e-mail », « Marquer comme traitée », « Renvoyer l'e-mail » (si échoué) et « Effacer ».

  Le lien de l'e-mail `…/boutique?demande=<id>` ouvre directement la demande.
- **Droits** : tout est réservé au propriétaire du projet. Un visiteur ou un compte étranger reçoit 404 et ne voit ni adresse ni jeton.

Fichiers :
- nouveaux : `src/lib/sites/notify.ts`, `src/lib/sites/field-label.ts`, `src/app/confirmer-notifications/page.tsx`, `src/components/notification-address-confirmation.tsx`, `src/app/api/site-notify/confirm/route.ts`, `tests/site-notifications.test.ts`, `tests/smtp-sink.ts` ;
- modifiés : `src/lib/mail.ts` (Reply-To, Message-ID, nom affiché, en-têtes : rétrocompatible), `src/lib/sites/requests.ts`, `src/lib/sites/store.ts` (colonnes `kind`, `handled_at`), l'API `site-publication`, `site-publication.tsx`, `tab-boutique.tsx` (lien direct), `worker/index.ts` (reprise à chaque passage).

## 3. Preuves

### Tests automatiques

- **`tests/site-notifications.test.ts` : 16/16**, avec un vrai serveur SMTP local sur 127.0.0.1, sans relais. Ils couvrent :
  - **sans SMTP** : demande gardée, puis envoi dès que le SMTP est configuré ;
  - **expiration** à 7 jours ;
  - **contenu de l'e-mail** : en-têtes, échappement, injection d'en-tête impossible ;
  - **pannes** : panne puis reprise sans doublon (3 passages simultanés), 5 échecs puis « échouée » puis renvoi, refus 550, envoi interrompu repris après le bail ;
  - **demandes** : champ piège, effacement ;
  - **adresses** : confirmation, retrait, 3 au plus, sans SMTP, aucune adresse ;
  - **photos** signalées ;
  - **classement** devis ou contact, et les états ;
  - **droits** : visiteur et compte étranger refusés.
- **`tests/hebergement-sites.test.ts` : 14/14** (prototype #234, non régressé). Types : OK.

### Recette sur l'instance isolée

Studio compilé, avec son worker, derrière un proxy HTTPS local et un SMTP local de test. Comptes et sites fictifs, destinataires `@recette.invalid` / `@example.test`. Dossier : [`recette-232-lot-a/`](./recette-232-lot-a/).

| Scénario | Résultat | Preuves |
|---|---|---|
| Devis sans SMTP (site artisan) | Demande enregistrée ; « E-mail en attente : envoi non configuré » ; bandeau explicatif | `a1-01`, `a1-02` |
| SMTP local activé | Le worker envoie l'e-mail en attente : `To` = adresse du compte, `Reply-To` = visiteur, expéditeur = studio | `a1-03-email-recu-*`, `a1-04`, `emails/` |
| Panne (451) puis reprise (site agence) | « E-mail retardé : nouvel essai automatique », motif `SMTP_451_MAIL`. Après rétablissement, **envoyé en 56 s, un seul e-mail** | `a2-01`, `a2-02`, `a1-05` à `a1-07`, `a2-notifications.json` |
| Nouvelle adresse | « En attente de confirmation », lien reçu. Page de confirmation, puis bouton « Confirmer ». La demande suivante arrive **aux deux adresses** ; 3 adresses au plus | `a1-08` à `a1-11`, `a2-08` à `a2-10` |
| Lien « Retrouver cette demande » | Ouvre la demande, sur ordinateur et téléphone | `a2-03`, `a2-04`, `a2-05` |
| « Marquer comme traitée » | Masquée des nouvelles demandes | `a2-06` |
| Compte étranger | Lecture, ajout d'adresse, « traitée » et renvoi → 404 | `a2-07`, `a2-notifications.json` |
| Anti-spam (site cabinet) | Champ piège : rien d'enregistré. Rafale de 7 : 5 acceptées, puis refus (limite de 5 par 10 min et par visiteur) | `a2-notifications.json`, `smtp-local-journal.json` |
| Site avec rendez-vous | Réservation native toujours fonctionnelle (201) ; e-mail de confirmation au visiteur dans le SMTP local | `a3-*` |

Captures faites sur `f9d3a5ad`. Le commit suivant `0fe37a2e` ne change que les libellés (« Name » → « Nom », etc.), couverts par les tests.

## 4. Limites et suites

- **Photos du devis (APLAT)** : le thème ne transmet que leur nombre ; aucun fichier n'arrive au serveur. Les accepter exigerait :
  - contrôle du type réel des fichiers ;
  - antivirus ;
  - quotas et durée de vie ;
  - liens signés réservés au propriétaire.

  Rien de cela n'existe pour les sites publiés. L'e-mail le dit (« demandez-les en répondant »). Le visiteur, lui, n'est pas averti par le thème : à traiter côté thème, avec accord.
- **Rendez-vous** : les moteurs de réservation (cabinet, salon, restaurant) gardent **leur propre** adresse de notification au professionnel. À rapprocher des adresses du lot A dans un incrément séparé.
- **Information des visiteurs** : la politique de confidentialité du site doit mentionner l'envoi de la demande au professionnel par e-mail et la conservation de 12 mois. Le texte est modifiable dans « Pages légales » ; aucun modèle imposé n'a été ajouté.
- **Rebonds (bounces)** et désinscription de l'adresse : non gérés. Un refus 5xx à l'envoi est visible ; un rebond asynchrone ne l'est pas.
- **Délivrabilité réelle** : à mesurer sur un vrai fournisseur. Elle exige :
  - un domaine expéditeur contrôlé ;
  - SPF, DKIM et DMARC ;
  - une adresse `From` du studio, par exemple `notifications@<domaine du studio>`.

## 5. Coûts et services nécessaires (aucun engagé)

- **Un SMTP transactionnel** (Brevo, Postmark, Mailjet, Amazon SES…). Ordre de grandeur : une offre gratuite jusqu'à quelques centaines d'e-mails par jour, puis quelques euros à une vingtaine d'euros par mois selon le volume. À confirmer avant tout choix.
- **Les enregistrements DNS** SPF, DKIM et DMARC sur le domaine expéditeur du studio. Aucun coût, mais un accès DNS est nécessaire.
- Aucun changement des forfaits 49 / 89 / 129 €.

## 6. Pour passer en « prêt »

1. Choisir le fournisseur SMTP et configurer le domaine expéditeur (accord du propriétaire).
2. Renseigner le SMTP dans l'administration (Paramètres › E-mails), puis faire un « Test d'envoi ».
3. Essai autorisé : une demande fictive vers une boîte réelle du propriétaire, en vérifiant la réception, le « Répondre », le dossier spam et les en-têtes d'authentification.
4. Seulement ensuite : déclarer la notification « testée sur vraie infrastructure ».
