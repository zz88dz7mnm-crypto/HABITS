/* ============================================================
   StarkLab Web · Empaquetado para Artifact
   Igual que build.mjs, pero devuelve sólo el contenido del body:
   el host pone el <!doctype>, el <html>, el <head> y el <body>.
   Uso: node build-artifact.mjs
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const raiz = dirname(new URL(import.meta.url).pathname);
const leer = (p) => readFileSync(resolve(raiz, p), 'utf8');

const css = ['src/css/tokens.css', 'src/css/base.css', 'src/css/app.css']
  .map((p) => '/* ' + p + ' */\n' + leer(p)).join('\n');

const js = [
  'src/js/ui.js', 'src/js/store.js', 'src/js/compute.js', 'src/js/charts.js',
  'src/js/notify.js',
  'src/js/views/inicio.js', 'src/js/views/habitos.js', 'src/js/views/finanzas.js',
  'src/js/views/entrenamiento.js', 'src/js/views/diario.js', 'src/js/views/progreso.js',
  'src/js/views/pausa.js', 'src/js/views/otras.js', 'src/js/views/config.js',
  'src/js/app.js'
].map((p) => '/* ' + p + ' */\n' + leer(p)).join('\n;\n');

const luna = [
  'vendor/luna/three.min.js', 'vendor/luna/astronomy.browser.min.js',
  'vendor/luna/textures.js', 'vendor/luna/astro.js', 'vendor/luna/scene.js'
].map((p) => '/* ' + p + ' */\n' + leer(p)).join('\n;\n');

/* El arranque de la app registra un service worker que acá no existe. */
const jsLimpio = js.replace(
  "      navigator.serviceWorker.register('sw.js').catch(function () {});",
  "      /* sin service worker en este contexto */"
);

const LOGO = '<svg viewBox="0 0 512 512" aria-label="Cargando StarkLab">' +
  '<defs><linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0" stop-color="#FF3B3B"/><stop offset="1" stop-color="#FF9D4B"/>' +
  '</linearGradient></defs>' +
  '<path d="M318 96 L196 96 L128 232 L214 232 L152 416 L360 214 L262 214 Z" fill="url(#bg1)"/></svg>';

const html = `<title>StarkLab</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif&family=JetBrains+Mono:wght@400;600&display=swap">

<style>
${css}

/* El host pinta su propio fondo detrás: sin esto, la página lo hereda. */
html, body { background: var(--bg); min-height: 100dvh; }

#boot {
  position: fixed; inset: 0; z-index: 500;
  display: grid; place-items: center; gap: 18px;
  background: var(--bg);
  transition: opacity .4s var(--e-out), visibility .4s;
}
#boot.is-done { opacity: 0; visibility: hidden; pointer-events: none; }
#boot svg { width: 44px; height: 44px; animation: arranque 1.6s var(--e-inout) infinite; }
@keyframes arranque {
  0%,100% { opacity: .5; transform: scale(.94); }
  50%     { opacity: 1;  transform: scale(1); }
}
</style>

<div id="boot">${LOGO}</div>
<div id="app"></div>

<script>
${jsLimpio}
</script>
<script>
${luna}
</script>
<script>
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      var b = document.getElementById('boot');
      if (b) b.classList.add('is-done');
    });
  });
</script>
`;

mkdirSync(resolve(raiz, 'dist'), { recursive: true });
writeFileSync(resolve(raiz, 'dist/starklab-artifact.html'), html);
console.log('dist/starklab-artifact.html · ' + (html.length / 1048576).toFixed(2) + ' MB');
