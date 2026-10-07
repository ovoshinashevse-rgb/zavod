// ═══════════════════════════════════════════
// КАБИНЕТ HR — найм, кумовство, отчёт
// ═══════════════════════════════════════════

const { hall, getPlayer } = require('../hall');
const {
  setLevel,
  factorySnapshot,
  calcBudgetPercent,
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

const LEVEL_LABELS = { 33: 'Низкий', 66: 'Средний', 100: 'Высокий' };

// ─── Стоимость решений ───
const ADOPT_DECISION_COST = 1;
const COVER_DECISION_COST = 2;
const FIRE_RELATIVE_DECISION_COST = 1;
const HIRE_STEP_DECISION_COST = 1;   // каждый шаг найма
const FIRE_DECISION_COST = { 33: 1, 66: 2, 100: 3 };
const REPORT_DECISION_COST = 0;

// ═══════════════════════════════════════════
// НАЙМ — пути и шаги
// ═══════════════════════════════════════════

// Три пути найма
const HIRE_PATHS = {
  ad:      { title: 'Дать объявление', steps: ['where', 'wait', 'interview', 'check'] },
  poach:   { title: 'Сманить с другого завода', steps: ['from', 'how'] },
  retrain: { title: 'Переучить своих', steps: ['whom', 'method'] }
};

// Опции шагов
const HIRE_OPTIONS = {
  // ad — объявление
  where: {
    site:   { title: 'На сайте',    cost: 15, qualityBonus: 1, countBonus: 1 },
    paper:  { title: 'В газете',    cost: 5,  qualityBonus: 0, countBonus: 0 },
    gates:  { title: 'У ворот',     cost: 0,  qualityBonus: -1, countBonus: 1 }
  },
  wait: {
    day:    { title: 'День',        cost: 0,  countBonus: -1, qualityBonus: 0 },
    week:   { title: 'Неделя',      cost: 5,  countBonus: 0,  qualityBonus: 1 },
    month:  { title: 'Месяц',       cost: 15, countBonus: 1,  qualityBonus: 1 }
  },
  interview: {
    fast:   { title: 'Быстро',      cost: 0,  qualityBonus: -1, countBonus: 1 },
    normal: { title: 'Нормально',   cost: 5,  qualityBonus: 0,  countBonus: 0 },
    strict: { title: 'Строго',      cost: 15, qualityBonus: 1,  countBonus: -1 }
  },
  check: {
    light:    { title: 'Упрощённо',      cost: 0,  riskMod: -1, qualityBonus: 0 },
    normal:   { title: 'Обычно',         cost: 5,  riskMod: 0,  qualityBonus: 0 },
    security: { title: 'Через Безопасника', cost: 15, riskMod: 1, qualityBonus: 1 }
  },

  // poach — сманить
  from: {
    neighbor: { title: 'Соседний цех',   cost: 20, qualityBonus: 0 },
    other:    { title: 'Другой завод',   cost: 40, qualityBonus: 1 },
    abroad:   { title: 'Из-за границы',  cost: 80, qualityBonus: 2 }
  },
  how: {
    money:      { title: 'Деньгами',      costMult: 1.5, qualityBonus: 1 },
    conditions: { title: 'Условиями',     costMult: 1.0, qualityBonus: 0 },
    contacts:   { title: 'Знакомством',   costMult: 0.5, qualityBonus: -1 }
  },

  // retrain — переучить
  whom: {
    young:       { title: 'Молодых',      qualityBonus: 1,  countBonus: -1 },
    experienced: { title: 'Опытных',      qualityBonus: 0,  countBonus: 0 },
    all:         { title: 'Всех',         qualityBonus: -1, countBonus: 1 }
  },
  method: {
    courses:  { title: 'Курсы',       cost: 15, qualityBonus: 1 },
    mentor:   { title: 'Наставник',   cost: 10, qualityBonus: 0 },
    practice: { title: 'Практика',    cost: 5,  qualityBonus: -1 }
  }
};

// ─── Расчёт найма: сколько наняли, сколько потратили, какие работники ───
function calcHireResult(path, choices) {
  let totalCost = 0;
  let qualityScore = 0;
  let countScore = 0;
  let riskScore = 0;

  HIRE_PATHS[path].steps.forEach(stepKey => {
    const choice = choices[stepKey];
    const option = HIRE_OPTIONS[stepKey] && HIRE_OPTIONS[stepKey][choice];
    if (!option) return;

    totalCost += option.cost || 0;
    qualityScore += option.qualityBonus || 0;
    countScore += option.countBonus || 0;
    riskScore += option.riskMod || 0;
  });

  // Множитель цены для poach
  if (path === 'poach' && choices.how) {
    const howOpt = HIRE_OPTIONS.how[choices.how];
    if (howOpt && howOpt.costMult) {
      totalCost = Math.round(totalCost * howOpt.costMult);
    }
  }

  // Итоговый people — рост от базового
  let peopleGain = 0;
  if (path === 'ad')      peopleGain = 25 + countScore * 5;
  if (path === 'poach')   peopleGain = 30 + qualityScore * 5;
  if (path === 'retrain') peopleGain = 15 + countScore * 5;

  return {
    totalCost,
    qualityScore,
    countScore,
    riskScore,
    peopleGain: Math.max(5, peopleGain)
  };
}

// ═══════════════════════════════════════════
// СОКРАЩЕНИЕ
// ═══════════════════════════════════════════
const FIRE_LEVELS = {
  33: { title: 'Отпустить пару',    refund: 10, peopleLoss: 10 },
  66: { title: 'Урезать смену',     refund: 25, peopleLoss: 25 },
  100:{ title: 'Разогнать бригаду', refund: 50, peopleLoss: 45 }
};

// ═══════════════════════════════════════════
// КУМОВСТВО — родня
// ═══════════════════════════════════════════
const RELATIVE_KIND = {
  nephew:   { title: 'Племянник', weight: 1 },
  kum:      { title: 'Сват / кум', weight: 2 },
  neighbor: { title: 'Сосед',      weight: 1 }
};

const RELATIVE_PLACE = {
  workshop:  { title: 'В цех',          direction: 'people',   harm: 1.2, gain: 1.0 },
  accounts:  { title: 'В бухгалтерию',  direction: 'economy',  harm: 1.0, gain: 1.2 },
  ads:       { title: 'В рекламу',      direction: 'ads',      harm: 1.0, gain: 1.1 },
  security:  { title: 'В безопасность', direction: 'security', harm: 1.1, gain: 1.3 }
};

const RELATIVE_POSITION = {
  worker:   { title: 'Работяга',   salary: 5,  fundShare: 0.5 },
  master:   { title: 'Специалист', salary: 15, fundShare: 1.0 },
  boss:     { title: 'Начальник',  salary: 30, fundShare: 1.5 }
};

// ═══════════════════════════════════════════
// ОТЧЁТ — что показать и как объяснить
// ═══════════════════════════════════════════
const REPORT_SHOW = {
  real:      { title: 'Только настоящих' },
  all:       { title: 'Всех, как есть' },
  embellish: { title: 'Приукрасить' }
};

const REPORT_EXPLAIN = {
  ok:      { title: 'Всё в порядке' },
  issues:  { title: 'Есть проблемы' },
  perfect: { title: 'Всё отлично' }
};

// ═══════════════════════════════════════════
// ПРОВЕРКА
// ═══════════════════════════════════════════
function canAct(p) {
  if (!p || p.role !== 'hr') return { error: 'Только HR' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };
  if (p.finished) return { error: 'Вы уже завершили смену' };
  if (p.decisionsLeft <= 0) return { error: 'Решения на смену закончились' };
  return { ok: true };
}

function getRealPeople() {
  return (hall.factory.directions && hall.factory.directions.people) || 0;
}

function getFamilyCount(p) {
  return (p.family && p.family.length) || 0;
}

// Эффективный people = реальный - вред от родни
function getEffectivePeople(p) {
  const real = getRealPeople();
  const familyCount = getFamilyCount(p);
  return Math.max(0, real - familyCount * 3);
}

// ─── Кумовство: одна шкала ───
function getNepotismLevel(p) {
  const count = getFamilyCount(p);
  const fund = p.familyFund || 0;
  // Кумовство = комбинация числа родни и денег
  return Math.min(100, count * 12 + Math.floor(fund / 3));
}

// ═══════════════════════════════════════════
// НАЙМ — старт, шаг, финиш
// ═══════════════════════════════════════════

// Начать путь найма
function hireStart(socketId, path) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (!HIRE_PATHS[path]) return { error: 'Неизвестный путь найма' };

  if (p.decisionsLeft < HIRE_STEP_DECISION_COST) {
    return { error: 'Недостаточно решений' };
  }

  p.hiring = {
    path: path,
    stepIndex: 0,
    choices: {}
  };

  p.decisionsLeft -= HIRE_STEP_DECISION_COST;

  return {
    ok: true,
    hiring: {
      path: path,
      stepIndex: 0,
      stepKey: HIRE_PATHS[path].steps[0]
    },
    decisionsLeft: p.decisionsLeft
  };
}

// Шаг найма
function hireStep(socketId, stepKey, choice) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'hr') return { error: 'Только HR' };
  if (!p.hiring) return { error: 'Сейчас не найм' };

  const path = p.hiring.path;
  const expectedStep = HIRE_PATHS[path].steps[p.hiring.stepIndex];

  if (stepKey !== expectedStep) return { error: 'Не тот шаг' };

  const option = HIRE_OPTIONS[stepKey] && HIRE_OPTIONS[stepKey][choice];
  if (!option) return { error: 'Неизвестный выбор' };

  if (p.decisionsLeft < HIRE_STEP_DECISION_COST) {
    return { error: 'Недостаточно решений' };
  }

  p.hiring.choices[stepKey] = choice;
  p.hiring.stepIndex += 1;
  p.decisionsLeft -= HIRE_STEP_DECISION_COST;

  const isLast = p.hiring.stepIndex >= HIRE_PATHS[path].steps.length;

  return {
    ok: true,
    hiring: {
      path: path,
      stepIndex: p.hiring.stepIndex,
      stepKey: isLast ? null : HIRE_PATHS[path].steps[p.hiring.stepIndex],
      done: isLast
    },
    decisionsLeft: p.decisionsLeft
  };
}

// Финиш — применить результат
function hireFinish(socketId) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'hr') return { error: 'Только HR' };
  if (!p.hiring) return { error: 'Сейчас не найм' };

  const path = p.hiring.path;
  const steps = HIRE_PATHS[path].steps;

  if (p.hiring.stepIndex < steps.length) {
    return { error: 'Найм ещё не закончен' };
  }

  const result = calcHireResult(path, p.hiring.choices);

  // Проверяем деньги
  if (hall.factory.money < result.totalCost) {
    return { error: 'В кассе недостаточно денег' };
  }

  hall.factory.money -= result.totalCost;
  hall.factory.budgetPercent = calcBudgetPercent(hall.factory.money);

  // Поднимаем people
  const current = getRealPeople();
  const target = Math.min(100, current + result.peopleGain);

  // Определяем уровень 33/66/100
  let levelValue = 66;
  if (target >= 83) levelValue = 100;
  else if (target < 50) levelValue = 33;

  // setLevel принимает 33/66/100
  const setResult = setLevel(hall.factory, 'people', levelValue);
  if (setResult.error) {
    // Если не сработало — всё равно списываем деньги
    // (может быть та же ступень — просто обновляем)
  }

  // Очищаем
  p.hiring = null;

  return {
    ok: true,
    hired: result.peopleGain,
    spent: result.totalCost,
    factory: factorySnapshot(hall.factory, { forDirector: true })
  };
}

// ═══════════════════════════════════════════
// СОКРАЩЕНИЕ
// ═══════════════════════════════════════════
function fire(socketId, level) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const config = FIRE_LEVELS[level];
  if (!config) return { error: 'Неизвестный уровень' };

  const cost = FIRE_DECISION_COST[level];
  if (p.decisionsLeft < cost) return { error: 'Недостаточно решений' };

  const current = getRealPeople();
  const target = Math.max(0, current - config.peopleLoss);

  let levelValue = 66;
  if (target >= 83) levelValue = 100;
  else if (target < 50) levelValue = 33;

  setLevel(hall.factory, 'people', levelValue);

  // Деньги возвращаются в бюджет
  hall.factory.money += config.refund;
  hall.factory.budgetPercent = calcBudgetPercent(hall.factory.money);

  p.decisionsLeft -= cost;

  return {
    ok: true,
    refund: config.refund,
    peopleLoss: config.peopleLoss,
    factory: factorySnapshot(hall.factory, { forDirector: true }),
    decisionsLeft: p.decisionsLeft
  };
}

// ═══════════════════════════════════════════
// КУМОВСТВО
// ═══════════════════════════════════════════
function adoptRelative(socketId, kindKey, placeKey, positionKey) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const kind = RELATIVE_KIND[kindKey];
  const place = RELATIVE_PLACE[placeKey];
  const position = RELATIVE_POSITION[positionKey];

  if (!kind || !place || !position) return { error: 'Неизвестный выбор' };

  if (p.decisionsLeft < ADOPT_DECISION_COST) {
    return { error: 'Недостаточно решений' };
  }

  const cost = position.salary;
  if (hall.factory.money < cost) {
    return { error: 'В кассе недостаточно денег' };
  }

  hall.factory.money -= cost;
  hall.factory.budgetPercent = calcBudgetPercent(hall.factory.money);

  const direction = place.direction;
  const currentLevel = (hall.factory.directions && hall.factory.directions[direction]) || 0;
  const harmValue = Math.round((kind.weight + position.fundShare) * place.harm);
  hall.factory.directions[direction] = Math.max(0, currentLevel - harmValue);

  if (!p.family) p.family = [];
  p.family.push({
    kind: kindKey,
    place: placeKey,
    position: positionKey,
    salary: position.salary,
    fundShare: position.fundShare,
    shift: hall.shift
  });

  const fundIncome = Math.round(position.salary * position.fundShare);
  p.familyFund = (p.familyFund || 0) + fundIncome;

  p.decisionsLeft -= ADOPT_DECISION_COST;

  hall.theftsLog.push({ shift: hall.shift, amount: fundIncome, type: 'hr_family' });
  applyKickback(fundIncome);

  return {
    ok: true,
    income: fundIncome,
    familyFund: p.familyFund,
    familyCount: p.family.length,
    factory: factorySnapshot(hall.factory, { forDirector: true }),
    decisionsLeft: p.decisionsLeft
  };
}

function coverFamily(socketId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (!p.family || p.family.length === 0) {
    return { error: 'Некого прикрывать' };
  }

  if (p.decisionsLeft < COVER_DECISION_COST) {
    return { error: 'Недостаточно решений' };
  }

  const fund = p.familyFund || 0;
  if (fund <= 0) return { error: 'Фонд пуст' };

  const cost = Math.min(fund, 10);
  p.familyFund -= cost;

  if (!p.coverLog) p.coverLog = [];
  p.coverLog.push({ shift: hall.shift, amount: cost });

  p.decisionsLeft -= COVER_DECISION_COST;

  return {
    ok: true,
    spent: cost,
    familyFund: p.familyFund,
    decisionsLeft: p.decisionsLeft
  };
}

function fireRelative(socketId, index) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (!p.family || p.family.length === 0) {
    return { error: 'Нет родни в штате' };
  }

  if (typeof index !== 'number' || index < 0 || index >= p.family.length) {
    return { error: 'Не выбран родственник' };
  }

  if (p.decisionsLeft < FIRE_RELATIVE_DECISION_COST) {
    return { error: 'Недостаточно решений' };
  }

  const removed = p.family.splice(index, 1)[0];
  const refund = Math.round(removed.salary * 0.5);

  hall.factory.money += refund;
  hall.factory.budgetPercent = calcBudgetPercent(hall.factory.money);

  p.decisionsLeft -= FIRE_RELATIVE_DECISION_COST;

  return {
    ok: true,
    fired: removed,
    refund,
    familyCount: p.family.length,
    factory: factorySnapshot(hall.factory, { forDirector: true }),
    decisionsLeft: p.decisionsLeft
  };
}

// ═══════════════════════════════════════════
// ОТЧЁТ В КОНЦЕ СМЕНЫ
// ═══════════════════════════════════════════
function submitReport(socketId, whatToShow, howToExplain) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'hr') return { error: 'Только HR' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };

  if (!REPORT_SHOW[whatToShow]) return { error: 'Неизвестный выбор' };
  if (!REPORT_EXPLAIN[howToExplain]) return { error: 'Неизвестный выбор' };

  const real = getRealPeople();
  const effective = getEffectivePeople(p);

  let shown;
  if (whatToShow === 'real')      shown = effective;
  else if (whatToShow === 'all')  shown = real;
  else                            shown = Math.min(100, real + 15);

  // Состояние — словами
  let shownWord;
  if (shown < 50)      shownWord = 'мало';
  else if (shown < 83) shownWord = 'средне';
  else                 shownWord = 'много';

  p.report = {
    shift: hall.shift,
    role: 'hr',
    whatToShow,
    howToExplain,
    shown,
    shownWord,
    real,
    effective,
    familyCount: getFamilyCount(p),
    nepotism: getNepotismLevel(p),
    isLie: (whatToShow !== 'all') || (howToExplain === 'perfect' && effective < real)
  };

  if (!hall.reports) hall.reports = [];
  hall.reports.push({
    playerId: p.id,
    role: 'hr',
    name: p.name,
    shift: hall.shift,
    shown,
    shownWord,
    howToExplain,
    whatToShow
  });

  return {
    ok: true,
    report: p.report
  };
}

// ─── Сговор ───
function applyKickback(amount) {
  if (!hall.deal.active) return;
  const sec = hall.players.find(x => x.role === 'security');
  if (!sec) return;
  const share = Math.floor(amount * 0.3);
  sec.kickbacks += share;
}

// ═══════════════════════════════════════════
// СНИМОК HR
// ═══════════════════════════════════════════
function hrSnapshot(p) {
  if (!p || p.role !== 'hr') return null;

  const f = hall.factory || {};
  const peopleLevel = (f.directions && f.directions.people) || 0;

  return {
    decisionsLeft: p.decisionsLeft,
    pocket: p.familyFund || 0,
    people: peopleLevel,
    effectivePeople: getEffectivePeople(p),
    nepotism: getNepotismLevel(p),
    familyCount: getFamilyCount(p),
    family: p.family || [],
    money: f.money || 0,
    budgetPercent: f.budgetPercent || 0,
    hiring: p.hiring || null,
    report: p.report || null
  };
}

module.exports = {
  hireStart,
  hireStep,
  hireFinish,
  fire,
  adoptRelative,
  coverFamily,
  fireRelative,
  submitReport,
  hrSnapshot,
  ROLE_TITLES,
  LEVEL_LABELS,
  HIRE_PATHS,
  HIRE_OPTIONS,
  FIRE_LEVELS,
  RELATIVE_KIND,
  RELATIVE_PLACE,
  RELATIVE_POSITION,
  REPORT_SHOW,
  REPORT_EXPLAIN
};