// ═══════════════════════════════════════════
// ИНЖЕНЕР — ЗАПОЙ
// Данные и формула: место × компания × напиток × количество
// ═══════════════════════════════════════════

// ─── МЕСТА ───
// Базовые модификаторы: риск (увидят), деньги, качество
const PLACES = {
  home: {
    title: 'Дома',
    risk: 1.0,
    money: 1.0,
    quality: 1.0
  },
  work: {
    title: 'На работе',
    risk: 1.3,
    money: 1.2,
    quality: 1.3
  },
  nature: {
    title: 'На природе',
    risk: 0.7,
    money: 0.9,
    quality: 0.8
  }
};

// ─── КОМПАНИИ ───
// Для каждого места — три варианта
// risk — множитель риска, money — множитель денег, quality — множитель урона
const COMPANIES = {
  // Дома
  home_alone: {
    place: 'home',
    title: 'Один',
    desc: 'Никто не видит, никто не знает',
    risk: 0.8,
    money: 1.0,
    quality: 1.0
  },
  home_neighbors: {
    place: 'home',
    title: 'С соседями',
    desc: 'Тихо, по-соседски',
    risk: 1.0,
    money: 1.1,
    quality: 1.1
  },
  home_family: {
    place: 'home',
    title: 'С женой (мужем)',
    desc: 'Семейный вечер. Или скандал',
    risk: 1.4,
    money: 0.9,
    quality: 1.2
  },

  // На работе
  work_workers: {
    place: 'work',
    title: 'В цеху с мужиками',
    desc: 'Свои. Все пьют — и ты пей',
    risk: 1.2,
    money: 1.3,
    quality: 1.2
  },
  work_corporate: {
    place: 'work',
    title: 'На корпорате',
    desc: 'Все видят. И Директор тоже',
    risk: 1.6,
    money: 1.1,
    quality: 1.3
  },
  work_boss: {
    place: 'work',
    title: 'В кабинете с начальством',
    desc: 'Опасно. Но может повезти',
    risk: 1.8,
    money: 0.9,
    quality: 1.0
  },

  // На природе
  nature_fishing: {
    place: 'nature',
    title: 'На рыбалке',
    desc: 'Тишина, удочка, бутылка',
    risk: 0.5,
    money: 0.9,
    quality: 0.7
  },
  nature_garage: {
    place: 'nature',
    title: 'В гараже с братом',
    desc: 'Свои. Не выдадут',
    risk: 0.6,
    money: 1.0,
    quality: 0.8
  },
  nature_dacha: {
    place: 'nature',
    title: 'На даче',
    desc: 'Далеко. Долго. Спокойно',
    risk: 0.4,
    money: 0.7,
    quality: 0.6
  }
};

// ─── НАПИТКИ ───
// power — множитель опьянения
// moneyMult — множитель денег в карман
// qualityMult — множитель урона качеству
// cost — сколько платишь из своего кармана
// risk — шанс отравления / события
const DRINKS = {
  beer: {
    title: 'Пиво',
    desc: 'Легко. Медленно. Безопасно',
    power: 1,
    moneyMult: 1.0,
    qualityMult: 1.0,
    cost: 0,
    risk: 0
  },
  vodka: {
    title: 'Водка',
    desc: 'Классика. Средне. С риском',
    power: 2,
    moneyMult: 1.5,
    qualityMult: 1.5,
    cost: 0,
    risk: 0.3
  },
  cognac: {
    title: 'Коньяк',
    desc: 'Дорого. Быстро напиваешься. Качество держится',
    power: 3,
    moneyMult: 0,
    qualityMult: 0.5,
    cost: 30,
    risk: 0
  }
};

// ─── КОЛИЧЕСТВО ───
const AMOUNTS = {
  light: {
    title: 'Немного',
    mult: 1,
    moneyBase: 5,
    qualityBase: 1
  },
  mid: {
    title: 'Как следует',
    mult: 2,
    moneyBase: 10,
    qualityBase: 2
  },
  heavy: {
    title: 'До беспамятства',
    mult: 3,
    moneyBase: 20,
    qualityBase: 3
  }
};

// ═══════════════════════════════════════════
// ФОРМУЛА — собрать эффект из выбора
// ═══════════════════════════════════════════
function calcDrinkEffect(placeKey, companyKey, drinkKey, amountKey) {
  const place   = PLACES[placeKey];
  const company = COMPANIES[companyKey];
  const drink   = DRINKS[drinkKey];
  const amount  = AMOUNTS[amountKey];

  if (!place || !company || !drink || !amount) return null;

  // Опьянение
  const intoxication = drink.power * amount.mult;

  // Деньги в карман
  const money = Math.round(
    amount.moneyBase *
    drink.moneyMult *
    place.money *
    company.money
  ) - drink.cost;

  // Урон качеству (положительное число — сколько минус)
  const qualityLoss = Math.round(
    amount.qualityBase *
    drink.qualityMult *
    place.quality *
    company.quality
  );

  // Риск события (0..1)
  const risk = drink.risk * place.risk * company.risk;

  return {
    intoxication,
    money,
    qualityLoss,
    risk
  };
}

// ═══════════════════════════════════════════
// СОБЫТИЯ — что может случиться в застое
// ═══════════════════════════════════════════
const EVENTS = [
  {
    key: 'brak',
    title: 'Брак в цеху',
    desc: 'Партия испорчена. Репутация — минус',
    qualityLoss: 2,
    reputationLoss: 2
  },
  {
    key: 'progul',
    title: 'Прогул',
    desc: 'Не пришёл на смену. Качество упало',
    qualityLoss: 3
  },
  {
    key: 'drake',
    title: 'Драка в цеху',
    desc: 'HR нанимает замену. Деньги — минус',
    moneyLoss: 10
  },
  {
    key: 'bezopasnik',
    title: 'Пришёл Безопасник',
    desc: 'Теперь у него есть досье на тебя',
    dossier: true
  },
  {
    key: 'otravlenie',
    title: 'Отравление',
    desc: 'Палёная попалась. Обморок на 2 смены',
    blackout: 2,
    qualityLoss: 5
  }
];

// ─── Что может случиться при данном риске ───
function rollEvents(risk) {
  const events = [];
  // Каждое событие с шансом = risk × 0.5
  // Может выпасть 0, 1 или 2 события
  if (Math.random() < risk * 0.5) {
    events.push(pickRandomEvent('brak'));
  }
  if (Math.random() < risk * 0.4) {
    events.push(pickRandomEvent('progul'));
  }
  if (Math.random() < risk * 0.3) {
    events.push(pickRandomEvent('drake'));
  }
  if (Math.random() < risk * 0.5) {
    events.push(pickRandomEvent('bezopasnik'));
  }
  // Отравление — только от водки
  // (проверяется отдельно в server.js)
  return events;
}

function pickRandomEvent(key) {
  return EVENTS.find(e => e.key === key);
}

// ─── Экспорт ───
module.exports = {
  PLACES,
  COMPANIES,
  DRINKS,
  AMOUNTS,
  EVENTS,
  calcDrinkEffect,
  rollEvents
};