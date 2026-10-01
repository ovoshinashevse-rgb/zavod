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
  if (count <= 2) {
    const others = shuffle(ALL_ROLES.filter(r => r !== 'director'));
    return ['director', others[0]];
  }
  if (count === 3) {
    const others = shuffle(ALL_ROLES.filter(r => r !== 'director' && r !== 'security'));
    return ['director', 'security', others[0]];
  }
  if (count === 4) return ['director', 'security', 'accountant', 'engineer'];
  if (count === 5) return ['director', 'security', 'accountant', 'engineer', 'hr'];
  return ['director', 'security', 'accountant', 'engineer', 'hr', 'marketer'];
}

// Раздать роли всем в зале
function assignRoles() {
  hall.phase = 'roles';

  const count = hall.players.length;
  const roles = shuffle(pickRolesForCount(count));

  hall.players.forEach((p, i) => {
    p.role = roles[i];
    p.decisionsLeft = DECISIONS_PER_SHIFT[p.role] || 0;   // ставим решения сразу
    p.finished = false;
    p.dossier = [];
    p.suspicions = 0;
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