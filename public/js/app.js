// ═══════════════════════════════════════════
// APP — общий каркас: socket, экраны, утилиты
// ═══════════════════════════════════════════

(function () {
  const socket = io();

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
    'screen-game-hr':         'wrap-game-hr',
    'screen-shop':            'wrap-shop',
    'screen-shop-item':       'wrap-shop-item',
    'screen-report':          'wrap-report',
    'screen-report-single':   'wrap-report-single',
    'screen-pause':           'wrap-pause',
    'screen-end':             'wrap-end'
  };

  const screensOrder = Object.keys(screens);

  const FACADE_SCREENS = [
    'screen-enter',
    'screen-role',
    'screen-choose',
    'screen-building',
    'screen-product',
    'screen-equipment',
    'screen-setup-wait',
    'screen-waiting',
    'screen-shop',
    'screen-shop-item',
    'screen-report',
    'screen-report-single',
    'screen-pause',
    'screen-end'
  ];

  const SMOKING_SCREENS = ['screen-smoking'];

  const GAME_SCREENS = [
    'screen-game-director',
    'screen-game-security',
    'screen-game-engineer',
    'screen-game-hr'
  ];

  const ALL_BG_CLASSES = [
    'bg-facade',
    'bg-smoking',
    'building-hangar',
    'building-shop',
    'building-main'
  ];

  function clearBgClasses() {
    document.body.classList.remove(...ALL_BG_CLASSES);
  }

  // ═══════════════════════════════════════════
  // HAPTIC
  // ═══════════════════════════════════════════
  function haptic(type) {
    try {
      const tg = window.Telegram && window.Telegram.WebApp;

      if (tg && tg.HapticFeedback) {
        const h = tg.HapticFeedback;
        if (type === 'success') { h.notificationOccurred('success'); return; }
        if (type === 'error')   { h.notificationOccurred('error');   return; }
        if (type === 'warning') { h.notificationOccurred('warning'); return; }
        h.impactOccurred(type || 'light');
        return;
      }

      if (navigator.vibrate) {
        const map = { light: 8, medium: 15, heavy: 25 };
        const ms = map[type];
        if (ms) navigator.vibrate(ms);
      }
    } catch (e) {
      // тихо
    }
  }

  // ═══════════════════════════════════════════
  // ПЕРЕХОДЫ ЭКРАНОВ
  // ═══════════════════════════════════════════

  let currentScreen = null;
  let isTransitioning = false;

  const OUT_DURATION  = 180;
  const IN_DURATION   = 240;

  function applyScreenExtras(id) {
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

    if (GAME_SCREENS.includes(id)) {
      applyDayTime();
    }
  }

  function show(id) {
    if (currentScreen === id) return;

    // Если идёт анимация — откладываем вызов, не игнорируем
    if (isTransitioning) {
      setTimeout(() => show(id), 100);
      return;
    }

    const target = document.getElementById(screens[id]);
    if (!target) return;

    const fromId = currentScreen;
    const from = fromId ? document.getElementById(screens[fromId]) : null;

    const fromIdx = screensOrder.indexOf(fromId);
    const toIdx   = screensOrder.indexOf(id);
    const isBack  = fromId && toIdx < fromIdx;

    if (!GAME_SCREENS.includes(id)) {
      clearBgClasses();

      if (FACADE_SCREENS.includes(id)) {
        document.body.classList.add('bg-facade');
      } else if (SMOKING_SCREENS.includes(id)) {
        document.body.classList.add('bg-smoking');
      }
    }

    if (!from) {
      Object.values(screens).forEach(x => {
        const el = document.getElementById(x);
        if (el) el.classList.add('hidden');
      });
      target.classList.remove('hidden');
      currentScreen = id;
      applyScreenExtras(id);
      return;
    }

    isTransitioning = true;

    from.classList.remove('screen-in', 'screen-in-back');
    from.classList.add(isBack ? 'screen-out-back' : 'screen-out');

    setTimeout(() => {
      from.classList.add('hidden');
      from.classList.remove('screen-out', 'screen-out-back');

      target.classList.remove('hidden');
      target.classList.add(isBack ? 'screen-in-back' : 'screen-in');

      applyScreenExtras(id);
      currentScreen = id;

      setTimeout(() => {
        target.classList.remove('screen-in', 'screen-in-back');
        isTransitioning = false;
      }, IN_DURATION);
    }, OUT_DURATION);
  }

  function applyTheme(theme) {
    document.body.classList.remove('rich', 'poor');
    document.body.classList.add(theme === 'poor' ? 'poor' : 'rich');
  }

  const BUILDING_CLASSES = ['building-hangar', 'building-shop', 'building-main'];
  const BUILDING_MAP = {
    old_hangar:    'building-hangar',
    main_building: 'building-main',
    new_shop:      'building-shop'
  };

  function applyBuilding(key) {
    document.body.classList.remove(...BUILDING_CLASSES);
    if (!key) return;
    const cls = BUILDING_MAP[key];
    if (!cls) return;
    document.body.classList.add(cls);
  }

  const BG_STATE_CLASSES = ['bg-rich', 'bg-mid', 'bg-poor'];

  function applyFactoryState(level) {
    const bg = document.getElementById('bg-building');
    if (!bg) return;

    bg.classList.remove(...BG_STATE_CLASSES);

    if (level === 'rich')      bg.classList.add('bg-rich');
    else if (level === 'poor') bg.classList.add('bg-poor');
    else                       bg.classList.add('bg-mid');
  }

  let toastTimer = null;
  function toast(text) {
    const box = document.getElementById('toast');
    if (!box) return;
    box.textContent = text;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 2200);
  }

  socket.on('smoking_update', ({ players }) => {
    state.players = players;
  });

  socket.on('players_roles', ({ players }) => {
    state.players = players;
  });

  socket.on('your_role', ({ role }) => {
    state.myRole = role;
  });

  window.App = {
    socket,
    state,
    show,
    toast,
    haptic,
    applyTheme,
    applyBuilding,
    applyFactoryState
  };

  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.btn, .setup-btn, .player, .badge-card, .decision-dot, .report-opt, .family-item, .shop-card, .shop-tab');
    if (!el) return;
    if (el.disabled) return;
    haptic('light');
  }, { passive: true });

  // ═══════════════════════════════════════════
  // ВРЕМЯ СУТОК
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

  function isGameScreenActive() {
    return GAME_SCREENS.some(id => {
      const wrap = document.getElementById(screens[id]);
      return wrap && !wrap.classList.contains('hidden');
    });
  }

  function applyDayTime() {
    if (!isGameScreenActive()) return;
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

    if (isGameScreenActive()) {
      applyDayTime();
    }

    if (data && data.factory) {
      if (data.factory.building) {
        applyBuilding(data.factory.building);
      }
      applyFactoryState(data.factory.state || 'mid');
    } else {
      applyFactoryState('mid');
    }
  });

  show('screen-enter');

  console.log('App: каркас готов');
})();