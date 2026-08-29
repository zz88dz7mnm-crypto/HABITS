/* ============================================================
   Zenit · Armado de la app
   Shell, ruteo y arranque.
   ============================================================ */
(function (SL) {
  'use strict';

  var esc = SL.esc;

  var NAV = [
    { g: 'Día a día' },
    { id: 'inicio',        t: 'Inicio',        i: 'inicio' },
    { id: 'tareas',        t: 'Tareas',        i: 'tareas' },
    { id: 'habitos',       t: 'Hábitos',       i: 'habitos' },
    { id: 'finanzas',      t: 'Finanzas',      i: 'finanzas' },
    { id: 'agenda',        t: 'Agenda',        i: 'agenda' },
    { id: 'entrenamiento', t: 'Entrenamiento', i: 'entreno' },
    { id: 'enfoque',       t: 'Enfoque',       i: 'enfoque' },
    { id: 'journaling',    t: 'Journaling',    i: 'diario' },
    { g: 'Vos' },
    { id: 'progreso',      t: 'Progreso',      i: 'progreso' },
    { id: 'config',        t: 'Configuración', i: 'config' }
  ];

  // Lo que va en la barra de abajo en el teléfono: lo que se usa todos los días.
  var TABS = ['inicio', 'habitos', 'finanzas', 'entrenamiento', 'journaling'];

  var current = 'inicio';
  var prevView = null;

  /* La marca: el punto del cenit y el pico al que se llega. */
  var LOGO = '<svg viewBox="0 0 512 512" aria-hidden="true">' +
    '<defs><linearGradient id="zng" x1="0" y1="1" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#FF3B3B"/><stop offset="1" stop-color="#FF9D4B"/></linearGradient></defs>' +
    '<circle cx="256" cy="118" r="29" fill="url(#zng)"/>' +
    '<path d="M256 176 L420 394 L344 394 L256 277 L168 394 L92 394 Z" fill="url(#zng)"/></svg>';

  /* ————————————————— tema ————————————————— */
  SL.applyTheme = function () {
    var s = SL.store.get();
    var t = s.settings.theme;
    if (t === 'auto') t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-accent', s.settings.accent || 'rojo');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#F4F5F7' : '#0A0A0D');
    // Los gráficos leen variables CSS: al cambiar el tema hay que redibujarlos.
    setTimeout(function () { SL.redrawCharts(); }, 30);
  };

  /* ————————————————— shell ————————————————— */
  function shell() {
    var app = document.getElementById('app');
    app.innerHTML =
      '<div class="scrim" data-scrim></div>' +
      '<div class="shell">' +
        '<aside class="side" data-side>' +
          '<div class="side__brand">' + LOGO + '<span>Zenit</span></div>' +
          '<nav class="nav" data-nav>' +
            NAV.map(function (n) {
              if (n.g) return '<div class="side__group"><div class="u-eyebrow side__label">' + esc(n.g) + '</div></div>';
              return '<button class="nav__item" data-r="' + n.id + '">' + SL.icon(n.i) +
                '<span>' + esc(n.t) + '</span><span class="nav__badge" data-badge="' + n.id + '" hidden></span></button>';
            }).join('') +
          '</nav>' +
          '<div style="margin-top:auto;padding-top:var(--s5)">' +
            '<button class="nav__item" data-r="pausa">' + SL.icon('pausa') + '<span>Modo Pausa</span></button>' +
          '</div>' +
        '</aside>' +

        '<div class="main">' +
          '<header class="top">' +
            '<button class="icon-btn" data-menu aria-label="Abrir menú" style="display:none">' + SL.icon('menu') + '</button>' +
            '<div class="top__crumb">Zenit / <b data-crumb>Inicio</b></div>' +
            '<div class="top__spacer"></div>' +
            '<button class="icon-btn" data-tema-rapido aria-label="Cambiar tema">' + SL.icon('sol') + '</button>' +
            '<button class="icon-btn" data-r="pausa" aria-label="Modo Pausa">' + SL.icon('pausa') + '</button>' +
            '<button class="icon-btn" data-r="config" aria-label="Configuración">' + SL.icon('config') + '</button>' +
          '</header>' +
          '<main class="view" data-view id="vista" tabindex="-1"></main>' +
        '</div>' +
      '</div>' +

      '<nav class="tabbar" data-tabs>' +
        TABS.map(function (id) {
          var n = NAV.filter(function (x) { return x.id === id; })[0];
          return '<button class="tabbar__b" data-r="' + id + '">' + SL.icon(n.i) +
            '<span>' + esc(n.t) + '</span></button>';
        }).join('') +
      '</nav>';

    // El botón de menú sólo tiene sentido cuando la barra lateral se esconde.
    var mq = window.matchMedia('(max-width: 900px)');
    function syncMenu() {
      SL.$('[data-menu]').style.display = mq.matches ? 'grid' : 'none';
      if (!mq.matches) closeSide();
    }
    syncMenu();
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(syncMenu);

    app.addEventListener('click', function (e) {
      var r = e.target.closest('[data-r]');
      if (r) { SL.go(r.dataset.r); closeSide(); return; }
      if (e.target.closest('[data-menu]')) return openSide();
      if (e.target.closest('[data-scrim]')) return closeSide();
      if (e.target.closest('[data-tema-rapido]')) {
        var s = SL.store.get();
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        SL.store.update(function (x) { x.settings.theme = next; });
        SL.applyTheme();
      }
    });
  }

  function openSide()  { SL.$('[data-side]').classList.add('is-open'); SL.$('[data-scrim]').classList.add('is-on'); }
  function closeSide() {
    var s = SL.$('[data-side]'), c = SL.$('[data-scrim]');
    if (s) s.classList.remove('is-open');
    if (c) c.classList.remove('is-on');
  }

  /* ————————————————— ruteo ————————————————— */
  SL.go = function (id) {
    if (!SL.views[id]) id = 'inicio';
    if (current === id) { SL.render(); return; }
    // Modo Pausa apaga su render loop al salir.
    if (current === 'pausa' && SL.views.pausa.leave) SL.views.pausa.leave();
    current = id;
    if (location.hash.slice(1) !== id) location.hash = id;
    SL.render();
    var v = SL.$('[data-view]');
    if (v) v.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    // El micrófono flotante no tiene sentido dentro de la escena inmersiva
    // del Modo Pausa: se esconde ahí y reaparece en todo lo demás.
    if (SL.voiceFAB) SL.voiceFAB.ocultar(id === 'pausa');
  };

  SL.render = function () {
    var s = SL.store.get();
    var host = SL.$('[data-view]');
    if (!host) return;

    SL.hideTip();
    host.innerHTML = '';
    var inner = document.createElement('div');
    inner.className = current === prevView ? '' : 'view-enter';
    host.appendChild(inner);
    prevView = current;

    try {
      SL.views[current](inner, s);
    } catch (err) {
      console.error('Error al dibujar la vista "' + current + '":', err);
      inner.innerHTML = '<div class="empty"><div class="empty__i">⚠️</div>' +
        '<div class="empty__t">Algo se rompió en esta pantalla</div>' +
        '<div class="empty__s">' + esc(err.message) + '</div></div>';
    }

    // Estado activo de la navegación
    SL.$$('[data-r]').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.r === current);
    });
    var nav = NAV.filter(function (n) { return n.id === current; })[0];
    var crumb = SL.$('[data-crumb]');
    if (crumb) crumb.textContent = nav ? nav.t : 'Modo Pausa';
    document.title = (nav ? nav.t + ' · ' : '') + 'Zenit';

    badges(s);
  };

  /* Contadores en la navegación: sólo cuando hay algo que hacer.
     Se expone porque las vistas que actualizan a mano necesitan refrescarlo
     sin disparar un redibujado entero. */
  SL.badges = badges;
  function badges(s) {
    var t = SL.date.today(), key = SL.date.iso(t);
    var due = SL.compute.activeHabits(s).filter(function (h) { return SL.compute.due(h, t); });
    var falta = due.filter(function (h) { return !SL.compute.isDone(s, h.id, key); }).length;
    var pend = s.tasks.filter(function (k) { return !k.done; }).length;
    set('habitos', falta);
    set('tareas', pend);
    function set(id, n) {
      var b = SL.$('[data-badge="' + id + '"]');
      if (!b) return;
      b.hidden = !n;
      b.textContent = n;
    }
  }

  /* ————————————————— arranque ————————————————— */
  function boot() {
    SL.store.init();
    SL.applyTheme();
    shell();

    // Ruta inicial: hash, o el atajo del ícono (?a=gasto|habitos|pausa|diario).
    var params = new URLSearchParams(location.search);
    var atajo = params.get('a');
    var hash = location.hash.slice(1);
    var start = hash || ({ gasto: 'finanzas', habitos: 'habitos', pausa: 'pausa', diario: 'journaling' })[atajo] || 'inicio';
    current = SL.views[start] ? start : 'inicio';
    SL.render();

    if (atajo === 'gasto') {
      setTimeout(function () { var b = SL.$('[data-nueva]'); if (b) b.click(); }, 220);
    }

    window.addEventListener('hashchange', function () {
      var h = location.hash.slice(1);
      if (h && h !== current) SL.go(h);
    });

    // El tema "sistema" tiene que seguir al sistema en vivo.
    var mqDark = window.matchMedia('(prefers-color-scheme: dark)');
    (mqDark.addEventListener ? mqDark.addEventListener.bind(mqDark, 'change') : mqDark.addListener.bind(mqDark))(function () {
      if (SL.store.get().settings.theme === 'auto') SL.applyTheme();
    });

    // Cambios de datos → repintar la vista actual.
    var pintando = false;
    SL.store.on(function () {
      if (pintando) return;
      pintando = true;
      requestAnimationFrame(function () { pintando = false; SL.render(); });
    });

    // Atajos de teclado
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      var map = { '1': 'inicio', '2': 'habitos', '3': 'finanzas', '4': 'entrenamiento',
                  '5': 'journaling', '6': 'progreso', 'p': 'pausa', 'c': 'config' };
      if (map[e.key]) { e.preventDefault(); SL.go(map[e.key]); }
    });

    SL.notify.schedule();
    SL.notify.checkBudget();

    // El micrófono de carga rápida: siempre a mano, salvo en Modo Pausa.
    if (SL.voiceFAB) {
      SL.voiceFAB.montar();
      SL.voiceFAB.ocultar(current === 'pausa');
    }

    // Guardar la propuesta de instalación para ofrecerla desde Configuración.
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      SL.deferredPrompt = e;
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
      /* Cuando el service worker activa una versión nueva avisa, y recién
         ahí se ofrece recargar. Recargar solo, sin preguntar, tiraría a la
         basura lo que la persona estuviera escribiendo. */
      navigator.serviceWorker.addEventListener('message', function (e) {
        if (!e.data || e.data.type !== 'version-nueva') return;
        if (window.__zenitArrancoLimpio) return;   // no avisar en la primera carga
        SL.toast('Hay una versión nueva. Tocá acá para actualizar.');
        var t = document.querySelector('.toast:last-child');
        if (t) {
          t.style.cursor = 'pointer';
          t.addEventListener('click', function () { location.reload(); });
        }
      });
      // La primera instalación también dispara el aviso, y ahí no aplica.
      window.__zenitArrancoLimpio = !navigator.serviceWorker.controller;
      setTimeout(function () { window.__zenitArrancoLimpio = false; }, 4000);
    }

    /* Teléfono apoyado de costado: se ofrece el Modo Pausa en vez de
       entrar solo, que sería invasivo. La API de batería está limitada en
       varios navegadores, así que la orientación alcanza como señal. */
    var ofrecido = false;
    function checkLandscape() {
      if (ofrecido || current === 'pausa') return;
      var land = window.innerWidth > window.innerHeight;
      var chico = Math.min(window.innerWidth, window.innerHeight) < 520;
      if (land && chico) {
        ofrecido = true;
        SL.toast('¿Pasamos a Modo Pausa? Tocá acá 🌙');
        var last = document.querySelector('.toast:last-child');
        if (last) {
          last.style.cursor = 'pointer';
          last.addEventListener('click', function () { SL.go('pausa'); });
        }
      }
    }
    window.addEventListener('orientationchange', function () { setTimeout(checkLandscape, 320); });

    // Primera vez: se explica el límite real de iOS antes de que se note solo.
    if (!SL.store.get().settings.onboarded) {
      setTimeout(onboarding, 700);
    }
  }

  function onboarding() {
    var e = SL.notify.estado();
    SL.modal({
      title: 'Bienvenido a Zenit',
      body: '<div style="display:grid;gap:var(--s4);font-size:var(--fs-sm);line-height:1.65;color:var(--text-2)">' +
        '<p>Todo lo que cargues vive <b style="color:var(--text)">en este dispositivo</b>. No hay cuenta, no hay servidor, ' +
        'y funciona sin señal. Podés exportarlo o borrarlo entero cuando quieras.</p>' +
        '<p>Arrancás con un mes de datos de ejemplo para que los gráficos tengan algo que mostrar. ' +
        'Se reemplaza solo en cuanto cargues lo tuyo, o lo borrás desde Configuración.</p>' +
        (e.ios
          ? '<p style="color:var(--warn)">📱 <b>En iPhone:</b> para que lleguen las notificaciones, la app tiene que ' +
            'estar agregada a la pantalla de inicio (Compartir → “Agregar a pantalla de inicio”). Como pestaña de Safari no llegan. ' +
            'Es un límite de iOS, no de la app.</p>'
          : '') +
      '</div>',
      okText: 'Empezar',
      cancelText: null,
      onOk: function () {
        SL.store.update(function (s) { s.settings.onboarded = true; });
        return true;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window.SL = window.SL || {});
