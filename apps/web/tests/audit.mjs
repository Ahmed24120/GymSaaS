import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const evidence = path.join(repo, 'apps/web/tests/evidence');
mkdirSync(evidence, { recursive: true });
const lines = [`UTC: ${new Date().toISOString()}`, `HEAD: ${execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()}`];
function command(name, args) {
  const result = spawnSync(name, args, { cwd: repo, encoding: 'utf8' });
  lines.push(`\n$ ${name} ${args.join(' ')}\nexit=${result.status}\n${result.stdout || ''}${result.stderr || ''}`);
}
command('rg', ['-n', 'mockData', 'apps/web/src']);
command('rg', ['-l', '--hidden', '-g', '!.git/**', '-g', '!**/node_modules/**', '-g', '!**/.next/**', '-g', '!.tools/**', '-g', '!apps/web/tests/evidence/**', 'service_role', '.']);
const tracked = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8' }).trim().split(/\r?\n/);
lines.push('\n$ git ls-files | findstr ".env"\n' + tracked.filter((file) => file.includes('.env')).join('\n'));
lines.push('\n$ cat apps/web/src/lib/qr/contract.ts\n' + readFileSync(path.join(repo, 'apps/web/src/lib/qr/contract.ts'), 'utf8'));
lines.push('\nTracked files containing a privileged JWT (names only):');
let count = 0;
for (const file of tracked) {
  if (/\.(png|ico|jpg|zip)$/.test(file)) continue;
  if (!existsSync(path.join(repo, file))) continue;
  const content = readFileSync(path.join(repo, file), 'utf8');
  for (const match of content.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      if (JSON.parse(Buffer.from(match[1], 'base64url').toString()).role === 'service_role') { lines.push(file); count++; break; }
    } catch {}
  }
}
lines.push(`count=${count}; limited scan, not a guarantee of absence of all secret formats`);
writeFileSync(path.join(evidence, 'source-audit.txt'), lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
