/* ============================================================
   Zenit · Finanzas — sistema de frascos

   La idea que sostiene todo: el saldo de la cuenta NO dice cuánto
   podés gastar. Lo dice la plata que todavía no tiene un trabajo
   asignado. Cada peso que entra se reparte en frascos antes de
   tocarse, y lo que sobra de esa repartija es lo único libre.

       saldo = Σ disponible(frascos) + libre + noPropio

   Un frasco con $30.000 asignados y $12.000 gastados tiene $18.000
   disponibles. Esa plata sigue en la cuenta, pero ya tiene dueño.
   ============================================================ */
(function (SL) {
  'use strict';

  var C = SL.compute, D = SL.date, esc = SL.esc;
  var filtro = 'todos';

  SL.views = SL.views || {};
  SL.views.finanzas = function (root, s) {
    var f = C.frascos(s);
    var cur = s.settings.currency;
    var $ = function (v) { return SL.fmt.money(v, cur); };
    var grupos = C.porTipo(s);
    var pendientes = (s.fin.deudas || []).filter(function (d) { return !d.repuesto; });

    if (!f.lista.length && !f.saldo) return vacio(root);

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-head__t">Finanzas</h1>' +
          '<p class="page-head__s">Cada peso con su trabajo asignado</p>' +
        '</div>' +
        '<div class="page-head__actions">' +
          '<button class="btn" data-ingreso>' + SL.icon('subir') + 'Entró plata</button>' +
          '<button class="btn btn--primary" data-gasto>' + SL.icon('mas') + 'Registrar gasto</button>' +
        '</div>' +
      '</div>' +

      /* — El número que importa — */
      '<div class="card card--hero">' +
        '<div class="hero-fin">' +
          '<div class="hero-fin__main">' +
            '<div class="u-eyebrow">Libre para gastar</div>' +
            '<div class="hero-fin__v ' + (f.libre < 0 ? 'is-neg' : '') + ' u-num">' + $(f.libre) + '</div>' +
            '<p class="hero-fin__d">' + esc(lectura(f)) + '</p>' +
          '</div>' +
          '<div class="hero-fin__side">' +
            mini('En la cuenta', $(f.saldo), 'Lo que hay físicamente', 'saldo') +
            mini('En frascos', $(f.disponible), 'Ya tiene dueño', 'frascos') +
            (f.noPropio ? mini('No es tuyo', $(f.noPropio), 'Está en la cuenta pero no cuenta', 'nopropio') : '') +
          '</div>' +
        '</div>' +
        barra(f, cur) +
      '</div>' +

      (pendientes.length || f.porCobrar ? avisos(s, f, pendientes, $) : '') +

      '<div class="grid grid--main">' +
        '<div class="col">' +
          grupos.map(function (g) { return grupoHTML(g, cur, $); }).join('') +
          '<button class="btn btn--dash" data-nuevo>' + SL.icon('mas') + 'Nuevo frasco</button>' +
        '</div>' +

        '<div class="col">' +
          '<div class="card">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">Cómo está repartida</div>' +
              '<div class="card__sub">Tu plata, por función</div>' +
            '</div></div>' +
            '<div data-donut style="height:220px"></div>' +
            '<div class="legend legend--rows" data-leyenda></div>' +
          '</div>' +

          '<div class="card card--flush">' +
            '<div class="card__head card__head--inset">' +
              '<div><div class="card__title">Movimientos</div></div>' +
              '<div class="card__tools"><div class="seg" data-filtro>' +
                [['todos','Todos'],['gasto','Gastos'],['ingreso','Entradas']].map(function (k) {
                  return '<button class="seg__b' + (filtro === k[0] ? ' is-on' : '') + '" data-f="' + k[0] + '">' + k[1] + '</button>';
                }).join('') +
              '</div></div>' +
            '</div>' +
            '<div class="rows" data-movs></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    /* — dona: disponible por tipo + la plata libre — */
    var datos = grupos.map(function (g) {
      return { name: g.label, value: Math.max(0, g.disponible), color: colorTipo(g.tipo) };
    });
    if (f.libre > 0) datos.push({ name: 'Libre', value: f.libre, color: 'verde' });

    SL.charts.donut(SL.$('[data-donut]', root), {
      data: datos, currency: cur, height: 220, centerLabel: 'Tu plata',
      total: f.propio
    });
    SL.$('[data-leyenda]', root).innerHTML = datos.length
      ? datos.map(function (d) {
          return '<span class="legend__i" style="--cc:var(--c-' + d.color + ')">' +
            '<span class="legend__sw"></span><span class="legend__name">' + esc(d.name) + '</span>' +
            '<b>' + $(d.value) + '</b></span>';
        }).join('')
      : '<p class="card__sub">Todavía no repartiste nada.</p>';

    /* — movimientos — */
    var movs = (s.fin.movs || []).slice().reverse()
      .filter(function (m) { return filtro === 'todos' || m.tipo === filtro; })
      .slice(0, 40);
    SL.$('[data-movs]', root).innerHTML = movs.length ? movs.map(function (m) {
      var fr = f.lista.filter(function (x) { return x.id === m.frasco; })[0];
      var neg = m.tipo === 'gasto';
      return '<div class="row" style="--cc:var(--c-' + (fr ? fr.color : 'cian') + ')">' +
        '<span class="row__ico">' + SL.icon(ico(m.tipo)) + '</span>' +
        '<div class="row__main">' +
          '<div class="row__t">' + esc(m.detalle || etiqueta(m.tipo)) + '</div>' +
          '<div class="row__s">' + (fr ? esc(fr.nombre) + ' · ' : '') + fecha(m.fecha) + '</div>' +
        '</div>' +
        '<span class="row__v ' + (neg ? '' : 'row__v--in') + '">' +
          (neg ? '−' : m.tipo === 'ingreso' ? '+' : '') + $(m.monto) + '</span>' +
      '</div>';
    }).join('') : '<div class="empty"><p class="empty__s">Sin movimientos todavía.</p></div>';

    /* — acciones — */
    on('[data-gasto]', function () { modalGasto(); });
    on('[data-ingreso]', function () { modalIngreso(); });
    on('[data-nuevo]', function () { modalFrasco(null); });
    SL.$('[data-filtro]', root).addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      filtro = b.dataset.f; SL.render();
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fr]');
      if (b) return modalFrasco(b.dataset.fr);
      var g = e.target.closest('[data-gastar]');
      if (g) return modalGasto(g.dataset.gastar);
      var a = e.target.closest('[data-asignar]');
      if (a) return modalAsignar(a.dataset.asignar);
      var r = e.target.closest('[data-reponer]');
      if (r) return reponer(r.dataset.reponer);
      var s2 = e.target.closest('[data-saldo]');
      if (s2) return modalSaldo();
      var c2 = e.target.closest('[data-cobrar]');
      if (c2) return cobrar(c2.dataset.cobrar);
    });
    function on(sel, fn) { var el = SL.$(sel, root); if (el) el.addEventListener('click', fn); }
  };

  /* ————————————————— pantalla inicial ————————————————— */
  function vacio(root) {
    root.innerHTML =
      '<div class="page-head"><div>' +
        '<h1 class="page-head__t">Finanzas</h1>' +
        '<p class="page-head__s">Cada peso con su trabajo asignado</p>' +
      '</div></div>' +
      '<div class="card">' +
        '<div class="onboard">' +
          '<h2 class="onboard__t">El saldo no dice cuánto podés gastar</h2>' +
          '<p class="onboard__p">Lo dice la plata que <b>todavía no tiene un trabajo asignado</b>. ' +
            'Antes de usar lo que entra, se reparte en frascos: primero lo que ya tenés comprometido, ' +
            'después los objetivos, después el ocio que ya decidiste, y al final el día a día por semanas.</p>' +
          '<p class="onboard__p">Así, cuando mirás la cuenta, no te confundís plata futura con plata disponible.</p>' +
          '<div class="onboard__cta">' +
            '<button class="btn btn--primary" data-empezar>Armar el mes</button>' +
            '<button class="btn" data-solo>Crear un frasco suelto</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    SL.$('[data-empezar]', root).addEventListener('click', function () { modalArranque(); });
    SL.$('[data-solo]', root).addEventListener('click', function () { modalFrasco(null); });
  }

  function modalArranque() {
    var body = SL.h('<div class="form">' +
      '<div class="field"><label class="field__l">¿Cuánta plata hay en la cuenta ahora?</label>' +
        '<input class="input input--big" data-saldo type="number" step="0.01" placeholder="0"></div>' +
      '<div class="field"><label class="field__l">¿Algo de eso no es tuyo?</label>' +
        '<input class="input" data-nop type="number" step="0.01" placeholder="0" value="0">' +
        '<p class="field__h">Plata que tenés que devolver o que es de otra persona. Queda afuera de la cuenta.</p></div>' +
      '<label class="check"><input type="checkbox" data-plantilla checked>' +
        '<span>Crear la estructura del mes vacía — fijos, findes, semanas y colchón. Los montos los ponés vos.</span></label>' +
    '</div>');

    SL.modal({
      title: 'Armar el mes', body: body, okText: 'Empezar',
      onOk: function (b) {
        var saldo = parseFloat(SL.$('[data-saldo]', b).value) || 0;
        var nop = parseFloat(SL.$('[data-nop]', b).value) || 0;
        var conPlantilla = SL.$('[data-plantilla]', b).checked;
        SL.store.update(function (st) {
          st.fin.saldo = saldo;
          st.fin.noPropio = nop;
          if (conPlantilla) st.fin.frascos = SL.plantillaFrascos();
        });
        SL.toast('Listo. Ahora asigná plata a cada frasco.');
        return true;
      }
    });
  }

  /* ————————————————— piezas ————————————————— */
  function mini(l, v, d, accion) {
    return '<button class="hero-fin__mini"' + (accion === 'saldo' ? ' data-saldo' : '') + '>' +
      '<span class="hero-fin__mini-l">' + esc(l) + '</span>' +
      '<span class="hero-fin__mini-v u-num">' + esc(v) + '</span>' +
      '<span class="hero-fin__mini-d">' + esc(d) + '</span>' +
    '</button>';
  }

  /* Una sola barra que muestra de dónde sale cada peso del saldo. */
  function barra(f, cur) {
    var total = Math.max(1, f.saldo);
    var seg = [
      { v: Math.max(0, f.disponible), c: 'var(--c-cian)',  l: 'En frascos' },
      { v: Math.max(0, f.libre),      c: 'var(--ok)',      l: 'Libre' },
      { v: Math.max(0, f.noPropio),   c: 'var(--text-3)',  l: 'No es tuyo' }
    ].filter(function (x) { return x.v > 0; });
    if (!seg.length) return '';
    return '<div class="barra">' +
      seg.map(function (x) {
        return '<span class="barra__s" style="flex:' + (x.v / total) + ';background:' + x.c + '" ' +
          'title="' + esc(x.l) + ': ' + SL.fmt.money(x.v, cur) + '"></span>';
      }).join('') +
    '</div>' +
    '<div class="barra__leg">' + seg.map(function (x) {
      return '<span><i style="background:' + x.c + '"></i>' + esc(x.l) + '</span>';
    }).join('') + '</div>';
  }

  function lectura(f) {
    if (f.libre < 0) return 'Asignaste más plata de la que tenés. Sacá de algún frasco o entrá plata.';
    if (!f.asignado) return 'Todavía no repartiste nada: toda la plata figura como libre.';
    if (f.libre === 0) return 'Cada peso tiene su trabajo. Nada suelto.';
    return 'El resto ya tiene dueño y no debería tocarse.';
  }

  function avisos(s, f, pendientes, $) {
    var out = [];
    (s.fin.porCobrar || []).forEach(function (p) {
      out.push('<div class="aviso aviso--info">' + SL.icon('subir') +
        '<div><b>' + esc(p.quien) + '</b> te debe ' + $(p.monto) +
        (p.detalle ? ' · ' + esc(p.detalle) : '') + '</div>' +
        '<button class="btn btn--sm" data-cobrar="' + p.id + '">Ya me lo dio</button></div>');
    });
    pendientes.forEach(function (d) {
      var fr = f.lista.filter(function (x) { return x.id === d.frascoId; })[0];
      out.push('<div class="aviso aviso--warn">' + SL.icon('campana') +
        '<div>Le debés ' + $(d.monto) + ' a <b>' + esc(fr ? fr.nombre : 'un frasco') + '</b>' +
        (d.motivo ? ' · ' + esc(d.motivo) : '') + '</div>' +
        '<button class="btn btn--sm" data-reponer="' + d.id + '">Reponer</button></div>');
    });
    return out.length ? '<div class="avisos">' + out.join('') + '</div>' : '';
  }

  function grupoHTML(g, cur, $) {
    return '<div class="card card--flush">' +
      '<div class="card__head card__head--inset">' +
        '<div><div class="card__title">' + esc(g.label) + '</div>' +
        '<div class="card__sub">' + esc(g.desc) + '</div></div>' +
        '<div class="card__tools"><span class="card__sub u-num">' + $(g.disponible) + ' de ' + $(g.asignado) + '</span></div>' +
      '</div>' +
      '<div class="frascos">' + g.items.map(function (x) { return frascoHTML(x, cur, $); }).join('') + '</div>' +
    '</div>';
  }

  function frascoHTML(x, cur, $) {
    var disp = (x.asignado || 0) - (x.gastado || 0);
    var p = x.asignado > 0 ? Math.min(1, (x.gastado || 0) / x.asignado) : 0;
    var vacioF = x.asignado > 0 && disp <= 0;
    return '<div class="frasco" style="--cc:var(--c-' + x.color + ')">' +
      '<div class="frasco__top">' +
        '<button class="frasco__nom" data-fr="' + x.id + '">' +
          '<span class="dot-c"></span>' + esc(x.nombre) + '</button>' +
        '<span class="frasco__v u-num' + (vacioF ? ' is-vacio' : '') + '">' + $(disp) + '</span>' +
      '</div>' +
      '<div class="frasco__bar"><span style="width:' + (p * 100) + '%"></span></div>' +
      '<div class="frasco__pie">' +
        '<span>' + (x.asignado ? $(x.gastado || 0) + ' usado de ' + $(x.asignado) : 'Sin asignar') + '</span>' +
        '<span class="frasco__acc">' +
          '<button class="btn btn--sm btn--ghost" data-asignar="' + x.id + '">Asignar</button>' +
          '<button class="btn btn--sm btn--ghost" data-gastar="' + x.id + '"' + (disp <= 0 ? ' disabled' : '') + '>Gastar</button>' +
        '</span>' +
      '</div>' +
    '</div>';
  }

  function colorTipo(t) {
    return { fijo: 'cian', objetivo: 'violeta', finde: 'coral', semana: 'ambar', colchon: 'rosa' }[t] || 'cian';
  }
  function ico(t) {
    return { gasto: 'bajar', ingreso: 'subir', asignar: 'der', romper: 'tacho', reponer: 'reload' }[t] || 'der';
  }
  function etiqueta(t) {
    return { gasto: 'Gasto', ingreso: 'Entrada', asignar: 'Asignación', romper: 'Frasco roto', reponer: 'Reposición' }[t] || t;
  }
  function fecha(k) {
    var d = D.parse(k);
    return d.getDate() + '/' + (d.getMonth() + 1);
  }

  /* ————————————————— acciones ————————————————— */
  function opciones(s, selId) {
    return C.frascos(s).lista.map(function (x) {
      var disp = (x.asignado || 0) - (x.gastado || 0);
      return '<option value="' + x.id + '"' + (x.id === selId ? ' selected' : '') + '>' +
        esc(x.nombre) + ' — ' + SL.fmt.money(disp, s.settings.currency) + '</option>';
    }).join('');
  }

  function modalGasto(frascoId) {
    var s = SL.store.get();
    var body = SL.h('<div class="form">' +
      '<div class="field"><label class="field__l">¿Cuánto?</label>' +
        '<input class="input input--big" data-m type="number" step="0.01" inputmode="decimal" placeholder="0"></div>' +
      '<div class="field"><label class="field__l">¿De qué frasco sale?</label>' +
        '<select class="select" data-fr>' +
          '<option value="">Plata libre</option>' + opciones(s, frascoId) +
        '</select>' +
        '<p class="field__h">Si no corresponde a ningún frasco, sale de la plata libre.</p></div>' +
      '<div class="field"><label class="field__l">¿En qué?</label>' +
        '<input class="input" data-d placeholder="Ej: supermercado"></div>' +
      '<div class="field"><label class="field__l">Fecha</label>' +
        '<input class="input" data-f type="date" value="' + D.iso(D.today()) + '"></div>' +
    '</div>');

    SL.modal({
      title: 'Registrar gasto', body: body, okText: 'Guardar',
      onOk: function (b) {
        var m = parseFloat(SL.$('[data-m]', b).value);
        if (!m || m <= 0) { SL.toast('Poné un monto', 'err'); return false; }
        var fid = SL.$('[data-fr]', b).value;
        SL.store.update(function (st) {
          st.fin.saldo -= m;
          if (fid) {
            var fr = st.fin.frascos.filter(function (x) { return x.id === fid; })[0];
            if (fr) fr.gastado = (fr.gastado || 0) + m;
          }
          st.fin.movs.push({
            id: SL.uid('m'), fecha: SL.$('[data-f]', b).value, tipo: 'gasto',
            monto: m, frasco: fid || null, detalle: SL.$('[data-d]', b).value.trim()
          });
        });
        SL.toast('Gasto registrado');
        return true;
      }
    });
  }

  function modalIngreso() {
    var body = SL.h('<div class="form">' +
      '<div class="field"><label class="field__l">¿Cuánto entró?</label>' +
        '<input class="input input--big" data-m type="number" step="0.01" inputmode="decimal" placeholder="0"></div>' +
      '<div class="field"><label class="field__l">¿De dónde?</label>' +
        '<input class="input" data-d placeholder="Ej: sueldo"></div>' +
      '<p class="field__h">La plata entra como <b>libre</b>. Después la repartís en frascos, ' +
        'empezando por lo que ya está comprometido.</p>' +
    '</div>');

    SL.modal({
      title: 'Entró plata', body: body, okText: 'Sumar',
      onOk: function (b) {
        var m = parseFloat(SL.$('[data-m]', b).value);
        if (!m || m <= 0) { SL.toast('Poné un monto', 'err'); return false; }
        SL.store.update(function (st) {
          st.fin.saldo += m;
          st.fin.movs.push({
            id: SL.uid('m'), fecha: D.iso(D.today()), tipo: 'ingreso',
            monto: m, frasco: null, detalle: SL.$('[data-d]', b).value.trim()
          });
        });
        SL.toast('Entrada registrada');
        return true;
      }
    });
  }

  function modalAsignar(fid) {
    var s = SL.store.get();
    var f = C.frascos(s);
    var fr = f.lista.filter(function (x) { return x.id === fid; })[0];
    if (!fr) return;
    var cur = s.settings.currency;

    var body = SL.h('<div class="form">' +
      '<p class="field__h">Tenés <b>' + SL.fmt.money(f.libre, cur) + '</b> libres. ' +
        'Lo que asignes deja de estar disponible para otra cosa.</p>' +
      '<div class="field"><label class="field__l">Asignar a “' + esc(fr.nombre) + '”</label>' +
        '<input class="input input--big" data-m type="number" step="0.01" placeholder="0"></div>' +
      '<div class="field"><label class="field__l">O sacarle plata</label>' +
        '<input class="input" data-q type="number" step="0.01" placeholder="0">' +
        '<p class="field__h">Vuelve a quedar libre. Si es prestado y lo vas a reponer, marcá abajo.</p></div>' +
      '<label class="check"><input type="checkbox" data-deuda>' +
        '<span>Anotar que se lo tengo que devolver</span></label>' +
    '</div>');

    SL.modal({
      title: 'Mover plata', body: body, okText: 'Aplicar',
      onOk: function (b) {
        var suma = parseFloat(SL.$('[data-m]', b).value) || 0;
        var resta = parseFloat(SL.$('[data-q]', b).value) || 0;
        if (!suma && !resta) return false;
        var deuda = SL.$('[data-deuda]', b).checked;
        SL.store.update(function (st) {
          var r = st.fin.frascos.filter(function (x) { return x.id === fid; })[0];
          if (suma) {
            r.asignado = (r.asignado || 0) + suma;
            st.fin.movs.push({ id: SL.uid('m'), fecha: D.iso(D.today()), tipo: 'asignar',
              monto: suma, frasco: fid, detalle: 'Asignado a ' + r.nombre });
          }
          if (resta) {
            r.asignado = Math.max(r.gastado || 0, (r.asignado || 0) - resta);
            st.fin.movs.push({ id: SL.uid('m'), fecha: D.iso(D.today()), tipo: 'romper',
              monto: resta, frasco: fid, detalle: 'Sacado de ' + r.nombre });
            if (deuda) {
              st.fin.deudas.push({ id: SL.uid('d'), frascoId: fid, monto: resta,
                motivo: '', fecha: D.iso(D.today()), repuesto: false });
            }
          }
        });
        SL.toast('Listo');
        return true;
      }
    });
  }

  function reponer(id) {
    var s = SL.store.get();
    var d = (s.fin.deudas || []).filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    SL.store.update(function (st) {
      var r = st.fin.frascos.filter(function (x) { return x.id === d.frascoId; })[0];
      if (r) r.asignado = (r.asignado || 0) + d.monto;
      var deu = st.fin.deudas.filter(function (x) { return x.id === id; })[0];
      if (deu) deu.repuesto = true;
      st.fin.movs.push({ id: SL.uid('m'), fecha: D.iso(D.today()), tipo: 'reponer',
        monto: d.monto, frasco: d.frascoId, detalle: 'Repuesto' });
    });
    SL.toast('Frasco repuesto');
  }

  function cobrar(id) {
    var s = SL.store.get();
    var p = (s.fin.porCobrar || []).filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    SL.store.update(function (st) {
      st.fin.saldo += p.monto;
      st.fin.porCobrar = st.fin.porCobrar.filter(function (x) { return x.id !== id; });
      st.fin.movs.push({ id: SL.uid('m'), fecha: D.iso(D.today()), tipo: 'ingreso',
        monto: p.monto, frasco: null, detalle: 'Cobrado a ' + p.quien });
    });
    SL.toast('Cobrado');
  }

  function modalSaldo() {
    var s = SL.store.get();
    var f = C.frascos(s);
    var cur = s.settings.currency;
    var body = SL.h('<div class="form">' +
      '<div class="field"><label class="field__l">Saldo real de la cuenta</label>' +
        '<input class="input input--big" data-s type="number" step="0.01" value="' + f.saldo + '"></div>' +
      '<div class="field"><label class="field__l">De eso, no es tuyo</label>' +
        '<input class="input" data-n type="number" step="0.01" value="' + f.noPropio + '"></div>' +
      '<div class="recon">' +
        '<div class="recon__r"><span>En frascos</span><b class="u-num">' + SL.fmt.money(f.disponible, cur) + '</b></div>' +
        '<div class="recon__r"><span>Libre</span><b class="u-num">' + SL.fmt.money(f.libre, cur) + '</b></div>' +
        '<p class="field__h">Si el saldo del banco no coincide con esta suma, hay un movimiento sin registrar. ' +
          'Revisá transferencias, compras y plata prestada antes de corregir el número a mano.</p>' +
      '</div>' +
    '</div>');

    SL.modal({
      title: 'Saldo de la cuenta', body: body, okText: 'Guardar',
      onOk: function (b) {
        SL.store.update(function (st) {
          st.fin.saldo = parseFloat(SL.$('[data-s]', b).value) || 0;
          st.fin.noPropio = parseFloat(SL.$('[data-n]', b).value) || 0;
        });
        return true;
      }
    });
  }

  function modalFrasco(id) {
    var s = SL.store.get();
    var fr = id ? s.fin.frascos.filter(function (x) { return x.id === id; })[0] : null;
    var color = fr ? fr.color : 'cian';
    var tipo = fr ? fr.tipo : 'fijo';

    var body = SL.h('<div class="form">' +
      '<div class="field"><label class="field__l">Nombre</label>' +
        '<input class="input" data-n value="' + (fr ? esc(fr.nombre) : '') + '" placeholder="Ej: Estacionamiento"></div>' +
      '<div class="field"><label class="field__l">¿Qué función cumple?</label>' +
        '<div class="opciones" data-tipo>' +
          C.TIPOS.map(function (t) {
            return '<button type="button" class="opcion' + (tipo === t.k ? ' is-on' : '') + '" data-t="' + t.k + '">' +
              '<b>' + esc(t.l) + '</b><span>' + esc(t.d) + '</span></button>';
          }).join('') +
        '</div></div>' +
      '<div class="field"><label class="field__l">Color</label>' +
        '<div class="colores" data-colores>' +
          SL.PALETTE.map(function (c) {
            return '<button type="button" data-c="' + c + '" aria-label="' + c + '" class="color' +
              (c === color ? ' is-on' : '') + '" style="background:var(--c-' + c + ')"></button>';
          }).join('') +
        '</div></div>' +
      (fr ? '<button class="btn btn--danger" data-del>Eliminar frasco</button>' : '') +
    '</div>');

    SL.$('[data-tipo]', body).addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]'); if (!b) return;
      tipo = b.dataset.t;
      SL.$$('[data-t]', body).forEach(function (x) { x.classList.toggle('is-on', x === b); });
    });
    SL.$('[data-colores]', body).addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      color = b.dataset.c;
      SL.$$('[data-c]', body).forEach(function (x) { x.classList.toggle('is-on', x === b); });
    });
    if (fr) SL.$('[data-del]', body).addEventListener('click', function () {
      SL.confirm('Eliminar frasco',
        'La plata que tenía asignada vuelve a quedar libre. Los movimientos ya registrados se conservan.',
        'Eliminar').then(function (ok) {
        if (!ok) return;
        SL.store.update(function (st) {
          st.fin.frascos = st.fin.frascos.filter(function (x) { return x.id !== id; });
        });
        var x = SL.$('.modal-bg [data-x]'); if (x) x.click();
        SL.toast('Frasco eliminado');
      });
    });

    SL.modal({
      title: fr ? 'Editar frasco' : 'Nuevo frasco', body: body, okText: fr ? 'Guardar' : 'Crear',
      onOk: function (b) {
        var nombre = SL.$('[data-n]', b).value.trim();
        if (!nombre) { SL.toast('Poné un nombre', 'err'); return false; }
        SL.store.update(function (st) {
          if (fr) {
            var r = st.fin.frascos.filter(function (x) { return x.id === id; })[0];
            r.nombre = nombre; r.tipo = tipo; r.color = color;
          } else {
            st.fin.frascos.push({
              id: SL.uid('f'), nombre: nombre, tipo: tipo, color: color,
              asignado: 0, gastado: 0, orden: st.fin.frascos.length
            });
          }
        });
        SL.toast(fr ? 'Frasco actualizado' : 'Frasco creado');
        return true;
      }
    });
  }

})(window.SL = window.SL || {});
