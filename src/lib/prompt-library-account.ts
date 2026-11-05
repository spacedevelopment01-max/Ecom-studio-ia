/** Native account-owned prompt library reader, shared with the authenticated GET route. No AI or writes. */
import type { User } from './auth';
import { all } from './db';
import { CATEGORIES, SECTOR_DATA, libraryPrompts } from './prompts-library';
import { L } from './i18n-server';
export function readNativePromptLibrary(user:Pick<User,'id'>){
  const favorites = all<{ prompt_id: string }>("SELECT prompt_id FROM prompt_favorites WHERE user_id = ?", user.id).map((r) => r.prompt_id);
  const mine = all<any>("SELECT * FROM user_prompts WHERE user_id = ? ORDER BY updated_at DESC", user.id).map((r) => ({ id: `u:${r.id}`, sector: r.sector, sectorLabel: SECTOR_DATA.find((s) => s.id === r.sector)?.label ?? L("Personnel", "Personal"), category: r.category, categoryLabel: CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category, group: L("Mes prompts", "My prompts"), target: r.target, title: r.title, body: r.body, mine: true, basedOn: r.based_on }));
  return { prompts: [...mine, ...libraryPrompts()], favorites, sectors: SECTOR_DATA.map((s) => ({ id: s.id, label: s.label })), categories: CATEGORIES };
}
