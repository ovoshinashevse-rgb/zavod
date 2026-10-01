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

// Единственный зал (пока)
const hall = {
  players: [],
  phase: 'lobby',   // lobby → smoking → roles → game → paused → end
  paused: false,
  disconnected: [],
  smokeLevel: 0,
  shift: 0,         // номер смены
  factory: null
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
      finished: false     // завершил ли игрок текущую смену
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

// Все ли завершили смену
function allFinishedShift() {
  return hall.players.length >= 2 && hall.players.every(x => x.finished);
}

// Сбросить флаги finished у всех — начать новую смену
function resetFinished() {
  hall.players.forEach(p => p.finished = false);
  hall.shift += 1;
}

module.exports = {
  hall,
  ALL_ROLES,
  ROLE_LABELS,
  addPlayer,
  getPlayer,
  removePlayer,
  allDecided,
  allFinishedShift,
  resetFinished
};