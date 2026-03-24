(function() {
  'use strict';

  var gameMode = 1;
  var currentPlayer = 1;
  var player1Score = 0;
  var player2Score = 0;
  var player1Name = '', player2Name = '';
  var player1Doc = '', player2Doc = '';
  var playerName = '', playerDoc = '';

  function init() {
    var cfg = PONTE.config;

    // Step 1 -> Step 2
    document.getElementById('btn-go-step2').addEventListener('click', function(){
      document.getElementById('start-step1').classList.add('hide');
      document.getElementById('start-step2').classList.add('active');
    });

    // Step 2 -> Step 1 (back)
    document.getElementById('btn-back-step1').addEventListener('click', function(){
      document.getElementById('start-step1').classList.remove('hide');
      document.getElementById('start-step2').classList.remove('active');
      document.getElementById('player-form').classList.add('hidden');
    });

    // Mode select: 1P or 2P -> show form
    var btn1p = document.getElementById('btn-1p');
    var btn2p = document.getElementById('btn-2p');
    function selectMode(mode) {
      gameMode = mode;
      btn1p.classList.toggle('selected', mode === 1);
      btn2p.classList.toggle('selected', mode === 2);
      document.getElementById('player-form').classList.remove('hidden');
      if (mode === 2) {
        document.getElementById('p2-fields').classList.remove('hidden');
        document.getElementById('input-nome').placeholder = 'Nome do Jogador 1';
        document.getElementById('input-doc').placeholder = 'CPF/CNPJ do Jogador 1';
      } else {
        document.getElementById('p2-fields').classList.add('hidden');
        document.getElementById('input-nome').placeholder = 'Seu nome';
        document.getElementById('input-doc').placeholder = 'CPF ou CNPJ';
      }
    }
    btn1p.addEventListener('click', function(){ selectMode(1); });
    btn2p.addEventListener('click', function(){ selectMode(2); });

    // Config panel toggle
    document.getElementById('config-toggle').addEventListener('click', function(){
      document.getElementById('config-panel').classList.remove('hidden');
    });
    document.getElementById('config-save').addEventListener('click', function(){
      document.getElementById('config-panel').classList.add('hidden');
    });

    // Start button
    document.getElementById('start-btn').addEventListener('click', tryStart);
    document.getElementById('restart-btn').addEventListener('click', function(){ location.reload(); });
    document.getElementById('win-btn').addEventListener('click', function(){ location.reload(); });

    // Turn and result screen buttons
    document.getElementById('turn-btn').addEventListener('click', function(){
      document.getElementById('turn-screen').classList.add('hidden');
      currentPlayer = 2;
      PONTE.gates.rebuild();
      PONTE.game.start();
    });
    document.getElementById('result-btn').addEventListener('click', function(){ location.reload(); });

    // Slider labels
    var speedNames = ['', 'Lento', 'Normal', 'Rápido'];
    var diffNames = ['', 'Fácil', 'Normal', 'Difícil'];
    var speedSlider = document.getElementById('speed-slider');
    var diffSlider = document.getElementById('diff-slider');
    var speedLabel = document.getElementById('speed-label');
    var diffLabel = document.getElementById('diff-label');
    speedSlider.addEventListener('input', function(){ speedLabel.textContent = speedNames[this.value]; });
    diffSlider.addEventListener('input', function(){ diffLabel.textContent = diffNames[this.value]; });

    // CPF/CNPJ mask
    document.getElementById('input-doc').addEventListener('input', function(e) {
      var v = e.target.value.replace(/\D/g, '');
      if (v.length <= 11) {
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      } else {
        v = v.substring(0, 14);
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
      }
      e.target.value = v;
    });
  }

  function tryStart() {
    var cfg = PONTE.config;
    var nome = document.getElementById('input-nome').value.trim();
    var doc = document.getElementById('input-doc').value.trim();
    var errEl = document.getElementById('form-error');

    if (!nome) {
      errEl.textContent = 'Por favor, insira seu nome.';
      errEl.style.display = 'block';
      return;
    }
    if (doc.replace(/\D/g, '').length < 11) {
      errEl.textContent = 'Por favor, insira um CPF ou CNPJ válido.';
      errEl.style.display = 'block';
      return;
    }

    player1Name = nome;
    player1Doc = doc;

    if (gameMode === 2) {
      var nome2 = document.getElementById('input-nome2').value.trim();
      var doc2 = document.getElementById('input-doc2').value.trim();
      if (!nome2) {
        errEl.textContent = 'Por favor, insira o nome do Jogador 2.';
        errEl.style.display = 'block';
        return;
      }
      if (doc2.replace(/\D/g, '').length < 11) {
        errEl.textContent = 'Por favor, insira o CPF/CNPJ do Jogador 2.';
        errEl.style.display = 'block';
        return;
      }
      player2Name = nome2;
      player2Doc = doc2;
    }

    errEl.style.display = 'none';

    // Read settings from config panel
    var speedLevel = parseInt(document.getElementById('speed-slider').value);
    var diffLevel = parseInt(document.getElementById('diff-slider').value);

    cfg.ISPEED = [0, 10, 14, 20][speedLevel];
    cfg.MSPEED = [0, 22, 32, 45][speedLevel];

    if (diffLevel === 1) {
      cfg.GSPACE = 28;
      cfg.gateGoodMin = Math.ceil(cfg.GSPACE / cfg.PL); cfg.gateGoodRange = 15;
      cfg.gateBadMin = 3; cfg.gateBadRange = 5;
    } else if (diffLevel === 2) {
      cfg.GSPACE = 24;
      cfg.gateGoodMin = Math.ceil(cfg.GSPACE / cfg.PL); cfg.gateGoodRange = 12;
      cfg.gateBadMin = 5; cfg.gateBadRange = 10;
    } else {
      cfg.GSPACE = 20;
      cfg.gateGoodMin = Math.ceil(cfg.GSPACE / cfg.PL); cfg.gateGoodRange = 8;
      cfg.gateBadMin = 8; cfg.gateBadRange = 15;
    }

    cfg.DIST = cfg.GSPACE * (cfg.NGATES - 1) + 16 + 40;

    playerName = nome;
    playerDoc = doc;
    currentPlayer = 1;
    player1Score = 0;
    player2Score = 0;

    // Save players to local storage
    GameStorage.savePlayer(player1Name, player1Doc);
    if (gameMode === 2) GameStorage.savePlayer(player2Name, player2Doc);

    // Save config
    GameStorage.saveConfig({ speed: speedLevel, difficulty: diffLevel });

    PONTE.farm.buildEndScene();
    PONTE.gates.rebuild();
    PONTE.game.start();
  }

  function getState() {
    return {
      gameMode: gameMode,
      currentPlayer: currentPlayer,
      player1Name: player1Name,
      player1Doc: player1Doc,
      player2Name: player2Name,
      player2Doc: player2Doc,
      playerName: playerName,
      playerDoc: playerDoc,
      player1Score: player1Score,
      player2Score: player2Score
    };
  }

  function setCurrentPlayer(v) { currentPlayer = v; }
  function setPlayer1Score(v) { player1Score = v; }
  function setPlayer2Score(v) { player2Score = v; }

  PONTE.intro = {
    init: init,
    getState: getState,
    setCurrentPlayer: setCurrentPlayer,
    setPlayer1Score: setPlayer1Score,
    setPlayer2Score: setPlayer2Score
  };

})();
