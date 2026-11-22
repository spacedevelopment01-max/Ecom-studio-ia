/**
 * LE BANC D'ÉPREUVES DE SINA (le socle, accepté par le propriétaire le 21 novembre 2026). Chaque raté vu avec le
 * propriétaire devient une épreuve, avec son verdict mot pour mot, la date et le compte rendu où il est écrit. Elles
 * sont rejouées avant chaque envoi (`npx vitest run`, ou `npm run epreuves`) ; si une chose qu'il avait validée
 * redevient mauvaise, l'envoi est bloqué.
 *
 * RÈGLE : un verdict et ce qui est attendu ne se réécrivent JAMAIS pour faire passer un essai (recherche : « les résultats
 * attendus de cette batterie sont figés »). Chaque épreuve est scellée dans `sceaux.json` : la changer fait échouer le
 * banc. Seul le propriétaire peut changer un verdict ; on peut ajouter des épreuves, jamais en retirer.
 *
 * `rejeu` : « gratuit » se rejoue sans aucun appel payant (contrôles du code, consignes envoyées, faux dessinateur et faux
 * relecteur) ; « payant » demanderait la vraie IA : listée avec son prix, jamais lancée sans l'accord écrit du
 * propriétaire. Les clients des épreuves sont inventés ; aucun exemple des anciens projets d'essai mis de côté.
 */
export type Epreuve = {
  id: string;
  date: string;
  /** Les mots du propriétaire (ou la règle qu'il a validée), tels qu'ils sont écrits dans le compte rendu. */
  verdict: string;
  source: string;
  /** Ce qui doit rester vrai, dit simplement. */
  attendu: string;
  rejeu: "gratuit" | "payant";
  /** Pour une épreuve payante : ce qu'elle coûterait, et ce qui manque pour la construire. */
  prix?: string;
};

export const EPREUVES: Epreuve[] = [
  {
    id: "logo-goutte-refusee", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Le client refuse la goutte (« Il ne veut surtout pas : le style plombier avec une goutte d'eau… ») ; le logo gardé portait une goutte. « on ne peut pas livrer ce genre de résultat pour les clients ».",
    attendu: "Un refus noté pour le logo dans la fiche du client arrive mot pour mot au dessinateur du logo, et au relecteur, qui le compte comme un défaut.",
    rejeu: "gratuit",
  },
  {
    id: "consigne-de-sina-au-dessinateur", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "« pas de consigne autre que les 50 logos en exemple et simplement en exemple » (SINA écrivait « un logotype sobre, un fil à plomb stylisé »).",
    attendu: "La consigne écrite par SINA n'arrive jamais au dessinateur d'un logo refait : il reçoit ce qu'on savait de la marque avant.",
    rejeu: "gratuit",
  },
  {
    id: "logos-de-la-serie-trop-proches", date: "2026-11-20", source: "CLAUDE.md (Logo, redit le 20 novembre 2026)",
    verdict: "« je veux un logo complètement différent » : le 1er est fait sans modèle, le 2e reçoit le 1er, le 3e les deux premiers ; jamais les logos d'une série précédente.",
    attendu: "Le deuxième logo d'une série reçoit le premier en image jointe, avec « Je veux un logo complètement différent » ; le premier n'en reçoit aucune.",
    rejeu: "gratuit",
  },
  {
    id: "trait-sous-le-nom-repete", date: "2026-11-20", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "« j'ai toujours les traits en dessous », puis « il doit juste être là par parcimonie » : un seul par série.",
    attendu: "Quand un logo de la série porte déjà un trait près du nom, un nouveau logo avec un trait est redessiné sans trait.",
    rejeu: "gratuit",
  },
  {
    id: "photo-a-brume-ou-taches", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Photos rendues en partie transparentes par OpenAI (brume blanche, taches sombres) : 16 images touchées depuis le 16 novembre.",
    attendu: "Toute photo est demandée en fond plein ; une photo en partie transparente est refusée sans relecture payée, puis refaite.",
    rejeu: "gratuit",
  },
  {
    id: "logo-relu-avant-ce-qui-le-porte", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Les images qui portent le logo étaient dessinées avant que le logo soit relu ; refusé, elles étaient jetées et repayées (13 images dessinées pour 2,04 €, rien de gardé).",
    attendu: "Le logo est dessiné et relu avant toute image qui le porte ; une image ne porte jamais un logo refusé.",
    rejeu: "gratuit",
  },
  {
    id: "planche-incomplete", date: "2026-11-16", source: "docs/studio/LOT-2-LA-MARQUE.md",
    verdict: "« on ne peut pas donner une identité de marque incomplète » (puis, le 21 novembre : refaire le logo avait fait disparaître le haut du site de la planche d'Aplomb).",
    attendu: "Un haut du site refait et refusé laisse celui d'avant sur la planche : la planche n'est jamais incomplète.",
    rejeu: "gratuit",
  },
  {
    id: "image-pas-au-niveau", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Le relecteur note chaque image face à une campagne haut de gamme : « seule une note de 8 ou plus est montrée ».",
    attendu: "Une image notée moins de 8 sur 10 n'est pas montrée ; elle est refaite.",
    rejeu: "gratuit",
  },
  {
    id: "bouton-coupe-sur-telephone", date: "2026-11-17", source: "CLAUDE.md (Jamais un bouton coupé)",
    verdict: "« Les boutons sont coupés en bas, jamais au grand jamais »",
    attendu: "Le bouton à ombre passe au-dessus de la section suivante et garde de la place sous lui.",
    rejeu: "gratuit",
  },
  {
    id: "photo-en-arche", date: "2026-11-16", source: "docs/studio/LOT-4-LE-SITE.md",
    verdict: "« L'arrière plan en lune c'est pas beau je veux plus ça »",
    attendu: "Le cadre en arche n'est plus permis : il devient un cadre droit.",
    rejeu: "gratuit",
  },
  {
    id: "fond-blanc-permis", date: "2026-11-17", source: "CLAUDE.md (Le fond blanc est toujours permis)",
    verdict: "« La couleur blanche en fond est autorisée si jamais »",
    attendu: "Un fond blanc pur n'est jamais refusé pour ressemblance avec les marques récentes.",
    rejeu: "gratuit",
  },
  {
    id: "sites-trop-semblables", date: "2026-11-17", source: "docs/studio/LOT-4-LE-SITE.md",
    verdict: "« 4 fois la même section entre les deux alors qu'on a une centaine de sections » ; « J'appelle pas ça de la variété moi ».",
    attendu: "Un accueil qui a plus de 2 pièces en commun avec un site déjà monté est refusé par la règle de variété.",
    rejeu: "gratuit",
  },
  {
    id: "logo-sur-fond-sombre", date: "2026-11-16", source: "docs/studio/LOT-2-LA-MARQUE.md",
    verdict: "« sur fond sombre, le logo soit clair tout le temps »",
    attendu: "Sur une identité à fond sombre, le logo posé sur le haut du site est clair.",
    rejeu: "gratuit",
  },
  {
    id: "etape-validee-qui-bouge", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Refaire le logo avait fait disparaître le haut du site de la planche d'Aplomb : une étape validée ne bouge plus sans la demande du client.",
    attendu: "Une partie validée par le client est verrouillée : l'outil qui la referait est refusé tant qu'il ne l'a pas demandé par écrit.",
    rejeu: "gratuit",
  },
  {
    id: "fiche-relue-en-entier", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-RECHERCHES-SINA-2026-11-21.md",
    verdict: "Le refus de la goutte n'arrivait ni au dessinateur ni au relecteur ; « une fiche client […] relue en entier avant chaque création ».",
    attendu: "Après les questions de départ, SINA relit la fiche entière du client à chaque pas, refus et portée compris.",
    rejeu: "gratuit",
  },
  {
    id: "creation-coupee-reprise-sans-repayer", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "La reprise d'Aplomb (nouveau logo et 6 images) a été arrêtée en cours de route : 2,04 € dépensés, rien de gardé.",
    attendu: "Une création de marque arrêtée en route se relance là où elle s'était arrêtée : ce qui est déjà fait et payé est repris, la carte ne montre que le prix de ce qui reste.",
    rejeu: "gratuit",
  },
  {
    id: "personne-sans-accord-ecrit", date: "2026-11-21", source: "CLAUDE.md (Jamais de personne)",
    verdict: "« Jamais de personne dans une image sans photo fournie par le client ou accord écrit. »",
    attendu: "Sans photo d'une personne fournie par le client ni son accord écrit, aucune image de la planche n'en montre, son relecteur la refuse, et une galerie avec une personne ne part pas sans les mots du client.",
    rejeu: "gratuit",
  },
  {
    id: "le-mot-maquette", date: "2026-11-21", source: "CLAUDE.md (Site)",
    verdict: "« Le client ne lit jamais le mot « maquette ». »",
    attendu: "Quand le haut du site manque sur une planche, le client lit « le haut de ton site », jamais « maquette ».",
    rejeu: "gratuit",
  },
  {
    id: "questions-groupees-reponse-incomplete", date: "2026-11-21", source: "docs/studio/REGLES-EN-DOUBLE-2026-11-21.md",
    verdict: "« Ok » : garder la règle du 19 novembre (questions simples ensemble, six au plus ; choix et accord seuls ; « faire connaissance » une à la fois), avec une épreuve ; si SINA perd une réponse, on revient à une question à la fois.",
    attendu: "Après des questions groupées et une réponse incomplète du client, chaque réponse donnée est notée dans sa fiche, et seul ce qui manque reste à demander.",
    rejeu: "gratuit",
  },
  {
    id: "faire-connaissance-une-question-a-la-fois", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Elle a groupé des questions cinq fois pendant « faire connaissance », dont quatre coordonnées d'un coup. La règle y est une question à la fois.",
    attendu: "Pendant « faire connaissance », un message qui pose plusieurs questions, ou plusieurs coordonnées d'un coup, ne part pas : SINA le réécrit avec une seule question.",
    rejeu: "gratuit",
  },
  {
    id: "c-est-parti-avant-la-carte", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Elle a écrit « C'est parti » alors que rien ne démarre avant l'accord sur la carte.",
    attendu: "Un message qui annonce le départ d'une création payante avant que le client accepte la carte ne part pas : SINA le réécrit.",
    rejeu: "gratuit",
  },
  {
    id: "carte-qui-vouvoie", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "La carte de dépense vouvoie le client ; SINA le tutoie partout.",
    attendu: "La carte d'accord d'une dépense dit « ton budget IA », jamais « votre ».",
    rejeu: "gratuit",
  },
  {
    id: "acheteuses-inconnues-sina-propose", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Nadia ne savait pas qui sont ses acheteuses, et SINA n'a rien proposé à partir du marché. Ce qu'elle peut trouver seule, elle le propose.",
    attendu: "Quand SINA demande à qui le client s'adresse, sa consigne lui dit, s'il ne sait pas, de proposer elle-même deux ou trois types d'acheteurs probables.",
    rejeu: "gratuit",
  },
  {
    id: "publication-incomprehensible", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Une publication d'escalier pour un plombier, incompréhensible pour un inconnu : « Personne ne juge l'idée d'une publication avant de payer le dessin ».",
    attendu: "L'idée de chaque publication est jugée par un lecteur qui ne connaît pas la marque AVANT de payer son image.",
    rejeu: "payant",
    prix: "[À construire : le juge de l'idée n'existe pas encore (étape des publications)] ; [À compléter : prix, mesuré quand il sera construit].",
  },
  {
    id: "trois-angles-trois-clienteles", date: "2026-11-16", source: "docs/studio/LOT-3-LES-TROIS-ANGLES.md",
    verdict: "« un angle marketing c'est le fait d'aller chercher une typologie de client différente » ; deux « types de clients » montrés n'en étaient pas.",
    attendu: "Les trois angles visent trois clientèles vraiment différentes (des situations, jamais un âge seul ni une crainte que tous partagent).",
    rejeu: "payant",
    prix: "Demande une vraie création d'angles : l'essai du lot 3 a coûté 8,36 € pour deux clients inventés ; [À compléter : prix d'un seul rejeu, à mesurer avant de le lancer].",
  },
];
