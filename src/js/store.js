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
  /* ————————————————— el estado en blanco —————————————————
     La app arranca vacía. Nada de datos de ejemplo: los números que
     ves son tuyos desde el primer día. El plan de gimnasio es la
     única excepción, porque es tuyo y ya lo tenemos cargado. */
  function estadoVacio() {
    return {
      version: 2,
      habits: [], checks: {}, notes: {},
      journal: [],
      training: planPPL(),
      tasks: [], events: [],
      focus: { sessions: [], preset: 25 },
      /* — Finanzas por frascos —
         saldo es lo que hay físicamente en la cuenta. Los frascos dicen
         a quién pertenece cada peso. La resta entre las dos cosas es la
         plata realmente libre. */
      fin: {
        saldo: 0,
        noPropio: 0,
        frascos: [],
        movs: [],
        porCobrar: [],
        deudas: []
      },
      perfil: { nombre: '', peso: null, altura: null, nacimiento: '', objetivoPeso: null, pesos: [] },
      settings: {
        theme: 'dark', accent: 'rojo', lang: 'es', currency: 'ARS',
        weekStart: 1,
        notif: { habits: true, habitsAt: '20:00', budget: true, journal: true, journalAt: '22:30', weekly: true },
        onboarded: false
      }
    };
  }

  /* ————————————————— el plan de gimnasio —————————————————
     PPL sobre lunes, miércoles y viernes. Los pesos arrancan en cero:
     los vas cargando vos a medida que entrenás. RIR = repeticiones que
     te quedan en reserva al terminar la serie. */
  function planPPL() {
    var descanso = function (d) { return { day: d, name: 'Descanso', muscles: [] }; };
    return {
      split: [
        { day: 0, name: 'Piernas + Abdomen', corto: 'LEGS',
          muscles: ['cuadriceps','isquios','gluteos','gemelos','aductores','abdomen'] },
        descanso(1),
        { day: 2, name: 'Empuje', corto: 'PUSH',
          muscles: ['pecho','hombros','triceps'] },
        descanso(3),
        { day: 4, name: 'Tracción + Abdomen', corto: 'PULL',
          muscles: ['espalda','dorsal','trapecio','biceps','abdomen'] },
        descanso(5),
        descanso(6)
      ],
      exercises: {
        0: [
          { n: 'Sentadilla profunda',            s: 4, r: '6-8',   w: 0, d: 'Barra libre o Smith · Cuádriceps y glúteo · RIR 2' },
          { n: 'Prensa a 90°',                   s: 4, r: '10-12', w: 0, d: 'Pies intermedios/bajos · Volumen puro · RIR 1-2' },
          { n: 'Curl femoral',                   s: 4, r: '10-12', w: 0, d: 'Acostado o sentado · Estímulo directo posterior · RIR 1' },
          { n: 'Extensión de cuádriceps',        s: 4, r: '10-12', w: 0, d: 'Aislamiento cuádriceps · RIR 1' },
          { n: 'Máquina de aductores',           s: 3, r: '12-15', w: 0, d: 'Cerrar piernas · Grosor interno · RIR 0-1' },
          { n: 'Gemelos de pie',                 s: 4, r: '12-15', w: 0, d: 'Máquina o Multipower · Pausa 1 seg abajo · RIR 0' },
          { n: 'Crunch en polea alta con soga',  s: 4, r: '12-15', w: 0, d: 'Flexionar columna con el peso, no mover la cadera · RIR 1', tag: 'ABS' },
          { n: 'Russian twist',                  s: 3, r: '24',    w: 0, d: 'Rotación de torso · Core oblicuo', tag: 'ABS' }
        ],
        2: [
          { n: 'Press inclinado con mancuernas', s: 4, r: '8-10',  w: 0, d: 'Pecho superior · RIR 1-2' },
          { n: 'Press de banca plano',           s: 4, r: '10',    w: 0, d: 'Barra o máquina convergente · Hipertrofia general · RIR 1-2' },
          { n: 'Cruces en polea baja',           s: 3, r: '12',    w: 0, d: 'Cables hacia arriba y adentro · Línea interna · RIR 1' },
          { n: 'Vuelos laterales',               s: 4, r: '12-15', w: 0, d: 'Hombro lateral · El aspecto en "V" que resalta el pecho · RIR 0-1', tag: 'CLAVE' },
          { n: 'Press militar',                  s: 3, r: '6-10',  w: 0, d: 'Barra o mancuernas · Cabeza anterior del deltoides · RIR 1-2' },
          { n: 'Press francés con barra Z',      s: 4, r: '10',    w: 0, d: 'Ligeramente tras la cabeza · Cabeza larga del tríceps · RIR 1' },
          { n: 'Fondos (dips)',                  s: 3, r: '10',    w: 0, d: 'Carga corporal · Énfasis en la cabeza lateral' },
          { n: 'Extensiones en polea alta',      s: 3, r: '12',    w: 0, d: 'Con soga · Bombear y agotar al fallo · RIR 0' }
        ],
        4: [
          { n: 'Jalón al pecho',                 s: 4, r: '10',    w: 0, d: 'Agarre prono, ancho intermedio · Dorsal ancho · RIR 1-2' },
          { n: 'Remo sentado en polea',          s: 4, r: '10-12', w: 0, d: 'Agarre cerrado/neutro · Zona media, trapecios y romboides · RIR 1-2' },
          { n: 'Curl en banco Scott',            s: 4, r: '10',    w: 0, d: 'Barra Z · Cabeza corta del bíceps · Da pico · RIR 1', tag: 'CLAVE' },
          { n: 'Pullover en polea alta',         s: 3, r: '12-15', w: 0, d: 'Soga o barra recta · Estiramiento del dorsal bajo fatiga · RIR 1' },
          { n: 'Curl martillo alterno',          s: 4, r: '10-12', w: 0, d: 'Braquiorradial y braquial anterior · RIR 1', tag: 'CLAVE' },
          { n: 'Elevaciones de piernas colgado', s: 4, r: 'fallo', w: 0, d: 'Al fallo técnico · Apuntar a 10-15 limpias · Abdomen inferior', tag: 'ABS' },
          { n: 'Bicho bolita',                   s: 3, r: '12',    w: 0, d: 'Contracción abdominal total · Core completo', tag: 'ABS' }
        ]
      },
      logs: {}
    };
  }

  /* ————————————————— datos de ejemplo —————————————————
     No se cargan solos: se piden desde Configuración cuando querés ver
     cómo se comportan los gráficos con un par de meses encima. */
  function datosDemo() {
    var s = estadoVacio();
    var t = today();
    var base = [
      { name: 'Despertar a las 05:00', emoji: '⏰', color: 'rojo',     freq: 'daily', days: [0,1,2,3,4,5,6] },
      { name: 'Gimnasio',              emoji: '💪', color: 'verde',    freq: 'days',  days: [0,2,4] },
      { name: 'Lectura',               emoji: '📖', color: 'coral',    freq: 'daily', days: [0,1,2,3,4,5,6] },
      { name: 'Planificar el día',     emoji: '🗓️', color: 'cian',     freq: 'days',  days: [0,1,2,3,4] },
      { name: 'Control de gastos',     emoji: '💰', color: 'ambar',    freq: 'daily', days: [0,1,2,3,4,5,6] },
      { name: 'Trabajo en proyectos',  emoji: '🎯', color: 'violeta',  freq: 'days',  days: [0,1,2,3,4] },
      { name: 'Sin alcohol',           emoji: '🚫', color: 'amarillo', freq: 'daily', days: [0,1,2,3,4,5,6] },
      { name: 'Detox de redes',        emoji: '🌿', color: 'rosa',     freq: 'daily', days: [0,1,2,3,4,5,6] }
    ];
    s.habits = base.map(function (h, i) {
      return {
        id: 'h' + (i + 1), name: h.name, emoji: h.emoji, color: h.color,
        freq: h.freq, days: h.days, target: h.days.length,
        order: i, archived: false, createdAt: iso(addDays(t, -70))
      };
    });
    s.habits.forEach(function (h) { s.checks[h.id] = {}; s.notes[h.id] = {}; });

    var rnd = (function (x) { return function () { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }; })(20260323);
    for (var back = 74; back >= 0; back--) {
      var d = addDays(t, -back), key = iso(d), wd = dow(d);
      var p0 = back > 45 ? 0.86 : back > 34 ? 0.28 : back > 20 ? 0.55 : 0.74;
      if (wd >= 5) p0 -= 0.12;
      s.habits.forEach(function (h, idx) {
        if (h.days.indexOf(wd) === -1) return;
        if (rnd() < p0 + (idx % 3 === 0 ? 0.06 : -0.03)) s.checks[h.id][key] = true;
      });
    }
    s.notes[s.habits[1].id][iso(addDays(t, -38))] = 'Me agarró una gripe fea, corté toda la semana.';
    s.notes[s.habits[1].id][iso(addDays(t, -22))] = 'Vuelta al gimnasio, arranqué suave.';

    for (var j = 0; j < 60; j += 2) {
      s.journal.push({ date: iso(addDays(t, -j)), mood: 1 + Math.floor(rnd() * 5), text: '', tags: [] });
    }
    s.journal[0].text = 'Día sólido. Cumplí casi todo y cerré la planificación temprano.';
    s.journal[0].tags = ['trabajo'];

    s.tasks = [
      { id: 'k1', text: 'Revisar el presupuesto del mes', done: false, prio: 2, due: iso(t) },
      { id: 'k2', text: 'Cerrar el informe de proyecto',  done: false, prio: 3, due: iso(t) },
      { id: 'k3', text: 'Comprar la proteína',            done: true,  prio: 1, due: iso(t) }
    ];
    s.events = [
      { id: 'e1', date: iso(t), time: '19:00', title: 'Gimnasio', kind: 'entreno' },
      { id: 'e2', date: iso(addDays(t, 1)), time: '10:00', title: 'Revisión de finanzas', kind: 'finanzas' }
    ];

    s.fin.saldo = 350000;
    s.fin.frascos = plantillaFrascos().map(function (f, i) {
      f.asignado = [20000, 50000, 110000, 30000, 30000, 30000, 14000, 14000, 14000, 14000, 14000, 15000][i] || 0;
      if (i === 1) f.gastado = 47064;
      return f;
    });
    s.settings.onboarded = true;
    return s;
  }

  /* La estructura que propone el sistema: primero lo que ya tiene dueño,
     después los objetivos, después el ocio planificado, después el día a
     día por semanas, y al final el colchón. */
  function plantillaFrascos() {
    var def = [
      ['Estacionamiento', 'fijo',   'cian'],
      ['Suscripciones',   'fijo',   'violeta'],
      ['Gimnasio',        'fijo',   'verde'],
      ['Fin de semana 1', 'finde',  'coral'],
      ['Fin de semana 2', 'finde',  'coral'],
      ['Fin de semana 3', 'finde',  'coral'],
      ['Semana 1',        'semana', 'ambar'],
      ['Semana 2',        'semana', 'ambar'],
      ['Semana 3',        'semana', 'ambar'],
      ['Semana 4',        'semana', 'ambar'],
      ['Semana 5',        'semana', 'ambar'],
      ['Colchón',         'colchon','rosa']
    ];
    return def.map(function (d, i) {
      return { id: 'f' + (i + 1), nombre: d[0], tipo: d[1], color: d[2],
               asignado: 0, gastado: 0, orden: i };
    });
  }

  SL.plantillaFrascos = plantillaFrascos;
  SL.datosDemo = datosDemo;

  /* ————————————————— persistencia ————————————————— */
  var state = null;
  var listeners = [];

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return estadoVacio();
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return estadoVacio();
      // La v1 guardaba categorías y transacciones sueltas; la v2 usa frascos.
      // No hay forma honesta de convertir una cosa en la otra, así que se
      // arranca limpio en vez de inventar una equivalencia.
      if (s.version !== 2) return estadoVacio();
      // Merge defensivo: si falta una rama nueva, se completa con la vacía.
      var base = estadoVacio();
      Object.keys(base).forEach(function (k) { if (s[k] === undefined) s[k] = base[k]; });
      Object.keys(base.settings).forEach(function (k) {
        if (s.settings[k] === undefined) s.settings[k] = base.settings[k];
      });
      Object.keys(base.fin).forEach(function (k) { if (s.fin[k] === undefined) s.fin[k] = base.fin[k]; });
      return s;
    } catch (e) { return estadoVacio(); }
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
    vacio: estadoVacio,
    demo: function () { state = datosDemo(); save(); emit(); },
    wipe: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      state = estadoVacio(); state.settings.onboarded = true; save(); emit();
    },
    on: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    emit: emit,
    /* Muta el estado y avisa a la UI en un solo paso. */
    update: function (fn) { fn(state); save(); emit(); },
    export: function () { return JSON.stringify(state, null, 2); },
    import: function (json) {
      var s = JSON.parse(json);
      if (!s || typeof s !== 'object') throw new Error('Formato inválido');
      if (s.version !== 2) throw new Error('El backup es de una versión anterior');
      state = s; save(); emit();
    }
  };

  function emit() { listeners.forEach(function (f) { try { f(state); } catch (e) { console.error(e); } }); }

  SL.uid = function (p) { return (p || 'id') + Math.random().toString(36).slice(2, 9); };

})(window.SL = window.SL || {});
