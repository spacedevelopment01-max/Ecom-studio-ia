/** Schemas read from each official model API reference on 2026-10-25.
 * These are adapter capabilities, NOT a price table or an account-access claim.
 * Unknown catalog entries are reported, never guessed or enabled automatically. */
export type HiggsModel = {
  id: string;
  label: string;
  mode: "image" | "text";
  resolutions: string[];
  min: number;
  max: number;
  family: "kling" | "seedance";
  docs: string;
};
const model = (
  id: string,
  label: string,
  mode: HiggsModel["mode"],
  family: HiggsModel["family"],
  resolutions: string[],
  min: number,
  max: number,
): HiggsModel => ({
  id,
  label,
  mode,
  family,
  resolutions,
  min,
  max,
  docs: `https://open.higgsfield.ai/models/${id}/api-reference`,
});
export const HIGGS_MODELS: HiggsModel[] = [
  model(
    "kling-video/v3.0/pro/image-to-video",
    "Kling 3 Pro · référence produit",
    "image",
    "kling",
    ["model-defined"],
    3,
    15,
  ),
  model(
    "kling-video/v3.0/4k/image-to-video",
    "Kling 3 4K · référence produit",
    "image",
    "kling",
    ["4k"],
    3,
    15,
  ),
  model(
    "kling-video/v3.0/4k/text-to-video",
    "Kling 3 4K · texte",
    "text",
    "kling",
    ["4k"],
    3,
    15,
  ),
  model(
    "bytedance/seedance-2.0/image-to-video",
    "Seedance 2 · référence produit",
    "image",
    "seedance",
    ["480p", "720p", "1080p", "4k"],
    4,
    15,
  ),
  model(
    "bytedance/seedance-2.0/text-to-video",
    "Seedance 2 · texte",
    "text",
    "seedance",
    ["480p", "720p", "1080p", "4k"],
    4,
    15,
  ),
];
export type Configuration = {
  model: string;
  resolution: string;
  seconds: number;
  audio: boolean;
  aspect: "16:9" | "9:16" | "1:1";
};
export const configurationKey = (c: Configuration) =>
  JSON.stringify([c.model, c.resolution, c.seconds, c.audio, c.aspect]);
export function validateConfiguration(c: Configuration) {
  const m = HIGGS_MODELS.find((m) => m.id === c.model);
  if (
    !m ||
    !m.resolutions.includes(c.resolution) ||
    !Number.isInteger(c.seconds) ||
    c.seconds < m.min ||
    c.seconds > m.max ||
    !["16:9", "9:16", "1:1"].includes(c.aspect) ||
    typeof c.audio !== "boolean"
  )
    throw Error("HIGGSFIELD_CONFIGURATION_UNSUPPORTED");
  return m;
}
export function requestBody(
  c: Configuration,
  prompt: string,
  imageUrl?: string,
) {
  const m = validateConfiguration(c);
  if (m.mode === "image" && !imageUrl)
    throw Error("HIGGSFIELD_REFERENCE_REQUIRED");
  return {
    prompt,
    duration: c.seconds,
    ...(m.mode === "image" ? { image_url: imageUrl } : {}),
    ...(m.family === "seedance"
      ? {
          resolution: c.resolution,
          generate_audio: c.audio,
          ...(m.mode === "text" ? { aspect_ratio: c.aspect } : {}),
        }
      : {
          sound: c.audio ? "on" : "off",
          cfg_scale: 0.5,
          multi_shots: false,
          ...(m.mode === "text" ? { aspect_ratio: c.aspect } : {}),
        }),
  };
}
/** Every supported duration is estimated explicitly: no extrapolation of a minimum / per-second price. */
export function configurations() {
  return HIGGS_MODELS.flatMap((m) =>
    m.resolutions.flatMap((resolution) =>
      Array.from({ length: m.max - m.min + 1 }, (_, i) => m.min + i).flatMap(
        (seconds) =>
          [false, true].flatMap((audio) =>
            (["16:9", "9:16", "1:1"] as const).map((aspect) => ({
              model: m.id,
              resolution,
              seconds,
              audio,
              aspect,
            })),
          ),
      ),
    ),
  );
}

export function defaultConfiguration(
  model: string,
  seconds = 5,
  aspect: Configuration["aspect"] = "16:9",
): Configuration {
  const m = HIGGS_MODELS.find((m) => m.id === model);
  if (!m) throw Error("HIGGSFIELD_MODEL_UNKNOWN");
  return {
    model,
    seconds,
    resolution: m.resolutions.includes("1080p") ? "1080p" : m.resolutions[0],
    audio: false,
    aspect,
  };
}
