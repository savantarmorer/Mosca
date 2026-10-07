// Depois do build: acrescenta ?v=<hash do conteúdo> aos CSS/JS de /assets em todas as páginas,
// para que uma mudança de estilo chegue a todos os leitores na hora, sem cache antigo.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const IGNORAR = new Set(['node_modules', '.git', 'content', 'scripts', 'src', 'supabase', 'tools']);
const hashes = new Map();
const versao = rel => {
  if (!hashes.has(rel)) {
    const f = path.join(ROOT, rel);
    hashes.set(rel, fs.existsSync(f) ? crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 10) : null);
  }
  return hashes.get(rel);
};
function paginas(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? (IGNORAR.has(e.name) ? [] : paginas(path.join(dir, e.name))) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
}
let n = 0;
for (const f of paginas(ROOT)) {
  const html = fs.readFileSync(f, 'utf8');
  const novo = html.replace(/(href|src)="(\/assets\/[^"?#]+\.(?:css|js|mjs))(?:\?v=[a-f0-9]+)?"/g, (m, attr, rel) => {
    const v = versao(rel.slice(1));
    return v ? `${attr}="${rel}?v=${v}"` : m;
  });
  if (novo !== html) { fs.writeFileSync(f, novo); n++; }
}
console.log(`Versionamento: ${n} página(s) atualizada(s).`);
