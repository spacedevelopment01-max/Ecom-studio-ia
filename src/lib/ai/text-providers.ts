/**
 * Adaptateurs TEXTE pour OpenAI (Responses API) et Google Gemini (generateContent), en REST.
 *
 * Ils ne font QUE traduire une demande neutre vers le format du fournisseur et la réponse en retour : budget,
 * réservation, autorisation, idempotence, trace et facturation restent dans llm.ts (rawCall), identiques pour
 * tous les fournisseurs. Aucune relance automatique ici : une réponse d'erreur HTTP remonte avec son code, toute
 * autre erreur est un résultat incertain.
 */
import { bearer } from "./gateway";

export type TextPart = { type: "text"; text: string } | { type: "image"; jpegBase64: string };
export type TextTurn = { role: "user" | "assistant"; parts: TextPart[] };

export type TextRequest = {
  model: string;
  system: string;
  turns: TextTurn[];
  /** Plafond de sortie, réflexion comprise (borne du coût maximal). */
  maxOutput: number;
  /** Valeur d'effort déjà validée pour ce modèle (null : aucun réglage envoyé). */
  effort: string | null;
  /** Schéma JSON imposé (sorties structurées), sinon texte libre. */
  jsonSchema?: Record<string, unknown> | null;
  /**
   * Appel long (plusieurs minutes) : déposé chez le fournisseur puis relevé, au lieu d'une connexion tenue ouverte
   * (essai réel du 20 novembre 2026 : le code d'un accueil, 3 minutes de réponse, coupé en route par le réseau).
   */
  arrierePlan?: boolean;
};

export type TextUsage = { input: number; cachedInput: number; output: number };
export type TextResult = { text: string; stop: "end_turn" | "max_tokens" | "refusal" | "other"; model: string; usage: TextUsage };

/** Réponse d'erreur HTTP du fournisseur : rien n'a été produit ni facturé (la réservation est rendue). */
export class ProviderHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProviderHttpError";
  }
}

type Fetch = typeof fetch;

async function postJson(fetcher: Fetch, url: string, headers: Record<string, string>, body: unknown) {
  const r = await fetcher(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) {
    let msg = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      msg = String(j?.error?.message ?? msg).slice(0, 300);
    } catch {}
    throw new ProviderHttpError(r.status, msg);
  }
  return JSON.parse(text);
}

// ------------------------------------------------------------------ OpenAI (Responses API)

const OPENAI = "https://api.openai.com/v1";

function openaiInput(req: TextRequest) {
  return req.turns.map((t) => ({
    role: t.role,
    content: t.parts.map((p) =>
      p.type === "image"
        ? { type: "input_image", image_url: `data:image/jpeg;base64,${p.jpegBase64}`, detail: "high" }
        : t.role === "assistant"
          ? { type: "output_text", text: p.text }
          : { type: "input_text", text: p.text },
    ),
  }));
}

export function openaiBody(req: TextRequest) {
  return {
    model: req.model,
    instructions: req.system,
    input: openaiInput(req),
    max_output_tokens: req.maxOutput,
    // Rien n'est conservé chez le fournisseur (pas de reprise de conversation côté serveur).
    store: false,
    ...(req.effort ? { reasoning: { effort: req.effort } } : {}),
    ...(req.jsonSchema ? { text: { format: { type: "json_schema", name: "reponse", schema: req.jsonSchema, strict: true } } } : {}),
  };
}

/** Nombre exact de jetons d'entrée (endpoint gratuit de comptage de la Responses API). */
export async function openaiCount(req: TextRequest, key: string, fetcher: Fetch = fetch): Promise<number> {
  const b = openaiBody(req);
  const j = await postJson(fetcher, `${OPENAI}/responses/input_tokens`, bearer(key), { model: b.model, instructions: b.instructions, input: b.input, ...(b.reasoning ? { reasoning: b.reasoning } : {}), ...(b.text ? { text: b.text } : {}) });
  return Number(j?.input_tokens);
}

/**
 * Réponse en FLUX (SSE) : les en-têtes et les événements arrivent dès le début, ce qui évite qu'un relais réseau
 * coupe une réflexion longue (502 au bout d'environ 30 s sans réponse, constaté en réel). Le résultat est lu dans
 * l'événement final (`response.completed` / `incomplete` / `failed`), de même forme que la réponse classique.
 * Flux terminé sans événement final ou événement d'erreur : résultat incertain (jamais une erreur HTTP).
 */
async function postStream(fetcher: Fetch, url: string, headers: Record<string, string>, body: Record<string, unknown>) {
  const r = await fetcher(url, { method: "POST", headers: { "content-type": "application/json", accept: "text/event-stream", ...headers }, body: JSON.stringify({ ...body, stream: true }) });
  if (!r.ok) {
    const text = await r.text();
    let msg = text.slice(0, 300);
    try {
      msg = String(JSON.parse(text)?.error?.message ?? msg).slice(0, 300);
    } catch {}
    throw new ProviderHttpError(r.status, msg);
  }
  // Réponse classique (relais ou serveur sans flux) : lue telle quelle.
  if (!/event-stream/i.test(r.headers.get("content-type") ?? "")) return JSON.parse(await r.text());
  let final: any = null;
  let failure: string | null = null;
  const handle = (block: string) => {
    const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
    if (!data || data === "[DONE]") return;
    let ev: any;
    try {
      ev = JSON.parse(data);
    } catch {
      return;
    }
    if (ev?.type === "response.completed" || ev?.type === "response.incomplete" || ev?.type === "response.failed") final = ev.response;
    else if (ev?.type === "error") failure = String(ev?.message ?? ev?.error?.message ?? "erreur du flux").slice(0, 300);
  };
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of r.body as unknown as AsyncIterable<Uint8Array>) {
    buf += dec.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      handle(buf.slice(0, i));
      buf = buf.slice(i + 2);
    }
  }
  if (buf.trim()) handle(buf);
  if (!final) throw new Error(`Flux OpenAI interrompu sans réponse finale${failure ? ` : ${failure}` : ""} (résultat incertain)`);
  return final;
}

/** Réglages du relevé d'un appel déposé (remplaçables par les tests). */
export const releve = { intervalleMs: 2_000, maxMs: 20 * 60_000, essaisReseau: 8, attendre: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) };
const FINI = new Set(["completed", "incomplete", "failed", "cancelled"]);
/**
 * Appel DÉPOSÉ (mode « background » de la Responses API) : la demande part une seule fois, puis le Studio relève la
 * réponse par de courtes lectures gratuites. Une lecture coupée par le réseau se refait (rien n'est renvoyé ni repayé).
 * La réponse doit être gardée chez OpenAI le temps du relevé (store) : elle y est effacée dès qu'elle est lue.
 */
async function deposerPuisRelever(fetcher: Fetch, key: string, body: Record<string, unknown>) {
  const h = bearer(key);
  const depot = await postJson(fetcher, `${OPENAI}/responses`, h, { ...body, store: true, background: true });
  const id = String(depot?.id ?? "");
  if (!id) throw new Error("Dépôt OpenAI sans identifiant (résultat incertain)");
  let j: any = depot, ratees = 0;
  const debut = Date.now();
  while (!FINI.has(String(j?.status))) {
    if (Date.now() - debut > releve.maxMs) throw new Error(`Réponse OpenAI ${id} toujours en cours après ${Math.round(releve.maxMs / 60_000)} minutes (résultat incertain)`);
    await releve.attendre(releve.intervalleMs);
    try {
      const r = await fetcher(`${OPENAI}/responses/${encodeURIComponent(id)}`, { method: "GET", headers: h });
      if (!r.ok) { if (r.status >= 500 || r.status === 429) { if (++ratees > releve.essaisReseau) throw new Error(`Relevé OpenAI ${id} impossible (HTTP ${r.status}, résultat incertain)`); continue; } throw new Error(`Relevé OpenAI ${id} refusé (HTTP ${r.status}, résultat incertain)`); }
      j = await r.json();
      ratees = 0;
    } catch (e) {
      // Lecture coupée (réseau) : on relit, la demande n'est jamais renvoyée.
      if (/résultat incertain/.test((e as Error).message) || ++ratees > releve.essaisReseau) throw e instanceof Error && /incertain/.test(e.message) ? e : new Error(`Relevé OpenAI ${id} coupé ${ratees} fois (${(e as Error).message.slice(0, 80)}, résultat incertain)`);
    }
  }
  // Effacée chez OpenAI dès qu'elle est lue (rien n'y reste conservé) ; un effacement raté ne change pas la réponse.
  try { await fetcher(`${OPENAI}/responses/${encodeURIComponent(id)}`, { method: "DELETE", headers: h }); } catch {}
  return j;
}

export async function openaiSend(req: TextRequest, key: string, fetcher: Fetch = fetch): Promise<TextResult> {
  const j = req.arrierePlan ? await deposerPuisRelever(fetcher, key, openaiBody(req)) : await postStream(fetcher, `${OPENAI}/responses`, bearer(key), openaiBody(req));
  if (j?.status === "failed") throw new Error(`Réponse OpenAI en échec : ${String(j?.error?.message ?? "sans détail").slice(0, 200)} (résultat incertain)`);
  let text = "";
  let refused = false;
  for (const item of j?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const c of item.content ?? []) {
      if (c?.type === "output_text") text += c.text ?? "";
      if (c?.type === "refusal") refused = true;
    }
  }
  const incomplete = j?.status === "incomplete" && j?.incomplete_details?.reason === "max_output_tokens";
  return {
    text,
    stop: refused ? "refusal" : incomplete ? "max_tokens" : j?.status === "completed" ? "end_turn" : "other",
    model: String(j?.model ?? req.model),
    // Les jetons de réflexion sont inclus dans output_tokens (facturés au tarif de sortie).
    usage: { input: Number(j?.usage?.input_tokens ?? 0), cachedInput: Number(j?.usage?.input_tokens_details?.cached_tokens ?? 0), output: Number(j?.usage?.output_tokens ?? 0) },
  };
}

/** Corps Responses brut (outils intégrés comme web_search) : même flux, mêmes erreurs que openaiSend. */
export async function openaiResponses(body: Record<string, unknown>, key: string, fetcher: Fetch = fetch): Promise<any> {
  return postStream(fetcher, `${OPENAI}/responses`, bearer(key), body);
}
/** Comptage gratuit des jetons d'entrée d'un corps Responses (instructions + entrée + outils). */
export async function openaiCountBody(body: Record<string, unknown>, key: string, fetcher: Fetch = fetch): Promise<number> {
  const j = await postJson(fetcher, `${OPENAI}/responses/input_tokens`, bearer(key), body);
  return Number(j?.input_tokens);
}

// ------------------------------------------------------------------ Google Gemini (generateContent)

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

export function geminiBody(req: TextRequest) {
  return {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.turns.map((t) => ({
      role: t.role === "assistant" ? "model" : "user",
      parts: t.parts.map((p) => (p.type === "image" ? { inlineData: { mimeType: "image/jpeg", data: p.jpegBase64 } } : { text: p.text })),
    })),
    generationConfig: {
      maxOutputTokens: req.maxOutput,
      // Valeurs de l'énumération officielle en majuscules (MINIMAL, LOW, MEDIUM, HIGH).
      ...(req.effort ? { thinkingConfig: { thinkingLevel: req.effort.toUpperCase() } } : {}),
      ...(req.jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: req.jsonSchema } : {}),
    },
  };
}

/** Nombre exact de jetons d'entrée (countTokens, gratuit). */
export async function geminiCount(req: TextRequest, key: string, fetcher: Fetch = fetch): Promise<number> {
  const b = geminiBody(req);
  const j = await postJson(fetcher, `${GEMINI}/models/${encodeURIComponent(req.model)}:countTokens`, { "x-goog-api-key": key }, { generateContentRequest: { model: `models/${req.model}`, ...b } });
  return Number(j?.totalTokens);
}

export async function geminiSend(req: TextRequest, key: string, fetcher: Fetch = fetch): Promise<TextResult> {
  const j = await postJson(fetcher, `${GEMINI}/models/${encodeURIComponent(req.model)}:generateContent`, { "x-goog-api-key": key }, geminiBody(req));
  const cand = j?.candidates?.[0];
  // Les parties « thought » (résumé de réflexion) ne font pas partie de la réponse.
  const text = (cand?.content?.parts ?? []).filter((p: any) => !p?.thought && typeof p?.text === "string").map((p: any) => p.text).join("");
  const reason = String(cand?.finishReason ?? "");
  const blocked = !!j?.promptFeedback?.blockReason || /SAFETY|BLOCKLIST|PROHIBITED|SPII|RECITATION/.test(reason);
  const u = j?.usageMetadata ?? {};
  return {
    text,
    stop: blocked ? "refusal" : reason === "MAX_TOKENS" ? "max_tokens" : reason === "STOP" ? "end_turn" : "other",
    model: String(j?.modelVersion ?? req.model),
    // Sortie facturée = réponse + réflexion.
    usage: { input: Number(u.promptTokenCount ?? 0), cachedInput: Number(u.cachedContentTokenCount ?? 0), output: Number(u.candidatesTokenCount ?? 0) + Number(u.thoughtsTokenCount ?? 0) },
  };
}

// ------------------------------------------------------------------ aiguillage

export const textAdapters = {
  openai: { count: openaiCount, send: openaiSend },
  google: { count: geminiCount, send: geminiSend },
} as const;

export const hasTextAdapter = (provider: string): provider is keyof typeof textAdapters => provider === "openai" || provider === "google";
