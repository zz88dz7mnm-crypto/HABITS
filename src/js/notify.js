/* ============================================================
   StarkLab Web · Notificaciones
   Recordatorios locales programados por la app y disparados por
   el service worker, así llegan aunque la pestaña esté cerrada.

   Límite real y honesto: en iPhone las notificaciones sólo
   funcionan si la app fue agregada a la pantalla de inicio desde
   Safari. Abierta como pestaña, no llegan. En Android funcionan
   de las dos formas. Esto se avisa en el onboarding.
   ============================================================ */
(function (SL) {
  'use strict';

  var D = SL.date;
  var timers = [];

  function supported() { return 'Notification' in window; }
  function granted() { return supported() && Notification.permission === 'granted'; }

  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function standalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  /* Qué se puede prometer en este dispositivo, dicho sin vueltas. */
  function estado() {
    if (!supported()) return { ok: false, txt: 'Este navegador no soporta notificaciones.' };
    if (isIOS() && !standalone()) {
      return { ok: false, ios: true, txt: 'En iPhone las notificaciones sólo funcionan con la app agregada a la pantalla de inicio. Compartir → “Agregar a pantalla de inicio”.' };
    }
    if (Notification.permission === 'denied') {
      return { ok: false, txt: 'Bloqueaste las notificaciones. Se habilitan desde los ajustes del navegador para este sitio.' };
    }
    if (Notification.permission === 'granted') return { ok: true, txt: 'Notificaciones activas en este dispositivo.' };
    return { ok: false, ask: true, txt: 'Falta dar permiso de notificaciones.' };
  }

  function ask() {
    if (!supported()) return Promise.resolve(false);
    return Notification.requestPermission().then(function (p) {
      var ok = p === 'granted';
      if (ok) { show('Listo', 'Te vamos a avisar de tus hábitos, presupuestos y diario.'); schedule(); }
      return ok;
    });
  }

  function show(title, body, tag) {
    if (!granted()) return;
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'notify', title: title, body: body, tag: tag || 'starklab'
      });
    } else {
      try { new Notification(title, { body: body, icon: 'icons/icon-192.png', tag: tag }); } catch (e) {}
    }
  }

  /* Programa los avisos del día. Se vuelve a llamar en cada cambio de
     configuración y al abrir la app, así los horarios quedan al día. */
  function schedule() {
    timers.forEach(clearTimeout);
    timers = [];
    if (!granted()) return;

    var s = SL.store.get();
    var n = s.settings.notif || {};

    if (n.habits && n.habitsAt) at(n.habitsAt, function () {
      var st = SL.store.get(), t = D.today(), key = D.iso(t);
      var due = SL.compute.activeHabits(st).filter(function (h) { return SL.compute.due(h, t); });
      var falta = due.filter(function (h) { return !SL.compute.isDone(st, h.id, key); });
      if (!falta.length) return;
      show('Hábitos pendientes',
        'Te faltan ' + falta.length + ': ' + falta.slice(0, 3).map(function (h) { return h.name; }).join(', ') +
        (falta.length > 3 ? '…' : ''), 'habitos');
    });

    if (n.journal && n.journalAt) at(n.journalAt, function () {
      var st = SL.store.get(), key = D.iso(D.today());
      if (st.journal.some(function (e) { return e.date === key && (e.text || '').trim(); })) return;
      show('¿Cómo estuvo el día?', 'Una línea en el diario alcanza.', 'diario');
    });

    if (n.weekly) {
      var t = D.today();
      // Domingo a las 20:00
      if (D.dow(t) === 6) at('20:00', function () {
        var st = SL.store.get();
        var ws = D.startOfWeek(D.today());
        var wk = SL.compute.weekOverall(st, ws).filter(function (d) { return d.rate !== null; });
        var avg = wk.length ? wk.reduce(function (a, d) { return a + d.rate; }, 0) / wk.length : 0;
        show('Resumen de la semana',
          'Cumpliste el ' + Math.round(avg * 100) + '% de tus hábitos esta semana.', 'semanal');
      });
    }

    if (n.budget) checkBudget();
  }

  /* Programa una función para hoy a las HH:MM. Si ya pasó, no hace nada:
     un recordatorio atrasado molesta más de lo que sirve. */
  function at(hhmm, fn) {
    var p = hhmm.split(':');
    var d = new Date();
    d.setHours(+p[0], +p[1], 0, 0);
    var ms = d - Date.now();
    if (ms <= 0) return;
    // setTimeout no es confiable más allá de ~24 días; acá siempre es el mismo día.
    timers.push(setTimeout(fn, ms));
  }

  /* Aviso de presupuesto: se dispara al pasar el 85% de un tope, una vez
     por categoría y por mes, para no volverse ruido. */
  function checkBudget() {
    if (!granted()) return;
    var s = SL.store.get();
    if (!s.settings.notif.budget) return;
    var t = D.today();
    var f = SL.compute.finance(s, t.getFullYear(), t.getMonth());
    var mk = D.monthKey(t);
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem('starklab:budgetwarn') || '{}'); } catch (e) {}

    f.cats.forEach(function (c) {
      if (!c.budget) return;
      var p = c.value / c.budget;
      if (p < 0.85) return;
      var key = mk + ':' + c.id + ':' + (p >= 1 ? 'over' : 'near');
      if (seen[key]) return;
      seen[key] = 1;
      show(p >= 1 ? 'Te pasaste del presupuesto' : 'Cerca del límite',
        c.name + ': ' + SL.fmt.money(c.value, s.settings.currency) + ' de ' +
        SL.fmt.money(c.budget, s.settings.currency) + '.', 'presu-' + c.id);
    });
    try { localStorage.setItem('starklab:budgetwarn', JSON.stringify(seen)); } catch (e) {}
  }

  SL.notify = {
    supported: supported, granted: granted, estado: estado,
    ask: ask, show: show, schedule: schedule, checkBudget: checkBudget,
    isIOS: isIOS, standalone: standalone
  };

})(window.SL = window.SL || {});
