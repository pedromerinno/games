(function() {
  'use strict';

  var bridgeGroup;
  var planks = [];
  var lastPZ = 2;

  // Shared materials and geometries (created once in init)
  var pm1, pm2, beamMat, railMat, ropeMat;
  var plankGeo, beamGeo, postGeo, ropeGeo;

  // Animation queue for new pieces
  var animating = [];

  function init() {
    var scene = PONTE.scene.scene;
    var cfg = PONTE.config;
    bridgeGroup = new THREE.Group();
    scene.add(bridgeGroup);
    PONTE.bridge.group = bridgeGroup;

    pm1 = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.65 });
    pm2 = new THREE.MeshStandardMaterial({ color: 0x7B5B4C, roughness: 0.7 });
    beamMat = new THREE.MeshStandardMaterial({ color: 0x4E342E });
    railMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.75 });
    ropeMat = new THREE.MeshStandardMaterial({ color: 0xA1887F, roughness: 1 });

    plankGeo = new THREE.BoxGeometry(cfg.BW, 0.18, cfg.PL - 0.06);
    beamGeo = new THREE.BoxGeometry(cfg.BW, 0.12, 0.12);
    postGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.6, 6);
    ropeGeo = new THREE.CylinderGeometry(0.025, 0.025, cfg.PL * 3 + 0.5, 4);
  }

  // Animate a mesh: starts below + small, pops up to final position
  function animateIn(mesh, finalY, delay) {
    mesh.position.y = finalY - 1.5;
    mesh.scale.set(0.01, 0.01, 0.01);
    mesh.userData._animTarget = finalY;
    mesh.userData._animT = -delay; // negative = waiting
    animating.push(mesh);
  }

  function buildTo(targetZ, unlimited) {
    var cfg = PONTE.config;
    var stakes = PONTE.game.state.stakes;
    var delay = 0;

    while (lastPZ > targetZ && (stakes > 0 || unlimited)) {
      lastPZ -= cfg.PL;
      var mat = planks.length % 2 === 0 ? pm1 : pm2;
      var plank = new THREE.Mesh(plankGeo, mat);
      plank.position.set(0, 0, lastPZ);
      plank.receiveShadow = true;
      bridgeGroup.add(plank);
      animateIn(plank, 0, delay);

      if (planks.length % 4 === 0) {
        var beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(0, -0.15, lastPZ);
        bridgeGroup.add(beam);
        animateIn(beam, -0.15, delay + 0.02);
      }

      if (planks.length % 5 === 0) {
        for (var s = -1; s <= 1; s += 2) {
          var post = new THREE.Mesh(postGeo, railMat);
          post.position.set(s * (cfg.BW / 2 + 0.06), 0.8, lastPZ);
          bridgeGroup.add(post);
          animateIn(post, 0.8, delay + 0.05);

          var rope = new THREE.Mesh(ropeGeo, ropeMat);
          rope.rotation.x = Math.PI / 2;
          rope.position.set(s * (cfg.BW / 2 + 0.06), 1.35, lastPZ);
          bridgeGroup.add(rope);
          animateIn(rope, 1.35, delay + 0.08);
        }
      }

      planks.push(lastPZ);
      if (!unlimited) {
        stakes--;
        PONTE.game.state.stakes = stakes;
      }
      delay += 0.03; // stagger each plank slightly
    }
    PONTE.bridge.lastPZ = lastPZ;
  }

  // Call every frame from the game loop
  function update(dt) {
    for (var i = animating.length - 1; i >= 0; i--) {
      var m = animating[i];
      m.userData._animT += dt;
      var t = m.userData._animT;
      if (t < 0) continue; // still waiting

      var p = Math.min(t / 0.25, 1); // 0.25s animation duration

      // Elastic ease-out
      var ease;
      if (p < 1) {
        ease = 1 - Math.pow(1 - p, 3) * Math.cos(p * Math.PI * 0.5);
      } else {
        ease = 1;
      }

      // Scale: 0 → overshoot → 1
      var s = ease * (1 + Math.sin(p * Math.PI) * 0.15);
      if (p >= 1) s = 1;
      m.scale.set(s, s, s);

      // Y position: rise from below
      var targetY = m.userData._animTarget;
      m.position.y = targetY - 1.5 * (1 - ease);

      if (p >= 1) {
        m.scale.set(1, 1, 1);
        m.position.y = targetY;
        animating.splice(i, 1);
      }
    }
  }

  function reset() {
    var scene = PONTE.scene.scene;
    scene.remove(bridgeGroup);
    bridgeGroup = new THREE.Group();
    scene.add(bridgeGroup);
    PONTE.bridge.group = bridgeGroup;
    planks = [];
    lastPZ = 2;
    PONTE.bridge.lastPZ = lastPZ;
    animating = [];
  }

  function isOnBridge(pz) {
    var cfg = PONTE.config;
    if (pz > -2 || pz < -(cfg.DIST - 5)) return true;
    var threshold = cfg.PL + 0.3;
    for (var i = planks.length - 1; i >= 0; i--) {
      if (Math.abs(pz - planks[i]) < threshold) return true;
      if (planks[i] > pz + threshold + 4) break;
    }
    return false;
  }

  PONTE.bridge = {
    init: init,
    buildTo: buildTo,
    update: update,
    reset: reset,
    isOnBridge: isOnBridge,
    group: null,
    lastPZ: 2
  };

})();
