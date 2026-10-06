// ═══════════════════════════════════════════
// КАБИНЕТ ИНЖЕНЕРА — работа, спивание, отчёт
// ═══════════════════════════════════════════

const { hall, getPlayer } = require('../hall');
const {
  engineerDistribute,
  engineerDrink,
  engineerWork,
  engineerChooseEquipment,
  ENGINEER_DISTRIBUTE,
  EQUIPMENT_BY_PRODUCT,
  factorySnapshot,
  INDICATORS
} = require('../factory');

const ROLE_TITLES = {
  director: 'Директор',
  security: 'Безопасник',
  accountant: 'Бухгалтер',
  engineer: 'Инженер',
  hr: 'HR',
  marketer: 'Маркетолог'
};

// Проверить, что Инженер может действовать
function canAct(p) {
  if (!p || p.role !== 'engineer') return { error: 'Только Инженер' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };
  if (p.finished) return { error: 'Вы уже завершили смену' };
  if (p.decisionsLeft <= 0) return { error: 'Решения на смену закончились' };
  return { ok: true };
}

// ─── Работать ───
function workAction(socketId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (p.decisionsLeft < 1) return { error: 'Недостаточно решений' };

  const result = engineerWork(hall.factory);
  if (result.error) return result;

  p.decisionsLeft -= 1;

  return {
    ok: true,
    gain: result.gain,
    factory: factorySnapshot(hall.factory, { forDirector: true }),
    decisionsLeft: p.decisionsLeft
  };
}

// ─── Спиться ───
function drinkAction(socketId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (p.decisionsLeft < 1) return { error: 'Недостаточно решений' };

  const result = engineerDrink(hall.factory, p);
  if (result.error) return result;

  p.decisionsLeft -= 1;

  return {
    ok: true,
    pocketGain: result.pocketGain,
    factory: factorySnapshot(hall.factory, { forDirector: true }),
    decisionsLeft: p.decisionsLeft,
    pocket: p.pocket
  };
}

// ─── Распределить инвестиции на оборудование ───
function distributeAction(socketId, level) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const settings = ENGINEER_DISTRIBUTE[level];
  if (!settings) return { error: 'Неизвестный уровень' };
  if (p.decisionsLeft < settings.cost) {
    return { error: 'Недостаточно решений для этого действия' };
  }

  const result = engineerDistribute(hall.factory, level);
  if (result.error) return result;

  p.decisionsLeft -= settings.cost;

  return {
    ok: true,
    gain: result.gain,
    factory: factorySnapshot(hall.factory, { forDirector: true }),
    decisionsLeft: p.decisionsLeft
  };
}

// ─── Отчёт Директору (честный или подделанный) ───
function submitEngineerReport(socketId, realQuality) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'engineer') return { error: 'Только Инженер' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };

  // Реальное качество — из завода
  const actual = hall.factory.indicators.quality;
  const reported = realQuality ? actual : Math.min(100, actual + 30);   // подделал — «получше»

  p.engineerReport = {
    shift: hall.shift,
    actual: actual,
    reported: reported,
    isFake: !realQuality
  };

  return {
    ok: true,
    report: {
      shift: hall.shift,
      reported: reported
    }
  };
}

// ─── Снимок Инженера ───
function engineerSnapshot(p) {
  if (!p || p.role !== 'engineer') return null;

  const f = hall.factory || {};

  return {
    decisionsLeft: p.decisionsLeft,
    pocket: p.pocket || 0,
    equipmentFund: f.equipmentFund || 0,
    indicators: {
      quality: f.indicators ? f.indicators.quality : 0,
      equipment: f.indicators ? f.indicators.equipment : 0,
      employees: f.indicators ? f.indicators.employees : 0
    },
    report: p.engineerReport
  };
}
// ─── Выбор оборудования (после выбора продукта) ───
function chooseEquipment(socketId, equipmentKey) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'engineer') return { error: 'Только Инженер' };
  if (hall.phase !== 'choose_equipment') return { error: 'Сейчас не время' };
  if (!hall.factory) return { error: 'Завод не создан' };

  const result = engineerChooseEquipment(hall.factory, equipmentKey);
  if (result.error) return result;

  // Фазу НЕ меняем — этим займётся server.js
  // Просто возвращаем результат

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, { forDirector: true }),
    option: result.option
  };
}

// ─── Получить список оборудования для продукта ───
function getEquipmentList(productKey) {
  if (!productKey) return null;
  return EQUIPMENT_BY_PRODUCT[productKey] || null;
}

module.exports = {
  workAction,
  drinkAction,
  distributeAction,
  submitEngineerReport,
  chooseEquipment,
  getEquipmentList,
  engineerSnapshot,
  ROLE_TITLES
};