// ═══════════════════════════════════════════
// ВЫБОР ЗАВОДА — Директор решает
// ═══════════════════════════════════════════

(function () {
  const { socket } = window.App;

  // ─── Хороший завод ───
  document.getElementById('btn-factory-good').onclick = () => {
    socket.emit('director_choose_factory', { type: 'good' });
  };

  // ─── Плохой завод ───
  document.getElementById('btn-factory-bad').onclick = () => {
    socket.emit('director_choose_factory', { type: 'bad' });
  };

  console.log('ChooseFactory: модуль готов');
})();