/** Injected prose for orchestration tests; no provider quality is claimed. No persistence here. */
import type { Project } from "../../src/lib/projects";
import { sitePlan } from "../../src/lib/preparation/plan";
import { localCopy } from "../../src/lib/engine/local-copy";
import { contentKey } from "../../src/lib/seo-v2/store";
import { verifiedFacts } from "../../src/lib/seo-v2/facts";
import { gateContent, localContentChecks } from "../../src/lib/seo-v2/quality";
import type { ContentDoc } from "../../src/lib/seo-v2/types";
import type { Contents, PlannedPage } from "../../src/lib/preparation/types";

export function injectedContents(p: Project): Contents {
  const plan = sitePlan(p), services = p.business === "services", f = verifiedFacts(p);
  const brand = p.brand!.name, audience = p.brand!.audience;
  const contact = [p.services.email, p.services.phone, p.services.bookingUrl].filter(Boolean).join(" ou ");
  const prose = (pg: PlannedPage, section: string): string => {
    if (pg.kind === "home") {
      switch (section) {
        case "hero": return `${brand} : ${p.product.summary}`;
        case "offer": return services ? `Les prestations proposées sont ${p.services.services.map(s => s.name).join(" et ")}. Consultez leur présentation pour préciser votre besoin.` : `L’offre s’adresse à ${audience}. La fiche détaille le produit pour vous aider à préparer votre choix.`;
        case "proofs": return "Pour vous faire une idée de l’offre, parcourez les vues et les informations présentées. Les illustrations accompagnent les explications sans remplacer les caractéristiques décrites.";
        case "faq": return "Une question avant de vous décider ? Repérez les points qui comptent pour votre usage et contactez-nous pour les préciser.";
        case "contact": return services ? `Votre projet se situe à ${p.services.area} ? Décrivez-nous votre besoin afin d’échanger sur la prestation qui vous intéresse.` : `Retrouvez les détails de ${p.product.name} sur sa fiche. Prenez le temps de comparer ces informations avec votre utilisation prévue.`;
        case "gallery": return "Passez d’une vue à l’autre pour situer l’offre dans son contexte. Chaque image apporte un angle de lecture complémentaire au texte.";
        case "story": return "Le format vertical propose une autre lecture de la présentation. Sur téléphone, poursuivez la découverte sans quitter le fil des informations.";
      }
    }
    if (pg.kind === "product") {
      switch (section) {
        case "detail": return p.product.summary;
        case "facts": return f.facts.length ? `Les éléments renseignés pour ce produit : ${f.facts.map(x => `${x.label} ${x.value}`).join(" ; ")}.` : `Pour ${audience}, cette présentation rassemble les éléments décrits par la marque. Les détails non indiqués peuvent être précisés lors d’un échange.`;
        case "options": return f.price ? `Ce produit est proposé à ${f.price}. Vérifiez que votre sélection correspond à votre besoin avant de poursuivre.` : "Votre choix mérite une information claire. Contactez la marque pour préciser les éléments commerciaux qui ne figurent pas sur cette fiche.";
        case "faq": return "Qu’aimeriez-vous savoir avant de choisir ? Notez votre question et indiquez le produit concerné pour faciliter la réponse.";
        case "gallery": return `Regardez ${p.product.name} sous plusieurs angles. La galerie complète la description écrite et permet de revenir sur un détail.`;
        case "story": return "Une composition verticale accompagne la découverte sur mobile. Le cadrage conserve une lecture naturelle de l’objet et de son contexte.";
      }
    }
    if (pg.kind === "service") {
      const s = p.services.services[Number(pg.key.split(":")[1])];
      switch (section) {
        case "presentation": return s.description;
        case "method": return `Pour ${s.name.toLowerCase()}, commençons par votre situation et vos attentes. Nous pourrons ainsi préciser ensemble le cadre de l’accompagnement à ${p.services.area}.`;
        case "contact": return `Vous souhaitez parler de cette prestation ? Contactez-nous via ${contact}, en indiquant votre demande pour ${s.name.toLowerCase()}.`;
        case "gallery": return "Ces scènes illustrent le contexte de l’activité. Elles accompagnent la description de la prestation et ne constituent pas des réalisations attribuées à l’entreprise.";
        case "story": return "La présentation verticale conserve les repères utiles à la découverte de la prestation. Poursuivez ensuite vers les informations de contact.";
      }
    }
    if (pg.kind === "brand") {
      switch (section) {
        case "intent": return `${brand} s’adresse à ${audience}. Le projet se concentre sur ${services ? p.services.services.map(s => s.name.toLowerCase()).join(" et ") : p.product.name}, avec une présentation attentive aux besoins déclarés.`;
        case "gallery": return "L’univers visuel accompagne la lecture de la marque. Il met en relation les scènes de présentation et les informations concrètes de l’offre.";
        case "story": return "Au fil des images, retrouvez les repères de cette identité. La mise en page verticale conserve les contrastes et la lisibilité sur petit écran.";
      }
    }
    if (pg.kind === "contact") return services ? `Pour échanger avec ${brand}, utilisez ${contact}. Indiquez la prestation recherchée et votre situation à ${p.services.area} afin de préparer la conversation.` : `Une question sur ${p.product.name} ? Décrivez votre demande dans le formulaire de contact et précisez les points que vous souhaitez éclaircir.`;
    throw Error(`Section de fixture non rédigée : ${pg.key}/${section}`);
  };
  const documents: Contents["documents"] = plan.pages.map(pg => {
    const type: ContentDoc["type"] = pg.kind === "contact" ? "contact_page" : pg.kind === "home" ? "home_page" : pg.kind === "brand" ? "brand_page" : pg.kind === "service" ? "service_page" : "product_page";
    const key = contentKey(p.id, type, pg.key, "fr"); pg.docKey = key;
    const doc: ContentDoc = {
      version: 1, type, lang: "fr", page: { key: pg.key, title: pg.title, kind: pg.kind === "contact" ? "page" : pg.kind, status: "planned", url: null },
      primaryKeyword: null,
      meta: { seoTitle: `${pg.title} | ${brand}`, metaDescription: `${pg.title} : découvrez l’offre de ${brand}, sa présentation et les informations utiles pour prendre contact.`, slug: pg.path.split("/").pop() || "", canonical: null, robots: "index,follow" },
      blocks: [{ id: `${pg.key}-title`, kind: "h1", text: pg.title }, ...pg.sections.map(s => ({ id: `${pg.key}-${s.key}`, kind: "p" as const, text: prose(pg, s.key) }))],
      links: [], schema: [], meta2: { source: "engine", by: "ai", createdFrom: null, runId: `simulation:${p.id}:${pg.key}` },
    };
    return { docKey: key, doc, verdict: "FINAL" };
  });
  // Apply precisely the native approval guards BEFORE any version is persisted.
  for (const { doc } of documents) {
    const scoped = doc.type === "service_page" ? { ...p, services: { ...p.services, services: [p.services.services[Number(doc.page.key.split(":")[1])]].filter(Boolean) } } : p;
    const checks = localContentChecks(doc, scoped, verifiedFacts(scoped));
    const decision = gateContent({ type: doc.type, local: checks, review: null, attempt: 2 });
    if (checks.placeholders || decision.fatalCodes.length || decision.blockingCodes.length) throw Error(`Copie injectée refusée avant sauvegarde (${doc.page.key}) : ${checks.issues.join(" ; ")}`);
  }
  return { ...plan, documents, copy: localCopy(p.product, p.brand!, p), notes: ["Textes et verdicts créatifs injectés ; contrôles locaux natifs appliqués, qualité IA réelle non vérifiée."], provenance: "simulation" };
}
