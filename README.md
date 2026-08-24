# StarkLab Web

**Central de Comando Personal.** Hábitos con grilla y gráficos, finanzas, entrenamiento,
diario y un modo pausa nocturno. Web app instalable (PWA) que funciona offline,
sin apps de tienda.

> Implementación del documento de producto *StarkLab Web · Versión Realista v3*.

## Estado

| Módulo | Estado |
|---|---|
| Shell + sistema visual + PWA | ✅ |
| Hábitos (grilla, gráficos, rachas, notas) | 🚧 |
| Finanzas (tarjetas, torta, transacciones, presupuestos) | 🚧 |
| Entrenamiento (mapa muscular, rutina semanal) | 🚧 |
| Diario (ánimo, cruce con hábitos) | 🚧 |
| Progreso (radar de performance, comparativas) | 🚧 |
| Modo Pausa (luna WebGL, hora, clima) | 🚧 |
| Configuración | 🚧 |

## Cómo correrlo

Es un sitio estático sin build. Cualquier servidor sirve:

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

> El service worker (offline + notificaciones) sólo se registra en `localhost` o HTTPS.
> Abrir el `index.html` con doble clic funciona para ver la UI, pero sin PWA.

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
src/js/                  Estado, gráficos y vistas
```

## Decisiones

- **Sin dependencias.** Cero librerías: los gráficos son SVG y Canvas escritos a mano,
  para que pesen poco y sigan la paleta exacta del documento.
- **Los datos son del usuario.** Todo vive en `localStorage`; se puede exportar y borrar
  desde Configuración. No hay servidor ni cuenta.
- **El color viene del dato.** El rojo→naranja de marca se usa sólo en marca, acciones
  primarias y foco. El resto del color siempre identifica un hábito, categoría o estado.
