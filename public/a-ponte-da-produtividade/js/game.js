(function() {
  'use strict';

  // ---- Mutable game state (1P / turn-based 2P) ----
  var state = {
    zPos: 0,
    curX: 0,
    tgtX: 0,
    stakes: 0,
    coins: 0,
    bonusC: 0,
    syncoins: 0,
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

  // ---- Master init ----
  function masterInit() {
    var cfg = PONTE.config;

    // Init scene (Three.js setup)
    PONTE.scene.init();

    // Start platform
    PONTE.farm.makeIsland(5, 20, null);

    // Bridge container
    PONTE.bridge.init();

    // Player
    PONTE.player.make();

    // Gates
    PONTE.gates.make();

    // Bonuses
    PONTE.bonuses.make();

    // Scenery
    PONTE.scenery.make();

    // UI
    PONTE.ui.init();

    // Input (pass move handler)
    PONTE.input.init(function(dir) {
      move(dir);
    });

    // Check for URL params (iframe split-screen mode)
    var urlParams = new URLSearchParams(window.location.search);
    var iframeName = urlParams.get('player');
    if (iframeName) {
      // Auto-start mode: skip intro, start game immediately
      var iframeDoc = urlParams.get('doc') || '';
      var iframeControls = urlParams.get('controls') || 'all';
      var iframeSpeed = parseInt(urlParams.get('speed')) || 2;
      var iframeDiff = parseInt(urlParams.get('difficulty')) || 2;

      // Set control mode
      PONTE.input.setControlMode(iframeControls);

      // Apply speed config
      cfg.ISPEED = [0, 10, 14, 20][iframeSpeed];
      cfg.MSPEED = [0, 22, 32, 45][iframeSpeed];

      // Apply difficulty config
      if (iframeDiff === 1) {
        cfg.GSPACE = 28;
        cfg.gateGoodMin = Math.ceil(cfg.GSPACE / cfg.PL); cfg.gateGoodRange = 15;
        cfg.gateBadMin = 3; cfg.gateBadRange = 5;
      } else if (iframeDiff === 2) {
        cfg.GSPACE = 24;
        cfg.gateGoodMin = Math.ceil(cfg.GSPACE / cfg.PL); cfg.gateGoodRange = 12;
        cfg.gateBadMin = 5; cfg.gateBadRange = 10;
      } else {
        cfg.GSPACE = 20;
        cfg.gateGoodMin = Math.ceil(cfg.GSPACE / cfg.PL); cfg.gateGoodRange = 8;
        cfg.gateBadMin = 8; cfg.gateBadRange = 15;
      }
      cfg.DIST = cfg.GSPACE * (cfg.NGATES - 1) + 16 + 40;

      // Store player info for scoring
      PONTE._iframePlayer = { name: iframeName, doc: iframeDoc };

      // Rebuild gates/farm with new config
      PONTE.farm.buildEndScene();
      PONTE.gates.rebuild();

      // Start the game directly
      startGameDirect(iframeName);
      return;
    }

    // Normal flow: init intro
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

  // ---- Input handling (1P) ----
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

  // ---- Game control ----
  function startGame() {
    var cfg = PONTE.config;
    var introState = PONTE.intro.getState();

    // 2P mode is now handled by split.html (iframe-based)
    // If gameMode === 2, intro.js will redirect to split.html

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    document.getElementById('turn-screen').classList.add('hidden');
    document.getElementById('hud-wrap').classList.remove('hidden-hud');
    PONTE.ui.enableTouch();

    // Clear old bridge planks
    PONTE.bridge.reset();

    state.zPos = 0; state.tgtX = 0; state.curX = 0;
    state.stakes = cfg.ISTAKES; state.coins = 0; state.bonusC = 0; state.syncoins = 0;
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
    PONTE.bonuses.reset();
    PONTE.bonuses.make();

    // HUD: player name
    var curName = introState.player1Name;
    PONTE.ui.getPlayerNameEl().textContent = curName;

    // HUD: progress pips (5 segments)
    var pipsHtml = '';
    for (var pi = 0; pi < 5; pi++) pipsHtml += '<span class="pip"></span>';
    PONTE.ui.getPipsEl().innerHTML = pipsHtml;

    var banner = document.getElementById('player-turn-banner');
    banner.style.display = 'none';

    PONTE.player.group.position.set(0, 0, 0);
    PONTE.player.group.rotation.set(0, 0, 0);

    PONTE.bridge.buildTo(-15);
    PONTE.ui.update(state);
    state.running = true;
    PONTE.scene.clock.start();

    setTimeout(function() { PONTE.ui.getHintEl().style.opacity = '0'; }, 3500);
  }

  /** Auto-start for iframe split-screen mode (skips intro) */
  function startGameDirect(playerName) {
    var cfg = PONTE.config;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    document.getElementById('turn-screen').classList.add('hidden');
    document.getElementById('hud-wrap').classList.remove('hidden-hud');
    PONTE.ui.enableTouch();

    PONTE.bridge.reset();

    state.zPos = 0; state.tgtX = 0; state.curX = 0;
    state.stakes = cfg.ISTAKES; state.coins = 0; state.bonusC = 0; state.syncoins = 0;
    PONTE.player.resetPileCount();
    state.falling = false; state.jumping = false;
    PONTE.input.clearBuffer();
    if (state.tgtXTimer) { clearTimeout(state.tgtXTimer); state.tgtXTimer = null; }
    if (state.winTimer) { clearTimeout(state.winTimer); state.winTimer = null; }
    state.winTriggered = false; state.winFinalScore = 0; state.winElapsed = 0;
    var skipBtn = document.getElementById('skip-btn');
    if (skipBtn) skipBtn.classList.add('hidden');

    PONTE.effects.reset();
    PONTE.effects.setFarmRewardSpawned(0);
    PONTE.gates.passed = {};
    PONTE.bonuses.reset();
    PONTE.bonuses.make();

    PONTE.ui.getPlayerNameEl().textContent = playerName;

    var pipsHtml = '';
    for (var pi = 0; pi < 5; pi++) pipsHtml += '<span class="pip"></span>';
    PONTE.ui.getPipsEl().innerHTML = pipsHtml;

    var banner = document.getElementById('player-turn-banner');
    if (banner) banner.style.display = 'none';

    PONTE.player.group.position.set(0, 0, 0);
    PONTE.player.group.rotation.set(0, 0, 0);

    PONTE.bridge.buildTo(-15);
    PONTE.ui.update(state);
    state.running = true;
    PONTE.scene.clock.start();

    setTimeout(function() { PONTE.ui.getHintEl().style.opacity = '0'; }, 3500);

    // Start render loop
    loop();
  }

  // ---- Ranking with pagination ----
  function renderRanking(containerId, currentDoc) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var allScores = GameStorage.getRankings(200);
    var perPage = 5;
    var page = 0;
    var totalPages = Math.max(1, Math.ceil(allScores.length / perPage));

    var currentPos = -1;
    var normDoc = (currentDoc || '').replace(/\D/g, '');
    for (var i = 0; i < allScores.length; i++) {
      if (allScores[i].playerDoc === normDoc) { currentPos = i; break; }
    }
    if (currentPos >= 0) page = Math.floor(currentPos / perPage);

    function draw() {
      var start = page * perPage;
      var items = allScores.slice(start, start + perPage);
      var html = '<div class="ranking-title">RANKING</div><ul class="ranking-list">';
      for (var i = 0; i < items.length; i++) {
        var pos = start + i + 1;
        var s = items[i];
        var isCurrent = s.playerDoc === normDoc;
        html += '<li class="ranking-item' + (isCurrent ? ' current' : '') + '">';
        html += '<span class="ranking-pos">' + pos + '.</span>';
        html += '<span class="ranking-name">' + (s.playerName || 'Jogador') + '</span>';
        html += '<span class="ranking-score">' + s.score + '</span>';
        html += '</li>';
      }
      if (items.length === 0) {
        html += '<li class="ranking-item" style="justify-content:center;opacity:0.4">Nenhum resultado</li>';
      }
      html += '</ul>';
      html += '<div class="ranking-pages">';
      html += '<button id="' + containerId + '-prev" ' + (page <= 0 ? 'disabled' : '') + '>&#8249;</button>';
      html += '<span>' + (page + 1) + ' / ' + totalPages + '</span>';
      html += '<button id="' + containerId + '-next" ' + (page >= totalPages - 1 ? 'disabled' : '') + '>&#8250;</button>';
      html += '</div>';
      container.innerHTML = html;

      var prevBtn = document.getElementById(containerId + '-prev');
      var nextBtn = document.getElementById(containerId + '-next');
      if (prevBtn) prevBtn.addEventListener('click', function() { if (page > 0) { page--; draw(); } });
      if (nextBtn) nextBtn.addEventListener('click', function() { if (page < totalPages - 1) { page++; draw(); } });
    }
    draw();
  }

  function handleGameEnd(finalScore, won) {
    PONTE.effects.clearFloats();

    // If running inside an iframe (split-screen mode), post message to parent
    if (PONTE._iframePlayer) {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'gameEnd', score: finalScore, won: won }, '*');
      }
      // Still show end screen in iframe
      if (won) {
        document.getElementById('win-score').textContent = finalScore;
        document.getElementById('win-screen').classList.remove('hidden');
      } else {
        document.getElementById('final-score').textContent = finalScore;
        document.getElementById('game-over').classList.remove('hidden');
      }
      // Hide restart buttons in iframe mode
      var restartBtn = document.getElementById('restart-btn');
      var winBtn = document.getElementById('win-btn');
      var retryBtn = document.getElementById('retry-btn');
      var winRetryBtn = document.getElementById('win-retry-btn');
      if (restartBtn) restartBtn.style.display = 'none';
      if (winBtn) winBtn.style.display = 'none';
      if (retryBtn) retryBtn.style.display = 'none';
      if (winRetryBtn) winRetryBtn.style.display = 'none';
      return;
    }

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

    // 1P mode end screens
    if (won) {
      document.getElementById('win-score').textContent = finalScore;
      document.getElementById('win-screen').classList.remove('hidden');
      renderRanking('ranking-win', curDoc);
      var prodGrid = document.getElementById('win-products');
      if (prodGrid) {
        var prizes = [
          { emoji: '🚜', name: 'Trator' },
          { emoji: '🛻', name: 'Caminhonete' },
          { emoji: '🛩️', name: 'Drone' }
        ];
        var html = '';
        for (var pi = 0; pi < prizes.length; pi++) {
          html += '<div class="win-prize-card">';
          html += '<span class="win-prize-icon">' + prizes[pi].emoji + '</span>';
          html += '<span class="win-prize-name">' + prizes[pi].name + '</span>';
          html += '</div>';
        }
        prodGrid.innerHTML = html;
      }
    } else {
      document.getElementById('final-score').textContent = finalScore;
      document.getElementById('game-over').classList.remove('hidden');
      renderRanking('ranking-gameover', curDoc);
    }
  }

  // ---- Main loop ----
  function loop() {
    requestAnimationFrame(loop);
    var cfg = PONTE.config;
    var scene = PONTE.scene.scene;
    var camera = PONTE.scene.camera;
    var renderer = PONTE.scene.renderer;
    var clock = PONTE.scene.clock;

    // ---- 1P mode ----
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
      var farmZ = -cfg.DIST - 5;
      var t = state.winElapsed;
      var cx, cy, cz, lx, ly, lz;

      // Known reward world positions
      var targets = [
        { x: -6, y: 2, z: farmZ + 25 },  // trator
        { x: 8,  y: 2, z: farmZ + 22 },   // caminhonete
        { x: 0,  y: 6, z: farmZ + 10 }    // drone
      ];
      var delays = [1.0, 5.0, 9.0];

      if (t < delays[0]) {
        // Approach
        var p = t / delays[0];
        cx = 0; cy = 8; cz = farmZ + 45 - p * 5;
        lx = 0; ly = 3; lz = farmZ + 20;
      } else if (t < delays[1]) {
        // Cut 1: orbit trator
        var tg = targets[0];
        var p = (t - delays[0]) / (delays[1] - delays[0]);
        var angle = -0.5 + p * Math.PI * 0.6;
        cx = tg.x + Math.sin(angle) * 12;
        cy = tg.y + 4 + Math.sin(p * Math.PI) * 2;
        cz = tg.z + Math.cos(angle) * 12;
        lx = tg.x; ly = tg.y; lz = tg.z;
      } else if (t < delays[2]) {
        // Cut 2: orbit caminhonete
        var tg = targets[1];
        var p = (t - delays[1]) / (delays[2] - delays[1]);
        var angle = 0.3 + p * Math.PI * 0.6;
        cx = tg.x + Math.sin(angle) * 12;
        cy = tg.y + 4 + Math.sin(p * Math.PI) * 2;
        cz = tg.z + Math.cos(angle) * 12;
        lx = tg.x; ly = tg.y; lz = tg.z;
      } else if (t < delays[2] + 4) {
        // Cut 3: orbit drone
        var tg = targets[2];
        var p = (t - delays[2]) / 4;
        var angle = -0.2 + p * Math.PI * 0.5;
        cx = tg.x + Math.sin(angle) * 10;
        cy = tg.y + 2 + Math.sin(p * Math.PI) * 3;
        cz = tg.z + Math.cos(angle) * 10;
        lx = tg.x; ly = tg.y; lz = tg.z;
      } else {
        // Final: wide pullback
        var p = Math.min((t - delays[2] - 4) / 3.0, 1);
        var angle = 1.0 + p * 0.6;
        var dist = 25 + p * 30;
        cx = Math.sin(angle) * dist;
        cy = 15 + p * 10;
        cz = farmZ + 20 + Math.cos(angle) * dist;
        lx = 0; ly = 2; lz = farmZ + 15;
      }
      camera.position.set(cx, cy, cz);
      camera.lookAt(lx, ly, lz);
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
      var fx0 = PONTE.player.group.position.x;
      var fz0 = PONTE.player.group.position.z;
      var camShake = 0;
      var fallDone = false;
      var fallFn = function() {
        ft += 0.014;
        var py = fy0 - ft * ft * 22;
        PONTE.player.group.position.y = py;
        PONTE.player.group.rotation.x += 0.08;
        PONTE.player.group.rotation.z += 0.04;

        // Camera watches the fall with slight shake
        if (!fallDone) {
          camShake = Math.sin(ft * 40) * Math.min(ft * 0.5, 0.3);
          camera.position.set(
            fx0 * 0.12 + camShake,
            12 + ft * 3,
            fz0 + 14 + ft * 4
          );
          camera.lookAt(fx0 * 0.15, py, fz0 - 5);
        }

        renderer.render(scene, camera);

        if (py > -18) {
          requestAnimationFrame(fallFn);
        } else if (!fallDone) {
          fallDone = true;
          // Pause before showing game over
          setTimeout(function() {
            handleGameEnd(Math.min(state.coins + state.bonusC, 10000), false);
          }, 800);
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
            PONTE.effects.showFloat('+' + gate.value + ' Produtividade', '#81E6A0');
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

    // Bonus coin collection
    if (!state.winTriggered && !state.falling) {
      var collected = PONTE.bonuses.update(dt, elapsed, -state.zPos, state.curX);
      if (collected) {
        for (var bi = 0; bi < collected.length; bi++) {
          state.syncoins += collected[bi].value;
          PONTE.effects.showFloat('+' + collected[bi].value + ' SynCoins', '#FFD700');
        }
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
      var skipBtn = document.getElementById('skip-btn');
      if (skipBtn) {
        skipBtn.classList.remove('hidden');
        skipBtn.onclick = function() {
          if (state.winTimer) { clearTimeout(state.winTimer); state.winTimer = null; }
          skipBtn.classList.add('hidden');
          var celHide = document.getElementById('celebration-text');
          if (celHide) { celHide.classList.add('hidden'); celHide.classList.remove('visible'); }
          state.running = false;
          handleGameEnd(state.winFinalScore, true);
        };
      }
      var REWARDS = PONTE.farm.REWARDS;
      var totalDelay = REWARDS[REWARDS.length - 1].delay + 7;
      state.winTimer = setTimeout(function() {
        state.running = false;
        if (skipBtn) skipBtn.classList.add('hidden');
        var celHide = document.getElementById('celebration-text');
        if (celHide) { celHide.classList.add('hidden'); celHide.classList.remove('visible'); }
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

      // Celebration text synced with rewards
      var celEl = document.getElementById('celebration-text');
      if (celEl) {
        var celTexts = [
          'Aumente sua produtividade',
          'Acumule SynCoins',
          'Resgate prêmios'
        ];
        var celDelays = [1.0, 5.0, 9.0];
        var activeCel = -1;
        for (var ci = celDelays.length - 1; ci >= 0; ci--) {
          if (state.winElapsed >= celDelays[ci]) { activeCel = ci; break; }
        }
        if (activeCel >= 0) {
          var timeSinceCut = state.winElapsed - celDelays[activeCel];
          celEl.classList.remove('hidden');
          celEl.textContent = celTexts[activeCel];
          if (timeSinceCut < 0.6) {
            celEl.classList.add('visible');
          } else if (activeCel < celDelays.length - 1 && state.winElapsed > celDelays[activeCel + 1] - 0.6) {
            celEl.classList.remove('visible');
          } else if (activeCel === celDelays.length - 1 && timeSinceCut > 3.5) {
            celEl.classList.remove('visible');
          } else {
            celEl.classList.add('visible');
          }
        }
      }
    }

    renderer.render(scene, camera);
  }

  // ---- Expose API ----
  PONTE.game = {
    start: startGame,
    handleGameEnd: handleGameEnd,
    state: state
  };

  PONTE.init = masterInit;

})();
