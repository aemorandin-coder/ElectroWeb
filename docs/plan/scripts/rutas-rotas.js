// Busca fetch("/api/...") y enlaces (href, router.push) que no tienen ruta ni página en app/.
// Uso (desde la raíz): node docs/plan/scripts/rutas-rotas.js app/admin components/admin
const fs = require('fs'), path = require('path');
const walk = (dir, out = []) => { if (!fs.existsSync(dir)) return out; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); } else out.push(p); } return out; };
const toRegex = (file) => {
  const segs = path.dirname(path.relative('app', file)).split(path.sep).filter((s) => s !== '.' && !/^\(.*\)$/.test(s));
  const body = segs.map((s) => (/^\[\[?\.\.\./.test(s) ? '.*' : /^\[.*\]$/.test(s) ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/');
  return new RegExp(`^/${body}/?$`);
};
const all = walk('app');
const pages = all.filter((f) => /\/page\.(tsx|ts|jsx|js)$/.test(f)).map(toRegex);
const routes = all.filter((f) => /\/route\.(ts|js)$/.test(f)).map(toRegex);
const found = new Map();
for (const dir of process.argv.slice(2)) for (const f of walk(dir).filter((f) => /\.(tsx?|jsx?)$/.test(f))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/fetch\(\s*[`'"](\/api\/[^`'"?#]*)/g)) add('API', m[1], f);
  for (const m of src.matchAll(/(?:href=\{?\s*[`'"]|router\.(?:push|replace)\(\s*[`'"])(\/[^`'"?#\s]*)/g)) add('PAGINA', m[1], f);
}
function add(kind, raw, file) {
  const url = raw.replace(/\$\{[^}]*\}/g, 'x').replace(/\/+$/, '') || '/';
  if (url.includes('${')) return;
  const ok = (kind === 'API' ? routes : pages).some((r) => r.test(url)) || (kind === 'PAGINA' && /^\/(uploads|images|fonts)\//.test(url));
  if (!ok) { const k = `${kind} ${raw}`; if (!found.has(k)) found.set(k, new Set()); found.get(k).add(file); }
}
if (found.size === 0) console.log('- Ninguna');
for (const [k, files] of found) console.log(`- ${k}  →  ${[...files].join(', ')}`);
