// ═══════════════════════════════════════════
// КАБИНЕТ БЕЗОПАСНИКА — проверки, сговор, донос
// ═══════════════════════════════════════════

(function () {
  const { socket, state, show, toast } = window.App;

  const secState = {
    suspicions: 0,
    returns: 0,
    kickbacks: 0,
    dossier: [],
    decisionsLeft: 2,
    currentShift: 1,
    deal: { pending: false, active: false, iAmSecurity: false, iAmDirector: false }
  };

  // ─── Точки решений ───
  function renderDecisions(left) {
    const max = 2;
    const box = document.getElementById('decisions-dots-security');
    if (!box) return;
    box.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('span');
      dot.className = 'decision-dot' + (i < left ? ' active' : '');
      box.appendChild(dot);
    }

    const noDecisions = left <= 0;
    const btnCheck = document.getElementById('btn-security-check');
    const btnReport = document.getElementById('btn-security-report');
    const btnDeal = document.getElementById('btn-security-deal');
    const btnBreak = document.getElementById('btn-security-break-deal');

    if (btnCheck) btnCheck.disabled = noDecisions;
    if (btnReport) btnReport.disabled = noDecisions;
    if (btnDeal) btnDeal.disabled = noDecisions || secState.deal.active;
    if (btnBreak) btnBreak.disabled = noDecisions;
  }

  // ─── Подозрения ───
  function renderSuspicions(value) {
    const fill = document.getElementById('suspicions-fill');
    const word = document.getElementById('suspicions-word');
    if (!fill || !word) return;

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

  // ─── Слова для качественных шкал ───
  function qualitativeWord(value) {
    if (!value || value <= 0) return 'пусто';
    if (value < 30) return 'немного';
    if (value < 70) return 'нормально';
    return 'много';
  }

  // ─── Возврат ───
  function renderReturns(value) {
    const fill = document.getElementById('returns-fill');
    const word = document.getElementById('returns-word');
    if (!fill || !word) return;

    const percent = Math.min(100, value);
    fill.style.width = percent + '%';
    fill.className = 'scale-fill ' + (value > 0 ? 'high' : 'mid');
    word.textContent = qualitativeWord(value);
  }

  // ─── Откат ───
  function renderKickbacks(value) {
    const fill = document.getElementById('kickbacks-fill');
    const word = document.getElementById('kickbacks-word');
    if (!fill || !word) return;

    const percent = Math.min(100, value);
    fill.style.width = percent + '%';
    fill.className = 'scale-fill ' + (value > 0 ? 'low' : 'mid');
    word.textContent = qualitativeWord(value);
  }

  // ─── Досье ───
  function renderDossier(dossier) {
    const box = document.getElementById('dossier-list');
    if (!box) return;
    box.innerHTML = '';

    if (!dossier || dossier.length === 0) {
      box.innerHTML = '<div class="dossier-empty">Пока пусто.</div>';
      return;
    }

    const recent = dossier.slice(-5).reverse();

    recent.forEach(d => {
      const row = document.createElement('div');
      row.className = 'dossier-row';

      let label = '—';
      if (d.result === 'pending') label = 'Ждёт ответа';
      if (d.result === 'clean')   label = 'Чисто';
      if (d.result === 'little')  label = 'Откат был';
      if (d.result === 'much')    label = 'Откат серьёзный';

      row.innerHTML =
        '<span class="shift-num">Смена ' + d.shift + '</span>' +
        '<span class="target-name">' + (d.targetTitle || '—') + '</span>' +
        '<span class="result ' + d.result + '">' + label + '</span>';

      box.appendChild(row);
    });
  }

  // ─── Сговор ───
  function renderDeal(deal) {
    const box = document.getElementById('deal-status');
    const btnDeal = document.getElementById('btn-security-deal');
    const btnBreak = document.getElementById('btn-security-break-deal');

    if (deal.active) {
      box.textContent = 'Сговор активен. Вы получаете долю с каждого отката.';
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

  function showCheckResult(result, targetTitle) {
    const box = document.getElementById('check-result-box');

    let label = '—';
    let cls = '';
    if (result === 'clean')  { label = 'Чисто';           cls = 'clean'; }
    if (result === 'little') { label = 'Откат был';       cls = 'little'; }
    if (result === 'much')   { label = 'Откат серьёзный'; cls = 'much'; }

    box.className = 'check-result-box ' + cls;
    box.innerHTML = label + '<span class="result-sub">' + targetTitle + '</span>';

    hideAllSubmenus();
    document.getElementById('submenu-check-result').classList.remove('hidden');
  }

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

  // ─── Кнопки ───
  document.getElementById('btn-security-check').onclick = () => {
    const target = state.players && state.players.find(p => p.role === 'director');
    if (!target) { toast('Некого проверять'); return; }

    hideAllSubmenus();
    const submenu = document.getElementById('submenu-check');
    const listBtn = document.getElementById('btn-check-list');
    listBtn.textContent = 'Директор';
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

  document.getElementById('btn-security-report').onclick = () => {
    const ready = secState.dossier
      .filter(d => d.result && d.result !== 'pending')
      .sort((a, b) => b.shift - a.shift);

    if (ready.length === 0) {
      toast('Нет проверок с результатом');
      return;
    }

    const last = ready[0];

    hideAllSubmenus();
    const submenu = document.getElementById('submenu-report');
    const listBtn = document.getElementById('btn-report-list');
    listBtn.textContent = 'Директор';
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

  document.getElementById('btn-security-deal').onclick = () => socket.emit('security_offer_deal');
  document.getElementById('btn-security-break-deal').onclick = () => socket.emit('security_break_deal');
  document.getElementById('btn-finish-security').onclick = () => socket.emit('player_finish_shift');

  document.getElementById('btn-back-check-result').onclick = () => {
    hideAllSubmenus();
    document.getElementById('security-actions').classList.remove('hidden');
  };

  // ─── События с сервера ───
  socket.on('security_update', (data) => {
    if (typeof data.suspicions !== 'undefined') {
      secState.suspicions = data.suspicions;
      renderSuspicions(data.suspicions);
    }
    if (typeof data.returns !== 'undefined') {
      secState.returns = data.returns;
      renderReturns(data.returns);
    }
    if (typeof data.kickbacks !== 'undefined') {
      secState.kickbacks = data.kickbacks;
      renderKickbacks(data.kickbacks);
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

  socket.on('security_check_pending', () => {
    toast('Проверка принята. Результат — в следующую смену.');
    hideAllSubmenus();
    document.getElementById('security-actions').classList.remove('hidden');
  });

  socket.on('security_check_results', ({ results }) => {
    if (!results || results.length === 0) return;
    const r = results[0];
    showCheckResult(r.result, r.targetTitle);
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

  socket.on('report_happened', ({ targetTitle }) => {
    toast('Вы вернули деньги заводу');
  });

  socket.on('new_shift', ({ shift, decisionsLeft }) => {
    secState.currentShift = shift || (secState.currentShift + 1);
    document.getElementById('shift-done-security').classList.add('hidden');
    document.getElementById('security-actions').classList.remove('hidden');
    renderDecisions(decisionsLeft || 0);
    hideAllSubmenus();
  });

  socket.on('shift_progress', ({ finished }) => {
    if (state.myRole !== 'security') return;
    const me = finished.find(p => p.id === socket.id);
    if (me && me.finished) {
      hideAllSubmenus();
      document.getElementById('security-actions').classList.add('hidden');
      document.getElementById('shift-done-security').classList.remove('hidden');
    }
  });

  socket.on('factory_chosen', ({ type }) => {
    if (state.myRole !== 'security') return;

    show('screen-game-security');
    renderDecisions(secState.decisionsLeft);
    renderSuspicions(secState.suspicions);
    renderReturns(secState.returns);
    renderKickbacks(secState.kickbacks);
    renderDossier(secState.dossier);
    renderDeal(secState.deal);
    showActions();
  });

  console.log('Cabinet Security: модуль готов');
})();