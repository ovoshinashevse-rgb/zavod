// ═══════════════════════════════════════════
// КАБИНЕТ ДИРЕКТОРА — действия в смену
// ═══════════════════════════════════════════

const { hall, getPlayer } = require('../hall');
const {
  createFactory,
  setLevel,
  takeFromBudget,
  takeFromDirection,
  factorySnapshot
} = require('../factory');

// Создать завод по выбору Директора
function chooseFactory(socketId, type) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор выбирает завод' };
  if (hall.phase !== 'roles') return { error: 'Сейчас не время выбирать завод' };
  if (type !== 'good' && type !== 'bad') return { error: 'Неизвестный тип завода' };

  hall.factory = createFactory(type);
  hall.phase = 'game';

  return {
    ok: true,
    type: type,
    factory: factorySnapshot(hall.factory, true)   // Директору — с карманом
  };
}

// Установить уровень отдела
function setDirectionLevel(socketId, direction, level) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };

  const result = setLevel(hall.factory, direction, level);
  if (result.error) return result;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, true),
    bankrupt: result.factory.bankrupt
  };
}

// Забрать себе из бюджета
function takeFromBudgetAction(socketId, level) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };

  const result = takeFromBudget(hall.factory, level);
  if (result.error) return result;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, true),
    bankrupt: result.bankrupt || false
  };
}

// Забрать себе из инвестиций (опустить отдел)
function takeFromDirectionAction(socketId, direction, level) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'director') return { error: 'Только Директор' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };

  const result = takeFromDirection(hall.factory, direction, level);
  if (result.error) return result;

  return {
    ok: true,
    factory: factorySnapshot(hall.factory, true)
  };
}

module.exports = {
  chooseFactory,
  setDirectionLevel,
  takeFromBudgetAction,
  takeFromDirectionAction
};