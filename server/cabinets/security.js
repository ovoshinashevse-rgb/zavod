// ═══════════════════════════════════════════
// КАБИНЕТ БЕЗОПАСНИКА — проверки, сговор, донос
// ═══════════════════════════════════════════

const { hall, getPlayer } = require('../hall');
const { confiscatePocket } = require('../factory');

const ROLE_TITLES = {
  director: 'Директор',
  security: 'Безопасник',
  accountant: 'Бухгалтер',
  engineer: 'Инженер',
  hr: 'HR',
  marketer: 'Маркетолог'
};

function canAct(p) {
  if (!p || p.role !== 'security') return { error: 'Только Безопасник' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (p.finished) return { error: 'Вы уже завершили смену' };
  if (p.decisionsLeft <= 0) return { error: 'Решения на смену закончились' };
  return { ok: true };
}

// Проверка — отложенная. Результат в следующую смену.
function checkPlayer(socketId, targetId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (hall.deal.active) {
    return { error: 'Пока действует сговор, проверять нельзя' };
  }

  const target = getPlayer(targetId);
  if (!target) return { error: 'Игрок не найден' };

  p.dossier.push({
    shift: hall.shift,
    targetId: targetId,
    targetRole: target.role,
    targetTitle: ROLE_TITLES[target.role] || '—',
    result: 'pending'
  });

  p.decisionsLeft -= 1;

  return {
    ok: true,
    pending: true,
    targetTitle: ROLE_TITLES[target.role] || '—',
    decisionsLeft: p.decisionsLeft,
    dossier: p.dossier
  };
}

// Обработать отложенные проверки при новой смене
function resolvePendingChecks() {
  const sec = hall.players.find(x => x.role === 'security');
  if (!sec) return null;

  const pastShift = hall.shift - 1;
  const results = [];

  sec.dossier.forEach(d => {
    if (d.result !== 'pending') return;
    if (d.shift !== pastShift) return;

    const thefts = hall.theftsLog.filter(t => t.shift === pastShift).length;

    if (thefts === 0) d.result = 'clean';
    else if (thefts === 1) d.result = 'little';
    else d.result = 'much';

    results.push({
      targetTitle: d.targetTitle,
      result: d.result
    });
  });

  return results;
}

// Сговор
function offerDeal(socketId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (hall.deal.active) return { error: 'Сговор уже активен' };
  if (hall.deal.pending) return { error: 'Предложение уже отправлено' };

  const director = hall.players.find(x => x.role === 'director');
  if (!director) return { error: 'Директор не найден' };

  hall.deal.pending = true;
  hall.deal.securityId = socketId;
  hall.deal.directorId = director.id;

  p.decisionsLeft -= 1;

  return {
    ok: true,
    pending: true,
    directorId: director.id,
    decisionsLeft: p.decisionsLeft
  };
}

function acceptDeal(socketId) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (!hall.deal.pending) return { error: 'Нет активного предложения' };
  if (hall.deal.directorId !== socketId) return { error: 'Это не ваше предложение' };

  hall.deal.pending = false;
  hall.deal.active = true;
  return { ok: true, active: true };
}

function declineDeal(socketId) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (!hall.deal.pending) return { error: 'Нет активного предложения' };
  if (hall.deal.directorId !== socketId) return { error: 'Это не ваше предложение' };

  hall.deal.pending = false;
  hall.deal.securityId = null;
  hall.deal.directorId = null;
  return { ok: true, declined: true };
}

function breakDeal(socketId) {
  const p = getPlayer(socketId);
  if (!p) return { error: 'Игрок не найден' };
  if (!hall.deal.active) return { error: 'Сговора нет' };
  if (p.id !== hall.deal.securityId && p.id !== hall.deal.directorId) {
    return { error: 'Вы не участник сговора' };
  }

  if (p.role === 'security') {
    if (p.decisionsLeft <= 0) return { error: 'Решения закончились' };
    p.decisionsLeft -= 1;
  }

  hall.deal.active = false;
  hall.deal.pending = false;
  hall.deal.securityId = null;
  hall.deal.directorId = null;

  return { ok: true, broken: true, decisionsLeft: p.decisionsLeft };
}

// Донос — конфискация из кармана в кассу
function reportPlayer(socketId, targetId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const target = getPlayer(targetId);
  if (!target) return { error: 'Игрок не найден' };

  const ready = p.dossier.filter(d =>
    d.targetId === targetId &&
    d.result !== 'pending' &&
    d.shift >= hall.shift - 2
  );
  if (ready.length === 0) {
    return { error: 'Нет результатов проверки на этого игрока' };
  }

  // Конфискация: 50% кармана идёт в кассу завода (money)
  const pocket = hall.factory.pocket || 0;
  const confiscated = confiscatePocket(hall.factory, Math.floor(pocket / 2));

  // Безопаснику — плюс в «конфисковано»
  p.returns += confiscated;

  p.suspicions = Math.max(0, p.suspicions - 30);
  p.dossier = p.dossier.filter(d => d.targetId !== targetId);

  p.decisionsLeft -= 1;

  return {
    ok: true,
    targetTitle: ROLE_TITLES[target.role] || '—',
    confiscated: confiscated,
    decisionsLeft: p.decisionsLeft,
    suspicions: p.suspicions,
    returns: p.returns,
    dossier: p.dossier
  };
}

// Пересчёт подозрений после смены
function recalcSuspicionsAfterShift() {
  const sec = hall.players.find(x => x.role === 'security');
  if (!sec) return;

  const director = hall.players.find(x => x.role === 'director');
  if (!director) return;

  const pastShift = hall.shift - 1;
  const thefts = hall.theftsLog.filter(t => t.shift === pastShift);

  if (thefts.length === 0) return;

  const checked = sec.dossier.some(d =>
    d.shift === pastShift && d.targetId === director.id
  );

  if (!checked) sec.suspicions += 20;
  if (hall.deal.active) sec.suspicions += 10;
  if (thefts.length >= 2) sec.suspicions += 5;

  sec.suspicions = Math.max(0, Math.min(100, sec.suspicions));
  return { suspicions: sec.suspicions };
}

function securitySnapshot(p) {
  if (!p || p.role !== 'security') return null;
  return {
    suspicions: p.suspicions,
    returns: p.returns,
    kickbacks: p.kickbacks,
    dossier: p.dossier,
    decisionsLeft: p.decisionsLeft,
    deal: {
      pending: hall.deal.pending,
      active: hall.deal.active,
      iAmSecurity: hall.deal.securityId === p.id,
      iAmDirector: hall.deal.directorId === p.id
    }
  };
}

module.exports = {
  checkPlayer,
  resolvePendingChecks,
  offerDeal,
  acceptDeal,
  declineDeal,
  breakDeal,
  reportPlayer,
  recalcSuspicionsAfterShift,
  securitySnapshot,
  ROLE_TITLES
};