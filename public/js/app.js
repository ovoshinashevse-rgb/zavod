// ═══════════════════════════════════════════
// APP — общий каркас: socket, экраны, утилиты
// ═══════════════════════════════════════════

(function () {
  const socket = io();

  // ─── Состояние ───
  const state = {
    myName: '',
    myRole: null,
    myStatus: 'thinking',
    currentSmokeLevel: 0,
    currentShift: 0,
    players: [],
    factory: {
      directions: { equipment: 33, people: 33, ads: 33, security: 33, economy: 33 },
      invested: 165,
      investments: 33,
      budgetPercent: 66,
      reputation: 30,
      bankrupt: false
    }
  };

  // ─── Список экранов ───
  const screens = {
    'screen-enter':           'wrap-enter',
    'screen-smoking':         'wrap-smoking',
    'screen-role':            'screen-role',
    'screen-choose':          'wrap-choose',
    'screen-building':        'wrap-building',
    'screen-product':         'wrap-product',
    'screen-equipment':       'wrap-equipment',
    'screen-setup-wait':      'wrap-setup-wait',
    'screen-waiting':         'wrap-waiting',
    'screen-game-director':   'wrap-game-director',
    'screen-game-security':   'wrap-game-security',
    'screen-game-engineer':   'wrap-game-engineer',
    'screen-pause':           'wrap-pause',
    'screen-end':             'wrap-end'
  };

  // ─── Показать экран ───
  function show(id) {
    Object.values(screens).forEach(x => {
      const el = document.getElementById(x);
      if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(screens[id]);
    if (target) target.classList.remove('hidden');

    if (id === 'screen-smoking') {
      document.body.classList.add('in-smoking');
      if (typeof window.applyDensity === 'function') {
        window.applyDensity(state.currentSmokeLevel);
      }
    } else {
      document.body.classList.remove(
        'in-smoking',
        'density-off', 'density-light', 'density-medium', 'density-heavy'
      );
    }
  }

  // ─── Тема завода ───
  function applyTheme(theme) {
    document.body.classList.remove('rich', 'poor');
    document.body.classList.add(theme === 'poor' ? 'poor' : 'rich');
  }

  // ─── Фон помещения ───
  // key: 'old_hangar' | 'new_shop' | 'basement' | 'main_building'
  // Можно передавать как ключ, так и undefined / null — тогда фон скрыт.
  const BUILDING_CLASSES = ['building-hangar', 'building-shop', 'building-basement', 'building-main'];
  const BUILDING_MAP = {
    old_hangar:    'building-hangar',
    new_shop:      'building-shop',
    basement:      'building-basement',
    main_building: 'building-main'
  };

  function applyBuilding(key) {
    // Снимаем все возможные классы помещения
    document.body.classList.remove(...BUILDING_CLASSES);

    // Если ключ неизвестен — просто остаёмся без фона
    if (!key) return;

    const cls = BUILDING_MAP[key];
    if (!cls) return;

    document.body.classList.add(cls);
  }

  // ─── Состояние фона (rich / mid / poor) ───
  // Пока не привязано к экономике — по умолчанию mid.
  // Когда захотим — передадим 'rich' / 'poor' из реального состояния завода.
  const BG_STATE_CLASSES = ['bg-rich', 'bg-mid', 'bg-poor'];

  function applyFactoryState(level) {
    const bg = document.getElementById('bg-building');
    if (!bg) return;

    bg.classList.remove(...BG_STATE_CLASSES);

    if (level === 'rich')      bg.classList.add('bg-rich');
    else if (level === 'poor') bg.classList.add('bg-poor');
    else                       bg.classList.add('bg-mid');
  }

  // ─── Всплывашка ───
  let toastTimer = null;
  function toast(text) {
    const box = document.getElementById('toast');
    if (!box) return;
    box.textContent = text;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 2200);
  }

  // ─── Хранилище для списка игроков ───
  socket.on('smoking_update', ({ players }) => {
    state.players = players;
  });

  socket.on('players_roles', ({ players }) => {
    state.players = players;
  });

  // ─── Сохраняем роль ───
  socket.on('your_role', ({ role }) => {
    state.myRole = role;
  });

  // ─── Объект App ───
  window.App = {
    socket,
    state,
    show,
    toast,
    applyTheme,
    applyBuilding,
    applyFactoryState
  };

  // ═══════════════════════════════════════════
  // ВРЕМЯ СУТОК — привязано к решениям
  // ═══════════════════════════════════════════

  let maxDecisions = 3;
  let usedDecisions = 0;

  const TIMELINE = {
    sunX:  [15, 50, 85],
    sunY:  [20, 15, 30],
    sunH:  [340, 40, 25],
    sunA:  [0.35, 0.2, 0.4],
    skyH:  [280, 220, 20],
    skyL1: [10, 8, 6],
    skyL2: [14, 12, 8],
    skyL3: [18, 14, 10]
  };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function fromTimeline(arr, progress) {
    if (progress <= 0) return arr[0];
    if (progress >= 1) return arr[arr.length - 1];
    const scaled = progress * (arr.length - 1);
    const i = Math.floor(scaled);
    const t = scaled - i;
    return lerp(arr[i], arr[i + 1], t);
  }

  function applyDayProgress(progress) {
    progress = Math.max(0, Math.min(1, progress));

    const root = document.documentElement;
    root.style.setProperty('--sun-x', fromTimeline(TIMELINE.sunX, progress) + '%');
    root.style.setProperty('--sun-y', fromTimeline(TIMELINE.sunY, progress) + '%');
    root.style.setProperty('--sun-h', fromTimeline(TIMELINE.sunH, progress));
    root.style.setProperty('--sun-a', fromTimeline(TIMELINE.sunA, progress));
    root.style.setProperty('--sky-h', fromTimeline(TIMELINE.skyH, progress));
    root.style.setProperty('--sky-l1', fromTimeline(TIMELINE.skyL1, progress) + '%');
    root.style.setProperty('--sky-l2', fromTimeline(TIMELINE.skyL2, progress) + '%');
    root.style.setProperty('--sky-l3', fromTimeline(TIMELINE.skyL3, progress) + '%');
  }

  function applyDayTime() {
    if (maxDecisions <= 0) return;
    let progress = usedDecisions / maxDecisions;
    progress = Math.pow(progress, 0.8);
    applyDayProgress(progress);
  }

  window.App.setMaxDecisions = (n) => {
    maxDecisions = n;
    usedDecisions = 0;
    applyDayTime();
  };

  window.App.setDecisionsLeft = (left) => {
    usedDecisions = Math.max(0, maxDecisions - left);
    applyDayTime();
  };

  window.App.resetDecisions = () => {
    usedDecisions = 0;
    applyDayTime();
  };

  socket.on('new_shift', () => {
    usedDecisions = 0;
    applyDayTime();
  });

  socket.on('factory_chosen', (data) => {
    usedDecisions = 0;
    applyDayTime();

    // Включаем фон помещения, если сервер прислал ключ
    if (data && data.factory && data.factory.building) {
      applyBuilding(data.factory.building);
    }

    // Состояние фона пока всегда 'mid'.
    // Позже, когда захотим — будем вычислять из экономики.
    applyFactoryState('mid');
  });

  console.log('App: каркас готов');
})();