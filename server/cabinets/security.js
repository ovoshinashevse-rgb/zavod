// ═══════════════════════════════════════════
// КАБИНЕТ БЕЗОПАСНИКА — проверки, сговор, донос
// ═══════════════════════════════════════════

const { hall, getPlayer } = require('../hall');
const { confiscatePocket } = require('../factory');

// Проверить: может ли Безопасник делать действие
function canAct(p) {
  if (!p || p.role !== 'security') return { error: 'Только Безопасник' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (p.finished) return { error: 'Вы уже завершили смену' };
  if (p.decisionsLeft <= 0) return { error: 'Решения на смену закончились' };
  return { ok: true };
}

// Сколько раз цель воровала в указанную смену
function theftsInShift(shiftNumber, targetId) {
  // В журнале записаны кражи Директора (он один, кто ворует).
  // Пока что targetId — только Директор.
  return hall.theftsLog.filter(t => t.shift === shiftNumber).length;
}

// Проверить игрока
function checkPlayer(socketId, targetId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (hall.deal.active) {
    return { error: 'Пока действует сговор, проверять нельзя' };
  }

  const target = getPlayer(targetId);
  if (!target) return { error: 'Игрок не найден' };

  // Смотрим на прошлую смену (текущая — hall.shift, прошлая — hall.shift - 1)
  const pastShift = hall.shift - 1;
  const thefts = theftsInShift(pastShift, targetId);

  let result;
  if (thefts === 0) result = 'clean';
  else if (thefts === 1) result = 'little';
  else result = 'much';

  // Записываем в досье
  p.dossier.push({
    shift: hall.shift,
    targetId: targetId,
    targetName: target.name,
    result: result,
    basedOnShift: pastShift
  });

  p.decisionsLeft -= 1;

  return {
    ok: true,
    result: result,
    targetName: target.name,
    basedOnShift: pastShift,
    decisionsLeft: p.decisionsLeft,
    dossier: p.dossier
  };
}

// Предложить сговор Директору
function offerDeal(socketId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (hall.deal.active) return { error: 'Сговор уже активен' };
  if (hall.deal.pending) return { error: 'Предложение уже отправлено' };

  // Найти Директора
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

// Директор соглашается на сговор
function acceptDeal(socketId) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (!hall.deal.pending) return { error: 'Нет активного предложения' };
  if (hall.deal.directorId !== socketId) return { error: 'Это не ваше предложение' };

  hall.deal.pending = false;
  hall.deal.active = true;

  return { ok: true, active: true };
}

// Директор отказывается
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

// Разорвать сговор (любой из двоих)
function breakDeal(socketId) {
  const p = getPlayer(socketId);
  if (!p) return { error: 'Игрок не найден' };
  if (!hall.deal.active) return { error: 'Сговора нет' };
  if (p.id !== hall.deal.securityId && p.id !== hall.deal.directorId) {
    return { error: 'Вы не участник сговора' };
  }

  // Если рвёт Безопасник — тратит решение
  if (p.role === 'security') {
    if (p.decisionsLeft <= 0) return { error: 'Решения закончились' };
    p.decisionsLeft -= 1;
  }

  hall.deal.active = false;
  hall.deal.pending = false;
  hall.deal.securityId = null;
  hall.deal.directorId = null;

  return {
    ok: true,
    broken: true,
    decisionsLeft: p.decisionsLeft
  };
}

// Донести на игрока
function reportPlayer(socketId, targetId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const target = getPlayer(targetId);
  if (!target) return { error: 'Игрок не найден' };

  // Донести можно только на того, кого проверял в последние 2 смены
  const recent = p.dossier.filter(d =>
    d.targetId === targetId && d.shift >= hall.shift - 2
  );
  if (recent.length === 0) {
    return { error: 'Вы не проверяли этого игрока недавно' };
  }

  // Конфискуем 50% кармана цели
  const pocket = hall.factory.pocket || 0;
  const confiscated = confiscatePocket(hall.factory, Math.floor(pocket / 2));

  // Понижаем подозрения
  p.suspicions = Math.max(0, p.suspicions - 30);

  // Очищаем досье по этой цели
  p.dossier = p.dossier.filter(d => d.targetId !== targetId);

  p.decisionsLeft -= 1;

  return {
    ok: true,
    targetName: target.name,
    confiscated: confiscated,
    decisionsLeft: p.decisionsLeft,
    suspicions: p.suspicions,
    dossier: p.dossier
  };
}

// Пересчёт подозрений в конце смены
// Вызывается, когда начинается новая смена
function recalcSuspicionsAfterShift() {
  const security = hall.players.find(x => x.role === 'security');
  if (!security) return;

  const director = hall.players.find(x => x.role === 'director');
  if (!director) return;

  // Сколько было краж в прошлую смену
  const pastShift = hall.shift - 1;
  const thefts = hall.theftsLog.filter(t => t.shift === pastShift);

  if (thefts.length === 0) return;   // нечего считать

  // Проверял ли Безопасник Директора в прошлую смену
  const checked = security.dossier.some(d =>
    d.shift === pastShift && d.targetId === director.id
  );

  // Сговор активен?
  const dealActive = hall.deal.active;

  if (!checked) {
    security.suspicions += 20;
  }
  if (dealActive) {
    security.suspicions += 10;
  }
  if (thefts.length >= 2) {
    security.suspicions += 5;
  }

  // Ограничиваем 0..100
  security.suspicions = Math.max(0, Math.min(100, security.suspicions));

  return { suspicions: security.suspicions };
}

// Снимок Безопасника — что отправляем клиенту
function securitySnapshot(p) {
  if (!p || p.role !== 'security') return null;
  return {
    suspicions: p.suspicions,
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
  offerDeal,
  acceptDeal,
  declineDeal,
  breakDeal,
  reportPlayer,
  recalcSuspicionsAfterShift,
  securitySnapshot
};