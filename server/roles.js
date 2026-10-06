// ═══════════════════════════════════════════
// РОЛИ — случайная раздача по числу игроков
// ═══════════════════════════════════════════

const { hall, ALL_ROLES, ROLE_LABELS, DECISIONS_PER_SHIFT } = require('./hall');

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Сколько ролей выдавать в зависимости от числа игроков
function pickRolesForCount(count) {
  // 1 игрок: только Директор
  if (count === 1) {
    return ['director'];
  }

  // 2 игрока: Директор + случайная
  if (count === 2) {
    const others = shuffle(ALL_ROLES.filter(r => r !== 'director'));
    return ['director', others[0]];
  }

  // 3 игрока: Директор + Безопасник + Инженер
  if (count === 3) {
    return ['director', 'security', 'engineer'];
  }

  // 3 игрока: Директор + Безопасник + Инженер
  if (count === 3) {
    return ['director', 'security', 'engineer'];
  }

  // 4 игрока: + Бухгалтер
  if (count === 4) {
    return ['director', 'security', 'engineer', 'accountant'];
  }

  // 5 игроков: + HR
  if (count === 5) {
    return ['director', 'security', 'engineer', 'accountant', 'hr'];
  }

  // 6 игроков: все
  return ['director', 'security', 'engineer', 'accountant', 'hr', 'marketer'];
}

// Раздать роли всем в зале
function assignRoles() {
  hall.phase = 'roles';

  const count = hall.players.length;
  const roles = shuffle(pickRolesForCount(count));

  hall.players.forEach((p, i) => {
    p.role = roles[i];
    p.decisionsLeft = DECISIONS_PER_SHIFT[p.role] || 0;
    p.finished = false;
    p.dossier = [];
    p.suspicions = 0;
    p.returns = 0;
    p.kickbacks = 0;
    p.pocket = 0;
    p.engineerReport = null;
  });

  return hall.players.map(p => ({
    id: p.id,
    role: p.role,
    label: ROLE_LABELS[p.role]
  }));
}

module.exports = {
  assignRoles,
  pickRolesForCount,
  shuffle
};