(function() {
  'use strict';

  // ─── Mutable game state ──────────────────
  var state = {
    zPos: 0,
    curX: 0,
    tgtX: 0,
    stakes: 0,
    coins: 0,
    bonusC: 0,
    running: false,
    falling: false,
    jumping: false,
    jumpT: 0,
    baseY: 0,
    tgtXTimer: null,
    winTriggered: false,
    winTimer: null,
    winFinalScore: 0,
    winElapsed: 0
  };

  // ─── Master init ─────────────────────────
  function masterInit() {
    var cfg = PONTE.config;

    // Init scene (Three.js setup)
    PONTE.scene.init();

    // Model loader already initialized and GLB loaded by boot.js

    // Start platform
    PONTE.farm.makeIsland(5, 20, null);

    // Bridge container
    PONTE.bridge.init();

    // Player
    PONTE.player.make();

    // Gates
    PONTE.gates.make();

    // Scenery
    PONTE.scenery.make();

    // UI
    PONTE.ui.init();

    // Input (pass move handler)
    PONTE.input.init(function(dir) {
      move(dir);
    });

    // Intro
    PONTE.intro.init();

    // Hide HUD on intro screens
    document.getElementById('hud-wrap').classList.add('hidden-hud');

    // Load saved config
    var savedConfig = GameStorage.getConfig();
    if (savedConfig) {
      var ss = document.getElementById('speed-slider');
      var ds = document.getElementById('diff-slider');
      if (ss) ss.value = savedConfig.speed || 2;
      if (ds) ds.value = savedConfig.difficulty || 2;
    }

    // Init Supabase sync
    GameSync.init(
      'https://jfavxvmddhaiwfllezza.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYXZ4dm1kZGhhaXdmbGxlenphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTk2MjcsImV4cCI6MjA4OTY3NTYyN30.46oU1rkAfs89DJMsKWiqPX6RRasSB1z4-zgcCku39FU'
    );

    // Sync status indicator
    var syncDot = document.getElementById('sync-dot');
    function updateSyncDot() {
      if (!syncDot) return;
      var s = GameSync.getStatus();
      syncDot.className = '';
      syncDot.id = 'sync-dot';
      if (s === 'synced') syncDot.classList.add('online');
      else if (s === 'pending') syncDot.classList.add('pending');
      else syncDot.classList.add('offline');
    }
    GameSync.onStatusChange(updateSyncDot);
    setInterval(updateSyncDot, 5000);
    updateSyncDot();

    // Start render loop
    loop();
  }

  // ─── Input handling ──────────────────────
  function move(dir) {
    if (!state.running || state.falling) return;
    if (state.jumping) {
      PONTE.input.setBuffer(dir);
      return;
    }
    executeMove(dir);
  }

  function executeMove(dir) {
    var cfg = PONTE.config;
    state.jumping = true;
    state.jumpT = 0;
    PONTE.input.clearBuffer();
    if (state.tgtXTimer) clearTimeout(state.tgtXTimer);
    state.tgtX = dir * (cfg.BW / 2 - 0.3);
    state.tgtXTimer = setTimeout(function() { state.tgtX = 0; state.tgtXTimer = null; }, 350);
  }

  // ─── Game control ────────────────────────
  function startGame() {
    var cfg = PONTE.config;
    var introState = PONTE.intro.getState();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    document.getElementById('turn-screen').classList.add('hidden');
    document.getElementById('hud-wrap').classList.remove('hidden-hud');
    PONTE.ui.enableTouch();

    // Clear old bridge planks
    PONTE.bridge.reset();

    state.zPos = 0; state.tgtX = 0; state.curX = 0;
    state.stakes = cfg.ISTAKES; state.coins = 0; state.bonusC = 0;
    PONTE.player.resetPileCount();
    state.falling = false; state.jumping = false;
    PONTE.input.clearBuffer();
    if (state.tgtXTimer) { clearTimeout(state.tgtXTimer); state.tgtXTimer = null; }
    if (state.winTimer) { clearTimeout(state.winTimer); state.winTimer = null; }
    state.winTriggered = false; state.winFinalScore = 0; state.winElapsed = 0;
    var skipBtn = document.getElementById('skip-btn');
    if (skipBtn) skipBtn.classList.add('hidden');

    // Clean up celebration objects
    PONTE.effects.reset();
    PONTE.effects.setFarmRewardSpawned(0);
    PONTE.gates.passed = {};

    // HUD: player name
    var curName = introState.gameMode === 2
      ? (introState.currentPlayer === 1 ? introState.player1Name : introState.player2Name)
      : introState.player1Name;
    PONTE.ui.getPlayerNameEl().textContent = curName;

    // HUD: progress pips (5 segments)
    var pipsHtml = '';
    for (var pi = 0; pi < 5; pi++) pipsHtml += '<span class="pip"></span>';
    PONTE.ui.getPipsEl().innerHTML = pipsHtml;

    // Show player banner in 2-player mode
    var banner = document.getElementById('player-turn-banner');
    if (introState.gameMode === 2) {
      banner.textContent = 'Jogando: ' + curName;
      banner.style.display = 'block';
      setTimeout(function(){ banner.style.display = 'none'; }, 3000);
    } else {
      banner.style.display = 'none';
    }

    PONTE.player.group.position.set(0, 0, 0);
    PONTE.player.group.rotation.set(0, 0, 0);

    PONTE.bridge.buildTo(-15);
    PONTE.ui.update(state);
    state.running = true;
    PONTE.scene.clock.start();

    setTimeout(function() { PONTE.ui.getHintEl().style.opacity = '0'; }, 3500);
  }

  function handleGameEnd(finalScore, won) {
    var introState = PONTE.intro.getState();
    var curName = introState.currentPlayer === 1 ? introState.player1Name : introState.player2Name;
    var curDoc = introState.currentPlayer === 1 ? introState.player1Doc : introState.player2Doc;
    GameStorage.saveScore({
      playerName: curName,
      playerDoc: curDoc,
      score: finalScore,
      won: won,
      gameMode: introState.gameMode,
      difficulty: parseInt(document.getElementById('diff-slider').value),
      speed: parseInt(document.getElementById('speed-slider').value)
    });

    try { GameSync.pushUnsyncedScores(); } catch(e) {}

    if (introState.gameMode === 1) {
      if (won) {
        document.getElementById('win-score').textContent = finalScore;
        document.getElementById('win-screen').classList.remove('hidden');
      } else {
        document.getElementById('final-score').textContent = finalScore;
        document.getElementById('game-over').classList.remove('hidden');
      }
    } else {
      if (introState.currentPlayer === 1) {
        PONTE.intro.setPlayer1Score(finalScore);
        document.getElementById('turn-title').textContent = 'Vez de ' + introState.player2Name + '!';
        document.getElementById('turn-sub').textContent = introState.player1Name + ' fez ' + finalScore + ' pontos. Supere essa marca!';
        document.getElementById('turn-screen').classList.remove('hidden');
      } else {
        PONTE.intro.setPlayer2Score(finalScore);
        // Refresh state after setting score
        var updatedState = PONTE.intro.getState();
        var content = document.getElementById('result-content');
        content.innerHTML = '<b>' + updatedState.player1Name + ':</b> ' + updatedState.player1Score + ' pontos<br>' +
                            '<b>' + updatedState.player2Name + ':</b> ' + updatedState.player2Score + ' pontos';
        var winner = document.getElementById('result-winner');
        if (updatedState.player1Score > updatedState.player2Score) {
          winner.textContent = updatedState.player1Name + ' venceu!';
          winner.style.color = '#FFD700';
        } else if (updatedState.player2Score > updatedState.player1Score) {
          winner.textContent = updatedState.player2Name + ' venceu!';
          winner.style.color = '#FFD700';
        } else {
          winner.textContent = 'Empate!';
          winner.style.color = '#81C784';
        }
        document.getElementById('result-screen').classList.remove('hidden');
      }
    }
  }

  // ─── Main loop ───────────────────────────
  function loop() {
    requestAnimationFrame(loop);
    var cfg = PONTE.config;
    var scene = PONTE.scene.scene;
    var camera = PONTE.scene.camera;
    var renderer = PONTE.scene.renderer;
    var clock = PONTE.scene.clock;

    if (!state.running) {
      camera.position.set(0, 10, 13);
      camera.lookAt(0, 0, -8);
      renderer.render(scene, camera);
      return;
    }

    var dt = Math.min(clock.getDelta(), 0.05);
    var elapsed = clock.elapsedTime;
    var speed = cfg.ISPEED + Math.min(elapsed * 0.5, cfg.MSPEED - cfg.ISPEED);

    // After all gates, slow down
    if (state.zPos > PONTE.gates.lastGateEnd) {
      speed = Math.min(speed, cfg.ISPEED * 0.7);
    }

    state.zPos += speed * dt;
    state.curX += (state.tgtX - state.curX) * 12 * dt;

    // Jump
    if (state.jumping) {
      state.jumpT += dt;
      var p = Math.min(state.jumpT / 0.3, 1);
      state.baseY = Math.sin(p * Math.PI) * 1.0;
      if (p >= 1) {
        state.jumping = false; state.baseY = 0;
        var buf = PONTE.input.getBuffer();
        if (buf !== 0) {
          executeMove(buf);
        }
      }
    }

    PONTE.player.group.position.set(state.curX, state.baseY, -state.zPos);

    // Animate limbs
    PONTE.player.animateLimbs(elapsed, state.jumping);

    // Camera
    if (state.winTriggered) {
      var camT = Math.min(state.winElapsed / 10.0, 1);
      var camAngle = camT * Math.PI * 0.6 - 0.3;
      var camDist = 30 + camT * 20;
      var camH = 12 + Math.sin(camT * Math.PI) * 10;
      camera.position.set(
        Math.sin(camAngle) * camDist,
        camH,
        -cfg.DIST + Math.cos(camAngle) * camDist
      );
      camera.lookAt(0, 2, -cfg.DIST - 8);
    } else {
      camera.position.set(state.curX * 0.12, 12 + Math.sin(elapsed * 0.4) * 0.2, -state.zPos + 14);
      camera.lookAt(state.curX * 0.15, 1, -state.zPos - 10);
    }

    // Build bridge
    var pastAllGates = state.zPos > PONTE.gates.lastGateEnd;
    var bridgeLimit = -(cfg.DIST);
    if (PONTE.bridge.lastPZ > -state.zPos - 18 && PONTE.bridge.lastPZ > bridgeLimit && (state.stakes > 0 || pastAllGates)) {
      var target = Math.max(-state.zPos - 18, bridgeLimit);
      PONTE.bridge.buildTo(target, pastAllGates);
    }
    PONTE.bridge.update(dt);
    PONTE.scenery.update(state.zPos / cfg.DIST);

    // On bridge check
    var pz = -state.zPos;
    var onB = PONTE.bridge.isOnBridge(pz);

    if (!onB && !state.falling && !state.jumping) {
      state.falling = true;
      state.running = false;
      PONTE.ui.disableTouch();
      var ft = 0;
      var fy0 = PONTE.player.group.position.y;
      var fallFn = function() {
        ft += 0.018;
        PONTE.player.group.position.y = fy0 - ft * ft * 35;
        PONTE.player.group.rotation.x += 0.12;
        PONTE.player.group.rotation.z += 0.06;
        renderer.render(scene, camera);
        if (PONTE.player.group.position.y > -18) {
          requestAnimationFrame(fallFn);
        } else {
          handleGameEnd(Math.min(state.coins + state.bonusC, 10000), false);
        }
      };
      fallFn();
      return;
    }

    // Gate check
    var gates = PONTE.gates.list;
    var passed = PONTE.gates.passed;
    for (var i = 0; i < gates.length; i++) {
      var gate = gates[i];
      var key = gate.idx + '-' + gate.side;
      if (passed[key]) continue;
      var dz = Math.abs(-state.zPos - gate.z);
      if (dz < 1.8) {
        var onLeft = state.curX < -1;
        var onRight = state.curX > 1;
        if ((gate.side === 'left' && onLeft) || (gate.side === 'right' && onRight)) {
          passed[gate.idx + '-left'] = true;
          passed[gate.idx + '-right'] = true;
          if (gate.value > 0) {
            state.stakes += gate.value;
            state.bonusC += gate.value * 4;
            PONTE.effects.showFloat('+' + gate.value + ' Produtividade', '#4CAF50');
          } else {
            state.stakes = Math.max(0, state.stakes + gate.value);
            PONTE.effects.showFloat(gate.value + ' Produtividade', '#F44336');
          }
          gate.mesh.children[0].material.opacity = 0.2;
          PONTE.ui.update(state);
          break;
        }
      }
    }

    // Auto-pass old gates
    for (var i = 0; i < gates.length; i++) {
      if (!passed[gates[i].idx + '-left'] && -state.zPos < gates[i].z - 3) {
        passed[gates[i].idx + '-left'] = true;
        passed[gates[i].idx + '-right'] = true;
      }
    }

    PONTE.ui.update(state);

    // Win
    if (state.zPos >= cfg.DIST && !state.winTriggered) {
      state.winTriggered = true;
      state.winElapsed = 0;
      PONTE.effects.setFarmRewardSpawned(0);
      PONTE.ui.disableTouch();
      state.bonusC += state.stakes * 5;
      var finalScore = Math.min(state.coins + state.bonusC, 10000);
      state.winFinalScore = finalScore;
      state.zPos = cfg.DIST;
      PONTE.player.group.position.set(state.curX, state.baseY, -state.zPos);
      PONTE.effects.spawnScatterCoins(state.curX, -state.zPos);
      // Show skip button
      var skipBtn = document.getElementById('skip-btn');
      if (skipBtn) {
        skipBtn.classList.remove('hidden');
        skipBtn.onclick = function() {
          if (state.winTimer) { clearTimeout(state.winTimer); state.winTimer = null; }
          skipBtn.classList.add('hidden');
          state.running = false;
          handleGameEnd(state.winFinalScore, true);
        };
      }
      var REWARDS = PONTE.farm.REWARDS;
      var totalDelay = REWARDS[REWARDS.length - 1].delay + 8.0;
      state.winTimer = setTimeout(function() {
        state.running = false;
        if (skipBtn) skipBtn.classList.add('hidden');
        handleGameEnd(state.winFinalScore, true);
      }, totalDelay * 1000);
    }
    if (state.winTriggered) {
      state.zPos = cfg.DIST;
      state.winElapsed += dt;
      var REWARDS = PONTE.farm.REWARDS;
      var spawned = PONTE.effects.getFarmRewardSpawned();
      while (spawned < REWARDS.length && state.winElapsed >= REWARDS[spawned].delay) {
        PONTE.effects.spawnFarmReward(spawned);
        spawned++;
        PONTE.effects.setFarmRewardSpawned(spawned);
      }
      PONTE.effects.updateScatterCoins(dt);
      PONTE.effects.updateFarmRewards(dt);
    }

    renderer.render(scene, camera);
  }

  // ─── Expose API ──────────────────────────
  PONTE.game = {
    start: startGame,
    handleGameEnd: handleGameEnd,
    state: state
  };

  PONTE.init = masterInit;

})();
