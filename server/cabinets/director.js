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
  calcBudgetPercent,
  DECISION_COST,
  INDICATORS
} = require('../factory');

const REPORT_CHECK_DECISION_COST = 2;    // стоимость запроса
const REPORT_CHECK_DELAY = 4;            // через сколько смен придёт ответ
// ─── Помещения (выбирает Директор) ───
const BUILDINGS = {
  old_hangar:  { title: 'Старый ангар',    moneyBonus: 100, qualityMod: -10, spaceMod: 20 },
  new_shop:    { title: 'Новый цех',        moneyBonus: -50, qualityMod: +15, spaceMod: -10 },
  basement:    { title: 'Подвал',           moneyBonus: 150, qualityMod: -20, spaceMod: -20 },
  main_building:{ title: 'Заводской корпус', moneyBonus: 0,  qualityMod: 0,   spaceMod: 0 }
};

// ─── Продукты (выбирает Директор) ───
const PRODUCTS = {
  bread:       { title: 'Хлеб',         needQuality: 40, needStaff: 30, market: 'mass' },
  furniture:   { title: 'Мебель',       needQuality: 60, needStaff: 50, market: 'premium' },
  parts:       { title: 'Детали',       needQuality: 70, needStaff: 40, market: 'b2b' },
  electronics: { title: 'Электроника', needQuality: 90, needStaff: 60, market: 'premium' }
};
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
function chooseFactory(socketId) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'roles') return { error: 'Сейчас не время' };

  hall.factory = createFactory('neutral');   // нейтральный старт
  hall.phase = 'choose_setup';
  hall.shift = 0;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, true),
    buildings: BUILDINGS,
    products: PRODUCTS
  };
}

// ─── Директор выбирает помещение ───
function chooseBuilding(socketId, buildingKey) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'choose_setup') return { error: 'Сейчас не время' };
  if (!BUILDINGS[buildingKey]) return { error: 'Неизвестное помещение' };
  if (hall.factory.building) return { error: 'Помещение уже выбрано' };

  hall.factory.building = buildingKey;

  // Применяем бонус к деньгам
  const b = BUILDINGS[buildingKey];
  hall.factory.money = Math.max(0, hall.factory.money + b.moneyBonus);
  hall.factory.budgetPercent = calcBudgetPercent(hall.factory.money);

  // Применяем модификатор к качеству
  hall.factory.indicators.quality = Math.max(0, Math.min(100,
    hall.factory.indicators.quality + b.qualityMod));

  return {
    ok: true,
    building: buildingKey,
    factory: factorySnapshot(hall.factory, true),
    products: PRODUCTS
  };
}

// ─── Директор выбирает продукт ───
function chooseProduct(socketId, productKey) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'choose_setup') return { error: 'Сейчас не время' };
  if (!PRODUCTS[productKey]) return { error: 'Неизвестный продукт' };
  if (hall.factory.product) return { error: 'Продукт уже выбран' };

  hall.factory.product = productKey;

  // Если помещение ещё не выбрано — не запускаем игру
  if (!hall.factory.building) {
    return {
      ok: true,
      product: productKey,
      needBuilding: true
    };
  }

  // Оба выбраны — стартуем игру
  hall.phase = 'game';
  hall.shift = 1;

  hall.players.forEach(x => {
    x.finished = false;
    x.decisionsLeft = DECISIONS_PER_SHIFT[x.role] || 0;
  });

  return {
    ok: true,
    product: productKey,
    factory: factorySnapshot(hall.factory, true),
    phase: 'game',
    shift: 1
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
  chooseBuilding,
  chooseProduct,
  setDirectionLevel,
  takeFromBudgetAction,
  takeFromDirectionAction,
  submitReportAction,
  requestReportCheck,
  finishShift,
  BUILDINGS,
  PRODUCTS
};