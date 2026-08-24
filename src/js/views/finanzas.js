/* ============================================================
   StarkLab Web · Finanzas
   Carga manual en tres toques + importar el resumen del banco.
   Sin conexión bancaria en vivo: eso exige licencias y acuerdos
   que no tienen sentido para un proyecto personal.
   ============================================================ */
(function (SL) {
  'use strict';

  var C = SL.compute, D = SL.date, esc = SL.esc;
  var cursor = null;
  var filter = 'todos';

  SL.views = SL.views || {};
  SL.views.finanzas = function (root, s) {
    if (!cursor) { var t = D.today(); cursor = new Date(t.getFullYear(), t.getMonth(), 1); }
    var y = cursor.getFullYear(), m = cursor.getMonth();
    var cur = s.settings.currency;
    var f = C.finance(s, y, m);
    var money = function (v) { return SL.fmt.money(v, cur); };

    var prev = C.finance(s, m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);
    var spark = C.expenseSeries(s, y, m);

    var rows = f.rows.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var shown = rows.filter(function (t) {
      return filter === 'todos' || (filter === 'entradas' ? t.type === 'in' : t.type === 'out');
    });

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-head__t">Finanzas</h1>' +
          '<p class="page-head__s">Control financiero personal · ' + esc(SL.MESES[m]) + ' ' + y + '</p>' +
        '</div>' +
        '<div class="page-head__actions">' +
          '<div class="seg">' +
            '<button class="seg__b" data-mes="-1" aria-label="Mes anterior">' + SL.icon('izq') + '</button>' +
            '<button class="seg__b is-on" data-hoy>' + esc(SL.MESES[m]) + '</button>' +
            '<button class="seg__b" data-mes="1" aria-label="Mes siguiente">' + SL.icon('der') + '</button>' +
          '</div>' +
          '<select class="select" data-cur style="width:auto">' +
            ['USD','ARS','EUR','BRL','GBP'].map(function (c) {
              return '<option' + (c === cur ? ' selected' : '') + '>' + c + '</option>';
            }).join('') +
          '</select>' +
          '<button class="btn" data-import>' + SL.icon('subir') + 'Importar CSV</button>' +
          '<button class="btn btn--primary" data-nueva>' + SL.icon('mas') + 'Nueva transacción</button>' +
        '</div>' +
      '</div>' +

      '<div class="grid grid--3">' +
        statCard('Ingresos', money(f.income), 'verde', 'subir', deltaTxt(f.income, prev.income), '') +
        statCard('Gastos', money(f.expense), 'rojo', 'bajar', deltaTxt(f.expense, prev.expense, true), 'spark') +
        statCard('Saldo', money(f.balance), f.balance >= 0 ? 'cian' : 'rojo', 'dolar',
          f.balance >= 0 ? 'En positivo este mes' : 'En rojo este mes', '') +
      '</div>' +

      '<div class="grid grid--main">' +
        '<div class="card card--flush">' +
          '<div class="card__head" style="padding:var(--s5) var(--s5) 0;margin-bottom:var(--s3)">' +
            '<div><div class="card__title">Transacciones</div>' +
            '<div class="card__sub">' + shown.length + ' movimiento' + (shown.length === 1 ? '' : 's') + '</div></div>' +
            '<div class="card__tools"><div class="seg" data-filtro>' +
              ['todos','entradas','salidas'].map(function (k) {
                return '<button class="seg__b' + (filter === k ? ' is-on' : '') + '" data-f="' + k + '">' +
                  k.charAt(0).toUpperCase() + k.slice(1) + '</button>';
              }).join('') +
            '</div></div>' +
          '</div>' +
          '<div class="rows" data-lista></div>' +
        '</div>' +

        '<div style="display:grid;gap:var(--s4);align-content:start">' +
          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Por categoría</div>' +
              '<div class="card__sub">Gastos del mes</div>' +
            '</div></div>' +
            '<div data-donut style="height:230px"></div>' +
            '<div class="legend legend--rows" data-leyenda></div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Presupuestos</div>' +
              '<div class="card__sub">Cuánto queda de cada tope</div>' +
            '</div></div>' +
            '<div data-presu style="display:grid;gap:var(--s4)"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    /* — sparkline de gasto acumulado — */
    var sp = SL.$('[data-spark]', root);
    if (sp && spark.length > 1) SL.charts.spark(sp, { data: spark, color: 'var(--c-rojo)', height: 34 });

    /* — torta — */
    SL.charts.donut(SL.$('[data-donut]', root), {
      data: f.cats, currency: cur, height: 230,
      centerLabel: 'Gastado',
      onPick: function (d) { filter = 'salidas'; SL.render(); }
    });

    SL.$('[data-leyenda]', root).innerHTML = f.cats.length
      ? f.cats.map(function (c) {
          return '<span class="legend__i" style="--cc:var(--c-' + c.color + ')">' +
            '<span class="legend__sw"></span>' +
            '<span class="legend__name">' + esc(c.name) + '</span>' +
            '<b>' + money(c.value) + '</b></span>';
        }).join('')
      : '<div class="empty"><div class="empty__s">Sin gastos este mes.</div></div>';

    /* — presupuestos — */
    var presu = s.cats.filter(function (c) { return c.budget > 0; });
    SL.$('[data-presu]', root).innerHTML = presu.map(function (c) {
      var spent = (f.cats.filter(function (x) { return x.id === c.id; })[0] || {}).value || 0;
      var p = Math.min(1, spent / c.budget);
      var over = spent > c.budget;
      var near = !over && p > 0.8;
      return '<div style="--cc:var(--c-' + c.color + ')">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
          '<span class="dot-c"></span>' +
          '<span style="font-size:var(--fs-sm);font-weight:600">' + esc(c.name) + '</span>' +
          '<span style="margin-left:auto;font-size:var(--fs-xs);color:var(--text-2)" class="u-num">' +
            money(spent) + ' / ' + money(c.budget) + '</span>' +
        '</div>' +
        '<div style="height:6px;border-radius:99px;background:var(--border-soft);overflow:hidden">' +
          '<div style="height:100%;border-radius:99px;width:' + (p * 100) + '%;background:' +
            (over ? 'var(--err)' : near ? 'var(--warn)' : 'var(--cc)') + ';transition:width .7s var(--e-out)"></div>' +
        '</div>' +
        (over ? '<div style="font-size:var(--fs-micro);color:var(--err);margin-top:4px;font-weight:600">' +
          'Te pasaste ' + money(spent - c.budget) + '</div>'
          : near ? '<div style="font-size:var(--fs-micro);color:var(--warn);margin-top:4px;font-weight:600">' +
            'Queda ' + money(c.budget - spent) + '</div>' : '') +
      '</div>';
    }).join('') || '<div class="empty__s">No hay presupuestos cargados. Se configuran en Ajustes.</div>';

    /* — lista de transacciones — */
    var lista = SL.$('[data-lista]', root);
    lista.innerHTML = shown.length ? shown.map(function (t) {
      var cat = s.cats.filter(function (c) { return c.id === t.cat; })[0] || { name: '—', color: 'cian' };
      var d = D.parse(t.date);
      return '<div class="row" style="--cc:var(--c-' + cat.color + ')">' +
        '<span class="row__ico">' + SL.icon(t.type === 'in' ? 'subir' : 'bajar') + '</span>' +
        '<div class="row__main">' +
          '<div class="row__t">' + esc(t.note || cat.name) + '</div>' +
          '<div class="row__s">' + esc(cat.name) + ' · ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() + '</div>' +
        '</div>' +
        '<span class="row__v row__v--' + (t.type === 'in' ? 'in' : 'out') + '">' +
          (t.type === 'in' ? '+' : '−') + money(t.amount) + '</span>' +
        '<button class="icon-btn row__x" data-del="' + t.id + '" aria-label="Borrar">' + SL.icon('tacho') + '</button>' +
      '</div>';
    }).join('') : '<div class="empty"><div class="empty__i">💸</div>' +
      '<div class="empty__t">Sin movimientos</div>' +
      '<div class="empty__s">Cargá el primero con “Nueva transacción”, o importá el resumen del banco.</div></div>';

    lista.addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]');
      if (!b) return;
      SL.store.update(function (st) { st.tx = st.tx.filter(function (x) { return x.id !== b.dataset.del; }); });
      SL.toast('Transacción borrada');
    });

    /* — acciones — */
    SL.$('[data-filtro]', root).addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      filter = b.dataset.f; SL.render();
    });
    SL.$$('[data-mes]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + (+b.dataset.mes), 1);
        SL.render();
      });
    });
    SL.$('[data-hoy]', root).addEventListener('click', function () {
      var t = D.today(); cursor = new Date(t.getFullYear(), t.getMonth(), 1); SL.render();
    });
    SL.$('[data-cur]', root).addEventListener('change', function (e) {
      SL.store.update(function (st) { st.settings.currency = e.target.value; });
    });
    SL.$('[data-nueva]', root).addEventListener('click', function () { txModal(); });
    SL.$('[data-import]', root).addEventListener('click', function () { importModal(); });
  };

  function statCard(label, value, color, ico, foot, spark) {
    return '<div class="card"><div class="stat" style="--cc:var(--c-' + color + ')">' +
      '<div class="stat__top"><span class="stat__ico">' + SL.icon(ico) + '</span>' +
      '<span class="stat__label">' + esc(label) + '</span></div>' +
      '<div class="stat__value u-num">' + esc(value) + '</div>' +
      (spark ? '<div data-spark style="height:34px;margin:-2px 0"></div>' : '') +
      '<div class="stat__foot">' + foot + '</div>' +
    '</div></div>';
  }

  function deltaTxt(now, before, inverse) {
    if (!before) return '<span class="delta delta--flat">sin mes anterior para comparar</span>';
    var d = (now - before) / before;
    if (Math.abs(d) < 0.005) return '<span class="delta delta--flat">igual que el mes pasado</span>';
    var up = d > 0;
    var good = inverse ? !up : up;
    return '<span class="delta delta--' + (good ? 'up' : 'down') + '">' + (up ? '▲' : '▼') + ' ' +
      Math.abs(Math.round(d * 100)) + '%</span> vs. mes anterior';
  }

  /* ————————————————— alta de transacción —————————————————
     Tres toques: monto, categoría (las últimas usadas arriba), listo. */
  function txModal() {
    var s = SL.store.get();
    var type = 'out';
    // Las categorías se ordenan por uso reciente: la que más usás queda primera.
    var recent = {};
    s.tx.slice(-40).forEach(function (t) { recent[t.cat] = (recent[t.cat] || 0) + 1; });
    var cats = s.cats.slice().sort(function (a, b) { return (recent[b.id] || 0) - (recent[a.id] || 0); });
    var pick = cats[0].id;

    var body = SL.h('<div style="display:grid;gap:var(--s4)">' +
      '<div class="seg" data-type style="width:fit-content">' +
        '<button type="button" class="seg__b is-on" data-t="out">Gasto</button>' +
        '<button type="button" class="seg__b" data-t="in">Ingreso</button>' +
      '</div>' +
      '<div class="field"><label class="field__l">Monto</label>' +
        '<input class="input" data-a type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" ' +
        'style="font-size:1.5rem;font-weight:700;padding:14px"></div>' +
      '<div class="field"><label class="field__l">Categoría</label>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap" data-cats>' +
          cats.map(function (c, i) {
            return '<button type="button" class="tag" data-c="' + c.id + '" style="--cc:var(--c-' + c.color + ');' +
              'cursor:pointer;' + (i === 0 ? 'outline:2px solid var(--cc)' : '') + '">' +
              '<span class="dot-c"></span>' + esc(c.name) + '</button>';
          }).join('') +
        '</div></div>' +
      '<div class="field"><label class="field__l">Detalle (opcional)</label>' +
        '<input class="input" data-n placeholder="Ej: Supermercado"></div>' +
      '<div class="field"><label class="field__l">Fecha</label>' +
        '<input class="input" data-d type="date" value="' + D.iso(D.today()) + '"></div>' +
    '</div>');

    SL.$('[data-type]', body).addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]'); if (!b) return;
      type = b.dataset.t;
      SL.$$('[data-t]', body).forEach(function (x) { x.classList.toggle('is-on', x === b); });
    });
    SL.$('[data-cats]', body).addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      pick = b.dataset.c;
      SL.$$('[data-c]', body).forEach(function (x) { x.style.outline = x === b ? '2px solid var(--cc)' : ''; });
    });

    SL.modal({
      title: 'Nueva transacción', body: body, okText: 'Guardar',
      onOk: function (b) {
        var amt = parseFloat(SL.$('[data-a]', b).value);
        if (!amt || amt <= 0) { SL.toast('Poné un monto válido', 'err'); return false; }
        SL.store.update(function (st) {
          st.tx.push({
            id: SL.uid('t'), date: SL.$('[data-d]', b).value || D.iso(D.today()),
            type: type, amount: Math.round(amt * 100) / 100, cat: pick,
            note: SL.$('[data-n]', b).value.trim()
          });
        });
        SL.toast('Transacción cargada');
        return true;
      }
    });
  }

  /* ————————————————— importar resumen —————————————————
     Lee el CSV que ya te manda el banco. Las filas se revisan antes
     de confirmar: nunca se guarda nada a ciegas. */
  function importModal() {
    var body = SL.h('<div style="display:grid;gap:var(--s4)">' +
      '<p style="color:var(--text-2);line-height:1.6;font-size:var(--fs-sm)">' +
        'Subí el CSV que te manda el banco. Se detectan solas las columnas de ' +
        '<b>fecha</b>, <b>descripción</b> y <b>monto</b>. Vas a poder revisar las filas antes de confirmar.</p>' +
      '<input type="file" class="input" data-file accept=".csv,text/csv,text/plain">' +
      '<div data-prev></div>' +
    '</div>');

    var parsed = [];
    SL.$('[data-file]', body).addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      var fr = new FileReader();
      fr.onload = function () {
        try { parsed = parseCSV(fr.result); } catch (err) { parsed = []; }
        var prev = SL.$('[data-prev]', body);
        if (!parsed.length) {
          prev.innerHTML = '<p style="color:var(--err);font-size:var(--fs-sm)">' +
            'No se reconoció ninguna fila. Revisá que el archivo tenga una columna de fecha y una de monto.</p>';
          return;
        }
        prev.innerHTML = '<div class="card__sub" style="margin-bottom:8px">' + parsed.length +
          ' filas detectadas · se muestran las primeras 6</div>' +
          '<div class="table-scroll"><table class="data"><thead><tr><th>Fecha</th><th>Detalle</th>' +
          '<th class="num">Monto</th></tr></thead><tbody>' +
          parsed.slice(0, 6).map(function (r) {
            return '<tr><td>' + esc(r.date) + '</td><td>' + esc(r.note) + '</td>' +
              '<td class="num" style="color:' + (r.type === 'in' ? 'var(--ok)' : 'var(--text)') + '">' +
              (r.type === 'in' ? '+' : '−') + r.amount.toFixed(2) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      };
      fr.readAsText(file);
    });

    SL.modal({
      title: 'Importar resumen', body: body, okText: 'Importar',
      onOk: function () {
        if (!parsed.length) { SL.toast('No hay filas para importar', 'err'); return false; }
        var s = SL.store.get();
        var otros = s.cats.filter(function (c) { return c.name === 'Otros'; })[0];
        SL.store.update(function (st) {
          if (!otros) {
            otros = { id: SL.uid('c'), name: 'Otros', color: 'cian', budget: 0 };
            st.cats.push(otros);
          }
          parsed.forEach(function (r) {
            st.tx.push({
              id: SL.uid('t'), date: r.date, type: r.type,
              amount: r.amount, cat: guessCat(st.cats, r.note) || otros.id, note: r.note
            });
          });
        });
        SL.toast(parsed.length + ' transacciones importadas');
        return true;
      }
    });
  }

  /* Parser tolerante: acepta coma o punto y coma, comillas, y varios
     formatos de fecha. Si una fila no tiene monto, se descarta. */
  function parseCSV(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) return [];
    var sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';

    function split(line) {
      var out = [], cur = '', q = false;
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (ch === sep && !q) { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out.map(function (x) { return x.trim().replace(/^"|"$/g, ''); });
    }

    var head = split(lines[0]).map(function (h) { return h.toLowerCase(); });
    var iDate = head.findIndex(function (h) { return /fecha|date|data/.test(h); });
    var iNote = head.findIndex(function (h) { return /desc|detalle|concepto|referencia|hist/.test(h); });
    var iAmt  = head.findIndex(function (h) { return /monto|importe|valor|amount|debito|credito|d.bito|cr.dito/.test(h); });
    if (iDate === -1) iDate = 0;
    if (iAmt === -1) iAmt = head.length - 1;
    if (iNote === -1) iNote = 1;

    var out = [];
    for (var k = 1; k < lines.length; k++) {
      var c = split(lines[k]);
      if (c.length < 2) continue;
      var raw = (c[iAmt] || '').replace(/[^\d,.\-]/g, '');
      // "1.234,56" (es) vs "1,234.56" (en)
      if (/,\d{1,2}$/.test(raw)) raw = raw.replace(/\./g, '').replace(',', '.');
      else raw = raw.replace(/,/g, '');
      var amt = parseFloat(raw);
      if (!amt || isNaN(amt)) continue;
      var date = normDate(c[iDate]);
      if (!date) continue;
      out.push({
        date: date, note: c[iNote] || 'Importado',
        amount: Math.abs(amt), type: amt < 0 ? 'out' : 'in'
      });
    }
    return out;
  }

  function normDate(v) {
    if (!v) return null;
    v = v.trim();
    var m;
    if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[1] + '-' + m[2] + '-' + m[3];
    if ((m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/))) {
      var yy = m[3].length === 2 ? '20' + m[3] : m[3];
      return yy + '-' + D.pad(+m[2]) + '-' + D.pad(+m[1]);
    }
    var d = new Date(v);
    return isNaN(d) ? null : D.iso(d);
  }

  /* Adivina la categoría por palabras del detalle. Si no hay match, cae en "Otros". */
  function guessCat(cats, note) {
    var n = (note || '').toLowerCase();
    var reglas = [
      [/super|mercado|almac|verdul|carnic|comida|resta|delivery|panad/, 'Alimentación'],
      [/nafta|gasol|combust|uber|taxi|colectivo|subte|peaje|estacion/, 'Transporte'],
      [/netflix|spotify|disney|hbo|prime|suscrip|streaming/, 'Streaming'],
      [/cine|bar|salida|juego|ocio|boliche|teatro/, 'Ocio'],
      [/farmac|medic|m.dic|gimnas|salud|dentist/, 'Salud'],
      [/alquil|luz|gas|agua|internet|expensas|hogar|mueble/, 'Hogar'],
      [/sueldo|salario|honorario|transferencia recibida|ingreso/, 'Ingresos']
    ];
    for (var i = 0; i < reglas.length; i++) {
      if (reglas[i][0].test(n)) {
        var c = cats.filter(function (x) { return x.name === reglas[i][1]; })[0];
        if (c) return c.id;
      }
    }
    return null;
  }

})(window.SL = window.SL || {});
