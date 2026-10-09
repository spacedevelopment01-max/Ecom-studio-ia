/**
 * Adaptateurs TEXTE pour OpenAI (Responses API) et Google Gemini (generateContent), en REST.
 *
 * Ils ne font QUE traduire une demande neutre vers le format du fournisseur et la réponse en retour : budget,
 * réservation, autorisation, idempotence, trace et facturation restent dans llm.ts (rawCall), identiques pour
 * tous les fournisseurs. Aucune relance automatique ici : une réponse d'erreur HTTP remonte avec son code (rien
 * n'a été produit ni facturé), toute autre erreur est un résultat incertain.
 */
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
  const j = await postJson(fetcher, `${OPENAI}/responses/input_tokens`, { authorization: `Bearer ${key}` }, { model: b.model, instructions: b.instructions, input: b.input, ...(b.reasoning ? { reasoning: b.reasoning } : {}), ...(b.text ? { text: b.text } : {}) });
  return Number(j?.input_tokens);
}

export async function openaiSend(req: TextRequest, key: string, fetcher: Fetch = fetch): Promise<TextResult> {
  const j = await postJson(fetcher, `${OPENAI}/responses`, { authorization: `Bearer ${key}` }, openaiBody(req));
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
