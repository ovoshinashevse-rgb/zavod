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
  hr: 3,
  marketer: 3
};

const hall = {
  players: [],
  phase: 'lobby',
  paused: false,
  disconnected: [],
  smokeLevel: 0,
  shift: 0,
  factory: null,

  deal: {
    pending: false,
    active: false,
    securityId: null,
    directorId: null
  },

  theftsLog: [],
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
      disconnected: false,
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

      intoxication: 0,
      blackout: 0,
      drunkState: null,
      drinkLog: [],

      // ─── Маркетолог ───
      position: null,   // { market, audience }
      fame: 0,          // личная слава
      lastAdEffect: 0   // эффект последней рекламы
    };
    hall.players.push(p);
  } else {
    p.name = name || p.name;
    p.status = 'thinking';
    p.ready = false;
    p.finished = false;
    p.disconnected = false;
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
  return hall.players.length >= 1 && hall.players.every(x =>
    x.finished === true || x.disconnected === true
  );
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