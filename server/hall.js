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
  security: 2
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
    pending: false,    // предложение отправлено, ждём ответа
    active: false,     // сговор заключён
    securityId: null,
    directorId: null
  },

  // Журнал краж: { shift, amount, type }
  // type: 'budget' | 'direction'
  theftsLog: []
};

function addPlayer(socketId, name) {
  let p = hall.players.find(x => x.id === socketId);
  if (!p) {
    p = {
      id: socketId,
      name: name || 'Сотрудник',
      status: 'thinking',
      role: null,
      finished: false,
      decisionsLeft: 0,
      dossier: [],        // проверки Безопасника: { shift, targetId, result }
      suspicions: 0       // шкала подозрений Безопасника
    };
    hall.players.push(p);
  } else {
    p.name = name || p.name;
    p.status = 'thinking';
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
  return hall.players.length >= 2 && hall.players.every(x => x.status !== 'thinking');
}

function allFinishedShift() {
  return hall.players.length >= 2 && hall.players.every(x => x.finished);
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