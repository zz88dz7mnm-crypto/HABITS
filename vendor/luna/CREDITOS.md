# Escena lunar

El Modo Pausa usa el motor de *Luna Real*: una esfera con el mapa de albedo real
de la Luna, iluminada por la posición real del Sol para el instante y el lugar
del usuario. El terminador cae donde corresponde, los cráteres proyectan sombra
y la libración es la del día — no hay animación de fases pregrabada.

## Piezas

| Archivo | Qué hace |
| --- | --- |
| `astro.js` | Capa sobre astronomy-engine. `snapshot()` devuelve el vector Luna→Sol en el marco de la pantalla y la matriz de orientación cuerpo→mundo de la Luna, con libración incluida. |
| `scene.js` | Escena three.js: esfera en coordenadas selenográficas, shader propio, campo de estrellas, cámara orbital. |
| `textures.js` | Mapa de albedo y mapa de relieve, embebidos como data URI para que funcione sin red. |

## Por qué se ve bien

**La orientación sale de vectores, no de fórmulas de fase.** Se arma un marco de
pantalla y se proyectan ahí el vector Luna→Sol y los ejes selenográficos. Fase,
ángulo del limbo iluminado, libración y la vuelta del hemisferio sur salen todos
de la misma construcción, sin casos especiales.

**La Luna no es lambertiana.** El shader usa una BRDF de Lommel-Seeliger más el
pico de oposición: por eso la luna llena se ve como un disco plano y parejo, y no
como una bola de billar. La cara no iluminada recibe luz cenicienta —el reflejo
de la Tierra— más fuerte cuanto más fina es la fase.

## Licencias

- Cálculo astronómico: [astronomy-engine](https://github.com/cosinekitty/astronomy) 2.1.19 — MIT.
- Render: [three.js](https://threejs.org) r128 — MIT.
- Mapa de albedo: textura lunar de three.js (`examples/textures/planets/moon_1024.jpg`).
