// ═══════════════════════════════════════════
// КАБИНЕТ ИНЖЕНЕРА — работа, спивание, отчёт
// ═══════════════════════════════════════════

(function () {
  const { socket, state, show, toast } = window.App;

  const engState = {
    decisionsLeft: 3,
    pocket: 0,
    equipmentFund: 0,
    indicators: { quality: 0, equipment: 0, employees: 0 },
    report: null
  };

  // ─── Знак завода ───
  function mountSign(factory) {
    if (!window.FactorySign) return;
    const product   = factory && factory.product;
    const building  = factory && factory.building;
    const st        = (factory && factory.state) || 'mid';
    const equipment = factory && factory.equipment;
    window.FactorySign.mount('factory-sign-engineer', product, building, st, equipment);
  }

  // ─── Точки решений ───
  function renderDecisions(left) {
    const max = 3;
    const box = document.getElementById('decisions-dots-engineer');
    if (!box) return;
    box.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('span');
      dot.className = 'decision-dot' + (i < left ? ' active' : '');
      box.appendChild(dot);
    }
    engState.decisionsLeft = left;
        if (window.App && window.App.setDecisionsLeft) {
      window.App.setMaxDecisions(3);
      window.App.setDecisionsLeft(left);
    }
  }

  // ─── Шкалы ───
  function colorClass(value) {
    if (value < 50) return 'low';
    if (value < 83) return 'mid';
    return 'high';
  }

  function qualitativeWord(value, type) {
    if (type === 'fund' || type === 'pocket') {
      if (!value || value <= 0) return 'пусто';
      if (value < 30) return 'немного';
      if (value < 70) return 'нормально';
      return 'много';
    }
    if (value < 50) return 'низкое';
    if (value < 83) return 'среднее';
    return 'высокое';
  }

  function renderScales() {
    const { quality, equipment } = engState.indicators;

    const qFill = document.getElementById('eng-quality-fill');
    if (qFill) {
      qFill.style.width = quality + '%';
      qFill.className = 'scale-fill ' + colorClass(quality);
      document.getElementById('eng-quality-word').textContent = qualitativeWord(quality, 'quality');
    }

    const eFill = document.getElementById('eng-equipment-fill');
    if (eFill) {
      eFill.style.width = equipment + '%';
      eFill.className = 'scale-fill ' + colorClass(equipment);
      document.getElementById('eng-equipment-word').textContent = qualitativeWord(equipment, 'equipment');
    }

    const fund = engState.equipmentFund || 0;
    const fundPercent = Math.min(100, fund);
    const fFill = document.getElementById('eng-fund-fill');
    if (fFill) {
      fFill.style.width = fundPercent + '%';
      fFill.className = 'scale-fill ' + (fund > 0 ? 'mid' : 'low');
      document.getElementById('eng-fund-word').textContent = qualitativeWord(fund, 'fund');
    }

    const pocketBox = document.getElementById('eng-pocket-box');
    if (pocketBox) {
      if (engState.pocket > 0) {
        const pPercent = Math.min(100, engState.pocket);
        const pFill = document.getElementById('eng-pocket-fill');
        pFill.style.width = pPercent + '%';
        pFill.className = 'scale-fill high';
        document.getElementById('eng-pocket-word').textContent = qualitativeWord(engState.pocket, 'pocket');
        pocketBox.classList.remove('hidden');
      } else {
        pocketBox.classList.add('hidden');
      }
    }
  }

  function applySnapshot(data) {
    if (typeof data.decisionsLeft !== 'undefined') {
      engState.decisionsLeft = data.decisionsLeft;
      renderDecisions(data.decisionsLeft);
    }
    if (typeof data.pocket !== 'undefined') {
      engState.pocket = data.pocket;
    }
    if (typeof data.equipmentFund !== 'undefined') {
      engState.equipmentFund = data.equipmentFund;
    }
    if (data.indicators) {
      engState.indicators = data.indicators;
    }
    if (data.report) {
      engState.report = data.report;
    }
    renderScales();
  }

  // ─── Подменю ───
  const actionsBox = document.getElementById('engineer-actions');
  const submenuDistribute = document.getElementById('submenu-engineer-distribute');
  const submenuReport = document.getElementById('submenu-engineer-report');
  const shiftDone = document.getElementById('shift-done-engineer');

  function hideAllSubmenus() {
    submenuDistribute.classList.add('hidden');
    submenuReport.classList.add('hidden');
  }

  function showActions() {
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
    shiftDone.classList.add('hidden');
  }

  // ─── Кнопки ───
  document.getElementById('btn-eng-work').onclick = () => {
    socket.emit('engineer_work');
  };

  document.getElementById('btn-eng-drink').onclick = () => {
    socket.emit('engineer_drink');
  };

  document.getElementById('btn-eng-distribute').onclick = () => {
    actionsBox.classList.add('hidden');
    hideAllSubmenus();
    submenuDistribute.classList.remove('hidden');
    const previewFill = document.getElementById('eng-fund-preview-fill');
    previewFill.style.width = Math.min(100, engState.equipmentFund) + '%';
    previewFill.className = 'scale-fill mid';
  };

  document.getElementById('btn-back-eng-distribute').onclick = () => {
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
  };

  document.querySelectorAll('#submenu-engineer-distribute .btn[data-eng-lvl]').forEach(btn => {
    const lvl = parseInt(btn.dataset.engLvl, 10);
    btn.onclick = () => {
      socket.emit('engineer_distribute', { level: lvl });
      hideAllSubmenus();
      actionsBox.classList.remove('hidden');
    };
  });

  document.getElementById('btn-eng-report').onclick = () => {
    actionsBox.classList.add('hidden');
    hideAllSubmenus();
    submenuReport.classList.remove('hidden');
  };

  document.getElementById('btn-back-eng-report').onclick = () => {
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
  };

  document.getElementById('btn-eng-report-real').onclick = () => {
    socket.emit('engineer_submit_report', { real: true });
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
    toast('Отчёт отправлен Директору');
  };

  document.getElementById('btn-eng-report-fake').onclick = () => {
    socket.emit('engineer_submit_report', { real: false });
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
    toast('Отчёт отправлен Директору');
  };

  document.getElementById('btn-finish-engineer').onclick = () => {
    socket.emit('player_finish_shift');
  };

  // ─── События с сервера ───
  socket.on('engineer_update', (data) => {
    applySnapshot(data);
  });

  socket.on('decisions_update', ({ decisionsLeft }) => {
    if (state.myRole !== 'engineer') return;
    renderDecisions(decisionsLeft);
  });

  socket.on('engineer_drink_happened', ({ name }) => {
    if (state.myRole === 'engineer') return;
    toast(name + ' вчера перебрал');
  });

  socket.on('new_shift', ({ decisionsLeft }) => {
    if (state.myRole !== 'engineer') return;
    shiftDone.classList.add('hidden');
    actionsBox.classList.remove('hidden');
    renderDecisions(decisionsLeft || 3);
    hideAllSubmenus();
  });

  socket.on('shift_progress', ({ finished }) => {
    if (state.myRole !== 'engineer') return;
    const me = finished.find(p => p.id === socket.id);
    if (me && me.finished) {
      hideAllSubmenus();
      actionsBox.classList.add('hidden');
      shiftDone.classList.remove('hidden');
    }
  });

  // ─── Выбор оборудования ───
  socket.on('choose_equipment', ({ product, equipmentList }) => {
    if (state.myRole !== 'engineer') return;
    if (!equipmentList) return;

    // Названия продуктов
    const PRODUCT_TITLES = {
      bread:       'Хлеб',
      furniture:   'Мебель',
      electronics: 'Электроника'
    };

    // Подзаголовок: «Завод делает Хлеб. Что ставим в цеху?»
    const subtitle = document.getElementById('equipment-subtitle');
    if (subtitle) {
      const productTitle = PRODUCT_TITLES[product] || product;
      subtitle.textContent = 'Завод делает ' + productTitle + '. Что ставим в цеху?';
    }

    // SVG-символ продукта — общий для всех трёх кнопок
    const productSvg = (window.FactorySign && window.FactorySign.render)
      ? window.FactorySign.render(product)
      : '';

    // Отрисовка кнопок
    const box = document.getElementById('equipment-list');
    if (!box) return;
    box.innerHTML = '';

    Object.keys(equipmentList).forEach(key => {
      const option = equipmentList[key];

      const btn = document.createElement('button');
      btn.className = 'setup-btn';
      btn.innerHTML =
        '<div class="setup-thumb">' + productSvg + '</div>' +
        '<div class="setup-body">' +
          '<span class="setup-title">' + option.title + '</span>' +
          '<span class="setup-desc">' + option.desc + '</span>' +
        '</div>';

      btn.onclick = () => {
        socket.emit('engineer_choose_equipment', { equipment: key });
      };

      box.appendChild(btn);
    });

    show('screen-equipment');
  });

  // ─── Ожидание выбора оборудования ───
  socket.on('waiting_for_engineer', () => {
    if (state.myRole === 'engineer') return;
    show('screen-setup-wait');
  });

  // ─── Показ экрана смены ───
  socket.on('factory_chosen', ({ factory }) => {
    if (state.myRole && state.myRole !== 'engineer') return;

    mountSign(factory);

    show('screen-game-engineer');
    renderDecisions(engState.decisionsLeft);
    renderScales();
    showActions();
  });

  socket.on('game_over', ({ reason, type, biographies }) => {
    document.getElementById('end-reason').textContent = reason;

    if (type === 'sale' && biographies && biographies[socket.id]) {
      const bioBox = document.getElementById('end-biography');
      bioBox.textContent = biographies[socket.id];
      bioBox.classList.remove('hidden');
    }

    show('screen-end');
  });

  socket.on('error_msg', (msg) => toast(msg));

  console.log('Cabinet Engineer: модуль готов');
})();