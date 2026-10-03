"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Link2, Plug, ShieldCheck, Trash2 } from "lucide-react";
import { api, Badge, Button, Card, Field, Input, Select, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";

type Provider = { key: string; label: string; networks: string[]; docs: string; scopes: string[]; needs: string; capabilities: string[]; limits: string[]; configured: boolean };
type Conn = { id: string; provider: string; name: string; avatar: string | null; status: string; statusMessage: string | null; expiresAt: number | null; updatedAt: number; linked: boolean; can: string[]; missing: string[]; boards: { id: string; name: string }[] | null; boardId: string | null; privacy: string | null };

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "bad" | "neutral" }> = {
  active: { label: "Connecté", tone: "ok" },
  expired: { label: "Autorisation expirée", tone: "warn" },
  error: { label: "Erreur", tone: "bad" },
  revoked: { label: "Autorisation retirée", tone: "bad" },
};

export default function TabConnexions() {
  const { id } = useProject();
  const toast = useToast();
  const { data, reload } = useApi<{ providers: Provider[]; connections: Conn[]; publicUrl: boolean }>(`/api/connections?project=${id}`);
  const [shop, setShop] = useState("");

  useEffect(() => {
    const u = new URL(window.location.href);
    const st = u.searchParams.get("connexion");
    if (!st) return;
    if (st === "ok") toast("ok", `Connexion réussie : ${u.searchParams.get("comptes") ?? "1"} compte(s) disponible(s).`);
    else toast("bad", u.searchParams.get("message") ?? "La connexion n'a pas abouti.");
    ["connexion", "comptes", "message"].forEach((k) => u.searchParams.delete(k));
    window.history.replaceState(null, "", u.toString());
  }, [toast]);

  const patch = async (cid: string, b: Record<string, unknown>) => {
    try {
      await api(`/api/connections/${cid}`, { method: "PATCH", body: b });
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const remove = async (c: Conn) => {
    if (!confirm(`Déconnecter « ${c.name} » ? Les publications programmées sur ce compte repasseront « à valider ».`)) return;
    await api(`/api/connections/${c.id}`, { method: "DELETE" });
    toast("ok", "Compte déconnecté. Pensez aussi à retirer l'accès depuis les paramètres du réseau si vous le souhaitez.");
    reload();
  };
  const start = (p: string, extra = "") => {
    window.location.href = `/api/oauth/${p}/start?project=${encodeURIComponent(id)}${extra}`;
  };

  if (!data) return <div className="mx-auto max-w-5xl"><div className="skeleton h-64 rounded-3xl" /></div>;
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div className="flex gap-3 rounded-2xl border border-line bg-card p-4 text-sm text-ink-2">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok" />
        <p>Les comptes se connectent par l'autorisation officielle de chaque plateforme. <strong className="text-ink">Aucun mot de passe n'est demandé ni conservé</strong> ; les jetons d'accès sont chiffrés côté serveur. Rien n'est publié sans validation : seules les publications que vous avez validées partent à l'heure prévue.</p>
      </div>
      {!data.publicUrl && (
        <div className="flex gap-3 rounded-2xl border border-warn/40 bg-warn-soft p-4 text-sm text-ink">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" />
          <p>Le studio tourne sur une adresse locale. Instagram, TikTok, Pinterest et l'installation du thème Shopify récupèrent les médias depuis une <strong>adresse publique HTTPS</strong> : la publication automatique fonctionnera une fois le studio déployé (adresse définie par l'administration).</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.providers.map((p) => {
          const conns = data.connections.filter((c) => c.provider === p.key || p.networks.includes(c.provider));
          return (
            <Card key={p.key} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">{p.label}</p>
                  <p className="text-xs text-muted">{conns.length ? `${conns.length} compte(s) connecté(s)` : "Aucun compte connecté"}</p>
                </div>
                {p.configured ? <Badge tone="ok" dot>Disponible</Badge> : <Badge tone="warn" dot>Non configuré</Badge>}
              </div>
              <ul className="mt-3 grid gap-1 text-sm text-ink-2">
                {p.capabilities.map((c) => <li key={c} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" />{c}</li>)}
              </ul>
              <details className="mt-3 text-xs text-muted">
                <summary className="cursor-pointer">Limites de l'API et autorisations demandées</summary>
                <ul className="mt-2 list-disc space-y-1 pl-4">{p.limits.map((l) => <li key={l}>{l}</li>)}</ul>
                <p className="mt-2 break-words">Autorisations : {p.scopes.join(", ")}</p>
                <a href={p.docs} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 underline">Documentation officielle <ExternalLink className="size-3" /></a>
              </details>

              {conns.map((c) => (
                <div key={c.id} className="mt-4 rounded-2xl border border-line p-3">
                  <div className="flex items-center gap-3">
                    {c.avatar ? <img src={c.avatar} alt="" className="size-9 rounded-full object-cover" /> : <span className="grid size-9 place-items-center rounded-full bg-paper-2"><Link2 className="size-4" /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <Badge tone={STATUS[c.status]?.tone ?? "neutral"}>{STATUS[c.status]?.label ?? c.status}</Badge>
                    </div>
                    <button onClick={() => remove(c)} className="rounded-xl p-2 text-muted hover:bg-paper-2 hover:text-bad" aria-label={`Déconnecter ${c.name}`}><Trash2 className="size-4" /></button>
                  </div>
                  {c.statusMessage && <p className="mt-2 text-xs text-bad">{c.statusMessage}</p>}
                  {c.can.length > 0 && <p className="mt-2 text-xs text-ink-2">Peut : {c.can.join(" · ")}</p>}
                  {c.missing.length > 0 && <p className="mt-1 text-xs text-warn">Autorisations manquantes : {c.missing.join(", ")}. Reconnectez le compte en les acceptant.</p>}
                  {p.networks.length > 0 && (
                    <div className="mt-3"><Toggle checked={c.linked} onChange={(v) => patch(c.id, { projectId: id, linked: v })} label="Utiliser pour cette boutique" /></div>
                  )}
                  {c.provider === "pinterest" && c.boards && (
                    <Field label="Tableau de destination" htmlFor={`b-${c.id}`}>
                      <Select id={`b-${c.id}`} value={c.boardId ?? ""} onChange={(e) => patch(c.id, { boardId: e.target.value })}>
                        <option value="">Choisir un tableau…</option>
                        {c.boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </Select>
                    </Field>
                  )}
                  {c.provider === "youtube" && (
                    <Field label="Visibilité des vidéos" htmlFor={`y-${c.id}`}>
                      <Select id={`y-${c.id}`} value={c.privacy ?? "private"} onChange={(e) => patch(c.id, { privacy: e.target.value })}>
                        <option value="private">Privée</option>
                        <option value="unlisted">Non répertoriée</option>
                        <option value="public">Publique</option>
                      </Select>
                    </Field>
                  )}
                  {(c.status === "expired" || c.missing.length > 0) && p.configured && p.key !== "shopify" && (
                    <Button size="sm" variant="secondary" className="mt-3" onClick={() => start(p.key)}>Reconnecter</Button>
                  )}
                </div>
              ))}

              <div className="mt-auto pt-4">
                {!p.configured ? (
                  <p className="text-xs text-muted">Bloqué : l'administration doit renseigner les identifiants d'application {p.label} ({p.needs})</p>
                ) : p.key === "shopify" ? (
                  <form onSubmit={(e) => { e.preventDefault(); if (shop.trim()) start("shopify", `&shop=${encodeURIComponent(shop.trim())}`); }} className="flex gap-2">
                    <Input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="ma-boutique.myshopify.com" aria-label="Adresse de la boutique Shopify" />
                    <Button type="submit" icon={<Plug className="size-4" />}>Connecter</Button>
                  </form>
                ) : (
                  <Button variant={conns.length ? "secondary" : "primary"} icon={<Plug className="size-4" />} onClick={() => start(p.key)}>{conns.length ? "Ajouter un compte" : "Connecter"}</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted">CapCut ne propose pas d'API publique de montage : le studio prépare un pack (vidéos, plans, sous-titres SRT, musique, textes) à importer dans CapCut depuis l'espace Vidéos ou Fichiers.</p>
    </div>
  );
}
