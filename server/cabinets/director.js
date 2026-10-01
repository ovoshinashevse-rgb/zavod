// ═══════════════════════════════════════════
// КАБИНЕТ ДИРЕКТОРА — действия в смену
// ═══════════════════════════════════════════

const { hall, getPlayer, allFinishedShift, resetFinished } = require('../hall');
const {
  createFactory,
  setLevel,
  takeFromBudget,
  takeFromDirection,
  factorySnapshot
} = require('../factory');

// Проверить: может ли Директор делать действие
function canAct(p) {
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };
  if (p.finished) return { error: 'Вы уже завершили смену' };
  if (p.decisionsLeft <= 0) return { error: 'Решения на смену закончились' };
  return { ok: true };
}

// Создать завод по выбору Директора
function chooseFactory(socketId, type) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор выбирает завод' };
  if (hall.phase !== 'roles') return { error: 'Сейчас не время выбирать завод' };
  if (type !== 'good' && type !== 'bad') return { error: 'Неизвестный тип завода' };

  hall.factory = createFactory(type);
  hall.phase = 'game';
  hall.shift = 1;
  hall.players.forEach(x => {
    x.finished = false;
    x.decisionsLeft = (x.role === 'director') ? 3 : (x.role === 'security' ? 2 : 0);
  });

  return {
    ok: true,
    type: type,
    factory: factorySnapshot(hall.factory, true)
  };
}

// Установить уровень отдела
function setDirectionLevel(socketId, direction, level) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const result = setLevel(hall.factory, direction, level);
  if (result.error) return result;

  p.decisionsLeft -= 1;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, true),
    bankrupt: result.factory.bankrupt,
    decisionsLeft: p.decisionsLeft
  };
}

// Забрать себе из бюджета
function takeFromBudgetAction(socketId, level) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const result = takeFromBudget(hall.factory, level);
  if (result.error) return result;

  p.decisionsLeft -= 1;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, true),
    bankrupt: result.bankrupt || false,
    decisionsLeft: p.decisionsLeft
  };
}

// Забрать себе из инвестиций
function takeFromDirectionAction(socketId, direction, level) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const result = takeFromDirection(hall.factory, direction, level);
  if (result.error) return result;

  p.decisionsLeft -= 1;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, true),
    decisionsLeft: p.decisionsLeft
  };
}

// Завершить смену
function finishShift(socketId) {
  const p = getPlayer(socketId);
  if (!p) return { error: 'Игрок не найден' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (p.finished) return { error: 'Вы уже завершили смену' };

  p.finished = true;

  if (allFinishedShift()) {
    resetFinished();
    return { ok: true, newShift: true, shift: hall.shift };
  }

  return { ok: true, newShift: false };
}

module.exports = {
  chooseFactory,
  setDirectionLevel,
  takeFromBudgetAction,
  takeFromDirectionAction,
  finishShift
};