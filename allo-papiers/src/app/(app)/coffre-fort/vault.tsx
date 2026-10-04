"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FilePlus2, Lock, Pencil, Search, ShieldCheck, Sparkles } from "lucide-react";
import { api, ApiError, withStepUp } from "@/components/api";
import { Alert, PageTitle, Spinner } from "@/components/ui";
import { StepUpPanel } from "@/components/step-up";
import { PIECE_TYPES, PIECE_TYPE_IDS, VAULT_CATEGORIES, pieceLabel, type PieceType, type VaultCategory } from "@/lib/pieces";

type Item = {
  id: string;
  kind: "courrier" | "piece";
  title: string;
  status: string;
  created_at: string;
  page_count: number;
  sensitive: boolean;
  vault_category: VaultCategory | null;
  piece_type: PieceType | null;
  piece_label: string | null;
  piece_period: string | null;
  piece_date: string | null;
  valid_until: string | null;
  issuer: string | null;
  classified_by: "ia" | "utilisateur" | "demonstration" | null;
};
type File = { id: string; mime: string; position: number };

const today = () => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
const fr = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function Validity({ until }: { until: string | null }) {
  if (!until) return null;
  const t = today();
  const soon = new Date(`${until}T12:00:00Z`).getTime() - Date.now() < 30 * 86400000;
  if (until < t) return <span className="chip bg-danger-soft text-danger">Validité dépassée ({fr(until)})</span>;
  return <span className={`chip ${soon ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>Valable jusqu'au {fr(until)}</span>;
}

function EditForm({ item, onDone }: { item: Item; onDone: () => void }) {
  const [f, setF] = useState({
    type_piece: item.piece_type ?? "autre",
    libelle: item.piece_label ?? item.title,
    periode: item.piece_period ?? "",
    date_document: item.piece_date ?? "",
    valable_jusqu_au: item.valid_until ?? "",
    emetteur: item.issuer ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/documents/${item.id}/classify`, {
        method: "POST",
        json: { manual: { ...f, periode: f.periode || null, date_document: f.date_document || null, valable_jusqu_au: f.valable_jusqu_au || null, emetteur: f.emetteur || null } },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    }
  }
  return (
    <form onSubmit={save} className="mt-3 grid gap-3 rounded-2xl bg-sand/50 p-4">
      {error && <Alert tone="danger">{error}</Alert>}
      <div>
        <label className="field-label" htmlFor={`t-${item.id}`}>Type</label>
        <select id={`t-${item.id}`} className="input" value={f.type_piece} onChange={(e) => setF({ ...f, type_piece: e.target.value as PieceType })}>
          {Object.entries(VAULT_CATEGORIES).map(([cat, c]) => (
            <optgroup key={cat} label={c.label}>
              {PIECE_TYPE_IDS.filter((t) => PIECE_TYPES[t].category === cat).map((t) => <option key={t} value={t}>{PIECE_TYPES[t].label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div><label className="field-label" htmlFor={`l-${item.id}`}>Nom</label><input id={`l-${item.id}`} className="input" value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} required minLength={2} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="field-label" htmlFor={`p-${item.id}`}>Année ou période</label><input id={`p-${item.id}`} className="input" value={f.periode} onChange={(e) => setF({ ...f, periode: e.target.value })} placeholder="Ex. 2025" /></div>
        <div><label className="field-label" htmlFor={`e-${item.id}`}>Émetteur</label><input id={`e-${item.id}`} className="input" value={f.emetteur} onChange={(e) => setF({ ...f, emetteur: e.target.value })} /></div>
        <div><label className="field-label" htmlFor={`d-${item.id}`}>Date du document</label><input id={`d-${item.id}`} type="date" className="input" value={f.date_document} onChange={(e) => setF({ ...f, date_document: e.target.value })} /></div>
        <div><label className="field-label" htmlFor={`v-${item.id}`}>Valable jusqu'au <span className="font-normal text-muted">(si écrit)</span></label><input id={`v-${item.id}`} type="date" className="input" value={f.valable_jusqu_au} onChange={(e) => setF({ ...f, valable_jusqu_au: e.target.value })} /></div>
      </div>
      <div className="flex gap-2"><button className="btn btn-primary">Enregistrer</button><button type="button" className="btn btn-ghost" onClick={onDone}>Annuler</button></div>
    </form>
  );
}

export function Vault({ elevated, until, hasPasskey, highlight }: { elevated: boolean; until: string | null; hasPasskey: boolean; highlight?: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api<{ items: Item[] }>("/api/vault").then((r) => setItems(r.items)).catch((e) => setError(e instanceof ApiError ? e.message : "Chargement impossible.")), []);
  useEffect(() => {
    if (elevated) void load();
  }, [elevated, load]);
  useEffect(() => {
    if (highlight && items) document.getElementById(`piece-${highlight}`)?.scrollIntoView({ block: "center" });
  }, [highlight, items]);

  const groups = useMemo(() => {
    const nq = norm(q.trim());
    const list = (items ?? []).filter((i) => !nq || norm(`${i.piece_label ?? ""} ${i.title} ${pieceLabel(i.piece_type)} ${i.issuer ?? ""} ${i.piece_period ?? ""}`).includes(nq));
    const order = Object.keys(VAULT_CATEGORIES) as VaultCategory[];
    return [...order.map((c) => ({ c: c as VaultCategory | "a_ranger", items: list.filter((i) => i.vault_category === c) })), { c: "a_ranger" as const, items: list.filter((i) => !i.vault_category) }].filter((g) => g.items.length);
  }, [items, q]);

  async function openFiles(id: string) {
    try {
      const r = await withStepUp(() => api<{ files: File[] }>(`/api/documents/${id}`));
      setFiles((f) => ({ ...f, [id]: r.files }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ouverture impossible.");
    }
  }

  if (!elevated)
    return (
      <div className="container-page max-w-md py-10">
        <div className="card p-6">
          <StepUpPanel title="Ouvrir le coffre-fort" onDone={() => location.reload()} />
        </div>
        {!hasPasskey && <p className="mt-4 text-center text-[0.95rem] text-muted">Astuce : ajoutez une <Link href="/compte/securite" className="font-semibold underline">clé d'accès</Link> pour ouvrir le coffre avec votre empreinte ou votre visage.</p>}
      </div>
    );

  return (
    <div className="container-page max-w-4xl pb-10">
      <PageTitle eyebrow="Coffre-fort" title="Mes documents, bien rangés">
        Chaque document photographié est reconnu et rangé ici. Quand vous préparez un courrier, le bouton « Apporter mes documents enregistrés » retrouve les bonnes pièces tout seul.
        <span className="mt-2 block text-sm">Coffre ouvert{until ? ` jusqu'à ${new Date(until).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}` : ""} — il se referme automatiquement.</span>
      </PageTitle>
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <span className="sr-only">Rechercher dans le coffre</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input !pl-12" placeholder="Rechercher : RIB, avis d'imposition 2025…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Link href="/nouveau?mode=piece" className="btn btn-primary"><FilePlus2 className="h-5 w-5" aria-hidden /> Ranger un justificatif</Link>
        <button className="btn btn-outline" onClick={async () => { await api("/api/stepup/close", { method: "POST" }); location.reload(); }}><Lock className="h-5 w-5" aria-hidden /> Refermer</button>
      </div>
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      {!items && <Spinner />}
      {items && items.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-xl font-semibold">Votre coffre est vide</p>
          <p className="mt-2 text-muted">Commencez par vos pièces les plus demandées : pièce d'identité, justificatif de domicile, dernier avis d'imposition, RIB.</p>
          <Link href="/nouveau?mode=piece" className="btn btn-primary mt-5">Ranger mon premier justificatif</Link>
        </div>
      )}
      {items && items.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2" aria-label="Catégories">
          {groups.map((g) => (
            <a key={g.c} href={`#cat-${g.c}`} className="chip !min-h-10 !px-4 hover:bg-orange-soft">
              {g.c === "a_ranger" ? "À ranger" : VAULT_CATEGORIES[g.c].label} · {g.items.length}
            </a>
          ))}
        </div>
      )}
      <div className="grid gap-8">
        {groups.map((g) => (
          <section key={g.c} id={`cat-${g.c}`} aria-labelledby={`h-${g.c}`}>
            <h2 id={`h-${g.c}`} className="mb-3 flex items-center gap-2 text-xl font-semibold">
              <span aria-hidden>{g.c === "a_ranger" ? "📥" : VAULT_CATEGORIES[g.c].emoji}</span>
              {g.c === "a_ranger" ? "À ranger" : VAULT_CATEGORIES[g.c].label}
              <span className="text-base font-normal text-muted">({g.items.length})</span>
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {g.items.map((i) => (
                <li key={i.id} id={`piece-${i.id}`} className={`card p-5 ${highlight === i.id ? "neon" : ""}`}>
                  {highlight === i.id && <p className="mb-2 flex items-center gap-1.5 font-semibold text-ok"><CheckCircle2 className="h-5 w-5" aria-hidden /> Rangé dans votre coffre</p>}
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-dark">{pieceLabel(i.piece_type)}</p>
                  <h3 className="mt-1 text-lg font-semibold leading-snug">{i.piece_label ?? i.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {[i.piece_period, i.issuer, i.piece_date ? `daté du ${fr(i.piece_date)}` : null].filter(Boolean).join(" · ") || `Ajouté le ${new Date(i.created_at).toLocaleDateString("fr-FR")}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Validity until={i.valid_until} />
                    {i.sensitive && <span className="chip"><ShieldCheck className="h-4 w-4" aria-hidden /> Protégé</span>}
                    {i.classified_by === "ia" && <span className="chip"><Sparkles className="h-4 w-4" aria-hidden /> Rangé par l'IA</span>}
                    {i.classified_by === "demonstration" && <span className="chip bg-warn-soft text-warn">Rangement simulé</span>}
                    {i.status === "failed" && <span className="chip bg-warn-soft text-warn">Non reconnu</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!files[i.id] && <button className="btn btn-outline !min-h-11" onClick={() => openFiles(i.id)}><Download className="h-5 w-5" aria-hidden /> Fichiers</button>}
                    <button className="btn btn-ghost !min-h-11" onClick={() => setEditing(editing === i.id ? null : i.id)}><Pencil className="h-5 w-5" aria-hidden /> Corriger</button>
                    {i.kind === "courrier" && <Link href={`/documents/${i.id}`} className="btn btn-ghost !min-h-11">Voir l'analyse</Link>}
                  </div>
                  {files[i.id] && (
                    <ul className="mt-2 grid gap-1">
                      {files[i.id].map((f) => (
                        <li key={f.id}><a className="font-semibold text-orange underline" href={`/api/documents/${i.id}/files/${f.id}?telecharger=1`}>Télécharger {f.mime === "application/pdf" ? "le PDF" : `la page ${f.position + 1}`}</a></li>
                      ))}
                    </ul>
                  )}
                  {editing === i.id && <EditForm item={i} onDone={() => { setEditing(null); void load(); }} />}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Alert tone="info" className="mt-8">
        Vos fichiers sont stockés dans un espace privé en Europe, chiffrés, sans adresse publique. Pour être reconnus, ils sont lus temporairement par notre serveur et notre fournisseur d'IA : ce n'est pas un chiffrement « de bout en bout ». Aucune date de validité n'est supposée : seule une date écrite sur le document est reprise. <Link href="/confidentialite" className="font-semibold underline">En savoir plus</Link>
      </Alert>
    </div>
  );
}
