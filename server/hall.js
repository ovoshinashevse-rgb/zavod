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
  factory: null
};

// Вспомогательные функции
function addPlayer(socketId, name) {
  let p = hall.players.find(x => x.id === socketId);
  if (!p) {
    p = { id: socketId, name: name || 'Сотрудник', status: 'thinking', role: null };
    hall.players.push(p);
  } else {
    p.name = name || p.name;
    p.status = 'thinking';
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

module.exports = {
  hall,
  ALL_ROLES,
  ROLE_LABELS,
  addPlayer,
  getPlayer,
  removePlayer,
  allDecided
};