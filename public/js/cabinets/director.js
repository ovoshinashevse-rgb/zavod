// ═══════════════════════════════════════════
// КАБИНЕТ ДИРЕКТОРА — шкалы, решения, обнал, отчёты
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

  const LEVEL_LABELS = { 33: 'Низкий', 66: 'Средний', 100: 'Высокий' };
  const DECISION_COST = { 33: 1, 66: 2, 100: 3 };

  const BUILDING_LABELS = {
    old_hangar:    { title: 'Старый ангар',     desc: 'Дёшево, много места. Оборудование старое.' },
    new_shop:      { title: 'Новый цех',         desc: 'Всё новое, чисто. Дорого, места мало.' },
    main_building: { title: 'Заводской корпус',  desc: 'Средне по цене. Нормально.' }
  };

  const BUILDING_THUMBS = {
    old_hangar:    '/img/backgrounds/hangar.jpg',
    new_shop:      '/img/backgrounds/shop.jpg',
    main_building: '/img/backgrounds/main.jpg'
  };

  const PRODUCT_LABELS = {
    bread:       { title: 'Хлеб',        desc: 'Массовый, дешёвый. Нужны пекари.' },
    furniture:   { title: 'Мебель',      desc: 'Дорогая, требует мастеров.' },
    electronics: { title: 'Электроника', desc: 'Премиум, требует всего лучшего.' }
  };

  const INDICATOR_LABELS = {
    quality:    'Качество',
    clients:    'Клиенты',
    employees:  'Сотрудники',
    equipment:  'Оборудование',
    reputation: 'Репутация'
  };

  const ROLE_LABELS = {
    director:   'Директор',
    security:   'Безопасник',
    engineer:   'Инженер',
    hr:         'HR',
    marketer:   'Маркетолог',
    accountant: 'Бухгалтер'
  };

  const EXPLAIN_LABELS = {
    ok:      'Всё в порядке',
    issues:  'Есть проблемы',
    perfect: 'Всё отлично'
  };

  let reportsList = [];
  let stillInShift = [];
  let reportsReviewed = false;
  let currentReport = null;

  let shopData = null;
  let currentCategory = null;
  let currentItem = null;

  let decisionsLeft = 3;

  const MAX_POCKET = 800;

  function mountSign(factory) {
    if (!window.FactorySign) return;
    const product   = factory && factory.product;
    const building  = factory && factory.building;
    const st        = (factory && factory.state) || 'mid';
    const equipment = factory && factory.equipment;
    window.FactorySign.mount('factory-sign-director', product, building, st, equipment);
  }

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
    if (value <= 0) return 'low';
    if (value < 100) return 'mid';
    return 'high';
  }

  function pocketWord(value) {
    if (!value || value <= 0) return 'пусто';
    if (value < 50) return 'немного';
    if (value < 200) return 'нормально';
    return 'много';
  }

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
      const pocketPercent = Math.min(100, (f.pocket / MAX_POCKET) * 100);
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

  function renderReportsList() {
    const box = document.getElementById('reports-list');
    if (!box) return;
    box.innerHTML = '';

    if (stillInShift && stillInShift.length > 0) {
      const waitingBox = document.createElement('div');
      waitingBox.className = 'report-waiting';
      const roles = stillInShift.map(r => ROLE_LABELS[r] || r).join(', ');
      waitingBox.textContent = 'Ожидаем: ' + roles;
      box.appendChild(waitingBox);
    }

    if (!reportsList || reportsList.length === 0) {
      if (!stillInShift || stillInShift.length === 0) {
        box.innerHTML = '<div class="report-empty">Пока никто не сдал.</div>';
      }
      renderReportsFinishButton();
      return;
    }

    reportsList.forEach(r => {
      const item = document.createElement('div');
      item.className = 'report-item' + (r.status === 'missing' ? ' missing' : '');

      const info = document.createElement('div');
      info.className = 'report-item-info';

      const name = document.createElement('div');
      name.className = 'report-item-name';
      name.textContent = ROLE_LABELS[r.role] || r.role;

      const meta = document.createElement('div');
      meta.className = 'report-item-meta';
      if (r.status === 'missing') {
        meta.textContent = 'Не сдан';
      } else {
        meta.textContent = 'Состояние: ' + (r.shownWord || '—');
      }

      info.appendChild(name);
      info.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'report-item-actions';

      if (r.status === 'missing') {
        const btnFine = document.createElement('button');
        btnFine.className = 'btn btn-small btn-fine';
        btnFine.textContent = 'Штраф';
        btnFine.disabled = reportsReviewed;
        btnFine.onclick = () => {
          socket.emit('director_process_report', {
            playerId: r.playerId,
            action: 'fine'
          });
        };
        actions.appendChild(btnFine);
      } else {
        const btnCheck = document.createElement('button');
        btnCheck.className = 'btn btn-small';
        btnCheck.textContent = 'Проверить';
        btnCheck.disabled = reportsReviewed;
        btnCheck.onclick = () => {
          openReport(r);
        };
        actions.appendChild(btnCheck);
      }

      item.appendChild(info);
      item.appendChild(actions);
      box.appendChild(item);
    });

    renderReportsFinishButton();
  }

  function renderReportsFinishButton() {
    const btn = document.getElementById('btn-reports-finish');
    if (!btn) return;

    const canFinish = (!stillInShift || stillInShift.length === 0);

    if (canFinish) {
      btn.textContent = 'Завершить смену';
      btn.disabled = false;
    } else {
      const roles = stillInShift.map(r => ROLE_LABELS[r] || r).join(', ');
      btn.textContent = 'Ждём: ' + roles;
      btn.disabled = true;
    }
  }

  function openReport(reportData) {
    currentReport = reportData;

    const shift = document.getElementById('paper-shift');
    if (shift) shift.textContent = 'Смена ' + (reportData.shift || '—');

    const role = document.getElementById('paper-role');
    if (role) role.textContent = ROLE_LABELS[reportData.role] || reportData.role;

    const shown = document.getElementById('paper-shown');
    if (shown) shown.textContent = reportData.shownWord || '—';

    const explain = document.getElementById('paper-explain');
    if (explain) explain.textContent = EXPLAIN_LABELS[reportData.howToExplain] || '—';

    const approval = document.getElementById('paper-approval');
    if (approval) approval.classList.add('hidden');

    const actions = document.getElementById('paper-actions');
    if (actions) actions.classList.remove('hidden');

    show('screen-report-single');
  }

  // ─── Возврат к списку отчётов ───
  function returnToReports() {
    show('screen-game-director');
    mainActions.classList.add('hidden');
    hideAllSubmenus();
    submenuReports.classList.remove('hidden');
    socket.emit('director_get_reports');
  }

  function showApproval() {
    const approval = document.getElementById('paper-approval');
    if (approval) approval.classList.remove('hidden');

    const actions = document.getElementById('paper-actions');
    if (actions) actions.classList.add('hidden');

    // Возвращаемся на экран смены и открываем список отчётов
    setTimeout(() => {
      returnToReports();
    }, 2400);
  }

  document.getElementById('btn-paper-approve').onclick = () => {
    if (!currentReport) return;
    socket.emit('director_process_report', {
      playerId: currentReport.playerId,
      action: 'approve'
    });
    showApproval();
  };

  document.getElementById('btn-paper-check').onclick = () => {
    if (!currentReport) return;
    socket.emit('director_process_report', {
      playerId: currentReport.playerId,
      action: 'check'
    });
    // Сразу возвращаемся на экран смены
    returnToReports();
  };

  // ═══════════════════════════════════════════
  // МАГАЗИН
  // ═══════════════════════════════════════════
  function renderShopPocket() {
    const fill = document.getElementById('shop-pocket-fill');
    if (!fill || !shopData) return;
    const percent = Math.min(100, ((shopData.pocket || 0) / MAX_POCKET) * 100);
    fill.style.width = percent + '%';
    fill.className = 'scale-fill ' + pocketColorClass(shopData.pocket);
  }

  function renderShopTabs() {
    const box = document.getElementById('shop-tabs');
    if (!box || !shopData) return;
    box.innerHTML = '';

    shopData.categories.forEach(cat => {
      const tab = document.createElement('button');
      tab.className = 'shop-tab' + (cat.key === currentCategory ? ' active' : '');
      tab.textContent = cat.title;
      tab.onclick = () => {
        currentCategory = cat.key;
        renderShopTabs();
        renderShopItems();
      };
      box.appendChild(tab);
    });
  }

  function renderShopItems() {
    const box = document.getElementById('shop-items');
    if (!box || !shopData) return;
    box.innerHTML = '';

    const cat = shopData.categories.find(c => c.key === currentCategory);
    if (!cat) return;

    const pocket = shopData.pocket || 0;

    cat.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'shop-card';
      if (item.owned) card.classList.add('owned');
      if (item.locked && !item.owned) card.classList.add('locked');
      if (!item.owned && !item.locked && pocket >= item.price && item.price > 0) {
        card.classList.add('buyable');
      }

      const svg = window.ShopIcons ? window.ShopIcons.render(item.svg) : '';

      let scalePercent = 0;
      let scaleClass = 'fits';
      if (item.owned) {
        scalePercent = 100;
        scaleClass = 'fits';
      } else if (item.price === 0) {
        scalePercent = 100;
        scaleClass = 'fits';
      } else {
        const ratio = pocket / item.price;
        scalePercent = Math.min(100, ratio * 100);
        scaleClass = ratio >= 1 ? 'fits' : 'doesnt-fit';
      }

      card.innerHTML =
        (item.owned ? '<div class="shop-card-badge">Есть</div>' : '') +
        '<div class="shop-card-image">' + svg + '</div>' +
        '<div class="shop-card-title">' + item.title + '</div>' +
        '<div class="shop-card-scale">' +
          '<div class="shop-card-scale-fill ' + scaleClass + '" style="width:' + scalePercent + '%"></div>' +
        '</div>';

      card.onclick = () => {
        openShopItem(item);
      };

      box.appendChild(card);
    });
  }

  function openShopItem(item) {
    currentItem = item;

    const img = document.getElementById('item-image');
    if (img) {
      const svg = window.ShopIcons ? window.ShopIcons.render(item.svg) : '';
      img.innerHTML = svg;
    }

    const title = document.getElementById('item-title');
    if (title) title.textContent = item.title;

    const desc = document.getElementById('item-desc');
    if (desc) desc.textContent = item.desc;

    const pocket = shopData ? (shopData.pocket || 0) : 0;

    const ownFill = document.getElementById('item-own-fill');
    if (ownFill) {
      const ownPercent = Math.min(100, (pocket / MAX_POCKET) * 100);
      ownFill.style.width = ownPercent + '%';
    }

    const priceFill = document.getElementById('item-price-fill');
    if (priceFill) {
      const pricePercent = Math.min(100, (item.price / MAX_POCKET) * 100);
      priceFill.style.width = pricePercent + '%';
      priceFill.className = 'scale-fill ' + (pocket >= item.price ? 'fits' : 'doesnt-fit');
    }

    const btnBuy = document.getElementById('btn-item-buy');
    if (btnBuy) {
      if (item.owned) {
        btnBuy.textContent = 'Уже есть';
        btnBuy.disabled = true;
      } else if (item.locked) {
        btnBuy.textContent = 'Недоступно';
        btnBuy.disabled = true;
      } else if (pocket >= item.price && item.price > 0) {
        btnBuy.textContent = 'В корзину';
        btnBuy.disabled = false;
      } else if (item.price === 0) {
        btnBuy.textContent = 'Стартовый';
        btnBuy.disabled = true;
      } else {
        btnBuy.textContent = 'Не хватает';
        btnBuy.disabled = true;
      }
    }

    show('screen-shop-item');
  }

  const btnOpenShop = document.getElementById('btn-open-shop');
  if (btnOpenShop) {
    btnOpenShop.onclick = () => {
      socket.emit('director_open_shop');
    };
  }

  const btnShopBack = document.getElementById('btn-shop-back');
  if (btnShopBack) {
    btnShopBack.onclick = () => {
      show('screen-game-director');
    };
  }

  const btnItemBack = document.getElementById('btn-item-back');
  if (btnItemBack) {
    btnItemBack.onclick = () => {
      show('screen-shop');
    };
  }

  const btnItemBuy = document.getElementById('btn-item-buy');
  if (btnItemBuy) {
    btnItemBuy.onclick = () => {
      if (!currentItem) return;
      socket.emit('director_buy_item', { itemKey: currentItem.key });
      show('screen-shop');
    };
  }

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

    if (window.App && window.App.setDecisionsLeft) {
      window.App.setMaxDecisions(3);
      window.App.setDecisionsLeft(left);
    }
  }

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
    const el = document.getElementById('dir-preview');
    if (el) el.classList.add('hidden');
  }

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

  document.getElementById('btn-finish').onclick = () => {
    socket.emit('player_finish_shift');
  };

  const btnReportsFinish = document.getElementById('btn-reports-finish');
  if (btnReportsFinish) {
    btnReportsFinish.onclick = () => {
      socket.emit('director_finish_after_reports');
    };
  }

  function enterShiftDone() {
    hideAllSubmenus();
    mainActions.classList.add('hidden');
    shiftDone.classList.remove('hidden');
  }

  // ═══════════════════════════════════════════
  // СОБЫТИЯ
  // ═══════════════════════════════════════════
  socket.on('factory_chosen', ({ factory, decisionsLeft: dl, needSetup, buildings, products }) => {
    if (state.myRole !== 'director') return;

    state.factory = factory;

    if (needSetup) {
      renderBuildings(buildings);
      show('screen-building');
      return;
    }

    mountSign(factory);

    renderScales();
    renderDecisions(dl || 3);
    showMainActions();
    show('screen-game-director');
  });

  function renderBuildings(buildings) {
    const box = document.getElementById('buildings-list');
    if (!box) return;
    box.innerHTML = '';

    const list = buildings || BUILDING_LABELS;

    Object.keys(list).forEach(key => {
      const b = BUILDING_LABELS[key] || { title: key, desc: '' };
      const thumbUrl = BUILDING_THUMBS[key] || '';

      const btn = document.createElement('button');
      btn.className = 'setup-btn';
      btn.innerHTML =
        '<div class="setup-thumb" style="background-image:url(' + thumbUrl + ')"></div>' +
        '<div class="setup-body">' +
          '<span class="setup-title">' + b.title + '</span>' +
          '<span class="setup-desc">' + b.desc + '</span>' +
        '</div>';

      btn.onclick = () => {
        socket.emit('director_choose_building', { building: key });
      };

      box.appendChild(btn);
    });
  }

  function renderProducts(products) {
    const box = document.getElementById('products-list');
    if (!box) return;
    box.innerHTML = '';

    const list = products || PRODUCT_LABELS;

    Object.keys(list).forEach(key => {
      const p = PRODUCT_LABELS[key] || { title: key, desc: '' };

      const svg = (window.FactorySign && window.FactorySign.render)
        ? window.FactorySign.render(key)
        : '';

      const btn = document.createElement('button');
      btn.className = 'setup-btn';
      btn.innerHTML =
        '<div class="setup-thumb">' + svg + '</div>' +
        '<div class="setup-body">' +
          '<span class="setup-title">' + p.title + '</span>' +
          '<span class="setup-desc">' + p.desc + '</span>' +
        '</div>';

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
    reportsList = [];
    stillInShift = [];
    reportsReviewed = false;
    shiftDone.classList.add('hidden');
    renderDecisions(dl || 3);
    showMainActions();
  });

  socket.on('report_check_reply', ({ indicator, answer }) => {
    if (state.myRole !== 'director') return;
    const label = answer === 'real' ? 'настоящий' : 'подделан';
    toast('Ответ по отчёту: ' + label);
  });

  socket.on('need_reports', () => {
    if (state.myRole !== 'director') return;

    mainActions.classList.add('hidden');
    hideAllSubmenus();
    submenuReports.classList.remove('hidden');

    socket.emit('director_get_reports');
  });

  socket.on('director_reports', ({ list, stillInShift: inShift, reviewed }) => {
    if (state.myRole !== 'director') return;
    reportsList = list || [];
    stillInShift = inShift || [];
    reportsReviewed = reviewed || false;
    renderReportsList();
  });

  socket.on('report_processed', ({ action, targetRole, amount }) => {
    if (state.myRole !== 'director') return;

    const roleLabel = ROLE_LABELS[targetRole] || targetRole;

    if (action === 'fine') {
      toast('Штраф: ' + roleLabel + ' — ' + (amount || 10));
    } else if (action === 'approve') {
      toast('Согласовано: ' + roleLabel);
    } else if (action === 'check') {
      toast('На проверку: ' + roleLabel);
    }

    reportsReviewed = true;
  });

  socket.on('director_wait_others', ({ waiting }) => {
    if (state.myRole !== 'director') return;

    const roles = (waiting || []).map(r => ROLE_LABELS[r] || r).join(', ');
    toast('Ещё не все завершили смену. Ждём: ' + roles);
  });

  socket.on('new_report', ({ role }) => {
    if (state.myRole !== 'director') return;
    const roleLabel = ROLE_LABELS[role] || role;
    toast(roleLabel + ' сдал отчёт');
  });

  // ─── Магазин ───
  socket.on('shop_opened', (data) => {
    if (state.myRole !== 'director') return;

    shopData = data;
    currentCategory = data.categories[0] ? data.categories[0].key : null;

    renderShopPocket();
    renderShopTabs();
    renderShopItems();

    show('screen-shop');
  });

  socket.on('item_ordered', (data) => {
    if (state.myRole !== 'director') return;

    if (data.item) {
      toast('Заказано: ' + data.item.title);
    }

    socket.emit('director_open_shop');
  });

  socket.on('luxury_delivered', ({ items }) => {
    if (state.myRole !== 'director') return;

    if (items && items.length > 0) {
      items.forEach(it => {
        toast('Доставлено: ' + it.title);
      });
    }
  });

  socket.on('director_luxury_update', (data) => {
    if (state.myRole !== 'director') return;

    const f = state.factory;
    if (data && typeof data.pocket !== 'undefined') {
      f.pocket = data.pocket;
      renderScales();
    }
  });

  socket.on('game_over', ({ reason, type, biographies }) => {
    if (state.myRole !== 'director') return;

    document.getElementById('end-reason').textContent = reason;

    if (type === 'sale' && biographies && biographies[socket.id]) {
      const bioBox = document.getElementById('end-biography');
      bioBox.textContent = biographies[socket.id];
      bioBox.classList.remove('hidden');
    }

    show('screen-end');
  });

  socket.on('error_msg', (msg) => toast(msg));

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

  socket.on('factory_update', (data) => {
    if (state.myRole !== 'director') return;

    if (data && data.needProduct) {
      state.factory = data;
      renderProducts(data.products);
      show('screen-product');
      return;
    }

    state.factory = data;

    mountSign(data);

    renderScales();
    if (selectedDir) {
      resetPreviewLevel(selectedDir);
      updateLevelButtonsAvailability();
    }
    if (takeDir) {
      resetTakePreview(takeDir);
      updateTakeLevelButtonsAvailability();
    }
  });

  socket.on('need_building', () => {
    if (state.myRole !== 'director') return;
    renderBuildings();
    show('screen-building');
  });

  socket.on('game_started', ({ factory, decisionsLeft: dl }) => {
    if (state.myRole !== 'director') return;
    state.factory = factory;

    mountSign(factory);

    renderScales();
    renderDecisions(dl || 3);
    showMainActions();
    show('screen-game-director');
  });

  console.log('Cabinet Director: модуль готов');
})();