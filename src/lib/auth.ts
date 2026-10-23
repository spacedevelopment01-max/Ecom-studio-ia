/** Comptes et sessions (cookie httpOnly, jeton haché en base). */
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { id, now, one, run } from "./db";
import { randomToken, sha256 } from "./secrets";
import { L } from "./i18n-server";
import { identifyActor, identifyAdministration } from "./access-scope";

export const SESSION_COOKIE = "ecs_session";
const SESSION_DAYS = 30;

export type User = { id: string; email: string; name: string; role: "client" | "admin"; timezone: string; created_at: number };

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function createUser(email: string, password: string, name: string): Promise<User> {
  email = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, L("Adresse e-mail invalide.", "Invalid email address."));
  if (password.length < 8) throw new HttpError(400, L("Le mot de passe doit contenir au moins 8 caractères.", "Password must be at least 8 characters long."));
  if (one("SELECT 1 FROM users WHERE email = ?", email)) throw new HttpError(409, L("Un compte existe déjà avec cette adresse.", "An account already exists with this email address."));
  const hasAdmin = one("SELECT 1 FROM users WHERE role = 'admin'");
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  // Administration réservée au propriétaire, jamais sur simple inscription en production : avec ADMIN_EMAIL, le
  // compte de cette adresse confirme d'abord qu'il la possède (lien signé, voir admin-claim.ts) ; sans ADMIN_EMAIL,
  // seul le tout premier compte d'une installation de DÉVELOPPEMENT est administrateur (en production : aucun).
  const role = !adminEmail && !hasAdmin && process.env.NODE_ENV !== "production" ? "admin" : "client";
  const uid = id();
  run(
    "INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?,?,?,?,?,?)",
    uid,
    email,
    name.trim() || email.split("@")[0],
    await bcrypt.hash(password, 11),
    role,
    now(),
  );
  return one<User>("SELECT id, email, name, role, timezone, created_at FROM users WHERE id = ?", uid)!;
}

/** Empreinte bcrypt valide (coût 11, comme les vrais comptes), calculée à la première adresse inconnue. */
let dummyHash: Promise<string> | null = null;

export async function verifyLogin(email: string, password: string): Promise<User | null> {
  const row = one<User & { password_hash: string }>("SELECT * FROM users WHERE email = ?", email.trim().toLowerCase());
  if (!row) {
    // Adresse inconnue : vraie vérification sur une empreinte factice valide (même durée qu'un vrai compte), pour
    // ne pas révéler par le temps de réponse si un compte existe.
    await bcrypt.compare(password, await (dummyHash ??= bcrypt.hash(randomToken(16), 11)));
    return null;
  }
  if (!(await bcrypt.compare(password, row.password_hash))) return null;
  const { password_hash: _, ...u } = row;
  return u;
}

export async function startSession(userId: string) {
  const jar = await cookies();
  const previous = jar.get(SESSION_COOKIE)?.value;
  if (previous) run("DELETE FROM sessions WHERE id=?", sha256(previous));
  const token = randomToken(32);
  run(
    "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)",
    sha256(token),
    userId,
    now() + SESSION_DAYS * 86400_000,
    now(),
  );
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.APP_URL?.startsWith("http://"),
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  const jar = await cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (t) run("DELETE FROM sessions WHERE id = ?", sha256(t));
  jar.delete(SESSION_COOKIE);
}

export function userFromToken(token: string | undefined | null): User | null {
  if (!token) return null;
  const row = one<User & { expires_at: number }>(
    "SELECT u.id, u.email, u.name, u.role, u.timezone, u.created_at, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?",
    sha256(token),
  );
  if (!row || row.expires_at <= now()) return null;
  const { expires_at: _, ...u } = row;
  return u;
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  return userFromToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) throw new HttpError(401, L("Connexion requise.", "Sign-in required."));
  identifyActor(u.id);
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") throw new HttpError(403, L("Accès réservé à l'administration.", "Access restricted to administrators."));
  identifyAdministration();
  return u;
}

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  status: string;
  platform: string;
  sector: string | null;
  product_json: string;
  brand_json: string;
  strategy_json: string;
  settings_json: string;
  sources_json: string;
  current_theme_version_id: string | null;
  cover_asset_id: string | null;
  store_url: string | null;
  store_type: string;
  catalog_json: string;
  archived: number;
  created_at: number;
  updated_at: number;
};

/** Isolation stricte : un projet n'est accessible qu'à son propriétaire. */
export function ownedProject(user: User, projectId: string): ProjectRow {
  // Un projet supprimé (archivé) n'est plus utilisable, et son abonnement reste rattaché (jamais réutilisé pour un
  // autre projet). Un projet masqué (ancienne découverte gratuite) n'est accessible qu'une fois repris par un
  // abonnement. Les données restent conservées en base.
  const p = one<ProjectRow>("SELECT * FROM projects WHERE id = ? AND user_id = ? AND archived = 0 AND hidden = 0", projectId, user.id);
  if (!p) throw new HttpError(404, L("Projet introuvable.", "Project not found."));
  return p;
}
