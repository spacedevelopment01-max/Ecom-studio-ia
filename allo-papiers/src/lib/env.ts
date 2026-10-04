import "server-only";

/** Lecture centralisée de la configuration serveur. Aucune de ces valeurs n'est envoyée au navigateur. */
function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const env = {
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get appUrl() {
    return (opt("APP_URL") ?? "http://localhost:3100").replace(/\/$/, "");
  },
  get databaseUrl() {
    return opt("DATABASE_URL");
  },
  get sessionSecret() {
    return opt("SESSION_SECRET");
  },
  get fileEncryptionKey() {
    return opt("FILE_ENCRYPTION_KEY");
  },
  get anthropicKey() {
    return opt("ANTHROPIC_API_KEY");
  },
  get aiModel() {
    return opt("AI_MODEL") ?? "claude-opus-5-5";
  },
  /** Mode démonstration : analyses SIMULÉES, bandeau permanent. Jamais actif par défaut. */
  get demoMode() {
    return opt("DEMO_MODE") === "true";
  },
  get supabaseUrl() {
    return opt("SUPABASE_URL");
  },
  get supabaseServiceKey() {
    return opt("SUPABASE_SERVICE_ROLE_KEY");
  },
  get storageBucket() {
    return opt("SUPABASE_STORAGE_BUCKET") ?? "documents";
  },
  get resendKey() {
    return opt("RESEND_API_KEY");
  },
  get mailFrom() {
    return opt("MAIL_FROM") ?? "Allô Papiers <bonjour@allopapiers.fr>";
  },
  get stripeSecret() {
    return opt("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return opt("STRIPE_WEBHOOK_SECRET");
  },
  get stripePricePlus() {
    return opt("STRIPE_PRICE_PLUS");
  },
  get cronSecret() {
    return opt("CRON_SECRET");
  },
  /** 'test' (simulation explicite) ou 'real' (refusé tant que l'adaptateur réel n'existe pas). */
  get laposteMode(): "test" | "real" {
    return opt("LAPOSTE_MODE") === "real" ? "real" : "test";
  },
  get plusDocumentLimit() {
    return Number(opt("PLUS_DOCUMENTS_PER_MONTH") ?? 30);
  },
  get plusChatLimit() {
    return Number(opt("PLUS_QUESTIONS_PER_MONTH") ?? 150);
  },
  get plusCompareLimit() {
    return Number(opt("PLUS_COMPARISONS_PER_MONTH") ?? 20);
  },
  get rpId() {
    return opt("WEBAUTHN_RP_ID") ?? new URL(this.appUrl).hostname;
  },
};

/** État des intégrations, affiché honnêtement dans l'interface. */
export function integrationStatus() {
  return {
    database: Boolean(env.databaseUrl),
    ai: Boolean(env.anthropicKey) && !env.demoMode,
    demo: env.demoMode,
    storage: Boolean(env.supabaseUrl && env.supabaseServiceKey) ? "supabase" : env.isProduction ? "absent" : "local",
    email: env.resendKey ? "resend" : env.isProduction ? "absent" : "console",
    stripe: Boolean(env.stripeSecret && env.stripeWebhookSecret && env.stripePricePlus),
    laposte: env.laposteMode,
    encryption: Boolean(env.fileEncryptionKey),
  } as const;
}
