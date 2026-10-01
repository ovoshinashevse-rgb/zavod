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

// Сколько решений за смену у каждой роли
const DECISIONS_PER_SHIFT = {
  director: 3,
  security: 2
  // остальные добавим позже
};

// Единственный зал
const hall = {
  players: [],
  phase: 'lobby',   // lobby → smoking → roles → game → paused → end
  paused: false,
  disconnected: [],
  smokeLevel: 0,
  shift: 0,         // номер смены
  factory: null,
  // Сговор: { active: bool, securityId, directorId }
  deal: { active: false, securityId: null, directorId: null }
};

// Вспомогательные функции
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
      // Личное для роли (используется Безопасником)
      dossier: [],       // список проверок
      suspicions: 0      // шкала подозрений
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

// Начать новую смену: сбросить флаги finished, восстановить решения
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