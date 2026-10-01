const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// ─── Модули ───
const { hall, addPlayer, getPlayer, removePlayer, allDecided } = require('./server/hall');
const smoking = require('./server/smoking');
const { assignRoles } = require('./server/roles');
const director = require('./server/cabinets/director');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// Сокет-соединения
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Подключился:', socket.id);

  // ─── Вход в курилку ───
  socket.on('enter_smoking', ({ name }) => {
    addPlayer(socket.id, name);
    hall.phase = 'smoking';
    io.emit('smoking_update', smoking.getSmokingState());
  });

  // ─── Действие в курилке ───
  socket.on('smoke_action', ({ type }) => {
    const state = smoking.smokeAction(socket.id, type);
    if (!state) return;

    io.emit('smoking_update', state);

    if (allDecided() && hall.phase === 'smoking') {
      startRoles();
    }
  });

  // ─── Поторопить ───
  socket.on('hurry', () => {
    hall.players.filter(x => x.status === 'thinking').forEach(p => {
      io.to(p.id).emit('hurried');
    });
  });

  // ─── Директор выбирает завод ───
  socket.on('director_choose_factory', ({ type }) => {
    const result = director.chooseFactory(socket.id, type);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    // Директору — с карманом
    socket.emit('factory_chosen', {
      type: result.type,
      factory: result.factory
    });

    // Остальным — без кармана
    hall.players.filter(p => p.id !== socket.id).forEach(p => {
      io.to(p.id).emit('factory_chosen', {
        type: result.type,
        factory: stripPocket(result.factory)
      });
    });

    console.log('Директор выбрал завод:', type);
  });

  // ─── Директор устанавливает уровень отдела ───
  socket.on('director_set_level', ({ direction, level }) => {
    const result = director.setDirectionLevel(socket.id, direction, level);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    emitFactory(result.factory);

    if (result.bankrupt) {
      hall.phase = 'end';
      io.emit('game_over', { reason: 'Завод обанкротился.' });
    }
  });

  // ─── Директор забирает из бюджета ───
  socket.on('director_take_budget', ({ level }) => {
    const result = director.takeFromBudgetAction(socket.id, level);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    emitFactory(result.factory);

    if (result.bankrupt) {
      hall.phase = 'end';
      io.emit('game_over', { reason: 'Завод обанкротился.' });
    }
  });

  // ─── Директор забирает из инвестиций ───
  socket.on('director_take_direction', ({ direction, level }) => {
    const result = director.takeFromDirectionAction(socket.id, direction, level);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    emitFactory(result.factory);
  });

  // ─── Игрок завершает смену ───
  socket.on('player_finish_shift', () => {
    const result = director.finishShift(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    // Сообщаем всем, что этот игрок завершил смену
    io.emit('shift_progress', {
      finished: hall.players.map(p => ({ id: p.id, name: p.name, finished: p.finished }))
    });

    // Если все завершили — начинаем новую смену
    if (result.newShift) {
      io.emit('new_shift', { shift: result.shift });
    }
  });

  // ─── Отключение ───
  socket.on('disconnect', () => {
    const p = getPlayer(socket.id);
    if (!p) return;

    if (hall.phase === 'game') {
      hall.paused = true;
      hall.disconnected.push({ id: socket.id, name: p.name });
      io.emit('paused', {
        disconnected: hall.disconnected.map(x => x.name)
      });
    } else {
      removePlayer(socket.id);
      io.emit('smoking_update', smoking.getSmokingState());
    }
  });

  // ─── Возвращение ───
  socket.on('reconnect_player', ({ name }) => {
    hall.disconnected = hall.disconnected.filter(x => x.name !== name);
    if (hall.disconnected.length === 0) {
      hall.paused = false;
      io.emit('resumed');
    } else {
      io.emit('paused', {
        disconnected: hall.disconnected.map(x => x.name)
      });
    }
  });
});

// ─── Снимок без кармана ───
function stripPocket(snapshot) {
  return {
    directions: snapshot.directions,
    invested: snapshot.invested,
    investments: snapshot.investments,
    budgetPercent: snapshot.budgetPercent,
    reputation: snapshot.reputation,
    bankrupt: snapshot.bankrupt
  };
}

// ─── Отправить завод всем ───
// Директору — с карманом. Остальным — без.
function emitFactory(snapshotWithPocket) {
  const snapshotNoPocket = stripPocket(snapshotWithPocket);

  hall.players.forEach(p => {
    if (p.role === 'director') {
      io.to(p.id).emit('factory_update', snapshotWithPocket);
    } else {
      io.to(p.id).emit('factory_update', snapshotNoPocket);
    }
  });
}

// ─── Старт игры: раздать роли ───
function startRoles() {
  const assignments = assignRoles();
  assignments.forEach(a => {
    io.to(a.id).emit('your_role', { role: a.role, label: a.label });
  });
  console.log('Роли розданы:', assignments.map(a => a.role).join(', '));
}

server.listen(PORT, () => {
  console.log('ЗАВОД запущен! Порт:', PORT);
});