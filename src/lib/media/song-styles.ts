/** Styles de musique des vidéos (liste partagée par le serveur et l'interface). */
export const SONG_STYLES = ["acoustic", "bistro", "lounge", "calm", "cinematic", "corporate", "pop"] as const;
export type SongStyle = (typeof SONG_STYLES)[number];

export const SONG_STYLE_LABELS: Record<SongStyle, { fr: string; en: string }> = {
  acoustic: { fr: "acoustique entraînant", en: "upbeat acoustic" },
  bistro: { fr: "bistrot", en: "bistro" },
  lounge: { fr: "lounge élégant", en: "elegant lounge" },
  calm: { fr: "calme", en: "calm" },
  cinematic: { fr: "cinématique", en: "cinematic" },
  corporate: { fr: "inspirant", en: "inspiring" },
  pop: { fr: "pop énergique", en: "energetic pop" },
};

