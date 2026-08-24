/* ============================================================
   StarkLab Web · Modo Pausa
   Pantalla nocturna: la Luna real del día, hora grande y clima.
   Pensada para dejar el teléfono apoyado de costado cargando.

   La escena lunar no es una animación de fases: se calcula la
   posición real del Sol y de la Luna para este instante y para
   donde estás, así que el terminador cae donde corresponde, los
   cráteres proyectan sombra y la libración es la de hoy. En el
   hemisferio sur la Luna se ve dada vuelta, como se ve de verdad.

   El motor pesa ~1,4 MB, así que se carga recién al entrar acá:
   el arranque de la app no lo paga.
   ============================================================ */
(function (SL) {
  'use strict';

  var esc = SL.esc;
  var scene = null, raf = null, clockTimer = null, snapTimer = null;
  var cargando = false;

  // Córdoba, Argentina: lo que muestra el documento de producto. Sólo se usa
  // si el usuario no da permiso de ubicación — no reemplaza a la real.
  var FALLBACK = { lat: -31.42, lon: -64.19, label: 'Córdoba, Argentina' };

  SL.views = SL.views || {};

  SL.views.pausa = function (root, s) {
    var escena = s.settings.pauseScene || 'luna';

    root.innerHTML =
      '<div class="pausa" data-pausa>' +
        '<div class="pausa__escena" data-escena-host></div>' +
        '<canvas class="pausa__sky" data-sky aria-hidden="true"></canvas>' +
        '<div class="pausa__ui">' +
          '<div class="pausa__hora u-num" data-hora>--:--</div>' +
          '<div class="pausa__lugar" data-lugar>Buscando ubicación…</div>' +
          '<div class="pausa__clima" data-clima></div>' +
          '<div class="pausa__fase" data-fase>Calculando la fase de hoy…</div>' +
        '</div>' +
        '<div class="pausa__tools">' +
          '<div class="seg" data-sel>' +
            [['luna','Luna'],['planeta','Planeta'],['estrellas','Estrellas']].map(function (o) {
              return '<button class="seg__b' + (escena === o[0] ? ' is-on' : '') + '" data-e="' + o[0] + '">' + o[1] + '</button>';
            }).join('') +
          '</div>' +
          '<button class="icon-btn" data-full aria-label="Pantalla completa">' + SL.icon('metas') + '</button>' +
          '<button class="icon-btn" data-salir aria-label="Salir del Modo Pausa">' + SL.icon('x') + '</button>' +
        '</div>' +
      '</div>';

    var host = SL.$('[data-pausa]', root);
    document.documentElement.classList.add('is-pausa');

    /* — reloj — */
    var horaEl = SL.$('[data-hora]', root);
    function tick() {
      var d = new Date();
      horaEl.textContent = d.getHours() + ':' + SL.date.pad(d.getMinutes());
    }
    tick();
    clearInterval(clockTimer);
    clockTimer = setInterval(tick, 1000);

    /* — ubicación: primero la real, y si no hay permiso, la del documento — */
    ubicacion(function (loc) {
      SL.$('[data-lugar]', root).textContent = loc.label;
      if (escena === 'estrellas') {
        SL.$('[data-fase]', root).textContent = '';
        campoEstrellas(SL.$('[data-sky]', root), 460);
        return;
      }
      campoEstrellas(SL.$('[data-sky]', root), 150);
      if (escena === 'planeta') {
        SL.$('[data-fase]', root).textContent = 'Saturno · escena decorativa';
        planeta(SL.$('[data-escena-host]', root));
        return;
      }
      luna(SL.$('[data-escena-host]', root), SL.$('[data-fase]', root), loc);
    });

    /* — clima — */
    clima(SL.$('[data-clima]', root));

    /* — acciones — */
    SL.$('[data-sel]', root).addEventListener('click', function (e) {
      var b = e.target.closest('[data-e]'); if (!b) return;
      derribar();
      SL.store.update(function (st) { st.settings.pauseScene = b.dataset.e; });
    });
    SL.$('[data-salir]', root).addEventListener('click', function () { SL.go('inicio'); });
    SL.$('[data-full]', root).addEventListener('click', function () {
      if (!document.fullscreenElement) (host.requestFullscreen || function () {}).call(host);
      else document.exitFullscreen();
    });

    /* La pantalla no se apaga mientras dure el Modo Pausa, si el navegador deja. */
    if (navigator.wakeLock && navigator.wakeLock.request) {
      navigator.wakeLock.request('screen').then(function (l) { host._lock = l; }).catch(function () {});
    }
  };

  SL.views.pausa.leave = function () {
    document.documentElement.classList.remove('is-pausa');
    derribar();
    clearInterval(clockTimer);
    var host = SL.$('[data-pausa]');
    if (host && host._lock) { try { host._lock.release(); } catch (e) {} }
  };

  function derribar() {
    cancelAnimationFrame(raf);
    clearInterval(snapTimer);
    if (scene && scene.dom && scene.dom.parentNode) scene.dom.parentNode.removeChild(scene.dom);
    scene = null;
  }

  /* ————————————————— carga diferida del motor lunar —————————————————
     Los scripts se piden una sola vez y quedan cacheados por el service
     worker, así que la segunda visita al Modo Pausa es instantánea. */
  var LIBS = [
    'vendor/luna/three.min.js',
    'vendor/luna/astronomy.browser.min.js',
    'vendor/luna/textures.js',
    'vendor/luna/astro.js',
    'vendor/luna/scene.js'
  ];

  function cargarMotor() {
    if (window.LunaScene && window.LunaAstro && window.LUNA_TEX) return Promise.resolve(true);
    if (cargando) return cargando;
    cargando = LIBS.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (res, rej) {
          // Si ya está en el documento, no se vuelve a pedir.
          if (document.querySelector('script[src="' + src + '"]')) return res();
          var sc = document.createElement('script');
          sc.src = src; sc.async = false;
          sc.onload = res;
          sc.onerror = function () { rej(new Error('No se pudo cargar ' + src)); };
          document.head.appendChild(sc);
        });
      });
    }, Promise.resolve()).then(function () {
      return !!(window.LunaScene && window.LunaAstro);
    });
    return cargando;
  }

  /* ————————————————— la Luna real ————————————————— */
  function luna(host, faseEl, loc) {
    host.innerHTML = '<div class="pausa__cargando">Cargando la Luna de hoy…</div>';

    cargarMotor().then(function (ok) {
      if (!ok) throw new Error('motor no disponible');
      host.innerHTML = '';

      var A = window.LunaAstro;
      // upMode 'zenith': la Luna orientada como se ve desde donde estás.
      var obs = A.observer(loc.lat, loc.lon, 20);
      scene = window.LunaScene(host, {});
      if (!scene) throw new Error('sin WebGL');

      acomodar();
      window.addEventListener('resize', acomodar);

      /* El encuadre: centerFx/centerFy corren el centro óptico en fracciones
         de la semipantalla desde el centro (0 = centrada). Positivo en Y sube
         la Luna, negativo en X la corre a la izquierda. */
      function acomodar() {
        if (!scene) return;
        var vertical = window.innerHeight >= window.innerWidth;
        if (vertical) {
          // De pie: la Luna arriba, centrada, y la hora ocupa la mitad de abajo.
          scene.setViewCenter(0, 0.30);
          scene.setFill(0.30);
        } else {
          // De costado: la Luna a la izquierda y la hora al lado.
          scene.setViewCenter(-0.44, 0.04);
          scene.setFill(0.46);
        }
        scene.resize();
      }

      function refrescar() {
        if (!scene) return;
        var snap = A.snapshot(new Date(), obs, 'zenith');
        scene.setSnapshot(snap);
        faseEl.innerHTML =
          esc(snap.phase.name) + ' · ' + Math.round(snap.illum * 100) + '% iluminada' +
          '<span class="pausa__fase-sub">' +
            Math.round(snap.age * 10) / 10 + ' días de lunación · ' +
            Math.round(snap.distKm).toLocaleString('es-AR') + ' km' +
            (snap.supermoon ? ' · superluna' : snap.micromoon ? ' · microluna' : '') +
          '</span>';
      }
      refrescar();
      // La Luna se mueve: cada minuto se recalcula todo.
      clearInterval(snapTimer);
      snapTimer = setInterval(refrescar, 60000);
    }).catch(function (err) {
      console.warn('Modo Pausa — fallback 2D:', err.message);
      host.innerHTML = '<canvas class="pausa__moon2d" data-m2d></canvas>';
      luna2D(SL.$('[data-m2d]', host), faseEl);
    });
  }

  /* ————————————————— fallback sin WebGL —————————————————
     Ni three.js ni la GPU disponibles: se dibuja una luna en 2D con la
     fase correcta. Se ve peor, pero se ve y dice la verdad. */
  function luna2D(canvas, faseEl) {
    if (!canvas) return;
    var x = canvas.getContext('2d');
    var ph = fase(new Date());
    faseEl.textContent = ph.name + ' · ' + Math.round(ph.illum * 100) + '% iluminada';

    var tex = texturaLunar();
    function draw() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, r.width * dpr);
      canvas.height = Math.max(1, r.height * dpr);
      var W = canvas.width, H = canvas.height;
      var R = Math.min(W, H) * 0.3, cx = W / 2, cy = H * 0.36;
      x.clearRect(0, 0, W, H);
      x.save();
      x.beginPath(); x.arc(cx, cy, R, 0, 6.3); x.clip();
      x.drawImage(tex, cx - R * 1.55, cy - R, R * 3.1, R * 2);
      var g = x.createLinearGradient(cx - R, 0, cx + R, 0);
      var k = ph.frac;
      var edge = Math.max(.02, Math.min(.98, k < .5 ? 1 - k * 2 : (k - .5) * 2));
      g.addColorStop(0, k < .5 ? 'rgba(2,4,9,.97)' : 'rgba(2,4,9,0)');
      g.addColorStop(edge, 'rgba(2,4,9,.5)');
      g.addColorStop(1, k < .5 ? 'rgba(2,4,9,0)' : 'rgba(2,4,9,.97)');
      x.fillStyle = g; x.fillRect(cx - R, cy - R, R * 2, R * 2);
      x.restore();
    }
    draw();
    window.addEventListener('resize', draw);
  }

  /* Fase aproximada, sólo para el fallback: días desde una luna nueva
     conocida sobre el mes sinódico. La escena real usa efemérides. */
  function fase(date) {
    var syn = 29.530588853;
    var known = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
    var age = (((date.getTime() / 86400000 - known) % syn) + syn) % syn;
    var frac = age / syn;
    var illum = (1 - Math.cos(frac * Math.PI * 2)) / 2;
    var names = ['Luna nueva','Creciente','Cuarto creciente','Gibosa creciente',
                 'Luna llena','Gibosa menguante','Cuarto menguante','Menguante'];
    return { frac: frac, illum: illum, age: age, name: names[Math.floor(((frac + 1 / 16) % 1) * 8)] };
  }

  /* ————————————————— planeta (escena alternativa) ————————————————— */
  function planeta(host) {
    host.innerHTML = '<canvas class="pausa__moon2d" data-p></canvas>';
    var canvas = SL.$('[data-p]', host);
    var x = canvas.getContext('2d');
    var tex = texturaPlaneta();
    var rot = 0, last = performance.now();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function frame(now) {
      var dt = Math.min(64, now - last); last = now;
      if (!reduce) rot = (rot + dt * 0.0018) % tex.width;

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(r.width * dpr)) {
        canvas.width = Math.max(1, r.width * dpr);
        canvas.height = Math.max(1, r.height * dpr);
      }
      var W = canvas.width, H = canvas.height;
      var R = Math.min(W, H) * 0.3, cx = W / 2, cy = H * 0.36;
      x.clearRect(0, 0, W, H);

      x.save();
      x.beginPath(); x.arc(cx, cy, R, 0, 6.3); x.clip();
      // La textura se desplaza para simular la rotación del planeta.
      x.drawImage(tex, -rot, 0, tex.width, tex.height, cx - R, cy - R, R * 2, R * 2);
      x.drawImage(tex, tex.width - rot, 0, tex.width, tex.height, cx - R, cy - R, R * 2, R * 2);
      // Sombreado esférico
      var g = x.createRadialGradient(cx - R * .35, cy - R * .35, R * .1, cx, cy, R * 1.05);
      g.addColorStop(0, 'rgba(255,240,210,.16)');
      g.addColorStop(.55, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.85)');
      x.fillStyle = g; x.fillRect(cx - R, cy - R, R * 2, R * 2);
      x.restore();

      // Anillos
      x.save();
      x.translate(cx, cy); x.scale(1, .26); x.rotate(-.18);
      [1.9, 1.68, 1.44].forEach(function (k, i) {
        x.beginPath(); x.arc(0, 0, R * k, 0, 6.3);
        x.strokeStyle = 'rgba(226,206,168,' + (.34 - i * .07) + ')';
        x.lineWidth = R * (.15 - i * .03);
        x.stroke();
      });
      x.restore();

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ————————————————— texturas de respaldo ————————————————— */
  function texturaLunar() {
    var W = 1024, H = 512;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var x = c.getContext('2d');
    var seed = 4242;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

    x.fillStyle = '#b9b4aa'; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 16; i++) {
      var mx = rnd() * W, my = H * .2 + rnd() * H * .6, mr = 40 + rnd() * 110;
      var g = x.createRadialGradient(mx, my, 0, mx, my, mr);
      g.addColorStop(0, 'rgba(96,93,88,.72)');
      g.addColorStop(.7, 'rgba(112,108,102,.42)');
      g.addColorStop(1, 'rgba(120,116,110,0)');
      x.fillStyle = g;
      x.beginPath(); x.ellipse(mx, my, mr, mr * (.6 + rnd() * .5), rnd() * 3, 0, 6.3); x.fill();
    }
    for (var k = 0; k < 420; k++) {
      var cx = rnd() * W, cy = rnd() * H, r = 2 + Math.pow(rnd(), 3.1) * 40;
      var gg = x.createRadialGradient(cx, cy, r * .1, cx, cy, r);
      gg.addColorStop(0, 'rgba(78,75,70,.55)');
      gg.addColorStop(.62, 'rgba(108,104,98,.34)');
      gg.addColorStop(.85, 'rgba(214,209,199,.5)');
      gg.addColorStop(1, 'rgba(190,185,176,0)');
      x.fillStyle = gg;
      x.beginPath(); x.arc(cx, cy, r, 0, 6.3); x.fill();
    }
    return c;
  }

  function texturaPlaneta() {
    var W = 512, H = 512;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var x = c.getContext('2d');
    var seed = 99;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    for (var y = 0; y < H; y++) {
      var band = Math.sin(y / H * Math.PI * 9) * .5 + .5;
      var wob = Math.sin(y / H * Math.PI * 23 + 1.4) * .12;
      var l = 152 + band * 60 + wob * 58;
      x.fillStyle = 'rgb(' + Math.round(l) + ',' + Math.round(l * .84) + ',' + Math.round(l * .62) + ')';
      x.fillRect(0, y, W, 1);
    }
    for (var q = 0; q < 70; q++) {
      x.globalAlpha = .15;
      x.fillStyle = rnd() > .5 ? '#e6d3b0' : '#8a6a48';
      x.beginPath();
      x.ellipse(rnd() * W, rnd() * H, 8 + rnd() * 40, (8 + rnd() * 40) * .4, 0, 0, 6.3);
      x.fill();
    }
    x.globalAlpha = 1;
    return c;
  }

  /* ————————————————— cielo estrellado ————————————————— */
  function campoEstrellas(canvas, n) {
    if (!canvas) return;
    var x = canvas.getContext('2d');
    var stars = [], seed = 7;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

    function build() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, r.width * dpr);
      canvas.height = Math.max(1, r.height * dpr);
      stars = [];
      for (var i = 0; i < n; i++) {
        stars.push({
          x: rnd() * canvas.width, y: rnd() * canvas.height,
          r: (rnd() * 1.25 + .25) * dpr, a: rnd() * .7 + .15,
          sp: rnd() * .9 + .25, ph: rnd() * 6.3
        });
      }
    }
    build();
    window.addEventListener('resize', build);

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t0 = performance.now();
    (function loop(now) {
      var t = (now - t0) / 1000;
      x.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        x.globalAlpha = reduce ? st.a : st.a * (.62 + .38 * Math.sin(t * st.sp + st.ph));
        x.fillStyle = '#dfe8f2';
        x.beginPath(); x.arc(st.x, st.y, st.r, 0, 6.3); x.fill();
      }
      x.globalAlpha = 1;
      requestAnimationFrame(loop);
    })(performance.now());
  }

  /* ————————————————— ubicación ————————————————— */
  function ubicacion(cb) {
    var done = false;
    function fin(loc) { if (!done) { done = true; cb(loc); } }

    if (!navigator.geolocation) return fin(FALLBACK);
    // Si el permiso tarda, la escena no espera: arranca con el respaldo.
    var t = setTimeout(function () { fin(FALLBACK); }, 6000);
    navigator.geolocation.getCurrentPosition(function (pos) {
      clearTimeout(t);
      fin({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'Tu ubicación', real: true });
    }, function () {
      clearTimeout(t);
      fin(FALLBACK);
    }, { timeout: 5500, maximumAge: 900000 });
  }

  /* ————————————————— clima —————————————————
     Open-Meteo, sin clave ni costo. Sin señal, la escena sigue igual:
     sólo desaparece el bloque de clima. */
  function clima(host) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function (pos) {
      var url = 'https://api.open-meteo.com/v1/forecast' +
        '?latitude=' + pos.coords.latitude.toFixed(3) +
        '&longitude=' + pos.coords.longitude.toFixed(3) +
        '&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto';
      fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        var c = j.current || {};
        var lugar = SL.$('[data-lugar]');
        if (lugar && j.timezone) lugar.textContent = j.timezone.split('/').pop().replace(/_/g, ' ');
        host.innerHTML =
          bloque(Math.round(c.temperature_2m) + '°', 'AHORA') +
          bloque(Math.round(c.relative_humidity_2m) + '%', 'HUMEDAD') +
          bloque(wmo(c.weather_code), 'CIELO');
      }).catch(function () {});
    }, function () {}, { timeout: 8000, maximumAge: 900000 });
  }

  function bloque(v, l) {
    return '<div class="pausa__dato"><div class="pausa__dato-v">' + esc(v) + '</div>' +
           '<div class="pausa__dato-l">' + esc(l) + '</div></div>';
  }

  function wmo(c) {
    return ({
      0: 'Despejado', 1: 'Casi despejado', 2: 'Parcial', 3: 'Nublado',
      45: 'Niebla', 48: 'Niebla', 51: 'Llovizna', 53: 'Llovizna', 55: 'Llovizna',
      61: 'Lluvia', 63: 'Lluvia', 65: 'Lluvia fuerte',
      71: 'Nieve', 73: 'Nieve', 75: 'Nieve fuerte',
      80: 'Chaparrones', 81: 'Chaparrones', 82: 'Chaparrones',
      95: 'Tormenta', 96: 'Tormenta', 99: 'Tormenta'
    })[c] || '—';
  }

})(window.SL = window.SL || {});
