// ═══════════════════════════════════════════
// КАБИНЕТ БЕЗОПАСНИКА — проверки, сговор, донос
// ═══════════════════════════════════════════

const { hall, getPlayer } = require('../hall');
const { confiscatePocket, DIRECTIONS } = require('../factory');
const director = require('./director');

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

const INDICATOR_DIRECTIONS = {
  quality:    ['equipment', 'people'],
  clients:    ['ads'],
  employees:  ['people'],
  equipment:  ['equipment'],
  reputation: ['equipment', 'people', 'ads', 'security', 'economy']
};

const COVER_DECISION_COST = 2;
const FORGED_CHANCE = 0.3;
const DEPARTMENT_AGREE_CHANCE = 0.5;

function canAct(p) {
  if (!p || p.role !== 'security') return { error: 'Только Безопасник' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (p.finished) return { error: 'Вы уже завершили смену' };
  if (p.decisionsLeft <= 0) return { error: 'Решения на смену закончились' };
  return { ok: true };
}

// ═══════════════════════════════════════════
// ПРОВЕРКА ИГРОКА
// ═══════════════════════════════════════════
function checkPlayer(socketId, targetId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (hall.deal.active) {
    return { error: 'Пока действует сговор, проверять нельзя' };
  }

  const target = getPlayer(targetId);
  if (!target) return { error: 'Игрок не найден' };

  // Проверяем обнал, если это Директор
  let luxuryFound = null;
  if (target.role === 'director') {
    luxuryFound = inspectLuxury(target);
  }

  const entry = {
    shift: hall.shift,
    targetId: targetId,
    targetRole: target.role,
    targetTitle: ROLE_TITLES[target.role] || '—',
    result: 'pending'
  };

  if (luxuryFound) {
    entry.luxuryFound = true;
    entry.luxuryList = luxuryFound.list;
    entry.luxuryTotal = luxuryFound.total;
  }

  p.dossier.push(entry);

  p.decisionsLeft -= 1;

  return {
    ok: true,
    pending: true,
    targetTitle: ROLE_TITLES[target.role] || '—',
    luxuryFound: !!luxuryFound,
    decisionsLeft: p.decisionsLeft,
    dossier: p.dossier
  };
}

// ─── Что у Директора куплено ───
function inspectLuxury(target) {
  if (!target || target.role !== 'director') return null;
  if (!target.luxury) return null;

  const shop = require('./director-shop');

  let total = 0;
  const list = [];

  Object.keys(target.luxury).forEach(catKey => {
    const itemKey = target.luxury[catKey];
    if (!itemKey) return;
    const item = shop.getItem(itemKey);
    if (!item) return;
    if (item.price <= 0) return; // стартовые вещи — не считаем
    total += item.price;
    list.push({
      key: item.key,
      title: item.title,
      price: item.price,
      category: item.category
    });
  });

  if (list.length === 0) return null;
  return { list, total };
}

// ─── Конфискация обнала ───
function confiscateLuxury(socketId, targetId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const target = getPlayer(targetId);
  if (!target) return { error: 'Игрок не найден' };
  if (target.role !== 'director') return { error: 'Обнал только у Директора' };

  // Есть ли проверка с найденным обналом?
  const entry = p.dossier.find(d =>
    d.targetId === targetId &&
    d.luxuryFound &&
    d.shift >= hall.shift - 2
  );
  if (!entry) return { error: 'Нет проверки с обналом' };

  // Конфискуем через director.js
  const result = director.confiscateAll(targetId);
  if (result.error) return result;

  // Деньги в бюджет завода
  hall.factory.money += result.total;
  hall.factory.budgetPercent = Math.round((hall.factory.money / 500) * 100);
  p.returns += result.total;

  // Записываем факт конфискации
  if (!hall.confiscationsLog) hall.confiscationsLog = [];
  hall.confiscationsLog.push({
    shift: hall.shift,
    targetId: targetId,
    amount: result.total
  });

  // Удаляем запись с обналом из досье (всё сделано)
  p.dossier = p.dossier.filter(d => !(d.targetId === targetId && d.luxuryFound));

  p.decisionsLeft -= 1;

  return {
    ok: true,
    total: result.total,
    targetTitle: ROLE_TITLES[target.role] || '—',
    decisionsLeft: p.decisionsLeft,
    returns: p.returns,
    dossier: p.dossier
  };
}

// ─── Слух ───
function spreadRumor(socketId, targetId) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'security') return { error: 'Только Безопасник' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (p.decisionsLeft <= 0) return { error: 'Решения закончились' };

  const target = getPlayer(targetId);
  if (!target) return { error: 'Игрок не найден' };

  // Записываем в лог слухов — для финала и для разговоров
  if (!hall.rumorsLog) hall.rumorsLog = [];
  hall.rumorsLog.push({
    shift: hall.shift,
    fromRole: 'security',
    targetId: targetId,
    targetRole: target.role
  });

  p.decisionsLeft -= 1;

  return {
    ok: true,
    targetTitle: ROLE_TITLES[target.role] || '—',
    decisionsLeft: p.decisionsLeft
  };
}

// ═══════════════════════════════════════════
// ПРОВЕРКИ ОТЧЁТОВ
// ═══════════════════════════════════════════
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

function processChecksOnShiftStart() {
  const currentShift = hall.shift;
  const security = hall.players.find(x => x.role === 'security');

  hall.reportChecks.forEach(c => {
    if (c.directorNotified) return;

    const elapsed = currentShift - c.requestedShift;

    if (elapsed >= 1 && !c.checked) {
      c.checked = true;
      c.isForged = Math.random() < FORGED_CHANCE;

      if (c.isForged) {
        c.theftAmount = calcDepartmentTheft(hall.factory, c.indicator);
      } else {
        c.answerSent = true;
        c.answer = 'real';
      }
    }

    if (elapsed >= 2 && c.coverAttempted && c.departmentAgreed === null) {
      c.departmentAgreed = Math.random() < DEPARTMENT_AGREE_CHANCE;

      if (c.departmentAgreed) {
        if (security) security.kickbacks += c.theftAmount;
        c.theftResolved = true;
        c.answer = 'real';
      } else {
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

    if (elapsed >= 4 && c.answerSent && !c.directorNotified) {
      c.directorNotified = true;
    }
  });
}

function calcDepartmentTheft(factory, indicator) {
  const dirs = INDICATOR_DIRECTIONS[indicator] || [];
  if (dirs.length === 0) return 10;

  const levels = dirs.map(d => factory.directions[d] || 0);
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;

  if (avg >= 83) return 50;
  if (avg >= 50) return 25;
  return 10;
}

function coverDepartment(socketId, indicator) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (p.decisionsLeft < COVER_DECISION_COST) {
    return { error: 'Недостаточно решений для прикрытия' };
  }

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

// ═══════════════════════════════════════════
// СГОВОР
// ═══════════════════════════════════════════
function offerDeal(socketId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (hall.deal.active) return { error: 'Сговор уже активен' };
  if (hall.deal.pending) return { error: 'Предложение уже отправлено' };

  const d = hall.players.find(x => x.role === 'director');
  if (!d) return { error: 'Директор не найден' };

  hall.deal.pending = true;
  hall.deal.securityId = socketId;
  hall.deal.directorId = d.id;

  p.decisionsLeft -= 1;

  return { ok: true, pending: true, directorId: d.id, decisionsLeft: p.decisionsLeft };
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

// ═══════════════════════════════════════════
// ДОНОС (старая механика)
// ═══════════════════════════════════════════
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

  const d = hall.players.find(x => x.role === 'director');
  if (!d) return;

  const pastShift = hall.shift - 1;
  const thefts = hall.theftsLog.filter(t => t.shift === pastShift);

  if (thefts.length === 0) return;

  const checked = sec.dossier.some(x => x.shift === pastShift && x.targetId === d.id);

  if (!checked) sec.suspicions += 20;
  if (hall.deal.active) sec.suspicions += 10;
  if (thefts.length >= 2) sec.suspicions += 5;

  sec.suspicions = Math.max(0, Math.min(100, sec.suspicions));
  return { suspicions: sec.suspicions };
}

// ═══════════════════════════════════════════
// СНИМОК
// ═══════════════════════════════════════════
function securitySnapshot(p) {
  if (!p || p.role !== 'security') return null;

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

  // Список целей с найденным обналом (для кнопок)
  const luxuryTargets = p.dossier
    .filter(d => d.luxuryFound && d.shift >= hall.shift - 2)
    .map(d => ({
      targetId: d.targetId,
      targetRole: d.targetRole,
      targetTitle: d.targetTitle,
      total: d.luxuryTotal,
      list: d.luxuryList || []
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
    reportChecks: activeChecks,
    luxuryTargets: luxuryTargets
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
  confiscateLuxury,
  spreadRumor,
  recalcSuspicionsAfterShift,
  securitySnapshot,
  ROLE_TITLES,
  INDICATOR_TITLES
};