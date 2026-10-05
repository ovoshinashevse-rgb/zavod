// ═══════════════════════════════════════════
// ВЫБОР ЗАВОДА — Директор начинает
// ═══════════════════════════════════════════

(function () {
  const { socket } = window.App;

  const btn = document.getElementById('btn-factory-good');
  if (btn) {
    btn.onclick = () => socket.emit('director_choose_factory');
  }

  console.log('ChooseFactory: модуль готов');
})();