/* ============================================================
   StarkLab Web · Journaling
   Una entrada por día, ánimo en cinco caras y etiquetas de qué
   lo influyó. Con el tiempo se puede cruzar con los hábitos.
   ============================================================ */
(function (SL) {
  'use strict';

  var C = SL.compute, D = SL.date, esc = SL.esc;
  var query = '';
  var range = 30;

  /* Las etiquetas contestan una sola pregunta: qué te movió el ánimo hoy.
     Con el tiempo permiten ver qué área aparece siempre en los días malos. */
  var TAGS = [
    { k: 'trabajo',     l: 'Trabajo',     c: 'violeta', d: 'Estudio, laburo, entregas' },
    { k: 'plata',       l: 'Plata',       c: 'ambar',   d: 'Gastos, cobros, cuentas' },
    { k: 'sueño',       l: 'Sueño',       c: 'cian',    d: 'Cuánto y cómo dormiste' },
    { k: 'relaciones',  l: 'Relaciones',  c: 'rosa',    d: 'Familia, pareja, amigos' },
    { k: 'salud',       l: 'Salud',       c: 'verde',   d: 'Cómo te sentiste físicamente' },
    { k: 'ejercicio',   l: 'Ejercicio',   c: 'coral',   d: 'Entrenaste o te movés poco' }
  ];

  SL.views = SL.views || {};
  SL.views.journaling = function (root, s) {
    var todayKey = D.iso(D.today());
    var hoy = s.journal.filter(function (e) { return e.date === todayKey; })[0];
    var from = D.addDays(D.today(), -(range - 1));
    var serie = C.moodSeries(s, from, D.today()).map(function (p, i) {
      p.day = i + 1;
      return p;
    });

    var withText = s.journal.filter(function (e) { return e.text && e.text.trim(); })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var found = query
      ? withText.filter(function (e) {
          return e.text.toLowerCase().indexOf(query.toLowerCase()) !== -1 || e.date.indexOf(query) !== -1;
        })
      : withText;

    var moods = serie.filter(function (p) { return p.mood; });
    var avg = moods.length ? moods.reduce(function (a, p) { return a + p.mood; }, 0) / moods.length : 0;

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-head__t">Journaling</h1>' +
          '<p class="page-head__s">Escribí en menos de un minuto. Privado: nunca sale de este dispositivo.</p>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head"><div>' +
          '<div class="card__title">¿Cómo venís hoy?</div>' +
          '<div class="card__sub">' + SL.DIAS[D.dow(D.today())] + ' ' + D.today().getDate() + ' de ' +
            SL.MESES[D.today().getMonth()] + '</div>' +
        '</div></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:var(--s4)" data-moods>' +
          SL.MOODS.map(function (m) {
            var on = hoy && hoy.mood === m.v;
            return '<button class="btn" data-m="' + m.v + '" style="flex:1;min-width:78px;flex-direction:column;gap:4px;' +
              'padding:12px 6px;' + (on ? 'border-color:var(--accent);background:color-mix(in oklab,var(--accent) 12%,transparent)' : '') + '">' +
              '<span style="font-size:24px;line-height:1">' + m.e + '</span>' +
              '<span style="font-size:var(--fs-micro);font-weight:600">' + m.l + '</span></button>';
          }).join('') +
        '</div>' +
        '<div class="field" style="margin-bottom:var(--s3)">' +
          '<textarea class="textarea" data-texto placeholder="¿Qué pasó hoy? Escribí lo que sea, aunque sea una línea.">' +
            esc(hoy && hoy.text ? hoy.text : '') + '</textarea>' +
        '</div>' +
        '<div class="field__l" style="margin-bottom:8px">¿Qué te movió el ánimo hoy?</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:var(--s5)" data-tags>' +
          TAGS.map(function (t) {
            var on = hoy && hoy.tags && hoy.tags.indexOf(t.k) !== -1;
            return '<button class="tag" data-t="' + t.k + '" title="' + esc(t.d) + '" ' +
              'style="--cc:var(--c-' + t.c + ');cursor:pointer;' +
              (on ? 'outline:2px solid var(--cc)' : 'opacity:.6') + '">' +
              '<span class="dot-c"></span>' + t.l + '</button>';
          }).join('') +
        '</div>' +
        '<button class="btn btn--primary" data-guardar>Guardar entrada</button>' +
      '</div>' +

      '<div class="grid grid--main">' +
        '<div class="card">' +
          '<div class="card__head">' +
            '<div><div class="card__title">Ánimo y cumplimiento</div>' +
            '<div class="card__sub">Ambas series en la misma escala de 0 a 100, para poder compararlas</div></div>' +
            '<div class="card__tools"><div class="seg" data-rango>' +
              [14, 30, 90].map(function (r) {
                return '<button class="seg__b' + (range === r ? ' is-on' : '') + '" data-r="' + r + '">' + r + ' días</button>';
              }).join('') +
            '</div></div>' +
          '</div>' +
          '<div data-cruce style="height:250px"></div>' +
          '<div class="legend">' +
            '<span class="legend__i"><span class="legend__sw" style="--cc:var(--c-violeta)"></span>Ánimo</span>' +
            '<span class="legend__i"><span class="legend__sw" style="--cc:var(--accent)"></span>Hábitos cumplidos</span>' +
          '</div>' +
          corr(serie) +
        '</div>' +

        '<div style="display:grid;gap:var(--s4);align-content:start">' +
          '<div class="card"><div class="stat" style="--cc:var(--c-violeta)">' +
            '<div class="stat__top"><span class="stat__ico">' + SL.icon('diario') + '</span>' +
            '<span class="stat__label">Ánimo promedio</span></div>' +
            '<div class="stat__value">' + (avg ? avg.toFixed(1) : '—') +
              '<span style="font-size:.5em;color:var(--text-3);font-weight:600"> / 5</span></div>' +
            '<div class="stat__foot">' + (moods.length ? moods.length + ' días registrados' : 'Sin registros') + '</div>' +
          '</div></div>' +
          '<div class="card">' +
            '<div class="card__head"><div><div class="card__title">Distribución</div>' +
            '<div class="card__sub">Últimos ' + range + ' días</div></div></div>' +
            '<div data-dist style="height:150px"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card card--flush">' +
        '<div class="card__head" style="padding:var(--s5) var(--s5) var(--s3);margin:0">' +
          '<div><div class="card__title">Historial</div>' +
          '<div class="card__sub">' + found.length + ' entrada' + (found.length === 1 ? '' : 's') + '</div></div>' +
          '<div class="card__tools" style="position:relative">' +
            '<input class="input" data-q placeholder="Buscar por palabra o fecha" value="' + esc(query) + '" ' +
              'style="padding-left:32px;width:min(260px,50vw)">' +
            '<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-3);' +
              'width:15px;height:15px;pointer-events:none">' + SL.icon('buscar') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="rows" data-hist></div>' +
      '</div>';

    /* — cruce ánimo / hábitos —
       Ambas series en media móvil de 7 días y en la misma escala de 0 a 100.
       El ánimo diario salta entre cinco valores fijos y el cumplimiento
       entre 0 y 100: crudos no se pueden comparar. Promediados, sí.

       Nunca dos ejes Y: es la forma más fácil de mentir con un gráfico. */
    var anim = mediaMovil(serie.map(function (p) {
      return { day: p.day, rate: p.mood ? (p.mood - 1) / 4 : null, date: p.date };
    }), 7);
    var cumpl = mediaMovil(serie.map(function (p) {
      return { day: p.day, rate: p.rate, date: p.date };
    }), 7);

    SL.charts.line(SL.$('[data-cruce]', root), {
      data: cumpl,
      series: [{ key: 'animo', label: 'Ánimo', color: 'var(--c-violeta)', data: anim, activa: true }],
      height: 250,
      tipTitle: function (p) {
        var d = D.parse(p.date || serie[p.day - 1].date);
        return d.getDate() + ' de ' + SL.MESES[d.getMonth()];
      },
      tipNota: 'hábitos, media de 7 días',
      xLabel: function (i) {
        var p = serie[i - 1];
        if (!p) return '';
        var dd = D.parse(p.date);
        return dd.getDate() + '/' + (dd.getMonth() + 1);
      }
    });

    /* — distribución de ánimo — */
    var counts = [0, 0, 0, 0, 0];
    moods.forEach(function (p) { counts[p.mood - 1]++; });
    var maxC = Math.max.apply(null, counts) || 1;
    SL.charts.bars(SL.$('[data-dist]', root), {
      height: 150, maxBar: 38,
      data: SL.MOODS.map(function (m, i) {
        return {
          label: m.e, full: m.l, rate: counts[i] / maxC, done: counts[i], total: moods.length,
          color: ['rojo', 'coral', 'ambar', 'cian', 'verde'][i]
        };
      })
    });

    /* — historial — */
    SL.$('[data-hist]', root).innerHTML = found.length ? found.map(function (e) {
      var d = D.parse(e.date);
      var mood = SL.MOODS.filter(function (m) { return m.v === e.mood; })[0] || { e: '·', l: '' };
      return '<div class="row" style="align-items:flex-start">' +
        '<span style="font-size:20px;line-height:1.3">' + mood.e + '</span>' +
        '<div class="row__main">' +
          '<div class="row__s" style="margin-bottom:3px">' +
            SL.DIAS[D.dow(d)] + ' ' + d.getDate() + ' de ' + SL.MESES[d.getMonth()] + ' · ' + mood.l + '</div>' +
          '<div style="font-size:var(--fs-sm);line-height:1.6;color:var(--text)">' + esc(e.text) + '</div>' +
          (e.tags && e.tags.length ? '<div style="display:flex;gap:5px;margin-top:7px;flex-wrap:wrap">' +
            e.tags.map(function (k) {
              var t = TAGS.filter(function (x) { return x.k === k; })[0];
              return t ? '<span class="tag" style="--cc:var(--c-' + t.c + ');font-size:var(--fs-micro);padding:2px 8px">' +
                t.l + '</span>' : '';
            }).join('') + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('') : '<div class="empty"><div class="empty__i">📓</div>' +
      '<div class="empty__t">' + (query ? 'Nada encontrado' : 'Todavía no escribiste nada') + '</div>' +
      '<div class="empty__s">' + (query ? 'Probá con otra palabra.' : 'La primera entrada es la más difícil. Una línea alcanza.') + '</div></div>';

    /* — acciones — */
    var picked = hoy ? hoy.mood : 0;
    var pickedTags = hoy && hoy.tags ? hoy.tags.slice() : [];

    SL.$('[data-moods]', root).addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      picked = +b.dataset.m;
      SL.$$('[data-m]', root).forEach(function (x) {
        var on = x === b;
        x.style.borderColor = on ? 'var(--accent)' : '';
        x.style.background = on ? 'color-mix(in oklab,var(--accent) 12%,transparent)' : '';
      });
    });
    SL.$('[data-tags]', root).addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]'); if (!b) return;
      var k = pickedTags.indexOf(b.dataset.t);
      if (k === -1) pickedTags.push(b.dataset.t); else pickedTags.splice(k, 1);
      b.style.outline = k === -1 ? '2px solid var(--cc)' : '';
      b.style.opacity = k === -1 ? '1' : '.6';
    });
    SL.$('[data-guardar]', root).addEventListener('click', function () {
      var text = SL.$('[data-texto]', root).value.trim();
      if (!picked && !text) { SL.toast('Elegí un ánimo o escribí algo', 'err'); return; }
      SL.store.update(function (st) {
        var e = st.journal.filter(function (x) { return x.date === todayKey; })[0];
        if (!e) { e = { date: todayKey, mood: picked || 3, text: '', tags: [] }; st.journal.push(e); }
        e.mood = picked || e.mood; e.text = text; e.tags = pickedTags.slice();
      });
      SL.toast('Entrada guardada');
    });
    SL.$$('[data-r]', root).forEach(function (b) {
      b.addEventListener('click', function () { range = +b.dataset.r; SL.render(); });
    });
    var q = SL.$('[data-q]', root);
    q.addEventListener('input', function () {
      query = q.value;
      clearTimeout(q._t);
      q._t = setTimeout(function () {
        var pos = q.selectionStart;
        SL.render();
        var nq = SL.$('[data-q]');
        if (nq) { nq.focus(); nq.setSelectionRange(pos, pos); }
      }, 260);
    });
  };

  /* Media móvil sobre una serie que puede tener huecos. Los días sin dato
     no cuentan ni como cero ni como corte: simplemente no participan del
     promedio, y si la ventana entera está vacía se devuelve null para que
     la línea se interrumpa. */
  function mediaMovil(datos, win) {
    return datos.map(function (p, i) {
      var n = 0, suma = 0;
      for (var k = Math.max(0, i - win + 1); k <= i; k++) {
        if (datos[k].rate === null || datos[k].rate === undefined) continue;
        suma += datos[k].rate; n++;
      }
      return { day: p.day, date: p.date, future: false, rate: n ? suma / n : null };
    });
  }

  /* Correlación de Pearson entre ánimo y cumplimiento, sólo sobre los días
     que tienen las dos cosas. Se muestra en palabras, no como número suelto. */
  function corr(serie) {
    var pairs = serie.filter(function (p) { return p.mood && p.rate !== null; });
    if (pairs.length < 6) {
      return '<p class="card__sub" style="margin-top:var(--s3)">' +
        'Con ' + pairs.length + ' día' + (pairs.length === 1 ? '' : 's') +
        ' de datos todavía no alcanza para cruzar las dos series. Desde 6 días ya se puede.</p>';
    }
    var n = pairs.length;
    var mx = pairs.reduce(function (a, p) { return a + p.mood; }, 0) / n;
    var my = pairs.reduce(function (a, p) { return a + p.rate; }, 0) / n;
    var num = 0, dx = 0, dy = 0;
    pairs.forEach(function (p) {
      var a = p.mood - mx, b = p.rate - my;
      num += a * b; dx += a * a; dy += b * b;
    });
    var r = (dx && dy) ? num / Math.sqrt(dx * dy) : 0;
    var txt, color;
    if (r > 0.5)       { txt = 'Los días que cumplís tus hábitos, tu ánimo es claramente mejor.'; color = 'var(--ok)'; }
    else if (r > 0.2)  { txt = 'Se nota una relación suave entre cumplir hábitos y estar mejor.'; color = 'var(--ok)'; }
    else if (r > -0.2) { txt = 'Por ahora el ánimo y los hábitos van bastante por su cuenta.'; color = 'var(--text-2)'; }
    else               { txt = 'Curioso: los días de más cumplimiento coinciden con peor ánimo. Puede ser exigencia de más.'; color = 'var(--warn)'; }
    return '<p style="margin-top:var(--s4);padding:var(--s3) var(--s4);border-radius:var(--r);' +
      'background:var(--card-2);border:1px solid var(--border);font-size:var(--fs-sm);line-height:1.6;color:' + color + '">' +
      esc(txt) + ' <span style="color:var(--text-3)">(r = ' + r.toFixed(2) + ' sobre ' + n + ' días)</span></p>';
  }

})(window.SL = window.SL || {});
