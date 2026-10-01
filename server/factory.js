// ═══════════════════════════════════════════
// ЗАВОД — уровни отделов, инвестиции, бюджет
// ═══════════════════════════════════════════

const { hall } = require('./hall');

const LEVEL = {
  LOW:    33,
  MID:    66,
  HIGH:   100
};

const DIRECTIONS = ['equipment', 'people', 'ads', 'security', 'economy'];

const TAKE_FROM_BUDGET = {
  33:  10,
  66:  25,
  100: 50
};

function totalInvested(directions) {
  return DIRECTIONS.reduce((sum, d) => sum + (directions[d] || 0), 0);
}

function calcInvestments(directions) {
  const avg = totalInvested(directions) / DIRECTIONS.length;
  if (avg < 50) return LEVEL.LOW;
  if (avg < 83) return LEVEL.MID;
  return LEVEL.HIGH;
}

function calcBudgetPercent(invested) {
  const low = 165;
  const high = 500;
  const budgetAtLow = 66;
  const budgetAtHigh = 33;

  let percent;
  if (invested <= low) {
    percent = budgetAtLow + (low - invested) * (100 - budgetAtLow) / low;
    percent = Math.min(100, percent);
  } else {
    percent = budgetAtLow - (invested - low) * (budgetAtLow - budgetAtHigh) / (high - low);
    percent = Math.max(budgetAtHigh, percent);
  }
  return Math.round(percent);
}

function createDirections(level) {
  const dirs = {};
  DIRECTIONS.forEach(d => dirs[d] = level);
  return dirs;
}

function createFactory(type) {
  const isGood = type === 'good';

  const startLevel = isGood ? LEVEL.HIGH : LEVEL.LOW;
  const directions = createDirections(startLevel);
  const invested = totalInvested(directions);

  return {
    type: type,
    directions: directions,
    invested: invested,
    investments: calcInvestments(directions),
    budgetPercent: calcBudgetPercent(invested),
    reputation: isGood ? 70 : 30,
    pocket: 0,
    bankrupt: false
  };
}

// Установить уровень отдела
function setLevel(factory, direction, level) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };
  if (!DIRECTIONS.includes(direction)) return { error: 'Неизвестный отдел' };
  if (![LEVEL.LOW, LEVEL.MID, LEVEL.HIGH].includes(level)) return { error: 'Неизвестный уровень' };

  const current = factory.directions[direction];
  if (current === level) return { error: 'Уже на этом уровне' };

  factory.directions[direction] = level;
  factory.invested = totalInvested(factory.directions);
  factory.investments = calcInvestments(factory.directions);
  factory.budgetPercent = calcBudgetPercent(factory.invested);

  return { ok: true, factory };
}

// Украсть из бюджета (с записью в журнал краж)
function takeFromBudget(factory, level) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };
  const amount = TAKE_FROM_BUDGET[level];
  if (!amount) return { error: 'Неизвестный уровень' };

  factory.budgetPercent = Math.max(0, factory.budgetPercent - amount);
  factory.pocket += amount;

  // Запись в журнал краж
  hall.theftsLog.push({
    shift: hall.shift,
    amount: amount,
    type: 'budget'
  });

  if (factory.budgetPercent < 0) {
    factory.bankrupt = true;
    return { bankrupt: true, factory };
  }

  return { ok: true, factory };
}

// Украсть из инвестиций (опустить отдел)
function takeFromDirection(factory, direction, level) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };
  if (!DIRECTIONS.includes(direction)) return { error: 'Неизвестный отдел' };
  if (![LEVEL.LOW, LEVEL.MID, LEVEL.HIGH].includes(level)) return { error: 'Неизвестный уровень' };

  const current = factory.directions[direction];
  if (level >= current) {
    return { error: 'Нельзя поднять отдел воровством' };
  }

  const diff = current - level;
  factory.pocket += diff;
  factory.directions[direction] = level;

  factory.invested = totalInvested(factory.directions);
  factory.investments = calcInvestments(factory.directions);

  // Запись в журнал краж
  hall.theftsLog.push({
    shift: hall.shift,
    amount: diff,
    type: 'direction'
  });

  return { ok: true, factory };
}

// Конфисковать из кармана Директора (для доноса)
// amount — сколько забрать. Если больше кармана — заберём всё.
function confiscatePocket(factory, amount) {
  const taken = Math.min(factory.pocket, amount);
  factory.pocket -= taken;
  factory.budgetPercent = Math.min(100, factory.budgetPercent + taken);
  return taken;
}

function factorySnapshot(factory, forDirector = false) {
  if (!factory) return null;
  const snapshot = {
    directions: factory.directions,
    invested: factory.invested,
    investments: factory.investments,
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
  TAKE_FROM_BUDGET
};