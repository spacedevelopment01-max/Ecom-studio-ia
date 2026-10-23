/** Portée serveur, jamais construite à partir d'un rôle ou d'un propriétaire fourni par le navigateur. */
import { AsyncLocalStorage } from "node:async_hooks";

type AccessScope = { userId?: string; projectId?: string; administration?: boolean; kind?: "http"|"worker" };
const scopes = new AsyncLocalStorage<AccessScope>();
export const accessScope = () => scopes.getStore();
export const withAccessScope = <T>(scope: AccessScope, fn: () => T): T => scopes.run({ ...scope }, fn);
export function identifyActor(userId: string) { const s = accessScope(); if (s) s.userId = userId; }
export function identifyProject(projectId: string) { const s = accessScope(); if (s) s.projectId = projectId; }
export function identifyAdministration() { const s = accessScope(); if (s) s.administration = true; }
