// ═══════════════════════════════════════════
// МАГАЗИН ОБНАЛА — каталог товаров
// Директор покупает, чтобы жить красиво
// ═══════════════════════════════════════════

// ─── Категории ───
const CATEGORIES = {
  cars:     { title: 'Машины',     icon: 'car' },
  homes:    { title: 'Жильё',      icon: 'home' },
  vacation: { title: 'Отдых',      icon: 'plane' },
  watches:  { title: 'Аксессуары', icon: 'watch' },
  luxury:   { title: 'Роскошь',    icon: 'yacht' }
};

// ─── Товары ───
// level: 0 — стартовый (есть сразу)
// delivery: сколько смен ждать
// price: цена
// desc: живое описание в стиле маркетплейса
// svg: ключ для SVG-иконки

const ITEMS = {
  // ─── Машины ───
  cars_old: {
    key: 'cars_old',
    category: 'cars',
    level: 0,
    title: 'Развалюха',
    desc: 'Старая, скрипит. Но ездит. Пока что.',
    price: 0,
    delivery: 0,
    svg: 'car_old'
  },
  cars_used: {
    key: 'cars_used',
    category: 'cars',
    level: 1,
    title: 'Подержанная',
    desc: 'Пятнадцать лет, но ещё бегает. Не стыдно.',
    price: 10,
    delivery: 1,
    svg: 'car_used'
  },
  cars_normal: {
    key: 'cars_normal',
    category: 'cars',
    level: 2,
    title: 'Нормальная машина',
    desc: 'Не новая, но надёжная. Не стыдно выехать.',
    price: 40,
    delivery: 1,
    svg: 'car_normal'
  },
  cars_good: {
    key: 'cars_good',
    category: 'cars',
    level: 3,
    title: 'Хорошая машина',
    desc: 'Чистая, свежая. Соседи замечают.',
    price: 90,
    delivery: 2,
    svg: 'car_good'
  },
  cars_premium: {
    key: 'cars_premium',
    category: 'cars',
    level: 4,
    title: 'Премиум',
    desc: 'Дорогая. Блестит. Все оборачиваются.',
    price: 180,
    delivery: 2,
    svg: 'car_premium'
  },
  cars_luxury: {
    key: 'cars_luxury',
    category: 'cars',
    level: 5,
    title: 'Роскошная',
    desc: 'Такая, что стыдно парковать у завода.',
    price: 350,
    delivery: 3,
    svg: 'car_luxury'
  },

  // ─── Жильё ───
  homes_rent: {
    key: 'homes_rent',
    category: 'homes',
    level: 0,
    title: 'Съёмная квартира',
    desc: 'Чужая. Но своя. Пока что.',
    price: 0,
    delivery: 0,
    svg: 'home_rent'
  },
  homes_room: {
    key: 'homes_room',
    category: 'homes',
    level: 1,
    title: 'Своя комната',
    desc: 'Маленькая, но своя. Уже не съём.',
    price: 15,
    delivery: 1,
    svg: 'home_room'
  },
  homes_own: {
    key: 'homes_own',
    category: 'homes',
    level: 2,
    title: 'Своя квартира',
    desc: 'Первое настоящее жильё. Двушка.',
    price: 80,
    delivery: 1,
    svg: 'home_own'
  },
  homes_house: {
    key: 'homes_house',
    category: 'homes',
    level: 3,
    title: 'Дом',
    desc: 'Свой двор. Можно собаку.',
    price: 170,
    delivery: 2,
    svg: 'home_house'
  },
  homes_mansion: {
    key: 'homes_mansion',
    category: 'homes',
    level: 4,
    title: 'Особняк',
    desc: 'Три этажа, сад, ворота. Район — элитный.',
    price: 300,
    delivery: 3,
    svg: 'home_mansion'
  },
  homes_estate: {
    key: 'homes_estate',
    category: 'homes',
    level: 5,
    title: 'Усадьба',
    desc: 'Собственная земля. Лес, озеро, тишина.',
    price: 500,
    delivery: 3,
    svg: 'home_estate'
  },

  // ─── Отдых ───
  vacation_none: {
    key: 'vacation_none',
    category: 'vacation',
    level: 0,
    title: 'Никуда',
    desc: 'Отпуск? Не в этом году.',
    price: 0,
    delivery: 0,
    svg: 'vac_none'
  },
  vacation_kebab: {
    key: 'vacation_kebab',
    category: 'vacation',
    level: 1,
    title: 'Шашлыки',
    desc: 'Выходные на природе. Мясо, дым, хорошо.',
    price: 10,
    delivery: 1,
    svg: 'vac_kebab'
  },
  vacation_local: {
    key: 'vacation_local',
    category: 'vacation',
    level: 2,
    title: 'Отпуск',
    desc: 'Две недели. Море, солнце, ничего не делать.',
    price: 25,
    delivery: 1,
    svg: 'vac_local'
  },
  vacation_abroad: {
    key: 'vacation_abroad',
    category: 'vacation',
    level: 3,
    title: 'Заграница',
    desc: 'Паспорт, виза, другая жизнь.',
    price: 70,
    delivery: 2,
    svg: 'vac_abroad'
  },
  vacation_luxury: {
    key: 'vacation_luxury',
    category: 'vacation',
    level: 4,
    title: 'Элитный курорт',
    desc: 'Пять звёзд. Официанты помнят имя.',
    price: 150,
    delivery: 2,
    svg: 'vac_luxury'
  },
  vacation_island: {
    key: 'vacation_island',
    category: 'vacation',
    level: 5,
    title: 'Свой остров',
    desc: 'Совсем свой. Никого, кроме тебя.',
    price: 400,
    delivery: 3,
    svg: 'vac_island'
  },

  // ─── Аксессуары ───
  watches_none: {
    key: 'watches_none',
    category: 'watches',
    level: 0,
    title: 'Без часов',
    desc: 'Время и так знаешь.',
    price: 0,
    delivery: 0,
    svg: 'watch_none'
  },
  watches_simple: {
    key: 'watches_simple',
    category: 'watches',
    level: 1,
    title: 'Часы',
    desc: 'Обычные. Тикают.',
    price: 10,
    delivery: 1,
    svg: 'watch_simple'
  },
  watches_good: {
    key: 'watches_good',
    category: 'watches',
    level: 2,
    title: 'Дорогие часы',
    desc: 'Механика. Видно, что не дешёвка.',
    price: 50,
    delivery: 1,
    svg: 'watch_good'
  },
  watches_premium: {
    key: 'watches_premium',
    category: 'watches',
    level: 3,
    title: 'Премиум-часы',
    desc: 'Такие узнают только те, кто понимает.',
    price: 120,
    delivery: 2,
    svg: 'watch_premium'
  },

  // ─── Роскошь ───
  luxury_yacht: {
    key: 'luxury_yacht',
    category: 'luxury',
    level: 3,
    title: 'Яхта',
    desc: 'Своя. Можно выйти в море в любой день.',
    price: 350,
    delivery: 2,
    svg: 'luxury_yacht'
  },
  luxury_jet: {
    key: 'luxury_jet',
    category: 'luxury',
    level: 4,
    title: 'Самолёт',
    desc: 'Личный. Куда хочешь, когда хочешь.',
    price: 750,
    delivery: 3,
    svg: 'luxury_jet'
  }
};

// ═══════════════════════════════════════════
// СТАРТОВЫЙ СТАТУС ДИРЕКТОРА
// ═══════════════════════════════════════════
function createInitialStatus() {
  return {
    cars:     'cars_old',
    homes:    'homes_rent',
    vacation: 'vacation_none',
    watches:  'watches_none',
    luxury:   null
  };
}

// ═══════════════════════════════════════════
// ПОМОЩНИКИ
// ═══════════════════════════════════════════

function getItemsByCategory(category) {
  return Object.values(ITEMS)
    .filter(item => item.category === category)
    .sort((a, b) => a.level - b.level);
}

function getItem(itemKey) {
  return ITEMS[itemKey] || null;
}

function getCurrentLevel(status, category) {
  const currentKey = status[category];
  if (!currentKey) return -1;
  const item = ITEMS[currentKey];
  return item ? item.level : -1;
}

function canBuy(status, itemKey) {
  const item = ITEMS[itemKey];
  if (!item) return { error: 'Товар не найден' };

  const category = item.category;
  const currentLevel = getCurrentLevel(status, category);

  if (item.level <= currentLevel) {
    return { error: 'Уже есть' };
  }

  return { ok: true, item };
}

function getNextItem(status, category) {
  const currentLevel = getCurrentLevel(status, category);
  const items = getItemsByCategory(category);
  return items.find(item => item.level > currentLevel) || null;
}

function getItemPrice(itemKey) {
  const item = ITEMS[itemKey];
  return item ? item.price : 0;
}

module.exports = {
  CATEGORIES,
  ITEMS,
  createInitialStatus,
  getItemsByCategory,
  getItem,
  getCurrentLevel,
  canBuy,
  getNextItem,
  getItemPrice
};