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

  // ---- Split-screen state ----
  var splitMode = false;
  var p1State = null;
  var p2State = null;
  var p1Obj = null;   // { group, stakesPileGroup, lastPileCount }
  var p2Obj = null;
  var p1Bridge = null; // { group, planks, lastPZ }
  var p2Bridge = null;
  var splitRunning = false;
  var splitClock = null;

  // Bridge X offsets for split mode
  var P1_OFFSET_X = -8;
  var P2_OFFSET_X = 8;

  function makePlayerState() {
    return {
      zPos: 0, curX: 0, tgtX: 0,
      stakes: 0, coins: 0, bonusC: 0,
      running: true, falling: false, jumping: false,
      jumpT: 0, baseY: 0, tgtXTimer: null,
      winTriggered: false, winTimer: null,
      winFinalScore: 0, winElapsed: 0,
      finished: false, won: false,
      passed: {},
      inputBuffer: 0
    };
  }

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

  // ---- Split-screen input handling ----
  function moveP1(dir) {
    if (!p1State || !p1State.running || p1State.falling || p1State.finished) return;
    if (p1State.jumping) {
      p1State.inputBuffer = dir;
      return;
    }
    executeMoveFor(p1State, dir);
  }

  function moveP2(dir) {
    if (!p2State || !p2State.running || p2State.falling || p2State.finished) return;
    if (p2State.jumping) {
      p2State.inputBuffer = dir;
      return;
    }
    executeMoveFor(p2State, dir);
  }

  function executeMoveFor(ps, dir) {
    var cfg = PONTE.config;
    ps.jumping = true;
    ps.jumpT = 0;
    ps.inputBuffer = 0;
    if (ps.tgtXTimer) clearTimeout(ps.tgtXTimer);
    ps.tgtX = dir * (cfg.BW / 2 - 0.3);
    ps.tgtXTimer = setTimeout(function() { ps.tgtX = 0; ps.tgtXTimer = null; }, 350);
  }

  // ---- Game control ----
  function startGame() {
    var cfg = PONTE.config;
    var introState = PONTE.intro.getState();

    // Check if this is split-screen 2P
    if (introState.gameMode === 2) {
      startSplitGame();
      return;
    }

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

  // ---- Split-screen game start ----
  function startSplitGame() {
    var cfg = PONTE.config;
    var introState = PONTE.intro.getState();

    splitMode = true;
    PONTE.scene.splitMode = true;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    document.getElementById('turn-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('hud-wrap').classList.add('hidden-hud');
    var skipBtn = document.getElementById('skip-btn');
    if (skipBtn) skipBtn.classList.add('hidden');

    // Hide 1P controls hint
    PONTE.ui.getHintEl().style.opacity = '0';

    // Update camera aspects for split
    var halfW = window.innerWidth / 2;
    var cam1 = PONTE.scene.camera;
    var cam2 = PONTE.scene.camera2;
    cam1.aspect = halfW / window.innerHeight;
    cam1.updateProjectionMatrix();
    cam2.aspect = halfW / window.innerHeight;
    cam2.updateProjectionMatrix();

    // Clean up old celebration/effects
    PONTE.effects.reset();
    PONTE.effects.setFarmRewardSpawned(0);

    // Hide original 1P player
    PONTE.player.group.visible = false;

    // Reset old bridge
    PONTE.bridge.reset();
    // Hide the 1P bridge group (we'll use separate ones)
    PONTE.bridge.group.visible = false;

    // Ensure bridge materials are ready
    PONTE.bridge.ensureMaterials();

    // Rebuild gates in split mode
    PONTE.gates.rebuild();

    // Create player objects
    p1Obj = PONTE.player.makeColored(0x1565C0); // Blue
    p2Obj = PONTE.player.makeColored(0xE65100); // Orange

    // Create bridge states
    p1Bridge = PONTE.bridge.createBridgeState(P1_OFFSET_X);
    p2Bridge = PONTE.bridge.createBridgeState(P2_OFFSET_X);

    // Create player states
    p1State = makePlayerState();
    p1State.stakes = cfg.ISTAKES;
    p2State = makePlayerState();
    p2State.stakes = cfg.ISTAKES;

    // Create start platforms for each bridge
    _makeStartPlatform(P1_OFFSET_X);
    _makeStartPlatform(P2_OFFSET_X);

    // Position players on their bridges
    p1Obj.group.position.set(P1_OFFSET_X, 0, 0);
    p2Obj.group.position.set(P2_OFFSET_X, 0, 0);

    // Build initial bridge segments
    PONTE.bridge.buildToFor(-15, false, p1State, p1Bridge);
    PONTE.bridge.buildToFor(-15, false, p2State, p2Bridge);

    // Create split HUDs
    PONTE.ui.initSplitHuds(introState.player1Name, introState.player2Name);
    PONTE.ui.updateSplitHud('p1', p1State, p1Obj);
    PONTE.ui.updateSplitHud('p2', p2State, p2Obj);

    // Init split input
    PONTE.input.initSplit(
      function(dir) { moveP1(dir); },
      function(dir) { moveP2(dir); }
    );
    PONTE.input.enableSplitTouch();

    // Divider line
    _createDivider();

    splitRunning = true;
    PONTE.scene.clock.start();
  }

  var _splitStartPlatforms = [];
  function _makeStartPlatform(offsetX) {
    var scene = PONTE.scene.scene;
    var top = new THREE.Mesh(
      new THREE.BoxGeometry(12, 1, 20),
      new THREE.MeshStandardMaterial({ color: 0x7CB342, roughness: 0.85 })
    );
    top.position.set(offsetX, -0.5, 5);
    top.receiveShadow = true;
    scene.add(top);
    _splitStartPlatforms.push(top);

    var dirt = new THREE.Mesh(
      new THREE.BoxGeometry(12, 3, 20),
      new THREE.MeshStandardMaterial({ color: 0x6D4C41, roughness: 0.9 })
    );
    dirt.position.set(offsetX, -2.5, 5);
    scene.add(dirt);
    _splitStartPlatforms.push(dirt);
  }

  var _dividerEl = null;
  function _createDivider() {
    if (_dividerEl) _dividerEl.remove();
    _dividerEl = document.createElement('div');
    _dividerEl.id = 'split-divider';
    _dividerEl.style.cssText = 'position:absolute;left:50%;top:0;width:3px;height:100%;background:rgba(255,255,255,0.3);z-index:20;pointer-events:none;transform:translateX(-50%)';
    document.getElementById('ui').appendChild(_dividerEl);
  }

  function _removeDivider() {
    if (_dividerEl) { _dividerEl.remove(); _dividerEl = null; }
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
    } else {
      document.getElementById('final-score').textContent = finalScore;
      document.getElementById('game-over').classList.remove('hidden');
      renderRanking('ranking-gameover', curDoc);
    }
  }

  // ---- Split-screen end handling ----
  function handleSplitEnd() {
    splitRunning = false;
    PONTE.input.disableSplitTouch();

    var introState = PONTE.intro.getState();
    var p1Score = Math.min(p1State.coins + p1State.bonusC, 10000);
    var p2Score = Math.min(p2State.coins + p2State.bonusC, 10000);

    // Add win bonus for stakes if they won
    if (p1State.won) p1Score = Math.min(p1Score + p1State.stakes * 5, 10000);
    if (p2State.won) p2Score = Math.min(p2Score + p2State.stakes * 5, 10000);

    // Save scores
    GameStorage.saveScore({
      playerName: introState.player1Name,
      playerDoc: introState.player1Doc,
      score: p1Score,
      won: p1State.won,
      gameMode: 2,
      difficulty: parseInt(document.getElementById('diff-slider').value),
      speed: parseInt(document.getElementById('speed-slider').value)
    });
    GameStorage.saveScore({
      playerName: introState.player2Name,
      playerDoc: introState.player2Doc,
      score: p2Score,
      won: p2State.won,
      gameMode: 2,
      difficulty: parseInt(document.getElementById('diff-slider').value),
      speed: parseInt(document.getElementById('speed-slider').value)
    });
    try { GameSync.pushUnsyncedScores(); } catch(e) {}

    PONTE.intro.setPlayer1Score(p1Score);
    PONTE.intro.setPlayer2Score(p2Score);

    // Remove split HUDs and divider
    PONTE.ui.removeSplitHuds();
    _removeDivider();

    // Show result screen
    var content = document.getElementById('result-content');
    content.innerHTML = '<b>' + introState.player1Name + ':</b> ' + p1Score + ' pontos<br>' +
                        '<b>' + introState.player2Name + ':</b> ' + p2Score + ' pontos';
    var winner = document.getElementById('result-winner');
    if (p1Score > p2Score) {
      winner.textContent = introState.player1Name + ' venceu!';
      winner.style.color = '#FFD700';
    } else if (p2Score > p1Score) {
      winner.textContent = introState.player2Name + ' venceu!';
      winner.style.color = '#FFD700';
    } else {
      winner.textContent = 'Empate!';
      winner.style.color = '#81C784';
    }
    document.getElementById('result-screen').classList.remove('hidden');
  }

  // ---- Main loop ----
  function loop() {
    requestAnimationFrame(loop);
    var cfg = PONTE.config;
    var scene = PONTE.scene.scene;
    var camera = PONTE.scene.camera;
    var renderer = PONTE.scene.renderer;
    var clock = PONTE.scene.clock;

    // ---- Split-screen mode ----
    if (splitMode) {
      loopSplit(cfg, scene, camera, renderer, clock);
      return;
    }

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

  // ---- Split-screen loop ----
  function loopSplit(cfg, scene, camera, renderer, clock) {
    var camera2 = PONTE.scene.camera2;

    if (!splitRunning) {
      // Idle split view
      camera.position.set(P1_OFFSET_X, 10, 13);
      camera.lookAt(P1_OFFSET_X, 0, -8);
      camera2.position.set(P2_OFFSET_X, 10, 13);
      camera2.lookAt(P2_OFFSET_X, 0, -8);
      PONTE.scene.renderSplit(scene, camera, camera2);
      return;
    }

    var dt = Math.min(clock.getDelta(), 0.05);
    var elapsed = clock.elapsedTime;
    var speed = cfg.ISPEED + Math.min(elapsed * 0.5, cfg.MSPEED - cfg.ISPEED);

    // Update both players
    _updateSplitPlayer(p1State, p1Obj, p1Bridge, P1_OFFSET_X, dt, elapsed, speed, cfg, 0);
    _updateSplitPlayer(p2State, p2Obj, p2Bridge, P2_OFFSET_X, dt, elapsed, speed, cfg, 1);

    // Update shared systems
    PONTE.bridge.update(dt);
    var maxProgress = Math.max(p1State.zPos, p2State.zPos);
    PONTE.scenery.update(maxProgress / cfg.DIST);

    // Camera for P1
    if (!p1State.finished) {
      camera.position.set(P1_OFFSET_X + p1State.curX * 0.12, 12 + Math.sin(elapsed * 0.4) * 0.2, -p1State.zPos + 14);
      camera.lookAt(P1_OFFSET_X + p1State.curX * 0.15, 1, -p1State.zPos - 10);
    } else {
      camera.position.set(P1_OFFSET_X, 10, -p1State.zPos + 14);
      camera.lookAt(P1_OFFSET_X, 2, -p1State.zPos - 10);
    }

    // Camera for P2
    if (!p2State.finished) {
      camera2.position.set(P2_OFFSET_X + p2State.curX * 0.12, 12 + Math.sin(elapsed * 0.4) * 0.2, -p2State.zPos + 14);
      camera2.lookAt(P2_OFFSET_X + p2State.curX * 0.15, 1, -p2State.zPos - 10);
    } else {
      camera2.position.set(P2_OFFSET_X, 10, -p2State.zPos + 14);
      camera2.lookAt(P2_OFFSET_X, 2, -p2State.zPos - 10);
    }

    // Update HUDs
    PONTE.ui.updateSplitHud('p1', p1State, p1Obj);
    PONTE.ui.updateSplitHud('p2', p2State, p2Obj);

    // Check if both finished
    if (p1State.finished && p2State.finished) {
      handleSplitEnd();
    }

    // Render split
    PONTE.scene.renderSplit(scene, camera, camera2);
  }

  function _updateSplitPlayer(ps, pObj, bState, offsetX, dt, elapsed, speed, cfg, playerIdx) {
    if (ps.finished) return;

    // Speed
    var curSpeed = speed;
    if (ps.zPos > PONTE.gates.lastGateEnd) {
      curSpeed = Math.min(curSpeed, cfg.ISPEED * 0.7);
    }

    if (ps.falling) return; // fall animation handles itself

    ps.zPos += curSpeed * dt;
    ps.curX += (ps.tgtX - ps.curX) * 12 * dt;

    // Jump
    if (ps.jumping) {
      ps.jumpT += dt;
      var p = Math.min(ps.jumpT / 0.3, 1);
      ps.baseY = Math.sin(p * Math.PI) * 1.0;
      if (p >= 1) {
        ps.jumping = false; ps.baseY = 0;
        if (ps.inputBuffer !== 0) {
          executeMoveFor(ps, ps.inputBuffer);
        }
      }
    }

    // Position player
    pObj.group.position.set(offsetX + ps.curX, ps.baseY, -ps.zPos);
    PONTE.player.animateLimbsOn(pObj.group, elapsed, ps.jumping);

    // Build bridge
    var pastAllGates = ps.zPos > PONTE.gates.lastGateEnd;
    var bridgeLimit = -(cfg.DIST);
    if (bState.lastPZ > -ps.zPos - 18 && bState.lastPZ > bridgeLimit && (ps.stakes > 0 || pastAllGates)) {
      var target = Math.max(-ps.zPos - 18, bridgeLimit);
      PONTE.bridge.buildToFor(target, pastAllGates, ps, bState);
    }

    // On bridge check
    var pz = -ps.zPos;
    var onB = PONTE.bridge.isOnBridgeFor(pz, bState);

    if (!onB && !ps.falling && !ps.jumping) {
      ps.falling = true;
      ps.running = false;
      ps.won = false;
      // Fall animation
      var ft = 0;
      var fy0 = pObj.group.position.y;
      var scene = PONTE.scene.scene;
      var fallFn = function() {
        ft += 0.018;
        pObj.group.position.y = fy0 - ft * ft * 35;
        pObj.group.rotation.x += 0.12;
        pObj.group.rotation.z += 0.06;
        if (pObj.group.position.y > -18) {
          requestAnimationFrame(fallFn);
        } else {
          ps.finished = true;
        }
      };
      fallFn();
      return;
    }

    // Gate check (only check gates for this player's bridge)
    var gates = PONTE.gates.list;
    for (var i = 0; i < gates.length; i++) {
      var gate = gates[i];
      if (gate.bridge !== playerIdx) continue;
      var passKey = (playerIdx === 0 ? 'p1' : 'p2') + '-' + gate.idx + '-' + gate.side;
      if (ps.passed[passKey]) continue;
      var dz = Math.abs(-ps.zPos - gate.z);
      if (dz < 1.8) {
        var onLeft = ps.curX < -1;
        var onRight = ps.curX > 1;
        if ((gate.side === 'left' && onLeft) || (gate.side === 'right' && onRight)) {
          ps.passed[(playerIdx === 0 ? 'p1' : 'p2') + '-' + gate.idx + '-left'] = true;
          ps.passed[(playerIdx === 0 ? 'p1' : 'p2') + '-' + gate.idx + '-right'] = true;
          if (gate.value > 0) {
            ps.stakes += gate.value;
            ps.bonusC += gate.value * 4;
          } else {
            ps.stakes = Math.max(0, ps.stakes + gate.value);
          }
          gate.mesh.children[0].material.opacity = 0.2;
          break;
        }
      }
    }

    // Auto-pass old gates
    for (var i = 0; i < gates.length; i++) {
      var gate = gates[i];
      if (gate.bridge !== playerIdx) continue;
      var autoKey = (playerIdx === 0 ? 'p1' : 'p2') + '-' + gate.idx + '-left';
      if (!ps.passed[autoKey] && -ps.zPos < gate.z - 3) {
        ps.passed[(playerIdx === 0 ? 'p1' : 'p2') + '-' + gate.idx + '-left'] = true;
        ps.passed[(playerIdx === 0 ? 'p1' : 'p2') + '-' + gate.idx + '-right'] = true;
      }
    }

    // Win check
    if (ps.zPos >= cfg.DIST && !ps.winTriggered) {
      ps.winTriggered = true;
      ps.won = true;
      ps.bonusC += ps.stakes * 5;
      ps.zPos = cfg.DIST;
      pObj.group.position.set(offsetX + ps.curX, ps.baseY, -ps.zPos);
      ps.finished = true;
    }
  }

  // ---- Expose API ----
  PONTE.game = {
    start: startGame,
    handleGameEnd: handleGameEnd,
    state: state
  };

  PONTE.init = masterInit;

})();
