// ═══════════════════════════════════════════
// КУРИЛКА — статусы, дымность, кнопки
// ═══════════════════════════════════════════

(function () {
  const { socket, state, show } = window.App;

  // ─── Применить уровень дымности ───
  function applyDensity(level) {
    document.body.classList.remove('density-off', 'density-light', 'density-medium', 'density-heavy');

    let cls;
    if (level <= 0) cls = 'density-off';
    else if (level <= 3) cls = 'density-light';
    else if (level <= 7) cls = 'density-medium';
    else cls = 'density-heavy';

    document.body.classList.add(cls);

    const waveBtn = document.getElementById('btn-wave');
    if (waveBtn) waveBtn.disabled = level <= 0;
  }

  // Экспорт в App (нужно для show() из app.js)
  window.applyDensity = applyDensity;

  // ─── Кнопка «Пройти в курилку» ───
  document.getElementById('btn-to-smoking').onclick = () => {
    const name = document.getElementById('input-name').value.trim();
    if (!name) { alert('Введите имя'); return; }
    state.myName = name;
    socket.emit('enter_smoking', { name });
    show('screen-smoking');
  };

  // ─── Кнопки затяжки / отмашки ───
  document.getElementById('btn-smoke').onclick = () => {
    socket.emit('smoke_action', { type: 'smoke' });
  };
  document.getElementById('btn-wave').onclick = () => {
    socket.emit('smoke_action', { type: 'wave' });
  };

    // ─── Пройти на смену ───
  document.getElementById('btn-ready').onclick = () => {
    socket.emit('player_ready');
    document.getElementById('btn-ready').disabled = true;
    document.getElementById('btn-ready').textContent = 'Ждём остальных…';
  };

  // ─── Обновление статуса кнопок ───
  function updateStatusButtons() {
    const smoke = document.getElementById('btn-smoke');
    const wave = document.getElementById('btn-wave');
    smoke.classList.toggle('success', state.myStatus === 'smoke');
    wave.classList.toggle('success', state.myStatus === 'wave');
  }

  // ─── Поторопить ───
  document.getElementById('btn-hurry').onclick = () => {
    socket.emit('hurry');
  };

  // ─── Позвать коллегу ───
  function invite() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'ЗАВОД', text: 'Зайди на завод, я уже в курилке', url });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => alert('Ссылка скопирована'));
    } else {
      alert('Ссылка: ' + url);
    }
  }
  document.getElementById('btn-invite').onclick = invite;
  document.getElementById('btn-invite-2').onclick = invite;

  // ─── Обновление из сокета ───
  socket.on('smoking_update', ({ players, smokeLevel }) => {
    state.currentSmokeLevel = smokeLevel;

    if (document.body.classList.contains('in-smoking')) {
      applyDensity(smokeLevel);
    }

    const box = document.getElementById('smoking-players');
    box.innerHTML = '';
    players.forEach(p => {
      const row = document.createElement('div');
      let cls = 'player';
      if (p.status === 'smoke') cls += ' smoke';
      if (p.status === 'wave')  cls += ' wave';
      if (p.ready) cls += ' ready';
      row.className = cls;

      const icon = p.status === 'smoke' ? '🚬' :
                   p.status === 'wave'  ? '💨' : '⏳';

      const readyMark = p.ready ? ' <span style="color:#4ecdc4;">✓</span>' : '';

      row.innerHTML = '<span>' + p.name + (p.id === socket.id ? ' (вы)' : '') + readyMark + '</span>' +
                      '<span class="status">' + icon + '</span>';
      box.appendChild(row);
    });

    const me = players.find(p => p.id === socket.id);
    if (me) state.myStatus = me.status;
    updateStatusButtons();

    const someoneThinking = players.some(p => p.status === 'thinking' && p.id !== socket.id);
    const iDecided = me && me.status !== 'thinking';
    const btnHurry = document.getElementById('btn-hurry');
    if (someoneThinking && iDecided) btnHurry.classList.remove('hidden');
    else btnHurry.classList.add('hidden');
  });

  // ─── Нас поторопили — мигаем ───
  socket.on('hurried', () => {
    const box = document.getElementById('smoking-players');
    Array.from(box.children).forEach(el => {
      el.classList.add('hurried');
      setTimeout(() => el.classList.remove('hurried'), 1500);
    });
  });

  console.log('Smoking: модуль готов');
})();