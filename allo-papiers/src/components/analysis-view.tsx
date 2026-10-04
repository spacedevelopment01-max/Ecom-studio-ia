"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  Check,
  ClipboardCopy,
  ExternalLink,
  FileDown,
  FileText,
  HelpCircle,
  ListChecks,
  Paperclip,
  Vault,
  MapPin,
  MessagesSquare,
  Quote,
  ScanSearch,
  Send,
  UserRound,
} from "lucide-react";
import type { Analysis } from "@/lib/ai/schema";
import { api, ApiError } from "./api";
import { OrientationPanel } from "./orientation";
import { Alert, ProNotice, UrgencyBadge } from "./ui";

const ORIENTATION_LABELS: Record<string, string> = {
  france_services: "un conseiller France Services (gratuit)",
  organisme: "l'organisme qui vous a écrit",
  avocat: "un avocat",
  notaire: "un notaire",
  commissaire_de_justice: "un commissaire de justice",
  conciliateur: "un conciliateur de justice (gratuit)",
  association_consommateurs: "une association de consommateurs",
  service_paie: "le service paie de votre employeur",
  inspection_du_travail: "l'inspection du travail",
  point_justice: "un point-justice (accès au droit, gratuit)",
  banque_de_france: "la Banque de France",
};

const ORG_TO_KIND: Record<string, string> = {
  caf: "caf", cpam: "cpam", impots: "impots", mairie: "mairie", urssaf: "urssaf",
  france_travail: "france_travail", prefecture: "prefecture", retraite: "carsat",
};

const ESPACES: Record<string, { label: string; url: string }> = {
  caf: { label: "caf.fr – Mon Compte", url: "https://www.caf.fr/" },
  cpam: { label: "ameli.fr – compte ameli", url: "https://www.ameli.fr/" },
  impots: { label: "impots.gouv.fr – espace particulier", url: "https://www.impots.gouv.fr/" },
  urssaf: { label: "urssaf.fr", url: "https://www.urssaf.fr/" },
  france_travail: { label: "francetravail.fr", url: "https://www.francetravail.fr/" },
  retraite: { label: "info-retraite.fr", url: "https://www.info-retraite.fr/" },
};

function frDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

function Section({ icon: Icon, title, children, id }: { icon: typeof Check; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-2.5 text-xl font-semibold"><Icon className="h-6 w-6 shrink-0 text-orange" aria-hidden />{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Cite({ page, text }: { page: number; text: string }) {
  return (
    <blockquote className="mt-2 rounded-xl border-l-4 border-orange/60 bg-sand/60 px-4 py-2.5 text-[0.97rem] text-ink/85">
      « {text} » <span className="whitespace-nowrap text-sm text-muted">— page {page}</span>
    </blockquote>
  );
}

export type PieceStatus = { libelle: string; type: string; source: { page: number; citation: string } | null; inVault: boolean; note: string | null };

export type AnalysisViewProps = {
  analysis: Analysis;
  mode: "exemple" | "document";
  documentId?: string;
  checklist?: { step_index: number; done: boolean }[];
  deadline?: { id: string; confirmed_at: string | null; enabled: boolean } | null;
  plan?: "free" | "plus";
  /** Disponibilité dans le coffre des pièces demandées (calculée côté serveur). */
  pieces?: PieceStatus[];
};

export function AnalysisView({ analysis: a, mode, documentId, checklist = [], deadline, plan = "free", pieces }: AnalysisViewProps) {
  const [done, setDone] = useState<Record<number, boolean>>(() => Object.fromEntries(checklist.map((c) => [c.step_index, c.done])));
  const [confirmed, setConfirmed] = useState(Boolean(deadline?.confirmed_at));
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isExample = mode === "exemple";
  const kind = ORG_TO_KIND[a.organisme.type];
  const espace = ESPACES[a.organisme.type];
  const draftText = a.brouillon_reponse ? `Objet : ${a.brouillon_reponse.objet}\n\n${a.brouillon_reponse.corps}` : "";

  async function toggle(i: number) {
    const next = !done[i];
    setDone((d) => ({ ...d, [i]: next }));
    if (!isExample && documentId) await api(`/api/documents/${documentId}/checklist`, { method: "POST", json: { index: i, done: next } }).catch(() => {});
  }

  async function confirmDeadline() {
    if (!deadline) return;
    setBusy(true);
    try {
      await api(`/api/deadlines/${deadline.id}`, { method: "PATCH", json: { confirm: true } });
      setConfirmed(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de confirmer.");
    } finally {
      setBusy(false);
    }
  }

  // Les anciennes analyses n'ont pas ce champ.
  const asked: PieceStatus[] = pieces ?? (a.pieces_demandees ?? []).map((p) => ({ libelle: p.libelle, type: p.type_piece, source: p.source, inVault: false, note: null }));
  const inVault = asked.filter((p) => p.inVault).length;

  async function toLetter(autoAttach = false) {
    if (!documentId) return;
    setBusy(true);
    try {
      const r = await api<{ id: string; attached?: number }>("/api/letters", { method: "POST", json: { document_id: documentId, auto_attach: autoAttach } });
      location.href = autoAttach ? `/courriers/${r.id}?pieces=${r.attached ?? 0}#pieces` : `/courriers/${r.id}`;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de créer le courrier.");
      setBusy(false);
    }
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("La copie automatique n'est pas autorisée : sélectionnez le texte et copiez-le.");
    }
  }

  return (
    <div className="grid gap-5">
      {isExample && <Alert tone="info" title="Exemple fictif">Ce résultat a été écrit pour illustrer le service. Il ne provient d'aucun vrai document et ne consomme aucun crédit.</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      {a.instructions_ignorees && (
        <Alert tone="warn" title="Consignes suspectes ignorées">Ce document contient des phrases qui ressemblent à des instructions adressées à une IA. Elles ont été ignorées. Soyez prudent quant à son origine.</Alert>
      )}
      {a.lisibilite.globale !== "bonne" && (
        <Alert tone="warn" title={a.lisibilite.globale === "insuffisante" ? "Document difficile à lire" : "Lecture partielle"}>
          {a.lisibilite.remarques ?? "Une partie du document n'a pas pu être lue correctement."}
          {a.lisibilite.pages_illisibles.length > 0 && ` Pages concernées : ${a.lisibilite.pages_illisibles.join(", ")}.`} Reprenez une photo plus nette pour une analyse fiable.
        </Alert>
      )}

      {/* En bref */}
      <section className="card neon p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <UrgencyBadge level={a.urgence.niveau} />
          <span className="chip">{a.type_document}</span>
          {a.organisme.nom && <span className="chip">{a.organisme.nom}</span>}
        </div>
        <h2 className="font-display mt-4 text-[1.7rem] font-semibold leading-snug">En bref</h2>
        <p className="mt-2 text-[1.12rem] leading-relaxed">{a.resume_simple}</p>
        {a.demande_principale && (
          <div className="mt-4 rounded-2xl bg-orange-soft p-4">
            <p className="text-sm font-bold uppercase tracking-wider text-orange-dark">Ce qu'on vous demande</p>
            <p className="mt-1 text-[1.08rem] font-medium">{a.demande_principale}</p>
          </div>
        )}
        <p className="mt-4 text-[0.97rem] text-muted"><strong className="text-ink">Pourquoi cette urgence&nbsp;:</strong> {a.urgence.justification}</p>
      </section>

      {/* Échéance */}
      <Section icon={CalendarClock} title="Date limite">
        {a.date_limite.date ? (
          <>
            <p className="text-2xl font-semibold">{frDate(a.date_limite.date)}</p>
            {a.date_limite.libelle && <p className="text-muted">{a.date_limite.libelle}</p>}
            <p className="mt-2">
              {a.date_limite.nature === "ecrite" ? (
                <span className="chip bg-ok-soft text-ok">Date écrite dans le document</span>
              ) : (
                <span className="chip bg-warn-soft text-warn">Date calculée — à confirmer</span>
              )}
            </p>
            {a.date_limite.source && <Cite page={a.date_limite.source.page} text={a.date_limite.source.citation} />}
            {a.date_limite.calcul && <p className="mt-2 text-[0.97rem] text-muted">Calcul : {a.date_limite.calcul}</p>}
            {a.date_limite.incertitude && <p className="mt-2 text-[0.97rem] text-warn">{a.date_limite.incertitude}</p>}
            {!isExample && deadline && (
              <div className="mt-4">
                {confirmed ? (
                  <p className="flex items-center gap-2 font-semibold text-ok"><BellRing className="h-5 w-5" aria-hidden /> Date confirmée : rappels par email programmés. <Link href="/rappels" className="underline">Modifier</Link></p>
                ) : (
                  <button className="btn btn-navy w-full sm:w-auto" onClick={confirmDeadline} disabled={busy}>
                    <BellRing className="h-5 w-5" aria-hidden /> J'ai vérifié cette date : programmer des rappels
                  </button>
                )}
                {!confirmed && <p className="mt-2 text-sm text-muted">Aucun rappel n'est envoyé tant que vous n'avez pas confirmé la date.</p>}
              </div>
            )}
          </>
        ) : (
          <p>Aucune date limite n'est écrite dans ce document. {a.date_limite.incertitude ?? "Si vous pensez qu'il y en a une, vérifiez le document ou contactez l'organisme."}</p>
        )}
        {a.autres_dates.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold">Autres dates du document</summary>
            <ul className="mt-2 grid gap-2">
              {a.autres_dates.map((d, i) => <li key={i}><strong>{frDate(d.date)}</strong> — {d.libelle}<Cite page={d.source.page} text={d.source.citation} /></li>)}
            </ul>
          </details>
        )}
      </Section>

      {/* Étapes */}
      {a.etapes.length > 0 && (
        <Section icon={ListChecks} title="Les étapes, une par une">
          <ul className="grid gap-2">
            {a.etapes.map((s, i) => (
              <li key={i}>
                <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${done[i] ? "border-[#bfdccb] bg-ok-soft" : "border-line bg-white hover:border-navy/30"}`}>
                  <input type="checkbox" className="check" checked={Boolean(done[i])} onChange={() => toggle(i)} />
                  <span>
                    <span className={`font-semibold ${done[i] ? "line-through decoration-ok/60" : ""}`}>{s.texte}</span>
                    {s.detail && <span className="mt-0.5 block text-[0.96rem] text-muted">{s.detail}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Conséquences */}
      <Section icon={AlertTriangle} title="Si vous ne faites rien">
        <p>{a.consequences.texte}</p>
        {a.consequences.source ? <Cite page={a.consequences.source.page} text={a.consequences.source.citation} /> : <p className="mt-2 text-sm text-muted">Le document ne précise pas de conséquence : aucune n'est supposée ici.</p>}
      </Section>

      {asked.length > 0 && (
        <Section icon={Paperclip} title="Pièces demandées par ce courrier" id="pieces">
          <ul className="grid gap-2.5">
            {asked.map((p, i) => (
              <li key={i} className="rounded-2xl border border-line p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{p.libelle}</span>
                  {!isExample && (p.inVault ? (
                    <span className="chip bg-ok/10 text-ok"><Check className="h-4 w-4" aria-hidden /> Dans votre coffre</span>
                  ) : (
                    <span className="chip bg-warn/10 text-warn">Pas encore dans votre coffre</span>
                  ))}
                </div>
                {p.note && <p className="mt-1 text-[0.95rem] text-warn">{p.note}</p>}
                {p.source && <Cite page={p.source.page} text={p.source.citation} />}
              </li>
            ))}
          </ul>
          {isExample ? (
            <p className="mt-4 text-[0.97rem] text-muted">Avec un compte, les pièces que vous scannez sont rangées dans votre coffre-fort et jointes à votre réponse en un clic.</p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button className="btn btn-primary !min-h-11 w-full" onClick={() => toLetter(true)} disabled={busy}>
                <Vault className="h-5 w-5" aria-hidden /> Répondre avec mes documents enregistrés
              </button>
              {inVault < asked.length && (
                <Link href={`/nouveau?mode=piece&retour=/documents/${documentId}`} className="btn btn-outline !min-h-11 w-full">Scanner une pièce manquante</Link>
              )}
              <p className="text-[0.95rem] text-muted sm:col-span-2">
                {inVault > 0 ? `${inVault} pièce${inVault > 1 ? "s" : ""} sur ${asked.length} trouvée${inVault > 1 ? "s" : ""} dans votre coffre.` : "Aucune de ces pièces n'est encore dans votre coffre."}{" "}
                Elles seront jointes au courrier : vous pourrez les vérifier, les retirer ou en ajouter avant tout envoi.
              </p>
            </div>
          )}
        </Section>
      )}

      {/* Répondre : trois façons */}
      <Section icon={Send} title="Répondre" id="repondre">
        {a.brouillon_reponse ? (
          <>
            <p className="text-sm font-bold uppercase tracking-wider text-muted">Brouillon proposé — à relire et compléter</p>
            <div className="prose-letter mt-2 rounded-2xl border border-line bg-[#fffdf9] p-4 text-[1rem]">{draftText}</div>
            {a.brouillon_reponse.a_completer.length > 0 && (
              <p className="mt-2 text-[0.97rem] text-warn">À compléter : {a.brouillon_reponse.a_completer.join(", ")}.</p>
            )}
          </>
        ) : (
          <p className="text-muted">Aucune réponse écrite ne semble nécessaire pour ce document.</p>
        )}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-line p-4">
            <p className="font-semibold"><FileText className="mr-1 inline h-5 w-5 text-orange" aria-hidden /> A. Copier ou PDF</p>
            <p className="mt-1 text-[0.95rem] text-muted">Modifiez le texte, puis copiez-le ou téléchargez un PDF propre.</p>
            {a.brouillon_reponse && (
              <div className="mt-3 grid gap-2">
                <button className="btn btn-outline !min-h-11 w-full" onClick={copyDraft}><ClipboardCopy className="h-5 w-5" aria-hidden /> {copied ? "Copié !" : "Copier"}</button>
                {isExample ? (
                  <Link href="/connexion" className="btn btn-primary !min-h-11 w-full"><FileDown className="h-5 w-5" aria-hidden /> Modifier et exporter</Link>
                ) : (
                  <button className="btn btn-primary !min-h-11 w-full" onClick={() => toLetter()} disabled={busy}><FileDown className="h-5 w-5" aria-hidden /> Modifier et exporter</button>
                )}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-line p-4">
            <p className="font-semibold"><ExternalLink className="mr-1 inline h-5 w-5 text-orange" aria-hidden /> B. Espace officiel</p>
            <p className="mt-1 text-[0.95rem] text-muted">
              Connectez-vous vous-même à votre espace{espace ? "" : " en ligne"}, puis utilisez la messagerie ou le dépôt de documents. Allô Papiers ne s'y connecte jamais et ne demande jamais vos mots de passe.
            </p>
            {espace && <a href={espace.url} target="_blank" rel="noreferrer" className="btn btn-outline mt-3 !min-h-11 w-full">{espace.label} <ExternalLink className="h-4 w-4" aria-hidden /></a>}
          </div>
          <div className="rounded-2xl border border-line p-4">
            <p className="font-semibold"><Send className="mr-1 inline h-5 w-5 text-orange" aria-hidden /> C. Recommandé</p>
            <p className="mt-1 text-[0.95rem] text-muted">Préparez une lettre recommandée (paiement séparé). Rien ne part sans votre validation explicite.</p>
            {!isExample && a.brouillon_reponse && <button className="btn btn-outline mt-3 !min-h-11 w-full" onClick={() => toLetter()} disabled={busy}>Préparer l'envoi</button>}
          </div>
        </div>
      </Section>

      {/* Adresse et coordonnées */}
      <Section icon={MapPin} title="Adresse et coordonnées">
        {a.destinataire ? (
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm font-bold uppercase tracking-wider text-muted">Adresse écrite dans le courrier</p>
            <p className="mt-1 whitespace-pre-line font-medium">{[a.destinataire.nom, a.destinataire.adresse].filter(Boolean).join("\n")}</p>
            <Cite page={a.destinataire.source.page} text={a.destinataire.source.citation} />
          </div>
        ) : (
          <p className="text-muted">Aucune adresse de réponse n'est écrite dans le document.</p>
        )}
        {a.references_utiles.length > 0 && (
          <ul className="mt-3 grid gap-1 text-[0.97rem]">
            {a.references_utiles.map((r, i) => <li key={i}><strong>{r.libelle}</strong> : {r.valeur} <span className="text-muted">(page {r.page})</span></li>)}
          </ul>
        )}
        {kind && (
          <div className="mt-5 border-t border-line pt-5">
            <p className="mb-3 font-semibold">Coordonnées dans l'annuaire officiel de l'administration</p>
            <p className="mb-4 text-[0.95rem] text-muted">Si l'adresse de l'annuaire diffère de celle du courrier, vérifiez auprès de l'organisme avant d'envoyer quoi que ce soit.</p>
            <OrientationPanel initialKind={kind} lockKind />
          </div>
        )}
      </Section>

      {/* Anomalies */}
      {(a.anomalies.length > 0 || a.pistes_verification.length > 0) && (
        <Section icon={ScanSearch} title="Repérage d'anomalies et aide à la vérification">
          <p className="text-[0.97rem] text-muted">Ce n'est pas une certification : une image ne prouve pas qu'un document est vrai ou faux. Voici ce qui a été observé et comment vérifier.</p>
          {plan === "free" && !isExample && a.anomalies.length > 0 && <p className="mt-2 text-sm text-muted">Le repérage complet fait partie du parcours « Vérifier un document » (offre Plus).</p>}
          <ul className="mt-3 grid gap-3">
            {a.anomalies.map((an, i) => (
              <li key={i} className="rounded-2xl border border-[#f3d3a6] bg-warn-soft/60 p-4">
                <p><strong>Observé :</strong> {an.observation}</p>
                <p className="mt-1 text-[0.97rem] text-muted"><strong className="text-ink">Ce que cela peut signifier :</strong> {an.interpretation_prudente}</p>
                {an.source && <Cite page={an.source.page} text={an.source.citation} />}
              </li>
            ))}
          </ul>
          {a.pistes_verification.length > 0 && (
            <ul className="mt-4 grid gap-2">
              {a.pistes_verification.map((p, i) => <li key={i} className="flex gap-2"><Check className="mt-1 h-5 w-5 shrink-0 text-ok" aria-hidden />{p}</li>)}
            </ul>
          )}
        </Section>
      )}

      {/* Sources */}
      {a.passages_sources.length > 0 && (
        <Section icon={Quote} title="Passages du document qui justifient ces explications">
          <ul className="grid gap-3">
            {a.passages_sources.map((s, i) => <li key={i}><span className="font-semibold">{s.element}</span><Cite page={s.page} text={s.citation} /></li>)}
          </ul>
        </Section>
      )}

      {/* Points à vérifier */}
      {(a.informations_manquantes.length > 0 || a.incertitudes.length > 0 || a.verifications_externes.length > 0) && (
        <Section icon={HelpCircle} title="Ce qui reste à vérifier">
          {a.informations_manquantes.length > 0 && (
            <>
              <p className="font-semibold">Informations manquantes</p>
              <ul className="mt-1 list-disc pl-6">{a.informations_manquantes.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </>
          )}
          {a.incertitudes.length > 0 && (
            <>
              <p className="mt-3 font-semibold">Incertitudes</p>
              <ul className="mt-1 list-disc pl-6">{a.incertitudes.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </>
          )}
          {a.verifications_externes.length > 0 && (
            <>
              <p className="mt-3 font-semibold">À vérifier sur une source officielle à jour</p>
              <ul className="mt-1 list-disc pl-6">{a.verifications_externes.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <p className="mt-2 text-sm text-muted">Sources conseillées : service-public.gouv.fr, legifrance.gouv.fr, le site de l'organisme, ou un conseiller France Services.</p>
            </>
          )}
        </Section>
      )}

      {/* Orientation */}
      {(a.situation_complexe.est_complexe || a.orientation.vers !== "aucune") && (
        <Section icon={UserRound} title="Se faire accompagner">
          {a.situation_complexe.est_complexe && (
            <Alert tone="warn" title="Situation qui mérite un accompagnement">
              <ul className="list-disc pl-5">{a.situation_complexe.motifs.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </Alert>
          )}
          {a.orientation.vers !== "aucune" && (
            <p className="mt-3">Nous vous conseillons de vous rapprocher de <strong>{ORIENTATION_LABELS[a.orientation.vers] ?? a.orientation.vers}</strong>.{a.orientation.raison ? ` ${a.orientation.raison}` : ""}</p>
          )}
          <Link href="/orientation" className="btn btn-outline mt-4 w-full sm:w-auto">Trouver un espace France Services</Link>
        </Section>
      )}

      {!isExample && documentId && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={`/documents/${documentId}/discussion`} className="btn btn-navy w-full"><MessagesSquare className="h-5 w-5" aria-hidden /> Poser une question sur ce document</Link>
          <Link href="/rendez-vous" className="btn btn-outline w-full"><UserRound className="h-5 w-5" aria-hidden /> Préparer un rendez-vous</Link>
        </div>
      )}
      <ProNotice />
    </div>
  );
}
