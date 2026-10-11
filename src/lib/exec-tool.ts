/**
 * Lancement des outils externes (ffmpeg, ffprobe) avec une durée maximale : un outil bloqué (fichier corrompu,
 * flux sans fin) est arrêté au lieu d'occuper indéfiniment une place du worker. Mêmes paramètres et même résultat
 * que `promisify(execFile)`.
 */
import { execFile, type ExecFileOptions } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
/** 15 min : bien au-delà du montage le plus long du studio (vidéo de 60 s en qualité « slow »). */
export const TOOL_TIMEOUT_MS = 15 * 60_000;

export function execTool(cmd: string, args: string[], opts: ExecFileOptions = {}): Promise<{ stdout: string; stderr: string }> {
  return run(cmd, args, { timeout: TOOL_TIMEOUT_MS, killSignal: "SIGKILL", maxBuffer: 16 * 1024 * 1024, ...opts, encoding: "utf8" }) as Promise<{ stdout: string; stderr: string }>;
}
