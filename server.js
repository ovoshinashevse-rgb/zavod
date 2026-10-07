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
const engineer = require('./server/cabinets/engineer');
const hr = require('./server/cabinets/hr');
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

io.on('connection', (socket) => {
  console.log('Подключился:', socket.id);

  // ═══ Курилка ═══
  socket.on('enter_smoking', ({ name }) => {
    addPlayer(socket.id, name);
    hall.phase = 'smoking';
    io.emit('smoking_update', smoking.getSmokingState());
  });

  socket.on('smoke_action', ({ type }) => {
    const state = smoking.smokeAction(socket.id, type);
    if (!state) return;
    io.emit('smoking_update', state);
  });

  socket.on('hurry', () => {
    hall.players.filter(x => x.status === 'thinking').forEach(p => {
      io.to(p.id).emit('hurried');
    });
  });

  socket.on('player_ready', () => {
    const state = smoking.markReady(socket.id);
    if (!state) return;

    io.emit('smoking_update', state);

    if (allDecided() && hall.phase === 'smoking') {
      startRoles();
    }
  });

  // ═══════════════════════════════════════════
  // ДИРЕКТОР
  // ═══════════════════════════════════════════
  socket.on('director_choose_factory', () => {
    const result = director.chooseFactory(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    hall.players.forEach(p => {
      if (p.role === 'director') {
        io.to(p.id).emit('factory_chosen', {
          factory: result.factory,
          needSetup: true,
          buildings: result.buildings,
          products: result.products
        });
      } else {
        io.to(p.id).emit('factory_chosen', {
          factory: stripPocket(result.factory),
          waitingForDirector: true
        });
      }
    });

    const sec = hall.players.find(x => x.role === 'security');
    if (sec) {
      io.to(sec.id).emit('security_update', security.securitySnapshot(sec));
    }

    console.log('Директор начал настройку завода');
  });

  socket.on('director_choose_building', ({ building }) => {
    const result = director.chooseBuilding(socket.id, building);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('factory_update', {
      ...result.factory,
      needProduct: true,
      products: result.products
    });
  });

  socket.on('director_choose_product', ({ product }) => {
    const result = director.chooseProduct(socket.id, product);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    if (result.needBuilding) {
      socket.emit('need_building');
      return;
    }

    hall.phase = 'choose_equipment';
    hall.shift = 0;

    const eng = hall.players.find(x => x.role === 'engineer');
    if (!eng) {
      startGameAfterSetup();
      return;
    }

    const equipmentList = engineer.getEquipmentList(product);
    io.to(eng.id).emit('choose_equipment', {
      product: product,
      equipmentList: equipmentList
    });

    hall.players.forEach(p => {
      if (p.role === 'engineer') return;
      io.to(p.id).emit('waiting_for_engineer');
    });

    console.log('Ожидание выбора оборудования. Фаза:', hall.phase);
  });

  socket.on('engineer_choose_equipment', ({ equipment }) => {
    const result = engineer.chooseEquipment(socket.id, equipment);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    console.log('Инженер выбрал оборудование:', equipment);
    startGameAfterSetup();
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

  // Список отчётов
  socket.on('director_get_reports', () => {
    const p = getPlayer(socket.id);
    if (!p || p.role !== 'director') return;

    const reports = director.getReports();
    socket.emit('director_reports', {
      reports: reports,
      reviewed: p.reportReviewedThisShift || false,
      decisionsLeft: p.decisionsLeft
    });
  });

  // Обработка отчёта
  socket.on('director_process_report', ({ playerId, action }) => {
    const result = director.processReport(socket.id, playerId, action);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    if (typeof result.decisionsLeft !== 'undefined') {
      socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    }

    if (result.factory) {
      socket.emit('factory_update', result.factory);
    }

    socket.emit('report_processed', {
      action: result.action,
      targetRole: result.targetRole,
      amount: result.amount || null
    });
  });

  // Завершение смены Директором ПОСЛЕ отчётов
  socket.on('director_finish_after_reports', () => {
    const result = director.finishAfterReports(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    handleFinishShift(socket.id, result);
  });

  // ═══════════════════════════════════════════
  // ИНЖЕНЕР
  // ═══════════════════════════════════════════
  socket.on('engineer_work', () => {
    const result = engineer.workAction(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    emitEngineerUpdate(socket.id);
    emitFactory(result.factory);
  });

  socket.on('engineer_start_drink', () => {
    const result = engineer.startDrink(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    emitEngineerUpdate(socket.id);
  });

  socket.on('engineer_drink_place', ({ place }) => {
    const result = engineer.chooseDrinkPlace(socket.id, place);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }
    emitEngineerUpdate(socket.id);
  });

  socket.on('engineer_drink_company', ({ company }) => {
    const result = engineer.chooseDrinkCompany(socket.id, company);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }
    emitEngineerUpdate(socket.id);
  });

  socket.on('engineer_drink_drink', ({ drink }) => {
    const result = engineer.chooseDrinkDrink(socket.id, drink);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }
    emitEngineerUpdate(socket.id);
  });

  socket.on('engineer_drink_amount', ({ amount }) => {
    const result = engineer.chooseDrinkAmount(socket.id, amount);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    emitEngineerUpdate(socket.id);
    emitFactory(result.factory);
  });

  socket.on('engineer_exit_drink', () => {
    const result = engineer.exitDrink(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    emitEngineerUpdate(socket.id);
    emitFactory(result.factory);
  });

  socket.on('engineer_distribute', ({ level }) => {
    const result = engineer.distributeAction(socket.id, level);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    emitEngineerUpdate(socket.id);
    emitFactory(result.factory);
  });

  socket.on('engineer_submit_report', ({ real }) => {
    const result = engineer.submitEngineerReport(socket.id, real);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    emitEngineerUpdate(socket.id);
  });

  // ═══════════════════════════════════════════
  // HR
  // ═══════════════════════════════════════════
  socket.on('hr_hire_start', ({ path }) => {
    const result = hr.hireStart(socket.id, path);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    socket.emit('hr_hiring_update', result.hiring);
    emitHrUpdate(socket.id);
  });

  socket.on('hr_hire_step', ({ step, choice }) => {
    const result = hr.hireStep(socket.id, step, choice);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    socket.emit('hr_hiring_update', result.hiring);

    if (result.hiring.done) {
      const finishResult = hr.hireFinish(socket.id);
      if (finishResult.error) {
        socket.emit('error_msg', finishResult.error);
        return;
      }
      emitHrUpdate(socket.id);
      emitFactory(finishResult.factory);
    } else {
      emitHrUpdate(socket.id);
    }
  });

  socket.on('hr_fire', ({ level }) => {
    const result = hr.fire(socket.id, level);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    emitHrUpdate(socket.id);
    emitFactory(result.factory);
  });

  socket.on('hr_adopt_relative', ({ kind, place, position }) => {
    const result = hr.adoptRelative(socket.id, kind, place, position);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    emitHrUpdate(socket.id);
    emitFactory(result.factory);
  });

  socket.on('hr_cover_family', () => {
    const result = hr.coverFamily(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    emitHrUpdate(socket.id);
  });

  socket.on('hr_fire_relative', ({ index }) => {
    const result = hr.fireRelative(socket.id, index);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    socket.emit('decisions_update', { decisionsLeft: result.decisionsLeft });
    emitHrUpdate(socket.id);
    emitFactory(result.factory);
  });

  // ─── Отчёт (универсальный) ───
  socket.on('submit_report', ({ whatToShow, howToExplain }) => {
    const p = getPlayer(socket.id);
    if (!p) return;

    if (p.role === 'hr') {
      const result = hr.submitReport(socket.id, whatToShow, howToExplain);
      if (result.error) {
        socket.emit('error_msg', result.error);
        return;
      }

      emitHrUpdate(socket.id);
      broadcastReportToDirector(p, result.report);

      // Завершаем смену HR
      const finishResult = director.finishShift(socket.id);
      if (finishResult.error) {
        socket.emit('error_msg', finishResult.error);
        return;
      }

      // HR сразу показывает «ожидание»
      io.to(socket.id).emit('shift_progress', {
        finished: hall.players.map(x => ({ id: x.id, name: x.name, finished: x.finished }))
      });

      // Если HR последний — запускаем общий flow
      if (finishResult.newShift) {
        handleFinishShift(socket.id, finishResult);
      } else {
        // Иначе — просто завершаем смену для остальных (шлём progress)
        io.emit('shift_progress', {
          finished: hall.players.map(x => ({ id: x.id, name: x.name, finished: x.finished }))
        });
      }
    }
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
    const p = getPlayer(socket.id);
    if (!p) return;

    // Директор — сначала список отчётов
    if (p.role === 'director' && !p.finished) {
      socket.emit('need_reports', { role: 'director' });
      return;
    }

    // HR — открыть экран отчёта
    if (p.role === 'hr' && !p.report) {
      socket.emit('need_report', { role: 'hr' });
      return;
    }

    const result = director.finishShift(socket.id);
    if (result.error) {
      socket.emit('error_msg', result.error);
      return;
    }

    handleFinishShift(socket.id, result);
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

// ─── Завершение смены ───
function handleFinishShift(socketId, result) {
  io.emit('shift_progress', {
    finished: hall.players.map(p => ({ id: p.id, name: p.name, finished: p.finished }))
  });

  if (result.newShift) {
    applyIndicatorChanges(hall.factory);

    resetReports(hall.factory);
    autoFillReports(hall.factory);

    security.processChecksOnShiftStart();

    const checkResults = security.resolvePendingChecks();
    security.recalcSuspicionsAfterShift();

    if (isFactoryReadyForSale(hall.factory)) {
      hall.phase = 'end';
      io.emit('game_over', {
        reason: 'Инвесторы купили завод!',
        type: 'sale',
        biographies: buildBiographies()
      });
      return;
    }

    hall.players.forEach(p => {
      p.report = null;
      p.hiring = null;
      p.reportReviewedThisShift = false;

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

      if (p.role === 'engineer') {
        io.to(p.id).emit('engineer_update', engineer.engineerSnapshot(p));
      }

      if (p.role === 'hr') {
        io.to(p.id).emit('hr_update', hr.hrSnapshot(p));
      }
    });
  }
}

// ─── Уведомить Директора о новом отчёте (только роль) ───
function broadcastReportToDirector(player, report) {
  const d = hall.players.find(x => x.role === 'director');
  if (!d) return;

  io.to(d.id).emit('new_report', {
    role: player.role
  });
}

// ─── Снимок без кармана ───
function stripPocket(snapshot) {
  return {
    directions: snapshot.directions,
    invested: snapshot.invested,
    investments: snapshot.investments,
    budgetPercent: snapshot.budgetPercent,
    reputation: snapshot.reputation,
    bankrupt: snapshot.bankrupt,
    building: snapshot.building || null,
    product: snapshot.product || null,
    equipment: snapshot.equipment || null,
    state: snapshot.state || 'mid'
  };
}

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

function emitEngineerUpdate(socketId) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'engineer') return;
  io.to(p.id).emit('engineer_update', engineer.engineerSnapshot(p));
}

function emitHrUpdate(socketId) {
  const p = getPlayer(socketId);
  if (!p || p.role !== 'hr') return;
  io.to(p.id).emit('hr_update', hr.hrSnapshot(p));
}

// ─── Старт игры ───
function startGameAfterSetup() {
  hall.phase = 'game';
  hall.shift = 1;

  hall.players.forEach(p => {
    p.finished = false;
    p.decisionsLeft = 3;
  });

  const DECISIONS = { director: 3, security: 2, engineer: 3, hr: 3 };
  hall.players.forEach(p => {
    p.decisionsLeft = DECISIONS[p.role] || 0;
  });

  hall.players.forEach(p => {
    const snapshot = (p.role === 'director')
      ? factorySnapshot(hall.factory, { forDirector: true })
      : stripPocket(factorySnapshot(hall.factory));

    io.to(p.id).emit('factory_chosen', { factory: snapshot });

    if (p.role === 'engineer') {
      io.to(p.id).emit('engineer_update', engineer.engineerSnapshot(p));
      io.to(p.id).emit('decisions_update', { decisionsLeft: p.decisionsLeft });
    } else if (p.role === 'security') {
      io.to(p.id).emit('security_update', security.securitySnapshot(p));
      io.to(p.id).emit('decisions_update', { decisionsLeft: p.decisionsLeft });
    } else if (p.role === 'hr') {
      io.to(p.id).emit('hr_update', hr.hrSnapshot(p));
      io.to(p.id).emit('decisions_update', { decisionsLeft: p.decisionsLeft });
    } else if (p.role === 'director') {
      io.to(p.id).emit('decisions_update', { decisionsLeft: p.decisionsLeft });
    }
  });

  console.log('Игра началась');
}

// ─── Биографии ───
function buildBiographies() {
  const bios = {};

  hall.players.forEach(p => {
    if (p.role === 'director')      bios[p.id] = buildDirectorBio(p);
    else if (p.role === 'security') bios[p.id] = buildSecurityBio(p);
    else if (p.role === 'engineer') bios[p.id] = buildEngineerBio(p);
    else if (p.role === 'hr')       bios[p.id] = buildHrBio(p);
    else                            bios[p.id] = 'Вы играли свою роль.';
  });

  return bios;
}

function buildDirectorBio(p) {
  const pocket = hall.factory.pocket || 0;
  let line = 'Вы — Директор. ';
  if (pocket > 100) line += 'Вы вкладывали в завод, но и забирали себе немало. ';
  else if (pocket > 30) line += 'Вы вкладывали в завод, иногда брали себе. ';
  else line += 'Вы работали честно, развивали завод. ';
  if (hall.deal.active) line += 'Вы были в сговоре с Безопасником. ';
  else if (hall.theftsLog.length > 0) line += 'Безопасник вас не прикрывал. ';
  line += 'Завод продан инвесторам. ';
  if (pocket > 100) line += 'Вы ушли богатым — но завод вас не вспомнит добрым словом.';
  else if (pocket > 30) line += 'Вы ушли с прибылью — но с чем вы ушли, как человек?';
  else line += 'Вы ушли с чистой совестью.';
  return line;
}

function buildSecurityBio(p) {
  const returns = p.returns || 0;
  const kickbacks = p.kickbacks || 0;
  let line = 'Вы — Безопасник. ';
  if (kickbacks > 50) line += 'Вы много заработали на сговоре. ';
  else if (kickbacks > 0) line += 'Вы иногда закрывали глаза за долю. ';
  else if (returns > 50) line += 'Вы честно ловили воров и возвращали деньги заводу. ';
  else if (returns > 0) line += 'Вы изредка ловили воров. ';
  else line += 'Вы так и не поймали ни одного вора. ';
  line += 'Завод продан инвесторам.';
  return line;
}

function buildEngineerBio(p) {
  const pocket = p.pocket || 0;
  const log = p.drinkLog || [];
  const quality = (hall.factory && hall.factory.indicators && hall.factory.indicators.quality) || 0;
  let line = 'Вы — Инженер. ';
  if (log.length === 0) {
    if (quality >= 70) line += 'Вы ни разу не пили и держали качество на высоте. Золотые руки. ';
    else line += 'Вы ни разу не пили. ';
  } else if (log.length < 3) line += 'Вы пару раз прикладывались к бутылке. ';
  else if (log.length < 7) line += 'Вы частенько уходили в запой. ';
  else line += 'Вы почти не просыхали. ';
  if (pocket > 60) line += 'Денег с этого поимели немало. ';
  if (quality < 30) line += 'Завод из-за вас почти развалился. ';
  else if (quality >= 70) line += 'Но качество держали. ';
  line += 'Завод продан инвесторам.';
  return line;
}

function buildHrBio(p) {
  const familyCount = (p.family && p.family.length) || 0;
  const fund = p.familyFund || 0;
  let line = 'Вы — HR. ';
  if (familyCount === 0) line += 'Вы никого не пристроили. Честный кадровик. ';
  else if (familyCount < 3) line += 'Вы пристроили пару своих. ';
  else if (familyCount < 7) line += 'У вас на заводе работала целая родня. ';
  else line += 'Вы устроили всех своих — завод стал одной большой семьёй. ';
  if (fund > 50) line += 'С этого поимели немало. ';
  line += 'Завод продан инвесторам.';
  return line;
}

// ─── Старт ролей ───
function startRoles() {
  const assignments = assignRoles();

  hall.theftsLog = [];
  hall.reportChecks = [];
  hall.reports = [];
  hall.finesLog = [];
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