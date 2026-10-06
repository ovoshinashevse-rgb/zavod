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
  engineer: 3
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
      ready: false,             // ← НОВОЕ: готовность
      role: null,
      finished: false,
      decisionsLeft: 0,
      dossier: [],
      suspicions: 0,
      returns: 0,
      kickbacks: 0,
      pocket: 0,
      engineerReport: null
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
  // Минимум 1 игрок — можно играть в одиночку
  return hall.players.length >= 1 && hall.players.every(x => x.ready === true);
}
function allFinishedShift() {
  // Достаточно 1 игрока — можно закончить смену одному
  return hall.players.length >= 1 && hall.players.every(x => x.finished);
}

function resetFinished() {
  hall.players.forEach(p => {
    p.finished = false;
    p.decisionsLeft = DECISIONS_PER_SHIFT[p.role] || 0;
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