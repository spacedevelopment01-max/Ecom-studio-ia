/** CMS Engine V2 — types communs aux adaptateurs de plateforme. */
export type CmsPlatform = "shopify" | "woocommerce" | "prestashop" | "wix" | "squarespace";

/** Défaut relevé pendant la génération (un défaut « blocking » empêche toujours un verdict FINAL). */
export type ExportIssue = { code: string; severity: "blocking" | "warning"; detail: string };

export type PlatformExport = {
  platform: CmsPlatform;
  zip: Buffer;
  name: string;
  /** « theme » : thème installable ; « kit » : dossier de reconstruction (jamais présenté comme un thème). */
  kind: "theme" | "kit";
  files: string[];
  issues: ExportIssue[];
  /** Types de sections exportés. */
  sections: string[];
  /** Médias inclus. */
  media: string[];
};
