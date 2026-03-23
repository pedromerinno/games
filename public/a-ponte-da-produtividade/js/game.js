(function() {
  'use strict';

  // ─── Config ──────────────────────────────
  var BW = 10;          // bridge width
  var PL = 2.0;         // plank length
  var DIST = 1680;      // total distance
  var GSPACE = 24;      // gate spacing
  var NGATES = 60;
  var ISPEED = 12;
  var MSPEED = 30;
  var ISTAKES = 20;

  // Multiplayer state
  var gameMode = 1; // 1 or 2
  var currentPlayer = 1;
  var player1Score = 0;
  var player2Score = 0;
  var player1Name = '', player2Name = '';
  var player1Doc = '', player2Doc = '';

  var PRODUCTS = [
    { name:'Verdavis', type:'Inseticida sistêmico', desc:'Controle de pulgões e tripes em aplicação foliar', fase:'V3–V6' },
    { name:'Actara', type:'Inseticida neonicotinoide', desc:'Ação translaminar contra sugadores na soja', fase:'V2–V5' },
    { name:'Ampligo', type:'Inseticida de contato', desc:'Controle de lagartas com dupla ação', fase:'V4–R2' },
    { name:'Cruiser', type:'Tratamento de sementes', desc:'Proteção inicial contra pragas do solo', fase:'Semente' },
    { name:'Fortenza', type:'Tratamento de sementes', desc:'Defesa de alto desempenho no plantio', fase:'Semente' },
    { name:'Maxim', type:'Fungicida para sementes', desc:'Proteção contra fungos de solo e sementes', fase:'Semente' },
    { name:'Plenus', type:'Herbicida seletivo', desc:'Controle de invasoras de folha larga', fase:'V2–V4' },
    { name:'Elatus', type:'Fungicida foliar', desc:'Máxima proteção contra ferrugem asiática', fase:'R1–R5' },
    { name:'Priori', type:'Fungicida sistêmico', desc:'Ação preventiva contra doenças foliares', fase:'V6–R3' },
    { name:'Avicta', type:'Nematicida biológico', desc:'Proteção contra nematoides na raiz', fase:'Semente' }
  ];
  var PESTS = [
    { name:'Ferrugem', type:'Fungo Phakopsora', desc:'Alta virulência em condições de alta umidade', fase:'R1–R5' },
    { name:'Lagarta', type:'Lepidoptera', desc:'Desfolha severa reduz potencial produtivo', fase:'V3–R5' },
    { name:'Percevejo', type:'Hemiptera sugador', desc:'Danos diretos em vagens e grãos', fase:'R3–R7' },
    { name:'Mosca-branca', type:'Bemisia tabaci', desc:'Transmissor de viroses na lavoura', fase:'V2–R5' },
    { name:'Nematoide', type:'Pratylenchus spp.', desc:'Redução do sistema radicular e vigor', fase:'Todo ciclo' },
    { name:'Mofo-branco', type:'Sclerotinia', desc:'Apodrecimento de hastes em clima úmido', fase:'R1–R4' },
    { name:'Cigarrinha', type:'Hemiptera saltador', desc:'Suga seiva e transmite patógenos', fase:'V2–V6' },
    { name:'Trips', type:'Thysanoptera', desc:'Raspagem foliar com prateamento', fase:'V1–V4' },
    { name:'Ácaro', type:'Tetranychidae', desc:'Descoloração foliar em clima seco', fase:'V4–R3' },
    { name:'Pulgão', type:'Aphididae sugador', desc:'Colônias causam encarquilhamento', fase:'V2–R2' }
  ];

  // ─── State ───────────────────────────────
  var scene, camera, renderer, clock;
  var playerGroup, bridgeGroup;
  var running = false, falling = false;
  var zPos = 0, curX = 0, tgtX = 0;
  var stakes = 0, coins = 0, bonusC = 0;
  var lastPZ = 2, planks = [];
  var gates = [], passed = {};
  var jumping = false, jumpT = 0, baseY = 0;
  var inputBuffer = 0;
  var tgtXTimer = null;
  var lastGateEnd = 0;
  var endGroup = null;

  // ─── DOM ─────────────────────────────────
  var elSaldo = document.getElementById('hud-saldo');
  var elStakes = document.getElementById('hud-stakes');
  var elLavoura = document.getElementById('hud-lavoura');
  var elFieldFill = document.getElementById('field-progress-fill');
  var elProgText = document.getElementById('hud-progress-text');
  var elPlayerName = document.getElementById('pill-name');
  var elPips = document.getElementById('hud-pips');
  var elCombo = document.getElementById('combo-text');
  var elHint = document.getElementById('controls-hint');
  var elTL = document.getElementById('touch-left');
  var elTR = document.getElementById('touch-right');

  // ─── Init ────────────────────────────────
  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7EC8E3);
    scene.fog = new THREE.Fog(0x7EC8E3, 60, 160);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    document.body.prepend(renderer.domElement);
    clock = new THREE.Clock();

    // Lights
    var amb = new THREE.AmbientLight(0xB0E0FF, 0.6);
    scene.add(amb);

    var sun = new THREE.DirectionalLight(0xFFF8E7, 1.2);
    sun.position.set(20, 35, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    scene.add(sun);

    var fill = new THREE.DirectionalLight(0xFFE0B2, 0.3);
    fill.position.set(-15, 10, -10);
    scene.add(fill);

    // Water (oversized to cover any DIST)
    var wGeo = new THREE.PlaneGeometry(500, 3000);
    var wMat = new THREE.MeshStandardMaterial({ color: 0x1976D2, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.88 });
    var water = new THREE.Mesh(wGeo, wMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -3, -1200);
    water.receiveShadow = true;
    scene.add(water);

    var w2 = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 3000),
      new THREE.MeshBasicMaterial({ color: 0x64B5F6, transparent: true, opacity: 0.12 })
    );
    w2.rotation.x = -Math.PI / 2;
    w2.position.set(0, -2.8, -1200);
    scene.add(w2);

    // Start platform
    makeIsland(5, 20, null);

    // Bridge container
    bridgeGroup = new THREE.Group();
    scene.add(bridgeGroup);

    // Player
    makePlayer();

    // Gates
    makeGates();

    // Scenery
    makeScenery();

    // Events
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    elTL.addEventListener('pointerdown', function(){ move(-1); });
    elTR.addEventListener('pointerdown', function(){ move(1); });
    document.getElementById('start-btn').addEventListener('click', tryStart);
    document.getElementById('restart-btn').addEventListener('click', function(){ location.reload(); });
    document.getElementById('win-btn').addEventListener('click', function(){ location.reload(); });

    // Hide HUD on intro screens
    document.getElementById('hud-wrap').classList.add('hidden-hud');

    // Step 1 → Step 2
    document.getElementById('btn-go-step2').addEventListener('click', function(){
      document.getElementById('start-step1').classList.add('hide');
      document.getElementById('start-step2').classList.add('active');
    });

    // Step 2 → Step 1 (back)
    document.getElementById('btn-back-step1').addEventListener('click', function(){
      document.getElementById('start-step1').classList.remove('hide');
      document.getElementById('start-step2').classList.remove('active');
      document.getElementById('player-form').classList.add('hidden');
    });

    // Mode select: 1P or 2P → show form
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

    // Turn and result screen buttons
    document.getElementById('turn-btn').addEventListener('click', function(){
      document.getElementById('turn-screen').classList.add('hidden');
      currentPlayer = 2;
      rebuildGates();
      startGame();
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

    loop();
  }

  // Gate difficulty params (defaults = Normal)
  var gateGoodMin = 8, gateGoodRange = 12;
  var gateBadMin = 5, gateBadRange = 10;
  var playerName = '', playerDoc = '';

  function tryStart() {
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

    ISPEED = [0, 10, 14, 20][speedLevel];
    MSPEED = [0, 22, 32, 45][speedLevel];

    if (diffLevel === 1) {
      gateGoodMin = 12; gateGoodRange = 15;
      gateBadMin = 3;   gateBadRange = 5;
      GSPACE = 28;
    } else if (diffLevel === 2) {
      gateGoodMin = 8;  gateGoodRange = 12;
      gateBadMin = 5;   gateBadRange = 10;
      GSPACE = 24;
    } else {
      gateGoodMin = 8;  gateGoodRange = 8;
      gateBadMin = 8;   gateBadRange = 15;
      GSPACE = 20;
    }

    DIST = GSPACE * (NGATES - 1) + 16 + 40;

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

    buildEndScene();
    rebuildGates();
    startGame();
  }

  // ─── Island ──────────────────────────────
  function makeIsland(z, depth, parent) {
    var target = parent || scene;
    var top = new THREE.Mesh(
      new THREE.BoxGeometry(22, 1, depth),
      new THREE.MeshStandardMaterial({ color: 0x7CB342, roughness: 0.85 })
    );
    top.position.set(0, -0.5, z - depth / 2 + 8);
    top.receiveShadow = true;
    top.castShadow = true;
    target.add(top);

    var dirt = new THREE.Mesh(
      new THREE.BoxGeometry(22, 3, depth),
      new THREE.MeshStandardMaterial({ color: 0x6D4C41, roughness: 0.9 })
    );
    dirt.position.set(0, -2.5, z - depth / 2 + 8);
    dirt.castShadow = true;
    target.add(dirt);

    var gc = [0x66BB6A, 0x81C784, 0x4CAF50, 0x8BC34A];
    for (var i = 0; i < 15; i++) {
      var gx = (Math.random() - 0.5) * 20;
      var gz = z - Math.random() * (depth - 4) + 6;
      var blade = new THREE.Mesh(
        new THREE.ConeGeometry(0.08 + Math.random() * 0.08, 0.25 + Math.random() * 0.3, 4),
        new THREE.MeshStandardMaterial({ color: gc[i % 4], roughness: 1 })
      );
      blade.position.set(gx, 0.12, gz);
      target.add(blade);
    }
  }

  function buildEndScene() {
    if (endGroup) scene.remove(endGroup);
    endGroup = new THREE.Group();
    makeIsland(-DIST - 8, 60, endGroup);
    makeEndRewardTo(endGroup);
    scene.add(endGroup);
  }

  // ─── End reward — full farm ──────────────
  function makeEndRewardTo(target) {
    var fz = -DIST - 5; // farm center Z
    var woodMat = new THREE.MeshStandardMaterial({ color: 0x6D4C41, roughness: 0.8 });
    var redMat = new THREE.MeshStandardMaterial({ color: 0xB71C1C, roughness: 0.7 });
    var roofMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.8 });
    var whiteMat = new THREE.MeshStandardMaterial({ color: 0xEEEEEE, roughness: 0.6 });
    var bagMat = new THREE.MeshStandardMaterial({ color: 0xD7CCC8, roughness: 0.75 });
    var coinMat = new THREE.MeshStandardMaterial({ color: 0xFFCC00, metalness: 0.5, roughness: 0.3, emissive: 0xCC9900, emissiveIntensity: 0.3 });

    // ── Finish arch ──
    var archMat = new THREE.MeshStandardMaterial({ color: 0x388E3C });
    // Left pillar
    var pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), archMat);
    pillarL.position.set(-BW / 2 - 0.5, 2.5, fz + 35);
    target.add(pillarL);
    var pillarR = pillarL.clone();
    pillarR.position.x = BW / 2 + 0.5;
    target.add(pillarR);
    var archBar = new THREE.Mesh(new THREE.BoxGeometry(BW + 1.5, 0.6, 0.5), archMat);
    archBar.position.set(0, 5.2, fz + 35);
    target.add(archBar);
    // Arch sign
    var archCv = document.createElement('canvas');
    archCv.width = 512; archCv.height = 80;
    var ac = archCv.getContext('2d');
    ac.fillStyle = '#388E3C'; ac.fillRect(0, 0, 512, 80);
    ac.fillStyle = '#FFF'; ac.font = '800 48px FuturaCond, Arial';
    ac.textAlign = 'center'; ac.textBaseline = 'middle';
    ac.fillText('MÁXIMA PRODUTIVIDADE', 256, 42);
    var archLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(BW + 1, 0.5),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(archCv) })
    );
    archLabel.position.set(0, 5.2, fz + 35.3);
    target.add(archLabel);

    // ── Barn (celeiro) ──
    var barnBody = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 5), redMat);
    barnBody.position.set(-6, 2, fz - 10);
    barnBody.castShadow = true;
    target.add(barnBody);
    var barnRoof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2.5, 4), roofMat);
    barnRoof.position.set(-6, 5, fz - 10);
    barnRoof.rotation.y = Math.PI / 4;
    target.add(barnRoof);
    var barnDoor = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), woodMat);
    barnDoor.position.set(-6, 1.5, fz - 7.49);
    target.add(barnDoor);

    // ── Silo ──
    var silo = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 7, 12), whiteMat);
    silo.position.set(7, 3.5, fz - 12);
    silo.castShadow = true;
    target.add(silo);
    var siloTop = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.5, 12), roofMat);
    siloTop.position.set(7, 7.5, fz - 12);
    target.add(siloTop);

    // ── Soy bags — big piles ──
    for (var pile = 0; pile < 3; pile++) {
      var px = -2 + pile * 3;
      for (var row = 0; row < 4; row++) {
        for (var col = 0; col < 5 - row; col++) {
          var bag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), bagMat);
          bag.position.set(px + (col - (4 - row) / 2) * 1.3, row * 0.6 + 0.3, fz - 5 - pile * 2);
          bag.rotation.y = (Math.random() - 0.5) * 0.15;
          target.add(bag);
        }
      }
    }

    // ── Gold coin piles (SynCoins) ──
    for (var cp = 0; cp < 3; cp++) {
      var cpx = -3 + cp * 3;
      for (var i = 0; i < 15; i++) {
        var c = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 10), coinMat);
        c.position.set(cpx + (Math.random() - 0.5) * 0.8, 0.03 + i * 0.06, fz - 15 + (Math.random() - 0.5) * 0.8);
        c.rotation.x = Math.random() * 0.2;
        c.rotation.z = Math.random() * 0.2;
        target.add(c);
      }
    }

    // ── Soy plantation rows on the farm ──
    var farmSoyMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50, roughness: 0.85 });
    var farmSoyGeo = new THREE.SphereGeometry(1, 5, 4);
    for (var side = -1; side <= 1; side += 2) {
      for (var row = 0; row < 8; row++) {
        for (var p = 0; p < 12; p++) {
          var sx = side * (BW / 2 + 2 + row * 1.4);
          var sz = fz - 4 - p * 1.8;
          var bush = new THREE.Mesh(farmSoyGeo, farmSoyMat);
          bush.position.set(sx, -0.1, sz);
          bush.scale.set(0.7, 0.35, 0.6);
          target.add(bush);
        }
      }
    }

    // ── Fence around farm ──
    var fenceMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.8 });
    for (var fi = 0; fi < 20; fi++) {
      // Left fence
      var fencePost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 5), fenceMat);
      fencePost.position.set(-BW / 2 - 1, 0.75, fz + 18 - fi * 2.5);
      target.add(fencePost);
      var fencePost2 = fencePost.clone();
      fencePost2.position.x = BW / 2 + 1;
      target.add(fencePost2);
    }

    // ── "LAVOURA" sign ──
    var signG = new THREE.Group();
    var signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4, 8), woodMat);
    signPole.position.y = 2;
    signG.add(signPole);
    var signBoard = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x2E7D32 }));
    signBoard.position.y = 3.8;
    signG.add(signBoard);
    var scv = document.createElement('canvas');
    scv.width = 400; scv.height = 120;
    var sctx = scv.getContext('2d');
    sctx.fillStyle = '#2E7D32'; sctx.fillRect(0, 0, 400, 120);
    sctx.fillStyle = '#FFF'; sctx.font = '800 60px FuturaCond, Arial';
    sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
    sctx.fillText('LAVOURA', 200, 62);
    var signLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 1.1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(scv) })
    );
    signLabel.position.set(0, 3.8, 0.06);
    signG.add(signLabel);
    signG.position.set(BW / 2 + 4, 0, fz + 15);
    target.add(signG);
  }

  // ─── Player ──────────────────────────────
  var stakesPileGroup;

  function makePlayer() {
    playerGroup = new THREE.Group();
    var bMat = new THREE.MeshStandardMaterial({ color: 0x1565C0, roughness: 0.45 });
    var sMat = new THREE.MeshStandardMaterial({ color: 0xFFCC80, roughness: 0.55 });
    var hMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.6 });
    var lMat = new THREE.MeshStandardMaterial({ color: 0x33691E, roughness: 0.7 });

    var parts = [
      { g: new THREE.CylinderGeometry(0.28,0.24,0.65,10), m: bMat, p:[0,0.72,0] },
      { g: new THREE.SphereGeometry(0.22,12,10), m: sMat, p:[0,1.2,0] },
      { g: new THREE.CylinderGeometry(0.32,0.34,0.05,12), m: hMat, p:[0,1.36,0] },
      { g: new THREE.CylinderGeometry(0.16,0.2,0.22,10), m: hMat, p:[0,1.48,0] },
      { g: new THREE.CylinderGeometry(0.09,0.09,0.4,6), m: lMat, p:[-0.12,0.2,0] },
      { g: new THREE.CylinderGeometry(0.09,0.09,0.4,6), m: lMat, p:[0.12,0.2,0] },
      { g: new THREE.CylinderGeometry(0.06,0.06,0.48,6), m: bMat, p:[-0.34,0.72,0], r:[0,0,0.25] },
      { g: new THREE.CylinderGeometry(0.06,0.06,0.48,6), m: bMat, p:[0.34,0.72,0], r:[0,0,-0.25] }
    ];

    for (var i = 0; i < parts.length; i++) {
      var mesh = new THREE.Mesh(parts[i].g, parts[i].m);
      mesh.position.set(parts[i].p[0], parts[i].p[1], parts[i].p[2]);
      if (parts[i].r) mesh.rotation.set(parts[i].r[0], parts[i].r[1], parts[i].r[2]);
      mesh.castShadow = true;
      playerGroup.add(mesh);
    }

    // SynCoin pile on player's back (behind the body)
    stakesPileGroup = new THREE.Group();
    stakesPileGroup.position.set(0, 0.4, 0.4);
    playerGroup.add(stakesPileGroup);

    scene.add(playerGroup);
  }

  var stakePileMat = null;
  var stakePileGeo = null;
  var lastPileCount = -1;

  function updateStakesPile() {
    // Only rebuild if count changed significantly
    var visualCount = Math.min(stakes, 100);
    if (visualCount === lastPileCount) return;
    lastPileCount = visualCount;

    // Clear old pile
    while (stakesPileGroup.children.length > 0) {
      stakesPileGroup.remove(stakesPileGroup.children[0]);
    }

    if (visualCount <= 0) return;

    if (!stakePileMat) {
      stakePileMat = new THREE.MeshStandardMaterial({ color: 0xFFCC00, metalness: 0.4, roughness: 0.4, emissive: 0xCC9900, emissiveIntensity: 0.4 });
      stakePileGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 12);
    }

    // Stack coins on the back — big pile
    for (var i = 0; i < visualCount; i++) {
      var coin = new THREE.Mesh(stakePileGeo, stakePileMat);
      coin.position.set(
        (Math.random() - 0.5) * 0.06,
        i * 0.09,
        (Math.random() - 0.5) * 0.04
      );
      coin.rotation.x = (Math.random() - 0.5) * 0.12;
      coin.rotation.z = (Math.random() - 0.5) * 0.12;
      stakesPileGroup.add(coin);
    }
  }

  // ─── Gates ───────────────────────────────
  var gateSceneMeshes = []; // track all gate meshes for rebuild

  function makeGates() {
    gates = [];
    lastGateEnd = GSPACE * (NGATES - 1) + 16 + GSPACE;
    for (var i = 0; i < NGATES; i++) {
      var z = -(GSPACE * i + 16);
      var goodSide = Math.random() > 0.5 ? 'left' : 'right';
      var gv = Math.floor(Math.random() * gateGoodRange + gateGoodMin);
      var bv = -Math.floor(Math.random() * gateBadRange + gateBadMin);

      var lv = goodSide === 'left' ? gv : bv;
      var rv = goodSide === 'right' ? gv : bv;
      var lData = goodSide === 'left' ? PRODUCTS[i % PRODUCTS.length] : PESTS[i % PESTS.length];
      var rData = goodSide === 'right' ? PRODUCTS[i % PRODUCTS.length] : PESTS[i % PESTS.length];

      var hw = BW / 2 - 0.1;
      var ph = 5.0;

      var leftM = makePanel(lv, lData, lv > 0, hw, ph);
      leftM.position.set(-hw / 2 - 0.05, 0, z);
      scene.add(leftM);
      gateSceneMeshes.push(leftM);

      var rightM = makePanel(rv, rData, rv > 0, hw, ph);
      rightM.position.set(hw / 2 + 0.05, 0, z);
      scene.add(rightM);
      gateSceneMeshes.push(rightM);

      gates.push({ mesh: leftM, z: z, value: lv, side: 'left', idx: i });
      gates.push({ mesh: rightM, z: z, value: rv, side: 'right', idx: i });

      // VS chip — matching reference (subtle gold circle)
      var vsCv = document.createElement('canvas');
      vsCv.width = 128; vsCv.height = 128;
      var vsCtx = vsCv.getContext('2d');
      vsCtx.beginPath();
      vsCtx.arc(64, 64, 50, 0, Math.PI * 2);
      vsCtx.fillStyle = 'rgba(255,210,60,0.15)';
      vsCtx.fill();
      vsCtx.strokeStyle = 'rgba(255,210,60,0.3)';
      vsCtx.lineWidth = 2;
      vsCtx.stroke();
      vsCtx.fillStyle = '#ffd966';
      vsCtx.font = 'bold 32px Syne, sans-serif';
      vsCtx.textAlign = 'center';
      vsCtx.textBaseline = 'middle';
      vsCtx.fillText('VS', 64, 66);
      var vsTex = new THREE.CanvasTexture(vsCv);
      var vsChip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.9),
        new THREE.MeshBasicMaterial({ map: vsTex, transparent: true })
      );
      vsChip.position.set(0, ph / 2 + 0.2, 0.15);
      scene.add(vsChip);
      gateSceneMeshes.push(vsChip);
    }
  }

  function rebuildGates() {
    // Remove old gate meshes
    for (var i = 0; i < gateSceneMeshes.length; i++) {
      scene.remove(gateSceneMeshes[i]);
    }
    gateSceneMeshes = [];
    makeGates();
  }

  function makePanel(value, data, isGood, w, h) {
    var g = new THREE.Group();

    var S = 2;
    var cw = 400, ch = 400;
    var cv = document.createElement('canvas');
    cv.width = cw * S; cv.height = ch * S;
    var c = cv.getContext('2d');
    c.scale(S, S);

    // ── Background with rounded corners ──
    var bgColor = isGood ? '#00835d' : '#8e241b';
    var darkBg = isGood ? '#006a4a' : '#701a14';
    c.fillStyle = darkBg;
    c.beginPath();
    c.roundRect(0, 0, cw, ch, 20);
    c.fill();
    c.fillStyle = bgColor;
    c.beginPath();
    c.roundRect(6, 6, cw - 12, ch - 12, 16);
    c.fill();

    // ── Name (top, large, bold) ──
    c.fillStyle = isGood ? '#c2fcd8' : '#ff8080';
    c.font = '800 52px FuturaCond, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(data.name.toUpperCase(), cw / 2, 75);

    // ── Score (center, huge) ──
    c.fillStyle = isGood ? 'rgba(194,252,216,0.45)' : 'rgba(255,128,128,0.45)';
    c.font = '800 160px FuturaCond, sans-serif';
    c.fillText((value > 0 ? '+' : '') + value, cw / 2, 225);

    // ── Badge pill (bottom) ──
    var badgeText = isGood ? 'DEFENSIVO' : 'PRAGA';
    var pillW = 150, pillH = 36, pillX = (cw - pillW) / 2, pillY = ch - 60;
    c.fillStyle = isGood ? 'rgba(194,252,216,0.3)' : 'rgba(255,128,128,0.3)';
    c.beginPath();
    c.roundRect(pillX, pillY, pillW, pillH, 18);
    c.fill();
    c.fillStyle = isGood ? '#004d36' : '#6e2020';
    c.font = '800 18px FuturaCond, sans-serif';
    c.fillText(badgeText, cw / 2, pillY + pillH / 2 + 1);

    // ── Texture ──
    var tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    var plane = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    plane.position.y = h / 2 + 0.2;
    g.add(plane);

    return g;
  }

  // ─── Scenery ─────────────────────────────
  function makeScenery() {
    // Hills
    var hm1 = new THREE.MeshStandardMaterial({ color: 0x66BB6A, roughness: 1 });
    var hm2 = new THREE.MeshStandardMaterial({ color: 0x81C784, roughness: 1 });
    for (var i = 0; i < 8; i++) {
      var side = i % 2 === 0 ? 1 : -1;
      var r = 18 + Math.random() * 25;
      var hill = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), i % 3 === 0 ? hm2 : hm1);
      hill.position.set(side * (35 + Math.random() * 40), -r * 0.65, -(Math.random() * DIST));
      hill.scale.y = 0.28 + Math.random() * 0.1;
      scene.add(hill);
    }

    // Trees — progressive density: sparse at start, dense at end
    var trunkMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.8 });
    var leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x388E3C, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x43A047, roughness: 0.8 })
    ];
    // Divide distance into zones, each zone has more trees
    // Soy bushes — progressive density (sparse start → massive plantation at end)
    // Use InstancedMesh for performance with huge quantities
    var soyColors = [0x558B2F, 0x4CAF50, 0x388E3C, 0x66BB6A, 0x2E7D32];
    var zones = 10;
    var zoneLen = DIST / zones;

    // Soy plantation — continuous, gradual, no gaps
    var bushMats = soyColors.map(function(c) {
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
    });
    var bushGeo = new THREE.SphereGeometry(1, 5, 4);
    var rowSpacing = 1.3;
    var plantStep = 1.5;
    var totalRows = 25; // max rows per side at the end

    for (var side = -1; side <= 1; side += 2) {
      for (var row = 0; row < totalRows; row++) {
        var rx = side * (BW / 2 + 1.2 + row * rowSpacing);
        for (var pz = 0; pz > -DIST; pz -= plantStep) {
          var progress = Math.abs(pz) / DIST; // 0→1

          // How many rows visible at this progress (smooth curve)
          // At 0% = 1 row, at 50% = ~8 rows, at 100% = 25 rows
          var visibleRows = 1 + progress * progress * (totalRows - 1);
          if (row >= visibleRows) continue;

          // Size: starts tiny, ends full
          var sizeFactor = 0.2 + progress * 0.8;
          var bushSize = (0.55 + Math.random() * 0.2) * sizeFactor;

          var bush = new THREE.Mesh(bushGeo, bushMats[(row + Math.floor(Math.abs(pz) * 0.7)) % bushMats.length]);
          bush.position.set(rx, -2.5 + bushSize * 0.3, pz);
          bush.scale.set(bushSize * 0.85, bushSize * 0.5, bushSize * 0.7);
          scene.add(bush);
        }
      }
    }

    // Clouds
    var cloudMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 1 });
    for (var i = 0; i < 8; i++) {
      var cloud = new THREE.Group();
      var np = 3 + Math.floor(Math.random() * 4);
      for (var p = 0; p < np; p++) {
        var pr = 1.5 + Math.random() * 2.5;
        var puff = new THREE.Mesh(new THREE.SphereGeometry(pr, 10, 7), cloudMat);
        puff.position.set(p * pr * 0.9, (Math.random() - 0.5) * pr * 0.3, (Math.random() - 0.5) * pr * 0.4);
        puff.scale.y = 0.35;
        cloud.add(puff);
      }
      cloud.position.set((Math.random()-0.5)*140, 22+Math.random()*15, -Math.random()*DIST);
      scene.add(cloud);
    }

    // Sun
    var sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xFFF9C4 })
    );
    sunSphere.position.set(50, 45, -DIST * 0.4);
    scene.add(sunSphere);
  }

  // ─── Bridge ──────────────────────────────
  function buildTo(targetZ, unlimited) {
    var pm1 = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.65 });
    var pm2 = new THREE.MeshStandardMaterial({ color: 0x7B5B4C, roughness: 0.7 });
    var railMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.75 });
    var ropeMat = new THREE.MeshStandardMaterial({ color: 0xA1887F, roughness: 1 });

    while (lastPZ > targetZ && (stakes > 0 || unlimited)) {
      lastPZ -= PL;
      var mat = planks.length % 2 === 0 ? pm1 : pm2;
      var plank = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.18, PL - 0.06), mat);
      plank.position.set(0, 0, lastPZ);
      plank.receiveShadow = true;
      plank.castShadow = true;
      bridgeGroup.add(plank);

      if (planks.length % 2 === 0) {
        var beam = new THREE.Mesh(
          new THREE.BoxGeometry(BW, 0.12, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x4E342E })
        );
        beam.position.set(0, -0.15, lastPZ);
        bridgeGroup.add(beam);
      }

      if (planks.length % 3 === 0) {
        for (var s = -1; s <= 1; s += 2) {
          var post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 6), railMat);
          post.position.set(s * (BW / 2 + 0.06), 0.8, lastPZ);
          post.castShadow = true;
          bridgeGroup.add(post);
          var rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, PL * 3 + 0.5, 4), ropeMat);
          rope.rotation.x = Math.PI / 2;
          rope.position.set(s * (BW / 2 + 0.06), 1.35, lastPZ);
          bridgeGroup.add(rope);
        }
      }

      planks.push(lastPZ);
      if (!unlimited && planks.length % 2 === 0) stakes--;
    }
    updateUI();
  }

  // ─── UI ──────────────────────────────────
  var FASES = ['V1','V2','V3','V4','V5','V6','R1','R2','R3','R4','R5','R6','R7'];
  function updateUI() {
    var total = coins + bonusC;
    elSaldo.textContent = (total >= 0 ? '+' : '') + total;
    elSaldo.className = 'pill-val ' + (total >= 0 ? 'pos' : 'neg');
    elStakes.textContent = stakes;
    var pct = Math.min(Math.round(zPos / DIST * 100), 100);
    var health = Math.max(0, Math.min(100, Math.round(stakes / ISTAKES * 100)));
    elLavoura.textContent = health + '%';
    elLavoura.style.color = health > 50 ? '#7dde9c' : health > 25 ? '#ffd966' : '#f08080';
    elFieldFill.style.width = pct + '%';
    var faseIdx = Math.min(Math.floor(pct / 100 * FASES.length), FASES.length - 1);
    elProgText.textContent = FASES[faseIdx];

    // Update pips
    var pips = elPips.querySelectorAll('.pip');
    var activePips = Math.floor(pct / 20);
    for (var i = 0; i < pips.length; i++) {
      pips[i].className = 'pip' + (i < activePips ? ' on' : '');
    }

    // Update visual stake pile on player
    updateStakesPile();
  }

  function showFloat(text, color) {
    elCombo.textContent = text;
    elCombo.style.color = color;
    elCombo.style.opacity = '1';
    elCombo.style.transform = 'translate(-50%,-50%) scale(1.3)';
    setTimeout(function() {
      elCombo.style.opacity = '0';
      elCombo.style.transform = 'translate(-50%,-50%) scale(0.8)';
    }, 900);
  }

  // ─── Input ───────────────────────────────
  function move(dir) {
    if (!running || falling) return;
    if (jumping) {
      inputBuffer = dir;
      return;
    }
    executeMove(dir);
  }

  function executeMove(dir) {
    jumping = true;
    jumpT = 0;
    inputBuffer = 0;
    if (tgtXTimer) clearTimeout(tgtXTimer);
    tgtX = dir * (BW / 2 - 0.3);
    tgtXTimer = setTimeout(function() { tgtX = 0; tgtXTimer = null; }, 350);
  }

  function onKey(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') move(-1);
    else if (e.key === 'ArrowRight' || e.key === 'd') move(1);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function enableTouch() {
    elTL.style.pointerEvents = 'all';
    elTR.style.pointerEvents = 'all';
  }

  function disableTouch() {
    elTL.style.pointerEvents = 'none';
    elTR.style.pointerEvents = 'none';
  }

  // ─── Game control ────────────────────────
  function handleGameEnd(finalScore, won) {
    // Save score to local storage
    var curName = currentPlayer === 1 ? player1Name : player2Name;
    var curDoc = currentPlayer === 1 ? player1Doc : player2Doc;
    GameStorage.saveScore({
      playerName: curName,
      playerDoc: curDoc,
      score: finalScore,
      won: won,
      gameMode: gameMode,
      difficulty: parseInt(document.getElementById('diff-slider').value),
      speed: parseInt(document.getElementById('speed-slider').value)
    });

    // Try to sync (non-blocking)
    try { GameSync.pushUnsyncedScores(); } catch(e) {}

    if (gameMode === 1) {
      // Single player - show normal end screens
      if (won) {
        document.getElementById('win-score').textContent = finalScore;
        document.getElementById('win-screen').classList.remove('hidden');
      } else {
        document.getElementById('final-score').textContent = finalScore;
        document.getElementById('game-over').classList.remove('hidden');
      }
    } else {
      // 2 players
      if (currentPlayer === 1) {
        player1Score = finalScore;
        // Show turn screen for player 2
        document.getElementById('turn-title').textContent = 'Vez de ' + player2Name + '!';
        document.getElementById('turn-sub').textContent = player1Name + ' fez ' + player1Score + ' pontos. Supere essa marca!';
        document.getElementById('turn-screen').classList.remove('hidden');
      } else {
        player2Score = finalScore;
        // Show final result
        var content = document.getElementById('result-content');
        content.innerHTML = '<b>' + player1Name + ':</b> ' + player1Score + ' pontos<br>' +
                            '<b>' + player2Name + ':</b> ' + player2Score + ' pontos';
        var winner = document.getElementById('result-winner');
        if (player1Score > player2Score) {
          winner.textContent = player1Name + ' venceu!';
          winner.style.color = '#FFD700';
        } else if (player2Score > player1Score) {
          winner.textContent = player2Name + ' venceu!';
          winner.style.color = '#FFD700';
        } else {
          winner.textContent = 'Empate!';
          winner.style.color = '#81C784';
        }
        document.getElementById('result-screen').classList.remove('hidden');
      }
    }
  }

  function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    document.getElementById('turn-screen').classList.add('hidden');
    document.getElementById('hud-wrap').classList.remove('hidden-hud');
    enableTouch();

    // Clear old bridge planks
    while (bridgeGroup.children.length > 0) bridgeGroup.remove(bridgeGroup.children[0]);
    planks = [];

    zPos = 0; tgtX = 0; curX = 0;
    stakes = ISTAKES; coins = 0; bonusC = 0;
    lastPileCount = -1;
    lastPZ = 2; falling = false; jumping = false; inputBuffer = 0;
    if (tgtXTimer) { clearTimeout(tgtXTimer); tgtXTimer = null; }
    passed = {};

    // HUD: player name
    var curName = gameMode === 2
      ? (currentPlayer === 1 ? player1Name : player2Name)
      : player1Name;
    elPlayerName.textContent = curName;

    // HUD: progress pips (5 segments)
    var pipsHtml = '';
    for (var pi = 0; pi < 5; pi++) pipsHtml += '<span class="pip"></span>';
    elPips.innerHTML = pipsHtml;

    // Show player banner in 2-player mode
    var banner = document.getElementById('player-turn-banner');
    if (gameMode === 2) {
      banner.textContent = 'Jogando: ' + curName;
      banner.style.display = 'block';
      setTimeout(function(){ banner.style.display = 'none'; }, 3000);
    } else {
      banner.style.display = 'none';
    }

    playerGroup.position.set(0, 0, 0);
    playerGroup.rotation.set(0, 0, 0);

    buildTo(-15);
    updateUI();
    running = true;
    clock.start();

    setTimeout(function() { elHint.style.opacity = '0'; }, 3500);
  }

  // ─── Main loop ───────────────────────────
  function loop() {
    requestAnimationFrame(loop);

    if (!running) {
      // Static camera view for intro — no spinning
      camera.position.set(0, 10, 13);
      camera.lookAt(0, 0, -8);
      renderer.render(scene, camera);
      return;
    }

    var dt = Math.min(clock.getDelta(), 0.05);
    var elapsed = clock.elapsedTime;
    var speed = ISPEED + Math.min(elapsed * 0.5, MSPEED - ISPEED);

    if (zPos > lastGateEnd) {
      speed = Math.max(speed, MSPEED * 2);
    }

    zPos += speed * dt;
    curX += (tgtX - curX) * 12 * dt;

    // Jump
    if (jumping) {
      jumpT += dt;
      var p = Math.min(jumpT / 0.3, 1);
      baseY = Math.sin(p * Math.PI) * 1.0;
      if (p >= 1) {
        jumping = false; baseY = 0;
        if (inputBuffer !== 0) {
          executeMove(inputBuffer);
        }
      }
    }

    playerGroup.position.set(curX, baseY, -zPos);

    // Animate limbs
    var ls = jumping ? 16 : 9;
    if (playerGroup.children[4]) playerGroup.children[4].rotation.x = Math.sin(elapsed * ls) * 0.4;
    if (playerGroup.children[5]) playerGroup.children[5].rotation.x = -Math.sin(elapsed * ls) * 0.4;
    if (playerGroup.children[6]) playerGroup.children[6].rotation.x = Math.sin(elapsed * ls + 1) * 0.3;
    if (playerGroup.children[7]) playerGroup.children[7].rotation.x = -Math.sin(elapsed * ls + 1) * 0.3;

    // Camera
    camera.position.set(curX * 0.12, 12 + Math.sin(elapsed * 0.4) * 0.2, -zPos + 14);
    camera.lookAt(curX * 0.15, 1, -zPos - 10);

    // Build bridge (auto-bridge after all gates are passed)
    var pastAllGates = zPos > lastGateEnd;
    if (lastPZ > -zPos - 18 && (stakes > 0 || pastAllGates)) {
      buildTo(-zPos - 18, pastAllGates);
    }

    // On bridge check
    var pz = -zPos;
    var onB = pz > -2 || pz < -(DIST - 5);
    if (!onB) {
      for (var i = 0; i < planks.length; i++) {
        if (Math.abs(pz - planks[i]) < PL + 0.3) { onB = true; break; }
      }
    }

    if (!onB && !falling && !jumping) {
      falling = true;
      running = false;
      disableTouch();
      var ft = 0;
      var fy0 = playerGroup.position.y;
      var fallFn = function() {
        ft += 0.018;
        playerGroup.position.y = fy0 - ft * ft * 35;
        playerGroup.rotation.x += 0.12;
        playerGroup.rotation.z += 0.06;
        renderer.render(scene, camera);
        if (playerGroup.position.y > -18) {
          requestAnimationFrame(fallFn);
        } else {
          handleGameEnd(Math.min(coins + bonusC, 10000), false);
        }
      };
      fallFn();
      return;
    }

    // Gate check
    for (var i = 0; i < gates.length; i++) {
      var gate = gates[i];
      var key = gate.idx + '-' + gate.side;
      if (passed[key]) continue;
      var dz = Math.abs(-zPos - gate.z);
      if (dz < 1.8) {
        var onLeft = curX < -1;
        var onRight = curX > 1;
        if ((gate.side === 'left' && onLeft) || (gate.side === 'right' && onRight)) {
          passed[gate.idx + '-left'] = true;
          passed[gate.idx + '-right'] = true;
          if (gate.value > 0) {
            stakes += gate.value;
            bonusC += gate.value * 4;
            showFloat('+' + gate.value + ' Produtividade', '#4CAF50');
          } else {
            stakes = Math.max(0, stakes + gate.value);
            showFloat(gate.value + ' Produtividade', '#F44336');
          }
          gate.mesh.children[0].material.opacity = 0.2;
          updateUI();
          break;
        }
      }
    }

    // Auto-pass old gates
    for (var i = 0; i < gates.length; i++) {
      if (!passed[gates[i].idx + '-left'] && -zPos < gates[i].z - 3) {
        passed[gates[i].idx + '-left'] = true;
        passed[gates[i].idx + '-right'] = true;
      }
    }

    coins = Math.floor(zPos / 5) * 3;
    updateUI();

    // Win
    if (zPos >= DIST) {
      bonusC += stakes * 5;
      var finalScore = Math.min(coins + bonusC, 10000);
      running = false;
      disableTouch();
      handleGameEnd(finalScore, true);
    }

    renderer.render(scene, camera);
  }

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

  // Start everything
  init();

})();
