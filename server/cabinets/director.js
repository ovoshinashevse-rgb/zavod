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

const REPORT_CHECK_DECISION_COST = 2;
const REPORT_CHECK_DELAY = 4;
const FINE_AMOUNT = 10;

// ─── Помещения ───
const BUILDINGS = {
  old_hangar:   { title: 'Старый ангар',     moneyBonus: 100,  qualityMod: -10, spaceMod:  20 },
  main_building:{ title: 'Заводской корпус', moneyBonus: 0,    qualityMod:   0, spaceMod:   0 },
  new_shop:     { title: 'Новый цех',        moneyBonus: -50,  qualityMod: +15, spaceMod: -10 }
};

// ─── Продукты ───
const PRODUCTS = {
  bread:       { title: 'Хлеб',       needQuality: 40, needStaff: 30, market: 'mass' },
  furniture:   { title: 'Мебель',     needQuality: 60, needStaff: 50, market: 'premium' },
  electronics: { title: 'Электроника', needQuality: 90, needStaff: 60, market: 'premium' }
};

function canAct(p) {
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };
  if (p.finished) return { error: 'Вы уже завершили смену' };
  if (p.decisionsLeft <= 0) return { error: 'Решения на смену закончились' };
  return { ok: true };
}

function chooseFactory(socketId) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'roles') return { error: 'Сейчас не время' };

  hall.factory = createFactory('neutral');
  hall.phase = 'choose_setup';
  hall.shift = 0;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, true),
    buildings: BUILDINGS,
    products: PRODUCTS
  };
}

function chooseBuilding(socketId, buildingKey) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'choose_setup') return { error: 'Сейчас не время' };
  if (!BUILDINGS[buildingKey]) return { error: 'Неизвестное помещение' };
  if (hall.factory.building) return { error: 'Помещение уже выбрано' };

  hall.factory.building = buildingKey;

  const b = BUILDINGS[buildingKey];
  hall.factory.money = Math.max(0, hall.factory.money + b.moneyBonus);
  hall.factory.budgetPercent = calcBudgetPercent(hall.factory.money);

  hall.factory.indicators.quality = Math.max(0, Math.min(100,
    hall.factory.indicators.quality + b.qualityMod));

  return {
    ok: true,
    building: buildingKey,
    factory: factorySnapshot(hall.factory, true),
    products: PRODUCTS
  };
}

function chooseProduct(socketId, productKey) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'choose_setup') return { error: 'Сейчас не время' };
  if (!PRODUCTS[productKey]) return { error: 'Неизвестный продукт' };
  if (hall.factory.product) return { error: 'Продукт уже выбран' };

  hall.factory.product = productKey;

  if (!hall.factory.building) {
    return { ok: true, product: productKey, needBuilding: true };
  }

  return {
    ok: true,
    product: productKey,
    factory: factorySnapshot(hall.factory, true)
  };
}

function setDirectionLevel(socketId, direction, level) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

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

// ═══════════════════════════════════════════
// ОТЧЁТЫ — Директор видит роли, не имена
// ═══════════════════════════════════════════

// Список отчётов за смену — только роли
function getReports() {
  const list = hall.players
    .filter(p => p.role !== 'director')
    .map(p => {
      const report = p.report;

      if (report && report.shift === hall.shift) {
        return {
          playerId: p.id,
          role: p.role,
          status: 'submitted',
          shownWord: report.shownWord || '—',
          howToExplain: report.howToExplain || null,
          whatToShow: report.whatToShow || null,
          isLie: report.isLie || false,
          shift: report.shift
        };
      }

      return {
        playerId: p.id,
        role: p.role,
        status: 'missing'
      };
    });

  return list;
}

// Обработка отчёта: согласовать / проверить / штраф
function processReport(socketId, playerId, action) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (p.finished) return { error: 'Вы уже завершили смену' };

  if (p.reportReviewedThisShift) {
    return { error: 'Вы уже разобрали один отчёт в эту смену' };
  }

  const target = getPlayer(playerId);
  if (!target) return { error: 'Игрок не найден' };

  if (action === 'approve') {
    p.reportReviewedThisShift = true;
    return {
      ok: true,
      action: 'approve',
      targetRole: target.role
    };
  }

  if (action === 'check') {
    if (p.decisionsLeft < REPORT_CHECK_DECISION_COST) {
      return { error: 'Недостаточно решений для проверки' };
    }

    p.decisionsLeft -= REPORT_CHECK_DECISION_COST;
    p.reportReviewedThisShift = true;

    if (!hall.reportChecks) hall.reportChecks = [];
    hall.reportChecks.push({
      directorId: socketId,
      targetId: playerId,
      targetRole: target.role,
      indicator: 'people',
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
      action: 'check',
      targetRole: target.role,
      decisionsLeft: p.decisionsLeft
    };
  }

  if (action === 'fine') {
    const targetReport = target.report;
    if (targetReport && targetReport.shift === hall.shift) {
      return { error: 'Игрок сдал отчёт — штраф невозможен' };
    }

    hall.factory.money = Math.max(0, hall.factory.money - FINE_AMOUNT);
    hall.factory.budgetPercent = calcBudgetPercent(hall.factory.money);

    if (!hall.finesLog) hall.finesLog = [];
    hall.finesLog.push({
      shift: hall.shift,
      targetId: playerId,
      amount: FINE_AMOUNT
    });

    p.reportReviewedThisShift = true;

    return {
      ok: true,
      action: 'fine',
      targetRole: target.role,
      amount: FINE_AMOUNT,
      factory: factorySnapshot(hall.factory, { forDirector: true })
    };
  }

  return { error: 'Неизвестное действие' };
}

// ═══════════════════════════════════════════
// ЗАВЕРШИТЬ СМЕНУ — для Директора новый поток
// ═══════════════════════════════════════════
// Если Директор — открывает список отчётов.
// Если HR без отчёта — просит отчёт.
// Иначе — завершает.
function finishShift(socketId) {
  const p = getPlayer(socketId);
  if (!p) return { error: 'Игрок не найден' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (p.finished) return { error: 'Вы уже завершили смену' };

  // ─── Директор: открыть список отчётов ───
  if (p.role === 'director') {
    return {
      ok: true,
      needReports: true,
      newShift: false,
      shift: hall.shift
    };
  }

  // ─── HR: требуется отчёт ───
  if (p.role === 'hr' && !p.report) {
    return {
      ok: true,
      needReport: true,
      newShift: false,
      shift: hall.shift
    };
  }

  // ─── Обычное завершение ───
  return doFinish(socketId);
}

// Финальное завершение (после отчётов или без)
function finishAfterReports(socketId) {
  const p = getPlayer(socketId);
  if (!p) return { error: 'Игрок не найден' };
  if (p.role !== 'director') return { error: 'Только Директор' };
  if (p.finished) return { error: 'Вы уже завершили смену' };

  return doFinish(socketId);
}

function doFinish(socketId) {
  const p = getPlayer(socketId);
  p.finished = true;

  if (allFinishedShift()) {
    resetFinished();
    return { ok: true, newShift: true, shift: hall.shift };
  }

  return { ok: true, newShift: false };
}

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

function requestReportCheck(socketId, indicator) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (!INDICATORS.includes(indicator)) {
    return { error: 'Неизвестный показатель' };
  }

  const active = hall.reportChecks.find(c =>
    c.directorId === socketId && !c.directorNotified
  );
  if (active) {
    return { error: 'Уже есть активный запрос' };
  }

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
  getReports,
  processReport,
  finishShift,
  finishAfterReports,
  BUILDINGS,
  PRODUCTS,
  FINE_AMOUNT
};