# StarkLab Web

**Central de Comando Personal.** Hábitos con grilla y gráficos, finanzas, entrenamiento,
diario y un modo pausa nocturno. Web app instalable (PWA) que funciona offline,
sin apps de tienda.

> Implementación del documento de producto *StarkLab Web · Versión Realista v3*.

## Estado

| Módulo | Estado |
|---|---|
| Shell + sistema visual + PWA | ✅ |
| Inicio (resumen del día) | ✅ |
| Hábitos (grilla, gráficos, rachas, notas, drag & drop) | ✅ |
| Finanzas (tarjetas, torta, transacciones, presupuestos, importar CSV) | ✅ |
| Entrenamiento (mapa muscular, rutina semanal, volumen) | ✅ |
| Diario (ánimo, cruce con hábitos, correlación) | ✅ |
| Progreso (radar, mapa de calor anual, mes contra mes) | ✅ |
| Metas · Tareas · Agenda · Enfoque · Logros · Perfil | ✅ |
| Modo Pausa (Luna real en WebGL, hora, clima) | ✅ |
| Configuración (tema, notificaciones, presupuestos, export/borrado) | ✅ |
| Familia (compartir entre personas) | ⛔ Necesita servidor — ver nota en la app |

## Cómo correrlo

Es un sitio estático sin build. Cualquier servidor sirve:

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

> El service worker (offline + notificaciones) sólo se registra en `localhost` o HTTPS.
> Abrir el `index.html` con doble clic funciona para ver la UI, pero sin PWA.

## Un solo archivo

```bash
node build.mjs      # → dist/starklab.html
```

Mete adentro el CSS, los scripts y el motor lunar, y produce un HTML de ~1,6 MB
que se abre con doble clic: sin servidor, sin red y sin instalar nada. Sirve para
mandarlo por mensaje o probarlo en un teléfono sin desplegar.

## Deploy

No hay build step: se publica la raíz del repo tal cual.

**Vercel** — importar el repo, *Framework Preset*: `Other`, *Build Command*: vacío,
*Output Directory*: `.`

**Netlify** — *Build command*: vacío, *Publish directory*: `.`

**GitHub Pages** — Settings → Pages → *Deploy from a branch* → rama
`claude/proyecto-analisis-desarrollo-x1gefx`, carpeta `/ (root)`.

**Cloudflare Pages** — *Build command*: vacío, *Build output directory*: `/`

## Estructura

```
index.html               Punto de entrada
manifest.webmanifest     Manifiesto PWA (íconos, atajos, standalone)
sw.js                    Service worker: offline + notificaciones
icons/                   Íconos de la app (any + maskable)

src/css/tokens.css       Sistema visual: color, tipografía, espaciado, motion
src/css/base.css         Reset y primitivas
src/css/app.css          Layout, componentes y Modo Pausa

src/js/ui.js             Íconos, helpers de DOM, modales y toasts
src/js/store.js          Estado y persistencia en localStorage
src/js/compute.js        Cálculos derivados: cumplimiento, rachas, radar
src/js/charts.js         Motor de gráficos en SVG, sin librerías
src/js/notify.js         Recordatorios locales
src/js/app.js            Shell, ruteo y arranque
src/js/views/            Una vista por módulo

vendor/luna/             Motor de la escena lunar (ver CREDITOS.md)
```

## Los gráficos

Están escritos a mano en SVG, sin librerías. Las reglas que siguen todos:

- **Una sola escala por gráfico.** Nunca dos ejes Y — es la forma más fácil de
  mentir con un gráfico. En el cruce ánimo/hábitos, el ánimo (1–5) se lleva a
  porcentaje para que ambas series compartan la misma escala.
- **La grilla y los ejes son recesivos**; el dato es lo único brillante.
- **El texto usa tokens de texto, nunca el color de la serie.** El color lo
  lleva la marca al lado, no el número.
- **Etiquetas directas sólo donde hacen falta**, no una por punto.
- **Los huecos cortan la línea.** Un día en que no tocaba ningún hábito no vale
  0%: la línea se interrumpe en vez de inventar una caída.
- Todo gráfico tiene capa de hover con crosshair y tooltip.

### Sobre los colores de hábito

Los ocho hex son exactamente los del documento de producto. Lo que cambió es
**el orden en que se reparten**: con el orden original, el par coral↔rosa quedaba
en ΔE 11.1 (OKLab) — indistinguible incluso con visión normal. Reordenados, el
peor par adyacente sube a **ΔE 24.0**, y a **12.4** bajo protanopía y
deuteranopía. Además cada hábito lleva siempre su emoji y su nombre, así la
identidad nunca depende sólo del color.

## Decisiones

- **Sin dependencias.** Cero librerías: los gráficos son SVG y Canvas escritos a mano,
  para que pesen poco y sigan la paleta exacta del documento.
- **Los datos son del usuario.** Todo vive en `localStorage`; se puede exportar y borrar
  desde Configuración. No hay servidor ni cuenta.
- **El color viene del dato.** El rojo→naranja de marca se usa sólo en marca, acciones
  primarias y foco. El resto del color siempre identifica un hábito, categoría o estado.
