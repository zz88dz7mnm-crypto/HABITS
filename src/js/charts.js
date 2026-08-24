/* ============================================================
   StarkLab Web · Motor de gráficos
   SVG escrito a mano, sin librerías. Reglas que sigue todo lo
   que se dibuja acá:
     · Una sola escala por gráfico. Nunca dos ejes Y.
     · La grilla y los ejes son recesivos; el dato es lo brillante.
     · El texto usa tokens de texto, nunca el color de la serie:
       el color lo lleva la marca al lado, no el número.
     · Marcas finas, extremos redondeados de 4px apoyados en la
       base, 2px de aire entre porciones contiguas.
     · Etiquetas directas sólo donde hacen falta, no en cada punto.
     · Todo gráfico tiene capa de hover y equivalente en tabla.
   ============================================================ */
(function (SL) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function habitColor(c) { return cssVar('--c-' + c) || cssVar('--accent'); }

  var reduce = function () {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /* ————————————————— tooltip compartido ————————————————— */
  var tip = null;
  function tooltip() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.setAttribute('role', 'status');
    tip.setAttribute('aria-live', 'polite');
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(html, x, y) {
    var t = tooltip();
    t.innerHTML = html;
    t.classList.add('is-on');
    var r = t.getBoundingClientRect();
    var pad = 12;
    var left = x - r.width / 2;
    left = Math.max(pad, Math.min(window.innerWidth - r.width - pad, left));
    var top = y - r.height - 14;
    if (top < pad) top = y + 20;              // se da vuelta si no entra arriba
    t.style.transform = 'translate3d(' + Math.round(left) + 'px,' + Math.round(top) + 'px,0)';
  }
  function hideTip() { if (tip) tip.classList.remove('is-on'); }
  SL.hideTip = hideTip;

  /* Formateadores */
  var fmt = {
    pct: function (v) { return Math.round(v * 100) + '%'; },
    money: function (v, cur) {
      var sym = { USD: '$', ARS: '$', EUR: '€', BRL: 'R$', GBP: '£' }[cur] || '$';
      return sym + Math.abs(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    compact: function (v) {
      if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace('.0', '') + 'M';
      if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1).replace('.0', '') + 'k';
      return '' + Math.round(v);
    }
  };
  SL.fmt = fmt;

  /* Re-dibuja cuando cambia el tamaño o el tema. */
  function responsive(node, draw) {
    var raf = null;
    function go() { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(go);
      ro.observe(node);
      node._ro && node._ro.disconnect();
      node._ro = ro;
    } else {
      window.addEventListener('resize', go);
    }
    node._redraw = draw;
    draw();
  }
  /* El cambio de tema reescribe las variables CSS: hay que releerlas. */
  SL.redrawCharts = function (root) {
    (root || document).querySelectorAll('[data-chart]').forEach(function (n) {
      if (n._redraw) n._redraw();
    });
  };

  /* Ruta suave (Catmull-Rom → Bézier). Tensión baja para que no invente
     picos que el dato no tiene. */
  function smooth(pts, tension) {
    if (pts.length < 2) return '';
    if (pts.length === 2) return 'M' + pts[0][0] + ',' + pts[0][1] + 'L' + pts[1][0] + ',' + pts[1][1];
    var t = tension === undefined ? 0.22 : tension;
    var d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += 'C' + (p1[0] + (p2[0] - p0[0]) * t) + ',' + (p1[1] + (p2[1] - p0[1]) * t) +
           ' ' + (p2[0] - (p3[0] - p1[0]) * t) + ',' + (p2[1] - (p3[1] - p1[1]) * t) +
           ' ' + p2[0] + ',' + p2[1];
    }
    return d;
  }

  function frame(node, h) {
    node.innerHTML = '';
    var w = node.clientWidth || node.getBoundingClientRect().width || 640;
    var height = h || node.clientHeight || 240;
    var svg = el('svg', {
      viewBox: '0 0 ' + w + ' ' + height,
      width: w, height: height,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img'
    }, node);
    return { svg: svg, w: w, h: height };
  }

  /* ============================================================
     LÍNEA — Progreso mensual de cumplimiento
     Una sola escala 0–100%. Los días futuros no se dibujan, y los
     días sin nada agendado cortan la línea en vez de valer 0%.
     ============================================================ */
  function line(node, opt) {
    node.setAttribute('data-chart', 'line');
    responsive(node, function () {
      var data = opt.data || [];
      var f = frame(node, opt.height || 260);
      var svg = f.svg, w = f.w, h = f.h;
      var m = { t: 18, r: 16, b: 26, l: 42 };
      var iw = Math.max(10, w - m.l - m.r), ih = Math.max(10, h - m.t - m.b);
      var id = 'ln' + (++uid);

      svg.setAttribute('aria-label', opt.label || 'Progreso mensual de cumplimiento de hábitos');

      var real = data.filter(function (d) { return d.rate !== null && !d.future; });
      var maxDay = data.length || 31;
      var X = function (day) { return m.l + ((day - 1) / Math.max(1, maxDay - 1)) * iw; };
      var Y = function (v) { return m.t + (1 - v) * ih; };

      /* — grilla recesiva — */
      var g = el('g', { 'stroke-width': 1 }, svg);
      [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
        el('line', {
          x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v),
          stroke: 'var(--border-soft)', 'stroke-dasharray': v === 0 ? '' : '2 5'
        }, g);
        el('text', {
          x: m.l - 10, y: Y(v) + 4, 'text-anchor': 'end',
          fill: 'var(--text-3)', 'font-size': 10, 'font-family': 'var(--font)'
        }, svg).textContent = Math.round(v * 100) + '%';
      });
      // Eje X: cada 3 días, para que no se pisen las etiquetas.
      for (var d = 1; d <= maxDay; d += 3) {
        el('text', {
          x: X(d), y: h - 8, 'text-anchor': 'middle',
          fill: 'var(--text-3)', 'font-size': 10, 'font-family': 'var(--font)'
        }, svg).textContent = d;
      }

      if (!real.length) {
        el('text', {
          x: w / 2, y: h / 2, 'text-anchor': 'middle',
          fill: 'var(--text-3)', 'font-size': 12, 'font-family': 'var(--font)'
        }, svg).textContent = 'Sin datos todavía';
        return;
      }

      /* — Segmentos: los huecos (días sin hábitos agendados) cortan la línea — */
      var segs = [], cur = [];
      data.forEach(function (p) {
        if (p.rate === null || p.future) { if (cur.length) { segs.push(cur); cur = []; } return; }
        cur.push([X(p.day), Y(p.rate)]);
      });
      if (cur.length) segs.push(cur);

      var stroke = opt.color || 'var(--accent)';

      var defs = el('defs', null, svg);
      var grad = el('linearGradient', { id: id + 'f', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el('stop', { offset: '0', 'stop-color': stroke, 'stop-opacity': .26 }, grad);
      el('stop', { offset: '1', 'stop-color': stroke, 'stop-opacity': 0 }, grad);

      segs.forEach(function (pts) {
        if (pts.length > 1) {
          var dPath = smooth(pts);
          el('path', {
            d: dPath + 'L' + pts[pts.length - 1][0] + ',' + Y(0) + 'L' + pts[0][0] + ',' + Y(0) + 'Z',
            fill: 'url(#' + id + 'f)', stroke: 'none'
          }, svg);
          var p = el('path', {
            d: dPath, fill: 'none', stroke: stroke, 'stroke-width': 2,
            'stroke-linecap': 'round', 'stroke-linejoin': 'round'
          }, svg);
          if (!reduce()) {
            var len = p.getTotalLength();
            p.style.strokeDasharray = len;
            p.style.strokeDashoffset = len;
            p.style.transition = 'stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)';
            requestAnimationFrame(function () { p.style.strokeDashoffset = 0; });
          }
        } else {
          el('circle', { cx: pts[0][0], cy: pts[0][1], r: 3, fill: stroke }, svg);
        }
      });

      /* — Marcas de los días con nota: por qué bajó, no sólo cuánto — */
      data.forEach(function (p) {
        if (!p.note || p.rate === null) return;
        el('circle', {
          cx: X(p.day), cy: Y(p.rate), r: 4.5,
          fill: 'var(--card)', stroke: stroke, 'stroke-width': 2
        }, svg);
        el('circle', { cx: X(p.day), cy: Y(p.rate), r: 1.6, fill: stroke }, svg);
      });

      /* — Último punto + etiqueta directa (una sola, no una por punto) — */
      var last = real[real.length - 1];
      el('circle', { cx: X(last.day), cy: Y(last.rate), r: 8, fill: stroke, opacity: .16 }, svg);
      el('circle', {
        cx: X(last.day), cy: Y(last.rate), r: 3.5, fill: stroke,
        stroke: 'var(--card)', 'stroke-width': 2
      }, svg);

      /* — Serie de comparación (mes anterior), si la piden — */
      if (opt.compare && opt.compare.length) {
        var cp = [];
        opt.compare.forEach(function (p) {
          if (p.rate === null) return;
          cp.push([X(p.day), Y(p.rate)]);
        });
        if (cp.length > 1) {
          el('path', {
            d: smooth(cp), fill: 'none', stroke: 'var(--text-3)', 'stroke-width': 1.5,
            'stroke-dasharray': '4 4', opacity: .75, 'stroke-linecap': 'round'
          }, svg);
        }
      }

      /* — Capa de hover: crosshair + tooltip — */
      var cross = el('line', {
        y1: m.t, y2: m.t + ih, stroke: 'var(--text-3)', 'stroke-width': 1,
        'stroke-dasharray': '3 3', opacity: 0
      }, svg);
      var dot = el('circle', { r: 4, fill: stroke, stroke: 'var(--card)', 'stroke-width': 2, opacity: 0 }, svg);

      var hit = el('rect', {
        x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent',
        style: 'cursor:crosshair'
      }, svg);

      function nearest(clientX) {
        var box = svg.getBoundingClientRect();
        var px = (clientX - box.left) * (w / box.width);
        var day = Math.round(((px - m.l) / iw) * (maxDay - 1)) + 1;
        day = Math.max(1, Math.min(maxDay, day));
        var p = data[day - 1];
        if (!p || p.rate === null) {
          // busca el más cercano con dato
          var best = null, bd = 1e9;
          real.forEach(function (r) { var dd = Math.abs(r.day - day); if (dd < bd) { bd = dd; best = r; } });
          p = best;
        }
        return p;
      }

      function move(e) {
        var cx = e.touches ? e.touches[0].clientX : e.clientX;
        var p = nearest(cx);
        if (!p) return;
        var x = X(p.day), y = Y(p.rate);
        cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('opacity', .55);
        dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('opacity', 1);
        var box = svg.getBoundingClientRect();
        var sx = box.left + (x / w) * box.width, sy = box.top + (y / h) * box.height;
        var html = '<b>' + (opt.tipTitle ? opt.tipTitle(p) : 'Día ' + p.day) + '</b>' +
                   '<span class="chart-tip__v">' + fmt.pct(p.rate) + ' de cumplimiento</span>';
        if (p.note) html += '<span class="chart-tip__note">' + p.note.emoji + ' ' + escape_(p.note.text) + '</span>';
        showTip(html, sx, sy);
      }
      function leave() {
        cross.setAttribute('opacity', 0);
        dot.setAttribute('opacity', 0);
        hideTip();
      }
      hit.addEventListener('mousemove', move);
      hit.addEventListener('mouseleave', leave);
      hit.addEventListener('touchstart', move, { passive: true });
      hit.addEventListener('touchmove', move, { passive: true });
      hit.addEventListener('touchend', leave);
    });
  }

  // Definido en ui.js, que carga antes que todo lo demás.
  var escape_ = function (s) { return SL.esc(s); };

  /* ============================================================
     TORTA (dona) — Gastos por categoría
     2px de aire entre porciones. El total va en el centro, que si
     no es un agujero desperdiciado.
     ============================================================ */
  function donut(node, opt) {
    node.setAttribute('data-chart', 'donut');
    responsive(node, function () {
      var data = (opt.data || []).filter(function (d) { return d.value > 0; });
      var f = frame(node, opt.height || 240);
      var svg = f.svg, w = f.w, h = f.h;
      var cx = w / 2, cy = h / 2;
      var R = Math.max(30, Math.min(w, h) / 2 - 8);
      var r = R * (opt.inner || 0.62);

      svg.setAttribute('aria-label', opt.label || 'Distribución de gastos por categoría');

      var total = data.reduce(function (a, d) { return a + d.value; }, 0);
      if (!total) {
        el('circle', { cx: cx, cy: cy, r: (R + r) / 2, fill: 'none', stroke: 'var(--border)', 'stroke-width': R - r }, svg);
        el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', fill: 'var(--text-3)', 'font-size': 12, 'font-family': 'var(--font)' }, svg)
          .textContent = 'Sin gastos';
        return;
      }

      // 2px de separación, expresados en ángulo sobre el radio medio.
      var gapPx = 2;
      var gap = gapPx / ((R + r) / 2);
      var a0 = -Math.PI / 2;
      var g = el('g', null, svg);

      data.forEach(function (d, i) {
        var frac = d.value / total;
        var sweep = frac * Math.PI * 2;
        var s = a0 + gap / 2, e = a0 + sweep - gap / 2;
        if (e <= s) e = s + 0.004;                       // porciones diminutas siguen visibles
        var col = habitColor(d.color);
        var path = el('path', {
          d: arc(cx, cy, R, r, s, e),
          fill: col,
          'data-i': i,
          style: 'cursor:pointer;transition:opacity .18s,transform .22s cubic-bezier(.16,1,.3,1);transform-origin:' + cx + 'px ' + cy + 'px'
        }, g);

        path.addEventListener('mouseenter', function (ev) {
          Array.prototype.forEach.call(g.children, function (c) { c.style.opacity = c === path ? 1 : .32; });
          path.style.transform = 'scale(1.035)';
          center(d.name, fmt.money(d.value, opt.currency), Math.round(frac * 100) + '%');
          var b = svg.getBoundingClientRect();
          var mid = (s + e) / 2, rr = (R + r) / 2;
          showTip(
            '<b>' + escape_(d.name) + '</b><span class="chart-tip__v">' + fmt.money(d.value, opt.currency) +
            ' · ' + Math.round(frac * 100) + '%</span>',
            b.left + ((cx + Math.cos(mid) * rr) / w) * b.width,
            b.top + ((cy + Math.sin(mid) * rr) / h) * b.height
          );
        });
        path.addEventListener('mouseleave', function () {
          Array.prototype.forEach.call(g.children, function (c) { c.style.opacity = 1; });
          path.style.transform = '';
          center();
          hideTip();
        });
        if (opt.onPick) path.addEventListener('click', function () { opt.onPick(d); });

        a0 += sweep;
      });

      /* — Centro: total, o el detalle de la porción con el mouse encima — */
      var tTop = el('text', {
        x: cx, y: cy - 9, 'text-anchor': 'middle', fill: 'var(--text-3)',
        'font-size': 10, 'font-family': 'var(--font)', 'letter-spacing': '.1em'
      }, svg);
      var tMid = el('text', {
        x: cx, y: cy + 12, 'text-anchor': 'middle', fill: 'var(--text)',
        'font-size': Math.max(15, Math.min(24, R * 0.34)), 'font-weight': 700, 'font-family': 'var(--font)'
      }, svg);
      var tBot = el('text', {
        x: cx, y: cy + 29, 'text-anchor': 'middle', fill: 'var(--text-3)',
        'font-size': 10, 'font-family': 'var(--font)'
      }, svg);
      tTop.style.pointerEvents = tMid.style.pointerEvents = tBot.style.pointerEvents = 'none';

      function center(top, mid, bot) {
        tTop.textContent = (top || opt.centerLabel || 'TOTAL').toUpperCase();
        tMid.textContent = mid || fmt.money(total, opt.currency);
        tBot.textContent = bot || (data.length + ' categorías');
      }
      center();

      if (!reduce()) {
        g.style.opacity = 0;
        g.style.transform = 'rotate(-14deg)';
        g.style.transformOrigin = cx + 'px ' + cy + 'px';
        g.style.transition = 'opacity .5s ease, transform .7s cubic-bezier(.16,1,.3,1)';
        requestAnimationFrame(function () { g.style.opacity = 1; g.style.transform = 'rotate(0)'; });
      }
    });
  }

  function arc(cx, cy, R, r, a0, a1) {
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    var x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R;
    var x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
    var x2 = cx + Math.cos(a1) * r, y2 = cy + Math.sin(a1) * r;
    var x3 = cx + Math.cos(a0) * r, y3 = cy + Math.sin(a0) * r;
    return 'M' + x0 + ',' + y0 +
           'A' + R + ',' + R + ' 0 ' + large + ' 1 ' + x1 + ',' + y1 +
           'L' + x2 + ',' + y2 +
           'A' + r + ',' + r + ' 0 ' + large + ' 0 ' + x3 + ',' + y3 + 'Z';
  }

  /* ============================================================
     BARRAS — Cumplimiento semanal
     Extremos redondeados de 4px apoyados en la base; 2px de aire
     entre barras vecinas.
     ============================================================ */
  function bars(node, opt) {
    node.setAttribute('data-chart', 'bars');
    responsive(node, function () {
      var data = opt.data || [];
      var f = frame(node, opt.height || 160);
      var svg = f.svg, w = f.w, h = f.h;
      var m = { t: 14, r: 8, b: 26, l: 8 };
      var iw = w - m.l - m.r, ih = h - m.t - m.b;
      svg.setAttribute('aria-label', opt.label || 'Cumplimiento por día de la semana');

      var n = data.length || 7;
      var slot = iw / n;
      var bw = Math.min(opt.maxBar || 44, slot - 6);

      // Base
      el('line', { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih, stroke: 'var(--border)', 'stroke-width': 1 }, svg);

      data.forEach(function (d, i) {
        var x = m.l + slot * i + (slot - bw) / 2;
        var v = d.rate === null || d.rate === undefined ? 0 : d.rate;
        var bh = Math.max(v > 0 ? 3 : 0, v * ih);
        var y = m.t + ih - bh;
        var col = d.color ? habitColor(d.color) : 'var(--accent)';

        // Riel de fondo: muestra cuánto faltó, sin gritar.
        el('rect', {
          x: x, y: m.t, width: bw, height: ih, rx: 4,
          fill: 'var(--border-soft)', opacity: d.future ? .45 : .8
        }, svg);

        if (d.future) {
          el('text', {
            x: x + bw / 2, y: h - 8, 'text-anchor': 'middle',
            fill: 'var(--text-3)', 'font-size': 10, 'font-family': 'var(--font)'
          }, svg).textContent = d.label;
          return;
        }

        var rect = el('rect', {
          x: x, y: y, width: bw, height: bh, rx: Math.min(4, bw / 2),
          fill: col, style: 'cursor:pointer;transition:opacity .16s'
        }, svg);

        if (!reduce()) {
          rect.setAttribute('y', m.t + ih); rect.setAttribute('height', 0);
          rect.style.transition = 'y .6s cubic-bezier(.16,1,.3,1) ' + (i * 45) + 'ms, height .6s cubic-bezier(.16,1,.3,1) ' + (i * 45) + 'ms, opacity .16s';
          requestAnimationFrame(function () {
            rect.setAttribute('y', y); rect.setAttribute('height', bh);
          });
        }

        rect.addEventListener('mouseenter', function () {
          rect.style.opacity = .82;
          var b = svg.getBoundingClientRect();
          showTip(
            '<b>' + escape_(d.full || d.label) + '</b><span class="chart-tip__v">' +
            (d.rate === null ? 'Nada agendado' : fmt.pct(d.rate) + (d.total ? ' · ' + d.done + ' de ' + d.total : '')) + '</span>',
            b.left + ((x + bw / 2) / w) * b.width,
            b.top + (y / h) * b.height
          );
        });
        rect.addEventListener('mouseleave', function () { rect.style.opacity = 1; hideTip(); });

        // Etiqueta directa sólo en el día de hoy.
        if (d.today) {
          el('text', {
            x: x + bw / 2, y: y - 6, 'text-anchor': 'middle',
            fill: 'var(--text-2)', 'font-size': 10, 'font-weight': 700, 'font-family': 'var(--font)'
          }, svg).textContent = Math.round(v * 100) + '%';
        }

        el('text', {
          x: x + bw / 2, y: h - 8, 'text-anchor': 'middle',
          fill: d.today ? 'var(--text)' : 'var(--text-3)',
          'font-size': 10, 'font-weight': d.today ? 700 : 400, 'font-family': 'var(--font)'
        }, svg).textContent = d.label;
      });
    });
  }

  /* ============================================================
     RADAR — Las seis áreas
     ============================================================ */
  function radar(node, opt) {
    node.setAttribute('data-chart', 'radar');
    responsive(node, function () {
      var data = opt.data || [];
      var f = frame(node, opt.height || 280);
      var svg = f.svg, w = f.w, h = f.h;
      var cx = w / 2, cy = h / 2 + 4;
      var R = Math.max(40, Math.min(w, h) / 2 - 42);
      var n = data.length || 6;
      svg.setAttribute('aria-label', opt.label || 'Radar de performance por área');

      var ang = function (i) { return -Math.PI / 2 + (i / n) * Math.PI * 2; };
      var pt = function (i, v) { return [cx + Math.cos(ang(i)) * R * v, cy + Math.sin(ang(i)) * R * v]; };

      /* — Telaraña recesiva — */
      [0.25, 0.5, 0.75, 1].forEach(function (lv) {
        var p = [];
        for (var i = 0; i < n; i++) p.push(pt(i, lv).join(','));
        el('polygon', {
          points: p.join(' '), fill: 'none',
          stroke: lv === 1 ? 'var(--border)' : 'var(--border-soft)', 'stroke-width': 1
        }, svg);
      });
      for (var i = 0; i < n; i++) {
        var e = pt(i, 1);
        el('line', { x1: cx, y1: cy, x2: e[0], y2: e[1], stroke: 'var(--border-soft)', 'stroke-width': 1 }, svg);
      }

      /* — Polígono del dato — */
      var id = 'rd' + (++uid);
      var defs = el('defs', null, svg);
      var rg = el('radialGradient', { id: id }, defs);
      el('stop', { offset: '0', 'stop-color': 'var(--accent)', 'stop-opacity': .42 }, rg);
      el('stop', { offset: '1', 'stop-color': 'var(--accent-2)', 'stop-opacity': .14 }, rg);

      var pts = data.map(function (d, i) { return pt(i, Math.max(0.02, d.value / 100)); });
      var poly = el('polygon', {
        points: pts.map(function (p) { return p.join(','); }).join(' '),
        fill: 'url(#' + id + ')', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-linejoin': 'round'
      }, svg);

      if (!reduce()) {
        poly.style.transformOrigin = cx + 'px ' + cy + 'px';
        poly.style.transform = 'scale(.05)';
        poly.style.opacity = 0;
        poly.style.transition = 'transform .8s cubic-bezier(.34,1.56,.64,1), opacity .4s ease';
        requestAnimationFrame(function () { poly.style.transform = 'scale(1)'; poly.style.opacity = 1; });
      }

      /* — Vértices y etiquetas — */
      data.forEach(function (d, i) {
        var p = pt(i, Math.max(0.02, d.value / 100));
        var v = el('circle', {
          cx: p[0], cy: p[1], r: 4, fill: 'var(--accent)',
          stroke: 'var(--card)', 'stroke-width': 2, style: 'cursor:pointer'
        }, svg);
        v.addEventListener('mouseenter', function () {
          var b = svg.getBoundingClientRect();
          showTip('<b>' + escape_(d.label) + '</b><span class="chart-tip__v">' + d.value + ' de 100</span>',
            b.left + (p[0] / w) * b.width, b.top + (p[1] / h) * b.height);
        });
        v.addEventListener('mouseleave', hideTip);

        var lp = pt(i, 1.2);
        var anchor = Math.abs(lp[0] - cx) < 6 ? 'middle' : (lp[0] > cx ? 'start' : 'end');
        el('text', {
          x: lp[0], y: lp[1] + 4, 'text-anchor': anchor,
          fill: 'var(--text-2)', 'font-size': 11, 'font-weight': 600, 'font-family': 'var(--font)'
        }, svg).textContent = d.label;
        el('text', {
          x: lp[0], y: lp[1] + 17, 'text-anchor': anchor,
          fill: 'var(--text-3)', 'font-size': 10, 'font-family': 'var(--font)'
        }, svg).textContent = d.value;
      });
    });
  }

  /* ============================================================
     SPARKLINE — micro-tendencia dentro de una tarjeta
     ============================================================ */
  function spark(node, opt) {
    node.setAttribute('data-chart', 'spark');
    responsive(node, function () {
      var data = opt.data || [];
      var f = frame(node, opt.height || 38);
      var svg = f.svg, w = f.w, h = f.h;
      if (data.length < 2) return;
      var vals = data.map(function (d) { return d.value; });
      var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
      var rng = (mx - mn) || 1;
      var pts = data.map(function (d, i) {
        return [(i / (data.length - 1)) * (w - 4) + 2, h - 3 - ((d.value - mn) / rng) * (h - 8)];
      });
      var col = opt.color || 'var(--text-3)';
      var id = 'sp' + (++uid);
      var defs = el('defs', null, svg);
      var gr = el('linearGradient', { id: id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el('stop', { offset: '0', 'stop-color': col, 'stop-opacity': .3 }, gr);
      el('stop', { offset: '1', 'stop-color': col, 'stop-opacity': 0 }, gr);
      var d = smooth(pts, .2);
      el('path', { d: d + 'L' + pts[pts.length - 1][0] + ',' + h + 'L' + pts[0][0] + ',' + h + 'Z', fill: 'url(#' + id + ')' }, svg);
      el('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 1.75, 'stroke-linecap': 'round' }, svg);
      el('circle', { cx: pts[pts.length - 1][0], cy: pts[pts.length - 1][1], r: 2.5, fill: col }, svg);
    });
  }

  /* ============================================================
     ANILLO de progreso — metas
     ============================================================ */
  function ring(node, opt) {
    node.setAttribute('data-chart', 'ring');
    responsive(node, function () {
      var f = frame(node, opt.height || 92);
      var svg = f.svg, w = f.w, h = f.h;
      var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6;
      var v = Math.max(0, Math.min(1, opt.value || 0));
      var col = opt.color ? habitColor(opt.color) : 'var(--accent)';
      var C = 2 * Math.PI * R;
      el('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: 'var(--border-soft)', 'stroke-width': 6 }, svg);
      var arcEl = el('circle', {
        cx: cx, cy: cy, r: R, fill: 'none', stroke: col, 'stroke-width': 6,
        'stroke-linecap': 'round', 'stroke-dasharray': C,
        'stroke-dashoffset': reduce() ? C * (1 - v) : C,
        transform: 'rotate(-90 ' + cx + ' ' + cy + ')'
      }, svg);
      if (!reduce()) {
        arcEl.style.transition = 'stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)';
        requestAnimationFrame(function () { arcEl.setAttribute('stroke-dashoffset', C * (1 - v)); });
      }
      el('text', {
        x: cx, y: cy + 5, 'text-anchor': 'middle', fill: 'var(--text)',
        'font-size': Math.max(13, R * .5), 'font-weight': 700, 'font-family': 'var(--font)'
      }, svg).textContent = Math.round(v * 100) + '%';
    });
  }

  /* ============================================================
     MAPA DE CALOR anual — un año de hábitos de un vistazo
     ============================================================ */
  function heat(node, opt) {
    node.setAttribute('data-chart', 'heat');
    responsive(node, function () {
      var data = opt.data || [];           // [{date, rate}]
      var f = frame(node, opt.height || 132);
      var svg = f.svg, w = f.w, h = f.h;
      var cols = Math.ceil(data.length / 7);
      var pad = 22;
      var cell = Math.max(6, Math.min(13, (w - pad - 6) / Math.max(1, cols) - 2));
      var gap = 2;
      svg.setAttribute('aria-label', 'Mapa de calor de cumplimiento del último año');

      var dows = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
      dows.forEach(function (t, i) {
        if (i % 2) return;
        el('text', {
          x: 0, y: 14 + i * (cell + gap) + cell * .75, fill: 'var(--text-3)',
          'font-size': 9, 'font-family': 'var(--font)'
        }, svg).textContent = t;
      });

      data.forEach(function (d, i) {
        var col = Math.floor(i / 7), row = i % 7;
        var x = pad + col * (cell + gap), y = 14 + row * (cell + gap);
        var v = d.rate;
        var fill, op;
        if (v === null || v === undefined) { fill = 'var(--border-soft)'; op = .7; }
        else { fill = 'var(--accent)'; op = 0.14 + v * 0.86; }
        var r = el('rect', {
          x: x, y: y, width: cell, height: cell, rx: Math.min(3, cell / 3),
          fill: fill, opacity: op, style: 'cursor:pointer'
        }, svg);
        r.addEventListener('mouseenter', function () {
          var b = svg.getBoundingClientRect();
          showTip('<b>' + d.date + '</b><span class="chart-tip__v">' +
            (v === null || v === undefined ? 'Sin datos' : fmt.pct(v) + ' de cumplimiento') + '</span>',
            b.left + ((x + cell / 2) / w) * b.width, b.top + (y / h) * b.height);
        });
        r.addEventListener('mouseleave', hideTip);
      });
    });
  }

  SL.charts = {
    line: line, donut: donut, bars: bars, radar: radar,
    spark: spark, ring: ring, heat: heat,
    habitColor: habitColor, cssVar: cssVar, showTip: showTip, hideTip: hideTip
  };

})(window.SL = window.SL || {});
