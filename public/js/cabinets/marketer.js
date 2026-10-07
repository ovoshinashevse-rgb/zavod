// ═══════════════════════════════════════════
// КАБИНЕТ МАРКЕТОЛОГА — позиционирование, реклама, блог, отчёт
// ═══════════════════════════════════════════

(function () {
  const { socket, state, show, toast } = window.App;

  const mkState = {
    decisionsLeft: 3,
    pocket: 0,
    fame: 0,
    ads: 50,
    clients: 50,
    position: null,
    report: null
  };

  // Текущий выбор
  const choice = {
    market: null,
    audience: null,
    channel: null,
    budget: null,
    blogTopic: null,
    blogTone: null
  };

  // ─── Знак завода ───
  function mountSign(factory) {
    if (!window.FactorySign) return;
    const product   = factory && factory.product;
    const building  = factory && factory.building;
    const st        = (factory && factory.state) || 'mid';
    const equipment = factory && factory.equipment;
    window.FactorySign.mount('factory-sign-marketer', product, building, st, equipment);
  }

  // ─── Точки решений ───
  function renderDecisions(left) {
    const max = 3;
    const box = document.getElementById('decisions-dots-marketer');
    if (!box) return;
    box.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('span');
      dot.className = 'decision-dot' + (i < left ? ' active' : '');
      box.appendChild(dot);
    }
    mkState.decisionsLeft = left;
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
    if (type === 'fame' || type === 'pocket') {
      if (!value || value <= 0) return 'пусто';
      if (value < 20) return 'немного';
      if (value < 60) return 'нормально';
      return 'много';
    }
    if (value < 50) return 'низко';
    if (value < 83) return 'средне';
    return 'высоко';
  }

  function renderScales() {
    // Реклама
    const adsFill = document.getElementById('mk-ads-fill');
    if (adsFill) {
      adsFill.style.width = mkState.ads + '%';
      adsFill.className = 'scale-fill ' + colorClass(mkState.ads);
      document.getElementById('mk-ads-word').textContent = qualitativeWord(mkState.ads, 'ads');
    }

    // Клиенты
    const clientsFill = document.getElementById('mk-clients-fill');
    if (clientsFill) {
      clientsFill.style.width = mkState.clients + '%';
      clientsFill.className = 'scale-fill ' + colorClass(mkState.clients);
      document.getElementById('mk-clients-word').textContent = qualitativeWord(mkState.clients, 'clients');
    }

    // Личный блог
    const fameBox = document.getElementById('mk-fame-box');
    if (fameBox) {
      if (mkState.fame > 0) {
        const pPercent = Math.min(100, mkState.fame * 2);
        const pFill = document.getElementById('mk-fame-fill');
        pFill.style.width = pPercent + '%';
        pFill.className = 'scale-fill high';
        document.getElementById('mk-fame-word').textContent = qualitativeWord(mkState.fame, 'fame');
        fameBox.classList.remove('hidden');
      } else {
        fameBox.classList.add('hidden');
      }
    }
  }

  // ─── Снимок ───
  function applySnapshot(data) {
    if (typeof data.decisionsLeft !== 'undefined') {
      mkState.decisionsLeft = data.decisionsLeft;
      renderDecisions(data.decisionsLeft);
    }
    if (typeof data.pocket !== 'undefined') mkState.pocket = data.pocket;
    if (typeof data.fame !== 'undefined') mkState.fame = data.fame;
    if (typeof data.ads !== 'undefined') mkState.ads = data.ads;
    if (typeof data.clients !== 'undefined') mkState.clients = data.clients;
    if (data.position) mkState.position = data.position;
    if (data.report) mkState.report = data.report;
    renderScales();
  }

  // ═══════════════════════════════════════════
  // ПОДМЕНЮ
  // ═══════════════════════════════════════════
  const actionsBox     = document.getElementById('marketer-actions');
  const submenuMarket  = document.getElementById('submenu-mk-market');
  const submenuAudience= document.getElementById('submenu-mk-audience');
  const submenuChannel = document.getElementById('submenu-mk-channel');
  const submenuBudget  = document.getElementById('submenu-mk-budget');
  const submenuBlogTopic = document.getElementById('submenu-mk-blog-topic');
  const submenuBlogTone  = document.getElementById('submenu-mk-blog-tone');
  const shiftDone      = document.getElementById('shift-done-marketer');

  function hideAllSubmenus() {
    [submenuMarket, submenuAudience, submenuChannel, submenuBudget, submenuBlogTopic, submenuBlogTone]
      .forEach(el => el && el.classList.add('hidden'));
  }

  function showActions() {
    hideAllSubmenus();
    actionsBox.classList.remove('hidden');
    shiftDone.classList.add('hidden');
  }

  // ═══════════════════════════════════════════
  // ДАННЫЕ ДЛЯ ПОДМЕНЮ
  // ═══════════════════════════════════════════
  const MARKETS = {
    mass:    { title: 'Массовый',  desc: 'Для всех' },
    middle:  { title: 'Средний',   desc: 'Для среднего класса' },
    premium: { title: 'Премиум',   desc: 'Для богатых' },
    b2b:     { title: 'B2B',       desc: 'Для бизнеса' },
    gov:     { title: 'Госзаказ',  desc: 'Для государства' },
    export:  { title: 'Экспорт',   desc: 'За границу' },
    local:   { title: 'Местный',   desc: 'Для города' }
  };

  const AUDIENCES = {
    econom:      { title: 'Экономный',    desc: 'Берёт дёшево' },
    thrifty:     { title: 'Бережливый',   desc: 'Ищет скидки' },
    family:      { title: 'Семейный',     desc: 'Для семьи' },
    young:       { title: 'Молодой',      desc: 'Пробует новое' },
    experienced: { title: 'Опытный',      desc: 'Знает, что надо' },
    business:    { title: 'Деловой',      desc: 'Для работы' },
    status:      { title: 'Статусный',    desc: 'Важен престиж' },
    govclient:   { title: 'Госзаказчик',  desc: 'Покупает по бумагам' },
    wholesale:   { title: 'Оптовик',      desc: 'Берёт много' },
    foreign:     { title: 'Иностранный',  desc: 'Из-за рубежа' }
  };

  const CHANNELS = {
    tv:       { title: 'ТВ',       desc: 'Дорого, широкий охват' },
    internet: { title: 'Интернет', desc: 'Средне, точный охват' },
    paper:    { title: 'Газета',   desc: 'Дёшево, узкий охват' },
    radio:    { title: 'Радио',    desc: 'Средне, свой охват' },
    outdoor:  { title: 'Наружка',  desc: 'Средне, для города' }
  };

  const BUDGETS = {
    low:    { title: 'Низкий',   desc: 'Скромно' },
    mid:    { title: 'Средний',  desc: 'Как обычно' },
    high:   { title: 'Высокий',  desc: 'На всё' }
  };

  const BLOG_TOPICS = {
    factory:  { title: 'О заводе',  desc: 'Про продукт и людей' },
    self:     { title: 'О себе',    desc: 'Про свой путь' },
    office:   { title: 'Про офис',  desc: 'Будни и внутренности' },
    collegue: { title: 'Про коллегу', desc: 'Про других игроков' }
  };

  const BLOG_TONES = {
    serious: { title: 'Серьёзно',    desc: 'Вдумчиво' },
    funny:   { title: 'С шутками',   desc: 'По-человечески' },
    scandal: { title: 'Скандально',  desc: 'На грани' }
  };

  // ─── Рендер опций в подменю ───
  function renderOptions(containerId, optionsObj, selectedKey, onClick) {
    const box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = '';

    Object.keys(optionsObj).forEach(key => {
      const opt = optionsObj[key];
      const btn = document.createElement('button');
      btn.className = 'btn' + (key === selectedKey ? ' mk-selected' : '');
      btn.innerHTML =
        '<span class="mk-opt-title">' + opt.title + '</span>' +
        '<span class="mk-opt-desc">' + opt.desc + '</span>';

      btn.onclick = () => {
        onClick(key);
      };

      box.appendChild(btn);
    });
  }

  // ═══════════════════════════════════════════
  // ПОЗИЦИОНИРОВАНИЕ
  // ═══════════════════════════════════════════
  document.getElementById('btn-mk-position').onclick = () => {
    actionsBox.classList.add('hidden');
    hideAllSubmenus();
    choice.market = null;
    choice.audience = null;
    submenuMarket.classList.remove('hidden');
    renderOptions('mk-market-options', MARKETS, null, (key) => {
      choice.market = key;
      submenuMarket.classList.add('hidden');
      submenuAudience.classList.remove('hidden');
      renderOptions('mk-audience-options', AUDIENCES, null, (key2) => {
        choice.audience = key2;
        socket.emit('marketer_set_position', {
          market: choice.market,
          audience: choice.audience
        });
        showActions();
      });
    });
  };

  document.getElementById('btn-back-mk-market').onclick = () => {
    showActions();
  };

  document.getElementById('btn-back-mk-audience').onclick = () => {
    submenuAudience.classList.add('hidden');
    submenuMarket.classList.remove('hidden');
  };

  // ═══════════════════════════════════════════
  // РЕКЛАМА
  // ═══════════════════════════════════════════
  document.getElementById('btn-mk-ad').onclick = () => {
    actionsBox.classList.add('hidden');
    hideAllSubmenus();
    choice.channel = null;
    choice.budget = null;
    submenuChannel.classList.remove('hidden');
    renderOptions('mk-channel-options', CHANNELS, null, (key) => {
      choice.channel = key;
      submenuChannel.classList.add('hidden');
      submenuBudget.classList.remove('hidden');
      renderOptions('mk-budget-options', BUDGETS, null, (key2) => {
        choice.budget = key2;
        socket.emit('marketer_run_ad', {
          channel: choice.channel,
          budget: choice.budget
        });
        showActions();
      });
    });
  };

  document.getElementById('btn-back-mk-channel').onclick = () => {
    showActions();
  };

  document.getElementById('btn-back-mk-budget').onclick = () => {
    submenuBudget.classList.add('hidden');
    submenuChannel.classList.remove('hidden');
  };

  // ═══════════════════════════════════════════
  // БЛОГ
  // ═══════════════════════════════════════════
  document.getElementById('btn-mk-blog').onclick = () => {
    actionsBox.classList.add('hidden');
    hideAllSubmenus();
    choice.blogTopic = null;
    choice.blogTone = null;
    submenuBlogTopic.classList.remove('hidden');
    renderOptions('mk-blog-topic-options', BLOG_TOPICS, null, (key) => {
      choice.blogTopic = key;
      submenuBlogTopic.classList.add('hidden');
      submenuBlogTone.classList.remove('hidden');
      renderOptions('mk-blog-tone-options', BLOG_TONES, null, (key2) => {
        choice.blogTone = key2;
        // Если тема «про коллегу» — нужна цель. Пока — Директор по умолчанию.
        let targetRole = null;
        if (choice.blogTopic === 'collegue') {
          targetRole = 'director';
        }
        socket.emit('marketer_write_blog', {
          topic: choice.blogTopic,
          tone: choice.blogTone,
          targetRole: targetRole
        });
        showActions();
      });
    });
  };

  document.getElementById('btn-back-mk-blog-topic').onclick = () => {
    showActions();
  };

  document.getElementById('btn-back-mk-blog-tone').onclick = () => {
    submenuBlogTone.classList.add('hidden');
    submenuBlogTopic.classList.remove('hidden');
  };

  // ═══════════════════════════════════════════
  // ЗАВЕРШИТЬ СМЕНУ
  // ═══════════════════════════════════════════
  document.getElementById('btn-finish-marketer').onclick = () => {
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
  // СОБЫТИЯ
  // ═══════════════════════════════════════════
  socket.on('marketer_update', (data) => {
    applySnapshot(data);
  });

  socket.on('decisions_update', ({ decisionsLeft }) => {
    if (state.myRole !== 'marketer') return;
    renderDecisions(decisionsLeft);
  });

  socket.on('need_report', () => {
    if (state.myRole !== 'marketer') return;
    openReport();
  });

  socket.on('marketer_report_submitted', () => {
    if (state.myRole !== 'marketer') return;
    hideAllSubmenus();
    actionsBox.classList.add('hidden');
    shiftDone.classList.remove('hidden');
    show('screen-game-marketer');
  });

  socket.on('marketer_position_set', ({ score }) => {
    if (state.myRole !== 'marketer') return;
    if (score >= 4) toast('Позиционирование точное');
    else if (score >= 2) toast('Позиционирование нормальное');
    else toast('Позиционирование слабое');
  });

  socket.on('marketer_ad_ran', ({ effect }) => {
    if (state.myRole !== 'marketer') return;
    if (effect > 20) toast('Реклама сработала');
    else if (effect > 10) toast('Реклама норм');
    else toast('Реклама слабая');
  });

  socket.on('marketer_blog_written', ({ fameGain, rumorAbout }) => {
    if (state.myRole !== 'marketer') return;
    if (rumorAbout) {
      toast('Пост про коллегу. Слух пошёл.');
    } else if (fameGain >= 4) {
      toast('Пост зашёл');
    } else {
      toast('Пост опубликован');
    }
  });

  socket.on('new_shift', ({ decisionsLeft }) => {
    if (state.myRole !== 'marketer') return;
    shiftDone.classList.add('hidden');
    actionsBox.classList.remove('hidden');
    renderDecisions(decisionsLeft || 3);
    hideAllSubmenus();
  });

  socket.on('shift_progress', ({ finished }) => {
    if (state.myRole !== 'marketer') return;
    const me = finished.find(p => p.id === socket.id);
    if (me && me.finished) {
      hideAllSubmenus();
      actionsBox.classList.add('hidden');
      shiftDone.classList.remove('hidden');
    }
  });

  socket.on('factory_chosen', ({ factory }) => {
    if (state.myRole && state.myRole !== 'marketer') return;

    mountSign(factory);

    show('screen-game-marketer');
    renderDecisions(mkState.decisionsLeft);
    renderScales();
    showActions();
  });

  socket.on('game_over', ({ reason, type, biographies }) => {
    if (state.myRole && state.myRole !== 'marketer') return;

    document.getElementById('end-reason').textContent = reason;

    if (type === 'sale' && biographies && biographies[socket.id]) {
      const bioBox = document.getElementById('end-biography');
      bioBox.textContent = biographies[socket.id];
      bioBox.classList.remove('hidden');
    }

    show('screen-end');
  });

  socket.on('error_msg', (msg) => toast(msg));

  console.log('Cabinet Marketer: модуль готов');
})();