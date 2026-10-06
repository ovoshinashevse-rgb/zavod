// ═══════════════════════════════════════════
// ЗАВОД — показатели, отделы, деньги, откаты
// ═══════════════════════════════════════════

const { hall } = require('./hall');

const LEVEL = {
  LOW:    33,
  MID:    66,
  HIGH:   100
};
// ─── Оборудование для каждого продукта ───
// Каждый вариант: title, desc, equipment (стартовое), qualityMod (к качеству), cost (деньги)
// Три продукта: хлеб (массовый), мебель (средний), электроника (премиум)
const EQUIPMENT_BY_PRODUCT = {
  bread: {
    old_ovens:  { title: 'Старые печи',        desc: 'Дёшево, качество страдает',        equipment: 30, qualityMod: -10, cost: 20 },
    gas_ovens:  { title: 'Газовые печи',       desc: 'Средне по цене, стабильно',        equipment: 55, qualityMod: 0,   cost: 60 },
    auto_ovens: { title: 'Автоматические печи', desc: 'Дорого, идеальный хлеб',           equipment: 80, qualityMod: 15,  cost: 120 }
  },
  furniture: {
    hand_tools: { title: 'Ручные инструменты', desc: 'Дёшево, медленно',                 equipment: 25, qualityMod: -15, cost: 15 },
    electric:   { title: 'Электроинструменты', desc: 'Средне, удобно',                   equipment: 55, qualityMod: 0,   cost: 60 },
    cnc:        { title: 'Станки с ЧПУ',       desc: 'Дорого, точная работа',            equipment: 85, qualityMod: 20,  cost: 150 }
  },
  electronics: {
    manual:     { title: 'Ручная линия',       desc: 'Дёшево, медленно и с браком',      equipment: 20, qualityMod: -20, cost: 25 },
    semi_auto:  { title: 'Полуавтомат',        desc: 'Средне, стабильно',                equipment: 55, qualityMod: 0,   cost: 80 },
    robotics:   { title: 'Роботизированная',   desc: 'Дорого, топ-качество',             equipment: 95, qualityMod: 25,  cost: 180 }
  }
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

// Инженер: распределение инвестиций в оборудование
const ENGINEER_DISTRIBUTE = {
  33:  { cost: 1, gain: 8  },   // Низкий — 1 решение, +8 к оборудованию
  66:  { cost: 2, gain: 18 },   // Средний — 2 решения, +18
  100: { cost: 3, gain: 30 }    // Высокий — 3 решения, +30
};

// Спивание: сколько уходит в карман Инженера и сколько теряет качество
const ENGINEER_DRINK = {
  pocketGain: 8,
  qualityLoss: 4
};

// Работа: прирост к качеству
const ENGINEER_WORK_GAIN = 3;
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
  // type больше не используется, но оставляем для совместимости
  // Стартовые значения — нейтральные, а бонусы придут от помещения
  const startLevel = LEVEL.MID;   // все отделы — на «среднем»
  const directions = createDirections(startLevel);
  const invested = totalInvested(directions);
  const money = 250;              // средняя сумма

  const indicators = createIndicators(50);   // все показатели по 50

  const reportsSubmitted = {};
  INDICATORS.forEach(k => reportsSubmitted[k] = false);

  const saleThreshold = {};
  INDICATORS.forEach(k => saleThreshold[k] = 70 + Math.floor(Math.random() * 31));

  return {
    type: type,
    directions: directions,
    invested: invested,
    investments: calcInvestments(directions),
    money: money,
    budgetPercent: calcBudgetPercent(money),
    indicators: indicators,
    reportsSubmitted: reportsSubmitted,
    saleThreshold: saleThreshold,
    pocket: 0,
    equipmentFund: 80,

    building: null,
    product: null,
    equipment: null,
    staff: null,
    market: null,

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

    // Если вложили в оборудование — растёт фонд оборудования
    if (direction === 'equipment') {
      factory.equipmentFund += cost;
    }
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
    bankrupt: factory.bankrupt,

    // ─── Что за завод: помещение, продукт, оборудование ───
    building: factory.building || null,
    product: factory.product || null,
    equipment: factory.equipment || null
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
// Проверить: готов ли завод к продаже
function isFactoryReadyForSale(factory) {
  if (!factory || factory.bankrupt) return false;
  return INDICATORS.every(k =>
    factory.indicators[k] >= factory.saleThreshold[k]
  );
}
// ═══════════════════════════════════════════
// ДЕЙСТВИЯ ИНЖЕНЕРА
// ═══════════════════════════════════════════

// Распределить инвестиции на оборудование
function engineerDistribute(factory, level) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };

  const settings = ENGINEER_DISTRIBUTE[level];
  if (!settings) return { error: 'Неизвестный уровень' };

  // Если фонд меньше, чем нужно — работаем с тем, что есть
  const available = Math.min(factory.equipmentFund, settings.gain);
  if (available <= 0) return { error: 'Фонд оборудования пуст' };

  factory.equipmentFund -= available;

  // Прирост к оборудованию (показатель)
  factory.indicators.equipment = Math.min(100, factory.indicators.equipment + available);

  return { ok: true, gain: available, factory };
}

// Спиться: качество падает, карман растёт (из фонда оборудования)
function engineerDrink(factory, player) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };

  // Из фонда оборудования — сколько есть
  const fromFund = Math.min(factory.equipmentFund, ENGINEER_DRINK.pocketGain);
  factory.equipmentFund -= fromFund;

  // В карман — сколько взяли из фонда
  player.pocket = (player.pocket || 0) + fromFund;

  // Качество падает
  factory.indicators.quality = Math.max(0, factory.indicators.quality - ENGINEER_DRINK.qualityLoss);

  return { ok: true, pocketGain: fromFund, factory };
}

// Работать: качество растёт
function engineerWork(factory) {
  if (factory.bankrupt) return { error: 'Завод уже обанкротился' };

  factory.indicators.quality = Math.min(100, factory.indicators.quality + ENGINEER_WORK_GAIN);

  return { ok: true, gain: ENGINEER_WORK_GAIN, factory };
}
// ─── Инженер выбирает оборудование ───
function engineerChooseEquipment(factory, equipmentKey) {
  if (!factory) return { error: 'Завод не создан' };
  if (!factory.product) return { error: 'Продукт не выбран' };
  if (factory.equipment) return { error: 'Оборудование уже выбрано' };

  const productEquipment = EQUIPMENT_BY_PRODUCT[factory.product];
  if (!productEquipment) return { error: 'Нет оборудования для этого продукта' };

  const option = productEquipment[equipmentKey];
  if (!option) return { error: 'Неизвестное оборудование' };

  // Запоминаем выбор
  factory.equipment = equipmentKey;

  // Устанавливаем стартовое оборудование
  factory.indicators.equipment = Math.max(0, Math.min(100, option.equipment));

  // Модифицируем качество
  factory.indicators.quality = Math.max(0, Math.min(100,
    (factory.indicators.quality || 50) + option.qualityMod));

  // Списываем деньги (может уйти в минус — это ок, банкротство наступит позже)
  factory.money -= option.cost;
  factory.budgetPercent = calcBudgetPercent(factory.money);

  // Обновляем фонд оборудования (то, что не потрачено на стартовое)
  factory.equipmentFund = Math.max(0, factory.equipmentFund - option.cost);

  return {
    ok: true,
    factory: factory,
    option: option
  };
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
  isFactoryReadyForSale,
  engineerDistribute,
  engineerDrink,
  engineerWork,
  engineerChooseEquipment,
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
  ENGINEER_DISTRIBUTE,
  ENGINEER_DRINK,
  ENGINEER_WORK_GAIN,
  EQUIPMENT_BY_PRODUCT,
  LOW_THRESHOLD
};