(function() {
  'use strict';

  var _scene, _camera, _camera2, _renderer, _clock;

  function init() {
    _scene = new THREE.Scene();
    _scene.background = new THREE.Color(0x7EC8E3);
    _scene.fog = new THREE.Fog(0x7EC8E3, 80, 500);

    _camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 800);
    _camera2 = new THREE.PerspectiveCamera(55, (window.innerWidth / 2) / window.innerHeight, 0.1, 800);
    _renderer = new THREE.WebGLRenderer({ antialias: true });
    _renderer.setSize(window.innerWidth, window.innerHeight);
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.BasicShadowMap;
    document.body.prepend(_renderer.domElement);
    _clock = new THREE.Clock();

    // Lights
    var amb = new THREE.AmbientLight(0xB0E0FF, 0.6);
    _scene.add(amb);

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
    _scene.add(sun);

    var fill = new THREE.DirectionalLight(0xFFE0B2, 0.3);
    fill.position.set(-15, 10, -10);
    _scene.add(fill);

    // Water
    var wGeo = new THREE.PlaneGeometry(500, 3000);
    var wMat = new THREE.MeshStandardMaterial({ color: 0x1976D2, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.88 });
    var water = new THREE.Mesh(wGeo, wMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -3, -1200);
    water.receiveShadow = true;
    _scene.add(water);

    var w2 = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 3000),
      new THREE.MeshBasicMaterial({ color: 0x64B5F6, transparent: true, opacity: 0.12 })
    );
    w2.rotation.x = -Math.PI / 2;
    w2.position.set(0, -2.8, -1200);
    _scene.add(w2);

    window.addEventListener('resize', onResize);

    PONTE.scene.scene = _scene;
    PONTE.scene.camera = _camera;
    PONTE.scene.camera2 = _camera2;
    PONTE.scene.renderer = _renderer;
    PONTE.scene.clock = _clock;
  }

  function onResize() {
    var isSplit = PONTE.scene.splitMode;
    if (isSplit) {
      var halfW = window.innerWidth / 2;
      _camera.aspect = halfW / window.innerHeight;
      _camera.updateProjectionMatrix();
      _camera2.aspect = halfW / window.innerHeight;
      _camera2.updateProjectionMatrix();
    } else {
      _camera.aspect = window.innerWidth / window.innerHeight;
      _camera.updateProjectionMatrix();
    }
    _renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /** Render split-screen: left half with cam1, right half with cam2 */
  function renderSplit(scene, cam1, cam2) {
    var w = window.innerWidth * _renderer.getPixelRatio();
    var h = window.innerHeight * _renderer.getPixelRatio();
    var halfW = Math.floor(w / 2);

    _renderer.setScissorTest(true);

    // Left half — Player 1
    _renderer.setViewport(0, 0, halfW, h);
    _renderer.setScissor(0, 0, halfW, h);
    _renderer.render(scene, cam1);

    // Right half — Player 2
    _renderer.setViewport(halfW, 0, w - halfW, h);
    _renderer.setScissor(halfW, 0, w - halfW, h);
    _renderer.render(scene, cam2);

    _renderer.setScissorTest(false);
  }

  PONTE.scene = {
    init: init,
    renderSplit: renderSplit,
    scene: null,
    camera: null,
    camera2: null,
    renderer: null,
    clock: null,
    splitMode: false
  };

})();
