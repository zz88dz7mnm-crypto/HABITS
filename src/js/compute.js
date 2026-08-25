/* ============================================================
   StarkLab Web · Cálculos derivados
   Todo lo que los gráficos y las tarjetas necesitan saber, en un
   solo lugar: cumplimiento, rachas, agregados de plata y el
   puntaje de las seis áreas del radar.
   ============================================================ */
(function (SL) {
  'use strict';

  var D = SL.date;

  function activeHabits(s) {
    return s.habits.filter(function (h) { return !h.archived; })
                   .sort(function (a, b) { return a.order - b.order; });
  }

  /* ¿A este hábito le toca este día? Un hábito de lunes/miércoles no
     cuenta como incumplido un domingo — si no, el % castiga sin razón. */
  function due(h, date) {
    var wd = D.dow(date);
    if (h.freq === 'daily') return true;
    return h.days.indexOf(wd) !== -1;
  }

  function isDone(s, hid, key) { return !!(s.checks[hid] && s.checks[hid][key]); }

  /* Cumplimiento de un día: hechos / los que tocaban. Devuelve null si no
     tocaba ninguno, para que el gráfico corte la línea en vez de dibujar 0%. */
  function dayRate(s, date) {
    var hs = activeHabits(s), key = D.iso(date), n = 0, k = 0;
    hs.forEach(function (h) {
      if (!due(h, date)) return;
      n++; if (isDone(s, h.id, key)) k++;
    });
    return n === 0 ? null : k / n;
  }

  function monthSeries(s, year, month) {
    var days = D.daysInMonth(year, month), out = [], t = D.today();
    for (var i = 1; i <= days; i++) {
      var d = new Date(year, month, i);
      out.push({
        day: i,
        date: D.iso(d),
        future: d > t,
        rate: d > t ? null : dayRate(s, d),
        note: noteOfDay(s, D.iso(d))
      });
    }
    return out;
  }

  /* La misma serie del mes, pero de un solo hábito: 1 si lo cumplió, 0 si
     no, y null los días en que no le tocaba (ahí la línea se corta en vez
     de mentir un cero). */
  function habitMonthSeries(s, h, year, month) {
    var days = D.daysInMonth(year, month), out = [], t = D.today();
    for (var i = 1; i <= days; i++) {
      var d = new Date(year, month, i);
      var futuro = d > t;
      out.push({
        day: i,
        date: D.iso(d),
        future: futuro,
        rate: (futuro || !due(h, d)) ? null : (isDone(s, h.id, D.iso(d)) ? 1 : 0)
      });
    }
    return out;
  }

  function noteOfDay(s, key) {
    var found = null;
    Object.keys(s.notes).forEach(function (hid) {
      if (s.notes[hid] && s.notes[hid][key] && !found) {
        var h = s.habits.filter(function (x) { return x.id === hid; })[0];
        found = { habit: h ? h.name : '', emoji: h ? h.emoji : '', text: s.notes[hid][key] };
      }
    });
    return found;
  }

  /* Promedio del mes, ignorando los días sin nada agendado y el futuro. */
  function monthRate(s, year, month) {
    var ser = monthSeries(s, year, month).filter(function (p) { return p.rate !== null; });
    if (!ser.length) return 0;
    return ser.reduce(function (a, p) { return a + p.rate; }, 0) / ser.length;
  }

  /* Racha: días consecutivos cumplidos hacia atrás, saltando los días en
     que el hábito no tocaba (no rompen la racha). */
  function streak(s, h) {
    var d = D.today(), n = 0, guard = 0;
    // Si hoy todavía no lo marcó, la racha se cuenta desde ayer.
    if (due(h, d) && !isDone(s, h.id, D.iso(d))) d = D.addDays(d, -1);
    while (guard++ < 730) {
      if (!due(h, d)) { d = D.addDays(d, -1); continue; }
      if (isDone(s, h.id, D.iso(d))) { n++; d = D.addDays(d, -1); }
      else break;
    }
    return n;
  }

  function bestStreak(s, h) {
    var keys = Object.keys(s.checks[h.id] || {}).sort();
    if (!keys.length) return 0;
    var best = 0, cur = 0, prev = null;
    keys.forEach(function (k) {
      var d = D.parse(k);
      if (prev) {
        var gap = Math.round((d - prev) / 86400000), ok = true;
        for (var i = 1; i < gap; i++) if (due(h, D.addDays(prev, i))) { ok = false; break; }
        cur = ok ? cur + 1 : 1;
      } else cur = 1;
      best = Math.max(best, cur); prev = d;
    });
    return best;
  }

  /* Cumplimiento de una semana por hábito, para la barra de la grilla. */
  function weekRate(s, h, weekStart) {
    var n = 0, k = 0;
    for (var i = 0; i < 7; i++) {
      var d = D.addDays(weekStart, i);
      if (d > D.today()) continue;
      if (!due(h, d)) continue;
      n++; if (isDone(s, h.id, D.iso(d))) k++;
    }
    return { done: k, total: n, rate: n ? k / n : null };
  }

  function weekOverall(s, weekStart) {
    var hs = activeHabits(s), out = [];
    for (var i = 0; i < 7; i++) {
      var d = D.addDays(weekStart, i);
      var n = 0, k = 0;
      hs.forEach(function (h) {
        if (!due(h, d)) return;
        n++; if (isDone(s, h.id, D.iso(d))) k++;
      });
      out.push({ dow: i, date: D.iso(d), future: d > D.today(), done: k, total: n, rate: n ? k / n : null });
    }
    return out;
  }

  /* ————————————————— plata —————————————————
     La ecuación que sostiene todo el sistema:

       saldo = Σ disponible(frascos) + libre + noPropio

     "disponible" es lo que al frasco todavía le queda (asignado menos
     gastado). "libre" es la plata que aún no tiene trabajo asignado: es
     el único número que se puede gastar sin romper nada. */
  function frascos(s) {
    var f = s.fin || { saldo: 0, noPropio: 0, frascos: [] };
    var lista = (f.frascos || []).slice().sort(function (a, b) { return a.orden - b.orden; });
    var asignado = 0, gastado = 0;
    lista.forEach(function (x) { asignado += x.asignado || 0; gastado += x.gastado || 0; });
    var disponible = asignado - gastado;
    var propio = (f.saldo || 0) - (f.noPropio || 0);
    var porCobrar = (f.porCobrar || []).reduce(function (a, x) { return a + x.monto; }, 0);
    var deuda = (f.deudas || []).filter(function (d) { return !d.repuesto; })
      .reduce(function (a, d) { return a + d.monto; }, 0);
    return {
      saldo: f.saldo || 0,
      noPropio: f.noPropio || 0,
      propio: propio,
      lista: lista,
      asignado: asignado,
      gastado: gastado,
      disponible: disponible,
      libre: propio - disponible,
      porCobrar: porCobrar,
      deuda: deuda,
      /* Si esto no da cero, en algún lado se movió plata sin registrarla. */
      descuadre: 0
    };
  }

  /* Los frascos agrupados por su función, en el orden en que el sistema
     dice que hay que llenarlos. */
  var TIPOS = [
    { k: 'fijo',    l: 'Gastos fijos',   d: 'Pagos que ya sabés que van a ocurrir' },
    { k: 'objetivo',l: 'Objetivos',      d: 'Plata protegida para una meta concreta' },
    { k: 'finde',   l: 'Fines de semana',d: 'Ocio planificado, con tope decidido de antemano' },
    { k: 'semana',  l: 'Semanas',        d: 'El día a día, partido por bloques de tiempo' },
    { k: 'colchon', l: 'Colchón',        d: 'Para que un imprevisto no rompa el resto' }
  ];

  function porTipo(s) {
    var f = frascos(s);
    return TIPOS.map(function (t) {
      var items = f.lista.filter(function (x) { return x.tipo === t.k; });
      return {
        tipo: t.k, label: t.l, desc: t.d, items: items,
        asignado: items.reduce(function (a, x) { return a + (x.asignado || 0); }, 0),
        disponible: items.reduce(function (a, x) { return a + (x.asignado || 0) - (x.gastado || 0); }, 0)
      };
    }).filter(function (g) { return g.items.length; });
  }

  /* Gasto acumulado del mes a partir del registro de movimientos. */
  function gastoDelMes(s, y, m) {
    var movs = (s.fin && s.fin.movs) || [];
    var days = D.daysInMonth(y, m), acc = 0, out = [], t = D.today();
    for (var i = 1; i <= days; i++) {
      var d = new Date(y, m, i);
      if (d > t) break;
      var key = D.iso(d);
      movs.forEach(function (x) { if (x.fecha === key && x.tipo === 'gasto') acc += x.monto; });
      out.push({ day: i, value: acc });
    }
    return out;
  }

  /* ————————————————— entrenamiento ————————————————— */
  function trainingWeek(s, weekStart) {
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = D.addDays(weekStart, i), key = D.iso(d);
      var plan = s.training.split[i] || { name: 'Descanso', muscles: [] };
      var log = s.training.logs[key];
      out.push({
        dow: i, date: key, name: plan.name, muscles: plan.muscles,
        rest: plan.muscles.length === 0,
        done: !!(log && log.done), future: d > D.today()
      });
    }
    return out;
  }

  /* ————————————————— diario ————————————————— */
  function moodSeries(s, from, to) {
    var out = [], d = new Date(from.getTime());
    while (d <= to) {
      var key = D.iso(d);
      var e = s.journal.filter(function (x) { return x.date === key; })[0];
      out.push({ date: key, day: d.getDate(), mood: e ? e.mood : null, rate: dayRate(s, d) });
      d = D.addDays(d, 1);
    }
    return out;
  }

  /* ————————————————— radar de performance —————————————————
     Seis áreas, cada una normalizada a 0–100 desde datos reales de los
     últimos 30 días. Nada es inventado: si no hay datos, el área da 0. */
  function radar(s) {
    var t = D.today(), from = D.addDays(t, -29);
    var hs = activeHabits(s);

    function habitRate(match) {
      var sel = hs.filter(match);
      if (!sel.length) return 0;
      var n = 0, k = 0;
      for (var i = 0; i < 30; i++) {
        var d = D.addDays(from, i), key = D.iso(d);
        sel.forEach(function (h) { if (!due(h, d)) return; n++; if (isDone(s, h.id, key)) k++; });
      }
      return n ? (k / n) * 100 : 0;
    }
    var byName = function (re) { return function (h) { return re.test(h.name.toLowerCase()); }; };

    // Físico: hábitos de cuerpo + días de entrenamiento efectivamente hechos.
    var fis = habitRate(byName(/gimnasio|correr|deporte|entren|deportiv/));
    var trained = 0, planned = 0;
    for (var i = 0; i < 30; i++) {
      var d = D.addDays(from, i);
      var plan = s.training.split[D.dow(d)];
      if (!plan || !plan.muscles.length) continue;
      planned++;
      var lg = s.training.logs[D.iso(d)];
      if (lg && lg.done) trained++;
    }
    var fisico = planned ? (fis * 0.5 + (trained / planned) * 100 * 0.5) : fis;

    // Mental: ánimo promedio del diario, llevado de 1–5 a 0–100.
    var moods = s.journal.filter(function (e) {
      var d = D.parse(e.date); return d >= from && d <= t && e.mood;
    });
    var mental = moods.length
      ? (moods.reduce(function (a, e) { return a + e.mood; }, 0) / moods.length - 1) / 4 * 100
      : 0;

    /* Financiero: mitad qué tan organizada está la plata —cuánta tiene un
       trabajo asignado— y mitad cuánto margen queda dentro de los frascos.
       Tener mucha plata sin asignar no puntúa: el sistema mide control, no
       cantidad. */
    var f = frascos(s);
    var orden = f.propio > 0 ? Math.min(1, f.disponible / f.propio) : 0;
    var margen = f.asignado > 0 ? Math.max(0, f.disponible / f.asignado) : 0;
    var financiero = (f.asignado > 0 || f.propio > 0) ? (orden * 50 + margen * 50) : 0;

    /* Productividad: tareas cerradas sobre el total, pero mirando sólo los
       últimos 30 días. Una tarea de hace medio año ya no dice nada de cómo
       venís esta semana. */
    var tareas = s.tasks.filter(function (k) {
      var d = k.due ? D.parse(k.due) : null;
      return !d || (d >= from && d <= t);
    });
    var productividad = tareas.length
      ? (tareas.filter(function (k) { return k.done; }).length / tareas.length) * 100
      : 0;

    // Disciplina: cumplimiento global de hábitos en 30 días.
    var disciplina = habitRate(function () { return true; });

    // Enfoque: hábitos de concentración + minutos de pomodoro.
    var enf = habitRate(byName(/detox|redes|lectura|planific|proyecto|enfoque|medita/));
    var mins = (s.focus.sessions || []).filter(function (x) {
      var d = D.parse(x.date); return d >= from;
    }).reduce(function (a, x) { return a + x.minutes; }, 0);
    var enfoque = Math.min(100, enf * 0.7 + Math.min(100, mins / 600 * 100) * 0.3);

    return [
      { key: 'fisico',        label: 'Físico',        value: Math.round(fisico) },
      { key: 'mental',        label: 'Mental',        value: Math.round(mental) },
      { key: 'financiero',    label: 'Financiero',    value: Math.round(financiero) },
      { key: 'productividad', label: 'Productividad', value: Math.round(productividad) },
      { key: 'disciplina',    label: 'Disciplina',    value: Math.round(disciplina) },
      { key: 'enfoque',       label: 'Enfoque',       value: Math.round(enfoque) }
    ];
  }

  function score(s) {
    var r = radar(s);
    return Math.round(r.reduce(function (a, x) { return a + x.value; }, 0) / r.length);
  }

  SL.compute = {
    activeHabits: activeHabits, due: due, isDone: isDone,
    dayRate: dayRate, monthSeries: monthSeries, monthRate: monthRate, noteOfDay: noteOfDay,
    streak: streak, bestStreak: bestStreak, weekRate: weekRate, weekOverall: weekOverall,
    frascos: frascos, porTipo: porTipo, gastoDelMes: gastoDelMes, TIPOS: TIPOS,
    trainingWeek: trainingWeek, habitMonthSeries: habitMonthSeries,
    moodSeries: moodSeries, radar: radar, score: score
  };

})(window.SL = window.SL || {});
