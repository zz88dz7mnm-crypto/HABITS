/* ============================================================
   StarkLab Web · Progreso
   El radar de las seis áreas, el año entero en un mapa de calor
   y la comparación mes contra mes.
   ============================================================ */
(function (SL) {
  'use strict';

  var C = SL.compute, D = SL.date, esc = SL.esc;

  SL.views = SL.views || {};
  SL.views.progreso = function (root, s) {
    var t = D.today();
    var r = C.radar(s);
    var sc = C.score(s);
    var habits = C.activeHabits(s);

    // Últimos 6 meses de cumplimiento
    var meses = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(t.getFullYear(), t.getMonth() - i, 1);
      meses.push({
        label: SL.MESES[d.getMonth()].slice(0, 3),
        full: SL.MESES[d.getMonth()] + ' ' + d.getFullYear(),
        rate: C.monthRate(s, d.getFullYear(), d.getMonth()),
        today: i === 0
      });
    }

    // Mapa de calor: un año completo, arrancando un lunes
    var heat = [];
    var start = D.startOfWeek(D.addDays(t, -363));
    for (var k = 0; k < 371; k++) {
      var dd = D.addDays(start, k);
      if (dd > t) { heat.push({ date: D.iso(dd), rate: null }); continue; }
      heat.push({ date: D.iso(dd), rate: C.dayRate(s, dd) });
    }

    // Ranking de hábitos por cumplimiento en 30 días
    var rank = habits.map(function (h) {
      var n = 0, done = 0;
      for (var j = 0; j < 30; j++) {
        var d = D.addDays(t, -j);
        if (!C.due(h, d)) continue;
        n++; if (C.isDone(s, h.id, D.iso(d))) done++;
      }
      return { h: h, rate: n ? done / n : 0, n: n, done: done };
    }).sort(function (a, b) { return b.rate - a.rate; });

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-head__t">Progreso</h1>' +
          '<p class="page-head__s">Todo calculado sobre tus datos reales de los últimos 30 días. Nada estimado.</p>' +
        '</div>' +
      '</div>' +

      '<div class="grid grid--main">' +
        '<div class="card">' +
          '<div class="card__head">' +
            '<div><div class="card__title">Radar de Performance</div>' +
            '<div class="card__sub">Seis áreas, cada una de 0 a 100</div></div>' +
            '<div class="card__tools" style="text-align:right">' +
              '<div style="font-size:2rem;font-weight:800;letter-spacing:-.04em;line-height:1" class="u-grad-text">' + sc + '</div>' +
              '<div class="card__sub">índice general</div>' +
            '</div>' +
          '</div>' +
          '<div data-radar style="height:320px"></div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card__head"><div>' +
            '<div class="card__title">De dónde sale cada área</div>' +
            '<div class="card__sub">Para que el número no sea una caja negra</div>' +
          '</div></div>' +
          '<div style="display:grid;gap:var(--s4)">' +
            r.map(function (a) {
              return '<div>' +
                '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px">' +
                  '<span style="font-size:var(--fs-sm);font-weight:650">' + esc(a.label) + '</span>' +
                  '<span style="margin-left:auto;font-weight:800" class="u-num">' + a.value + '</span>' +
                '</div>' +
                '<div style="height:5px;border-radius:99px;background:var(--border-soft);overflow:hidden">' +
                  '<div style="height:100%;border-radius:99px;background:var(--grad);width:' + a.value +
                    '%;transition:width .9s var(--e-out)"></div></div>' +
                '<div style="font-size:var(--fs-micro);color:var(--text-3);margin-top:4px">' + esc(FUENTE[a.key]) + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head"><div>' +
          '<div class="card__title">Un año de hábitos</div>' +
          '<div class="card__sub">Cada celda es un día. Cuanto más fuerte, más cumpliste.</div>' +
        '</div>' +
        '<div class="card__tools" style="display:flex;align-items:center;gap:7px">' +
          '<span class="card__sub">Menos</span>' +
          [0.14, 0.35, 0.56, 0.78, 1].map(function (o) {
            return '<span style="width:11px;height:11px;border-radius:3px;background:var(--accent);opacity:' + o + '"></span>';
          }).join('') +
          '<span class="card__sub">Más</span>' +
        '</div></div>' +
        '<div style="overflow-x:auto"><div data-heat style="height:132px;min-width:760px"></div></div>' +
      '</div>' +

      '<div class="grid grid--2">' +
        '<div class="card">' +
          '<div class="card__head"><div>' +
            '<div class="card__title">Mes contra mes</div>' +
            '<div class="card__sub">Cumplimiento promedio de los últimos 6 meses</div>' +
          '</div></div>' +
          '<div data-meses style="height:190px"></div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card__head"><div>' +
            '<div class="card__title">Qué te está costando</div>' +
            '<div class="card__sub">Últimos 30 días, de mejor a peor</div>' +
          '</div></div>' +
          '<div class="legend legend--rows">' +
            (rank.length ? rank.map(function (o) {
              return '<span class="legend__i" style="--cc:var(--c-' + o.h.color + ')">' +
                '<span class="legend__sw"></span>' +
                '<span class="legend__name">' + o.h.emoji + ' ' + esc(o.h.name) + '</span>' +
                '<span style="flex:0 0 76px;height:5px;border-radius:99px;background:var(--border-soft);overflow:hidden">' +
                  '<span style="display:block;height:100%;border-radius:99px;background:var(--cc);width:' +
                    Math.round(o.rate * 100) + '%"></span></span>' +
                '<b style="flex:0 0 42px;text-align:right">' + Math.round(o.rate * 100) + '%</b></span>';
            }).join('') : '<div class="empty__s">Sin hábitos activos.</div>') +
          '</div>' +
        '</div>' +
      '</div>';

    SL.charts.radar(SL.$('[data-radar]', root), { data: r, height: 320 });
    SL.charts.heat(SL.$('[data-heat]', root), { data: heat, height: 132 });
    SL.charts.bars(SL.$('[data-meses]', root), { height: 190, data: meses });
  };

  var FUENTE = {
    fisico:        'Hábitos de cuerpo + días de entrenamiento efectivamente hechos',
    mental:        'Ánimo promedio registrado en el diario',
    financiero:    'Cuánto margen quedó entre lo gastado y los presupuestos',
    productividad: 'Tareas cerradas + avance de las metas',
    disciplina:    'Cumplimiento global de todos los hábitos',
    enfoque:       'Hábitos de concentración + minutos de foco registrados'
  };

})(window.SL = window.SL || {});
