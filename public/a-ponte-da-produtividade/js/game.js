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
  var winTriggered = false, winTimer = null, winFinalScore = 0;
  var winElapsed = 0;
  var scatterCoins = [], farmRewards = [], farmRewardSpawned = 0;

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
  var gateGoodMin = Math.ceil(GSPACE / PL), gateGoodRange = 12;
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
      GSPACE = 28;
      gateGoodMin = Math.ceil(GSPACE / PL); gateGoodRange = 15;
      gateBadMin = 3;   gateBadRange = 5;
    } else if (diffLevel === 2) {
      GSPACE = 24;
      gateGoodMin = Math.ceil(GSPACE / PL); gateGoodRange = 12;
      gateBadMin = 5;   gateBadRange = 10;
    } else {
      GSPACE = 20;
      gateGoodMin = Math.ceil(GSPACE / PL); gateGoodRange = 8;
      gateBadMin = 8;   gateBadRange = 15;
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
    var fz = -DIST - 5;
    var woodMat = new THREE.MeshStandardMaterial({ color: 0x6D4C41, roughness: 0.8 });
    var darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x4E342E, roughness: 0.85 });
    var redMat = new THREE.MeshStandardMaterial({ color: 0xC62828, roughness: 0.6 });
    var redDarkMat = new THREE.MeshStandardMaterial({ color: 0x8E0000, roughness: 0.7 });
    var whiteMat = new THREE.MeshStandardMaterial({ color: 0xF5F5F5, roughness: 0.5 });
    var roofMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.8 });
    var stoneMat = new THREE.MeshStandardMaterial({ color: 0x9E9E9E, roughness: 0.9 });
    var dirtMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 1 });

    // ── Finish arch ──
    var archMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
    var pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 0.6), archMat);
    pillarL.position.set(-BW / 2 - 0.5, 2.75, fz + 35);
    pillarL.castShadow = true;
    target.add(pillarL);
    var pillarR = pillarL.clone();
    pillarR.position.x = BW / 2 + 0.5;
    target.add(pillarR);
    var archBar = new THREE.Mesh(new THREE.BoxGeometry(BW + 2, 0.7, 0.7), archMat);
    archBar.position.set(0, 5.5, fz + 35);
    target.add(archBar);
    // Decorative leaves on arch
    var leafMat = new THREE.MeshStandardMaterial({ color: 0x43A047, roughness: 0.8 });
    for (var al = 0; al < 12; al++) {
      var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 5), leafMat);
      leaf.position.set(-BW / 2 + al * (BW / 11), 6.0 + Math.sin(al * 0.8) * 0.2, fz + 35);
      leaf.scale.set(1, 0.6, 0.8);
      target.add(leaf);
    }
    // Arch sign
    var archCv = document.createElement('canvas');
    archCv.width = 512; archCv.height = 80;
    var ac = archCv.getContext('2d');
    ac.fillStyle = '#2E7D32'; ac.fillRect(0, 0, 512, 80);
    ac.fillStyle = '#FFF'; ac.font = '800 48px FuturaCond, Arial';
    ac.textAlign = 'center'; ac.textBaseline = 'middle';
    ac.fillText('MÁXIMA PRODUTIVIDADE', 256, 42);
    var archLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(BW + 1, 0.5),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(archCv) })
    );
    archLabel.position.set(0, 5.5, fz + 35.4);
    target.add(archLabel);

    // ── Barn (celeiro detalhado) ──
    var bx = -7, bz = fz - 8;
    var barnW = 8, barnH = 5.5, barnD = 9;
    // Walls — lower half red, upper half lighter red
    var barnLower = new THREE.Mesh(new THREE.BoxGeometry(barnW, barnH * 0.6, barnD), redMat);
    barnLower.position.set(bx, barnH * 0.3, bz);
    barnLower.castShadow = true;
    target.add(barnLower);
    var barnUpper = new THREE.Mesh(new THREE.BoxGeometry(barnW, barnH * 0.4, barnD), new THREE.MeshStandardMaterial({ color: 0xD32F2F, roughness: 0.6 }));
    barnUpper.position.set(bx, barnH * 0.6 + barnH * 0.2, bz);
    barnUpper.castShadow = true;
    target.add(barnUpper);
    // White trim lines (3 horizontal)
    var trimMat = new THREE.MeshStandardMaterial({ color: 0xFAFAFA, roughness: 0.4 });
    for (var ti = 0; ti < 3; ti++) {
      var trim = new THREE.Mesh(new THREE.BoxGeometry(barnW + 0.15, 0.12, barnD + 0.15), trimMat);
      trim.position.set(bx, 0.9 + ti * (barnH * 0.35), bz);
      target.add(trim);
    }
    // Corner posts (white)
    for (var cx = -1; cx <= 1; cx += 2) {
      for (var cz = -1; cz <= 1; cz += 2) {
        var corner = new THREE.Mesh(new THREE.BoxGeometry(0.25, barnH, 0.25), trimMat);
        corner.position.set(bx + cx * barnW / 2, barnH / 2, bz + cz * barnD / 2);
        target.add(corner);
      }
    }
    // Gambrel roof — two angled slabs per side
    var roofRedMat = new THREE.MeshStandardMaterial({ color: 0xB71C1C, roughness: 0.65 });
    var roofEdgeMat = new THREE.MeshStandardMaterial({ color: 0x8E0000, roughness: 0.7 });
    // Lower roof panels (steep angle)
    for (var rs = -1; rs <= 1; rs += 2) {
      var lowerRoof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, barnD + 1.0), roofRedMat);
      lowerRoof.position.set(bx + rs * 3.2, barnH + 0.8, bz);
      lowerRoof.rotation.z = rs * 0.7;
      lowerRoof.castShadow = true;
      target.add(lowerRoof);
    }
    // Upper roof panels (shallow angle)
    for (var rs = -1; rs <= 1; rs += 2) {
      var upperRoof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, barnD + 1.0), roofRedMat);
      upperRoof.position.set(bx + rs * 1.6, barnH + 2.2, bz);
      upperRoof.rotation.z = rs * 0.2;
      upperRoof.castShadow = true;
      target.add(upperRoof);
    }
    // Ridge cap
    var ridge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, barnD + 1.2), roofEdgeMat);
    ridge.position.set(bx, barnH + 2.35, bz);
    target.add(ridge);
    // Cupola (ventilator on top)
    var cupBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.0), trimMat);
    cupBase.position.set(bx, barnH + 2.8, bz);
    target.add(cupBase);
    var cupRoof = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.6, 4), roofEdgeMat);
    cupRoof.position.set(bx, barnH + 3.4, bz);
    cupRoof.rotation.y = Math.PI / 4;
    target.add(cupRoof);
    // Weather vane
    var vanePost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 4), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 }));
    vanePost.position.set(bx, barnH + 4.0, bz);
    target.add(vanePost);
    var vaneArrow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 }));
    vaneArrow.position.set(bx, barnH + 4.5, bz);
    vaneArrow.rotation.y = 0.4;
    target.add(vaneArrow);
    // Front face — big double door with X pattern
    var frontZ = bz + barnD / 2 + 0.01;
    // Door opening (dark)
    var doorBg = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.0), new THREE.MeshStandardMaterial({ color: 0x1A0E00 }));
    doorBg.position.set(bx, 2.0, frontZ);
    target.add(doorBg);
    // Left door panel
    for (var ds = -1; ds <= 1; ds += 2) {
      var doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.8, 0.1), redMat);
      doorPanel.position.set(bx + ds * 0.8, 2.0, frontZ + 0.05);
      target.add(doorPanel);
      // X cross braces (white)
      var xb1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.2, 0.05), trimMat);
      xb1.position.set(bx + ds * 0.8, 2.0, frontZ + 0.12);
      xb1.rotation.z = ds * 0.35;
      target.add(xb1);
      var xb2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.2, 0.05), trimMat);
      xb2.position.set(bx + ds * 0.8, 2.0, frontZ + 0.12);
      xb2.rotation.z = ds * -0.35;
      target.add(xb2);
      // Horizontal brace
      var hb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.05), trimMat);
      hb.position.set(bx + ds * 0.8, 2.0, frontZ + 0.12);
      target.add(hb);
    }
    // Hay loft door (upper, arched shape simulated)
    var loftBg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshStandardMaterial({ color: 0x2C1600 }));
    loftBg.position.set(bx, barnH + 0.6, frontZ + 0.02);
    target.add(loftBg);
    var loftFrame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.08), trimMat);
    loftFrame.position.set(bx, barnH + 1.3, frontZ + 0.04);
    target.add(loftFrame);
    // Hay spilling out of loft
    var hayMat = new THREE.MeshStandardMaterial({ color: 0xD4A843, roughness: 0.9 });
    for (var hy = 0; hy < 5; hy++) {
      var hay = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4 + Math.random() * 0.3, 0.08), hayMat);
      hay.position.set(bx + (Math.random() - 0.5) * 1.2, barnH - 0.1 + Math.random() * 0.3, frontZ + 0.1);
      hay.rotation.z = (Math.random() - 0.5) * 0.6;
      target.add(hay);
    }
    // Side windows (2 per side)
    for (var ws = -1; ws <= 1; ws += 2) {
      var wallX = bx + ws * (barnW / 2 + 0.01);
      for (var wi = 0; wi < 2; wi++) {
        var winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 1.2), trimMat);
        winFrame.position.set(wallX, 2.8, bz - 1.5 + wi * 3.5);
        target.add(winFrame);
        var winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.8), new THREE.MeshStandardMaterial({ color: 0xBBDEFB, roughness: 0.1, metalness: 0.2 }));
        winGlass.position.set(wallX + ws * 0.03, 2.8, bz - 1.5 + wi * 3.5);
        target.add(winGlass);
        // Window cross
        var wch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.05), trimMat);
        wch.position.set(wallX + ws * 0.06, 2.8, bz - 1.5 + wi * 3.5);
        target.add(wch);
        var wcv = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.8), trimMat);
        wcv.position.set(wallX + ws * 0.06, 2.8, bz - 1.5 + wi * 3.5);
        target.add(wcv);
      }
    }

    // ── Silo (bigger, more detailed) ──
    var siloMat = new THREE.MeshStandardMaterial({ color: 0xE0E0E0, roughness: 0.4, metalness: 0.15 });
    var silo = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 9, 16), siloMat);
    silo.position.set(8, 4.5, fz - 10);
    silo.castShadow = true;
    target.add(silo);
    // Silo rings
    for (var sr = 0; sr < 4; sr++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.06, 6, 16), stoneMat);
      ring.position.set(8, 1.5 + sr * 2.2, fz - 10);
      ring.rotation.x = Math.PI / 2;
      target.add(ring);
    }
    var siloTop = new THREE.Mesh(new THREE.ConeGeometry(2.0, 2, 16), new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.6 }));
    siloTop.position.set(8, 10, fz - 10);
    target.add(siloTop);
    // Second smaller silo
    var silo2 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 7, 14), siloMat);
    silo2.position.set(11, 3.5, fz - 12);
    silo2.castShadow = true;
    target.add(silo2);
    var siloTop2 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.5, 14), roofMat);
    siloTop2.position.set(11, 7.5, fz - 12);
    target.add(siloTop2);

    // ── Soy plantation rows (varied greens, dirt rows) ──
    var soyColors = [0x4CAF50, 0x66BB6A, 0x388E3C, 0x558B2F, 0x7CB342];
    for (var side = -1; side <= 1; side += 2) {
      for (var row = 0; row < 10; row++) {
        // Dirt row
        var dirtRow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 22), dirtMat);
        var rx = side * (BW / 2 + 1.5 + row * 1.3);
        dirtRow.position.set(rx, 0.04, fz - 4);
        target.add(dirtRow);
        for (var p = 0; p < 14; p++) {
          var sz = fz + 6 - p * 1.6;
          var bushMat = new THREE.MeshStandardMaterial({ color: soyColors[(row + p) % soyColors.length], roughness: 0.85 });
          var bush = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 5), bushMat);
          bush.position.set(rx + (Math.random() - 0.5) * 0.2, 0.25, sz);
          bush.scale.set(0.9 + Math.random() * 0.3, 0.5 + Math.random() * 0.2, 0.7 + Math.random() * 0.2);
          target.add(bush);
        }
      }
    }

    // ── White picket fence ──
    var fenceWhite = new THREE.MeshStandardMaterial({ color: 0xFAFAFA, roughness: 0.5 });
    var fenceLen = 25;
    for (var side = -1; side <= 1; side += 2) {
      for (var fi = 0; fi < fenceLen; fi++) {
        var fz2 = fz + 30 - fi * 2.0;
        // Post
        var post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), fenceWhite);
        post.position.set(side * (BW / 2 + 0.8), 0.6, fz2);
        post.castShadow = true;
        target.add(post);
        // Pointed top
        var tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), fenceWhite);
        tip.position.set(side * (BW / 2 + 0.8), 1.3, fz2);
        target.add(tip);
        // Horizontal rails
        if (fi < fenceLen - 1) {
          var rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2.0), fenceWhite);
          rail.position.set(side * (BW / 2 + 0.8), 0.4, fz2 - 1.0);
          target.add(rail);
          var rail2 = rail.clone();
          rail2.position.y = 0.9;
          target.add(rail2);
        }
      }
    }

    // ── Pond (lagoa) ──
    var pondMat = new THREE.MeshStandardMaterial({ color: 0x29B6F6, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 });
    var pond = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 0.15, 20), pondMat);
    pond.position.set(8, 0.08, fz + 12);
    target.add(pond);
    // Pond edge (stones)
    for (var ps = 0; ps < 14; ps++) {
      var pa = (ps / 14) * Math.PI * 2;
      var stone = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 6, 5), stoneMat);
      stone.position.set(8 + Math.cos(pa) * 3.6, 0.15, fz + 12 + Math.sin(pa) * 3.6);
      stone.scale.set(1, 0.5, 1);
      target.add(stone);
    }
    // Lily pads
    var lilyMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.8 });
    var lilyPos = [[7.5, fz + 11], [8.8, fz + 12.5], [7.2, fz + 13], [9.2, fz + 11.3]];
    for (var lp = 0; lp < lilyPos.length; lp++) {
      var lily = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 10), lilyMat);
      lily.position.set(lilyPos[lp][0], 0.17, lilyPos[lp][1]);
      target.add(lily);
    }
    // Flower on lily
    var flowerMat = new THREE.MeshStandardMaterial({ color: 0xF48FB1, roughness: 0.5, emissive: 0xF48FB1, emissiveIntensity: 0.1 });
    var flower = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), flowerMat);
    flower.position.set(8.8, 0.3, fz + 12.5);
    target.add(flower);

    // ── Big trees ──
    function makeTree(x, z, trunkH, crownR) {
      // Trunk
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, trunkH, 8), darkWoodMat);
      trunk.position.set(x, trunkH / 2, z);
      trunk.castShadow = true;
      target.add(trunk);
      // Crown (layered spheres for volume)
      var crownColors = [0x388E3C, 0x43A047, 0x2E7D32, 0x4CAF50];
      for (var c = 0; c < 4; c++) {
        var cr = new THREE.Mesh(
          new THREE.SphereGeometry(crownR * (0.7 + Math.random() * 0.4), 8, 7),
          new THREE.MeshStandardMaterial({ color: crownColors[c], roughness: 0.85 })
        );
        cr.position.set(
          x + (Math.random() - 0.5) * crownR * 0.6,
          trunkH + crownR * 0.3 + c * crownR * 0.25,
          z + (Math.random() - 0.5) * crownR * 0.6
        );
        cr.castShadow = true;
        target.add(cr);
      }
    }
    makeTree(-12, fz + 20, 3.5, 2.5);
    makeTree(13, fz + 18, 4.0, 2.8);
    makeTree(-13, fz - 5, 3.0, 2.2);
    makeTree(14, fz - 15, 3.8, 2.6);
    makeTree(-11, fz - 20, 2.5, 2.0);
    makeTree(12, fz + 2, 3.2, 2.3);

    // ── Flower beds ──
    var flowerColors = [0xF44336, 0xFFEB3B, 0xFF9800, 0xE91E63, 0xAB47BC];
    var flowerBeds = [[-5, fz + 22], [4, fz + 24], [-3, fz + 18]];
    for (var fb = 0; fb < flowerBeds.length; fb++) {
      for (var ff = 0; ff < 8; ff++) {
        var fc = flowerColors[(fb + ff) % flowerColors.length];
        var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), new THREE.MeshStandardMaterial({ color: 0x33691E }));
        var fx = flowerBeds[fb][0] + (Math.random() - 0.5) * 2;
        var ffz = flowerBeds[fb][1] + (Math.random() - 0.5) * 1.5;
        stem.position.set(fx, 0.25, ffz);
        target.add(stem);
        var petal = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), new THREE.MeshStandardMaterial({ color: fc, roughness: 0.5, emissive: fc, emissiveIntensity: 0.15 }));
        petal.position.set(fx, 0.55, ffz);
        target.add(petal);
      }
    }

    // ── Stone path (caminho de pedras) ──
    for (var sp = 0; sp < 18; sp++) {
      var pathStone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35 + Math.random() * 0.15, 0.4, 0.06, 7),
        new THREE.MeshStandardMaterial({ color: 0xBDBDBD, roughness: 0.9 })
      );
      pathStone.position.set(
        (Math.random() - 0.5) * 2,
        0.03,
        fz + 30 - sp * 1.8 + (Math.random() - 0.5) * 0.4
      );
      target.add(pathStone);
    }

    // ── Soy bags (smaller pile near barn) ──
    var bagMat = new THREE.MeshStandardMaterial({ color: 0xD7CCC8, roughness: 0.75 });
    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 4 - row; col++) {
        var bag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), bagMat);
        bag.position.set(-4 + col * 1.3, row * 0.6 + 0.3, fz - 4);
        bag.rotation.y = (Math.random() - 0.5) * 0.15;
        bag.castShadow = true;
        target.add(bag);
      }
    }

    // ── Wooden bench ──
    var benchSeat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.7), woodMat);
    benchSeat.position.set(-8, 0.7, fz + 18);
    target.add(benchSeat);
    for (var bl = -1; bl <= 1; bl += 2) {
      var bleg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.6), woodMat);
      bleg.position.set(-8 + bl * 1.0, 0.35, fz + 18);
      target.add(bleg);
    }

    // ── Lamp post ──
    var lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.5, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    lampPole.position.set(0, 1.75, fz + 25);
    target.add(lampPole);
    var lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshStandardMaterial({ color: 0xFFF9C4, emissive: 0xFFD54F, emissiveIntensity: 0.5 }));
    lampHead.position.set(0, 3.6, fz + 25);
    target.add(lampHead);
    // Lamp arm
    var lampArm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    lampArm.position.set(0.3, 3.4, fz + 25);
    target.add(lampArm);

    // ── Wooden barrels ──
    var barrelMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.7 });
    var barrelRingMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.8 });
    var barrelPositions = [[6, fz + 22], [6.8, fz + 21.5], [5.5, fz + 21]];
    for (var bp = 0; bp < barrelPositions.length; bp++) {
      var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 1.0, 10), barrelMat);
      barrel.position.set(barrelPositions[bp][0], 0.5, barrelPositions[bp][1]);
      target.add(barrel);
      // Rings
      for (var br = 0; br < 2; br++) {
        var bring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.025, 4, 10), barrelRingMat);
        bring.position.set(barrelPositions[bp][0], 0.25 + br * 0.5, barrelPositions[bp][1]);
        bring.rotation.x = Math.PI / 2;
        target.add(bring);
      }
    }

    // ── "LAVOURA" sign (wooden, rustic) ──
    var signG = new THREE.Group();
    var signPole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4, 6), darkWoodMat);
    signPole1.position.set(-1.5, 2, 0);
    signG.add(signPole1);
    var signPole2 = signPole1.clone();
    signPole2.position.x = 1.5;
    signG.add(signPole2);
    var signBoard = new THREE.Mesh(new THREE.BoxGeometry(4, 1.3, 0.15), new THREE.MeshStandardMaterial({ color: 0x2E7D32 }));
    signBoard.position.y = 3.8;
    signG.add(signBoard);
    var scv = document.createElement('canvas');
    scv.width = 400; scv.height = 120;
    var sctx = scv.getContext('2d');
    sctx.fillStyle = '#2E7D32'; sctx.fillRect(0, 0, 400, 120);
    sctx.strokeStyle = '#FFF'; sctx.lineWidth = 3;
    sctx.strokeRect(8, 8, 384, 104);
    sctx.fillStyle = '#FFF'; sctx.font = '800 60px FuturaCond, Arial';
    sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
    sctx.fillText('LAVOURA', 200, 62);
    var signLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 1.1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(scv) })
    );
    signLabel.position.set(0, 3.8, 0.09);
    signG.add(signLabel);
    signG.position.set(BW / 2 + 3.5, 0, fz + 15);
    target.add(signG);

    // ── Sunflowers near barn ──
    var sunflowerYellow = new THREE.MeshStandardMaterial({ color: 0xFDD835, roughness: 0.5, emissive: 0xFBC02D, emissiveIntensity: 0.1 });
    var sunflowerBrown = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.8 });
    for (var sf = 0; sf < 6; sf++) {
      var sfx = -11 + sf * 0.8 + (Math.random() - 0.5) * 0.3;
      var sfz = fz + 10 + (Math.random() - 0.5) * 1.5;
      var sfH = 1.8 + Math.random() * 0.8;
      var sfStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, sfH, 5), new THREE.MeshStandardMaterial({ color: 0x558B2F }));
      sfStem.position.set(sfx, sfH / 2, sfz);
      target.add(sfStem);
      var sfHead = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 10), sunflowerYellow);
      sfHead.position.set(sfx, sfH + 0.05, sfz);
      target.add(sfHead);
      var sfCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8), sunflowerBrown);
      sfCenter.position.set(sfx, sfH + 0.1, sfz);
      target.add(sfCenter);
    }

    // ── Small chicken coop ──
    var coopBody = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 2.5), woodMat);
    coopBody.position.set(5, 0.75, fz - 2);
    coopBody.castShadow = true;
    target.add(coopBody);
    var coopRoof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 3.0), roofMat);
    coopRoof.position.set(5, 1.6, fz - 2);
    coopRoof.rotation.x = 0.15;
    target.add(coopRoof);
    var coopDoor = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x3E2723 }));
    coopDoor.position.set(5, 0.4, fz - 0.74);
    target.add(coopDoor);
    // Tiny chickens (simple)
    var chickenMat = new THREE.MeshStandardMaterial({ color: 0xFFF8E1, roughness: 0.7 });
    var chickenRedMat = new THREE.MeshStandardMaterial({ color: 0xE53935, roughness: 0.6 });
    var chickPos = [[5.8, fz - 0.5], [4.5, fz + 0.2], [6.2, fz - 1.5]];
    for (var ch = 0; ch < chickPos.length; ch++) {
      var chBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), chickenMat);
      chBody.position.set(chickPos[ch][0], 0.25, chickPos[ch][1]);
      chBody.scale.set(1, 0.8, 1.2);
      target.add(chBody);
      var chHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), chickenMat);
      chHead.position.set(chickPos[ch][0], 0.4, chickPos[ch][1] + 0.15);
      target.add(chHead);
      var comb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), chickenRedMat);
      comb.position.set(chickPos[ch][0], 0.48, chickPos[ch][1] + 0.15);
      target.add(comb);
    }
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
    elSaldo.textContent = total === 0 ? '0' : (total > 0 ? '+' : '') + total;
    elSaldo.className = 'pill-val ' + (total > 0 ? 'pos' : total < 0 ? 'neg' : '');
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

  // ─── Farm celebration ──────────────────────
  function spawnScatterCoins(px, pz) {
    var coinMat = new THREE.MeshStandardMaterial({ color: 0xFFCC00, metalness: 0.6, roughness: 0.2, emissive: 0xCC9900, emissiveIntensity: 0.4 });
    for (var i = 0; i < 30; i++) {
      var c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8), coinMat);
      c.position.set(px, 1.5, pz);
      scene.add(c);
      var angle = Math.random() * Math.PI * 2;
      var dist = 3 + Math.random() * 8;
      scatterCoins.push({
        mesh: c,
        vx: Math.cos(angle) * dist,
        vy: 4 + Math.random() * 5,
        vz: Math.sin(angle) * dist,
        life: 1.5 + Math.random() * 1.0
      });
    }
  }

  function updateScatterCoins(dt) {
    for (var i = scatterCoins.length - 1; i >= 0; i--) {
      var sc = scatterCoins[i];
      sc.life -= dt;
      sc.vy -= 14 * dt; // gravity
      sc.mesh.position.x += sc.vx * dt;
      sc.mesh.position.y += sc.vy * dt;
      sc.mesh.position.z += sc.vz * dt;
      sc.mesh.rotation.x += 5 * dt;
      sc.mesh.rotation.z += 3 * dt;
      if (sc.mesh.position.y < 0.03) {
        sc.mesh.position.y = 0.03;
        sc.vy = 0; sc.vx *= 0.3; sc.vz *= 0.3;
      }
      if (sc.life <= 0) {
        // Fade: shrink and remove
        sc.mesh.scale.multiplyScalar(0.85);
        if (sc.mesh.scale.x < 0.05) {
          scene.remove(sc.mesh);
          scatterCoins.splice(i, 1);
        }
      }
    }
  }

  var FARM_REWARDS = [
    { delay: 0.5, build: function(fz) {
      // Tractor — chunky cartoon style (visible and fun)
      var g = new THREE.Group();
      var greenMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.4 });
      var greenDark = new THREE.MeshStandardMaterial({ color: 0x1B5E20, roughness: 0.5 });
      var yellowMat = new THREE.MeshStandardMaterial({ color: 0xFDD835, roughness: 0.35 });
      var blackMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
      var glassMat = new THREE.MeshStandardMaterial({ color: 0x81D4FA, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6 });
      var chromeMat = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, roughness: 0.1, metalness: 0.7 });

      // Helper: make a solid wheel (cylinder tire + cylinder rim)
      function makeWheel(radius, width, x, y, z) {
        var wg = new THREE.Group();
        // Tire (dark, thick)
        var tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), blackMat);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        wg.add(tire);
        // Rim (yellow)
        var rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, width + 0.04, 12), yellowMat);
        rim.rotation.z = Math.PI / 2;
        wg.add(rim);
        // Hub cap
        var cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width + 0.08, 8), chromeMat);
        cap.rotation.z = Math.PI / 2;
        wg.add(cap);
        // Tread lines
        for (var t = 0; t < 8; t++) {
          var a = (t / 8) * Math.PI * 2;
          var tread = new THREE.Mesh(new THREE.BoxGeometry(0.04, radius * 0.2, width * 0.9), new THREE.MeshStandardMaterial({ color: 0x111111 }));
          tread.position.set(0, Math.cos(a) * radius * 0.92, Math.sin(a) * radius * 0.92);
          tread.rotation.x = a;
          wg.add(tread);
        }
        wg.position.set(x, y, z);
        return wg;
      }

      // Engine / hood (front, long)
      var hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.8), greenMat);
      hood.position.set(0, 1.6, 1.6);
      hood.castShadow = true;
      g.add(hood);
      // Hood top curved (slightly rounded)
      var hoodRound = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.8, 8, 1, false, 0, Math.PI), greenDark);
      hoodRound.rotation.x = Math.PI / 2;
      hoodRound.rotation.z = Math.PI;
      hoodRound.position.set(0, 2.2, 1.6);
      hoodRound.scale.set(1, 0.2, 1);
      g.add(hoodRound);
      // Grille (front face, dark with yellow bars)
      var grilleBg = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.12), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 }));
      grilleBg.position.set(0, 1.5, 3.02);
      g.add(grilleBg);
      for (var gb = 0; gb < 4; gb++) {
        var bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), yellowMat);
        bar.position.set(0, 1.2 + gb * 0.22, 3.08);
        g.add(bar);
      }
      // Headlights (round, bright)
      for (var hl = -1; hl <= 1; hl += 2) {
        var lightRing = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 10), chromeMat);
        lightRing.rotation.x = Math.PI / 2;
        lightRing.position.set(hl * 0.65, 1.9, 3.04);
        g.add(lightRing);
        var lightBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0xFFF9C4, emissive: 0xFFD54F, emissiveIntensity: 0.5 }));
        lightBulb.rotation.x = Math.PI / 2;
        lightBulb.position.set(hl * 0.65, 1.9, 3.06);
        g.add(lightBulb);
      }
      // Chassis (under body)
      var chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 4.5), greenDark);
      chassis.position.set(0, 0.7, 0.3);
      g.add(chassis);
      // Fenders over rear wheels (curved look)
      for (var s = -1; s <= 1; s += 2) {
        var fender = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 2.2), greenMat);
        fender.position.set(s * 1.35, 1.6, -1.0);
        g.add(fender);
        var fenderTop = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 12, 1, false, s > 0 ? 0 : Math.PI, Math.PI), greenDark);
        fenderTop.rotation.x = Math.PI / 2;
        fenderTop.position.set(s * 1.35, 1.6, -1.0);
        fenderTop.scale.set(0.45, 1, 0.75);
        g.add(fenderTop);
      }
      // Cabin
      // Floor
      var cabFloor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.2), greenDark);
      cabFloor.position.set(0, 2.2, -0.6);
      g.add(cabFloor);
      // Pillars (4 corners)
      for (var px = -1; px <= 1; px += 2) {
        for (var pz = -1; pz <= 1; pz += 2) {
          var pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), greenDark);
          pillar.position.set(px * 1.05, 3.15, -0.6 + pz * 0.95);
          g.add(pillar);
        }
      }
      // Roof
      var cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 2.5), greenDark);
      cabRoof.position.set(0, 4.1, -0.6);
      cabRoof.castShadow = true;
      g.add(cabRoof);
      // Roof edge strip
      var roofEdge = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.06, 2.6), yellowMat);
      roofEdge.position.set(0, 4.0, -0.6);
      g.add(roofEdge);
      // Glass windows (front + sides)
      var winF = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), glassMat);
      winF.position.set(0, 3.2, 0.36);
      g.add(winF);
      var winB = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), glassMat);
      winB.position.set(0, 3.2, -1.56);
      g.add(winB);
      for (var ws = -1; ws <= 1; ws += 2) {
        var winS = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.5), glassMat);
        winS.rotation.y = ws * Math.PI / 2;
        winS.position.set(ws * 1.06, 3.2, -0.6);
        g.add(winS);
      }
      // Steering wheel (tiny detail)
      var steer = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 10), blackMat);
      steer.position.set(0, 2.8, 0.1);
      steer.rotation.x = -0.6;
      g.add(steer);
      // Exhaust stack (chrome pipe)
      var exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8), chromeMat);
      exhaust.position.set(0.75, 3.0, 1.8);
      exhaust.castShadow = true;
      g.add(exhaust);
      var exhaustCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.15, 8), chromeMat);
      exhaustCap.position.set(0.75, 4.25, 1.8);
      g.add(exhaustCap);
      // Rear wheels (BIG)
      g.add(makeWheel(1.0, 0.55, -1.55, 1.0, -1.0));
      g.add(makeWheel(1.0, 0.55, 1.55, 1.0, -1.0));
      // Front wheels (smaller)
      g.add(makeWheel(0.55, 0.35, -1.15, 0.55, 2.2));
      g.add(makeWheel(0.55, 0.35, 1.15, 0.55, 2.2));
      // Hitch (rear)
      var hitch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.8), chromeMat);
      hitch.position.set(0, 0.5, -2.3);
      g.add(hitch);

      g.position.set(-6, 0, fz + 25);
      g.rotation.y = 0.5;
      return g;
    }},
    { delay: 1.0, build: function(fz) {
      // Windmill (classic farm style)
      var g = new THREE.Group();
      var baseMat = new THREE.MeshStandardMaterial({ color: 0xBDBDBD, roughness: 0.5, metalness: 0.15 });
      // Tapered tower
      var tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 8, 8), baseMat);
      tower.position.y = 4;
      tower.castShadow = true;
      g.add(tower);
      // Platform
      var plat = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0x9E9E9E }));
      plat.position.y = 8.1;
      g.add(plat);
      // Hub
      var hub = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshStandardMaterial({ color: 0xE0E0E0, metalness: 0.3 }));
      hub.position.set(0, 8.5, 0.3);
      g.add(hub);
      // Blades (4 blades, lattice style)
      var bladeMat = new THREE.MeshStandardMaterial({ color: 0xEEEEEE, roughness: 0.4 });
      g.userData.blades = [];
      for (var b = 0; b < 4; b++) {
        var pivot = new THREE.Group();
        pivot.position.set(0, 8.5, 0.4);
        // Main beam
        var beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.5, 0.04), bladeMat);
        beam.position.y = 1.75;
        pivot.add(beam);
        // Cross struts
        for (var cs = 0; cs < 5; cs++) {
          var strut = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.03), bladeMat);
          strut.position.set(0.2, 0.6 + cs * 0.65, 0);
          pivot.add(strut);
        }
        // Sail
        var sail = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.0), new THREE.MeshStandardMaterial({ color: 0xFAFAFA, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
        sail.position.set(0.2, 1.75, 0.02);
        pivot.add(sail);
        pivot.rotation.z = (b / 4) * Math.PI * 2;
        g.add(pivot);
        g.userData.blades.push(pivot);
      }
      // Cross braces on tower
      var braceMat = new THREE.MeshStandardMaterial({ color: 0x757575 });
      for (var br = 0; br < 3; br++) {
        var brace = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.4, 0.04), braceMat);
        brace.position.set(0.6, 1.5 + br * 2.5, 0);
        brace.rotation.z = 0.4;
        g.add(brace);
        var brace2 = brace.clone();
        brace2.position.x = -0.6;
        brace2.rotation.z = -0.4;
        g.add(brace2);
      }
      g.position.set(-13, 0, fz + 8);
      return g;
    }},
    { delay: 1.7, build: function(fz) {
      // Hay bales (round, scattered)
      var g = new THREE.Group();
      var hayMat = new THREE.MeshStandardMaterial({ color: 0xD4A843, roughness: 0.9 });
      var hayLight = new THREE.MeshStandardMaterial({ color: 0xE6C258, roughness: 0.85 });
      var positions = [
        [0, 0, 0], [1.8, 0, 0.4], [0.8, 1.05, 0.2],
        [-1.5, 0, -0.6], [3.2, 0, -0.3], [1.5, 0, -1.5],
        [-0.5, 0, 1.2], [2.5, 0, 1.0]
      ];
      for (var i = 0; i < positions.length; i++) {
        var mat = i % 2 === 0 ? hayMat : hayLight;
        var bale = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 12), mat);
        bale.rotation.z = Math.PI / 2;
        bale.rotation.y = (Math.random() - 0.5) * 0.3;
        bale.position.set(positions[i][0], positions[i][1] + 0.55, positions[i][2]);
        bale.castShadow = true;
        g.add(bale);
        // Straw strands on top
        var strandMat = new THREE.MeshStandardMaterial({ color: 0xCDB54A, roughness: 1 });
        for (var st = 0; st < 3; st++) {
          var strand = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.25, 3), strandMat);
          strand.position.set(positions[i][0] + (Math.random() - 0.5) * 0.3, positions[i][1] + 1.1, positions[i][2] + (Math.random() - 0.5) * 0.3);
          strand.rotation.x = (Math.random() - 0.5) * 0.5;
          strand.rotation.z = (Math.random() - 0.5) * 0.5;
          g.add(strand);
        }
      }
      g.position.set(5, 0, fz + 15);
      return g;
    }},
    { delay: 2.3, build: function(fz) {
      // Pulverizador (crop sprayer - Syngenta blue)
      var g = new THREE.Group();
      var frameMat = new THREE.MeshStandardMaterial({ color: 0x1565C0, roughness: 0.4, metalness: 0.1 });
      var tankMat = new THREE.MeshStandardMaterial({ color: 0x42A5F5, roughness: 0.3, metalness: 0.15 });
      var wheelMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 });
      // Main frame
      var frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 3.0), frameMat);
      frame.position.y = 1.0;
      g.add(frame);
      // Tank
      var tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 12), tankMat);
      tank.position.set(0, 2.0, -0.2);
      g.add(tank);
      // Tank caps
      var capMat = new THREE.MeshStandardMaterial({ color: 0xFFD600, roughness: 0.4 });
      var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 8), capMat);
      cap.position.set(0, 2.95, -0.2);
      g.add(cap);
      // Boom arms (wide)
      for (var s = -1; s <= 1; s += 2) {
        var arm = new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 0.12), frameMat);
        arm.position.set(s * 3.5, 0.8, 0.5);
        g.add(arm);
        var armBrace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), frameMat);
        armBrace.position.set(s * 1.0, 1.05, 0.5);
        armBrace.rotation.z = s * 0.4;
        g.add(armBrace);
        for (var n = 0; n < 5; n++) {
          var nz = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.25, 5), capMat);
          nz.position.set(s * (1.2 + n * 0.9), 0.6, 0.5);
          g.add(nz);
        }
      }
      // Wheels (4)
      for (var s = -1; s <= 1; s += 2) {
        for (var wz = -1; wz <= 1; wz += 2) {
          var tire = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.18, 8, 12), wheelMat);
          tire.rotation.y = Math.PI / 2;
          tire.position.set(s * 1.3, 0.45, wz * 1.0);
          g.add(tire);
          var whub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 8), frameMat);
          whub.rotation.z = Math.PI / 2;
          whub.position.set(s * 1.3, 0.45, wz * 1.0);
          g.add(whub);
        }
      }
      g.position.set(-3, 0, fz + 28);
      g.rotation.y = -0.3;
      return g;
    }},
    { delay: 2.9, build: function(fz) {
      // Pig pen with pig
      var g = new THREE.Group();
      var fenceMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.8 });
      // Fence posts
      for (var fi = 0; fi < 8; fi++) {
        var a = (fi / 8) * Math.PI * 2;
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 5), fenceMat);
        post.position.set(Math.cos(a) * 2.0, 0.5, Math.sin(a) * 2.0);
        g.add(post);
        // Rails
        var nextA = ((fi + 1) / 8) * Math.PI * 2;
        var mx = (Math.cos(a) + Math.cos(nextA)) / 2 * 2.0;
        var mz = (Math.sin(a) + Math.sin(nextA)) / 2 * 2.0;
        var len = 1.6;
        var rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), fenceMat);
        rail.position.set(mx, 0.4, mz);
        rail.rotation.y = Math.atan2(Math.sin(nextA) - Math.sin(a), Math.cos(nextA) - Math.cos(a));
        g.add(rail);
        var rail2 = rail.clone();
        rail2.position.y = 0.7;
        g.add(rail2);
      }
      // Pig body
      var pigMat = new THREE.MeshStandardMaterial({ color: 0xFFCDD2, roughness: 0.7 });
      var pigDark = new THREE.MeshStandardMaterial({ color: 0xEF9A9A, roughness: 0.7 });
      var pigBody = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 7), pigMat);
      pigBody.position.set(0, 0.45, 0);
      pigBody.scale.set(1.3, 0.9, 1);
      g.add(pigBody);
      // Head
      var pigHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), pigMat);
      pigHead.position.set(0, 0.5, 0.6);
      g.add(pigHead);
      // Snout
      var snout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.1, 8), pigDark);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, 0.45, 0.9);
      g.add(snout);
      // Ears
      for (var e = -1; e <= 1; e += 2) {
        var ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), pigDark);
        ear.position.set(e * 0.2, 0.7, 0.55);
        ear.scale.set(0.6, 1, 0.4);
        g.add(ear);
      }
      // Legs
      for (var lx = -1; lx <= 1; lx += 2) {
        for (var lz = -1; lz <= 1; lz += 2) {
          var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 5), pigDark);
          leg.position.set(lx * 0.3, 0.15, lz * 0.3);
          g.add(leg);
        }
      }
      // Mud puddle
      var mud = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 1 }));
      mud.position.set(0.5, 0.02, -0.5);
      g.add(mud);
      g.position.set(12, 0, fz + 20);
      return g;
    }}
  ];

  function spawnFarmReward(index) {
    var fz = -DIST - 5;
    var def = FARM_REWARDS[index];
    var g = def.build(fz);
    g.scale.set(0.01, 0.01, 0.01);
    g.userData.popIn = 0;
    scene.add(g);
    farmRewards.push(g);
    // Scatter coins at spawn point
    spawnScatterCoins(g.position.x, g.position.z);
  }

  function updateFarmRewards(dt) {
    for (var i = 0; i < farmRewards.length; i++) {
      var g = farmRewards[i];
      if (g.userData.popIn < 1) {
        g.userData.popIn = Math.min(1, g.userData.popIn + dt * 2.5);
        // Elastic ease-out
        var t = g.userData.popIn;
        var s = 1 + Math.sin(t * Math.PI) * 0.2 * (1 - t);
        var scale = t * s;
        g.scale.set(scale, scale, scale);
      }
      // Spin windmill blades
      if (g.userData.blades) {
        for (var b = 0; b < g.userData.blades.length; b++) {
          g.userData.blades[b].rotation.z += 1.5 * dt;
        }
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
    if (winTimer) { clearTimeout(winTimer); winTimer = null; }
    winTriggered = false; winFinalScore = 0; winElapsed = 0;
    // Clean up celebration objects
    for (var i = 0; i < scatterCoins.length; i++) scene.remove(scatterCoins[i].mesh);
    scatterCoins = [];
    for (var i = 0; i < farmRewards.length; i++) scene.remove(farmRewards[i]);
    farmRewards = []; farmRewardSpawned = 0;
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

    // After all gates, slow down so the player can enjoy the farm
    if (zPos > lastGateEnd) {
      speed = Math.min(speed, ISPEED * 0.7);
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

    // Camera — pan around the farm during celebration
    if (winTriggered) {
      var camT = Math.min(winElapsed / 4.0, 1);
      var camAngle = camT * Math.PI * 0.4 - 0.2;
      var camDist = 18 + camT * 4;
      var camH = 8 + Math.sin(camT * Math.PI) * 4;
      camera.position.set(
        Math.sin(camAngle) * camDist,
        camH,
        -DIST + Math.cos(camAngle) * camDist
      );
      camera.lookAt(0, 2, -DIST - 8);
    } else {
      camera.position.set(curX * 0.12, 12 + Math.sin(elapsed * 0.4) * 0.2, -zPos + 14);
      camera.lookAt(curX * 0.15, 1, -zPos - 10);
    }

    // Build bridge (auto-bridge after all gates are passed, but stop at the farm island)
    var pastAllGates = zPos > lastGateEnd;
    var bridgeLimit = -(DIST);  // farm island starts here
    if (lastPZ > -zPos - 18 && lastPZ > bridgeLimit && (stakes > 0 || pastAllGates)) {
      var target = Math.max(-zPos - 18, bridgeLimit);
      buildTo(target, pastAllGates);
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

    updateUI();

    // Win — stop at the farm, scatter coins, spawn rewards
    if (zPos >= DIST && !winTriggered) {
      winTriggered = true;
      winElapsed = 0;
      farmRewardSpawned = 0;
      disableTouch();
      bonusC += stakes * 5;
      var finalScore = Math.min(coins + bonusC, 10000);
      winFinalScore = finalScore;
      zPos = DIST;
      playerGroup.position.set(curX, baseY, -zPos);
      // Initial coin burst from player
      spawnScatterCoins(curX, -zPos);
      // Delay the win screen until all rewards are shown
      var totalDelay = FARM_REWARDS[FARM_REWARDS.length - 1].delay + 2.0;
      winTimer = setTimeout(function() {
        running = false;
        handleGameEnd(winFinalScore, true);
      }, totalDelay * 1000);
    }
    if (winTriggered) {
      zPos = DIST;
      winElapsed += dt;
      // Spawn farm rewards progressively
      while (farmRewardSpawned < FARM_REWARDS.length && winElapsed >= FARM_REWARDS[farmRewardSpawned].delay) {
        spawnFarmReward(farmRewardSpawned);
        farmRewardSpawned++;
      }
      updateScatterCoins(dt);
      updateFarmRewards(dt);
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
