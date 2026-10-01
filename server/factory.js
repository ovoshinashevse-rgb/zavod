// ═══════════════════════════════════════════
// ЗАВОД — уровни, деньги, инвестиции, бюджет
// ═══════════════════════════════════════════

const { hall } = require('./hall');

const LEVEL = {
  LOW:    33,
  MID:    66,
  HIGH:   100
};

const DIRECTIONS = ['equipment', 'people', 'ads', 'security', 'economy'];

// Стоимость отката (сколько уходит в карман)
const TAKE_AMOUNT = {
  33:  10,
  66:  25,
  100: 50
};

// Стоимость вложения (сколько уходит из кассы в отдел)
const INVEST_COST = {
  33:  10,
  66:  25,
  100: 50
};

// Стоимость решений для каждого уровня
const DECISION_COST = {
  33:  1,
  66:  2,
  100: 3
};

function totalInvested(directions) {
  return DIRECTIONS.reduce((sum, d) => sum + (directions[d] || 0), 0);
}

// Общая шкала инвестиций — среднее по 5 отделам, округлённое до 3 уровней
function calcInvestments(directions) {
  const avg = totalInvested(directions) / DIRECTIONS.length;
  if (avg < 50) return LEVEL.LOW;
  if (avg < 83) return LEVEL.MID;
  return LEVEL.HIGH;
}

// Бюджет — производная от money
// money 0   → 0%
// money 165 → 33%
// money 330 → 66%
// money 500 → 100%
function calcBudgetPercent(money) {
  const percent = Math.round((money / 500) * 100);
  return Math.max(0, Math.min(100, percent));
}

function createDirections(level) {
  const dirs = {};
  DIRECTIONS.forEach(d => dirs[d] = level);
  return dirs;
}

// Создать завод по типу
function createFactory(type) {
  const isGood = type === 'good';

  const startLevel = isGood ? LEVEL.HIGH : LEVEL.LOW;
  const directions = createDirections(startLevel);
  const invested = totalInvested(directions);

  // money рассчитываем так, чтобы бюджет был нужным
  // Хороший: invested 500, money 165 → бюджет 33%
  // Плохой:   invested 165, money 330 → бюджет 66%
  const money = isGood ? 165 : 330;

  return {
    type: type,
    directions: directions,
    invested: invested,
    investments: calcInvestments(directions),
    money: money,
    budgetPercent: calcBudgetPercent(money),
    reputation: isGood ? 70 : 30,
    pocket: 0,
    bankrupt: false
  };
}

// Вложить в отдел — деньги из кассы в отдел
function setLevel(factory, direction, level) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };
  if (!DIRECTIONS.includes(direction)) return { error: 'Неизвестный отдел' };
  if (![LEVEL.LOW, LEVEL.MID, LEVEL.HIGH].includes(level)) return { error: 'Неизвестный уровень' };

  const current = factory.directions[direction];
  if (current === level) return { error: 'Уже на этом уровне' };

  // Разница: если повышаем — деньги из кассы уходят.
  // Если понижаем — деньги возвращаются в кассу.
  const diff = level - current;   // > 0 — вложение, < 0 — деинвестиция

  // Стоимость перехода
  const cost = Math.abs(diff);

  if (diff > 0) {
    // Вложение — уходит из кассы
    if (factory.money < cost) {
      return { error: 'В кассе недостаточно денег' };
    }
    factory.money -= cost;
  } else {
    // Деинвестиция — возвращается в кассу
    factory.money += cost;
  }

  factory.directions[direction] = level;
  factory.invested = totalInvested(factory.directions);
  factory.investments = calcInvestments(factory.directions);
  factory.budgetPercent = calcBudgetPercent(factory.money);

  return { ok: true, factory };
}

// Откат из бюджета — деньги из кассы в карман
function takeFromBudget(factory, level) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };
  const amount = TAKE_AMOUNT[level];
  if (!amount) return { error: 'Неизвестный уровень' };

  factory.money = Math.max(0, factory.money - amount);
  factory.budgetPercent = calcBudgetPercent(factory.money);
  factory.pocket += amount;

  hall.theftsLog.push({
    shift: hall.shift,
    amount: amount,
    type: 'budget'
  });

  applyKickback(amount);

  if (factory.money < 0) {
    factory.bankrupt = true;
    return { bankrupt: true, factory };
  }

  return { ok: true, factory };
}

// Откат из инвестиций — деньги из отдела в карман
// Касса НЕ трогается.
function takeFromDirection(factory, direction, level) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };
  if (!DIRECTIONS.includes(direction)) return { error: 'Неизвестный отдел' };
  if (![LEVEL.LOW, LEVEL.MID, LEVEL.HIGH].includes(level)) return { error: 'Неизвестный уровень' };

  const current = factory.directions[direction];
  if (level >= current) return { error: 'Нельзя поднять отдел откатом' };

  const diff = current - level;
  factory.pocket += diff;
  factory.directions[direction] = level;

  factory.invested = totalInvested(factory.directions);
  factory.investments = calcInvestments(factory.directions);

  hall.theftsLog.push({
    shift: hall.shift,
    amount: diff,
    type: 'direction'
  });

  applyKickback(diff);

  return { ok: true, factory };
}

// Доля Безопасника от отката (при активном сговоре)
function applyKickback(amount) {
  if (!hall.deal.active) return;
  const sec = hall.players.find(x => x.role === 'security');
  if (!sec) return;
  const share = Math.floor(amount * 0.3);
  sec.kickbacks += share;
}

// Конфискация — из кармана в кассу (при доносе)
function confiscatePocket(factory, amount) {
  const taken = Math.min(factory.pocket, amount);
  factory.pocket -= taken;
  factory.money += taken;
  factory.budgetPercent = calcBudgetPercent(factory.money);
  return taken;
}

function factorySnapshot(factory, forDirector = false) {
  if (!factory) return null;
  const snapshot = {
    directions: factory.directions,
    invested: factory.invested,
    investments: factory.investments,
    money: factory.money,
    budgetPercent: factory.budgetPercent,
    reputation: factory.reputation,
    bankrupt: factory.bankrupt
  };
  if (forDirector) snapshot.pocket = factory.pocket;
  return snapshot;
}

module.exports = {
  createFactory,
  setLevel,
  takeFromBudget,
  takeFromDirection,
  confiscatePocket,
  factorySnapshot,
  calcInvestments,
  calcBudgetPercent,
  LEVEL,
  DIRECTIONS,
  TAKE_AMOUNT,
  INVEST_COST,
  DECISION_COST
};