// ═══════════════════════════════════════════
// КАБИНЕТ HR — люди, найм, отчёт
// ═══════════════════════════════════════════

(function () {
  const { socket, state, show, toast } = window.App;

  const hrState = {
    decisionsLeft: 3,
    pocket: 0,
    people: 50,
    money: 0,
    budgetPercent: 0,
    report: null
  };

  // ─── Знак завода ───
  function mountSign(factory) {
    if (!window.FactorySign) return;
    const product   = factory && factory.product;
    const building  = factory && factory.building;
    const st        = (factory && factory.state) || 'mid';
    const equipment = factory && factory.equipment;
    window.FactorySign.mount('factory-sign-hr', product, building, st, equipment);
  }

  // ─── Точки решений ───
  function renderDecisions(left) {
    const max = 3;
    const box = document.getElementById('decisions-dots-hr');
    if (!box) return;
    box.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('span');
      dot.className = 'decision-dot' + (i < left ? ' active' : '');
      box.appendChild(dot);
    }
    hrState.decisionsLeft = left;
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

  function peopleWord(value) {
    if (value < 50) return 'мало';
    if (value < 83) return 'средне';
    return 'много';
  }

  function qualitativeWord(value) {
    if (!value || value <= 0) return 'пусто';
    if (value < 30) return 'немного';
    if (value < 70) return 'нормально';
    return 'много';
  }

  function renderScales() {
    const peopleFill = document.getElementById('hr-people-fill');
    if (peopleFill) {
      peopleFill.style.width = hrState.people + '%';
      peopleFill.className = 'scale-fill ' + colorClass(hrState.people);
      document.getElementById('hr-people-word').textContent = peopleWord(hrState.people);
    }

    // Фонд зарплат = размер денег в бюджете (proxy)
    const fund = hrState.budgetPercent || 0;
    const fundFill = document.getElementById('hr-fund-fill');
    if (fundFill) {
      fundFill.style.width = Math.min(100, fund) + '%';
      fundFill.className = 'scale-fill ' + colorClass(fund);
      document.getElementById('hr-fund-word').textContent = qualitativeWord(fund);
    }

    // Карман
    const pocketBox = document.getElementById('hr-pocket-box');
    if (pocketBox) {
      if (hrState.pocket > 0) {
        const pPercent = Math.min(100, hrState.pocket);
        const pFill = document.getElementById('hr-pocket-fill');
        pFill.style.width = pPercent + '%';
        pFill.className = 'scale-fill high';
        document.getElementById('hr-pocket-word').textContent = qualitativeWord(hrState.pocket);
        pocketBox.classList.remove('hidden');
      } else {
        pocketBox.classList.add('hidden');
      }
    }
  }

  function applySnapshot(data) {
    if (typeof data.decisionsLeft !== 'undefined') {
      hrState.decisionsLeft = data.decisionsLeft;
      renderDecisions(data.decisionsLeft);
    }
    if (typeof data.pocket !== 'undefined') {
      hrState.pocket = data.pocket;
    }
    if (typeof data.people !== 'undefined') {
      hrState.people = data.people;
    }
    if (typeof data.money !== 'undefined') {
      hrState.money = data.money;
    }
    if (typeof data.budgetPercent !== 'undefined') {
      hrState.budgetPercent = data.budgetPercent;
    }
    if (data.report) {
      hrState.report = data.report;
    }
    renderScales();
  }

  // ─── Подменю ───
  const actionsBox = document.getElementById('hr-actions');
  const submenuHire = document.getElementById('submenu-hr-hire');
  const submenuReport = document.getElementById('submenu-hr-report');
  const shiftDone = document.getElementById('shift-done-hr');

  function hideAllSubmenus() {
    submenuHire.classList.add('hidden');
    submenuReport.classList.add('hidden');
  }

  function showActions() {
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
    shiftDone.classList.add('hidden');
  }

  // ─── Кнопки ───

  // Нанять — открывает подменю
  document.getElementById('btn-hr-hire').onclick = () => {
    actionsBox.classList.add('hidden');
    hideAllSubmenus();
    submenuHire.classList.remove('hidden');
  };

  document.getElementById('btn-back-hr-hire').onclick = () => {
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
  };

  document.getElementById('btn-hr-hire-normal').onclick = () => {
    socket.emit('hr_hire');
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
  };

  document.getElementById('btn-hr-hire-train').onclick = () => {
    socket.emit('hr_train');
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
  };

  // Уволить
  document.getElementById('btn-hr-fire').onclick = () => {
    socket.emit('hr_fire');
  };

  // Подделать штат
  document.getElementById('btn-hr-fake').onclick = () => {
    socket.emit('hr_fake_staff');
  };

  // Отчёт — открывает подменю
  document.getElementById('btn-hr-report').onclick = () => {
    actionsBox.classList.add('hidden');
    hideAllSubmenus();
    submenuReport.classList.remove('hidden');
  };

  document.getElementById('btn-back-hr-report').onclick = () => {
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
  };

  document.getElementById('btn-hr-report-real').onclick = () => {
    socket.emit('hr_submit_report', { real: true });
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
    toast('Отчёт отправлен Директору');
  };

  document.getElementById('btn-hr-report-fake').onclick = () => {
    socket.emit('hr_submit_report', { real: false });
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
    toast('Отчёт отправлен Директору');
  };

  // Завершить смену
  document.getElementById('btn-finish-hr').onclick = () => {
    socket.emit('player_finish_shift');
  };

  // ─── События с сервера ───
  socket.on('hr_update', (data) => {
    applySnapshot(data);
  });

  socket.on('decisions_update', ({ decisionsLeft }) => {
    if (state.myRole !== 'hr') return;
    renderDecisions(decisionsLeft);
  });

  socket.on('new_shift', ({ decisionsLeft }) => {
    if (state.myRole !== 'hr') return;
    shiftDone.classList.add('hidden');
    actionsBox.classList.remove('hidden');
    renderDecisions(decisionsLeft || 3);
    hideAllSubmenus();
  });

  socket.on('shift_progress', ({ finished }) => {
    if (state.myRole !== 'hr') return;
    const me = finished.find(p => p.id === socket.id);
    if (me && me.finished) {
      hideAllSubmenus();
      actionsBox.classList.add('hidden');
      shiftDone.classList.remove('hidden');
    }
  });

  // ─── Показ экрана смены ───
  socket.on('factory_chosen', ({ factory }) => {
    if (state.myRole && state.myRole !== 'hr') return;

    mountSign(factory);

    show('screen-game-hr');
    renderDecisions(hrState.decisionsLeft);
    renderScales();
    showActions();
  });

  socket.on('game_over', ({ reason, type, biographies }) => {
    if (state.myRole && state.myRole !== 'hr') return;

    document.getElementById('end-reason').textContent = reason;

    if (type === 'sale' && biographies && biographies[socket.id]) {
      const bioBox = document.getElementById('end-biography');
      bioBox.textContent = biographies[socket.id];
      bioBox.classList.remove('hidden');
    }

    show('screen-end');
  });

  socket.on('error_msg', (msg) => toast(msg));

  console.log('Cabinet HR: модуль готов');
})();