// ═══════════════════════════════════════════
// ЗАВОД — показатели, отделы, деньги, откаты
// ═══════════════════════════════════════════

const { hall } = require('./hall');

const LEVEL = {
  LOW:    33,
  MID:    66,
  HIGH:   100
};

const DIRECTIONS = ['equipment', 'people', 'ads', 'security', 'economy'];

// Показатели завода
const INDICATORS = [
  'quality',       // Качество продукта
  'clients',       // Постоянные клиенты
  'employees',     // Сотрудники
  'equipment',     // Оборудование
  'reputation'     // Репутация
];

// К какому отделу привязан каждый показатель
// (для среднего по двум отделам — массив из двух)
const INDICATOR_SOURCE = {
  quality:    ['equipment', 'people'],
  clients:    ['ads', 'quality'],         // качество — не отдел, но влияет
  employees:  ['people'],
  equipment:  ['equipment'],
  reputation: ['equipment', 'people', 'ads', 'security', 'economy']   // всё
};

// Стоимость отката
const TAKE_AMOUNT = { 33: 10, 66: 25, 100: 50 };

// Стоимость вложения
const INVEST_COST = { 33: 10, 66: 25, 100: 50 };

// Стоимость решений
const DECISION_COST = { 33: 1, 66: 2, 100: 3 };

// Прирост / падение показателей за смену
const INDICATOR_GAIN = {
  100: 2,     // высокий уровень → +2
  66:  0,     // средний → 0
  33:  -4     // низкий → −4
};

// Порог, ниже которого начинаются проблемы
const LOW_THRESHOLD = 40;

function totalInvested(directions) {
  return DIRECTIONS.reduce((sum, d) => sum + (directions[d] || 0), 0);
}

function calcInvestments(directions) {
  const avg = totalInvested(directions) / DIRECTIONS.length;
  if (avg < 50) return LEVEL.LOW;
  if (avg < 83) return LEVEL.MID;
  return LEVEL.HIGH;
}

function calcBudgetPercent(money) {
  const percent = Math.round((money / 500) * 100);
  return Math.max(0, Math.min(100, percent));
}

function createDirections(level) {
  const dirs = {};
  DIRECTIONS.forEach(d => dirs[d] = level);
  return dirs;
}

function createIndicators(startValue) {
  const ind = {};
  INDICATORS.forEach(k => ind[k] = startValue);
  return ind;
}

function createFactory(type) {
  const isGood = type === 'good';

  const startLevel = isGood ? LEVEL.HIGH : LEVEL.LOW;
  const directions = createDirections(startLevel);
  const invested = totalInvested(directions);
  const money = isGood ? 165 : 330;

  // Пять показателей
  const indicators = createIndicators(isGood ? 70 : 30);

  // Отчёты (сдал ли Директор)
  const reportsSubmitted = {};
  INDICATORS.forEach(k => reportsSubmitted[k] = false);

  return {
    type: type,
    directions: directions,
    invested: invested,
    investments: calcInvestments(directions),
    money: money,
    budgetPercent: calcBudgetPercent(money),
    indicators: indicators,
    reportsSubmitted: reportsSubmitted,
    pocket: 0,
    bankrupt: false
  };
}

function setLevel(factory, direction, level) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };
  if (!DIRECTIONS.includes(direction)) return { error: 'Неизвестный отдел' };
  if (![LEVEL.LOW, LEVEL.MID, LEVEL.HIGH].includes(level)) return { error: 'Неизвестный уровень' };

  const current = factory.directions[direction];
  if (current === level) return { error: 'Уже на этом уровне' };

  const diff = level - current;
  const cost = Math.abs(diff);

  if (diff > 0) {
    if (factory.money < cost) return { error: 'В кассе недостаточно денег' };
    factory.money -= cost;
  } else {
    factory.money += cost;
  }

  factory.directions[direction] = level;
  factory.invested = totalInvested(factory.directions);
  factory.investments = calcInvestments(factory.directions);
  factory.budgetPercent = calcBudgetPercent(factory.money);

  return { ok: true, factory };
}

function takeFromBudget(factory, level) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };
  const amount = TAKE_AMOUNT[level];
  if (!amount) return { error: 'Неизвестный уровень' };

  factory.money = Math.max(0, factory.money - amount);
  factory.budgetPercent = calcBudgetPercent(factory.money);
  factory.pocket += amount;

  hall.theftsLog.push({ shift: hall.shift, amount: amount, type: 'budget' });
  applyKickback(amount);

  if (factory.money < 0) {
    factory.bankrupt = true;
    return { bankrupt: true, factory };
  }

  return { ok: true, factory };
}

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

  hall.theftsLog.push({ shift: hall.shift, amount: diff, type: 'direction' });
  applyKickback(diff);

  return { ok: true, factory };
}

function applyKickback(amount) {
  if (!hall.deal.active) return;
  const sec = hall.players.find(x => x.role === 'security');
  if (!sec) return;
  const share = Math.floor(amount * 0.3);
  sec.kickbacks += share;
}

function confiscatePocket(factory, amount) {
  const taken = Math.min(factory.pocket, amount);
  factory.pocket -= taken;
  factory.money += taken;
  factory.budgetPercent = calcBudgetPercent(factory.money);
  return taken;
}

// Прирост / падение показателей в конце смены
// Логика: смотрим на связанные отделы. Считаем средний уровень.
// Применяем INDICATOR_GAIN.
function applyIndicatorChanges(factory) {
  if (!factory) return;

  INDICATORS.forEach(key => {
    const sources = INDICATOR_SOURCE[key] || [];
    let total = 0;
    let count = 0;

    sources.forEach(src => {
      // Если источник — другой показатель (например, clients зависит от quality)
      if (INDICATORS.includes(src)) {
        total += factory.indicators[src] || 0;
        count++;
      } else if (DIRECTIONS.includes(src)) {
        total += factory.directions[src] || 0;
        count++;
      }
    });

    if (count === 0) return;

    const avg = total / count;

    let gain = 0;
    if (avg >= 83) gain = INDICATOR_GAIN[100];      // +2
    else if (avg >= 50) gain = INDICATOR_GAIN[66];  // 0
    else gain = INDICATOR_GAIN[33];                 // −4

    factory.indicators[key] = Math.max(0, Math.min(100, factory.indicators[key] + gain));
  });
}

// Директор «сдаёт отчёт»
function submitReport(factory, indicatorKey) {
  if (!INDICATORS.includes(indicatorKey)) return { error: 'Неизвестный показатель' };
  factory.reportsSubmitted[indicatorKey] = true;
  return { ok: true };
}

// Сбросить отчёты в новой смене
function resetReports(factory) {
  if (!factory) return;
  INDICATORS.forEach(k => factory.reportsSubmitted[k] = false);
}

// Автоматически заполнить отчёты (эмуляция ролей, которых пока нет)
// Позже, когда появятся реальные роли — они будут сдавать сами и подделывать
function autoFillReports(factory) {
  if (!factory) return;
  INDICATORS.forEach(k => {
    factory.reportsSubmitted[k] = true;
  });
}

// Качественная оценка
function qualitative(value) {
  if (value < 30) return 'low';
  if (value < 60) return 'mid';
  return 'high';
}

// Снимок завода
// opts.forDirector — с карманом и отчётами
function factorySnapshot(factory, opts = {}) {
  if (!factory) return null;

  const snapshot = {
    directions: factory.directions,
    invested: factory.invested,
    investments: factory.investments,
    money: factory.money,
    budgetPercent: factory.budgetPercent,
    bankrupt: factory.bankrupt
  };

  if (opts.forDirector) {
    snapshot.pocket = factory.pocket;

    const reports = {};
    INDICATORS.forEach(k => {
      if (factory.reportsSubmitted[k]) {
        reports[k] = qualitative(factory.indicators[k]);
      } else {
        reports[k] = 'missing';
      }
    });
    snapshot.reports = reports;
  }

  return snapshot;
}

module.exports = {
  createFactory,
  setLevel,
  takeFromBudget,
  takeFromDirection,
  confiscatePocket,
  applyIndicatorChanges,
  submitReport,
  resetReports,
  autoFillReports,
  factorySnapshot,
  calcInvestments,
  calcBudgetPercent,
  qualitative,
  LEVEL,
  DIRECTIONS,
  INDICATORS,
  INDICATOR_SOURCE,
  TAKE_AMOUNT,
  INVEST_COST,
  DECISION_COST,
  LOW_THRESHOLD
};