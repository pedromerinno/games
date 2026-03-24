(function() {
  'use strict';

  var endGroup = null;

  function makeIsland(z, depth, parent) {
    var scene = PONTE.scene.scene;
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
      farm.position.set(-center.x, -box.min.y - 1.8, -cfg.DIST - 12 - center.z);
      endGroup.add(farm);

      // Save the front edge of the farm (most positive Z after positioning)
      box.setFromObject(farm);
      PONTE.farm.frontZ = -box.max.z; // positive distance from origin
    } else {
      // Fallback: procedural island + scenery
      makeIsland(-cfg.DIST - 8, 80, endGroup);
      makeEndRewardTo(endGroup);
    }

    // ── Green floor extending infinitely behind the farm ──
    var grassMat = new THREE.MeshStandardMaterial({ color: 0x87AA2F, roughness: 0.9 });
    var grassFloor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), grassMat);
    grassFloor.rotation.x = -Math.PI / 2;
    grassFloor.position.set(0, -0.5, -cfg.DIST - 300);
    grassFloor.receiveShadow = true;
    endGroup.add(grassFloor);

    // Lighter grass patch for variation
    var grassLight = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: 0x66BB6A, roughness: 0.95 })
    );
    grassLight.rotation.x = -Math.PI / 2;
    grassLight.position.set(0, -0.48, -cfg.DIST - 800);
    endGroup.add(grassLight);

    // ── Mountains in the far background ──
    var mountainColors = [0x5D7B3A, 0x4A6B2E, 0x6B8E4E, 0x3E5C28, 0x7A9B5A];
    var mountainData = [
      { x: 0,    z: -cfg.DIST - 200, r: 80, h: 0.6 },
      { x: -120, z: -cfg.DIST - 180, r: 60, h: 0.7 },
      { x: 100,  z: -cfg.DIST - 190, r: 70, h: 0.55 },
      { x: -60,  z: -cfg.DIST - 220, r: 90, h: 0.5 },
      { x: 150,  z: -cfg.DIST - 210, r: 55, h: 0.65 },
      { x: -180, z: -cfg.DIST - 200, r: 50, h: 0.7 },
      { x: 200,  z: -cfg.DIST - 230, r: 65, h: 0.6 },
      // Snow-capped peaks further back
      { x: -40,  z: -cfg.DIST - 300, r: 100, h: 0.5 },
      { x: 80,   z: -cfg.DIST - 320, r: 85, h: 0.55 },
      { x: -150, z: -cfg.DIST - 340, r: 75, h: 0.6 },
    ];
    for (var mi = 0; mi < mountainData.length; mi++) {
      var md = mountainData[mi];
      var mMat = new THREE.MeshStandardMaterial({ color: mountainColors[mi % mountainColors.length], roughness: 0.9 });
      var mountain = new THREE.Mesh(new THREE.ConeGeometry(md.r, md.r * md.h, 8), mMat);
      mountain.position.set(md.x, md.r * md.h * 0.5 - 5, md.z);
      mountain.castShadow = true;
      endGroup.add(mountain);

      // Snow cap on taller mountains
      if (md.r > 60) {
        var snowMat = new THREE.MeshStandardMaterial({ color: 0xF5F5F5, roughness: 0.7 });
        var snow = new THREE.Mesh(new THREE.ConeGeometry(md.r * 0.3, md.r * md.h * 0.25, 8), snowMat);
        snow.position.set(md.x, md.r * md.h - 5, md.z);
        endGroup.add(snow);
      }
    }

    // Finish arch always on top
    makeFinishArch(endGroup, cfg);

    scene.add(endGroup);
    PONTE.farm.endGroup = endGroup;
  }

  function makeFinishArch(target, cfg) {
    var fz = -cfg.DIST - 5;
    var BW = cfg.BW;
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
  var FARM_REWARDS = [
    { delay: 0.5, build: function(fz) {
      // Try GLB tractor
      var tratorModel = PONTE.models.get('trator');
      if (tratorModel) {
        var g = tratorModel.scene.clone();
        g.traverse(function(child) {
          if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
        var box = new THREE.Box3().setFromObject(g);
        var sz = new THREE.Vector3();
        box.getSize(sz);
        var s = 5 / Math.max(sz.x, sz.y, sz.z);
        g.scale.set(s, s, s);
        box.setFromObject(g);
        var center = new THREE.Vector3();
        box.getCenter(center);
        g.position.set(-6 - center.x, -box.min.y, fz + 25 - center.z);
        g.rotation.y = 0.5;
        return g;
      }
      // Fallback: procedural tractor
      var g = new THREE.Group();
      var greenMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.4 });
      var greenDark = new THREE.MeshStandardMaterial({ color: 0x1B5E20, roughness: 0.5 });
      var yellowMat = new THREE.MeshStandardMaterial({ color: 0xFDD835, roughness: 0.35 });
      var blackMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
      var glassMat = new THREE.MeshStandardMaterial({ color: 0x81D4FA, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6 });
      var chromeMat = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, roughness: 0.1, metalness: 0.7 });

      function makeWheel(radius, width, x, y, z) {
        var wg = new THREE.Group();
        var tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), blackMat);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        wg.add(tire);
        var rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, width + 0.04, 12), yellowMat);
        rim.rotation.z = Math.PI / 2;
        wg.add(rim);
        var cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width + 0.08, 8), chromeMat);
        cap.rotation.z = Math.PI / 2;
        wg.add(cap);
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

      // Engine / hood
      var hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.8), greenMat);
      hood.position.set(0, 1.6, 1.6);
      hood.castShadow = true;
      g.add(hood);
      var hoodRound = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.8, 8, 1, false, 0, Math.PI), greenDark);
      hoodRound.rotation.x = Math.PI / 2;
      hoodRound.rotation.z = Math.PI;
      hoodRound.position.set(0, 2.2, 1.6);
      hoodRound.scale.set(1, 0.2, 1);
      g.add(hoodRound);
      // Grille
      var grilleBg = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.12), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 }));
      grilleBg.position.set(0, 1.5, 3.02);
      g.add(grilleBg);
      for (var gb = 0; gb < 4; gb++) {
        var bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), yellowMat);
        bar.position.set(0, 1.2 + gb * 0.22, 3.08);
        g.add(bar);
      }
      // Headlights
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
      // Chassis
      var chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 4.5), greenDark);
      chassis.position.set(0, 0.7, 0.3);
      g.add(chassis);
      // Fenders
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
      var cabFloor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.2), greenDark);
      cabFloor.position.set(0, 2.2, -0.6);
      g.add(cabFloor);
      for (var px = -1; px <= 1; px += 2) {
        for (var pz = -1; pz <= 1; pz += 2) {
          var pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), greenDark);
          pillar.position.set(px * 1.05, 3.15, -0.6 + pz * 0.95);
          g.add(pillar);
        }
      }
      var cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 2.5), greenDark);
      cabRoof.position.set(0, 4.1, -0.6);
      cabRoof.castShadow = true;
      g.add(cabRoof);
      var roofEdge = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.06, 2.6), yellowMat);
      roofEdge.position.set(0, 4.0, -0.6);
      g.add(roofEdge);
      // Glass windows
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
      // Steering wheel
      var steer = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 10), blackMat);
      steer.position.set(0, 2.8, 0.1);
      steer.rotation.x = -0.6;
      g.add(steer);
      // Exhaust stack
      var exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8), chromeMat);
      exhaust.position.set(0.75, 3.0, 1.8);
      exhaust.castShadow = true;
      g.add(exhaust);
      var exhaustCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.15, 8), chromeMat);
      exhaustCap.position.set(0.75, 4.25, 1.8);
      g.add(exhaustCap);
      // Wheels
      g.add(makeWheel(1.0, 0.55, -1.55, 1.0, -1.0));
      g.add(makeWheel(1.0, 0.55, 1.55, 1.0, -1.0));
      g.add(makeWheel(0.55, 0.35, -1.15, 0.55, 2.2));
      g.add(makeWheel(0.55, 0.35, 1.15, 0.55, 2.2));
      // Hitch
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
      var tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 8, 8), baseMat);
      tower.position.y = 4;
      tower.castShadow = true;
      g.add(tower);
      var plat = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0x9E9E9E }));
      plat.position.y = 8.1;
      g.add(plat);
      var hub = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshStandardMaterial({ color: 0xE0E0E0, metalness: 0.3 }));
      hub.position.set(0, 8.5, 0.3);
      g.add(hub);
      var bladeMat = new THREE.MeshStandardMaterial({ color: 0xEEEEEE, roughness: 0.4 });
      g.userData.blades = [];
      for (var b = 0; b < 4; b++) {
        var pivot = new THREE.Group();
        pivot.position.set(0, 8.5, 0.4);
        var beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.5, 0.04), bladeMat);
        beam.position.y = 1.75;
        pivot.add(beam);
        for (var cs = 0; cs < 5; cs++) {
          var strut = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.03), bladeMat);
          strut.position.set(0.2, 0.6 + cs * 0.65, 0);
          pivot.add(strut);
        }
        var sail = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.0), new THREE.MeshStandardMaterial({ color: 0xFAFAFA, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
        sail.position.set(0.2, 1.75, 0.02);
        pivot.add(sail);
        pivot.rotation.z = (b / 4) * Math.PI * 2;
        g.add(pivot);
        g.userData.blades.push(pivot);
      }
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
      // Pulverizador (crop sprayer)
      var g = new THREE.Group();
      var frameMat = new THREE.MeshStandardMaterial({ color: 0x1565C0, roughness: 0.4, metalness: 0.1 });
      var tankMat = new THREE.MeshStandardMaterial({ color: 0x42A5F5, roughness: 0.3, metalness: 0.15 });
      var wheelMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 });
      var frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 3.0), frameMat);
      frame.position.y = 1.0;
      g.add(frame);
      var tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 12), tankMat);
      tank.position.set(0, 2.0, -0.2);
      g.add(tank);
      var capMat = new THREE.MeshStandardMaterial({ color: 0xFFD600, roughness: 0.4 });
      var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 8), capMat);
      cap.position.set(0, 2.95, -0.2);
      g.add(cap);
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
      for (var fi = 0; fi < 8; fi++) {
        var a = (fi / 8) * Math.PI * 2;
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 5), fenceMat);
        post.position.set(Math.cos(a) * 2.0, 0.5, Math.sin(a) * 2.0);
        g.add(post);
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
      var pigMat = new THREE.MeshStandardMaterial({ color: 0xFFCDD2, roughness: 0.7 });
      var pigDark = new THREE.MeshStandardMaterial({ color: 0xEF9A9A, roughness: 0.7 });
      var pigBody = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 7), pigMat);
      pigBody.position.set(0, 0.45, 0);
      pigBody.scale.set(1.3, 0.9, 1);
      g.add(pigBody);
      var pigHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), pigMat);
      pigHead.position.set(0, 0.5, 0.6);
      g.add(pigHead);
      var snout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.1, 8), pigDark);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, 0.45, 0.9);
      g.add(snout);
      for (var e = -1; e <= 1; e += 2) {
        var ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), pigDark);
        ear.position.set(e * 0.2, 0.7, 0.55);
        ear.scale.set(0.6, 1, 0.4);
        g.add(ear);
      }
      for (var lx = -1; lx <= 1; lx += 2) {
        for (var lz = -1; lz <= 1; lz += 2) {
          var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 5), pigDark);
          leg.position.set(lx * 0.3, 0.15, lz * 0.3);
          g.add(leg);
        }
      }
      var mud = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 1 }));
      mud.position.set(0.5, 0.02, -0.5);
      g.add(mud);
      g.position.set(12, 0, fz + 20);
      return g;
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
