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
    var isSplit = PONTE.scene.splitMode;

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

      if (isSplit) {
        // In split-screen, place gates for both bridges
        // P1 bridge at x = -8, P2 bridge at x = +8
        var offsets = [-8, 8];
        for (var oi = 0; oi < offsets.length; oi++) {
          var ox = offsets[oi];
          var leftM = makePanel(lv, lData, lv > 0, hw, ph);
          leftM.position.set(ox - hw / 2 - 0.05, 0, z);
          scene.add(leftM);
          sceneMeshes.push(leftM);

          var rightM = makePanel(rv, rData, rv > 0, hw, ph);
          rightM.position.set(ox + hw / 2 + 0.05, 0, z);
          scene.add(rightM);
          sceneMeshes.push(rightM);

          // Store gates - use separate idx keys per bridge to avoid collision
          var prefix = oi === 0 ? 'p1' : 'p2';
          gates.push({ mesh: leftM, z: z, value: lv, side: 'left', idx: i, bridge: oi, key: prefix + '-' + i });
          gates.push({ mesh: rightM, z: z, value: rv, side: 'right', idx: i, bridge: oi, key: prefix + '-' + i });

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
          vsChip.position.set(ox, ph / 2 + 0.2, z + 0.15);
          scene.add(vsChip);
          sceneMeshes.push(vsChip);
        }
      } else {
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

    // Name (top, large, bold)
    c.fillStyle = isGood ? '#c2fcd8' : '#ff8080';
    c.font = '800 52px FuturaCond, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(data.name.toUpperCase(), cw / 2, 75);

    // Score (center, huge)
    c.fillStyle = isGood ? 'rgba(194,252,216,0.45)' : 'rgba(255,128,128,0.45)';
    c.font = '800 160px FuturaCond, sans-serif';
    c.fillText((value > 0 ? '+' : '') + value, cw / 2, 225);

    // Badge pill (bottom)
    var badgeText = isGood ? 'DEFENSIVO' : 'PRAGA';
    var pillW = 150, pillH = 36, pillX = (cw - pillW) / 2, pillY = ch - 60;
    c.fillStyle = isGood ? 'rgba(194,252,216,0.3)' : 'rgba(255,128,128,0.3)';
    c.beginPath();
    c.roundRect(pillX, pillY, pillW, pillH, 18);
    c.fill();
    c.fillStyle = isGood ? '#004d36' : '#6e2020';
    c.font = '800 18px FuturaCond, sans-serif';
    c.fillText(badgeText, cw / 2, pillY + pillH / 2 + 1);

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
