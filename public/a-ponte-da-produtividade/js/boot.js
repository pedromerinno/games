(function(){
  window.PONTE = {};

  var assets = [
    { type:'image',  src:'assets/BG.jpg' },
    { type:'image',  src:'assets/Logo_AcessaAgro.svg' },
    { type:'image',  src:'assets/TITLE_Game.svg' },
    { type:'font',   src:'assets/Futura Condensed Extra Bold.otf', family:'FuturaCond' }
  ];

  var gameScripts = [
    'js/config.js',
    'js/scene.js',
    'js/player.js',
    'js/bridge.js',
    'js/gates.js',
    'js/farm.js',
    'js/scenery.js',
    'js/effects.js',
    'js/ui.js',
    'js/input.js',
    'js/intro.js',
    'js/game.js'
  ];

  var coreScripts = [
    { src: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js' },
    { src: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js' },
    { src: '/shared/storage.js' },
    { src: '/shared/sync.js' }
  ];

  // total = core scripts + model loader + game scripts + images/fonts + GLB models
  var total = coreScripts.length + 1 + gameScripts.length + assets.length + 1;
  var loaded = 0;
  var displayed = 0;
  var elNum = document.getElementById('preload-number');
  var elBar = document.getElementById('preload-bar-fill');
  var preloader = document.getElementById('preloader');
  var raf;

  function tick(pct) {
    elNum.innerHTML = Math.round(pct) + '<span>%</span>';
    elBar.style.width = pct + '%';
  }

  function animateCounter() {
    var target = Math.round((loaded / total) * 100);
    if (displayed < target) {
      displayed += Math.max(1, Math.round((target - displayed) * 0.18));
      if (displayed > target) displayed = target;
      tick(displayed);
      raf = requestAnimationFrame(animateCounter);
    } else if (displayed >= 100) {
      tick(100);
      setTimeout(function(){
        preloader.classList.add('done');
        setTimeout(function(){ preloader.remove(); }, 600);
      }, 300);
    } else {
      raf = requestAnimationFrame(animateCounter);
    }
  }

  function onAssetLoaded() {
    loaded++;
    if (!raf) raf = requestAnimationFrame(animateCounter);
  }

  function loadScript(src) {
    return new Promise(function(resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function(){ onAssetLoaded(); resolve(); };
      s.onerror = function(){ onAssetLoaded(); resolve(); };
      document.body.appendChild(s);
    });
  }

  function loadImage(src) {
    var img = new Image();
    img.onload = img.onerror = onAssetLoaded;
    img.src = src;
  }

  function loadFont(src, family) {
    var f = new FontFace(family, 'url(' + src + ')');
    f.load().then(function(face){
      document.fonts.add(face);
      onAssetLoaded();
    }).catch(function(){ onAssetLoaded(); });
  }

  // Load images and fonts in parallel
  assets.forEach(function(a) {
    if (a.type === 'image') loadImage(a.src);
    else if (a.type === 'font') loadFont(a.src, a.family);
  });

  // Load core scripts sequentially, then model loader, then game scripts, then init
  var v = '?v=' + Date.now();

  coreScripts.reduce(function(chain, a) {
    return chain.then(function(){ return loadScript(a.src); });
  }, Promise.resolve())
  .then(function(){
    // Load model loader
    return loadScript('models/loader.js' + v);
  })
  .then(function(){
    // Load game scripts sequentially
    return gameScripts.reduce(function(chain, src) {
      return chain.then(function(){ return loadScript(src + v); });
    }, Promise.resolve());
  })
  .then(function(){
    // Init model loader + preload GLB models before starting game
    return PONTE.models.init().then(function() {
      return Promise.all([
        PONTE.models.load('cute_toon_tree', 'models/cute_toon_tree.glb').catch(function() {}),
        PONTE.models.load('farm', 'models/farm.glb').catch(function() {}),
        PONTE.models.load('coin', 'models/coin.glb').catch(function() {}),
        PONTE.models.load('trator', 'models/trator.glb').catch(function() {}),
      ]).then(function() { onAssetLoaded(); });
    }).catch(function() { onAssetLoaded(); });
  })
  .then(function(){
    // All loaded — call master init
    PONTE.init();
  });
})();
