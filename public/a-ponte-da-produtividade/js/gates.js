(function() {
  'use strict';

  var gates = [];
  var passed = {};
  var lastGateEnd = 0;
  var sceneMeshes = [];

  function make() {
    var cfg = PONTE.config;
    var scene = PONTE.scene.scene;
    gates = [];
    lastGateEnd = cfg.GSPACE * (cfg.NGATES - 1) + 16 + cfg.GSPACE;

    for (var i = 0; i < cfg.NGATES; i++) {
      var z = -(cfg.GSPACE * i + 16);
      var goodSide = Math.random() > 0.5 ? 'left' : 'right';
      var gv = Math.floor(Math.random() * cfg.gateGoodRange + cfg.gateGoodMin);
      var bv = -Math.floor(Math.random() * cfg.gateBadRange + cfg.gateBadMin);

      var lv = goodSide === 'left' ? gv : bv;
      var rv = goodSide === 'right' ? gv : bv;
      var lData = goodSide === 'left' ? PONTE.PRODUCTS[i % PONTE.PRODUCTS.length] : PONTE.PESTS[i % PONTE.PESTS.length];
      var rData = goodSide === 'right' ? PONTE.PRODUCTS[i % PONTE.PRODUCTS.length] : PONTE.PESTS[i % PONTE.PESTS.length];

      var hw = cfg.BW / 2 - 0.1;
      var ph = 5.0;

      var leftM = makePanel(lv, lData, lv > 0, hw, ph);
      leftM.position.set(-hw / 2 - 0.05, 0, z);
      scene.add(leftM);
      sceneMeshes.push(leftM);

      var rightM = makePanel(rv, rData, rv > 0, hw, ph);
      rightM.position.set(hw / 2 + 0.05, 0, z);
      scene.add(rightM);
      sceneMeshes.push(rightM);

      gates.push({ mesh: leftM, z: z, value: lv, side: 'left', idx: i });
      gates.push({ mesh: rightM, z: z, value: rv, side: 'right', idx: i });

      // VS chip
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
      vsChip.position.set(0, ph / 2 + 0.2, z + 0.15);
      scene.add(vsChip);
      sceneMeshes.push(vsChip);
    }

    PONTE.gates.list = gates;
    PONTE.gates.passed = passed;
    PONTE.gates.lastGateEnd = lastGateEnd;
    PONTE.gates.sceneMeshes = sceneMeshes;
  }

  function rebuild() {
    var scene = PONTE.scene.scene;
    // Remove old gate meshes
    for (var i = 0; i < sceneMeshes.length; i++) {
      scene.remove(sceneMeshes[i]);
    }
    sceneMeshes = [];
    passed = {};
    make();
  }

  function makePanel(value, data, isGood, w, h) {
    var g = new THREE.Group();

    var S = 2;
    var cw = 400, ch = 400;
    var cv = document.createElement('canvas');
    cv.width = cw * S; cv.height = ch * S;
    var c = cv.getContext('2d');
    c.scale(S, S);

    // Background with rounded corners
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

    // Badge pill (top)
    var badgeText = isGood ? 'PRODUTO' : 'PROBLEMA';
    var pillW = 160, pillH = 34, pillX = (cw - pillW) / 2, pillY = 20;
    c.fillStyle = isGood ? 'rgba(194,252,216,0.35)' : 'rgba(255,128,128,0.35)';
    c.beginPath();
    c.roundRect(pillX, pillY, pillW, pillH, 17);
    c.fill();
    c.fillStyle = isGood ? '#c2fcd8' : '#ff8080';
    c.font = '800 18px FuturaCond, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(badgeText, cw / 2, pillY + pillH / 2 + 1);

    // Name (large, bold)
    c.fillStyle = isGood ? '#c2fcd8' : '#ff8080';
    c.font = '800 48px FuturaCond, sans-serif';
    c.fillText(data.name.toUpperCase(), cw / 2, 100);

    // Type / desc (small)
    c.fillStyle = isGood ? 'rgba(194,252,216,0.6)' : 'rgba(255,128,128,0.6)';
    c.font = '400 16px DM Sans, sans-serif';
    c.fillText(data.type, cw / 2, 135);

    // Score (center, huge)
    c.fillStyle = isGood ? 'rgba(194,252,216,0.45)' : 'rgba(255,128,128,0.45)';
    c.font = '800 150px FuturaCond, sans-serif';
    c.fillText((value > 0 ? '+' : '') + value, cw / 2, 265);

    // Fase pill (bottom)
    var faseText = data.fase || '';
    if (faseText) {
      var fPillW = 120, fPillH = 30, fPillX = (cw - fPillW) / 2, fPillY = ch - 55;
      c.fillStyle = isGood ? 'rgba(194,252,216,0.2)' : 'rgba(255,128,128,0.2)';
      c.beginPath();
      c.roundRect(fPillX, fPillY, fPillW, fPillH, 15);
      c.fill();
      c.fillStyle = isGood ? 'rgba(194,252,216,0.7)' : 'rgba(255,128,128,0.7)';
      c.font = '700 14px FuturaCond, sans-serif';
      c.fillText('FASE ' + faseText, cw / 2, fPillY + fPillH / 2 + 1);
    }

    // Texture
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

  PONTE.gates = {
    make: make,
    rebuild: rebuild,
    list: [],
    passed: {},
    lastGateEnd: 0,
    sceneMeshes: []
  };

})();
