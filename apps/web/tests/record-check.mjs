import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'check';
const npmCli = process.env.npm_execpath || process.env.NPM_CLI_PATH || path.join(process.env.ProgramFiles || 'C:/Program Files', 'nodejs/node_modules/npm/bin/npm-cli.js');
const commands = {
  check: [process.execPath, [npmCli, 'run', 'check'], false],
  build: [process.execPath, ['node_modules/next/dist/bin/next', 'build'], false],
  e2e: [process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], false],
};
if (!(mode in commands)) throw new Error('Unknown check');
const [command, args, shell] = commands[mode];
const result = spawnSync(command, args, { cwd: web, shell, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
  env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}` } });
const output = `UTC: ${new Date().toISOString()}\nRuntime: ${process.version}\nCommand: ${command} ${args.join(' ')}\nExit: ${result.status}\n\n${result.stdout || ''}${result.stderr || ''}${result.error ? String(result.error) : ''}`;
mkdirSync(path.join(web, 'tests/evidence'), { recursive: true });
writeFileSync(path.join(web, `tests/evidence/${mode}.txt`), output, 'utf8');
process.stdout.write(output);
process.exitCode = result.status ?? 1;
