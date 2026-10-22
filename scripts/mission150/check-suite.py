"""Run every native Vitest file in independent process groups. No test assertions are skipped.
Each Vitest process creates its own disposable database via vitest.config.ts.
Parallelism is between those isolated databases; files within one database run serially.
"""
import argparse
import concurrent.futures
import json
import os
from pathlib import Path
import re
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
parser.add_argument('--workers', type=int, default=2)
args = parser.parse_args()
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)
files = sorted(str(p) for p in Path('tests').rglob('*.test.ts'))
groups = [files[i:i+60] for i in range(0, len(files), 60)]
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
(out/'groups.json').write_text(json.dumps(groups, indent=2))
env = os.environ.copy()
guard = Path('scripts/verify-video-network-guard.mjs').resolve()
env['NODE_OPTIONS'] = (env.get('NODE_OPTIONS', '')+' --import '+str(guard)).strip()
results = []
def check(index):
    start = time.monotonic()
    command = ['npx', 'vitest', 'run', '--no-file-parallelism', *groups[index]]
    log = out/f'group-{index+1}.txt'
    with log.open('w') as stream:
        result = subprocess.run(command, env=env, stdout=stream, stderr=subprocess.STDOUT)
    text = log.read_text()
    return {'group': index+1, 'files': len(groups[index]), 'exitCode': result.returncode,
            'seconds': round(time.monotonic()-start, 2), 'command': command,
            'summary': [line.strip() for line in text.splitlines() if re.search(r'^\s*(Test Files|Tests\s)', line)]}
# Start the longest video and logo groups first to reduce idle time.
order = [i for i in [5, 2, 0, 1, 3, 4] if i < len(groups)]
order += [i for i in range(len(groups)) if i not in order]
with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(3, args.workers))) as pool:
    for future in concurrent.futures.as_completed([pool.submit(check, i) for i in order]):
        result = future.result()
        results.append(result)
        (out/'summary.json').write_text(json.dumps({'sourceCommit': commit, 'testFiles': len(files),
            'externalFetchGuard': True, 'supplierTests': 'simulated',
            'groups': sorted(results, key=lambda x:x['group'])}, indent=2))
        print(json.dumps({k:v for k,v in result.items() if k!='command'}), flush=True)
raise SystemExit(0 if all(r['exitCode']==0 for r in results) else 1)
