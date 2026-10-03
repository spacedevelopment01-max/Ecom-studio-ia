/** Comptes et sessions (cookie httpOnly, jeton haché en base). */
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { id, now, one, run } from "./db";
import { randomToken, sha256 } from "./secrets";

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
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Adresse e-mail invalide.");
  if (password.length < 8) throw new HttpError(400, "Le mot de passe doit contenir au moins 8 caractères.");
  if (one("SELECT 1 FROM users WHERE email = ?", email)) throw new HttpError(409, "Un compte existe déjà avec cette adresse.");
  const hasAdmin = one("SELECT 1 FROM users WHERE role = 'admin'");
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  // Le premier compte d'une installation (ou ADMIN_EMAIL) administre la plateforme.
  const role = !hasAdmin || (adminEmail && adminEmail === email) ? "admin" : "client";
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

export async function verifyLogin(email: string, password: string): Promise<User | null> {
  const row = one<User & { password_hash: string }>("SELECT * FROM users WHERE email = ?", email.trim().toLowerCase());
  if (!row) {
    await bcrypt.compare(password, "$2a$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    return null;
  }
  if (!(await bcrypt.compare(password, row.password_hash))) return null;
  const { password_hash: _, ...u } = row;
  return u;
}

export async function startSession(userId: string) {
  const token = randomToken(32);
  run(
    "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)",
    sha256(token),
    userId,
    now() + SESSION_DAYS * 86400_000,
    now(),
  );
  const jar = await cookies();
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
  if (!row || row.expires_at < now()) return null;
  const { expires_at: _, ...u } = row;
  return u;
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  return userFromToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Connexion requise.");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") throw new HttpError(403, "Accès réservé à l'administration.");
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
  archived: number;
  created_at: number;
  updated_at: number;
};

/** Isolation stricte : un projet n'est accessible qu'à son propriétaire. */
export function ownedProject(user: User, projectId: string): ProjectRow {
  const p = one<ProjectRow>("SELECT * FROM projects WHERE id = ? AND user_id = ?", projectId, user.id);
  if (!p) throw new HttpError(404, "Projet introuvable.");
  return p;
}
