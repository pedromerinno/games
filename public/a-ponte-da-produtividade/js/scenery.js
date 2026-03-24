(function() {
  'use strict';

  var crops = [];
  var dirtStrips = [];
  var dirtTrimmed = false;
  var originalPlantEnd = 0;

  function make() {
    var scene = PONTE.scene.scene;
    var cfg = PONTE.config;
    var DIST = cfg.DIST;
    var BW = cfg.BW;
    // Plantation covers the full distance — crops beyond the farm
    // will be hidden dynamically in update() using PONTE.farm.frontZ
    var plantEnd = DIST;
    originalPlantEnd = plantEnd;

    // ── Dirt strips under crops (stop at farm) ──
    var dirtMat = new THREE.MeshStandardMaterial({ color: 0x6D4C41, roughness: 0.95 });
    var dirtLightMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.9 });
    var rowWidth = 1.8;
    var totalRows = 8;
    var dirtGeo = new THREE.BoxGeometry(rowWidth * 0.85, 0.1, plantEnd);

    dirtStrips = [];
    dirtTrimmed = false;
    for (var side = -1; side <= 1; side += 2) {
      for (var row = 0; row < totalRows; row++) {
        var rx = side * (BW / 2 + 1.0 + row * rowWidth);
        var mat = row % 2 === 0 ? dirtMat : dirtLightMat;
        var dirt = new THREE.Mesh(dirtGeo, mat);
        dirt.position.set(rx, -0.45, -(plantEnd / 2));
        dirt.receiveShadow = true;
        scene.add(dirt);
        dirtStrips.push(dirt);
      }
    }

    // ── Crop plants ──
    var cropColors = [0x4CAF50, 0x66BB6A, 0x388E3C, 0x7CB342, 0x558B2F];
    var cropMats = cropColors.map(function(c) {
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
    });
    var stemMat = new THREE.MeshStandardMaterial({ color: 0x33691E, roughness: 0.9 });
    var leafGeo = new THREE.SphereGeometry(0.5, 5, 4);
    var stemGeo = new THREE.CylinderGeometry(0.04, 0.06, 1, 4);

    var plantSpacing = 3.5;
    var numPlants = Math.ceil(plantEnd / plantSpacing);

    crops = [];
    for (var side = -1; side <= 1; side += 2) {
      for (var row = 0; row < totalRows; row++) {
        var rx = side * (BW / 2 + 1.0 + row * rowWidth);
        for (var pi = 0; pi < numPlants; pi++) {
          var pz = -(pi * plantSpacing + 2);
          // Don't place beyond the farm boundary
          if (Math.abs(pz) > plantEnd) continue;

          var progress = Math.abs(pz) / plantEnd; // 0 at start, 1 at farm

          var plant = new THREE.Group();

          // Stem — taller near the farm
          var stemH = 0.6 + progress * 0.8;
          var stemMesh = new THREE.Mesh(stemGeo, stemMat);
          stemMesh.scale.y = stemH;
          stemMesh.position.y = stemH * 0.5;
          plant.add(stemMesh);

          // Leaves — more and bigger near the farm
          var numLeaves = progress > 0.7 ? 4 : progress > 0.4 ? 3 : 2;
          var leafSize = 0.4 + progress * 0.6;
          for (var li = 0; li < numLeaves; li++) {
            var leaf = new THREE.Mesh(leafGeo, cropMats[(row + pi + li) % cropMats.length]);
            leaf.position.set(
              (Math.random() - 0.5) * leafSize * 0.5,
              stemH + li * leafSize * 0.3,
              (Math.random() - 0.5) * leafSize * 0.5
            );
            leaf.scale.set(leafSize * 0.7, leafSize * 0.5, leafSize * 0.6);
            plant.add(leaf);
          }

          // Near farm: add extra details (flowers/fruit)
          if (progress > 0.8) {
            var fruitMat = new THREE.MeshStandardMaterial({ color: 0xFFEB3B, roughness: 0.5 });
            var fruit = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), fruitMat);
            fruit.position.set(0, stemH + numLeaves * leafSize * 0.3, 0);
            plant.add(fruit);
          }

          plant.position.set(rx + (Math.random() - 0.5) * 0.5, -0.4, pz);
          plant.scale.set(0, 0, 0);
          plant.visible = false;

          scene.add(plant);
          crops.push({
            mesh: plant,
            zNorm: Math.abs(pz) / DIST,
            targetScale: 0.6 + progress * 0.9, // much bigger near the farm
            grown: 0
          });
        }
      }
    }

    // ── Hills ──
    var hm1 = new THREE.MeshStandardMaterial({ color: 0x66BB6A, roughness: 1 });
    var hm2 = new THREE.MeshStandardMaterial({ color: 0x81C784, roughness: 1 });
    for (var i = 0; i < 8; i++) {
      var hside = i % 2 === 0 ? 1 : -1;
      var r = 18 + Math.random() * 25;
      var hill = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), i % 3 === 0 ? hm2 : hm1);
      hill.position.set(hside * (45 + Math.random() * 40), -r * 0.65, -(Math.random() * DIST));
      hill.scale.y = 0.28 + Math.random() * 0.1;
      scene.add(hill);
    }

    // ── Clouds ──
    var cloudMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 1 });
    for (var i = 0; i < 8; i++) {
      var cloud = new THREE.Group();
      var np = 3 + Math.floor(Math.random() * 4);
      for (var p = 0; p < np; p++) {
        var pr = 1.5 + Math.random() * 2.5;
        var puff = new THREE.Mesh(new THREE.SphereGeometry(pr, 8, 6), cloudMat);
        puff.position.set(p * pr * 0.9, (Math.random() - 0.5) * pr * 0.3, (Math.random() - 0.5) * pr * 0.4);
        puff.scale.y = 0.35;
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 140, 22 + Math.random() * 15, -Math.random() * DIST);
      scene.add(cloud);
    }

    // ── Sun ──
    var sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xFFF9C4 })
    );
    sunSphere.position.set(50, 45, -DIST * 0.4);
    scene.add(sunSphere);
  }

  function update(playerProgress) {
    // Get the farm front edge — crops beyond this Z are hidden
    var farmLimit = PONTE.farm.frontZ || 99999;

    // Trim dirt strips once when farm position is known
    if (!dirtTrimmed && farmLimit < 99999) {
      dirtTrimmed = true;
      var trimLen = farmLimit - 1;
      for (var d = 0; d < dirtStrips.length; d++) {
        dirtStrips[d].scale.z = trimLen / originalPlantEnd;
        dirtStrips[d].position.z = -(trimLen / 2);
      }
    }

    for (var i = 0; i < crops.length; i++) {
      var crop = crops[i];

      // Hide crops that are past the farm
      var cropZ = Math.abs(crop.mesh.position.z);
      if (cropZ > farmLimit - 1) {
        if (crop.mesh.visible) crop.mesh.visible = false;
        continue;
      }

      var triggerAt = crop.zNorm * 0.85;

      if (playerProgress >= triggerAt && crop.grown < 1) {
        if (!crop.mesh.visible) crop.mesh.visible = true;

        crop.grown = Math.min(1, crop.grown + 0.03);
        var t = crop.grown;
        var ease = 1 - Math.pow(1 - t, 4);
        var bounce = ease * (1 + Math.sin(t * Math.PI * 1.2) * 0.25 * (1 - t));
        if (t >= 1) bounce = 1;

        var s = crop.targetScale * bounce;
        crop.mesh.scale.set(s, s, s);
      }
    }
  }

  PONTE.scenery = {
    make: make,
    update: update
  };

})();
