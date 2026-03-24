(function() {
  'use strict';

  var playerGroup;
  var stakesPileGroup;
  var stakePileMat = null;
  var stakePileGeo = null;
  var lastPileCount = -1;

  function make() {
    var scene = PONTE.scene.scene;
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
    PONTE.player.group = playerGroup;
  }

  var coinModelBase = null;
  var coinReady = false;
  var coinHeight = 0.08; // height of one coin after scaling

  function initCoinModel() {
    if (coinReady) return;
    var glb = PONTE.models.get('coin');
    if (!glb) { coinReady = true; return; }

    coinModelBase = glb.scene.clone();
    var box = new THREE.Box3().setFromObject(coinModelBase);
    var size = new THREE.Vector3();
    box.getSize(size);

    // We want the coin diameter to be ~0.5 units
    // Find the two largest axes (diameter) and the smallest (thickness)
    var axes = [size.x, size.y, size.z].sort(function(a, b) { return b - a; });
    var diameter = axes[0]; // largest = diameter
    var thickness = axes[2]; // smallest = thickness
    var s = 0.5 / diameter;
    coinModelBase.scale.set(s, s, s);

    // Re-measure
    box.setFromObject(coinModelBase);
    var center = new THREE.Vector3();
    box.getCenter(center);
    coinModelBase.position.set(-center.x, -box.min.y, -center.z);

    // Detect orientation: if thickness is along Y, coin is already flat (good for stacking)
    // If thickness is along X or Z, we need to rotate
    var scaledSize = new THREE.Vector3();
    box.getSize(scaledSize);
    if (scaledSize.x < scaledSize.y && scaledSize.x < scaledSize.z) {
      // Thin on X — rotate to lay flat
      coinModelBase.rotation.z = Math.PI / 2;
    } else if (scaledSize.z < scaledSize.x && scaledSize.z < scaledSize.y) {
      // Thin on Z — rotate to lay flat
      coinModelBase.rotation.x = Math.PI / 2;
    }
    // If thin on Y, already flat — no rotation needed

    coinHeight = thickness * s + 0.01;
    coinReady = true;
  }

  function makeCoinMesh() {
    initCoinModel();
    if (coinModelBase) {
      return coinModelBase.clone();
    }
    // Fallback procedural
    if (!stakePileMat) {
      stakePileMat = new THREE.MeshStandardMaterial({ color: 0xFFCC00, metalness: 0.4, roughness: 0.4, emissive: 0xCC9900, emissiveIntensity: 0.4 });
      stakePileGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.06, 10);
    }
    return new THREE.Mesh(stakePileGeo, stakePileMat);
  }

  function updateStakesPile(stakes) {
    var visualCount = Math.min(stakes, 20);
    if (visualCount === lastPileCount) return;
    lastPileCount = visualCount;

    // Fast clear
    while (stakesPileGroup.children.length > 0) {
      stakesPileGroup.remove(stakesPileGroup.children[0]);
    }
    if (visualCount <= 0) return;

    for (var i = 0; i < visualCount; i++) {
      var coin = makeCoinMesh();
      coin.position.set(
        (Math.random() - 0.5) * 0.05,
        i * coinHeight,
        (Math.random() - 0.5) * 0.03
      );
      stakesPileGroup.add(coin);
    }
  }

  function animateLimbs(elapsed, jumping) {
    var ls = jumping ? 16 : 9;
    if (playerGroup.children[4]) playerGroup.children[4].rotation.x = Math.sin(elapsed * ls) * 0.4;
    if (playerGroup.children[5]) playerGroup.children[5].rotation.x = -Math.sin(elapsed * ls) * 0.4;
    if (playerGroup.children[6]) playerGroup.children[6].rotation.x = Math.sin(elapsed * ls + 1) * 0.3;
    if (playerGroup.children[7]) playerGroup.children[7].rotation.x = -Math.sin(elapsed * ls + 1) * 0.3;
  }

  function resetPileCount() {
    lastPileCount = -1;
  }

  PONTE.player = {
    make: make,
    group: null,
    updateStakesPile: updateStakesPile,
    animateLimbs: animateLimbs,
    resetPileCount: resetPileCount
  };

})();
