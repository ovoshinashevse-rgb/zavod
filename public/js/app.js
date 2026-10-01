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
    factory: {
      directions: { equipment: 33, people: 33, ads: 33, security: 33, economy: 33 },
      invested: 165,
      investments: 33,
      budgetPercent: 66,
      reputation: 30,
      bankrupt: false
    }
  };

  // ─── Список экранов и их обёрток ───
  const screens = {
    'screen-enter':    'wrap-enter',
    'screen-smoking':  'wrap-smoking',
    'screen-role':     'screen-role',
    'screen-choose':   'wrap-choose',
    'screen-waiting':  'wrap-waiting',
    'screen-game':     'wrap-game',
    'screen-pause':    'wrap-pause',
    'screen-end':      'wrap-end'
  };

  // ─── Показать экран ───
  function show(id) {
    Object.values(screens).forEach(x => {
      const el = document.getElementById(x);
      if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(screens[id]);
    if (target) target.classList.remove('hidden');

    // Атмосфера курилки
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

  // ─── Тема завода: rich / poor ───
  function applyTheme(theme) {
    document.body.classList.remove('rich', 'poor');
    document.body.classList.add(theme === 'poor' ? 'poor' : 'rich');
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

  // ─── Общий объект для всех модулей ───
  window.App = {
    socket,
    state,
    show,
    toast,
    applyTheme
  };

  console.log('App: каркас готов');
})();