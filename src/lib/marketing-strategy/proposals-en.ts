/** English creative hypotheses. Client facts/names are preserved verbatim, never translated into new claims. */
import type { Project } from "../projects";
import type { MarketingAngle, StrategySource } from "./types";
export const GENERALIST_EXPLANATION_EN =
  "When you try to speak to everyone, your message can become less specific and less memorable. A focused angle helps someone recognise their own needs in your offer. A general approach remains possible when it fits your objective.";
export function englishAngles(
  p: Project,
  sources: StrategySource[],
): MarketingAngle[] {
  const name = p.product.name || p.services.services[0]?.name || p.name,
    service = p.business === "services",
    summary = p.product.summary || p.services.services[0]?.description || "",
    category = p.product.category || name;
  const facts = p.product.facts.filter(
    (f) => f.status === "confirmed" && f.value.trim(),
  );
  const detail = facts[0] ? `${facts[0].label}: ${facts[0].value}` : summary;
  const use =
    facts.find((f) => /use|usage|occasion|context/i.test(f.label))?.value ||
    summary.match(/\bfor\s+([^.!?]+)/i)?.[1] ||
    summary;
  const audience =
    facts.find((f) => /audience|customer|target/i.test(f.label))?.value ||
    p.brand?.audience ||
    p.strategy?.audience?.[0]?.label ||
    `people interested in ${category}`;
  const proof = facts
    .map((f) => `${f.label}: ${f.value}`)
    .concat(
      service
        ? p.services.services.map((s) =>
            [s.name, s.description, s.duration, s.price]
              .filter(Boolean)
              .join(" — "),
          )
        : [],
    );
  const cta = service
    ? p.services.contactMode === "booking"
      ? "Prepare my appointment"
      : p.services.contactMode === "quote"
        ? "Discuss my project"
        : "Explore the service"
    : `Explore ${name}`;
  const shared = {
    source: "creative_hypothesis" as const,
    sources,
    proofs: proof,
    limits: [
      "Audience and motivation are creative hypotheses to validate, not a proven persona.",
      ...(!proof.length
        ? [
            "No independent proof is available. Describe supplied information without promising results.",
          ]
        : []),
    ],
    exclusions: [
      ...p.product.claimsToAvoid,
      "Do not invent performance, guarantees, reviews, prices or certifications.",
      "No people without appropriate permission; no external brands.",
    ],
  };
  const make = (
    v: Omit<MarketingAngle, keyof typeof shared>,
  ): MarketingAngle => ({ ...shared, ...v });
  return [
    make({
      id: "usage",
      title: service
        ? "Make room for your project"
        : "The right object for a real moment",
      audience: `${audience}, when the practical use comes first: ${use}.`,
      situation: service
        ? `Before booking ${name}: understand the first step and the actual sequence.`
        : `When this need arises: ${use}. Show ${name} in that specific setting.`,
      notPriority:
        "People mainly seeking a status signal or an open-ended discovery without a use in mind.",
      tension: service
        ? "Wanting to begin but not knowing how to take the first step."
        : "Wanting to enjoy a specific moment without adding unnecessary complexity.",
      motivation: service
        ? `Feel able to start exploring ${category} in this setting: ${use}.`
        : `Make this particular moment feel simpler: ${use}.`,
      benefit: detail,
      promise: service
        ? `Understand how ${name} works before committing.`
        : `Find a place for ${name} in your everyday life.`,
      rationale: `This approach starts from the use described in the project: ${summary}`,
      objections: [
        {
          objection: service
            ? "What happens at the first appointment?"
            : "Does this fit my intended use?",
          answer:
            "Show the supplied process and specifications. Ask for missing details instead of inventing them.",
        },
      ],
      tone: "Direct, concrete and warm. Short sentences focused on the next action.",
      messages: [
        service
          ? `${name}, one first step at your own pace.`
          : `${name}, for this particular moment.`,
        use,
        detail,
      ],
      visualDirection: service
        ? `Show the actual supplied space and equipment for ${name}, then its steps. Never label a generated scene as authentic completed work.`
        : `Show the whole ${name} in its actual use setting. Alternate a wider view and a useful detail while preserving its shape, logo and proportions.`,
      examples: {
        hero: service
          ? `${name}: take your first step.`
          : `Make room for ${name}.`,
        subtext: summary,
        cta,
        advertisement: service
          ? `Curious about ${name}? Explore how it works and prepare your first enquiry.`
          : `A specific need, an object to understand. Discover how ${name} is used before deciding.`,
      },
    }),
    make({
      id: "reassurance",
      title: "Know why you choose",
      audience: `${audience}, comparing ${category} and looking for evidence before committing.`,
      situation: `Before choosing ${name}, examine the concrete detail: ${detail}.`,
      notPriority:
        "Impulse buyers and people who have already decided without further comparison.",
      tension:
        "Worrying about making the wrong choice or discovering a constraint too late.",
      motivation: `Feel confident in your own choice of ${category} by understanding ${detail}.`,
      benefit: detail,
      promise: `Clear information about ${name}, so you can decide.`,
      rationale: `The supplied facts support a decision without claiming that ${name} outperforms competitors.`,
      objections: [
        {
          objection: "What gives me a reason to choose this offer?",
          answer:
            proof[0] ||
            "Ask the client for a concrete detail or evidence. Do not invent superiority.",
        },
      ],
      tone: "Calm, precise and transparent about limitations. No superlatives.",
      messages: [
        `${name}, worth a closer look.`,
        detail,
        `The details that help you make your own choice of ${category}.`,
      ],
      visualDirection: `Readable close-ups of ${name} or the service equipment. Only supplied facts may be annotated. No fabricated comparison or certification seal.`,
      examples: {
        hero: `${name}. Details before decisions.`,
        subtext: detail,
        cta: service ? "Ask my questions" : "See the details",
        advertisement: `Before choosing ${name}, look at what matters to you: ${detail}. Ask for any other details instead of assuming them.`,
      },
    }),
    make({
      id: "expression",
      title: service
        ? "A project that feels like yours"
        : "A place in your own world",
      audience: `${audience}, when personal taste or intention matters more than a technical comparison of ${category}.`,
      situation: service
        ? `Preparing a personal enquiry about ${name}: explain your intention, constraints and preferences before the conversation.`
        : `Choosing how ${name} can sit alongside the things you already enjoy. Focus on ${detail}.`,
      notPriority:
        "People exclusively looking for the lowest price or a numerical performance claim.",
      tension:
        "Not wanting an impersonal choice that does not fit your own way of living.",
      motivation: `Recognise yourself in the way you choose ${name}, without following an imposed model.`,
      benefit: detail,
      promise: service
        ? `Give your enquiry about ${name} a personal intention.`
        : `Explore how ${name} fits your own world.`,
      rationale: `This hypothesis explores your relationship with ${name}; it changes neither the offer nor its appearance and claims no proven emotional effect.`,
      objections: [
        {
          objection: "Does this fit my preferences?",
          answer:
            "Present only supplied finishes, possibilities and limitations. Do not invent customisation.",
        },
      ],
      tone: "Thoughtful, editorial and restrained. Personal choice without pressure.",
      messages: [
        `Your own way of approaching ${name}.`,
        `${name}, in your world.`,
        detail,
      ],
      visualDirection: service
        ? `Editorial composition of the supplied spaces and tools around ${name}. Material details and intentions, without invented portraits or completed projects.`
        : `A large image of ${name} in a setting coherent with its known colours and materials. Space, light and finish details without altering the product.`,
      examples: {
        hero: service
          ? "Your project. Your way of approaching it."
          : `${name}, in your world.`,
        subtext: `${summary} Explore the details that speak to you, without following an imposed style.`,
        cta: service ? "Introduce my project" : "Explore the finishes",
        advertisement: `There is no single way to appreciate ${name}. Look at its details, imagine its place in your own world and make a choice that feels like yours.`,
      },
    }),
    make({
      id: "discovery",
      title: service
        ? "Allow yourself to discover"
        : "Curiosity is a first step",
      audience: `People discovering ${category}, who do not yet recognise themselves in expert vocabulary or habits.`,
      situation: `First contact with ${name}, before ${service ? "an appointment enquiry" : "a purchase"}: understand ${detail} and the described use (${use}).`,
      notPriority:
        "Experts who already understand the offer and only need advanced information.",
      tension:
        "Wanting to explore but worrying about not knowing enough or not belonging.",
      motivation: `Feel entitled to explore ${category} without already knowing all its conventions.`,
      benefit: detail,
      promise: `Enter the world of ${name} through an accessible explanation.`,
      rationale: `A welcoming introduction to ${category} makes the offer understandable without assuming expertise.`,
      objections: [
        {
          objection: "Do I need prior knowledge?",
          answer:
            "Explain the vocabulary and process. Do not claim suitability for every skill level unless confirmed.",
        },
      ],
      tone: "Welcoming, curious and clear. Never condescending.",
      messages: [
        `Discover ${name} at your own pace.`,
        summary,
        `${detail}. One first detail to enter the world of ${name}.`,
      ],
      visualDirection: `A discovery sequence for ${name}: whole view, details, then use. Open framing and progressive hierarchy using real project resources, with no added person.`,
      examples: {
        hero: `What if you discovered ${name} differently?`,
        subtext: `${summary} Take the time to understand its details, one at a time.`,
        cta: service ? "Explore the process" : "Start discovering",
        advertisement: `New to ${category}? Start with ${name}: a clear introduction, the information available, and room for your questions before deciding.`,
      },
    }),
    make({
      id: "generalist",
      title: "Generalist",
      audience: `People interested in ${name}, without a defined priority audience.`,
      situation: "An overview covering several possible interests or uses.",
      notPriority:
        "No audience excluded in principle; no claim to suit everyone.",
      tension: "Wanting to understand what is offered before going further.",
      motivation: "Get a balanced overview and decide what to explore next.",
      benefit: detail,
      promise: `Understand ${name} and reach its essential information.`,
      rationale: GENERALIST_EXPLANATION_EN,
      objections: [
        {
          objection: "What is offered, and where can I find details?",
          answer: summary,
        },
      ],
      tone: "Clear, welcoming and informative. Benefits only when supported.",
      messages: [
        summary,
        detail,
        `${name}: the offer details and answers to your questions.`,
      ],
      visualDirection: `An overall view of ${name}, followed by details, uses and practical information. Preserve its identity; do not reduce it to a logo or a generic poster.`,
      examples: {
        hero: `Discover ${name}.`,
        subtext: summary,
        cta,
        advertisement: `${name} — ${summary} Explore the offer and find answers to your questions.`,
      },
    }),
  ];
}
