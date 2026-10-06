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
// Порядок выдачи: важные для игры роли — раньше.
// Сейчас реализованы: director, engineer, security, hr.
// Бухгалтер и Маркетолог — когда будут готовы их кабинеты.
function pickRolesForCount(count) {
  // 1 игрок: только Директор
  if (count === 1) {
    return ['director'];
  }

  // 2 игрока: Директор + Инженер
  if (count === 2) {
    return ['director', 'engineer'];
  }

  // 3 игрока: Директор + Инженер + Безопасник
  if (count === 3) {
    return ['director', 'engineer', 'security'];
  }

  // 4 игрока: + HR
  if (count === 4) {
    return ['director', 'engineer', 'security', 'hr'];
  }

  // 5 игроков: + Бухгалтер
  if (count === 5) {
    return ['director', 'engineer', 'security', 'hr', 'accountant'];
  }

  // 6 игроков: все шесть
  return ['director', 'engineer', 'security', 'hr', 'accountant', 'marketer'];
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
    p.hrReport = null;
    p.marketerReport = null;
    p.accountantReport = null;
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