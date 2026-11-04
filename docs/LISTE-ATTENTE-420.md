# Liste d'attente — raccordement au Studio (#420)

Le formulaire public reste sur son site actuel
(<https://ecom-studio-ia-liste-attente.thomas-vacle.chatgpt.site>, Sites `appgprj_6aeb76e2f5d88191b0cd2dbed84073ab`,
base D1 `DB.waitlist`). Ce lot ne crée **aucun** second formulaire. Il ne change ni les champs ni l'offre affichée :
−20 % chaque mois pendant 12 mois avec le forfait mensuel, −30 % avec le forfait annuel.

## Ce que fait le Studio (livré dans ce lot)

| Élément | Où |
|---|---|
| Table `waitlist_signups` : date, prénom, e-mail, type de projet, description, consentement, offre, état de la notification | `src/lib/waitlist.ts` |
| Réception **signée** des inscriptions, appelée par le serveur du site (jamais par le navigateur) | `POST /api/waitlist/ingest` |
| Notification interne à **ecomstudioia@gmail.com** (modifiable), par le SMTP du Studio (Administration › E-mails) | `processWaitlistOutbox` ; reprise par le worker toutes les 15 s |
| Onglet **Administration › Liste d'attente** (administrateurs seulement) : inscriptions, consentement, état de l'e-mail, « Retenter », adresse interne, secret, import | `src/components/admin-waitlist.tsx`, `GET/POST /api/admin/waitlist` |
| Import des inscriptions déjà reçues (CSV ou JSON), **sans aucun e-mail** | onglet Liste d'attente, ou `kind: "import"` sur la route signée |
| Essai de bout en bout avec une inscription fictive | `scripts/waitlist-send-test.ts` |

Garanties (vérifiées par `tests/waitlist-420.test.ts`) :

- **Inscription avant e-mail.** L'inscription est enregistrée d'abord. Une panne SMTP (refus temporaire, refus
  définitif, serveur injoignable ou non configuré) ne la fait jamais perdre : elle reste visible, l'e-mail est retenté
  (1 min, 5 min, 30 min, 2 h, puis « Échec » retentable à la main).
- **Doublons.** Une même adresse (sans tenir compte des majuscules) ou un même identifiant du site n'est enregistré et
  notifié qu'une fois. Une resoumission, une nouvelle tentative du site ou une requête rejouée ne renvoie pas d'e-mail ;
  elle est seulement comptée (« Réinscrite N fois »). Deux envois simultanés ne donnent qu'une ligne et un e-mail.
- **Aucun envoi rétroactif.** Les lignes importées sont marquées « Importée — sans e-mail ». Aucun e-mail n'est envoyé
  aux inscrits, seulement à l'adresse interne.
- **Coordonnées et secrets côté serveur.** La route de réception ne renvoie jamais les coordonnées. Les journaux
  d'erreur masquent l'adresse (`e…@domaine`). Le secret est chiffré en base, affiché une seule fois à sa création et
  jamais relu.
- **Consentement.** Les valeurs possibles sont « Consentement donné », « Consentement refusé » et « Consentement non
  enregistré ». Cette dernière s'applique aux anciennes lignes sans information.

## Signature des requêtes

En-tête `X-Waitlist-Signature: t=<horodatage en secondes>,v1=<hex>` : HMAC-SHA256 de `"<t>.<corps brut>"` avec le
secret partagé. C'est le même schéma que Stripe. Une signature de plus de 5 minutes est refusée. Sans signature valide,
la réponse est 401 et rien n'est lu ni enregistré. Sans secret configuré côté Studio, la réponse est 503.

Corps :

```json
{ "kind": "signup", "signup": { "id": "<id D1>", "firstName": "…", "email": "…", "category": "…", "description": "…",
  "consent": true, "consentAt": "2026-11-04T18:00:00Z", "createdAt": "2026-11-04T18:00:00Z", "offer": "…" } }
```

Les noms usuels sont aussi acceptés : `prenom`, `categorie`, `type_projet`, `message`, `consentement`, `created_at`…
Réponses : `201 {status:"created"}`, `200 {status:"duplicate"}`, `401`, `422` (e-mail invalide), `429`, `503`.

## Côté site (à faire dans la source Sites — accès non disponible depuis cette session)

1. **Studio** : Administration › Liste d'attente › « Créer le secret de raccordement ». Copiez-le aussitôt : il ne sera
   plus jamais affiché.
2. **Site** : ajouter deux secrets serveur (variables d'environnement, jamais dans le code ni la page) :
   `WAITLIST_STUDIO_URL` (adresse publique HTTPS du Studio) et `WAITLIST_STUDIO_SECRET`.
3. **Site**, dans le gestionnaire qui enregistre déjà l'inscription dans D1, juste **après** l'insertion (le
   formulaire, les champs et les remises ne changent pas) :

```js
async function sendToStudio(env, row) {
  const raw = JSON.stringify({ kind: "signup", signup: {
    id: String(row.id), firstName: row.first_name ?? null, email: row.email, category: row.category,
    description: row.description ?? null, consent: !!row.consent, consentAt: row.consent_at ?? null,
    createdAt: row.created_at, offer: "−20 % chaque mois pendant 12 mois (mensuel) / −30 % (annuel)" } });
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.WAITLIST_STUDIO_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`));
  const v1 = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const r = await fetch(`${env.WAITLIST_STUDIO_URL}/api/waitlist/ingest`, { method: "POST",
    headers: { "content-type": "application/json", "x-waitlist-signature": `t=${t},v1=${v1}` }, body: raw });
  return r.status === 201 || r.status === 200; // 200 = déjà reçue (doublon) : rien à refaire
}
// Dans le gestionnaire du formulaire, après l'INSERT dans DB.waitlist (la réponse au visiteur n'attend pas le Studio) :
// ctx.waitUntil(sendToStudio(env, row).then((ok) => ok && env.DB.prepare("UPDATE waitlist SET studio_synced_at = ? WHERE id = ?").bind(Date.now(), row.id).run()));
```

   Facultatif mais conseillé : ajouter une colonne `studio_synced_at` et une tâche planifiée qui renvoie les lignes
   non synchronisées. C'est sans risque, car le Studio dédoublonne par `id` et par adresse.

4. **Anciennes inscriptions** : exporter `DB.waitlist`, par exemple
   `wrangler d1 execute <base> --remote --command "SELECT * FROM waitlist" --json`, ou un export CSV. Puis
   Administration › Liste d'attente › « Importer sans e-mail ». Autre possibilité : `{"kind":"import","signups":[…]}`
   signé sur la route. Aucun e-mail n'est envoyé pour ces lignes.

## Vérifier la mise en service

```bash
WAITLIST_STUDIO_URL=https://<studio> WAITLIST_STUDIO_SECRET=<secret> npx tsx scripts/waitlist-send-test.ts --doublon
```

Résultat attendu :
- `201 … "created"` puis `200 … "duplicate"` ;
- la ligne « Essai » apparaît dans Administration › Liste d'attente ;
- **un seul** e-mail arrive à ecomstudioia@gmail.com. Supprimer ensuite la ligne d'essai n'est pas nécessaire (elle
  est marquée « fictive »).

Pour la panne SMTP : mettre un mauvais mot de passe SMTP, renvoyer un essai, constater « Nouvel essai prévu » dans
l'onglet, rétablir le mot de passe, cliquer « Retenter » : un seul e-mail arrive.

## Ce qui bloque encore la mise en service (constaté le 4 novembre 2026)

- **Source Sites** : je n'y ai pas accès depuis cette session (aucun connecteur Sites). Le réseau de la session refuse
  aussi `ecom-studio-ia-liste-attente.thomas-vacle.chatgpt.site`. Le code du point 3 reste à poser dans le site.
  La page publique n'a pas été modifiée.
- **Instance Studio en ligne** : l'adresse et l'accès ne sont pas connus de la session. Il faut fusionner puis déployer
  ce lot, créer le secret dans l'onglet, puis renseigner les deux secrets du site.
- **SMTP du Studio** : aucun réglage n'est disponible ici. Il doit être configuré dans Administration › E-mails (une
  Gmail avec mot de passe d'application convient). La réception réelle à ecomstudioia@gmail.com n'est donc **pas
  encore vérifiée** : seul l'envoi à un serveur SMTP local de test l'est.
