// ═══════════════════════════════════════════
// КАБИНЕТ БЕЗОПАСНИКА — проверки, сговор, донос
// ═══════════════════════════════════════════

(function () {
  const { socket, state, show, toast } = window.App;

  // ─── Локальное состояние ───
  const secState = {
    suspicions: 0,
    dossier: [],
    decisionsLeft: 2,
    deal: { pending: false, active: false, iAmSecurity: false, iAmDirector: false }
  };

  // ─── Отрисовка точек решений ───
  function renderDecisions(left) {
    const max = 2;
    const box = document.getElementById('decisions-dots-security');
    box.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('span');
      dot.className = 'decision-dot' + (i < left ? ' active' : '');
      box.appendChild(dot);
    }

    const noDecisions = left <= 0;
    document.getElementById('btn-security-check').disabled = noDecisions;
    document.getElementById('btn-security-report').disabled = noDecisions;
    document.getElementById('btn-security-deal').disabled = noDecisions || secState.deal.active;
    document.getElementById('btn-security-break-deal').disabled = left <= 0;
  }

  // ─── Отрисовка подозрений ───
  function renderSuspicions(value) {
    const fill = document.getElementById('suspicions-fill');
    const word = document.getElementById('suspicions-word');

    fill.style.width = value + '%';

    if (value <= 30) {
      fill.className = 'scale-fill low';
      word.textContent = 'чисто';
    } else if (value <= 70) {
      fill.className = 'scale-fill mid';
      word.textContent = 'есть вопросы';
    } else {
      fill.className = 'scale-fill high';
      word.textContent = 'опасно';
    }
  }

  // ─── Отрисовка досье ───
  function renderDossier(dossier) {
    const box = document.getElementById('dossier-list');
    box.innerHTML = '';

    if (!dossier || dossier.length === 0) {
      box.innerHTML = '<div class="dossier-empty">Пока пусто.</div>';
      return;
    }

    // Последние 5 записей — сверху
    const recent = dossier.slice(-5).reverse();

    recent.forEach(d => {
      const row = document.createElement('div');
      row.className = 'dossier-row';

      let label = '—';
      if (d.result === 'clean')  label = 'Чисто';
      if (d.result === 'little') label = 'Воровал мало';
      if (d.result === 'much')   label = 'Воровал много';

      row.innerHTML =
        '<span class="shift-num">Смена ' + d.shift + '</span>' +
        '<span class="target-name">' + d.targetName + '</span>' +
        '<span class="result ' + d.result + '">' + label + '</span>';

      box.appendChild(row);
    });
  }

  // ─── Отрисовка статуса сговора ───
  function renderDeal(deal) {
    const box = document.getElementById('deal-status');
    const btnDeal = document.getElementById('btn-security-deal');
    const btnBreak = document.getElementById('btn-security-break-deal');

    if (deal.active) {
      box.textContent = 'Сговор активен. Вы получаете 30% с каждой кражи.';
      box.className = 'deal-status active';
      box.classList.remove('hidden');

      btnDeal.style.display = 'none';
      btnBreak.style.display = 'block';
    } else if (deal.pending) {
      box.textContent = 'Предложение отправлено. Ждём ответа Директора…';
      box.className = 'deal-status pending';
      box.classList.remove('hidden');

      btnDeal.style.display = 'none';
      btnBreak.style.display = 'none';
    } else {
      box.classList.add('hidden');
      btnDeal.style.display = 'block';
      btnBreak.style.display = 'none';
    }
  }

  // ─── Показать результат проверки ───
  function showCheckResult(result, targetName, basedOnShift) {
    const box = document.getElementById('check-result-box');

    let label = '—';
    let cls = '';
    if (result === 'clean')  { label = 'Чисто';           cls = 'clean'; }
    if (result === 'little') { label = 'Воровал мало';    cls = 'little'; }
    if (result === 'much')   { label = 'Воровал много';   cls = 'much'; }

    box.className = 'check-result-box ' + cls;
    box.innerHTML =
      label +
      '<span class="result-sub">' + targetName +
      ' · проверка по смене ' + basedOnShift + '</span>';

    // Показать подменю результата
    hideAllSubmenus();
    document.getElementById('submenu-check-result').classList.remove('hidden');
  }

  // ─── Подменю ───
  function hideAllSubmenus() {
    document.getElementById('submenu-check').classList.add('hidden');
    document.getElementById('submenu-report').classList.add('hidden');
    document.getElementById('submenu-check-result').classList.add('hidden');
  }

  function showActions() {
    hideAllSubmenus();
    document.getElementById('security-actions').classList.remove('hidden');
    document.getElementById('shift-done-security').classList.add('hidden');
  }

  // ─── Кнопка: Проверить ───
  document.getElementById('btn-security-check').onclick = () => {
    // Найти Директора (пока единственная цель)
    const target = state.players && state.players.find(p => p.role === 'director');
    if (!target) {
      toast('Некого проверять');
      return;
    }

    hideAllSubmenus();
    const submenu = document.getElementById('submenu-check');
    const listBtn = document.getElementById('btn-check-list');
    listBtn.textContent = target.name;
    listBtn.dataset.checkTarget = target.id;
    submenu.classList.remove('hidden');
  };

  document.getElementById('btn-back-check').onclick = () => {
    hideAllSubmenus();
    document.getElementById('security-actions').classList.remove('hidden');
  };

  document.getElementById('btn-check-list').onclick = (e) => {
    const targetId = e.currentTarget.dataset.checkTarget;
    if (!targetId) return;
    socket.emit('security_check', { targetId: targetId });
  };

  // ─── Кнопка: Донести ───
  document.getElementById('btn-security-report').onclick = () => {
    // Найти в досье, кого можно донести
    const recent = secState.dossier.filter(d => d.shift >= secState.currentShift - 2);
    if (recent.length === 0) {
      toast('Некого доносить — сначала проверьте');
      return;
    }

    hideAllSubmenus();
    const submenu = document.getElementById('submenu-report');
    const listBtn = document.getElementById('btn-report-list');
    const last = recent[recent.length - 1];
    listBtn.textContent = last.targetName;
    listBtn.dataset.reportTarget = last.targetId;
    submenu.classList.remove('hidden');
  };

  document.getElementById('btn-back-report').onclick = () => {
    hideAllSubmenus();
    document.getElementById('security-actions').classList.remove('hidden');
  };

  document.getElementById('btn-report-list').onclick = (e) => {
    const targetId = e.currentTarget.dataset.reportTarget;
    if (!targetId) return;
    socket.emit('security_report', { targetId: targetId });
  };

  // ─── Кнопка: Сговор ───
  document.getElementById('btn-security-deal').onclick = () => {
    socket.emit('security_offer_deal');
  };

  // ─── Кнопка: Разорвать сговор ───
  document.getElementById('btn-security-break-deal').onclick = () => {
    socket.emit('security_break_deal');
  };

  // ─── Кнопка: Завершить смену ───
  document.getElementById('btn-finish-security').onclick = () => {
    socket.emit('player_finish_shift');
  };

  document.getElementById('btn-back-check-result').onclick = () => {
    hideAllSubmenus();
    document.getElementById('security-actions').classList.remove('hidden');
  };

  // ═══════════════════════════════════════════
  // СОБЫТИЯ С СЕРВЕРА
  // ═══════════════════════════════════════════
  socket.on('security_update', (data) => {
    if (typeof data.suspicions !== 'undefined') {
      secState.suspicions = data.suspicions;
      renderSuspicions(data.suspicions);
    }
    if (data.dossier) {
      secState.dossier = data.dossier;
      renderDossier(data.dossier);
    }
    if (typeof data.decisionsLeft !== 'undefined') {
      secState.decisionsLeft = data.decisionsLeft;
      renderDecisions(data.decisionsLeft);
    }
    if (data.deal) {
      secState.deal = data.deal;
      renderDeal(data.deal);
    }
  });

  socket.on('security_check_result', ({ result, targetName, basedOnShift }) => {
    showCheckResult(result, targetName, basedOnShift);
  });

  socket.on('deal_offered', () => {
    // Это для Директора — обрабатывает director.js
  });

  socket.on('deal_activated', () => {
    secState.deal.active = true;
    secState.deal.pending = false;
    renderDeal(secState.deal);
    toast('Сговор заключён');
  });

  socket.on('deal_declined', () => {
    secState.deal.pending = false;
    renderDeal(secState.deal);
    toast('Директор отказался');
  });

  socket.on('deal_broken', () => {
    secState.deal.active = false;
    secState.deal.pending = false;
    renderDeal(secState.deal);
    toast('Сговор разорван');
  });

  socket.on('report_happened', ({ targetName, confiscated }) => {
    // Это событие для всех — обрабатываем где нужно
    console.log('Донос:', targetName, 'конфисковано', confiscated);
  });

  // ─── Новая смена ───
  socket.on('new_shift', ({ decisionsLeft }) => {
    document.getElementById('shift-done-security').classList.add('hidden');
    document.getElementById('security-actions').classList.remove('hidden');
    renderDecisions(decisionsLeft || 0);
    hideAllSubmenus();
  });

  // ─── Завершил смену ───
  socket.on('shift_progress', ({ finished }) => {
    const me = finished.find(p => p.id === socket.id);
    if (me && me.finished) {
      hideAllSubmenus();
      document.getElementById('security-actions').classList.add('hidden');
      document.getElementById('shift-done-security').classList.remove('hidden');
    }
  });

  // ─── Получили роль — если мы Безопасник, показать экран ───
  socket.on('your_role', ({ role }) => {
    if (role === 'security') {
      // Ничего пока — переход сделает badge.js
    }
  });

  // ─── Игра началась (пришёл завод) ───
  socket.on('factory_chosen', ({ type }) => {
    if (state.myRole !== 'security') return;

    show('screen-game-security');
    renderDecisions(secState.decisionsLeft);
    renderSuspicions(secState.suspicions);
    renderDossier(secState.dossier);
    renderDeal(secState.deal);
    showActions();
  });

  // ─── Подсказки для сговора — Директор получит модалку, но Безопасник наблюдает
  socket.on('security_check_result_self', () => {});

  console.log('Cabinet Security: модуль готов');
})();