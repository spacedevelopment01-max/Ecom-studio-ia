/** Lecture et enregistrement des droits par thème et par forfait (réglage d'administration « themes.rights »). */
import { getJsonSetting, setJsonSetting } from "../settings";
import { DEFAULT_THEME_RIGHTS, normalizeThemeRights, type ThemeRights } from "./theme-rights";

export const THEME_RIGHTS_KEY = "themes.rights";

export function loadThemeRights(): ThemeRights {
  const raw = getJsonSetting<{ plans?: Record<string, unknown>; updatedAt?: number; updatedBy?: string } | null>(THEME_RIGHTS_KEY, null);
  if (!raw) return DEFAULT_THEME_RIGHTS;
  return { ...normalizeThemeRights(raw), updatedAt: raw.updatedAt, updatedBy: raw.updatedBy };
}

export function saveThemeRights(input: { plans?: Record<string, unknown> }, by: string): ThemeRights {
  const rights = { ...normalizeThemeRights(input), updatedAt: Date.now(), updatedBy: by };
  setJsonSetting(THEME_RIGHTS_KEY, rights);
  return rights;
}
