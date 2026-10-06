// ═══════════════════════════════════════════
// КАБИНЕТ HR — люди, найм, отчёт
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

// ─── Уровни ───
// 33 / 66 / 100 — как везде в игре
const LEVELS = [33, 66, 100];
const LEVEL_LABELS = { 33: 'Низкий', 66: 'Средний', 100: 'Высокий' };

// ─── Стоимость действий ───
// Нанять = поднять people на уровень. Цена — как у Директора.
const HIRE_COST = { 33: 10, 66: 25, 100: 50 };

// Уволить = опустить people. Возвращает деньги в бюджет.
const FIRE_REFUND = { 33: 10, 66: 25, 100: 50 };

// Обучить = поднять people дешевле (HR умеет работать с людьми).
const TRAIN_COST = { 33: 5, 66: 15, 100: 30 };

// Стоимость решений для каждого действия
const DECISION_COST = { 33: 1, 66: 2, 100: 3 };

// Стоимость подделки штата (решения)
const FAKE_DECISION_COST = 2;

// Стоимость отчёта Директору (решения)
const REPORT_DECISION_COST = 1;

// Сколько денег HR получает в карман за каждую "мёртвую душу"
// (разница между реальным и поддельным уровнем people)
const FAKE_INCOME = {
  33: 5,   // подделал на низком уровне
  66: 15,  // подделал на среднем
  100: 30  // подделал на высоком
};

// ─── Проверка: может ли HR действовать ───
function canAct(p) {
  if (!p || p.role !== 'hr') return { error: 'Только HR' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };
  if (p.finished) return { error: 'Вы уже завершили смену' };
  if (p.decisionsLeft <= 0) return { error: 'Решения на смену закончились' };
  return { ok: true };
}

// ─── Помощник: текущий уровень people ───
function getPeopleLevel() {
  return (hall.factory.directions && hall.factory.directions.people) || 0;
}

// ─── Помощник: определить уровень (33/66/100) по значению ───
function levelFromValue(value) {
  if (value >= 83) return 100;
  if (value >= 50) return 66;
  return 33;
}

// ─── Помощник: следующий уровень выше ───
function nextLevel(current) {
  if (current < 66) return 66;
  if (current < 100) return 100;
  return null;
}

// ─── Помощник: следующий уровень ниже ───
function prevLevel(current) {
  if (current > 66) return 66;
  if (current > 33) return 33;
  return null;
}

// ═══════════════════════════════════════════
// ДЕЙСТВИЕ: НАНЯТЬ
// ═══════════════════════════════════════════
function hireAction(socketId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const current = getPeopleLevel();
  const target = nextLevel(current);
  if (!target) return { error: 'Людей уже максимум' };

  const cost = HIRE_COST[target];
  if (hall.factory.money < cost) return { error: 'В кассе недостаточно денег' };

  const costDecisions = DECISION_COST[target];
  if (p.decisionsLeft < costDecisions) {
    return { error: 'Недостаточно решений для найма' };
  }

  // Тратим деньги, поднимаем people
  hall.factory.money -= cost;
  hall.factory.budgetPercent = calcBudgetPercent(hall.factory.money);

  const result = setLevel(hall.factory, 'people', target);
  if (result.error) return result;

  p.decisionsLeft -= costDecisions;

  return {
    ok: true,
    hired: target,
    label: LEVEL_LABELS[target],
    factory: factorySnapshot(hall.factory, { forDirector: true }),
    decisionsLeft: p.decisionsLeft
  };
}

// ═══════════════════════════════════════════
// ДЕЙСТВИЕ: УВОЛИТЬ
// ═══════════════════════════════════════════
function fireAction(socketId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const current = getPeopleLevel();
  const target = prevLevel(current);
  if (!target) return { error: 'Людей уже минимум' };

  const refund = FIRE_REFUND[current];
  const costDecisions = DECISION_COST[current];
  if (p.decisionsLeft < costDecisions) {
    return { error: 'Недостаточно решений для увольнения' };
  }

  const result = setLevel(hall.factory, 'people', target);
  if (result.error) return result;

  // Возвращаем деньги в бюджет
  hall.factory.money += refund;
  hall.factory.budgetPercent = calcBudgetPercent(hall.factory.money);

  p.decisionsLeft -= costDecisions;

  return {
    ok: true,
    fired: target,
    label: LEVEL_LABELS[target],
    factory: factorySnapshot(hall.factory, { forDirector: true }),
    decisionsLeft: p.decisionsLeft
  };
}

// ═══════════════════════════════════════════
// ДЕЙСТВИЕ: ОБУЧИТЬ
// ═══════════════════════════════════════════
function trainAction(socketId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const current = getPeopleLevel();
  const target = nextLevel(current);
  if (!target) return { error: 'Людей уже максимум' };

  const cost = TRAIN_COST[target];
  if (hall.factory.money < cost) return { error: 'В кассе недостаточно денег' };

  const costDecisions = DECISION_COST[target];
  if (p.decisionsLeft < costDecisions) {
    return { error: 'Недостаточно решений для обучения' };
  }

  hall.factory.money -= cost;
  hall.factory.budgetPercent = calcBudgetPercent(hall.factory.money);

  const result = setLevel(hall.factory, 'people', target);
  if (result.error) return result;

  p.decisionsLeft -= costDecisions;

  return {
    ok: true,
    trained: target,
    label: LEVEL_LABELS[target],
    factory: factorySnapshot(hall.factory, { forDirector: true }),
    decisionsLeft: p.decisionsLeft
  };
}

// ═══════════════════════════════════════════
// ДЕЙСТВИЕ: ПОДДЕЛАТЬ ШТАТ
// ═══════════════════════════════════════════
// HR записывает в отчёт более высокий уровень людей,
// чем есть на самом деле. Разница идёт в карман.
function fakeStaffAction(socketId) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (p.decisionsLeft < FAKE_DECISION_COST) {
    return { error: 'Недостаточно решений для подделки' };
  }

  const current = getPeopleLevel();
  const target = nextLevel(current);
  if (!target) return { error: 'Людей уже максимум — подделывать нечего' };

  // Карман: разница между текущим и целевым уровнем
  const income = FAKE_INCOME[target] || 10;
  p.pocket = (p.pocket || 0) + income;

  p.decisionsLeft -= FAKE_DECISION_COST;

  // Записываем факт подделки — понадобится для проверки Безопасником
  p.hrReport = {
    shift: hall.shift,
    actual: current,
    reported: target,
    isFake: true
  };

  // В журнал краж — для биографии и сговоров
  hall.theftsLog.push({ shift: hall.shift, amount: income, type: 'hr_fake' });
  applyKickback(income);

  return {
    ok: true,
    income: income,
    pocket: p.pocket,
    decisionsLeft: p.decisionsLeft
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

// ═══════════════════════════════════════════
// ДЕЙСТВИЕ: ОТЧЁТ ДИРЕКТОРУ
// ═══════════════════════════════════════════
// HR сдаёт отчёт о состоянии people — честно или поддельно.
function submitHrReport(socketId, isReal) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'hr') return { error: 'Только HR' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };

  if (p.decisionsLeft < REPORT_DECISION_COST) {
    return { error: 'Недостаточно решений для отчёта' };
  }

  const actual = getPeopleLevel();
  const reported = isReal ? actual : (nextLevel(actual) || actual);

  p.hrReport = {
    shift: hall.shift,
    actual: actual,
    reported: reported,
    isFake: !isReal
  };

  p.decisionsLeft -= REPORT_DECISION_COST;

  return {
    ok: true,
    report: {
      shift: hall.shift,
      reported: reported
    },
    decisionsLeft: p.decisionsLeft
  };
}

// ═══════════════════════════════════════════
// СНИМОК HR — для клиента
// ═══════════════════════════════════════════
function hrSnapshot(p) {
  if (!p || p.role !== 'hr') return null;

  const f = hall.factory || {};
  const peopleLevel = (f.directions && f.directions.people) || 0;

  return {
    decisionsLeft: p.decisionsLeft,
    pocket: p.pocket || 0,
    people: peopleLevel,
    money: f.money || 0,
    budgetPercent: f.budgetPercent || 0,
    report: p.hrReport || null
  };
}

// ─── Экспорт ───
module.exports = {
  hireAction,
  fireAction,
  trainAction,
  fakeStaffAction,
  submitHrReport,
  hrSnapshot,
  ROLE_TITLES,
  LEVEL_LABELS
};