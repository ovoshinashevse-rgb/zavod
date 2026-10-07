// ═══════════════════════════════════════════
// КАБИНЕТ БЕЗОПАСНИКА — проверки, сговор, запросы, обнал
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
    deal: { pending: false, active: false, iAmSecurity: false, iAmDirector: false },
    reportChecks: [],
    luxuryTargets: []
  };

  let luxuryTarget = null;

  function mountSign(factory) {
    if (!window.FactorySign) return;
    const product   = factory && factory.product;
    const building  = factory && factory.building;
    const st        = (factory && factory.state) || 'mid';
    const equipment = factory && factory.equipment;
    window.FactorySign.mount('factory-sign-security', product, building, st, equipment);
  }

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
    secState.decisionsLeft = left;
  }

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

  function qualitativeWord(value) {
    if (!value || value <= 0) return 'пусто';
    if (value < 30) return 'немного';
    if (value < 70) return 'нормально';
    return 'много';
  }

  function renderReturns(value) {
    const fill = document.getElementById('returns-fill');
    const word = document.getElementById('returns-word');
    if (!fill || !word) return;

    const percent = Math.min(100, value);
    fill.style.width = percent + '%';
    fill.className = 'scale-fill ' + (value > 0 ? 'high' : 'mid');
    word.textContent = qualitativeWord(value);
  }

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
      if (d.result === 'pending') label = 'Идет проверка';
      if (d.result === 'clean')   label = 'Чисто';
      if (d.result === 'little')  label = 'Откат был';
      if (d.result === 'much')    label = 'Откат серьёзный';
      if (d.luxuryFound)          label = 'Найден обнал';

      row.innerHTML =
        '<span class="shift-num">Смена ' + d.shift + '</span>' +
        '<span class="target-name">' + (d.targetTitle || '—') + '</span>' +
        '<span class="result ' + d.result + '">' + label + '</span>';

      box.appendChild(row);
    });
  }

  // ─── Список обнала ───
  function renderLuxuryList(target) {
    const box = document.getElementById('luxury-list');
    if (!box) return;
    box.innerHTML = '';

    if (!target || !target.list || target.list.length === 0) {
      box.innerHTML = '<div class="luxury-empty">Ничего не найдено.</div>';
      return;
    }

    target.list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'luxury-item';
      row.innerHTML =
        '<span class="luxury-item-name">' + item.title + '</span>' +
        '<span class="luxury-item-price">' + item.price + '</span>';
      box.appendChild(row);
    });
  }

  // ─── Отчёты по проверкам ───
  function renderCheckReports(dossier) {
    const box = document.getElementById('check-reports-list');
    if (!box) return;
    box.innerHTML = '';

    const recent = (dossier || []).slice(-5).reverse();

    if (recent.length === 0) {
      box.innerHTML = '<div class="dossier-empty">Пока нет проверок.</div>';
      return;
    }

    recent.forEach(d => {
      const row = document.createElement('div');
      row.className = 'dossier-row';
      row.style.flexDirection = 'column';
      row.style.alignItems = 'flex-start';
      row.style.gap = '8px';

      let label = '—';
      if (d.result === 'pending') label = 'Идет проверка';
      if (d.result === 'clean')   label = 'Чисто';
      if (d.result === 'little')  label = 'Откат был';
      if (d.result === 'much')    label = 'Откат серьёзный';
      if (d.luxuryFound)          label = 'Найден обнал';

      row.innerHTML =
        '<div style="display:flex;justify-content:space-between;width:100%;">' +
          '<span class="shift-num">Смена ' + d.shift + '</span>' +
          '<span class="result ' + d.result + '">' + label + '</span>' +
        '</div>';

      if (d.luxuryFound) {
        const btnOpen = document.createElement('button');
        btnOpen.className = 'btn btn-small';
        btnOpen.textContent = 'Открыть обнал';
        btnOpen.onclick = () => {
          openLuxuryTarget({
            targetId: d.targetId,
            targetTitle: d.targetTitle,
            list: d.luxuryList || [],
            total: d.luxuryTotal || 0
          });
        };
        row.appendChild(btnOpen);
      }

      if (d.result === 'little' || d.result === 'much') {
        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '8px';
        btnRow.style.width = '100%';

        const btnConf = document.createElement('button');
        btnConf.className = 'btn btn-small';
        btnConf.textContent = 'Конфисковать';
        btnConf.disabled = secState.decisionsLeft < 1;
        btnConf.onclick = () => {
          socket.emit('security_report', { targetId: d.targetId });
        };

        const btnDeal = document.createElement('button');
        btnDeal.className = 'btn btn-small secondary';
        btnDeal.textContent = 'Сговор';
        btnDeal.disabled = secState.decisionsLeft < 2 || secState.deal.active;
        btnDeal.onclick = () => {
          socket.emit('security_offer_deal');
        };

        btnRow.appendChild(btnConf);
        btnRow.appendChild(btnDeal);
        row.appendChild(btnRow);
      }

      box.appendChild(row);
    });

    if (secState.deal.active) {
      const row = document.createElement('div');
      row.className = 'dossier-row';
      const btn = document.createElement('button');
      btn.className = 'btn btn-small secondary';
      btn.textContent = 'Разорвать сговор';
      btn.disabled = secState.decisionsLeft < 1;
      btn.onclick = () => socket.emit('security_break_deal');
      row.appendChild(btn);
      box.appendChild(row);
    }
  }

  // ─── Отчёты по запросам ───
  function renderRequestReports() {
    const box = document.getElementById('request-reports-list');
    if (!box) return;
    box.innerHTML = '';

    if (!secState.reportChecks || secState.reportChecks.length === 0) {
      box.innerHTML = '<div class="dossier-empty">Пока нет запросов.</div>';
      return;
    }

    secState.reportChecks.forEach(c => {
      const row = document.createElement('div');
      row.className = 'dossier-row';
      row.style.flexDirection = 'column';
      row.style.alignItems = 'flex-start';
      row.style.gap = '8px';

      row.innerHTML =
        '<div style="display:flex;justify-content:space-between;width:100%;">' +
          '<span class="shift-num">Смена ' + c.requestedShift + '</span>' +
          '<span class="target-name">' + c.title + '</span>' +
        '</div>' +
        '<div style="font-size:14px;opacity:0.7;">Директор просит проверить отчёт.</div>';

      const btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.gap = '8px';
      btnRow.style.width = '100%';

      const btnCover = document.createElement('button');
      btnCover.className = 'btn btn-small secondary';
      btnCover.textContent = 'Прикрыть';
      btnCover.disabled = secState.decisionsLeft < 2;
      btnCover.onclick = () => {
        socket.emit('security_cover_department', { indicator: c.indicator });
      };

      const btnForged = document.createElement('button');
      btnForged.className = 'btn btn-small';
      btnForged.textContent = 'Ответить «подделан»';
      btnForged.onclick = () => {
        socket.emit('security_answer_forged', { indicator: c.indicator });
      };

      btnRow.appendChild(btnCover);
      btnRow.appendChild(btnForged);
      row.appendChild(btnRow);

      box.appendChild(row);
    });
  }

  function renderDeal(deal) {
    const box = document.getElementById('deal-status');
    if (!box) return;

    if (deal.active) {
      box.textContent = 'Сговор активен. Вы получаете долю с каждого отката.';
      box.className = 'deal-status active';
      box.classList.remove('hidden');
    } else if (deal.pending) {
      box.textContent = 'Предложение отправлено. Ждём ответа Директора…';
      box.className = 'deal-status pending';
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }

  const securityActions = document.getElementById('security-actions');

  function hideAllSubmenus() {
    document.getElementById('submenu-security-check').classList.add('hidden');
    document.getElementById('submenu-security-check-reports').classList.add('hidden');
    document.getElementById('submenu-security-request-reports').classList.add('hidden');
    const luxuryEl = document.getElementById('submenu-security-luxury');
    if (luxuryEl) luxuryEl.classList.add('hidden');
  }

  function showActions() {
    hideAllSubmenus();
    securityActions.classList.remove('hidden');
    document.getElementById('shift-done-security').classList.add('hidden');
  }

  function openLuxuryTarget(target) {
    luxuryTarget = target;

    securityActions.classList.add('hidden');
    hideAllSubmenus();

    renderLuxuryList(target);

    const luxuryEl = document.getElementById('submenu-security-luxury');
    if (luxuryEl) luxuryEl.classList.remove('hidden');
  }

  document.getElementById('btn-security-check').onclick = () => {
    const target = state.players && state.players.find(p => p.role === 'director');
    if (!target) { toast('Некого проверять'); return; }

    securityActions.classList.add('hidden');
    hideAllSubmenus();
    const submenu = document.getElementById('submenu-security-check');
    const listBtn = document.getElementById('btn-check-list');
    listBtn.textContent = 'Директор';
    listBtn.dataset.checkTarget = target.id;
    submenu.classList.remove('hidden');
  };

  document.getElementById('btn-security-check-reports').onclick = () => {
    securityActions.classList.add('hidden');
    hideAllSubmenus();
    document.getElementById('submenu-security-check-reports').classList.remove('hidden');
    renderCheckReports(secState.dossier);
  };

  document.getElementById('btn-security-request-reports').onclick = () => {
    securityActions.classList.add('hidden');
    hideAllSubmenus();
    document.getElementById('submenu-security-request-reports').classList.remove('hidden');
    renderRequestReports();
  };

  document.getElementById('btn-back-security-check').onclick = () => {
    showActions();
  };

  document.getElementById('btn-back-security-check-reports').onclick = () => {
    showActions();
  };

  document.getElementById('btn-back-security-request-reports').onclick = () => {
    showActions();
  };

  const btnBackLuxury = document.getElementById('btn-back-security-luxury');
  if (btnBackLuxury) {
    btnBackLuxury.onclick = () => {
      showActions();
    };
  }

  const btnConfiscate = document.getElementById('btn-confiscate-luxury');
  if (btnConfiscate) {
    btnConfiscate.onclick = () => {
      if (!luxuryTarget) return;
      socket.emit('security_confiscate_luxury', { targetId: luxuryTarget.targetId });
      showActions();
    };
  }

  const btnRumor = document.getElementById('btn-spread-rumor');
  if (btnRumor) {
    btnRumor.onclick = () => {
      if (!luxuryTarget) return;
      socket.emit('security_spread_rumor', { targetId: luxuryTarget.targetId });
      showActions();
    };
  }

  document.getElementById('btn-check-list').onclick = (e) => {
    const targetId = e.currentTarget.dataset.checkTarget;
    if (!targetId) return;
    socket.emit('security_check', { targetId: targetId });
  };

  document.getElementById('btn-finish-security').onclick = () => {
    socket.emit('player_finish_shift');
  };

  // ═══════════════════════════════════════════
  // СОБЫТИЯ
  // ═══════════════════════════════════════════
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
    if (data.reportChecks) {
      secState.reportChecks = data.reportChecks;
    }
    if (data.luxuryTargets) {
      secState.luxuryTargets = data.luxuryTargets;
    }
  });

  socket.on('security_check_pending', ({ targetTitle, luxuryFound }) => {
    if (luxuryFound) {
      toast('У ' + targetTitle + ' найден обнал');
      setTimeout(() => {
        const sec = secState.luxuryTargets && secState.luxuryTargets[0];
        if (sec) openLuxuryTarget(sec);
      }, 200);
    } else {
      toast('Проверка принята. Результат — в следующую смену.');
    }
    showActions();
  });

  socket.on('security_check_results', ({ results }) => {
    if (!results || results.length === 0) return;
    const r = results[0];
    let label = 'Чисто';
    if (r.result === 'little') label = 'Откат был';
    if (r.result === 'much')   label = 'Откат серьёзный';

    toast('Проверка: ' + label);
  });

  socket.on('luxury_confiscated', ({ total, targetRole }) => {
    toast('Обнал конфискован: ' + (total || 0));
  });

  socket.on('rumor_spread', ({ targetRole }) => {
    toast('Слух про ' + targetRole + ' разошёлся');
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

  socket.on('report_happened', () => {
    toast('Вы вернули деньги заводу');
  });

  socket.on('new_shift', ({ shift, decisionsLeft }) => {
    secState.currentShift = shift || (secState.currentShift + 1);
    document.getElementById('shift-done-security').classList.add('hidden');
    securityActions.classList.remove('hidden');
    renderDecisions(decisionsLeft || 0);
    hideAllSubmenus();
  });

  socket.on('shift_progress', ({ finished }) => {
    if (state.myRole !== 'security') return;
    const me = finished.find(p => p.id === socket.id);
    if (me && me.finished) {
      hideAllSubmenus();
      securityActions.classList.add('hidden');
      document.getElementById('shift-done-security').classList.remove('hidden');
    }
  });

  socket.on('factory_chosen', ({ factory }) => {
    if (state.myRole !== 'security') return;

    mountSign(factory);

    show('screen-game-security');
    renderDecisions(secState.decisionsLeft);
    renderSuspicions(secState.suspicions);
    renderReturns(secState.returns);
    renderKickbacks(secState.kickbacks);
    renderDossier(secState.dossier);
    renderDeal(secState.deal);
    showActions();
  });

  socket.on('game_over', ({ reason, type, biographies }) => {
    if (state.myRole !== 'security') return;

    document.getElementById('end-reason').textContent = reason;

    if (type === 'sale' && biographies && biographies[socket.id]) {
      const bioBox = document.getElementById('end-biography');
      bioBox.textContent = biographies[socket.id];
      bioBox.classList.remove('hidden');
    }

    show('screen-end');
  });

  console.log('Cabinet Security: модуль готов');
})();