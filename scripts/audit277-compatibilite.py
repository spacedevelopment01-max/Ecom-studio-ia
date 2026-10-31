#!/usr/bin/env python3
"""Audit Git local seulement : aucun checkout, merge de branche, serveur ou fournisseur.

Les simulations merge-file utilisent trois fichiers temporaires et ne changent aucun
index, référence ou fichier applicatif. Un succès textuel ne valide pas l'intégration.
"""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import tempfile
from datetime import datetime, timezone


def git(*args):
    return subprocess.check_output(["git", *args], stderr=subprocess.PIPE)


def text(*args):
    return git(*args).decode().strip()


def content(sha, name):
    try:
        return git("show", f"{sha}:{name}")
    except subprocess.CalledProcessError:
        return None


def ancestor(a, b):
    r = subprocess.run(["git", "merge-base", "--is-ancestor", a, b], capture_output=True)
    if r.returncode not in (0, 1):
        raise RuntimeError(r.stderr.decode())
    return r.returncode == 0


def changed(base, sha):
    return set(text("diff", "--name-only", base, sha).splitlines())


def tables(sha, names):
    result = {}
    for name in sorted(names):
        if not name.startswith(("src/", "worker/")) or not name.endswith((".ts", ".tsx")):
            continue
        source = content(sha, name)
        if source is None:
            continue
        decoded = source.decode()
        for match in re.finditer(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z_0-9]*)", decoded):
            result.setdefault(match[1], []).append({"file": name, "line": decoded[:match.start()].count("\n") + 1})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--main", required=True)
    parser.add_argument("--claude", required=True)
    parser.add_argument("--codex", required=True)
    parser.add_argument("--candidate")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    refs = {key: value for key, value in vars(args).items() if key != "out" and value}
    for key, value in refs.items():
        if not re.fullmatch(r"[0-9a-f]{40}", value):
            parser.error(f"{key}: SHA complet obligatoire")
        if text("rev-parse", f"{value}^{{commit}}") != value:
            parser.error(f"{key}: objet commit absent")
    before = text("show-ref")
    base = text("merge-base", args.claude, args.codex)
    c, x = changed(args.main, args.claude), changed(args.main, args.codex)
    common = sorted(c & x)
    simulations = []
    with tempfile.TemporaryDirectory(prefix="ecs-277-git-") as directory:
        for name in common:
            data = [content(sha, name) for sha in (args.codex, base, args.claude)]
            if any(value is None or b"\0" in value for value in data):
                simulations.append({"file": name, "status": "not_textually_simulated"})
                continue
            paths = []
            for index, value in enumerate(data):
                p = pathlib.Path(directory) / str(index)
                p.write_bytes(value)
                paths.append(str(p))
            r = subprocess.run(["git", "merge-file", "-p", *paths], capture_output=True)
            if not 0 <= r.returncode <= 127:
                raise RuntimeError("merge-file: " + r.stderr.decode())
            simulations.append({"file": name, "status": "no_text_conflict" if r.returncode == 0 else "text_conflict", "resultSha256": hashlib.sha256(r.stdout).hexdigest()})
    ct, xt = tables(args.claude, c), tables(args.codex, x)
    baseline_tables = tables(args.main, c | x)
    export = content(args.codex, "src/lib/orchestrator/conversation/export-tool-execution.ts").decode()
    facts = {
        "codexCurrentSiteSourceUsesWithBiens": "withStudioProducts(withBiens(cur.spec,pid),pid)" in export,
        "claudeContentAdapterExists": content(args.claude, "src/lib/contenus/index.ts") is not None,
        "dependenciesChanged": {side: sorted(names & {"package.json", "package-lock.json"}) for side, names in [("claude", c), ("codex", x)]},
        "commonNewApiRoutes": sorted(name for name in common if name.startswith("src/app/api/") and content(args.main, name) is None),
        "themeBaseChanges": {side: sorted(name for name in names if name.startswith("theme-base/")) for side, names in [("claude", c), ("codex", x)]},
    }
    result = {
        "schema": "integration277-readonly-git-1", "capturedAt": datetime.now(timezone.utc).isoformat(),
        "refs": refs, "commonAncestor": base,
        "mainIsAncestor": {"claude": ancestor(args.main, args.claude), "codex": ancestor(args.main, args.codex)},
        "changedFileCounts": {"claude": len(c), "codex": len(x)},
        "commonFiles": simulations, "textualConflictCount": sum(s["status"] == "text_conflict" for s in simulations),
        "tablesInChangedModules": {"claude": ct, "codex": xt},
        "tableNameOverlap": sorted(ct.keys() & xt.keys()),
        "newTablesRelativeToMain": {"claude": sorted(ct.keys() - baseline_tables.keys()), "codex": sorted(xt.keys() - baseline_tables.keys())}, "facts": facts,
        "candidate": None, "realProviderCalls": 0, "branchMerges": 0,
        "limitations": ["Les tables sont relevées statiquement, pas migrées.", "merge-file ne prouve ni types ni compatibilité fonctionnelle.", "Les faits sur les sources restent distincts d'un défaut reproduit dans une candidate.", "Aucune CI verte séparée ne valide la combinaison."],
    }
    if args.candidate:
        cand = args.candidate
        retention = {}
        for side, sha, names in [("claude", args.claude, c), ("codex", args.codex, x)]:
            same, modified, missing = [], [], []
            for name in sorted(names):
                original, actual = content(sha, name), content(cand, name)
                if original is None:
                    continue
                (missing if actual is None else same if original == actual else modified).append(name)
            retention[side] = {"identicalCount": len(same), "modified": modified, "missing": missing}
        result["candidate"] = {
            "sha": cand, "containsClaudeByAncestry": ancestor(args.claude, cand), "containsCodexByAncestry": ancestor(args.codex, cand),
            "changesAfterCodex": sorted(changed(args.codex, cand)),
            "changesAfterClaude": sorted(changed(args.claude, cand)),
            "sourceRetention": retention,
            "themeBaseIdenticalToMain": not bool(text("diff", "--name-only", args.main, cand, "--", "theme-base/")),
        }
    if text("show-ref") != before:
        raise RuntimeError("Références Git changées pendant la lecture : recommencer le relevé")
    result["refsUnchanged"] = True
    path = pathlib.Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: result[key] for key in ["refs", "commonAncestor", "changedFileCounts", "textualConflictCount", "tableNameOverlap", "refsUnchanged"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
