const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// ─── Модули ───
const { hall, addPlayer, getPlayer, removePlayer, allDecided } = require('./server/hall');
const smoking = require('./server/smoking');
const { assignRoles } = require('./server/roles');
const director = require('./server/cabinets/director');
const security = require('./server/cabinets/security');
const {
  applyIndicatorChanges,
  resetReports,
  autoFillReports,
  isFactoryReadyForSale,
  factorySnapshot
} = require('./server/factory');

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

  socket.on('smoke_action', ({ type }) => {
    const state = smoking.smokeAction(socket.id, type);
    if (!state) return;

    io.emit('smoking_update', state);

    if (allDecided() && hall.phase === 'smoking') {
      startRoles();
    }
  });

  socket.on('hurry', () => {
    hall.players.filter(x => x.status === 'thinking').forEach(p => {
      io.to(p.id).emit('hurried');
    });
  });

  // ═══════════════════════════════════════════
  // ДИРЕКТОР
  // ═══════════════════════════════════════════
  socket.on('director_choose_factory', ({ type }) => {
    const result = director.chooseFactory(socket.id, type);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    hall.players.forEach(p => {
      const payload = {
        type: result.type,
        factory: (p.role === 'director') ? result.factory : stripPocket(result.factory),
        decisionsLeft: p.decisionsLeft || 0
      };
      io.to(p.id).emit('factory_chosen', payload);
    });

    const sec = hall.players.find(x => x.role === 'security');
    if (sec) {
      io.to(sec.id).emit('security_update', security.securitySnapshot(sec));
    }

    console.log('Директор выбрал завод:', type);
  });

  socket.on('director_set_level', ({ direction, level }) => {
    const result = director.setDirectionLevel(socket.id, direction, level);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    emitFactory(result.factory);
    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });

    if (result.bankrupt) {
      hall.phase = 'end';
      io.emit('game_over', { reason: 'Завод обанкротился.' });
    }
  });

  socket.on('director_take_budget', ({ level }) => {
    const result = director.takeFromBudgetAction(socket.id, level);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    emitFactory(result.factory);
    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });

    if (result.bankrupt) {
      hall.phase = 'end';
      io.emit('game_over', { reason: 'Завод обанкротился.' });
    }
  });

  socket.on('director_take_direction', ({ direction, level }) => {
    const result = director.takeFromDirectionAction(socket.id, direction, level);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    emitFactory(result.factory);
    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
  });

  socket.on('director_submit_report', ({ indicator }) => {
    const result = director.submitReportAction(socket.id, indicator);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }
    socket.emit('factory_update', result.factory);
  });

  socket.on('director_request_check', ({ indicator }) => {
    const result = director.requestReportCheck(socket.id, indicator);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
  });

  // ═══════════════════════════════════════════
  // БЕЗОПАСНИК
  // ═══════════════════════════════════════════
  socket.on('security_check', ({ targetId }) => {
    const result = security.checkPlayer(socket.id, targetId);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    const sec = getPlayer(socket.id);
    socket.emit('security_update', security.securitySnapshot(sec));

    socket.emit('security_check_pending', {
      targetTitle: result.targetTitle
    });
  });

  socket.on('security_cover_department', ({ indicator }) => {
    const result = security.coverDepartment(socket.id, indicator);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    const sec = getPlayer(socket.id);
    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    socket.emit('security_update', security.securitySnapshot(sec));
  });

  socket.on('security_answer_forged', ({ indicator }) => {
    const result = security.answerForged(socket.id, indicator);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    const sec = getPlayer(socket.id);
    socket.emit('security_update', security.securitySnapshot(sec));
  });

  socket.on('security_offer_deal', () => {
    const result = security.offerDeal(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    io.to(result.directorId).emit('deal_offered');

    const sec = getPlayer(socket.id);
    socket.emit('security_update', security.securitySnapshot(sec));
  });

  socket.on('director_accept_deal', () => {
    const result = security.acceptDeal(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    io.to(hall.deal.securityId).emit('deal_activated');
    io.to(hall.deal.directorId).emit('deal_activated');
  });

  socket.on('director_decline_deal', () => {
    const result = security.declineDeal(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    io.to(hall.deal.securityId).emit('deal_declined');
  });

  socket.on('security_break_deal', () => {
    const result = security.breakDeal(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    hall.players.forEach(p => {
      if (p.role === 'security' || p.role === 'director') {
        io.to(p.id).emit('deal_broken');
      }
    });

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
  });

  socket.on('security_report', ({ targetId }) => {
    const result = security.reportPlayer(socket.id, targetId);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    const sec = getPlayer(socket.id);

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    socket.emit('security_update', security.securitySnapshot(sec));

    io.emit('report_happened', { targetTitle: result.targetTitle });
    emitFactory(hall.factory);
  });

  // ═══════════════════════════════════════════
  // ЗАВЕРШЕНИЕ СМЕНЫ
  // ═══════════════════════════════════════════
  socket.on('player_finish_shift', () => {
    const result = director.finishShift(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    io.emit('shift_progress', {
      finished: hall.players.map(p => ({ id: p.id, name: p.name, finished: p.finished }))
    });

    if (result.newShift) {
      // Автономное поведение завода
      applyIndicatorChanges(hall.factory);

      // Сброс и автоотчёты
      resetReports(hall.factory);
      autoFillReports(hall.factory);

      // Продвинуть проверки
      security.processChecksOnShiftStart();

      const checkResults = security.resolvePendingChecks();
      security.recalcSuspicionsAfterShift();

      // ─── Проверка продажи ───
      if (isFactoryReadyForSale(hall.factory)) {
        hall.phase = 'end';
        io.emit('game_over', {
          reason: 'Инвесторы купили завод!',
          type: 'sale',
          biographies: buildBiographies()
        });
        return;
      }

      // ─── Новая смена ───
      hall.players.forEach(p => {
        io.to(p.id).emit('new_shift', {
          shift: result.shift,
          decisionsLeft: p.decisionsLeft
        });

        if (p.role === 'director' && hall.factory) {
          io.to(p.id).emit('factory_update', factorySnapshot(hall.factory, { forDirector: true }));

          const reply = hall.reportChecks.find(c =>
            c.directorId === p.id && c.directorNotified && !c.notifiedOnce
          );
          if (reply) {
            io.to(p.id).emit('report_check_reply', {
              indicator: reply.indicator,
              answer: reply.answer
            });
            reply.notifiedOnce = true;
          }
        }

        if (p.role === 'security') {
          io.to(p.id).emit('security_update', security.securitySnapshot(p));

          if (checkResults && checkResults.length > 0) {
            io.to(p.id).emit('security_check_results', { results: checkResults });
          }
        }
      });
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

// ═══════════════════════════════════════════
// БИОГРАФИИ
// ═══════════════════════════════════════════
function buildBiographies() {
  const bios = {};

  hall.players.forEach(p => {
    if (p.role === 'director') {
      bios[p.id] = buildDirectorBio(p);
    } else if (p.role === 'security') {
      bios[p.id] = buildSecurityBio(p);
    } else {
      bios[p.id] = 'Вы играли свою роль.';
    }
  });

  return bios;
}

function buildDirectorBio(p) {
  const pocket = hall.factory.pocket || 0;

  let line = 'Вы — Директор. ';
  if (pocket > 100) {
    line += 'Вы вкладывали в завод, но и забирали себе немало. ';
  } else if (pocket > 30) {
    line += 'Вы вкладывали в завод, иногда брали себе. ';
  } else {
    line += 'Вы работали честно, развивали завод. ';
  }

  if (hall.deal.active) {
    line += 'Вы были в сговоре с Безопасником. ';
  } else if (hall.theftsLog.length > 0) {
    line += 'Безопасник вас не прикрывал. ';
  }

  line += 'Завод продан инвесторам. ';

  if (pocket > 100) {
    line += 'Вы ушли богатым — но завод вас не вспомнит добрым словом.';
  } else if (pocket > 30) {
    line += 'Вы ушли с прибылью — но с чем вы ушли, как человек?';
  } else {
    line += 'Вы ушли с чистой совестью.';
  }

  return line;
}

function buildSecurityBio(p) {
  const returns = p.returns || 0;
  const kickbacks = p.kickbacks || 0;

  let line = 'Вы — Безопасник. ';

  if (kickbacks > 50) {
    line += 'Вы много заработали на сговоре. ';
  } else if (kickbacks > 0) {
    line += 'Вы иногда закрывали глаза за долю. ';
  } else if (returns > 50) {
    line += 'Вы честно ловили воров и возвращали деньги заводу. ';
  } else if (returns > 0) {
    line += 'Вы изредка ловили воров. ';
  } else {
    line += 'Вы так и не поймали ни одного вора. ';
  }

  line += 'Завод продан инвесторам.';

  return line;
}

// ─── Старт игры ───
function startRoles() {
  const assignments = assignRoles();

  hall.theftsLog = [];
  hall.reportChecks = [];
  hall.deal = { pending: false, active: false, securityId: null, directorId: null };

  assignments.forEach(a => {
    io.to(a.id).emit('your_role', { role: a.role, label: a.label });
  });

  const playersWithRoles = hall.players.map(p => ({
    id: p.id,
    name: p.name,
    role: p.role
  }));
  io.emit('players_roles', { players: playersWithRoles });

  console.log('Роли розданы:', assignments.map(a => a.role).join(', '));
}

server.listen(PORT, () => {
  console.log('ЗАВОД запущен! Порт:', PORT);
});