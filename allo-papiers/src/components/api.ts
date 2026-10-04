"use client";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Appel à l'API du site, avec gestion uniforme des erreurs et des redirections de sécurité. */
export async function api<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...(rest.headers ?? {}) },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "reseau", "Connexion impossible. Vérifiez votre accès à Internet puis réessayez.");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = `/connexion?suite=${encodeURIComponent(location.pathname + location.search)}`;
    }
    if (res.status === 423 && typeof window !== "undefined") {
      window.location.href = `/deverrouiller?suite=${encodeURIComponent(location.pathname + location.search)}`;
    }
    throw new ApiError(res.status, data.error ?? "erreur", data.message ?? "Une erreur est survenue.");
  }
  return data as T;
}

// ───── Vérification renforcée à la demande ─────
type Pending = { resolve: () => void; reject: (e: Error) => void };
let pending: Pending | null = null;

export function requestStepUp(): Promise<void> {
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    window.dispatchEvent(new CustomEvent("ap:stepup"));
  });
}

export function settleStepUp(ok: boolean) {
  const p = pending;
  pending = null;
  if (!p) return;
  if (ok) p.resolve();
  else p.reject(new ApiError(403, "verification_annulee", "Vérification annulée."));
}

/** Exécute une action ; si le coffre doit être ouvert, demande la vérification puis réessaie une fois. */
export async function withStepUp<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.code === "verification_requise") {
      await requestStepUp();
      return fn();
    }
    throw e;
  }
}
