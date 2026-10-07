// Uso (no computador da redação, nunca no servidor):
//   node tools/abrir-denuncia.mjs chave-privada.asc arquivo.pgp
// Baixe o .pgp em Supabase → Storage → denuncias. Os anexos são salvos em ./denuncia-<codigo>/
import * as openpgp from 'openpgp';
import fs from 'fs';
import readline from 'readline/promises';

const [chave, arquivo] = process.argv.slice(2);
if (!chave || !arquivo) { console.error('Uso: node tools/abrir-denuncia.mjs chave-privada.asc arquivo.pgp'); process.exit(1); }
let privateKey = await openpgp.readPrivateKey({ armoredKey: fs.readFileSync(chave, 'utf8') });
if (!privateKey.isDecrypted()) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  privateKey = await openpgp.decryptKey({ privateKey, passphrase: await rl.question('Senha da chave: ') });
  rl.close();
}
const { data } = await openpgp.decrypt({ message: await openpgp.readMessage({ binaryMessage: fs.readFileSync(arquivo) }), decryptionKeys: privateKey });
const d = JSON.parse(data);
const dir = `denuncia-${d.codigo}`;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(`${dir}/relato.txt`, d.relato);
for (const a of d.anexos) fs.writeFileSync(`${dir}/${a.nome}`, Buffer.from(a.base64, 'base64'));
console.log(`Aberto em ./${dir} (${d.anexos.length} anexo(s))`);
