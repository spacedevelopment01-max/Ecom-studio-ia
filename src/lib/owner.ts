/**
 * Compte propriétaire (administrateur) : il teste et démontre le studio avec ses propres clés d'IA.
 * Il n'est donc jamais traité comme une découverte gratuite : pas de budget IA plafonné, images et vidéos IA permises,
 * quotas du forfait le plus complet sans blocage.
 */
import { one } from "./db";

export function isAdminUser(userId: string | null | undefined): boolean {
  return !!userId && one<{ role: string }>("SELECT role FROM users WHERE id = ?", userId)?.role === "admin";
}
