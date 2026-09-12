/** รันทุกไฟล์ e2e เรียงลำดับ reseed ก่อนแต่ละไฟล์ แล้วสรุปผล */
const { execSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const files = fs.readdirSync(__dirname).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
const summary = [];
for (const f of files) {
  execSync('npm run -s seed', { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', env: process.env });
  const out = r.stdout + r.stderr;
  const pass = (out.match(/✅/g) ?? []).length;
  const fail = (out.match(/❌|💥/g) ?? []).length;
  console.log(`\n=== ${f} · ✅ ${pass} · ❌ ${fail}`);
  if (fail) console.log(out.split('\n').filter((l) => /❌|💥/.test(l)).join('\n'));
  summary.push({ f, pass, fail });
}
execSync('npm run -s seed', { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
console.log('\n' + summary.map((s) => `${s.fail ? '❌' : '✅'} ${s.f} ${s.pass}/${s.pass + s.fail}`).join('\n'));
process.exit(summary.some((s) => s.fail) ? 1 : 0);
