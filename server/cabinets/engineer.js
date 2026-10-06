// ═══════════════════════════════════════════
// КАБИНЕТ ИНЖЕНЕРА — работа, спивание, отчёт
// ═══════════════════════════════════════════

const { hall, getPlayer } = require('../hall');
const {
  engineerDistribute,
  engineerWork,
  engineerChooseEquipment,
  ENGINEER_DISTRIBUTE,
  EQUIPMENT_BY_PRODUCT,
  factorySnapshot,
  INDICATORS
} = require('../factory');
const drinks = require('./engineer-drinks');

const ROLE_TITLES = {
  director: 'Директор',
  security: 'Безопасник',
  accountant: 'Бухгалтер',
  engineer: 'Инженер',
  hr: 'HR',
  marketer: 'Маркетолог'
};

// ─── Отчёт Директору ───
// Честный — 0 решений, поддельный — 1
const REPORT_DECISION_COST_REAL = 0;
const REPORT_DECISION_COST_FAKE = 1;

// ─── Запой ───
// Стоимость открытия раздела (1 решение)
const DRINK_OPEN_COST = 1;

// Порог отравления (шанс от водки)
const VODKA_POISON_CHANCE = 0.3;

// ─── Проверка: может ли Инженер действовать ───
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

// ═══════════════════════════════════════════
// ЗАПОЙ — пошаговый выбор
// ═══════════════════════════════════════════

// ─── Открыть раздел запоя ───
function startDrink(socketId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (p.decisionsLeft < DRINK_OPEN_COST) {
    return { error: 'Недостаточно решений' };
  }

  if (p.drunkState) {
    return { error: 'Ты уже в застое' };
  }

  p.drunkState = {
    step: 'place',
    place: null,
    company: null,
    drink: null,
    amount: null
  };

  p.decisionsLeft -= DRINK_OPEN_COST;

  return {
    ok: true,
    drunkState: p.drunkState,
    decisionsLeft: p.decisionsLeft
  };
}

// ─── Шаг: выбрать место ───
function chooseDrinkPlace(socketId, placeKey) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'engineer') return { error: 'Только Инженер' };
  if (!p.drunkState || p.drunkState.step !== 'place') {
    return { error: 'Сейчас не выбор места' };
  }

  if (!drinks.PLACES[placeKey]) return { error: 'Неизвестное место' };

  p.drunkState.place = placeKey;
  p.drunkState.step = 'company';

  return { ok: true, drunkState: p.drunkState };
}

// ─── Шаг: выбрать компанию ───
function chooseDrinkCompany(socketId, companyKey) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'engineer') return { error: 'Только Инженер' };
  if (!p.drunkState || p.drunkState.step !== 'company') {
    return { error: 'Сейчас не выбор компании' };
  }

  const company = drinks.COMPANIES[companyKey];
  if (!company) return { error: 'Неизвестная компания' };
  if (company.place !== p.drunkState.place) {
    return { error: 'Эта компания не для этого места' };
  }

  p.drunkState.company = companyKey;
  p.drunkState.step = 'drink';

  return { ok: true, drunkState: p.drunkState };
}

// ─── Шаг: выбрать напиток ───
function chooseDrinkDrink(socketId, drinkKey) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'engineer') return { error: 'Только Инженер' };
  if (!p.drunkState || p.drunkState.step !== 'drink') {
    return { error: 'Сейчас не выбор напитка' };
  }

  if (!drinks.DRINKS[drinkKey]) return { error: 'Неизвестный напиток' };

  p.drunkState.drink = drinkKey;
  p.drunkState.step = 'amount';

  return { ok: true, drunkState: p.drunkState };
}

// ─── Шаг: выбрать количество и применить эффект ───
function chooseDrinkAmount(socketId, amountKey) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'engineer') return { error: 'Только Инженер' };
  if (!p.drunkState || p.drunkState.step !== 'amount') {
    return { error: 'Сейчас не выбор количества' };
  }

  if (!drinks.AMOUNTS[amountKey]) return { error: 'Неизвестное количество' };

  const placeKey   = p.drunkState.place;
  const companyKey = p.drunkState.company;
  const drinkKey   = p.drunkState.drink;

  const effect = drinks.calcDrinkEffect(placeKey, companyKey, drinkKey, amountKey);
  if (!effect) return { error: 'Не удалось рассчитать эффект' };

  // ─── Применяем эффект ───

  // 1. Карман
  if (effect.money > 0) {
    p.pocket = (p.pocket || 0) + effect.money;
    hall.theftsLog.push({ shift: hall.shift, amount: effect.money, type: 'engineer_drink' });
    applyKickback(effect.money);
  } else if (effect.money < 0) {
    // Коньяк — платим из кармана
    p.pocket = Math.max(0, (p.pocket || 0) + effect.money);
  }

  // 2. Качество
  hall.factory.indicators.quality = Math.max(0,
    hall.factory.indicators.quality - effect.qualityLoss);

  // 3. Опьянение
  p.intoxication = (p.intoxication || 0) + effect.intoxication;

  // 4. Отравление (только от водки, случайно)
  const isVodka = drinkKey === 'vodka';
  const poisoned = isVodka && Math.random() < VODKA_POISON_CHANCE;
  if (poisoned) {
    p.blackout = (p.blackout || 0) + 2;
    p.intoxication = Math.max(0, p.intoxication - 1);
  }

  // 5. События по риску
  const events = drinks.rollEvents(effect.risk);

  // Применяем события
  events.forEach(ev => {
    if (ev.qualityLoss) {
      hall.factory.indicators.quality = Math.max(0,
        hall.factory.indicators.quality - ev.qualityLoss);
    }
    if (ev.reputationLoss) {
      hall.factory.indicators.reputation = Math.max(0,
        hall.factory.indicators.reputation - ev.reputationLoss);
    }
    if (ev.moneyLoss) {
      hall.factory.money = Math.max(0, hall.factory.money - ev.moneyLoss);
      hall.factory.budgetPercent = Math.max(0,
        Math.round((hall.factory.money / 500) * 100));
    }
    if (ev.dossier) {
      // Безопасник получает запись в досье
      const sec = hall.players.find(x => x.role === 'security');
      if (sec) {
        if (!sec.dossier) sec.dossier = [];
        sec.dossier.push({
          shift: hall.shift,
          targetTitle: 'Инженер',
          targetId: p.id,
          result: 'drunk'
        });
      }
    }
  });

  // 6. Запись в личное дело
  if (!p.drinkLog) p.drinkLog = [];
  p.drinkLog.push({
    shift: hall.shift,
    place: placeKey,
    company: companyKey,
    drink: drinkKey,
    amount: amountKey,
    intoxication: effect.intoxication
  });

  // 7. Сбрасываем состояние выбора
  p.drunkState = null;

  return {
    ok: true,
    effect,
    events: events.map(e => e.key),
    poisoned,
    intoxication: p.intoxication,
    pocket: p.pocket,
    factory: factorySnapshot(hall.factory, { forDirector: true })
  };
}

// ─── Выйти из запоя (ломка) ───
function exitDrink(socketId) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'engineer') return { error: 'Только Инженер' };

  if (!p.intoxication || p.intoxication <= 0) {
    return { error: 'Ты и так трезв' };
  }

  // Ломка: качество падает, опьянение обнуляется
  const hangover = 5;
  hall.factory.indicators.quality = Math.max(0,
    hall.factory.indicators.quality - hangover);

  p.intoxication = 0;
  p.drunkState = null;

  return {
    ok: true,
    hangover,
    factory: factorySnapshot(hall.factory, { forDirector: true })
  };
}

// ─── Сговор: доля Безопаснику ───
function applyKickback(amount) {
  if (!hall.deal.active) return;
  const sec = hall.players.find(x => x.role === 'security');
  if (!sec) return;
  const share = Math.floor(amount * 0.3);
  sec.kickbacks += share;
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

// ─── Отчёт Директору ───
function submitEngineerReport(socketId, realQuality) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'engineer') return { error: 'Только Инженер' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };

  const costDecisions = realQuality ? REPORT_DECISION_COST_REAL : REPORT_DECISION_COST_FAKE;
  if (p.decisionsLeft < costDecisions) {
    return { error: 'Недостаточно решений для отчёта' };
  }

  const actual = hall.factory.indicators.quality;
  const reported = realQuality ? actual : Math.min(100, actual + 30);

  p.engineerReport = {
    shift: hall.shift,
    actual: actual,
    reported: reported,
    isFake: !realQuality
  };

  p.decisionsLeft -= costDecisions;

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
    intoxication: p.intoxication || 0,
    blackout: p.blackout || 0,
    drunkState: p.drunkState || null,
    indicators: {
      quality: f.indicators ? f.indicators.quality : 0,
      equipment: f.indicators ? f.indicators.equipment : 0,
      employees: f.indicators ? f.indicators.employees : 0
    },
    report: p.engineerReport
  };
}

// ─── Выбор оборудования ───
function chooseEquipment(socketId, equipmentKey) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'engineer') return { error: 'Только Инженер' };
  if (hall.phase !== 'choose_equipment') return { error: 'Сейчас не время' };
  if (!hall.factory) return { error: 'Завод не создан' };

  const result = engineerChooseEquipment(hall.factory, equipmentKey);
  if (result.error) return result;

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
  startDrink,
  chooseDrinkPlace,
  chooseDrinkCompany,
  chooseDrinkDrink,
  chooseDrinkAmount,
  exitDrink,
  distributeAction,
  submitEngineerReport,
  chooseEquipment,
  getEquipmentList,
  engineerSnapshot,
  ROLE_TITLES
};