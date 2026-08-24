/* ============================================================
   StarkLab Web · Estado
   Todo vive en el dispositivo (localStorage). No hay servidor
   ni cuenta: los datos son del usuario y se pueden exportar o
   borrar enteros desde Configuración.
   ============================================================ */
(function (SL) {
  'use strict';

  var KEY = 'starklab:v1';

  /* — Colores de hábito/categoría —
     El orden de asignación no es el del documento: está calculado para que
     dos colores consecutivos nunca se confundan. Con el orden original, el
     par coral↔rosa quedaba en ΔE 11.1 (OKLab) — indistinguible incluso con
     visión normal. Reordenado, el peor par adyacente sube a ΔE 24.0, y a
     12.4 bajo protanopía/deuteranopía. Los hex son exactamente los del
     documento; sólo cambió el orden en que se reparten. */
  var PALETTE = ['rojo', 'verde', 'coral', 'cian', 'ambar', 'violeta', 'amarillo', 'rosa'];

  SL.PALETTE = PALETTE;
  SL.colorVar = function (name) { return 'var(--c-' + name + ')'; };

  /* ————————————————— utilidades de fecha ————————————————— */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  /* Lunes = 0. El producto trabaja con semanas que arrancan el lunes. */
  function dow(d) { return (d.getDay() + 6) % 7; }
  function startOfWeek(d) { return addDays(d, -dow(d)); }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }

  SL.date = {
    pad: pad, iso: iso, parse: parse, addDays: addDays, daysInMonth: daysInMonth,
    dow: dow, startOfWeek: startOfWeek, today: today,
    isFuture: function (s) { return parse(s) > today(); },
    monthKey: function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  };

  /* ————————————————— datos de arranque —————————————————
     Un mes ya vivido, para que los gráficos digan algo desde el
     primer segundo. Se reemplazan en cuanto el usuario carga lo suyo. */
  function seed() {
    var t = today();
    var habits = [
      { name: 'Despertar a las 05:00', emoji: '⏰', color: 'rojo',     freq: 'daily', days: [0,1,2,3,4,5,6], target: 7 },
      { name: 'Gimnasio',              emoji: '💪', color: 'verde',    freq: 'days',  days: [0,1,3,4],       target: 4 },
      { name: 'Lectura / Aprendizaje', emoji: '📖', color: 'coral',    freq: 'daily', days: [0,1,2,3,4,5,6], target: 7 },
      { name: 'Planificación del día', emoji: '🗓️', color: 'cian',     freq: 'days',  days: [0,1,2,3,4],     target: 5 },
      { name: 'Control de gastos',     emoji: '💰', color: 'ambar',    freq: 'daily', days: [0,1,2,3,4,5,6], target: 7 },
      { name: 'Trabajo en proyectos',  emoji: '🎯', color: 'violeta',  freq: 'days',  days: [0,1,2,3,4],     target: 5 },
      { name: 'Sin alcohol',           emoji: '🚫', color: 'amarillo', freq: 'daily', days: [0,1,2,3,4,5,6], target: 7 },
      { name: 'Detox de redes',        emoji: '🌿', color: 'rosa',     freq: 'daily', days: [0,1,2,3,4,5,6], target: 7 }
    ].map(function (h, i) {
      return {
        id: 'h' + (i + 1), name: h.name, emoji: h.emoji, color: h.color,
        freq: h.freq, days: h.days, target: h.target,
        order: i, archived: false, createdAt: iso(addDays(t, -70))
      };
    });

    /* Historial verosímil: buena adherencia al principio, una caída a mitad
       de mes con su nota, y recuperación parcial. Es lo que se ve en el
       gráfico de progreso del anuncio. */
    var checks = {}, notes = {};
    habits.forEach(function (h) { checks[h.id] = {}; notes[h.id] = {}; });

    var rnd = (function (s) { return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; })(20260323);

    for (var back = 74; back >= 0; back--) {
      var d = addDays(t, -back);
      var key = iso(d);
      var wd = dow(d);
      // Adherencia base: alta al principio, se hunde entre el día 40 y 30 atrás, se recupera.
      var base = back > 45 ? 0.86 : back > 34 ? 0.28 : back > 20 ? 0.55 : 0.74;
      if (wd >= 5) base -= 0.12;                       // los findes cuestan más
      habits.forEach(function (h, idx) {
        if (h.days.indexOf(wd) === -1) return;         // ese día no toca
        var p = base + (idx % 3 === 0 ? 0.06 : -0.03);
        if (rnd() < p) checks[h.id][key] = true;
      });
    }
    notes[habits[1].id][iso(addDays(t, -38))] = 'Me agarró una gripe fea, corté toda la semana.';
    notes[habits[1].id][iso(addDays(t, -22))] = 'Vuelta al gimnasio, arranqué suave.';
    notes[habits[5].id][iso(addDays(t, -12))] = 'Semana de entregas, no toqué los proyectos propios.';

    var cats = [
      { id: 'c1', name: 'Alimentación', color: 'ambar',    budget: 600 },
      { id: 'c2', name: 'Transporte',   color: 'rojo',     budget: 250 },
      { id: 'c3', name: 'Streaming',    color: 'violeta',  budget: 90  },
      { id: 'c4', name: 'Ocio',         color: 'rosa',     budget: 300 },
      { id: 'c5', name: 'Salud',        color: 'verde',    budget: 200 },
      { id: 'c6', name: 'Hogar',        color: 'cian',     budget: 400 },
      { id: 'c7', name: 'Ingresos',     color: 'verde',    budget: 0   }
    ];

    var tx = [
      { id: 't1', date: iso(t),               type: 'out', amount: 45,   cat: 'c2', note: 'Gasolina' },
      { id: 't2', date: iso(t),               type: 'out', amount: 120,  cat: 'c1', note: 'Supermercado' },
      { id: 't3', date: iso(t),               type: 'out', amount: 55,   cat: 'c2', note: 'Transporte' },
      { id: 't4', date: iso(t),               type: 'out', amount: 60,   cat: 'c4', note: 'Comida' },
      { id: 't5', date: iso(t),               type: 'out', amount: 70,   cat: 'c3', note: 'Compras personales' },
      { id: 't6', date: iso(addDays(t, -1)),  type: 'in',  amount: 8000, cat: 'c7', note: 'Salario' }
    ];
    // Un poco de historia para que el gráfico de gastos tenga con qué comparar.
    var histNames = ['Supermercado','Café','Farmacia','Nafta','Delivery','Cine','Suscripción','Verdulería','Uber','Gimnasio'];
    for (var k = 0; k < 46; k++) {
      var dd = addDays(t, -(2 + Math.floor(rnd() * 58)));
      var c = cats[Math.floor(rnd() * 6)];
      tx.push({
        id: 'tx' + k, date: iso(dd), type: 'out',
        amount: Math.round((8 + rnd() * 120) * 100) / 100,
        cat: c.id, note: histNames[Math.floor(rnd() * histNames.length)]
      });
    }
    for (var mm = 1; mm <= 2; mm++) {
      var pd = new Date(t.getFullYear(), t.getMonth() - mm, 1);
      tx.push({ id: 'sal' + mm, date: iso(pd), type: 'in', amount: 8000, cat: 'c7', note: 'Salario' });
    }

    var journal = [
      { date: iso(t),                mood: 4, text: 'Día sólido. Cumplí casi todo y cerré la planificación temprano.', tags: ['trabajo'] },
      { date: iso(addDays(t, -1)),   mood: 3, text: 'Normal. Dormí poco pero igual fui al gimnasio.',                  tags: ['sueño'] },
      { date: iso(addDays(t, -3)),   mood: 5, text: 'Excelente. Terminé el proyecto y salí a caminar.',                tags: ['trabajo','relaciones'] },
      { date: iso(addDays(t, -12)),  mood: 2, text: 'Semana pesada de entregas, no toqué nada propio.',                tags: ['trabajo'] },
      { date: iso(addDays(t, -22)),  mood: 3, text: 'Vuelta al gimnasio después de la gripe. Suave pero volví.',       tags: ['sueño'] },
      { date: iso(addDays(t, -38)),  mood: 1, text: 'Enfermo. No hice nada en toda la semana.',                        tags: ['sueño'] }
    ];
    for (var j = 4; j < 60; j += 2) {
      if (journal.some(function (e) { return e.date === iso(addDays(t, -j)); })) continue;
      journal.push({
        date: iso(addDays(t, -j)),
        mood: 1 + Math.floor(rnd() * 5),
        text: '', tags: []
      });
    }

    var training = {
      split: [
        { day: 0, name: 'Pecho y Bíceps',    muscles: ['pecho','biceps'] },
        { day: 1, name: 'Espalda y Tríceps', muscles: ['espalda','triceps'] },
        { day: 2, name: 'Descanso',          muscles: [] },
        { day: 3, name: 'Piernas',           muscles: ['cuadriceps','isquios','gluteos','gemelos'] },
        { day: 4, name: 'Hombros y Core',    muscles: ['hombros','abdomen'] },
        { day: 5, name: 'Descanso',          muscles: [] },
        { day: 6, name: 'Descanso',          muscles: [] }
      ],
      exercises: {
        0: [ { n: 'Press banca',        s: 4, r: '8-10', w: 60 },
             { n: 'Press inclinado',    s: 3, r: '10',   w: 45 },
             { n: 'Aperturas',          s: 3, r: '12',   w: 14 },
             { n: 'Curl con barra',     s: 4, r: '10',   w: 30 },
             { n: 'Curl martillo',      s: 3, r: '12',   w: 12 } ],
        1: [ { n: 'Dominadas',          s: 4, r: '6-8',  w: 0 },
             { n: 'Remo con barra',     s: 4, r: '10',   w: 50 },
             { n: 'Jalón al pecho',     s: 3, r: '12',   w: 45 },
             { n: 'Fondos',             s: 3, r: '10',   w: 0 },
             { n: 'Extensión de tríceps', s: 3, r: '12', w: 20 } ],
        3: [ { n: 'Sentadilla',         s: 5, r: '5',    w: 90 },
             { n: 'Prensa',             s: 4, r: '10',   w: 140 },
             { n: 'Peso muerto rumano', s: 3, r: '10',   w: 70 },
             { n: 'Extensión de cuádriceps', s: 3, r: '15', w: 40 },
             { n: 'Gemelos de pie',     s: 4, r: '15',   w: 60 } ],
        4: [ { n: 'Press militar',      s: 4, r: '8',    w: 40 },
             { n: 'Elevaciones laterales', s: 4, r: '15', w: 8 },
             { n: 'Pájaros',            s: 3, r: '15',   w: 8 },
             { n: 'Plancha',            s: 3, r: '60s',  w: 0 },
             { n: 'Rueda abdominal',    s: 3, r: '12',   w: 0 } ]
      },
      logs: {}
    };

    var goals = [
      { id: 'g1', name: 'Correr 10 km sin parar',    metric: 'km',    current: 6.5, target: 10,   color: 'verde',    due: iso(addDays(t, 60)) },
      { id: 'g2', name: 'Ahorrar para la notebook',  metric: 'USD',   current: 1450, target: 2200, color: 'ambar',   due: iso(addDays(t, 120)) },
      { id: 'g3', name: 'Leer 24 libros en el año',  metric: 'libros', current: 14,  target: 24,   color: 'coral',   due: iso(new Date(t.getFullYear(), 11, 31)) },
      { id: 'g4', name: 'Lanzar StarkLab',           metric: '%',     current: 62,  target: 100,  color: 'violeta', due: iso(addDays(t, 45)) }
    ];

    var tasks = [
      { id: 'k1', text: 'Revisar el presupuesto del mes',   done: false, prio: 2, due: iso(t) },
      { id: 'k2', text: 'Cerrar el informe de proyecto',    done: false, prio: 3, due: iso(t) },
      { id: 'k3', text: 'Comprar la proteína',              done: true,  prio: 1, due: iso(t) },
      { id: 'k4', text: 'Llamar al contador',               done: false, prio: 2, due: iso(addDays(t, 1)) },
      { id: 'k5', text: 'Preparar la rutina de la semana',  done: true,  prio: 1, due: iso(addDays(t, -1)) },
      { id: 'k6', text: 'Backup de la base de datos',       done: false, prio: 3, due: iso(addDays(t, 2)) }
    ];

    var events = [
      { id: 'e1', date: iso(t), time: '22:35', title: 'Reunión con Richard Miller', kind: 'reunion' },
      { id: 'e2', date: iso(t), time: '19:00', title: 'Gimnasio — Pecho y Bíceps',  kind: 'entreno' },
      { id: 'e3', date: iso(addDays(t, 1)), time: '10:00', title: 'Revisión de finanzas', kind: 'finanzas' },
      { id: 'e4', date: iso(addDays(t, 2)), time: '18:30', title: 'Clase de inglés',     kind: 'estudio' },
      { id: 'e5', date: iso(addDays(t, 4)), time: '09:00', title: 'Control médico',      kind: 'salud' }
    ];

    return {
      version: 1,
      habits: habits, checks: checks, notes: notes,
      cats: cats, tx: tx, journal: journal, training: training,
      goals: goals, tasks: tasks, events: events,
      focus: { sessions: [], preset: 25 },
      settings: {
        theme: 'dark', accent: 'rojo', lang: 'es', currency: 'USD',
        pauseScene: 'luna', weekStart: 1,
        notif: { habits: true, habitsAt: '20:00', budget: true, journal: true, journalAt: '22:30', weekly: true },
        onboarded: false
      }
    };
  }

  /* ————————————————— persistencia ————————————————— */
  var state = null;
  var listeners = [];

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return seed();
      var s = JSON.parse(raw);
      if (!s || s.version !== 1) return seed();
      // Merge defensivo: si una versión vieja no tiene una rama, la completa.
      var base = seed();
      Object.keys(base).forEach(function (k) { if (s[k] === undefined) s[k] = base[k]; });
      Object.keys(base.settings).forEach(function (k) {
        if (s.settings[k] === undefined) s.settings[k] = base.settings[k];
      });
      return s;
    } catch (e) { return seed(); }
  }

  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { SL.toast && SL.toast('No se pudo guardar: almacenamiento lleno', 'err'); }
    }, 120);
  }

  SL.store = {
    get: function () { return state; },
    init: function () { state = load(); return state; },
    save: save,
    reset: function () { state = seed(); save(); emit(); },
    wipe: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      state = seed(); state.settings.onboarded = true; save(); emit();
    },
    on: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    emit: emit,
    /* Muta el estado y avisa a la UI en un solo paso. */
    update: function (fn) { fn(state); save(); emit(); },
    export: function () { return JSON.stringify(state, null, 2); },
    import: function (json) {
      var s = JSON.parse(json);
      if (!s || typeof s !== 'object') throw new Error('Formato inválido');
      s.version = 1;
      state = s; save(); emit();
    }
  };

  function emit() { listeners.forEach(function (f) { try { f(state); } catch (e) { console.error(e); } }); }

  SL.uid = function (p) { return (p || 'id') + Math.random().toString(36).slice(2, 9); };

})(window.SL = window.SL || {});
