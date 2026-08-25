/* ============================================================
   Zenit · Inicio
   Lo que hace falta saber hoy. Nada más.
   ============================================================ */
(function (SL) {
  'use strict';

  var C = SL.compute, D = SL.date, esc = SL.esc;

  SL.views = SL.views || {};
  SL.views.inicio = function (root, s) {
    var t = D.today(), todayKey = D.iso(t);
    var habits = C.activeHabits(s);
    var tocan = habits.filter(function (h) { return C.due(h, t); });
    var hechos = tocan.filter(function (h) { return C.isDone(s, h.id, todayKey); });
    var rate = tocan.length ? hechos.length / tocan.length : 0;

    var f = C.frascos(s);
    var cur = s.settings.currency;
    var plata = function (v) { return SL.fmt.money(v, cur); };

    var serie = C.monthSeries(s, t.getFullYear(), t.getMonth());
    var semana = C.weekOverall(s, D.startOfWeek(t));
    var pend = s.tasks.filter(function (k) { return !k.done; });
    var evs = s.events.filter(function (e) { return e.date === todayKey; })
      .sort(function (a, b) { return a.time < b.time ? -1 : 1; });
    var sc = C.score(s);

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-head__t">' + saludo() + '</h1>' +
          '<p class="page-head__s">' + SL.DIAS[D.dow(t)] + ' ' + t.getDate() + ' de ' + SL.MESES[t.getMonth()] +
            ' · ' + resumen(rate, tocan.length, hechos.length) + '</p>' +
        '</div>' +
        '<div class="page-head__actions">' +
          '<button class="btn" data-go="pausa">' + SL.icon('pausa') + 'Modo Pausa</button>' +
          '<button class="btn btn--primary" data-gasto>' + SL.icon('mas') + 'Registrar gasto</button>' +
        '</div>' +
      '</div>' +

      '<div class="grid grid--3">' +
        '<div class="card"><div class="stat" style="--cc:var(--accent)">' +
          '<div class="stat__top"><span class="stat__ico">' + SL.icon('habitos') + '</span>' +
          '<span class="stat__label">Hábitos de hoy</span></div>' +
          '<div class="stat__value u-num">' + hechos.length +
            '<span class="stat__of">/' + tocan.length + '</span></div>' +
          '<div class="meter"><span style="width:' + Math.round(rate * 100) + '%"></span></div>' +
        '</div></div>' +

        '<button class="card card--link" data-go="finanzas"><div class="stat" style="--cc:var(--c-verde)">' +
          '<div class="stat__top"><span class="stat__ico">' + SL.icon('finanzas') + '</span>' +
          '<span class="stat__label">Libre para gastar</span></div>' +
          '<div class="stat__value u-num">' + plata(f.libre) + '</div>' +
          '<div class="stat__foot">' + esc(notaPlata(f, plata)) + '</div>' +
        '</div></button>' +

        '<button class="card card--link" data-go="progreso"><div class="stat" style="--cc:var(--c-violeta)">' +
          '<div class="stat__top"><span class="stat__ico">' + SL.icon('progreso') + '</span>' +
          '<span class="stat__label">Índice general</span></div>' +
          '<div class="stat__value u-num">' + sc + '<span class="stat__of">/100</span></div>' +
          '<div class="stat__foot">Promedio de tus 6 áreas · ver de dónde sale</div>' +
        '</div></button>' +
      '</div>' +

      '<div class="grid grid--main">' +
        '<div class="col">' +
          '<div class="card">' +
            '<div class="card__head">' +
              '<div><div class="card__title">Los hábitos de hoy</div>' +
              '<div class="card__sub">Un toque y listo</div></div>' +
              '<div class="card__tools"><button class="btn btn--sm btn--ghost" data-go="habitos">' +
                'Ver la grilla ' + SL.icon('der') + '</button></div>' +
            '</div>' +
            '<div class="hoy" data-hoy></div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Progreso de ' + esc(SL.MESES[t.getMonth()]) + '</div>' +
              '<div class="card__sub">Cumplimiento diario del mes</div>' +
            '</div></div>' +
            '<div data-linea style="height:210px"></div>' +
          '</div>' +
        '</div>' +

        '<div class="col">' +
          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Agenda de hoy</div>' +
              '<div class="card__sub">' + (evs.length ? evs.length + ' evento' + (evs.length === 1 ? '' : 's') : 'Nada agendado') + '</div>' +
            '</div></div>' +
            (evs.length
              ? '<div class="agenda-hoy">' + evs.map(function (e) {
                  return '<div class="agenda-hoy__i" style="--cc:var(--c-' + colorEvento(e.kind) + ')">' +
                    '<span class="u-mono agenda-hoy__h">' + esc(e.time) + '</span>' +
                    '<span class="agenda-hoy__b"></span>' +
                    '<span class="agenda-hoy__t">' + esc(e.title) + '</span></div>';
                }).join('') + '</div>'
              : '<p class="card__sub">Día libre de compromisos.</p>') +
          '</div>' +

          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">La semana</div>' +
              '<div class="card__sub">Cumplimiento por día</div>' +
            '</div></div>' +
            '<div data-semana style="height:150px"></div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Pendientes</div>' +
              '<div class="card__sub">' + (pend.length ? pend.length + ' sin cerrar' : 'Todo cerrado') + '</div>' +
            '</div>' +
            (pend.length ? '<div class="card__tools"><button class="btn btn--sm btn--ghost" data-go="tareas">Ver todo</button></div>' : '') +
            '</div>' +
            (pend.length
              ? '<div class="pend">' + pend.slice(0, 4).map(function (k) {
                  return '<label class="pend__i"><input type="checkbox" data-task="' + k.id + '">' +
                    '<span>' + esc(k.text) + '</span></label>';
                }).join('') + '</div>'
              : '<p class="card__sub">No queda nada pendiente. 👏</p>') +
          '</div>' +
        '</div>' +
      '</div>';

    /* — hábitos de hoy — */
    var hoyHost = SL.$('[data-hoy]', root);
    hoyHost.innerHTML = tocan.length ? tocan.map(function (h) {
      var on = C.isDone(s, h.id, todayKey);
      var st = C.streak(s, h);
      return '<button class="hoy__i' + (on ? ' is-on' : '') + '" data-h="' + h.id + '" ' +
        'style="--cc:var(--c-' + h.color + ')">' +
        '<span class="cell ' + (on ? 'is-on' : 'is-off') + '"></span>' +
        '<span class="hoy__e">' + h.emoji + '</span>' +
        '<span class="hoy__n">' + esc(h.name) + '</span>' +
        (st ? '<span class="hoy__r">' + SL.icon('fuego') + st + '</span>' : '') +
      '</button>';
    }).join('') : (habits.length
      ? '<p class="card__sub">Hoy no toca ningún hábito. Disfrutá el día.</p>'
      : '<div class="empty"><p class="empty__s">Todavía no creaste ningún hábito.</p>' +
        '<button class="btn btn--primary" data-go="habitos">Crear el primero</button></div>');

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
      data: serie, height: 210,
      tipTitle: function (p) { return p.day + ' de ' + SL.MESES[t.getMonth()]; }
    });
    SL.charts.bars(SL.$('[data-semana]', root), {
      height: 150,
      data: semana.map(function (d, i) {
        return { label: SL.DIAS_C[i], full: SL.DIAS[i], rate: d.rate, done: d.done, total: d.total,
          future: d.future, today: d.date === todayKey };
      })
    });

    /* — acciones — */
    root.addEventListener('click', function (e) {
      var g = e.target.closest('[data-go]');
      if (g) return SL.go(g.dataset.go);
    });
    SL.$('[data-gasto]', root).addEventListener('click', function () {
      SL.go('finanzas');
      setTimeout(function () { var n = SL.$('[data-gasto]'); if (n) n.click(); }, 120);
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

  function notaPlata(f, plata) {
    if (!f.saldo && !f.asignado) return 'Todavía no cargaste nada';
    if (f.libre < 0) return 'Asignaste más de lo que tenés';
    if (!f.asignado) return 'Sin repartir en frascos todavía';
    return plata(f.disponible) + ' ya tienen dueño';
  }

  function colorEvento(kind) {
    return { reunion: 'violeta', entreno: 'cian', finanzas: 'verde', estudio: 'ambar', salud: 'coral' }[kind] || 'rosa';
  }

})(window.SL = window.SL || {});
