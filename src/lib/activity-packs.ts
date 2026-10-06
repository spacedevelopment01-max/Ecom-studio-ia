/**
 * Suggestions par métier pour l'aide « Décrivez votre activité » : prestations courantes, raisons de contacter,
 * étapes habituelles et questions que posent les clients. Ce ne sont QUE des suggestions à cocher : rien n'est
 * repris tant que le client ne l'a pas choisi (il confirme ce qui est vrai pour lui).
 */
type Bi = { fr: string; en: string };
export type ActivityPack = { id: string; match: RegExp; label: Bi; services: Bi[]; needs: Bi[]; steps: Bi[]; questions: Bi[] };

const b = (fr: string, en: string): Bi => ({ fr, en });

export const ACTIVITY_PACKS: ActivityPack[] = [
  {
    id: "auto",
    match: /carross|garag|mécani|mecani|auto|pare-?brise|body ?shop|car |vehicle|véhicule|moto/i,
    label: b("Carrosserie et garage", "Car body and garage"),
    services: [b("Débosselage", "Dent repair"), b("Peinture carrosserie", "Bodywork paint"), b("Remplacement de pare-brise", "Windscreen replacement"), b("Réparation après sinistre", "Accident repair"), b("Rénovation des optiques", "Headlight restoration"), b("Entretien et vidange", "Servicing and oil change"), b("Diagnostic électronique", "Electronic diagnostics")],
    needs: [b("Après un accrochage ou un accident", "After a bump or an accident"), b("Pour une prise en charge par l'assurance", "For an insurance claim"), b("Avant de vendre leur véhicule", "Before selling their vehicle"), b("Pour l'entretien courant", "For routine servicing")],
    steps: [b("Diagnostic et photos du véhicule", "Inspection and photos of the vehicle"), b("Devis détaillé (et échange avec l'assurance si besoin)", "Detailed quote (and contact with the insurer if needed)"), b("Réparation à l'atelier", "Repair in the workshop"), b("Contrôle final et restitution du véhicule", "Final check and handover")],
    questions: [b("Travaillez-vous avec mon assurance ?", "Do you work with my insurer?"), b("Combien de temps dure une réparation ?", "How long does a repair take?"), b("Proposez-vous un véhicule de prêt ?", "Do you offer a courtesy car?"), b("Le devis est-il gratuit ?", "Is the quote free?")],
  },
  {
    id: "batiment",
    match: /plomb|chauff|électric|electric|couvreur|toiture|maçon|macon|menuis|peintre en bâtiment|rénovation|renovation|carrel|serrur|plumb|heating|roof|builder|carpent|locksmith/i,
    label: b("Artisan du bâtiment", "Building trades"),
    services: [b("Dépannage", "Emergency repairs"), b("Installation", "Installation"), b("Rénovation", "Renovation"), b("Entretien annuel", "Annual maintenance"), b("Mise aux normes", "Bringing up to standard"), b("Recherche de fuite", "Leak detection")],
    needs: [b("Pour une panne ou une urgence", "For a breakdown or an emergency"), b("Pour un projet de rénovation", "For a renovation project"), b("Pour l'entretien obligatoire", "For required maintenance"), b("Pour faire des économies d'énergie", "To save energy")],
    steps: [b("Appel ou demande en ligne", "Call or online request"), b("Visite et diagnostic sur place", "On-site visit and diagnosis"), b("Devis détaillé", "Detailed quote"), b("Intervention et nettoyage du chantier", "Work carried out and site cleaned up")],
    questions: [b("Intervenez-vous en urgence ?", "Do you handle emergencies?"), b("Le déplacement est-il facturé ?", "Is there a call-out charge?"), b("Êtes-vous assuré (décennale) ?", "Are you insured?"), b("Sous quel délai pouvez-vous intervenir ?", "How soon can you come?")],
  },
  {
    id: "beaute",
    match: /coiff|barb|esthéti|esthetic|ongl|manucur|maquill|spa|institut|beauté|beaute|hair|nail|beauty|lash|cils/i,
    label: b("Coiffure et beauté", "Hair and beauty"),
    services: [b("Coupe", "Haircut"), b("Coloration", "Colouring"), b("Brushing", "Blow-dry"), b("Soin du visage", "Facial"), b("Manucure", "Manicure"), b("Épilation", "Waxing"), b("Maquillage", "Make-up")],
    needs: [b("Pour un entretien régulier", "For regular upkeep"), b("Pour un événement (mariage, soirée)", "For an event (wedding, party)"), b("Pour changer de style", "To change their look"), b("Pour un moment de détente", "For some relaxation")],
    steps: [b("Prise de rendez-vous", "Booking"), b("Échange sur vos envies", "A chat about what you'd like"), b("La prestation", "The treatment"), b("Conseils pour l'entretien à la maison", "Aftercare advice at home")],
    questions: [b("Faut-il prendre rendez-vous ?", "Do I need to book?"), b("Combien de temps dure la prestation ?", "How long does it take?"), b("Quels produits utilisez-vous ?", "Which products do you use?"), b("Proposez-vous des cartes cadeaux ?", "Do you offer gift cards?")],
  },
  {
    id: "sante",
    match: /psycho|kiné|kine|ostéo|osteo|sophro|naturo|thérap|therap|infirm|diét|diet|médec|medec|dentist|orthophon|podolog|sage-femme|santé|sante|bien-être|bien-etre|health|physio|counsel|wellbeing/i,
    label: b("Santé et bien-être", "Health and wellbeing"),
    services: [b("Consultation individuelle", "Individual session"), b("Thérapie de couple", "Couples therapy"), b("Séance en ligne", "Online session"), b("Bilan initial", "Initial assessment"), b("Suivi régulier", "Ongoing follow-up"), b("Atelier de groupe", "Group workshop")],
    needs: [b("Pour traverser une période difficile", "To get through a difficult time"), b("Pour soulager une douleur ou une gêne", "To ease pain or discomfort"), b("Sur conseil de leur médecin", "On their doctor's advice"), b("Pour prendre soin d'eux en prévention", "To look after themselves preventively")],
    steps: [b("Prise de rendez-vous", "Booking"), b("Premier entretien pour faire le point", "First session to take stock"), b("Séances adaptées à vos besoins", "Sessions tailored to your needs"), b("Point d'étape régulier", "Regular progress review")],
    questions: [b("Faut-il une ordonnance ?", "Do I need a prescription?"), b("Combien de temps dure une séance ?", "How long is a session?"), b("Les séances sont-elles remboursées ?", "Are sessions reimbursed?"), b("Comment se passe le premier rendez-vous ?", "What happens at the first appointment?")],
  },
  {
    id: "sport",
    match: /coach|sport|fitness|yoga|pilates|personal train|salle de sport|danse|dance|arts martiaux|natation|swim/i,
    label: b("Sport et coaching", "Sport and coaching"),
    services: [b("Coaching individuel", "One-to-one coaching"), b("Cours collectifs", "Group classes"), b("Programme personnalisé", "Personalised programme"), b("Séance découverte", "Taster session"), b("Coaching en ligne", "Online coaching")],
    needs: [b("Pour reprendre une activité physique", "To get back into exercise"), b("Pour un objectif précis (perte de poids, course…)", "For a specific goal (weight loss, a race…)"), b("Pour être accompagnés et motivés", "To get support and motivation"), b("Pour se remettre en forme après une blessure", "To get fit after an injury")],
    steps: [b("Séance découverte et bilan", "Taster session and assessment"), b("Programme adapté à vos objectifs", "Programme built around your goals"), b("Séances encadrées", "Supervised sessions"), b("Suivi des progrès", "Progress tracking")],
    questions: [b("Faut-il un certificat médical ?", "Do I need a medical certificate?"), b("Quel niveau faut-il ?", "What level do I need?"), b("Où ont lieu les séances ?", "Where do sessions take place?"), b("Y a-t-il une séance d'essai ?", "Is there a trial session?")],
  },
  {
    id: "conseil",
    match: /avocat|notaire|comptab|expert-?compt|conseil|consult|assuran|courtier|immobili|agence|juriste|lawyer|accountant|advisor|broker|estate agent|marketing|freelance|graphiste|web ?design|développeur|developer/i,
    label: b("Conseil et services aux entreprises", "Professional services"),
    services: [b("Premier rendez-vous de conseil", "Initial consultation"), b("Accompagnement sur mesure", "Tailored support"), b("Audit", "Audit"), b("Suivi mensuel", "Monthly follow-up"), b("Formation", "Training")],
    needs: [b("Pour créer ou développer leur entreprise", "To start or grow their business"), b("Pour un problème précis à régler", "To solve a specific problem"), b("Pour gagner du temps", "To save time"), b("Pour être sûrs de respecter les règles", "To make sure they comply with the rules")],
    steps: [b("Premier échange pour comprendre votre besoin", "First conversation to understand your needs"), b("Proposition et devis", "Proposal and quote"), b("Réalisation de la mission", "Carrying out the work"), b("Bilan et suivi", "Review and follow-up")],
    questions: [b("Le premier rendez-vous est-il payant ?", "Is the first meeting charged?"), b("Travaillez-vous à distance ?", "Do you work remotely?"), b("Comment sont fixés vos honoraires ?", "How are your fees set?"), b("Quels délais pour démarrer ?", "How soon can we start?")],
  },
  {
    id: "photo",
    match: /photo|vidéast|videast|vidéo|video|film|drone|studio/i,
    label: b("Photo et vidéo", "Photo and video"),
    services: [b("Reportage mariage", "Wedding photography"), b("Portrait", "Portraits"), b("Photo d'entreprise", "Corporate photography"), b("Photo produit", "Product photography"), b("Vidéo événementielle", "Event video")],
    needs: [b("Pour un mariage ou un événement", "For a wedding or an event"), b("Pour leur communication", "For their marketing"), b("Pour garder un souvenir", "To keep a memory"), b("Pour leur site ou leurs réseaux", "For their website or social media")],
    steps: [b("Échange sur votre projet", "Chat about your project"), b("Devis et réservation de la date", "Quote and date booked"), b("Séance ou reportage", "The shoot"), b("Sélection, retouche et livraison", "Selection, editing and delivery")],
    questions: [b("Sous quel délai recevons-nous les photos ?", "When will we get the photos?"), b("Vous déplacez-vous ?", "Do you travel?"), b("Combien de photos sont livrées ?", "How many photos are delivered?"), b("Faut-il verser un acompte ?", "Is a deposit required?")],
  },
  {
    id: "resto",
    match: /restaura|traiteur|boulang|pâtiss|patiss|café|cafe|bar |pizz|cuisin|chef|catering|bakery|food truck/i,
    label: b("Restauration et traiteur", "Food and catering"),
    services: [b("Repas sur place", "Dine-in"), b("Vente à emporter", "Takeaway"), b("Livraison", "Delivery"), b("Traiteur pour événements", "Event catering"), b("Privatisation", "Private hire")],
    needs: [b("Pour un repas du quotidien", "For an everyday meal"), b("Pour un événement ou une fête", "For an event or a party"), b("Pour un repas d'affaires", "For a business meal"), b("Pour découvrir une cuisine", "To discover a cuisine")],
    steps: [b("Réservation ou commande", "Booking or order"), b("Préparation sur place avec des produits choisis", "Prepared on site with chosen ingredients"), b("Service ou retrait", "Service or collection"), b("Retour et avis", "Feedback")],
    questions: [b("Faut-il réserver ?", "Do I need to book?"), b("Avez-vous des plats végétariens ?", "Do you have vegetarian dishes?"), b("Livrez-vous ?", "Do you deliver?"), b("Pouvez-vous gérer les allergies ?", "Can you handle allergies?")],
  },
  {
    id: "maison",
    match: /ménage|menage|nettoy|propreté|proprete|jardin|paysag|élagu|elagu|pisc|entretien|clean|garden|landscap|pool|déménag|demenag|removal/i,
    label: b("Maison et jardin", "Home and garden"),
    services: [b("Entretien régulier", "Regular upkeep"), b("Nettoyage ponctuel", "One-off cleaning"), b("Tonte et taille", "Mowing and pruning"), b("Création d'espaces verts", "Garden design"), b("Évacuation des déchets", "Waste removal")],
    needs: [b("Pour gagner du temps", "To save time"), b("Avant une vente ou une location", "Before a sale or rental"), b("Pour un entretien saisonnier", "For seasonal upkeep"), b("Pour un projet d'aménagement", "For a landscaping project")],
    steps: [b("Demande et visite", "Request and visit"), b("Devis", "Quote"), b("Intervention", "The work"), b("Vérification avec vous", "Check with you at the end")],
    questions: [b("Le matériel est-il fourni ?", "Is equipment provided?"), b("Êtes-vous assuré ?", "Are you insured?"), b("Puis-je bénéficier d'un avantage fiscal ?", "Can I get a tax benefit?"), b("À quelle fréquence intervenez-vous ?", "How often do you come?")],
  },
];

/** Suggestions générales, quand le métier n'est pas reconnu. */
export const GENERIC_PACK: ActivityPack = {
  id: "generic",
  match: /$^/,
  label: b("Activité de services", "Service business"),
  services: [],
  needs: [b("Pour un besoin urgent", "For an urgent need"), b("Pour un projet précis", "For a specific project"), b("Pour un suivi régulier", "For regular follow-up"), b("Sur recommandation", "On a recommendation")],
  steps: [b("Premier contact", "First contact"), b("Échange sur votre besoin", "Discussion of your needs"), b("Devis ou rendez-vous", "Quote or appointment"), b("La prestation", "The service"), b("Suivi", "Follow-up")],
  questions: [b("Combien coûte une prestation ?", "How much does a service cost?"), b("Sous quel délai pouvez-vous intervenir ?", "How soon can you help?"), b("Où intervenez-vous ?", "Where do you work?"), b("Comment vous contacter ?", "How do I get in touch?")],
};

/** Suggestions du métier saisi (le premier qui correspond), sinon générales. */
export function packFor(trade: string): ActivityPack {
  const t = trade.trim();
  return (t && ACTIVITY_PACKS.find((p) => p.match.test(t))) || GENERIC_PACK;
}
