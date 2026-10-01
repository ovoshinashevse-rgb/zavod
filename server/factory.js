// ═══════════════════════════════════════════
// ЗАВОД — уровни отделов, инвестиции, бюджет
// ═══════════════════════════════════════════

const LEVEL = {
  LOW:    33,
  MID:    66,
  HIGH:   100
};

const DIRECTIONS = ['equipment', 'people', 'ads', 'security', 'economy'];

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

// Бюджет: 500 инвестиций → 33%, 165 инвестиций → 66%, 0 → 100%
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

// Создать завод по типу
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
    bankrupt: false
  };
}

// Установить уровень отдела
function setLevel(factory, direction, level) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };
  if (!DIRECTIONS.includes(direction)) return { error: 'Неизвестный отдел' };
  if (![LEVEL.LOW, LEVEL.MID, LEVEL.HIGH].includes(level)) return { error: 'Неизвестный уровень' };

  factory.directions[direction] = level;
  factory.invested = totalInvested(factory.directions);
  factory.investments = calcInvestments(factory.directions);
  factory.budgetPercent = calcBudgetPercent(factory.invested);

  return { ok: true, factory };
}

// Публичный снимок завода (что отправляем клиенту)
function factorySnapshot(factory) {
  if (!factory) return null;
  return {
    directions: factory.directions,
    invested: factory.invested,
    investments: factory.investments,
    budgetPercent: factory.budgetPercent,
    reputation: factory.reputation,
    bankrupt: factory.bankrupt
  };
}

module.exports = {
  createFactory,
  setLevel,
  factorySnapshot,
  calcInvestments,
  calcBudgetPercent,
  LEVEL,
  DIRECTIONS
};