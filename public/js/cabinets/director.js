// ═══════════════════════════════════════════
// КАБИНЕТ ДИРЕКТОРА — шкалы, решения, воровство
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

  function pocketColorClass(value) {
    if (value <= 0) return 'mid';
    if (value < 50) return 'mid';
    return 'high';
  }

  function pocketWord(value) {
    if (!value || value <= 0) return 'пусто';
    if (value < 30) return 'немного';
    if (value < 70) return 'нормально';
    return 'много';
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

    const pocketBox = document.getElementById('pocket-box');
    if (typeof f.pocket !== 'undefined') {
      const pocketPercent = Math.min(100, f.pocket);
      const pocketFill = document.getElementById('pocket-fill');

      pocketFill.style.width = pocketPercent + '%';
      pocketFill.className = 'scale-fill ' + pocketColorClass(f.pocket);
      document.getElementById('pocket-word').textContent = pocketWord(f.pocket);

      if (f.pocket > 0) {
        pocketBox.classList.remove('hidden');
      } else {
        pocketBox.classList.add('hidden');
      }
    } else {
      pocketBox.classList.add('hidden');
    }
  }

  window.renderScales = renderScales;

  // ─── Отрисовка точек решений ───
  function renderDecisions(left) {
    const max = 3;   // у Директора 3 решения
    const box = document.getElementById('decisions-dots');
    box.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('span');
      dot.className = 'decision-dot' + (i < left ? ' active' : '');
      box.appendChild(dot);
    }

    // Если решений нет — блокируем основные кнопки
    const noDecisions = left <= 0;
    document.getElementById('btn-set-level').disabled = noDecisions;
    document.getElementById('btn-take').disabled = noDecisions;
  }

  // ─── Подменю ───
  const mainActions      = document.getElementById('main-actions');
  const submenuDirs      = document.getElementById('submenu-dirs');
  const submenuLevels    = document.getElementById('submenu-levels');
  const submenuTakeSrc   = document.getElementById('submenu-take-source');
  const submenuTakeBud   = document.getElementById('submenu-take-budget');
  const submenuTakeDirs  = document.getElementById('submenu-take-dirs');
  const submenuTakeLvls  = document.getElementById('submenu-take-levels');
  const shiftDone        = document.getElementById('shift-done');

  let selectedDir      = null;
  let pendingLevel     = null;
  let takeDir          = null;
  let pendingTakeDirLvl = null;

  function hideAllSubmenus() {
    [submenuDirs, submenuLevels, submenuTakeSrc, submenuTakeBud, submenuTakeDirs, submenuTakeLvls]
      .forEach(el => el.classList.add('hidden'));
    hideDirPreview();
    selectedDir = null;
    pendingLevel = null;
    takeDir = null;
    pendingTakeDirLvl = null;
  }

  function showMainActions() {
    hideAllSubmenus();
    mainActions.classList.remove('hidden');
    shiftDone.classList.add('hidden');
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

  function showTakePreview(dir, targetLevel) {
    const value = (state.factory.directions && state.factory.directions[dir]) || 0;
    const fill = document.getElementById('take-preview-fill');
    fill.style.width = targetLevel + '%';
    fill.className = 'scale-fill ' + colorClass(targetLevel);
    document.getElementById('take-levels-preview-label').textContent =
      DIRECTION_LABELS[dir] + ' → ' + LEVEL_LABELS[targetLevel].toLowerCase() + ' уровень';
  }

  function resetTakePreview(dir) {
    const value = (state.factory.directions && state.factory.directions[dir]) || 0;
    const fill = document.getElementById('take-preview-fill');
    fill.style.width = value + '%';
    fill.className = 'scale-fill ' + colorClass(value);
    document.getElementById('take-levels-preview-label').textContent = DIRECTION_LABELS[dir];
  }

  function updateTakeLevelButtons(dir) {
    const current = (state.factory.directions && state.factory.directions[dir]) || 0;
    document.querySelectorAll('#submenu-take-levels .btn[data-take-dir-lvl]').forEach(b => {
      const lvl = parseInt(b.dataset.takeDirLvl, 10);
      b.disabled = (lvl >= current);
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

  // ═══════════════════════════════════════════
  // ИНВЕСТИЦИИ В ОТДЕЛ
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  // ЗАБРАТЬ СЕБЕ
  // ═══════════════════════════════════════════
  document.getElementById('btn-take').onclick = () => {
    mainActions.classList.add('hidden');
    submenuTakeSrc.classList.remove('hidden');
  };

  document.getElementById('btn-back-take-source').onclick = () => {
    submenuTakeSrc.classList.add('hidden');
    mainActions.classList.remove('hidden');
  };

  document.getElementById('btn-take-budget').onclick = () => {
    submenuTakeSrc.classList.add('hidden');
    submenuTakeBud.classList.remove('hidden');
  };

  document.getElementById('btn-back-take-budget').onclick = () => {
    submenuTakeBud.classList.add('hidden');
    submenuTakeSrc.classList.remove('hidden');
  };

  document.querySelectorAll('#submenu-take-budget .btn[data-take-lvl]').forEach(btn => {
    const lvl = parseInt(btn.dataset.takeLvl, 10);

    btn.addEventListener('click', () => {
      socket.emit('director_take_budget', { level: lvl });
      toast('Забрано из бюджета: ' + LEVEL_LABELS[lvl].toLowerCase() + ' уровень');
      showMainActions();
    });
  });

  document.getElementById('btn-take-investments').onclick = () => {
    submenuTakeSrc.classList.add('hidden');
    submenuTakeDirs.classList.remove('hidden');
  };

  document.getElementById('btn-back-take-dirs').onclick = () => {
    submenuTakeDirs.classList.add('hidden');
    submenuTakeSrc.classList.remove('hidden');
  };

  document.querySelectorAll('#submenu-take-dirs .btn[data-take-dir]').forEach(btn => {
    btn.onclick = () => {
      takeDir = btn.dataset.takeDir;
      pendingTakeDirLvl = null;
      submenuTakeDirs.classList.add('hidden');
      submenuTakeLvls.classList.remove('hidden');
      document.getElementById('take-levels-title').textContent = 'Опустить: ' + DIRECTION_LABELS[takeDir];
      resetTakePreview(takeDir);
      updateTakeLevelButtons(takeDir);
    };
  });

  document.getElementById('btn-back-take-levels').onclick = () => {
    submenuTakeLvls.classList.add('hidden');
    submenuTakeDirs.classList.remove('hidden');
    pendingTakeDirLvl = null;
    resetTakePreview(takeDir);
  };

  document.querySelectorAll('#submenu-take-levels .btn[data-take-dir-lvl]').forEach(btn => {
    const lvl = parseInt(btn.dataset.takeDirLvl, 10);

    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) showTakePreview(takeDir, lvl);
    });
    btn.addEventListener('mouseleave', () => {
      resetTakePreview(takeDir);
    });

    btn.addEventListener('click', () => {
      if (btn.disabled) return;

      if (pendingTakeDirLvl !== lvl) {
        pendingTakeDirLvl = lvl;
        showTakePreview(takeDir, lvl);
        return;
      }

      socket.emit('director_take_direction', { direction: takeDir, level: lvl });
      toast('Забрано из ' + DIRECTION_LABELS[takeDir].toLowerCase() + ': до ' + LEVEL_LABELS[lvl].toLowerCase() + ' уровня');
      showMainActions();
    });
  });

  // ═══════════════════════════════════════════
  // ЗАВЕРШИТЬ СМЕНУ
  // ═══════════════════════════════════════════
  document.getElementById('btn-finish').onclick = () => {
    socket.emit('player_finish_shift');
  };

  document.getElementById('btn-finish-other').onclick = () => {
    socket.emit('player_finish_shift');
  };

  function enterShiftDone() {
    hideAllSubmenus();
    mainActions.classList.add('hidden');
    document.getElementById('other-role-stub').classList.add('hidden');
    shiftDone.classList.remove('hidden');
  }

  // ═══════════════════════════════════════════
  // СОБЫТИЯ С СЕРВЕРА
  // ═══════════════════════════════════════════
  socket.on('factory_chosen', ({ type, factory, decisionsLeft }) => {
    applyTheme(type === 'good' ? 'rich' : 'poor');
    state.factory = factory;
    renderScales();
    renderDecisions(decisionsLeft || 0);

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

  socket.on('factory_update', (data) => {
    state.factory = data;
    renderScales();
    if (selectedDir) {
      resetPreviewLevel(selectedDir);
      updateLevelButtons(selectedDir);
    }
    if (takeDir) {
      resetTakePreview(takeDir);
      updateTakeLevelButtons(takeDir);
    }
  });

  socket.on('decisions_update', ({ decisionsLeft }) => {
    renderDecisions(decisionsLeft);
  });

  socket.on('shift_progress', ({ finished }) => {
    const me = finished.find(p => p.id === socket.id);
    if (me && me.finished) {
      enterShiftDone();
    }
  });

  socket.on('new_shift', ({ decisionsLeft }) => {
    shiftDone.classList.add('hidden');
    renderDecisions(decisionsLeft || 0);

    if (state.myRole === 'director') {
      document.getElementById('main-actions').classList.remove('hidden');
      document.getElementById('other-role-stub').classList.add('hidden');
      showMainActions();
    } else {
      document.getElementById('main-actions').classList.add('hidden');
      document.getElementById('other-role-stub').classList.remove('hidden');
    }
  });

  socket.on('game_over', ({ reason }) => {
    document.getElementById('end-reason').textContent = reason;
    show('screen-end');
  });

  socket.on('error_msg', (msg) => toast(msg));

  console.log('Cabinet Director: модуль готов');
})();