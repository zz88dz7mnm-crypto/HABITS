/* ============================================================
   Zenit · Entrenamiento
   Rutina de la semana + mapa muscular: qué se trabaja hoy,
   marcado sobre el cuerpo en vez de escrito en una lista.
   ============================================================ */
(function (SL) {
  'use strict';

  var C = SL.compute, D = SL.date, esc = SL.esc;
  var weekOff = 0;
  var pickedDay = null;
  var side = 'front';

  /* ============================================================
     El cuerpo
     Lienzo de 200x320, centro en x=100. Todo se dibuja sobre la mitad
     izquierda y se refleja: el cuerpo sale simétrico y corregir una
     forma arregla los dos lados.

     Proporciones de canon: cabeza 1/8 de la altura, hombros al ancho de
     dos cabezas, cintura marcada, rodilla a 3/4. La silueta va por
     partes —torso, brazo, pierna, pie— para que los brazos se despeguen
     del cuerpo y las piernas se separen.
     ============================================================ */
  var CUERPO = {
    // Mitad izquierda, se refleja sobre x=100
    silueta: [
      // torso: cuello → trapecio → hombro → dorsal → cintura → cadera
      'M100 54 C93 55 85 58 79 64 C71 70 63 76 60 86 L59 98 ' +
      'C62 110 67 122 70 134 L73 150 C73 160 71 168 69 176 ' +
      'C68 184 70 190 75 194 L100 196 Z',
      // brazo entero: deltoides → bíceps → codo → antebrazo → muñeca
      'M61 84 C51 89 46 100 46 114 C46 130 48 141 50 151 ' +
      'C48 166 46 181 46 195 C46 203 49 208 54 208 C58 208 61 203 60 195 ' +
      'C60 180 61 165 62 152 C63 138 64 112 65 90 Z',
      // mano
      'M54 210 C48 214 46 222 48 230 C51 236 57 237 60 232 C62 224 61 214 58 210 Z',
      // pierna: muslo → rodilla → pantorrilla → tobillo
      'M98 198 L76 196 C69 210 66 228 67 244 C68 252 70 258 73 262 ' +
      'C71 274 70 288 71 299 C72 306 75 310 79 310 C85 310 88 306 88 299 ' +
      'C89 286 91 272 93 261 C95 246 97 222 98 202 Z',
      // pie
      'M72 312 C67 316 65 322 67 326 L90 326 C92 320 90 314 87 312 Z'
    ],
    // Sobre el eje, no se reflejan
    centro: [
      'M91 40 L109 40 L109 58 L91 58 Z'                       // cuello
    ]
  };

  /* Grupos musculares. Las formas siguen la anatomía real: el pectoral
     es un abanico desde el esternón, el dorsal la V que sube al hueco de
     la axila, el vasto medial la lágrima arriba de la rodilla. */
  var MUSCLES = {
    /* ---------- frente ---------- */
    pecho: {
      label: 'Pecho', view: 'front',
      // Abanico desde el esternón: borde superior sobre la clavícula,
      // borde externo hacia la axila, borde inferior de vuelta al centro.
      paths: ['M97 78 L77 83 C70 88 67 95 68 102 C76 109 87 113 97 113 Z']
    },
    hombros: {
      label: 'Hombros', view: 'both',
      paths: ['M65 78 C55 83 50 94 50 106 C50 112 54 115 58 113 C61 105 62 90 67 83 Z']
    },
    biceps: {
      label: 'Bíceps', view: 'front',
      paths: ['M62 98 C55 103 52 115 53 127 C54 137 58 143 62 141 C63 128 63 111 65 100 Z']
    },
    triceps: {
      label: 'Tríceps', view: 'back',
      // Herradura: cabeza larga interna y lateral externa
      paths: ['M62 96 C55 101 51 114 52 128 C53 138 57 144 61 142 C62 127 62 110 64 98 Z',
              'M57 106 C53 116 52 126 54 134']
    },
    antebrazo: {
      label: 'Antebrazo', view: 'both',
      paths: ['M57 150 C51 160 49 174 50 188 C51 196 55 200 58 197 C60 183 60 164 61 152 Z']
    },
    abdomen: {
      label: 'Abdomen', view: 'front',
      // El recto abdominal se dibuja segmentado. Un bloque liso no se lee
      // como abdomen: son las intersecciones tendinosas las que lo hacen.
      paths: [
        'M98 116 L88 118 C87 124 87 129 88 134 L98 133 Z',
        'M98 137 L88 138 C87 144 87 149 88 154 L98 153 Z',
        'M98 157 L88 158 C88 163 88 167 89 172 L98 171 Z',
        'M98 175 L89 175 C90 180 92 184 96 187 L98 187 Z'
      ]
    },
    oblicuos: {
      label: 'Oblicuos', view: 'front',
      paths: ['M86 118 C78 126 75 142 77 160 C79 168 83 172 86 172 C83 154 83 134 86 120 Z']
    },
    serrato: {
      label: 'Serrato', view: 'front',
      paths: ['M79 102 L71 106', 'M80 110 L72 115', 'M82 118 L75 123'],
      trazo: true
    },
    /* ---------- espalda ---------- */
    trapecio: {
      label: 'Trapecio', view: 'back',
      // Fibras altas hacia el hombro, y las bajas bajando junto a la columna.
      paths: ['M97 57 C88 59 80 64 74 72 C72 76 74 80 78 79 C85 73 91 70 97 69 Z',
              'M97 73 C90 77 84 85 81 95 C80 102 83 108 86 109 C90 99 94 90 97 85 Z']
    },
    dorsal: {
      label: 'Dorsal', view: 'back',
      // La V al revés: ancho en la zona lumbar y angostándose al subir
      // hasta el hueco de la axila. Es lo que da la espalda en V.
      paths: ['M97 102 C90 108 83 118 79 131 C76 142 76 152 80 160 C84 165 89 163 91 158 C94 142 96 119 97 106 Z']
    },
    espalda: {
      label: 'Espalda media', view: 'back',
      // Romboides: entre la columna y el omóplato.
      paths: ['M97 88 C91 91 86 97 84 105 C83 111 85 116 88 117 C91 109 94 100 97 96 Z']
    },
    lumbar: {
      label: 'Lumbar', view: 'back',
      paths: ['M99 152 L88 154 C86 162 86 174 88 182 C92 187 96 187 99 184 Z']
    },
    gluteos: {
      label: 'Glúteos', view: 'back',
      paths: ['M99 184 C88 183 79 188 75 198 C73 209 76 219 83 223 C91 225 96 221 99 214 Z']
    },
    /* ---------- piernas ---------- */
    cuadriceps: {
      label: 'Cuádriceps', view: 'front',
      paths: [
        'M85 198 C75 205 70 223 71 241 C72 249 76 253 80 251 C83 233 84 213 86 200 Z', // vasto lateral
        'M97 198 L87 200 C85 217 85 236 87 250 C90 253 94 252 96 248 C97 230 97 212 97 200 Z', // recto femoral
        'M96 234 C91 236 89 244 90 252 C92 258 96 259 98 255 C98 246 97 238 96 234 Z'  // vasto medial
      ]
    },
    aductores: {
      label: 'Aductores', view: 'front',
      paths: ['M99 196 L89 198 C87 212 88 228 91 238 C95 240 98 238 99 234 Z']
    },
    isquios: {
      label: 'Isquios', view: 'back',
      paths: ['M97 218 L83 220 C78 232 77 246 79 256 C83 261 89 260 92 255 C95 242 96 230 97 220 Z']
    },
    gemelos: {
      label: 'Gemelos', view: 'back',
      paths: [
        'M93 264 C86 268 83 279 84 291 C86 298 90 300 93 296 C95 283 94 272 93 264 Z',
        'M83 266 C79 272 78 282 80 290'
      ]
    }
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
    svg.setAttribute('viewBox', '0 0 200 336');
    svg.setAttribute('width', '100%');
    svg.setAttribute('style', 'max-width:250px;height:auto');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Mapa muscular: ' +
      (active.length ? active.map(function (m) { return MUSCLES[m] ? MUSCLES[m].label : m; }).join(', ')
                     : 'ninguno marcado'));

    function add(tag, attrs, parent) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    }
    var espejo = 'translate(200,0) scale(-1,1)';

    var relleno = 'var(--card-2)';
    var borde = 'var(--border)';

    /* — silueta — */
    var g = add('g', {});
    CUERPO.silueta.forEach(function (d) {
      [null, espejo].forEach(function (tr) {
        add('path', {
          d: d, fill: relleno, stroke: borde, 'stroke-width': 1,
          'stroke-linejoin': 'round', transform: tr
        }, g);
      });
    });
    CUERPO.centro.forEach(function (d) {
      add('path', { d: d, fill: relleno, stroke: borde, 'stroke-width': 1 }, g);
    });
    add('ellipse', { cx: 100, cy: 26, rx: 15, ry: 19, fill: relleno, stroke: borde, 'stroke-width': 1 }, g);

    /* — línea del esternón o de la columna: da referencia y hace que el
         torso se lea como torso y no como una mancha — */
    add('path', {
      d: view === 'front' ? 'M100 66 L100 178' : 'M100 60 L100 186',
      stroke: borde, 'stroke-width': 1, fill: 'none', opacity: .8
    }, g);

    /* — grupos activos — */
    var pintados = 0;
    active.forEach(function (key, i) {
      var mus = MUSCLES[key];
      if (!mus) return;
      if (mus.view !== 'both' && mus.view !== view) return;
      var col = 'var(--c-' + muscleColor(pintados) + ')';
      pintados++;

      mus.paths.forEach(function (d) {
        [null, espejo].forEach(function (tr) {
          var atrs = mus.trazo
            ? { d: d, fill: 'none', stroke: col, 'stroke-width': 2.4, 'stroke-linecap': 'round' }
            : { d: d, fill: col, stroke: col, 'stroke-width': .6, 'stroke-linejoin': 'round' };
          atrs.opacity = 0;
          atrs.transform = tr;
          var pth = add('path', atrs);
          pth.style.filter = 'drop-shadow(0 0 2.5px ' + col + ')';
          pth.style.transition = 'opacity .45s var(--e-out) ' + (i * 80) + 'ms';
          requestAnimationFrame(function () { pth.setAttribute('opacity', mus.trazo ? '.85' : '.88'); });
        });
      });
    });

    if (!pintados) {
      add('text', {
        x: 100, y: 334, 'text-anchor': 'middle', fill: 'var(--text-3)',
        'font-size': 10, 'font-family': 'var(--font)'
      }).textContent = active.length ? 'Nada de este lado' : 'Día de descanso';
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
