// ═══════════════════════════════════════════
// КАБИНЕТ ДИРЕКТОРА — действия в смену
// ═══════════════════════════════════════════

const { hall, getPlayer, allFinishedShift, resetFinished, DECISIONS_PER_SHIFT } = require('../hall');
const {
  createFactory,
  setLevel,
  takeFromBudget,
  takeFromDirection,
  submitReport,
  factorySnapshot,
  DECISION_COST,
  INDICATORS
} = require('../factory');

const REPORT_CHECK_DECISION_COST = 2;    // стоимость запроса
const REPORT_CHECK_DELAY = 4;            // через сколько смен придёт ответ

// Проверить, что Директор может делать действие
function canAct(p) {
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };
  if (p.finished) return { error: 'Вы уже завершили смену' };
  if (p.decisionsLeft <= 0) return { error: 'Решения на смену закончились' };
  return { ok: true };
}

// Создать завод по выбору Директора
function chooseFactory(socketId, type) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор выбирает завод' };
  if (hall.phase !== 'roles') return { error: 'Сейчас не время выбирать завод' };
  if (type !== 'good' && type !== 'bad') return { error: 'Неизвестный тип завода' };

  hall.factory = createFactory(type);
  hall.phase = 'game';
  hall.shift = 1;

  hall.players.forEach(x => {
    x.finished = false;
    x.decisionsLeft = DECISIONS_PER_SHIFT[x.role] || 0;
  });

  return {
    ok: true,
    type: type,
    factory: factorySnapshot(hall.factory, true)
  };
}

// Установить уровень отдела
function setDirectionLevel(socketId, direction, level) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  // Сколько решений стоит это действие
  const cost = DECISION_COST[level];
  if (!cost) return { error: 'Неизвестный уровень' };
  if (p.decisionsLeft < cost) {
    return { error: 'Недостаточно решений для этого действия' };
  }

  const result = setLevel(hall.factory, direction, level);
  if (result.error) return result;

  p.decisionsLeft -= cost;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, true),
    bankrupt: result.factory.bankrupt,
    decisionsLeft: p.decisionsLeft
  };
}

// Откат из бюджета
function takeFromBudgetAction(socketId, level) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const cost = DECISION_COST[level];
  if (!cost) return { error: 'Неизвестный уровень' };
  if (p.decisionsLeft < cost) {
    return { error: 'Недостаточно решений для этого действия' };
  }

  const result = takeFromBudget(hall.factory, level);
  if (result.error) return result;

  p.decisionsLeft -= cost;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, true),
    bankrupt: result.bankrupt || false,
    decisionsLeft: p.decisionsLeft
  };
}

// Откат из инвестиций
function takeFromDirectionAction(socketId, direction, level) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const cost = DECISION_COST[level];
  if (!cost) return { error: 'Неизвестный уровень' };
  if (p.decisionsLeft < cost) {
    return { error: 'Недостаточно решений для этого действия' };
  }

  const result = takeFromDirection(hall.factory, direction, level);
  if (result.error) return result;

  p.decisionsLeft -= cost;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, true),
    decisionsLeft: p.decisionsLeft
  };
}

// Завершить смену
function finishShift(socketId) {
  const p = getPlayer(socketId);
  if (!p) return { error: 'Игрок не найден' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (p.finished) return { error: 'Вы уже завершили смену' };

  p.finished = true;

  if (allFinishedShift()) {
    resetFinished();
    return { ok: true, newShift: true, shift: hall.shift };
  }

  return { ok: true, newShift: false };
}
// Сдать отчёт по показателю
function submitReportAction(socketId, indicatorKey) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };
  if (p.finished) return { error: 'Вы уже завершили смену' };

  if (!INDICATORS.includes(indicatorKey)) {
    return { error: 'Неизвестный показатель' };
  }

  if (hall.factory.reportsSubmitted[indicatorKey]) {
    return { error: 'Отчёт уже сдан' };
  }

  const result = submitReport(hall.factory, indicatorKey);
  if (result.error) return result;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, { forDirector: true })
  };
}
// Запросить проверку отчёта
function requestReportCheck(socketId, indicator) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (!INDICATORS.includes(indicator)) {
    return { error: 'Неизвестный показатель' };
  }

  // Один активный запрос
  const active = hall.reportChecks.find(c =>
    c.directorId === socketId && !c.directorNotified
  );
  if (active) {
    return { error: 'Уже есть активный запрос' };
  }

  // Проверка стоимости
  if (p.decisionsLeft < REPORT_CHECK_DECISION_COST) {
    return { error: 'Недостаточно решений для запроса проверки' };
  }

  p.decisionsLeft -= REPORT_CHECK_DECISION_COST;

  hall.reportChecks.push({
    directorId: socketId,
    indicator: indicator,
    requestedShift: hall.shift,
    checked: false,
    isForged: null,
    coverAttempted: false,
    departmentAgreed: null,
    theftAmount: 0,
    theftResolved: false,
    answerSent: false,
    answer: null,
    directorNotified: false
  });

  return {
    ok: true,
    decisionsLeft: p.decisionsLeft,
    indicator: indicator
  };
}
module.exports = {
  chooseFactory,
  setDirectionLevel,
  takeFromBudgetAction,
  takeFromDirectionAction,
  submitReportAction,
  requestReportCheck,
  finishShift
};