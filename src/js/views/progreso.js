/* ============================================================
   Zenit · Progreso
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

      '<div class="grid grid--main">' +
        '<div class="card">' +
          '<div class="card__head"><div>' +
            '<div class="card__title">Mes contra mes</div>' +
            '<div class="card__sub">Cumplimiento promedio de los últimos 6 meses</div>' +
          '</div></div>' +
          '<div data-meses style="height:200px"></div>' +
        '</div>' +

        '<div class="card card--flush">' +
          '<div class="card__head card__head--inset"><div>' +
            '<div class="card__title">Hábito por hábito</div>' +
            '<div class="card__sub">Racha actual y cumplimiento de los últimos 30 días</div>' +
          '</div></div>' +
          tablaHabitos(s, habits) +
        '</div>' +
      '</div>';

    SL.charts.radar(SL.$('[data-radar]', root), { data: r, height: 320 });
    SL.charts.bars(SL.$('[data-meses]', root), { height: 190, data: meses });
  };

  /* Una sola tabla por hábito. Antes eran dos tarjetas —rachas por un
     lado y cumplimiento por otro— que decían casi lo mismo con dos
     gráficos distintos: juntas se leen de un vistazo y ocupan la mitad. */
  function tablaHabitos(s, habits) {
    if (!habits.length) {
      return '<div class="empty"><p class="empty__s">Todavía no creaste ningún hábito.</p></div>';
    }
    var filas = habits.map(function (h) {
      var n = 0, done = 0;
      for (var j = 0; j < 30; j++) {
        var d = D.addDays(D.today(), -j);
        if (!C.due(h, d)) continue;
        n++; if (C.isDone(s, h.id, D.iso(d))) done++;
      }
      return { h: h, racha: C.streak(s, h), mejor: C.bestStreak(s, h), rate: n ? done / n : 0 };
    }).sort(function (a, b) { return b.rate - a.rate; });

    return '<div class="tabla-h">' + filas.map(function (f) {
      return '<div class="tabla-h__r" style="--cc:var(--c-' + f.h.color + ')">' +
        '<span class="tabla-h__n">' + f.h.emoji + ' ' + esc(f.h.name) + '</span>' +
        '<span class="tabla-h__racha" title="Racha actual · mejor: ' + f.mejor + '">' +
          (f.racha ? SL.icon('fuego') + f.racha : '—') + '</span>' +
        '<span class="tabla-h__bar"><span style="width:' + Math.round(f.rate * 100) + '%"></span></span>' +
        '<b class="tabla-h__v">' + Math.round(f.rate * 100) + '%</b>' +
      '</div>';
    }).join('') + '</div>';
  }

  var FUENTE = {
    fisico:        'Hábitos de cuerpo + días de entrenamiento efectivamente hechos',
    mental:        'Ánimo promedio registrado en el journaling',
    financiero:    'Cuánta plata tiene un trabajo asignado y cuánto margen queda en los frascos',
    productividad: 'Tareas cerradas de los últimos 30 días',
    disciplina:    'Cumplimiento global de todos los hábitos',
    enfoque:       'Hábitos de concentración + minutos de foco registrados'
  };

})(window.SL = window.SL || {});
