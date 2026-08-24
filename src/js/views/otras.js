/* ============================================================
   StarkLab Web · Metas, Tareas, Agenda, Enfoque y Logros
   ============================================================ */
(function (SL) {
  'use strict';

  var C = SL.compute, D = SL.date, esc = SL.esc;
  SL.views = SL.views || {};

  /* ————————————————— METAS ————————————————— */
  SL.views.metas = function (root, s) {
    root.innerHTML =
      '<div class="page-head"><div>' +
        '<h1 class="page-head__t">Metas</h1>' +
        '<p class="page-head__s">Lo grande, partido en números que se pueden mover.</p>' +
      '</div><div class="page-head__actions">' +
        '<button class="btn btn--primary" data-nueva>' + SL.icon('mas') + 'Nueva meta</button>' +
      '</div></div>' +
      '<div class="grid grid--2" data-lista></div>';

    var lista = SL.$('[data-lista]', root);
    lista.innerHTML = s.goals.length ? s.goals.map(function (g) {
      var p = Math.min(1, g.current / g.target);
      var due = D.parse(g.due);
      var left = Math.ceil((due - D.today()) / 86400000);
      return '<div class="card" style="--cc:var(--c-' + g.color + ')">' +
        '<div style="display:flex;gap:var(--s4);align-items:center">' +
          '<div data-ring="' + g.id + '" style="width:88px;height:88px;flex:none"></div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="card__title" style="margin-bottom:3px">' + esc(g.name) + '</div>' +
            '<div class="card__sub">' + fmtN(g.current) + ' de ' + fmtN(g.target) + ' ' + esc(g.metric) + '</div>' +
            '<div class="card__sub" style="margin-top:5px;color:' +
              (left < 0 ? 'var(--err)' : left < 14 ? 'var(--warn)' : 'var(--text-3)') + '">' +
              (left < 0 ? 'Venció hace ' + Math.abs(left) + ' días' : 'Quedan ' + left + ' días') + '</div>' +
            '<div style="display:flex;gap:6px;margin-top:10px">' +
              '<button class="btn btn--sm" data-add="' + g.id + '">+ Avance</button>' +
              '<button class="btn btn--sm btn--ghost" data-ed="' + g.id + '">Editar</button>' +
            '</div>' +
          '</div>' +
        '</div></div>';
    }).join('') : empty('🎯', 'Sin metas', 'Una meta es un número con fecha. Empezá por una.');

    s.goals.forEach(function (g) {
      var n = SL.$('[data-ring="' + g.id + '"]', root);
      if (n) SL.charts.ring(n, { value: Math.min(1, g.current / g.target), color: g.color, height: 88 });
    });

    lista.addEventListener('click', function (e) {
      var a = e.target.closest('[data-add]');
      if (a) return avance(a.dataset.add);
      var ed = e.target.closest('[data-ed]');
      if (ed) return metaModal(ed.dataset.ed);
    });
    SL.$('[data-nueva]', root).addEventListener('click', function () { metaModal(null); });
  };

  function fmtN(v) { return (Math.round(v * 100) / 100).toLocaleString('es-AR'); }

  function avance(id) {
    var g = SL.store.get().goals.filter(function (x) { return x.id === id; })[0];
    SL.modal({
      title: 'Avance en “' + g.name + '”',
      body: '<div class="field"><label class="field__l">Valor actual (' + esc(g.metric) + ')</label>' +
        '<input class="input" data-v type="number" step="any" value="' + g.current + '"></div>',
      onOk: function (b) {
        var v = parseFloat(SL.$('[data-v]', b).value);
        if (isNaN(v)) return false;
        SL.store.update(function (st) {
          var r = st.goals.filter(function (x) { return x.id === id; })[0];
          if (r) r.current = v;
        });
        SL.toast('Avance guardado');
        return true;
      }
    });
  }

  function metaModal(id) {
    var s = SL.store.get();
    var g = id ? s.goals.filter(function (x) { return x.id === id; })[0] : null;
    var color = g ? g.color : SL.PALETTE[s.goals.length % 8];
    var body = SL.h('<div style="display:grid;gap:var(--s4)">' +
      '<div class="field"><label class="field__l">Nombre</label>' +
        '<input class="input" data-n value="' + (g ? esc(g.name) : '') + '" placeholder="Ej: Correr 10 km"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--s3)">' +
        '<div class="field"><label class="field__l">Actual</label>' +
          '<input class="input" data-c type="number" step="any" value="' + (g ? g.current : 0) + '"></div>' +
        '<div class="field"><label class="field__l">Objetivo</label>' +
          '<input class="input" data-t type="number" step="any" value="' + (g ? g.target : 100) + '"></div>' +
        '<div class="field"><label class="field__l">Unidad</label>' +
          '<input class="input" data-u value="' + (g ? esc(g.metric) : '') + '" placeholder="km"></div>' +
      '</div>' +
      '<div class="field"><label class="field__l">Fecha límite</label>' +
        '<input class="input" data-d type="date" value="' + (g ? g.due : D.iso(D.addDays(D.today(), 90))) + '"></div>' +
      '<div class="field"><label class="field__l">Color</label>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap" data-colors>' +
          SL.PALETTE.map(function (c) {
            return '<button type="button" data-c2="' + c + '" style="width:30px;height:30px;border-radius:9px;' +
              'background:var(--c-' + c + ');border:2px solid ' + (c === color ? 'var(--text)' : 'transparent') + '"></button>';
          }).join('') + '</div></div>' +
      (g ? '<button class="btn btn--danger" data-del style="width:fit-content">Borrar meta</button>' : '') +
    '</div>');

    SL.$('[data-colors]', body).addEventListener('click', function (e) {
      var b = e.target.closest('[data-c2]'); if (!b) return;
      color = b.dataset.c2;
      SL.$$('[data-c2]', body).forEach(function (x) { x.style.borderColor = x === b ? 'var(--text)' : 'transparent'; });
    });
    if (g) SL.$('[data-del]', body).addEventListener('click', function () {
      SL.store.update(function (st) { st.goals = st.goals.filter(function (x) { return x.id !== id; }); });
      SL.toast('Meta borrada');
      var x = SL.$('.modal-bg [data-x]'); if (x) x.click();
    });

    SL.modal({
      title: g ? 'Editar meta' : 'Nueva meta', body: body, okText: g ? 'Guardar' : 'Crear',
      onOk: function (b) {
        var name = SL.$('[data-n]', b).value.trim();
        if (!name) { SL.toast('Poné un nombre', 'err'); return false; }
        var data = {
          name: name,
          current: parseFloat(SL.$('[data-c]', b).value) || 0,
          target: parseFloat(SL.$('[data-t]', b).value) || 1,
          metric: SL.$('[data-u]', b).value.trim() || 'unidades',
          due: SL.$('[data-d]', b).value, color: color
        };
        SL.store.update(function (st) {
          if (g) Object.assign(st.goals.filter(function (x) { return x.id === id; })[0], data);
          else st.goals.push(Object.assign({ id: SL.uid('g') }, data));
        });
        SL.toast(g ? 'Meta actualizada' : 'Meta creada');
        return true;
      }
    });
  }

  /* ————————————————— TAREAS ————————————————— */
  SL.views.tareas = function (root, s) {
    var pend = s.tasks.filter(function (k) { return !k.done; })
      .sort(function (a, b) { return b.prio - a.prio || (a.due < b.due ? -1 : 1); });
    var done = s.tasks.filter(function (k) { return k.done; });

    root.innerHTML =
      '<div class="page-head"><div>' +
        '<h1 class="page-head__t">Tareas</h1>' +
        '<p class="page-head__s">' + pend.length + ' pendientes · ' + done.length + ' cerradas</p>' +
      '</div></div>' +
      '<div class="card"><div style="display:flex;gap:var(--s2)">' +
        '<input class="input" data-nueva placeholder="¿Qué hay que hacer? Enter para agregar">' +
        '<button class="btn btn--primary" data-add>' + SL.icon('mas') + '</button>' +
      '</div></div>' +
      '<div class="card card--flush"><div class="rows" data-pend></div></div>' +
      (done.length ? '<div class="card card--flush"><div class="card__head" style="padding:var(--s4) var(--s5) 0;margin:0">' +
        '<div class="card__title" style="font-size:var(--fs-sm);color:var(--text-2)">Cerradas</div>' +
        '<div class="card__tools"><button class="btn btn--sm btn--ghost" data-limpiar>Limpiar</button></div></div>' +
        '<div class="rows" data-done></div></div>' : '');

    SL.$('[data-pend]', root).innerHTML = pend.length ? pend.map(taskRow).join('')
      : empty('✅', 'Todo cerrado', 'No queda nada pendiente. Buen momento para descansar.');
    var dh = SL.$('[data-done]', root);
    if (dh) dh.innerHTML = done.map(taskRow).join('');

    function add() {
      var i = SL.$('[data-nueva]', root);
      var v = i.value.trim(); if (!v) return;
      SL.store.update(function (st) {
        st.tasks.push({ id: SL.uid('k'), text: v, done: false, prio: 2, due: D.iso(D.today()) });
      });
      i.value = '';
    }
    SL.$('[data-add]', root).addEventListener('click', add);
    SL.$('[data-nueva]', root).addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });

    root.addEventListener('click', function (e) {
      var c = e.target.closest('[data-k]');
      if (c) {
        SL.store.update(function (st) {
          var k = st.tasks.filter(function (x) { return x.id === c.dataset.k; })[0];
          if (k) k.done = !k.done;
        });
        return;
      }
      var d = e.target.closest('[data-kdel]');
      if (d) {
        SL.store.update(function (st) { st.tasks = st.tasks.filter(function (x) { return x.id !== d.dataset.kdel; }); });
        return;
      }
      if (e.target.closest('[data-limpiar]')) {
        SL.store.update(function (st) { st.tasks = st.tasks.filter(function (x) { return !x.done; }); });
        SL.toast('Tareas cerradas eliminadas');
      }
    });
  };

  function taskRow(k) {
    var col = k.prio === 3 ? 'rojo' : k.prio === 2 ? 'ambar' : 'cian';
    return '<div class="row" style="--cc:var(--c-' + col + ')">' +
      '<button class="cell ' + (k.done ? 'is-on' : 'is-off') + '" data-k="' + k.id + '" ' +
        'style="width:20px;height:20px;flex:none" aria-label="Marcar"></button>' +
      '<div class="row__main"><div class="row__t"' +
        (k.done ? ' style="text-decoration:line-through;color:var(--text-3)"' : '') + '>' + esc(k.text) + '</div>' +
        '<div class="row__s">' + (k.prio === 3 ? 'Alta' : k.prio === 2 ? 'Media' : 'Baja') + ' · ' + esc(k.due) + '</div></div>' +
      '<button class="icon-btn row__x" data-kdel="' + k.id + '" aria-label="Borrar">' + SL.icon('tacho') + '</button>' +
    '</div>';
  }

  /* ————————————————— AGENDA ————————————————— */
  SL.views.agenda = function (root, s) {
    var t = D.today();
    var next14 = [];
    for (var i = 0; i < 14; i++) {
      var d = D.addDays(t, i), key = D.iso(d);
      var evs = s.events.filter(function (e) { return e.date === key; })
        .sort(function (a, b) { return a.time < b.time ? -1 : 1; });
      if (evs.length || i < 3) next14.push({ d: d, key: key, evs: evs });
    }

    root.innerHTML =
      '<div class="page-head"><div>' +
        '<h1 class="page-head__t">Agenda</h1>' +
        '<p class="page-head__s">Las próximas dos semanas</p>' +
      '</div><div class="page-head__actions">' +
        '<button class="btn btn--primary" data-nuevo>' + SL.icon('mas') + 'Nuevo evento</button>' +
      '</div></div>' +
      '<div style="display:grid;gap:var(--s3)">' +
        next14.map(function (g) {
          var esHoy = g.key === D.iso(t);
          return '<div class="card" style="padding:var(--s4) var(--s5)">' +
            '<div style="display:flex;align-items:center;gap:var(--s3);margin-bottom:' +
              (g.evs.length ? 'var(--s3)' : '0') + '">' +
              '<span style="font-size:var(--fs-sm);font-weight:700;color:' +
                (esHoy ? 'var(--accent)' : 'var(--text)') + '">' +
                (esHoy ? 'Hoy' : SL.DIAS[D.dow(g.d)]) + ' ' + g.d.getDate() + '</span>' +
              '<span class="card__sub">' + SL.MESES[g.d.getMonth()] + '</span>' +
              '<span style="flex:1;height:1px;background:var(--border-soft)"></span>' +
              '<span class="card__sub">' + (g.evs.length || 'libre') + (g.evs.length ? ' evento' + (g.evs.length > 1 ? 's' : '') : '') + '</span>' +
            '</div>' +
            (g.evs.length ? '<div style="display:grid;gap:9px">' + g.evs.map(function (e) {
              return '<div style="display:flex;gap:11px;align-items:center;--cc:var(--c-' + evColor(e.kind) + ')">' +
                '<span class="u-mono" style="font-size:var(--fs-xs);color:var(--text-2);font-weight:600;flex:0 0 42px">' +
                  esc(e.time) + '</span>' +
                '<span style="width:3px;height:24px;border-radius:2px;background:var(--cc)"></span>' +
                '<span style="font-size:var(--fs-sm);font-weight:550;flex:1">' + esc(e.title) + '</span>' +
                '<button class="icon-btn" data-edel="' + e.id + '" aria-label="Borrar">' + SL.icon('tacho') + '</button>' +
              '</div>';
            }).join('') + '</div>' : '') +
          '</div>';
        }).join('') +
      '</div>';

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-edel]'); if (!b) return;
      SL.store.update(function (st) { st.events = st.events.filter(function (x) { return x.id !== b.dataset.edel; }); });
    });
    SL.$('[data-nuevo]', root).addEventListener('click', function () {
      SL.modal({
        title: 'Nuevo evento',
        body: '<div style="display:grid;gap:var(--s4)">' +
          '<div class="field"><label class="field__l">Título</label><input class="input" data-t placeholder="Ej: Reunión con Richard"></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s3)">' +
            '<div class="field"><label class="field__l">Fecha</label><input class="input" data-d type="date" value="' + D.iso(t) + '"></div>' +
            '<div class="field"><label class="field__l">Hora</label><input class="input" data-h type="time" value="10:00"></div>' +
          '</div>' +
          '<div class="field"><label class="field__l">Tipo</label><select class="select" data-k>' +
            ['reunion','entreno','finanzas','estudio','salud'].map(function (k) {
              return '<option value="' + k + '">' + k.charAt(0).toUpperCase() + k.slice(1) + '</option>';
            }).join('') + '</select></div>' +
        '</div>',
        onOk: function (b) {
          var title = SL.$('[data-t]', b).value.trim();
          if (!title) return false;
          SL.store.update(function (st) {
            st.events.push({
              id: SL.uid('e'), date: SL.$('[data-d]', b).value, time: SL.$('[data-h]', b).value,
              title: title, kind: SL.$('[data-k]', b).value
            });
          });
          SL.toast('Evento agendado');
          return true;
        }
      });
    });
  };

  function evColor(k) {
    return { reunion: 'violeta', entreno: 'cian', finanzas: 'verde', estudio: 'ambar', salud: 'coral' }[k] || 'rosa';
  }

  /* ————————————————— ENFOQUE (pomodoro) ————————————————— */
  var focus = { left: 0, total: 0, on: false, timer: null };
  SL.views.enfoque = function (root, s) {
    var preset = s.focus.preset || 25;
    if (!focus.total) { focus.total = preset * 60; focus.left = focus.total; }

    var hoy = (s.focus.sessions || []).filter(function (x) { return x.date === D.iso(D.today()); });
    var mins = hoy.reduce(function (a, x) { return a + x.minutes; }, 0);

    root.innerHTML =
      '<div class="page-head"><div>' +
        '<h1 class="page-head__t">Enfoque</h1>' +
        '<p class="page-head__s">Bloques de trabajo sin interrupciones. Hoy llevás ' + mins + ' minutos.</p>' +
      '</div></div>' +
      '<div class="card" style="display:grid;place-items:center;gap:var(--s5);padding:var(--s8) var(--s5)">' +
        '<div data-ring style="width:min(260px,60vw);aspect-ratio:1"></div>' +
        '<div class="u-num" data-time style="font-size:clamp(2.2rem,7vw,3.4rem);font-weight:200;letter-spacing:-.03em;margin-top:-16px"></div>' +
        '<div class="seg" data-preset>' +
          [15, 25, 45, 60].map(function (p) {
            return '<button class="seg__b' + (p === preset ? ' is-on' : '') + '" data-p="' + p + '">' + p + ' min</button>';
          }).join('') + '</div>' +
        '<div style="display:flex;gap:var(--s3)">' +
          '<button class="btn btn--primary" data-toggle>' + SL.icon(focus.on ? 'pause2' : 'play') +
            (focus.on ? 'Pausar' : 'Empezar') + '</button>' +
          '<button class="btn" data-reset>' + SL.icon('reload') + 'Reiniciar</button>' +
        '</div>' +
      '</div>' +
      (hoy.length ? '<div class="card"><div class="card__head"><div><div class="card__title">Sesiones de hoy</div></div></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' + hoy.map(function (x) {
          return '<span class="tag" style="--cc:var(--c-verde)"><span class="dot-c"></span>' + x.minutes + ' min</span>';
        }).join('') + '</div></div>' : '');

    var timeEl = SL.$('[data-time]', root);
    var ringEl = SL.$('[data-ring]', root);
    function paint() {
      var m = Math.floor(focus.left / 60), sec = focus.left % 60;
      timeEl.textContent = m + ':' + D.pad(sec);
      SL.charts.ring(ringEl, { value: 1 - focus.left / focus.total, color: 'verde', height: ringEl.clientWidth || 240 });
    }
    paint();

    SL.$('[data-toggle]', root).addEventListener('click', function () {
      focus.on = !focus.on;
      clearInterval(focus.timer);
      if (focus.on) {
        focus.timer = setInterval(function () {
          focus.left--;
          var m = Math.floor(focus.left / 60), sec = focus.left % 60;
          timeEl.textContent = m + ':' + D.pad(sec);
          if (focus.left <= 0) {
            clearInterval(focus.timer); focus.on = false;
            SL.store.update(function (st) {
              st.focus.sessions.push({ date: D.iso(D.today()), minutes: Math.round(focus.total / 60) });
            });
            SL.notify.show('Bloque terminado', 'Completaste ' + Math.round(focus.total / 60) + ' minutos de foco.');
            SL.toast('¡Bloque completado!');
          }
        }, 1000);
      }
      SL.render();
    });
    SL.$('[data-reset]', root).addEventListener('click', function () {
      clearInterval(focus.timer); focus.on = false;
      focus.left = focus.total; SL.render();
    });
    SL.$('[data-preset]', root).addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]'); if (!b) return;
      clearInterval(focus.timer); focus.on = false;
      focus.total = +b.dataset.p * 60; focus.left = focus.total;
      SL.store.update(function (st) { st.focus.preset = +b.dataset.p; });
    });
  };

  /* ————————————————— LOGROS ————————————————— */
  SL.views.logros = function (root, s) {
    var habits = C.activeHabits(s);
    var maxStreak = Math.max.apply(null, [0].concat(habits.map(function (h) { return C.bestStreak(s, h); })));
    var totalChecks = Object.keys(s.checks).reduce(function (a, k) { return a + Object.keys(s.checks[k]).length; }, 0);
    var t = D.today();
    var mesRate = C.monthRate(s, t.getFullYear(), t.getMonth());
    var jEntries = s.journal.filter(function (e) { return e.text && e.text.trim(); }).length;
    var trained = Object.keys(s.training.logs).filter(function (k) { return s.training.logs[k].done; }).length;
    var goalsDone = s.goals.filter(function (g) { return g.current >= g.target; }).length;

    var L = [
      { e: '🌱', n: 'Primer paso',       d: 'Marcaste tu primer hábito',        ok: totalChecks >= 1,   p: Math.min(1, totalChecks / 1) },
      { e: '🔥', n: 'Una semana',        d: '7 días seguidos con un hábito',    ok: maxStreak >= 7,     p: Math.min(1, maxStreak / 7) },
      { e: '⚡', n: 'Un mes entero',     d: '30 días seguidos con un hábito',   ok: maxStreak >= 30,    p: Math.min(1, maxStreak / 30) },
      { e: '💯', n: 'Centenario',        d: '100 marcas en total',              ok: totalChecks >= 100, p: Math.min(1, totalChecks / 100) },
      { e: '🎯', n: 'Mes redondo',       d: '80% de cumplimiento en el mes',    ok: mesRate >= .8,      p: Math.min(1, mesRate / .8) },
      { e: '📓', n: 'Cronista',          d: '10 entradas en el diario',         ok: jEntries >= 10,     p: Math.min(1, jEntries / 10) },
      { e: '💪', n: 'Constante',         d: '20 entrenamientos registrados',    ok: trained >= 20,      p: Math.min(1, trained / 20) },
      { e: '🏆', n: 'Meta cumplida',     d: 'Completaste una meta entera',      ok: goalsDone >= 1,     p: Math.min(1, goalsDone / 1) },
      { e: '🗓️', n: 'Medio año',        d: '500 marcas en total',              ok: totalChecks >= 500, p: Math.min(1, totalChecks / 500) }
    ];
    var got = L.filter(function (x) { return x.ok; }).length;

    root.innerHTML =
      '<div class="page-head"><div>' +
        '<h1 class="page-head__t">Logros</h1>' +
        '<p class="page-head__s">' + got + ' de ' + L.length + ' desbloqueados</p>' +
      '</div></div>' +
      '<div class="grid grid--3">' + L.map(function (x) {
        return '<div class="card" style="opacity:' + (x.ok ? 1 : .62) + '">' +
          '<div style="display:flex;gap:var(--s3);align-items:flex-start">' +
            '<span style="font-size:28px;line-height:1;' + (x.ok ? '' : 'filter:grayscale(1);opacity:.5') + '">' + x.e + '</span>' +
            '<div style="flex:1;min-width:0">' +
              '<div class="card__title" style="font-size:var(--fs-sm)">' + esc(x.n) + '</div>' +
              '<div class="card__sub" style="margin-bottom:8px">' + esc(x.d) + '</div>' +
              '<div style="height:4px;border-radius:99px;background:var(--border-soft);overflow:hidden">' +
                '<div style="height:100%;border-radius:99px;background:' +
                  (x.ok ? 'var(--grad)' : 'var(--text-3)') + ';width:' + Math.round(x.p * 100) + '%"></div></div>' +
            '</div>' +
            (x.ok ? '<span style="color:var(--ok);width:16px;height:16px">' + SL.icon('check') + '</span>' : '') +
          '</div></div>';
      }).join('') + '</div>';
  };

  /* ————————————————— PERFIL / FAMILIA ————————————————— */
  SL.views.perfil = function (root, s) {
    var t = D.today();
    var totalChecks = Object.keys(s.checks).reduce(function (a, k) { return a + Object.keys(s.checks[k]).length; }, 0);
    var first = s.habits.map(function (h) { return h.createdAt; }).sort()[0] || D.iso(t);
    var days = Math.max(1, Math.round((t - D.parse(first)) / 86400000));

    root.innerHTML =
      '<div class="page-head"><div>' +
        '<h1 class="page-head__t">Perfil</h1>' +
        '<p class="page-head__s">Tu historia en StarkLab</p>' +
      '</div></div>' +
      '<div class="grid grid--4">' +
        mini('Días usando la app', days, 'cian') +
        mini('Marcas totales', totalChecks, 'verde') +
        mini('Hábitos activos', C.activeHabits(s).length, 'ambar') +
        mini('Índice general', C.score(s), 'violeta') +
      '</div>' +
      '<div class="card"><div class="card__head"><div>' +
        '<div class="card__title">Tus datos</div>' +
        '<div class="card__sub">Todo vive en este dispositivo. Nada se sube a ningún servidor.</div>' +
      '</div></div>' +
      '<p style="color:var(--text-2);line-height:1.65;font-size:var(--fs-sm)">' +
        'StarkLab guarda hábitos, plata, entrenamientos y diario en el almacenamiento local de tu navegador. ' +
        'Podés llevártelo todo o borrarlo entero desde <b>Configuración → Privacidad</b>.</p></div>';
  };

  SL.views.familia = function (root, s) {
    root.innerHTML =
      '<div class="page-head"><div>' +
        '<h1 class="page-head__t">Familia</h1>' +
        '<p class="page-head__s">Compartir progreso con quien vos elijas</p>' +
      '</div></div>' +
      '<div class="card">' +
        '<div class="empty">' +
          '<div class="empty__i">👥</div>' +
          '<div class="empty__t">Todavía no está disponible</div>' +
          '<div class="empty__s">Compartir entre personas necesita un servidor y cuentas, y hoy StarkLab ' +
            'funciona entero en tu dispositivo, sin backend. Es lo que hace que ande offline y que tus datos ' +
            'no salgan de acá. Cuando exista, el diario va a seguir siendo privado aunque el resto se comparta.</div>' +
        '</div>' +
      '</div>';
  };

  function mini(label, value, color) {
    return '<div class="card"><div class="stat" style="--cc:var(--c-' + color + ')">' +
      '<div class="stat__label">' + esc(label) + '</div>' +
      '<div class="stat__value u-num">' + value + '</div></div></div>';
  }

  function empty(i, t, s2) {
    return '<div class="empty" style="grid-column:1/-1"><div class="empty__i">' + i + '</div>' +
      '<div class="empty__t">' + esc(t) + '</div><div class="empty__s">' + esc(s2) + '</div></div>';
  }

})(window.SL = window.SL || {});
