"use client";
/**
 * Fiche d'activité d'un service (#204, étape 1) : récapitulatif modifiable de la compréhension, rangé par rubrique.
 * Chaque question est courte et placée dans sa rubrique ; une réponse ou une correction complète la fiche aussitôt,
 * sans nouvel appel IA. Les états restent lisibles : fourni par vous, à vérifier, à compléter, à préciser plus tard.
 */
import { useState, type ComponentProps, type ReactNode } from "react";
import { Badge, Button as BaseButton, Input, Textarea } from "../ui";
import { useT } from "../i18n";
import type { Brief } from "@/lib/preparation/types";
import type { BriefTopic, Fact, Question, ServiceItem } from "@/lib/project-types";
import { blocking, factState, factTopic, GUIDED, questionTopic, STATE_LABEL, TOPIC_LABEL, type FicheState } from "@/lib/preparation/fiche";

/** Libellés longs sur téléphone : le bouton s'agrandit au lieu de couper le texte. */
const Button = (props: ComponentProps<typeof BaseButton>) => <BaseButton {...props} className={`h-auto min-h-9 whitespace-normal py-1.5 ${props.className ?? ""}`} />;

type Send = (body: Record<string, unknown>) => Promise<unknown>;
const TONE: Record<FicheState, "ok" | "info" | "warn" | "neutral"> = { provided: "ok", check: "info", unknown: "warn", later: "neutral" };

function StateBadge({ state }: { state: FicheState }) {
  const t = useT();
  return <Badge tone={TONE[state]} className="shrink-0" data-fiche-state={state}>{t(...STATE_LABEL[state])}</Badge>;
}

function Rubric({ topic, state, children }: { topic: BriefTopic; state?: FicheState; children: ReactNode }) {
  const t = useT();
  return (
    <section className="grid gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0" data-fiche-topic={topic}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">{t(...TOPIC_LABEL[topic])}</h4>
        {state && <StateBadge state={state} />}
      </div>
      {children}
    </section>
  );
}

/** Un point de la fiche : valeur, état, et correction en place (avec « plus tard » quand il n'est pas indispensable). */
function FactLine({ fact, busy, send }: { fact: Fact; busy: boolean; send: Send }) {
  const t = useT();
  const state = factState(fact);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(fact.value);
  const topic = factTopic(fact);
  const save = async (kind: "fact" | "later") => {
    await send({ action: "fiche", fiche: kind === "fact" ? { kind, key: fact.key, label: fact.label, topic, value } : { kind, key: fact.key, label: fact.label, topic } });
    setEditing(false);
  };
  return (
    <div className="grid gap-1 rounded-lg bg-paper-2 p-2 text-sm" data-fiche-fact={fact.key}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0">
          <span className="font-medium">{fact.label}</span>
          {fact.value.trim() ? ` : ${fact.value}` : ""}
        </p>
        <StateBadge state={state} />
      </div>
      {editing ? (
        <div className="grid gap-2">
          <Textarea rows={2} value={value} onChange={(e) => setValue(e.target.value)} aria-label={fact.label} maxLength={3000} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !value.trim()} onClick={() => save("fact")}>{t("Enregistrer", "Save")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t("Annuler", "Cancel")}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {state === "check" && <Button size="sm" variant="secondary" disabled={busy} onClick={() => send({ action: "fiche", fiche: { kind: "fact", key: fact.key, label: fact.label, topic, value: fact.value } })}>{t("C’est exact", "This is correct")}</Button>}
          <Button size="sm" variant="ghost" onClick={() => { setValue(fact.value); setEditing(true); }}>{state === "unknown" || state === "later" ? t("Compléter", "Complete") : t("Corriger", "Edit")}</Button>
          {state === "unknown" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => save("later")}>{t("À préciser plus tard", "Specify later")}</Button>}
        </div>
      )}
    </div>
  );
}

/** Question courte du studio. Pour les prestations, une réponse par prestation : elle en devient la description. */
function QuestionForm({ q, services, busy, send }: { q: Question; services: ServiceItem[]; busy: boolean; send: Send }) {
  const t = useT();
  const [answer, setAnswer] = useState("");
  const [free, setFree] = useState(false);
  const perService = questionTopic(q) === "services" && services.length > 0 && !free;
  const [details, setDetails] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState({ name: "", detail: "" });
  const items = [
    ...services.map((s) => ({ name: s.name, detail: details[s.name] ?? "" })),
    ...(extra.name.trim() ? [extra] : []),
  ].filter((x) => x.detail.trim());
  const canSend = perService ? items.length > 0 : !!answer.trim();
  return (
    <form
      className="grid gap-2 rounded-lg border border-line p-3"
      data-fiche-question={q.id}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) send(perService ? { action: "answer", questionId: q.id, items } : { action: "answer", questionId: q.id, answer });
      }}
    >
      <p className="text-sm font-medium">{q.question}</p>
      {q.why && <p className="text-xs text-muted">{q.why}</p>}
      {perService ? (
        <>
          {services.map((s) => (
            <label key={s.name} className="grid gap-1 text-sm">
              <span>{t(`Que comprend « ${s.name} » ?`, `What does “${s.name}” include?`)}</span>
              <Textarea rows={2} maxLength={1000} value={details[s.name] ?? ""} onChange={(e) => setDetails({ ...details, [s.name]: e.target.value })} placeholder={t("Quelques mots suffisent.", "A few words are enough.")} />
            </label>
          ))}
          <button type="button" className="justify-self-start text-sm text-muted underline" onClick={() => setFree(true)}>{t("Répondre plutôt en une phrase", "Answer in one sentence instead")}</button>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">{t("Une autre prestation ?", "Another service?")}</summary>
            <div className="mt-2 grid gap-2">
              <Input aria-label={t("Nom de la prestation", "Service name")} placeholder={t("Nom de la prestation", "Service name")} value={extra.name} maxLength={160} onChange={(e) => setExtra({ ...extra, name: e.target.value })} />
              <Textarea aria-label={t("Ce qu’elle comprend", "What it includes")} placeholder={t("Ce qu’elle comprend", "What it includes")} rows={2} maxLength={1000} value={extra.detail} onChange={(e) => setExtra({ ...extra, detail: e.target.value })} />
            </div>
          </details>
        </>
      ) : (
        <Textarea rows={2} maxLength={3000} value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label={q.question} placeholder={t("Une ou deux phrases suffisent.", "One or two sentences are enough.")} />
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="submit" disabled={busy || !canSend}>{t("Ajouter à ma fiche", "Add to my profile")}</Button>
        {!q.required && <Button size="sm" variant="ghost" type="button" disabled={busy} onClick={() => send({ action: "answer", questionId: q.id, later: true })}>{t("À préciser plus tard", "Specify later")}</Button>}
      </div>
      {q.required && <p className="text-xs text-muted">{t("Nécessaire pour comprendre votre activité.", "Needed to understand your business.")}</p>}
    </form>
  );
}

/** Rubrique sans question ni information : question courte proposée par le studio, sans appel IA. */
function GuidedForm({ g, busy, send }: { g: (typeof GUIDED)[number]; busy: boolean; send: Send }) {
  const t = useT();
  const [value, setValue] = useState("");
  const label = t(...g.label);
  return (
    <form
      className="grid gap-2 rounded-lg border border-line p-3"
      data-fiche-guided={g.topic}
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) send({ action: "fiche", fiche: { kind: "fact", key: g.key, label, topic: g.topic, value } });
      }}
    >
      <p className="text-sm font-medium">{t(...g.prompt)}</p>
      <Textarea rows={2} maxLength={3000} value={value} onChange={(e) => setValue(e.target.value)} aria-label={t(...g.prompt)} placeholder={t("Une ou deux phrases suffisent.", "One or two sentences are enough.")} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="submit" disabled={busy || !value.trim()}>{t("Ajouter à ma fiche", "Add to my profile")}</Button>
        <Button size="sm" variant="ghost" type="button" disabled={busy} onClick={() => send({ action: "fiche", fiche: { kind: "later", key: g.key, label, topic: g.topic } })}>{t("À préciser plus tard", "Specify later")}</Button>
      </div>
    </form>
  );
}

function SummaryEditor({ brief, busy, send }: { brief: Brief; busy: boolean; send: Send }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(brief.profile.summary);
  if (!editing)
    return (
      <div className="grid gap-2">
        <p className="text-sm" data-fiche-summary>{brief.profile.summary}</p>
        <div><Button size="sm" variant="ghost" onClick={() => { setValue(brief.profile.summary); setEditing(true); }}>{t("Corriger la présentation", "Edit the description")}</Button></div>
      </div>
    );
  return (
    <div className="grid gap-2">
      <Textarea rows={3} maxLength={2000} value={value} onChange={(e) => setValue(e.target.value)} aria-label={t("Présentation de l’activité", "About the business")} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || !value.trim()} onClick={async () => { await send({ action: "fiche", fiche: { kind: "summary", value } }); setEditing(false); }}>{t("Enregistrer", "Save")}</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t("Annuler", "Cancel")}</Button>
      </div>
    </div>
  );
}

/** Rubrique la plus incomplète d'abord : à compléter, puis à vérifier, sinon fournie. */
const worst = (states: FicheState[]): FicheState | undefined =>
  !states.length ? undefined : states.includes("unknown") ? "unknown" : states.includes("check") ? "check" : states.includes("later") ? "later" : "provided";

export function BriefFiche({ brief, busy, send, onEditServices, spent }: { brief: Brief; busy: boolean; send: Send; onEditServices: () => void; spent?: ReactNode }) {
  const t = useT();
  const facts = brief.profile.facts;
  const open = brief.profile.questions.filter((q) => !q.answer?.trim() && (!q.later || blocking(q)));
  const ofTopic = (topic: BriefTopic) => ({
    facts: facts.filter((f) => factTopic(f) === topic),
    questions: open.filter((q) => questionTopic(q) === topic),
  });
  const ownList = brief.input.services.services.length > 0;
  const serviceState = (x: ServiceItem): FicheState => (x.source === "client" || (!x.source && ownList) ? "provided" : "check");
  const services = brief.services.services;
  const svc = ofTopic("services");
  // Une réponse donnée prestation par prestation figure déjà dans leurs descriptions : pas de doublon à l'écran.
  const perServiceAnswer = (f: Fact) =>
    brief.profile.questions.some((q) => q.factKey === f.key && !!q.answer && q.answer.split("\n").every((line) => services.some((x) => line.startsWith(`${x.name} : `))));
  const practical = ofTopic("practical");
  const others = facts.filter((f) => factTopic(f) === null);
  const s = brief.services;
  const contact: [string, string, string][] = [
    [t("Téléphone", "Phone"), s.phone, "phone"],
    [t("E-mail", "Email"), s.email, "email"],
    [t("Horaires", "Opening hours"), s.hours, "hours"],
    [t("Adresse", "Address"), s.address, "address"],
    [t("Lien de rendez-vous", "Booking link"), s.bookingUrl, "bookingUrl"],
  ];
  return (
    <div className="grid gap-4 rounded-xl border border-line p-4" data-brief-fiche>
      <div className="grid gap-1">
        <h3 className="font-semibold">{t("Votre fiche d’activité", "Your business profile")}</h3>
        <p className="text-sm text-muted">
          {t(
            "Vérifiez chaque rubrique et répondez aux questions courtes. Vos réponses complètent cette fiche aussitôt, sans nouvel appel à l’IA ni coût. Rien n’est affirmé sur votre site sans votre confirmation.",
            "Check each section and answer the short questions. Your answers complete this profile right away, with no new AI call and no cost. Nothing is stated on your site without your confirmation.",
          )}
        </p>
        {spent}
      </div>

      <Rubric topic="activity" state={brief.profile.summaryStatus === "provided" ? "provided" : "check"}>
        <SummaryEditor key={brief.profile.summary} brief={brief} busy={busy} send={send} />
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">{t("Votre texte de départ (conservé)", "Your original text (kept)")}</summary>
          <p className="mt-1 whitespace-pre-line" data-fiche-original>{brief.input.description}</p>
        </details>
        {ofTopic("activity").facts.map((f) => <FactLine key={f.key} fact={f} busy={busy} send={send} />)}
        {ofTopic("activity").questions.map((q) => <QuestionForm key={q.id} q={q} services={services} busy={busy} send={send} />)}
      </Rubric>

      <Rubric topic="services" state={worst(services.map(serviceState))}>
        {services.length ? (
          <ul className="grid gap-2">
            {services.map((x, i) => (
              <li key={`${x.name}-${i}`} className="grid gap-1 rounded-lg bg-paper-2 p-2 text-sm" data-fiche-service={x.name}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-medium">{x.name}</span>
                  <StateBadge state={serviceState(x)} />
                </div>
                {x.description && <span>{x.description}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-warn">{t("Aucune prestation identifiée : ajoutez-en au moins une.", "No service identified: add at least one.")}</p>
        )}
        {svc.facts.filter((f) => !perServiceAnswer(f)).map((f) => <FactLine key={f.key} fact={f} busy={busy} send={send} />)}
        {svc.questions.map((q) => <QuestionForm key={q.id} q={q} services={services} busy={busy} send={send} />)}
        <div><Button size="sm" variant="ghost" onClick={onEditServices}>{t("Modifier ou ajouter des prestations", "Edit or add services")}</Button></div>
      </Rubric>

      {GUIDED.map((g) => {
        const r = ofTopic(g.topic);
        const states = r.facts.map(factState);
        return (
          <Rubric key={g.topic} topic={g.topic} state={worst(states) ?? "unknown"}>
            {r.facts.map((f) => <FactLine key={f.key} fact={f} busy={busy} send={send} />)}
            {r.questions.map((q) => <QuestionForm key={q.id} q={q} services={services} busy={busy} send={send} />)}
            {/* Question guidée tant que la rubrique n'a ni question de l'analyse ni réponse à ce sujet précis. */}
            {!r.questions.length && !r.facts.some((f) => f.key === g.key) && <GuidedForm g={g} busy={busy} send={send} />}
          </Rubric>
        );
      })}

      <section className="grid gap-2 border-t border-line pt-3" data-fiche-topic="audience">
        <h4 className="font-semibold">{t("Clientèle et zone", "Customers and area")}</h4>
        <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-paper-2 p-2 text-sm">
          <p className="min-w-0"><span className="font-medium">{t("Clientèle", "Customers")}</span>{brief.input.target.trim() ? ` : ${brief.input.target}` : ""}</p>
          <StateBadge state={brief.input.target.trim() ? "provided" : "unknown"} />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-paper-2 p-2 text-sm">
          <p className="min-w-0"><span className="font-medium">{t("Zone", "Area")}</span>{s.area.trim() ? ` : ${s.area}` : ""}</p>
          <StateBadge state={s.area.trim() ? (brief.input.services.area.trim() ? "provided" : "check") : "unknown"} />
        </div>
      </section>

      {!!others.length && (
        <section className="grid gap-2 border-t border-line pt-3" data-fiche-topic="other">
          <h4 className="font-semibold">{t("Autres points", "Other points")}</h4>
          <p className="text-xs text-muted">{t("Les points à compléter ne seront pas affirmés sur votre site tant que vous ne les aurez pas renseignés.", "Points to complete will not be stated on your site until you fill them in.")}</p>
          {others.map((f) => <FactLine key={f.key} fact={f} busy={busy} send={send} />)}
        </section>
      )}

      <Rubric topic="practical">
        <p className="text-sm text-muted">
          {t(
            "Facultatif à cette étape : ces informations seront demandées avant la mise en ligne de votre site. Vous pouvez les saisir dès maintenant dans « Vos prestations et votre contact ».",
            "Optional at this stage: this information will be requested before your site goes live. You can enter it now in “Your services and contact”.",
          )}
        </p>
        <ul className="grid gap-1 text-sm">
          {contact.map(([label, value, key]) => (
            <li key={key} className="flex flex-wrap items-center justify-between gap-2" data-fiche-contact={key}>
              <span>{label}{value.trim() ? ` : ${value}` : ""}</span>
              <StateBadge state={value.trim() ? "provided" : "later"} />
            </li>
          ))}
        </ul>
        {[...practical.questions].map((q) => (
          <p key={q.id} className="text-xs text-muted" data-fiche-practical-question={q.id}>{t("Question reportée à la mise en ligne : ", "Question deferred to go-live: ")}{q.question}</p>
        ))}
      </Rubric>
    </div>
  );
}
