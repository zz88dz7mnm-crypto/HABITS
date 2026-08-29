/* ============================================================
   Zenit · Piezas de interfaz
   Íconos, helpers de DOM, toasts y modales.
   ============================================================ */
(function (SL) {
  'use strict';

  /* — Íconos: trazo de 2px, 24×24, estilo consistente — */
  var P = {
    inicio:    '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    tareas:    '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="m3 6 1.6 1.6L7.5 4.7"/><path d="m3 12 1.6 1.6L7.5 10.7"/><path d="m3 18 1.6 1.6L7.5 16.7"/>',
    habitos:   '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><path d="m15 17.2 1.8 1.8 3.4-3.6"/>',
    metas:     '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    finanzas:  '<rect x="2.5" y="6" width="19" height="13" rx="3"/><path d="M2.5 10.5h19"/><path d="M17 15h2"/>',
    calendario:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/>',
    entreno:   '<path d="M6.5 6.5v11M17.5 6.5v11"/><path d="M3.5 9v6M20.5 9v6"/><path d="M6.5 12h11"/>',
    enfoque:   '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9 2h6"/>',
    agenda:    '<path d="M7 3v3M17 3v3"/><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M8 11h8M8 15.5h5"/>',
    progreso:  '<path d="M3 17.5 9 11l4 4 8-8.5"/><path d="M15.5 6.5H21v5.5"/>',
    logros:    '<circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-1.5 7 5-2.6 5 2.6-1.5-7"/>',
    perfil:    '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    familia:   '<circle cx="8.5" cy="9" r="3.2"/><circle cx="16.5" cy="10" r="2.6"/><path d="M2.8 19.5a5.8 5.8 0 0 1 11.4 0"/><path d="M15 15.2a5 5 0 0 1 6.2 4.3"/>',
    config:    '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.03Z"/>',
    diario:    '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M4 17h16"/><path d="M8.5 7h7M8.5 11h4"/>',
    pausa:     '<path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7Z"/>',
    menu:      '<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/>',
    sol:       '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>',
    idioma:    '<circle cx="12" cy="12" r="9"/><path d="M3.2 9.5h17.6M3.2 14.5h17.6"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>',
    mas:       '<path d="M12 5.5v13M5.5 12h13"/>',
    x:         '<path d="M6 6l12 12M18 6 6 18"/>',
    izq:       '<path d="m14.5 5-7 7 7 7"/>',
    der:       '<path d="m9.5 5 7 7-7 7"/>',
    abajo:     '<path d="m6 9.5 6 6 6-6"/>',
    tacho:     '<path d="M4 6.5h16"/><path d="M9 6.5V4.5h6v2"/><path d="M6.5 6.5 7.5 20h9l1-13.5"/>',
    grip:      '<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
    buscar:    '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    bajar:     '<path d="M12 3.5v12M7 11l5 5 5-5"/><path d="M4.5 20.5h15"/>',
    subir:     '<path d="M12 20.5v-12M7 13l5-5 5 5"/><path d="M4.5 3.5h15"/>',
    campana:   '<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    fuego:     '<path d="M12 22c4 0 6.5-2.6 6.5-6 0-4.5-4-5.5-3.5-10C11.5 8 8 9 8 13c0 1.4.6 2.4 1.2 3-1.6.3-3.7 1.4-3.7 3.6C5.5 20.4 8 22 12 22Z"/>',
    arribaFl:  '<path d="m6 15 6-6 6 6"/>',
    abajoFl:   '<path d="m6 9 6 6 6-6"/>',
    dolar:     '<path d="M12 2.5v19"/><path d="M16.5 6.5H9.8a3.3 3.3 0 0 0 0 6.6h4.4a3.3 3.3 0 0 1 0 6.6H7"/>',
    check:     '<path d="m4.5 12.5 5 5 10-11"/>',
    play:      '<path d="M7 4.5 19 12 7 19.5Z"/>',
    pause2:    '<path d="M8.5 5v14M15.5 5v14"/>',
    reload:    '<path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1"/><path d="M3 19.5V14h5.5"/>',
    nota:      '<path d="M5 4.5h14v11l-4.5 4.5H5Z"/><path d="M19 15.5h-4.5V20"/>',
    filtro:    '<path d="M3.5 5.5h17l-6.5 8v6l-4 2v-8Z"/>',
    lugar:     '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>'
  };

  SL.icon = function (name, cls) {
    var p = P[name];
    if (!p) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round"' + (cls ? ' class="' + cls + '"' : '') +
      ' aria-hidden="true">' + p + '</svg>';
  };

  /* — Escape de HTML. Vive acá porque es lo primero que carga y todo lo demás
     lo usa: nada de lo que escribe el usuario se inyecta sin pasar por acá. — */
  SL.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* — DOM — */
  SL.$  = function (s, r) { return (r || document).querySelector(s); };
  SL.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  SL.h = function (html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  SL.frag = function (html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content;
  };

  /* — Toasts — */
  var toastHost = null;
  SL.toast = function (msg, kind) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toasts';
      document.body.appendChild(toastHost);
    }
    var t = SL.h('<div class="toast' + (kind ? ' toast--' + kind : '') + '" role="status">' +
      '<span class="toast__i"></span><span>' + SL.esc(msg) + '</span></div>');
    toastHost.appendChild(t);
    setTimeout(function () {
      t.classList.add('is-out');
      setTimeout(function () { t.remove(); }, 260);
    }, kind === 'err' ? 4200 : 2600);
  };

  /* — Modal —
     Devuelve una promesa: resuelve con el resultado de onOk, o null si se cierra. */
  SL.modal = function (opt) {
    return new Promise(function (resolve) {
      var bg = SL.h('<div class="modal-bg" role="dialog" aria-modal="true"><div class="modal">' +
        '<div class="modal__head"><h2 class="modal__t">' + SL.esc(opt.title || '') + '</h2>' +
        '<button class="icon-btn" data-x aria-label="Cerrar" style="margin-left:auto">' + SL.icon('x') + '</button></div>' +
        '<div class="modal__body"></div>' +
        '<div class="modal__foot"></div></div></div>');

      var body = SL.$('.modal__body', bg);
      var foot = SL.$('.modal__foot', bg);
      if (typeof opt.body === 'string') body.innerHTML = opt.body;
      else if (opt.body) body.appendChild(opt.body);

      var cancel = SL.h('<button class="btn btn--ghost">' + SL.esc(opt.cancelText || 'Cancelar') + '</button>');
      var ok = SL.h('<button class="btn ' + (opt.danger ? 'btn--danger' : 'btn--primary') + '">' +
        SL.esc(opt.okText || 'Guardar') + '</button>');
      if (opt.cancelText !== null) foot.appendChild(cancel);
      if (opt.okText !== null) foot.appendChild(ok);

      function close(v) {
        bg.classList.remove('is-on');
        document.removeEventListener('keydown', esc);
        setTimeout(function () { bg.remove(); }, 240);
        resolve(v);
      }
      function esc(e) {
        if (e.key === 'Escape') close(null);
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ok.click();
      }

      cancel.addEventListener('click', function () { close(null); });
      SL.$('[data-x]', bg).addEventListener('click', function () { close(null); });
      bg.addEventListener('mousedown', function (e) { if (e.target === bg) close(null); });
      ok.addEventListener('click', function () {
        var v = opt.onOk ? opt.onOk(body) : true;
        if (v === false) return;                       // validación falló
        close(v);
      });
      document.addEventListener('keydown', esc);

      document.body.appendChild(bg);
      requestAnimationFrame(function () {
        bg.classList.add('is-on');
        var first = body.querySelector('input,textarea,select');
        if (first) first.focus();
      });
    });
  };

  SL.confirm = function (title, text, okText) {
    return SL.modal({
      title: title,
      body: '<p style="color:var(--text-2);line-height:1.6">' + SL.esc(text) + '</p>',
      okText: okText || 'Sí, borrar',
      danger: true,
      onOk: function () { return true; }
    });
  };

  /* — Interruptor — */
  SL.switchEl = function (on, onChange) {
    var b = SL.h('<button class="switch' + (on ? ' is-on' : '') + '" role="switch" aria-checked="' + !!on + '"></button>');
    b.addEventListener('click', function () {
      var v = !b.classList.contains('is-on');
      b.classList.toggle('is-on', v);
      b.setAttribute('aria-checked', v);
      onChange(v);
    });
    return b;
  };

  /* — Nombres — */
  SL.MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  SL.DIAS   = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  SL.DIAS_C = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  SL.MOODS  = [
    { v: 1, e: '😞', l: 'Mal' },
    { v: 2, e: '😕', l: 'Flojo' },
    { v: 3, e: '😐', l: 'Normal' },
    { v: 4, e: '🙂', l: 'Bien' },
    { v: 5, e: '😄', l: 'Excelente' }
  ];

  /* — El número que importa —
     Cada pantalla tiene un número protagonista: el % del mes, lo libre
     para gastar, el índice general. En vez de que aparezca de golpe,
     cuenta hasta ahí — es la firma que hace que el dato se sienta pesado,
     no un texto más. Respeta prefers-reduced-motion mostrando el valor
     final directo, sin arrancar una animación que el usuario pidió no ver.

     `el`: el nodo de texto. `to`: el valor final. `opts.from` (default 0),
     `opts.duration` en ms (default 850), `opts.format(v)` para el string
     final (por defecto redondea). Reentrante: si se llama de nuevo sobre
     el mismo nodo mientras cuenta, cancela la cuenta anterior — si no, dos
     redibujados seguidos dejarían dos animaciones peleando por el texto. */
  SL.countUp = function (el, to, opts) {
    if (!el) return;
    opts = opts || {};
    var from = opts.from === undefined ? 0 : opts.from;
    var dur = opts.duration === undefined ? 850 : opts.duration;
    var fmt = opts.format || function (v) { return String(Math.round(v)); };

    if (el.__countUpRaf) cancelAnimationFrame(el.__countUpRaf);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || to === null || to === undefined) {
      el.textContent = to === null || to === undefined ? '—' : fmt(to);
      return;
    }
    var t0 = null;
    function paso(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var suave = 1 - Math.pow(1 - p, 3);           // ease-out cúbico: arranca rápido, llega despacio
      el.textContent = fmt(from + (to - from) * suave);
      el.__countUpRaf = p < 1 ? requestAnimationFrame(paso) : null;
    }
    el.__countUpRaf = requestAnimationFrame(paso);
  };

})(window.SL = window.SL || {});
