// ═══════════════════════════════════════════
// КАБИНЕТ БЕЗОПАСНИКА — проверки, сговор, донос
// ═══════════════════════════════════════════

const { hall, getPlayer } = require('../hall');
const { confiscatePocket, DIRECTIONS } = require('../factory');

const ROLE_TITLES = {
  director: 'Директор',
  security: 'Безопасник',
  accountant: 'Бухгалтер',
  engineer: 'Инженер',
  hr: 'HR',
  marketer: 'Маркетолог'
};

const INDICATOR_TITLES = {
  quality: 'Качество',
  clients: 'Клиенты',
  employees: 'Сотрудники',
  equipment: 'Оборудование',
  reputation: 'Репутация'
};

// Показатель → отделы, от которых зависит
const INDICATOR_DIRECTIONS = {
  quality:    ['equipment', 'people'],
  clients:    ['ads'],
  employees:  ['people'],
  equipment:  ['equipment'],
  reputation: ['equipment', 'people', 'ads', 'security', 'economy']
};

const COVER_DECISION_COST = 2;
const FORGED_CHANCE = 0.3;      // 30% — подделан
const DEPARTMENT_AGREE_CHANCE = 0.5; // 50/50 — отдел согласился

function canAct(p) {
  if (!p || p.role !== 'security') return { error: 'Только Безопасник' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (p.finished) return { error: 'Вы уже завершили смену' };
  if (p.decisionsLeft <= 0) return { error: 'Решения на смену закончились' };
  return { ok: true };
}

// ─── Проверка игрока (старая механика — оставляем) ───
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

    results.push({ targetTitle: d.targetTitle, result: d.result });
  });

  return results;
}

// ─── Обработка проверок отчётов в начале смены ───
// Вызывается при new_shift. Продвигает каждый активный check по этапам.
function processChecksOnShiftStart() {
  const currentShift = hall.shift;
  const security = hall.players.find(x => x.role === 'security');

  hall.reportChecks.forEach(c => {
    if (c.directorNotified) return;   // уже завершён

    const elapsed = currentShift - c.requestedShift;

    // Смена N+1: проверка (если ещё не проверено)
    if (elapsed >= 1 && !c.checked) {
      c.checked = true;
      c.isForged = Math.random() < FORGED_CHANCE;

      if (c.isForged) {
        // Считаем размер отката от отдела
        c.theftAmount = calcDepartmentTheft(hall.factory, c.indicator);
      } else {
        // Настоящий отчёт — автоответ
        c.answerSent = true;
        c.answer = 'real';
      }
    }

    // Смена N+2: если была попытка прикрытия — отдел отвечает
    if (elapsed >= 2 && c.coverAttempted && c.departmentAgreed === null) {
      c.departmentAgreed = Math.random() < DEPARTMENT_AGREE_CHANCE;

      if (c.departmentAgreed) {
        // Отдел согласился: откат идёт Безопаснику в карман
        if (security) security.kickbacks += c.theftAmount;
        c.theftResolved = true;
        c.answer = 'real';
      } else {
        // Отдел отказался: откат идёт в бюджет + в конфисковано
        if (hall.factory) {
          hall.factory.money += c.theftAmount;
          hall.factory.budgetPercent = Math.round((hall.factory.money / 500) * 100);
        }
        if (security) security.returns += c.theftAmount;
        c.theftResolved = true;
        c.answer = 'forged';
      }
      c.answerSent = true;
    }

    // Смена N+4: Директор получает ответ
    if (elapsed >= 4 && c.answerSent && !c.directorNotified) {
      c.directorNotified = true;
    }
  });
}

// Сколько монет откатил отдел — зависит от уровня отдела
function calcDepartmentTheft(factory, indicator) {
  const dirs = INDICATOR_DIRECTIONS[indicator] || [];
  if (dirs.length === 0) return 10;

  const levels = dirs.map(d => factory.directions[d] || 0);
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;

  if (avg >= 83) return 50;
  if (avg >= 50) return 25;
  return 10;
}

// ─── Прикрытие отдела (Безопасник) ───
function coverDepartment(socketId, indicator) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (p.decisionsLeft < COVER_DECISION_COST) {
    return { error: 'Недостаточно решений для прикрытия' };
  }

  // Найти запрос по этому показателю
  const c = hall.reportChecks.find(rc =>
    rc.indicator === indicator &&
    rc.checked &&
    rc.isForged &&
    !rc.coverAttempted &&
    !rc.directorNotified
  );
  if (!c) return { error: 'Нет запроса на этот отчёт' };

  c.coverAttempted = true;
  p.decisionsLeft -= COVER_DECISION_COST;

  return { ok: true, decisionsLeft: p.decisionsLeft };
}

// ─── Обычный ответ Безопасника «подделан» ───
function answerForged(socketId, indicator) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'security') return { error: 'Только Безопасник' };

  const c = hall.reportChecks.find(rc =>
    rc.indicator === indicator &&
    rc.checked &&
    rc.isForged &&
    !rc.answerSent &&
    !rc.directorNotified
  );
  if (!c) return { error: 'Нет запроса на этот отчёт' };

  // Возврат денег в бюджет + Конфисковано
  if (hall.factory) {
    hall.factory.money += c.theftAmount;
    hall.factory.budgetPercent = Math.round((hall.factory.money / 500) * 100);
  }
  p.returns += c.theftAmount;

  c.theftResolved = true;
  c.answer = 'forged';
  c.answerSent = true;

  return { ok: true, theftAmount: c.theftAmount, returns: p.returns };
}

// ─── Сговор (старая механика) ───
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

  return { ok: true, pending: true, directorId: director.id, decisionsLeft: p.decisionsLeft };
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

// ─── Конфискация (донос на игрока — старая механика) ───
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

  const pocket = hall.factory.pocket || 0;
  const confiscated = confiscatePocket(hall.factory, Math.floor(pocket / 2));

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

function recalcSuspicionsAfterShift() {
  const sec = hall.players.find(x => x.role === 'security');
  if (!sec) return;

  const director = hall.players.find(x => x.role === 'director');
  if (!director) return;

  const pastShift = hall.shift - 1;
  const thefts = hall.theftsLog.filter(t => t.shift === pastShift);

  if (thefts.length === 0) return;

  const checked = sec.dossier.some(d => d.shift === pastShift && d.targetId === director.id);

  if (!checked) sec.suspicions += 20;
  if (hall.deal.active) sec.suspicions += 10;
  if (thefts.length >= 2) sec.suspicions += 5;

  sec.suspicions = Math.max(0, Math.min(100, sec.suspicions));
  return { suspicions: sec.suspicions };
}

// ─── Снимок Безопасника ───
function securitySnapshot(p) {
  if (!p || p.role !== 'security') return null;

  // Активные проверки для Безопасника
  const activeChecks = hall.reportChecks
    .filter(c =>
      c.checked &&
      c.isForged &&
      !c.answerSent &&
      !c.directorNotified &&
      !c.coverAttempted
    )
    .map(c => ({
      indicator: c.indicator,
      title: INDICATOR_TITLES[c.indicator] || '—',
      theftAmount: c.theftAmount,
      requestedShift: c.requestedShift
    }));

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
    },
    reportChecks: activeChecks
  };
}

module.exports = {
  checkPlayer,
  resolvePendingChecks,
  processChecksOnShiftStart,
  coverDepartment,
  answerForged,
  offerDeal,
  acceptDeal,
  declineDeal,
  breakDeal,
  reportPlayer,
  recalcSuspicionsAfterShift,
  securitySnapshot,
  ROLE_TITLES,
  INDICATOR_TITLES
};