(function() {
  'use strict';

  var bonuses = [];
  var coinBase = null;
  var coinReady = false;
  // Shared ring geometry + material (reused by all coins)
  var ringGeo, ringMat;

  function prepareCoin() {
    if (coinReady) return;
    var glb = PONTE.models.get('coin');
    if (glb) {
      coinBase = glb.scene.clone();
      var box = new THREE.Box3().setFromObject(coinBase);
      var sz = new THREE.Vector3();
      box.getSize(sz);
      var s = 1.2 / Math.max(sz.x, sz.y, sz.z);
      coinBase.scale.set(s, s, s);
      box.setFromObject(coinBase);
      var center = new THREE.Vector3();
      box.getCenter(center);
      coinBase.position.set(-center.x, -center.y, -center.z);
    }
    ringGeo = new THREE.RingGeometry(0.6, 0.75, 12);
    ringMat = new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    coinReady = true;
  }

  function makeCoin() {
    var wrapper = new THREE.Group();
    if (coinBase) {
      wrapper.add(coinBase.clone());
    } else {
      // Fallback cylinder (shared geo+mat created once)
      if (!makeCoin._fg) {
        makeCoin._fg = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 10);
        makeCoin._fm = new THREE.MeshStandardMaterial({
          color: 0xFFD700, metalness: 0.7, roughness: 0.25,
          emissive: 0xCC9900, emissiveIntensity: 0.4
        });
      }
      wrapper.add(new THREE.Mesh(makeCoin._fg, makeCoin._fm));
    }
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.3;
    wrapper.add(ring);
    return wrapper;
  }

  function make() {
    var cfg = PONTE.config;
    var scene = PONTE.scene.scene;
    var hw = cfg.BW / 2 - 1.5;

    prepareCoin();

    for (var i = 0; i < cfg.BONUS_COUNT; i++) {
      var gapIdx = Math.floor(Math.random() * (cfg.NGATES - 1));
      var gateZ1 = cfg.GSPACE * gapIdx + 16;
      var midZ = gateZ1 + cfg.GSPACE * (0.3 + Math.random() * 0.4);
      var bz = -midZ;
      var bx = (Math.random() - 0.5) * hw * 2;
      var value = cfg.BONUS_MIN_VAL + Math.floor(Math.random() * (cfg.BONUS_MAX_VAL - cfg.BONUS_MIN_VAL + 1));

      var coin = makeCoin();
      coin.position.set(bx, cfg.BONUS_Y, bz);
      coin.rotation.y = Math.random() * Math.PI * 2;
      scene.add(coin);

      bonuses.push({
        mesh: coin,
        z: bz,
        x: bx,
        value: value,
        collected: false,
        collectT: -1,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function update(dt, elapsed, playerZ, playerX) {
    var cfg = PONTE.config;
    var collected = null;

    for (var i = bonuses.length - 1; i >= 0; i--) {
      var b = bonuses[i];

      // Collect animation
      if (b.collectT >= 0) {
        b.collectT += dt;
        if (b.collectT > 0.3) {
          PONTE.scene.scene.remove(b.mesh);
          bonuses.splice(i, 1);
        } else {
          var p = b.collectT / 0.3;
          var s = 1 - p;
          b.mesh.scale.set(s, s, s);
          b.mesh.position.y = cfg.BONUS_Y + p * 2;
        }
        continue;
      }

      // Skip coins far from player
      var dz = playerZ - b.z;
      if (dz > 20 || dz < -5) continue;

      // Float + spin
      b.mesh.position.y = cfg.BONUS_Y + Math.sin(elapsed * 2 + b.phase) * cfg.BONUS_FLOAT_AMP;
      b.mesh.rotation.y += cfg.BONUS_SPIN * dt;

      // Collision
      if (Math.abs(dz) < cfg.BONUS_RADIUS && Math.abs(playerX - b.x) < cfg.BONUS_RADIUS) {
        b.collected = true;
        b.collectT = 0;
        if (!collected) collected = [];
        collected.push({ value: b.value });
      }
    }

    return collected;
  }

  function reset() {
    var scene = PONTE.scene.scene;
    for (var i = 0; i < bonuses.length; i++) {
      if (bonuses[i].mesh) scene.remove(bonuses[i].mesh);
    }
    bonuses = [];
  }

  PONTE.bonuses = {
    make: make,
    update: update,
    reset: reset
  };

})();
