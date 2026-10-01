// ═══════════════════════════════════════════
// КУРИЛКА — накопительная дымность и статусы
// ═══════════════════════════════════════════

const { hall } = require('./hall');

// Накопительное действие: каждая затяжка +1, каждая отмашка −1
function smokeAction(socketId, type) {
  const p = hall.players.find(x => x.id === socketId);
  if (!p) return null;

  if (type === 'smoke') {
    hall.smokeLevel = Math.min(12, hall.smokeLevel + 1);
    p.status = 'smoke';
  } else if (type === 'wave') {
    if (hall.smokeLevel <= 0) return null;
    hall.smokeLevel = Math.max(0, hall.smokeLevel - 1);
    p.status = 'wave';
  } else {
    return null;
  }

  return {
    players: hall.players.map(x => ({
      id: x.id,
      name: x.name,
      status: x.status
    })),
    smokeLevel: hall.smokeLevel
  };
}

// Снимок текущего состояния курилки
function getSmokingState() {
  return {
    players: hall.players.map(x => ({
      id: x.id,
      name: x.name,
      status: x.status
    })),
    smokeLevel: hall.smokeLevel
  };
}

module.exports = {
  smokeAction,
  getSmokingState
};