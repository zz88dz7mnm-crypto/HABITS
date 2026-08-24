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

  /* Grupos musculares.
     Todas las formas están dibujadas sobre la mitad izquierda de un lienzo
     de 200×260 y se reflejan sobre el eje central (x = 100). Así el cuerpo
     sale simétrico sin escribir cada músculo dos veces, y con corregir una
     forma quedan bien los dos lados. */
  var MUSCLES = {
    pecho:      { label: 'Pecho',      view: 'front', paths: ['M100 63 L85 65 Q80 70 82 79 Q88 87 100 87 Z'] },
    hombros:    { label: 'Hombros',    view: 'both',  paths: ['M79 54 Q68 56 64 65 Q62 72 65 77 L75 73 Q76 61 81 57 Z'] },
    biceps:     { label: 'Bíceps',     view: 'front', paths: ['M65 79 Q60 90 60 102 Q61 110 65 109 Q69 96 72 82 Z'] },
    triceps:    { label: 'Tríceps',    view: 'back',  paths: ['M64 79 Q58 91 58 104 Q59 111 64 110 Q68 97 71 82 Z'] },
    antebrazo:  { label: 'Antebrazo',  view: 'both',  paths: ['M60 117 Q56 129 56 140 Q57 146 61 145 Q63 132 64 119 Z'] },
    abdomen:    { label: 'Abdomen',    view: 'front', paths: ['M100 89 L85 89 Q81 104 83 123 Q91 130 100 130 Z'] },
    oblicuos:   { label: 'Oblicuos',   view: 'front', paths: ['M83 91 Q77 104 79 121 Q81 126 84 124 Q81 108 84 91 Z'] },
    espalda:    { label: 'Espalda',    view: 'back',  paths: ['M100 61 L83 64 Q77 77 81 94 Q88 106 100 108 Z'] },
    lumbar:     { label: 'Lumbar',     view: 'back',  paths: ['M100 113 L85 113 Q81 122 85 131 Q93 135 100 134 Z'] },
    trapecio:   { label: 'Trapecio',   view: 'back',  paths: ['M100 47 L83 53 Q78 59 82 63 Q92 59 100 59 Z'] },
    gluteos:    { label: 'Glúteos',    view: 'back',  paths: ['M100 139 L85 137 Q78 145 81 156 Q90 162 100 158 Z'] },
    cuadriceps: { label: 'Cuádriceps', view: 'front', paths: ['M98 149 L86 147 Q81 163 82 182 Q85 194 91 192 Q96 170 98 151 Z'] },
    isquios:    { label: 'Isquios',    view: 'back',  paths: ['M98 161 L85 159 Q81 176 83 193 Q87 201 92 199 Q96 180 98 163 Z'] },
    gemelos:    { label: 'Gemelos',    view: 'both',  paths: ['M94 203 Q88 207 86 219 Q85 231 89 234 L93 233 Q95 218 95 205 Z'] }
  };

  /* La silueta, también en mitades. Se dibuja por partes —torso, hombro,
     brazo, antebrazo, mano, muslo, pantorrilla y pie— en vez de con un
     contorno único: así los brazos se despegan del cuerpo y las piernas se
     separan, que es lo que hace que se lea como un cuerpo y no como una mancha. */
  var SILUETA = [
    'M100 48 L79 54 Q72 59 74 69 L77 97 Q79 113 83 125 L85 141 L100 144 Z',  // torso
    'M79 52 Q67 55 63 65 Q61 73 64 79 L75 74 Q76 60 81 56 Z',                // deltoides
    'M64 77 Q58 90 58 103 Q58 112 63 113 Q68 99 73 80 Z',                    // brazo
    'M59 115 Q54 129 54 142 Q55 150 60 149 Q63 134 64 117 Z',                // antebrazo
    'M55 151 Q51 157 53 163 Q57 166 60 162 Q61 155 60 151 Z',                // mano
    'M100 146 L85 143 Q79 161 80 183 Q81 197 86 199 L95 197 Q99 172 100 149 Z', // muslo
    'M95 201 Q87 205 85 220 Q84 234 88 238 L94 237 Q97 220 97 203 Z',        // pantorrilla
    'M88 240 Q83 246 84 251 L97 251 Q98 245 95 241 Z'                        // pie
  ];

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

    var g = add('g', {});
    SILUETA.forEach(function (d) {
      add('path', { d: d, fill: body, stroke: edge, 'stroke-width': 1, 'stroke-linejoin': 'round' }, g);
      add('path', { d: d, fill: body, stroke: edge, 'stroke-width': 1, 'stroke-linejoin': 'round',
        transform: 'translate(200,0) scale(-1,1)' }, g);
    });
    // Cuello y cabeza van enteros: están sobre el eje, no se reflejan.
    add('path', { d: 'M93 36 h14 v13 h-14 Z', fill: body, stroke: edge, 'stroke-width': 1 }, g);
    add('ellipse', { cx: 100, cy: 26, rx: 12.5, ry: 14.5, fill: body, stroke: edge, 'stroke-width': 1 }, g);

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
          p.style.filter = 'drop-shadow(0 0 4px ' + col + ')';
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
