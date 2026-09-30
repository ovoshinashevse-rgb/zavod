const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// ОДИН ОБЩИЙ ЗАЛ
// ─────────────────────────────────────────────
const hall = {
  players: [],
  phase: 'lobby',
  paused: false,
  disconnected: [],
  smokeLevel: 0   // <── накопительный счётчик дымности
};

const ALL_ROLES = ['director', 'security', 'accountant', 'engineer', 'hr', 'marketer'];

const ROLE_LABELS = {
  director: 'Директор',
  security: 'Безопасник',
  accountant: 'Бухгалтер',
  engineer: 'Инженер',
  hr: 'HR',
  marketer: 'Маркетолог'
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRolesForCount(count) {
  if (count <= 2) {
    const others = shuffle(ALL_ROLES.filter(r => r !== 'director'));
    return ['director', others[0]];
  }
  if (count === 3) {
    const others = shuffle(ALL_ROLES.filter(r => r !== 'director' && r !== 'security'));
    return ['director', 'security', others[0]];
  }
  if (count === 4) return ['director', 'security', 'accountant', 'engineer'];
  if (count === 5) return ['director', 'security', 'accountant', 'engineer', 'hr'];
  return ['director', 'security', 'accountant', 'engineer', 'hr', 'marketer'];
}

function emitSmokingUpdate() {
  io.emit('smoking_update', {
    players: hall.players.map(x => ({
      id: x.id,
      name: x.name,
      status: x.status
    })),
    smokeLevel: hall.smokeLevel
  });
}

io.on('connection', (socket) => {
  console.log('Подключился:', socket.id);

  socket.on('enter_smoking', ({ name }) => {
    let p = hall.players.find(x => x.id === socket.id);
    if (!p) {
      p = { id: socket.id, name: name || 'Сотрудник', status: 'thinking', role: null };
      hall.players.push(p);
    } else {
      p.name = name || p.name;
      p.status = 'thinking';
    }
    hall.phase = 'smoking';
    emitSmokingUpdate();
  });

  // Накопительное действие: каждая затяжка +1, каждая отмашка −1
  socket.on('smoke_action', ({ type }) => {
    const p = hall.players.find(x => x.id === socket.id);
    if (!p) return;

    if (type === 'smoke') {
      hall.smokeLevel = Math.min(12, hall.smokeLevel + 1);
      p.status = 'smoke';
    } else if (type === 'wave') {
      if (hall.smokeLevel <= 0) return; // нельзя уйти в минус
      hall.smokeLevel = Math.max(0, hall.smokeLevel - 1);
      p.status = 'wave';
    } else {
      return;
    }

    emitSmokingUpdate();

    // Если все определились (у каждого статус не thinking) — старт
    const allDecided = hall.players.length >= 2 &&
                       hall.players.every(x => x.status !== 'thinking');
    if (allDecided && hall.phase === 'smoking') {
      startGame();
    }
  });

  socket.on('hurry', () => {
    hall.players.filter(x => x.status === 'thinking').forEach(p => {
      io.to(p.id).emit('hurried');
    });
  });

  socket.on('disconnect', () => {
    const p = hall.players.find(x => x.id === socket.id);
    if (!p) return;

    if (hall.phase === 'game') {
      hall.paused = true;
      hall.disconnected.push({ id: socket.id, name: p.name });
      io.emit('paused', {
        disconnected: hall.disconnected.map(x => x.name)
      });
    } else {
      hall.players = hall.players.filter(x => x.id !== socket.id);
      emitSmokingUpdate();
    }
  });

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

function startGame() {
  hall.phase = 'roles';
  const count = hall.players.length;
  const roles = shuffle(pickRolesForCount(count));

  hall.players.forEach((p, i) => {
    p.role = roles[i];
  });

  hall.players.forEach(p => {
    io.to(p.id).emit('your_role', {
      role: p.role,
      label: ROLE_LABELS[p.role]
    });
  });

  console.log('Роли розданы:', hall.players.map(p => p.name + '=' + p.role).join(', '));
}

server.listen(PORT, () => {
  console.log('ЗАВОД запущен! Порт:', PORT);
});