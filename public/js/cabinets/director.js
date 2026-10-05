// ═══════════════════════════════════════════
// КАБИНЕТ ДИРЕКТОРА — шкалы, решения, откаты
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

  const DECISION_COST = {
    33:  1,
    66:  2,
    100: 3
  };

    // Человеческие названия для помещений и продуктов
  const BUILDING_LABELS = {
    old_hangar:    { title: 'Старый ангар',     desc: 'Дёшево, много места. Оборудование старое.' },
    new_shop:      { title: 'Новый цех',         desc: 'Всё новое, чисто. Дорого, места мало.' },
    basement:      { title: 'Подвал',            desc: 'Очень дёшево, скрытно. Темно, сыро.' },
    main_building: { title: 'Заводской корпус',  desc: 'Средне по цене. Нормально.' }
  };

  const PRODUCT_LABELS = {
    bread:       { title: 'Хлеб',        desc: 'Массовый, дешёвый. Нужны пекари.' },
    furniture:   { title: 'Мебель',      desc: 'Дорогая, требует мастеров.' },
    parts:       { title: 'Детали',      desc: 'B2B, точность, станки.' },
    electronics: { title: 'Электроника', desc: 'Премиум, требует всего лучшего.' }
  };

  const INDICATOR_LABELS = {
    quality:    'Качество',
    clients:    'Клиенты',
    employees:  'Сотрудники',
    equipment:  'Оборудование',
    reputation: 'Репутация'
  };

  const REPORT_LABELS = {
    high:    'высокое',
    mid:     'среднее',
    low:     'низкое',
    missing: 'не сдан'
  };

  let decisionsLeft = 3;

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
    const repFill = document.getElementById('reputation-fill');
    if (!repFill) return;

    const f = state.factory;
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

    // Отчёты
    renderReports();
  }

  // ─── Отрисовка отчётов ───
  function renderReports() {
    const f = state.factory;
    const box = document.getElementById('reports-list');
    if (!box) return;

    box.innerHTML = '';

    const indicators = ['quality', 'clients', 'employees', 'equipment', 'reputation'];

    // Есть ли активный запрос
    const hasActiveCheck = f.activeCheck && !f.activeCheck.directorNotified;

    indicators.forEach(key => {
      const row = document.createElement('div');
      row.className = 'report-row';

      const value = (f.reports && f.reports[key]) || 'missing';
      const label = REPORT_LABELS[value] || '—';

      const isActive = f.activeCheck && f.activeCheck.indicator === key;
      const disabled = hasActiveCheck || value === 'missing';

      row.innerHTML =
        '<span class="report-label">' + INDICATOR_LABELS[key] + '</span>' +
        '<span class="report-value ' + value + '">' + label + '</span>';

      const btn = document.createElement('button');
      btn.className = 'report-check-btn';
      btn.dataset.indicator = key;
      btn.textContent = isActive ? 'Проверяется…' : 'Проверить';
      btn.disabled = disabled;
      if (isActive) btn.classList.add('active');

      btn.onclick = () => {
        if (btn.disabled) return;
        socket.emit('director_request_check', { indicator: key });
        toast('Отчёт отправлен на проверку');
      };

      row.appendChild(btn);
      box.appendChild(row);
    });
  }

  window.renderScales = renderScales;

  // ─── Отрисовка точек решений ───
  function renderDecisions(left) {
    decisionsLeft = left;
    const max = 3;
    const box = document.getElementById('decisions-dots-director');
    if (!box) return;
    box.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('span');
      dot.className = 'decision-dot' + (i < left ? ' active' : '');
      box.appendChild(dot);
    }

    const noDecisions = left <= 0;
    document.getElementById('btn-set-level').disabled = noDecisions;
    document.getElementById('btn-take').disabled = noDecisions;

    // Проверка отчёта — 2 решения
    const reportBtns = document.querySelectorAll('.report-check-btn');
    reportBtns.forEach(b => {
      b.disabled = b.disabled || decisionsLeft < 2;
    });
        // Сообщаем App, сколько решений
    if (window.App && window.App.setDecisionsLeft) {
      window.App.setMaxDecisions(3);
      window.App.setDecisionsLeft(left);
    }
  }

  // ─── Обновить доступность кнопок уровней ───
  function updateLevelButtonsAvailability() {
    document.querySelectorAll('#submenu-levels .btn[data-lvl]').forEach(b => {
      const lvl = parseInt(b.dataset.lvl, 10);
      const cost = DECISION_COST[lvl];
      const current = (state.factory.directions && state.factory.directions[selectedDir]) || 0;
      const isSame = (lvl === current);
      const notEnough = (decisionsLeft < cost);
      b.disabled = isSame || notEnough;
    });
  }

  function updateTakeLevelButtonsAvailability() {
    document.querySelectorAll('#submenu-take-budget .btn[data-take-lvl]').forEach(b => {
      const lvl = parseInt(b.dataset.takeLvl, 10);
      const cost = DECISION_COST[lvl];
      b.disabled = (decisionsLeft < cost);
    });

    document.querySelectorAll('#submenu-take-levels .btn[data-take-dir-lvl]').forEach(b => {
      const lvl = parseInt(b.dataset.takeDirLvl, 10);
      const cost = DECISION_COST[lvl];
      const current = (state.factory.directions && state.factory.directions[takeDir]) || 0;
      const isSameOrHigher = (lvl >= current);
      const notEnough = (decisionsLeft < cost);
      b.disabled = isSameOrHigher || notEnough;
    });
  }

  // ─── Подменю ───
  const mainActions      = document.getElementById('main-actions');
  const submenuDirs      = document.getElementById('submenu-dirs');
  const submenuLevels    = document.getElementById('submenu-levels');
  const submenuTakeSrc   = document.getElementById('submenu-take-source');
  const submenuTakeBud   = document.getElementById('submenu-take-budget');
  const submenuTakeDirs  = document.getElementById('submenu-take-dirs');
  const submenuTakeLvls  = document.getElementById('submenu-take-levels');
  const shiftDone        = document.getElementById('shift-done-director');
  const submenuReports   = document.getElementById('submenu-reports');

  let selectedDir      = null;
  let pendingLevel     = null;
  let takeDir          = null;
  let pendingTakeDirLvl = null;

  function hideAllSubmenus() {
    [submenuDirs, submenuLevels, submenuTakeSrc, submenuTakeBud, submenuTakeDirs, submenuTakeLvls, submenuReports]
      .forEach(el => el && el.classList.add('hidden'));
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
      updateLevelButtonsAvailability();
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
    updateTakeLevelButtonsAvailability();
  };

  document.getElementById('btn-back-take-budget').onclick = () => {
    submenuTakeBud.classList.add('hidden');
    submenuTakeSrc.classList.remove('hidden');
  };

  document.querySelectorAll('#submenu-take-budget .btn[data-take-lvl]').forEach(btn => {
    const lvl = parseInt(btn.dataset.takeLvl, 10);

    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      socket.emit('director_take_budget', { level: lvl });
      toast('Откат из бюджета: ' + LEVEL_LABELS[lvl].toLowerCase() + ' уровень');
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
      updateTakeLevelButtonsAvailability();
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
      toast('Откат из ' + DIRECTION_LABELS[takeDir].toLowerCase() + ': до ' + LEVEL_LABELS[lvl].toLowerCase() + ' уровня');
      showMainActions();
    });
  });

  // ═══════════════════════════════════════════
  // ЗАВЕРШИТЬ СМЕНУ
  // ═══════════════════════════════════════════
  document.getElementById('btn-finish').onclick = () => {
    socket.emit('player_finish_shift');
  };

  // ─── Кнопка «Отчёты» ───
  document.getElementById('btn-reports').onclick = () => {
    mainActions.classList.add('hidden');
    submenuReports.classList.remove('hidden');
    renderReports();
  };

  document.getElementById('btn-back-reports').onclick = () => {
    submenuReports.classList.add('hidden');
    mainActions.classList.remove('hidden');
  };

  function enterShiftDone() {
    hideAllSubmenus();
    mainActions.classList.add('hidden');
    shiftDone.classList.remove('hidden');
  }

  // ═══════════════════════════════════════════
  // СОБЫТИЯ С СЕРВЕРА
  // ═══════════════════════════════════════════
socket.on('factory_chosen', ({ factory, decisionsLeft: dl, needSetup, buildings, products }) => {
    if (state.myRole !== 'director') return;

    state.factory = factory;

    if (needSetup) {
      renderBuildings(buildings);
      show('screen-building');
      return;
    }

    renderScales();
    renderDecisions(dl || 3);
    showMainActions();
    show('screen-game-director');
  });

  // ─── Отрисовка помещений ───
  function renderBuildings(buildings) {
    const box = document.getElementById('buildings-list');
    if (!box) return;
    box.innerHTML = '';

    const list = buildings || BUILDING_LABELS;

    Object.keys(list).forEach(key => {
      const b = BUILDING_LABELS[key] || { title: key, desc: '' };

      const btn = document.createElement('button');
      btn.className = 'setup-btn';
      btn.innerHTML =
        '<span class="setup-title">' + b.title + '</span>' +
        '<span class="setup-desc">' + b.desc + '</span>';

      btn.onclick = () => {
        socket.emit('director_choose_building', { building: key });
      };

      box.appendChild(btn);
    });
  }

  // ─── Отрисовка продуктов ───
  function renderProducts(products) {
    const box = document.getElementById('products-list');
    if (!box) return;
    box.innerHTML = '';

    const list = products || PRODUCT_LABELS;

    Object.keys(list).forEach(key => {
      const p = PRODUCT_LABELS[key] || { title: key, desc: '' };

      const btn = document.createElement('button');
      btn.className = 'setup-btn';
      btn.innerHTML =
        '<span class="setup-title">' + p.title + '</span>' +
        '<span class="setup-desc">' + p.desc + '</span>';

      btn.onclick = () => {
        socket.emit('director_choose_product', { product: key });
      };

      box.appendChild(btn);
    });
  }

  socket.on('decisions_update', ({ decisionsLeft: dl }) => {
    if (state.myRole !== 'director') return;
    renderDecisions(dl);
    updateLevelButtonsAvailability();
    updateTakeLevelButtonsAvailability();
  });

  socket.on('shift_progress', ({ finished }) => {
    if (state.myRole !== 'director') return;
    const me = finished.find(p => p.id === socket.id);
    if (me && me.finished) {
      enterShiftDone();
    }
  });

  socket.on('new_shift', ({ decisionsLeft: dl }) => {
    if (state.myRole !== 'director') return;
    shiftDone.classList.add('hidden');
    renderDecisions(dl || 3);
    showMainActions();
  });

  socket.on('report_check_reply', ({ indicator, answer }) => {
    if (state.myRole !== 'director') return;
    const label = answer === 'real' ? 'настоящий' : 'подделан';
    toast('Ответ по отчёту «' + INDICATOR_LABELS[indicator] + '»: ' + label);
  });

  socket.on('game_over', ({ reason, type, biographies }) => {
    if (state.myRole !== 'director') return;

    document.getElementById('end-reason').textContent = reason;

    // Если продажа — показать биографию
    if (type === 'sale' && biographies && biographies[socket.id]) {
      const bioBox = document.getElementById('end-biography');
      bioBox.textContent = biographies[socket.id];
      bioBox.classList.remove('hidden');
    }

    show('screen-end');
  });

  socket.on('error_msg', (msg) => toast(msg));

  // ═══════════════════════════════════════════
  // СГОВОР — модальное окно для Директора
  // ═══════════════════════════════════════════
  socket.on('deal_offered', () => {
    if (state.myRole !== 'director') return;
    document.getElementById('deal-modal').classList.remove('hidden');
  });

  socket.on('deal_activated', () => {
    if (state.myRole !== 'director') return;
    document.getElementById('deal-modal').classList.add('hidden');
    toast('Сговор заключён');
  });

  socket.on('deal_broken', () => {
    if (state.myRole !== 'director') return;
    document.getElementById('deal-modal').classList.add('hidden');
    toast('Сговор разорван');
  });

  document.getElementById('btn-deal-accept').onclick = () => {
    socket.emit('director_accept_deal');
    document.getElementById('deal-modal').classList.add('hidden');
  };

  document.getElementById('btn-deal-decline').onclick = () => {
    socket.emit('director_decline_deal');
    document.getElementById('deal-modal').classList.add('hidden');
  };
 // ─── Помещение выбрано ───
  socket.on('factory_update', (data) => {
    if (state.myRole !== 'director') return;

    // Если это обновление после выбора помещения — показываем продукты
    if (data && data.needProduct) {
      state.factory = data;
      renderProducts(data.products);
      show('screen-product');
      return;
    }

    // Обычное обновление завода
    state.factory = data;
    renderScales();
    if (document.getElementById('reports-list')) {
      renderReports();
    }
    if (selectedDir) {
      resetPreviewLevel(selectedDir);
      updateLevelButtonsAvailability();
    }
    if (takeDir) {
      resetTakePreview(takeDir);
      updateTakeLevelButtonsAvailability();
    }
  });

  // ─── Если продукт выбран раньше помещения ───
  socket.on('need_building', () => {
    if (state.myRole !== 'director') return;
    renderBuildings();
    show('screen-building');
  });

  // ─── Игра началась ───
  socket.on('game_started', ({ factory, decisionsLeft: dl }) => {
    if (state.myRole !== 'director') return;
    state.factory = factory;
    renderScales();
    renderDecisions(dl || 3);
    showMainActions();
    show('screen-game-director');
  });
  console.log('Cabinet Director: модуль готов');
})();