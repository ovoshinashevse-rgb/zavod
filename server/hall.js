// ═══════════════════════════════════════════
// ЗАЛ — состояние игроков и фаз
// ═══════════════════════════════════════════

const ALL_ROLES = ['director', 'security', 'accountant', 'engineer', 'hr', 'marketer'];

const ROLE_LABELS = {
  director: 'Директор',
  security: 'Безопасник',
  accountant: 'Бухгалтер',
  engineer: 'Инженер',
  hr: 'HR',
  marketer: 'Маркетолог'
};

const DECISIONS_PER_SHIFT = {
  director: 3,
  security: 2,
  engineer: 3,
  hr: 3
};

const hall = {
  players: [],
  phase: 'lobby',
  paused: false,
  disconnected: [],
  smokeLevel: 0,
  shift: 0,
  factory: null,

  // Сговор
  deal: {
    pending: false,
    active: false,
    securityId: null,
    directorId: null
  },

  // Журнал краж
  theftsLog: [],

  // Активные проверки отчётов
  reportChecks: []
};

function addPlayer(socketId, name) {
  let p = hall.players.find(x => x.id === socketId);
  if (!p) {
    p = {
      id: socketId,
      name: name || 'Сотрудник',
      status: 'thinking',
      ready: false,
      role: null,
      finished: false,
      decisionsLeft: 0,
      dossier: [],
      suspicions: 0,
      returns: 0,
      kickbacks: 0,
      pocket: 0,
      engineerReport: null,
      hrReport: null,
      marketerReport: null,
      accountantReport: null,

      // ─── Запой Инженера ───
      intoxication: 0,     // уровень опьянения (0..7+)
      blackout: 0,         // сколько смен в обмороке
      drunkState: null,    // текущий шаг выбора запоя
      drinkLog: []         // записи о запоях
    };
    hall.players.push(p);
  } else {
    p.name = name || p.name;
    p.status = 'thinking';
    p.ready = false;
    p.finished = false;
  }
  return p;
}

function getPlayer(socketId) {
  return hall.players.find(x => x.id === socketId);
}

function removePlayer(socketId) {
  hall.players = hall.players.filter(x => x.id !== socketId);
}

function allDecided() {
  return hall.players.length >= 1 && hall.players.every(x => x.ready === true);
}

function allFinishedShift() {
  return hall.players.length >= 1 && hall.players.every(x => x.finished);
}

// ─── Обновление между сменами ───
// Опьянение −1, сброс ломки, обморок
function resetFinished() {
  hall.players.forEach(p => {
    p.finished = false;
    p.decisionsLeft = DECISIONS_PER_SHIFT[p.role] || 0;

    // Инженер — обновление опьянения
    if (p.role === 'engineer') {
      // Обморок — если был, то спим
      if (p.blackout && p.blackout > 0) {
        p.blackout -= 1;
        // Пока в обмороке — опьянение не падает, но и не растёт
      } else if (p.intoxication && p.intoxication > 0) {
        // Естественное протрезвление −1 в смену
        p.intoxication = Math.max(0, p.intoxication - 1);
      }

      // Если начался новый выбор — сбрасываем незавершённое
      p.drunkState = null;
    }
  });
  hall.shift += 1;
}

module.exports = {
  hall,
  ALL_ROLES,
  ROLE_LABELS,
  DECISIONS_PER_SHIFT,
  addPlayer,
  getPlayer,
  removePlayer,
  allDecided,
  allFinishedShift,
  resetFinished
};