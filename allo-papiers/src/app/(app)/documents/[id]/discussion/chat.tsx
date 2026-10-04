"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HelpCircle, Lightbulb, Quote, SendHorizontal, UserRound } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert, ProNotice, Spinner } from "@/components/ui";
import type { ChatAnswer } from "@/lib/ai/schema";

type Msg = { id?: string; role: "user" | "assistant"; content: { text?: string } & Partial<ChatAnswer> };

const SUGGESTIONS = ["Explique-moi ce courrier simplement", "Que dois-je faire maintenant ?", "Quelles pièces manque-t-il ?", "Aide-moi à reformuler ma réponse"];

function Answer({ a }: { a: ChatAnswer }) {
  return (
    <div className="grid gap-3">
      <p className="whitespace-pre-line">{a.reponse}</p>
      {a.ce_que_dit_le_document.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-ok"><Quote className="h-4 w-4" aria-hidden /> Ce que dit le document</p>
          <ul className="mt-1 grid gap-2">
            {a.ce_que_dit_le_document.map((c, i) => (
              <li key={i} className="rounded-xl border-l-4 border-orange/60 bg-sand/60 px-3 py-2 text-[0.96rem]">
                « {c.citation} » <span className="text-sm text-muted">— page {c.page}</span>
                <span className="mt-1 block text-muted">{c.explication}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {a.suppositions.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-warn"><Lightbulb className="h-4 w-4" aria-hidden /> Ce qui est supposé</p>
          <ul className="mt-1 list-disc pl-5 text-[0.96rem]">{a.suppositions.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {a.a_verifier.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-navy"><HelpCircle className="h-4 w-4" aria-hidden /> À vérifier</p>
          <ul className="mt-1 list-disc pl-5 text-[0.96rem]">{a.a_verifier.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {a.orientation && <p className="flex gap-2 text-[0.96rem]"><UserRound className="mt-0.5 h-5 w-5 shrink-0 text-orange" aria-hidden />{a.orientation}</p>}
    </div>
  );
}

export function Chat({ docId, title, plan, analyzed }: { docId: string; title: string; plan: "free" | "plus"; analyzed: boolean }) {
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ messages: Msg[] }>(`/api/documents/${docId}/chat`).then((r) => setMessages(r.messages)).catch(() => setMessages([]));
  }, [docId]);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, busy]);

  async function ask(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    setMessages((m) => [...(m ?? []), { role: "user", content: { text: question } }]);
    setQ("");
    try {
      const r = await api<{ answer: ChatAnswer }>(`/api/documents/${docId}/chat`, { method: "POST", json: { question } });
      setMessages((m) => [...(m ?? []), { role: "assistant", content: r.answer }]);
    } catch (e) {
      setMessages((m) => (m ?? []).slice(0, -1));
      setQ(question);
      setError(e instanceof ApiError ? e.message : "Pas de réponse pour le moment. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page max-w-3xl pb-10">
      <div className="mb-5 mt-6 md:mt-10">
        <Link href={`/documents/${docId}`} className="text-[0.95rem] font-semibold text-muted hover:text-orange">← Retour au résultat</Link>
        <h1 className="font-display mt-3 text-[1.8rem] font-semibold leading-tight">Questions sur « {title} »</h1>
        <p className="mt-1 text-muted">Les réponses s'appuient sur votre document et citent les passages. Elles distinguent ce qui est écrit, ce qui est supposé et ce qu'il faut vérifier.</p>
      </div>
      {plan !== "plus" && (
        <Alert tone="info" title="Fonction de l'offre Plus" className="mb-5">
          La discussion avec les documents fait partie de l'offre Plus (4,99 € par mois). <Link href="/compte/abonnement" className="font-semibold underline">Voir l'offre</Link>
        </Alert>
      )}
      {!analyzed && <Alert tone="warn" className="mb-5">Le document doit d'abord être analysé.</Alert>}
      <div className="grid gap-4">
        {messages === null && <Spinner />}
        {messages?.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip !min-h-11 !px-4 hover:bg-orange-soft" onClick={() => ask(s)} disabled={busy || plan !== "plus" || !analyzed}>{s}</button>
            ))}
          </div>
        )}
        {messages?.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-navy px-4 py-3 text-white">{m.content.text}</div>
          ) : (
            <div key={i} className="card max-w-[95%] p-4">{m.content.reponse ? <Answer a={m.content as ChatAnswer} /> : null}</div>
          ),
        )}
        {busy && <div className="card max-w-[95%] p-4"><Spinner label="Lecture du document…" /></div>}
        <div ref={end} />
      </div>
      {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
      <form
        className="sticky bottom-3 mt-6 flex gap-2 rounded-2xl border border-line bg-white p-2 shadow-lg"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        <label htmlFor="question" className="sr-only">Votre question</label>
        <textarea id="question" rows={1} className="input !min-h-12 flex-1 resize-none !border-0 !shadow-none" placeholder="Votre question…" value={q} onChange={(e) => setQ(e.target.value)} maxLength={1000} disabled={plan !== "plus" || !analyzed} />
        <button className="btn btn-primary !min-h-12 !px-4" disabled={busy || q.trim().length < 2 || plan !== "plus" || !analyzed} aria-label="Envoyer la question"><SendHorizontal className="h-5 w-5" /></button>
      </form>
      <ProNotice className="mt-6" />
    </div>
  );
}
