/* ============================================================
   StarkLab Web · Hábitos
   La grilla es el corazón del producto: una fila por hábito con
   su color fijo, una celda por día. Sin límite de cantidad.
   ============================================================ */
(function (SL) {
  'use strict';

  var C = SL.compute, D = SL.date, esc = SL.esc;
  var cursor = null;     // mes que se está mirando
  var compare = false;   // superponer el mes anterior

  function monthLabel(d) { return SL.MESES[d.getMonth()] + ' ' + d.getFullYear(); }

  SL.views = SL.views || {};
  SL.views.habitos = function (root, s) {
    if (!cursor) { var t = D.today(); cursor = new Date(t.getFullYear(), t.getMonth(), 1); }

    var y = cursor.getFullYear(), m = cursor.getMonth();
    var series = C.monthSeries(s, y, m);
    var rate = C.monthRate(s, y, m);
    var habits = C.activeHabits(s);
    var days = D.daysInMonth(y, m);
    var todayKey = D.iso(D.today());

    // Mes anterior, para el comparativo y el delta.
    var prev = new Date(y, m - 1, 1);
    var prevRate = C.monthRate(s, prev.getFullYear(), prev.getMonth());
    var delta = rate - prevRate;

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-head__t">Hábitos</h1>' +
          '<p class="page-head__s">Marcá el día con un toque. Mantené apretada una celda para dejar una nota.</p>' +
        '</div>' +
        '<div class="page-head__actions">' +
          '<div class="seg" role="group" aria-label="Cambiar de mes">' +
            '<button class="seg__b" data-mes="-1" aria-label="Mes anterior">' + SL.icon('izq') + '</button>' +
            '<button class="seg__b is-on" data-hoy>' + esc(monthLabel(cursor)) + '</button>' +
            '<button class="seg__b" data-mes="1" aria-label="Mes siguiente">' + SL.icon('der') + '</button>' +
          '</div>' +
          '<button class="btn btn--primary" data-nuevo>' + SL.icon('mas') + 'Nuevo hábito</button>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head">' +
          '<div>' +
            '<div class="card__title">Progreso de ' + esc(monthLabel(cursor)) + '</div>' +
            '<div class="card__sub">Porcentaje de hábitos cumplidos sobre los que tocaban cada día</div>' +
          '</div>' +
          '<div class="card__tools">' +
            '<button class="btn btn--sm' + (compare ? ' btn--primary' : '') + '" data-comp>' +
              'Comparar con ' + esc(SL.MESES[prev.getMonth()]) + '</button>' +
            '<div style="text-align:right;margin-left:8px">' +
              '<div style="font-size:1.6rem;font-weight:800;letter-spacing:-.04em;line-height:1" class="u-grad-text">' +
                Math.round(rate * 100) + '%</div>' +
              '<div class="card__sub">' + deltaHTML(delta) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div data-chart-line style="height:260px"></div>' +
        (compare ? '<div class="legend"><span class="legend__i"><span class="legend__sw" style="--cc:var(--accent)"></span>' +
          esc(SL.MESES[m]) + '</span><span class="legend__i"><span class="legend__sw" style="--cc:var(--text-3)"></span>' +
          esc(SL.MESES[prev.getMonth()]) + '</span></div>' : '') +
      '</div>' +

      '<div class="card card--flush">' +
        '<div class="card__head" style="padding:var(--s5) var(--s5) 0;margin-bottom:var(--s4)">' +
          '<div>' +
            '<div class="card__title">Registro de hábitos</div>' +
            '<div class="card__sub">' + habits.length + ' hábitos activos · ' + days + ' días</div>' +
          '</div>' +
          '<div class="card__tools">' +
            '<button class="btn btn--sm btn--ghost" data-archivados>Ver archivados</button>' +
          '</div>' +
        '</div>' +
        '<div class="hgrid-wrap" style="padding:0 var(--s5) var(--s5)"><div class="hgrid" data-grid></div></div>' +
      '</div>' +

      '<div class="grid grid--2">' +
        '<div class="card">' +
          '<div class="card__head"><div>' +
            '<div class="card__title">Cumplimiento semanal</div>' +
            '<div class="card__sub" data-semana-label></div>' +
          '</div>' +
          '<div class="card__tools"><div class="seg">' +
            '<button class="seg__b" data-sem="-1" aria-label="Semana anterior">' + SL.icon('izq') + '</button>' +
            '<button class="seg__b" data-sem="1" aria-label="Semana siguiente">' + SL.icon('der') + '</button>' +
          '</div></div></div>' +
          '<div data-chart-week style="height:170px"></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card__head"><div>' +
            '<div class="card__title">Rachas</div>' +
            '<div class="card__sub">Días consecutivos cumplidos, ahora mismo</div>' +
          '</div></div>' +
          '<div data-rachas class="legend legend--rows"></div>' +
        '</div>' +
      '</div>';

    /* ————— gráfico de progreso ————— */
    var cmp = null;
    if (compare) {
      cmp = C.monthSeries(s, prev.getFullYear(), prev.getMonth());
    }
    SL.charts.line(SL.$('[data-chart-line]', root), {
      data: series,
      compare: cmp,
      height: 260,
      tipTitle: function (p) { return p.day + ' de ' + SL.MESES[m]; }
    });

    /* ————— la grilla ————— */
    buildGrid(SL.$('[data-grid]', root), s, habits, y, m, days, todayKey);

    /* ————— semana ————— */
    var weekOff = 0;
    function drawWeek() {
      var ws = D.addDays(D.startOfWeek(D.today()), weekOff * 7);
      var wk = C.weekOverall(s, ws);
      var end = D.addDays(ws, 6);
      SL.$('[data-semana-label]', root).textContent =
        ws.getDate() + '/' + (ws.getMonth() + 1) + ' — ' + end.getDate() + '/' + (end.getMonth() + 1);
      SL.charts.bars(SL.$('[data-chart-week]', root), {
        height: 170,
        data: wk.map(function (d, i) {
          return {
            label: SL.DIAS_C[i], full: SL.DIAS[i], rate: d.rate, done: d.done, total: d.total,
            future: d.future, today: d.date === todayKey
          };
        })
      });
    }
    drawWeek();
    SL.$$('[data-sem]', root).forEach(function (b) {
      b.addEventListener('click', function () { weekOff += +b.dataset.sem; drawWeek(); });
    });

    /* ————— rachas ————— */
    var rach = SL.$('[data-rachas]', root);
    var ordered = habits.map(function (h) {
      return { h: h, n: C.streak(s, h), best: C.bestStreak(s, h) };
    }).sort(function (a, b) { return b.n - a.n; });
    var maxStreak = Math.max(1, ordered[0] ? ordered[0].n : 1);
    rach.innerHTML = ordered.map(function (o) {
      return '<span class="legend__i" style="--cc:var(--c-' + o.h.color + ')">' +
        '<span class="legend__sw"></span>' +
        '<span class="legend__name">' + o.h.emoji + ' ' + esc(o.h.name) + '</span>' +
        '<span style="flex:0 0 84px;height:5px;border-radius:99px;background:var(--border-soft);overflow:hidden">' +
          '<span style="display:block;height:100%;border-radius:99px;background:var(--cc);width:' +
            Math.round(o.n / maxStreak * 100) + '%"></span></span>' +
        '<b style="flex:0 0 auto;min-width:52px;text-align:right">' + o.n + ' día' + (o.n === 1 ? '' : 's') + '</b>' +
      '</span>';
    }).join('') || '<div class="empty"><div class="empty__s">Todavía no hay hábitos.</div></div>';

    /* ————— acciones ————— */
    SL.$$('[data-mes]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + (+b.dataset.mes), 1);
        SL.render();
      });
    });
    SL.$('[data-hoy]', root).addEventListener('click', function () {
      var t = D.today(); cursor = new Date(t.getFullYear(), t.getMonth(), 1); SL.render();
    });
    SL.$('[data-comp]', root).addEventListener('click', function () { compare = !compare; SL.render(); });
    SL.$('[data-nuevo]', root).addEventListener('click', function () { editHabit(null); });
    SL.$('[data-archivados]', root).addEventListener('click', function () { archivedModal(s); });
  };

  function deltaHTML(d) {
    if (Math.abs(d) < 0.005) return '<span class="delta delta--flat">sin cambios vs. mes anterior</span>';
    var up = d > 0;
    return '<span class="delta delta--' + (up ? 'up' : 'down') + '">' +
      (up ? '▲' : '▼') + ' ' + Math.abs(Math.round(d * 100)) + ' pts</span> vs. mes anterior';
  }

  /* ————————————————— construcción de la grilla ————————————————— */
  function buildGrid(host, s, habits, y, m, days, todayKey) {
    // La celda se achica si el mes es largo y la pantalla corta, pero nunca
    // baja de 18px: por debajo deja de ser tocable con el dedo.
    var angosto = window.innerWidth < 720;
    host.style.setProperty('--hg-cell', angosto ? '26px' : 'clamp(18px, 2.1vw, 26px)');
    host.style.setProperty('--hg-gap', '3px');
    host.style.setProperty('--hg-name', angosto ? '164px' : 'clamp(200px, 21vw, 290px)');

    var head = '<div class="hgrid__days">';
    for (var i = 1; i <= days; i++) {
      var d = new Date(y, m, i);
      var wd = D.dow(d);
      var cls = 'hgrid__day' + (D.iso(d) === todayKey ? ' is-today' : '') + (wd >= 5 ? ' is-weekend' : '');
      head += '<span class="' + cls + '">' + i + '</span>';
    }
    head += '</div>';

    var rows = habits.map(function (h) {
      var st = SL.compute.streak(s, h);
      var cells = '';
      for (var i = 1; i <= days; i++) {
        var d = new Date(y, m, i), key = D.iso(d);
        var future = d > D.today();
        var na = !C.due(h, d);
        var on = C.isDone(s, h.id, key);
        var note = s.notes[h.id] && s.notes[h.id][key];
        var cls = 'cell' + (on ? ' is-on' : ' is-off') + (na ? ' is-na' : '') +
                  (future ? ' is-future' : '') + (key === todayKey ? ' is-today' : '') +
                  (note ? ' has-note' : '');
        cells += '<button class="' + cls + '" data-h="' + h.id + '" data-d="' + key + '"' +
          (na || future ? ' disabled' : '') +
          ' aria-label="' + esc(h.name) + ' — ' + i + ' de ' + SL.MESES[m] + (on ? ', cumplido' : ', sin cumplir') + '"' +
          ' aria-pressed="' + on + '"></button>';
      }
      return '<div class="hrow" style="--cc:var(--c-' + h.color + ')" data-row="' + h.id + '" draggable="true">' +
        '<div class="hrow__name">' +
          '<span class="hrow__grip">' + SL.icon('grip') + '</span>' +
          '<span class="hrow__emoji">' + h.emoji + '</span>' +
          '<span class="hrow__txt">' +
            '<span class="hrow__label">' + esc(h.name) + '</span>' +
            '<span class="hrow__meta">' +
              (st > 0 ? '<span class="hrow__streak">' + SL.icon('fuego') + st + '</span> · ' : '') +
              esc(freqLabel(h)) +
            '</span>' +
          '</span>' +
          '<button class="icon-btn row__x" data-edit="' + h.id + '" aria-label="Editar ' + esc(h.name) + '" ' +
            'style="margin-left:auto;width:26px;height:26px">' + SL.icon('config') + '</button>' +
        '</div>' +
        '<div class="hrow__cells">' + cells + '</div>' +
      '</div>';
    }).join('');

    host.innerHTML = head + rows;

    if (!habits.length) {
      host.innerHTML = '<div class="empty"><div class="empty__i">🗓️</div>' +
        '<div class="empty__t">Todavía no hay hábitos</div>' +
        '<div class="empty__s">Creá el primero y empezá a marcar los días. Sin límite de cantidad.</div></div>';
      return;
    }

    /* — marcar / desmarcar — */
    host.addEventListener('click', function (e) {
      var cell = e.target.closest('.cell');
      if (cell && !cell.disabled) return toggle(cell);
      var ed = e.target.closest('[data-edit]');
      if (ed) return editHabit(ed.dataset.edit);
      // En pantallas chicas el botón de editar está oculto: tocar el
      // nombre hace lo mismo.
      if (window.innerWidth < 720) {
        var nm = e.target.closest('.hrow__name');
        if (nm) editHabit(nm.parentNode.dataset.row);
      }
    });

    /* — nota: click derecho en escritorio, mantener apretado en el teléfono — */
    host.addEventListener('contextmenu', function (e) {
      var cell = e.target.closest('.cell');
      if (!cell || cell.disabled) return;
      e.preventDefault();
      noteModal(cell.dataset.h, cell.dataset.d);
    });
    var press = null, moved = false;
    host.addEventListener('touchstart', function (e) {
      var cell = e.target.closest('.cell');
      if (!cell || cell.disabled) return;
      moved = false;
      press = setTimeout(function () {
        if (moved) return;
        if (navigator.vibrate) navigator.vibrate(12);
        noteModal(cell.dataset.h, cell.dataset.d);
        press = 'done';
      }, 480);
    }, { passive: true });
    host.addEventListener('touchmove', function () { moved = true; clearTimeout(press); }, { passive: true });
    host.addEventListener('touchend', function (e) {
      if (press === 'done') { e.preventDefault(); press = null; return; }
      clearTimeout(press);
    });

    /* — reordenar arrastrando — */
    var dragId = null;
    host.addEventListener('dragstart', function (e) {
      var row = e.target.closest('[data-row]');
      if (!row) return;
      dragId = row.dataset.row;
      row.classList.add('is-drag');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch (_) {}
    });
    host.addEventListener('dragend', function () {
      dragId = null;
      SL.$$('.hrow', host).forEach(function (r) { r.classList.remove('is-drag', 'is-over'); });
    });
    host.addEventListener('dragover', function (e) {
      var row = e.target.closest('[data-row]');
      if (!row || !dragId || row.dataset.row === dragId) return;
      e.preventDefault();
      SL.$$('.hrow', host).forEach(function (r) { r.classList.toggle('is-over', r === row); });
    });
    host.addEventListener('drop', function (e) {
      var row = e.target.closest('[data-row]');
      if (!row || !dragId) return;
      e.preventDefault();
      var from = dragId, to = row.dataset.row;
      SL.store.update(function (st) {
        var list = C.activeHabits(st);
        var a = list.findIndex(function (h) { return h.id === from; });
        var b = list.findIndex(function (h) { return h.id === to; });
        if (a < 0 || b < 0) return;
        var moved = list.splice(a, 1)[0];
        list.splice(b, 0, moved);
        list.forEach(function (h, i) {
          var real = st.habits.filter(function (x) { return x.id === h.id; })[0];
          if (real) real.order = i;
        });
      });
    });
  }

  function freqLabel(h) {
    if (h.freq === 'daily') return 'todos los días';
    if (!h.days || !h.days.length) return 'sin días';
    if (h.days.length === 7) return 'todos los días';
    return h.days.map(function (d) { return SL.DIAS_C[d]; }).join(' ');
  }

  function toggle(cell) {
    var hid = cell.dataset.h, key = cell.dataset.d;
    var on = !cell.classList.contains('is-on');
    // Pinta primero y guarda después: el toque tiene que sentirse instantáneo.
    cell.classList.toggle('is-on', on);
    cell.classList.toggle('is-off', !on);
    cell.setAttribute('aria-pressed', on);
    if (navigator.vibrate) navigator.vibrate(on ? 9 : 4);
    SL.store.update(function (s) {
      if (!s.checks[hid]) s.checks[hid] = {};
      if (on) s.checks[hid][key] = true;
      else delete s.checks[hid][key];
    });
  }

  /* ————————————————— nota del día ————————————————— */
  function noteModal(hid, key) {
    var s = SL.store.get();
    var h = s.habits.filter(function (x) { return x.id === hid; })[0];
    if (!h) return;
    var cur = (s.notes[hid] && s.notes[hid][key]) || '';
    var d = D.parse(key);
    SL.modal({
      title: 'Nota del ' + d.getDate() + ' de ' + SL.MESES[d.getMonth()],
      body: '<div class="field">' +
        '<label class="field__l">' + h.emoji + ' ' + esc(h.name) + '</label>' +
        '<textarea class="textarea" data-n placeholder="Ej: no fui al gimnasio, estaba enfermo">' + esc(cur) + '</textarea>' +
        '<p class="card__sub">La nota aparece en el gráfico de progreso, así el número tiene contexto cuando lo revisás meses después.</p>' +
        '</div>',
      okText: 'Guardar nota',
      onOk: function (body) {
        var v = SL.$('[data-n]', body).value.trim();
        SL.store.update(function (st) {
          if (!st.notes[hid]) st.notes[hid] = {};
          if (v) st.notes[hid][key] = v; else delete st.notes[hid][key];
        });
        SL.toast(v ? 'Nota guardada' : 'Nota borrada');
        return true;
      }
    });
  }

  /* ————————————————— alta y edición ————————————————— */
  function editHabit(id) {
    var s = SL.store.get();
    var h = id ? s.habits.filter(function (x) { return x.id === id; })[0] : null;
    var used = C.activeHabits(s).map(function (x) { return x.color; });
    var color = h ? h.color : SL.PALETTE.filter(function (c) { return used.indexOf(c) === -1; })[0] || SL.PALETTE[used.length % 8];
    var freq = h ? h.freq : 'daily';
    var sel = h ? h.days.slice() : [0, 1, 2, 3, 4, 5, 6];

    var body = SL.h('<div style="display:grid;gap:var(--s4)">' +
      '<div style="display:grid;grid-template-columns:64px 1fr;gap:var(--s3)">' +
        '<div class="field"><label class="field__l">Ícono</label>' +
          '<input class="input" data-e maxlength="4" style="text-align:center;font-size:20px" value="' + (h ? h.emoji : '✅') + '"></div>' +
        '<div class="field"><label class="field__l">Nombre</label>' +
          '<input class="input" data-n placeholder="Ej: Gimnasio" value="' + (h ? esc(h.name) : '') + '"></div>' +
      '</div>' +
      '<div class="field"><label class="field__l">Color</label>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap" data-colors>' +
          SL.PALETTE.map(function (c) {
            return '<button type="button" data-c="' + c + '" aria-label="' + c + '" style="width:30px;height:30px;border-radius:9px;' +
              'background:var(--c-' + c + ');border:2px solid ' + (c === color ? 'var(--text)' : 'transparent') +
              ';transition:transform .14s"></button>';
          }).join('') +
        '</div></div>' +
      '<div class="field"><label class="field__l">Frecuencia</label>' +
        '<div class="seg" data-freq style="width:fit-content">' +
          '<button type="button" class="seg__b' + (freq === 'daily' ? ' is-on' : '') + '" data-f="daily">Todos los días</button>' +
          '<button type="button" class="seg__b' + (freq === 'days' ? ' is-on' : '') + '" data-f="days">Días elegidos</button>' +
        '</div></div>' +
      '<div class="field" data-days-wrap' + (freq === 'daily' ? ' hidden' : '') + '>' +
        '<label class="field__l">¿Qué días?</label>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap" data-days>' +
          SL.DIAS_C.map(function (t, i) {
            return '<button type="button" class="seg__b' + (sel.indexOf(i) !== -1 ? ' is-on' : '') +
              '" data-d="' + i + '" style="border:1px solid var(--border)">' + t + '</button>';
          }).join('') +
        '</div></div>' +
      (h ? '<button class="btn btn--danger" data-arch style="width:fit-content">Archivar hábito</button>' : '') +
    '</div>');

    SL.$('[data-colors]', body).addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      color = b.dataset.c;
      SL.$$('[data-c]', body).forEach(function (x) {
        x.style.borderColor = x === b ? 'var(--text)' : 'transparent';
      });
    });
    SL.$('[data-freq]', body).addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      freq = b.dataset.f;
      SL.$$('[data-f]', body).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      SL.$('[data-days-wrap]', body).hidden = freq === 'daily';
    });
    SL.$('[data-days]', body).addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]'); if (!b) return;
      var i = +b.dataset.d, k = sel.indexOf(i);
      if (k === -1) sel.push(i); else sel.splice(k, 1);
      b.classList.toggle('is-on', k === -1);
    });
    if (h) {
      SL.$('[data-arch]', body).addEventListener('click', function () {
        SL.store.update(function (st) {
          var r = st.habits.filter(function (x) { return x.id === id; })[0];
          if (r) r.archived = true;
        });
        SL.toast('Hábito archivado. El historial se conserva.');
        SL.$('.modal-bg') && SL.$('.modal-bg [data-x]').click();
      });
    }

    SL.modal({
      title: h ? 'Editar hábito' : 'Nuevo hábito',
      body: body,
      okText: h ? 'Guardar' : 'Crear hábito',
      onOk: function (b) {
        var name = SL.$('[data-n]', b).value.trim();
        var emoji = SL.$('[data-e]', b).value.trim() || '✅';
        if (!name) { SL.toast('Poné un nombre', 'err'); return false; }
        if (freq === 'days' && !sel.length) { SL.toast('Elegí al menos un día', 'err'); return false; }
        SL.store.update(function (st) {
          if (h) {
            var r = st.habits.filter(function (x) { return x.id === id; })[0];
            r.name = name; r.emoji = emoji; r.color = color;
            r.freq = freq; r.days = sel.slice().sort();
            r.target = freq === 'daily' ? 7 : sel.length;
          } else {
            var nid = SL.uid('h');
            st.habits.push({
              id: nid, name: name, emoji: emoji, color: color, freq: freq,
              days: freq === 'daily' ? [0,1,2,3,4,5,6] : sel.slice().sort(),
              target: freq === 'daily' ? 7 : sel.length,
              order: st.habits.length, archived: false, createdAt: D.iso(D.today())
            });
            st.checks[nid] = {}; st.notes[nid] = {};
          }
        });
        SL.toast(h ? 'Hábito actualizado' : 'Hábito creado');
        return true;
      }
    });
  }

  function archivedModal(s) {
    var arch = s.habits.filter(function (h) { return h.archived; });
    SL.modal({
      title: 'Hábitos archivados',
      okText: null,
      cancelText: 'Cerrar',
      body: arch.length
        ? '<div class="rows" style="margin:0 calc(var(--s5) * -1)">' + arch.map(function (h) {
            return '<div class="row" style="--cc:var(--c-' + h.color + ')">' +
              '<span class="hrow__emoji">' + h.emoji + '</span>' +
              '<div class="row__main"><div class="row__t">' + esc(h.name) + '</div>' +
              '<div class="row__s">Historial conservado</div></div>' +
              '<button class="btn btn--sm" data-un="' + h.id + '">Restaurar</button></div>';
          }).join('') + '</div>'
        : '<div class="empty"><div class="empty__s">No hay hábitos archivados.</div></div>',
      onOk: null
    });
    setTimeout(function () {
      SL.$$('[data-un]').forEach(function (b) {
        b.addEventListener('click', function () {
          SL.store.update(function (st) {
            var r = st.habits.filter(function (x) { return x.id === b.dataset.un; })[0];
            if (r) { r.archived = false; r.order = st.habits.length; }
          });
          SL.toast('Hábito restaurado');
          var x = SL.$('.modal-bg [data-x]'); if (x) x.click();
        });
      });
    }, 40);
  }

})(window.SL = window.SL || {});
