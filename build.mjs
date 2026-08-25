/* ============================================================
   Zenit · Empaquetado en un solo archivo
   Toma index.html y mete adentro el CSS, los scripts y el motor
   lunar, para producir un HTML que se abre solo, sin servidor.
   Uso: node build.mjs
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const raiz = dirname(new URL(import.meta.url).pathname);
const leer = (p) => readFileSync(resolve(raiz, p), 'utf8');

let html = leer('index.html');

/* — hojas de estilo locales (las de Google Fonts quedan como link) — */
html = html.replace(/<link rel="stylesheet" href="(src\/[^"]+)">/g, (_, href) =>
  '<style>\n/* ' + href + ' */\n' + leer(href) + '\n</style>');

/* — scripts locales — */
html = html.replace(/<script src="(src\/[^"]+)"><\/script>/g, (_, src) =>
  '<script>\n/* ' + src + ' */\n' + leer(src) + '\n</script>');

/* — el motor lunar —
   Normalmente se carga a pedido al entrar al Modo Pausa. En el archivo
   único no hay red de dónde pedirlo, así que va embebido y se le avisa
   al cargador que ya está listo. */
const luna = [
  'vendor/luna/three.min.js',
  'vendor/luna/astronomy.browser.min.js',
  'vendor/luna/textures.js',
  'vendor/luna/astro.js',
  'vendor/luna/scene.js'
].map((p) => '/* ' + p + ' */\n' + leer(p)).join('\n;\n');

html = html.replace('</body>', '<script>\n' + luna + '\n</script>\n</body>');

/* — sin servidor no hay service worker: se evita el error en consola — */
html = html.replace(
  "navigator.serviceWorker.register('sw.js').catch(function () {});",
  "if (location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});"
);
html = html.replace('<link rel="manifest" href="manifest.webmanifest">', '');

/* — el ícono va como data URI para no depender de la carpeta icons/ — */
const svg = leer('icons/icon.svg');
const dataUri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
html = html.replace(/href="icons\/[^"]+"/g, 'href="' + dataUri + '"');

mkdirSync(resolve(raiz, 'dist'), { recursive: true });
writeFileSync(resolve(raiz, 'dist/zenit.html'), html);

const mb = (html.length / 1048576).toFixed(2);
console.log('dist/zenit.html · ' + mb + ' MB');
