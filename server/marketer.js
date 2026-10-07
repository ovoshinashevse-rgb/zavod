// ═══════════════════════════════════════════
// КАБИНЕТ МАРКЕТОЛОГА — позиционирование, реклама, блог, отчёт
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
const POSITION_DECISION_COST = 1;
const AD_DECISION_COST = 1;
const BLOG_DECISION_COST = 1;

// ═══════════════════════════════════════════
// РЫНКИ (7)
// ═══════════════════════════════════════════
const MARKETS = {
  mass:    { title: 'Массовый' },
  middle:  { title: 'Средний' },
  premium: { title: 'Премиум' },
  b2b:     { title: 'B2B' },
  gov:     { title: 'Госзаказ' },
  export:  { title: 'Экспорт' },
  local:   { title: 'Местный' }
};

// ═══════════════════════════════════════════
// ЦЕЛЕВЫЕ АУДИТОРИИ (10)
// ═══════════════════════════════════════════
const AUDIENCES = {
  econom:      { title: 'Экономный',       desc: 'Берёт дёшево, качество не важно' },
  thrifty:     { title: 'Бережливый',      desc: 'Ищет скидки, но качество важно' },
  family:      { title: 'Семейный',        desc: 'Для семьи, стабильность' },
  young:       { title: 'Молодой',         desc: 'Пробует новое, лёгкий на подъём' },
  experienced: { title: 'Опытный',         desc: 'Знает, что надо, рекламе не верит' },
  business:    { title: 'Деловой',         desc: 'Для работы, скорость и надёжность' },
  status:      { title: 'Статусный',       desc: 'Важен престиж и бренд' },
  govclient:   { title: 'Госзаказчик',     desc: 'Покупает по бумагам, тендеры' },
  wholesale:   { title: 'Оптовик',         desc: 'Берёт много, важен объём' },
  foreign:     { title: 'Иностранный',     desc: 'Из-за рубежа, другой стандарт' }
};

// ═══════════════════════════════════════════
// ПРОДУКТ → ПОДХОДЯЩИЕ РЫНКИ И ЦА
// ═══════════════════════════════════════════
const PRODUCT_MATCH = {
  bread: {
    markets:    ['mass', 'local', 'middle'],
    audiences:  ['econom', 'thrifty', 'family', 'experienced']
  },
  furniture: {
    markets:    ['middle', 'b2b', 'premium'],
    audiences:  ['family', 'experienced', 'business', 'young']
  },
  electronics: {
    markets:    ['premium', 'b2b', 'export'],
    audiences:  ['young', 'business', 'status', 'foreign']
  }
};

// ═══════════════════════════════════════════
// ПОМЕЩЕНИЕ → БОНУСЫ/ШТРАФЫ
// ═══════════════════════════════════════════
const BUILDING_MODS = {
  old_hangar: {
    plus:  ['mass', 'local'],
    minus: ['premium', 'export']
  },
  main_building: {
    plus:  [],
    minus: []
  },
  new_shop: {
    plus:  ['premium', 'export', 'b2b'],
    minus: ['mass', 'local']
  }
};

// ═══════════════════════════════════════════
// СОСТОЯНИЕ ЗАВОДА → БОНУСЫ/ШТРАФЫ
// ═══════════════════════════════════════════
const STATE_MODS = {
  rich: {
    plus:  ['premium', 'export'],
    minus: ['mass', 'local']
  },
  mid: {
    plus:  [],
    minus: []
  },
  poor: {
    plus:  ['mass', 'local'],
    minus: ['premium', 'export']
  }
};

// ═══════════════════════════════════════════
// РЕКЛАМА — каналы и бюджет
// ═══════════════════════════════════════════
const AD_CHANNELS = {
  tv:       { title: 'ТВ',          cost: 40, reach: 30, quality: 1.0 },
  internet: { title: 'Интернет',    cost: 20, reach: 25, quality: 1.2 },
  paper:    { title: 'Газета',      cost: 5,  reach: 10, quality: 0.7 },
  radio:    { title: 'Радио',       cost: 15, reach: 15, quality: 0.9 },
  outdoor:  { title: 'Наружка',     cost: 25, reach: 20, quality: 1.0 }
};

const AD_BUDGETS = {
  low:    { title: 'Низкий',   mult: 0.5, stealBase: 0 },
  mid:    { title: 'Средний',  mult: 1.0, stealBase: 0 },
  high:   { title: 'Высокий',  mult: 2.0, stealBase: 0 }
};

// ─── Сколько реально надо vs сколько потратил ───
// Разница — «экономия», уходит в карман Маркетолога
function calcAdSteal(channel, budget) {
  const ch = AD_CHANNELS[channel];
  const bud = AD_BUDGETS[budget];
  if (!ch || !bud) return 0;

  const declared = Math.round(ch.cost * bud.mult);       // сколько «по отчёту»
  const real = Math.round(declared * (0.6 + Math.random() * 0.2)); // сколько реально ушло
  return declared - real; // в карман
}

// ═══════════════════════════════════════════
// БЛОГ — темы и тон
// ═══════════════════════════════════════════
const BLOG_TOPICS = {
  factory: { title: 'О заводе' },
  self:    { title: 'О себе' },
  office:  { title: 'Про офис' },
  collegue:{ title: 'Про коллегу' }
};

const BLOG_TONES = {
  serious: { title: 'Серьёзно' },
  funny:   { title: 'С шутками' },
  scandal: { title: 'Скандально' }
};

// ═══════════════════════════════════════════
// ОТЧЁТ — что показать / как объяснить
// ═══════════════════════════════════════════
const REPORT_SHOW = {
  real:      { title: 'Реальные клиенты' },
  withBlog:  { title: 'С блогом' },
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
  if (!p || p.role !== 'marketer') return { error: 'Только Маркетолог' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };
  if (!hall.factory) return { error: 'Завод ещё не создан' };
  if (p.finished) return { error: 'Вы уже завершили смену' };
  if (p.decisionsLeft <= 0) return { error: 'Решения на смену закончились' };
  return { ok: true };
}

// ═══════════════════════════════════════════
// ПОЗИЦИОНИРОВАНИЕ
// ═══════════════════════════════════════════
function setPosition(socketId, market, audience) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (!MARKETS[market]) return { error: 'Неизвестный рынок' };
  if (!AUDIENCES[audience]) return { error: 'Неизвестная аудитория' };
  if (p.decisionsLeft < POSITION_DECISION_COST) {
    return { error: 'Недостаточно решений' };
  }

  p.position = { market, audience };
  p.decisionsLeft -= POSITION_DECISION_COST;

  // Оценка совпадения
  const score = scorePosition(p, market, audience);

  return {
    ok: true,
    position: p.position,
    score: score,
    decisionsLeft: p.decisionsLeft
  };
}

// Оценка правильности позиционирования
function scorePosition(p, market, audience) {
  const f = hall.factory;
  if (!f || !f.product) return 0;

  let score = 0;

  // Совпадение рынка с продуктом
  const productMarkets = PRODUCT_MATCH[f.product] ? PRODUCT_MATCH[f.product].markets : [];
  if (productMarkets.includes(market)) score += 2;

  // Совпадение ЦА с продуктом
  const productAudiences = PRODUCT_MATCH[f.product] ? PRODUCT_MATCH[f.product].audiences : [];
  if (productAudiences.includes(audience)) score += 2;

  // Помещение
  const buildingMods = BUILDING_MODS[f.building] || { plus: [], minus: [] };
  if (buildingMods.plus.includes(market)) score += 1;
  if (buildingMods.minus.includes(market)) score -= 1;

  // Состояние завода
  const stateMods = STATE_MODS[f.state] || { plus: [], minus: [] };
  if (stateMods.plus.includes(market)) score += 1;
  if (stateMods.minus.includes(market)) score -= 1;

  return score;
}

// ═══════════════════════════════════════════
// РЕКЛАМА
// ═══════════════════════════════════════════
function runAd(socketId, channel, budget) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  const ch = AD_CHANNELS[channel];
  const bud = AD_BUDGETS[budget];
  if (!ch || !bud) return { error: 'Неизвестный канал или бюджет' };

  if (p.decisionsLeft < AD_DECISION_COST) {
    return { error: 'Недостаточно решений' };
  }

  const declared = Math.round(ch.cost * bud.mult);
  if (hall.factory.money < declared) {
    return { error: 'В кассе недостаточно денег' };
  }

  // Списываем деньги
  hall.factory.money -= declared;
  hall.factory.budgetPercent = calcBudgetPercent(hall.factory.money);

  // Считаем, сколько реально украдено
  const realSpent = Math.round(declared * (0.65 + Math.random() * 0.25));
  const stolen = declared - realSpent;
  p.pocket = (p.pocket || 0) + stolen;
  hall.theftsLog.push({ shift: hall.shift, amount: stolen, type: 'marketer_ad' });
  applyKickback(stolen);

  // Считаем эффект: клиенты растут от реального охвата
  const effect = Math.round(ch.reach * bud.mult * ch.quality * 0.5);
  p.lastAdEffect = effect;

  p.decisionsLeft -= AD_DECISION_COST;

  return {
    ok: true,
    declared: declared,
    effect: effect,
    decisionsLeft: p.decisionsLeft
  };
}

// ═══════════════════════════════════════════
// БЛОГ
// ═══════════════════════════════════════════
function writeBlog(socketId, topic, tone, targetRole) {
  const p = getPlayer(socketId);
  const check = canAct(p);
  if (check.error) return check;

  if (!BLOG_TOPICS[topic]) return { error: 'Неизвестная тема' };
  if (!BLOG_TONES[tone]) return { error: 'Неизвестный тон' };
  if (p.decisionsLeft < BLOG_DECISION_COST) {
    return { error: 'Недостаточно решений' };
  }

  let fameGain = 0;
  let factoryBonus = 0;
  let factoryMalus = 0;
  let rumorAbout = null;

  // Про завод — клиенты растут
  if (topic === 'factory') {
    if (tone === 'serious') {
      factoryBonus = 3;
    } else if (tone === 'funny') {
      factoryBonus = 2;
      fameGain = 1;
    } else if (tone === 'scandal') {
      factoryBonus = 1;
      factoryMalus = 2;
      fameGain = 3;
    }
  }

  // Про себя — личная слава
  if (topic === 'self') {
    if (tone === 'serious') fameGain = 2;
    else if (tone === 'funny') fameGain = 3;
    else if (tone === 'scandal') { fameGain = 5; factoryMalus = 1; }
  }

  // Про офис — слава + случайное событие
  if (topic === 'office') {
    fameGain = 2;
    if (tone === 'scandal') factoryMalus = 1;
  }

  // Про коллегу — слух
  if (topic === 'collegue' && targetRole) {
    fameGain = tone === 'scandal' ? 4 : 2;
    rumorAbout = targetRole;
  }

  p.fame = (p.fame || 0) + fameGain;
  if (factoryBonus) {
    hall.factory.indicators.clients = Math.min(100, hall.factory.indicators.clients + factoryBonus);
  }
  if (factoryMalus) {
    hall.factory.indicators.reputation = Math.max(0, hall.factory.indicators.reputation - factoryMalus);
  }

  // Запись в лог слухов
  if (rumorAbout) {
    if (!hall.rumorsLog) hall.rumorsLog = [];
    hall.rumorsLog.push({
      shift: hall.shift,
      fromRole: 'marketer',
      targetRole: rumorAbout,
      topic: topic,
      tone: tone
    });
  }

  p.decisionsLeft -= BLOG_DECISION_COST;

  return {
    ok: true,
    fameGain: fameGain,
    fame: p.fame,
    rumorAbout: rumorAbout,
    decisionsLeft: p.decisionsLeft
  };
}

// ═══════════════════════════════════════════
// ОТЧЁТ
// ═══════════════════════════════════════════
function submitMarketerReport(socketId, whatToShow, howToExplain) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'marketer') return { error: 'Только Маркетолог' };
  if (hall.phase !== 'game') return { error: 'Сейчас не смена' };

  if (!REPORT_SHOW[whatToShow]) return { error: 'Неизвестный выбор' };
  if (!REPORT_EXPLAIN[howToExplain]) return { error: 'Неизвестный выбор' };

  const realClients = hall.factory.indicators.clients || 0;

  let shown;
  if (whatToShow === 'real')          shown = realClients;
  else if (whatToShow === 'withBlog') shown = Math.min(100, realClients + 10);
  else                                shown = Math.min(100, realClients + 20);

  let shownWord;
  if (shown < 30)      shownWord = 'мало';
  else if (shown < 60) shownWord = 'средне';
  else                 shownWord = 'много';

  p.report = {
    shift: hall.shift,
    role: 'marketer',
    whatToShow,
    howToExplain,
    shown,
    shownWord,
    realClients
  };

  if (!hall.reports) hall.reports = [];
  hall.reports.push({
    playerId: p.id,
    role: 'marketer',
    name: p.name,
    shift: hall.shift,
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
// СНИМОК
// ═══════════════════════════════════════════
function marketerSnapshot(p) {
  if (!p || p.role !== 'marketer') return null;

  const f = hall.factory || {};
  const adsLevel = (f.directions && f.directions.ads) || 0;
  const clients = (f.indicators && f.indicators.clients) || 0;

  return {
    decisionsLeft: p.decisionsLeft,
    pocket: p.pocket || 0,
    fame: p.fame || 0,
    ads: adsLevel,
    clients: clients,
    position: p.position || null,
    report: p.report || null
  };
}

module.exports = {
  setPosition,
  scorePosition,
  runAd,
  writeBlog,
  submitMarketerReport,
  marketerSnapshot,
  ROLE_TITLES,
  LEVEL_LABELS,
  MARKETS,
  AUDIENCES,
  AD_CHANNELS,
  AD_BUDGETS,
  BLOG_TOPICS,
  BLOG_TONES,
  REPORT_SHOW,
  REPORT_EXPLAIN
};