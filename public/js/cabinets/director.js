// ═══════════════════════════════════════════
// КАБИНЕТ ДИРЕКТОРА — шкалы, уровни, действия
// ═══════════════════════════════════════════

(function () {
  const { socket, state, show, toast, applyTheme } = window.App;

  const DIRECTION_LABELS = {
    equipment: 'Оборудование',
    people:    'Люди',
    ads:       'Реклама',
    security:  'Безопасность',
    economy:   'Экономика'
  };

  const LEVEL_LABELS = {
    33:  'Низкий',
    66:  'Средний',
    100: 'Высокий'
  };

  // ─── Цвет по значению ───
  function colorClass(value) {
    if (value < 50) return 'low';
    if (value < 83) return 'mid';
    return 'high';
  }

  function wordFor(value, type) {
    const low  = type === 'rep' ? 'плохая'    : type === 'inv' ? 'низкие'    : 'мало';
    const mid  = type === 'rep' ? 'средняя'   : type === 'inv' ? 'средние'   : 'средний';
    const high = type === 'rep' ? 'хорошая'   : type === 'inv' ? 'высокие'   : 'много';
    if (value < 50) return low;
    if (value < 83) return mid;
    return high;
  }

  // ─── Отрисовка шкал ───
  function renderScales() {
    const f = state.factory;

    const repFill = document.getElementById('reputation-fill');
    repFill.style.width = f.reputation + '%';
    repFill.className = 'scale-fill ' + colorClass(f.reputation);
    document.getElementById('reputation-word').textContent = wordFor(f.reputation, 'rep');

    const invFill = document.getElementById('investments-fill');
    invFill.style.width = f.investments + '%';
    invFill.className = 'scale-fill ' + colorClass(f.investments);
    document.getElementById('investments-word').textContent = wordFor(f.investments, 'inv');

    const budFill = document.getElementById('budget-fill');
    budFill.style.width = f.budgetPercent + '%';
    budFill.className = 'scale-fill ' + colorClass(f.budgetPercent);
    document.getElementById('budget-word').textContent = wordFor(f.budgetPercent, 'bud');
  }

  window.renderScales = renderScales;

  // ─── Подменю ───
  const mainActions   = document.getElementById('main-actions');
  const submenuDirs   = document.getElementById('submenu-dirs');
  const submenuLevels = document.getElementById('submenu-levels');
  let selectedDir  = null;
  let pendingLevel = null;

  function hideAllSubmenus() {
    submenuDirs.classList.add('hidden');
    submenuLevels.classList.add('hidden');
    hideDirPreview();
    selectedDir = null;
    pendingLevel = null;
  }

  function showMainActions() {
    hideAllSubmenus();
    mainActions.classList.remove('hidden');
  }

  // ─── Превью уровня ───
  function showPreviewLevel(dir, targetLevel) {
    const value = (state.factory.directions && state.factory.directions[dir]) || 0;
    const fill = document.getElementById('preview-fill');
    fill.style.width = targetLevel + '%';
    fill.className = 'scale-fill ' + colorClass(targetLevel);
    document.getElementById('levels-preview-label').textContent =
      DIRECTION_LABELS[dir] + (targetLevel !== value
        ? ' → станет ' + LEVEL_LABELS[targetLevel].toLowerCase() + ' уровень'
        : '');
  }

  function resetPreviewLevel(dir) {
    const value = (state.factory.directions && state.factory.directions[dir]) || 0;
    const fill = document.getElementById('preview-fill');
    fill.style.width = value + '%';
    fill.className = 'scale-fill ' + colorClass(value);
    document.getElementById('levels-preview-label').textContent = DIRECTION_LABELS[dir];
  }

  function updateLevelButtons(dir) {
    const current = (state.factory.directions && state.factory.directions[dir]) || 0;
    document.querySelectorAll('#submenu-levels .btn[data-lvl]').forEach(b => {
      const lvl = parseInt(b.dataset.lvl, 10);
      b.disabled = (lvl === current);
    });
  }

  function showDirPreview(dir) {
    const box = document.getElementById('dir-preview');
    const value = (state.factory.directions && state.factory.directions[dir]) || 0;
    document.getElementById('dir-preview-label').textContent = DIRECTION_LABELS[dir];
    const fill = document.getElementById('dir-preview-fill');
    fill.style.width = value + '%';
    fill.className = 'scale-fill ' + colorClass(value);
    box.classList.remove('hidden');
  }

  function hideDirPreview() {
    document.getElementById('dir-preview').classList.add('hidden');
  }

  // ─── Кнопка «Инвестиции в отдел» ───
  document.getElementById('btn-set-level').onclick = () => {
    mainActions.classList.add('hidden');
    submenuDirs.classList.remove('hidden');
    submenuLevels.classList.add('hidden');
  };

  document.getElementById('btn-back-dirs').onclick = () => {
    submenuDirs.classList.add('hidden');
    hideDirPreview();
    mainActions.classList.remove('hidden');
  };

  document.querySelectorAll('#submenu-dirs .btn[data-dir]').forEach(btn => {
    btn.onclick = () => {
      selectedDir = btn.dataset.dir;
      pendingLevel = null;
      submenuDirs.classList.add('hidden');
      submenuLevels.classList.remove('hidden');
      document.getElementById('levels-title').textContent = DIRECTION_LABELS[selectedDir];
      resetPreviewLevel(selectedDir);
      updateLevelButtons(selectedDir);
    };
  });

  document.getElementById('btn-back-levels').onclick = () => {
    submenuLevels.classList.add('hidden');
    submenuDirs.classList.remove('hidden');
    pendingLevel = null;
    resetPreviewLevel(selectedDir);
    showDirPreview(selectedDir);
  };

  // ─── Кнопки уровней ───
  document.querySelectorAll('#submenu-levels .btn[data-lvl]').forEach(btn => {
    const lvl = parseInt(btn.dataset.lvl, 10);

    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) showPreviewLevel(selectedDir, lvl);
    });
    btn.addEventListener('mouseleave', () => {
      resetPreviewLevel(selectedDir);
    });

    btn.addEventListener('click', () => {
      if (btn.disabled) return;

      if (pendingLevel !== lvl) {
        pendingLevel = lvl;
        showPreviewLevel(selectedDir, lvl);
        return;
      }

      socket.emit('director_set_level', { direction: selectedDir, level: lvl });
      toast(DIRECTION_LABELS[selectedDir] + ': ' + LEVEL_LABELS[lvl].toLowerCase() + ' уровень');
      showMainActions();
    });
  });

  // ─── Заглушки ───
  document.getElementById('btn-take').onclick = () => toast('Забрать себе — скоро');
  document.getElementById('btn-finish').onclick = () => toast('Завершить смену — скоро');

  // ─── Пришёл завод ───
  socket.on('factory_chosen', ({ type, factory }) => {
    applyTheme(type === 'good' ? 'rich' : 'poor');
    state.factory = factory;
    renderScales();

    if (state.myRole === 'director') {
      document.getElementById('main-actions').classList.remove('hidden');
      document.getElementById('other-role-stub').classList.add('hidden');
      showMainActions();
    } else {
      document.getElementById('main-actions').classList.add('hidden');
      document.getElementById('other-role-stub').classList.remove('hidden');
    }

    show('screen-game');
  });

  // ─── Обновление завода ───
  socket.on('factory_update', (data) => {
    state.factory = data;
    renderScales();
    if (selectedDir) {
      resetPreviewLevel(selectedDir);
      updateLevelButtons(selectedDir);
    }
  });

  // ─── Конец игры ───
  socket.on('game_over', ({ reason }) => {
    document.getElementById('end-reason').textContent = reason;
    show('screen-end');
  });

  // ─── Ошибки ───
  socket.on('error_msg', (msg) => toast(msg));

  console.log('Cabinet Director: модуль готов');
})();