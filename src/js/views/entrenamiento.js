/* ============================================================
   StarkLab Web · Entrenamiento
   Rutina de la semana + mapa muscular: qué se trabaja hoy,
   marcado sobre el cuerpo en vez de escrito en una lista.
   ============================================================ */
(function (SL) {
  'use strict';

  var C = SL.compute, D = SL.date, esc = SL.esc;
  var weekOff = 0;
  var pickedDay = null;
  var side = 'front';

  /* Grupos musculares. Cada uno tiene su forma en la vista de frente,
     de espalda, o en las dos. Las formas son simétricas: se dibuja una
     y se refleja sobre el eje central (x = 100). */
  var MUSCLES = {
    pecho:      { label: 'Pecho',      view: 'front', paths: ['M100 62 L78 60 Q68 66 70 78 Q72 88 86 88 Q98 87 100 80 Z'] },
    hombros:    { label: 'Hombros',    view: 'both',  paths: ['M76 58 Q64 57 58 66 Q54 74 57 82 Q62 84 67 78 Q69 66 78 62 Z'] },
    biceps:     { label: 'Bíceps',     view: 'front', paths: ['M57 84 Q52 96 53 108 Q55 116 61 115 Q65 105 64 88 Z'] },
    triceps:    { label: 'Tríceps',    view: 'back',  paths: ['M57 84 Q51 96 52 110 Q55 118 61 116 Q64 104 64 88 Z'] },
    antebrazo:  { label: 'Antebrazo',  view: 'both',  paths: ['M54 118 Q49 130 50 142 Q53 148 58 146 Q62 134 61 120 Z'] },
    abdomen:    { label: 'Abdomen',    view: 'front', paths: ['M100 90 L84 90 Q80 104 82 122 Q88 132 100 133 Z'] },
    oblicuos:   { label: 'Oblicuos',   view: 'front', paths: ['M80 92 Q73 104 75 122 Q78 128 82 126 Q79 108 82 92 Z'] },
    espalda:    { label: 'Espalda',    view: 'back',  paths: ['M100 60 L76 62 Q66 76 72 96 Q80 112 100 114 Z'] },
    lumbar:     { label: 'Lumbar',     view: 'back',  paths: ['M100 116 L84 116 Q80 126 84 134 Q92 138 100 137 Z'] },
    trapecio:   { label: 'Trapecio',   view: 'back',  paths: ['M100 48 L82 54 Q76 60 80 64 Q92 60 100 60 Z'] },
    gluteos:    { label: 'Glúteos',    view: 'back',  paths: ['M100 138 L82 136 Q74 144 78 158 Q88 164 100 160 Z'] },
    cuadriceps: { label: 'Cuádriceps', view: 'front', paths: ['M98 136 L82 134 Q76 154 79 180 Q84 196 93 194 Q98 168 98 140 Z'] },
    isquios:    { label: 'Isquios',    view: 'back',  paths: ['M98 162 L80 160 Q76 178 80 198 Q86 208 93 205 Q97 182 98 164 Z'] },
    gemelos:    { label: 'Gemelos',    view: 'both',  paths: ['M93 200 Q84 204 82 222 Q84 238 90 238 Q95 222 95 202 Z'] }
  };

  SL.views = SL.views || {};
  SL.views.entrenamiento = function (root, s) {
    var ws = D.addDays(D.startOfWeek(D.today()), weekOff * 7);
    var week = C.trainingWeek(s, ws);
    var todayIdx = weekOff === 0 ? D.dow(D.today()) : 0;
    if (pickedDay === null) pickedDay = todayIdx;
    var day = week[pickedDay];
    var plan = s.training.split[pickedDay] || { name: 'Descanso', muscles: [] };
    var exs = s.training.exercises[pickedDay] || [];
    var log = s.training.logs[day.date] || { done: false, sets: {} };
    var end = D.addDays(ws, 6);
    var doneCount = week.filter(function (d) { return d.done; }).length;
    var planned = week.filter(function (d) { return !d.rest; }).length;

    // Si el día elegido queda fuera de la vista de frente/espalda, se acomoda sola.
    var wants = plan.muscles.filter(function (m) { return MUSCLES[m]; });
    var anyFront = wants.some(function (m) { return MUSCLES[m].view !== 'back'; });
    var anyBack  = wants.some(function (m) { return MUSCLES[m].view !== 'front'; });
    if (side === 'front' && !anyFront && anyBack) side = 'back';
    if (side === 'back' && !anyBack && anyFront) side = 'front';

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-head__t">🏋️ Entrenamiento</h1>' +
          '<p class="page-head__s">Semana ' + ws.getDate() + '/' + D.pad(ws.getMonth() + 1) +
            ' — ' + end.getDate() + '/' + D.pad(end.getMonth() + 1) +
            ' · ' + doneCount + '/' + planned + ' días</p>' +
        '</div>' +
        '<div class="page-head__actions">' +
          '<div class="seg">' +
            '<button class="seg__b" data-sem="-1" aria-label="Semana anterior">' + SL.icon('izq') + '</button>' +
            '<button class="seg__b is-on" data-sem-hoy>Esta semana</button>' +
            '<button class="seg__b" data-sem="1" aria-label="Semana siguiente">' + SL.icon('der') + '</button>' +
          '</div>' +
          '<button class="btn" data-rutina>' + SL.icon('config') + 'Editar rutina</button>' +
        '</div>' +
      '</div>' +

      '<div class="seg" data-dias style="width:100%;overflow-x:auto;justify-content:space-between">' +
        week.map(function (d, i) {
          return '<button class="seg__b' + (i === pickedDay ? ' is-on' : '') + '" data-d="' + i + '" ' +
            'style="flex:1;min-width:64px;display:grid;gap:2px;padding:8px 6px">' +
            '<span style="font-weight:700">' + SL.DIAS_C[i] + '</span>' +
            '<span style="font-size:var(--fs-micro);opacity:.75">' +
              (d.rest ? 'Descanso' : d.done ? '✓ Hecho' : '⚡') + '</span>' +
          '</button>';
        }).join('') +
      '</div>' +

      '<div class="grid grid--main">' +
        '<div style="display:grid;gap:var(--s4);align-content:start">' +
          '<div class="card">' +
            '<div class="card__head">' +
              '<div><div class="card__title">' + esc(plan.name) + '</div>' +
              '<div class="card__sub">' + SL.DIAS[pickedDay] + ' · ' + exs.length + ' ejercicios</div></div>' +
              '<div class="card__tools">' +
                (day.rest ? '' :
                  '<button class="btn btn--sm ' + (log.done ? '' : 'btn--primary') + '" data-hecho>' +
                    (log.done ? '✓ Entrenamiento hecho' : 'Marcar como hecho') + '</button>') +
              '</div>' +
            '</div>' +
            (day.rest
              ? '<div class="empty"><div class="empty__i">😴</div><div class="empty__t">Día de descanso</div>' +
                '<div class="empty__s">El descanso es parte del plan. Mañana toca ' +
                esc((s.training.split[(pickedDay + 1) % 7] || {}).name || 'entrenar') + '.</div></div>'
              : '<div class="rows" style="margin:0 calc(var(--s5) * -1) calc(var(--s5) * -1)" data-ejercicios></div>') +
          '</div>' +

          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Volumen de la semana</div>' +
              '<div class="card__sub">Series completadas por día</div>' +
            '</div></div>' +
            '<div data-vol style="height:160px"></div>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card__head">' +
            '<div><div class="card__title">Músculos del día</div>' +
            '<div class="card__sub">' + (wants.length ? wants.length + ' grupos' : 'Descanso') + '</div></div>' +
            '<div class="card__tools"><div class="seg" data-lado>' +
              '<button class="seg__b' + (side === 'front' ? ' is-on' : '') + '" data-s="front">Frente</button>' +
              '<button class="seg__b' + (side === 'back' ? ' is-on' : '') + '" data-s="back">Espalda</button>' +
            '</div></div>' +
          '</div>' +
          '<div data-cuerpo style="display:grid;place-items:center;padding:var(--s3) 0"></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:var(--s3)">' +
            (wants.length ? wants.map(function (m, i) {
              return '<span class="tag" style="--cc:var(--c-' + muscleColor(i) + ')">' +
                '<span class="dot-c"></span>' + esc(MUSCLES[m].label) + '</span>';
            }).join('') : '<span class="card__sub">Sin grupos asignados</span>') +
          '</div>' +
        '</div>' +
      '</div>';

    drawBody(SL.$('[data-cuerpo]', root), wants, side);

    /* — ejercicios — */
    var ejHost = SL.$('[data-ejercicios]', root);
    if (ejHost) {
      ejHost.innerHTML = exs.length ? exs.map(function (x, i) {
        var setsDone = (log.sets && log.sets[i]) || 0;
        return '<div class="row" style="--cc:var(--c-cian)">' +
          '<button class="row__ico" data-set="' + i + '" aria-label="Sumar serie de ' + esc(x.n) + '" ' +
            'style="cursor:pointer;font-weight:800;font-size:var(--fs-xs)">' + setsDone + '/' + x.s + '</button>' +
          '<div class="row__main"><div class="row__t">' + esc(x.n) + '</div>' +
          '<div class="row__s">' + x.s + ' × ' + esc(x.r) + (x.w ? ' · ' + x.w + ' kg' : ' · peso corporal') + '</div></div>' +
          '<div style="flex:0 0 60px;height:5px;border-radius:99px;background:var(--border-soft);overflow:hidden">' +
            '<div style="height:100%;background:var(--c-cian);border-radius:99px;transition:width .4s var(--e-out);width:' +
              Math.round(setsDone / x.s * 100) + '%"></div></div>' +
        '</div>';
      }).join('') : '<div class="empty"><div class="empty__s">Sin ejercicios cargados para este día.</div></div>';

      ejHost.addEventListener('click', function (e) {
        var b = e.target.closest('[data-set]'); if (!b) return;
        var i = +b.dataset.set, ex = exs[i];
        SL.store.update(function (st) {
          var lg = st.training.logs[day.date] || (st.training.logs[day.date] = { done: false, sets: {} });
          if (!lg.sets) lg.sets = {};
          lg.sets[i] = ((lg.sets[i] || 0) + 1) % (ex.s + 1);
          // Si se completaron todas las series de todos, el día se marca solo.
          var all = exs.every(function (y, k) { return (lg.sets[k] || 0) >= y.s; });
          if (all) lg.done = true;
        });
        if (navigator.vibrate) navigator.vibrate(8);
      });
    }

    /* — volumen — */
    SL.charts.bars(SL.$('[data-vol]', root), {
      height: 160,
      data: week.map(function (d, i) {
        var lg = s.training.logs[d.date];
        var planSets = (s.training.exercises[i] || []).reduce(function (a, x) { return a + x.s; }, 0);
        var done = lg && lg.sets ? Object.keys(lg.sets).reduce(function (a, k) { return a + lg.sets[k]; }, 0) : 0;
        return {
          label: SL.DIAS_C[i], full: SL.DIAS[i] + ' · ' + (s.training.split[i] || {}).name,
          rate: planSets ? Math.min(1, done / planSets) : null,
          done: done, total: planSets, future: d.future, today: i === todayIdx && weekOff === 0,
          color: 'cian'
        };
      })
    });

    /* — acciones — */
    SL.$('[data-dias]', root).addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]'); if (!b) return;
      pickedDay = +b.dataset.d; SL.render();
    });
    SL.$('[data-lado]', root).addEventListener('click', function (e) {
      var b = e.target.closest('[data-s]'); if (!b) return;
      side = b.dataset.s; SL.render();
    });
    SL.$$('[data-sem]', root).forEach(function (b) {
      b.addEventListener('click', function () { weekOff += +b.dataset.sem; SL.render(); });
    });
    SL.$('[data-sem-hoy]', root).addEventListener('click', function () {
      weekOff = 0; pickedDay = D.dow(D.today()); SL.render();
    });
    var hecho = SL.$('[data-hecho]', root);
    if (hecho) hecho.addEventListener('click', function () {
      SL.store.update(function (st) {
        var lg = st.training.logs[day.date] || (st.training.logs[day.date] = { done: false, sets: {} });
        lg.done = !lg.done;
      });
      SL.toast(log.done ? 'Desmarcado' : '💪 Entrenamiento registrado');
    });
    SL.$('[data-rutina]', root).addEventListener('click', function () { rutinaModal(pickedDay); });
  };

  function muscleColor(i) {
    return ['cian', 'violeta', 'verde', 'ambar', 'coral', 'rosa'][i % 6];
  }

  /* ————————————————— el cuerpo ————————————————— */
  function drawBody(host, active, view) {
    var NS = 'http://www.w3.org/2000/svg';
    host.innerHTML = '';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 260');
    svg.setAttribute('width', '100%');
    svg.setAttribute('style', 'max-width:230px;height:auto');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Mapa muscular: ' +
      (active.length ? active.map(function (m) { return MUSCLES[m].label; }).join(', ') : 'ninguno marcado'));

    function add(tag, attrs, parent) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    }

    var body = 'var(--card-2)';
    var edge = 'var(--border)';

    /* Silueta base — dos mitades espejadas, para que el cuerpo sea simétrico
       sin duplicar cada path a mano. */
    var silhouette = [
      'M100 18 Q88 18 87 30 Q86 40 92 45 L92 52 L74 58 Q58 63 55 78 L50 118 L48 148 Q47 156 54 157 Q60 157 61 149 L66 116 L70 96 L72 132 Q73 150 78 168 L80 200 L82 236 Q83 246 91 246 Q97 246 97 237 L98 200 L100 168 Z'
    ];
    var g = add('g', {});
    silhouette.forEach(function (d) {
      add('path', { d: d, fill: body, stroke: edge, 'stroke-width': 1, 'stroke-linejoin': 'round' }, g);
      add('path', { d: d, fill: body, stroke: edge, 'stroke-width': 1, 'stroke-linejoin': 'round',
        transform: 'translate(200,0) scale(-1,1)' }, g);
    });
    // Cabeza aparte, así no se refleja dos veces.
    add('ellipse', { cx: 100, cy: 30, rx: 13, ry: 15, fill: body, stroke: edge, 'stroke-width': 1 }, g);

    /* Grupos activos, encima de la silueta */
    active.forEach(function (key, i) {
      var mus = MUSCLES[key];
      if (!mus) return;
      if (mus.view !== 'both' && mus.view !== view) return;
      var col = 'var(--c-' + muscleColor(i) + ')';
      mus.paths.forEach(function (d) {
        [1, -1].forEach(function (sx) {
          var p = add('path', {
            d: d, fill: col, opacity: 0,
            stroke: col, 'stroke-width': .5, 'stroke-linejoin': 'round',
            transform: sx === -1 ? 'translate(200,0) scale(-1,1)' : ''
          });
          p.style.filter = 'drop-shadow(0 0 7px ' + col + ')';
          p.style.transition = 'opacity .5s var(--e-out) ' + (i * 90) + 'ms';
          requestAnimationFrame(function () { p.setAttribute('opacity', '.9'); });
        });
      });
    });

    if (!active.length) {
      add('text', {
        x: 100, y: 256, 'text-anchor': 'middle', fill: 'var(--text-3)',
        'font-size': 9, 'font-family': 'var(--font)'
      }).textContent = 'Día de descanso';
    }

    host.appendChild(svg);
  }

  /* ————————————————— editar la rutina del día ————————————————— */
  function rutinaModal(dayIdx) {
    var s = SL.store.get();
    var plan = s.training.split[dayIdx] || { day: dayIdx, name: '', muscles: [] };
    var sel = plan.muscles.slice();
    var exs = (s.training.exercises[dayIdx] || []).slice();

    var body = SL.h('<div style="display:grid;gap:var(--s4)">' +
      '<div class="field"><label class="field__l">Nombre del día</label>' +
        '<input class="input" data-n value="' + esc(plan.name) + '" placeholder="Ej: Pecho y Bíceps"></div>' +
      '<div class="field"><label class="field__l">Músculos que se trabajan</label>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap" data-mus>' +
          Object.keys(MUSCLES).map(function (k) {
            return '<button type="button" class="seg__b' + (sel.indexOf(k) !== -1 ? ' is-on' : '') +
              '" data-m="' + k + '" style="border:1px solid var(--border)">' + esc(MUSCLES[k].label) + '</button>';
          }).join('') +
        '</div></div>' +
      '<div class="field"><label class="field__l">Ejercicios</label>' +
        '<div data-exs style="display:grid;gap:6px"></div>' +
        '<button type="button" class="btn btn--sm" data-add style="width:fit-content;margin-top:6px">' +
          SL.icon('mas') + 'Agregar ejercicio</button></div>' +
    '</div>');

    function paintExs() {
      var host = SL.$('[data-exs]', body);
      host.innerHTML = exs.map(function (x, i) {
        return '<div style="display:grid;grid-template-columns:1fr 46px 62px 60px 30px;gap:6px;align-items:center">' +
          '<input class="input" data-x="n" data-i="' + i + '" value="' + esc(x.n) + '" placeholder="Ejercicio">' +
          '<input class="input" data-x="s" data-i="' + i + '" type="number" min="1" value="' + x.s + '" title="Series">' +
          '<input class="input" data-x="r" data-i="' + i + '" value="' + esc(x.r) + '" title="Reps">' +
          '<input class="input" data-x="w" data-i="' + i + '" type="number" min="0" value="' + x.w + '" title="Kg">' +
          '<button type="button" class="icon-btn" data-rm="' + i + '">' + SL.icon('x') + '</button>' +
        '</div>';
      }).join('') || '<div class="card__sub">Sin ejercicios.</div>';
    }
    paintExs();

    body.addEventListener('click', function (e) {
      var m = e.target.closest('[data-m]');
      if (m) {
        var k = sel.indexOf(m.dataset.m);
        if (k === -1) sel.push(m.dataset.m); else sel.splice(k, 1);
        m.classList.toggle('is-on', k === -1);
        return;
      }
      if (e.target.closest('[data-add]')) { exs.push({ n: '', s: 3, r: '10', w: 0 }); paintExs(); return; }
      var rm = e.target.closest('[data-rm]');
      if (rm) { exs.splice(+rm.dataset.rm, 1); paintExs(); }
    });
    body.addEventListener('input', function (e) {
      var f = e.target.dataset.x; if (!f) return;
      var i = +e.target.dataset.i;
      exs[i][f] = f === 's' || f === 'w' ? +e.target.value : e.target.value;
    });

    SL.modal({
      title: 'Rutina de ' + SL.DIAS[dayIdx], body: body, okText: 'Guardar rutina',
      onOk: function (b) {
        var name = SL.$('[data-n]', b).value.trim() || (sel.length ? 'Entrenamiento' : 'Descanso');
        SL.store.update(function (st) {
          st.training.split[dayIdx] = { day: dayIdx, name: name, muscles: sel };
          st.training.exercises[dayIdx] = exs.filter(function (x) { return x.n.trim(); });
        });
        SL.toast('Rutina guardada');
        return true;
      }
    });
  }

})(window.SL = window.SL || {});
