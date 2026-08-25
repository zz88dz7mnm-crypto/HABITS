/* ============================================================
   Zenit · Metas, Tareas, Agenda, Enfoque y Logros
   ============================================================ */
(function (SL) {
  'use strict';

  var C = SL.compute, D = SL.date, esc = SL.esc;
  SL.views = SL.views || {};

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
        '<div class="focus-acc">' +
          '<button class="btn btn--primary btn--lg" data-toggle>' + SL.icon(focus.on ? 'pause2' : 'play') +
            (focus.on ? 'Pausar' : 'Empezar') + '</button>' +
          '<button class="icon-btn" data-reset aria-label="Volver a empezar el bloque" ' +
            'title="Volver a empezar">' + SL.icon('reload') + '</button>' +
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

  function empty(i, t, s2) {
    return '<div class="empty" style="grid-column:1/-1"><div class="empty__i">' + i + '</div>' +
      '<div class="empty__t">' + esc(t) + '</div><div class="empty__s">' + esc(s2) + '</div></div>';
  }

})(window.SL = window.SL || {});
