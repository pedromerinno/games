(function() {
  'use strict';

  var loader = null;
  var cache = {};
  var initPromise = null;

  function init() {
    // GLTFLoader must be loaded as ES module since examples/js/ was removed in Three.js 0.152+
    initPromise = import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js')
      .then(function(module) {
        loader = new module.GLTFLoader();
      })
      .catch(function(err) {
        console.warn('GLTFLoader failed to load:', err);
      });
    return initPromise;
  }

  function load(name, path) {
    // Wait for init to complete first
    var p = initPromise || Promise.resolve();
    return p.then(function() {
      if (cache[name]) return cache[name];
      if (!loader) throw new Error('GLTFLoader not available');
      return new Promise(function(resolve, reject) {
        loader.load(path, function(gltf) {
          cache[name] = gltf;
          resolve(gltf);
        }, undefined, reject);
      });
    });
  }

  function get(name) {
    return cache[name] || null;
  }

  PONTE.models = {
    init: init,
    load: load,
    get: get
  };

})();
