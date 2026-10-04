import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Connexions", en: "Connections" },
  summary: {
    fr: "Relier vos comptes (réseaux sociaux, Canva, Shopify) pour publier et installer depuis le studio, sans jamais donner votre mot de passe.",
    en: "Link your accounts (social networks, Canva, Shopify) to publish and install from the studio, without ever giving your password.",
  },
  steps: [
    { fr: "Ici, vous reliez vos comptes. Aucun mot de passe n'est demandé : chaque plateforme donne son autorisation officielle.", en: "This is where you link your accounts. No password is asked: each platform gives its official authorization." },
    { fr: "Chaque carte présente une plateforme et ce qu'elle permet. Meta publie sur votre Page Facebook et votre compte Instagram professionnel.", en: "Each card shows a platform and what it allows. Meta publishes to your Facebook Page and your Instagram professional account." },
    { fr: "« Limites de l'API et autorisations demandées » détaille ce que la plateforme autorise, avec un lien vers sa documentation officielle.", en: "\"API limits and requested permissions\" details what the platform allows, with a link to its official documentation." },
    { fr: "Le badge donne l'état : « Disponible », vous pouvez connecter ; « Non configuré », l'administration du studio doit d'abord activer la plateforme.", en: "The badge shows the status: \"Available\" means you can connect; \"Not configured\" means the studio administrator must enable the platform first." },
    { fr: "Quand la plateforme est disponible, le bouton « Connecter » apparaît ici. Il ouvre sa page d'autorisation, puis vous ramène au studio.", en: "When the platform is available, the \"Connect\" button appears here. It opens its authorization page, then brings you back to the studio." },
    { fr: "TikTok, YouTube et Pinterest publient vos vidéos et épingles. Canva reçoit vos créations pour les retoucher, puis les renvoie au studio.", en: "TikTok, YouTube and Pinterest publish your videos and pins. Canva receives your creations for editing, then sends them back to the studio." },
    { fr: "Shopify installe votre thème comme thème non publié, et crée le produit et les pages de votre boutique.", en: "Shopify installs your theme as an unpublished theme, and creates your store's product and pages." },
    { fr: "CapCut n'a pas d'API publique : le studio prépare un pack à importer, depuis les espaces Vidéos ou Fichiers.", en: "CapCut has no public API: the studio prepares a pack to import, from the Videos or Files areas." },
  ],
  faq: [
    { q: { fr: "Je n'ai pas de bouton « Connecter ».", en: "I don't have a \"Connect\" button." }, a: { fr: "La carte indique « Non configuré » : l'administration du studio doit d'abord renseigner les identifiants d'application de cette plateforme. Le texte sous la carte précise ce qu'il faut.", en: "The card says \"Not configured\": the studio administrator must first add this platform's app credentials. The text at the bottom of the card says what is needed." } },
    { q: { fr: "Mon compte affiche « Autorisation expirée ».", en: "My account shows \"Authorization expired\"." }, a: { fr: "Cliquez sur « Reconnecter » dans la carte du compte et acceptez à nouveau les autorisations demandées.", en: "Click \"Reconnect\" in the account's card and accept the requested permissions again." } },
    { q: { fr: "Le studio va-t-il publier sans me demander ?", en: "Will the studio publish without asking me?" }, a: { fr: "Non. Seules les publications que vous avez validées partent, à l'heure prévue. Vous pouvez déconnecter un compte à tout moment avec l'icône de corbeille.", en: "No. Only posts you have approved go out, at the planned time. You can disconnect an account at any time with the bin icon." } },
  ],
};
export default tutorial;
