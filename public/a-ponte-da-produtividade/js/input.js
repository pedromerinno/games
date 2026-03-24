(function() {
  'use strict';

  var inputBuffer = 0;
  var moveCallback = null;

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
    if (e.key === 'ArrowLeft' || e.key === 'a') move(-1);
    else if (e.key === 'ArrowRight' || e.key === 'd') move(1);
  }

  function getBuffer() { return inputBuffer; }
  function setBuffer(v) { inputBuffer = v; }
  function clearBuffer() { inputBuffer = 0; }

  PONTE.input = {
    init: init,
    getBuffer: getBuffer,
    setBuffer: setBuffer,
    clearBuffer: clearBuffer
  };

})();
