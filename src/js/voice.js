/* ============================================================
   Zenit · Carga de gastos por voz

   Apretás el micrófono, decís algo como "gasté quinientos en nafta"
   y aparece el gasto ya cargado en un modal para confirmar con un
   toque. Corre entero en el navegador: usa el reconocimiento de voz
   que ya trae Chrome/Android (Web Speech API), sin mandar nada a
   ningún servidor propio ni depender de ninguna cuenta.

   Por qué confirma en vez de guardar directo: un micrófono se
   equivoca — "gasté 500" puede escucharse "gasté cien". Guardar a
   ciegas rompería la confianza la primera vez que falle. Mostrando
   lo que entendió y pidiendo un solo toque para confirmar, el error
   se corrige en el momento en vez de aparecer como un fantasma en
   las cuentas dentro de un mes.

   Qué NO es esto: no hay ningún modelo entrenado, ninguna llamada a
   una IA de terceros. Es reconocimiento de voz nativo del navegador
   más un parser de texto escrito acá. Se lo llama "por voz", no
   "con inteligencia artificial", porque es lo que es.
   ============================================================ */
(function (SL) {
  'use strict';

  var D = SL.date, esc = SL.esc;

  function Motor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function disponible() {
    return !!Motor();
  }

  /* ————————————————— números dichos en palabras —————————————————
     El reconocedor de Chrome casi siempre devuelve los montos ya como
     dígitos ("gasté 500 en nafta"), pero no siempre — a veces transcribe
     "quinientos" tal cual. Este parser cubre el rango de uso real: de
     "cero" a los noecientos mil y pico, con la gramática normal del
     español (mil, cien/ciento, veintitrés, treinta y cinco). No intenta
     cubrir números que nadie dice al pasar un gasto (millones, fracciones
     raras) — para eso ya está el campo editable en el modal de confirmación. */
  var UNIDADES = {
    cero:0, un:1, uno:1, una:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9,
    diez:10, once:11, doce:12, trece:13, catorce:14, quince:15,
    dieciseis:16, dieciséis:16, diecisiete:17, dieciocho:18, diecinueve:19,
    veinte:20, veintiuno:21, veintiún:21, veintidos:22, veintidós:22, veintitres:23, veintitrés:23,
    veinticuatro:24, veinticinco:25, veintiseis:26, veintiséis:26, veintisiete:27, veintiocho:28, veintinueve:29
  };
  var DECENAS = { treinta:30, cuarenta:40, cincuenta:50, sesenta:60, setenta:70, ochenta:80, noventa:90 };
  var CENTENAS = {
    cien:100, ciento:100, doscientos:200, doscientas:200, trescientos:300, trescientas:300,
    cuatrocientos:400, cuatrocientas:400, quinientos:500, quinientas:500, seiscientos:600, seiscientas:600,
    setecientos:700, setecientas:700, ochocientos:800, ochocientas:800, novecientos:900, novecientas:900
  };

  function limpiar(s) {
    return s.toLowerCase()
      .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
      .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u');
  }

  /* Convierte una secuencia de palabras-número (ya separadas, sin "y" salvo
     el de las decenas) en su valor. Devuelve null si no hay nada que leer,
     así el llamador sabe distinguir "no dijo un número" de "dijo cero". */
  function palabrasANumero(tokens) {
    var total = 0, miles = 0, actual = 0, tocado = false;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t === 'mil') {
        tocado = true;
        miles += (actual || 1) * 1000;
        actual = 0;
        continue;
      }
      if (t in CENTENAS) { tocado = true; actual += CENTENAS[t]; continue; }
      if (t in DECENAS) { tocado = true; actual += DECENAS[t]; continue; }
      if (t in UNIDADES) { tocado = true; actual += UNIDADES[t]; continue; }
      if (t === 'y') continue;   // "treinta y cinco" — el "y" no suma nada
      break;                      // primera palabra que no es número: se corta acá
    }
    if (!tocado) return null;
    total = miles + actual;
    return total || null;
  }

  /* Busca el primer monto en el texto: primero como dígitos (lo más común
     en lo que devuelve el navegador), y si no aparece ninguno, como
     palabras. */
  function extraerMonto(texto) {
    var m = texto.match(/\d[\d.,]*\d|\d/);
    if (m) {
      var raw = m[0];
      // "1.500" (miles con punto) vs "1500.50" (decimal): si el último
      // grupo tiene 1 o 2 dígitos y hay más de un separador, es decimal;
      // si no, los puntos/comas son separadores de miles y se descartan.
      var partes = raw.split(/[.,]/);
      var val;
      if (partes.length > 1 && partes[partes.length - 1].length <= 2 && raw.match(/[.,]/g).length === 1) {
        val = parseFloat(partes[0].replace(/\D/g, '') + '.' + partes[partes.length - 1]);
      } else {
        val = parseFloat(raw.replace(/[.,]/g, ''));
      }
      if (val > 0) return { valor: val, inicio: m.index, fin: m.index + raw.length };
    }

    var palabras = limpiar(texto).split(/\s+/);
    for (var i = 0; i < palabras.length; i++) {
      if (!(palabras[i] in UNIDADES) && !(palabras[i] in DECENAS) && !(palabras[i] in CENTENAS) && palabras[i] !== 'mil') continue;
      var j = i;
      while (j < palabras.length && (palabras[j] in UNIDADES || palabras[j] in DECENAS ||
             palabras[j] in CENTENAS || palabras[j] === 'mil' || palabras[j] === 'y')) j++;
      var val2 = palabrasANumero(palabras.slice(i, j));
      if (val2) return { valor: val2, palabraInicio: i, palabraFin: j };
    }
    return null;
  }

  var VERBOS_GASTO   = /\b(gaste|gasté|pague|pagué|compre|compré|use|usé|puse)\b/;
  var VERBOS_INGRESO = /\b(cobre|cobré|entro|entró|recibi|recibí|deposit[oó]|ingres[oó]|me pagaron)\b/;
  var RUIDO = /\b(pesos|peso|mango|mangos|dolares|dólares|plata|guita|ars|usd|en|de|del|la|el|un|una|para|por)\b/g;

  /* De un texto completo saca: tipo (gasto/ingreso), monto y una
     descripción — lo que queda después de sacar el verbo, el monto y las
     palabras de relleno. Todo heurístico y a propósito conservador: mejor
     dejar el campo vacío que inventar algo raro. */
  function interpretar(texto) {
    var plano = limpiar(texto);
    var tipo = VERBOS_INGRESO.test(plano) ? 'ingreso' : 'gasto';   // el gasto es el caso por defecto: es lo que se carga diez veces más seguido
    var monto = extraerMonto(texto);

    var detalle = plano
      .replace(VERBOS_GASTO, ' ').replace(VERBOS_INGRESO, ' ')
      .replace(/\d[\d.,]*\d|\d/g, ' ');
    // saca también las palabras-número que haya usado, si el monto vino de ahí
    Object.keys(UNIDADES).concat(Object.keys(DECENAS), Object.keys(CENTENAS), ['mil'])
      .forEach(function (w) { detalle = detalle.replace(new RegExp('\\b' + w + '\\b', 'g'), ' '); });
    detalle = detalle.replace(RUIDO, ' ').replace(/\s+/g, ' ').trim();
    // Primera letra en mayúscula, nomás por prolijidad — el resto del texto de la app también lo hace.
    if (detalle) detalle = detalle.charAt(0).toUpperCase() + detalle.slice(1);

    return { tipo: tipo, monto: monto ? monto.valor : null, detalle: detalle, transcripcion: texto };
  }

  /* ¿A qué frasco se parece más lo que dijo? Compara contra los nombres
     reales de los frascos del usuario — como esos nombres son suyos
     ("Estacionamiento", "Gimnasio", "Semana 2"), decir el nombre tal cual
     pega directo la mayoría de las veces. Si no hay ningún parecido, no
     se fuerza nada: se deja como plata libre, que es la opción segura. */
  function adivinarFrasco(detalle, frascos) {
    if (!detalle || !frascos.length) return null;
    var palabras = limpiar(detalle).split(/\s+/).filter(function (w) { return w.length > 2; });
    if (!palabras.length) return null;

    var mejor = null, mejorPuntaje = 0;
    frascos.forEach(function (f) {
      var nombre = limpiar(f.nombre);
      var puntaje = 0;
      if (nombre.indexOf(limpiar(detalle)) !== -1 || limpiar(detalle).indexOf(nombre) !== -1) puntaje += 3;
      palabras.forEach(function (p) { if (nombre.indexOf(p) !== -1) puntaje += 1; });
      if (puntaje > mejorPuntaje) { mejorPuntaje = puntaje; mejor = f; }
    });
    return mejorPuntaje > 0 ? mejor : null;
  }

  /* ————————————————— la escucha ————————————————— */
  var reco = null, activo = false;

  function escuchar(cb) {
    var Ctor = Motor();
    if (!Ctor) { cb({ error: 'sin-soporte' }); return; }
    if (activo) return;

    try {
      reco = new Ctor();
    } catch (e) { cb({ error: 'sin-soporte' }); return; }

    reco.lang = 'es-AR';
    reco.interimResults = true;
    reco.maxAlternatives = 1;
    reco.continuous = false;

    var huboResultado = false;
    activo = true;

    reco.onresult = function (e) {
      var last = e.results[e.results.length - 1];
      var texto = last[0].transcript;
      if (last.isFinal) {
        huboResultado = true;
        cb({ final: true, texto: texto });
      } else {
        cb({ final: false, texto: texto });
      }
    };
    reco.onerror = function (e) {
      activo = false;
      if (e.error === 'no-speech') cb({ error: 'sin-voz' });
      else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') cb({ error: 'sin-permiso' });
      else cb({ error: 'otro' });
    };
    reco.onend = function () {
      activo = false;
      if (!huboResultado) cb({ error: 'sin-resultado' });
    };

    cb({ arranco: true });
    try { reco.start(); } catch (e) { activo = false; cb({ error: 'sin-soporte' }); }
  }

  function detener() {
    if (reco && activo) { try { reco.stop(); } catch (e) {} }
  }

  SL.voice = {
    disponible: disponible,
    escuchar: escuchar,
    detener: detener,
    interpretar: interpretar,          // se exponen para poder testear el parser aparte
    extraerMonto: extraerMonto,
    adivinarFrasco: adivinarFrasco
  };

  /* ————————————————— la UI: botón flotante + confirmación ————————————————— */
  var pill = null, fab = null;

  function montarFAB() {
    if (fab) return;
    fab = SL.h(
      '<button class="voice-fab" aria-label="Cargar un gasto por voz" data-voice-fab>' +
        SL.icon('mic') +
      '</button>'
    );
    document.body.appendChild(fab);
    fab.addEventListener('click', abrir);
  }

  function ocultarFAB(oculto) {
    if (fab) fab.classList.toggle('is-oculto', !!oculto);
  }

  function pillMostrar(texto, estado) {
    if (!pill) {
      pill = SL.h('<div class="voice-pill" role="status" aria-live="polite"><span class="voice-pill__dot"></span><span data-txt></span></div>');
      document.body.appendChild(pill);
    }
    pill.className = 'voice-pill' + (estado ? ' is-' + estado : '');
    SL.$('[data-txt]', pill).textContent = texto;
    pill.classList.add('is-on');
  }
  function pillOcultar() {
    if (pill) pill.classList.remove('is-on');
  }

  function abrir() {
    if (!disponible()) {
      SL.toast('Este navegador no permite dictado por voz. Probá desde Chrome o Android.', 'err');
      return;
    }
    fab.classList.add('is-escuchando');
    pillMostrar('Escuchando…', 'listen');

    escuchar(function (r) {
      if (r.arranco) { if (navigator.vibrate) navigator.vibrate(10); return; }

      if (r.error) {
        fab.classList.remove('is-escuchando');
        pillOcultar();
        var msg = {
          'sin-voz':      'No se escuchó nada. Probá de nuevo, más cerca del micrófono.',
          'sin-permiso':  'Sin permiso de micrófono. Habilitalo en los ajustes del navegador para este sitio.',
          'sin-soporte':  'Este navegador no permite dictado por voz.',
          'sin-resultado':'No se entendió nada. Probá de nuevo.',
          otro:           'Algo falló con el micrófono. Probá de nuevo.'
        }[r.error] || 'No se pudo escuchar.';
        if (r.error !== 'sin-resultado') SL.toast(msg, 'err');
        return;
      }

      if (!r.final) { pillMostrar(r.texto, 'listen'); return; }

      fab.classList.remove('is-escuchando');
      pillOcultar();
      if (navigator.vibrate) navigator.vibrate([8, 40, 8]);
      confirmar(interpretar(r.texto));
    });
  }

  function confirmar(res) {
    var s = SL.store.get();
    var cur = s.settings.currency;
    var frascos = SL.compute.frascos(s).lista;
    var guess = res.monto ? adivinarFrasco(res.detalle, frascos) : null;
    var tipo = res.tipo;

    var body = SL.h('<div class="form">' +
      '<div class="voice-heard"><span class="voice-heard__l">Se entendió</span>' +
        '<span class="voice-heard__t">&ldquo;' + esc(res.transcripcion) + '&rdquo;</span></div>' +
      '<div class="seg" data-type style="width:fit-content">' +
        '<button type="button" class="seg__b' + (tipo === 'gasto' ? ' is-on' : '') + '" data-t="gasto">Gasto</button>' +
        '<button type="button" class="seg__b' + (tipo === 'ingreso' ? ' is-on' : '') + '" data-t="ingreso">Ingreso</button>' +
      '</div>' +
      '<div class="field"><label class="field__l">Monto</label>' +
        '<input class="input input--big" data-m type="number" step="0.01" inputmode="decimal" ' +
        'value="' + (res.monto || '') + '" placeholder="0" autofocus></div>' +
      '<div class="field"><label class="field__l">¿De qué frasco sale?</label>' +
        '<select class="select" data-fr>' +
          '<option value="">Plata libre</option>' +
          frascos.map(function (f) {
            var disp = (f.asignado || 0) - (f.gastado || 0);
            return '<option value="' + f.id + '"' + (guess && guess.id === f.id ? ' selected' : '') + '>' +
              esc(f.nombre) + ' — ' + SL.fmt.money(disp, cur) + '</option>';
          }).join('') +
        '</select></div>' +
      '<div class="field"><label class="field__l">Detalle</label>' +
        '<input class="input" data-d value="' + esc(res.detalle || '') + '" placeholder="Ej: nafta"></div>' +
    '</div>');

    SL.$('[data-type]', body).addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]'); if (!b) return;
      tipo = b.dataset.t;
      SL.$$('[data-t]', body).forEach(function (x) { x.classList.toggle('is-on', x === b); });
    });

    SL.modal({
      title: 'Cargar por voz', body: body, okText: 'Cargar',
      onOk: function (b) {
        var m = parseFloat(SL.$('[data-m]', b).value);
        if (!m || m <= 0) { SL.toast('Poné un monto válido', 'err'); return false; }
        var fid = SL.$('[data-fr]', b).value;
        var detalle = SL.$('[data-d]', b).value.trim();

        SL.store.update(function (st) {
          if (tipo === 'gasto') {
            st.fin.saldo -= m;
            if (fid) {
              var fr = st.fin.frascos.filter(function (x) { return x.id === fid; })[0];
              if (fr) fr.gastado = (fr.gastado || 0) + m;
            }
          } else {
            st.fin.saldo += m;
          }
          st.fin.movs.push({
            id: SL.uid('m'), fecha: D.iso(D.today()), tipo: tipo,
            monto: Math.round(m * 100) / 100, frasco: tipo === 'gasto' ? (fid || null) : null,
            detalle: detalle
          });
        });
        if (navigator.vibrate) navigator.vibrate(14);
        SL.toast((tipo === 'gasto' ? 'Gasto' : 'Ingreso') + ' cargado por voz');
        return true;
      }
    });
  }

  SL.voiceFAB = { montar: montarFAB, ocultar: ocultarFAB };

})(window.SL = window.SL || {});
