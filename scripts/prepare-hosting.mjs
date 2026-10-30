import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const target = resolve(root, 'dist');
const assets = ['index.html', 'game.js', 'styles.css', 'travian-layout.css'];

for (const name of assets) {
  if (!existsSync(resolve(root, name))) {
    throw new Error('Ficheiro obrigatório em falta: ' + name);
  }
}
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const name of assets) {
  cpSync(resolve(root, name), resolve(target, name));
}
console.log('Firebase Hosting pronto: dist/ (' + assets.join(', ') + ')');
