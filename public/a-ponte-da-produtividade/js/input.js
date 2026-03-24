(function() {
  'use strict';

  var inputBuffer = 0;
  var moveCallback = null;
  var controlMode = 'all'; // 'all', 'ad', 'arrows'

  function init(cb) {
    moveCallback = cb;
    window.addEventListener('keydown', onKey);
    // Touch bindings
    var touchEls = PONTE.ui.getTouchEls();
    touchEls.left.addEventListener('pointerdown', function(){ move(-1); });
    touchEls.right.addEventListener('pointerdown', function(){ move(1); });
  }

  function move(dir) {
    if (moveCallback) moveCallback(dir);
  }

  function onKey(e) {
    var key = e.key || e;
    if (controlMode === 'ad') {
      if (key === 'a' || key === 'A') move(-1);
      else if (key === 'd' || key === 'D') move(1);
    } else if (controlMode === 'arrows') {
      if (key === 'ArrowLeft') move(-1);
      else if (key === 'ArrowRight') move(1);
    } else {
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') move(-1);
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') move(1);
    }
  }

  // Listen for key commands forwarded from parent (split-screen)
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'keydown') {
      onKey(e.data.key);
    }
  });

  function getBuffer() { return inputBuffer; }
  function setBuffer(v) { inputBuffer = v; }
  function clearBuffer() { inputBuffer = 0; }

  function setControlMode(mode) {
    controlMode = mode || 'all';
  }

  PONTE.input = {
    init: init,
    getBuffer: getBuffer,
    setBuffer: setBuffer,
    clearBuffer: clearBuffer,
    setControlMode: setControlMode
  };

})();
