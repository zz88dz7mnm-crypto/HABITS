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

  /* ————————————————— plata ————————————————— */
  function inMonth(dateStr, y, m) {
    var d = D.parse(dateStr);
    return d.getFullYear() === y && d.getMonth() === m;
  }

  function finance(s, y, m) {
    var rows = s.tx.filter(function (t) { return inMonth(t.date, y, m); });
    var inc = 0, out = 0, byCat = {};
    rows.forEach(function (t) {
      if (t.type === 'in') { inc += t.amount; return; }
      out += t.amount;
      byCat[t.cat] = (byCat[t.cat] || 0) + t.amount;
    });
    var cats = s.cats
      .filter(function (c) { return byCat[c.id] > 0; })
      .map(function (c) { return { id: c.id, name: c.name, color: c.color, value: byCat[c.id], budget: c.budget }; })
      .sort(function (a, b) { return b.value - a.value; });
    return { income: inc, expense: out, balance: inc - out, cats: cats, rows: rows };
  }

  /* Gasto diario acumulado del mes, para la sparkline de la tarjeta. */
  function expenseSeries(s, y, m) {
    var days = D.daysInMonth(y, m), acc = 0, out = [], t = D.today();
    for (var i = 1; i <= days; i++) {
      var d = new Date(y, m, i);
      if (d > t) break;
      var key = D.iso(d);
      s.tx.forEach(function (x) { if (x.date === key && x.type === 'out') acc += x.amount; });
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

    // Financiero: qué tan lejos quedó el gasto del presupuesto total.
    var f = finance(s, t.getFullYear(), t.getMonth());
    var totalBudget = s.cats.reduce(function (a, c) { return a + (c.budget || 0); }, 0);
    var financiero = totalBudget
      ? Math.max(0, Math.min(100, (1 - f.expense / totalBudget) * 100))
      : (f.balance > 0 ? 100 : 0);

    // Productividad: tareas cerradas + metas avanzando.
    var doneT = s.tasks.filter(function (k) { return k.done; }).length;
    var prod = s.tasks.length ? (doneT / s.tasks.length) * 100 : 0;
    var goalAvg = s.goals.length
      ? s.goals.reduce(function (a, g) { return a + Math.min(1, g.current / g.target); }, 0) / s.goals.length * 100
      : 0;
    var productividad = prod * 0.5 + goalAvg * 0.5;

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
    finance: finance, expenseSeries: expenseSeries, trainingWeek: trainingWeek,
    moodSeries: moodSeries, radar: radar, score: score
  };

})(window.SL = window.SL || {});
