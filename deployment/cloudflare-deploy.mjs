/** Deploy the existing Vinext app to the currently authenticated Cloudflare account. */
import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

function run(bin, args) {
  const result = spawnSync(bin, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('npm', ['run', 'build']);
const candidates = [];
const dist = path.resolve('dist');
function walk(dir, depth=0) {
  if(depth>3 || !existsSync(dir)) return;
  for (const ent of readdirSync(dir, {withFileTypes:true})) {
    const file = path.join(dir, ent.name);
    if(ent.isFile() && ent.name === 'wrangler.json') candidates.push(file);
    else if(ent.isDirectory()) walk(file, depth+1);
  }
}
walk(dist);
if (candidates.length !== 1) {
  console.error('Expected exactly one generated dist/**/wrangler.json; found', candidates);
  process.exit(1);
}
console.log('Deploying generated Worker config:', candidates[0]);
run('npx', ['--no-install', 'wrangler', 'deploy', '--config', candidates[0], '--name', 'vanshawali-360']);
