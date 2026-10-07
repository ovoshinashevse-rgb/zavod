// ═══════════════════════════════════════════
// БЕЙДЖИК — пропуск с ролью
// ═══════════════════════════════════════════

(function () {
  const { socket, state, show } = window.App;

  const DEPARTMENTS = {
    director:   'Дирекция',
    security:   'Служба безопасности',
    accountant: 'Бухгалтерия',
    engineer:   'Производство',
    hr:         'Отдел кадров',
    marketer:   'Маркетинг'
  };

  // ─── Получили роль — заполняем бейджик ───
  socket.on('your_role', ({ role, label }) => {
    state.myRole = role;

    document.getElementById('badge-name').textContent = state.myName;
    document.getElementById('badge-role').textContent = label;
    document.getElementById('badge-dept').textContent = DEPARTMENTS[role] || '—';
    document.getElementById('badge-id').textContent =
      String(Math.floor(1000 + Math.random() * 9000)) + '-' +
      String(Math.floor(10 + Math.random() * 90));

    show('screen-role');
  });

  // ─── Кнопка «Приступить» ───
  document.getElementById('btn-start-shift').onclick = () => {
    if (state.myRole === 'director') {
      // Директор сразу начинает настройку завода
      socket.emit('director_choose_factory');
    } else {
      show('screen-waiting');
    }
  };

  console.log('Badge: модуль готов');
})();