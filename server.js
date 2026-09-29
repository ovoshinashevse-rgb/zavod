const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const PORT = 3000;

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

function generateCode() {
  let code;
  do {
    code = String(Math.floor(100 + Math.random() * 900));
  } while (rooms[code]);
  return code;
}

function createFactory(choice) {
  const good = choice === 'good';
  const start = {
    profit:  good ? 80 : 30,
    quality: good ? 70 : 30,
    clients: good ? 50 : 20
  };
  const factory = {
    profit: start.profit,
    quality: start.quality,
    clients: start.clients,
    budget:  good ? 100 : 300,
    unaccounted: 0,
    employees: good ? 30 : 15,
    equipment: good ? 50 : 20,
    start: start,
    // Порог продажи: рандом, не ниже 200% от старта
    threshold: {
      profit:  Math.round(start.profit  * (2 + Math.random() * 1.5)),
      quality: Math.round(start.quality * (2 + Math.random() * 1.5)),
      clients: Math.round(start.clients * (2 + Math.random() * 1.5))
    }
  };
  return factory;
}

function applyAction(room, player, actionType) {
  const f = room.factory;
  switch (player.role) {
    case 'director':
      if (actionType === 'develop') { f.profit += 10; f.quality += 5; f.budget -= 20; }
      if (actionType === 'steal')   { player.pocket += 30; f.budget -= 30; f.unaccounted += 30; player.stole = true; }
      break;
    case 'accountant':
      if (actionType === 'honest')     { f.unaccounted = Math.max(0, f.unaccounted - 10); }
      if (actionType === 'commission') { player.pocket += 20; f.unaccounted += 20; player.stole = true; }
      break;
    case 'security':
      if (actionType === 'check') {
        const suspects = room.players
          .filter(p => p.role !== 'security' && p.pocket > 0)
          .map(p => ({ name: p.name, role: p.role }));
        player.lastCheck = suspects;
      }
      if (actionType === 'collude') { player.pocket += 15; f.unaccounted += 15; player.stole = true; player.colluded = true; }
      break;
    case 'engineer':
      if (actionType === 'work')  { f.quality += 10; f.equipment += 5; f.budget -= 15; }
      if (actionType === 'drink') { player.pocket += 5; f.quality -= 15; player.stole = true; }
      break;
    case 'hr':
      if (actionType === 'hire') { f.employees += 5; f.quality += 3; f.budget -= 10; }
      if (actionType === 'idle') { f.employees -= 3; }
      break;
    case 'marketer':
      if (actionType === 'work') { f.clients += 10; f.budget -= 15; }
      if (actionType === 'blog') { player.pocket += 10; f.clients -= 8; player.stole = true; }
      break;
  }
}

// Проверка победы
function checkVictory(room) {
  const f = room.factory;
  return f.profit  >= f.threshold.profit &&
         f.quality >= f.threshold.quality &&
         f.clients >= f.threshold.clients;
}

function checkEndGame(room) {
  const f = room.factory;
  if (f.budget < 0) {
    room.phase = 'end';
    room.endReason = 'Банкротство! Бюджет завода ушёл в минус.';
    room.endType = 'lose';
    return true;
  }
  if (f.unaccounted >= 200) {
    room.phase = 'end';
    room.endReason = 'Антикоррупционная служба закрыла завод! Слишком много неучтённых средств.';
    room.endType = 'lose';
    return true;
  }
  if (checkVictory(room)) {
    room.phase = 'end';
    room.endReason = 'Инвесторы купили завод!';
    room.endType = 'win';
    return true;
  }
  return false;
}

// Личный итог игрока
function personalResult(player, room) {
  const f = room.factory;
  const isWin = room.endType === 'win';
  if (!isWin) return 'Завод не продан. Игра проиграна.';
  switch (player.role) {
    case 'director':
      return player.stole
        ? 'Вы воровали, но завод всё равно продан. Ловкач.'
        : 'Вы честно развивали завод и продали его. Молодец.';
    case 'accountant':
      return player.stole
        ? 'Вы брали комиссии, но завод продан. Успели.'
        : 'Вы честно вели бюджеты, завод продан.';
    case 'security':
      if (player.colluded) return 'Вы были в сговоре, но завод продан.';
      return 'Вы ловили воров, завод продан.';
    case 'engineer':
      return player.stole
        ? 'Вы спивались, но завод продан.'
        : 'Вы держали качество, завод продан.';
    case 'hr':
      return player.stole
        ? 'Вы саботировали, но завод продан.'
        : 'Вы нанимали и развивали, завод продан.';
    case 'marketer':
      return player.stole
        ? 'Вы уводили клиентов в блог, но завод продан.'
        : 'Вы привлекали клиентов, завод продан.';
  }
  return 'Игра окончена.';
}

function sendGameOver(room, code, io) {
  io.to(code).emit('game_over', {
    reason: room.endReason,
    type: room.endType,
    factory: room.factory,
    threshold: room.factory.threshold,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      pocket: p.pocket,
      stole: p.stole || false
    })),
    // Личный итог приходит каждому свой
    personal: null
  });
  // Персонально каждому
  room.players.forEach(p => {
    io.to(p.id).emit('personal_result', {
      text: personalResult(p, room),
      pocket: p.pocket,
      stole: p.stole || false
    });
  });
}

function checkAllActed(room, code, io) {
  const all = room.players.every(p => p.acted);
  if (!all) return;

  if (checkEndGame(room)) {
    sendGameOver(room, code, io);
    return;
  }

  room.round += 1;
  room.players.forEach(p => {
    p.acted = false;
    p.lastCheck = null;
  });

  io.to(code).emit('new_round', {
    round: room.round,
    factory: room.factory,
    players: room.players.map(p => ({ id: p.id, name: p.name, role: p.role, acted: p.acted }))
  });
}

io.on('connection', (socket) => {
  console.log('Подключился игрок:', socket.id);

  socket.on('create_room', ({ name, role }) => {
    const code = generateCode();
    rooms[code] = {
      code, hostId: socket.id, phase: 'lobby', round: 0,
      factory: null, endReason: null, endType: null,
      players: [{ id: socket.id, name, role, pocket: 0, acted: false, lastCheck: null, stole: false, colluded: false }]
    };
    socket.join(code);
    socket.emit('room_joined', {
      code, players: rooms[code].players,
      hostId: rooms[code].hostId, phase: rooms[code].phase, round: rooms[code].round
    });
  });

  socket.on('join_room', ({ code, name, role }) => {
    const room = rooms[code];
    if (!room) return socket.emit('error_msg', 'Комната не найдена');
    if (room.phase !== 'lobby') return socket.emit('error_msg', 'Игра уже началась');
    if (room.players.some(p => p.role === role)) {
      return socket.emit('error_msg', 'Эта роль уже занята');
    }
    room.players.push({ id: socket.id, name, role, pocket: 0, acted: false, lastCheck: null, stole: false, colluded: false });
    socket.join(code);
    socket.emit('room_joined', {
      code, players: room.players,
      hostId: room.hostId, phase: room.phase, round: room.round
    });
    io.to(code).emit('room_updated', {
      players: room.players, hostId: room.hostId, phase: room.phase, round: room.round
    });
  });

  socket.on('start_game', ({ code }) => {
    const room = rooms[code];
    if (!room) return socket.emit('error_msg', 'Комната не найдена');
    if (socket.id !== room.hostId) return socket.emit('error_msg', 'Только создатель может начать игру');
    if (room.players.length < 2) return socket.emit('error_msg', 'Нужно минимум 2 игрока');

    room.phase = 'choose_factory';
    room.round = 1;

    io.to(code).emit('game_started', {
      players: room.players, round: room.round, phase: room.phase
    });
  });

  socket.on('choose_factory', ({ code, choice }) => {
    const room = rooms[code];
    if (!room) return socket.emit('error_msg', 'Комната не найдена');
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.role !== 'director') {
      return socket.emit('error_msg', 'Только Директор выбирает завод');
    }
    if (room.phase !== 'choose_factory') {
      return socket.emit('error_msg', 'Сейчас не время выбирать завод');
    }
    room.factory = createFactory(choice);
    room.phase = 'round';
    room.round = 2;

    io.to(code).emit('factory_ready', {
      factory: room.factory, round: room.round, phase: room.phase,
      players: room.players.map(p => ({ id: p.id, name: p.name, role: p.role, acted: p.acted }))
    });
  });

  socket.on('do_action', ({ code, actionType }) => {
    const room = rooms[code];
    if (!room) return socket.emit('error_msg', 'Комната не найдена');
    if (room.phase !== 'round') return socket.emit('error_msg', 'Сейчас не фаза действий');

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return socket.emit('error_msg', 'Игрок не найден');
    if (player.acted) return socket.emit('error_msg', 'Вы уже сделали ход в этом раунде');

    applyAction(room, player, actionType);
    player.acted = true;

    io.to(code).emit('action_done', {
      factory: room.factory,
      players: room.players.map(p => ({ id: p.id, name: p.name, role: p.role, acted: p.acted }))
    });

    if (actionType === 'check' && player.role === 'security') {
      socket.emit('check_result', { suspects: player.lastCheck || [] });
    }

    console.log(player.name, '(', player.role, ') сделал', actionType);
    checkAllActed(room, code, io);
  });

  socket.on('disconnect', () => {
    console.log('Отключился игрок:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log('ЗАВОД запущен! Открой в браузере: http://localhost:' + PORT);
});