/* ============================================================
   StarkLab Web · Configuración
   Todo lo ajustable, en un solo lugar.
   ============================================================ */
(function (SL) {
  'use strict';

  var esc = SL.esc, D = SL.date;

  SL.views = SL.views || {};
  SL.views.config = function (root, s) {
    var st = s.settings;

    root.innerHTML =
      '<div class="page-head"><div>' +
        '<h1 class="page-head__t">Configuración</h1>' +
        '<p class="page-head__s">Apariencia, notificaciones, finanzas y tus datos</p>' +
      '</div></div>' +

      seccion('Apariencia', 'Tema, color de acento y escena del Modo Pausa',
        fila('Tema', 'Oscuro por defecto, para que los colores de los datos resalten',
          '<div class="seg" data-tema>' +
            [['dark','Oscuro'],['light','Claro'],['auto','Sistema']].map(function (o) {
              return '<button class="seg__b' + (st.theme === o[0] ? ' is-on' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>';
            }).join('') + '</div>') +
        fila('Color de acento', 'Sólo afecta a la marca, los botones y el foco — nunca al color de los datos',
          '<div style="display:flex;gap:8px" data-acento>' +
            [['rojo','#FF3B3B'],['cian','#4BD0FF'],['verde','#3DDC84'],['violeta','#C98BFF'],['ambar','#FFB84B']]
              .map(function (o) {
                return '<button data-v="' + o[0] + '" aria-label="' + o[0] + '" style="width:28px;height:28px;border-radius:9px;' +
                  'background:' + o[1] + ';border:2px solid ' + (st.accent === o[0] ? 'var(--text)' : 'transparent') + '"></button>';
              }).join('') + '</div>') +
        fila('Escena del Modo Pausa', 'Qué se ve mientras el teléfono está apoyado cargando',
          '<div class="seg" data-escena>' +
            [['luna','Luna'],['planeta','Planeta'],['estrellas','Estrellas']].map(function (o) {
              return '<button class="seg__b' + (st.pauseScene === o[0] ? ' is-on' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>';
            }).join('') + '</div>')
      ) +

      seccion('Notificaciones', 'Cada tipo por separado, con su horario',
        '<div id="notif-estado"></div>' +
        filaSwitch('Hábitos pendientes', 'Aviso si al final del día te queda algo sin marcar', 'habits',
          '<input class="input" type="time" data-time="habitsAt" value="' + esc(st.notif.habitsAt) + '" style="width:112px">') +
        filaSwitch('Presupuestos', 'Aviso al llegar al 85% del tope de una categoría', 'budget', '') +
        filaSwitch('Diario', 'Recordatorio para escribir a la noche', 'journal',
          '<input class="input" type="time" data-time="journalAt" value="' + esc(st.notif.journalAt) + '" style="width:112px">') +
        filaSwitch('Resumen semanal', 'Los domingos, cómo te fue en la semana', 'weekly', '')
      ) +

      seccion('Hábitos', 'Alta, baja, orden y frecuencia',
        fila('Hábitos activos', SL.compute.activeHabits(s).length + ' en la grilla',
          '<button class="btn btn--sm" data-ir="habitos">Administrar</button>') +
        fila('Archivados', s.habits.filter(function (h) { return h.archived; }).length + ' guardados con su historial',
          '<button class="btn btn--sm" data-ir="habitos">Ver</button>')
      ) +

      seccion('Finanzas', 'Moneda, categorías y presupuestos',
        fila('Moneda', 'Se aplica a toda la app',
          '<select class="select" data-moneda style="width:auto">' +
            ['USD','ARS','EUR','BRL','GBP'].map(function (c) {
              return '<option' + (c === st.currency ? ' selected' : '') + '>' + c + '</option>';
            }).join('') + '</select>') +
        '<div style="padding:var(--s4) 0 0"><div class="field__l" style="margin-bottom:10px">Presupuestos por categoría</div>' +
        '<div style="display:grid;gap:8px" data-cats>' +
          s.cats.filter(function (c) { return c.name !== 'Ingresos'; }).map(function (c) {
            return '<div style="display:flex;align-items:center;gap:10px;--cc:var(--c-' + c.color + ')">' +
              '<span class="dot-c"></span>' +
              '<span style="font-size:var(--fs-sm);flex:1">' + esc(c.name) + '</span>' +
              '<input class="input" type="number" min="0" data-budget="' + c.id + '" value="' + (c.budget || 0) +
                '" style="width:120px;text-align:right">' +
            '</div>';
          }).join('') + '</div></div>'
      ) +

      seccion('Idioma', 'Español, Portugués e Inglés',
        fila('Idioma de la app', 'Cambia los textos de toda la interfaz',
          '<div class="seg" data-idioma>' +
            [['es','Español'],['pt','Português'],['en','English']].map(function (o) {
              return '<button class="seg__b' + (st.lang === o[0] ? ' is-on' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>';
            }).join('') + '</div>')
      ) +

      seccion('Instalación', 'Cómo tener StarkLab como app',
        '<div id="pwa-estado"></div>'
      ) +

      seccion('Privacidad y datos', 'Tus datos son tuyos y viven en este dispositivo',
        fila('Exportar todo', 'Descarga un JSON con hábitos, plata, entrenamientos y diario',
          '<button class="btn btn--sm" data-export>' + SL.icon('bajar') + 'Exportar</button>') +
        fila('Importar', 'Restaurar desde un archivo exportado antes',
          '<button class="btn btn--sm" data-import>' + SL.icon('subir') + 'Importar</button>') +
        fila('Datos de ejemplo', 'Volver a cargar el mes de demostración, pisando lo que haya',
          '<button class="btn btn--sm" data-demo>Recargar demo</button>') +
        fila('Borrar todo', 'Elimina cada dato de este dispositivo. No se puede deshacer.',
          '<button class="btn btn--sm btn--danger" data-wipe>' + SL.icon('tacho') + 'Borrar</button>')
      );

    /* — estado de notificaciones — */
    pintarNotif();
    function pintarNotif() {
      var e = SL.notify.estado();
      var host = SL.$('#notif-estado', root);
      if (!host) return;
      host.innerHTML =
        '<div style="display:flex;gap:11px;align-items:flex-start;padding:var(--s3) var(--s4);border-radius:var(--r);' +
          'background:var(--card-2);border:1px solid ' + (e.ok ? 'color-mix(in oklab,var(--ok) 35%,transparent)' : 'var(--border)') +
          ';margin-bottom:var(--s4)">' +
          '<span style="width:8px;height:8px;border-radius:50%;margin-top:6px;flex:none;background:' +
            (e.ok ? 'var(--ok)' : e.ios ? 'var(--warn)' : 'var(--text-3)') + '"></span>' +
          '<div style="flex:1"><div style="font-size:var(--fs-sm);line-height:1.55">' + esc(e.txt) + '</div></div>' +
          (e.ask ? '<button class="btn btn--sm btn--primary" data-permiso>Activar</button>' : '') +
        '</div>';
      var p = SL.$('[data-permiso]', host);
      if (p) p.addEventListener('click', function () { SL.notify.ask().then(pintarNotif); });
    }

    /* — estado de instalación — */
    var pwaHost = SL.$('#pwa-estado', root);
    var inst = SL.notify.standalone();
    pwaHost.innerHTML =
      '<div style="font-size:var(--fs-sm);color:var(--text-2);line-height:1.65">' +
      (inst
        ? '✅ Ya está instalada: estás usando StarkLab como app, en pantalla completa y con soporte offline.'
        : SL.notify.isIOS()
          ? 'En iPhone: tocá <b>Compartir</b> y después <b>“Agregar a pantalla de inicio”</b>. Es el único camino en iOS, y también el único que habilita las notificaciones.'
          : 'En el menú del navegador vas a ver <b>“Instalar app”</b> o <b>“Agregar a pantalla de inicio”</b>. Queda con ícono propio, abre sin barra del navegador y funciona sin señal.') +
      '</div>' +
      (SL.deferredPrompt && !inst ? '<button class="btn btn--primary" data-instalar style="margin-top:var(--s3)">Instalar ahora</button>' : '');
    var ib = SL.$('[data-instalar]', pwaHost);
    if (ib) ib.addEventListener('click', function () {
      SL.deferredPrompt.prompt();
      SL.deferredPrompt.userChoice.then(function () { SL.deferredPrompt = null; SL.render(); });
    });

    /* — acciones — */
    seg('[data-tema]', function (v) {
      SL.store.update(function (x) { x.settings.theme = v; });
      SL.applyTheme();
    });
    seg('[data-acento]', function (v, b) {
      SL.store.update(function (x) { x.settings.accent = v; });
      SL.applyTheme();
      SL.$$('[data-acento] [data-v]', root).forEach(function (n) {
        n.style.borderColor = n === b ? 'var(--text)' : 'transparent';
      });
    });
    seg('[data-escena]', function (v) { SL.store.update(function (x) { x.settings.pauseScene = v; }); });
    seg('[data-idioma]', function (v) {
      SL.store.update(function (x) { x.settings.lang = v; });
      SL.toast(v === 'es' ? 'Idioma: Español' : v === 'pt' ? 'Idioma: Português' : 'Language: English');
    });

    function seg(sel, fn) {
      var host = SL.$(sel, root);
      if (!host) return;
      host.addEventListener('click', function (e) {
        var b = e.target.closest('[data-v]'); if (!b) return;
        SL.$$('[data-v]', host).forEach(function (x) { x.classList.toggle('is-on', x === b); });
        fn(b.dataset.v, b);
      });
    }

    SL.$$('[data-sw]', root).forEach(function (holder) {
      var key = holder.dataset.sw;
      var sw = SL.switchEl(st.notif[key], function (v) {
        SL.store.update(function (x) { x.settings.notif[key] = v; });
        SL.notify.schedule();
        if (v && !SL.notify.granted()) SL.notify.ask().then(pintarNotif);
      });
      holder.appendChild(sw);
    });

    SL.$$('[data-time]', root).forEach(function (i) {
      i.addEventListener('change', function () {
        SL.store.update(function (x) { x.settings.notif[i.dataset.time] = i.value; });
        SL.notify.schedule();
        SL.toast('Horario actualizado');
      });
    });

    SL.$('[data-moneda]', root).addEventListener('change', function (e) {
      SL.store.update(function (x) { x.settings.currency = e.target.value; });
    });

    SL.$$('[data-budget]', root).forEach(function (i) {
      i.addEventListener('change', function () {
        SL.store.update(function (x) {
          var c = x.cats.filter(function (y) { return y.id === i.dataset.budget; })[0];
          if (c) c.budget = Math.max(0, +i.value || 0);
        });
        SL.notify.checkBudget();
      });
    });

    SL.$$('[data-ir]', root).forEach(function (b) {
      b.addEventListener('click', function () { SL.go(b.dataset.ir); });
    });

    SL.$('[data-export]', root).addEventListener('click', function () {
      var blob = new Blob([SL.store.export()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'starklab-' + D.iso(D.today()) + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      SL.toast('Datos exportados');
    });

    SL.$('[data-import]', root).addEventListener('click', function () {
      var i = document.createElement('input');
      i.type = 'file'; i.accept = 'application/json,.json';
      i.onchange = function () {
        var f = i.files[0]; if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try { SL.store.import(fr.result); SL.toast('Datos importados'); SL.render(); }
          catch (e) { SL.toast('El archivo no es un backup válido', 'err'); }
        };
        fr.readAsText(f);
      };
      i.click();
    });

    SL.$('[data-demo]', root).addEventListener('click', function () {
      SL.confirm('Recargar datos de ejemplo',
        'Se van a pisar todos tus datos actuales con el mes de demostración. Esto no se puede deshacer.',
        'Sí, recargar').then(function (ok) {
        if (!ok) return;
        SL.store.reset(); SL.toast('Datos de ejemplo recargados'); SL.render();
      });
    });

    SL.$('[data-wipe]', root).addEventListener('click', function () {
      SL.confirm('Borrar todo',
        'Se eliminan hábitos, transacciones, entrenamientos y diario de este dispositivo. No hay vuelta atrás.',
        'Sí, borrar todo').then(function (ok) {
        if (!ok) return;
        SL.store.wipe(); SL.toast('Todo borrado'); SL.go('inicio');
      });
    });
  };

  function seccion(titulo, sub, contenido) {
    return '<div class="card">' +
      '<div class="card__head" style="margin-bottom:var(--s3)"><div>' +
        '<div class="card__title">' + esc(titulo) + '</div>' +
        '<div class="card__sub">' + esc(sub) + '</div>' +
      '</div></div>' + contenido + '</div>';
  }

  function fila(t, s, control) {
    return '<div style="display:flex;gap:var(--s4);align-items:center;padding:var(--s3) 0;' +
      'border-top:1px solid var(--border-soft)">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:var(--fs-sm);font-weight:600">' + esc(t) + '</div>' +
        '<div class="card__sub" style="margin-top:2px">' + esc(s) + '</div>' +
      '</div>' + control + '</div>';
  }

  function filaSwitch(t, s, key, extra) {
    return '<div style="display:flex;gap:var(--s4);align-items:center;padding:var(--s3) 0;' +
      'border-top:1px solid var(--border-soft)">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:var(--fs-sm);font-weight:600">' + esc(t) + '</div>' +
        '<div class="card__sub" style="margin-top:2px">' + esc(s) + '</div>' +
      '</div>' + extra + '<span data-sw="' + key + '"></span></div>';
  }

})(window.SL = window.SL || {});
