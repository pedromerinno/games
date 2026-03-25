(function() {
  'use strict';

  var endGroup = null;

  function makeIsland(z, depth, parent) {
    var scene = PONTE.scene.scene;
    var target = parent || scene;
    var top = new THREE.Mesh(
      new THREE.BoxGeometry(22, 1, depth),
      new THREE.MeshStandardMaterial({ color: 0x5CB85C, roughness: 0.85 })
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
    var scene = PONTE.scene.scene;
    var cfg = PONTE.config;
    if (endGroup) scene.remove(endGroup);
    endGroup = new THREE.Group();

    var farmModel = PONTE.models.get('farm');
    if (farmModel) {
      // Use the GLB model as the entire farm (it has its own ground)
      var farm = farmModel.scene.clone();
      farm.traverse(function(child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Scale to fill the area nicely
      var box = new THREE.Box3().setFromObject(farm);
      var size = new THREE.Vector3();
      box.getSize(size);
      var targetWidth = 260;
      var scale = targetWidth / Math.max(size.x, size.z);
      farm.scale.set(scale, scale, scale);

      box.setFromObject(farm);
      var center = new THREE.Vector3();
      box.getCenter(center);
      farm.position.set(-center.x, -box.min.y - 5, -cfg.DIST - 12 - center.z);
      endGroup.add(farm);

      // Save the front edge of the farm (most positive Z after positioning)
      box.setFromObject(farm);
      PONTE.farm.frontZ = -box.max.z; // positive distance from origin
    } else {
      // Fallback: procedural island + scenery
      makeIsland(-cfg.DIST - 8, 80, endGroup);
      makeEndRewardTo(endGroup);
    }

    // ── Green floor — vibrant layered grass ──
    var grassMat = new THREE.MeshStandardMaterial({ color: 0x5CB85C, roughness: 0.85 });
    var grassFloor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), grassMat);
    grassFloor.rotation.x = -Math.PI / 2;
    grassFloor.position.set(0, -0.5, -cfg.DIST - 300);
    grassFloor.receiveShadow = true;
    endGroup.add(grassFloor);

    // Lighter grass further back
    var grassLight = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: 0x6EC46E, roughness: 0.9 })
    );
    grassLight.rotation.x = -Math.PI / 2;
    grassLight.position.set(0, -0.48, -cfg.DIST - 800);
    endGroup.add(grassLight);

    // Rolling green hills around the farm
    var farmHillColors = [0x4CAF50, 0x5CB85C, 0x45A045, 0x66BB6A];
    var farmHills = [
      { x: -60,  z: -cfg.DIST - 60,  r: 30, sy: 0.3 },
      { x:  70,  z: -cfg.DIST - 80,  r: 35, sy: 0.28 },
      { x: -30,  z: -cfg.DIST - 120, r: 40, sy: 0.32 },
      { x:  100, z: -cfg.DIST - 100, r: 25, sy: 0.35 },
      { x: -110, z: -cfg.DIST - 90,  r: 28, sy: 0.3 },
      { x:  40,  z: -cfg.DIST - 140, r: 32, sy: 0.28 },
    ];
    for (var fhi = 0; fhi < farmHills.length; fhi++) {
      var fh = farmHills[fhi];
      var fhMesh = new THREE.Mesh(
        new THREE.SphereGeometry(fh.r, 12, 8),
        new THREE.MeshStandardMaterial({ color: farmHillColors[fhi % farmHillColors.length], roughness: 0.9 })
      );
      fhMesh.position.set(fh.x, -fh.r * 0.6, fh.z);
      fhMesh.scale.y = fh.sy;
      endGroup.add(fhMesh);
    }

    // ── Mountains (GLB terrain) ──
    var terrainGlb = PONTE.models.get('terrain');
    if (terrainGlb) {
      var farmTerrains = [
        { x: -200, z: -cfg.DIST - 150, s: 3,   ry: 0.2 },
        { x:  200, z: -cfg.DIST - 160, s: 2.5, ry: Math.PI + 0.4 },
        { x:    0, z: -cfg.DIST - 350, s: 3.5, ry: 0.8 },
        { x: -210, z: -cfg.DIST - 280, s: 2.5, ry: -0.3 },
        { x:  210, z: -cfg.DIST - 270, s: 3,   ry: Math.PI - 0.5 },
      ];
      for (var ti = 0; ti < farmTerrains.length; ti++) {
        var tp = farmTerrains[ti];
        var terrain = terrainGlb.scene.clone();
        terrain.traverse(function(child) {
          if (child.isMesh) { child.castShadow = false; child.receiveShadow = false; }
        });
        terrain.scale.set(tp.s, tp.s, tp.s);
        terrain.position.set(tp.x, -15, tp.z);
        terrain.rotation.y = tp.ry;
        endGroup.add(terrain);
      }
    }

    scene.add(endGroup);
    PONTE.farm.endGroup = endGroup;
  }

  function makeEndRewardTo(target) {
    var cfg = PONTE.config;
    var fz = -cfg.DIST - 5;
    var BW = cfg.BW;
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

    // ── Soy plantation rows (shared materials + fewer rows) ──
    var soyMats = [
      new THREE.MeshStandardMaterial({ color: 0x4CAF50, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x66BB6A, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x388E3C, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x558B2F, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x7CB342, roughness: 0.85 })
    ];
    var bushGeo = new THREE.SphereGeometry(0.5, 5, 4);
    var dirtGeo = new THREE.BoxGeometry(1.0, 0.08, 22);
    for (var side = -1; side <= 1; side += 2) {
      for (var row = 0; row < 6; row++) {
        var rx = side * (BW / 2 + 1.5 + row * 2.0);
        var dirtRow = new THREE.Mesh(dirtGeo, dirtMat);
        dirtRow.position.set(rx, 0.04, fz - 4);
        target.add(dirtRow);
        for (var p = 0; p < 10; p++) {
          var bush = new THREE.Mesh(bushGeo, soyMats[(row + p) % 5]);
          bush.position.set(rx + (Math.random() - 0.5) * 0.2, 0.25, fz + 6 - p * 2.2);
          bush.scale.set(1.1, 0.55, 0.85);
          target.add(bush);
        }
      }
    }

    // ── White picket fence (shared geometries) ──
    var fenceWhite = new THREE.MeshStandardMaterial({ color: 0xFAFAFA, roughness: 0.5 });
    var fencePostGeo = new THREE.BoxGeometry(0.12, 1.2, 0.12);
    var fenceTipGeo = new THREE.ConeGeometry(0.09, 0.2, 4);
    var fenceRailGeo = new THREE.BoxGeometry(0.06, 0.08, 3.5);
    var fenceLen = 15;
    for (var side = -1; side <= 1; side += 2) {
      var fx = side * (BW / 2 + 0.8);
      for (var fi = 0; fi < fenceLen; fi++) {
        var fz2 = fz + 30 - fi * 3.5;
        var post = new THREE.Mesh(fencePostGeo, fenceWhite);
        post.position.set(fx, 0.6, fz2);
        target.add(post);
        var tip = new THREE.Mesh(fenceTipGeo, fenceWhite);
        tip.position.set(fx, 1.3, fz2);
        target.add(tip);
        if (fi < fenceLen - 1) {
          var rail = new THREE.Mesh(fenceRailGeo, fenceWhite);
          rail.position.set(fx, 0.4, fz2 - 1.75);
          target.add(rail);
          var rail2 = new THREE.Mesh(fenceRailGeo, fenceWhite);
          rail2.position.set(fx, 0.9, fz2 - 1.75);
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
    var stoneGeo = new THREE.SphereGeometry(0.35, 5, 4);
    for (var ps = 0; ps < 8; ps++) {
      var pa = (ps / 8) * Math.PI * 2;
      var stone = new THREE.Mesh(stoneGeo, stoneMat);
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

    // ── Big trees (try GLB model, fallback to procedural) ──
    var treePositions = [
      { x: -12, z: fz + 20, trunkH: 3.5, crownR: 2.5 },
      { x: 13, z: fz + 18, trunkH: 4.0, crownR: 2.8 },
      { x: -13, z: fz - 5, trunkH: 3.0, crownR: 2.2 },
      { x: 14, z: fz - 15, trunkH: 3.8, crownR: 2.6 },
      { x: -11, z: fz - 20, trunkH: 2.5, crownR: 2.0 },
      { x: 12, z: fz + 2, trunkH: 3.2, crownR: 2.3 }
    ];

    var crownMats = [
      new THREE.MeshStandardMaterial({ color: 0x388E3C, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x43A047, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x4CAF50, roughness: 0.85 })
    ];
    function makeProceduralTree(x, z, trunkH, crownR) {
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, trunkH, 6), darkWoodMat);
      trunk.position.set(x, trunkH / 2, z);
      trunk.castShadow = true;
      target.add(trunk);
      for (var c = 0; c < 3; c++) {
        var cr = new THREE.Mesh(
          new THREE.SphereGeometry(crownR * (0.7 + Math.random() * 0.4), 6, 5),
          crownMats[c]
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

    // Try to load GLB tree model
    var treeModel = PONTE.models.get('cute_toon_tree');
    if (treeModel) {
      for (var ti = 0; ti < treePositions.length; ti++) {
        var tp = treePositions[ti];
        var treeClone = treeModel.scene.clone();
        var scaleFactor = tp.crownR * 0.8;
        treeClone.scale.set(scaleFactor, scaleFactor, scaleFactor);
        treeClone.position.set(tp.x, 0, tp.z);
        treeClone.traverse(function(child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        target.add(treeClone);
      }
    } else {
      // Fallback to procedural trees
      for (var ti = 0; ti < treePositions.length; ti++) {
        var tp = treePositions[ti];
        makeProceduralTree(tp.x, tp.z, tp.trunkH, tp.crownR);
      }
    }

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

    // ── Tractor (parked near barn) ──
    var tg = new THREE.Group();
    var tGreen = new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.4 });
    var tGreenD = new THREE.MeshStandardMaterial({ color: 0x1B5E20, roughness: 0.5 });
    var tYellow = new THREE.MeshStandardMaterial({ color: 0xFDD835, roughness: 0.35 });
    var tBlack = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    var tGlass = new THREE.MeshStandardMaterial({ color: 0x81D4FA, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6 });
    var tChrome = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, roughness: 0.1, metalness: 0.7 });
    function farmWheel(r, w, x, y, z) {
      var wg = new THREE.Group();
      var t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), tBlack);
      t.rotation.z = Math.PI / 2; t.castShadow = true; wg.add(t);
      var rm = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.04, 10), tYellow);
      rm.rotation.z = Math.PI / 2; wg.add(rm);
      var cp = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w + 0.08, 8), tChrome);
      cp.rotation.z = Math.PI / 2; wg.add(cp);
      wg.position.set(x, y, z);
      return wg;
    }
    // Hood
    var tHood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.8), tGreen);
    tHood.position.set(0, 1.6, 1.6); tHood.castShadow = true; tg.add(tHood);
    var tHoodR = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.8, 8, 1, false, 0, Math.PI), tGreenD);
    tHoodR.rotation.x = Math.PI / 2; tHoodR.rotation.z = Math.PI;
    tHoodR.position.set(0, 2.2, 1.6); tHoodR.scale.set(1, 0.2, 1); tg.add(tHoodR);
    // Grille
    var tGrilleBg = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.12), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    tGrilleBg.position.set(0, 1.5, 3.02); tg.add(tGrilleBg);
    for (var gb = 0; gb < 4; gb++) {
      var bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), tYellow);
      bar.position.set(0, 1.2 + gb * 0.22, 3.08); tg.add(bar);
    }
    // Headlights
    for (var hl = -1; hl <= 1; hl += 2) {
      var lr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 10), tChrome);
      lr.rotation.x = Math.PI / 2; lr.position.set(hl * 0.65, 1.9, 3.04); tg.add(lr);
      var lb = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0xFFF9C4, emissive: 0xFFD54F, emissiveIntensity: 0.5 }));
      lb.rotation.x = Math.PI / 2; lb.position.set(hl * 0.65, 1.9, 3.06); tg.add(lb);
    }
    // Chassis
    var tChassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 4.5), tGreenD);
    tChassis.position.set(0, 0.7, 0.3); tg.add(tChassis);
    // Fenders
    for (var s = -1; s <= 1; s += 2) {
      var fnd = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 2.2), tGreen);
      fnd.position.set(s * 1.35, 1.6, -1.0); tg.add(fnd);
    }
    // Cabin
    var cabF = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.2), tGreenD);
    cabF.position.set(0, 2.2, -0.6); tg.add(cabF);
    for (var cpx = -1; cpx <= 1; cpx += 2) {
      for (var cpz = -1; cpz <= 1; cpz += 2) {
        var pil = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), tGreenD);
        pil.position.set(cpx * 1.05, 3.15, -0.6 + cpz * 0.95); tg.add(pil);
      }
    }
    var cabR = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 2.5), tGreenD);
    cabR.position.set(0, 4.1, -0.6); cabR.castShadow = true; tg.add(cabR);
    var rEdge = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.06, 2.6), tYellow);
    rEdge.position.set(0, 4.0, -0.6); tg.add(rEdge);
    // Windows
    var twF = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), tGlass);
    twF.position.set(0, 3.2, 0.36); tg.add(twF);
    for (var tws = -1; tws <= 1; tws += 2) {
      var twS = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.5), tGlass);
      twS.rotation.y = tws * Math.PI / 2;
      twS.position.set(tws * 1.06, 3.2, -0.6); tg.add(twS);
    }
    // Exhaust
    var tex = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8), tChrome);
    tex.position.set(0.75, 3.0, 1.8); tg.add(tex);
    var texCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.15, 8), tChrome);
    texCap.position.set(0.75, 4.25, 1.8); tg.add(texCap);
    // Wheels
    tg.add(farmWheel(1.0, 0.55, -1.55, 1.0, -1.0));
    tg.add(farmWheel(1.0, 0.55, 1.55, 1.0, -1.0));
    tg.add(farmWheel(0.55, 0.35, -1.15, 0.55, 2.2));
    tg.add(farmWheel(0.55, 0.35, 1.15, 0.55, 2.2));
    tg.position.set(-3, 0, fz + 8);
    tg.rotation.y = -0.8;
    target.add(tg);
  }

  // ── Farm celebration rewards ──
  function loadGLBReward(modelName, scale, x, fz, zOff, rotY) {
    var model = PONTE.models.get(modelName);
    if (!model) return null;
    var g = model.scene.clone();
    g.traverse(function(child) {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    var box = new THREE.Box3().setFromObject(g);
    var sz = new THREE.Vector3(); box.getSize(sz);
    var s = scale / Math.max(sz.x, sz.y, sz.z);
    g.scale.set(s, s, s);
    box.setFromObject(g);
    var center = new THREE.Vector3(); box.getCenter(center);
    var worldZ = fz + zOff;
    g.position.set(x - center.x, -box.min.y, worldZ - center.z);
    g.rotation.y = rotY || 0;
    g.userData.visualCenter = { x: x, y: (-box.min.y + box.max.y) / 2, z: worldZ };
    return g;
  }

  function buildTruck(fz) {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0xEEEEEE, roughness: 0.4, metalness: 0.3 });
    var cabMat = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, roughness: 0.35, metalness: 0.3 });
    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    var glassMat = new THREE.MeshStandardMaterial({ color: 0x88CCFF, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.6 });
    var bed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 5.5), bodyMat);
    bed.position.set(0, 0.9, -0.5);
    bed.castShadow = true;
    group.add(bed);
    var cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 2.2), cabMat);
    cab.position.set(0, 1.5, 2.2);
    cab.castShadow = true;
    group.add(cab);
    var glass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.1), glassMat);
    glass.position.set(0, 1.8, 1.1);
    group.add(glass);
    var wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12);
    var positions = [[-1.2, 0.45, 2], [1.2, 0.45, 2], [-1.2, 0.45, -1.5], [1.2, 0.45, -1.5]];
    for (var i = 0; i < positions.length; i++) {
      var w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(positions[i][0], positions[i][1], positions[i][2]);
      w.castShadow = true;
      group.add(w);
    }
    group.position.set(6, 0, fz + 18);
    group.rotation.y = -0.4;
    group.userData.visualCenter = { x: 6, y: 1.5, z: fz + 18 };
    return group;
  }

  function buildDrone(fz) {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.6 });
    var propMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.5 });
    var ledMat = new THREE.MeshStandardMaterial({ color: 0x00FF44, emissive: 0x00FF44, emissiveIntensity: 0.8 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.2), bodyMat);
    body.castShadow = true;
    group.add(body);
    var armGeo = new THREE.BoxGeometry(0.15, 0.12, 2.0);
    var arm1 = new THREE.Mesh(armGeo, bodyMat);
    arm1.rotation.y = Math.PI / 4;
    group.add(arm1);
    var arm2 = new THREE.Mesh(armGeo, bodyMat);
    arm2.rotation.y = -Math.PI / 4;
    group.add(arm2);
    var propGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 16);
    var motorGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 8);
    var offsets = [[0.7, 0, 0.7], [-0.7, 0, 0.7], [0.7, 0, -0.7], [-0.7, 0, -0.7]];
    for (var i = 0; i < offsets.length; i++) {
      var motor = new THREE.Mesh(motorGeo, bodyMat);
      motor.position.set(offsets[i][0], 0.3, offsets[i][2]);
      group.add(motor);
      var prop = new THREE.Mesh(propGeo, propMat);
      prop.material = propMat.clone();
      prop.material.transparent = true;
      prop.material.opacity = 0.3;
      prop.position.set(offsets[i][0], 0.45, offsets[i][2]);
      group.add(prop);
      var led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), ledMat);
      led.position.set(offsets[i][0], -0.15, offsets[i][2]);
      group.add(led);
    }
    group.position.set(0, 6, fz + 10);
    group.userData.floatBase = 6;
    group.userData.visualCenter = { x: 0, y: 6, z: fz + 10 };
    return group;
  }

  var FARM_REWARDS = [
    { delay: 1.0, pos: { x: -6, z: 25 }, build: function(fz) {
      return loadGLBReward('trator', 5, -6, fz, 25, 0.5);
    }},
    { delay: 5.0, pos: { x: 8, z: 22 }, build: function(fz) {
      return loadGLBReward('truck', 5, 8, fz, 22, -0.3) || buildTruck(fz);
    }},
    { delay: 9.0, pos: { x: 0, z: 10 }, build: function(fz) {
      return buildDrone(fz);
    }}
  ];

  PONTE.farm = {
    makeIsland: makeIsland,
    buildEndScene: buildEndScene,
    REWARDS: FARM_REWARDS,
    endGroup: null,
    frontZ: 0
  };

})();
