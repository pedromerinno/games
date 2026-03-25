(function() {
  'use strict';

  var scatterCoins = [];
  var farmRewards = [];
  var farmRewardSpawned = 0;

  var floatTimer = null;

  function showFloat(text, color) {
    var elCombo = document.getElementById('combo-text');
    if (floatTimer) clearTimeout(floatTimer);

    elCombo.style.transition = 'none';
    elCombo.textContent = text;
    elCombo.style.color = color;
    elCombo.style.opacity = '1';
    elCombo.style.transform = 'translate(-50%,-50%) scale(0.7)';
    elCombo.offsetHeight;

    elCombo.style.transition = 'opacity 0.3s, transform 0.3s';
    elCombo.style.transform = 'translate(-50%,-55%) scale(1)';

    floatTimer = setTimeout(function() {
      elCombo.style.transition = 'opacity 0.4s, transform 0.4s';
      elCombo.style.opacity = '0';
      elCombo.style.transform = 'translate(-50%,-70%) scale(0.8)';
      floatTimer = null;
    }, 600);
  }

  function clearFloats() {
    if (floatTimer) { clearTimeout(floatTimer); floatTimer = null; }
    var elCombo = document.getElementById('combo-text');
    if (elCombo) elCombo.style.opacity = '0';
  }

  var scatterCoinBase = null;
  var scatterReady = false;
  var scatterFallbackMat = null;
  var scatterFallbackGeo = null;

  function makeScatterCoin() {
    if (!scatterReady) {
      var glb = PONTE.models.get('coin');
      if (glb) {
        scatterCoinBase = glb.scene.clone();
        var box = new THREE.Box3().setFromObject(scatterCoinBase);
        var sz = new THREE.Vector3();
        box.getSize(sz);
        var axes = [sz.x, sz.y, sz.z].sort(function(a, b) { return b - a; });
        var s = 0.6 / axes[0]; // scale by diameter to ~0.6 units
        scatterCoinBase.scale.set(s, s, s);
        box.setFromObject(scatterCoinBase);
        var center = new THREE.Vector3();
        box.getCenter(center);
        scatterCoinBase.position.set(-center.x, -center.y, -center.z);
      }
      scatterReady = true;
    }
    if (scatterCoinBase) return scatterCoinBase.clone();
    if (!scatterFallbackMat) {
      scatterFallbackMat = new THREE.MeshStandardMaterial({ color: 0xFFCC00, metalness: 0.6, roughness: 0.2, emissive: 0xCC9900, emissiveIntensity: 0.4 });
      scatterFallbackGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.06, 8);
    }
    return new THREE.Mesh(scatterFallbackGeo, scatterFallbackMat);
  }

  function spawnScatterCoins(px, pz) {
    var scene = PONTE.scene.scene;
    for (var i = 0; i < 20; i++) {
      var c = makeScatterCoin();
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
    var scene = PONTE.scene.scene;
    for (var i = scatterCoins.length - 1; i >= 0; i--) {
      var sc = scatterCoins[i];
      sc.life -= dt;
      sc.vy -= 14 * dt;
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
        sc.mesh.scale.multiplyScalar(0.85);
        if (sc.mesh.scale.x < 0.05) {
          scene.remove(sc.mesh);
          scatterCoins.splice(i, 1);
        }
      }
    }
  }

  var rewardPositions = [];

  function spawnFarmReward(index) {
    var scene = PONTE.scene.scene;
    var cfg = PONTE.config;
    var fz = -cfg.DIST - 5;
    var def = PONTE.farm.REWARDS[index];
    var g = def.build(fz);
    if (!g) return;
    g.userData.targetScale = { x: g.scale.x, y: g.scale.y, z: g.scale.z };
    g.scale.set(0.01, 0.01, 0.01);
    g.userData.popIn = 0;
    scene.add(g);
    farmRewards.push(g);
    var vc = g.userData.visualCenter;
    rewardPositions[index] = vc ? { x: vc.x, y: vc.y, z: vc.z } : { x: g.position.x, y: g.position.y, z: g.position.z };
    spawnScatterCoins(g.position.x, g.position.z);
  }

  function getRewardPosition(index) {
    return rewardPositions[index] || null;
  }

  var farmElapsed = 0;
  function updateFarmRewards(dt) {
    farmElapsed += dt;
    for (var i = 0; i < farmRewards.length; i++) {
      var g = farmRewards[i];
      if (g.userData.popIn < 1) {
        g.userData.popIn = Math.min(1, g.userData.popIn + dt * 2.5);
        var t = g.userData.popIn;
        var bounce = 1 + Math.sin(t * Math.PI) * 0.2 * (1 - t);
        var p = t * bounce;
        var ts = g.userData.targetScale || { x: 1, y: 1, z: 1 };
        g.scale.set(ts.x * p, ts.y * p, ts.z * p);
      }
      if (g.userData.blades) {
        for (var b = 0; b < g.userData.blades.length; b++) {
          g.userData.blades[b].rotation.z += 1.5 * dt;
        }
      }
      if (g.userData.floatBase !== undefined) {
        g.position.y = g.userData.floatBase + Math.sin(farmElapsed * 1.5) * 0.5;
        g.rotation.y += dt * 0.4;
      }
    }
  }

  function reset() {
    var scene = PONTE.scene.scene;
    for (var i = 0; i < scatterCoins.length; i++) scene.remove(scatterCoins[i].mesh);
    scatterCoins = [];
    for (var i = 0; i < farmRewards.length; i++) scene.remove(farmRewards[i]);
    farmRewards = [];
    farmRewardSpawned = 0;
    rewardPositions = [];
    farmElapsed = 0;
  }

  function getFarmRewardSpawned() { return farmRewardSpawned; }
  function setFarmRewardSpawned(v) { farmRewardSpawned = v; }

  PONTE.effects = {
    showFloat: showFloat,
    clearFloats: clearFloats,
    spawnScatterCoins: spawnScatterCoins,
    updateScatterCoins: updateScatterCoins,
    spawnFarmReward: spawnFarmReward,
    updateFarmRewards: updateFarmRewards,
    getRewardPosition: getRewardPosition,
    reset: reset,
    getFarmRewardSpawned: getFarmRewardSpawned,
    setFarmRewardSpawned: setFarmRewardSpawned
  };

})();
