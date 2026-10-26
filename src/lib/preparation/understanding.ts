import type {Brief} from "./types";
export function analyzed(b: Brief) {
  return b.provenance === "simulation" || (b.provenance === "provider" && !!b.execution?.provider && !!b.execution.model && (!b.input.photoIds.length || b.execution.vision));
}
