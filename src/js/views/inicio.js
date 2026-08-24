/* ============================================================
   StarkLab Web · Inicio
   Lo que hace falta saber hoy, sin tener que entrar a cada módulo.
   ============================================================ */
(function (SL) {
  'use strict';

  var C = SL.compute, D = SL.date, esc = SL.esc;

  SL.views = SL.views || {};
  SL.views.inicio = function (root, s) {
    var t = D.today(), todayKey = D.iso(t);
    var habits = C.activeHabits(s);
    var dueToday = habits.filter(function (h) { return C.due(h, t); });
    var doneToday = dueToday.filter(function (h) { return C.isDone(s, h.id, todayKey); });
    var rate = dueToday.length ? doneToday.length / dueToday.length : 0;

    var f = C.finance(s, t.getFullYear(), t.getMonth());
    var cur = s.settings.currency;
    var money = function (v) { return SL.fmt.money(v, cur); };

    var series = C.monthSeries(s, t.getFullYear(), t.getMonth());
    var ws = D.startOfWeek(t);
    var week = C.weekOverall(s, ws);

    var pend = s.tasks.filter(function (k) { return !k.done; });
    var evs = s.events.filter(function (e) { return e.date === todayKey; })
      .sort(function (a, b) { return a.time < b.time ? -1 : 1; });

    var best = habits.map(function (h) { return { h: h, n: C.streak(s, h) }; })
      .sort(function (a, b) { return b.n - a.n; })[0];

    var hoyJ = s.journal.filter(function (e) { return e.date === todayKey; })[0];
    var sc = C.score(s);
    var plan = s.training.split[D.dow(t)] || { name: 'Descanso', muscles: [] };

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-head__t">' + saludo() + '</h1>' +
          '<p class="page-head__s">' + SL.DIAS[D.dow(t)] + ' ' + t.getDate() + ' de ' + SL.MESES[t.getMonth()] +
            ' · ' + resumen(rate, dueToday.length, doneToday.length) + '</p>' +
        '</div>' +
        '<div class="page-head__actions">' +
          '<button class="btn" data-go="pausa">' + SL.icon('pausa') + 'Modo Pausa</button>' +
          '<button class="btn btn--primary" data-gasto>' + SL.icon('mas') + 'Registrar gasto</button>' +
        '</div>' +
      '</div>' +

      '<div class="grid grid--4">' +
        '<div class="card"><div class="stat" style="--cc:var(--accent)">' +
          '<div class="stat__top"><span class="stat__ico">' + SL.icon('habitos') + '</span>' +
          '<span class="stat__label">Hábitos de hoy</span></div>' +
          '<div class="stat__value u-num">' + doneToday.length + '<span style="font-size:.55em;color:var(--text-3)">/' +
            dueToday.length + '</span></div>' +
          '<div style="height:5px;border-radius:99px;background:var(--border-soft);overflow:hidden">' +
            '<div style="height:100%;border-radius:99px;background:var(--grad);transition:width .8s var(--e-out);width:' +
              Math.round(rate * 100) + '%"></div></div>' +
        '</div></div>' +

        '<div class="card"><div class="stat" style="--cc:var(--c-ambar)">' +
          '<div class="stat__top"><span class="stat__ico">' + SL.icon('fuego') + '</span>' +
          '<span class="stat__label">Mejor racha</span></div>' +
          '<div class="stat__value u-num">' + (best ? best.n : 0) +
            '<span style="font-size:.5em;color:var(--text-3);font-weight:600"> días</span></div>' +
          '<div class="stat__foot">' + (best && best.n ? best.h.emoji + ' ' + esc(best.h.name) : 'Sin rachas todavía') + '</div>' +
        '</div></div>' +

        '<div class="card"><div class="stat" style="--cc:var(--c-verde)">' +
          '<div class="stat__top"><span class="stat__ico">' + SL.icon('finanzas') + '</span>' +
          '<span class="stat__label">Saldo del mes</span></div>' +
          '<div class="stat__value u-num">' + money(f.balance) + '</div>' +
          '<div class="stat__foot">Gastaste ' + money(f.expense) + ' en ' + SL.MESES[t.getMonth()].toLowerCase() + '</div>' +
        '</div></div>' +

        '<div class="card"><div class="stat" style="--cc:var(--c-violeta)">' +
          '<div class="stat__top"><span class="stat__ico">' + SL.icon('progreso') + '</span>' +
          '<span class="stat__label">Índice general</span></div>' +
          '<div class="stat__value u-num">' + sc + '<span style="font-size:.5em;color:var(--text-3)"> /100</span></div>' +
          '<div class="stat__foot">' + juicio(sc) + '</div>' +
        '</div></div>' +
      '</div>' +

      '<div class="grid grid--main">' +
        '<div style="display:grid;gap:var(--s4);align-content:start">' +
          '<div class="card">' +
            '<div class="card__head">' +
              '<div><div class="card__title">Los hábitos de hoy</div>' +
              '<div class="card__sub">Un toque y listo</div></div>' +
              '<div class="card__tools"><button class="btn btn--sm btn--ghost" data-go="habitos">Ver la grilla ' +
                SL.icon('der') + '</button></div>' +
            '</div>' +
            '<div style="display:grid;gap:8px" data-hoy></div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Progreso de ' + esc(SL.MESES[t.getMonth()]) + '</div>' +
              '<div class="card__sub">Cumplimiento diario del mes</div>' +
            '</div></div>' +
            '<div data-linea style="height:210px"></div>' +
          '</div>' +
        '</div>' +

        '<div style="display:grid;gap:var(--s4);align-content:start">' +
          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Agenda de hoy</div>' +
              '<div class="card__sub">' + evs.length + ' evento' + (evs.length === 1 ? '' : 's') + '</div>' +
            '</div></div>' +
            (evs.length
              ? '<div style="display:grid;gap:10px">' + evs.map(function (e) {
                  return '<div style="display:flex;gap:11px;align-items:center">' +
                    '<span class="u-mono" style="font-size:var(--fs-xs);color:var(--text-2);font-weight:600;' +
                      'flex:0 0 40px">' + esc(e.time) + '</span>' +
                    '<span style="width:2px;height:26px;border-radius:2px;background:var(--c-' + eventColor(e.kind) + ')"></span>' +
                    '<span style="font-size:var(--fs-sm);font-weight:550">' + esc(e.title) + '</span></div>';
                }).join('') + '</div>'
              : '<div class="empty__s" style="text-align:left">Nada agendado para hoy.</div>') +
          '</div>' +

          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Semana</div>' +
              '<div class="card__sub">Cumplimiento por día</div>' +
            '</div></div>' +
            '<div data-semana style="height:150px"></div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Pendientes</div>' +
              '<div class="card__sub">' + pend.length + ' sin cerrar</div>' +
            '</div>' +
            '<div class="card__tools"><button class="btn btn--sm btn--ghost" data-go="tareas">Ver todo</button></div></div>' +
            (pend.length
              ? '<div style="display:grid;gap:9px">' + pend.slice(0, 4).map(function (k) {
                  return '<label style="display:flex;gap:10px;align-items:center;cursor:pointer">' +
                    '<input type="checkbox" data-task="' + k.id + '" style="width:16px;height:16px;accent-color:var(--accent)">' +
                    '<span style="font-size:var(--fs-sm)">' + esc(k.text) + '</span></label>';
                }).join('') + '</div>'
              : '<div class="empty__s" style="text-align:left">Todo cerrado. 👏</div>') +
          '</div>' +

          '<div class="card" style="--cc:var(--c-cian)">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Entrenamiento de hoy</div>' +
              '<div class="card__sub">' + esc(plan.name) + '</div>' +
            '</div>' +
            '<div class="card__tools"><button class="btn btn--sm btn--ghost" data-go="entrenamiento">Abrir</button></div></div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
              (plan.muscles.length
                ? plan.muscles.map(function (m) {
                    return '<span class="tag" style="--cc:var(--c-cian);font-size:var(--fs-micro)">' + esc(m) + '</span>';
                  }).join('')
                : '<span class="card__sub">Día de descanso 😴</span>') +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">¿Cómo venís?</div>' +
              '<div class="card__sub">' + (hoyJ && hoyJ.mood ? 'Ya registraste el día' : 'Todavía no lo registraste') + '</div>' +
            '</div></div>' +
            '<div style="display:flex;gap:6px" data-mood>' +
              SL.MOODS.map(function (m) {
                var on = hoyJ && hoyJ.mood === m.v;
                return '<button class="btn" data-m="' + m.v + '" title="' + m.l + '" aria-label="' + m.l + '" ' +
                  'style="flex:1;padding:9px 0;font-size:19px;' +
                  (on ? 'border-color:var(--accent);background:color-mix(in oklab,var(--accent) 12%,transparent)' : '') +
                  '">' + m.e + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    /* — hábitos de hoy — */
    var hoyHost = SL.$('[data-hoy]', root);
    hoyHost.innerHTML = dueToday.length ? dueToday.map(function (h) {
      var on = C.isDone(s, h.id, todayKey);
      var st = C.streak(s, h);
      return '<button class="row" data-h="' + h.id + '" style="--cc:var(--c-' + h.color + ');width:100%;' +
        'border:1px solid ' + (on ? 'transparent' : 'var(--border-soft)') + ';border-radius:var(--r);' +
        'background:' + (on ? 'color-mix(in oklab,var(--cc) 13%,transparent)' : 'transparent') + ';text-align:left">' +
        '<span class="cell ' + (on ? 'is-on' : 'is-off') + '" style="width:22px;height:22px;flex:none;pointer-events:none"></span>' +
        '<span style="font-size:16px">' + h.emoji + '</span>' +
        '<div class="row__main"><div class="row__t"' + (on ? ' style="color:var(--text-2)"' : '') + '>' +
          esc(h.name) + '</div>' +
          (st ? '<div class="row__s" style="color:var(--cc)">🔥 ' + st + ' días seguidos</div>' : '') +
        '</div></button>';
    }).join('') : '<div class="empty__s" style="text-align:left">Hoy no toca ningún hábito. Disfrutá el día.</div>';

    hoyHost.addEventListener('click', function (e) {
      var b = e.target.closest('[data-h]'); if (!b) return;
      var hid = b.dataset.h;
      var on = !C.isDone(SL.store.get(), hid, todayKey);
      SL.store.update(function (st) {
        if (!st.checks[hid]) st.checks[hid] = {};
        if (on) st.checks[hid][todayKey] = true; else delete st.checks[hid][todayKey];
      });
      if (navigator.vibrate) navigator.vibrate(on ? 9 : 4);
    });

    /* — gráficos — */
    SL.charts.line(SL.$('[data-linea]', root), {
      data: series, height: 210,
      tipTitle: function (p) { return p.day + ' de ' + SL.MESES[t.getMonth()]; }
    });
    SL.charts.bars(SL.$('[data-semana]', root), {
      height: 150,
      data: week.map(function (d, i) {
        return { label: SL.DIAS_C[i], full: SL.DIAS[i], rate: d.rate, done: d.done, total: d.total,
          future: d.future, today: d.date === todayKey };
      })
    });

    /* — acciones — */
    SL.$$('[data-go]', root).forEach(function (b) {
      b.addEventListener('click', function () { SL.go(b.dataset.go); });
    });
    SL.$('[data-gasto]', root).addEventListener('click', function () {
      SL.go('finanzas');
      setTimeout(function () { var n = SL.$('[data-nueva]'); if (n) n.click(); }, 90);
    });
    SL.$$('[data-task]', root).forEach(function (c) {
      c.addEventListener('change', function () {
        SL.store.update(function (st) {
          var k = st.tasks.filter(function (x) { return x.id === c.dataset.task; })[0];
          if (k) k.done = true;
        });
        SL.toast('Tarea cerrada');
      });
    });
    SL.$('[data-mood]', root).addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      var v = +b.dataset.m;
      SL.store.update(function (st) {
        var en = st.journal.filter(function (x) { return x.date === todayKey; })[0];
        if (!en) { en = { date: todayKey, mood: v, text: '', tags: [] }; st.journal.push(en); }
        else en.mood = v;
      });
      SL.toast('Ánimo registrado');
    });
  };

  function saludo() {
    var hh = new Date().getHours();
    if (hh < 6)  return 'Todavía despierto';
    if (hh < 13) return 'Buen día';
    if (hh < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function resumen(rate, total, done) {
    if (!total) return 'hoy no toca ningún hábito';
    if (rate === 1) return 'cumpliste los ' + total + '. Impecable.';
    if (rate === 0) return 'te quedan ' + total + ' hábitos por marcar';
    return done + ' de ' + total + ' hábitos hechos';
  }

  function juicio(sc) {
    if (sc >= 80) return 'Muy buen momento';
    if (sc >= 60) return 'Vas bien';
    if (sc >= 40) return 'Hay margen';
    if (sc > 0)   return 'Semana para remontar';
    return 'Sin datos suficientes';
  }

  function eventColor(kind) {
    return { reunion: 'violeta', entreno: 'cian', finanzas: 'verde', estudio: 'ambar', salud: 'coral' }[kind] || 'rosa';
  }

})(window.SL = window.SL || {});
