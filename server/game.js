// ═══════════════════════════════════════════
// ИГРОВАЯ ЛОГИКА — состояние завода и действия
// ═══════════════════════════════════════════

// Стоимость вложения
const AMOUNT_COST = {
  small:  10,
  medium: 25,
  large:  50
};

// Сколько добавляется к направлению
const AMOUNT_GAIN = {
  small:  10,
  medium: 25,
  large:  50
};

// Направления — стартовые значения зависят от завода
function createDirections(startValue) {
  return {
    equipment:  startValue,
    people:     startValue,
    ads:        startValue,
    security:   startValue,
    economy:    startValue
  };
}

// Создать завод по выбору Директора
// type = 'good' | 'bad'
function createFactory(type) {
  const isGood = type === 'good';

  const startValue = isGood ? 60 : 30;
  const reputation = isGood ? 70 : 30;
  const budget     = isGood ? 150 : 500;

  const directions = createDirections(startValue);

  return {
    type: type,                // 'good' | 'bad'
    budget: budget,
    reputation: reputation,
    investments: startValue,   // стартовый KPI = среднее по направлениям (все равны)
    directions: directions,
    bankrupt: false
  };
}

// Общий KPI инвестиций = среднее по 5 направлениям
function calcInvestments(directions) {
  const values = Object.values(directions);
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
}

function invest(factory, direction, amount) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };

  const cost = AMOUNT_COST[amount];
  const gain = AMOUNT_GAIN[amount];

  if (!cost || !gain) return { error: 'Неизвестная сумма' };
  if (!(direction in factory.directions)) return { error: 'Неизвестное направление' };

  factory.budget -= cost;
  factory.directions[direction] = Math.min(100, factory.directions[direction] + gain);
  factory.investments = calcInvestments(factory.directions);

  if (amount === 'large') {
    factory.reputation = Math.min(100, factory.reputation + 5);
  }

  if (factory.budget < 0) {
    factory.bankrupt = true;
    return { bankrupt: true };
  }

  return { ok: true, factory };
}

function isBankrupt(factory) {
  return factory.bankrupt || factory.budget < 0;
}

module.exports = {
  createFactory,
  invest,
  isBankrupt,
  calcInvestments,
  AMOUNT_COST,
  AMOUNT_GAIN
};