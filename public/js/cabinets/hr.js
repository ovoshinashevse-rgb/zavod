// ═══════════════════════════════════════════
// КАБИНЕТ HR — найм, кумовство, отчёт
// ═══════════════════════════════════════════

(function () {
  const { socket, state, show, toast } = window.App;

  const hrState = {
    decisionsLeft: 3,
    pocket: 0,
    people: 50,
    effectivePeople: 50,
    nepotism: 0,
    familyCount: 0,
    family: [],
    money: 0,
    budgetPercent: 0,
    hiring: null,
    report: null
  };

  // Выбор при пристройке родни
  const adoptChoice = {
    kind: null,
    place: null
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

  function nepotismWord(value) {
    if (value <= 0) return 'пусто';
    if (value < 30) return 'немного';
    if (value < 70) return 'нормально';
    return 'много';
  }

  function renderScales() {
    // Люди
    const peopleFill = document.getElementById('hr-people-fill');
    if (peopleFill) {
      peopleFill.style.width = hrState.effectivePeople + '%';
      peopleFill.className = 'scale-fill ' + colorClass(hrState.effectivePeople);
      document.getElementById('hr-people-word').textContent = peopleWord(hrState.effectivePeople);
    }

    // Кумовство — одна шкала, показывается только если есть
    const nepBox = document.getElementById('hr-nepotism-box');
    if (nepBox) {
      if (hrState.nepotism > 0) {
        const fill = document.getElementById('hr-nepotism-fill');
        fill.style.width = hrState.nepotism + '%';
        fill.className = 'scale-fill ' + colorClass(hrState.nepotism);
        document.getElementById('hr-nepotism-word').textContent = nepotismWord(hrState.nepotism);
        nepBox.classList.remove('hidden');
      } else {
        nepBox.classList.add('hidden');
      }
    }
  }

  // ─── Снимок ───
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
    if (typeof data.effectivePeople !== 'undefined') {
      hrState.effectivePeople = data.effectivePeople;
    }
    if (typeof data.nepotism !== 'undefined') {
      hrState.nepotism = data.nepotism;
    }
    if (typeof data.familyCount !== 'undefined') {
      hrState.familyCount = data.familyCount;
    }
    if (data.family) {
      hrState.family = data.family;
    }
    if (typeof data.money !== 'undefined') {
      hrState.money = data.money;
    }
    if (typeof data.budgetPercent !== 'undefined') {
      hrState.budgetPercent = data.budgetPercent;
    }
    if (data.hiring) {
      hrState.hiring = data.hiring;
    }
    if (data.report) {
      hrState.report = data.report;
    }
    renderScales();
  }

  // ═══════════════════════════════════════════
  // ПОДМЕНЮ
  // ═══════════════════════════════════════════
  const actionsBox          = document.getElementById('hr-actions');
  const submenuHire         = document.getElementById('submenu-hr-hire');
  const submenuHireStep     = document.getElementById('submenu-hr-hire-step');
  const submenuFire         = document.getElementById('submenu-hr-fire');
  const submenuNepotism     = document.getElementById('submenu-hr-nepotism');
  const submenuWho          = document.getElementById('submenu-hr-who');
  const submenuWhere        = document.getElementById('submenu-hr-where');
  const submenuPosition     = document.getElementById('submenu-hr-position');
  const submenuFireRelative = document.getElementById('submenu-hr-fire-relative');
  const shiftDone           = document.getElementById('shift-done-hr');

  function hideAllSubmenus() {
    [submenuHire, submenuHireStep, submenuFire, submenuNepotism,
     submenuWho, submenuWhere, submenuPosition, submenuFireRelative]
      .forEach(el => el && el.classList.add('hidden'));
  }

  function showActions() {
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
    shiftDone.classList.add('hidden');
  }

  // ═══════════════════════════════════════════
  // НАЙМ — динамические шаги
  // ═══════════════════════════════════════════

  // Опции шагов и их названия
  const STEP_TITLES = {
    where:     'Где искать?',
    wait:      'Сколько ждать?',
    interview: 'Как собеседовать?',
    check:     'Как проверять?',
    from:      'Откуда сманить?',
    how:       'Как сманить?',
    whom:      'Кого переучить?',
    method:    'Как переучить?'
  };

  const STEP_OPTIONS = {
    where: [
      { key: 'site',  title: 'На сайте',   hint: 'Дороже, но качественнее' },
      { key: 'paper', title: 'В газете',   hint: 'Средне' },
      { key: 'gates', title: 'У ворот',    hint: 'Дёшево, но кто попало' }
    ],
    wait: [
      { key: 'day',   title: 'День',       hint: 'Быстро, но мало' },
      { key: 'week',  title: 'Неделя',     hint: 'Средне' },
      { key: 'month', title: 'Месяц',      hint: 'Долго, но лучшие' }
    ],
    interview: [
      { key: 'fast',   title: 'Быстро',    hint: 'Сразу берём' },
      { key: 'normal', title: 'Нормально', hint: 'Поговорим' },
      { key: 'strict', title: 'Строго',    hint: 'С пристрастием' }
    ],
    check: [
      { key: 'light',    title: 'Упрощённо',         hint: 'Не проверяем' },
      { key: 'normal',   title: 'Обычно',            hint: 'Как все' },
      { key: 'security', title: 'Через Безопасника', hint: 'Дорого, надёжно' }
    ],
    from: [
      { key: 'neighbor', title: 'Соседний цех',  hint: 'Дёшево' },
      { key: 'other',    title: 'Другой завод',  hint: 'Средне' },
      { key: 'abroad',   title: 'Из-за границы', hint: 'Дорого, лучшие' }
    ],
    how: [
      { key: 'money',      title: 'Деньгами',    hint: 'Дорого, надёжно' },
      { key: 'conditions', title: 'Условиями',   hint: 'Средне' },
      { key: 'contacts',   title: 'Знакомством', hint: 'Дёшево' }
    ],
    whom: [
      { key: 'young',       title: 'Молодых',  hint: 'Перспективные' },
      { key: 'experienced', title: 'Опытных',  hint: 'Как есть' },
      { key: 'all',         title: 'Всех',     hint: 'Массово' }
    ],
    method: [
      { key: 'courses',  title: 'Курсы',      hint: 'Дорого, качественно' },
      { key: 'mentor',   title: 'Наставник',  hint: 'Средне' },
      { key: 'practice', title: 'Практика',   hint: 'Дёшево' }
    ]
  };

  function renderHireStep(stepKey) {
    const title = document.getElementById('hr-hire-step-title');
    if (title) title.textContent = STEP_TITLES[stepKey] || 'Выбор';

    const box = document.getElementById('hr-hire-step-options');
    if (!box) return;
    box.innerHTML = '';

    const options = STEP_OPTIONS[stepKey] || [];
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.innerHTML =
        '<span class="option-title">' + opt.title + '</span>' +
        '<span class="option-hint">' + opt.hint + '</span>';

      btn.onclick = () => {
        socket.emit('hr_hire_step', { step: stepKey, choice: opt.key });
      };

      box.appendChild(btn);
    });
  }

  // Кнопки главного экрана
  document.getElementById('btn-hr-hire').onclick = () => {
    actionsBox.classList.add('hidden');
    hideAllSubmenus();
    submenuHire.classList.remove('hidden');
  };

  document.getElementById('btn-back-hr-hire').onclick = () => {
    showActions();
  };

  document.querySelectorAll('#submenu-hr-hire .btn[data-hire-path]').forEach(btn => {
    btn.onclick = () => {
      socket.emit('hr_hire_start', { path: btn.dataset.hirePath });
    };
  });

  document.getElementById('btn-back-hr-hire-step').onclick = () => {
    // Прерываем найм
    hrState.hiring = null;
    hideAllSubmenus();
    submenuHire.classList.remove('hidden');
  };

  // ─── Событие hr_hiring_update ───
  socket.on('hr_hiring_update', (hiring) => {
    if (state.myRole !== 'hr') return;

    if (!hiring || hiring.done) {
      // Найм завершён — возвращаемся на главный
      hrState.hiring = null;
      showActions();
      return;
    }

    hrState.hiring = hiring;

    // Открываем подменю шага
    actionsBox.classList.add('hidden');
    hideAllSubmenus();
    submenuHireStep.classList.remove('hidden');
    renderHireStep(hiring.stepKey);
  });

  // ═══════════════════════════════════════════
  // СОКРАЩЕНИЕ
  // ═══════════════════════════════════════════
  document.getElementById('btn-hr-fire').onclick = () => {
    actionsBox.classList.add('hidden');
    hideAllSubmenus();
    submenuFire.classList.remove('hidden');
  };

  document.getElementById('btn-back-hr-fire').onclick = () => {
    showActions();
  };

  document.querySelectorAll('#submenu-hr-fire .btn[data-hr-fire-lvl]').forEach(btn => {
    btn.onclick = () => {
      const level = parseInt(btn.dataset.hrFireLvl, 10);
      socket.emit('hr_fire', { level });
      showActions();
    };
  });

  // ═══════════════════════════════════════════
  // КУМОВСТВО
  // ═══════════════════════════════════════════
  document.getElementById('btn-hr-nepotism').onclick = () => {
    actionsBox.classList.add('hidden');
    hideAllSubmenus();
    submenuNepotism.classList.remove('hidden');
  };

  document.getElementById('btn-back-hr-nepotism').onclick = () => {
    showActions();
  };

  document.getElementById('btn-hr-adopt').onclick = () => {
    adoptChoice.kind = null;
    adoptChoice.place = null;
    submenuNepotism.classList.add('hidden');
    submenuWho.classList.remove('hidden');
  };

  document.getElementById('btn-back-hr-who').onclick = () => {
    hideAllSubmenus();
    submenuNepotism.classList.remove('hidden');
  };

  document.getElementById('btn-back-hr-where').onclick = () => {
    submenuWhere.classList.add('hidden');
    submenuWho.classList.remove('hidden');
  };

  document.getElementById('btn-back-hr-position').onclick = () => {
    submenuPosition.classList.add('hidden');
    submenuWhere.classList.remove('hidden');
  };

  document.getElementById('btn-back-hr-fire-relative').onclick = () => {
    hideAllSubmenus();
    submenuNepotism.classList.remove('hidden');
  };

  // Шаг 1: кто
  document.querySelectorAll('[data-hr-kind]').forEach(btn => {
    btn.onclick = () => {
      adoptChoice.kind = btn.dataset.hrKind;
      submenuWho.classList.add('hidden');
      submenuWhere.classList.remove('hidden');
    };
  });

  // Шаг 2: куда
  document.querySelectorAll('[data-hr-place]').forEach(btn => {
    btn.onclick = () => {
      adoptChoice.place = btn.dataset.hrPlace;
      submenuWhere.classList.add('hidden');
      submenuPosition.classList.remove('hidden');
    };
  });

  // Шаг 3: должность — отправляем
  document.querySelectorAll('[data-hr-position]').forEach(btn => {
    btn.onclick = () => {
      const position = btn.dataset.hrPosition;
      socket.emit('hr_adopt_relative', {
        kind: adoptChoice.kind,
        place: adoptChoice.place,
        position: position
      });
      showActions();
    };
  });

  // Прикрыть родню
  document.getElementById('btn-hr-cover').onclick = () => {
    socket.emit('hr_cover_family');
  };

  // Уволить одного
  document.getElementById('btn-hr-fire-relative').onclick = () => {
    submenuNepotism.classList.add('hidden');
    renderFamilyList();
    submenuFireRelative.classList.remove('hidden');
  };

  function renderFamilyList() {
    const box = document.getElementById('hr-family-list');
    if (!box) return;
    box.innerHTML = '';

    if (!hrState.family || hrState.family.length === 0) {
      box.innerHTML = '<div class="family-empty">Родни нет.</div>';
      return;
    }

    const KIND = { nephew: 'Племянник', kum: 'Сват', neighbor: 'Сосед' };
    const PLACE = { workshop: 'Цех', accounts: 'Бухгалтерия', ads: 'Реклама', security: 'Безопасность' };
    const POS = { worker: 'Работяга', master: 'Специалист', boss: 'Начальник' };

    hrState.family.forEach((f, i) => {
      const item = document.createElement('button');
      item.className = 'family-item';
      item.innerHTML =
        '<div>' +
          '<div class="family-name">' + (KIND[f.kind] || 'Родня') + '</div>' +
          '<div class="family-info">' + (PLACE[f.place] || '') + ' · ' + (POS[f.position] || '') + '</div>' +
        '</div>' +
        '<div class="family-info">уволить</div>';
      item.onclick = () => {
        socket.emit('hr_fire_relative', { index: i });
        showActions();
      };
      box.appendChild(item);
    });
  }

  // ═══════════════════════════════════════════
  // ЗАВЕРШИТЬ СМЕНУ
  // ═══════════════════════════════════════════
  document.getElementById('btn-finish-hr').onclick = () => {
    socket.emit('player_finish_shift');
  };

  // ═══════════════════════════════════════════
  // ЭКРАН ОТЧЁТА
  // ═══════════════════════════════════════════
  const reportStepShow = document.getElementById('report-step-show');
  const reportStepExplain = document.getElementById('report-step-explain');
  const reportSubtitle = document.getElementById('report-subtitle');

  let reportWhatToShow = null;

  function openReport() {
    reportWhatToShow = null;
    if (reportStepShow) reportStepShow.classList.remove('hidden');
    if (reportStepExplain) reportStepExplain.classList.add('hidden');
    if (reportSubtitle) reportSubtitle.textContent = 'Что покажешь Директору?';
    show('screen-report');
  }

  document.querySelectorAll('[data-report-show]').forEach(btn => {
    btn.onclick = () => {
      reportWhatToShow = btn.dataset.reportShow;
      if (reportStepShow) reportStepShow.classList.add('hidden');
      if (reportStepExplain) reportStepExplain.classList.remove('hidden');
      if (reportSubtitle) reportSubtitle.textContent = 'Как объяснишь?';
    };
  });

  document.querySelectorAll('[data-report-explain]').forEach(btn => {
    btn.onclick = () => {
      const howToExplain = btn.dataset.reportExplain;
      socket.emit('submit_report', {
        whatToShow: reportWhatToShow,
        howToExplain: howToExplain
      });
    };
  });

  // ═══════════════════════════════════════════
  // СОБЫТИЯ С СЕРВЕРА
  // ═══════════════════════════════════════════
  socket.on('hr_update', (data) => {
    applySnapshot(data);
  });

  socket.on('decisions_update', ({ decisionsLeft }) => {
    if (state.myRole !== 'hr') return;
    renderDecisions(decisionsLeft);
  });

  socket.on('need_report', () => {
    if (state.myRole !== 'hr') return;
    openReport();
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